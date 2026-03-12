import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { applyPriceReview } from '@/lib/price-review-apply'

// GET: List all pending approvals (price reviews + trait edits)
// Admin-only: mods submit reviews but only admins can view/manage the approvals queue
export async function GET() {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [priceReviews, traitEdits] = await Promise.all([
    prisma.priceReview.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        reviewer: { select: { id: true, robloxUsername: true, robloxAvatarUrl: true } },
        reviewedBy: { select: { id: true, robloxUsername: true } },
      },
    }),
    prisma.pendingTraitEdit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        trait: { select: { id: true, name: true, localImage: true, valueMultiplier: true } },
        submitter: { select: { id: true, robloxUsername: true, robloxAvatarUrl: true } },
        reviewedBy: { select: { id: true, robloxUsername: true } },
      },
    }),
  ])

  return NextResponse.json({ priceReviews, traitEdits })
}

// POST: Approve or reject a pending item
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { type, id, action, adminNote, adminValue } = (await request.json()) as {
    type: 'price_review' | 'trait_edit'
    id: string
    action: 'approve' | 'reject'
    adminNote?: string
    adminValue?: number // admin can override the proposed value for trait edits
  }

  if (!type || !id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (type === 'trait_edit') {
    const edit = await prisma.pendingTraitEdit.findUnique({
      where: { id },
      include: { trait: true },
    })
    if (!edit || edit.status !== 'pending') {
      return NextResponse.json({ error: 'Not found or already processed' }, { status: 404 })
    }

    if (action === 'reject') {
      await prisma.pendingTraitEdit.update({
        where: { id },
        data: { status: 'rejected', reviewedById: user.id, reviewedAt: new Date(), adminNote },
      })
      return NextResponse.json({ rejected: true })
    }

    // Approve: apply the value (admin can override with adminValue)
    const finalValue = adminValue ?? edit.newValue
    await prisma.$transaction([
      prisma.trait.update({
        where: { id: edit.traitId },
        data: { valueMultiplier: finalValue },
      }),
      prisma.pendingTraitEdit.update({
        where: { id },
        data: {
          status: 'approved',
          adminValue: adminValue ?? null,
          reviewedById: user.id,
          reviewedAt: new Date(),
          adminNote,
        },
      }),
      prisma.auditLog.create({
        data: {
          adminId: user.id,
          action: 'APPROVE_TRAIT_EDIT',
          targetType: 'Trait',
          targetId: edit.traitId,
          details: JSON.stringify({
            traitName: edit.trait.name,
            oldValue: edit.oldValue,
            proposedValue: edit.newValue,
            appliedValue: finalValue,
            submitterId: edit.submitterId,
          }),
        },
      }),
    ])

    return NextResponse.json({ approved: true, appliedValue: finalValue })
  }

  if (type === 'price_review') {
    if (action === 'reject') {
      const review = await prisma.priceReview.findUnique({ where: { id } })
      if (!review || review.status !== 'pending') {
        return NextResponse.json({ error: 'Not found or already processed' }, { status: 404 })
      }
      await prisma.priceReview.update({
        where: { id },
        data: { status: 'rejected', reviewedById: user.id, reviewedAt: new Date(), adminNote },
      })
      return NextResponse.json({ rejected: true })
    }

    // Approve: delegate to shared apply logic
    const result = await applyPriceReview(id, user.id, adminNote)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
