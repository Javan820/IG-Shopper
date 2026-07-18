'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { TIERS, type TierId } from '@/lib/constants'

function parseTier(value: string): TierId | null | undefined {
  if (value === 'auto') return null
  return TIERS.some((t) => t.id === value) ? (value as TierId) : undefined
}

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
  return profile?.role === 'admin' ? user : null
}

export async function setUserTier(_: unknown, formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const userId = formData.get('user_id') as string
  const value = formData.get('tier_override') as string

  const tierOverride = parseTier(value)
  if (tierOverride === undefined) return { error: 'Invalid tier.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ tier_override: tierOverride })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true as const }
}

export async function setUserDisplayTier(_: unknown, formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const userId = formData.get('user_id') as string
  const value = formData.get('display_tier') as string

  const displayTier = parseTier(value)
  if (displayTier === undefined) return { error: 'Invalid tier.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ display_tier: displayTier })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true as const }
}

export async function setUserRole(_: unknown, formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const userId = formData.get('user_id') as string
  const role = formData.get('role') as string

  if (role !== 'user' && role !== 'admin') return { error: 'Invalid role.' }
  if (userId === admin.id) return { error: 'Cannot change your own role.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) return { error: error.message }

  revalidatePath('/admin/users')
  return { success: true as const }
}
