'use client'

import { useActionState, useState, useEffect, useTransition } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { saveNotificationPreferences, savePushSubscription, removePushSubscription } from '@/lib/actions/notifications'
import type { NotificationPreferences } from '@/lib/supabase/types'

interface Props {
  prefs: NotificationPreferences
}

interface ToggleRowProps {
  id: string
  name: string
  label: string
  description: string
  defaultChecked: boolean
}

function ToggleRow({ id, name, label, description, defaultChecked }: ToggleRowProps) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          id={id}
          name={name}
          defaultChecked={defaultChecked}
          className="peer sr-only"
        />
        <div className="h-5 w-9 rounded-full bg-muted transition-colors peer-checked:bg-primary" />
        <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </div>
    </label>
  )
}

export function NotificationPrefsForm({ prefs }: Props) {
  const [state, action, isPending] = useActionState(saveNotificationPreferences, null)
  const [pushState, setPushState] = useState<'unknown' | 'granted' | 'denied' | 'unsupported'>('unknown')
  const [pushPending, startPushTransition] = useTransition()

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushState('unsupported')
      return
    }
    const p = Notification.permission
    if (p === 'granted') setPushState('granted')
    else if (p === 'denied') setPushState('denied')
    else setPushState('unknown')
  }, [])

  async function handleEnablePush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    startPushTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          setPushState('denied')
          return
        }
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) as unknown as BufferSource,
        })
        const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
        await savePushSubscription({
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        })
        setPushState('granted')
      } catch {
        setPushState('denied')
      }
    })
  }

  async function handleDisablePush() {
    if (!('serviceWorker' in navigator)) return
    startPushTransition(async () => {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await removePushSubscription(sub.endpoint)
        await sub.unsubscribe()
      }
      setPushState('unknown')
    })
  }

  return (
    <div>
      <form action={action}>
        <div className="divide-y divide-border">
          <ToggleRow
            id="new_review"
            name="new_review"
            label="New review from someone you follow"
            description="Notify when a user you follow posts a review."
            defaultChecked={prefs.new_review}
          />
          <ToggleRow
            id="new_follower"
            name="new_follower"
            label="New follower"
            description="Notify when someone starts following you."
            defaultChecked={prefs.new_follower}
          />
          <ToggleRow
            id="review_reaction"
            name="review_reaction"
            label="Reaction on your review"
            description="Notify when someone reacts to one of your reviews."
            defaultChecked={prefs.review_reaction}
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-6 w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save preferences'}
        </button>
        {state && 'error' in state && (
          <p className="mt-2 text-sm text-red-600">{state.error}</p>
        )}
        {state && 'success' in state && (
          <p className="mt-2 text-sm text-green-600">Preferences saved.</p>
        )}
      </form>

      {/* Browser push section */}
      <div className="mt-8 border-t pt-6">
        <div className="flex items-start gap-3">
          {pushState === 'granted' ? (
            <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          ) : (
            <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )}
          <div className="flex-1">
            <p className="text-sm font-medium">Browser push notifications</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {pushState === 'granted'
                ? 'You will receive push notifications in this browser.'
                : pushState === 'denied'
                ? 'Notifications are blocked. Allow them in your browser settings.'
                : pushState === 'unsupported'
                ? 'Push notifications are not supported in this browser.'
                : 'Get notified even when the app is not open.'}
            </p>
          </div>
        </div>
        {pushState !== 'unsupported' && (
          <div className="mt-3">
            {pushState === 'granted' ? (
              <button
                type="button"
                disabled={pushPending}
                onClick={handleDisablePush}
                className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
              >
                Disable push in this browser
              </button>
            ) : pushState !== 'denied' ? (
              <button
                type="button"
                disabled={pushPending}
                onClick={handleEnablePush}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {pushPending ? 'Enabling…' : 'Enable push notifications'}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}
