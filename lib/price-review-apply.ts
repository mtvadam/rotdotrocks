import { prisma } from '@/lib/db'
import { buildPreview } from '@/app/api/admin/price-snapshots/apply/route'

/**
 * Shared logic for applying a PriceReview's values to BrainrotMutationValue.
 * Used by both approvals/route.ts and reviews/route.ts to avoid duplication.
 */
export async function applyPriceReview(reviewId: string, adminUserId: string, adminNote?: string) {
  const review = await prisma.priceReview.findUnique({ where: { id: reviewId } })
  if (!review || review.status !== 'pending') {
    return { error: 'Review not found or already processed', status: 404 }
  }

  const snapshotIds = review.snapshotIds as string[]
  const verifiedBrainrotIds = review.verifiedBrainrotIds as string[]
  const overrides = review.overrides as Record<string, Record<string, number>> | null

  const preview = await buildPreview(snapshotIds)

  // Filter to only verified brainrots if specified
  const brainrotsToApply = verifiedBrainrotIds.length > 0
    ? preview.brainrots.filter(b => verifiedBrainrotIds.includes(b.brainrotId))
    : preview.brainrots

  const finalValues = brainrotsToApply.map(b => {
    const brainrotOverrides = overrides?.[b.brainrotId]
    return {
      brainrotId: b.brainrotId,
      values: b.mutations
        .filter(v =>
          (v.hasNewData || brainrotOverrides?.[v.mutationId] !== undefined) &&
          (brainrotOverrides?.[v.mutationId] ?? v.finalValue) !== null
        )
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

  // Mark snapshots as applied if all brainrots were included
  const allApplied = verifiedBrainrotIds.length === 0 || verifiedBrainrotIds.length >= preview.brainrots.length
  if (allApplied) {
    await prisma.priceSnapshot.updateMany({
      where: { id: { in: snapshotIds } },
      data: { appliedToValues: true },
    })
  }

  // Update review status
  await prisma.priceReview.update({
    where: { id: reviewId },
    data: {
      status: 'approved',
      reviewedById: adminUserId,
      reviewedAt: new Date(),
      adminNote,
    },
  })

  return { approved: true, valuesUpdated: ops.length }
}
