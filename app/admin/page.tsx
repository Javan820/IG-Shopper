import { createAdminClient } from '@/lib/supabase/admin'
import { Store, Star, Flag, Clock, ShieldCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default async function AdminPage() {
  const adminClient = createAdminClient()

  const [
    { count: totalShops },
    { count: pendingShops },
    { count: totalReviews },
    { count: flaggedReviews },
    { count: pendingClaims },
    { count: brokenHandles },
  ] = await Promise.all([
    adminClient.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    adminClient.from('shops').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('reviews').select('*', { count: 'exact', head: true }),
    adminClient.from('review_flags').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('shop_claims').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    adminClient.from('shops').select('*', { count: 'exact', head: true }).eq('ig_handle_status', 'broken').eq('status', 'approved'),
  ])

  const stats = [
    {
      label: 'Approved Shops',
      value: totalShops ?? 0,
      icon: Store,
      iconClass: 'text-emerald-600 bg-emerald-50',
      href: '/admin/shops',
    },
    {
      label: 'Pending Submissions',
      value: pendingShops ?? 0,
      icon: Clock,
      iconClass: 'text-amber-600 bg-amber-50',
      href: '/admin/shops',
    },
    {
      label: 'Total Reviews',
      value: totalReviews ?? 0,
      icon: Star,
      iconClass: 'text-blue-600 bg-blue-50',
      href: '/admin/reviews',
    },
    {
      label: 'Flagged Reviews',
      value: flaggedReviews ?? 0,
      icon: Flag,
      iconClass: 'text-red-600 bg-red-50',
      href: '/admin/reviews',
    },
    {
      label: 'Pending Claims',
      value: pendingClaims ?? 0,
      icon: ShieldCheck,
      iconClass: 'text-violet-600 bg-violet-50',
      href: '/admin/claims',
    },
    {
      label: 'Broken Handles',
      value: brokenHandles ?? 0,
      icon: AlertTriangle,
      iconClass: 'text-amber-600 bg-amber-50',
      href: '/admin/shops',
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground">Platform-wide stats at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className={`mb-3 inline-flex rounded-lg p-2 ${stat.iconClass}`}>
              <stat.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{stat.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
