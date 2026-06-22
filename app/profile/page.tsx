import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EditProfileDialog } from './EditProfileDialog'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import { RatingStars } from '@/components/review/RatingStars'
import { ShopCard } from '@/components/shop/ShopCard'
import { Button } from '@/components/ui/button'
import { TIERS, getTier, type TierId } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { Profile, ShopCardData } from '@/lib/supabase/types'

type ReviewWithShop = {
  id: string
  rating: 1 | 2 | 3 | 4 | 5
  title: string | null
  body: string | null
  created_at: string
  shops: {
    id: string
    name: string
    ig_handle: string
    category: string | null
    location: string | null
    cover_image_url: string | null
    is_verified: boolean
    is_claimed: boolean
  } | null
}

function ProfileReviewCard({ review }: { review: ReviewWithShop }) {
  const shop = review.shops
  return (
    <div className="rounded-xl border bg-white/80 p-4 shadow-sm backdrop-blur-sm">
      {shop && (
        <Link
          href={`/shops/${shop.ig_handle}`}
          className="mb-3 flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-primary/10">
            {shop.cover_image_url ? (
              <img
                src={shop.cover_image_url}
                alt={shop.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary">
                IG
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{shop.name}</p>
            <p className="text-xs text-muted-foreground">@{shop.ig_handle}</p>
          </div>
        </Link>
      )}
      <RatingStars rating={review.rating} size="sm" />
      {review.title && <p className="mt-2 text-sm font-medium">{review.title}</p>}
      {review.body && (
        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{review.body}</p>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {new Date(review.created_at).toLocaleDateString('en-HK', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </p>
    </div>
  )
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'reviews' } = await searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (!profileData) redirect('/login')
  const profile = profileData as Profile

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', user.id),
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', user.id),
  ])

  let reviews: ReviewWithShop[] = []
  let savedShops: ShopCardData[] = []

  if (tab === 'reviews') {
    const { data } = await supabase
      .from('reviews')
      .select(
        'id, rating, title, body, created_at, shops(id, name, ig_handle, category, location, cover_image_url, is_verified, is_claimed)'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    reviews = (data ?? []) as unknown as ReviewWithShop[]
  }

  if (tab === 'saved') {
    const { data } = await supabase
      .from('saved_shops')
      .select(
        'shops(id, name, ig_handle, category, location, cover_image_url, is_verified, is_claimed, avg_rating, review_count)'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    savedShops = (
      (data ?? []) as unknown as Array<{
        shops: (Omit<ShopCardData, 'avg_rating' | 'review_count'> & {
          avg_rating: number | string | null
          review_count: number
        }) | null
      }>
    )
      .filter((row) => row.shops !== null)
      .map((row) => ({
        ...row.shops!,
        avg_rating: row.shops!.avg_rating === null ? null : Number(row.shops!.avg_rating),
        review_count: row.shops!.review_count,
      }))
  }

  const isAdmin = profile.role === 'admin'
  const tier = getTier(profile.review_count, profile.tier_override as TierId | null)
  const nextTier = !isAdmin
    ? (TIERS.find((t) => t.minReviews > profile.review_count) ?? null)
    : null
  const progressPct = nextTier
    ? Math.round(
        ((profile.review_count - tier.minReviews) /
          (nextTier.minReviews - tier.minReviews)) *
          100
      )
    : 100

  const tabItems = [
    { id: 'reviews', label: 'My Reviews', count: profile.review_count },
    { id: 'saved', label: 'Saved Shops' },
  ] as const

  return (
    <div>
      {/* Profile Hero */}
      <div className="border-b bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-4 ring-white shadow-lg">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name ?? 'Avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                  {profile.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <UserTierBadge
                name={profile.display_name ?? 'User'}
                reviewCount={profile.review_count}
                role={profile.role}
                tierOverride={profile.tier_override}
                displayTier={profile.display_tier}
                className="text-xl font-semibold"
              />
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
              {profile.bio && (
                <p className="mt-2 max-w-sm text-sm text-foreground/80">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="mt-4 flex justify-center gap-8 sm:justify-start">
                <div className="text-center">
                  <p className="text-xl font-bold leading-tight">{profile.review_count}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold leading-tight">{followerCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold leading-tight">{followingCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Following</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-row gap-2 sm:flex-col">
              <EditProfileDialog profile={profile} />
              <ChangePasswordDialog />
              <Button variant="ghost" size="sm" asChild>
                <Link href="/profile/notifications" className="flex items-center gap-1.5">
                  <Bell className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Notifications</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Tier progress bar */}
          {nextTier && (
            <div className="mt-6 rounded-xl border bg-white/60 px-4 py-3">
              <div className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">
                <span>{tier.label}</span>
                <span>
                  {nextTier.label} in {nextTier.minReviews - profile.review_count} review
                  {nextTier.minReviews - profile.review_count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {isAdmin && (
            <p className="mt-4 text-center text-xs text-muted-foreground sm:text-left">
              Platform administrator
            </p>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground sm:text-left">
            Member since{' '}
            {new Date(user.created_at).toLocaleDateString('en-HK', {
              year: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="sticky top-16 z-40 border-b bg-white/70 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <nav className="flex" aria-label="Profile sections">
            {tabItems.map((t) => (
              <Link
                key={t.id}
                href={`/profile?tab=${t.id}`}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium transition-colors',
                  tab === t.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
                {'count' in t && t.count !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                      tab === t.id
                        ? 'bg-primary/10 text-primary'
                        : 'bg-slate-100 text-muted-foreground'
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {tab === 'reviews' && (
          <div className="space-y-4">
            {reviews.length === 0 ? (
              <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
                <p className="text-lg font-medium">No reviews yet</p>
                <p className="mt-1 text-sm">Explore shops and share your thoughts!</p>
                <Button asChild className="mt-4">
                  <Link href="/shops">Browse Shops</Link>
                </Button>
              </div>
            ) : (
              reviews.map((review) => <ProfileReviewCard key={review.id} review={review} />)
            )}
          </div>
        )}

        {tab === 'saved' && (
          <div>
            {savedShops.length === 0 ? (
              <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
                <p className="text-lg font-medium">No saved shops yet</p>
                <p className="mt-1 text-sm">Bookmark shops you love to find them easily later.</p>
                <Button asChild className="mt-4">
                  <Link href="/shops">Browse Shops</Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {savedShops.map((shop) => (
                  <ShopCard key={shop.id} shop={shop} />
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
