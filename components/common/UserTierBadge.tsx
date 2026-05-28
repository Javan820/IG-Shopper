import { cn } from '@/lib/utils'
import { getTier } from '@/lib/constants'
import type { TierId } from '@/lib/constants'
import type { UserRole } from '@/lib/supabase/types'

interface UserTierBadgeProps {
  name: string
  reviewCount: number
  role?: UserRole
  tierOverride?: string | null
  displayTier?: string | null
  className?: string
}

export function UserTierBadge({ name, reviewCount, role, tierOverride, displayTier, className }: UserTierBadgeProps) {
  const isAdmin = role === 'admin'

  // "Admin Style" = animated gold name + Admin badge only (no tier badge).
  // Triggers when: the chosen style is 'admin', OR the user is an admin with no style chosen at all.
  const showAdminStyle =
    tierOverride === 'admin' ||
    displayTier === 'admin' ||
    (isAdmin && !tierOverride && !displayTier)

  if (showAdminStyle) {
    return (
      <span className={cn('inline-flex items-center gap-1.5', className)}>
        <span className="admin-name">{name}</span>
        <span className="rounded-full bg-gradient-to-r from-red-500 to-amber-400 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
          Admin
        </span>
      </span>
    )
  }

  const tierOverrideProp = (tierOverride ?? null) as TierId | null
  const displayTierProp = (displayTier ?? null) as TierId | null
  // Admins bypass the earn gate — promote displayTier to override so getTier skips minReviews check.
  // display_tier (user's own choice) takes priority over tier_override (admin DB field set externally).
  const resolvedTierOverride = isAdmin ? (displayTierProp ?? tierOverrideProp) : tierOverrideProp
  const resolvedDisplayTier = isAdmin ? null : displayTierProp
  const tier = getTier(reviewCount, resolvedTierOverride, resolvedDisplayTier)

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {tier.id === 'legend' ? (
        <span className="legend-name font-semibold">{name}</span>
      ) : (
        <span className={cn('font-medium', tier.nameClass)}>{name}</span>
      )}
      {tier.badge && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
            tier.badge.className
          )}
        >
          {tier.badge.label}
        </span>
      )}
      {isAdmin && (
        <span className="rounded-full bg-gradient-to-r from-red-500 to-amber-400 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm">
          Admin
        </span>
      )}
    </span>
  )
}
