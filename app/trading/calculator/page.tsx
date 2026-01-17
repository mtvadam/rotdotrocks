'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Calculator, Plus, Trash2, Scale, RotateCcw, Pencil, HelpCircle, ChevronDown, Minus, X, Info } from 'lucide-react'
import { BrainrotPicker, prefetchPickerData, DemandTrendBadge, type DemandLevel, type TrendDirection } from '@/components/trading'
import { PageTransition } from '@/components/ui'
import { formatIncome, getMutationClass } from '@/lib/utils'
import { easeOut } from '@/lib/animations'
import { calculateTraitValueMultiplier, getTraitValueMultiplier } from '@/lib/trait-value'

interface TradeItem {
  brainrotId: string
  brainrot: {
    id: string
    name: string
    localImage: string | null
    baseIncome: string
    robuxValue?: number | null
    demand?: DemandLevel
    trend?: TrendDirection
  }
  mutationId?: string
  mutation?: {
    id: string
    name: string
    multiplier: number
  }
  traitIds?: string[]
  traits?: Array<{
    id: string
    name: string
    localImage: string | null
    multiplier: number
  }>
  calculatedIncome?: string
  robuxValue?: number | null
  valueFallback?: boolean
  valueFallbackSource?: string | null
  quantity: number
}

function formatValue(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return value.toLocaleString()
}

// Calculate with quantity support
function calculateTotals(items: TradeItem[]) {
  let totalIncome = BigInt(0)
  let totalValue = 0
  let hasEstimated = false
  const breakdown: Array<{ name: string; income: bigint; value: number; qty: number; source?: string }> = []

  for (const item of items) {
    const income = BigInt(item.calculatedIncome || item.brainrot.baseIncome) * BigInt(item.quantity)
    const value = (item.robuxValue ?? item.brainrot.robuxValue ?? 0) * item.quantity

    totalIncome += income
    totalValue += value

    if (item.valueFallback) hasEstimated = true

    breakdown.push({
      name: item.brainrot.name,
      income,
      value,
      qty: item.quantity,
      source: item.valueFallback ? item.valueFallbackSource || undefined : undefined
    })
  }

  return { totalIncome, totalValue, hasEstimated, breakdown }
}

