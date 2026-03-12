import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/notifications - Get user's notifications
// Query params:
//   ?countOnly=true  — lightweight poll, returns { unreadCount } only
//   ?since=<ISO>     — incremental fetch, returns notifications created after the timestamp
//   ?unread=true     — only unread notifications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('countOnly') === 'true'
    const since = searchParams.get('since')
    const unreadOnly = searchParams.get('unread') === 'true'

    // Lightweight count-only mode for polling
    if (countOnly) {
      const unreadCount = await prisma.notification.count({
        where: { userId: user.id, isRead: false },
      })
      return NextResponse.json({ unreadCount }, {
        headers: { 'Cache-Control': 'private, no-cache' },
      })
    }

    const where: any = { userId: user.id }
    if (unreadOnly) where.isRead = false
    if (since) where.createdAt = { gt: new Date(since) }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        fromUser: {
          select: {
            id: true,
            robloxUsername: true,
            robloxAvatarUrl: true,
          },
        },
      },
    })

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, isRead: false },
    })

    return NextResponse.json({ notifications, unreadCount }, {
      headers: { 'Cache-Control': 'private, no-cache' },
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      })
    } else if (notificationId) {
      // Mark single notification as read
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId: user.id,
        },
        data: {
          isRead: true,
        },
      })
    } else {
      return NextResponse.json({ error: 'Missing notificationId or markAllRead' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
