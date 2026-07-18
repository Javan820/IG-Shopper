import Link from 'next/link'
import {
  Shirt,
  Sparkles,
  UtensilsCrossed,
  Palette,
  Gem,
  Sofa,
  BookOpen,
  Leaf,
  Clock,
  Download,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORIES, type Category } from '@/lib/constants'

const CATEGORY_META: Record<Category, { subtitle: string; icon: LucideIcon; tint: string; iconColor: string }> = {
  'Fashion & Clothing':      { subtitle: 'Local labels & streetwear',      icon: Shirt,           tint: 'bg-rose-50',    iconColor: 'text-rose-500' },
  'Beauty & Skincare':       { subtitle: 'Indie skincare & makeup',        icon: Sparkles,        tint: 'bg-pink-50',    iconColor: 'text-pink-500' },
  'Food & Drinks':           { subtitle: 'Home bakes & artisan drinks',    icon: UtensilsCrossed, tint: 'bg-orange-50',  iconColor: 'text-orange-500' },
  'Art & Prints':            { subtitle: 'Original art & illustrations',   icon: Palette,         tint: 'bg-sky-50',     iconColor: 'text-sky-500' },
  'Jewellery & Accessories': { subtitle: 'Handmade & everyday pieces',     icon: Gem,             tint: 'bg-amber-50',   iconColor: 'text-amber-500' },
  'Home & Lifestyle':        { subtitle: 'Décor, candles & goods',         icon: Sofa,            tint: 'bg-emerald-50', iconColor: 'text-emerald-500' },
  'Books & Stationery':      { subtitle: 'Zines & paper goods',            icon: BookOpen,        tint: 'bg-indigo-50',  iconColor: 'text-indigo-500' },
  'Health & Wellness':       { subtitle: 'Wellness & natural products',    icon: Leaf,            tint: 'bg-teal-50',    iconColor: 'text-teal-600' },
  'Vintage & Second-hand':   { subtitle: 'Pre-loved & vintage finds',      icon: Clock,           tint: 'bg-stone-100',  iconColor: 'text-stone-500' },
  'Digital Products':        { subtitle: 'Presets & downloads',            icon: Download,        tint: 'bg-violet-50',  iconColor: 'text-violet-500' },
  'Other':                   { subtitle: 'Everything else',                icon: ArrowUpRight,    tint: 'bg-slate-100',  iconColor: 'text-slate-500' },
}

export function CategoryGrid() {
  const items = CATEGORIES.filter((c) => c !== 'Other')

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {items.map((category) => {
        const meta = CATEGORY_META[category]
        const Icon = meta.icon
        return (
          <Link
            key={category}
            href={`/shops?category=${encodeURIComponent(category)}`}
            className="card-elevate group flex flex-col items-start gap-3 rounded-2xl p-4 sm:p-5"
          >
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${meta.tint} ${meta.iconColor} transition-transform duration-300 group-hover:scale-110`}
            >
              <Icon className="h-5.5 w-5.5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold leading-snug text-[--foreground] transition-colors group-hover:text-[--primary]">
                {category}
              </span>
              <span className="mt-0.5 hidden text-xs leading-snug text-[--muted-foreground] sm:block">
                {meta.subtitle}
              </span>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
