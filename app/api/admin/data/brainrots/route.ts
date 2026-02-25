import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/data/brainrots - Create a new brainrot
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, rarity, baseCost, baseIncome } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check for duplicate slug
    const existing = await prisma.brainrot.findUnique({ where: { slug } })
    if (existing) {
      return NextResponse.json({ error: 'A brainrot with this name already exists' }, { status: 400 })
    }

    const brainrot = await prisma.brainrot.create({
      data: {
        name,
        slug,
        rarity: rarity || null,
        baseCost: BigInt(baseCost || '0'),
        baseIncome: BigInt(baseIncome || '0'),
        imageUrl: '',
      },
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'CREATE_BRAINROT',
        targetType: 'Brainrot',
        targetId: brainrot.id,
        details: JSON.stringify({ name, rarity, baseCost, baseIncome }),
      },
    })

    return NextResponse.json({
      success: true,
      brainrot: {
        ...brainrot,
        baseCost: brainrot.baseCost.toString(),
        baseIncome: brainrot.baseIncome.toString(),
      },
    })
  } catch (error) {
    console.error('Failed to create brainrot')
    return NextResponse.json({ error: 'Failed to create brainrot' }, { status: 500 })
  }
}
