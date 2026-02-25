import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/data/traits - Create a new trait
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, multiplier, valueMultiplier } = body

    if (!name || multiplier === undefined) {
      return NextResponse.json({ error: 'Name and multiplier are required' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await prisma.trait.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'A trait with this name already exists' }, { status: 400 })
    }

    const trait = await prisma.trait.create({
      data: {
        name,
        multiplier: parseFloat(multiplier),
        valueMultiplier: valueMultiplier ? parseFloat(valueMultiplier) : 1.0,
        imageUrl: '',
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_TRAIT',
        targetType: 'Trait',
        targetId: trait.id,
        details: JSON.stringify({ name, multiplier }),
      },
    })

    return NextResponse.json({ success: true, trait })
  } catch (error) {
    console.error('Failed to create trait')
    return NextResponse.json({ error: 'Failed to create trait' }, { status: 500 })
  }
}
