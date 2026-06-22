'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { CATEGORIES, LOCATIONS, SHIPS_TO } from '@/lib/constants'
import type { TablesInsert, TablesUpdate } from '@/lib/supabase/types'

const SubmitShopSchema = z.object({
  ig_handle: z
    .string()
    .min(1, 'Instagram handle is required.')
    .max(30, 'Handle must be 30 characters or fewer.')
    .regex(/^@?[a-zA-Z0-9_.]+$/, 'Handle can only contain letters, numbers, underscores, and periods.'),
  name: z
    .string()
    .min(2, 'Shop name must be at least 2 characters.')
    .max(100, 'Shop name must be 100 characters or fewer.'),
  category: z.enum(CATEGORIES),
  location: z.enum(LOCATIONS),
  description: z.string().max(500, 'Description must be 500 characters or fewer.').optional(),
  website_url: z.string().url('Please enter a valid URL.').optional(),
  ships_to: z.enum(SHIPS_TO).optional(),
})

export async function submitShop(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'You must be signed in to submit a shop.' }

  const parsed = SubmitShopSchema.safeParse({
    ig_handle: formData.get('ig_handle'),
    name: formData.get('name'),
    category: formData.get('category') || undefined,
    location: formData.get('location') || undefined,
    description: formData.get('description') || undefined,
    website_url: formData.get('website_url') || undefined,
    ships_to: formData.get('ships_to') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const handle = parsed.data.ig_handle.toLowerCase().replace(/^@/, '')

  const { data: existing } = await supabase
    .from('shops')
    .select('id, status')
    .eq('ig_handle', handle)
    .maybeSingle()

  if (existing) {
    if (existing.status === 'rejected') return { error: `@${handle} was previously rejected. An admin can re-approve it from the admin panel.` }
    if (existing.status === 'approved') return { error: `@${handle} is already listed in the directory.` }
    return { error: `@${handle} is already pending review.` }
  }

  const payload: TablesInsert<'shops'> = {
    ig_handle: handle,
    name: parsed.data.name,
    category: parsed.data.category,
    location: parsed.data.location,
    description: parsed.data.description ?? null,
    website_url: parsed.data.website_url ?? null,
    ships_to: parsed.data.ships_to ? [parsed.data.ships_to] : null,
    submitted_by: user.id,
  }

  const { error } = await supabase.from('shops').insert(payload as never)
  if (error) return { error: error.message }

  revalidatePath('/admin/shops')
  redirect('/submit?success=1')
}

const UpdateShopSchema = z.object({
  shop_id: z.string().uuid('Invalid shop ID.'),
  ig_handle: z.string().min(1),
  name: z.string().min(2, 'Shop name must be at least 2 characters.').max(100),
  category: z.enum(CATEGORIES),
  location: z.enum(LOCATIONS),
  sub_location: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  website_url: z.string().url('Please enter a valid URL.').optional(),
  ships_to: z.enum(SHIPS_TO).optional(),
})

export async function updateShop(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to edit your shop.' }

  const parsed = UpdateShopSchema.safeParse({
    shop_id: formData.get('shop_id'),
    ig_handle: formData.get('ig_handle'),
    name: formData.get('name'),
    category: formData.get('category') || undefined,
    location: formData.get('location') || undefined,
    sub_location: formData.get('sub_location') || undefined,
    description: formData.get('description') || undefined,
    website_url: formData.get('website_url') || undefined,
    ships_to: formData.get('ships_to') || undefined,
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { data: shop } = await supabase
    .from('shops')
    .select('id, claimed_by, is_claimed')
    .eq('id', parsed.data.shop_id)
    .maybeSingle()

  if (!shop || !shop.is_claimed || shop.claimed_by !== user.id) {
    return { error: 'You do not have permission to edit this shop.' }
  }

  const payload: TablesUpdate<'shops'> = {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    location: parsed.data.location,
    sub_location: parsed.data.sub_location ?? null,
    website_url: parsed.data.website_url ?? null,
    ships_to: parsed.data.ships_to ? [parsed.data.ships_to] : null,
  }

  const { error } = await supabase.from('shops').update(payload as never).eq('id', shop.id)
  if (error) return { error: error.message }

  revalidatePath(`/shops/${parsed.data.ig_handle}`)
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/edit')
  return { success: true as const }
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

export async function approveShop(formData: FormData): Promise<void> {
  const shopId = formData.get('shop_id') as string
  if (!shopId) throw new Error('Missing shop ID.')

  const admin = await requireAdmin()
  if (!admin) throw new Error('Unauthorised.')

  const adminClient = createAdminClient()
  const payload: TablesUpdate<'shops'> = { status: 'approved', is_active: true }
  const { error } = await adminClient.from('shops').update(payload as never).eq('id', shopId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/shops')
}

export async function rejectShop(formData: FormData): Promise<void> {
  const shopId = formData.get('shop_id') as string
  if (!shopId) throw new Error('Missing shop ID.')

  const admin = await requireAdmin()
  if (!admin) throw new Error('Unauthorised.')

  const adminClient = createAdminClient()
  const payload: TablesUpdate<'shops'> = { status: 'rejected', is_active: false }
  const { error } = await adminClient.from('shops').update(payload as never).eq('id', shopId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/shops')
}

const AdminUpdateShopSchema = z.object({
  shop_id: z.string().uuid('Invalid shop ID.'),
  ig_handle: z
    .string()
    .min(1, 'Instagram handle is required.')
    .max(30, 'Handle must be 30 characters or fewer.')
    .regex(/^@?[a-zA-Z0-9_.]+$/, 'Handle can only contain letters, numbers, underscores, and periods.'),
  name: z.string().min(2, 'Shop name must be at least 2 characters.').max(100),
  category: z.enum(CATEGORIES),
  location: z.enum(LOCATIONS),
  sub_location: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  website_url: z.string().url('Please enter a valid URL.').optional(),
  ships_to: z.enum(SHIPS_TO).optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  is_verified: z.coerce.boolean(),
  is_active: z.coerce.boolean(),
})

export async function adminUpdateShop(_: unknown, formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const parsed = AdminUpdateShopSchema.safeParse({
    shop_id: formData.get('shop_id'),
    ig_handle: formData.get('ig_handle'),
    name: formData.get('name'),
    category: formData.get('category') || undefined,
    location: formData.get('location') || undefined,
    sub_location: formData.get('sub_location') || undefined,
    description: formData.get('description') || undefined,
    website_url: formData.get('website_url') || undefined,
    ships_to: formData.get('ships_to') || undefined,
    status: formData.get('status'),
    is_verified: formData.get('is_verified') === 'true',
    is_active: formData.get('is_active') === 'true',
  })

  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const handle = parsed.data.ig_handle.toLowerCase().replace(/^@/, '')

  const adminClient = createAdminClient()

  const { data: conflict } = await adminClient
    .from('shops')
    .select('id')
    .eq('ig_handle', handle)
    .neq('id', parsed.data.shop_id)
    .maybeSingle()

  if (conflict) return { error: `@${handle} is already used by another shop.` }

  const payload: TablesUpdate<'shops'> = {
    ig_handle: handle,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    location: parsed.data.location,
    sub_location: parsed.data.sub_location ?? null,
    website_url: parsed.data.website_url ?? null,
    ships_to: parsed.data.ships_to ? [parsed.data.ships_to] : null,
    status: parsed.data.status,
    is_verified: parsed.data.is_verified,
    is_active: parsed.data.is_active,
  }

  const { error } = await adminClient.from('shops').update(payload as never).eq('id', parsed.data.shop_id)
  if (error) return { error: error.message }

  revalidatePath('/admin/shops')
  revalidatePath(`/shops/${handle}`)
  return { success: true as const }
}

export async function uploadShopCover(formData: FormData) {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const shopId = formData.get('shop_id') as string
  const file = formData.get('cover_image') as File | null

  if (!shopId) return { error: 'Missing shop ID.' }
  if (!file || file.size === 0) return { error: 'No file selected.' }
  if (file.size > 10 * 1024 * 1024) return { error: 'Image must be under 10 MB.' }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${shopId}/cover.${ext}`

  const adminClient = createAdminClient()

  const { data: shop } = await adminClient
    .from('shops')
    .select('ig_handle, cover_image_url')
    .eq('id', shopId)
    .maybeSingle()

  if (!shop) return { error: 'Shop not found.' }

  if (shop.cover_image_url?.includes('/shop-covers/')) {
    const oldPath = shop.cover_image_url.split('/shop-covers/')[1]
    if (oldPath) await adminClient.storage.from('shop-covers').remove([decodeURIComponent(oldPath)])
  }

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await adminClient.storage
    .from('shop-covers')
    .upload(path, arrayBuffer, { contentType: file.type, upsert: true })

  if (uploadError) return { error: uploadError.message }

  const { data: urlData } = adminClient.storage.from('shop-covers').getPublicUrl(path)

  const { error: updateError } = await adminClient
    .from('shops')
    .update({ cover_image_url: urlData.publicUrl } as never)
    .eq('id', shopId)

  if (updateError) return { error: updateError.message }

  revalidatePath('/admin/shops')
  revalidatePath(`/shops/${shop.ig_handle}`)
  return { success: true as const }
}

export async function clearRejectedShops() {
  const admin = await requireAdmin()
  if (!admin) return { error: 'Unauthorised.' }

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('shops').delete().eq('status', 'rejected')
  if (error) return { error: error.message }

  revalidatePath('/admin/shops')
  return { success: true as const }
}
