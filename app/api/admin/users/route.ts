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
    const search = searchParams.get('search')?.slice(0, 100) // Limit search length
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    // Validate and sanitize pagination params
    const rawLimit = parseInt(searchParams.get('limit') || '50')
    const rawOffset = parseInt(searchParams.get('offset') || '0')
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100)
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

    // Validate role enum
    const validRoles = ['USER', 'SELLER', 'ADMIN']
    const validStatuses = ['banned', 'frozen', 'active']

    const where: Record<string, unknown> = {}

    if (search) {
      where.robloxUsername = {
        contains: search,
        mode: 'insensitive',
      }
    }

    if (role && validRoles.includes(role)) {
      where.role = role
    }

    if (status && validStatuses.includes(status)) {
      if (status === 'banned') {
        where.isBanned = true
      } else if (status === 'frozen') {
        where.isFrozen = true
      } else if (status === 'active') {
        where.isBanned = false
        where.isFrozen = false
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          robloxUsername: true,
          robloxUserId: true,
          robloxAvatarUrl: true,
          role: true,
          isBanned: true,
          isFrozen: true,
          gems: true,
          createdAt: true,
          _count: {
            select: {
              trades: true,
              reports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where }),
    ])

    return NextResponse.json({ users, total })
  } catch (error) {
    console.error('Failed to list users')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
