import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/admin/data - Get all data for management
export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const [brainrots, traits, mutations, events] = await Promise.all([
      prisma.brainrot.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          baseCost: true,
          baseIncome: true,
          rarity: true,
          demand: true,
          trend: true,
          isActive: true,
          isNew: true,
          newDisplayOrder: true,
          localImage: true,
        },
      }),
      prisma.trait.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          multiplier: true,
          isActive: true,
          localImage: true,
        },
      }),
      prisma.mutation.findMany({
        orderBy: { multiplier: 'asc' },
        select: {
          id: true,
          name: true,
          multiplier: true,
          isActive: true,
        },
      }),
      prisma.event.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          isActive: true,
          localImage: true,
        },
      }),
    ])

    return NextResponse.json({
      brainrots: brainrots.map(b => ({
        ...b,
        baseCost: b.baseCost.toString(),
        baseIncome: b.baseIncome.toString(),
      })),
      traits,
      mutations,
      events,
    })
  } catch (error) {
    console.error('Failed to fetch admin data')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
