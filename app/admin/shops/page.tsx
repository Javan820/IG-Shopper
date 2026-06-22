export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { approveShop, rejectShop } from '@/lib/actions/shops'
import { ClearRejectedButton } from '@/components/admin/ClearRejectedButton'
import { Button } from '@/components/ui/button'
import type { Shop } from '@/lib/supabase/types'

function ShopCard({ shop, showRejectButton = true }: { shop: Shop; showRejectButton?: boolean }) {
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{shop.name}</h2>
            {shop.source === 'discovery' && (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                Auto-discovered
              </span>
            )}
            <a
              href={`https://instagram.com/${shop.ig_handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              @{shop.ig_handle}
            </a>
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {shop.category && <span>{shop.category}</span>}
            {shop.location && <span>· {shop.location}</span>}
            {shop.ships_to?.length ? <span>· Ships to: {shop.ships_to.join(', ')}</span> : null}
          </div>

          {shop.description && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{shop.description}</p>
          )}

          {shop.website_url && (
            <a
              href={shop.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-xs text-primary hover:underline"
            >
              {shop.website_url}
            </a>
          )}

          <p className="mt-2 text-xs text-muted-foreground">
            Submitted{' '}
            {new Date(shop.created_at).toLocaleDateString('en-HK', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link href={`/admin/shops/${shop.id}/edit`}>
            <Button type="button" size="sm" variant="outline">
              Edit
            </Button>
          </Link>
          <form action={approveShop}>
            <input type="hidden" name="shop_id" value={shop.id} />
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700">
              Approve
            </Button>
          </form>
          {showRejectButton && (
            <form action={rejectShop}>
              <input type="hidden" name="shop_id" value={shop.id} />
              <Button type="submit" size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                Reject
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function AdminShopsPage() {
  const adminClient = createAdminClient()

  const [{ data: pendingData, error }, { data: rejectedData }, { data: approvedData }] = await Promise.all([
    adminClient.from('shops').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
    adminClient.from('shops').select('*').eq('status', 'rejected').order('created_at', { ascending: false }),
    adminClient.from('shops').select('*').eq('status', 'approved').order('name', { ascending: true }),
  ])

  if (error) return <div className="p-4 text-red-600 font-mono text-sm">DB error: {error.message}</div>

  const pending = (pendingData ?? []) as Shop[]
  const rejected = (rejectedData ?? []) as Shop[]
  const approved = (approvedData ?? []) as Shop[]

  return (
    <div className="space-y-10">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Shop Approval Queue</h1>
            <p className="text-sm text-muted-foreground">
              {pending.length === 0
                ? 'No pending submissions.'
                : `${pending.length} shop${pending.length === 1 ? '' : 's'} awaiting review`}
            </p>
          </div>
        </div>

        {pending.length === 0 ? (
          <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
            <p className="text-muted-foreground">All caught up — no pending submissions.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((shop) => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        )}
      </div>

      {rejected.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Rejected Shops</h2>
              <p className="text-sm text-muted-foreground">
                {rejected.length} rejected — approve to reinstate
              </p>
            </div>
            <ClearRejectedButton count={rejected.length} />
          </div>
          <div className="space-y-4">
            {rejected.map((shop) => <ShopCard key={shop.id} shop={shop} showRejectButton={false} />)}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Live Shops</h2>
          <p className="text-sm text-muted-foreground">
            {approved.length} approved shop{approved.length !== 1 ? 's' : ''} — edit details or manage status
          </p>
        </div>
        {approved.length === 0 ? (
          <div className="rounded-xl border bg-white py-10 text-center shadow-sm">
            <p className="text-muted-foreground">No approved shops yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {approved.map((shop) => (
              <ShopCard key={shop.id} shop={shop} showRejectButton={true} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
