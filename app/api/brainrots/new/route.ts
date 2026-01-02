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
      },
      take: 12, // Max 12 for the display
    })

    return NextResponse.json(
      { brainrots: newBrainrots },
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
