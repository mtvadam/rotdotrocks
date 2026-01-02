import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const CRON_SECRET = process.env.CRON_SECRET

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

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const response = await fetch('https://abusetime.dev/games/steal-a-brainrot', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RotDotRocks/1.0)' },
    })

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }

    const html = await response.text()
    const now = new Date()
    const data: AdminAbuseData = { live: null, upcoming: null }

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

    await prisma.systemConfig.upsert({
      where: { key: 'admin_abuse_cache' },
      update: { value: JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }) },
      create: { key: 'admin_abuse_cache', value: JSON.stringify({ ...data, fetchedAt: new Date().toISOString() }) },
    })

    return NextResponse.json({ success: true, ...data })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
