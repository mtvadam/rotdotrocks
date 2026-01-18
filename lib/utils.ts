import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Merge Tailwind classes with proper conflict resolution
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format currency with proper precision
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  options?: { showSign?: boolean; precision?: number }
): string {
  const { showSign = false, precision } = options || {}

  // Crypto currencies need more precision
  const cryptoPrecision: Record<string, number> = {
    BTC: 8,
    ETH: 6,
    SOL: 4,
    USDT: 2,
    USDC: 2,
    USD: 2,
    EUR: 2,
  }

  const actualPrecision = precision ?? (cryptoPrecision[currency] ?? 2)
  const formatted = amount.toFixed(actualPrecision)

  if (showSign && amount > 0) {
    return `+${formatted}`
  }

  return formatted
}

// Format multiplier (e.g., 1.5x, 2.00x)
export function formatMultiplier(multiplier: number): string {
  return `${multiplier.toFixed(2)}x`
}

// Format large numbers with K, M, B suffixes
export function formatCompact(num: number): string {
  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''

  if (absNum >= 1e9) return `${sign}${(absNum / 1e9).toFixed(2)}B`
  if (absNum >= 1e6) return `${sign}${(absNum / 1e6).toFixed(2)}M`
  if (absNum >= 1e3) return `${sign}${(absNum / 1e3).toFixed(2)}K`
  return num.toFixed(2)
}

// Format percentage
export function formatPercent(value: number, decimals: number = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

// Generate random ID
export function generateId(prefix: string = ''): string {
  const random = Math.random().toString(36).substring(2, 9)
  return prefix ? `${prefix}_${random}` : random
}

// Truncate address (e.g., 0x1234...5678)
export function truncateAddress(address: string, chars: number = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

// Sleep utility for animations/delays
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Clamp number between min and max
export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max)
}

// Check if value is valid number
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

// Parse bet amount from string input
export function parseBetAmount(value: string): number | null {
  const cleaned = value.replace(/[^0-9.]/g, '')
  const parsed = parseFloat(cleaned)
  return isValidNumber(parsed) && parsed >= 0 ? parsed : null
}

// Calculate win chance from multiplier (assuming house edge)
export function calculateWinChance(multiplier: number, houseEdge: number = 0.01): number {
  return (1 - houseEdge) / multiplier
}

// Calculate multiplier from win chance
export function calculateMultiplier(winChance: number, houseEdge: number = 0.01): number {
  return (1 - houseEdge) / winChance
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function(...args: Parameters<T>) {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), wait)
  }
}

// Throttle function
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return function(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => { inThrottle = false }, limit)
    }
  }
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Format relative time (e.g., "2 min ago")
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`

  return past.toLocaleDateString()
}

// Currency type
export type Currency = 'USD' | 'BTC' | 'ETH' | 'USDT' | 'USDC' | 'SOL' | 'BNB' | 'LTC'

// Currency metadata
export const CURRENCIES: Record<Currency, { name: string; icon: string; color: string; precision: number }> = {
  USD: { name: 'US Dollar', icon: '/icons/usd.svg', color: '#85BB65', precision: 2 },
  BTC: { name: 'Bitcoin', icon: '/icons/btc.svg', color: '#F7931A', precision: 8 },
  ETH: { name: 'Ethereum', icon: '/icons/eth.svg', color: '#627EEA', precision: 6 },
  USDT: { name: 'Tether', icon: '/icons/usdt.svg', color: '#26A17B', precision: 2 },
  USDC: { name: 'USD Coin', icon: '/icons/usdc.svg', color: '#2775CA', precision: 2 },
  SOL: { name: 'Solana', icon: '/icons/sol.svg', color: '#9945FF', precision: 4 },
  BNB: { name: 'BNB', icon: '/icons/bnb.svg', color: '#F3BA2F', precision: 6 },
  LTC: { name: 'Litecoin', icon: '/icons/ltc.svg', color: '#BFBBBB', precision: 8 },
}

// Game types
export type GameType = 'dice' | 'crash' | 'mines' | 'limbo' | 'plinko' | 'roulette' | 'blackjack'

// Bet status
export type BetStatus = 'pending' | 'won' | 'lost' | 'cashout'

// Format bet profit with sign and color class
export function formatProfit(profit: number, currency: Currency = 'USD'): { text: string; className: string } {
  const formatted = formatCurrency(Math.abs(profit), currency, { showSign: false })

  if (profit > 0) {
    return { text: `+${formatted}`, className: 'text-neon-green' }
  } else if (profit < 0) {
    return { text: `-${formatted}`, className: 'text-status-error' }
  }

  return { text: formatted, className: 'text-text-secondary' }
}

// Validate crypto address format (basic validation)
export function validateAddress(address: string, currency: Currency): boolean {
  if (!address) return false

  const patterns: Partial<Record<Currency, RegExp>> = {
    BTC: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
    ETH: /^0x[a-fA-F0-9]{40}$/,
    SOL: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    BNB: /^0x[a-fA-F0-9]{40}$/,
    LTC: /^[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}$/,
    USDT: /^0x[a-fA-F0-9]{40}$/, // ERC20
    USDC: /^0x[a-fA-F0-9]{40}$/, // ERC20
  }

  const pattern = patterns[currency]
  return pattern ? pattern.test(address) : true
}

// Round to specific decimal places
export function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals)
  return Math.round(num * factor) / factor
}

// Generate a random number in range
export function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Calculate potential payout
export function calculatePayout(betAmount: number, multiplier: number): number {
  return roundTo(betAmount * multiplier, 8)
}

// Calculate profit from payout
export function calculateProfitFromPayout(betAmount: number, payout: number): number {
  return roundTo(payout - betAmount, 8)
}
