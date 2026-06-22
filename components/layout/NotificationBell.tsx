import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/auth'

export async function NotificationBell() {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null)

  const unread = count ?? 0

  return (
    <Link
      href="/notifications"
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
    >
      <Bell className="h-5 w-5" aria-hidden="true" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
