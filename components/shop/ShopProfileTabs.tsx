'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RatingStars } from '@/components/review/RatingStars'
import { RatingDistribution } from '@/components/review/RatingDistribution'
import { ReviewCard } from '@/components/review/ReviewCard'
import { ReviewForm } from '@/components/review/ReviewForm'
import { cn } from '@/lib/utils'
import type { Shop, ReviewWithProfile } from '@/lib/supabase/types'

interface DistributionItem {
  star: number
  count: number
}

type ReactionsEntry = { counts: Record<string, number>; userEmojis: string[] }

interface ShopProfileTabsProps {
  shop: Shop
  reviews: ReviewWithProfile[]
  avg_rating: number | null
  review_count: number
  distribution: DistributionItem[]
  shopId: string
  igHandle: string
  currentUserId: string | null
  userHasReviewed: boolean
  reactionsMap: Record<string, ReactionsEntry>
}

type Tab = 'reviews' | 'about'

export function ShopProfileTabs({
  shop,
  reviews,
  avg_rating,
  review_count,
  distribution,
  shopId,
  igHandle,
  currentUserId,
  userHasReviewed,
  reactionsMap,
}: ShopProfileTabsProps) {
  const [tab, setTab] = useState<Tab>('reviews')
  const [showForm, setShowForm] = useState(false)

  const canReview = !!currentUserId && !userHasReviewed

  return (
    <div>
      <div className="flex border-b bg-white" role="tablist">
        {(['reviews', 'about'] as Tab[]).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'px-5 py-3 text-sm font-medium transition-colors',
              tab === t
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t === 'reviews' ? `Reviews (${review_count})` : 'About'}
          </button>
        ))}
      </div>

      {tab === 'reviews' && (
        <div className="mt-6 space-y-6">
          {review_count > 0 && (
            <div className="flex flex-col gap-5 rounded-xl border bg-white p-5 sm:flex-row sm:items-start sm:gap-8">
              <div className="flex flex-col items-center gap-1 text-center sm:min-w-[80px]">
                <span className="text-4xl font-bold">{avg_rating!.toFixed(1)}</span>
                <RatingStars rating={Math.round(avg_rating!)} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {review_count} review{review_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex-1">
                <RatingDistribution distribution={distribution} total={review_count} />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {canReview && !showForm && (
              <Button onClick={() => setShowForm(true)}>Write a Review</Button>
            )}
            {!currentUserId && (
              <Button variant="outline" asChild>
                <a href="/login">Sign in to Review</a>
              </Button>
            )}
            {!shop.is_claimed && (
              <Button variant="outline" asChild>
                <a href="/dashboard/claim">Claim this Shop</a>
              </Button>
            )}
          </div>

          {showForm && canReview && (
            <div className="rounded-xl border bg-white p-5">
              <h3 className="mb-4 font-semibold">Write a Review</h3>
              <ReviewForm
                shopId={shopId}
                igHandle={igHandle}
                onSuccess={() => setShowForm(false)}
              />
            </div>
          )}

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  igHandle={igHandle}
                  currentUserId={currentUserId}
                  isOwnReview={r.user_id === currentUserId}
                  reactionCounts={reactionsMap[r.id]?.counts ?? {}}
                  userReactionEmojis={reactionsMap[r.id]?.userEmojis ?? []}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">
              <p className="font-medium">No reviews yet</p>
              <p className="mt-1 text-sm">Be the first to share your experience.</p>
            </div>
          )}
        </div>
      )}

      {tab === 'about' && (
        <div className="mt-6 space-y-6">
          {shop.description && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                About
              </p>
              <p className="text-sm leading-relaxed">{shop.description}</p>
            </div>
          )}

          {shop.tags && shop.tags.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Tags
              </p>
              <div className="flex flex-wrap gap-2">
                {shop.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {shop.ships_to && shop.ships_to.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ships To
              </p>
              <div className="flex flex-wrap gap-2">
                {shop.ships_to.map((dest) => (
                  <Badge key={dest} variant="outline">
                    {dest}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {shop.website_url && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Website
              </p>
              <a
                href={shop.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {shop.website_url}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          {!shop.description &&
            !shop.tags?.length &&
            !shop.payment_methods?.length &&
            !shop.ships_to?.length &&
            !shop.website_url && (
              <div className="rounded-xl border border-dashed py-14 text-center text-muted-foreground">
                <p className="font-medium">No details yet</p>
                <p className="mt-1 text-sm">Claim this shop to add more information.</p>
              </div>
            )}
        </div>
      )}
    </div>
  )
}
