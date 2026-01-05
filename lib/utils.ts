import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number | bigint): string {
  const n = typeof num === 'bigint' ? Number(num) : num
  const absN = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (absN >= 1_000_000_000_000) return `${sign}${(Math.round(absN / 1_000_000_000_000 * 10) / 10).toFixed(1)}T`
  if (absN >= 1_000_000_000) return `${sign}${(Math.round(absN / 1_000_000_000 * 10) / 10).toFixed(1)}B`
  if (absN >= 1_000_000) return `${sign}${(Math.round(absN / 1_000_000 * 10) / 10).toFixed(1)}M`
  if (absN >= 1_000) return `${sign}${(Math.round(absN / 1_000 * 10) / 10).toFixed(1)}K`
  return n.toLocaleString()
}

export function formatIncome(income: number | bigint | string): string {
  // Handle string inputs (may include decimals like "0.5")
  if (typeof income === 'string') {
    const num = parseFloat(income)
    if (num < 1 && num > 0) {
      // Show decimal for fractional values
      return `$${num}/s`
    }
    return `$${formatNumber(BigInt(Math.floor(num)))}/s`
  }
  return `$${formatNumber(income)}/s`
}

export function timeAgo(date: Date | string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  const diffWeek = Math.floor(diffDay / 7)
  const diffMonth = Math.floor(diffDay / 30)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  if (diffWeek < 4) return `${diffWeek}w ago`
  return `${diffMonth}mo ago`
}

export function getImageUrl(localImage?: string | null): string | null {
  return localImage || null
}

export function getMutationClass(name: string): string {
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
    case 'cursed': return 'mutation-cursed'
    default: return 'text-gray-400'
  }
}
