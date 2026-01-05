import { prisma } from './db'

interface RobuxValueResult {
  value: number | null
  isFallback: boolean
  source: 'explicit' | 'mutation_fallback' | 'base' | 'none'
  sourceMutationName?: string
}

/**
 * Get the Robux value for a brainrot + mutation combination with fallback logic.
 *
 * Resolution order:
 * 1. Explicit value for brainrot + mutation combo
 * 2. Value from next lower mutation (by multiplier) that has a value
 * 3. Base brainrot robuxValue
 * 4. null (display as 0 or empty)
 */
export async function getRobuxValue(
  brainrotId: string,
  mutationId?: string | null
): Promise<RobuxValueResult> {
  // Fetch the brainrot with its mutation values
  const brainrot = await prisma.brainrot.findUnique({
    where: { id: brainrotId },
    select: {
      robuxValue: true,
      mutationValues: {
        include: {
          mutation: {
            select: {
              id: true,
              name: true,
              multiplier: true,
            },
          },
        },
      },
    },
  })

  if (!brainrot) {
    return { value: null, isFallback: false, source: 'none' }
  }

  // If no mutation specified, return base value
  if (!mutationId) {
    return {
      value: brainrot.robuxValue,
      isFallback: false,
      source: brainrot.robuxValue ? 'base' : 'none',
    }
  }

  // Check for explicit value
  const explicitValue = brainrot.mutationValues.find(mv => mv.mutationId === mutationId)
  if (explicitValue) {
    return {
      value: explicitValue.robuxValue,
      isFallback: false,
      source: 'explicit',
    }
  }

  // Get the target mutation's multiplier
  const targetMutation = await prisma.mutation.findUnique({
    where: { id: mutationId },
    select: { multiplier: true },
  })

  if (!targetMutation) {
    // Unknown mutation, fall back to base
    return {
      value: brainrot.robuxValue,
      isFallback: true,
      source: brainrot.robuxValue ? 'base' : 'none',
    }
  }

  // Find next lower mutation with a value (by multiplier)
  const sortedValues = brainrot.mutationValues
    .filter(mv => mv.mutation.multiplier < targetMutation.multiplier)
    .sort((a, b) => b.mutation.multiplier - a.mutation.multiplier)

  if (sortedValues.length > 0) {
    const fallback = sortedValues[0]
    return {
      value: fallback.robuxValue,
      isFallback: true,
      source: 'mutation_fallback',
      sourceMutationName: fallback.mutation.name,
    }
  }

  // Fall back to base value
  return {
    value: brainrot.robuxValue,
    isFallback: true,
    source: brainrot.robuxValue ? 'base' : 'none',
  }
}

/**
 * Get Robux values for multiple brainrot + mutation combinations efficiently.
 * Returns a map of `brainrotId:mutationId` to RobuxValueResult.
 */
export async function getBulkRobuxValues(
  items: Array<{ brainrotId: string; mutationId?: string | null }>
): Promise<Map<string, RobuxValueResult>> {
  const results = new Map<string, RobuxValueResult>()

  // Get unique brainrot IDs
  const brainrotIds = [...new Set(items.map(i => i.brainrotId))]

  // Fetch all brainrots with their mutation values
  const brainrots = await prisma.brainrot.findMany({
    where: { id: { in: brainrotIds } },
    select: {
      id: true,
      robuxValue: true,
      mutationValues: {
        include: {
          mutation: {
            select: {
              id: true,
              name: true,
              multiplier: true,
            },
          },
        },
      },
    },
  })

  // Get unique mutation IDs
  const mutationIds = [...new Set(items.filter(i => i.mutationId).map(i => i.mutationId!))]

  // Fetch all mutations
  const mutations = await prisma.mutation.findMany({
    where: { id: { in: mutationIds } },
    select: {
      id: true,
      multiplier: true,
    },
  })

  const brainrotMap = new Map(brainrots.map(b => [b.id, b]))
  const mutationMap = new Map(mutations.map(m => [m.id, m]))

  // Process each item
  for (const item of items) {
    const key = item.mutationId ? `${item.brainrotId}:${item.mutationId}` : item.brainrotId
    const brainrot = brainrotMap.get(item.brainrotId)

    if (!brainrot) {
      results.set(key, { value: null, isFallback: false, source: 'none' })
      continue
    }

    // If no mutation specified, return base value
    if (!item.mutationId) {
      results.set(key, {
        value: brainrot.robuxValue,
        isFallback: false,
        source: brainrot.robuxValue ? 'base' : 'none',
      })
      continue
    }

    // Check for explicit value
    const explicitValue = brainrot.mutationValues.find(mv => mv.mutationId === item.mutationId)
    if (explicitValue) {
      results.set(key, {
        value: explicitValue.robuxValue,
        isFallback: false,
        source: 'explicit',
      })
      continue
    }

    // Get the target mutation's multiplier
    const targetMutation = mutationMap.get(item.mutationId)
    if (!targetMutation) {
      results.set(key, {
        value: brainrot.robuxValue,
        isFallback: true,
        source: brainrot.robuxValue ? 'base' : 'none',
      })
      continue
    }

    // Find next lower mutation with a value
    const sortedValues = brainrot.mutationValues
      .filter(mv => mv.mutation.multiplier < targetMutation.multiplier)
      .sort((a, b) => b.mutation.multiplier - a.mutation.multiplier)

    if (sortedValues.length > 0) {
      const fallback = sortedValues[0]
      results.set(key, {
        value: fallback.robuxValue,
        isFallback: true,
        source: 'mutation_fallback',
        sourceMutationName: fallback.mutation.name,
      })
      continue
    }

    // Fall back to base value
    results.set(key, {
      value: brainrot.robuxValue,
      isFallback: true,
      source: brainrot.robuxValue ? 'base' : 'none',
    })
  }

  return results
}

/**
 * Format a Robux value for display
 */
export function formatRobuxValue(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'R$0'
  }

  return `R$${value.toLocaleString()}`
}
