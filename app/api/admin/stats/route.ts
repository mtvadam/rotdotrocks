import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function GET() {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalUsers,
      newUsers7d,
      newUsers30d,
      totalTrades,
      activeTrades,
      pendingReports,
      totalReports,
      gemsStats,
      recentAuditLogs,
      bannedUsers,
      frozenUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.trade.count(),
      prisma.trade.count({
        where: { status: 'OPEN' },
      }),
      prisma.report.count({
        where: { status: 'OPEN' },
      }),
      prisma.report.count(),
      prisma.user.aggregate({
        _sum: { gems: true },
        _avg: { gems: true },
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              robloxUsername: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: { isBanned: true },
      }),
      prisma.user.count({
        where: { isFrozen: true },
      }),
    ])

    return NextResponse.json({
      stats: {
        users: {
          total: totalUsers,
          new7d: newUsers7d,
          new30d: newUsers30d,
          banned: bannedUsers,
          frozen: frozenUsers,
        },
        trades: {
          total: totalTrades,
          active: activeTrades,
        },
        reports: {
          total: totalReports,
          pending: pendingReports,
        },
        gems: {
          total: gemsStats._sum.gems || 0,
          average: Math.round(gemsStats._avg.gems || 0),
        },
        recentAuditLogs,
      },
    })
  } catch (error) {
    console.error('Failed to fetch stats')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
