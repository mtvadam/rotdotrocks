import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireModOrAdmin } from '@/lib/auth'
import { applyPriceReview } from '@/lib/price-review-apply'

// GET: List price reviews (mod or admin)
export async function GET(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const reviews = await prisma.priceReview.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      reviewer: { select: { id: true, robloxUsername: true, robloxAvatarUrl: true } },
      reviewedBy: { select: { id: true, robloxUsername: true } },
    },
  })

  return NextResponse.json({ reviews })
}

// POST: Approve or reject a price review (admin only)
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { reviewId, action, adminNote } = (await request.json()) as {
    reviewId: string
    action: 'approve' | 'reject'
    adminNote?: string
  }

  if (!reviewId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const review = await prisma.priceReview.findUnique({ where: { id: reviewId } })
  if (!review || review.status !== 'pending') {
    return NextResponse.json(
      { error: 'Review not found or already processed' },
      { status: 404 }
    )
  }

  if (action === 'reject') {
    await prisma.priceReview.update({
      where: { id: reviewId },
      data: {
        status: 'rejected',
        reviewedById: user.id,
        reviewedAt: new Date(),
        adminNote,
      },
    })
    return NextResponse.json({ rejected: true })
  }

  // Approve: delegate to shared apply logic
  const result = await applyPriceReview(reviewId, user.id, adminNote)
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }
  return NextResponse.json(result)
}
