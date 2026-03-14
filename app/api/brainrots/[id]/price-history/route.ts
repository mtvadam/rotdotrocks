import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint for brainrot price history (last 30 days)
// ?mutationId=xxx to get history for a specific mutation (defaults to lowest multiplier)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brainrotId } = await params
    const mutationIdParam = request.nextUrl.searchParams.get('mutationId')

    const brainrot = await prisma.brainrot.findUnique({
      where: { id: brainrotId },
      select: { id: true, demand: true, trend: true },
    })

    if (!brainrot) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30)

    // Get all active mutations for the picker
    const allMutations = await prisma.mutation.findMany({
      where: { isActive: true },
      orderBy: { multiplier: 'asc' },
      select: { id: true, name: true, multiplier: true },
    })

    // Determine which mutation to query
    const targetMutationId = mutationIdParam || allMutations[0]?.id

    const rawSnapshots = await prisma.priceSnapshot.findMany({
      where: {
        brainrotId,
        createdAt: { gte: cutoffDate },
        robuxPrice: { not: null, gt: 0 },
        ...(targetMutationId ? { mutationId: targetMutationId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      select: { robuxPrice: true, listingCount: true, createdAt: true },
    })

    // Group by date, compute daily averages/min/max
    const dayMap = new Map<string, { sum: number; count: number; min: number; max: number; listings: number }>()
    for (const snap of rawSnapshots) {
      const date = snap.createdAt.toISOString().split('T')[0]
      const price = snap.robuxPrice!
      const existing = dayMap.get(date)
      if (existing) {
        existing.sum += price
        existing.count++
        existing.min = Math.min(existing.min, price)
        existing.max = Math.max(existing.max, price)
        existing.listings += snap.listingCount
      } else {
        dayMap.set(date, { sum: price, count: 1, min: price, max: price, listings: snap.listingCount })
      }
    }

    const history = Array.from(dayMap.entries())
      .map(([date, d]) => ({
        date,
        value: Math.round(d.sum / d.count),
        min: d.min,
        max: d.max,
        listings: d.listings,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      history,
      demand: brainrot.demand,
      trend: brainrot.trend,
      mutations: allMutations,
      activeMutationId: targetMutationId,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    })
  } catch (error) {
    console.error('Error fetching price history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
