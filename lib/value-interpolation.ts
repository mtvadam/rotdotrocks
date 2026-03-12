import { prisma } from '@/lib/db'

interface MutationValueEntry {
  mutationId: string
  multiplier: number
  robuxValue: number
}

/**
 * Interpolate consecutive duplicate mutation values for a brainrot.
 *
 * When multiple consecutive mutations (ordered by multiplier) share the same
 * robux value, interpolate them so higher-multiplier mutations get higher values.
 *
 * Two cases:
 *
 * 1. Duplicates at the START (no previous different value):
 *    Divide the value evenly. E.g. [100, 100, 100, 600] → [33, 67, 100, 600]
 *
 * 2. Duplicates in the MIDDLE (has a previous lower value):
 *    Interpolate between the previous value and the duplicate value.
 *    E.g. [250, 400, 400, 400] → [250, 300, 350, 400]
 */
export function interpolateValues(entries: MutationValueEntry[]): MutationValueEntry[] {
  if (entries.length < 2) return entries

  // Sort by multiplier ascending
  const sorted = entries.map(e => ({ ...e })).sort((a, b) => a.multiplier - b.multiplier)

  let i = 0
  while (i < sorted.length) {
    // Find the end of this consecutive group with the same value
    let j = i + 1
    while (j < sorted.length && sorted[j].robuxValue === sorted[i].robuxValue) {
      j++
    }

    const groupLen = j - i
    if (groupLen > 1) {
      const dupeValue = sorted[i].robuxValue
      const prevValue = i > 0 ? sorted[i - 1].robuxValue : 0

      if (i === 0) {
        // Case 1: At the start — divide the value
        // first = val * 1/count, ..., last = val * count/count = val
        for (let k = 0; k < groupLen; k++) {
          sorted[i + k].robuxValue = Math.round(dupeValue * (k + 1) / groupLen)
        }
      } else {
        // Case 2: In the middle — interpolate between prevValue and dupeValue
        // first = prev + diff * 1/count, ..., last = prev + diff * count/count = dupeValue
        const diff = dupeValue - prevValue
        for (let k = 0; k < groupLen; k++) {
          sorted[i + k].robuxValue = Math.round(prevValue + diff * (k + 1) / groupLen)
        }
      }
    }

    i = j
  }

  return sorted
}

/**
 * Run interpolation on all brainrots that have mutation values and save the results.
 * Returns count of brainrots modified.
 */
export async function interpolateAllBrainrotValues(): Promise<{ updated: number; skipped: number }> {
  const mutations = await prisma.mutation.findMany({
    where: { isActive: true },
    orderBy: { multiplier: 'asc' },
    select: { id: true, multiplier: true },
  })

  const mutationMap = new Map(mutations.map(m => [m.id, m.multiplier]))

  const allValues = await prisma.brainrotMutationValue.findMany({
    select: { brainrotId: true, mutationId: true, robuxValue: true },
  })

  // Group by brainrotId
  const byBrainrot = new Map<string, { mutationId: string; robuxValue: number }[]>()
  for (const v of allValues) {
    let list = byBrainrot.get(v.brainrotId)
    if (!list) {
      list = []
      byBrainrot.set(v.brainrotId, list)
    }
    list.push({ mutationId: v.mutationId, robuxValue: v.robuxValue })
  }

  let updated = 0
  let skipped = 0
  const updates: Array<{ brainrotId: string; mutationId: string; robuxValue: number }> = []

  for (const [brainrotId, values] of byBrainrot) {
    // Build entries with multiplier info
    const entries: MutationValueEntry[] = values
      .filter(v => mutationMap.has(v.mutationId))
      .map(v => ({
        mutationId: v.mutationId,
        multiplier: mutationMap.get(v.mutationId)!,
        robuxValue: v.robuxValue,
      }))

    if (entries.length < 2) {
      skipped++
      continue
    }

    const interpolated = interpolateValues(entries)

    // Check if anything changed
    let changed = false
    for (const interp of interpolated) {
      const original = entries.find(e => e.mutationId === interp.mutationId)
      if (original && original.robuxValue !== interp.robuxValue) {
        changed = true
        updates.push({
          brainrotId,
          mutationId: interp.mutationId,
          robuxValue: interp.robuxValue,
        })
      }
    }

    if (changed) updated++
    else skipped++
  }

  // Batch update in transaction
  if (updates.length > 0) {
    const ops = updates.map(u =>
      prisma.brainrotMutationValue.update({
        where: { brainrotId_mutationId: { brainrotId: u.brainrotId, mutationId: u.mutationId } },
        data: { robuxValue: u.robuxValue },
      })
    )
    // Prisma transaction limit is ~32k, batch if needed
    const BATCH_SIZE = 500
    for (let i = 0; i < ops.length; i += BATCH_SIZE) {
      await prisma.$transaction(ops.slice(i, i + BATCH_SIZE))
    }
  }

  return { updated, skipped }
}
