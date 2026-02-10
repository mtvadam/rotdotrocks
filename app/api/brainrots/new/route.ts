import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Cache for 60 seconds
const CACHE_MAX_AGE = 60

// GET /api/brainrots/new - Get brainrots marked as "new" for homepage
export async function GET() {
  try {
    const newBrainrots = await prisma.brainrot.findMany({
      where: {
        isNew: true,
        isActive: true,
      },
      orderBy: [
        { newDisplayOrder: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        localImage: true,
        rarity: true,
        baseIncome: true,
        baseCost: true,
        robuxValue: true,
      },
      take: 12, // Max 12 for the display
    })

    // Serialize BigInt fields to strings (JSON.stringify can't handle BigInt natively)
    const serialized = newBrainrots.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      localImage: b.localImage,
      rarity: b.rarity,
      baseCost: b.baseCost.toString(),
      baseIncome: b.baseIncome.toString(),
      robuxValue: b.robuxValue ?? null,
    }))

    return NextResponse.json(
      { brainrots: serialized },
      {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate`,
        },
      }
    )
  } catch (error) {
    console.error('Failed to fetch new brainrots:', error)
    return NextResponse.json({ brainrots: [] })
  }
}
