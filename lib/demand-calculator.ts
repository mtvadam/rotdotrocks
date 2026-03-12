import { prisma } from '@/lib/db'

type DemandLevelDB = 'TERRIBLE' | 'LOW' | 'NORMAL' | 'HIGH' | 'AMAZING'
type TrendIndicatorDB = 'LOWERING' | 'STABLE' | 'RISING'

interface DemandResult {
  demand: DemandLevelDB
  trend: TrendIndicatorDB
  confidence: number
  dataPoints: number
  avgValue: number
  latestValue: number
}

const MIN_DAYS_FOR_DEMAND = 2

/**
 * Bulk calculate demand for all brainrots and update their demand/trend fields.
 * Only updates brainrots with >= 7 unique days of price data.
 * Uses the DEFAULT mutation's snapshots as the primary demand signal per brainrot.
 */
export async function calculateAllDemand(): Promise<{ updated: number; skipped: number }> {
  // Fetch all brainrots and ALL snapshots in two queries (no N+1)
  const [brainrots, allSnapshots] = await Promise.all([
    prisma.brainrot.findMany({
      where: { isActive: true },
      select: { id: true, demand: true, trend: true },
    }),
    prisma.priceSnapshot.findMany({
      where: { robuxPrice: { not: null, gt: 0 }, usedForDemand: true },
      orderBy: { createdAt: 'asc' },
      select: { brainrotId: true, mutationId: true, robuxPrice: true, createdAt: true },
    }),
  ])

  // Group snapshots by brainrotId, then by mutationId
  const snapshotsByBrainrot = new Map<string, Map<string, { robuxPrice: number; createdAt: Date }[]>>()
  for (const s of allSnapshots) {
    if (s.robuxPrice === null) continue
    let byMutation = snapshotsByBrainrot.get(s.brainrotId)
    if (!byMutation) {
      byMutation = new Map()
      snapshotsByBrainrot.set(s.brainrotId, byMutation)
    }
    const mutKey = s.mutationId
    let list = byMutation.get(mutKey)
    if (!list) {
      list = []
      byMutation.set(mutKey, list)
    }
    list.push({ robuxPrice: s.robuxPrice, createdAt: s.createdAt })
  }

  let updated = 0
  let skipped = 0

  // Find the default mutation ID (lowest multiplier, typically "Default")
  const defaultMutation = await prisma.mutation.findFirst({
    where: { isActive: true },
    orderBy: { multiplier: 'asc' },
    select: { id: true },
  })
  const defaultMutationId = defaultMutation?.id

  for (const brainrot of brainrots) {
    const byMutation = snapshotsByBrainrot.get(brainrot.id)
    if (!byMutation) {
      skipped++
      continue
    }

    // Prefer default mutation snapshots for demand signal, fall back to first mutation with data
    let snapshots = defaultMutationId ? byMutation.get(defaultMutationId) : undefined
    if (!snapshots || snapshots.length < 2) {
      // Fall back to the mutation with the most data points
      let bestKey: string | undefined
      let bestCount = 0
      for (const [key, list] of byMutation) {
        if (list.length > bestCount) {
          bestCount = list.length
          bestKey = key
        }
      }
      if (bestKey) snapshots = byMutation.get(bestKey)
    }

    if (!snapshots || snapshots.length < 2) {
      skipped++
      continue
    }

    // Count unique days of data
    const uniqueDays = new Set(snapshots.map(s => s.createdAt.toISOString().split('T')[0]))
    if (uniqueDays.size < MIN_DAYS_FOR_DEMAND) {
      skipped++
      continue
    }

    const dailyValues = deduplicateByDay(snapshots.map(s => ({
      value: s.robuxPrice,
      date: s.createdAt,
    })))

    const result = computeDemandFromSnapshots(dailyValues)

    if (result && (result.demand !== brainrot.demand || result.trend !== brainrot.trend)) {
      await prisma.brainrot.update({
        where: { id: brainrot.id },
        data: { demand: result.demand, trend: result.trend },
      })
      updated++
    } else {
      skipped++
    }
  }

  return { updated, skipped }
}

/**
 * Deduplicate snapshots by day — average multiple snapshots from the same day.
 */
function deduplicateByDay(data: { value: number; date: Date }[]): { value: number; date: Date }[] {
  const dayMap = new Map<string, { sum: number; count: number; date: Date }>()

  for (const d of data) {
    const dayKey = d.date.toISOString().split('T')[0]
    const existing = dayMap.get(dayKey)
    if (existing) {
      existing.sum += d.value
      existing.count++
    } else {
      dayMap.set(dayKey, { sum: d.value, count: 1, date: d.date })
    }
  }

  return Array.from(dayMap.values())
    .map(d => ({ value: Math.round(d.sum / d.count), date: d.date }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())
}

/**
 * Core algorithm: compute demand level and trend from daily price averages.
 *
 * TREND (recent 3 days vs prior period):
 * - RISING: Recent avg > prior avg by >5%
 * - LOWERING: Recent avg < prior avg by >5%
 * - STABLE: Within 5%
 *
 * DEMAND (latest value vs overall average + trend direction):
 * - AMAZING: >15% above avg AND rising
 * - HIGH: >8% above avg, OR above avg and rising
 * - NORMAL: Within ±8% of avg with stable trend
 * - LOW: >8% below avg, OR below avg and lowering
 * - TERRIBLE: >15% below avg AND lowering
 */
function computeDemandFromSnapshots(
  data: { value: number; date: Date }[]
): DemandResult | null {
  if (data.length < 2) return null

  const values = data.map(d => d.value)
  const latestValue = values[values.length - 1]

  // Overall average
  const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length

  // --- TREND: recent vs prior ---
  const recentCount = Math.min(3, Math.floor(values.length / 2))
  const recentValues = values.slice(-recentCount)
  const priorValues = values.slice(0, -recentCount)

  const recentAvg = recentValues.reduce((s, v) => s + v, 0) / recentValues.length
  const priorAvg = priorValues.length > 0
    ? priorValues.reduce((s, v) => s + v, 0) / priorValues.length
    : avgValue

  const changePercent = priorAvg > 0 ? ((recentAvg - priorAvg) / priorAvg) * 100 : 0

  let trend: TrendIndicatorDB = 'STABLE'
  if (changePercent > 5) trend = 'RISING'
  else if (changePercent < -5) trend = 'LOWERING'

  // --- DEMAND: latest value vs average + trend ---
  const deviationFromAvg = avgValue > 0 ? ((latestValue - avgValue) / avgValue) * 100 : 0

  let demand: DemandLevelDB = 'NORMAL'

  if (deviationFromAvg > 15 && trend === 'RISING') {
    demand = 'AMAZING'
  } else if (deviationFromAvg > 8 || (deviationFromAvg > 0 && trend === 'RISING')) {
    demand = 'HIGH'
  } else if (deviationFromAvg < -15 && trend === 'LOWERING') {
    demand = 'TERRIBLE'
  } else if (deviationFromAvg < -8 || (deviationFromAvg < 0 && trend === 'LOWERING')) {
    demand = 'LOW'
  }

  const confidence = Math.min(1, data.length / 14)

  return {
    demand,
    trend,
    confidence,
    dataPoints: data.length,
    avgValue: Math.round(avgValue),
    latestValue,
  }
}
