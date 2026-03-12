import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin, requireModOrAdmin } from '@/lib/auth'

// PATCH /api/admin/data/traits/[id] - Update a trait
// Mods can only update valueMultiplier; admins can update everything
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireModOrAdmin()
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { id } = await params
    const body = await request.json()
    const { multiplier, valueMultiplier, isActive, localImage } = body

    // Validate the trait exists
    const existing = await prisma.trait.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Trait not found' }, { status: 404 })
    }

    const isAdmin = user.role === 'ADMIN'

    // Mods can only propose valueMultiplier changes (saved as pending edits)
    if (!isAdmin) {
      if (valueMultiplier === undefined) {
        return NextResponse.json({ error: 'Mods can only update valueMultiplier' }, { status: 403 })
      }
      // Block mods from also passing admin-only fields
      if (multiplier !== undefined || isActive !== undefined || localImage !== undefined) {
        return NextResponse.json({ error: 'Mods can only update valueMultiplier' }, { status: 403 })
      }
      const pending = await prisma.pendingTraitEdit.create({
        data: {
          traitId: id,
          submitterId: user.id,
          oldValue: existing.valueMultiplier,
          newValue: parseFloat(valueMultiplier),
        },
      })
      return NextResponse.json({ submitted: true, pendingId: pending.id })
    }

    // Admin: apply directly
    const updateData: Record<string, unknown> = {}
    if (valueMultiplier !== undefined) {
      updateData.valueMultiplier = parseFloat(valueMultiplier)
    }
    if (multiplier !== undefined) {
      updateData.multiplier = parseFloat(multiplier)
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }
    if (localImage !== undefined) {
      updateData.localImage = localImage
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updated = await prisma.trait.update({
      where: { id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: 'UPDATE_TRAIT',
        targetType: 'Trait',
        targetId: id,
        details: JSON.stringify({
          name: existing.name,
          changes: body,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      trait: updated,
    })
  } catch (error) {
    console.error('Failed to update trait')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

// DELETE /api/admin/data/traits/[id] - Delete a trait
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

    const existing = await prisma.trait.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Trait not found' }, { status: 404 })
    }

    await prisma.trait.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'DELETE_TRAIT',
        targetType: 'Trait',
        targetId: id,
        details: JSON.stringify({ name: existing.name }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete trait')
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
