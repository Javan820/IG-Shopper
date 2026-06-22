import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/supabase/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Owner Dashboard
          </span>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-muted-foreground transition-colors hover:text-foreground">
              My Shop
            </Link>
            <Link href="/dashboard/claim" className="text-muted-foreground transition-colors hover:text-foreground">
              Claim a Shop
            </Link>
            <Link href="/dashboard/edit" className="text-muted-foreground transition-colors hover:text-foreground">
              Edit Shop
            </Link>
          </nav>
        </div>
        {children}
      </div>
    </div>
  )
}
