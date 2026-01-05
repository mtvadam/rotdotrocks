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

    // Update the Robux value
    const updated = await prisma.brainrot.update({
      where: { id },
      data: {
        robuxValue: robuxValue === null || robuxValue === '' || robuxValue === undefined
          ? null
          : parseInt(robuxValue, 10),
      },
      select: {
        id: true,
        name: true,
        robuxValue: true,
      },
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: 'UPDATE_BRAINROT_ROBUX_VALUE',
        targetType: 'Brainrot',
        targetId: id,
        details: JSON.stringify({
          brainrotName: brainrot.name,
          oldValue: brainrot.robuxValue || null,
          newValue: robuxValue || null,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      brainrot: updated,
    })
  } catch (error) {
    console.error('Error updating brainrot Robux value:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
