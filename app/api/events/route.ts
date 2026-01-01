import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimitDynamic, getClientIp } from '@/lib/rate-limit'

// GET /api/events - Get all events for picker
export async function GET() {
  try {
    // Rate limit (configurable via admin panel)
    const ip = await getClientIp()
    const rateLimit = await checkRateLimitDynamic(`events:${ip}`, 'events')
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ events })
  } catch (error) {
    console.error('Get events error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
