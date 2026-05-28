'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Flag, Trash2, Smile } from 'lucide-react'
import { cn } from '@/lib/utils'
import { RatingStars } from './RatingStars'
import { flagReview, deleteReview, toggleReaction } from '@/lib/actions/reviews'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import type { ReviewWithProfile } from '@/lib/supabase/types'

const REACTION_EMOJIS = ['👍', '❤️', '🔥', '😮', '💯', '😂'] as const

interface ReviewCardProps {
  review: ReviewWithProfile
  igHandle: string
  currentUserId: string | null
  isOwnReview: boolean
  reactionCounts: Record<string, number>
  userReactionEmojis: string[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-HK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ReviewCard({
  review,
  igHandle,
  currentUserId,
  isOwnReview,
  reactionCounts,
  userReactionEmojis,
}: ReviewCardProps) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleReaction(emoji: string) {
    setPickerOpen(false)
    const fd = new FormData()
    fd.set('review_id', review.id)
    fd.set('ig_handle', igHandle)
    fd.set('emoji', emoji)
    startTransition(async () => {
      await toggleReaction(fd)
      router.refresh()
    })
  }

  const name = review.profiles?.display_name ?? 'Anonymous'
  const initial = name[0]?.toUpperCase() ?? '?'
  const reviewCount = review.profiles?.review_count ?? 0
  const role = review.profiles?.role
  const tierOverride = review.profiles?.tier_override
  const displayTier = review.profiles?.display_tier
  const avatarUrl = review.profiles?.avatar_url

  const activeEmojis = REACTION_EMOJIS.filter((e) => (reactionCounts[e] ?? 0) > 0)

  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="flex items-start gap-3">
        <Link href={`/users/${review.user_id}`} className="shrink-0" aria-label={`View ${name}'s profile`}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/users/${review.user_id}`} className="hover:opacity-80 transition-opacity">
              <UserTierBadge name={name} reviewCount={reviewCount} role={role} tierOverride={tierOverride} displayTier={displayTier} />
            </Link>
            <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
          </div>
          <RatingStars rating={review.rating} size="sm" className="mt-1" />
          {review.title && <p className="mt-2 font-medium">{review.title}</p>}
          {review.body && <p className="mt-1 text-sm text-muted-foreground">{review.body}</p>}

          {review.image_urls && review.image_urls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {review.image_urls.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden rounded-lg"
                >
                  <img
                    src={url}
                    alt={`Review photo ${i + 1}`}
                    className="h-24 w-24 object-cover transition-opacity hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          )}

          {/* Emoji reactions */}
          <div className="mt-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {activeEmojis.map((emoji) => {
                const count = reactionCounts[emoji] ?? 0
                const isActive = userReactionEmojis.includes(emoji)
                return currentUserId ? (
                  <button
                    key={emoji}
                    type="button"
                    disabled={isPending}
                    onClick={() => handleReaction(emoji)}
                    className={cn(
                      'flex cursor-pointer items-center gap-1 rounded-full border px-2 py-0.5 text-sm transition-colors',
                      isActive
                        ? 'border-primary/40 bg-primary/10 text-foreground'
                        : 'border-border bg-white text-foreground hover:border-primary/30 hover:bg-primary/5'
                    )}
                  >
                    {emoji}
                    <span className="text-xs font-medium">{count}</span>
                  </button>
                ) : (
                  <span
                    key={emoji}
                    className="flex items-center gap-1 rounded-full border border-border bg-white px-2 py-0.5 text-sm text-foreground"
                  >
                    {emoji}
                    <span className="text-xs font-medium">{count}</span>
                  </span>
                )
              })}

              {currentUserId && (
                <button
                  type="button"
                  onClick={() => setPickerOpen((p) => !p)}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5',
                    pickerOpen ? 'border-primary/40 bg-primary/5' : 'border-dashed border-border'
                  )}
                  aria-label="Add reaction"
                >
                  <Smile className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>

            {pickerOpen && currentUserId && (
              <div className="mt-1.5 flex w-fit gap-0.5 rounded-lg border bg-white p-1.5 shadow-sm">
                {REACTION_EMOJIS.map((emoji) => {
                  const isActive = userReactionEmojis.includes(emoji)
                  return (
                    <button
                      key={emoji}
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReaction(emoji)}
                      className={cn(
                        'rounded-md p-1.5 text-lg leading-none transition-colors hover:bg-muted',
                        isActive && 'bg-primary/10 ring-1 ring-primary/30'
                      )}
                      aria-label={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Flag / Delete */}
          {currentUserId && (
            <div className="mt-2 flex items-center gap-1">
              {!isOwnReview && (
                <form action={flagReview}>
                  <input type="hidden" name="review_id" value={review.id} />
                  <input type="hidden" name="ig_handle" value={igHandle} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Flag this review"
                  >
                    <Flag className="h-3 w-3" aria-hidden="true" />
                    Flag
                  </button>
                </form>
              )}

              {isOwnReview && (
                <form
                  action={deleteReview}
                  onSubmit={(e) => {
                    if (!confirm('Delete your review? This cannot be undone.')) e.preventDefault()
                  }}
                >
                  <input type="hidden" name="review_id" value={review.id} />
                  <input type="hidden" name="ig_handle" value={igHandle} />
                  <button
                    type="submit"
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete your review"
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    Delete
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
