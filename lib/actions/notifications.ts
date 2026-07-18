'use server'

import { createClient } from '@/lib/supabase/server'

export async function markAllNotificationsRead(_formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('user_id', user.id)
    .is('read_at', null)

  if (error) return { error: error.message }
  return { success: true as const }
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', notificationId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true as const }
}

export async function saveNotificationPreferences(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const newReview      = formData.get('new_review') === 'on'
  const newFollower    = formData.get('new_follower') === 'on'
  const reviewReaction = formData.get('review_reaction') === 'on'

  const { error } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        new_review: newReview,
        new_follower: newFollower,
        review_reaction: reviewReaction,
      } as never,
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return { success: true as const }
}

export async function savePushSubscription(sub: {
  endpoint: string
  p256dh: string
  auth: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: user.id, ...sub } as never, { onConflict: 'endpoint' })

  if (error) return { error: error.message }
  return { success: true as const }
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  return { success: true as const }
}
