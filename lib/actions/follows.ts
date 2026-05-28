'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush, type PushSub } from '@/lib/push'

export async function followUser(formData: FormData) {
  const targetId = formData.get('target_id') as string
  if (!targetId) return { error: 'Missing user ID.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to follow users.' }
  if (user.id === targetId) return { error: 'You cannot follow yourself.' }

  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: user.id, following_id: targetId } as never)
  if (error) {
    if (error.code === '23505') return { error: 'Already following.' }
    return { error: error.message }
  }

  await notifyNewFollower(user.id, targetId)
  return { success: true as const }
}

export async function unfollowUser(formData: FormData) {
  const targetId = formData.get('target_id') as string
  if (!targetId) return { error: 'Missing user ID.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to unfollow users.' }

  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', targetId)

  if (error) return { error: error.message }
  return { success: true as const }
}

async function notifyNewFollower(actorId: string, targetId: string) {
  const adminClient = createAdminClient()

  const { data: actorRow } = await adminClient
    .from('profiles')
    .select('display_name')
    .eq('id', actorId)
    .single()

  const { data: prefsRow } = await adminClient
    .from('notification_preferences')
    .select('new_follower')
    .eq('user_id', targetId)
    .maybeSingle()

  const prefs = prefsRow as { new_follower: boolean } | null
  if (prefs && !prefs.new_follower) return

  const actor = actorRow as { display_name: string | null } | null
  const actorName = actor?.display_name ?? 'Someone'

  const { error: notifError } = await adminClient.from('notifications').insert({
    user_id: targetId,
    type: 'new_follower',
    title: `${actorName} started following you`,
    body: null,
    url: `/users/${actorId}`,
    actor_id: actorId,
  } as never)
  if (notifError) return

  const { data: subsRaw } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', targetId)

  const subs = (subsRaw ?? []) as PushSub[]

  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendPush(sub, {
        title: 'New follower',
        body: `${actorName} started following you`,
        url: `/users/${actorId}`,
      })
      if (result.expired) {
        await adminClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    })
  )
}

export async function getFollowState(
  targetId: string,
  userId: string | null
): Promise<{ isFollowing: boolean; followerCount: number }> {
  const supabase = await createClient()

  const [followingResult, countResult] = await Promise.all([
    userId
      ? supabase
          .from('user_follows')
          .select('follower_id')
          .eq('follower_id', userId)
          .eq('following_id', targetId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('user_follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', targetId),
  ])

  return {
    isFollowing: !!followingResult.data,
    followerCount: countResult.count ?? 0,
  }
}
