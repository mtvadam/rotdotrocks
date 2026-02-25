import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/data/mutations - Create a new mutation
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, multiplier, gradientColors, gradientDirection, isAnimated } = body

    if (!name || multiplier === undefined) {
      return NextResponse.json({ error: 'Name and multiplier are required' }, { status: 400 })
    }

    // Check for duplicate name
    const existing = await prisma.mutation.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'A mutation with this name already exists' }, { status: 400 })
    }

    const mutation = await prisma.mutation.create({
      data: {
        name,
        multiplier: parseFloat(multiplier),
        gradientColors: gradientColors || null,
        gradientDirection: gradientDirection || null,
        isAnimated: isAnimated || false,
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_MUTATION',
        targetType: 'Mutation',
        targetId: mutation.id,
        details: JSON.stringify({ name, multiplier, gradientColors, gradientDirection, isAnimated }),
      },
    })

    return NextResponse.json({ success: true, mutation })
  } catch (error) {
    console.error('Failed to create mutation')
    return NextResponse.json({ error: 'Failed to create mutation' }, { status: 500 })
  }
}
