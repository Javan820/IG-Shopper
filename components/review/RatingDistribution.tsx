import { Star } from 'lucide-react'

interface DistributionItem {
  star: number
  count: number
}

interface RatingDistributionProps {
  distribution: DistributionItem[]
  total: number
}

export function RatingDistribution({ distribution, total }: RatingDistributionProps) {
  return (
    <div className="space-y-1.5">
      {distribution.map(({ star, count }) => {
        const pct = total > 0 ? (count / total) * 100 : 0
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-3 text-right text-muted-foreground">{star}</span>
            <Star className="h-3 w-3 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amber-400 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-5 text-right text-xs text-muted-foreground">{count}</span>
          </div>
        )
      })}
    </div>
  )
}