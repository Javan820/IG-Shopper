import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { signout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationBell } from '@/components/layout/NotificationBell'

export async function Navbar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.display_name as string | undefined

  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isAdmin = profile?.role === 'admin'
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[--border] bg-[#FFFBF4]/85 backdrop-blur-md">
      {/* Brand accent stripe */}
      <div className="h-[3px] bg-gradient-to-r from-[#C73E1D] via-orange-400 to-amber-300" />

      <nav className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="OIG logo"
              width={36}
              height={36}
              className="rounded-lg transition-opacity group-hover:opacity-80"
              priority
            />
            <span
              className="text-2xl font-black tracking-tight text-[--primary] transition-opacity group-hover:opacity-80"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              OIG
            </span>
            <span className="hidden text-sm font-semibold tracking-wide text-[--muted-foreground] transition-colors group-hover:text-[--foreground] sm:inline">
              掃貨正!
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {[
              { href: '/shops', label: 'Browse' },
              { href: '/submit', label: 'Submit a Shop' },
              { href: '/community', label: 'Community' },
              ...(user ? [{ href: '/saved', label: 'Saved' }] : []),
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[--muted-foreground] transition-colors hover:bg-[--secondary] hover:text-[--foreground]"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[--primary] transition-colors hover:bg-[--accent]"
              >
                Admin
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <MobileNav isLoggedIn={!!user} />
          {user && <NotificationBell />}
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/profile">{displayName ?? 'Profile'}</Link>
              </Button>
              <form action={signout}>
                <Button type="submit" variant="outline" size="sm" className="border-[--border] text-[--muted-foreground] hover:text-[--foreground]">
                  Log Out
                </Button>
              </form>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">Log In</Link>
              </Button>
              <Button size="sm" asChild className="rounded-full px-5 font-semibold shadow-sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
