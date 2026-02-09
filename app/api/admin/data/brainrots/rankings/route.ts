import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/admin/data/brainrots/rankings - Batch update new brainrot rankings
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { rankings } = await request.json() as { rankings: string[] }

    if (!Array.isArray(rankings)) {
      return NextResponse.json({ error: 'rankings must be an array of brainrot IDs' }, { status: 400 })
    }

    if (rankings.length > 12) {
      return NextResponse.json({ error: 'Maximum 12 new brainrots allowed' }, { status: 400 })
    }

    // Transaction: clear all isNew flags, then set new ones
    await prisma.$transaction(async (tx) => {
      // Clear all existing "new" markers
      await tx.brainrot.updateMany({
        where: { isNew: true },
        data: { isNew: false, newDisplayOrder: null },
      })

      // Set the new rankings
      for (let i = 0; i < rankings.length; i++) {
        await tx.brainrot.update({
          where: { id: rankings[i] },
          data: { isNew: true, newDisplayOrder: i + 1 },
        })
      }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: 'UPDATE_NEW_RANKINGS',
        targetType: 'Brainrot',
        details: JSON.stringify({ count: rankings.length, ids: rankings }),
      },
    })

    return NextResponse.json({ success: true, count: rankings.length })
  } catch (error) {
    console.error('Failed to update rankings:', error)
    return NextResponse.json({ error: 'Failed to update rankings' }, { status: 500 })
  }
}
