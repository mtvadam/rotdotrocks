import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/admin/data/brainrots/[id] - Update a brainrot
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const { baseCost, baseIncome, rarity, isActive } = body

    // Validate the brainrot exists
    const existing = await prisma.brainrot.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Brainrot not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (baseCost !== undefined) {
      updateData.baseCost = BigInt(baseCost)
    }
    if (baseIncome !== undefined) {
      updateData.baseIncome = BigInt(baseIncome)
    }
    if (rarity !== undefined) {
      updateData.rarity = rarity || null
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const updated = await prisma.brainrot.update({
      where: { id },
      data: updateData,
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_BRAINROT',
        targetType: 'Brainrot',
        targetId: id,
        details: JSON.stringify({
          name: existing.name,
          changes: body,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      brainrot: {
        ...updated,
        baseCost: updated.baseCost.toString(),
        baseIncome: updated.baseIncome.toString(),
      },
    })
  } catch (error) {
    console.error('Failed to update brainrot')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

// DELETE /api/admin/data/brainrots/[id] - Delete a brainrot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params

    // Get brainrot before deleting for audit log
    const existing = await prisma.brainrot.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Brainrot not found' }, { status: 404 })
    }

    await prisma.brainrot.delete({ where: { id } })

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'DELETE_BRAINROT',
        targetType: 'Brainrot',
        targetId: id,
        details: JSON.stringify({ name: existing.name }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete brainrot')
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
