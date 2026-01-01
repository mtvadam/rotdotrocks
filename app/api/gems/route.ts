import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { checkRateLimitDynamic } from '@/lib/rate-limit'

const DAILY_GEMS = 5
const MS_PER_DAY = 24 * 60 * 60 * 1000

// GET /api/gems - Get user's gems and refresh if eligible
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit (configurable via admin panel)
    const rateLimit = await checkRateLimitDynamic(`gems:${currentUser.id}`, 'gems')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const now = new Date()
    const refreshThreshold = new Date(now.getTime() - MS_PER_DAY)

    // Atomic update: only increment if lastGemRefresh is older than 24 hours
    // This prevents race conditions from multiple simultaneous requests
    const updated = await prisma.user.updateMany({
      where: {
        id: currentUser.id,
        lastGemRefresh: { lt: refreshThreshold },
      },
      data: {
        gems: { increment: DAILY_GEMS },
        lastGemRefresh: now,
      },
    })

    // Fetch current state
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: {
        gems: true,
        lastGemRefresh: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const nextRefreshAt = new Date(user.lastGemRefresh.getTime() + MS_PER_DAY)

    return NextResponse.json({
      gems: user.gems,
      nextRefreshAt: nextRefreshAt.toISOString(),
      dailyAmount: DAILY_GEMS,
      refreshed: updated.count > 0,
    })
  } catch (error) {
    console.error('Get gems error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
