import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireModOrAdmin } from '@/lib/auth'

// GET: List snapshots grouped by day, with counts and usedForDemand status
export async function GET(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '14')

  const since = new Date()
  since.setDate(since.getDate() - days)

  const snapshots = await prisma.priceSnapshot.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      brainrotId: true,
      mutationId: true,
      usdPrice: true,
      robuxPrice: true,
      listingCount: true,
      isOutlier: true,
      usedForDemand: true,
      appliedToValues: true,
      source: true,
      createdAt: true,
      brainrot: { select: { name: true } },
      mutation: { select: { name: true } },
    },
  })

  // Group by import batch (snapshots created within 10 minutes of each other)
  const batches: {
    id: string
    date: string
    time: string
    count: number
    usedForDemand: boolean
    appliedToValues: boolean
    snapshotIds: string[]
    createdAt: string
  }[] = []

  let currentBatch: typeof batches[0] | null = null

  for (const s of snapshots) {
    const ts = new Date(s.createdAt).getTime()
    const date = s.createdAt.toISOString().split('T')[0]
    const time = s.createdAt.toISOString().split('T')[1].substring(0, 5)

    if (
      currentBatch &&
      currentBatch.date === date &&
      Math.abs(ts - new Date(currentBatch.createdAt).getTime()) < 10 * 60 * 1000
    ) {
      currentBatch.count++
      currentBatch.snapshotIds.push(s.id)
      if (s.usedForDemand) currentBatch.usedForDemand = true
      // Batch is only fully applied if ALL snapshots are applied
      if (!s.appliedToValues) currentBatch.appliedToValues = false
    } else {
      currentBatch = {
        id: s.id,
        date,
        time,
        count: 1,
        usedForDemand: s.usedForDemand,
        appliedToValues: s.appliedToValues,
        snapshotIds: [s.id],
        createdAt: s.createdAt.toISOString(),
      }
      batches.push(currentBatch)
    }
  }

  return NextResponse.json({ batches, totalSnapshots: snapshots.length })
}

// PATCH: Toggle usedForDemand for a batch of snapshots (admin only)
export async function PATCH(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { snapshotIds, usedForDemand } = body as {
    snapshotIds: string[]
    usedForDemand: boolean
  }

  if (!snapshotIds || !Array.isArray(snapshotIds)) {
    return NextResponse.json({ error: 'Missing snapshotIds' }, { status: 400 })
  }

  await prisma.priceSnapshot.updateMany({
    where: { id: { in: snapshotIds } },
    data: { usedForDemand },
  })

  return NextResponse.json({ updated: snapshotIds.length, usedForDemand })
}
