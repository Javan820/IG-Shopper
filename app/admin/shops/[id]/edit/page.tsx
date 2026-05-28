import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminEditShopForm } from '@/components/admin/AdminEditShopForm'
import type { Shop } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminEditShopPage({ params }: PageProps) {
  const { id } = await params
  const adminClient = createAdminClient()

  const { data: shopData } = await adminClient
    .from('shops')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!shopData) notFound()

  const shop = shopData as Shop

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/shops"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Shops
        </Link>
        <h1 className="text-xl font-bold">Edit Shop</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          @{shop.ig_handle} · {shop.status}
        </p>
      </div>

      <div className="max-w-lg rounded-xl border bg-white p-6 shadow-sm">
        <AdminEditShopForm shop={shop} />
      </div>
    </div>
  )
}
