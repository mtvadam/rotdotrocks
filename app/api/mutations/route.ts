import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimitDynamic, getClientIp } from '@/lib/rate-limit'

// GET /api/mutations - Get all mutations for picker
export async function GET() {
  try {
    // Rate limit (configurable via admin panel)
    const ip = await getClientIp()
    const rateLimit = await checkRateLimitDynamic(`mutations:${ip}`, 'mutations')
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const mutations = await prisma.mutation.findMany({
      select: {
        id: true,
        name: true,
        multiplier: true,
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({ mutations })
  } catch (error) {
    console.error('Get mutations error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
