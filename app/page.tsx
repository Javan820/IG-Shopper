import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { GlitchText } from '@/components/ui/animated-glitch-text'
import { SearchBar } from '@/components/common/SearchBar'
import { CategoryGrid } from '@/components/common/CategoryGrid'
import { ShopGrid } from '@/components/shop/ShopGrid'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Shop, ShopCardData } from '@/lib/supabase/types'

async function FeaturedShops() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shops')
    .select('*')
    .eq('status', 'approved')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const shops: ShopCardData[] = ((data ?? []) as Shop[]).map((s) => ({
    id: s.id,
    name: s.name,
    ig_handle: s.ig_handle,
    category: s.category,
    location: s.location,
    cover_image_url: s.cover_image_url,
    is_verified: s.is_verified,
    is_claimed: s.is_claimed,
    avg_rating: null,
    review_count: 0,
  }))

  if (!shops.length) {
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center text-[--muted-foreground]">
        <p className="text-lg font-semibold">No shops yet</p>
        <p className="mt-1 text-sm">
          Be the first to{' '}
          <Link href="/submit" className="text-[--primary] underline underline-offset-4">
            submit a shop
          </Link>
          !
        </p>
      </div>
    )
  }

  return <ShopGrid shops={shops} />
}

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-16 pt-20 text-center sm:pb-20 sm:pt-28">
        {/* Decorative blobs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-8 h-56 w-56 rounded-full bg-rose-200/30 blur-3xl"
        />

        <div className="relative mx-auto max-w-4xl">
          {/* Status badge */}
          <div className="anim-in anim-d1 mb-7 inline-flex items-center gap-2 rounded-full border border-[--primary]/20 bg-[--primary]/8 px-4 py-1.5 text-sm font-semibold text-[--primary]">
            <Sparkles className="h-3.5 w-3.5" />
            Hong Kong&apos;s #1 IG Shop Directory
          </div>

          <h1
            className="anim-in anim-d2 text-5xl font-bold leading-[1.1] tracking-tight text-[--foreground] sm:text-6xl lg:text-7xl"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Discover the{' '}
            <em className="not-italic text-[--primary]">best</em>
            <br className="hidden sm:block" />
            <GlitchText text="HK Instagram Shops" intervalMs={3000} glitchDurationMs={350} />
          </h1>

          <p className="anim-in anim-d3 mx-auto mt-5 max-w-lg text-lg leading-relaxed text-[--muted-foreground]">
            Rate, review and save your favourite IG shops —{' '}
            <span className="font-semibold text-[--foreground]">all in one place.</span>
          </p>

          <div className="anim-in anim-d4 mt-10 flex justify-center">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-[--muted-foreground]">
                Explore
              </p>
              <h2
                className="text-2xl font-bold text-[--foreground]"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                Browse by Category
              </h2>
            </div>
          </div>
          <CategoryGrid />
        </div>
      </section>

      {/* ── Recently Added ── */}
      <section className="border-y border-[--border] bg-white/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-[--muted-foreground]">
                Fresh Finds
              </p>
              <h2
                className="text-2xl font-bold text-[--foreground]"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                Recently Added Shops
              </h2>
            </div>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-[--primary] hover:text-[--primary]">
              <Link href="/shops">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <Suspense fallback={<LoadingSkeleton count={6} />}>
            <FeaturedShops />
          </Suspense>
        </div>
      </section>

      {/* ── Submit CTA ── */}
      <section className="px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-2xl overflow-hidden rounded-3xl border border-[--border] bg-white/70 px-8 py-14 shadow-sm backdrop-blur-sm">
          {/* Decorative corner */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[--primary]/10 blur-2xl"
          />
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[--primary]">
            Grow the community
          </p>
          <h2
            className="text-3xl font-bold text-[--foreground]"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Know a great IG shop?
          </h2>
          <p className="mt-3 text-[--muted-foreground]">
            Help the community grow by submitting shops you love.
          </p>
          <Button asChild className="mt-8 rounded-full px-8 py-2.5 font-semibold shadow-md">
            <Link href="/submit">Submit a Shop →</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
