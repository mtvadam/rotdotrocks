import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateChallengePhrase, sha256 } from '@/lib/crypto'
import { checkRateLimitDynamic } from '@/lib/rate-limit'

// POST /api/auth/challenge - Generate challenge for login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { robloxUsername } = body

    if (!robloxUsername || typeof robloxUsername !== 'string' || robloxUsername.length < 3) {
      return NextResponse.json({ error: 'Valid Roblox username required' }, { status: 400 })
    }

    // Rate limit (configurable via admin panel)
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `auth-challenge:${ip}:${robloxUsername}`
    const rateLimit = await checkRateLimitDynamic(rateLimitKey, 'auth-challenge')

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Clean up expired challenges for this username (case-insensitive)
    await prisma.authChallenge.deleteMany({
      where: {
        robloxUsername: {
          equals: robloxUsername,
          mode: 'insensitive'
        },
        expiresAt: { lt: new Date() },
      },
    })

    // Delete any existing unexpired challenges for this username (case-insensitive)
    await prisma.authChallenge.deleteMany({
      where: {
        robloxUsername: {
          equals: robloxUsername,
          mode: 'insensitive'
        },
        expiresAt: { gte: new Date() },
      },
    })

    // Generate new challenge
    const challengePhrase = generateChallengePhrase()
    const challengeHash = sha256(challengePhrase)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

    await prisma.authChallenge.create({
      data: {
        robloxUsername,
        challengePlainPreview: '', // Don't store preview for security
        challengeHash,
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      challengePhrase,
      expiresAt: expiresAt.toISOString(),
    })
  } catch (error) {
    // Log error without exposing details
    console.error('Challenge generation failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
