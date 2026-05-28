import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPush, type PushSub } from '@/lib/push'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function checkShopHandleStatus(
  shopId: string,
  igHandle: string,
  shopName: string,
): Promise<void> {
  const admin = createAdminClient()

  const { data: shop } = await admin
    .from('shops')
    .select('ig_handle_status, ig_handle_checked_at')
    .eq('id', shopId)
    .single()

  if (!shop) return

  const lastChecked = shop.ig_handle_checked_at
    ? new Date(shop.ig_handle_checked_at).getTime()
    : 0
  if (Date.now() - lastChecked < CHECK_INTERVAL_MS) return

  const wasAlreadyBroken = shop.ig_handle_status === 'broken'

  let newStatus: 'active' | 'broken' | null = null
  try {
    const res = await fetch(`https://www.instagram.com/${igHandle}/`, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IGShopHK/1.0)' },
    })
    if (res.status === 404) {
      newStatus = 'broken'
    } else if (res.status >= 200 && res.status < 400) {
      newStatus = 'active'
    }
    // 429/403/5xx = possibly rate-limited — skip and retry next visit
  } catch {
    return
  }

  if (!newStatus) return

  await admin
    .from('shops')
    .update({
      ig_handle_status: newStatus,
      ig_handle_checked_at: new Date().toISOString(),
    })
    .eq('id', shopId)

  if (newStatus === 'broken' && !wasAlreadyBroken) {
    await notifyAdminsHandleBroken(shopName, igHandle)
  }
}

async function notifyAdminsHandleBroken(shopName: string, igHandle: string) {
  const admin = createAdminClient()

  const { data: admins } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'admin')

  if (!admins || admins.length === 0) return

  const adminIds = admins.map((a) => a.id)
  const title = `IG handle may be broken: @${igHandle}`
  const body = `${shopName} (@${igHandle}) returned a 404 — the shop may have changed or deleted its Instagram handle.`
  const url = '/admin/shops'

  await admin.from('notifications').insert(
    adminIds.map((id) => ({ user_id: id, type: 'handle_broken' as const, title, body, url })),
  )

  const { data: subsRaw } = await admin
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .in('user_id', adminIds)

  await Promise.all(
    ((subsRaw ?? []) as (PushSub & { user_id: string })[]).map(async (sub) => {
      const result = await sendPush(sub, { title, body, url })
      if (result.expired) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }),
  )
}
