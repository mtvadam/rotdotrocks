/**
 * Demand and Trend utilities for Brainrots
 *
 * These types and configurations mirror the Prisma enums and provide
 * display metadata for the UI components.
 */

// ============================================================================
// TYPES - Match Prisma enums (uppercase for DB, lowercase for component props)
// ============================================================================

// Database enum values (uppercase)
export type DemandLevelDB = 'TERRIBLE' | 'LOW' | 'NORMAL' | 'HIGH' | 'AMAZING'
export type TrendIndicatorDB = 'LOWERING' | 'STABLE' | 'RISING'

// Component prop values (lowercase, for convenience)
export type DemandLevel = 'terrible' | 'low' | 'normal' | 'high' | 'amazing'
export type TrendIndicator = 'lowering' | 'stable' | 'rising'

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert database demand level to component prop format
 */
export function demandToLower(demand: DemandLevelDB | null | undefined): DemandLevel {
  if (!demand) return 'normal'
  return demand.toLowerCase() as DemandLevel
}

/**
 * Convert database trend indicator to component prop format
 */
export function trendToLower(trend: TrendIndicatorDB | null | undefined): TrendIndicator {
  if (!trend) return 'stable'
  return trend.toLowerCase() as TrendIndicator
}

/**
 * Convert component demand level to database format
 */
export function demandToUpper(demand: DemandLevel | null | undefined): DemandLevelDB {
  if (!demand) return 'NORMAL'
  return demand.toUpperCase() as DemandLevelDB
}

/**
 * Convert component trend indicator to database format
 */
export function trendToUpper(trend: TrendIndicator | null | undefined): TrendIndicatorDB {
  if (!trend) return 'STABLE'
  return trend.toUpperCase() as TrendIndicatorDB
}

// ============================================================================
// CONFIGURATION - Display metadata for UI
// ============================================================================

export const DEMAND_CONFIG = {
  TERRIBLE: {
    label: 'Terrible',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
    icon: 'AlertTriangle',
    description: 'Very few traders want this',
  },
  LOW: {
    label: 'Low',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    borderColor: 'border-orange-500/30',
    icon: 'ChevronDown',
    description: 'Below average demand',
  },
  NORMAL: {
    label: 'Normal',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    icon: 'Minus',
    description: 'Average market demand',
  },
  HIGH: {
    label: 'High',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    icon: 'Flame',
    description: 'Many traders want this',
  },
  AMAZING: {
    label: 'Amazing',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    icon: 'Sparkles',
    description: 'Extremely high demand',
  },
} as const

export const TREND_CONFIG = {
  LOWERING: {
    label: 'Lowering',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    icon: 'TrendingDown',
    description: 'Demand is decreasing',
  },
  STABLE: {
    label: 'Stable',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    icon: 'Minus',
    description: 'Demand is steady',
  },
  RISING: {
    label: 'Rising',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    icon: 'TrendingUp',
    description: 'Demand is increasing',
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determines if the demand/trend state is notable (worth showing)
 * Normal demand + Stable trend = not notable (should be hidden)
 */
export function isNotableState(
  demand: DemandLevel | DemandLevelDB,
  trend: TrendIndicator | TrendIndicatorDB
): boolean {
  const demandLower = demand.toLowerCase()
  const trendLower = trend.toLowerCase()
  return demandLower !== 'normal' || trendLower !== 'stable'
}

/**
 * Get demand level options for dropdowns
 */
export function getDemandOptions(): Array<{ value: DemandLevelDB; label: string }> {
  return [
    { value: 'TERRIBLE', label: 'Terrible' },
    { value: 'LOW', label: 'Low' },
    { value: 'NORMAL', label: 'Normal' },
    { value: 'HIGH', label: 'High' },
    { value: 'AMAZING', label: 'Amazing' },
  ]
}

/**
 * Get trend indicator options for dropdowns
 */
export function getTrendOptions(): Array<{ value: TrendIndicatorDB; label: string }> {
  return [
    { value: 'LOWERING', label: 'Lowering' },
    { value: 'STABLE', label: 'Stable' },
    { value: 'RISING', label: 'Rising' },
  ]
}

/**
 * Validate demand level value
 */
export function isValidDemandLevel(value: string): value is DemandLevelDB {
  return ['TERRIBLE', 'LOW', 'NORMAL', 'HIGH', 'AMAZING'].includes(value)
}

/**
 * Validate trend indicator value
 */
export function isValidTrendIndicator(value: string): value is TrendIndicatorDB {
  return ['LOWERING', 'STABLE', 'RISING'].includes(value)
}
