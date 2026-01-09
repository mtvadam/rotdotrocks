import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { TradeVoteType } from '@prisma/client'

// Get or create a session ID for anonymous voting
async function getSessionId(): Promise<string> {
  const cookieStore = await cookies()
  let sessionId = cookieStore.get('vote_session')?.value

  if (!sessionId) {
    sessionId = crypto.randomUUID()
  }

  return sessionId
}

// GET: Get vote counts and current user's vote
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tradeId } = await params
    const sessionId = await getSessionId()

    // Single query to get trade verification status
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { id: true, isVerified: true },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (!trade.isVerified) {
      return NextResponse.json({ error: 'Only verified trades can be voted on' }, { status: 403 })
    }

    // Use groupBy for efficient vote counting in one query
    const [voteCounts, userVote] = await Promise.all([
      prisma.tradeVote.groupBy({
        by: ['vote'],
        where: { tradeId },
        _count: true,
      }),
      prisma.tradeVote.findUnique({
        where: { tradeId_sessionId: { tradeId, sessionId } },
        select: { vote: true },
      }),
    ])

    // Convert grouped results to vote counts
    const votes = {
      WIN: 0,
      FAIR: 0,
      LOSS: 0,
    }
    let totalVotes = 0
    for (const vc of voteCounts) {
      votes[vc.vote] = vc._count
      totalVotes += vc._count
    }

    return NextResponse.json({
      votes,
      userVote: userVote?.vote || null,
      totalVotes,
    })
  } catch (error) {
    console.error('Error fetching votes:', error)
    return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 })
  }
}

// POST: Submit or update a vote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tradeId } = await params
    const sessionId = await getSessionId()
    const body = await request.json()
    const { vote } = body

    // Validate vote type
    if (!vote || !['WIN', 'FAIR', 'LOSS'].includes(vote)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
    }

    // Check if trade exists and is verified
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { id: true, isVerified: true },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (!trade.isVerified) {
      return NextResponse.json({ error: 'Only verified trades can be voted on' }, { status: 403 })
    }

    // Upsert vote (create or update)
    const tradeVote = await prisma.tradeVote.upsert({
      where: { tradeId_sessionId: { tradeId, sessionId } },
      update: { vote: vote as TradeVoteType },
      create: {
        tradeId,
        sessionId,
        vote: vote as TradeVoteType,
      },
    })

    // Get updated vote counts efficiently
    const voteCounts = await prisma.tradeVote.groupBy({
      by: ['vote'],
      where: { tradeId },
      _count: true,
    })

    const votes = { WIN: 0, FAIR: 0, LOSS: 0 }
    let totalVotes = 0
    for (const vc of voteCounts) {
      votes[vc.vote] = vc._count
      totalVotes += vc._count
    }

    // Set the session cookie in the response
    const response = NextResponse.json({
      success: true,
      votes,
      userVote: tradeVote.vote,
      totalVotes,
    })

    // Set cookie to persist session for 1 year
    response.cookies.set('vote_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Error submitting vote:', error)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}

// DELETE: Remove a vote
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tradeId } = await params
    const sessionId = await getSessionId()

    // Delete the vote if it exists
    await prisma.tradeVote.deleteMany({
      where: { tradeId, sessionId },
    })

    // Get updated vote counts efficiently
    const voteCounts = await prisma.tradeVote.groupBy({
      by: ['vote'],
      where: { tradeId },
      _count: true,
    })

    const votes = { WIN: 0, FAIR: 0, LOSS: 0 }
    let totalVotes = 0
    for (const vc of voteCounts) {
      votes[vc.vote] = vc._count
      totalVotes += vc._count
    }

    return NextResponse.json({
      success: true,
      votes,
      userVote: null,
      totalVotes,
    })
  } catch (error) {
    console.error('Error removing vote:', error)
    return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
  }
}
