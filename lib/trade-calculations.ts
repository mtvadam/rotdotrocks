/**
 * Shared trade calculation and formatting utilities.
 * Single source of truth for value/income formatting and total calculations
 * used across TradeCard, TradePageClient, Calculator, and ValueBreakdown.
 */

import { calculateTraitValueMultiplier } from '@/lib/trait-value'

// ── Number formatting thresholds ──

const TRILLION = 1_000_000_000_000
const BILLION = 1_000_000_000
const MILLION = 1_000_000
const THOUSAND = 1_000

// ── Income badge thresholds (exported for TradeCard badge logic) ──

export const MONEYMAKER_THRESHOLD = BILLION
export const LB_VIABLE_THRESHOLD = 2 * BILLION
export const TRAIT_STACKED_THRESHOLD = 5

// ── Formatting functions ──

/**
 * Format an income string into a compact human-readable form.
 * Uses floor rounding to avoid overstating income.
 * Examples: "1500000000000" -> "1.5T", "2300000000" -> "2.3B"
 */
export function formatCompactIncome(income: string): string {
  const num = parseFloat(income)
  if (num >= TRILLION) return (Math.floor(num / TRILLION * 10) / 10).toFixed(1) + 'T'
  if (num >= BILLION) return (Math.floor(num / BILLION * 10) / 10).toFixed(1) + 'B'
  if (num >= MILLION) return (Math.floor(num / MILLION * 10) / 10).toFixed(1) + 'M'
  if (num >= THOUSAND) return (Math.floor(num / THOUSAND * 10) / 10).toFixed(1) + 'K'
  return Math.floor(num).toString()
}

/**
 * Format a Robux value into a compact human-readable form.
 * Uses standard rounding for value display.
 * Examples: 1500000 -> "1.5M", 2300 -> "2.3K", 500 -> "500"
 *
 * This consolidates formatCompactValue (TradeCard) and formatValue (ValueBreakdown/Calculator).
 * The minor difference (Math.round vs division) produces identical output for all practical values.
 */
export function formatCompactValue(value: number): string {
  if (value >= MILLION) return (Math.round(value / MILLION * 10) / 10).toFixed(1) + 'M'
  if (value >= THOUSAND) return (Math.round(value / THOUSAND * 10) / 10).toFixed(1) + 'K'
  return value.toLocaleString()
}

// ── Trait extraction helpers ──

type TraitInput = string | { name: string; valueMultiplier?: number }

/**
 * Items from TradeCard and TradePageClient have traits nested as { trait: {...} }.
 * Items from the Calculator have traits directly as trait objects.
 * This interface covers both shapes via the union in `traits`.
 */
interface TraitObjectNested {
  trait: { name: string; valueMultiplier?: number; [key: string]: unknown }
}

function isNestedTrait(t: unknown): t is TraitObjectNested {
  return typeof t === 'object' && t !== null && 'trait' in t
}

/**
 * Normalize trait arrays from either shape into a flat array of trait objects
 * suitable for calculateTraitValueMultiplier.
 */
function extractTraitObjects(
  traits: Array<TraitObjectNested | { name: string; valueMultiplier?: number; [key: string]: unknown }> | undefined | null
): TraitInput[] {
  if (!traits || traits.length === 0) return []
  // Check the first element to determine shape
  const first = traits[0]
  if (isNestedTrait(first)) {
    return (traits as TraitObjectNested[]).map(t => t.trait)
  }
  return traits as Array<{ name: string; valueMultiplier?: number }>
}

// ── Item interfaces for calculations ──

/**
 * Minimal item shape for calculateTotalIncome.
 */
export interface IncomeItem {
  calculatedIncome?: string | null
}

/**
 * Minimal item shape for calculateTotalValue.
 * Supports both TradeCard items (nested traits via { trait: ... }) and
 * Calculator items (flat trait objects). Also supports addon ROBUX items.
 */
export interface ValueItem {
  brainrot: {
    name: string
    robuxValue?: number | null
  }
  mutation?: {
    name: string
    [key: string]: unknown
  } | null
  traits?: Array<
    | { trait: { name: string; valueMultiplier?: number; [key: string]: unknown } }
    | { name: string; valueMultiplier?: number; [key: string]: unknown }
  >
  robuxValue?: number | null
  robuxAmount?: number | null
  addonType?: string | null
  valueFallback?: boolean
  valueFallbackSource?: string | null
  quantity?: number
}

export interface ItemBreakdown {
  brainrotName: string
  mutationName: string
  robuxValue: number
  traitNames: TraitInput[]
  valueFallback?: boolean
  valueFallbackSource?: string | null
}

