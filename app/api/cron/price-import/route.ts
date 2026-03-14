import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAllBrainrotPrices, type PriceResult } from '@/lib/price-fetcher'
import { calculateAllDemand } from '@/lib/demand-calculator'

const CRON_SECRET = process.env.CRON_SECRET

export const maxDuration = 300 // 5 min max for Vercel

export async function GET(request: Request) {
  // Fail closed: require CRON_SECRET to be set
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let snapshotsCreated = 0

  try {
    // Save snapshots incrementally as each batch completes
    // so partial progress is preserved even if the function times out
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
      onBatchComplete,
      batchSize: 10,    // higher concurrency for cron (no UI to block)
      batchDelay: 200,
      fetchTimeout: 8000,
    })

    // Update BrainrotMutationValue.robuxValue from latest non-outlier prices
    // so there's one source of truth across the app
    const validPrices = results.filter(r => r.robuxPrice != null && r.robuxPrice > 0 && !r.isOutlier)
    let valuesUpdated = 0
    if (validPrices.length > 0) {
      // Group by brainrotId+mutationId, take latest price per combo
      const latestByKey = new Map<string, number>()
      for (const r of validPrices) {
        const key = `${r.brainrotId}:${r.mutationId}`
        latestByKey.set(key, r.robuxPrice!)
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

    // Calculate demand/trend based on price history
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
    }

    await prisma.systemConfig.upsert({
      where: { key: 'last_price_import' },
      update: { value: JSON.stringify(logData) },
      create: { key: 'last_price_import', value: JSON.stringify(logData) },
    })

    return NextResponse.json({ success: true, ...logData })
  } catch (error) {
    console.error('Cron price import error:', error)
    // Even on error, log how many snapshots were saved
    console.log(`[cron] Saved ${snapshotsCreated} snapshots before error`)
    return NextResponse.json({ error: 'Failed', snapshotsSaved: snapshotsCreated }, { status: 500 })
  }
}
