'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { TablesUpdate } from '@/lib/supabase/types'
import { TIERS, type TierId } from '@/lib/constants'

const LoginSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(1, 'Password is required.'),
})

export async function login(_: unknown, formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }
  redirect('/')
}

const SignupSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters.')
    .max(50, 'Display name must be 50 characters or fewer.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

export async function signup(_: unknown, formData: FormData) {
  const parsed = SignupSchema.safeParse({
    display_name: formData.get('display_name'),
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { display_name: parsed.data.display_name } },
  })
  if (error) return { error: error.message }
  redirect('/login?message=check-email')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function requestPasswordReset(_: unknown, formData: FormData) {
  const email = (formData.get('email') as string)?.trim() ?? ''
  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
  })

  if (error) {
    const message = error.message.toLowerCase()
    if (message.includes('rate limit') || message.includes('after') || message.includes('seconds')) {
      return {
        error:
          'A reset link was requested recently. Please wait about a minute, then try again — and check your spam folder.',
      }
    }
    return { error: error.message }
  }
  return { success: true as const, email, ts: Date.now() }
}

const ResetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirm: z.string().min(1, 'Please confirm your password.'),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match.',
  path: ['confirm'],
})

export async function updatePassword(_: unknown, formData: FormData) {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }
  redirect('/')
}

export async function changePassword(_: unknown, formData: FormData) {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { error: error.message }
  return { success: true as const }
}

const VALID_TIER_IDS = [...TIERS.map((t) => t.id), 'admin' as const] as unknown as [TierId, ...TierId[]]

const ProfileSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters.')
    .max(50, 'Display name must be 50 characters or fewer.'),
  bio: z.string().max(300, 'Bio must be 300 characters or fewer.').optional(),
  display_tier: z.enum(VALID_TIER_IDS).nullable().optional(),
})

export async function updateProfile(_: unknown, formData: FormData) {
  const rawDisplayTier = formData.get('display_tier')
  const parsed = ProfileSchema.safeParse({
    display_name: formData.get('display_name'),
    bio: formData.get('bio') || undefined,
    display_tier: rawDisplayTier && rawDisplayTier !== '' ? rawDisplayTier : null,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not signed in.' }

  if (parsed.data.display_tier) {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('review_count, role')
      .eq('id', user.id)
      .single()
    const reviewCount = profileRow?.review_count ?? 0
    const isAdmin = profileRow?.role === 'admin'
    if (!isAdmin) {
      if (parsed.data.display_tier === 'admin') {
        return { error: 'Admin badge is not available.' }
      }
      const chosen = TIERS.find((t) => t.id === parsed.data.display_tier)
      if (!chosen || chosen.minReviews > reviewCount) {
        return { error: 'You have not yet earned that badge.' }
      }
    }
  }

  const payload: TablesUpdate<'profiles'> = {
    display_name: parsed.data.display_name,
    bio: parsed.data.bio ?? null,
    display_tier: parsed.data.display_tier ?? null,
  }

  const avatarFile = formData.get('avatar') as File | null
  if (avatarFile && avatarFile.size > 0) {
    if (avatarFile.size > 5 * 1024 * 1024) return { error: 'Avatar must be under 5 MB.' }
    const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-avatars')
      .upload(`${user.id}/avatar.${ext}`, avatarFile, { upsert: true, contentType: avatarFile.type })
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` }
    const { data: { publicUrl } } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(uploadData.path)
    payload.avatar_url = publicUrl
  }

  const { error } = await supabase.from('profiles').update(payload as never).eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/profile')
  return { success: true as const }
}
