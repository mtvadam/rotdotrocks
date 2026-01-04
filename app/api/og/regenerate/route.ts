import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateAndUploadTradeOG, TradeForOG } from '@/lib/og-generator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Allow up to 30 seconds for image generation

// Rate limiting: track recent regeneration requests
const recentRegenerations = new Map<string, number>()
const REGEN_COOLDOWN_MS = 60000 // 1 minute cooldown per trade

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, timestamp] of recentRegenerations.entries()) {
    if (now - timestamp > REGEN_COOLDOWN_MS) {
      recentRegenerations.delete(key)
    }
  }
}, 60000)

export async function POST(request: NextRequest) {
  try {
    // Verify internal API key for security
    const internalKey = request.headers.get('X-Internal-Key')
    const expectedKey = process.env.INTERNAL_API_KEY || 'internal'

    // Also allow admin access with session
    const isInternal = internalKey === expectedKey

    if (!isInternal) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { tradeId } = body

    if (!tradeId || typeof tradeId !== 'string') {
      return NextResponse.json({ error: 'Missing tradeId' }, { status: 400 })
    }

    // Check rate limiting
    const lastRegen = recentRegenerations.get(tradeId)
    if (lastRegen && Date.now() - lastRegen < REGEN_COOLDOWN_MS) {
      return NextResponse.json(
        { error: 'Regeneration rate limited', retryAfter: REGEN_COOLDOWN_MS - (Date.now() - lastRegen) },
        { status: 429 }
      )
    }

    // Mark as regenerating
    recentRegenerations.set(tradeId, Date.now())

    // Fetch the trade with all necessary data
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        user: {
          select: { robloxUsername: true },
        },
        items: {
          include: {
            brainrot: {
              select: { name: true, baseIncome: true, localImage: true },
            },
            mutation: {
              select: { name: true, multiplier: true },
            },
            traits: {
              include: {
                trait: { select: { multiplier: true } },
              },
            },
          },
        },
      },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Prepare trade data for OG generator
    const tradeForOG: TradeForOG = {
      id: trade.id,
      user: { robloxUsername: trade.user.robloxUsername },
      items: trade.items.map((item) => ({
        side: item.side,
        brainrot: item.brainrot,
        mutation: item.mutation,
        traits: item.traits,
        addonType: item.addonType,
      })),
    }

    // Generate and upload the OG image
    const ogImageUrl = await generateAndUploadTradeOG(tradeForOG)

    if (!ogImageUrl) {
      return NextResponse.json({ error: 'Failed to generate OG image' }, { status: 500 })
    }

    // Update the trade with the new OG image URL
    await prisma.trade.update({
      where: { id: tradeId },
      data: { ogImageUrl },
    })

    return NextResponse.json({
      success: true,
      ogImageUrl,
    })
  } catch (error) {
    console.error('OG regeneration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    )
  }
}

// GET endpoint to regenerate all trades missing OG images (admin only)
export async function GET(request: NextRequest) {
  try {
    // Verify internal API key
    const internalKey = request.headers.get('X-Internal-Key')
    const expectedKey = process.env.INTERNAL_API_KEY || 'internal'

    if (internalKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find trades without OG images
    const tradesWithoutOG = await prisma.trade.findMany({
      where: {
        ogImageUrl: null,
      },
      select: {
        id: true,
      },
      take: 50, // Process in batches
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      count: tradesWithoutOG.length,
      tradeIds: tradesWithoutOG.map(t => t.id),
      message: 'Use POST to /api/og/regenerate with each tradeId to regenerate',
    })
  } catch (error) {
    console.error('OG regeneration list error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
