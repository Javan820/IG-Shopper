import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import { TIERS, getTier, type TierId } from '@/lib/constants'
import type { Profile } from '@/lib/supabase/types'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, role, review_count, tier_override, display_tier, created_at')
    .eq('id', id)
    .single()

  if (!profileData) notFound()
  const profile = profileData as Profile & { created_at: string }

  const [{ data: threads }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase
      .from('threads')
      .select('id, content, like_count, reply_count, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id),
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', id),
  ])

  const displayName = profile.display_name ?? 'Anonymous'
  const initial = displayName[0]?.toUpperCase() ?? '?'
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

  return (
    <div>
      {/* Profile Hero */}
      <div className="border-b bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/community"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Community
          </Link>

          <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary/10 ring-4 ring-white shadow-lg">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                  {initial}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <UserTierBadge
                name={displayName}
                reviewCount={profile.review_count}
                role={profile.role}
                tierOverride={profile.tier_override}
                displayTier={profile.display_tier}
                className="text-xl font-semibold"
              />
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
            {new Date(profile.created_at).toLocaleDateString('en-HK', {
              year: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      </div>

      {/* Recent Threads */}
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Recent Threads
        </h2>
        {!threads?.length ? (
          <p className="text-sm text-muted-foreground">No threads yet.</p>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => (
              <Link
                key={t.id}
                href={`/community/${t.id}`}
                className="block rounded-xl border bg-white p-3 shadow-sm hover:shadow transition-shadow"
              >
                <p className="text-sm line-clamp-2 leading-relaxed">{t.content}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" />
                    {t.like_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t.reply_count}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
