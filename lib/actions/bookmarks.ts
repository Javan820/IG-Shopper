'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleBookmark(_: unknown, formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sign in to save shops.' }

  const shopId = formData.get('shop_id') as string
  const igHandle = formData.get('ig_handle') as string
  if (!shopId) return { error: 'Missing shop ID.' }

  const { data: existing } = await supabase
    .from('saved_shops')
    .select('id')
    .eq('user_id', user.id)
    .eq('shop_id', shopId)
    .maybeSingle()

  if (existing) {
    await supabase.from('saved_shops').delete().eq('id', existing.id)
  } else {
    await supabase
      .from('saved_shops')
      .insert({ user_id: user.id, shop_id: shopId } as never)
  }

  revalidatePath(`/shops/${igHandle}`)
  revalidatePath('/saved')
  return { success: true as const, bookmarked: !existing }
}
