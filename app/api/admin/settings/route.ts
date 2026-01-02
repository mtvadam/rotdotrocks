import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog } from '@/lib/audit'
import {
  loadSiteSettings,
  saveSiteSettings,
  DEFAULT_SITE_SETTINGS,
  DEFAULT_SNOW_SETTINGS,
  isSnowSeason,
  type SiteSettings,
  type SnowSettings
} from '@/lib/site-settings'

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await loadSiteSettings()

  return NextResponse.json({
    settings,
    defaults: DEFAULT_SITE_SETTINGS,
    isSnowSeason: isSnowSeason()
  })
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { settings } = body as { settings: Partial<SiteSettings> }

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 })
    }

    // Validate snow settings
    if (settings.snowEnabled !== undefined && typeof settings.snowEnabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid snowEnabled value' }, { status: 400 })
    }

    // Validate snow object if provided
    if (settings.snow !== undefined) {
      if (typeof settings.snow !== 'object') {
        return NextResponse.json({ error: 'Invalid snow settings' }, { status: 400 })
      }
      const snow = settings.snow as Partial<SnowSettings>
      if (snow.variant !== undefined && !['square', 'round', 'snowflake'].includes(snow.variant)) {
        return NextResponse.json({ error: 'Invalid snow variant' }, { status: 400 })
      }
    }

    // Load current settings and deep merge
    const currentSettings = await loadSiteSettings()
    const newSettings: SiteSettings = {
      ...currentSettings,
      ...settings,
      snow: {
        ...DEFAULT_SNOW_SETTINGS,
        ...currentSettings.snow,
        ...(settings.snow || {})
      }
    }

    // Save to database
    await saveSiteSettings(newSettings)

    // Create audit log
    await createAuditLog(admin.id, 'SITE_SETTINGS_UPDATED', 'SYSTEM', 'site_settings', {
      changes: settings
    })

    return NextResponse.json({ success: true, settings: newSettings })
  } catch (error) {
    console.error('Failed to update site settings:', error)
    return NextResponse.json({ error: 'Failed to update site settings' }, { status: 500 })
  }
}
