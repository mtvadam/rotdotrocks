import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireModOrAdmin } from '@/lib/auth'

// GET /api/admin/usd-values/history?brainrotId=xxx&days=30
export async function GET(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { searchParams } = request.nextUrl
    const brainrotId = searchParams.get('brainrotId')
    const days = parseInt(searchParams.get('days') || '30', 10)

    if (!brainrotId) {
      return NextResponse.json({ error: 'brainrotId is required' }, { status: 400 })
    }

    if (isNaN(days) || days < 1 || days > 365) {
      return NextResponse.json({ error: 'days must be between 1 and 365' }, { status: 400 })
    }

    // Verify brainrot exists
    const brainrot = await prisma.brainrot.findUnique({
      where: { id: brainrotId },
      select: { id: true, name: true, demand: true, trend: true },
    })

    if (!brainrot) {
      return NextResponse.json({ error: 'Brainrot not found' }, { status: 404 })
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    // Fetch all snapshots within the date range
    const rawSnapshots = await prisma.priceSnapshot.findMany({
      where: {
        brainrotId,
        createdAt: { gte: cutoffDate },
        robuxPrice: { not: null, gt: 0 },
      },
      include: {
        mutation: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Group by date (YYYY-MM-DD) and mutationId, compute averages
    const groupMap = new Map<string, {
      date: string
      mutationId: string
      mutationName: string
      totalRobux: number
      count: number
      usedForDemandCount: number
    }>()

    for (const snap of rawSnapshots) {
      const date = snap.createdAt.toISOString().split('T')[0]
      const key = `${date}|${snap.mutationId}`

      const existing = groupMap.get(key)
      if (existing) {
        existing.totalRobux += snap.robuxPrice!
        existing.count += 1
        if (snap.usedForDemand) existing.usedForDemandCount += 1
      } else {
        groupMap.set(key, {
          date,
          mutationId: snap.mutationId,
          mutationName: snap.mutation.name,
          totalRobux: snap.robuxPrice!,
          count: 1,
          usedForDemandCount: snap.usedForDemand ? 1 : 0,
        })
      }
    }

    // Build flat snapshot array sorted by date desc, then mutation name
    const snapshots = Array.from(groupMap.values())
      .map((g) => ({
        date: g.date,
        mutationId: g.mutationId,
        mutationName: g.mutationName,
        avgRobuxPrice: Math.round(g.totalRobux / g.count),
        count: g.count,
        usedForDemand: g.usedForDemandCount > 0,
      }))
      .sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date)
        if (dateCompare !== 0) return dateCompare
        return a.mutationName.localeCompare(b.mutationName)
      })

    // Demand info from usedForDemand snapshots only
    const demandSnapshots = rawSnapshots.filter((s) => s.usedForDemand)
    const uniqueDays = new Set(demandSnapshots.map((s) => s.createdAt.toISOString().split('T')[0]))

    const demandInfo = {
      demand: brainrot.demand,
      trend: brainrot.trend,
      totalSnapshots: demandSnapshots.length,
      uniqueDays: uniqueDays.size,
    }

    return NextResponse.json({ snapshots, demandInfo })
  } catch (error) {
    console.error('Error fetching price history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
