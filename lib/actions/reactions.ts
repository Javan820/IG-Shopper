'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ReactionType = 'recommend' | 'neutral' | 'avoid'

export async function toggleShopReaction(
  shopId: string,
  igHandle: string,
  reaction: ReactionType,
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to react.' }

  const { data: existing, error: selectErr } = await supabase
    .from('shop_reactions')
    .select('id, reaction')
    .eq('shop_id', shopId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (selectErr) return { error: selectErr.message }

  if (existing) {
    if (existing.reaction === reaction) {
      const { error } = await supabase.from('shop_reactions').delete().eq('id', existing.id)
      if (error) return { error: error.message }
    } else {
      const { error } = await supabase
        .from('shop_reactions')
        .update({ reaction })
        .eq('id', existing.id)
      if (error) return { error: error.message }
    }
  } else {
    const { error } = await supabase
      .from('shop_reactions')
      .insert({ shop_id: shopId, user_id: user.id, reaction })
    if (error) return { error: error.message }
  }

  revalidatePath(`/shops/${igHandle}`)
  return { success: true as const }
}

// ---------------------------------------------------------------------------
// Thread + reply emoji reactions
// ---------------------------------------------------------------------------

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢'] as const

function isValidEmoji(e: string): e is typeof ALLOWED_EMOJIS[number] {
  return (ALLOWED_EMOJIS as readonly string[]).includes(e)
}

export async function toggleThreadReaction(
  threadId: string,
  emoji: string,
): Promise<{ reacted: boolean } | { error: string }> {
  if (!isValidEmoji(emoji)) return { error: 'Invalid emoji' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to react.' }

  const { data: existing } = await supabase
    .from('thread_reactions')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('thread_reactions')
      .delete()
      .eq('thread_id', threadId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
    revalidatePath('/community')
    return { reacted: false }
  } else {
    await supabase
      .from('thread_reactions')
      .insert({ thread_id: threadId, user_id: user.id, emoji })
    revalidatePath('/community')
    return { reacted: true }
  }
}

export async function toggleReplyReaction(
  replyId: string,
  threadId: string,
  emoji: string,
): Promise<{ reacted: boolean } | { error: string }> {
  if (!isValidEmoji(emoji)) return { error: 'Invalid emoji' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to react.' }

  const { data: existing } = await supabase
    .from('thread_reply_reactions')
    .select('reply_id')
    .eq('reply_id', replyId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('thread_reply_reactions')
      .delete()
      .eq('reply_id', replyId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
    revalidatePath(`/community/${threadId}`)
    return { reacted: false }
  } else {
    await supabase
      .from('thread_reply_reactions')
      .insert({ reply_id: replyId, user_id: user.id, emoji })
    revalidatePath(`/community/${threadId}`)
    return { reacted: true }
  }
}