// Value breakdown tooltip
function ValueBreakdown({ item }: { item: TradeItem }) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false })
  const ref = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  const traitNames = item.traits?.map(t => t.name) || []
  const traitMult = calculateTraitValueMultiplier(traitNames)
  const finalValue = item.robuxValue ?? 0

  // Back-calculate the mutation base value (finalValue = mutationBase * traitMult)
  const mutationBaseValue = traitMult !== 0 ? Math.round(finalValue / traitMult) : finalValue

  useEffect(() => {
    if (!show) {
      setPos(p => ({ ...p, ready: false }))
      return
    }
    if (show && ref.current) {
      const measureAndPosition = () => {
        if (ref.current && tooltipRef.current) {
          const rect = ref.current.getBoundingClientRect()
          const tooltipRect = tooltipRef.current.getBoundingClientRect()
          const padding = 12
          const maxLeft = window.innerWidth - tooltipRect.width - padding
          const left = Math.max(padding, Math.min(rect.left, maxLeft))
          setPos({ top: rect.bottom + 8, left, ready: true })
        } else {
          requestAnimationFrame(measureAndPosition)
        }
      }
      requestAnimationFrame(measureAndPosition)
    }
  }, [show])

  if (finalValue === 0) return <span className="text-gray-500 text-xs">N/A</span>

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-orange-400 font-medium text-sm hover:text-orange-300 transition-colors flex items-center gap-1"
      >
        R${formatValue(finalValue * item.quantity)}
        {(item.valueFallback || traitMult !== 1) && <Info className="w-3 h-3 opacity-60" />}
      </button>
      {typeof window !== 'undefined' && show && createPortal(
        <div
          ref={tooltipRef}
          style={{ top: pos.top, left: pos.left, visibility: pos.ready ? 'visible' : 'hidden' }}
          className="fixed z-[100] bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-3 shadow-xl shadow-black/30 min-w-[200px] max-w-[calc(100vw-24px)]"
        >
          <p className="text-xs font-medium text-gray-300 mb-2">Value Breakdown</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Base ({item.mutation?.name || 'Default'})</span>
              <span>R${mutationBaseValue.toLocaleString()}</span>
            </div>
            {traitNames.length > 0 && (
              <>
                {traitNames.map((name, i) => {
                  const mult = getTraitValueMultiplier(name)
                  const bonus = mult - 1
                  if (bonus === 0) return null
                  return (
                    <div key={i} className="flex justify-between text-gray-400">
                      <span className="truncate mr-2">{name}</span>
                      <span className={bonus > 0 ? 'text-green-400' : 'text-red-400'}>
                        {bonus > 0 ? '+' : ''}{(bonus * 100).toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
                <div className="flex justify-between text-gray-300 pt-1 border-t border-darkbg-600">
                  <span>Trait multiplier</span>
                  <span className={traitMult > 1 ? 'text-green-400' : traitMult < 1 ? 'text-red-400' : ''}>
                    {traitMult.toFixed(2)}x
                  </span>
                </div>
              </>
            )}
            {item.quantity > 1 && (
              <div className="flex justify-between text-gray-400">
                <span>Quantity</span>
                <span>x{item.quantity}</span>
              </div>
            )}
            <div className="flex justify-between text-orange-400 font-medium pt-1 border-t border-darkbg-600">
              <span>Total</span>
              <span>R${(finalValue * item.quantity).toLocaleString()}</span>
            </div>
          </div>
          {item.valueFallback && (
            <p className="text-[10px] text-amber-400/80 mt-2">
              Using {item.valueFallbackSource} value (estimated)
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// Trait icons with hover tooltip (similar to TradeCard)
function TraitIcons({ traits, maxShow = 4 }: { traits: Array<{ id: string; name: string; localImage: string | null; multiplier: number }>; maxShow?: number }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0, ready: false })
  const iconsRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Sort by highest multiplier first
  const sortedTraits = [...traits].sort((a, b) => b.multiplier - a.multiplier)

  const hasOverflow = sortedTraits.length > maxShow
  const visibleCount = hasOverflow ? maxShow - 1 : sortedTraits.length
  const visible = sortedTraits.slice(0, visibleCount)
  const overflow = sortedTraits.length - visibleCount

  useEffect(() => {
    if (!showTooltip) {
      setTooltipPos(p => ({ ...p, ready: false }))
      return
    }
    if (showTooltip && iconsRef.current) {
      const measureAndPosition = () => {
        if (iconsRef.current && tooltipRef.current) {
          const rect = iconsRef.current.getBoundingClientRect()
          const tooltipRect = tooltipRef.current.getBoundingClientRect()
          const padding = 12
          const maxLeft = window.innerWidth - tooltipRect.width - padding
          const left = Math.max(padding, Math.min(rect.left, maxLeft))
          setTooltipPos({ top: rect.bottom + 8, left, ready: true })
        } else {
          requestAnimationFrame(measureAndPosition)
        }
      }
      requestAnimationFrame(measureAndPosition)
    }
  }, [showTooltip])

  if (traits.length === 0) return null

  return (
    <>
      <div
        ref={iconsRef}
        className="flex gap-0.5 cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {visible.map((t) => (
          <div key={t.id} className="w-4 h-4 rounded-full bg-darkbg-700 overflow-hidden flex-shrink-0">
            {t.localImage ? (
              <Image src={t.localImage} alt={t.name} width={16} height={16} className="object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-[7px] text-gray-400">{t.name.charAt(0)}</span>
            )}
          </div>
        ))}
        {overflow > 0 && (
          <div className="w-4 h-4 rounded-full bg-darkbg-600 flex items-center justify-center text-[8px] text-gray-300 font-medium flex-shrink-0">
            +{overflow}
          </div>
        )}
      </div>
      {typeof window !== 'undefined' && showTooltip && createPortal(
        <div
          ref={tooltipRef}
          style={{ top: tooltipPos.top, left: tooltipPos.left, visibility: tooltipPos.ready ? 'visible' : 'hidden' }}
          className="fixed z-[100] bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-2 shadow-xl shadow-black/30 min-w-[140px] max-w-[calc(100vw-24px)]"
        >
          {sortedTraits.map((t) => {
            const valueBonus = getTraitValueMultiplier(t.name) - 1
            return (
              <div key={t.id} className="flex items-center gap-2 py-0.5">
                <div className="w-5 h-5 rounded-full bg-darkbg-700 overflow-hidden flex-shrink-0">
                  {t.localImage ? (
                    <Image src={t.localImage} alt={t.name} width={20} height={20} className="object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">{t.name.charAt(0)}</span>
                  )}
                </div>
                <span className="text-xs text-gray-300 flex-1">{t.name}</span>
                <span className="text-[10px] text-gray-500">{t.multiplier}x</span>
                {valueBonus !== 0 && (
                  <span className={`text-[10px] ${valueBonus > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {valueBonus > 0 ? '+' : ''}{(valueBonus * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}

type Side = 'left' | 'right'

function CalculatorItem({
  item,
  onEdit,
  onRemove,
  onQuantityChange,
}: {
  item: TradeItem
  onEdit: () => void
  onRemove: () => void
  onQuantityChange: (qty: number) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-3 p-3 bg-darkbg-800/80 rounded-xl group hover:bg-darkbg-800 transition-colors"
    >
      {/* Image */}
      <div className="flex-shrink-0">
        {item.brainrot.localImage ? (
          <Image
            src={item.brainrot.localImage}
            alt={item.brainrot.name}
            width={44}
            height={44}
            className="rounded-lg"
          />
        ) : (
          <div className="w-11 h-11 rounded-lg bg-darkbg-700" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm truncate">{item.brainrot.name}</p>
        {item.mutation && item.mutation.name !== 'Default' && (
          <p className={`animation-always-running font-medium text-xs ${getMutationClass(item.mutation.name)}`}>
            {item.mutation.name}
          </p>
        )}
        {item.traits && item.traits.length > 0 && (
          <div className="mt-1">
            <TraitIcons traits={item.traits} maxShow={5} />
          </div>
        )}
        {item.brainrot.demand && item.brainrot.trend && (
          <DemandTrendBadge demand={item.brainrot.demand} trend={item.brainrot.trend} size="xs" variant="badge" hideIfNormal />
        )}
      </div>

      {/* Values */}
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-green-400 text-sm">
          {formatIncome((BigInt(item.calculatedIncome || item.brainrot.baseIncome) * BigInt(item.quantity)).toString())}
        </p>
        <ValueBreakdown item={item} />
      </div>

      {/* Quantity */}
      <div className="flex flex-col items-center bg-darkbg-700 rounded-lg p-0.5">
        <button
          onClick={() => onQuantityChange(item.quantity + 1)}
          className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
        <span className="text-xs font-medium">{item.quantity}</span>
        <button
          onClick={() => onQuantityChange(Math.max(1, item.quantity - 1))}
          className="w-6 h-5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-0.5">
        <button onClick={onEdit} className="p-1.5 text-gray-500 hover:text-green-400 transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRemove} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  )
}

// How it works section
function HowItWorks() {
  const [open, setOpen] = useState(false)

  const traitTiers = [
    {
      bonus: '+50%',
      badgeColor: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30',
      dotColor: 'bg-green-400',
      traits: ['Strawberry', 'Meowl', '10B', 'Skibidi', 'Lightning']
    },
    {
      bonus: '+20%',
      badgeColor: 'bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-400 border-emerald-500/25',
      dotColor: 'bg-emerald-400',
      traits: ['UFO', 'Brazil', 'Indonesian', '26', 'Glitched', 'Zombie', 'Extinct', 'Jack O\'Lantern', 'Fireworks', 'Santa Hat', 'Reindeer Pet', 'Sleepy', 'Snowy', 'Wet', 'Tie', 'Witching Hour', 'Bubblegum']
    },
    {
      bonus: '+10%',
      badgeColor: 'bg-gradient-to-r from-cyan-500/15 to-blue-500/15 text-cyan-400 border-cyan-500/25',
      dotColor: 'bg-cyan-400',
      traits: ['Shark Fin', 'Spider', 'Paint', 'Fire', 'Galactic', 'Comet-struck', 'Disco', 'Matteo Hat', 'RIP Tombstone', 'Nyan', 'Explosive']
    },
    {
      bonus: '0%',
      badgeColor: 'bg-darkbg-800/50 text-gray-500 border-darkbg-700',
      dotColor: 'bg-gray-600',
      traits: ['Crab Claw']
    },
    {
      bonus: '-10%',
      badgeColor: 'bg-gradient-to-r from-red-500/15 to-rose-500/15 text-red-400 border-red-500/25',
      dotColor: 'bg-red-400',
      traits: ['Sombrero', 'Taco']
    },
  ]

  return (
    <div className="bg-darkbg-900/60 backdrop-blur-sm rounded-2xl border border-darkbg-700/80 overflow-hidden shadow-lg shadow-black/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-darkbg-800/30 transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/15 transition-colors">
            <HelpCircle className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <span className="font-medium text-white text-sm">How values are calculated</span>
            <p className="text-xs text-gray-500 mt-0.5">Formulas and trait bonuses</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="w-6 h-6 rounded-full bg-darkbg-800 flex items-center justify-center"
        >
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-darkbg-700 to-transparent" />

              {/* Formulas Section */}
              <div className="grid gap-3 sm:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="relative bg-gradient-to-br from-darkbg-800/80 to-darkbg-850/60 rounded-xl p-4 border border-darkbg-700/60 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      <p className="font-semibold text-green-400 text-sm">Income Formula</p>
                    </div>
                    <p className="text-xs text-gray-300 font-mono bg-darkbg-900/50 rounded-lg px-3 py-2">
                      Base <span className="text-gray-500">x</span> Mutation <span className="text-gray-500">x</span> Traits
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      Sleepy trait halves income
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative bg-gradient-to-br from-darkbg-800/80 to-darkbg-850/60 rounded-xl p-4 border border-darkbg-700/60 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      <p className="font-semibold text-orange-400 text-sm">Value Formula (R$)</p>
                    </div>
                    <p className="text-xs text-gray-300 font-mono bg-darkbg-900/50 rounded-lg px-3 py-2">
                      Base Value <span className="text-gray-500">x</span> Trait Bonus
                    </p>
                    <p className="text-[11px] text-gray-500 mt-2 flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      Hover values to see breakdown
                    </p>
                  </div>
                </motion.div>
              </div>

              {/* Trait Tiers Section */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-gradient-to-br from-darkbg-800/60 to-darkbg-900/40 rounded-xl border border-darkbg-700/60 overflow-hidden"
              >
                <div className="px-4 py-3 border-b border-darkbg-700/60 bg-darkbg-800/30">
                  <p className="font-semibold text-white text-sm">Trait Value Bonuses</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Bonuses stack additively</p>
                </div>

                <div className="p-3 space-y-2">
                  {traitTiers.map((tier, index) => (
                    <motion.div
                      key={tier.bonus}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + index * 0.03 }}
                      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-darkbg-800/40 transition-colors group"
                    >
                      <div className={`flex-shrink-0 px-2.5 py-1 rounded-md text-xs font-semibold border ${tier.badgeColor}`}>
                        {tier.bonus}
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {tier.traits.map((trait) => (
                          <span
                            key={trait}
                            className="inline-flex items-center gap-1 text-[11px] text-gray-400 bg-darkbg-800/60 px-2 py-0.5 rounded-md border border-darkbg-700/50 hover:border-darkbg-600 hover:text-gray-300 transition-colors"
                          >
                            <span className={`w-1 h-1 rounded-full ${tier.dotColor} opacity-60`} />
                            {trait}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="px-4 py-2.5 border-t border-darkbg-700/60 bg-darkbg-900/30">
                  <p className="text-[11px] text-gray-500">
                    Example: +50% + +50% = 2x total multiplier
                  </p>
                </div>
              </motion.div>

              {/* Disclaimer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-[11px] text-gray-600 text-center"
              >
                Values marked with + are estimates. Actual market prices may vary.
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function CalculatorPage() {
  const [leftItems, setLeftItems] = useState<TradeItem[]>([])
  const [rightItems, setRightItems] = useState<TradeItem[]>([])
  const [pickerSide, setPickerSide] = useState<Side | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  useEffect(() => { prefetchPickerData() }, [])

  const leftTotals = calculateTotals(leftItems)
  const rightTotals = calculateTotals(rightItems)

  const incomeDiff = rightTotals.totalIncome - leftTotals.totalIncome
  const valueDiff = rightTotals.totalValue - leftTotals.totalValue
  const incomePercent = leftTotals.totalIncome > 0
    ? Number((incomeDiff * BigInt(10000)) / leftTotals.totalIncome) / 100
    : rightTotals.totalIncome > 0 ? 100 : 0
  const valuePercent = leftTotals.totalValue > 0
    ? (valueDiff / leftTotals.totalValue) * 100
    : rightTotals.totalValue > 0 ? 100 : 0

  const handleSelectItem = (item: Omit<TradeItem, 'quantity'>) => {
    const itemWithQty = { ...item, quantity: 1 }
    if (editingIndex !== null) {
      const items = pickerSide === 'left' ? leftItems : rightItems
      const existingQty = items[editingIndex]?.quantity || 1
      itemWithQty.quantity = existingQty
      if (pickerSide === 'left') {
        setLeftItems(prev => prev.map((it, i) => i === editingIndex ? itemWithQty : it))
      } else {
        setRightItems(prev => prev.map((it, i) => i === editingIndex ? itemWithQty : it))
      }
    } else {
      if (pickerSide === 'left') {
        setLeftItems(prev => [...prev, itemWithQty])
      } else {
        setRightItems(prev => [...prev, itemWithQty])
      }
    }
    setPickerSide(null)
    setEditingIndex(null)
  }

  const handleQuantityChange = (side: Side, index: number, qty: number) => {
    if (side === 'left') {
      setLeftItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: qty } : it))
    } else {
      setRightItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: qty } : it))
    }
  }

  const handleEditItem = (side: Side, index: number) => {
    setPickerSide(side)
    setEditingIndex(index)
  }

  const getEditingItem = () => {
    if (editingIndex === null || !pickerSide) return undefined
    const items = pickerSide === 'left' ? leftItems : rightItems
    return items[editingIndex]
  }

  const handleRemoveItem = (side: Side, index: number) => {
    if (side === 'left') {
      setLeftItems(prev => prev.filter((_, i) => i !== index))
    } else {
      setRightItems(prev => prev.filter((_, i) => i !== index))
    }
  }

  const hasItems = leftItems.length > 0 || rightItems.length > 0
  const hasValue = leftTotals.totalValue > 0 || rightTotals.totalValue > 0

  return (
    <PageTransition className="min-h-[calc(100vh-64px)] bg-darkbg-950">
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 bg-green-500 rounded-full" />
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Trade Calculator (Steal a Brainrot)</h1>
              <p className="text-sm text-gray-500">Compare values before you trade</p>
            </div>
          </div>
        </div>

        {/* Main Calculator */}
        <div className="bg-darkbg-900/80 backdrop-blur-sm rounded-2xl border border-darkbg-700 overflow-hidden">
          <div className="grid md:grid-cols-[1fr_auto_1fr]">
            {/* Left Side */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">Your Offer</h3>
                <span className="text-xs text-gray-500">
                  {leftItems.reduce((sum, i) => sum + i.quantity, 0)} item{leftItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <AnimatePresence mode="popLayout">
                  {leftItems.map((item, index) => (
                    <CalculatorItem
                      key={`left-${index}-${item.brainrotId}`}
                      item={item}
                      onEdit={() => handleEditItem('left', index)}
                      onRemove={() => handleRemoveItem('left', index)}
                      onQuantityChange={(qty) => handleQuantityChange('left', index, qty)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <button
                onClick={() => setPickerSide('left')}
                className="w-full py-3 border border-dashed border-darkbg-600 rounded-xl text-gray-500 hover:text-green-500 hover:border-green-500/50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>

              {/* Left Totals */}
              {leftItems.length > 0 && (
                <div className="mt-3 p-3 bg-darkbg-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Total Income</span>
                    <span className="font-bold text-green-400">{formatIncome(leftTotals.totalIncome.toString())}</span>
                  </div>
                  {leftTotals.totalValue > 0 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">Total Value</span>
                      <span className="font-bold text-orange-400">
                        R${formatValue(leftTotals.totalValue)}{leftTotals.hasEstimated ? '+' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Center - Comparison */}
            <div className="hidden md:flex flex-col items-center justify-center px-6 py-4 bg-darkbg-800/30 border-x border-darkbg-700">
              <Scale className="w-8 h-8 text-gray-600 mb-3" />

              {hasItems ? (
                <div className="text-center space-y-4">
                  {/* Income comparison */}
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Income</p>
                    <p className={`text-lg font-bold ${incomeDiff > 0 ? 'text-green-500' : incomeDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {incomeDiff > 0 ? '+' : ''}{formatIncome(incomeDiff.toString())}
                    </p>
                    <p className="text-xs text-gray-500">
                      {incomePercent > 0 ? '+' : ''}{incomePercent.toFixed(1)}%
                    </p>
                  </div>

                  {/* Value comparison */}
                  {hasValue && (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Value</p>
                      <p className={`text-lg font-bold ${valueDiff > 0 ? 'text-green-500' : valueDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                        {valueDiff > 0 ? '+' : ''}R${formatValue(Math.abs(valueDiff))}
                      </p>
                      <p className="text-xs text-gray-500">
                        {valuePercent > 0 ? '+' : ''}{valuePercent.toFixed(1)}%
                      </p>
                    </div>
                  )}

                  {/* Verdict */}
                  {(leftItems.length > 0 && rightItems.length > 0) && (
                    <div className={`mt-2 px-3 py-1.5 rounded-full text-xs font-medium ${
                      valueDiff > leftTotals.totalValue * 0.1 ? 'bg-green-500/20 text-green-400' :
                      valueDiff < -leftTotals.totalValue * 0.1 ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {valueDiff > leftTotals.totalValue * 0.1 ? 'Good deal' :
                       valueDiff < -leftTotals.totalValue * 0.1 ? 'Bad deal' :
                       'Fair trade'}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center">Add items to<br/>compare trades</p>
              )}
            </div>

            {/* Right Side */}
            <div className="p-4 border-t md:border-t-0 border-darkbg-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white text-sm">You Receive</h3>
                <span className="text-xs text-gray-500">
                  {rightItems.reduce((sum, i) => sum + i.quantity, 0)} item{rightItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <AnimatePresence mode="popLayout">
                  {rightItems.map((item, index) => (
                    <CalculatorItem
                      key={`right-${index}-${item.brainrotId}`}
                      item={item}
                      onEdit={() => handleEditItem('right', index)}
                      onRemove={() => handleRemoveItem('right', index)}
                      onQuantityChange={(qty) => handleQuantityChange('right', index, qty)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              <button
                onClick={() => setPickerSide('right')}
                className="w-full py-3 border border-dashed border-darkbg-600 rounded-xl text-gray-500 hover:text-green-500 hover:border-green-500/50 transition-colors flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>

              {/* Right Totals */}
              {rightItems.length > 0 && (
                <div className="mt-3 p-3 bg-darkbg-800/50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">Total Income</span>
                    <span className="font-bold text-green-400">{formatIncome(rightTotals.totalIncome.toString())}</span>
                  </div>
                  {rightTotals.totalValue > 0 && (
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">Total Value</span>
                      <span className="font-bold text-orange-400">
                        R${formatValue(rightTotals.totalValue)}{rightTotals.hasEstimated ? '+' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Mobile Comparison */}
          {hasItems && (
            <div className="md:hidden p-4 bg-darkbg-800/50 border-t border-darkbg-700">
              <div className="flex items-center justify-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Income</p>
                  <p className={`font-bold ${incomeDiff > 0 ? 'text-green-500' : incomeDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {incomeDiff > 0 ? '+' : ''}{formatIncome(incomeDiff.toString())}
                  </p>
                </div>
                {hasValue && (
                  <div className="text-center">
                    <p className="text-[10px] text-gray-500 uppercase">Value</p>
                    <p className={`font-bold ${valueDiff > 0 ? 'text-green-500' : valueDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {valueDiff > 0 ? '+' : ''}R${formatValue(Math.abs(valueDiff))}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clear All */}
          {hasItems && (
            <div className="p-3 border-t border-darkbg-700 flex justify-center">
              <button
                onClick={() => { setLeftItems([]); setRightItems([]) }}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 hover:text-red-400 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-4">
          <HowItWorks />
        </div>
      </div>

      {/* Brainrot Picker */}
      <AnimatePresence>
        {pickerSide && (
          <BrainrotPicker
            onSelect={handleSelectItem}
            onClose={() => { setPickerSide(null); setEditingIndex(null) }}
            initialItem={getEditingItem()}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
