import Link from 'next/link'
import { MentionText } from './MentionText'
import { RelativeTime } from './RelativeTime'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import { DeleteReplyButton } from './DeleteReplyButton'
import type { ThreadReplyWithProfile } from '@/lib/supabase/types'

interface ReplyCardProps {
  reply: ThreadReplyWithProfile
  threadId: string
  currentUserId: string | null
  isAdmin?: boolean
}

export function ReplyCard({ reply, threadId, currentUserId, isAdmin }: ReplyCardProps) {
  const displayName = reply.profiles.display_name ?? 'Anonymous'
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const canDelete = currentUserId === reply.user_id || isAdmin
  const profileHref = `/users/${reply.user_id}`

  return (
    <div className="flex gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors">
      <div className="shrink-0">
        <Link href={profileHref} className="block">
          {reply.profiles.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reply.profiles.avatar_url}
              alt={displayName}
              className="h-9 w-9 rounded-full object-cover hover:opacity-90 transition-opacity"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 hover:opacity-90 transition-opacity">
              {initial}
            </div>
          )}
        </Link>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <Link href={profileHref} className="hover:underline">
              <UserTierBadge
                name={displayName}
                reviewCount={reply.profiles.review_count ?? 0}
                role={reply.profiles.role}
                tierOverride={reply.profiles.tier_override}
                displayTier={reply.profiles.display_tier}
                className="text-[14px] leading-tight"
              />
            </Link>
            <span className="text-muted-foreground">·</span>
            <RelativeTime date={reply.created_at} />
          </div>
          {canDelete && (
            <DeleteReplyButton replyId={reply.id} threadId={threadId} />
          )}
        </div>
        <p className="mt-0.5 text-[14px] leading-normal whitespace-pre-wrap break-words">
          <MentionText content={reply.content} />
        </p>

        {reply.image_url && (
          <a
            href={reply.image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block overflow-hidden rounded-xl"
          >
            <img
              src={reply.image_url}
              alt="Reply photo"
              className="max-h-48 w-full object-cover transition-opacity hover:opacity-90"
            />
          </a>
        )}
      </div>
    </div>
  )
}
