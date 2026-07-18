import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowRight, Sparkles, Search, Star, Bookmark, Trophy } from 'lucide-react'
import { SearchBar } from '@/components/common/SearchBar'
import { CategoryGrid } from '@/components/common/CategoryGrid'
import { ShopCard } from '@/components/shop/ShopCard'
import { FreshFindsTabs } from '@/components/shop/FreshFindsTabs'
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import type { Shop, ShopCardData } from '@/lib/supabase/types'

function toCardData(rows: Shop[]): ShopCardData[] {
  return rows.map((s) => ({
    id: s.id,
    name: s.name,
    ig_handle: s.ig_handle,
    category: s.category,
    location: s.location,
    cover_image_url: s.cover_image_url,
    is_verified: s.is_verified,
    is_claimed: s.is_claimed,
    avg_rating: s.avg_rating === null ? null : Number(s.avg_rating),
    review_count: s.review_count,
  }))
}

const SHOP_CARD_COLUMNS =
  'id, name, ig_handle, category, location, cover_image_url, is_verified, is_claimed, avg_rating, review_count'

async function FreshFinds() {
  const supabase = await createClient()

  // One approved+active base filter, four different sorts. Ordering may
  // reference popularity_score / recommend_count without selecting them.
  const base = () =>
    supabase
      .from('shops')
      .select(SHOP_CARD_COLUMNS)
      .eq('status', 'approved')
      .eq('is_active', true)
      .limit(6)

  const [recent, mostReviewed, mostPopular, recommended] = await Promise.all([
    base().order('created_at', { ascending: false }),
    base().gt('review_count', 0).order('review_count', { ascending: false }),
    base().gt('popularity_score', 0).order('popularity_score', { ascending: false }),
    base().gt('recommend_count', 0).order('recommend_count', { ascending: false }),
  ])

  return (
    <FreshFindsTabs
      data={{
        recent: toCardData((recent.data ?? []) as Shop[]),
        mostReviewed: toCardData((mostReviewed.data ?? []) as Shop[]),
        mostPopular: toCardData((mostPopular.data ?? []) as Shop[]),
        recommended: toCardData((recommended.data ?? []) as Shop[]),
      }}
    />
  )
}

