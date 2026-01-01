import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimitDynamic } from '@/lib/rate-limit'

const TRADE_COST = 5

// GET /api/trades - List trades
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'all'
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'newest'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const user = await getCurrentUser()

    // Build where clause
    const where: any = {
      parentTradeId: null, // Only get original trades, not counter offers
    }

    if (tab === 'verified') {
      where.isVerified = true
    } else if (tab === 'mine' && user) {
      where.userId = user.id
    }

    // Search filter
    if (search) {
      where.OR = [
        { user: { robloxUsername: { contains: search, mode: 'insensitive' } } },
        { items: { some: { brainrot: { name: { contains: search, mode: 'insensitive' } } } } },
      ]
    }

    // Get trades
    const [trades, total] = await Promise.all([
      prisma.trade.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              robloxUsername: true,
              robloxUserId: true,
              robloxAvatarUrl: true,
            },
          },
          items: {
            include: {
              brainrot: {
                select: {
                  id: true,
                  name: true,
                  localImage: true,
                  baseIncome: true,
                },
              },
              mutation: {
                select: { id: true, name: true, multiplier: true },
              },
              event: {
                select: { id: true, name: true },
              },
              traits: {
                include: {
                  trait: {
                    select: { id: true, name: true, localImage: true, multiplier: true },
                  },
                },
              },
            },
          },
          _count: {
            select: { counterOffers: true },
          },
        },
        orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.trade.count({ where }),
    ])

    // Addon display info
    const ADDON_INFO: Record<string, { name: string; image: string }> = {
      ROBUX: { name: 'Add Robux', image: '/trade-only/add-robux.png' },
      ADDS: { name: 'Adds', image: '/trade-only/trade-adds.png' },
      UPGRADE: { name: 'Upgrade', image: '/trade-only/trade-upgrade.png' },
      DOWNGRADE: { name: 'Downgrade', image: '/trade-only/trade-downgrade.png' },
    }

    // Serialize BigInt values and handle addon items
    const serializedTrades = trades.map((trade) => ({
      ...trade,
      items: trade.items.map((item) => {
        // Handle addon items (no brainrot, has addonType)
        if (item.addonType && !item.brainrot) {
          const addonInfo = ADDON_INFO[item.addonType]
          return {
            ...item,
            calculatedIncome: null,
            brainrot: {
              id: `addon-${item.addonType.toLowerCase()}`,
              name: addonInfo?.name || item.addonType,
              localImage: addonInfo?.image || null,
              baseIncome: '0',
            },
          }
        }
        // Regular brainrot items
        return {
          ...item,
          calculatedIncome: item.calculatedIncome?.toString() || null,
          brainrot: item.brainrot ? {
            ...item.brainrot,
            baseIncome: item.brainrot.baseIncome.toString(),
          } : null,
        }
      }),
    }))

    return NextResponse.json({
      trades: serializedTrades,
      total,
      hasMore: offset + trades.length < total,
    })
  } catch (error) {
    console.error('Get trades error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/trades - Create a trade
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
    const rateLimit = await checkRateLimitDynamic(`trades:create:${user.id}`, 'trades-create')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many trades. Please wait before creating another.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { offerItems, requestItems, parentTradeId } = body

    // Validate items
    if (!offerItems?.length || !requestItems?.length) {
      return NextResponse.json(
        { error: 'Must have at least one offer and one request item' },
        { status: 400 }
      )
    }

    if (offerItems.length > 4 || requestItems.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 items per side' },
        { status: 400 }
      )
    }

    const isCounterOffer = !!parentTradeId

    // If counter offer, verify parent trade exists and is OPEN
    if (isCounterOffer) {
      const parentTrade = await prisma.trade.findUnique({
        where: { id: parentTradeId },
      })
      if (!parentTrade) {
        return NextResponse.json({ error: 'Parent trade not found' }, { status: 404 })
      }
      if (parentTrade.status !== 'OPEN') {
        return NextResponse.json({ error: 'Parent trade is no longer open' }, { status: 400 })
      }
      if (parentTrade.userId === user.id) {
        return NextResponse.json({ error: 'Cannot counter your own trade' }, { status: 400 })
      }
    }

    // Create trade with items - all gem operations inside transaction to prevent race conditions
    const trade = await prisma.$transaction(async (tx) => {
      // Deduct gems for original trades with atomic check
      if (!isCounterOffer) {
        // Atomic update: only succeeds if user has enough gems
        const updated = await tx.user.updateMany({
          where: {
            id: user.id,
            gems: { gte: TRADE_COST },
          },
          data: { gems: { decrement: TRADE_COST } },
        })

        if (updated.count === 0) {
          throw new Error('INSUFFICIENT_GEMS')
        }
      }

      // Create the trade
      const newTrade = await tx.trade.create({
        data: {
          userId: user.id,
          parentTradeId: parentTradeId || null,
        },
      })

      // Helper to map addon ID to enum type
      const getAddonType = (brainrotId: string) => {
        if (brainrotId === 'addon-robux') return 'ROBUX'
        if (brainrotId === 'addon-adds') return 'ADDS'
        if (brainrotId === 'addon-upgrade') return 'UPGRADE'
        if (brainrotId === 'addon-downgrade') return 'DOWNGRADE'
        return null
      }

      // Create offer items
      for (const item of offerItems) {
        const isAddon = item.brainrotId.startsWith('addon-')
        const addonType = isAddon ? getAddonType(item.brainrotId) : null

        const tradeItem = await tx.tradeItem.create({
          data: {
            tradeId: newTrade.id,
            side: 'OFFER',
            brainrotId: isAddon ? null : item.brainrotId,
            addonType: addonType as 'ROBUX' | 'ADDS' | 'UPGRADE' | 'DOWNGRADE' | null,
            mutationId: isAddon ? null : (item.mutationId || null),
            eventId: isAddon ? null : (item.eventId || null),
            calculatedIncome: isAddon ? null : (item.calculatedIncome ? BigInt(item.calculatedIncome) : null),
          },
        })

        // Create trait associations (only for non-addons)
        if (!isAddon && item.traitIds?.length) {
          await tx.tradeItemTrait.createMany({
            data: item.traitIds.map((traitId: string) => ({
              tradeItemId: tradeItem.id,
              traitId,
            })),
          })
        }
      }

      // Create request items
      for (const item of requestItems) {
        const isAddon = item.brainrotId.startsWith('addon-')
        const addonType = isAddon ? getAddonType(item.brainrotId) : null

        const tradeItem = await tx.tradeItem.create({
          data: {
            tradeId: newTrade.id,
            side: 'REQUEST',
            brainrotId: isAddon ? null : item.brainrotId,
            addonType: addonType as 'ROBUX' | 'ADDS' | 'UPGRADE' | 'DOWNGRADE' | null,
            mutationId: isAddon ? null : (item.mutationId || null),
            eventId: isAddon ? null : (item.eventId || null),
            calculatedIncome: isAddon ? null : (item.calculatedIncome ? BigInt(item.calculatedIncome) : null),
          },
        })

        if (!isAddon && item.traitIds?.length) {
          await tx.tradeItemTrait.createMany({
            data: item.traitIds.map((traitId: string) => ({
              tradeItemId: tradeItem.id,
              traitId,
            })),
          })
        }
      }

      return newTrade
    })

    return NextResponse.json({ trade: { id: trade.id } })
  } catch (error) {
    // Handle specific errors
    if (error instanceof Error && error.message === 'INSUFFICIENT_GEMS') {
      return NextResponse.json(
        { error: 'Not enough gems. You need 5 gems to create a trade.' },
        { status: 400 }
      )
    }
    console.error('Create trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
