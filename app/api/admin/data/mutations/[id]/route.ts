import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/admin/data/mutations/[id] - Update a mutation
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
    const { multiplier, isActive } = body

    // Validate the mutation exists
    const existing = await prisma.mutation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Mutation not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (multiplier !== undefined) {
      updateData.multiplier = parseFloat(multiplier)
    }
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    const updated = await prisma.mutation.update({
      where: { id },
      data: updateData,
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_MUTATION',
        targetType: 'Mutation',
        targetId: id,
        details: JSON.stringify({
          name: existing.name,
          changes: body,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      mutation: updated,
    })
  } catch (error) {
    console.error('Failed to update mutation')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

// DELETE /api/admin/data/mutations/[id] - Delete a mutation
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

    const existing = await prisma.mutation.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Mutation not found' }, { status: 404 })
    }

    await prisma.mutation.delete({ where: { id } })

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'DELETE_MUTATION',
        targetType: 'Mutation',
        targetId: id,
        details: JSON.stringify({ name: existing.name }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete mutation')
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}
