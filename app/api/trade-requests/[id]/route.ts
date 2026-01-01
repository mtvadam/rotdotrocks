import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// PATCH /api/trade-requests/[id] - Accept or decline a trade request
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const body = await request.json()
    const { status } = body

    if (!['ACCEPTED', 'DECLINED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const tradeRequest = await prisma.tradeRequest.findUnique({
      where: { id },
      include: { trade: true },
    })

    if (!tradeRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only trade owner can accept/decline requests
    if (tradeRequest.trade.userId !== user.id) {
      return NextResponse.json({ error: 'Only trade owner can respond to requests' }, { status: 403 })
    }

    if (tradeRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    // Update request status
    await prisma.tradeRequest.update({
      where: { id },
      data: { status },
    })

    // If accepted, update trade status to PENDING
    if (status === 'ACCEPTED') {
      await prisma.trade.update({
        where: { id: tradeRequest.tradeId },
        data: { status: 'PENDING' },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Update trade request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/trade-requests/[id] - Cancel own trade request
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    const tradeRequest = await prisma.tradeRequest.findUnique({
      where: { id },
    })

    if (!tradeRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    // Only requester can cancel their own request
    if (tradeRequest.requesterId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    if (tradeRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    await prisma.tradeRequest.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete trade request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
