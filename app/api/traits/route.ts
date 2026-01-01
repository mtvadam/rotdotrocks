import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimitDynamic, getClientIp } from '@/lib/rate-limit'

// GET /api/traits - Get traits for picker
export async function GET(request: NextRequest) {
  try {
    // Rate limit (configurable via admin panel)
    const ip = await getClientIp()
    const rateLimit = await checkRateLimitDynamic(`traits:${ip}`, 'traits')
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: any = {}
    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const traits = await prisma.trait.findMany({
      where,
      select: {
        id: true,
        name: true,
        localImage: true,
        multiplier: true,
      },
      orderBy: { name: 'asc' },
      take: 100,
    })

    return NextResponse.json({ traits })
  } catch (error) {
    console.error('Get traits error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
