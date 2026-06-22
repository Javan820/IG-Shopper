export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { DiscoveryForm } from '@/components/admin/DiscoveryForm'
import type { ShopDiscoveryJob } from '@/lib/supabase/types'

const STATUS_STYLES: Record<ShopDiscoveryJob['status'], string> = {
  queued: 'bg-slate-100 text-slate-600',
  running: 'bg-blue-100 text-blue-700',
  done: 'bg-emerald-100 text-emerald-700',
  error: 'bg-destructive/10 text-destructive',
}

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-HK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminDiscoveryPage() {
  const adminClient = createAdminClient()

  const { data: jobsData, error } = await adminClient
    .from('shop_discovery_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return <div className="p-4 text-red-600 font-mono text-sm">DB error: {error.message}</div>

  const jobs = (jobsData ?? []) as ShopDiscoveryJob[]
  const hasActiveJob = jobs.some((j) => j.status === 'queued' || j.status === 'running')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Discover Shops</h1>
        <p className="text-sm text-muted-foreground">
          Queue an automatic search for Instagram shops by category. Found shops land in the{' '}
          <span className="font-medium">Shops</span> approval queue for review.
        </p>
      </div>

      <DiscoveryForm hasActiveJob={hasActiveJob} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent searches</h2>
        {jobs.length === 0 ? (
          <div className="rounded-xl border bg-white py-12 text-center shadow-sm">
            <p className="text-muted-foreground">No searches yet. Queue one above to get started.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="border-b bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Category</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Added</th>
                  <th className="px-4 py-2 font-medium">Requested</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => (
                  <tr key={job.id} className="align-top">
                    <td className="px-4 py-3">{job.category}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}>
                        {job.status}
                      </span>
                      {job.status === 'error' && job.error && (
                        <p className="mt-1 max-w-xs text-xs text-destructive">{job.error}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {job.status === 'done' || job.inserted_count > 0 ? (
                        <span>
                          {job.inserted_count} new
                          <span className="text-muted-foreground"> / {job.found_count} found</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">target {job.target_count}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatTime(job.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
