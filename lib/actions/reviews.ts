'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sendPush, type PushSub } from '@/lib/push'
import type { TablesInsert } from '@/lib/supabase/types'

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (profile as { role: string } | null)?.role === 'admin' ? user : null
}

const SubmitReviewSchema = z.object({
  shop_id: z.string().uuid('Invalid shop ID.'),
  ig_handle: z.string().min(1),
  rating: z.coerce.number().int().min(1, 'Please select a rating.').max(5),
  title: z.string().max(100, 'Title must be 100 characters or fewer.').optional(),
  body: z.string().max(1000, 'Review must be 1000 characters or fewer.').optional(),
})

export async function submitReview(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to write a review.' }

  const parsed = SubmitReviewSchema.safeParse({
    shop_id: formData.get('shop_id'),
    ig_handle: formData.get('ig_handle'),
    rating: formData.get('rating'),
    title: formData.get('title') || undefined,
    body: formData.get('body') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: shop } = await supabase
    .from('shops')
    .select('claimed_by')
    .eq('id', parsed.data.shop_id)
    .single()

  if ((shop as { claimed_by: string | null } | null)?.claimed_by === user.id) {
    return { error: 'You cannot review your own shop.' }
  }

  const payload: TablesInsert<'reviews'> = {
    shop_id: parsed.data.shop_id,
    user_id: user.id,
    rating: parsed.data.rating as 1 | 2 | 3 | 4 | 5,
    title: parsed.data.title ?? null,
    body: parsed.data.body ?? null,
  }

  const { data: inserted, error } = await supabase
    .from('reviews')
    .insert(payload as never)
    .select('id')
    .single()
  if (error) {
    if (error.code === '23505') return { error: 'You have already reviewed this shop.' }
    return { error: error.message }
  }

  const rawImages = formData.getAll('images') as File[]
  const imageFiles = rawImages.filter((f) => f instanceof File && f.size > 0).slice(0, 4)
  if (imageFiles.length > 0) {
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
    const MAX = 5 * 1024 * 1024
    const valid = imageFiles.filter((f) => ALLOWED.has(f.type) && f.size <= MAX)
    const urlSlots: (string | null)[] = new Array(valid.length).fill(null)
    await Promise.all(
      valid.map(async (file, i) => {
        const ext = file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]
        const path = `${user.id}/${(inserted as { id: string }).id}-${i}.${ext}`
        const { data: up } = await supabase.storage
          .from('review-images')
          .upload(path, file, { contentType: file.type })
        if (up) {
          const { data: { publicUrl } } = supabase.storage.from('review-images').getPublicUrl(up.path)
          urlSlots[i] = publicUrl
        }
      })
    )
    const urls = urlSlots.filter((u): u is string => u !== null)
    if (urls.length > 0) {
      await supabase
        .from('reviews')
        .update({ image_urls: urls } as never)
        .eq('id', (inserted as { id: string }).id)
    }
  }

  revalidatePath(`/shops/${parsed.data.ig_handle}`)

  notifyFollowersOfNewReview(user.id, parsed.data.ig_handle, parsed.data.rating, parsed.data.title)

  return { success: true as const }
}

async function notifyFollowersOfNewReview(
  authorId: string,
  igHandle: string,
  rating: number,
  title: string | undefined
) {
  const adminClient = createAdminClient()

  const { data: authorRaw } = await adminClient
    .from('profiles').select('display_name').eq('id', authorId).single()
  const { data: followersRaw } = await adminClient
    .from('user_follows').select('follower_id').eq('following_id', authorId)

  const followers = (followersRaw ?? []) as { follower_id: string }[]
  if (followers.length === 0) return

  const followerIds = followers.map((f) => f.follower_id)
  const authorName = (authorRaw as { display_name: string | null } | null)?.display_name ?? 'Someone'
  const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating)
  const notifBody = title ? `${stars} "${title}"` : stars

  const { data: prefsRaw } = await adminClient
    .from('notification_preferences')
    .select('user_id, new_review')
    .in('user_id', followerIds)

  const prefsRows = (prefsRaw ?? []) as { user_id: string; new_review: boolean }[]
  const prefsMap = new Map(prefsRows.map((p) => [p.user_id, p.new_review]))

  const eligible = followerIds.filter((id) => {
    const pref = prefsMap.get(id)
    return pref === undefined ? true : pref
  })
  if (eligible.length === 0) return

  await adminClient.from('notifications').insert(
    eligible.map((userId) => ({
      user_id: userId,
      type: 'new_review',
      title: `${authorName} posted a new review`,
      body: notifBody,
      url: `/shops/${igHandle}`,
      actor_id: authorId,
    })) as never
  )

  const { data: subsRaw } = await adminClient
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', eligible)

  const subs = (subsRaw ?? []) as PushSub[]

  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendPush(sub, {
        title: `${authorName} posted a new review`,
        body: notifBody,
        url: `/shops/${igHandle}`,
      })
      if (result.expired) {
        await adminClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    })
  )
}

