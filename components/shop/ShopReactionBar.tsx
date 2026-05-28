'use client'

import { useState, useTransition } from 'react'
import { toggleShopReaction } from '@/lib/actions/reactions'
import type { ReactionType } from '@/lib/actions/reactions'

const REACTIONS: { key: ReactionType; emoji: string; label: string }[] = [
  { key: 'recommend', emoji: '👍', label: 'Would recommend' },
  { key: 'neutral',   emoji: '🤔', label: 'Not sure' },
  { key: 'avoid',     emoji: '👎', label: 'Avoid' },
]

interface Props {
  shopId: string
  igHandle: string
  counts: Record<ReactionType, number>
  userReaction: ReactionType | null
  isLoggedIn: boolean
}

export function ShopReactionBar({
  shopId,
  igHandle,
  counts: initialCounts,
  userReaction: initialUserReaction,
  isLoggedIn,
}: Props) {
  const [counts, setCounts] = useState(initialCounts)
  const [userReaction, setUserReaction] = useState<ReactionType | null>(initialUserReaction)
  const [pending, startTransition] = useTransition()
  const [lastError, setLastError] = useState<string | null>(null)

  function handleReact(reaction: ReactionType) {
    if (!isLoggedIn || pending) return

    const prevCounts = { ...counts }
    const prevReaction = userReaction
    const next = { ...counts }

    if (userReaction === reaction) {
      next[reaction] = Math.max(0, next[reaction] - 1)
      setCounts(next)
      setUserReaction(null)
    } else {
      if (userReaction) next[userReaction] = Math.max(0, next[userReaction] - 1)
      next[reaction] += 1
      setCounts(next)
      setUserReaction(reaction)
    }

    startTransition(async () => {
      const result = await toggleShopReaction(shopId, igHandle, reaction)
      if ('error' in result) {
        setCounts(prevCounts)
        setUserReaction(prevReaction)
        setLastError(result.error)
      } else {
        setLastError(null)
      }
    })
  }

  const total = counts.recommend + counts.neutral + counts.avoid

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map(({ key, emoji, label }) => {
          const selected = userReaction === key
          const count = counts[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleReact(key)}
              disabled={pending}
              title={isLoggedIn ? undefined : 'Sign in to react'}
              className={[
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
                !isLoggedIn ? 'cursor-default' : 'cursor-pointer',
                pending ? 'opacity-60' : '',
              ].join(' ')}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{label}</span>
              {count > 0 && (
                <span
                  className={[
                    'rounded-full px-1.5 py-0.5 text-xs tabular-nums',
                    selected
                      ? 'bg-white/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  ].join(' ')}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {total === 0 && (
        <p className="text-xs text-muted-foreground">
          {isLoggedIn ? 'Be the first to react' : 'Sign in to react'}
        </p>
      )}
      {lastError && (
        <p className="text-xs text-red-500">Error: {lastError}</p>
      )}
    </div>
  )
}
