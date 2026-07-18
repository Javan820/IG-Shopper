import { notFound } from 'next/navigation'
import { after } from 'next/server'
import Image from 'next/image'
import Link from 'next/link'
import { Suspense } from 'react'
import { MapPin, BadgeCheck, ExternalLink, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { checkShopHandleStatus } from '@/lib/handle-check'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import { RatingStars } from '@/components/review/RatingStars'
import { ShopProfileTabs } from '@/components/shop/ShopProfileTabs'
import { BookmarkButton } from '@/components/shop/BookmarkButton'
import { ShopReactionBar } from '@/components/shop/ShopReactionBar'
import { ReviewListSkeleton } from '@/components/common/LoadingSkeleton'
import { ShopPostsDeck } from '@/components/shop/ShopPostsDeck'
import type { Shop, ShopPost, Review, ReviewWithProfile } from '@/lib/supabase/types'
import type { ReactionType } from '@/lib/actions/reactions'

const COVER_GRADIENTS: Record<string, string> = {
  'Fashion & Clothing':      'from-[#3B1F3E] to-[#7A2E4E]',
  'Beauty & Skincare':       'from-[#4A2030] to-[#8A4A2E]',
  'Food & Drinks':           'from-[#4A2A12] to-[#8A5A1E]',
  'Art & Prints':            'from-[#1E2A4A] to-[#3E4A7A]',
  'Jewellery & Accessories': 'from-[#4A3A12] to-[#8A6A1E]',
  'Home & Lifestyle':        'from-[#1E3A2A] to-[#2E6A5A]',
  'Books & Stationery':      'from-[#26304A] to-[#3E5A7A]',
  'Health & Wellness':       'from-[#1A3A32] to-[#2E6A56]',
  'Vintage & Second-hand':   'from-[#3A3230] to-[#6A4A2E]',
  'Digital Products':        'from-[#32264A] to-[#5A3E7A]',
  'Other':                   'from-[#2E2A26] to-[#4A443E]',
}

function getGradient(category: string | null): string {
  return category
    ? (COVER_GRADIENTS[category] ?? COVER_GRADIENTS['Other'])
    : COVER_GRADIENTS['Other']
}

async function ShopReviews({ shop, userId }: { shop: Shop; userId: string | null }) {
  const supabase = await createClient()

  const { data: reviewData } = await supabase
    .from('reviews')
    .select('id, shop_id, user_id, rating, title, body, is_verified_buyer, helpful_count, created_at')
    .eq('shop_id', shop.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const rawReviews = reviewData ?? []

  let profileMap = new Map<string, { display_name: string | null; avatar_url: string | null; review_count: number; role: 'user' | 'admin'; tier_override: string | null; display_tier: string | null }>()
  if (rawReviews.length > 0) {
    const userIds = [...new Set(rawReviews.map((r) => r.user_id as string))]
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url, review_count, role, tier_override, display_tier')
      .in('id', userIds)
    profileMap = new Map((profileData ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url, review_count: p.review_count, role: p.role, tier_override: p.tier_override, display_tier: p.display_tier }]))
  }

  const reviews: ReviewWithProfile[] = rawReviews.map((r) => ({
    ...(r as Review),
    profiles: profileMap.get(r.user_id as string) ?? { display_name: null, avatar_url: null, review_count: 0, role: 'user' as const, tier_override: null, display_tier: null },
  }))

  const review_count = reviews.length
  const avg_rating =
    review_count > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / review_count
      : null

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  type ReactionsEntry = { counts: Record<string, number>; userEmojis: string[] }
  let userHasReviewed = false
  const reactionsMap: Record<string, ReactionsEntry> = {}

  if (reviews.length > 0) {
    const reviewIds = reviews.map((r) => r.id)

    const [{ data: reactionsData }, userReviewResult] = await Promise.all([
      supabase
        .from('review_reactions')
        .select('review_id, emoji, user_id')
        .in('review_id', reviewIds),
      userId
        ? supabase
            .from('reviews')
            .select('id')
            .eq('shop_id', shop.id)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])

    userHasReviewed = !!userReviewResult.data

    for (const row of reactionsData ?? []) {
      const rId = row.review_id as string
      if (!reactionsMap[rId]) reactionsMap[rId] = { counts: {}, userEmojis: [] }
      const entry = reactionsMap[rId]
      const e = row.emoji as string
      entry.counts[e] = (entry.counts[e] ?? 0) + 1
      if (userId && (row.user_id as string) === userId) entry.userEmojis.push(e)
    }
  }

  return (
    <ShopProfileTabs
      shop={shop}
      reviews={reviews}
      avg_rating={avg_rating}
      review_count={review_count}
      distribution={distribution}
      shopId={shop.id}
      igHandle={shop.ig_handle}
      currentUserId={userId}
      userHasReviewed={userHasReviewed}
      reactionsMap={reactionsMap}
    />
  )
}

interface PageProps {
  params: Promise<{ ig_handle: string }>
}

