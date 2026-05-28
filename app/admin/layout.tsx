import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ShutdownButton } from '@/components/admin/ShutdownButton'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Admin
          </span>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin" className="text-muted-foreground transition-colors hover:text-foreground">
              Overview
            </Link>
            <Link href="/admin/shops" className="text-muted-foreground transition-colors hover:text-foreground">
              Shops
            </Link>
            <Link href="/admin/claims" className="text-muted-foreground transition-colors hover:text-foreground">
              Claims
            </Link>
            <Link href="/admin/reviews" className="text-muted-foreground transition-colors hover:text-foreground">
              Reviews
            </Link>
            <Link href="/admin/users" className="text-muted-foreground transition-colors hover:text-foreground">
              Users
            </Link>
          </nav>
        </div>
        {children}
      </div>
      <ShutdownButton />
    </div>
  )
}
