import Link from 'next/link'
import { Heart, MessageCircle } from 'lucide-react'
import { MentionText } from './MentionText'
import { LikeButton } from './LikeButton'
import { RelativeTime } from './RelativeTime'
import { DeleteThreadButton } from './DeleteThreadButton'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import type { ThreadWithProfile } from '@/lib/supabase/types'

interface ThreadCardProps {
  thread: ThreadWithProfile
  currentUserId: string | null
  isLiked: boolean
  isAdmin?: boolean
}

export function ThreadCard({ thread, currentUserId, isLiked, isAdmin }: ThreadCardProps) {
  const displayName = thread.profiles.display_name ?? 'Anonymous'
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const canDelete = currentUserId === thread.user_id || isAdmin
  const profileHref = `/users/${thread.user_id}`

  return (
    <article className="flex gap-3 px-4 py-3 border-b hover:bg-slate-50/50 transition-colors">
      <div className="shrink-0">
        <Link href={profileHref} className="block">
          {thread.profiles.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thread.profiles.avatar_url}
              alt={displayName}
              className="h-10 w-10 rounded-full object-cover hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-white hover:opacity-90 transition-opacity">
              {initial}
            </div>
          )}
        </Link>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1 min-w-0 flex-wrap">
            <Link href={profileHref} className="hover:underline">
              <UserTierBadge
                name={displayName}
                reviewCount={thread.profiles.review_count ?? 0}
                role={thread.profiles.role}
                tierOverride={thread.profiles.tier_override}
                displayTier={thread.profiles.display_tier}
                className="text-[15px] leading-tight"
              />
            </Link>
            <span className="text-muted-foreground">·</span>
            <RelativeTime date={thread.created_at} />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {thread.category && (
              <Link
                href={`/community?category=${encodeURIComponent(thread.category)}`}
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {thread.category}
              </Link>
            )}
            {canDelete && <DeleteThreadButton threadId={thread.id} />}
          </div>
        </div>

        <p className="mt-1 text-[15px] leading-normal whitespace-pre-wrap break-words">
          <MentionText content={thread.content} />
        </p>

        {thread.image_url && (
          <a
            href={thread.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block overflow-hidden rounded-xl"
          >
            <img
              src={thread.image_url}
              alt="Thread photo"
              className="max-h-64 w-full object-cover transition-opacity hover:opacity-90"
            />
          </a>
        )}

        <div className="flex items-center gap-5 mt-3 -ml-1.5">
          <Link
            href={`/community/${thread.id}`}
            className="group flex items-center gap-1.5 text-sm text-muted-foreground hover:text-sky-500 transition-colors"
          >
            <span className="p-1.5 rounded-full group-hover:bg-sky-500/10 transition-colors">
              <MessageCircle className="h-[18px] w-[18px]" />
            </span>
            {thread.reply_count > 0 && <span>{thread.reply_count}</span>}
          </Link>

          {currentUserId ? (
            <LikeButton
              threadId={thread.id}
              initialLiked={isLiked}
              initialCount={thread.like_count}
            />
          ) : (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="p-1.5 rounded-full">
                <Heart className="h-[18px] w-[18px]" />
              </span>
              {thread.like_count > 0 && thread.like_count}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
