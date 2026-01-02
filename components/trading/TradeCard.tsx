'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { BadgeCheck, MessageSquare, MoveRight, ArrowRightLeft } from 'lucide-react'
import { RobloxAvatar } from '@/components/ui'
import { easeOut } from '@/lib/animations'
import { getMutationClass } from '@/lib/utils'

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
    }>
    _count?: {
      counterOffers: number
    }
  }
  index?: number
}

// Trait icons with hover tooltip - same style as TradeItemDisplay
// size: 'sm' for mobile/desktop compact, 'md' for iPad enhanced view
function TraitIcons({ traits, maxShow = 3, size = 'sm' }: { traits: Array<{ trait: { id: string; name: string; localImage: string | null; multiplier: number } }>; maxShow?: number; size?: 'sm' | 'md' }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const iconsRef = useRef<HTMLDivElement>(null)
  const visible = traits.slice(0, maxShow)
  const overflow = traits.length - maxShow

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
        aria-label={`View ${traits.length} trait${traits.length === 1 ? '' : 's'}`}
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
              {traits.map((t) => (
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
function CompactItem({ item }: { item: TradeCardProps['trade']['items'][0] }) {
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

  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div
        ref={itemRef}
        className="relative cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-darkbg-700 overflow-hidden flex items-center justify-center">
          {item.brainrot.localImage ? (
            <Image
              src={item.brainrot.localImage}
              alt={item.brainrot.name}
              width={56}
              height={56}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-xs text-gray-500">?</span>
          )}
        </div>
        {/* Mutation badge - top right */}
        {item.mutation && (
          <div className={`animation-always-running absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-darkbg-800 shadow-md ${getMutationClass(item.mutation.name)}`}>
            {item.mutation.name.charAt(0)}
          </div>
        )}
      </div>
      {/* Traits below the image - always reserve space for consistent height */}
      <div className="h-4 flex items-center">
        {traits.length > 0 ? (
          <TraitIcons traits={traits} maxShow={3} />
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
              {formattedIncome && (
                <p className="text-[10px] text-green-400 mt-0.5 text-center">{formattedIncome}</p>
              )}
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
function IPadEnhancedItem({ item }: { item: TradeCardProps['trade']['items'][0] }) {
  const traits = item.traits || []

  const formattedIncome = item.calculatedIncome
    ? formatCompactIncome(item.calculatedIncome) + '/s'
    : null

  // Truncate long names for display
  const displayName = item.brainrot.name.length > 12
    ? item.brainrot.name.slice(0, 11) + '...'
    : item.brainrot.name

  return (
    <div className="flex flex-col items-center gap-1.5 flex-shrink-0 min-w-[72px]">
      {/* Image container - 72x72px for iPad */}
      <div className="relative">
        <div className="w-[72px] h-[72px] rounded-xl bg-darkbg-700 overflow-hidden flex items-center justify-center shadow-lg shadow-black/10">
          {item.brainrot.localImage ? (
            <Image
              src={item.brainrot.localImage}
              alt={item.brainrot.name}
              width={72}
              height={72}
              className="object-contain w-full h-full"
            />
          ) : (
            <span className="text-sm text-gray-500">?</span>
          )}
        </div>
        {/* Mutation badge - larger for iPad */}
        {item.mutation && (
          <div className={`animation-always-running absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-darkbg-800 shadow-lg border border-darkbg-600 ${getMutationClass(item.mutation.name)}`}>
            {item.mutation.name.charAt(0)}
          </div>
        )}
      </div>

      {/* Brainrot name - Comic Sans style for kids */}
      <p
        className="text-[11px] font-semibold text-white text-center leading-tight max-w-[72px] truncate"
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', 'Chalkboard SE', 'Comic Neue', cursive" }}
        title={item.brainrot.name}
      >
        {displayName}
      </p>

      {/* Mutation name if present */}
      {item.mutation && (
        <p className={`animation-always-running text-[9px] font-bold -mt-1 ${getMutationClass(item.mutation.name)}`}>
          {item.mutation.name}
        </p>
      )}

      {/* Individual income display */}
      {formattedIncome && (
        <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full -mt-0.5">
          {formattedIncome}
        </span>
      )}

      {/* Traits row - slightly larger for iPad */}
      <div className="h-5 flex items-center -mt-0.5">
        {traits.length > 0 ? (
          <TraitIcons traits={traits} maxShow={4} size="md" />
        ) : null}
      </div>
    </div>
  )
}

// Income display with tooltip
function IncomeDisplay({ income, align = 'left' }: { income: string; align?: 'left' | 'center' | 'right' }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const incomeRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (showTooltip && incomeRef.current) {
      const rect = incomeRef.current.getBoundingClientRect()
      setTooltipPos({
        top: rect.bottom + 6,
        left: rect.left + rect.width / 2,
      })
    }
  }, [showTooltip])

  const justifyClass = align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'

  return (
    <div className={`mt-1.5 flex ${justifyClass}`}>
      <span
        ref={incomeRef}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="text-xs text-green-500 font-semibold cursor-default"
      >
        Σ {formatCompactIncome(income)}/s
      </span>
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
              <p className="text-[10px] text-gray-300 whitespace-nowrap text-center">Total Income</p>
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

// Format income for display
function formatCompactIncome(income: string): string {
  const num = parseFloat(income)
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toFixed(0)
}

export function TradeCard({ trade, index = 0 }: TradeCardProps) {
  const offerItems = trade.items.filter((i) => i.side === 'OFFER')
  const requestItems = trade.items.filter((i) => i.side === 'REQUEST')

  // Different max visible items for different screen sizes
  // Mobile/Desktop compact: 4 items
  // iPad enhanced: 6 items (more horizontal space with single column)
  const maxVisibleCompact = 4
  const maxVisibleIPad = 6

  const visibleOffersCompact = offerItems.slice(0, maxVisibleCompact)
  const visibleRequestsCompact = requestItems.slice(0, maxVisibleCompact)
  const hiddenOffersCompact = Math.max(0, offerItems.length - maxVisibleCompact)
  const hiddenRequestsCompact = Math.max(0, requestItems.length - maxVisibleCompact)

  const visibleOffersIPad = offerItems.slice(0, maxVisibleIPad)
  const visibleRequestsIPad = requestItems.slice(0, maxVisibleIPad)
  const hiddenOffersIPad = Math.max(0, offerItems.length - maxVisibleIPad)
  const hiddenRequestsIPad = Math.max(0, requestItems.length - maxVisibleIPad)

  // Calculate total income for each side
  const offerIncome = calculateTotalIncome(offerItems)
  const requestIncome = calculateTotalIncome(requestItems)

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
          bg-darkbg-900 rounded-xl
          p-3 md:p-5 lg:p-3
          border border-darkbg-700
          hover:border-green-500/50
          hover:shadow-[0_4px_20px_rgba(34,197,94,0.12)]
          transition-all duration-200 cursor-pointer
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-darkbg-950
        "
      >
        {/* ============================================ */}
        {/* MOBILE & DESKTOP VIEW (default + lg:) */}
        {/* Compact layout with 4 items per side */}
        {/* ============================================ */}
        <div className="md:hidden lg:block pb-2">
          {/* Labels row */}
          <div className="flex justify-between mb-1.5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Offering</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Wants</p>
          </div>

          {/* Items row with arrow */}
          <div className="flex items-start gap-3">
            {/* Offer Side */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-center gap-2">
                {visibleOffersCompact.map((item) => (
                  <CompactItem key={item.id} item={item} />
                ))}
                {hiddenOffersCompact > 0 && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-darkbg-800 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-400">+{hiddenOffersCompact}</span>
                    </div>
                    <div className="h-4" />
                  </div>
                )}
              </div>
              {offerIncome && <IncomeDisplay income={offerIncome} align="center" />}
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0 h-12 sm:h-14 flex items-center">
              <MoveRight className="w-6 h-6 text-green-500/70" />
            </div>

            {/* Request Side */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-center gap-2">
                {visibleRequestsCompact.map((item) => (
                  <CompactItem key={item.id} item={item} />
                ))}
                {hiddenRequestsCompact > 0 && (
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-darkbg-800 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-400">+{hiddenRequestsCompact}</span>
                    </div>
                    <div className="h-4" />
                  </div>
                )}
              </div>
              {requestIncome && <IncomeDisplay income={requestIncome} align="center" />}
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* iPAD ENHANCED VIEW (md: only, 768-1024px) */}
        {/* Single column, larger items, more details */}
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
                {offerIncome && (
                  <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                    Total: {formatCompactIncome(offerIncome)}/s
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-3 justify-center">
                {visibleOffersIPad.map((item) => (
                  <IPadEnhancedItem key={item.id} item={item} />
                ))}
                {hiddenOffersIPad > 0 && (
                  <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                    <div className="w-[72px] h-[72px] rounded-xl bg-darkbg-700 flex items-center justify-center shadow-lg">
                      <span className="text-base font-bold text-gray-400">+{hiddenOffersIPad}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">more</p>
                  </div>
                )}
              </div>
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
                {requestIncome && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    Total: {formatCompactIncome(requestIncome)}/s
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-3 justify-center">
                {visibleRequestsIPad.map((item) => (
                  <IPadEnhancedItem key={item.id} item={item} />
                ))}
                {hiddenRequestsIPad > 0 && (
                  <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                    <div className="w-[72px] h-[72px] rounded-xl bg-darkbg-700 flex items-center justify-center shadow-lg">
                      <span className="text-base font-bold text-gray-400">+{hiddenRequestsIPad}</span>
                    </div>
                    <p className="text-[11px] text-gray-500">more</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ============================================ */}
        {/* FOOTER - Responsive for all sizes */}
        {/* ============================================ */}
        {/* Mobile/Desktop Footer */}
        <div className="md:hidden lg:flex flex items-center justify-between mt-2 pt-2 border-t border-darkbg-800">
          <div className="flex items-center gap-1.5 min-w-0">
            <RobloxAvatar
              avatarUrl={trade.user.robloxAvatarUrl}
              username={trade.user.robloxUsername}
              size="xs"
            />
            <span className="text-xs text-gray-400 truncate max-w-[80px] sm:max-w-[100px]">
              {trade.user.robloxUsername}
            </span>
            {trade.isVerified && (
              <BadgeCheck className="w-3 h-3 text-green-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 flex-shrink-0">
            {trade.status !== 'OPEN' && (
              <span
                className={`font-medium px-1.5 py-0.5 rounded ${
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
            <span>{formatDistanceToNow(new Date(trade.createdAt), { addSuffix: false })}</span>
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
                Posted {formatDistanceToNow(new Date(trade.createdAt), { addSuffix: true })}
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
}

// Skeleton loader for TradeCard - responsive for mobile, iPad, and desktop
export function TradeCardSkeleton({ index = 0 }: { index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15, delay: index * 0.03 }}
      className="bg-darkbg-900 rounded-xl border border-darkbg-700 p-3 md:p-5 lg:p-3"
    >
      {/* Mobile/Desktop Skeleton */}
      <div className="md:hidden lg:block">
        {/* Items */}
        <div className="flex items-center gap-3 pb-2">
          <div className="flex-1 flex gap-2">
            <div className="w-12 h-12 sm:w-14 sm:h-14 skeleton rounded-lg" />
            <div className="w-12 h-12 sm:w-14 sm:h-14 skeleton rounded-lg" />
          </div>
          <div className="w-5 h-5 skeleton rounded" />
          <div className="flex-1 flex justify-end gap-2">
            <div className="w-12 h-12 sm:w-14 sm:h-14 skeleton rounded-lg" />
            <div className="w-12 h-12 sm:w-14 sm:h-14 skeleton rounded-lg" />
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-darkbg-800">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 skeleton rounded-full" />
            <div className="h-3 w-16 skeleton rounded" />
          </div>
          <div className="h-3 w-10 skeleton rounded" />
        </div>
      </div>

      {/* iPad Enhanced Skeleton */}
      <div className="hidden md:block lg:hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 skeleton rounded-lg" />
            <div className="h-4 w-24 skeleton rounded" />
          </div>
        </div>
        {/* Items area */}
        <div className="flex items-stretch gap-4">
          {/* Offer side */}
          <div className="flex-1 bg-darkbg-800/50 rounded-xl p-3">
            <div className="h-3 w-16 skeleton rounded mb-3" />
            <div className="flex flex-wrap gap-3 justify-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-[72px] h-[72px] skeleton rounded-xl" />
                  <div className="h-3 w-14 skeleton rounded" />
                  <div className="h-4 w-10 skeleton rounded-full" />
                </div>
              ))}
            </div>
          </div>
          {/* Arrow */}
          <div className="flex items-center">
            <div className="w-10 h-10 skeleton rounded-full" />
          </div>
          {/* Request side */}
          <div className="flex-1 bg-darkbg-800/50 rounded-xl p-3">
            <div className="h-3 w-16 skeleton rounded mb-3" />
            <div className="flex flex-wrap gap-3 justify-center">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div className="w-[72px] h-[72px] skeleton rounded-xl" />
                  <div className="h-3 w-14 skeleton rounded" />
                  <div className="h-4 w-10 skeleton rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-darkbg-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 skeleton rounded-full" />
            <div className="flex flex-col gap-1">
              <div className="h-4 w-28 skeleton rounded" />
              <div className="h-3 w-20 skeleton rounded" />
            </div>
          </div>
          <div className="h-8 w-20 skeleton rounded-lg" />
        </div>
      </div>
    </motion.div>
  )
}
