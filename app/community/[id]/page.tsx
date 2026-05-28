import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ThreadCard } from '@/components/community/ThreadCard'
import { ReplyComposer } from '@/components/community/ReplyComposer'
import { NestedReplySection } from '@/components/community/NestedReplySection'
import type { ThreadWithProfile, ThreadReplyWithProfile } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ThreadDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    isAdmin = profile?.role === 'admin'
  }

  const { data: thread } = await supabase
    .from('threads')
    .select('*, profiles!user_id(display_name, avatar_url, role, review_count, tier_override, display_tier)')
    .eq('id', id)
    .single()

  if (!thread) notFound()

  const { data: replies } = await supabase
    .from('thread_replies')
    .select('*, profiles!user_id(display_name, avatar_url, role, review_count, tier_override, display_tier)')
    .eq('thread_id', id)
    .order('created_at', { ascending: true })

  let isLiked = false
  if (user) {
    const { data: like } = await supabase
      .from('thread_likes')
      .select('thread_id')
      .eq('thread_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    isLiked = !!like
  }

  const replyCount = replies?.length ?? 0

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Community
      </Link>

      <div className="rounded-xl border overflow-hidden">
        <ThreadCard
          thread={thread as unknown as ThreadWithProfile}
          currentUserId={user?.id ?? null}
          isLiked={isLiked}
          isAdmin={isAdmin}
        />

        {replyCount > 0 && (
          <div className="px-4 py-2 bg-slate-50/70 border-b">
            <p className="text-sm font-semibold text-muted-foreground">
              {replyCount} {replyCount === 1 ? 'Reply' : 'Replies'}
            </p>
          </div>
        )}

        {user ? (
          <ReplyComposer threadId={id} />
        ) : (
          <div className="px-4 py-3 border-b text-sm text-muted-foreground">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>{' '}
            to reply
          </div>
        )}

        <NestedReplySection
          threadId={id}
          initialReplies={(replies ?? []) as unknown as ThreadReplyWithProfile[]}
          currentUserId={user?.id ?? null}
          isAdmin={isAdmin}
        />
      </div>
    </main>
  )
}