export async function markHelpful(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to mark reviews as helpful.' }

  const reviewId = formData.get('review_id') as string
  const igHandle = formData.get('ig_handle') as string
  if (!reviewId) return { error: 'Missing review ID.' }

  const { data: existing } = await supabase
    .from('review_helpful')
    .select('review_id')
    .eq('user_id', user.id)
    .eq('review_id', reviewId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('review_helpful')
      .delete()
      .eq('user_id', user.id)
      .eq('review_id', reviewId)
  } else {
    await supabase
      .from('review_helpful')
      .insert({ user_id: user.id, review_id: reviewId } as never)
  }

  revalidatePath(`/shops/${igHandle}`)
  return { success: true as const }
}

export async function flagReview(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to flag reviews.' }

  const reviewId = formData.get('review_id') as string
  const igHandle = formData.get('ig_handle') as string
  if (!reviewId) return { error: 'Missing review ID.' }

  const { error } = await supabase
    .from('review_flags')
    .insert({ review_id: reviewId, user_id: user.id } as never)

  if (error) {
    if (error.code === '23505') return { error: 'You have already flagged this review.' }
    return { error: error.message }
  }

  revalidatePath(`/shops/${igHandle}`)
  return { success: true as const }
}

export async function dismissFlag(formData: FormData) {
  const flagId = formData.get('flag_id') as string
  if (!flagId) return { error: 'Missing flag ID.' }

  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('review_flags')
    .update({ status: 'dismissed' } as never)
    .eq('id', flagId)

  if (error) return { error: error.message }

  revalidatePath('/admin/reviews')
  return { success: true as const }
}

export async function deleteReview(formData: FormData) {
  const reviewId = formData.get('review_id') as string
  const igHandle = formData.get('ig_handle') as string
  if (!reviewId) return { error: 'Missing review ID.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to delete a review.' }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/shops/${igHandle}`)
  return { success: true as const }
}

export async function removeReview(formData: FormData) {
  const reviewId = formData.get('review_id') as string
  const igHandle = formData.get('ig_handle') as string
  if (!reviewId) return { error: 'Missing review ID.' }

  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('reviews').delete().eq('id', reviewId)

  if (error) return { error: error.message }

  revalidatePath('/admin/reviews')
  if (igHandle) revalidatePath(`/shops/${igHandle}`)
  return { success: true as const }
}

const ALLOWED_EMOJIS = ['👍', '❤️', '🔥', '😮', '💯', '😂']

export async function toggleReaction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to react to reviews.' }

  const reviewId = formData.get('review_id') as string
  const igHandle = formData.get('ig_handle') as string
  const emoji = formData.get('emoji') as string

  if (!reviewId || !emoji) return { error: 'Missing required fields.' }
  if (!ALLOWED_EMOJIS.includes(emoji)) return { error: 'Invalid emoji.' }

  const { data: existing } = await supabase
    .from('review_reactions')
    .select('emoji')
    .eq('user_id', user.id)
    .eq('review_id', reviewId)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('review_reactions')
      .delete()
      .eq('user_id', user.id)
      .eq('review_id', reviewId)
      .eq('emoji', emoji)
    if (error) return { error: `delete: ${error.message}` }
  } else {
    const { error } = await supabase
      .from('review_reactions')
      .insert({ user_id: user.id, review_id: reviewId, emoji } as never)
    if (error) return { error: `insert: ${error.message}` }

    notifyReviewAuthorOfReaction(user.id, reviewId, emoji, igHandle)
  }

  revalidatePath(`/shops/${igHandle}`)
  return { success: true as const }
}

async function notifyReviewAuthorOfReaction(
  actorId: string,
  reviewId: string,
  emoji: string,
  igHandle: string
) {
  const adminClient = createAdminClient()

  const { data: reviewRaw } = await adminClient
    .from('reviews')
    .select('user_id')
    .eq('id', reviewId)
    .single()
  const review = reviewRaw as { user_id: string } | null
  if (!review || review.user_id === actorId) return

  const targetId = review.user_id

  const { data: actorRaw } = await adminClient
    .from('profiles').select('display_name').eq('id', actorId).single()
  const { data: prefsRaw } = await adminClient
    .from('notification_preferences').select('review_reaction').eq('user_id', targetId).maybeSingle()

  const prefs = prefsRaw as { review_reaction: boolean } | null
  if (prefs && !prefs.review_reaction) return

  const actorName = (actorRaw as { display_name: string | null } | null)?.display_name ?? 'Someone'

  await adminClient.from('notifications').insert({
    user_id: targetId,
    type: 'review_reaction',
    title: `${actorName} reacted to your review`,
    body: `${emoji} on your review of @${igHandle}`,
    url: `/shops/${igHandle}`,
    actor_id: actorId,
  } as never)

  const { data: subsRaw2 } = await adminClient
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', targetId)

  const subs2 = (subsRaw2 ?? []) as PushSub[]

  await Promise.all(
    subs2.map(async (sub) => {
      const result = await sendPush(sub, {
        title: `${actorName} reacted to your review`,
        body: `${emoji} on your review of @${igHandle}`,
        url: `/shops/${igHandle}`,
      })
      if (result.expired) {
        await adminClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    })
  )
}
