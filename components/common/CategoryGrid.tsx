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
import { CategoryList, type Category as CategoryItem } from '@/components/ui/category-list'

const CATEGORY_META: Record<Category, { subtitle: string; icon: LucideIcon }> = {
  'Fashion & Clothing':      { subtitle: 'Local labels, streetwear & made-to-order pieces', icon: Shirt },
  'Beauty & Skincare':       { subtitle: 'Indie skincare, makeup & self-care finds',        icon: Sparkles },
  'Food & Drinks':           { subtitle: 'Home bakes, snacks & artisan drinks',             icon: UtensilsCrossed },
  'Art & Prints':            { subtitle: 'Original art, prints & illustrations',            icon: Palette },
  'Jewellery & Accessories': { subtitle: 'Handmade jewellery & everyday accessories',       icon: Gem },
  'Home & Lifestyle':        { subtitle: 'Décor, candles & lifestyle goods',                icon: Sofa },
  'Books & Stationery':      { subtitle: 'Zines, stationery & paper goods',                 icon: BookOpen },
  'Health & Wellness':       { subtitle: 'Wellness, fitness & natural products',            icon: Leaf },
  'Vintage & Second-hand':   { subtitle: 'Pre-loved fashion & vintage treasures',           icon: Clock },
  'Digital Products':        { subtitle: 'Presets, templates & digital downloads',          icon: Download },
  'Other':                   { subtitle: 'Everything else worth discovering',               icon: ArrowUpRight },
}

export function CategoryGrid() {
  const items: CategoryItem[] = CATEGORIES.filter((c) => c !== 'Other').map((category) => {
    const Icon = CATEGORY_META[category].icon
    return {
      id: category,
      title: category,
      subtitle: CATEGORY_META[category].subtitle,
      href: `/shops?category=${encodeURIComponent(category)}`,
      icon: <Icon className="h-7 w-7" />,
    }
  })

  return <CategoryList categories={items} className="max-w-4xl p-0" />
}
