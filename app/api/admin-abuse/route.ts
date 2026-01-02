import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimitDynamic, getClientIp } from '@/lib/rate-limit'

interface EventInfo {
  name: string
  description: string | null
  startUtc: string
  endUtc: string | null
  eventUrl: string | null
}

interface AdminAbuseData {
  live: EventInfo | null
  upcoming: EventInfo | null
}

async function fetchAndCache(): Promise<AdminAbuseData> {
  const data: AdminAbuseData = { live: null, upcoming: null }

  try {
    const response = await fetch('https://abusetime.dev/games/steal-a-brainrot', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      cache: 'no-store',
    })

    if (!response.ok) return data

    const html = await response.text()
    const now = new Date()

    // Find live events - data is escaped with \" (field order: name, eventUrl, description, startUtc, endUtc)
    const eventPattern = /\\"name\\":\\"([^"\\]+)\\"[^}]*?\\"eventUrl\\":\\"([^"\\]+)\\"[^}]*?\\"description\\":\\"([^"\\]+)\\"[^}]*?\\"startUtc\\":\\"([^"\\]+)\\"[^}]*?\\"endUtc\\":\\"([^"\\]+)\\"/g
    const matches = [...html.matchAll(eventPattern)]

    for (const match of matches) {
      const [, name, eventUrl, description, startUtc, endUtc] = match

      if (name.toUpperCase().includes('UPDATE')) continue

      const start = new Date(startUtc)
      const end = new Date(endUtc)

      if (start <= now && end > now) {
        data.live = { name, description, startUtc, endUtc, eventUrl }
        break
      }
    }

    // Get next Admin Abuse - escaped format (field order: name, slug, description, ..., nextStartUtc) - no eventUrl
    const abuseMatch = html.match(/\\"name\\":\\"Latest Admin Abuse\\"[^}]*?\\"description\\":\\"([^"\\]+)\\"[^}]*?\\"nextStartUtc\\":\\"([^"\\]+)\\"/)
    if (abuseMatch) {
      const [, description, nextStartUtc] = abuseMatch
      if (new Date(nextStartUtc) > now) {
        data.upcoming = { name: 'Admin Abuse', description, startUtc: nextStartUtc, endUtc: null, eventUrl: null }
      }
    }

    await cacheData(data)
    return data
  } catch {
    return data
  }
}

async function cacheData(data: AdminAbuseData) {
  await prisma.systemConfig.upsert({
    where: { key: 'admin_abuse_cache' },
    update: { value: JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }) },
    create: { key: 'admin_abuse_cache', value: JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }) },
  })
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const fresh = url.searchParams.get('fresh') === '1'
    const ip = await getClientIp()

    // Apply stricter rate limit for fresh requests (hits external API)
    const endpoint = fresh ? 'admin-abuse-fresh' : 'admin-abuse'
    const rateLimit = await checkRateLimitDynamic(`${endpoint}:${ip}`, endpoint)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } }
      )
    }

    if (!fresh) {
      const cached = await prisma.systemConfig.findUnique({
        where: { key: 'admin_abuse_cache' },
      })

      if (cached) {
        const parsed = JSON.parse(cached.value)
        // Only use cache if it has data and is less than 2 hours old
        const fetchedAt = parsed.fetchedAt ? new Date(parsed.fetchedAt) : null
        const isRecent = fetchedAt && (Date.now() - fetchedAt.getTime()) < 2 * 60 * 60 * 1000
        if (isRecent && (parsed.live || parsed.upcoming)) {
          return NextResponse.json({ live: parsed.live, upcoming: parsed.upcoming })
        }
      }
    }

    const data = await fetchAndCache()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ live: null, upcoming: null })
  }
}
