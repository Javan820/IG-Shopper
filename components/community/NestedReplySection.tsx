'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createReply } from '@/lib/actions/threads'
import { Button } from '@/components/ui/button'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import { RelativeTime } from './RelativeTime'
import { MentionText } from './MentionText'
import { DeleteReplyButton } from './DeleteReplyButton'
import type { ThreadReplyWithProfile } from '@/lib/supabase/types'

type ReplyNode = ThreadReplyWithProfile & { children: ReplyNode[] }

function buildTree(replies: ThreadReplyWithProfile[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>()
  const roots: ReplyNode[] = []

  for (const reply of replies) {
    map.set(reply.id, { ...reply, children: [] })
  }

  for (const reply of replies) {
    const node = map.get(reply.id)!
    if (reply.parent_reply_id && map.has(reply.parent_reply_id)) {
      map.get(reply.parent_reply_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

interface ReplyItemProps {
  node: ReplyNode
  threadId: string
  currentUserId: string | null
  isAdmin: boolean
  depth: number
}

function ReplyItem({ node, threadId, currentUserId, isAdmin, depth }: ReplyItemProps) {
  const [showReplyBox, setShowReplyBox] = useState(false)
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const displayName = node.profiles.display_name ?? 'Anonymous'
  const initial = displayName[0]?.toUpperCase() ?? '?'
  const canDelete = currentUserId === node.user_id || isAdmin
  const profileHref = `/users/${node.user_id}`

  function handleSubmitReply() {
    if (!content.trim()) return
    setError(null)
    const formData = new FormData()
    formData.set('thread_id', threadId)
    formData.set('content', content)
    formData.set('parent_reply_id', node.id)

    startTransition(async () => {
      const result = await createReply(null, formData)
      if (result && 'error' in result) {
        setError(result.error)
      } else {
        setContent('')
        setShowReplyBox(false)
        router.refresh()
      }
    })
  }

  // Apply indentation wrapper only for nested replies (depth > 0)
  const nestingClass = depth > 0 ? 'ml-6 border-l-2 border-slate-100' : ''

  return (
    <div className={nestingClass}>
      <div className="flex gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-slate-50/50 transition-colors">
        <div className="shrink-0">
          <Link href={profileHref}>
            {node.profiles.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={node.profiles.avatar_url}
                alt={displayName}
                className="h-8 w-8 rounded-full object-cover hover:opacity-90 transition-opacity"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600 hover:opacity-90 transition-opacity">
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
                  reviewCount={node.profiles.review_count ?? 0}
                  role={node.profiles.role}
                  tierOverride={node.profiles.tier_override}
                  displayTier={node.profiles.display_tier}
                  className="text-[13px] leading-tight"
                />
              </Link>
              <span className="text-muted-foreground text-xs">·</span>
              <RelativeTime date={node.created_at} />
            </div>
            {canDelete && <DeleteReplyButton replyId={node.id} threadId={threadId} />}
          </div>

          <p className="mt-0.5 text-[14px] leading-normal whitespace-pre-wrap break-words">
            <MentionText content={node.content} />
          </p>

          {node.image_url && (
            <a
              href={node.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block overflow-hidden rounded-xl w-fit"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={node.image_url}
                alt="Reply photo"
                className="max-h-48 object-cover transition-opacity hover:opacity-90"
              />
            </a>
          )}

          {currentUserId && (
            <button
              type="button"
              onClick={() => { setShowReplyBox((v) => !v); setError(null) }}
              className="mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showReplyBox ? 'Cancel' : 'Reply'}
            </button>
          )}
        </div>
      </div>

      {showReplyBox && (
        <div className="px-4 py-3 bg-slate-50/60 border-b">
          <div className="ml-11 space-y-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value.replace(/\p{Extended_Pictographic}/gu, ''))}
              placeholder={`Reply to ${displayName}…`}
              maxLength={300}
              rows={2}
              className="w-full bg-white rounded-lg border border-input px-3 py-2 text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={isPending || !content.trim()}
                className="rounded-full px-4"
              >
                {isPending ? 'Posting…' : 'Reply'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowReplyBox(false); setContent(''); setError(null) }}
                className="rounded-full px-4"
              >
                Cancel
              </Button>
              <span className="ml-auto text-xs text-muted-foreground">{content.length}/300</span>
            </div>
          </div>
        </div>
      )}

      {node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <ReplyItem
              key={child.id}
              node={child}
              threadId={threadId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface NestedReplySectionProps {
  threadId: string
  initialReplies: ThreadReplyWithProfile[]
  currentUserId: string | null
  isAdmin: boolean
}

export function NestedReplySection({ threadId, initialReplies, currentUserId, isAdmin }: NestedReplySectionProps) {
  const tree = buildTree(initialReplies)

  if (tree.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-sm text-muted-foreground">
        No replies yet. Be the first to reply!
      </div>
    )
  }

  return (
    <div>
      {tree.map((node) => (
        <ReplyItem
          key={node.id}
          node={node}
          threadId={threadId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          depth={0}
        />
      ))}
    </div>
  )
}
