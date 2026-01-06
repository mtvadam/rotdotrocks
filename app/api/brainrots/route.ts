import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { checkRateLimitDynamic, getClientIp } from '@/lib/rate-limit'

// GET /api/brainrots - Get brainrots for picker/search
export async function GET(request: NextRequest) {
  try {
    // Rate limit (configurable via admin panel)
    const ip = await getClientIp()
    const rateLimit = await checkRateLimitDynamic(`brainrots:${ip}`, 'brainrots')
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''

    const where: any = {
      isActive: true,
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const brainrots = await prisma.brainrot.findMany({
      where,
      select: {
        id: true,
        name: true,
        localImage: true,
        baseIncome: true,
        rarity: true,
        demand: true,
        trend: true,
        mutationValues: {
          select: {
            mutationId: true,
            robuxValue: true,
            mutation: {
              select: { name: true, multiplier: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    // Serialize BigInt and include all mutation values
    const serialized = brainrots.map((b) => ({
      id: b.id,
      name: b.name,
      localImage: b.localImage,
      baseIncome: b.baseIncome.toString(),
      rarity: b.rarity,
      demand: b.demand,
      trend: b.trend,
      robuxValue: b.mutationValues.find(mv => mv.mutation.name === 'Default')?.robuxValue || null,
      mutationValues: b.mutationValues.map(mv => ({
        mutationId: mv.mutationId,
        robuxValue: mv.robuxValue,
        mutationName: mv.mutation.name,
        mutationMultiplier: mv.mutation.multiplier,
      })),
    }))

    return NextResponse.json({ brainrots: serialized })
  } catch (error) {
    console.error('Get brainrots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
