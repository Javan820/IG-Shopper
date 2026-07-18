import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getCurrentUser, getUserRole } from '@/lib/supabase/auth'
import { signout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationBell } from '@/components/layout/NotificationBell'

async function NavbarAuth() {
  const user = await getCurrentUser()

  const displayName = user?.user_metadata?.display_name as string | undefined

  const isAdmin = user ? (await getUserRole()) === 'admin' : false

  return (
    <>
      {/* Admin link (desktop) */}
      {isAdmin && (
        <Link
          href="/admin"
          className="hidden rounded-lg px-3 py-1.5 text-sm font-semibold text-amber-300 transition-colors hover:bg-white/10 md:block"
        >
          Admin
        </Link>
      )}
      {/* Saved link — only shown when logged in */}
      {user && (
        <Link
          href="/saved"
          className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-[#D8C3AC] transition-colors hover:bg-white/10 hover:text-white md:block"
        >
          Saved
        </Link>
      )}
      <MobileNav isLoggedIn={!!user} />
      {user && <NotificationBell />}
      {user ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden text-[#F5EAD8] hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link href="/profile">{displayName ?? 'Profile'}</Link>
          </Button>
          <form action={signout}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-white/20 bg-transparent text-[#D8C3AC] hover:bg-white/10 hover:text-white"
            >
              Log Out
            </Button>
          </form>
        </>
      ) : (
        <>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="hidden text-[#F5EAD8] hover:bg-white/10 hover:text-white sm:inline-flex"
          >
            <Link href="/login">Log In</Link>
          </Button>
          <Button
            size="sm"
            asChild
            className="rounded-full bg-[--primary] px-5 font-semibold text-white shadow-sm hover:bg-[#A93318]"
          >
            <Link href="/signup">Sign Up</Link>
          </Button>
        </>
      )}
    </>
  )
}

function NavbarAuthFallback() {
  return (
    <>
      <div className="hidden h-8 w-16 animate-pulse rounded-lg bg-white/10 sm:block" />
      <div className="h-8 w-20 animate-pulse rounded-full bg-white/10" />
    </>
  )
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-[#1A0F08] text-[#FFFBF4] shadow-[0_1px_0_rgba(255,255,255,0.06),0_8px_24px_-16px_rgba(26,15,8,0.6)]">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="OIG logo"
              width={34}
              height={34}
              className="rounded-lg ring-1 ring-white/15 transition-opacity group-hover:opacity-85"
              priority
            />
            <span
              className="text-2xl font-black tracking-tight text-[#FFFBF4] transition-opacity group-hover:opacity-85"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              OIG
            </span>
            <span className="hidden text-sm font-semibold tracking-wide text-amber-300/90 transition-colors group-hover:text-amber-200 sm:inline">
              掃貨正!
            </span>
          </Link>

          {/* Static nav links — always visible, no auth needed */}
          <div className="hidden items-center gap-1 md:flex">
            {[
              { href: '/shops', label: 'Browse' },
              { href: '/submit', label: 'Submit a Shop' },
              { href: '/community', label: 'Community' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#D8C3AC] transition-colors hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Suspense fallback={<NavbarAuthFallback />}>
            <NavbarAuth />
          </Suspense>
        </div>
      </nav>
    </header>
  )
}
