import { createAdminClient } from '@/lib/supabase/admin'
import { approveClaim, rejectClaim } from '@/lib/actions/claims'
import { Button } from '@/components/ui/button'
import type { ShopClaim } from '@/lib/supabase/types'

type ClaimWithRelations = ShopClaim & {
  shops: { name: string; ig_handle: string } | null
  profiles: { display_name: string | null } | null
}

export default async function AdminClaimsPage() {
  const adminClient = createAdminClient()

  const { data: pending } = await adminClient
    .from('shop_claims')
    .select('*, shops(name, ig_handle), profiles(display_name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  const claims = (pending ?? []) as ClaimWithRelations[]

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Claims Queue</h1>
          <p className="text-sm text-muted-foreground">
            {claims.length === 0
              ? 'No pending claims.'
              : `${claims.length} claim${claims.length === 1 ? '' : 's'} awaiting review`}
          </p>
        </div>
      </div>

      {claims.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center shadow-sm">
          <p className="text-muted-foreground">All caught up — no pending claims.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div key={claim.id} className="rounded-xl border bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{claim.shops?.name ?? 'Unknown shop'}</h2>
                    <a
                      href={`https://instagram.com/${claim.shops?.ig_handle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      @{claim.shops?.ig_handle}
                    </a>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Claimed by:{' '}
                    <span className="font-medium text-foreground">
                      {claim.profiles?.display_name ?? 'Unknown user'}
                    </span>
                  </p>

                  {claim.ig_proof && (
                    <div className="mt-3 rounded-md bg-slate-50 p-3">
                      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Proof of ownership
                      </p>
                      <p className="text-sm">{claim.ig_proof}</p>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground">
                    Submitted{' '}
                    {new Date(claim.created_at).toLocaleDateString('en-HK', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <form action={approveClaim}>
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <Button
                      type="submit"
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Approve
                    </Button>
                  </form>
                  <form action={rejectClaim}>
                    <input type="hidden" name="claim_id" value={claim.id} />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                    >
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
