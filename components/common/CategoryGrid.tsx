import Link from 'next/link'
import { CATEGORIES, type Category } from '@/lib/constants'

const CATEGORY_META: Record<Category, { emoji: string; bg: string; hover: string; text: string }> = {
  'Fashion & Clothing':      { emoji: '👗', bg: 'bg-violet-500', hover: 'hover:bg-violet-600', text: 'text-white' },
  'Beauty & Skincare':       { emoji: '✨', bg: 'bg-rose-500',   hover: 'hover:bg-rose-600',   text: 'text-white' },
  'Food & Drinks':           { emoji: '🍜', bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-white' },
  'Art & Prints':            { emoji: '🎨', bg: 'bg-sky-500',    hover: 'hover:bg-sky-600',    text: 'text-white' },
  'Jewellery & Accessories': { emoji: '💎', bg: 'bg-amber-500',  hover: 'hover:bg-amber-600',  text: 'text-white' },
  'Home & Lifestyle':        { emoji: '🪴', bg: 'bg-emerald-500',hover: 'hover:bg-emerald-600',text: 'text-white' },
  'Books & Stationery':      { emoji: '📚', bg: 'bg-indigo-500', hover: 'hover:bg-indigo-600', text: 'text-white' },
  'Health & Wellness':       { emoji: '🌿', bg: 'bg-teal-500',   hover: 'hover:bg-teal-600',   text: 'text-white' },
  'Vintage & Second-hand':   { emoji: '🧸', bg: 'bg-stone-500',  hover: 'hover:bg-stone-600',  text: 'text-white' },
  'Digital Products':        { emoji: '⚡', bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-white' },
  'Other':                   { emoji: '🛍️', bg: 'bg-slate-500',  hover: 'hover:bg-slate-600',  text: 'text-white' },
}

export function CategoryGrid() {
  const featured = CATEGORIES.filter((c) => c !== 'Other')

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {featured.map((category) => {
        const meta = CATEGORY_META[category]
        return (
          <Link
            key={category}
            href={`/shops?category=${encodeURIComponent(category)}`}
            className={`group flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 ${meta.bg} ${meta.hover} ${meta.text} shadow-sm hover:shadow-md hover:-translate-y-0.5`}
          >
            <span className="text-2xl leading-none" role="img" aria-hidden="true">
              {meta.emoji}
            </span>
            <span className="text-sm font-semibold leading-tight">{category}</span>
          </Link>
        )
      })}
    </div>
  )
}
