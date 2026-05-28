'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, UserMinus } from 'lucide-react'
import { followUser, unfollowUser } from '@/lib/actions/follows'

interface FollowButtonProps {
  targetId: string
  initialIsFollowing: boolean
  initialFollowerCount: number
  currentUserId: string | null
}

export function FollowButton({
  targetId,
  initialIsFollowing,
  initialFollowerCount,
  currentUserId,
}: FollowButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)

  if (!currentUserId) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{followerCount} follower{followerCount !== 1 ? 's' : ''}</span>
      </div>
    )
  }

  function handleClick() {
    const fd = new FormData()
    fd.set('target_id', targetId)

    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowerCount((c) => c + (wasFollowing ? -1 : 1))

    startTransition(async () => {
      const result = await (wasFollowing ? unfollowUser(fd) : followUser(fd))
      if ('error' in result && result.error) {
        setIsFollowing(wasFollowing)
        setFollowerCount((c) => c + (wasFollowing ? 1 : -1))
      }
      router.refresh()
    })
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">
        {followerCount} follower{followerCount !== 1 ? 's' : ''}
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className={
          isFollowing
            ? 'flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50'
            : 'flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50'
        }
      >
        {isFollowing ? (
          <>
            <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
            Following
          </>
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Follow
          </>
        )}
      </button>
    </div>
  )
}
