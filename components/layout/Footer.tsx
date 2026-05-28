import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[--border] bg-white/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <Link href="/" className="group inline-flex items-baseline gap-2">
              <span
                className="text-2xl font-black text-[--primary]"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                OIG
              </span>
              <span className="text-sm font-semibold text-[--muted-foreground]">掃貨正!</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[--muted-foreground]">
              Discover, rate, and review Hong Kong&apos;s best Instagram shops. Built for the community.
            </p>
          </div>

          {/* Discover */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[--foreground]">
              Discover
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/shops" className="text-[--muted-foreground] transition-colors hover:text-[--primary]">
                  Browse Shops
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-[--muted-foreground] transition-colors hover:text-[--primary]">
                  Community
                </Link>
              </li>
              <li>
                <Link href="/submit" className="text-[--muted-foreground] transition-colors hover:text-[--primary]">
                  Submit a Shop
                </Link>
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-[--foreground]">
              For Sellers
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/dashboard/claim" className="text-[--muted-foreground] transition-colors hover:text-[--primary]">
                  Claim Your Shop
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-[--muted-foreground] transition-colors hover:text-[--primary]">
                  Owner Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-[--border] pt-6 sm:flex-row">
          <p className="text-xs text-[--muted-foreground]">
            © {new Date().getFullYear()} OIG 掃貨正! Built for Hong Kong&apos;s IG community.
          </p>
          <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-[--primary] via-orange-400 to-amber-300" />
        </div>
      </div>
    </footer>
  )
}
