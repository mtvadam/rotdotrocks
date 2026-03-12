import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { fetchAllBrainrotPrices } from '@/lib/price-fetcher'
import { calculateAllDemand } from '@/lib/demand-calculator'

const CRON_SECRET = process.env.CRON_SECRET

export const maxDuration = 300 // 5 min max for Vercel

export async function GET(request: Request) {
  // Fail closed: require CRON_SECRET to be set
  const authHeader = request.headers.get('authorization')
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Step 1: Fetch all prices from Eldorado
    const results = await fetchAllBrainrotPrices()

    // Step 2: Record price snapshots (not applied to values — requires manual review)
    const snapshots = results
      .filter(r => r.robuxPrice !== null)
      .map(r => ({
        brainrotId: r.brainrotId,
        mutationId: r.mutationId,
        usdPrice: r.usdPrice,
        robuxPrice: r.robuxPrice,
        listingCount: r.listingCount,
        isOutlier: r.isOutlier,
        appliedToValues: false,
        source: 'eldorado',
      }))

    if (snapshots.length > 0) {
      await prisma.priceSnapshot.createMany({ data: snapshots })
    }

    // Step 3: Calculate demand/trend based on price history
    const demandResult = await calculateAllDemand()

    // Step 4: Log results to SystemConfig
    const logData = {
      totalFetched: results.length,
      snapshotsCreated: snapshots.length,
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
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
