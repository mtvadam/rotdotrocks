import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')
    const adminId = searchParams.get('adminId')

    // Validate and sanitize pagination params
    const rawLimit = parseInt(searchParams.get('limit') || '50')
    const rawOffset = parseInt(searchParams.get('offset') || '0')
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100)
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

    const where: Record<string, unknown> = {}
    if (action) where.action = action
    if (adminId) where.adminId = adminId

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          admin: {
            select: {
              id: true,
              robloxUsername: true,
              robloxAvatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ])

    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error('Failed to list audit logs')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
