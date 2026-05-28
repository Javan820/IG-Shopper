import 'server-only'
import webpush from 'web-push'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL!}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export interface PushPayload {
  title: string
  body: string
  url: string
}

export interface PushSub {
  endpoint: string
  p256dh: string
  auth: string
}

export async function sendPush(sub: PushSub, payload: PushPayload): Promise<{ expired: boolean }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload)
    )
    return { expired: false }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    if (status === 404 || status === 410) return { expired: true }
    return { expired: false }
  }
}
