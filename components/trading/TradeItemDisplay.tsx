'use client'

import { useState, useRef, useEffect, memo, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Pencil, X } from 'lucide-react'
import { formatIncome, getMutationClass } from '@/lib/utils'
import { easeOut } from '@/lib/animations'

// Animation variants defined outside component to prevent recreation
const traitIconAnimation = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
} as const

const tooltipAnimation = {
  initial: { opacity: 0, y: 4, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 4, scale: 0.95 },
} as const

const compactItemAnimation = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
} as const

const horizontalItemAnimation = {
  initial: { opacity: 0, x: -8 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 8 },
} as const

const verticalItemAnimation = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
} as const

const mutationBadgeAnimation = {
  initial: { scale: 0 },
  animate: { scale: 1 },
} as const

const mutationBadgeTransition = { type: 'spring', stiffness: 500, damping: 25, delay: 0.1 } as const

interface TradeItemDisplayProps {
  item: {
    id: string
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
    hasTraits?: boolean
    valueFallback?: boolean
    valueFallbackSource?: string | null
  }
  size?: 'sm' | 'md'
  layout?: 'horizontal' | 'compact' // compact is vertical card for grids
  index?: number
  interactive?: boolean
  onEdit?: () => void
  onRemove?: () => void
}

const TraitIcons = memo(function TraitIcons({ traits, maxShow = 3 }: { traits: Array<{ trait: { id: string; name: string; localImage: string | null; multiplier: number } }>; maxShow?: number }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const iconsRef = useRef<HTMLDivElement>(null)

  // Memoize computed values
  const visible = useMemo(() => traits.slice(0, maxShow), [traits, maxShow])
  const overflow = traits.length - maxShow

  // Memoized handlers
  const handleMouseEnter = useCallback(() => setShowTooltip(true), [])
  const handleMouseLeave = useCallback(() => setShowTooltip(false), [])
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowTooltip(prev => !prev)
  }, [])
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      setShowTooltip(prev => !prev)
    }
  }, [])
  const handleFocus = useCallback(() => setShowTooltip(true), [])
  const handleBlur = useCallback(() => setShowTooltip(false), [])

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
    <div className="flex gap-0.5 mt-1">
      {/* Icons wrapper - hover/click only on this */}
      <div
        ref={iconsRef}
        role="button"
        tabIndex={0}
        aria-label={`View ${traits.length} trait${traits.length === 1 ? '' : 's'}`}
        className="flex gap-0.5 cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        {visible.map((t, i) => (
          <motion.div
            key={t.trait.id}
            {...traitIconAnimation}
            transition={{ delay: i * 0.05 }}
            className="w-5 h-5 rounded-full bg-darkbg-700 overflow-hidden flex-shrink-0"
          >
            {t.trait.localImage ? (
              <Image src={t.trait.localImage} alt={t.trait.name} width={20} height={20} className="object-cover" sizes="20px" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">{t.trait.name.charAt(0)}</span>
            )}
          </motion.div>
        ))}
        {overflow > 0 && (
          <div className="w-5 h-5 rounded-full bg-darkbg-600 flex items-center justify-center text-[9px] text-gray-300 font-medium flex-shrink-0">
            +{overflow}
          </div>
        )}
      </div>
      {/* Tooltip rendered via portal */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              {...tooltipAnimation}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
              className="fixed z-50 bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-2 shadow-lg shadow-black/20 min-w-[120px]"
            >
              {traits.map((t) => (
                <div key={t.trait.id} className="flex items-center gap-2 py-1">
                  <div className="w-5 h-5 rounded-full bg-darkbg-700 overflow-hidden flex-shrink-0">
                    {t.trait.localImage ? (
                      <Image src={t.trait.localImage} alt={t.trait.name} width={20} height={20} className="object-cover" sizes="20px" />
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
})


export const TradeItemDisplay = memo(function TradeItemDisplay({
  item,
  size = 'md',
  layout = 'horizontal',
  index = 0,
  interactive = false,
  onEdit,
  onRemove,
}: TradeItemDisplayProps) {
  // Memoize computed values
  const imageSize = useMemo(
    () => layout === 'compact' ? 56 : (size === 'sm' ? 48 : 64),
    [layout, size]
  )

  // Memoize mutation class to prevent recalculation
  const mutationClass = useMemo(
    () => item.mutation ? getMutationClass(item.mutation.name) : '',
    [item.mutation]
  )

  // Memoize formatted income
  const formattedIncome = useMemo(
    () => item.calculatedIncome ? formatIncome(item.calculatedIncome) : null,
    [item.calculatedIncome]
  )

  // Memoize formatted robux value with + for fallback
  const formattedRobuxValue = useMemo(
    () => item.robuxValue ? `R$${item.robuxValue.toLocaleString()}${item.valueFallback ? '+' : ''}` : null,
    [item.robuxValue, item.valueFallback]
  )

  // Tooltip for fallback value
  const robuxValueTitle = useMemo(
    () => item.valueFallback && item.valueFallbackSource ? `Using ${item.valueFallbackSource} value` : undefined,
    [item.valueFallback, item.valueFallbackSource]
  )

  // Compact vertical card layout for grids
  if (layout === 'compact') {
    return (
      <motion.div
        {...compactItemAnimation}
        transition={{ duration: 0.2, delay: index * 0.03, ease: easeOut }}
        className="relative group bg-darkbg-800 rounded-xl p-2 border border-transparent hover:border-green-500/30 transition-colors"
      >
        {/* Action buttons - top right */}
        {interactive && (onEdit || onRemove) && (
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
            {onEdit && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                aria-label="Edit item"
                className="p-1 bg-darkbg-600 hover:bg-darkbg-500 text-gray-300 rounded-md shadow-lg transition-colors"
              >
                <Pencil className="w-3 h-3" />
              </motion.button>
            )}
            {onRemove && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onRemove() }}
                aria-label="Remove item"
                className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-md shadow-lg transition-colors"
              >
                <X className="w-3 h-3" />
              </motion.button>
            )}
          </div>
        )}

        {/* Image with mutation badge */}
        <div className="relative mx-auto w-fit mb-2">
          <div className="w-14 h-14 rounded-lg bg-darkbg-700 flex items-center justify-center overflow-hidden">
            {item.brainrot.localImage ? (
              <Image
                src={item.brainrot.localImage}
                alt={item.brainrot.name}
                width={imageSize}
                height={imageSize}
                className="object-contain w-full h-full"
                sizes="56px"
              />
            ) : (
              <span className="text-xs text-gray-400">?</span>
            )}
          </div>
          {item.mutation && (
            <div className="animation-always-running absolute -top-1 -right-1 px-1 py-0.5 rounded text-[9px] font-bold bg-darkbg-900 shadow-lg">
              <span className={mutationClass}>
                {item.mutation.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Name - centered, truncated */}
        <p className="text-xs font-semibold text-white text-center truncate px-1" title={item.brainrot.name}>
          {item.brainrot.name}
        </p>

        {/* Mutation name */}
        {item.mutation && (
          <p className={`animation-always-running text-[10px] font-bold text-center ${mutationClass}`}>
            {item.mutation.name}
          </p>
        )}

        {/* Income */}
        {formattedIncome && (
          <p className="text-[10px] font-semibold text-green-400 text-center mt-0.5">
            {formattedIncome}
          </p>
        )}

        {/* Value */}
        {formattedRobuxValue && (
          <p className="text-[10px] font-medium text-yellow-400 text-center" title={robuxValueTitle}>
            {formattedRobuxValue}
          </p>
        )}

        {/* Traits - centered */}
        {item.traits && item.traits.length > 0 && (
          <div className="flex justify-center mt-1">
            <TraitIcons traits={item.traits} maxShow={2} />
          </div>
        )}
      </motion.div>
    )
  }

  const content = (
    <>
      {/* Brainrot Image */}
      <div
        className="relative flex-shrink-0 flex items-center justify-center"
        style={{ width: imageSize, height: imageSize }}
      >
        {item.brainrot.localImage ? (
          <Image
            src={item.brainrot.localImage}
            alt={item.brainrot.name}
            width={imageSize}
            height={imageSize}
            className="rounded-lg object-contain max-w-full max-h-full"
            sizes="(max-width: 640px) 48px, 64px"
          />
        ) : (
          <div
            className="rounded-lg bg-darkbg-700 flex items-center justify-center w-full h-full"
          >
            <span className="text-xs text-gray-400">?</span>
          </div>
        )}
        {/* Mutation badge */}
        {item.mutation && (
          <motion.div
            {...mutationBadgeAnimation}
            transition={mutationBadgeTransition}
            className="animation-always-running absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-darkbg-900 shadow-lg"
          >
            <span className={mutationClass}>
              {item.mutation.name.charAt(0)}
            </span>
          </motion.div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 overflow-hidden">
        {/* Name row - stacks on very small screens */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <p className={`font-semibold text-white truncate ${size === 'sm' ? 'text-sm' : ''}`}>
            {item.brainrot.name}
          </p>
          {/* Income & Value - below name on mobile, inline on sm+ */}
          <div className="xl:hidden flex items-center gap-2">
            {formattedIncome && (
              <span className={`font-bold text-green-500 whitespace-nowrap ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                {formattedIncome}
              </span>
            )}
            {formattedRobuxValue && (
              <span className={`font-medium text-yellow-400 whitespace-nowrap ${size === 'sm' ? 'text-xs' : 'text-sm'}`} title={robuxValueTitle}>
                {formattedRobuxValue}
              </span>
            )}
          </div>
        </div>
        {item.mutation && (
          <p className={`animation-always-running text-xs font-bold truncate ${mutationClass}`}>
            {item.mutation.name}
          </p>
        )}
        {item.event && (
          <p className="text-xs text-green-500 truncate">
            {item.event.name}
          </p>
        )}
        {/* Traits */}
        {item.traits && item.traits.length > 0 && (
          <TraitIcons traits={item.traits} maxShow={3} />
        )}
      </div>

      {/* Income & Value - separate column on xl+ */}
      {(formattedIncome || formattedRobuxValue) && (
        <div className="hidden xl:block text-right flex-shrink-0">
          {formattedIncome && (
            <>
              <p className={`font-bold text-green-500 ${size === 'sm' ? 'text-sm' : ''}`}>
                {formattedIncome}
              </p>
              <p className="text-[10px] text-gray-500">income</p>
            </>
          )}
          {formattedRobuxValue && (
            <>
              <p className={`font-medium text-yellow-400 ${size === 'sm' ? 'text-sm' : ''} ${formattedIncome ? 'mt-1' : ''}`} title={robuxValueTitle}>
                {formattedRobuxValue}
              </p>
              <p className="text-[10px] text-gray-500">value</p>
            </>
          )}
        </div>
      )}
    </>
  )

  if (interactive) {
    return (
      <motion.div
        {...horizontalItemAnimation}
        transition={{ duration: 0.2, delay: index * 0.03, ease: easeOut }}
        whileHover={{ scale: 1.01, backgroundColor: 'rgba(34, 197, 94, 0.05)' }}
        className={`
          relative group flex items-center gap-2 md:gap-3 ${size === 'sm' ? 'p-2' : 'p-3'}
          bg-darkbg-800 rounded-xl
          border border-transparent hover:border-green-500/30
          transition-colors duration-200
        `}
      >
        {content}
        {/* Mobile: inline buttons at end of row */}
        <div className="flex gap-1.5 flex-shrink-0 md:hidden">
          {onEdit && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              aria-label="Edit item"
              className="p-2 bg-darkbg-600 active:bg-darkbg-500 text-gray-300 rounded-lg transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </motion.button>
          )}
          {onRemove && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              aria-label="Remove item"
              className="p-2 bg-red-500 active:bg-red-600 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>
        {/* Desktop: absolute positioned on hover */}
        <div className="hidden md:flex absolute top-2 right-2 gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {onEdit && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              aria-label="Edit item"
              className="p-1.5 bg-darkbg-600 hover:bg-darkbg-500 text-gray-300 rounded-lg shadow-lg transition-colors"
            >
              <Pencil className="w-3 h-3" />
            </motion.button>
          )}
          {onRemove && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              aria-label="Remove item"
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-lg transition-colors"
            >
              <X className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      {...verticalItemAnimation}
      transition={{ duration: 0.2, delay: index * 0.03, ease: easeOut }}
      className={`flex items-center gap-3 ${size === 'sm' ? 'p-2' : 'p-3'} bg-darkbg-800 rounded-xl overflow-hidden`}
    >
      {content}
    </motion.div>
  )
})
