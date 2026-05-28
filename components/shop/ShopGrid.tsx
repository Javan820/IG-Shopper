import { ShopCard } from './ShopCard'
import type { ShopCardData } from '@/lib/supabase/types'

interface ShopGridProps {
  shops: ShopCardData[]
}

export function ShopGrid({ shops }: ShopGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {shops.map((shop) => (
        <ShopCard key={shop.id} shop={shop} />
      ))}
    </div>
  )
}
