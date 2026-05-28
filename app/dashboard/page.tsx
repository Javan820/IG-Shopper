import { redirect } from 'next/navigation'
import Link from 'next/link'
import { BadgeCheck, Star, MessageSquare, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import type { Shop, ShopClaim, Review } from '@/lib/supabase/types'

type ClaimWithShop = ShopClaim & {
  shops: { name: string; ig_handle: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: claimedShopData } = await supabase
    .from('shops')
    .select('*')
    .eq('claimed_by', user.id)
    .eq('is_claimed', true)
    .maybeSingle()

  const shop = claimedShopData as Shop | null

  if (shop) {
    const { data: recentReviewData } = await supabase
      .from('reviews')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
      .limit(3)

    const recentReviews = (recentReviewData ?? []) as Review[]

    const { count: reviewCount } = await supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shop.id)

    const { data: ratingRows } = await supabase
      .from('reviews')
      .select('rating')
      .eq('shop_id', shop.id)

    const allRatings = (ratingRows ?? []) as { rating: number }[]
    const avgRating =
      allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
        : null

    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-1 flex flex-wrap items-center gap-2">
                {shop.category && <CategoryBadge category={shop.category} />}
                {shop.is_verified && (
                  <span className="flex items-center gap-1 text-sm font-medium text-primary">
                    <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                    Verified
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold">{shop.name}</h1>
              <a
                href={`https://instagram.com/${shop.ig_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                @{shop.ig_handle}
              </a>
              {shop.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{shop.description}</p>
              )}
            </div>
            <Link href="/dashboard/edit">
              <Button size="sm" variant="outline">
                Edit Shop
              </Button>
            </Link>
          </div>

          <div className="mt-4 flex gap-6 border-t pt-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              <span className="font-semibold">
                {avgRating !== null ? avgRating.toFixed(1) : '—'}
              </span>
              <span className="text-muted-foreground">avg rating</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="font-semibold">{reviewCount ?? 0}</span>
              <span className="text-muted-foreground">
                review{(reviewCount ?? 0) !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Recent Reviews</h2>
            <Link
              href={`/shops/${shop.ig_handle}`}
              className="flex items-center gap-0.5 text-sm text-primary hover:underline"
            >
              View all <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          {recentReviews.length === 0 ? (
            <div className="rounded-xl border bg-white py-10 text-center shadow-sm">
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((review) => (
                <div key={review.id} className="rounded-xl border bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= review.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground/30'
                          }`}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('en-HK', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  {review.title && <p className="mt-1 text-sm font-medium">{review.title}</p>}
                  {review.body && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{review.body}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const { data: claimsData } = await supabase
    .from('shop_claims')
    .select('*, shops(name, ig_handle)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const claims = (claimsData ?? []) as unknown as ClaimWithShop[]

  if (claims.length > 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold">My Claims</h1>
        {claims.map((claim) => (
          <div key={claim.id} className="rounded-xl border bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{claim.shops?.name ?? 'Unknown shop'}</p>
                <p className="text-sm text-muted-foreground">@{claim.shops?.ig_handle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Submitted{' '}
                  {new Date(claim.created_at).toLocaleDateString('en-HK', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  claim.status === 'pending'
                    ? 'bg-amber-100 text-amber-800'
                    : claim.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
              </span>
            </div>
            {claim.status === 'rejected' && (
              <div className="mt-3 border-t pt-3">
                <Link href={`/dashboard/claim?handle=${claim.shops?.ig_handle ?? ''}`}>
                  <Button size="sm" variant="outline">
                    Resubmit Claim
                  </Button>
                </Link>
              </div>
            )}
            {claim.status === 'pending' && (
              <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
                Our team will review your claim within 72 hours.
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
      <BadgeCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
      <h1 className="text-lg font-semibold">Claim your shop</h1>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        Are you an Instagram shop owner? Claim your listing to manage your profile and respond to
        reviews.
      </p>
      <Link href="/dashboard/claim" className="mt-4 inline-block">
        <Button>Claim a Shop</Button>
      </Link>
    </div>
  )
}
