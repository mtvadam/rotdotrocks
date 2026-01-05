import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'

// GET - Get user details
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { id } = await params

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        robloxUsername: true,
        robloxUserId: true,
        robloxAvatarUrl: true,
        role: true,
        isBanned: true,
        isFrozen: true,
        gems: true,
        lastIpAddress: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            trades: true,
            reports: true,
            tradeRequests: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get recent trades
    const recentTrades = await prisma.trade.findMany({
      where: { userId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        isVerified: true,
        createdAt: true,
      },
    })

    // Get recent reports by user
    const recentReports = await prisma.report.findMany({
      where: { reporterId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      user,
      recentTrades,
      recentReports,
    })
  } catch (error) {
    console.error('Failed to fetch user')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

// PATCH - Update user (ban/unban, freeze/unfreeze, adjust gems, change role)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { id } = await params

    const body = await req.json()
    const { isBanned, isFrozen, gems, gemsAdjustment, role } = body

    const existingUser = await prisma.user.findUnique({
      where: { id },
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Prevent self-modification for critical fields
    if (id === admin.id && (isBanned !== undefined || role !== undefined)) {
      return NextResponse.json(
        { error: 'Cannot modify your own ban status or role' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    const auditLogs: Array<{ action: string; details: Record<string, unknown> }> = []

    // Handle ban/unban
    if (isBanned !== undefined && isBanned !== existingUser.isBanned) {
      updateData.isBanned = isBanned
      auditLogs.push({
        action: isBanned ? AuditActions.USER_BANNED : AuditActions.USER_UNBANNED,
        details: { previousValue: existingUser.isBanned, newValue: isBanned },
      })
    }

    // Handle freeze/unfreeze
    if (isFrozen !== undefined && isFrozen !== existingUser.isFrozen) {
      updateData.isFrozen = isFrozen
      auditLogs.push({
        action: isFrozen ? AuditActions.USER_FROZEN : AuditActions.USER_UNFROZEN,
        details: { previousValue: existingUser.isFrozen, newValue: isFrozen },
      })
    }

    // Handle gem adjustment (additive)
    if (gemsAdjustment !== undefined && typeof gemsAdjustment === 'number') {
      const newGems = Math.max(0, existingUser.gems + gemsAdjustment)
      updateData.gems = newGems
      auditLogs.push({
        action: AuditActions.GEMS_ADJUSTED,
        details: {
          previousGems: existingUser.gems,
          adjustment: gemsAdjustment,
          newGems,
        },
      })
    }

    // Handle gem set (absolute)
    if (gems !== undefined && typeof gems === 'number' && gems !== existingUser.gems) {
      updateData.gems = Math.max(0, gems)
      auditLogs.push({
        action: AuditActions.GEMS_ADJUSTED,
        details: {
          previousGems: existingUser.gems,
          newGems: Math.max(0, gems),
        },
      })
    }

    // Handle role change
    if (role !== undefined && ['USER', 'SELLER', 'MOD', 'ADMIN'].includes(role) && role !== existingUser.role) {
      updateData.role = role
      auditLogs.push({
        action: AuditActions.ROLE_CHANGED,
        details: { previousRole: existingUser.role, newRole: role },
      })
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes to apply' }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
      },
    })

    // Create audit logs
    for (const log of auditLogs) {
      await createAuditLog(admin.id, log.action as never, 'USER', id, {
        ...log.details,
        targetUsername: existingUser.robloxUsername,
      })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('Failed to update user')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
