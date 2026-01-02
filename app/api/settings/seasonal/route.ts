import { NextResponse } from 'next/server'
import { loadSiteSettings, isSnowSeason } from '@/lib/site-settings'

// Cache control for CDN caching
const CACHE_MAX_AGE = 60 // 1 minute

export async function GET() {
  const settings = await loadSiteSettings()
  const inSeason = isSnowSeason()

  const showSnow = settings.snowEnabled && inSeason

  return NextResponse.json(
    {
      showSnow,
      snow: showSnow ? settings.snow : null,
      isSnowSeason: inSeason
    },
    {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate`
      }
    }
  )
}
