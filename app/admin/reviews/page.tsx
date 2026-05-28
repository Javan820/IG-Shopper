import { createAdminClient } from '@/lib/supabase/admin'
import { dismissFlag, removeReview } from '@/lib/actions/reviews'
import { Button } from '@/components/ui/button'
import { RatingStars } from '@/components/review/RatingStars'
import type { ReviewFlag, Review } from '@/lib/supabase/types'

type FlagWithRelations = ReviewFlag & {
  reviews:
    | (Review & {
        profiles: { display_name: string | null } | null
        shops: { name: string; ig_handle: string } | null
      })
    | null
}

export default async function AdminReviewsPage() {
  const adminClient = createAdminClient()

  const { data: flagData } = await adminClient
    .from('review_flags')
    .select('*, reviews(*, profiles(display_name), shops(name, ig_handle))')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const flags = (flagData ?? []) as FlagWithRelations[]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Flagged Reviews</h1>
        <p className="text-sm text-muted-foreground">
          {flags.length === 0
            ? 'No flagged reviews.'
            : `${flags.length} review${flags.length === 1 ? '' : 's'} flagged for moderation`}
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
          <p className="text-muted-foreground">All caught up — no flagged reviews.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {flags.map((flag) => {
            const review = flag.reviews
            if (!review) return null
            return (
              <div key={flag.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RatingStars rating={review.rating} size="sm" />
                      {review.title && (
                        <span className="font-semibold">{review.title}</span>
                      )}
                    </div>

                    {review.body && (
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                        {review.body}
                      </p>
                    )}

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Shop:{' '}
                        <a
                          href={`/shops/${review.shops?.ig_handle}`}
                          className="text-primary hover:underline"
                        >
                          {review.shops?.name ?? review.shops?.ig_handle ?? 'Unknown'}
                        </a>
                      </span>
                      <span>
                        By:{' '}
                        <span className="font-medium text-foreground">
                          {review.profiles?.display_name ?? 'Unknown user'}
                        </span>
                      </span>
                      <span>
                        Flagged{' '}
                        {new Date(flag.created_at).toLocaleDateString('en-HK', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <form action={dismissFlag}>
                      <input type="hidden" name="flag_id" value={flag.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Dismiss
                      </Button>
                    </form>
                    <form action={removeReview}>
                      <input type="hidden" name="review_id" value={review.id} />
                      <input
                        type="hidden"
                        name="ig_handle"
                        value={review.shops?.ig_handle ?? ''}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remove Review
                      </Button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
