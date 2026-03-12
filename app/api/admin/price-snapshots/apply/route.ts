import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireModOrAdmin } from '@/lib/auth'
import { interpolateValues } from '@/lib/value-interpolation'

// PUT: Preview interpolated values for a batch (dry run)
export async function PUT(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { snapshotIds } = body as { snapshotIds: string[] }

  if (!snapshotIds?.length) {
    return NextResponse.json({ error: 'snapshotIds required' }, { status: 400 })
  }

  const preview = await buildPreview(snapshotIds)
  return NextResponse.json(preview)
}

// POST: Apply verified brainrots to dataset (admin) or submit for review (mod)
export async function POST(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { snapshotIds, verifiedBrainrotIds, overrides } = body as {
    snapshotIds: string[]
    verifiedBrainrotIds?: string[] // only apply these brainrots (partial apply)
    overrides?: Record<string, Record<string, number>>
  }

  if (!snapshotIds?.length) {
    return NextResponse.json({ error: 'snapshotIds required' }, { status: 400 })
  }

  // If user is MOD, save as pending review instead of applying
  if (user.role === 'MOD') {
    const review = await prisma.priceReview.create({
      data: {
        reviewerId: user.id,
        snapshotIds: snapshotIds,
        verifiedBrainrotIds: [...(verifiedBrainrotIds || [])],
        overrides: overrides || undefined,
      },
    })
    return NextResponse.json({ submitted: true, reviewId: review.id })
  }

  const preview = await buildPreview(snapshotIds)

  // Filter to only verified brainrots if specified
  const brainrotsToApply = verifiedBrainrotIds
    ? preview.brainrots.filter(b => verifiedBrainrotIds.includes(b.brainrotId))
    : preview.brainrots

  const finalValues = brainrotsToApply.map(b => {
    const brainrotOverrides = overrides?.[b.brainrotId]
    return {
      brainrotId: b.brainrotId,
      // Only save mutations that have new data (from snapshot or override)
      values: b.mutations
        .filter(v => (v.hasNewData || brainrotOverrides?.[v.mutationId] !== undefined) && (brainrotOverrides?.[v.mutationId] ?? v.finalValue) !== null)
        .map(v => ({
          mutationId: v.mutationId,
          robuxValue: (brainrotOverrides?.[v.mutationId] ?? v.finalValue) as number,
        })),
    }
  }).filter(b => b.values.length > 0)

  const ops = finalValues.flatMap(b =>
    b.values.map(v =>
      prisma.brainrotMutationValue.upsert({
        where: { brainrotId_mutationId: { brainrotId: b.brainrotId, mutationId: v.mutationId } },
        create: { brainrotId: b.brainrotId, mutationId: v.mutationId, robuxValue: v.robuxValue },
        update: { robuxValue: v.robuxValue },
      })
    )
  )

  const BATCH = 500
  for (let i = 0; i < ops.length; i += BATCH) {
    await prisma.$transaction(ops.slice(i, i + BATCH))
  }

  // If ALL brainrots were applied, mark snapshots as applied
  const allApplied = !verifiedBrainrotIds || verifiedBrainrotIds.length >= preview.brainrots.length
  if (allApplied) {
    await prisma.priceSnapshot.updateMany({
      where: { id: { in: snapshotIds } },
      data: { appliedToValues: true },
    })
  }

  return NextResponse.json({
    applied: true,
    brainrotsUpdated: finalValues.length,
    valuesUpdated: ops.length,
    fullyApplied: allApplied,
  })
}

