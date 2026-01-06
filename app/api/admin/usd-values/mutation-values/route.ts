import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireModOrAdmin } from '@/lib/auth'

// POST /api/admin/usd-values/mutation-values - Create/update/delete brainrot-mutation value
export async function POST(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { brainrotId, mutationId, robuxValue } = body

    if (!brainrotId || !mutationId) {
      return NextResponse.json({ error: 'brainrotId and mutationId are required' }, { status: 400 })
    }

    // Validate brainrot and mutation exist
    const [brainrot, mutation] = await Promise.all([
      prisma.brainrot.findUnique({ where: { id: brainrotId }, select: { id: true, name: true } }),
      prisma.mutation.findUnique({ where: { id: mutationId }, select: { id: true, name: true } }),
    ])

    if (!brainrot) {
      return NextResponse.json({ error: 'Brainrot not found' }, { status: 404 })
    }
    if (!mutation) {
      return NextResponse.json({ error: 'Mutation not found' }, { status: 404 })
    }

    // Get existing value for audit log
    const existingValue = await prisma.brainrotMutationValue.findUnique({
      where: { brainrotId_mutationId: { brainrotId, mutationId } },
    })

    if (robuxValue === null || robuxValue === '' || robuxValue === undefined) {
      // Delete the entry if value is null/empty
      if (existingValue) {
        await prisma.brainrotMutationValue.delete({
          where: { brainrotId_mutationId: { brainrotId, mutationId } },
        })
      }
    } else {
      // Upsert the value
      await prisma.brainrotMutationValue.upsert({
        where: { brainrotId_mutationId: { brainrotId, mutationId } },
        create: {
          brainrotId,
          mutationId,
          robuxValue: parseInt(robuxValue, 10),
        },
        update: {
          robuxValue: parseInt(robuxValue, 10),
        },
      })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: 'UPDATE_BRAINROT_MUTATION_ROBUX_VALUE',
        targetType: 'BrainrotMutationValue',
        targetId: `${brainrotId}:${mutationId}`,
        details: JSON.stringify({
          brainrotName: brainrot.name,
          mutationName: mutation.name,
          oldValue: existingValue?.robuxValue || null,
          newValue: robuxValue || null,
        }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating mutation Robux value:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/usd-values/mutation-values - Bulk update mutation values
export async function PUT(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { updates } = body
    // updates: Array<{ brainrotId, mutationId?, robuxValue }>

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
    }

    // Process updates individually to avoid transaction timeout
    for (const update of updates) {
      if (update.mutationId) {
        // Mutation-specific value
        if (update.robuxValue === null || update.robuxValue === '' || update.robuxValue === undefined) {
          await prisma.brainrotMutationValue.deleteMany({
            where: { brainrotId: update.brainrotId, mutationId: update.mutationId },
          })
        } else {
          await prisma.brainrotMutationValue.upsert({
            where: {
              brainrotId_mutationId: {
                brainrotId: update.brainrotId,
                mutationId: update.mutationId,
              },
            },
            create: {
              brainrotId: update.brainrotId,
              mutationId: update.mutationId,
              robuxValue: parseInt(update.robuxValue, 10),
            },
            update: {
              robuxValue: parseInt(update.robuxValue, 10),
            },
          })
        }
      } else {
        // Base brainrot value
        await prisma.brainrot.update({
          where: { id: update.brainrotId },
          data: {
            robuxValue: update.robuxValue === null || update.robuxValue === ''
              ? null
              : parseInt(update.robuxValue, 10),
          },
        })
      }
    }

    // Create audit log for bulk update
    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: 'BULK_UPDATE_ROBUX_VALUES',
        targetType: 'BrainrotMutationValue',
        targetId: 'bulk',
        details: JSON.stringify({ updateCount: updates.length }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error bulk updating Robux values:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
