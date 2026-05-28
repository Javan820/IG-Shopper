import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ShopGrid } from '@/components/shop/ShopGrid'
import { ShopFilters } from '@/components/shop/ShopFilters'
import { SearchBar } from '@/components/common/SearchBar'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import type { Shop, Review, ShopCardData } from '@/lib/supabase/types'

interface FilterParams {
  q?: string
  category?: string
  location?: string
  rating?: string
  payment?: string
  ships?: string
  sort?: string
}

interface PageProps {
  searchParams: Promise<FilterParams>
}

async function ShopResults({ params }: { params: FilterParams }) {
  const { q, category, location, rating, payment, ships, sort } = params
  const supabase = await createClient()

  let query = supabase
    .from('shops')
    .select('*')
    .eq('status', 'approved')
    .eq('is_active', true)

  const trimmedQ = q?.trim()
  if (trimmedQ) {
    query = query.textSearch('search_vector', trimmedQ, {
      type: 'websearch',
      config: 'english',
    })
  }
  if (category) query = query.eq('category', category)
  if (location) query = query.eq('location', location)
  if (payment) query = query.contains('payment_methods', [payment])
  if (ships) query = query.contains('ships_to', [ships])
  if (!sort || sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  }

  const { data } = await query
  const shopRows = (data ?? []) as Shop[]

  let shops: ShopCardData[] = shopRows.map((s) => ({
    id: s.id,
    name: s.name,
    ig_handle: s.ig_handle,
    category: s.category,
    location: s.location,
    cover_image_url: s.cover_image_url,
    is_verified: s.is_verified,
    is_claimed: s.is_claimed,
    avg_rating: null,
    review_count: 0,
  }))

  if (shopRows.length > 0) {
    const shopIds = shopRows.map((s) => s.id)
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .in('shop_id', shopIds)

    const statsMap = new Map<string, { sum: number; count: number }>()
    for (const r of (reviewData ?? []) as Review[]) {
      const prev = statsMap.get(r.shop_id) ?? { sum: 0, count: 0 }
      statsMap.set(r.shop_id, { sum: prev.sum + (r.rating as number), count: prev.count + 1 })
    }

    shops = shops.map((s) => {
      const stats = statsMap.get(s.id)
      return stats
        ? { ...s, avg_rating: stats.sum / stats.count, review_count: stats.count }
        : s
    })
  }

  const minRating = rating ? parseFloat(rating) : null
  if (minRating !== null && !isNaN(minRating)) {
    shops = shops.filter((s) => s.avg_rating !== null && s.avg_rating >= minRating)
  }

  if (sort === 'highest_rated') {
    shops.sort((a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0))
  } else if (sort === 'most_reviewed') {
    shops.sort((a, b) => b.review_count - a.review_count)
  }

  if (!shops.length) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium">No shops found</p>
        <p className="mt-1 text-sm">Try adjusting your filters or search terms.</p>
      </div>
    )
  }

  return (
    <>
      <p className="mb-6 text-sm text-muted-foreground">
        {shops.length} shop{shops.length !== 1 ? 's' : ''} found
      </p>
      <ShopGrid shops={shops} />
    </>
  )
}

export default async function ShopsPage({ searchParams }: PageProps) {
  const params = await searchParams

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold">Browse Shops</h1>
              {params.q && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Results for &ldquo;{params.q}&rdquo;
                </p>
              )}
            </div>
            <div className="w-full sm:w-80">
              <SearchBar defaultValue={params.q} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
          <aside className="w-full shrink-0 lg:w-60">
            <ShopFilters currentFilters={params} />
          </aside>
          <main className="min-w-0 flex-1">
            <Suspense fallback={<LoadingSkeleton count={6} />}>
              <ShopResults params={params} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
