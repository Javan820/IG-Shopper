import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThreadCard } from '@/components/community/ThreadCard'
import { ThreadComposer } from '@/components/community/ThreadComposer'
import { CategoryFilter } from '@/components/community/CategoryFilter'
import type { ThreadWithProfile } from '@/lib/supabase/types'

interface PageProps {
  searchParams: Promise<{ category?: string }>
}

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Community — IGShop HK',
  description: 'Discuss, share, and discover IG shops with the community.',
}

export default async function CommunityPage({ searchParams }: PageProps) {
  const { category } = await searchParams
  const supabase = await createClient()

  const baseQuery = supabase
    .from('threads')
    .select('*, profiles!user_id(display_name, avatar_url, role, review_count, tier_override, display_tier)')
    .order('created_at', { ascending: false })
    .limit(50)

  const [{ data: { user } }, { data: threadsData }] = await Promise.all([
    supabase.auth.getUser(),
    category ? baseQuery.eq('category', category) : baseQuery,
  ])

  const threads = threadsData ?? []

  let isAdmin = false
  let likedIds = new Set<string>()
  if (user) {
    const [profileResult, likesResult] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      threads.length > 0
        ? supabase
            .from('thread_likes')
            .select('thread_id')
            .eq('user_id', user.id)
            .in('thread_id', threads.map((t) => t.id))
        : Promise.resolve({ data: null }),
    ])
    isAdmin = profileResult.data?.role === 'admin'
    likedIds = new Set(likesResult.data?.map((l) => l.thread_id) ?? [])
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Discuss, share, and discover IG shops
        </p>
      </div>

      <Suspense>
        <CategoryFilter />
      </Suspense>

      <div className="rounded-xl border overflow-hidden">
        {user ? (
          <ThreadComposer />
        ) : (
          <div className="px-4 py-3 border-b bg-slate-50/50 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>{' '}
            to join the conversation
          </div>
        )}

        {!threads.length ? (
          <div className="p-10 text-center text-muted-foreground">
            No threads yet{category ? ` in "${category}"` : ''}. Be the first to post!
          </div>
        ) : (
          threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread as unknown as ThreadWithProfile}
              currentUserId={user?.id ?? null}
              isLiked={likedIds.has(thread.id)}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>
    </main>
  )
}
