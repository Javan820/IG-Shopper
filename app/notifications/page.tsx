import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, CheckCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { markAllNotificationsRead } from '@/lib/actions/notifications'
import type { Notification } from '@/lib/supabase/types'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function NotificationItem({ n }: { n: Notification }) {
  const isUnread = !n.read_at
  const content = (
    <div
      className={`flex items-start gap-3 rounded-lg px-4 py-3 transition-colors ${
        isUnread ? 'bg-primary/5' : 'hover:bg-muted/50'
      }`}
    >
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${
          isUnread ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}
      >
        {n.type === 'new_follower' ? '👤' : n.type === 'new_review' ? '⭐' : n.type === 'handle_broken' ? '⚠️' : '😊'}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${isUnread ? 'font-medium text-foreground' : 'text-foreground'}`}>
          {n.title}
        </p>
        {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
      </div>
      {isUnread && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
      )}
    </div>
  )

  if (n.url) {
    return (
      <Link href={n.url} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg">
        {content}
      </Link>
    )
  }
  return <div>{content}</div>
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (data ?? []) as Notification[]
  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h1 className="text-xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <form action={markAllNotificationsRead as unknown as (fd: FormData) => Promise<void>}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all read
              </button>
            </form>
          )}
        </div>

        <div className="rounded-xl border bg-white divide-y divide-border overflow-hidden shadow-sm">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <Bell className="mb-3 h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
              <p className="font-medium text-muted-foreground">No notifications yet</p>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Follow users to get notified when they post reviews.
              </p>
            </div>
          ) : (
            notifications.map((n) => <NotificationItem key={n.id} n={n} />)
          )}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link href="/profile/notifications" className="underline underline-offset-2 hover:text-foreground">
            Manage notification settings
          </Link>
        </p>
      </div>
    </div>
  )
}
