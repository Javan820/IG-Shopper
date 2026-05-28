import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditShopForm } from '@/components/dashboard/EditShopForm'
import type { Shop } from '@/lib/supabase/types'

export default async function EditShopPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: shopData } = await supabase
    .from('shops')
    .select('*')
    .eq('claimed_by', user.id)
    .eq('is_claimed', true)
    .maybeSingle()

  if (!shopData) redirect('/dashboard')

  const shop = shopData as Shop

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Edit Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update your shop&apos;s listing information. Changes go live immediately.
        </p>
      </div>

      <div className="max-w-lg rounded-xl border bg-white p-6 shadow-sm">
        <EditShopForm shop={shop} />
      </div>
    </div>
  )
}
