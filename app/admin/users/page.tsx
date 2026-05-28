import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { UserTierBadge } from '@/components/common/UserTierBadge'
import { UserControls } from './UserControls'
import type { TierId } from '@/lib/constants'

export default async function AdminUsersPage() {
  const adminClient = createAdminClient()
  const supabase = await createClient()

  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()

  const { data: profiles } = await adminClient
    .from('profiles')
    .select('id, display_name, role, review_count, tier_override, display_tier, created_at')
    .order('created_at', { ascending: false })

  const rows = profiles ?? []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage reviewer badges and admin roles
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Reviews</th>
              <th className="px-4 py-3 text-left">Controls</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <UserTierBadge
                    name={p.display_name ?? '(no name)'}
                    reviewCount={p.review_count}
                    role={p.role}
                    tierOverride={p.tier_override}
                  />
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{p.id.slice(0, 8)}…</p>
                </td>
                <td className="px-4 py-3 tabular-nums">{p.review_count}</td>
                <td className="px-4 py-3">
                  <UserControls
                    userId={p.id}
                    currentTierOverride={p.tier_override}
                    currentDisplayTier={p.display_tier}
                    currentRole={p.role}
                    isSelf={p.id === currentUser?.id}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