async function TopRatedShops() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shops')
    .select('id, name, ig_handle, category, location, cover_image_url, is_verified, is_claimed, avg_rating, review_count')
    .eq('status', 'approved')
    .eq('is_active', true)
    .gt('review_count', 0)
    .order('avg_rating', { ascending: false })
    .order('review_count', { ascending: false })
    .limit(3)

  const shops = toCardData((data ?? []) as Shop[])
  if (shops.length < 3) return null

  const rankStyles = [
    'bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950',
    'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800',
    'bg-gradient-to-br from-orange-200 to-orange-400 text-orange-900',
  ]

  return (
    <section className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="mb-0.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[--muted-foreground]">
              <Trophy className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              Community favourites
            </p>
            <h2
              className="text-2xl font-bold text-[--foreground] sm:text-3xl"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Top Rated Shops
            </h2>
          </div>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-[--primary] hover:text-[--primary]">
            <Link href="/shops?sort=rating">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shops.map((shop, i) => (
            <div key={shop.id} className="relative">
              <span
                aria-label={`Ranked number ${i + 1}`}
                className={`absolute -left-2 -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-xl text-lg font-black shadow-md ${rankStyles[i]}`}
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                {i + 1}
              </span>
              <ShopCard shop={shop} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const HOW_IT_WORKS = [
  {
    icon: Search,
    title: 'Discover',
    text: 'Search hundreds of Hong Kong IG shops by category, location and rating.',
  },
  {
    icon: Star,
    title: 'Review',
    text: 'Share real experiences so the community knows who to trust.',
  },
  {
    icon: Bookmark,
    title: 'Save',
    text: 'Bookmark favourites and build your personal shopping list.',
  },
]

export default function HomePage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-20 text-center sm:pb-24 sm:pt-28">
        {/* Trustpilot-style flat organic shapes */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <svg
            className="absolute -left-16 -top-24 h-64 w-64 text-[--primary] opacity-[0.08] sm:h-96 sm:w-96"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <path d="M43.6,-64.9C56.4,-56.4,66.7,-44.1,72.7,-29.8C78.7,-15.5,80.3,0.8,76.3,15.5C72.3,30.2,62.6,43.3,50.2,53.4C37.8,63.5,22.7,70.6,6.4,72.7C-9.9,74.8,-27.4,71.9,-41.4,63.2C-55.4,54.5,-65.9,40,-71.5,23.8C-77.1,7.6,-77.8,-10.3,-71.6,-25C-65.4,-39.7,-52.3,-51.2,-38.2,-59.3C-24.1,-67.4,-9,-72.1,4.5,-70.9C18,-69.7,30.8,-73.4,43.6,-64.9Z" transform="translate(100 100)" />
          </svg>
          <svg
            className="absolute -right-20 top-16 h-56 w-56 text-amber-400 opacity-[0.12] sm:h-80 sm:w-80"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <path d="M38.1,-56.9C51.2,-49.8,64.6,-41.3,70.6,-29C76.6,-16.7,75.2,-0.6,70.5,13.5C65.8,27.6,57.8,39.6,47.1,49.3C36.4,59,23,66.3,7.9,70.1C-7.2,73.9,-24,74.2,-37.3,67.4C-50.6,60.6,-60.4,46.7,-66.3,31.7C-72.2,16.7,-74.2,0.6,-70.6,-13.6C-67,-27.8,-57.8,-40.1,-46,-47.7C-34.2,-55.3,-19.8,-58.2,-3.6,-53.5C12.6,-48.8,25,-64,38.1,-56.9Z" transform="translate(100 100)" />
          </svg>
          <svg
            className="absolute -bottom-28 left-1/4 h-56 w-56 text-emerald-500 opacity-[0.07] sm:h-72 sm:w-72"
            viewBox="0 0 200 200"
            fill="currentColor"
          >
            <path d="M47.7,-69.9C60.9,-61.3,70.1,-46.6,74.7,-31C79.3,-15.4,79.3,1.1,74.6,15.8C69.9,30.5,60.5,43.4,48.4,53.5C36.3,63.6,21.5,70.9,5.3,74.1C-10.9,77.3,-28.5,76.4,-42.5,68.6C-56.5,60.8,-66.9,46.1,-72.3,30C-77.7,13.9,-78.1,-3.6,-72.8,-18.7C-67.5,-33.8,-56.5,-46.5,-43.4,-55.1C-30.3,-63.7,-15.1,-68.2,0.9,-69.5C16.9,-70.8,34.5,-78.5,47.7,-69.9Z" transform="translate(100 100)" />
          </svg>
        </div>

        <div className="relative mx-auto max-w-4xl">
          {/* Status badge */}
          <div className="anim-in anim-d1 mb-7 inline-flex items-center gap-2 rounded-full border border-[--primary]/20 bg-white/70 px-4 py-1.5 text-sm font-semibold text-[--primary] shadow-sm backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Hong Kong&apos;s #1 IG Shop Directory
          </div>

          <h1
            className="anim-in anim-d2 text-5xl font-bold leading-[1.08] tracking-tight text-[--foreground] sm:text-6xl lg:text-7xl"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Find an IG shop
            <br className="hidden sm:block" />{' '}
            you can{' '}
            <span className="marker-underline">
              trust
              <svg viewBox="0 0 300 20" aria-hidden="true">
                <path d="M5,14 C60,6 140,4 295,10" />
              </svg>
            </span>
          </h1>

          <p className="anim-in anim-d3 mx-auto mt-6 max-w-lg text-lg leading-relaxed text-[--muted-foreground]">
            Real reviews of Hong Kong&apos;s Instagram shops —{' '}
            <span className="font-semibold text-[--foreground]">rate, review and save</span>{' '}
            your favourites, all in one place.
          </p>

          <div className="anim-in anim-d4 mt-10 flex justify-center">
            <SearchBar variant="hero" />
          </div>

          <p className="anim-in anim-d4 mt-5 text-sm text-[--muted-foreground]">
            Popular:{' '}
            {['Fashion & Clothing', 'Beauty & Skincare', 'Food & Drinks'].map((c, i) => (
              <span key={c}>
                {i > 0 && ' · '}
                <Link
                  href={`/shops?category=${encodeURIComponent(c)}`}
                  className="font-semibold text-[--primary] underline-offset-4 hover:underline"
                >
                  {c.split(' & ')[0]}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="px-4 pb-16 pt-2 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-[--muted-foreground]">
                Explore
              </p>
              <h2
                className="text-2xl font-bold text-[--foreground] sm:text-3xl"
                style={{ fontFamily: 'var(--font-playfair)' }}
              >
                Browse by Category
              </h2>
            </div>
          </div>
          <CategoryGrid />
        </div>
      </section>

      {/* ── Top Rated ── */}
      <Suspense fallback={null}>
        <TopRatedShops />
      </Suspense>

      {/* ── Recently Added ── */}
      <section className="border-y border-[--border] bg-white/60 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-[--muted-foreground]">
              Fresh Finds
            </p>
            <h2
              className="text-2xl font-bold text-[--foreground] sm:text-3xl"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Discover Shops
            </h2>
          </div>
          <Suspense fallback={<LoadingSkeleton count={6} />}>
            <FreshFinds />
          </Suspense>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-[--muted-foreground]">
              How it works
            </p>
            <h2
              className="text-2xl font-bold text-[--foreground] sm:text-3xl"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              Shop smarter, together
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.title} className="card-elevate rounded-2xl p-6 text-center sm:p-8">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[--accent] text-[--primary]">
                  <step.icon className="h-5.5 w-5.5" aria-hidden="true" />
                </span>
                <p className="mt-4 text-xs font-bold uppercase tracking-widest text-[--muted-foreground]">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 text-lg font-bold text-[--foreground]">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[--muted-foreground]">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Submit CTA ── */}
      <section className="px-4 pb-20 text-center sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl bg-[#1A0F08] px-8 py-14 text-[#FFFBF4] shadow-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[--primary]/25 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-400/15 blur-2xl"
          />
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-amber-300/90">
            Grow the community
          </p>
          <h2
            className="text-3xl font-bold sm:text-4xl"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            Know a great IG shop?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[#C7B29E]">
            Help the community grow by submitting shops you love — it takes less than a minute.
          </p>
          <Button
            asChild
            className="mt-8 rounded-full bg-[--primary] px-8 py-2.5 font-semibold text-white shadow-md hover:bg-[#A93318]"
          >
            <Link href="/submit">Submit a Shop →</Link>
          </Button>
        </div>
      </section>
    </>
  )
}
