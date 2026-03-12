import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireModOrAdmin } from '@/lib/auth'

// PATCH /api/admin/usd-values/brainrots/[id] - Update brainrot base Robux value, demand, trend
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireModOrAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { robuxValue, demand, trend } = body

    // Validate brainrot exists
    const brainrot = await prisma.brainrot.findUnique({
      where: { id },
      select: { id: true, name: true, robuxValue: true, demand: true, trend: true },
    })

    if (!brainrot) {
      return NextResponse.json({ error: 'Brainrot not found' }, { status: 404 })
    }

    const isAdmin = user.role === 'ADMIN'

    if (!isAdmin) {
      // Mod: submit pending edits for each changed field
      const pendingEdits = []

      if (robuxValue !== undefined) {
        const newVal = robuxValue === null || robuxValue === '' ? null : parseInt(robuxValue, 10)
        pendingEdits.push({
          editType: 'brainrot_value',
          targetId: id,
          description: `Update ${brainrot.name} base robux: ${brainrot.robuxValue ?? 'none'} → ${newVal ?? 'none'}`,
          oldData: JSON.stringify({ robuxValue: brainrot.robuxValue }),
          newData: JSON.stringify({ robuxValue: newVal }),
          submitterId: user.id,
        })
      }

      if (demand !== undefined) {
        pendingEdits.push({
          editType: 'brainrot_demand',
          targetId: id,
          description: `Update ${brainrot.name} demand: ${brainrot.demand} → ${demand}`,
          oldData: JSON.stringify({ demand: brainrot.demand }),
          newData: JSON.stringify({ demand }),
          submitterId: user.id,
        })
      }

      if (trend !== undefined) {
        pendingEdits.push({
          editType: 'brainrot_trend',
          targetId: id,
          description: `Update ${brainrot.name} trend: ${brainrot.trend} → ${trend}`,
          oldData: JSON.stringify({ trend: brainrot.trend }),
          newData: JSON.stringify({ trend }),
          submitterId: user.id,
        })
      }

      if (pendingEdits.length === 0) {
        return NextResponse.json({ error: 'No changes' }, { status: 400 })
      }

      await prisma.pendingEdit.createMany({ data: pendingEdits })
      return NextResponse.json({ submitted: true, count: pendingEdits.length })
    }

    // Admin: apply directly
    const updateData: Record<string, unknown> = {}
    const changes: Record<string, unknown> = {}

    if (robuxValue !== undefined) {
      updateData.robuxValue = robuxValue === null || robuxValue === ''
        ? null
        : parseInt(robuxValue, 10)
      changes.robuxValue = { old: brainrot.robuxValue, new: updateData.robuxValue }
    }

    if (demand !== undefined) {
      updateData.demand = demand
      changes.demand = { old: brainrot.demand, new: demand }
    }

    if (trend !== undefined) {
      updateData.trend = trend
      changes.trend = { old: brainrot.trend, new: trend }
    }

    const updated = await prisma.brainrot.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, robuxValue: true, demand: true, trend: true },
    })

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: 'UPDATE_BRAINROT_VALUES',
        targetType: 'Brainrot',
        targetId: id,
        details: JSON.stringify({ brainrotName: brainrot.name, changes }),
      },
    })

    return NextResponse.json({ success: true, brainrot: updated })
  } catch (error) {
    console.error('Error updating brainrot values:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
