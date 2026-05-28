'use client'

import { useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { toggleThreadLike } from '@/lib/actions/threads'

interface LikeButtonProps {
  threadId: string
  initialLiked: boolean
  initialCount: number
}

export function LikeButton({ threadId, initialLiked, initialCount }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await toggleThreadLike(threadId)
      if ('liked' in result) {
        setLiked(result.liked)
        setCount((prev) => (result.liked ? prev + 1 : Math.max(prev - 1, 0)))
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={`group flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50 ${
        liked ? 'text-rose-500' : 'text-muted-foreground hover:text-rose-500'
      }`}
    >
      <span className={`p-1.5 rounded-full transition-colors ${liked ? 'bg-rose-500/10' : 'group-hover:bg-rose-500/10'}`}>
        <Heart className={`h-[18px] w-[18px] ${liked ? 'fill-current' : ''}`} />
      </span>
      {count > 0 && count}
    </button>
  )
}