export interface TotalValueResult {
  value: number | null
  hasEstimated: boolean
  itemBreakdowns: ItemBreakdown[]
}

// ── Calculation functions ──

/**
 * Sum income across items. Returns a formatted string total or null if no items have income.
 * Used by TradeCard to show total income per side.
 */
export function calculateTotalIncome(items: IncomeItem[]): string | null {
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

/**
 * Sum Robux values across items, applying trait value multipliers.
 * Handles both brainrot robuxValue and ROBUX addon amounts.
 * Supports optional quantity multiplier (defaults to 1).
 *
 * Used by TradeCard, TradePageClient, and can replace calculator's calculateTotals
 * for the value portion.
 */
export function calculateTotalValue(items: ValueItem[]): TotalValueResult {
  let total = 0
  let hasValue = false
  let hasEstimated = false
  const itemBreakdowns: ItemBreakdown[] = []

  for (const item of items) {
    const qty = item.quantity ?? 1

    // Add brainrot's robux value with trait multiplier applied
    if (item.robuxValue != null) {
      hasValue = true
      const traitObjects = extractTraitObjects(item.traits)
      const traitMult = calculateTraitValueMultiplier(traitObjects)
      total += Math.round(item.robuxValue * traitMult) * qty

      if (item.valueFallback) {
        hasEstimated = true
      }

      itemBreakdowns.push({
        brainrotName: item.brainrot.name,
        mutationName: item.mutation?.name || 'Default',
        robuxValue: item.robuxValue,
        traitNames: traitObjects,
        valueFallback: item.valueFallback,
        valueFallbackSource: item.valueFallbackSource,
      })
    }

    // Add Robux addon amount (e.g., "Add Robux" addon in trades)
    if (item.robuxAmount != null && (item.addonType === 'ROBUX' || !item.addonType)) {
      // For TradeCard items without addonType, robuxAmount is on addon items only
      // For TradePageClient items, addonType === 'ROBUX' explicitly marks them
      // Only add if this looks like a robux addon (has robuxAmount but check context)
      if (item.addonType === 'ROBUX' || (item.robuxAmount && !item.robuxValue)) {
        hasValue = true
        total += item.robuxAmount * qty
        itemBreakdowns.push({
          brainrotName: 'Robux',
          mutationName: '',
          robuxValue: item.robuxAmount * qty,
          traitNames: [],
        })
      }
    }
  }

  return { value: hasValue ? total : null, hasEstimated, itemBreakdowns }
}

/**
 * Calculator-specific totals that also compute BigInt income and per-item breakdown.
 * This covers the calculator page's calculateTotals which needs quantity-aware
 * BigInt income and a different breakdown shape.
 */
export interface CalculatorItem {
  brainrot: {
    name: string
    baseIncome: string
    robuxValue?: number | null
  }
  traits?: Array<{ name: string; valueMultiplier?: number; [key: string]: unknown }>
  calculatedIncome?: string
  robuxValue?: number | null
  valueFallback?: boolean
  valueFallbackSource?: string | null
  quantity: number
}

export interface CalculatorBreakdown {
  name: string
  income: bigint
  value: number
  qty: number
  source?: string
}

export interface CalculatorTotalsResult {
  totalIncome: bigint
  totalValue: number
  hasEstimated: boolean
  breakdown: CalculatorBreakdown[]
}

/**
 * Calculate totals for the trade calculator page.
 * Uses BigInt for income (to handle very large income values without precision loss)
 * and applies quantity multipliers to both income and value.
 */
export function calculateCalculatorTotals(items: CalculatorItem[]): CalculatorTotalsResult {
  let totalIncome = BigInt(0)
  let totalValue = 0
  let hasEstimated = false
  const breakdown: CalculatorBreakdown[] = []

  for (const item of items) {
    const income = BigInt(item.calculatedIncome || item.brainrot.baseIncome) * BigInt(item.quantity)
    const baseValue = item.robuxValue ?? item.brainrot.robuxValue ?? 0
    const traitObjects = item.traits || []
    const traitMult = calculateTraitValueMultiplier(traitObjects)
    const value = Math.round(baseValue * traitMult) * item.quantity

    totalIncome += income
    totalValue += value

    if (item.valueFallback) hasEstimated = true

    breakdown.push({
      name: item.brainrot.name,
      income,
      value,
      qty: item.quantity,
      source: item.valueFallback ? item.valueFallbackSource || undefined : undefined,
    })
  }

  return { totalIncome, totalValue, hasEstimated, breakdown }
}
