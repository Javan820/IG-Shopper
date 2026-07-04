import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ShopGrid } from '@/components/shop/ShopGrid'
import { ShopFilters } from '@/components/shop/ShopFilters'
import { SearchBar } from '@/components/common/SearchBar'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import type { ShopCardData } from '@/lib/supabase/types'

const PAGE_SIZE = 24

interface FilterParams {
  q?: string
  category?: string
  location?: string
  rating?: string
  ships?: string
  sort?: string
  page?: string
}

interface PageProps {
  searchParams: Promise<FilterParams>
}

// Row shape returned by the browse query — exactly the ShopCard fields plus
// the denormalised aggregate columns (avg_rating arrives as numeric).
interface ShopRow {
  id: string
  name: string
  ig_handle: string
  category: string | null
  location: string | null
  cover_image_url: string | null
  is_verified: boolean
  is_claimed: boolean
  avg_rating: number | string | null
  review_count: number
}

function buildPageHref(params: FilterParams, page: number): string {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.category) sp.set('category', params.category)
  if (params.location) sp.set('location', params.location)
  if (params.rating) sp.set('rating', params.rating)
  if (params.ships) sp.set('ships', params.ships)
  if (params.sort) sp.set('sort', params.sort)
  if (page > 1) sp.set('page', String(page))
  const qs = sp.toString()
  return qs ? `/shops?${qs}` : '/shops'
}

async function ShopResults({ params }: { params: FilterParams }) {
  const { q, category, location, rating, ships, sort } = params
  const supabase = await createClient()

  const pageNum = Math.max(1, parseInt(params.page ?? '1', 10) || 1)
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('shops')
    .select(
      'id, name, ig_handle, category, location, cover_image_url, is_verified, is_claimed, avg_rating, review_count',
      { count: 'exact' }
    )
    .eq('status', 'approved')
    .eq('is_active', true)

  // Substring search across name, handle, and description. PostgREST's `or`
  // filter splits on commas/parens, so strip those (plus ilike wildcards)
  // from user input before wrapping the term in our own wildcards.
  const safeQ = q
    ?.trim()
    .replace(/[%,()*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (safeQ) {
    const pattern = `*${safeQ}*`
    query = query.or(
      `name.ilike.${pattern},ig_handle.ilike.${pattern},description.ilike.${pattern}`
    )
  }
  if (category) query = query.eq('category', category)
  if (location) query = query.eq('location', location)
  if (ships) query = query.contains('ships_to', [ships])

  // Min-rating filter now runs in SQL against the denormalised column.
  // gte naturally excludes shops with NULL avg_rating (no reviews yet).
  const minRating = rating ? parseFloat(rating) : null
  if (minRating !== null && !isNaN(minRating)) {
    query = query.gte('avg_rating', minRating)
  }

  // Sorting in SQL — backed by shops_avg_rating_idx / shops_review_count_idx.
  if (sort === 'highest_rated') {
    query = query
      .order('avg_rating', { ascending: false, nullsFirst: false })
      .order('review_count', { ascending: false })
  } else if (sort === 'most_reviewed') {
    query = query
      .order('review_count', { ascending: false })
      .order('created_at', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  query = query.range(from, to)

  const { data, count } = await query
  const rows = (data ?? []) as ShopRow[]
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const shops: ShopCardData[] = rows.map((s) => ({
    id: s.id,
    name: s.name,
    ig_handle: s.ig_handle,
    category: s.category,
    location: s.location,
    cover_image_url: s.cover_image_url,
    is_verified: s.is_verified,
    is_claimed: s.is_claimed,
    avg_rating: s.avg_rating === null ? null : Number(s.avg_rating),
    review_count: s.review_count,
  }))

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
        {total} shop{total !== 1 ? 's' : ''} found
        {totalPages > 1 && ` · page ${pageNum} of ${totalPages}`}
      </p>
      <ShopGrid shops={shops} />

      {totalPages > 1 && (
        <nav
          className="mt-10 flex items-center justify-center gap-3"
          aria-label="Pagination"
        >
          <PageLink
            href={buildPageHref(params, pageNum - 1)}
            disabled={pageNum <= 1}
            rel="prev"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </PageLink>
          <span className="text-sm text-muted-foreground">
            {pageNum} / {totalPages}
          </span>
          <PageLink
            href={buildPageHref(params, pageNum + 1)}
            disabled={pageNum >= totalPages}
            rel="next"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </PageLink>
        </nav>
      )}
    </>
  )
}

function PageLink({
  href,
  disabled,
  rel,
  children,
}: {
  href: string
  disabled: boolean
  rel: 'prev' | 'next'
  children: React.ReactNode
}) {
  const base =
    'inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors'
  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className={`${base} cursor-not-allowed border-border text-muted-foreground/50`}
      >
        {children}
      </span>
    )
  }
  return (
    <Link
      href={href}
      rel={rel}
      className={`${base} border-border text-foreground hover:border-primary hover:text-primary`}
    >
      {children}
    </Link>
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
              <SearchBar defaultValue={params.q} live />
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
            <Suspense
              key={JSON.stringify(params)}
              fallback={<LoadingSkeleton count={6} />}
            >
              <ShopResults params={params} />
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  )
}
