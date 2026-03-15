import { NextResponse } from 'next/server'
import { requireAdmin, requireModOrAdmin } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { fetchAllBrainrotPrices, type PriceResult } from '@/lib/price-fetcher'
import { calculateAllDemand } from '@/lib/demand-calculator'

export const maxDuration = 300

const PROGRESS_KEY = 'price_import_progress'
const LOCK_KEY = 'price_import_running'

async function saveProgress(fetched: number, total: number) {
  console.log(`[snapshot-progress] ${fetched}/${total}`)
  await prisma.systemConfig.upsert({
    where: { key: PROGRESS_KEY },
    update: { value: JSON.stringify({ fetched, total, updatedAt: Date.now() }) },
    create: { key: PROGRESS_KEY, value: JSON.stringify({ fetched, total, updatedAt: Date.now() }) },
  })
}

// GET - check snapshot progress
export async function GET() {
  try {
    await requireModOrAdmin()
    const [lock, progress] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: LOCK_KEY } }),
      prisma.systemConfig.findUnique({ where: { key: PROGRESS_KEY } }),
    ])

    const running = lock?.value === 'true'
    const prog = progress ? JSON.parse(progress.value) : null
    console.log('[snapshot-status] GET:', { running, prog })

    // Auto-clear stale locks (lock set >10 min ago with no progress, or progress stale >10 min)
    if (running) {
      const lockAge = lock?.updatedAt ? Date.now() - new Date(lock.updatedAt).getTime() : Infinity
      const progAge = prog?.updatedAt ? Date.now() - prog.updatedAt : Infinity
      const stale = Math.min(lockAge, progAge) > 600_000
      if (stale) {
        console.log('[snapshot-status] clearing stale lock, lockAge:', lockAge, 'progAge:', progAge)
        await prisma.systemConfig.upsert({
          where: { key: LOCK_KEY },
          update: { value: 'false' },
          create: { key: LOCK_KEY, value: 'false' },
        })
        return NextResponse.json({ running: false })
      }
    }

    return NextResponse.json({
      running,
      fetched: prog?.fetched ?? 0,
      total: prog?.total ?? 0,
    })
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - manually trigger a price snapshot (admin only)
export async function POST() {
  try {
    await requireAdmin()

    const lock = await prisma.systemConfig.findUnique({ where: { key: LOCK_KEY } })
    if (lock?.value === 'true') {
      return NextResponse.json({ error: 'A snapshot is already in progress' }, { status: 409 })
    }

    console.log('[snapshot-trigger] POST: starting, setting lock')
    // Set lock
    await prisma.systemConfig.upsert({
      where: { key: LOCK_KEY },
      update: { value: 'true' },
      create: { key: LOCK_KEY, value: 'true' },
    })

    try {
      console.log('[snapshot-trigger] calling fetchAllBrainrotPrices...')
      let snapshotsCreated = 0

      const onBatchComplete = async (batchResults: PriceResult[]) => {
        const snapshots = batchResults.map(r => ({
          brainrotId: r.brainrotId,
          mutationId: r.mutationId,
          usdPrice: r.usdPrice,
          robuxPrice: r.robuxPrice,
          listingCount: r.listingCount,
          isOutlier: r.isOutlier,
          appliedToValues: false,
          source: 'eldorado',
        }))
        await prisma.priceSnapshot.createMany({ data: snapshots })
        snapshotsCreated += snapshots.length
      }

      const results = await fetchAllBrainrotPrices({
        onProgress: saveProgress,
        onBatchComplete,
        batchSize: 10,
        batchDelay: 200,
        fetchTimeout: 8000,
      })

      // Update robuxValue from latest non-outlier prices (single source of truth)
      const validPrices = results.filter(r => r.robuxPrice != null && r.robuxPrice > 0 && !r.isOutlier)
      let valuesUpdated = 0
      if (validPrices.length > 0) {
        const latestByKey = new Map<string, number>()
        for (const r of validPrices) {
          latestByKey.set(`${r.brainrotId}:${r.mutationId}`, r.robuxPrice!)
        }
        for (const [key, price] of latestByKey) {
          const [brainrotId, mutationId] = key.split(':')
          await prisma.brainrotMutationValue.upsert({
            where: { brainrotId_mutationId: { brainrotId, mutationId } },
            update: { robuxValue: price },
            create: { brainrotId, mutationId, robuxValue: price },
          })
          valuesUpdated++
        }
      }

      const demandResult = await calculateAllDemand()

      const logData = {
        totalFetched: results.length,
        snapshotsCreated,
        valuesUpdated,
        demandUpdated: demandResult.updated,
        demandSkipped: demandResult.skipped,
        withPrice: results.filter(r => r.robuxPrice !== null).length,
        outliers: results.filter(r => r.isOutlier).length,
        errors: results.filter(r => r.error).length,
        fetchedAt: new Date().toISOString(),
        triggeredManually: true,
      }

      await prisma.systemConfig.upsert({
        where: { key: 'last_price_import' },
        update: { value: JSON.stringify(logData) },
        create: { key: 'last_price_import', value: JSON.stringify(logData) },
      })

      return NextResponse.json({ success: true, ...logData })
    } finally {
      await prisma.systemConfig.upsert({
        where: { key: LOCK_KEY },
        update: { value: 'false' },
        create: { key: LOCK_KEY, value: 'false' },
      })
    }
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Manual snapshot trigger error:', error)
    return NextResponse.json({ error: 'Failed to take snapshot' }, { status: 500 })
  }
}
