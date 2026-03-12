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

    // Get existing value
    const existingValue = await prisma.brainrotMutationValue.findUnique({
      where: { brainrotId_mutationId: { brainrotId, mutationId } },
    })

    const isAdmin = user.role === 'ADMIN'
    const newVal = robuxValue === null || robuxValue === '' || robuxValue === undefined ? null : parseInt(robuxValue, 10)

    if (!isAdmin) {
      // Mod: submit for approval
      await prisma.pendingEdit.create({
        data: {
          editType: 'mutation_value',
          targetId: `${brainrotId}:${mutationId}`,
          description: `Update ${brainrot.name} × ${mutation.name} robux value: ${existingValue?.robuxValue ?? 'none'} → ${newVal ?? 'none'}`,
          oldData: JSON.stringify({ brainrotId, mutationId, robuxValue: existingValue?.robuxValue ?? null }),
          newData: JSON.stringify({ brainrotId, mutationId, robuxValue: newVal }),
          submitterId: user.id,
        },
      })
      return NextResponse.json({ submitted: true })
    }

    // Admin: apply directly
    if (newVal === null) {
      if (existingValue) {
        await prisma.brainrotMutationValue.delete({
          where: { brainrotId_mutationId: { brainrotId, mutationId } },
        })
      }
    } else {
      await prisma.brainrotMutationValue.upsert({
        where: { brainrotId_mutationId: { brainrotId, mutationId } },
        create: { brainrotId, mutationId, robuxValue: newVal },
        update: { robuxValue: newVal },
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
          newValue: newVal,
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

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array is required' }, { status: 400 })
    }

    const isAdmin = user.role === 'ADMIN'

    if (!isAdmin) {
      // Mod: create pending edits for each change
      const pendingEdits = []
      for (const update of updates) {
        const { brainrotId, mutationId, robuxValue } = update
        const newVal = robuxValue === null || robuxValue === '' || robuxValue === undefined ? null : parseInt(String(robuxValue), 10)

        // Get names for description
        const [brainrot, mutation, existing] = await Promise.all([
          prisma.brainrot.findUnique({ where: { id: brainrotId }, select: { name: true } }),
          mutationId ? prisma.mutation.findUnique({ where: { id: mutationId }, select: { name: true } }) : null,
          mutationId
            ? prisma.brainrotMutationValue.findUnique({ where: { brainrotId_mutationId: { brainrotId, mutationId } } })
            : prisma.brainrot.findUnique({ where: { id: brainrotId }, select: { robuxValue: true } }),
        ])

        const oldVal = mutationId
          ? (existing as any)?.robuxValue ?? null
          : (existing as any)?.robuxValue ?? null

        const editType = mutationId ? 'mutation_value' : 'brainrot_value'
        const targetId = mutationId ? `${brainrotId}:${mutationId}` : brainrotId
        const desc = mutationId
          ? `Update ${brainrot?.name} × ${mutation?.name} robux: ${oldVal ?? 'none'} → ${newVal ?? 'none'}`
          : `Update ${brainrot?.name} base robux: ${oldVal ?? 'none'} → ${newVal ?? 'none'}`

        pendingEdits.push({
          editType,
          targetId,
          description: desc,
          oldData: JSON.stringify({ brainrotId, mutationId: mutationId ?? null, robuxValue: oldVal }),
          newData: JSON.stringify({ brainrotId, mutationId: mutationId ?? null, robuxValue: newVal }),
          submitterId: user.id,
        })
      }

      await prisma.pendingEdit.createMany({ data: pendingEdits })
      return NextResponse.json({ submitted: true, count: pendingEdits.length })
    }

    // Admin: apply directly in a transaction
    const operations = updates.map((update: { brainrotId: string; mutationId?: string; robuxValue: number | string | null }) => {
      if (update.mutationId) {
        if (update.robuxValue === null || update.robuxValue === '' || update.robuxValue === undefined) {
          return prisma.brainrotMutationValue.deleteMany({
            where: { brainrotId: update.brainrotId, mutationId: update.mutationId },
          })
        }
        return prisma.brainrotMutationValue.upsert({
          where: {
            brainrotId_mutationId: {
              brainrotId: update.brainrotId,
              mutationId: update.mutationId,
            },
          },
          create: {
            brainrotId: update.brainrotId,
            mutationId: update.mutationId,
            robuxValue: parseInt(String(update.robuxValue), 10),
          },
          update: {
            robuxValue: parseInt(String(update.robuxValue), 10),
          },
        })
      } else {
        return prisma.brainrot.update({
          where: { id: update.brainrotId },
          data: {
            robuxValue: update.robuxValue === null || update.robuxValue === ''
              ? null
              : parseInt(String(update.robuxValue), 10),
          },
        })
      }
    })

    await prisma.$transaction(operations)

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
