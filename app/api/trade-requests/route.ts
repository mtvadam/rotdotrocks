import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimitDynamic } from '@/lib/rate-limit'

// POST /api/trade-requests - Create a trade request (asking to trade)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is banned or frozen
    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is banned' }, { status: 403 })
    }
    if (user.isFrozen) {
      return NextResponse.json({ error: 'Your account is frozen' }, { status: 403 })
    }

    // Rate limit (configurable via admin panel)
    const rateLimit = await checkRateLimitDynamic(`trade-requests:${user.id}`, 'trade-requests')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before sending another.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { tradeId } = body

    if (!tradeId) {
      return NextResponse.json({ error: 'Trade ID required' }, { status: 400 })
    }

    // Check trade exists and is OPEN
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (trade.status !== 'OPEN') {
      return NextResponse.json({ error: 'Trade is no longer open' }, { status: 400 })
    }

    if (trade.userId === user.id) {
      return NextResponse.json({ error: 'Cannot request your own trade' }, { status: 400 })
    }

    // Check if user already has a pending request for this trade
    const existingRequest = await prisma.tradeRequest.findFirst({
      where: {
        tradeId,
        requesterId: user.id,
        status: 'PENDING',
      },
    })

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending request for this trade' }, { status: 400 })
    }

    // Create the request
    const tradeRequest = await prisma.tradeRequest.create({
      data: {
        tradeId,
        requesterId: user.id,
      },
    })

    return NextResponse.json({ request: tradeRequest })
  } catch (error) {
    console.error('Create trade request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
