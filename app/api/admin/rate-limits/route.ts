import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import {
  loadRateLimitConfigs,
  saveRateLimitConfigs,
  DEFAULT_RATE_LIMITS,
  RATE_LIMIT_DESCRIPTIONS,
  type RateLimitEndpoint,
  type RateLimitConfig
} from '@/lib/rate-limit'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const configs = await loadRateLimitConfigs()

  // Format for UI with descriptions
  const formatted = Object.entries(configs).map(([key, config]) => ({
    endpoint: key as RateLimitEndpoint,
    description: RATE_LIMIT_DESCRIPTIONS[key as RateLimitEndpoint] || key,
    max: config.max,
    windowMs: config.windowMs,
    windowDisplay: formatWindow(config.windowMs),
    isDefault: JSON.stringify(config) === JSON.stringify(DEFAULT_RATE_LIMITS[key as RateLimitEndpoint])
  }))

  return NextResponse.json({
    rateLimits: formatted,
    defaults: DEFAULT_RATE_LIMITS
  })
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { rateLimits } = body as {
      rateLimits: Array<{
        endpoint: RateLimitEndpoint
        max: number
        windowMs: number
      }>
    }

    if (!rateLimits || !Array.isArray(rateLimits)) {
      return NextResponse.json({ error: 'Invalid rate limits data' }, { status: 400 })
    }

    // Validate each rate limit
    for (const limit of rateLimits) {
      if (typeof limit.max !== 'number' || limit.max < 1) {
        return NextResponse.json({ error: `Invalid max value for ${limit.endpoint}` }, { status: 400 })
      }
      if (typeof limit.windowMs !== 'number' || limit.windowMs < 1000) {
        return NextResponse.json({ error: `Invalid window for ${limit.endpoint} (min 1 second)` }, { status: 400 })
      }
    }

    // Build config object
    const newConfigs: Record<RateLimitEndpoint, RateLimitConfig> = { ...DEFAULT_RATE_LIMITS }
    for (const limit of rateLimits) {
      newConfigs[limit.endpoint] = {
        max: limit.max,
        windowMs: limit.windowMs
      }
    }

    // Save to database
    await saveRateLimitConfigs(newConfigs)

    // Create audit log
    await createAuditLog(admin.id, 'RATE_LIMITS_UPDATED', 'SYSTEM', 'rate_limits', {
      changes: rateLimits.map(l => ({
        endpoint: l.endpoint,
        max: l.max,
        windowSeconds: Math.round(l.windowMs / 1000)
      }))
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update rate limits:', error)
    return NextResponse.json({ error: 'Failed to update rate limits' }, { status: 500 })
  }
}

function formatWindow(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds}s`
  const minutes = seconds / 60
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  return `${hours}h`
}