export default async function ShopProfilePage({ params }: PageProps) {
  const { ig_handle } = await params
  const handle = decodeURIComponent(ig_handle).toLowerCase().replace(/^@/, '')
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: shopData } = await supabase
    .from('shops')
    .select('*')
    .eq('ig_handle', handle)
    .eq('status', 'approved')
    .eq('is_active', true)
    .single()

  if (!shopData) notFound()
  const shop = shopData as Shop

  const lastChecked = shop.ig_handle_checked_at
    ? new Date(shop.ig_handle_checked_at).getTime()
    : 0
  if (Date.now() - lastChecked > 24 * 60 * 60 * 1000) {
    after(() => checkShopHandleStatus(shop.id, shop.ig_handle, shop.name))
  }

  const [
    { data: savedData },
    { data: reactionRows },
    { data: userReactionData },
    { data: postRows },
  ] = await Promise.all([
    user
      ? supabase
          .from('saved_shops')
          .select('id')
          .eq('user_id', user.id)
          .eq('shop_id', shop.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('shop_reactions').select('reaction').eq('shop_id', shop.id),
    user
      ? supabase
          .from('shop_reactions')
          .select('reaction')
          .eq('shop_id', shop.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('shop_posts')
      .select('*')
      .eq('shop_id', shop.id)
      .order('position', { ascending: true })
      .limit(10),
  ])

  // Aggregate rating comes from the denormalised columns on the shop row
  // (maintained by the apply_review_stats trigger) — no extra query needed.
  const review_count = shop.review_count
  const avg_rating = shop.avg_rating === null ? null : Number(shop.avg_rating)
  const isBookmarked = !!savedData

  const reactionCounts: Record<ReactionType, number> = { recommend: 0, neutral: 0, avoid: 0 }
  for (const row of reactionRows ?? []) {
    const r = row.reaction as ReactionType
    if (r in reactionCounts) reactionCounts[r]++
  }
  const userReaction = (userReactionData?.reaction ?? null) as ReactionType | null
  const shopPosts = (postRows ?? []) as ShopPost[]

  const gradient = getGradient(shop.category)

  return (
    <div className="min-h-screen">
      {/* Cover — blurred backdrop + contained image, muted brand-dark gradient fallback */}
      <div className={`relative h-52 w-full overflow-hidden bg-gradient-to-br ${gradient} sm:h-64`}>
        {shop.cover_image_url ? (
          <>
            <Image
              src={shop.cover_image_url}
              alt=""
              aria-hidden="true"
              fill
              className="scale-110 object-cover opacity-60 blur-2xl"
              priority
            />
            <Image
              src={shop.cover_image_url}
              alt={shop.name}
              fill
              className="object-contain drop-shadow-xl"
              priority
            />
          </>
        ) : (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <span
              className="select-none text-4xl font-black tracking-wide text-white/25 sm:text-5xl"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              @{shop.ig_handle}
            </span>
          </div>
        )}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Shop info card — overlaps the cover */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-10 rounded-2xl border border-[--border] bg-white px-5 py-6 shadow-[0_2px_4px_rgba(26,15,8,0.04),0_20px_48px_-16px_rgba(26,15,8,0.18)] sm:-mt-12 sm:px-8">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {shop.category && <CategoryBadge category={shop.category} />}
            {shop.is_verified && (
              <span className="flex items-center gap-1 text-sm font-medium text-primary">
                <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                Verified
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold sm:text-3xl">{shop.name}</h1>

          <div className="mt-1 flex flex-wrap items-center gap-2">
            <a
              href={`https://instagram.com/${shop.ig_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              @{shop.ig_handle}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
            {shop.ig_handle_status === 'broken' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Handle may have changed
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
            {avg_rating !== null && (
              <span className="flex items-center gap-1.5">
                <RatingStars rating={Math.round(avg_rating)} size="sm" />
                <span className="font-semibold">{avg_rating.toFixed(1)}</span>
                <span className="text-muted-foreground">
                  ({review_count} review{review_count !== 1 ? 's' : ''})
                </span>
              </span>
            )}
            {shop.location && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                {shop.location}
                {shop.sub_location && ` · ${shop.sub_location}`}
              </span>
            )}
          </div>

          {shop.description && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {shop.description}
            </p>
          )}

          {/* Quick reactions */}
          <ShopReactionBar
            shopId={shop.id}
            igHandle={shop.ig_handle}
            counts={reactionCounts}
            userReaction={userReaction}
            isLoggedIn={!!user}
          />

          {user && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <BookmarkButton
                shopId={shop.id}
                igHandle={shop.ig_handle}
                initialBookmarked={isBookmarked}
              />
              {!shop.is_claimed && (
                <Link
                  href={`/dashboard/claim?handle=${shop.ig_handle}`}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Claim this shop
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {shopPosts.length > 0 && (
        <div className="mx-auto max-w-4xl px-4 pt-8 sm:px-6 lg:px-8">
          <ShopPostsDeck
            posts={shopPosts}
            igHandle={shop.ig_handle}
            shopName={shop.name}
            avatarUrl={shop.cover_image_url}
            gradient={gradient}
          />
        </div>
      )}

      {/* Tabs + content — reviews streamed via Suspense */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<ReviewListSkeleton count={3} />}>
          <ShopReviews shop={shop} userId={user?.id ?? null} />
        </Suspense>
      </div>
    </div>
  )
}
