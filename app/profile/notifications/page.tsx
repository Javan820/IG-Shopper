import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { NotificationPrefsForm } from './NotificationPrefsForm'
import type { NotificationPreferences } from '@/lib/supabase/types'

export default async function NotificationSettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  const prefs = (data as NotificationPreferences | null) ?? {
    user_id: user.id,
    new_review: true,
    new_follower: true,
    review_reaction: true,
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="mb-1 text-2xl font-bold">Notification Settings</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          Choose which activities send you notifications.
        </p>
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <NotificationPrefsForm prefs={prefs} />
        </div>
      </div>
    </div>
  )
}
