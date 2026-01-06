import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireModOrAdmin } from '@/lib/auth'

// GET /api/admin/usd-values - Get all brainrots with Robux values and mutations
export async function GET() {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const [brainrots, mutations] = await Promise.all([
      prisma.brainrot.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          localImage: true,
          robuxValue: true,
          rarity: true,
          demand: true,
          trend: true,
          mutationValues: {
            include: {
              mutation: {
                select: {
                  id: true,
                  name: true,
                  multiplier: true,
                },
              },
            },
          },
        },
      }),
      prisma.mutation.findMany({
        where: { isActive: true },
        orderBy: { multiplier: 'asc' },
        select: {
          id: true,
          name: true,
          multiplier: true,
        },
      }),
    ])

    return NextResponse.json({
      brainrots,
      mutations,
    })
  } catch (error) {
    console.error('Error fetching Robux values:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
