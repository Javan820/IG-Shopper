'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ShopClaimInsert } from '@/lib/supabase/types'

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

const ClaimSchema = z.object({
  ig_handle: z
    .string()
    .min(1, 'Instagram handle is required.')
    .max(30, 'Handle must be 30 characters or fewer.'),
  ig_proof: z
    .string()
    .min(10, 'Please describe how you can prove ownership (min 10 characters).')
    .max(1000, 'Proof must be 1000 characters or fewer.'),
})

export async function submitClaim(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to claim a shop.' }

  const parsed = ClaimSchema.safeParse({
    ig_handle: formData.get('ig_handle'),
    ig_proof: formData.get('ig_proof'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const handle = parsed.data.ig_handle.toLowerCase().replace(/^@/, '')

  const { data: shop } = await supabase
    .from('shops')
    .select('id, is_claimed, claimed_by')
    .eq('ig_handle', handle)
    .eq('status', 'approved')
    .eq('is_active', true)
    .maybeSingle()

  if (!shop) return { error: `@${handle} was not found in the directory.` }
  if (shop.is_claimed && shop.claimed_by === user.id) return { error: 'You already own this shop.' }
  if (shop.is_claimed) return { error: 'This shop has already been claimed by another user.' }

  const { data: existingClaim } = await supabase
    .from('shop_claims')
    .select('id, status')
    .eq('shop_id', shop.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingClaim?.status === 'pending') {
    return { error: 'You already have a pending claim for this shop. We will review it within 72 hours.' }
  }
  if (existingClaim?.status === 'approved') {
    return { error: 'Your claim for this shop is already approved.' }
  }

  if (existingClaim) {
    const { error } = await supabase
      .from('shop_claims')
      .update({ ig_proof: parsed.data.ig_proof, status: 'pending' } as never)
      .eq('id', existingClaim.id)
    if (error) return { error: error.message }
  } else {
    const payload: ShopClaimInsert = {
      shop_id: shop.id,
      user_id: user.id,
      ig_proof: parsed.data.ig_proof,
    }
    const { error } = await supabase.from('shop_claims').insert(payload as never)
    if (error) return { error: error.message }
  }

  redirect('/dashboard/claim?success=1')
}

export async function approveClaim(formData: FormData) {
  const claimId = formData.get('claim_id') as string
  if (!claimId) return { error: 'Missing claim ID.' }

  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const adminClient = createAdminClient()

  const { data: claim } = await adminClient
    .from('shop_claims')
    .select('id, shop_id, user_id')
    .eq('id', claimId)
    .maybeSingle()

  if (!claim) return { error: 'Claim not found.' }

  const { error: claimError } = await adminClient
    .from('shop_claims')
    .update({ status: 'approved' } as never)
    .eq('id', claimId)

  if (claimError) return { error: claimError.message }

  const { error: shopError } = await adminClient
    .from('shops')
    .update({ is_claimed: true, claimed_by: claim.user_id, is_verified: true } as never)
    .eq('id', claim.shop_id)

  if (shopError) return { error: shopError.message }

  revalidatePath('/admin/claims')
  return { success: true as const }
}

export async function rejectClaim(formData: FormData) {
  const claimId = formData.get('claim_id') as string
  if (!claimId) return { error: 'Missing claim ID.' }

  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from('shop_claims')
    .update({ status: 'rejected' } as never)
    .eq('id', claimId)

  if (error) return { error: error.message }

  revalidatePath('/admin/claims')
  return { success: true as const }
}
