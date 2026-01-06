import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimitDynamic, getClientIp } from '@/lib/rate-limit'

// GET /api/brainrots/all - Get all brainrots for showcase
export async function GET() {
  try {
    // Rate limit (configurable via admin panel)
    const ip = await getClientIp()
    const rateLimit = await checkRateLimitDynamic(`brainrots-all:${ip}`, 'brainrots-all')
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const brainrots = await prisma.brainrot.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        localImage: true,
        baseCost: true,
        baseIncome: true,
        rarity: true,
        mutationValues: {
          where: {
            mutation: { name: 'Default' }
          },
          select: {
            robuxValue: true,
          },
          take: 1,
        },
      },
      orderBy: { baseIncome: 'desc' },
    })

    // Serialize BigInt and extract default robux value
    const serialized = brainrots.map((b) => ({
      id: b.id,
      name: b.name,
      imageUrl: b.imageUrl,
      localImage: b.localImage,
      baseCost: b.baseCost.toString(),
      baseIncome: b.baseIncome.toString(),
      rarity: b.rarity,
      robuxValue: b.mutationValues[0]?.robuxValue || null,
    }))

    return NextResponse.json({ brainrots: serialized })
  } catch (error) {
    console.error('Get all brainrots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
