import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ShopCard } from '@/components/shop/ShopCard'
import type { Shop, ShopCardData } from '@/lib/supabase/types'

export default async function SavedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: savedRows } = await supabase
    .from('saved_shops')
    .select('shop_id, shops ( id, name, ig_handle, category, location, cover_image_url, is_verified, is_claimed )')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const shops = (savedRows ?? [])
    .map((row) => row.shops as unknown as Shop | null)
    .filter((s): s is Shop => s !== null)

  const shopIds = shops.map((s) => s.id)

  const reviewMap: Record<string, { count: number; total: number }> = {}
  if (shopIds.length > 0) {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('shop_id, rating')
      .in('shop_id', shopIds)

    for (const r of reviews ?? []) {
      if (!reviewMap[r.shop_id]) reviewMap[r.shop_id] = { count: 0, total: 0 }
      reviewMap[r.shop_id].count++
      reviewMap[r.shop_id].total += r.rating
    }
  }

  const shopCards: ShopCardData[] = shops.map((shop) => {
    const stats = reviewMap[shop.id]
    return {
      id: shop.id,
      name: shop.name,
      ig_handle: shop.ig_handle,
      category: shop.category,
      location: shop.location,
      cover_image_url: shop.cover_image_url,
      is_verified: shop.is_verified,
      is_claimed: shop.is_claimed,
      avg_rating: stats && stats.count > 0 ? stats.total / stats.count : null,
      review_count: stats?.count ?? 0,
    }
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-2xl font-bold">Saved Shops</h1>

        {shopCards.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {shopCards.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed py-20 text-center text-muted-foreground">
            <p className="font-medium">No saved shops yet</p>
            <p className="mt-1 text-sm">
              Browse shops and tap <strong>Save</strong> to bookmark them here.
            </p>
            <Link
              href="/shops"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Browse Shops →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
