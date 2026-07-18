import Link from 'next/link'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer className="bg-[#1A0F08] text-[#FFFBF4]">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="group inline-flex items-baseline gap-2">
              <span
                className="text-3xl font-black text-[#FFFBF4]"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                OIG
              </span>
              <span className="text-sm font-semibold text-amber-300/90">掃貨正!</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#C7B29E]">
              Discover, rate, and review Hong Kong&apos;s best Instagram shops.
              Real reviews from a community that shops where you do.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold text-[#D8C3AC]">
                <InstagramIcon className="h-3.5 w-3.5" />
                Built for HK&apos;s IG community
              </span>
            </div>
          </div>

          {/* Discover */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-300/80">
              Discover
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/shops" className="text-[#C7B29E] transition-colors hover:text-white">
                  Browse Shops
                </Link>
              </li>
              <li>
                <Link href="/community" className="text-[#C7B29E] transition-colors hover:text-white">
                  Community
                </Link>
              </li>
              <li>
                <Link href="/submit" className="text-[#C7B29E] transition-colors hover:text-white">
                  Submit a Shop
                </Link>
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-amber-300/80">
              For Sellers
            </h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/dashboard/claim" className="text-[#C7B29E] transition-colors hover:text-white">
                  Claim Your Shop
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-[#C7B29E] transition-colors hover:text-white">
                  Owner Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-[#9A8471]">
            © {new Date().getFullYear()} OIG 掃貨正! Built for Hong Kong&apos;s IG community.
          </p>
          <div className="h-[3px] w-16 rounded-full bg-gradient-to-r from-[--primary] via-orange-400 to-amber-300" />
        </div>
      </div>
    </footer>
  )
}
