import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireModOrAdmin } from '@/lib/auth'

// PATCH /api/admin/usd-values/brainrots/[id] - Update brainrot base Robux value
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
    const { robuxValue } = body

    // Validate brainrot exists
    const brainrot = await prisma.brainrot.findUnique({
      where: { id },
      select: { id: true, name: true, robuxValue: true },
    })

    if (!brainrot) {
      return NextResponse.json({ error: 'Brainrot not found' }, { status: 404 })
    }

    if (robuxValue === undefined) {
      return NextResponse.json({ error: 'No changes' }, { status: 400 })
    }

    const isAdmin = user.role === 'ADMIN'
    const newVal = robuxValue === null || robuxValue === '' ? null : parseInt(robuxValue, 10)

    if (!isAdmin) {
      await prisma.pendingEdit.create({
        data: {
          editType: 'brainrot_value',
          targetId: id,
          description: `Update ${brainrot.name} base robux: ${brainrot.robuxValue ?? 'none'} → ${newVal ?? 'none'}`,
          oldData: JSON.stringify({ robuxValue: brainrot.robuxValue }),
          newData: JSON.stringify({ robuxValue: newVal }),
          submitterId: user.id,
        },
      })
      return NextResponse.json({ submitted: true, count: 1 })
    }

    // Admin: apply directly
    const updated = await prisma.brainrot.update({
      where: { id },
      data: { robuxValue: newVal },
      select: { id: true, name: true, robuxValue: true },
    })

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: 'UPDATE_BRAINROT_VALUES',
        targetType: 'Brainrot',
        targetId: id,
        details: JSON.stringify({
          brainrotName: brainrot.name,
          changes: { robuxValue: { old: brainrot.robuxValue, new: newVal } },
        }),
      },
    })

    return NextResponse.json({ success: true, brainrot: updated })
  } catch (error) {
    console.error('Error updating brainrot values:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
