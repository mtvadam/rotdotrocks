'use client'

import { memo, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Flame, Sparkles, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

// Support both lowercase (component) and uppercase (Prisma DB) formats
export type DemandLevel = 'terrible' | 'low' | 'normal' | 'high' | 'amazing' | 'TERRIBLE' | 'LOW' | 'NORMAL' | 'HIGH' | 'AMAZING'
export type TrendDirection = 'lowering' | 'stable' | 'rising' | 'LOWERING' | 'STABLE' | 'RISING'

// Normalized lowercase versions for internal use
type DemandLevelLower = 'terrible' | 'low' | 'normal' | 'high' | 'amazing'
type TrendDirectionLower = 'lowering' | 'stable' | 'rising'

export interface DemandTrendData {
  demand: DemandLevel
  trend: TrendDirection
}

export interface DemandTrendBadgeProps {
  demand: DemandLevel
  trend: TrendDirection
  /** Size variant: xs for trade cards, sm for item displays, md for detail pages */
  size?: 'xs' | 'sm' | 'md'
  /** Layout variant: icon-only shows just icons, badge shows pill badge, inline shows text */
  variant?: 'icon-only' | 'badge' | 'inline'
  /** Whether to show tooltip on hover */
  showTooltip?: boolean
  /** Only show if notable (non-normal demand or non-stable trend) */
  hideIfNormal?: boolean
  /** Custom class name */
  className?: string
}

// Helper to normalize demand to lowercase
function normalizeDemand(demand: DemandLevel): DemandLevelLower {
  return demand.toLowerCase() as DemandLevelLower
}

// Helper to normalize trend to lowercase
function normalizeTrend(trend: TrendDirection): TrendDirectionLower {
  return trend.toLowerCase() as TrendDirectionLower
}

// ============================================================================
// DESIGN TOKENS
// ============================================================================

// Demand level configurations
// Design principle: Only notable states draw attention. Normal is invisible.
const DEMAND_CONFIG = {
  terrible: {
    label: 'Terrible',
    shortLabel: 'Low',
    color: 'text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
    icon: AlertTriangle,
    description: 'Very few traders want this',
    priority: 2, // Higher = more notable
  },
  low: {
    label: 'Low',
    shortLabel: 'Low',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/15',
    borderColor: 'border-orange-500/30',
    icon: ChevronDown,
    description: 'Below average demand',
    priority: 1,
  },
  normal: {
    label: 'Normal',
    shortLabel: '',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/20',
    icon: Minus,
    description: 'Average market demand',
    priority: 0,
  },
  high: {
    label: 'High',
    shortLabel: 'Hot',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    icon: Flame,
    description: 'Many traders want this',
    priority: 1,
  },
  amazing: {
    label: 'Amazing',
    shortLabel: 'Hot',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
    icon: Sparkles,
    description: 'Extremely high demand - easy to trade',
    priority: 2,
  },
} as const

// Trend direction configurations
const TREND_CONFIG = {
  lowering: {
    label: 'Lowering',
    shortLabel: '',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    icon: TrendingDown,
    description: 'Demand is decreasing',
    priority: 1,
  },
  stable: {
    label: 'Stable',
    shortLabel: '',
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    icon: Minus,
    description: 'Demand is steady',
    priority: 0,
  },
  rising: {
    label: 'Rising',
    shortLabel: '',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    icon: TrendingUp,
    description: 'Demand is increasing',
    priority: 1,
  },
} as const

// Size configurations
const SIZE_CONFIG = {
  xs: {
    iconSize: 'w-3 h-3',
    fontSize: 'text-[9px]',
    padding: 'px-1 py-0.5',
    gap: 'gap-0.5',
    badgePadding: 'px-1.5 py-0.5',
  },
  sm: {
    iconSize: 'w-3.5 h-3.5',
    fontSize: 'text-[10px]',
    padding: 'px-1.5 py-0.5',
    gap: 'gap-1',
    badgePadding: 'px-2 py-0.5',
  },
  md: {
    iconSize: 'w-4 h-4',
    fontSize: 'text-xs',
    padding: 'px-2 py-1',
    gap: 'gap-1.5',
    badgePadding: 'px-2.5 py-1',
  },
} as const

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determines if the demand/trend state is notable (worth showing)
 * Normal demand + Stable trend = not notable
 */
export function isNotableState(demand: DemandLevel, trend: TrendDirection): boolean {
  const demandLower = normalizeDemand(demand)
  const trendLower = normalizeTrend(trend)
  return demandLower !== 'normal' || trendLower !== 'stable'
}

/**
 * Gets the overall "heat" level for quick visual scanning
 * Returns: 'cold' | 'neutral' | 'warm' | 'hot'
 */
export function getHeatLevel(demand: DemandLevel, trend: TrendDirection): 'cold' | 'neutral' | 'warm' | 'hot' {
  const demandLower = normalizeDemand(demand)
  const trendLower = normalizeTrend(trend)

  // Amazing demand or high + rising = hot
  if (demandLower === 'amazing' || (demandLower === 'high' && trendLower === 'rising')) return 'hot'
  // High demand or normal + rising = warm
  if (demandLower === 'high' || (demandLower === 'normal' && trendLower === 'rising')) return 'warm'
  // Terrible or low + lowering = cold
  if (demandLower === 'terrible' || (demandLower === 'low' && trendLower === 'lowering')) return 'cold'
  // Everything else = neutral
  return 'neutral'
}

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface TooltipProps {
  demand: DemandLevel
  trend: TrendDirection
  position: { top: number; left: number }
  visible: boolean
}

const DemandTrendTooltip = memo(function DemandTrendTooltip({ demand, trend, position, visible }: TooltipProps) {
  const demandLower = normalizeDemand(demand)
  const trendLower = normalizeTrend(trend)
  const demandConfig = DEMAND_CONFIG[demandLower]
  const trendConfig = TREND_CONFIG[trendLower]
  const DemandIcon = demandConfig.icon
  const TrendIcon = trendConfig.icon

  if (typeof window === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {visible && (
        <div
          style={{ top: position.top, left: position.left }}
          className="fixed z-50 bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-3 shadow-lg shadow-black/20 min-w-[160px] -translate-x-1/2"
        >
          {/* Demand */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded ${demandConfig.bgColor}`}>
              <DemandIcon className={`w-4 h-4 ${demandConfig.color}`} />
            </div>
            <div>
              <p className={`text-sm font-semibold ${demandConfig.color}`}>
                {demandConfig.label} Demand
              </p>
              <p className="text-[10px] text-gray-500">{demandConfig.description}</p>
            </div>
          </div>

          {/* Trend */}
          <div className="flex items-center gap-2 pt-2 border-t border-darkbg-700">
            <TrendIcon className={`w-4 h-4 ${trendConfig.color}`} />
            <div>
              <p className={`text-xs ${trendConfig.color}`}>
                {trendConfig.label}
              </p>
              <p className="text-[10px] text-gray-500">{trendConfig.description}</p>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
})

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DemandTrendBadge - Displays demand and trend indicators for brainrots
 *
 * Design Philosophy:
 * - SUBTLETY: Normal/Stable states are invisible by default (hideIfNormal)
 * - SCANNABILITY: Hot items (high/amazing demand) stand out with warm colors
 * - SPACE EFFICIENCY: xs variant uses just icons for trade cards
 * - PROGRESSIVE DISCLOSURE: Full details available on hover via tooltip
 *
 * Usage by Context:
 * - Trade Cards: size="xs" variant="icon-only" hideIfNormal
 * - Trade Item Display: size="sm" variant="badge" hideIfNormal
 * - Trade Detail Page: size="md" variant="inline"
 * - Calculator Page: size="sm" variant="badge"
 * - Brainrot Picker: size="xs" variant="icon-only" hideIfNormal
 */
export const DemandTrendBadge = memo(function DemandTrendBadge({
  demand,
  trend,
  size = 'sm',
  variant = 'badge',
  showTooltip = true,
  hideIfNormal = false,
  className = '',
}: DemandTrendBadgeProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const badgeRef = useRef<HTMLDivElement>(null)

  // Normalize to lowercase for config lookups
  const demandLower = normalizeDemand(demand)
  const trendLower = normalizeTrend(trend)

  // Don't render if normal/stable and hideIfNormal is true
  if (hideIfNormal && !isNotableState(demand, trend)) {
    return null
  }

  const demandConfig = DEMAND_CONFIG[demandLower]
  const trendConfig = TREND_CONFIG[trendLower]
  const sizeConfig = SIZE_CONFIG[size]
  const DemandIcon = demandConfig.icon
  const TrendIcon = trendConfig.icon

  const heatLevel = getHeatLevel(demand, trend)
  const isHot = heatLevel === 'hot' || heatLevel === 'warm'
  const isCold = heatLevel === 'cold'

  // Update tooltip position
  useEffect(() => {
    if (tooltipVisible && badgeRef.current) {
      const rect = badgeRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      })
    }
  }, [tooltipVisible])

  const handleMouseEnter = () => showTooltip && setTooltipVisible(true)
  const handleMouseLeave = () => setTooltipVisible(false)

  // ==================== ICON-ONLY VARIANT ====================
  // Best for: Trade cards, picker grids (space-constrained)
  // Shows: Single icon representing the most notable state
  if (variant === 'icon-only') {
    // For icon-only, prioritize showing the most impactful indicator
    // If demand is notable, show demand icon. Otherwise show trend icon if notable.
    const showDemand = demandLower !== 'normal'
    const showTrend = trendLower !== 'stable' && !showDemand

    if (!showDemand && !showTrend) return null

    const activeConfig = showDemand ? demandConfig : trendConfig
    const ActiveIcon = showDemand ? DemandIcon : TrendIcon

    return (
      <>
        <div
          ref={badgeRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`
            inline-flex items-center justify-center
            ${sizeConfig.padding} rounded
            ${activeConfig.bgColor}
            cursor-default
            ${className}
          `}
        >
          <ActiveIcon className={`${sizeConfig.iconSize} ${activeConfig.color}`} />
        </div>
        {showTooltip && (
          <DemandTrendTooltip
            demand={demand}
            trend={trend}
            position={tooltipPos}
            visible={tooltipVisible}
          />
        )}
      </>
    )
  }

  // ==================== BADGE VARIANT ====================
  // Best for: Trade item displays, calculator (medium space)
  // Shows: Icon + short label for demand, trend icon
  if (variant === 'badge') {
    return (
      <>
        <div
          ref={badgeRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`
            inline-flex items-center ${sizeConfig.gap}
            ${sizeConfig.badgePadding} rounded-full
            ${demandConfig.bgColor}
            border ${demandConfig.borderColor}
            cursor-default
            ${className}
          `}
        >
          {/* Demand indicator */}
          <DemandIcon className={`${sizeConfig.iconSize} ${demandConfig.color}`} />

          {/* Short label for demand (only for notable states) */}
          {demandConfig.shortLabel && (
            <span className={`${sizeConfig.fontSize} font-semibold ${demandConfig.color}`}>
              {demandConfig.shortLabel}
            </span>
          )}

          {/* Trend indicator (only if notable) */}
          {trendLower !== 'stable' && (
            <TrendIcon className={`${sizeConfig.iconSize} ${trendConfig.color}`} />
          )}
        </div>
        {showTooltip && (
          <DemandTrendTooltip
            demand={demand}
            trend={trend}
            position={tooltipPos}
            visible={tooltipVisible}
          />
        )}
      </>
    )
  }

  // ==================== INLINE VARIANT ====================
  // Best for: Trade detail pages (full space available)
  // Shows: Full labels for both demand and trend
  return (
    <>
      <div
        ref={badgeRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          inline-flex items-center ${sizeConfig.gap}
          cursor-default
          ${className}
        `}
      >
        {/* Demand section */}
        <div className={`
          inline-flex items-center ${sizeConfig.gap}
          ${sizeConfig.badgePadding} rounded-lg
          ${demandConfig.bgColor}
        `}>
          <DemandIcon className={`${sizeConfig.iconSize} ${demandConfig.color}`} />
          <span className={`${sizeConfig.fontSize} font-semibold ${demandConfig.color}`}>
            {demandConfig.label}
          </span>
        </div>

        {/* Trend section */}
        <div className={`
          inline-flex items-center ${sizeConfig.gap}
          ${sizeConfig.padding} rounded-lg
          bg-darkbg-800
        `}>
          <TrendIcon className={`${sizeConfig.iconSize} ${trendConfig.color}`} />
          <span className={`${sizeConfig.fontSize} ${trendConfig.color}`}>
            {trendConfig.label}
          </span>
        </div>
      </div>
      {showTooltip && (
        <DemandTrendTooltip
          demand={demand}
          trend={trend}
          position={tooltipPos}
          visible={tooltipVisible}
        />
      )}
    </>
  )
})

// ============================================================================
// COMPACT INDICATOR (for very tight spaces)
// ============================================================================

/**
 * DemandDot - A minimal dot indicator for extreme space constraints
 * Color-coded: red=cold, gray=neutral, yellow=warm, green=hot
 * Used in: Trade card thumbnails when even icon-only is too large
 */
export const DemandDot = memo(function DemandDot({
  demand,
  trend,
  size = 'sm',
  className = '',
}: {
  demand: DemandLevel
  trend: TrendDirection
  size?: 'xs' | 'sm'
  className?: string
}) {
  const demandLower = normalizeDemand(demand)
  const trendLower = normalizeTrend(trend)
  const heatLevel = getHeatLevel(demand, trend)

  // Don't show dot for neutral items
  if (heatLevel === 'neutral') return null

  const dotSize = size === 'xs' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const colors = {
    cold: 'bg-red-400',
    neutral: 'bg-gray-500',
    warm: 'bg-amber-400',
    hot: 'bg-emerald-400',
  }

  return (
    <div
      className={`${dotSize} rounded-full ${colors[heatLevel]} ${className}`}
      title={`${DEMAND_CONFIG[demandLower].label} demand, ${TREND_CONFIG[trendLower].label}`}
    />
  )
})

// ============================================================================
// EXPORTS
// ============================================================================

export { DEMAND_CONFIG, TREND_CONFIG }
