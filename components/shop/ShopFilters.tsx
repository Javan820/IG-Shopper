'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Filter, ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CATEGORIES, LOCATIONS, PAYMENT_METHODS, SHIPS_TO } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface FilterState {
  q?: string
  category?: string
  location?: string
  rating?: string
  payment?: string
  ships?: string
  sort?: string
}

interface ShopFiltersProps {
  currentFilters: FilterState
}

const RATING_OPTIONS = [
  { label: '≥3★', value: '3' },
  { label: '≥4★', value: '4' },
  { label: '≥4.5★', value: '4.5' },
]

const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Highest Rated', value: 'highest_rated' },
  { label: 'Most Reviewed', value: 'most_reviewed' },
]

export function ShopFilters({ currentFilters }: ShopFiltersProps) {
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  function updateFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams()
    const merged: Record<string, string | undefined> = {
      q: currentFilters.q,
      category: currentFilters.category,
      location: currentFilters.location,
      rating: currentFilters.rating,
      payment: currentFilters.payment,
      ships: currentFilters.ships,
      sort: currentFilters.sort,
      [key]: value,
    }
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v)
    }
    router.push(`/shops?${params.toString()}`)
  }

  function clearAll() {
    const params = new URLSearchParams()
    if (currentFilters.q) params.set('q', currentFilters.q)
    router.push(`/shops?${params.toString()}`)
  }

  const activeCount = [
    currentFilters.category,
    currentFilters.location,
    currentFilters.rating,
    currentFilters.payment,
    currentFilters.ships,
  ].filter(Boolean).length

  const content = (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Sort By
        </p>
        <div className="flex flex-col gap-1">
          {SORT_OPTIONS.map((opt) => (
            <PillButton
              key={opt.value}
              active={(currentFilters.sort ?? 'newest') === opt.value}
              onClick={() =>
                updateFilter('sort', opt.value === 'newest' ? undefined : opt.value)
              }
            >
              {opt.label}
            </PillButton>
          ))}
        </div>
      </div>

      <div className="border-t" />

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">
          Filters{' '}
          {activeCount > 0 && <span className="text-primary">({activeCount})</span>}
        </span>
        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Category
        </p>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((cat) => (
            <PillButton
              key={cat}
              active={currentFilters.category === cat}
              onClick={() =>
                updateFilter('category', currentFilters.category === cat ? undefined : cat)
              }
            >
              {cat}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Location
        </p>
        <div className="flex flex-col gap-1">
          {LOCATIONS.map((loc) => (
            <PillButton
              key={loc}
              active={currentFilters.location === loc}
              onClick={() =>
                updateFilter('location', currentFilters.location === loc ? undefined : loc)
              }
            >
              {loc}
            </PillButton>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Min. Rating
        </p>
        <div className="flex flex-wrap gap-2">
          {RATING_OPTIONS.map((opt) => (
            <TagButton
              key={opt.value}
              active={currentFilters.rating === opt.value}
              onClick={() =>
                updateFilter('rating', currentFilters.rating === opt.value ? undefined : opt.value)
              }
            >
              {opt.label}
            </TagButton>
          ))}
        </div>
      </div>

      {/* Payment Methods */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Payment
        </p>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((pm) => (
            <TagButton
              key={pm}
              active={currentFilters.payment === pm}
              onClick={() =>
                updateFilter('payment', currentFilters.payment === pm ? undefined : pm)
              }
            >
              {pm}
            </TagButton>
          ))}
        </div>
      </div>

      {/* Ships To */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ships To
        </p>
        <div className="flex flex-col gap-1">
          {SHIPS_TO.map((dest) => (
            <PillButton
              key={dest}
              active={currentFilters.ships === dest}
              onClick={() =>
                updateFilter('ships', currentFilters.ships === dest ? undefined : dest)
              }
            >
              {dest}
            </PillButton>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <div className="lg:hidden">
        <Button
          variant="outline"
          size="sm"
          className="flex w-full items-center justify-between"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filters{activeCount > 0 ? ` (${activeCount})` : ''}
          </span>
          {mobileOpen ? (
            <ChevronUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
        {mobileOpen && (
          <div className="mt-4 rounded-xl border bg-white p-4">{content}</div>
        )}
      </div>

      {/* Desktop sidebar */}
      <div className="hidden rounded-xl border bg-white p-4 lg:block">{content}</div>
    </>
  )
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
        active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}

function TagButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-foreground hover:border-primary hover:text-primary'
      )}
    >
      {children}
    </button>
  )
}
