'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

type ActionState = { error: string } | { success: true } | null

const NO_EMOJI = /\p{Extended_Pictographic}/u

const CreateThreadSchema = z.object({
  content: z.string().min(1, 'Please write something.').max(500, 'Max 500 characters.')
    .refine((v) => !NO_EMOJI.test(v), 'Emoji are not allowed.'),
  category: z.string().max(100).optional(),
})

const CreateReplySchema = z.object({
  thread_id: z.string().uuid('Invalid thread.'),
  content: z.string().min(1, 'Please write a reply.').max(300, 'Max 300 characters.')
    .refine((v) => !NO_EMOJI.test(v), 'Emoji are not allowed.'),
  parent_reply_id: z.string().uuid('Invalid parent reply.').optional(),
})

export async function createThread(_: unknown, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to post.' }

  const parsed = CreateThreadSchema.safeParse({
    content: formData.get('content'),
    category: formData.get('category') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { content, category } = parsed.data
  const { data: inserted, error } = await supabase
    .from('threads')
    .insert({ user_id: user.id, content, category: category || null })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (ALLOWED.has(imageFile.type) && imageFile.size <= 5 * 1024 * 1024) {
      const ext = imageFile.type === 'image/jpeg' ? 'jpg' : imageFile.type.split('/')[1]
      const path = `${user.id}/${(inserted as { id: string }).id}.${ext}`
      const { data: up } = await supabase.storage
        .from('thread-images')
        .upload(path, imageFile, { contentType: imageFile.type })
      if (up) {
        const { data: { publicUrl } } = supabase.storage.from('thread-images').getPublicUrl(up.path)
        const admin = createAdminClient()
        await admin.from('threads').update({ image_url: publicUrl }).eq('id', (inserted as { id: string }).id)
      }
    }
  }

  revalidatePath('/community')
  return { success: true }
}

export async function toggleThreadLike(threadId: string): Promise<{ liked: boolean } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to like.' }

  const { data: existing } = await supabase
    .from('thread_likes')
    .select('thread_id')
    .eq('thread_id', threadId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('thread_likes').delete().eq('thread_id', threadId).eq('user_id', user.id)
    revalidatePath('/community')
    return { liked: false }
  } else {
    await supabase.from('thread_likes').insert({ thread_id: threadId, user_id: user.id })
    revalidatePath('/community')
    return { liked: true }
  }
}

export async function createReply(_: unknown, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to reply.' }

  const parsed = CreateReplySchema.safeParse({
    thread_id: formData.get('thread_id'),
    content: formData.get('content'),
    parent_reply_id: formData.get('parent_reply_id') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { thread_id, content, parent_reply_id } = parsed.data
  const { data: inserted, error } = await supabase
    .from('thread_replies')
    .insert({ thread_id, user_id: user.id, content, parent_reply_id: parent_reply_id ?? null })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const imageFile = formData.get('image') as File | null
  if (imageFile && imageFile.size > 0) {
    const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp'])
    if (ALLOWED.has(imageFile.type) && imageFile.size <= 5 * 1024 * 1024) {
      const ext = imageFile.type === 'image/jpeg' ? 'jpg' : imageFile.type.split('/')[1]
      const path = `${user.id}/${(inserted as { id: string }).id}.${ext}`
      const { data: up } = await supabase.storage
        .from('thread-images')
        .upload(path, imageFile, { contentType: imageFile.type })
      if (up) {
        const { data: { publicUrl } } = supabase.storage.from('thread-images').getPublicUrl(up.path)
        const admin = createAdminClient()
        await admin.from('thread_replies').update({ image_url: publicUrl }).eq('id', (inserted as { id: string }).id)
      }
    }
  }

  revalidatePath(`/community/${thread_id}`)
  revalidatePath('/community')
  return { success: true }
}

export async function deleteThread(threadId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (!isAdmin) {
    const { data: thread } = await supabase
      .from('threads')
      .select('user_id')
      .eq('id', threadId)
      .single()
    if (!thread || thread.user_id !== user.id) return { error: 'Not authorized.' }
  }

  // Admin client bypasses RLS so cascade-triggered UPDATEs on threads succeed
  const admin = createAdminClient()
  const { error } = await admin.from('threads').delete().eq('id', threadId)
  if (error) return { error: error.message }

  revalidatePath('/community')
  return {}
}

export async function deleteReply(replyId: string, threadId: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (isAdmin) {
    const admin = createAdminClient()
    const { error } = await admin.from('thread_replies').delete().eq('id', replyId)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase.from('thread_replies').delete().eq('id', replyId).eq('user_id', user.id)
    if (error) return { error: error.message }
  }

  revalidatePath(`/community/${threadId}`)
  return {}
}
