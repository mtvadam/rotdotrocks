'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Pencil, X } from 'lucide-react'
import { formatIncome } from '@/lib/utils'
import { easeOut } from '@/lib/animations'

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
  }
  size?: 'sm' | 'md'
  index?: number
  interactive?: boolean
  onEdit?: () => void
  onRemove?: () => void
}

function TraitIcons({ traits, maxShow = 3 }: { traits: Array<{ trait: { id: string; name: string; localImage: string | null; multiplier: number } }>; maxShow?: number }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const iconsRef = useRef<HTMLDivElement>(null)
  const visible = traits.slice(0, maxShow)
  const overflow = traits.length - maxShow

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
        className="flex gap-0.5 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={(e) => {
          e.stopPropagation()
          setShowTooltip(!showTooltip)
        }}
      >
        {visible.map((t, i) => (
          <motion.div
            key={t.trait.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="w-5 h-5 rounded-full bg-darkbg-700 overflow-hidden flex-shrink-0"
          >
            {t.trait.localImage ? (
              <Image src={t.trait.localImage} alt={t.trait.name} width={20} height={20} className="object-cover" />
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
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              style={{ top: tooltipPos.top, left: tooltipPos.left }}
              className="fixed z-[100] bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-2 shadow-lg shadow-black/20 min-w-[120px]"
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

function getMutationClass(name: string): string {
  const lowerName = name.toLowerCase()
  switch (lowerName) {
    case 'gold': return 'mutation-gold'
    case 'diamond': return 'mutation-diamond'
    case 'rainbow': return 'mutation-rainbow'
    case 'bloodrot':
    case 'bloodroot': return 'mutation-bloodrot'
    case 'candy': return 'mutation-candy'
    case 'lava': return 'mutation-lava'
    case 'galaxy': return 'mutation-galaxy'
    case 'yin yang':
    case 'yinyang': return 'mutation-yinyang'
    case 'radioactive': return 'mutation-radioactive'
    default: return 'text-gray-400'
  }
}

export function TradeItemDisplay({
  item,
  size = 'md',
  index = 0,
  interactive = false,
  onEdit,
  onRemove,
}: TradeItemDisplayProps) {
  const imageSize = size === 'sm' ? 48 : 64

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
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
            className="animation-always-running absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-darkbg-900 shadow-lg"
          >
            <span className={getMutationClass(item.mutation.name)}>
              {item.mutation.name.charAt(0)}
            </span>
          </motion.div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-white truncate ${size === 'sm' ? 'text-sm' : ''}`}>
          {item.brainrot.name}
        </p>
        {item.mutation && (
          <p className={`animation-always-running text-xs font-bold ${getMutationClass(item.mutation.name)}`}>
            {item.mutation.name}
          </p>
        )}
        {item.event && (
          <p className="text-xs text-green-500">
            {item.event.name}
          </p>
        )}
        {/* Traits */}
        {item.traits && item.traits.length > 0 && (
          <TraitIcons traits={item.traits} maxShow={3} />
        )}
      </div>

      {/* Income */}
      {item.calculatedIncome && (
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-green-500 ${size === 'sm' ? 'text-sm' : ''}`}>
            {formatIncome(item.calculatedIncome)}
          </p>
          <p className="text-[10px] text-gray-500">income</p>
        </div>
      )}
    </>
  )

  if (interactive) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
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
              className="p-2 bg-red-500 active:bg-red-600 text-white rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </motion.button>
          )}
        </div>
        {/* Desktop: absolute positioned on hover */}
        <div className="hidden md:flex absolute top-2 right-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onEdit && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: easeOut }}
      className={`flex items-center gap-3 ${size === 'sm' ? 'p-2' : 'p-3'} bg-darkbg-800 rounded-xl`}
    >
      {content}
    </motion.div>
  )
}
