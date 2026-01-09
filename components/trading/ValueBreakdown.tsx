'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Info } from 'lucide-react'
import { calculateTraitValueMultiplier, getTraitValueMultiplier } from '@/lib/trait-value'

interface ValueBreakdownItem {
  brainrotName: string
  mutationName: string
  robuxValue: number
  traitNames: string[]
  valueFallback?: boolean
  valueFallbackSource?: string | null
}

// Single item value breakdown tooltip (for individual items)
export function ItemValueBreakdown({
  robuxValue,
  mutationName,
  traitNames,
  valueFallback,
  valueFallbackSource,
}: {
  robuxValue: number
  mutationName: string
  traitNames: string[]
  valueFallback?: boolean
  valueFallbackSource?: string | null
}) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLButtonElement>(null)

  const traitMult = calculateTraitValueMultiplier(traitNames)
  const finalValue = Math.round(robuxValue * traitMult)

  // robuxValue is already the mutation-adjusted base value
  const mutationBaseValue = robuxValue

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.bottom + 8, left: rect.left })
    }
  }, [show])

  if (robuxValue === 0) return <span className="text-gray-500 text-xs">N/A</span>

  const hasTraitEffect = traitMult !== 1
  const showInfo = valueFallback || hasTraitEffect

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="text-yellow-400 font-medium text-sm hover:text-yellow-300 transition-colors flex items-center gap-1"
      >
        R${finalValue.toLocaleString()}{valueFallback ? '+' : ''}
        {showInfo && <Info className="w-3 h-3 opacity-60" />}
      </button>
      {typeof window !== 'undefined' && show && createPortal(
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[100] bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-3 shadow-xl shadow-black/30 min-w-[200px]"
        >
          <p className="text-xs font-medium text-gray-300 mb-2">Value Breakdown</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-400">
              <span>Base ({mutationName || 'Default'})</span>
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
            <div className="flex justify-between text-yellow-400 font-medium pt-1 border-t border-darkbg-600">
              <span>Final Value</span>
              <span>R${finalValue.toLocaleString()}</span>
            </div>
          </div>
          {valueFallback && (
            <p className="text-[10px] text-amber-400/80 mt-2">
              Using {valueFallbackSource} value (estimated)
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  )
}

// Total value breakdown tooltip (for side totals)
export function TotalValueBreakdown({
  items,
  totalValue,
  hasEstimated,
  showLabel = false,
  compact = false,
}: {
  items: ValueBreakdownItem[]
  totalValue: number
  hasEstimated: boolean
  showLabel?: boolean
  compact?: boolean
}) {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPos({ top: rect.top - 8, left: rect.left + rect.width / 2 })
    }
  }, [show])

  if (totalValue === 0) return null

  // Calculate per-item breakdown
  const itemBreakdowns = items.map(item => {
    const traitMult = calculateTraitValueMultiplier(item.traitNames)
    const finalValue = Math.round(item.robuxValue * traitMult)
    const hasTraitBonus = traitMult !== 1
    return { ...item, traitMult, finalValue, hasTraitBonus }
  }).filter(item => item.finalValue > 0)

  const hasTraitEffects = itemBreakdowns.some(item => item.hasTraitBonus)

  return (
    <div className={compact ? 'inline-flex items-center' : ''}>
      {showLabel && <span className="text-gray-500">Value: </span>}
      <span
        ref={ref}
        className={`font-medium cursor-default inline-flex items-center gap-1 ${compact ? 'text-xs font-semibold text-amber-400' : 'text-yellow-400'}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        R${compact ? formatValue(totalValue) : totalValue.toLocaleString()}{hasEstimated ? '+' : ''}
        {(hasEstimated || hasTraitEffects) && <Info className="w-3 h-3 opacity-60" />}
      </span>
      {typeof window !== 'undefined' && show && createPortal(
        <div
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full pointer-events-none"
        >
          <div className="bg-darkbg-950/95 backdrop-blur-xl border border-darkbg-600 rounded-lg p-3 shadow-xl shadow-black/30 min-w-[240px] max-w-[320px]">
            <p className="text-xs font-medium text-gray-300 mb-2">Value Breakdown</p>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {itemBreakdowns.map((item, i) => (
                <div key={i} className="text-xs">
                  {/* Item header with name and final value */}
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-200 font-medium truncate block">{item.brainrotName}</span>
                      {item.mutationName && item.mutationName !== 'Default' && (
                        <span className="text-[10px] text-gray-500">{item.mutationName}</span>
                      )}
                    </div>
                    <span className="text-yellow-400 font-medium flex-shrink-0">
                      R${item.finalValue.toLocaleString()}
                    </span>
                  </div>
                  {/* Trait breakdown for this item */}
                  {item.traitNames.length > 0 && (
                    <div className="ml-2 mt-1 space-y-0.5">
                      <div className="flex justify-between text-[10px] text-gray-500">
                        <span>Base value</span>
                        <span>R${item.robuxValue.toLocaleString()}</span>
                      </div>
                      {item.traitNames.map((traitName, j) => {
                        const mult = getTraitValueMultiplier(traitName)
                        const bonus = mult - 1
                        if (bonus === 0) return null
                        return (
                          <div key={j} className="flex justify-between text-[10px]">
                            <span className="text-gray-400 truncate mr-2">{traitName}</span>
                            <span className={bonus > 0 ? 'text-green-400' : 'text-red-400'}>
                              {bonus > 0 ? '+' : ''}{(bonus * 100).toFixed(0)}%
                            </span>
                          </div>
                        )
                      })}
                      {item.hasTraitBonus && (
                        <div className="flex justify-between text-[10px] pt-0.5 border-t border-darkbg-700">
                          <span className="text-gray-400">Total multiplier</span>
                          <span className={item.traitMult > 1 ? 'text-green-400' : 'text-red-400'}>
                            {item.traitMult.toFixed(2)}x
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {item.valueFallback && (
                    <p className="text-[9px] text-amber-400/70 mt-0.5 ml-2">
                      Using {item.valueFallbackSource} value
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-sm text-yellow-400 font-medium pt-2 mt-2 border-t border-darkbg-600">
              <span>Total</span>
              <span>R${totalValue.toLocaleString()}{hasEstimated ? '+' : ''}</span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// Simple format value helper
export function formatValue(value: number): string {
  if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M'
  if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K'
  return value.toLocaleString()
}
