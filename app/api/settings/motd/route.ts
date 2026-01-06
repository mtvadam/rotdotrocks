import { NextResponse } from 'next/server'
import { loadSiteSettings } from '@/lib/site-settings'

// Cache control for CDN caching
const CACHE_MAX_AGE = 60 // 1 minute

export async function GET() {
  const settings = await loadSiteSettings()

  return NextResponse.json(
    {
      enabled: settings.motd.enabled,
      message: settings.motd.message,
      type: settings.motd.type,
      dismissible: settings.motd.dismissible,
      showIcon: settings.motd.showIcon
    },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate`
      }
    }
  )
}