export async function buildPreview(snapshotIds: string[]) {
  // Fetch all active mutations
  const allMutations = await prisma.mutation.findMany({
    where: { isActive: true },
    orderBy: { multiplier: 'asc' },
    select: { id: true, name: true, multiplier: true },
  })

  // Fetch snapshots
  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      id: { in: snapshotIds },
      robuxPrice: { not: null },
    },
    include: {
      brainrot: { select: { id: true, name: true, localImage: true } },
      mutation: { select: { id: true, name: true, multiplier: true } },
    },
  })

  // Get unique brainrot IDs from snapshots
  const brainrotIds = [...new Set(snapshots.map(s => s.brainrotId))]

  // Fetch current stored values for all these brainrots
  const currentValues = await prisma.brainrotMutationValue.findMany({
    where: { brainrotId: { in: brainrotIds } },
    select: { brainrotId: true, mutationId: true, robuxValue: true },
  })

  const currentValueMap = new Map<string, number>()
  for (const v of currentValues) {
    currentValueMap.set(`${v.brainrotId}:${v.mutationId}`, v.robuxValue)
  }

  // Group snapshots by brainrot
  const byBrainrot = new Map<string, typeof snapshots>()
  for (const s of snapshots) {
    let list = byBrainrot.get(s.brainrotId)
    if (!list) { list = []; byBrainrot.set(s.brainrotId, list) }
    list.push(s)
  }

  const brainrots = []

  for (const [brainrotId, brainrotSnapshots] of byBrainrot) {
    const first = brainrotSnapshots[0]

    // Average multiple snapshots for same mutation
    const snapshotByMutation = new Map<string, { sum: number; count: number; outlierCount: number; listingCount: number }>()
    for (const s of brainrotSnapshots) {
      if (s.robuxPrice === null) continue
      const existing = snapshotByMutation.get(s.mutationId)
      if (existing) {
        existing.sum += s.robuxPrice
        existing.count++
        existing.listingCount += s.listingCount ?? 0
        if (s.isOutlier) existing.outlierCount++
      } else {
        snapshotByMutation.set(s.mutationId, {
          sum: s.robuxPrice,
          count: 1,
          outlierCount: s.isOutlier ? 1 : 0,
          listingCount: s.listingCount ?? 0,
        })
      }
    }

    // Build entries for interpolation (only non-outlier)
    const interpEntries: { mutationId: string; multiplier: number; robuxValue: number }[] = []
    for (const [mutId, data] of snapshotByMutation) {
      const avg = Math.round(data.sum / data.count)
      const allOutlier = data.outlierCount === data.count
      if (!allOutlier && avg > 0) {
        const mut = allMutations.find(m => m.id === mutId)
        if (mut) interpEntries.push({ mutationId: mutId, multiplier: mut.multiplier, robuxValue: avg })
      }
    }

    // Run interpolation
    const interpolated = interpEntries.length >= 2
      ? interpolateValues(interpEntries)
      : interpEntries
    const interpMap = new Map(interpolated.map(v => [v.mutationId, v.robuxValue]))

    // Build full mutation list
    const mutations = allMutations.map(mut => {
      const snapData = snapshotByMutation.get(mut.id)
      const currentStored = currentValueMap.get(`${brainrotId}:${mut.id}`) ?? null
      const rawValue = snapData ? Math.round(snapData.sum / snapData.count) : null
      const isOutlier = snapData ? snapData.outlierCount === snapData.count : false
      const hasNewData = rawValue !== null && !isOutlier && rawValue > 0
      const interpolatedValue = interpMap.get(mut.id) ?? null
      // When outlier, skip rawValue and keep current stored value
      const finalValue = interpolatedValue ?? (isOutlier ? null : rawValue) ?? currentStored

      return {
        mutationId: mut.id,
        mutationName: mut.name,
        multiplier: mut.multiplier,
        currentValue: currentStored,
        rawValue,
        interpolatedValue,
        finalValue,
        changed: hasNewData && interpolatedValue !== null && rawValue !== interpolatedValue,
        isOutlier,
        hasNewData,
        noData: rawValue === null,
        suspicious: false as boolean,
        suspiciousReason: null as string | null,
        listingCount: snapData?.listingCount ?? 0,
      }
    })

    // Detect suspicious values: inversions, outlier jumps, and large changes vs stored
    const withData = mutations.filter(m => m.finalValue !== null && m.hasNewData)
    for (let i = 0; i < withData.length; i++) {
      const curr = withData[i]
      const prev = i > 0 ? withData[i - 1] : null
      const next = i < withData.length - 1 ? withData[i + 1] : null

      // Inversion: higher multiplier but lower value than previous
      if (prev && curr.finalValue! < prev.finalValue! && curr.multiplier > prev.multiplier) {
        curr.suspicious = true
        curr.suspiciousReason = `Lower than ${prev.mutationName} (${prev.multiplier}x = R$${prev.finalValue!.toLocaleString()})`
      }

      // Inversion: lower multiplier but higher value than next
      if (next && curr.finalValue! > next.finalValue! && curr.multiplier < next.multiplier) {
        curr.suspicious = true
        curr.suspiciousReason = `Higher than ${next.mutationName} (${next.multiplier}x = R$${next.finalValue!.toLocaleString()})`
      }

      // Big jump: value is more than 2x the expected linear interpolation between neighbors
      if (prev && next && prev.finalValue && next.finalValue && curr.finalValue) {
        const expected = prev.finalValue + (next.finalValue - prev.finalValue) *
          ((curr.multiplier - prev.multiplier) / (next.multiplier - prev.multiplier))
        if (expected > 0 && (curr.finalValue > expected * 2 || curr.finalValue < expected * 0.4)) {
          curr.suspicious = true
          curr.suspiciousReason = curr.suspiciousReason
            ? curr.suspiciousReason + '; '
            : ''
          curr.suspiciousReason += `Expected ~R$${Math.round(expected).toLocaleString()} based on neighbors`
        }
      }

      // Large change vs previous stored value (>3x or <0.33x)
      if (curr.currentValue && curr.finalValue && curr.currentValue > 0) {
        const ratio = curr.finalValue / curr.currentValue
        if (ratio > 3 || ratio < 0.33) {
          curr.suspicious = true
          curr.suspiciousReason = curr.suspiciousReason
            ? curr.suspiciousReason + '; '
            : ''
          curr.suspiciousReason += `R$${curr.finalValue.toLocaleString()} vs previous R$${curr.currentValue.toLocaleString()} (${ratio.toFixed(1)}x change)`
        }
      }
    }

    const hasSuspicious = mutations.some(v => v.suspicious)

    brainrots.push({
      brainrotId,
      brainrotName: first.brainrot.name,
      localImage: first.brainrot.localImage,
      hasChanges: mutations.some(v => v.changed),
      hasSuspicious,
      mutations,
    })
  }

  brainrots.sort((a, b) => {
    // Suspicious first, then changes, then alphabetical
    if (a.hasSuspicious !== b.hasSuspicious) return a.hasSuspicious ? -1 : 1
    if (a.hasChanges !== b.hasChanges) return a.hasChanges ? -1 : 1
    return a.brainrotName.localeCompare(b.brainrotName)
  })

  return { brainrots, totalSnapshots: snapshots.length }
}
