/**
 * Site settings with database-backed configuration
 * Settings are cached in memory and refreshed when admin updates them
 */

import { prisma } from './db'

export interface SnowSettings {
  variant: 'square' | 'round' | 'snowflake'
  color: string
  pixelResolution: number
  speed: number
  density: number
  flakeSize: number
  minFlakeSize: number
  brightness: number
  depthFade: number
  farPlane: number
  direction: number
}

export interface MOTDSettings {
  enabled: boolean
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  dismissible: boolean
  showIcon: boolean
}

export interface SiteSettings {
  // Seasonal snow effect
  snowEnabled: boolean
  snow: SnowSettings
  // Message of the day
  motd: MOTDSettings
}

// Default settings
export const DEFAULT_SNOW_SETTINGS: SnowSettings = {
  variant: 'square',
  color: '#ffffff',
  pixelResolution: 80,
  speed: 0.8,
  density: 0.2,
  flakeSize: 0.006,
  minFlakeSize: 1.25,
  brightness: 1,
  depthFade: 8,
  farPlane: 29,
  direction: 100,
}

export const DEFAULT_MOTD_SETTINGS: MOTDSettings = {
  enabled: false,
  message: '',
  type: 'info',
  dismissible: true,
  showIcon: true,
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  snowEnabled: true,
  snow: DEFAULT_SNOW_SETTINGS,
  motd: DEFAULT_MOTD_SETTINGS,
}

// In-memory cache for site settings
let settingsCache: SiteSettings | null = null
let cacheLoadedAt = 0
const CACHE_TTL = 60 * 1000 // Refresh cache every 60 seconds

/**
 * Load site settings from database (with caching)
 */
export async function loadSiteSettings(): Promise<SiteSettings> {
  const now = Date.now()

  // Return cached if still valid
  if (settingsCache && (now - cacheLoadedAt) < CACHE_TTL) {
    return settingsCache
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'site_settings' }
    })

    if (config) {
      const parsed = JSON.parse(config.value) as Partial<SiteSettings>
      // Deep merge with defaults in case new settings were added
      settingsCache = {
        ...DEFAULT_SITE_SETTINGS,
        ...parsed,
        snow: { ...DEFAULT_SNOW_SETTINGS, ...(parsed.snow || {}) },
        motd: { ...DEFAULT_MOTD_SETTINGS, ...(parsed.motd || {}) }
      }
    } else {
      settingsCache = { ...DEFAULT_SITE_SETTINGS }
    }

    cacheLoadedAt = now
    return settingsCache
  } catch (error) {
    console.error('Failed to load site settings:', error)
    // Fall back to defaults on error
    return { ...DEFAULT_SITE_SETTINGS }
  }
}

/**
 * Invalidate the settings cache (call after admin updates)
 */
export function invalidateSiteSettingsCache(): void {
  settingsCache = null
  cacheLoadedAt = 0
}

/**
 * Save site settings to database
 */
export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key: 'site_settings' },
    create: {
      key: 'site_settings',
      value: JSON.stringify(settings)
    },
    update: {
      value: JSON.stringify(settings)
    }
  })

  // Invalidate cache so next request picks up new values
  invalidateSiteSettingsCache()
}

/**
 * Check if we're in the snow season (Dec 1 - Jan 31)
 */
export function isSnowSeason(): boolean {
  const now = new Date()
  const month = now.getMonth() // 0-indexed (0 = Jan, 11 = Dec)

  // December (11) or January (0)
  return month === 11 || month === 0
}

/**
 * Check if snow should be displayed
 * Returns true if:
 * - snowEnabled is true in settings AND
 * - Current date is in snow season (Dec 1 - Jan 31)
 */
export async function shouldShowSnow(): Promise<boolean> {
  if (!isSnowSeason()) {
    return false
  }

  const settings = await loadSiteSettings()
  return settings.snowEnabled
}
