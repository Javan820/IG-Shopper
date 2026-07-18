'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, MessageSquare, Flame, ThumbsUp, ArrowRight } from 'lucide-react'
import { ShopGrid } from './ShopGrid'
import { cn } from '@/lib/utils'
import type { ShopCardData } from '@/lib/supabase/types'

export interface FreshFindsData {
  recent: ShopCardData[]
  mostReviewed: ShopCardData[]
  mostPopular: ShopCardData[]
  recommended: ShopCardData[]
}

type TabKey = keyof FreshFindsData

// `href` carries the tab's ranking into the browse page so "View all"
// lands on the same ordering the user is looking at. `recent` maps to the
// browse default (newest), so it needs no sort param.
const TABS: { key: TabKey; label: string; icon: typeof Clock; href: string }[] = [
  { key: 'recent', label: 'Recently Added', icon: Clock, href: '/shops' },
  { key: 'mostReviewed', label: 'Most Reviewed', icon: MessageSquare, href: '/shops?sort=most_reviewed' },
  { key: 'mostPopular', label: 'Most Popular', icon: Flame, href: '/shops?sort=most_popular' },
  { key: 'recommended', label: 'Highest Recommended', icon: ThumbsUp, href: '/shops?sort=most_recommended' },
]

export function FreshFindsTabs({ data }: { data: FreshFindsData }) {
  // Default to the first tab that actually has shops so the section never
  // opens on an empty state when data exists elsewhere.
  const firstWithData = TABS.find((t) => data[t.key].length > 0)?.key ?? 'recent'
  const [tab, setTab] = useState<TabKey>(firstWithData)

  const active = TABS.find((t) => t.key === tab) ?? TABS[0]
  const shops = data[tab]

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Browse shops by" className="flex flex-wrap gap-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                tab === key
                  ? 'border-[--primary] bg-[--primary] text-white shadow-sm'
                  : 'border-[--border] bg-white text-[--muted-foreground] hover:border-[--primary]/40 hover:text-[--foreground]'
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>
        <Link
          href={active.href}
          className="inline-flex items-center gap-1 text-sm font-semibold text-[--primary] hover:underline"
        >
          View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {shops.length > 0 ? (
        <ShopGrid shops={shops} />
      ) : (
        <div className="rounded-2xl border border-dashed py-16 text-center text-[--muted-foreground]">
          <p className="text-lg font-semibold">Nothing here yet</p>
          <p className="mt-1 text-sm">
            {tab === 'recent'
              ? 'Be the first to submit a shop!'
              : 'Reviews and reactions will surface shops here soon.'}
          </p>
        </div>
      )}
    </div>
  )
}
