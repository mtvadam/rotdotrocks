/**
 * Rate limiter with database-backed configuration
 * Configs are cached in memory and refreshed when admin updates them
 */

import { headers } from 'next/headers'
import { prisma } from './db'

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Get client IP from request headers
 */
export async function getClientIp(): Promise<string> {
  const headersList = await headers()
  return (
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  )
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  max: number
  windowMs: number
}

// Rate limit endpoint keys
export type RateLimitEndpoint =
  | 'reports'
  | 'gems'
  | 'events'
  | 'trade-requests'
  | 'brainrots'
  | 'brainrots-all'
  | 'mutations'
  | 'traits'
  | 'trades-create'
  | 'trades-search'
  | 'auth-challenge'
  | 'auth-verify'
  | 'admin-abuse'
  | 'admin-abuse-fresh'

// Default rate limits (used if not configured in DB)
export const DEFAULT_RATE_LIMITS: Record<RateLimitEndpoint, RateLimitConfig> = {
  'reports': { max: 3, windowMs: 5 * 60 * 1000 },        // 3 per 5 min
  'gems': { max: 10, windowMs: 60 * 1000 },              // 10 per min
  'events': { max: 100, windowMs: 60 * 1000 },           // 100 per min
  'trade-requests': { max: 10, windowMs: 60 * 1000 },    // 10 per min
  'brainrots': { max: 100, windowMs: 60 * 1000 },        // 100 per min
  'brainrots-all': { max: 60, windowMs: 60 * 1000 },     // 60 per min
  'mutations': { max: 100, windowMs: 60 * 1000 },        // 100 per min
  'traits': { max: 100, windowMs: 60 * 1000 },           // 100 per min
  'trades-create': { max: 5, windowMs: 60 * 1000 },      // 5 per min
  'trades-search': { max: 60, windowMs: 60 * 1000 },     // 60 per min
  'auth-challenge': { max: 5, windowMs: 15 * 60 * 1000 }, // 5 per 15 min
  'auth-verify': { max: 10, windowMs: 15 * 60 * 1000 },  // 10 per 15 min
  'admin-abuse': { max: 30, windowMs: 60 * 1000 },       // 30 per min (cached)
  'admin-abuse-fresh': { max: 2, windowMs: 60 * 1000 },  // 2 per min (hits external API)
}

// Human-readable descriptions for admin UI
export const RATE_LIMIT_DESCRIPTIONS: Record<RateLimitEndpoint, string> = {
  'reports': 'Value/bug reports (per user)',
  'gems': 'Gem balance checks (per user)',
  'events': 'Event data fetches (per IP)',
  'trade-requests': 'Trade request submissions (per user)',
  'brainrots': 'Brainrot data fetches (per IP)',
  'brainrots-all': 'Full brainrot list fetches (per IP)',
  'mutations': 'Mutation data fetches (per IP)',
  'traits': 'Trait data fetches (per IP)',
  'trades-create': 'Trade creations (per user)',
  'trades-search': 'Trade searches/filters (per IP)',
  'auth-challenge': 'Login challenge requests (per IP)',
  'auth-verify': 'Login verification attempts (per IP)',
  'admin-abuse': 'Admin abuse event fetches (per IP)',
  'admin-abuse-fresh': 'Admin abuse fresh fetches (per IP)',
}

// In-memory cache for rate limit configs
let rateLimitCache: Record<RateLimitEndpoint, RateLimitConfig> | null = null
let cacheLoadedAt = 0
const CACHE_TTL = 60 * 1000 // Refresh cache every 60 seconds

/**
 * Load rate limit configs from database (with caching)
 */
export async function loadRateLimitConfigs(): Promise<Record<RateLimitEndpoint, RateLimitConfig>> {
  const now = Date.now()

  // Return cached if still valid
  if (rateLimitCache && (now - cacheLoadedAt) < CACHE_TTL) {
    return rateLimitCache
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'rate_limits' }
    })

    if (config) {
      const parsed = JSON.parse(config.value) as Record<RateLimitEndpoint, RateLimitConfig>
      // Merge with defaults in case new endpoints were added
      rateLimitCache = { ...DEFAULT_RATE_LIMITS, ...parsed }
    } else {
      rateLimitCache = { ...DEFAULT_RATE_LIMITS }
    }

    cacheLoadedAt = now
    return rateLimitCache
  } catch (error) {
    console.error('Failed to load rate limit configs:', error)
    // Fall back to defaults on error
    return { ...DEFAULT_RATE_LIMITS }
  }
}

/**
 * Invalidate the rate limit cache (call after admin updates)
 */
export function invalidateRateLimitCache(): void {
  rateLimitCache = null
  cacheLoadedAt = 0
}

/**
 * Get rate limit config for a specific endpoint
 */
export async function getRateLimitConfig(endpoint: RateLimitEndpoint): Promise<RateLimitConfig> {
  const configs = await loadRateLimitConfigs()
  return configs[endpoint] || DEFAULT_RATE_LIMITS[endpoint]
}

/**
 * Save rate limit configs to database
 */
export async function saveRateLimitConfigs(
  configs: Record<RateLimitEndpoint, RateLimitConfig>
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: 'rate_limits' },
    create: {
      key: 'rate_limits',
      value: JSON.stringify(configs)
    },
    update: {
      value: JSON.stringify(configs)
    }
  })

  // Invalidate cache so next request picks up new values
  invalidateRateLimitCache()
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(identifier)

  if (!entry || entry.resetAt < now) {
    // Create new entry
    const resetAt = now + config.windowMs
    store.set(identifier, { count: 1, resetAt })
    return { allowed: true, remaining: config.max - 1, resetAt }
  }

  if (entry.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt }
}

/**
 * Check rate limit using dynamic config from database
 */
export async function checkRateLimitDynamic(
  identifier: string,
  endpoint: RateLimitEndpoint
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = await getRateLimitConfig(endpoint)
  return checkRateLimit(identifier, config)
}
