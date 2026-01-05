'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Calculator, Plus, Trash2, ArrowRightLeft, Scale, RotateCcw, Pencil, Trophy, Layers } from 'lucide-react'
import { BrainrotPicker, prefetchPickerData } from '@/components/trading'
import { PageTransition } from '@/components/ui'
import { formatIncome, getMutationClass } from '@/lib/utils'
import { easeOut } from '@/lib/animations'

// Badge thresholds
const BILLION = 1_000_000_000
const LB_VIABLE_THRESHOLD = 2 * BILLION // 2B income
const TRAIT_STACKED_THRESHOLD = 5 // 5+ traits

// Check if income qualifies for LB Viable badge
function isLBViable(income: string | undefined): boolean {
  if (!income) return false
  return parseFloat(income) >= LB_VIABLE_THRESHOLD
}

// Check if trait count qualifies for Trait Stacked badge
function isTraitStacked(traitCount: number): boolean {
  return traitCount >= TRAIT_STACKED_THRESHOLD
}

interface TradeItem {
  brainrotId: string
  brainrot: {
    id: string
    name: string
    localImage: string | null
    baseIncome: string
    robuxValue?: number | null
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
  eventId?: string
  event?: {
    id: string
    name: string
  }
  calculatedIncome?: string
}

// Format value compactly
function formatValue(value: number): string {
  if (value >= 1_000_000) {
    return (Math.round(value / 1_000_000 * 10) / 10).toFixed(1) + 'M'
  }
  if (value >= 1_000) {
    return (Math.round(value / 1_000 * 10) / 10).toFixed(1) + 'K'
  }
  return value.toLocaleString()
}

// Calculate total value from items
function calculateTotalValue(items: TradeItem[]): number {
  return items.reduce((sum, item) => sum + (item.brainrot.robuxValue || 0), 0)
}

type Side = 'left' | 'right'

function CalculatorItem({
  item,
  index,
  onEdit,
  onRemove,
}: {
  item: TradeItem
  index: number
  onEdit: () => void
  onRemove: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 8, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03, ease: easeOut }}
      whileHover={{ scale: 1.01, backgroundColor: 'rgba(34, 197, 94, 0.05)' }}
      className="flex items-center gap-3 p-3 bg-darkbg-800 rounded-xl group border border-transparent hover:border-green-500/30 transition-colors"
    >
      <div className="relative flex-shrink-0">
        {item.brainrot.localImage ? (
          <Image
            src={item.brainrot.localImage}
            alt={item.brainrot.name}
            width={48}
            height={48}
            className="rounded-lg"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-darkbg-700" />
        )}
        {item.mutation && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            className="animation-always-running absolute -top-1 -right-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-darkbg-900 shadow-lg"
          >
            <span className={getMutationClass(item.mutation.name)}>
              {item.mutation.name.charAt(0)}
            </span>
          </motion.div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate text-sm">
          {item.brainrot.name}
        </p>
        {item.mutation && (
          <p className={`animation-always-running text-xs font-bold ${getMutationClass(item.mutation.name)}`}>
            {item.mutation.name}
          </p>
        )}
        {item.traits && item.traits.length > 0 && (
          <p className="text-xs text-gray-400">
            {item.traits.length} trait{item.traits.length > 1 ? 's' : ''}
          </p>
        )}
        {/* Badges */}
        <div className="flex items-center gap-1 mt-1">
          {isLBViable(item.calculatedIncome) && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[10px] font-medium">
              <Trophy className="w-3 h-3" />
              LB
            </span>
          )}
          {isTraitStacked(item.traits?.length || 0) && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-medium">
              <Layers className="w-3 h-3" />
              Stacked
            </span>
          )}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-green-400 text-sm">
          {formatIncome(item.calculatedIncome || item.brainrot.baseIncome)}
        </p>
        {item.brainrot.robuxValue != null && item.brainrot.robuxValue > 0 && (
          <p className="text-xs text-orange-400 font-medium">
            R$ {formatValue(item.brainrot.robuxValue)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onEdit}
          className="p-1.5 text-gray-400 hover:text-green-400"
        >
          <Pencil className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-500"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

export default function CalculatorPage() {
  const [leftItems, setLeftItems] = useState<TradeItem[]>([])
  const [rightItems, setRightItems] = useState<TradeItem[]>([])
  const [pickerSide, setPickerSide] = useState<Side | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  // Prefetch picker data on page load for instant picker
  useEffect(() => {
    prefetchPickerData()
  }, [])

  // Income calculations
  const leftTotal = leftItems.reduce(
    (sum, item) => sum + BigInt(item.calculatedIncome || item.brainrot.baseIncome),
    BigInt(0)
  )
  const rightTotal = rightItems.reduce(
    (sum, item) => sum + BigInt(item.calculatedIncome || item.brainrot.baseIncome),
    BigInt(0)
  )

  const difference = rightTotal - leftTotal
  const percentDiff = leftTotal > 0
    ? Number((difference * BigInt(10000)) / leftTotal) / 100
    : rightTotal > 0 ? 100 : 0

  // Value calculations
  const leftValue = calculateTotalValue(leftItems)
  const rightValue = calculateTotalValue(rightItems)
  const valueDifference = rightValue - leftValue
  const valuePercentDiff = leftValue > 0
    ? ((valueDifference / leftValue) * 100)
    : rightValue > 0 ? 100 : 0
  const hasAnyValue = leftValue > 0 || rightValue > 0

  const handleSelectItem = (item: TradeItem) => {
    if (editingIndex !== null) {
      // Editing existing item
      if (pickerSide === 'left') {
        setLeftItems((prev) => prev.map((it, i) => i === editingIndex ? item : it))
      } else {
        setRightItems((prev) => prev.map((it, i) => i === editingIndex ? item : it))
      }
    } else {
      // Adding new item
      if (pickerSide === 'left') {
        setLeftItems((prev) => [...prev, item])
      } else {
        setRightItems((prev) => [...prev, item])
      }
    }
    setPickerSide(null)
    setEditingIndex(null)
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
      setLeftItems((prev) => prev.filter((_, i) => i !== index))
    } else {
      setRightItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  const handleClearAll = () => {
    setLeftItems([])
    setRightItems([])
  }

  const hasItems = leftItems.length > 0 || rightItems.length > 0

  return (
    <PageTransition className="min-h-[calc(100vh-64px)] bg-darkbg-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="inline-flex items-center justify-center w-16 h-16 bg-green-900/30 rounded-2xl mb-4"
          >
            <Calculator className="w-8 h-8 text-green-400" />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Trade Calculator
          </h1>
          <p className="text-gray-400">
            Compare trade values to see if a deal is fair
          </p>
        </motion.div>

        {/* Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1, ease: easeOut }}
          className="bg-darkbg-900/90 backdrop-blur-sm rounded-2xl border border-darkbg-700 p-6 max-w-5xl mx-auto shadow-xl shadow-black/20"
        >
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6">
            {/* Left Side */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">Your Offer</h3>
                <span className="text-sm text-gray-500">{leftItems.length} items</span>
              </div>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {leftItems.map((item, index) => (
                    <CalculatorItem
                      key={`left-${index}-${item.brainrotId}`}
                      item={item}
                      index={index}
                      onEdit={() => handleEditItem('left', index)}
                      onRemove={() => handleRemoveItem('left', index)}
                    />
                  ))}
                </AnimatePresence>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{
                    scale: 1.01,
                    borderColor: 'rgba(34, 197, 94, 0.5)',
                  }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setPickerSide('left')}
                  className="w-full py-4 border-2 border-dashed border-darkbg-600 rounded-xl text-gray-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Item
                </motion.button>
              </div>
              {/* Left Total */}
              {leftItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-darkbg-800 rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Income</span>
                    <motion.span
                      key={leftTotal.toString()}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="text-lg font-bold text-green-400"
                    >
                      <span className="text-white/70">Σ</span> {formatIncome(leftTotal.toString())}
                    </motion.span>
                  </div>
                  {leftValue > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Value</span>
                      <span className="text-sm font-bold text-orange-400">
                        R$ {formatValue(leftValue)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Middle - Comparison */}
            <div className="hidden md:flex flex-col items-center justify-center px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.15 }}
                className="w-20 h-20 bg-darkbg-800 rounded-full flex items-center justify-center mb-4"
              >
                <Scale className="w-10 h-10 text-gray-400" />
              </motion.div>
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <ArrowRightLeft className="w-6 h-6 text-green-500/60 mb-4" />
              </motion.div>
              <AnimatePresence mode="wait">
                {hasItems && (
                  <motion.div
                    key={difference.toString() + valueDifference.toString()}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="text-center space-y-3"
                  >
                    {/* Income difference */}
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Income</p>
                      <motion.p
                        className={`text-xl font-bold ${
                          difference > 0 ? 'text-green-500' :
                          difference < 0 ? 'text-red-500' : 'text-gray-500'
                        }`}
                      >
                        {difference > 0 ? '+' : ''}{formatIncome(difference.toString())}
                      </motion.p>
                      <p className="text-xs text-gray-500">
                        {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                      </p>
                    </div>
                    {/* Value difference */}
                    {hasAnyValue && (
                      <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Value</p>
                        <motion.p
                          className={`text-lg font-bold ${
                            valueDifference > 0 ? 'text-green-500' :
                            valueDifference < 0 ? 'text-red-500' : 'text-gray-500'
                          }`}
                        >
                          {valueDifference > 0 ? '+' : ''}R$ {formatValue(Math.abs(valueDifference))}
                        </motion.p>
                        <p className="text-xs text-gray-500">
                          {valuePercentDiff > 0 ? '+' : ''}{valuePercentDiff.toFixed(1)}%
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {difference > 0 ? 'You gain income' :
                       difference < 0 ? 'You lose income' : 'Fair trade'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Side */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white">You Receive</h3>
                <span className="text-sm text-gray-500">{rightItems.length} items</span>
              </div>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {rightItems.map((item, index) => (
                    <CalculatorItem
                      key={`right-${index}-${item.brainrotId}`}
                      item={item}
                      index={index}
                      onEdit={() => handleEditItem('right', index)}
                      onRemove={() => handleRemoveItem('right', index)}
                    />
                  ))}
                </AnimatePresence>
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  whileHover={{
                    scale: 1.01,
                    borderColor: 'rgba(34, 197, 94, 0.5)',
                  }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setPickerSide('right')}
                  className="w-full py-4 border-2 border-dashed border-darkbg-600 rounded-xl text-gray-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Item
                </motion.button>
              </div>
              {/* Right Total */}
              {rightItems.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-darkbg-800 rounded-xl space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">Income</span>
                    <motion.span
                      key={rightTotal.toString()}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="text-lg font-bold text-green-400"
                    >
                      <span className="text-white/70">Σ</span> {formatIncome(rightTotal.toString())}
                    </motion.span>
                  </div>
                  {rightValue > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Value</span>
                      <span className="text-sm font-bold text-orange-400">
                        R$ {formatValue(rightValue)}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          {/* Mobile Comparison */}
          <AnimatePresence>
            {hasItems && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-6 p-4 bg-darkbg-800 rounded-xl text-center space-y-3"
              >
                <Scale className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                {/* Income difference */}
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Income</p>
                  <motion.p
                    key={difference.toString()}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className={`text-xl font-bold ${
                      difference > 0 ? 'text-green-500' :
                      difference < 0 ? 'text-red-500' : 'text-gray-500'
                    }`}
                  >
                    {difference > 0 ? '+' : ''}{formatIncome(difference.toString())}
                  </motion.p>
                  <p className="text-xs text-gray-500">
                    {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                  </p>
                </div>
                {/* Value difference */}
                {hasAnyValue && (
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Value</p>
                    <motion.p
                      className={`text-lg font-bold ${
                        valueDifference > 0 ? 'text-green-500' :
                        valueDifference < 0 ? 'text-red-500' : 'text-gray-500'
                      }`}
                    >
                      {valueDifference > 0 ? '+' : ''}R$ {formatValue(Math.abs(valueDifference))}
                    </motion.p>
                    <p className="text-xs text-gray-500">
                      {valuePercentDiff > 0 ? '+' : ''}{valuePercentDiff.toFixed(1)}%
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  {difference > 0 ? 'You gain income' :
                   difference < 0 ? 'You lose income' : 'Fair trade'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Clear Button */}
          <AnimatePresence>
            {hasItems && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 text-center"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear All
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 max-w-2xl mx-auto text-center"
        >
          <p className="text-sm text-gray-400">
            Values are calculated based on base income, mutations, and traits.
            Use this as a guide—actual trade values may vary based on demand.
          </p>
        </motion.div>
      </div>

      {/* Brainrot Picker */}
      <AnimatePresence>
        {pickerSide && (
          <BrainrotPicker
            onSelect={handleSelectItem}
            onClose={() => {
              setPickerSide(null)
              setEditingIndex(null)
            }}
            initialItem={getEditingItem()}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
