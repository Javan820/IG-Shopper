import Link from 'next/link'
import Image from 'next/image'
import { Star, MapPin, BadgeCheck } from 'lucide-react'
import { CategoryBadge } from '@/components/common/CategoryBadge'
import type { ShopCardData } from '@/lib/supabase/types'

const COVER_GRADIENTS: Record<string, { from: string; to: string }> = {
  'Fashion & Clothing':      { from: '#7C3AED', to: '#DB2777' },
  'Beauty & Skincare':       { from: '#F43F5E', to: '#F97316' },
  'Food & Drinks':           { from: '#EA580C', to: '#D97706' },
  'Art & Prints':            { from: '#0EA5E9', to: '#6366F1' },
  'Jewellery & Accessories': { from: '#D97706', to: '#CA8A04' },
  'Home & Lifestyle':        { from: '#059669', to: '#0D9488' },
  'Books & Stationery':      { from: '#4F46E5', to: '#0EA5E9' },
  'Health & Wellness':       { from: '#0D9488', to: '#059669' },
  'Vintage & Second-hand':   { from: '#78716C', to: '#B45309' },
  'Digital Products':        { from: '#7C3AED', to: '#4F46E5' },
  'Other':                   { from: '#64748B', to: '#475569' },
}

function getGradient(category: string | null) {
  return category
    ? (COVER_GRADIENTS[category] ?? COVER_GRADIENTS['Other'])
    : COVER_GRADIENTS['Other']
}

interface ShopCardProps {
  shop: ShopCardData
}

export function ShopCard({ shop }: ShopCardProps) {
  const grad = getGradient(shop.category)
  const hasRating = shop.avg_rating !== null && shop.review_count > 0

  return (
    <Link
      href={`/shops/${shop.ig_handle}`}
      className="card-elevate group block overflow-hidden rounded-2xl"
    >
      {/* Cover image */}
      <div className="relative h-44 overflow-hidden">
        {shop.cover_image_url ? (
          <Image
            src={shop.cover_image_url}
            alt={shop.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div
            className="relative h-full w-full overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${grad.from}, ${grad.to})` }}
          >
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/15" />
            <div className="absolute -left-4 bottom-2 h-20 w-20 rounded-full bg-white/10" />
            <div className="absolute right-8 bottom-8 h-10 w-10 rounded-full bg-white/20" />
            {/* Handle badge */}
            <div className="absolute inset-x-0 bottom-0 flex items-end p-4">
              <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-bold tracking-wide text-white backdrop-blur-sm">
                @{shop.ig_handle}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-4">
        <div className="mb-2 flex items-center gap-1.5">
          {shop.category && <CategoryBadge category={shop.category} />}
          {shop.is_verified && (
            <BadgeCheck className="h-4 w-4 text-[--primary]" aria-label="Verified shop" />
          )}
        </div>

        <h3 className="font-bold leading-snug text-[--foreground] line-clamp-1 transition-colors group-hover:text-[--primary]">
          {shop.name}
        </h3>

        <div className="mt-2 flex items-center gap-3 text-sm text-[--muted-foreground]">
          {hasRating ? (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-[--foreground]">
                {shop.avg_rating!.toFixed(1)}
              </span>
              <span className="text-xs">({shop.review_count})</span>
            </span>
          ) : (
            <span className="rounded-full bg-[--accent] px-2 py-0.5 text-[11px] font-semibold text-[--accent-foreground]">
              New
            </span>
          )}
          {shop.location && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate text-xs">{shop.location}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
