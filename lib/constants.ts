export const CATEGORIES = [
  'Fashion & Clothing',
  'Beauty & Skincare',
  'Food & Drinks',
  'Art & Prints',
  'Jewellery & Accessories',
  'Home & Lifestyle',
  'Books & Stationery',
  'Health & Wellness',
  'Vintage & Second-hand',
  'Digital Products',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export const HK_DISTRICTS = [
  'Central & Western',
  'Wan Chai',
  'Eastern',
  'Southern',
  'Yau Tsim Mong',
  'Sham Shui Po',
  'Kowloon City',
  'Wong Tai Sin',
  'Kwun Tong',
  'Kwai Tsing',
  'Tsuen Wan',
  'Tuen Mun',
  'Yuen Long',
  'North',
  'Tai Po',
  'Sha Tin',
  'Sai Kung',
  'Islands',
  'Online',
] as const

export type HKDistrict = (typeof HK_DISTRICTS)[number]

export const LOCATIONS = [
  'Hong Kong',
  'Singapore',
  'Taiwan',
  'UK',
  'USA',
  'Australia',
  'Online / Worldwide',
] as const

export type Location = (typeof LOCATIONS)[number]

export const PAYMENT_METHODS = [
  'PayMe',
  'FPS',
  'Bank Transfer',
  'Stripe',
  'PayPal',
  'Crypto',
  'Cash on Delivery',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const SHIPS_TO = [
  'Hong Kong Only',
  'Asia',
  'Worldwide',
] as const

export type ShipsTo = (typeof SHIPS_TO)[number]

// ---------------------------------------------------------------------------
// User tiers — awarded by total review count
// ---------------------------------------------------------------------------
export type TierId = 'newcomer' | 'regular' | 'contributor' | 'expert' | 'legend' | 'admin'

export interface Tier {
  id: TierId
  label: string
  minReviews: number
  nameClass: string
  badge: { label: string; className: string } | null
}

export const TIERS: Tier[] = [
  {
    id: 'newcomer',
    label: 'Newcomer',
    minReviews: 0,
    nameClass: '',
    badge: null,
  },
  {
    id: 'regular',
    label: 'Regular',
    minReviews: 5,
    nameClass: 'text-amber-800',
    badge: { label: 'Regular', className: 'bg-amber-100 text-amber-800' },
  },
  {
    id: 'contributor',
    label: 'Contributor',
    minReviews: 20,
    nameClass: 'text-slate-600',
    badge: { label: 'Contributor', className: 'bg-slate-200 text-slate-700' },
  },
  {
    id: 'expert',
    label: 'Expert',
    minReviews: 50,
    nameClass: 'text-yellow-600 font-semibold',
    badge: { label: 'Expert', className: 'bg-yellow-100 text-yellow-700' },
  },
  {
    id: 'legend',
    label: 'Legend',
    minReviews: 100,
    nameClass: '',
    badge: { label: '✦ Legend', className: 'bg-gradient-to-r from-amber-200 to-purple-200 text-purple-800' },
  },
]

export function getTier(reviewCount: number, tierOverride?: TierId | null, displayTier?: TierId | null): Tier {
  if (tierOverride) return TIERS.find((t) => t.id === tierOverride) ?? TIERS[0]
  if (displayTier) {
    const preferred = TIERS.find((t) => t.id === displayTier)
    if (preferred && preferred.minReviews <= reviewCount) return preferred
  }
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (reviewCount >= TIERS[i].minReviews) return TIERS[i]
  }
  return TIERS[0]
}

export function getEarnedTiers(reviewCount: number): Tier[] {
  return TIERS.filter((t) => t.minReviews <= reviewCount)
}
