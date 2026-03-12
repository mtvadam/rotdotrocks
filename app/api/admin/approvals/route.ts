import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { applyPriceReview } from '@/lib/price-review-apply'

const CONFIG_KEY = 'trait_streak_multipliers'

// GET: List all pending approvals (price reviews + trait edits + generic pending edits)
export async function GET() {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [priceReviews, traitEdits, pendingEdits] = await Promise.all([
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
    prisma.pendingEdit.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        submitter: { select: { id: true, robloxUsername: true, robloxAvatarUrl: true } },
        reviewedBy: { select: { id: true, robloxUsername: true } },
      },
    }),
  ])

  return NextResponse.json({ priceReviews, traitEdits, pendingEdits })
}

// POST: Approve or reject a pending item
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as {
    type: 'price_review' | 'trait_edit' | 'pending_edit'
    id: string
    action: 'approve' | 'reject'
    adminNote?: string
    adminValue?: number
  }
  const { type, id, action, adminNote, adminValue } = body

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

  if (type === 'pending_edit') {
    const edit = await prisma.pendingEdit.findUnique({ where: { id } })
    if (!edit || edit.status !== 'pending') {
      return NextResponse.json({ error: 'Not found or already processed' }, { status: 404 })
    }

    if (action === 'reject') {
      await prisma.pendingEdit.update({
        where: { id },
        data: { status: 'rejected', reviewedById: user.id, reviewedAt: new Date(), adminNote },
      })
      return NextResponse.json({ rejected: true })
    }

    // Approve: apply the edit based on editType
    const newData = JSON.parse(edit.newData)

    try {
      switch (edit.editType) {
        case 'streak_config': {
          await prisma.systemConfig.upsert({
            where: { key: CONFIG_KEY },
            update: { value: edit.newData },
            create: { key: CONFIG_KEY, value: edit.newData },
          })
          break
        }
        case 'brainrot_value': {
          if (!edit.targetId) throw new Error('Missing targetId')
          await prisma.brainrot.update({
            where: { id: edit.targetId },
            data: { robuxValue: newData.robuxValue },
          })
          break
        }
        case 'mutation_value': {
          const { brainrotId, mutationId, robuxValue } = newData
          if (robuxValue === null) {
            await prisma.brainrotMutationValue.deleteMany({
              where: { brainrotId, mutationId },
            })
          } else {
            await prisma.brainrotMutationValue.upsert({
              where: { brainrotId_mutationId: { brainrotId, mutationId } },
              create: { brainrotId, mutationId, robuxValue },
              update: { robuxValue },
            })
          }
          break
        }
        case 'mutation_demand_trend': {
          if (!edit.targetId) throw new Error('Missing targetId')
          const [brainrotId, mutationId] = edit.targetId.split(':')
          const updateData: Record<string, string> = {}
          if (newData.demand) updateData.demand = newData.demand
          if (newData.trend) updateData.trend = newData.trend
          await prisma.brainrotMutationValue.update({
            where: { brainrotId_mutationId: { brainrotId, mutationId } },
            data: updateData,
          })
          break
        }
        default:
          return NextResponse.json({ error: `Unknown edit type: ${edit.editType}` }, { status: 400 })
      }

      await prisma.$transaction([
        prisma.pendingEdit.update({
          where: { id },
          data: { status: 'approved', reviewedById: user.id, reviewedAt: new Date(), adminNote },
        }),
        prisma.auditLog.create({
          data: {
            adminId: user.id,
            action: 'APPROVE_PENDING_EDIT',
            targetType: edit.editType,
            targetId: edit.targetId || 'config',
            details: JSON.stringify({
              description: edit.description,
              oldData: edit.oldData,
              newData: edit.newData,
              submitterId: edit.submitterId,
            }),
          },
        }),
      ])

      return NextResponse.json({ approved: true })
    } catch (error) {
      console.error('Error applying pending edit:', error)
      return NextResponse.json({ error: 'Failed to apply edit' }, { status: 500 })
    }
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

    const result = await applyPriceReview(id, user.id, adminNote)
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
}
