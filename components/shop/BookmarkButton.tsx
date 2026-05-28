'use client'

import { useActionState } from 'react'
import { Bookmark } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleBookmark } from '@/lib/actions/bookmarks'

type State = { error: string } | { success: true; bookmarked: boolean } | null

interface BookmarkButtonProps {
  shopId: string
  igHandle: string
  initialBookmarked: boolean
}

export function BookmarkButton({ shopId, igHandle, initialBookmarked }: BookmarkButtonProps) {
  const [state, action, pending] = useActionState<State, FormData>(toggleBookmark, null)

  const isBookmarked =
    state && 'success' in state ? state.bookmarked : initialBookmarked

  return (
    <form action={action}>
      <input type="hidden" name="shop_id" value={shopId} />
      <input type="hidden" name="ig_handle" value={igHandle} />
      <button
        type="submit"
        disabled={pending}
        className={cn(
          'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
          isBookmarked
            ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            : 'border-border text-muted-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary'
        )}
        aria-label={isBookmarked ? 'Remove from saved' : 'Save shop'}
      >
        <Bookmark
          className={cn('h-4 w-4', isBookmarked && 'fill-primary')}
          aria-hidden="true"
        />
        {isBookmarked ? 'Saved' : 'Save'}
      </button>
    </form>
  )
}
