'use client'

import { useState, useRef, useEffect, useMemo, useCallback, memo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { BadgeCheck, MessageSquare, MoveRight, ArrowRightLeft } from 'lucide-react'
import { RobloxAvatar } from '@/components/ui'
import { easeOut } from '@/lib/animations'
import { getMutationClass } from '@/lib/utils'

// Income formatting thresholds as constants to avoid recreation
const TRILLION = 1_000_000_000_000
const BILLION = 1_000_000_000
const MILLION = 1_000_000
const THOUSAND = 1_000

// Income thresholds for badges
const MONEYMAKER_THRESHOLD = BILLION // 1B
const LB_VIABLE_THRESHOLD = 2 * BILLION // 2B
const TRAIT_STACKED_THRESHOLD = 5 // 5+ traits

interface TradeCardProps {
  trade: {
    id: string
    status: string
    isVerified: boolean
    createdAt: string
    user: {
      id: string
      robloxUsername: string
      robloxUserId: string
      robloxAvatarUrl?: string | null
    }
    items: Array<{
      id: string
      side: 'OFFER' | 'REQUEST'
      brainrot: {
        id: string
        name: string
        localImage: string | null
        baseIncome: string
      }
      mutation?: {
        id: string
        name: string
        multiplier: number
      } | null
      event?: {
        id: string
        name: string
      } | null
      traits?: Array<{
        trait: {
          id: string
          name: string
          localImage: string | null
          multiplier: number
        }
      }>
      calculatedIncome?: string | null
      robuxValue?: number | null
      robuxAmount?: number | null
      hasTraits?: boolean
      traitCount?: number
    }>
    _count?: {
      counterOffers: number
    }
  }
  index?: number
}

// Format Robux value with + for traits
function formatRobuxValue(value: number | null | undefined, hasTraits: boolean = false): string | null {
  if (value === null || value === undefined) return null
  const formatted = `R$${value.toLocaleString()}`
  return hasTraits ? `${formatted}+` : formatted
}

// Get income badge type based on calculated income
function getIncomeBadge(income: string | null | undefined): 'lb' | 'moneymaker' | null {
  if (!income) return null
  const num = parseFloat(income)
  if (num >= LB_VIABLE_THRESHOLD) return 'lb'
  if (num >= MONEYMAKER_THRESHOLD) return 'moneymaker'
  return null
}

// Check if item has trait stacked badge
function hasTraitStackedBadge(traitCount: number = 0): boolean {
  return traitCount >= TRAIT_STACKED_THRESHOLD
}

// Trait icons with hover tooltip - same style as TradeItemDisplay
// size: 'sm' for mobile/desktop compact, 'md' for iPad enhanced view
// maxShow is the TOTAL slots including the "+X" indicator
function TraitIcons({ traits, maxShow = 3, size = 'sm' }: { traits: Array<{ trait: { id: string; name: string; localImage: string | null; multiplier: number } }>; maxShow?: number; size?: 'sm' | 'md' }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const iconsRef = useRef<HTMLDivElement>(null)

  // Sort by highest multiplier first
  const sortedTraits = [...traits].sort((a, b) => b.trait.multiplier - a.trait.multiplier)

  // If there's overflow, reserve 1 slot for the "+X" indicator
  const hasOverflow = sortedTraits.length > maxShow
  const visibleCount = hasOverflow ? maxShow - 1 : sortedTraits.length
  const visible = sortedTraits.slice(0, visibleCount)
  const overflow = sortedTraits.length - visibleCount

  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4'
  const iconPx = size === 'md' ? 20 : 16
  const fontSize = size === 'md' ? 'text-[8px]' : 'text-[7px]'
  const overflowFontSize = size === 'md' ? 'text-[9px]' : 'text-[8px]'

  useEffect(() => {
    if (showTooltip && iconsRef.current) {
      const rect = iconsRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.bottom + 8,
        left: rect.left,
      })
    }
  }, [showTooltip])

  return (
    <div className="flex gap-0.5">
      <div
        ref={iconsRef}
        role="button"
        tabIndex={0}
        aria-label={`View ${sortedTraits.length} trait${sortedTraits.length === 1 ? '' : 's'}`}
        className="flex gap-0.5 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setShowTooltip(!showTooltip)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setShowTooltip(!showTooltip)
          }
        }}
      >
        {visible.map((t) => (
          <div
            key={t.trait.id}
            className={`${iconSize} rounded-full bg-darkbg-700 overflow-hidden flex-shrink-0`}
          >
            {t.trait.localImage ? (
              <Image src={t.trait.localImage} alt={t.trait.name} width={iconPx} height={iconPx} className="object-cover" />
            ) : (
              <span className={`w-full h-full flex items-center justify-center ${fontSize} text-gray-400`}>{t.trait.name.charAt(0)}</span>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className={`${iconSize} rounded-full bg-darkbg-600 flex items-center justify-center ${overflowFontSize} text-gray-300 font-medium flex-shrink-0`}>
            +{overflow}
          </div>
        )}
      </div>
      {/* Tooltip rendered via portal */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
              className="fixed z-50 bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-2 shadow-lg shadow-black/20 min-w-[120px]"
            >
              {sortedTraits.map((t) => (
                <div key={t.trait.id} className="flex items-center gap-2 py-1">
                  <div className="w-5 h-5 rounded-full bg-darkbg-700 overflow-hidden flex-shrink-0">
                    {t.trait.localImage ? (
                      <Image src={t.trait.localImage} alt={t.trait.name} width={20} height={20} className="object-cover" />
                    ) : (
                      <span className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">{t.trait.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-300">{t.trait.name}</span>
                  <span className="text-[10px] text-gray-500 ml-auto">{t.trait.multiplier}x</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// Compact item display for trade cards - shows image with mutation badge, traits, and hover tooltip
// size: 'xs' for very small mobile, 'sm' for normal 2-row layouts, 'lg' for single-row centered layouts
function CompactItem({ item, size = 'sm' }: { item: TradeCardProps['trade']['items'][0]; size?: 'xs' | 'sm' | 'lg' }) {
  const traits = item.traits || []
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const itemRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (showTooltip && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showTooltip])

  const formattedIncome = item.calculatedIncome
    ? formatCompactIncome(item.calculatedIncome) + '/s'
    : null

  // Size classes based on size prop
  // xs: small mobile (2-row), sm: normal (2-row), lg: single-row centered (bigger since more space)
  const sizeClasses = size === 'xs'
    ? 'w-12 h-12' // 48px for very small screens
    : size === 'lg'
    ? 'w-20 h-20 sm:w-24 sm:h-24' // 80px mobile, 96px sm+ for single-row
    : 'w-14 h-14 sm:w-16 sm:h-16' // 56px mobile, 64px sm+ for 2-row

  const imageSize = size === 'xs' ? 48 : size === 'lg' ? 96 : 64
  const maxTraits = size === 'xs' ? 2 : size === 'lg' ? 4 : 3

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div
        ref={itemRef}
        className="relative cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className={`${sizeClasses} rounded-lg bg-darkbg-700 overflow-hidden flex items-center justify-center`}>
          {item.brainrot.localImage ? (
            <Image
              src={item.brainrot.localImage}
              alt={item.brainrot.name}
              width={imageSize}
              height={imageSize}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-xs text-gray-500">?</span>
          )}
        </div>
        {/* Mutation badge - top right, responsive sizing */}
        {item.mutation && (
          <div className={`animation-always-running absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 lg:-top-2 lg:-right-2 px-1.5 py-0.5 sm:px-2 sm:py-0.5 lg:px-2.5 lg:py-1 rounded sm:rounded-md text-[9px] sm:text-[10px] lg:text-xs font-bold bg-darkbg-800 shadow-md lg:shadow-lg ${getMutationClass(item.mutation.name)}`}>
            {item.mutation.name.charAt(0)}
          </div>
        )}
      </div>
      {/* Traits below the image - always reserve space for consistent height */}
      <div className="h-4 flex items-center">
        {traits.length > 0 ? (
          <TraitIcons traits={traits} maxShow={maxTraits} />
        ) : null}
      </div>
      {/* Brainrot tooltip */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
              className="fixed z-50 bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-2 shadow-lg shadow-black/20 min-w-[120px] -translate-x-1/2"
            >
              <p
                className="text-xs font-semibold text-white text-center"
                style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', cursive" }}
              >
                {item.brainrot.name}
              </p>
              {item.mutation && (
                <p className={`text-[10px] font-medium text-center ${getMutationClass(item.mutation.name)}`}>
                  {item.mutation.name}
                </p>
              )}
              {/* Robux value */}
              {item.robuxValue !== null && item.robuxValue !== undefined && (
                <p className="text-[10px] text-amber-400 mt-0.5 text-center font-semibold">
                  {formatRobuxValue(item.robuxValue, item.hasTraits)}
                </p>
              )}
              {formattedIncome && (
                <p className="text-[10px] text-green-400 mt-0.5 text-center">{formattedIncome}</p>
              )}
              {/* Income badges */}
              {(() => {
                const badge = getIncomeBadge(item.calculatedIncome)
                const traitStacked = hasTraitStackedBadge(item.traitCount)
                if (!badge && !traitStacked) return null
                return (
                  <div className="flex flex-wrap gap-1 justify-center mt-1">
                    {badge === 'lb' && (
                      <span className="text-[8px] font-bold bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">LB Viable</span>
                    )}
                    {badge === 'moneymaker' && (
                      <span className="text-[8px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Moneymaker</span>
                    )}
                    {traitStacked && (
                      <span className="text-[8px] font-bold bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">Trait Stacked</span>
                    )}
                  </div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// Enhanced iPad item display - larger images with visible name, income, and details
// Used for the iPad-specific single-column layout (md breakpoint, 768-1024px)
// size: 'md' for 2-row layouts (72px), 'lg' for single-row centered layouts (100px)
function IPadEnhancedItem({ item, size = 'md' }: { item: TradeCardProps['trade']['items'][0]; size?: 'md' | 'lg' }) {
  const traits = item.traits || []

  const formattedIncome = item.calculatedIncome
    ? formatCompactIncome(item.calculatedIncome) + '/s'
    : null

  // Size-dependent values
  const imgSize = size === 'lg' ? 100 : 72
  const containerClass = size === 'lg' ? 'min-w-[100px]' : 'min-w-[72px]'
  const imgContainerClass = size === 'lg' ? 'w-[100px] h-[100px]' : 'w-[72px] h-[72px]'
  const nameMaxWidth = size === 'lg' ? 'max-w-[100px]' : 'max-w-[72px]'
  const nameTruncateLen = size === 'lg' ? 14 : 12

  // Truncate long names for display
  const displayName = item.brainrot.name.length > nameTruncateLen
    ? item.brainrot.name.slice(0, nameTruncateLen - 1) + '...'
    : item.brainrot.name

  return (
    <div className={`flex flex-col items-center gap-1.5 flex-shrink-0 ${containerClass}`}>
      {/* Image container */}
      <div className="relative">
        <div className={`${imgContainerClass} rounded-xl bg-darkbg-700 overflow-hidden flex items-center justify-center shadow-lg shadow-black/10`}>
          {item.brainrot.localImage ? (
            <Image
              src={item.brainrot.localImage}
              alt={item.brainrot.name}
              width={imgSize}
              height={imgSize}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-sm text-gray-500">?</span>
          )}
        </div>
        {/* Mutation badge - larger for iPad */}
        {item.mutation && (
          <div className={`animation-always-running absolute -top-2 -right-2 px-2.5 py-1 rounded-md text-sm font-bold bg-darkbg-800 shadow-lg border border-darkbg-600 ${getMutationClass(item.mutation.name)}`}>
            {item.mutation.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Brainrot name - Comic Sans style for kids */}
      <p
        className={`${size === 'lg' ? 'text-xs' : 'text-[11px]'} font-semibold text-white text-center leading-tight ${nameMaxWidth} truncate`}
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', cursive" }}
        title={item.brainrot.name}
      >
        {displayName}
      </p>

      {/* Mutation name if present */}
      {item.mutation && (
        <p className={`animation-always-running ${size === 'lg' ? 'text-[10px]' : 'text-[9px]'} font-bold -mt-1 ${getMutationClass(item.mutation.name)}`}>
          {item.mutation.name}
        </p>
      )}

      {/* Robux value */}
      {item.robuxValue !== null && item.robuxValue !== undefined && (
        <span className={`${size === 'lg' ? 'text-[10px]' : 'text-[9px]'} font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full -mt-0.5`}>
          {formatRobuxValue(item.robuxValue, item.hasTraits)}
        </span>
      )}

      {/* Individual income display */}
      {formattedIncome && (
        <span className={`${size === 'lg' ? 'text-[11px]' : 'text-[10px]'} font-semibold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full -mt-0.5`}>
          {formattedIncome}
        </span>
      )}

      {/* Income & trait badges */}
      {(() => {
        const badge = getIncomeBadge(item.calculatedIncome)
        const traitStacked = hasTraitStackedBadge(item.traitCount)
        if (!badge && !traitStacked) return null
        return (
          <div className="flex flex-wrap gap-0.5 justify-center -mt-0.5">
            {badge === 'lb' && (
              <span className="text-[7px] font-bold bg-purple-500/20 text-purple-400 px-1 py-0.5 rounded">LB</span>
            )}
            {badge === 'moneymaker' && (
              <span className="text-[7px] font-bold bg-emerald-500/20 text-emerald-400 px-1 py-0.5 rounded">MM</span>
            )}
            {traitStacked && (
              <span className="text-[7px] font-bold bg-cyan-500/20 text-cyan-400 px-1 py-0.5 rounded">5+T</span>
            )}
          </div>
        )
      })()}

      {/* Traits row */}
      <div className="h-5 flex items-center -mt-0.5">
        {traits.length > 0 ? (
          <TraitIcons traits={traits} maxShow={size === 'lg' ? 5 : 4} size="md" />
        ) : null}
      </div>
    </div>
  )
}

// iPad Grid display component - shows items in 3-per-row grid, max 2 rows with enhanced items
// Always maintains consistent height for 2 rows to align cards in grid
// Single-row layouts get larger brainrots since there's more vertical space
function IPadItemGrid({ items }: { items: TradeCardProps['trade']['items'] }) {
  const maxVisible = 6
  const visible = items.slice(0, maxVisible)
  const hidden = Math.max(0, items.length - maxVisible)

  // Split into rows of 3
  const row1 = visible.slice(0, 3)
  const row2 = visible.slice(3, 6)
  const hasSecondRow = row2.length > 0 || hidden > 0

  // Use larger size for single-row layouts
  const itemSize = hasSecondRow ? 'md' : 'lg'

  return (
    <div className={`flex flex-col gap-2 min-h-[280px] ${!hasSecondRow ? 'justify-center' : ''}`}>
      {/* Row 1 - always centered horizontally */}
      <div className="flex justify-center gap-3">
        {row1.map((item) => (
          <IPadEnhancedItem key={item.id} item={item} size={itemSize} />
        ))}
      </div>
      {/* Row 2 - centered, only if there are items */}
      {hasSecondRow && (
        <div className="flex justify-center gap-3">
          {row2.map((item) => (
            <IPadEnhancedItem key={item.id} item={item} size="md" />
          ))}
          {hidden > 0 && (
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[72px]">
              <div className="w-[72px] h-[72px] rounded-xl bg-darkbg-700 flex items-center justify-center shadow-lg shadow-black/10">
                <span className="text-base font-semibold text-gray-400">+{hidden}</span>
              </div>
              <div className="h-[11px]" />
              <div className="h-[22px]" />
              <div className="h-5" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Income and Value display with tooltip
function TotalsDisplay({ income, value, align = 'left' }: { income?: string | null; value?: number | null; align?: 'left' | 'center' | 'right' }) {
  const [showTooltip, setShowTooltip] = useState<'income' | 'value' | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const incomeRef = useRef<HTMLSpanElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const ref = showTooltip === 'income' ? incomeRef.current : showTooltip === 'value' ? valueRef.current : null
    if (showTooltip && ref) {
      const rect = ref.getBoundingClientRect()
      setTooltipPos({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showTooltip])

  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  // Don't render if nothing to show
  if (!income && !value) return null

  return (
    <div className={`mt-1.5 flex items-center gap-2 ${justifyClass}`}>
      {income && (
        <span
          ref={incomeRef}
          onMouseEnter={() => setShowTooltip('income')}
          onMouseLeave={() => setShowTooltip(null)}
          className="text-xs text-green-400 font-semibold cursor-default"
        >
          <span className="text-white/70">Σ</span> {formatCompactIncome(income)}/s
        </span>
      )}
      {value != null && (
        <span
          ref={valueRef}
          onMouseEnter={() => setShowTooltip('value')}
          onMouseLeave={() => setShowTooltip(null)}
          className="text-xs text-amber-400 font-semibold cursor-default"
        >
          R${formatCompactValue(value)}
        </span>
      )}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
              className="fixed z-50 bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg px-2 py-1 shadow-lg shadow-black/20 -translate-x-1/2"
            >
              <p className="text-[10px] text-gray-300 whitespace-nowrap text-center">
                {showTooltip === 'income' ? 'Total Income' : 'Total Value'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}

// Calculate total income from items
function calculateTotalIncome(items: TradeCardProps['trade']['items']): string | null {
  let total = 0
  let hasIncome = false

  for (const item of items) {
    if (item.calculatedIncome) {
      hasIncome = true
      total += parseFloat(item.calculatedIncome)
    }
  }

  return hasIncome ? total.toFixed(2) : null
}

// Calculate total Robux value from items (includes brainrot values + Robux addon amounts)
function calculateTotalValue(items: TradeCardProps['trade']['items']): number | null {
  let total = 0
  let hasValue = false

  for (const item of items) {
    // Add brainrot's robux value
    if (item.robuxValue != null) {
      hasValue = true
      total += item.robuxValue
    }
    // Add Robux addon amount
    if (item.robuxAmount != null) {
      hasValue = true
      total += item.robuxAmount
    }
  }

  return hasValue ? total : null
}

// Format Robux value compactly (e.g., 1.5K, 2.3M)
function formatCompactValue(value: number): string {
  if (value >= MILLION) {
    return (Math.floor(value / MILLION * 10) / 10).toFixed(1) + 'M'
  }
  if (value >= THOUSAND) {
    return (Math.floor(value / THOUSAND * 10) / 10).toFixed(1) + 'K'
  }
  return value.toLocaleString()
}

// Optimized income formatting using pre-defined constants
// Uses floor instead of round to avoid misleading higher values
function formatCompactIncome(income: string): string {
  const num = parseFloat(income)
  if (num >= TRILLION) {
    return (Math.floor(num / TRILLION * 10) / 10).toFixed(1) + 'T'
  }
  if (num >= BILLION) {
    return (Math.floor(num / BILLION * 10) / 10).toFixed(1) + 'B'
  }
  if (num >= MILLION) {
    return (Math.floor(num / MILLION * 10) / 10).toFixed(1) + 'M'
  }
  if (num >= THOUSAND) {
    return (Math.floor(num / THOUSAND * 10) / 10).toFixed(1) + 'K'
  }
  return Math.floor(num).toString()
}

// Grid display component - shows items in 3-per-row grid, max 2 rows
// When compact=true (both sides single row), use smaller height
// Single-row layouts get larger brainrots since there's more vertical space
function ItemGrid({ items, size = 'sm', compact = false }: { items: TradeCardProps['trade']['items']; size?: 'xs' | 'sm'; compact?: boolean }) {
  const maxVisible = 6
  const visible = items.slice(0, maxVisible)
  const hidden = Math.max(0, items.length - maxVisible)

  // Split into rows of 3
  const row1 = visible.slice(0, 3)
  const row2 = visible.slice(3, 6)
  const hasSecondRow = row2.length > 0 || hidden > 0

  // When compact (both sides single row), no min-height needed
  // Otherwise use fixed height for 2 rows for consistent card alignment
  const containerHeight = compact ? '' : (size === 'xs' ? 'min-h-[144px]' : 'min-h-[176px]')

  // Use larger size for single-row layouts (more vertical space available)
  // xs upgrades to sm, sm upgrades to lg when single row
  const itemSize: 'xs' | 'sm' | 'lg' = !hasSecondRow
    ? (size === 'xs' ? 'sm' : 'lg')
    : size

  return (
    <div className={`flex flex-col gap-1 sm:gap-2 ${containerHeight} ${!hasSecondRow ? 'justify-center' : ''}`}>
      {/* Row 1 - always centered horizontally */}
      <div className="flex justify-center gap-1 sm:gap-2">
        {row1.map((item) => (
          <CompactItem key={item.id} item={item} size={itemSize} />
        ))}
      </div>
      {/* Row 2 - centered, only if there are items */}
      {hasSecondRow && (
        <div className="flex justify-center gap-1 sm:gap-2">
          {row2.map((item) => (
            <CompactItem key={item.id} item={item} size={size} />
          ))}
          {hidden > 0 && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className={`${size === 'xs' ? 'w-12 h-12' : 'w-14 h-14 sm:w-16 sm:h-16'} rounded-lg bg-darkbg-800 flex items-center justify-center`}>
                <span className={`${size === 'xs' ? 'text-sm' : 'text-base'} font-medium text-gray-400`}>+{hidden}</span>
              </div>
              <div className="h-4" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Memoized TradeCard component to prevent unnecessary re-renders
export const TradeCard = memo(function TradeCard({ trade, index = 0 }: TradeCardProps) {
  // Memoize filtered items to prevent recalculation on every render
  const offerItems = useMemo(
    () => trade.items.filter((i) => i.side === 'OFFER'),
    [trade.items]
  )
  const requestItems = useMemo(
    () => trade.items.filter((i) => i.side === 'REQUEST'),
    [trade.items]
  )

  // Check if both sides have single row (≤3 items each) for compact mobile layout
  const isBothSingleRow = useMemo(
    () => offerItems.length <= 3 && requestItems.length <= 3,
    [offerItems.length, requestItems.length]
  )

  // Memoize income and value calculations
  const offerIncome = useMemo(() => calculateTotalIncome(offerItems), [offerItems])
  const requestIncome = useMemo(() => calculateTotalIncome(requestItems), [requestItems])
  const offerValue = useMemo(() => calculateTotalValue(offerItems), [offerItems])
  const requestValue = useMemo(() => calculateTotalValue(requestItems), [requestItems])

  // Memoize formatted date to prevent recreation
  const formattedDate = useMemo(
    () => formatDistanceToNow(new Date(trade.createdAt), { addSuffix: false }),
    [trade.createdAt]
  )
  const formattedDateWithSuffix = useMemo(
    () => formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true }),
    [trade.createdAt]
  )

  return (
    <Link href={`/trading/${trade.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03, ease: easeOut }}
        whileHover={{
          y: -3,
          transition: { duration: 0.15, ease: easeOut },
        }}
        whileTap={{ scale: 0.98 }}
        className="
          h-full
          bg-darkbg-900/90 backdrop-blur-sm rounded-xl
          p-3 md:p-5 lg:p-3
          border border-darkbg-700
          hover:border-green-500/50
          hover:shadow-[0_4px_20px_rgba(34,197,94,0.12)]
          transition-all duration-200 cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-darkbg-950
        "
      >
        {/* ============================================ */}
        {/* MOBILE VIEW (0 - 767px) */}
        {/* 3 items per row, max 2 rows (6 items), centered layout */}
        {/* ============================================ */}
        <div className="md:hidden pb-2">
          {/* Labels row */}
          <div className="flex justify-between mb-1.5">
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Offering</p>
            <p className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wide">Wants</p>
          </div>

          {/* Items grid with arrow */}
          <div className="flex items-start gap-2 sm:gap-3">
            {/* Offer Side */}
            <div className="flex-1 min-w-0">
              {/* XS screens get smaller items */}
              <div className="sm:hidden">
                <ItemGrid items={offerItems} size="xs" compact={isBothSingleRow} />
              </div>
              <div className="hidden sm:block">
                <ItemGrid items={offerItems} size="sm" compact={isBothSingleRow} />
              </div>
              <TotalsDisplay income={offerIncome} value={offerValue} align="center" />
            </div>

            {/* Arrow - vertically centered */}
            <div className="flex-shrink-0 flex items-center self-center py-4">
              <MoveRight className="w-4 h-4 sm:w-5 sm:h-5 text-green-500/70" />
            </div>

            {/* Request Side */}
            <div className="flex-1 min-w-0">
              {/* XS screens get smaller items */}
              <div className="sm:hidden">
                <ItemGrid items={requestItems} size="xs" compact={isBothSingleRow} />
              </div>
              <div className="hidden sm:block">
                <ItemGrid items={requestItems} size="sm" compact={isBothSingleRow} />
              </div>
              <TotalsDisplay income={requestIncome} value={requestValue} align="center" />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* DESKTOP VIEW (lg: 1024px+) */}
        {/* 3 items per row, max 2 rows (6 items), centered layout */}
        {/* ============================================ */}
        <div className="hidden lg:block pb-2">
          {/* Labels row */}
          <div className="flex justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Offering</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wants</p>
          </div>

          {/* Items grid with arrow */}
          <div className="flex items-start gap-3">
            {/* Offer Side */}
            <div className="flex-1 min-w-0">
              <ItemGrid items={offerItems} size="sm" />
              <TotalsDisplay income={offerIncome} value={offerValue} align="center" />
            </div>

            {/* Arrow - vertically centered */}
            <div className="flex-shrink-0 flex items-center self-center py-4">
              <MoveRight className="w-6 h-6 text-green-500/70" />
            </div>

            {/* Request Side */}
            <div className="flex-1 min-w-0">
              <ItemGrid items={requestItems} size="sm" />
              <TotalsDisplay income={requestIncome} value={requestValue} align="center" />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* iPAD ENHANCED VIEW (md: only, 768-1024px) */}
        {/* 3 items per row, max 2 rows, larger items with more details */}
        {/* ============================================ */}
        <div className="hidden md:block lg:hidden pb-3">
          {/* Header with labels and trade icon */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <ArrowRightLeft className="w-4 h-4 text-green-500" />
              </div>
              <span className="text-sm font-bold text-white">Trade Offer</span>
            </div>
            {/* Status badge for iPad - more prominent */}
            {trade.status !== 'OPEN' && (
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
                  trade.status === 'COMPLETED'
                    ? 'bg-green-500/15 text-green-400'
                    : trade.status === 'PENDING'
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'bg-red-500/15 text-red-400'
                }`}
              >
                {trade.status}
              </span>
            )}
          </div>

          {/* Main trade content - horizontal layout */}
          <div className="flex items-stretch gap-4">
            {/* Offer Side */}
            <div className="flex-1 bg-darkbg-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-green-400 uppercase tracking-wider">Offering</p>
                <div className="flex items-center gap-2">
                  {offerIncome && (
                    <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                      <span className="text-white/70">Σ</span> {formatCompactIncome(offerIncome)}/s
                    </span>
                  )}
                  {offerValue != null && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      R${formatCompactValue(offerValue)}
                    </span>
                  )}
                </div>
              </div>
              <IPadItemGrid items={offerItems} />
            </div>

            {/* Arrow divider - larger for iPad */}
            <div className="flex-shrink-0 flex items-center">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <MoveRight className="w-5 h-5 text-green-400" />
              </div>
            </div>

            {/* Request Side */}
            <div className="flex-1 bg-darkbg-800/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Wants</p>
                <div className="flex items-center gap-2">
                  {requestIncome && (
                    <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                      <span className="text-white/70">Σ</span> {formatCompactIncome(requestIncome)}/s
                    </span>
                  )}
                  {requestValue != null && (
                    <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                      R${formatCompactValue(requestValue)}
                    </span>
                  )}
                </div>
              </div>
              <IPadItemGrid items={requestItems} />
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* FOOTER - Responsive for all sizes */}
        {/* ============================================ */}
        {/* Mobile/Desktop Footer */}
        <div className="md:hidden lg:flex flex items-center justify-between mt-2 pt-2 border-t border-darkbg-800">
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            <RobloxAvatar
              avatarUrl={trade.user.robloxAvatarUrl}
              username={trade.user.robloxUsername}
              size="xs"
            />
            <span className="text-[10px] sm:text-xs text-gray-400 truncate max-w-[60px] sm:max-w-[100px]">
              {trade.user.robloxUsername}
            </span>
            {trade.isVerified && (
              <BadgeCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10px] text-gray-500 flex-shrink-0">
            {trade.status !== 'OPEN' && (
              <span
                className={`font-medium px-1 sm:px-1.5 py-0.5 rounded ${
                  trade.status === 'COMPLETED'
                    ? 'bg-green-500/10 text-green-500'
                    : trade.status === 'PENDING'
                    ? 'bg-amber-500/10 text-amber-500'
                    : 'bg-red-500/10 text-red-500'
                }`}
              >
                {trade.status}
              </span>
            )}
            {trade._count && trade._count.counterOffers > 0 && (
              <span className="flex items-center gap-0.5 text-green-500">
                <MessageSquare className="w-3 h-3" />
                {trade._count.counterOffers}
              </span>
            )}
            <span>{formattedDate}</span>
          </div>
        </div>

        {/* iPad Enhanced Footer - more prominent user info */}
        <div className="hidden md:flex lg:hidden items-center justify-between mt-4 pt-3 border-t border-darkbg-700">
          <div className="flex items-center gap-3 min-w-0">
            <RobloxAvatar
              avatarUrl={trade.user.robloxAvatarUrl}
              username={trade.user.robloxUsername}
              size="md"
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate max-w-[160px]">
                  {trade.user.robloxUsername}
                </span>
                {trade.isVerified && (
                  <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500">
                Posted {formattedDateWithSuffix}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {trade._count && trade._count.counterOffers > 0 && (
              <div className="flex items-center gap-1.5 bg-green-500/10 px-2.5 py-1.5 rounded-lg">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-green-400">{trade._count.counterOffers}</span>
                <span className="text-xs text-green-400/70">offers</span>
              </div>
            )}
            <div className="text-xs text-gray-500 bg-darkbg-700 px-2.5 py-1.5 rounded-lg">
              Tap to view
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
})

// Skeleton loader for TradeCard - responsive for mobile, iPad, and desktop
// Matches the 3-per-row, 2-row grid layout (max 6 items per side)
// Single-row layouts have larger brainrot images, consistent min-heights for alignment
export function TradeCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="bg-darkbg-900 rounded-xl border border-darkbg-700 p-3 md:p-5 lg:p-3"
    >
      {/* ============================================ */}
      {/* MOBILE SKELETON (0 - 767px) */}
      {/* 3 items per row, max 2 rows (6 items), centered layout */}
      {/* ============================================ */}
      <div className="md:hidden pb-2">
        {/* Labels row */}
        <div className="flex justify-between mb-1.5">
          <div className="h-3 w-14 sm:w-16 skeleton rounded" />
          <div className="h-3 w-10 sm:w-12 skeleton rounded" />
        </div>

        {/* Items grid with arrow */}
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Offer Side - 3x2 grid skeleton */}
          <div className="flex-1 min-w-0">
            {/* XS screens skeleton */}
            <div className="sm:hidden min-h-[144px] flex flex-col gap-1">
              {/* Row 1 */}
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 skeleton rounded-lg" />
                    <div className="h-4 w-8 skeleton rounded" />
                  </div>
                ))}
              </div>
              {/* Row 2 */}
              <div className="flex justify-center gap-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 skeleton rounded-lg" />
                    <div className="h-4 w-8 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* SM+ screens skeleton */}
            <div className="hidden sm:block min-h-[176px]">
              <div className="flex flex-col gap-2">
                {/* Row 1 */}
                <div className="flex justify-center gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                      <div className="h-4 w-10 skeleton rounded" />
                    </div>
                  ))}
                </div>
                {/* Row 2 */}
                <div className="flex justify-center gap-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                      <div className="h-4 w-10 skeleton rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Income */}
            <div className="mt-1.5 flex justify-center">
              <div className="h-4 w-16 skeleton rounded" />
            </div>
          </div>

          {/* Arrow - vertically centered */}
          <div className="flex-shrink-0 flex items-center self-center py-4">
            <div className="w-4 h-4 sm:w-5 sm:h-5 skeleton rounded" />
          </div>

          {/* Request Side - 3x2 grid skeleton */}
          <div className="flex-1 min-w-0">
            {/* XS screens skeleton */}
            <div className="sm:hidden min-h-[144px] flex flex-col gap-1">
              {/* Row 1 */}
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 skeleton rounded-lg" />
                    <div className="h-4 w-8 skeleton rounded" />
                  </div>
                ))}
              </div>
              {/* Row 2 */}
              <div className="flex justify-center gap-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 skeleton rounded-lg" />
                    <div className="h-4 w-8 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* SM+ screens skeleton */}
            <div className="hidden sm:block min-h-[176px]">
              <div className="flex flex-col gap-2">
                {/* Row 1 */}
                <div className="flex justify-center gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                      <div className="h-4 w-10 skeleton rounded" />
                    </div>
                  ))}
                </div>
                {/* Row 2 */}
                <div className="flex justify-center gap-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                      <div className="h-4 w-10 skeleton rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Income */}
            <div className="mt-1.5 flex justify-center">
              <div className="h-4 w-16 skeleton rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* DESKTOP SKELETON (lg: 1024px+) */}
      {/* 3 items per row, max 2 rows (6 items), centered layout */}
      {/* ============================================ */}
      <div className="hidden lg:block pb-2">
        {/* Labels row */}
        <div className="flex justify-between mb-1.5">
          <div className="h-3 w-16 skeleton rounded" />
          <div className="h-3 w-12 skeleton rounded" />
        </div>

        {/* Items grid with arrow */}
        <div className="flex items-start gap-3">
          {/* Offer Side - 3x2 grid skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1 min-h-[176px]">
              {/* Row 1 */}
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                    <div className="h-4 w-10 skeleton rounded" />
                  </div>
                ))}
              </div>
              {/* Row 2 */}
              <div className="flex justify-center gap-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                    <div className="h-4 w-10 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* Income */}
            <div className="mt-1.5 flex justify-center">
              <div className="h-4 w-16 skeleton rounded" />
            </div>
          </div>

          {/* Arrow - vertically centered */}
          <div className="flex-shrink-0 flex items-center self-center py-4">
            <div className="w-6 h-6 skeleton rounded" />
          </div>

          {/* Request Side - 3x2 grid skeleton */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col gap-1 min-h-[176px]">
              {/* Row 1 */}
              <div className="flex justify-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                    <div className="h-4 w-10 skeleton rounded" />
                  </div>
                ))}
              </div>
              {/* Row 2 */}
              <div className="flex justify-center gap-1">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 skeleton rounded-lg" />
                    <div className="h-4 w-10 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
            {/* Income */}
            <div className="mt-1.5 flex justify-center">
              <div className="h-4 w-16 skeleton rounded" />
            </div>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* iPAD ENHANCED SKELETON (md: only, 768-1024px) */}
      {/* 3 items per row, max 2 rows, larger items with more details */}
      {/* ============================================ */}
      <div className="hidden md:block lg:hidden pb-3">
        {/* Header with trade icon and status badge placeholder */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 skeleton rounded-lg" />
            <div className="h-4 w-24 skeleton rounded" />
          </div>
          {/* Status badge placeholder */}
          <div className="h-6 w-16 skeleton rounded-lg" />
        </div>

        {/* Main trade content - horizontal layout */}
        <div className="flex items-stretch gap-4">
          {/* Offer Side */}
          <div className="flex-1 bg-darkbg-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-16 skeleton rounded" />
              <div className="h-5 w-16 skeleton rounded-full" />
            </div>
            {/* 3x2 grid with min-height for alignment */}
            <div className="flex flex-col gap-2 min-h-[280px]">
              {/* Row 1 */}
              <div className="flex justify-center gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                    <div className="w-[72px] h-[72px] skeleton rounded-xl" />
                    <div className="h-3 w-14 skeleton rounded" />
                    <div className="h-4 w-10 skeleton rounded-full" />
                    <div className="h-5 w-12 skeleton rounded" />
                  </div>
                ))}
              </div>
              {/* Row 2 */}
              <div className="flex justify-center gap-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                    <div className="w-[72px] h-[72px] skeleton rounded-xl" />
                    <div className="h-3 w-14 skeleton rounded" />
                    <div className="h-4 w-10 skeleton rounded-full" />
                    <div className="h-5 w-12 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Arrow divider - larger for iPad */}
          <div className="flex-shrink-0 flex items-center">
            <div className="w-10 h-10 skeleton rounded-full" />
          </div>

          {/* Request Side */}
          <div className="flex-1 bg-darkbg-800/50 rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 w-12 skeleton rounded" />
              <div className="h-5 w-16 skeleton rounded-full" />
            </div>
            {/* 3x2 grid with min-height for alignment */}
            <div className="flex flex-col gap-2 min-h-[280px]">
              {/* Row 1 */}
              <div className="flex justify-center gap-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                    <div className="w-[72px] h-[72px] skeleton rounded-xl" />
                    <div className="h-3 w-14 skeleton rounded" />
                    <div className="h-4 w-10 skeleton rounded-full" />
                    <div className="h-5 w-12 skeleton rounded" />
                  </div>
                ))}
              </div>
              {/* Row 2 */}
              <div className="flex justify-center gap-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5 min-w-[72px]">
                    <div className="w-[72px] h-[72px] skeleton rounded-xl" />
                    <div className="h-3 w-14 skeleton rounded" />
                    <div className="h-4 w-10 skeleton rounded-full" />
                    <div className="h-5 w-12 skeleton rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* iPad Enhanced Footer - more prominent user info */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-darkbg-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 skeleton rounded-full" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-28 skeleton rounded" />
              <div className="h-3 w-20 skeleton rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-20 skeleton rounded-lg" />
            <div className="h-8 w-20 skeleton rounded-lg" />
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* FOOTER SKELETON - Mobile/Desktop (not iPad) */}
      {/* ============================================ */}
      <div className="md:hidden lg:flex flex items-center justify-between mt-2 pt-2 border-t border-darkbg-800">
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="w-5 h-5 skeleton rounded-full" />
          <div className="h-3 w-12 sm:w-16 skeleton rounded" />
        </div>
        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="h-3 w-8 sm:w-10 skeleton rounded" />
        </div>
      </div>
    </motion.div>
  )
}
