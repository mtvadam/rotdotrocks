import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { checkRateLimitDynamic } from '@/lib/rate-limit'
import { generateAndUploadTradeOG, TradeForOG } from '@/lib/og-generator'

const TRADE_COST = 5

// Parse income string like "1K", "10M", "1B" to number
function parseIncomeValue(value: string): number | null {
  if (!value) return null
  const normalized = value.toUpperCase().trim()
  const match = normalized.match(/^([\d.]+)(K|M|B)?$/)
  if (!match) return null

  let num = parseFloat(match[1])
  if (isNaN(num)) return null

  const suffix = match[2]
  if (suffix === 'K') num *= 1000
  else if (suffix === 'M') num *= 1000000
  else if (suffix === 'B') num *= 1000000000

  return num
}

// GET /api/trades - List trades
export async function GET(request: NextRequest) {
  try {
    // Rate limit searches to prevent abuse
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
    const rateLimit = await checkRateLimitDynamic(`trades:search:${clientIP}`, 'trades-search')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'all'
    const search = searchParams.get('search') || ''
    const sort = searchParams.get('sort') || 'newest'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const perPage = Math.min(24, Math.max(1, parseInt(searchParams.get('perPage') || '12')))

    // Advanced filter params
    const offerBrainrots = searchParams.get('offerBrainrots')?.split(',').filter(Boolean) || []
    const offerIncomeMin = parseIncomeValue(searchParams.get('offerIncomeMin') || '')
    const offerIncomeMax = parseIncomeValue(searchParams.get('offerIncomeMax') || '')
    const requestBrainrots = searchParams.get('requestBrainrots')?.split(',').filter(Boolean) || []
    const requestIncomeMin = parseIncomeValue(searchParams.get('requestIncomeMin') || '')
    const requestIncomeMax = parseIncomeValue(searchParams.get('requestIncomeMax') || '')
    const offerTradeTypes = searchParams.get('offerTradeTypes')?.split(',').filter(Boolean) || []
    const requestTradeTypes = searchParams.get('requestTradeTypes')?.split(',').filter(Boolean) || []
    const offerBadges = searchParams.get('offerBadges')?.split(',').filter(Boolean) || []
    const requestBadges = searchParams.get('requestBadges')?.split(',').filter(Boolean) || []

    // Badge thresholds
    const LB_VIABLE_THRESHOLD = 2_000_000_000 // 2B
    const TRAIT_STACKED_THRESHOLD = 5

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

    // Search filter - match username or brainrot names
    if (search) {
      where.OR = [
        { user: { robloxUsername: { contains: search, mode: 'insensitive' } } },
        { items: { some: { brainrot: { name: { contains: search, mode: 'insensitive' } } } } },
      ]
    }

    // Store search term for post-fetch relevance sorting
    const searchTerm = search.toLowerCase()

    // Advanced filters - build item conditions
    const itemConditions: any[] = []

    // Offer side brainrot filter
    if (offerBrainrots.length > 0) {
      itemConditions.push({
        items: {
          some: {
            side: 'OFFER',
            brainrotId: { in: offerBrainrots },
          },
        },
      })
    }

    // Request side brainrot filter
    if (requestBrainrots.length > 0) {
      itemConditions.push({
        items: {
          some: {
            side: 'REQUEST',
            brainrotId: { in: requestBrainrots },
          },
        },
      })
    }

    // Offer side trade type filter (addons)
    if (offerTradeTypes.length > 0) {
      itemConditions.push({
        items: {
          some: {
            side: 'OFFER',
            addonType: { in: offerTradeTypes },
          },
        },
      })
    }

    // Request side trade type filter (addons)
    if (requestTradeTypes.length > 0) {
      itemConditions.push({
        items: {
          some: {
            side: 'REQUEST',
            addonType: { in: requestTradeTypes },
          },
        },
      })
    }

    // LB Viable badge filters - at DB level for 100% reliability
    if (offerBadges.includes('LB_VIABLE')) {
      itemConditions.push({
        items: {
          some: {
            side: 'OFFER',
            calculatedIncome: { gte: LB_VIABLE_THRESHOLD },
          },
        },
      })
    }
    if (requestBadges.includes('LB_VIABLE')) {
      itemConditions.push({
        items: {
          some: {
            side: 'REQUEST',
            calculatedIncome: { gte: LB_VIABLE_THRESHOLD },
          },
        },
      })
    }

    // Apply item conditions
    if (itemConditions.length > 0) {
      where.AND = [...(where.AND || []), ...itemConditions]
    }

    // Check if we have trait stacked badges (these need post-fetch filtering)
    const hasTraitStackedFilter =
      offerBadges.includes('TRAIT_STACKED') || requestBadges.includes('TRAIT_STACKED')

    // Determine if we have post-fetch filters that require fetching all trades
    // Note: LB_VIABLE is now filtered at DB level, so not included here
    const hasPostFetchFilters =
      offerIncomeMin !== null || offerIncomeMax !== null ||
      requestIncomeMin !== null || requestIncomeMax !== null ||
      hasTraitStackedFilter ||
      searchTerm // Search relevance sorting also requires all trades

    // Fetch trades - if post-fetch filters exist, get ALL matching trades for 100% accuracy
    // Rate limiting prevents abuse of this
    const skipAmount = hasPostFetchFilters ? 0 : (page - 1) * perPage

    // Get trades and count
    const [trades, dbTotal] = await Promise.all([
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
                robuxValue: true,
                mutationValues: {
                  select: {
                    mutationId: true,
                    robuxValue: true,
                    mutation: {
                      select: {
                        name: true,
                        multiplier: true,
                      },
                    },
                  },
                },
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
      ...(hasPostFetchFilters ? {} : { take: perPage }), // Fetch all when filtering, paginate at DB level otherwise
      skip: skipAmount,
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

    // Helper to get resolved Robux value for brainrot + mutation combo
    // Returns { value, isFallback, sourceMutationName } for tracking inherited values
    const getResolvedRobuxValue = (
      brainrot: { robuxValue: number | null; mutationValues: Array<{ mutationId: string; robuxValue: number; mutation: { name: string; multiplier: number } }> },
      mutationId: string | null,
      targetMutationMultiplier: number | null
    ): { value: number | null; isFallback: boolean; sourceMutationName: string | null } => {
      // If there's a mutation, check for mutation-specific value
      if (mutationId) {
        const mutationValue = brainrot.mutationValues.find(mv => mv.mutationId === mutationId)
        if (mutationValue) {
          return { value: mutationValue.robuxValue, isFallback: false, sourceMutationName: null }
        }

        // No explicit value - try to find fallback from lower mutation
        if (targetMutationMultiplier !== null) {
          const sortedValues = brainrot.mutationValues
            .filter(mv => mv.mutation.multiplier < targetMutationMultiplier)
            .sort((a, b) => b.mutation.multiplier - a.mutation.multiplier)

          if (sortedValues.length > 0) {
            const fallback = sortedValues[0]
            return { value: fallback.robuxValue, isFallback: true, sourceMutationName: fallback.mutation.name }
          }
        }

        // Fall back to base value
        return { value: brainrot.robuxValue, isFallback: brainrot.robuxValue !== null, sourceMutationName: brainrot.robuxValue !== null ? 'Base' : null }
      }
      // No mutation, return base value
      return { value: brainrot.robuxValue, isFallback: false, sourceMutationName: null }
    }

    // Serialize BigInt values and handle addon items
    let serializedTrades = trades.map((trade) => ({
      ...trade,
      items: trade.items.map((item) => {
        // Handle addon items (no brainrot, has addonType)
        if (item.addonType && !item.brainrot) {
          const addonInfo = ADDON_INFO[item.addonType]
          // For ROBUX addon, show the amount in the name
          const displayName = item.addonType === 'ROBUX' && item.robuxAmount
            ? `R$${item.robuxAmount.toLocaleString()}`
            : addonInfo?.name || item.addonType
          return {
            ...item,
            calculatedIncome: null,
            robuxValue: null,
            hasTraits: false,
            valueFallback: false,
            valueFallbackSource: null,
            traitCount: 0,
            brainrot: {
              id: `addon-${item.addonType.toLowerCase()}`,
              name: displayName,
              localImage: addonInfo?.image || null,
              baseIncome: '0',
            },
          }
        }
        // Regular brainrot items - resolve the Robux value
        const resolvedValue = item.brainrot
          ? getResolvedRobuxValue(item.brainrot, item.mutationId, item.mutation?.multiplier ?? null)
          : { value: null, isFallback: false, sourceMutationName: null }
        const hasTraits = (item.traits?.length || 0) > 0

        return {
          ...item,
          calculatedIncome: item.calculatedIncome?.toString() || null,
          robuxValue: resolvedValue.value,
          hasTraits,
          valueFallback: resolvedValue.isFallback,
          valueFallbackSource: resolvedValue.sourceMutationName,
          traitCount: item.traits?.length || 0,
          brainrot: item.brainrot ? {
            id: item.brainrot.id,
            name: item.brainrot.name,
            localImage: item.brainrot.localImage,
            baseIncome: item.brainrot.baseIncome.toString(),
          } : null,
        }
      }),
    }))

    // Sort by search relevance if searching
    if (searchTerm) {
      serializedTrades.sort((a, b) => {
        const scoreItem = (trade: typeof serializedTrades[0]) => {
          let maxScore = 0

          // Check username
          const username = trade.user.robloxUsername.toLowerCase()
          if (username === searchTerm) maxScore = Math.max(maxScore, 100)
          else if (username.startsWith(searchTerm)) maxScore = Math.max(maxScore, 80)
          else if (username.includes(searchTerm)) maxScore = Math.max(maxScore, 40)

          // Check brainrot names
          for (const item of trade.items) {
            if (!item.brainrot) continue
            const name = item.brainrot.name.toLowerCase()
            if (name === searchTerm) maxScore = Math.max(maxScore, 100)
            else if (name.startsWith(searchTerm)) maxScore = Math.max(maxScore, 80)
            else if (name.split(' ').some((word: string) => word.startsWith(searchTerm))) maxScore = Math.max(maxScore, 60)
            else if (name.includes(searchTerm)) maxScore = Math.max(maxScore, 40)
          }

          return maxScore
        }

        return scoreItem(b) - scoreItem(a)
      })
    }

    // Apply income filters (post-fetch since we need totals per side)
    if (offerIncomeMin !== null || offerIncomeMax !== null) {
      serializedTrades = serializedTrades.filter((trade) => {
        const offerTotal = trade.items
          .filter((i) => i.side === 'OFFER' && i.calculatedIncome)
          .reduce((sum, i) => sum + parseFloat(i.calculatedIncome || '0'), 0)

        if (offerIncomeMin !== null && offerTotal < offerIncomeMin) return false
        if (offerIncomeMax !== null && offerTotal > offerIncomeMax) return false
        return true
      })
    }

    if (requestIncomeMin !== null || requestIncomeMax !== null) {
      serializedTrades = serializedTrades.filter((trade) => {
        const requestTotal = trade.items
          .filter((i) => i.side === 'REQUEST' && i.calculatedIncome)
          .reduce((sum, i) => sum + parseFloat(i.calculatedIncome || '0'), 0)

        if (requestIncomeMin !== null && requestTotal < requestIncomeMin) return false
        if (requestIncomeMax !== null && requestTotal > requestIncomeMax) return false
        return true
      })
    }

    // Apply TRAIT_STACKED badge filters (post-fetch since it requires counting relations)
    // Note: LB_VIABLE is filtered at DB level, so not needed here
    if (offerBadges.includes('TRAIT_STACKED')) {
      serializedTrades = serializedTrades.filter((trade) => {
        const offerItems = trade.items.filter((i) => i.side === 'OFFER')
        return offerItems.some((i) => (i.traitCount || 0) >= TRAIT_STACKED_THRESHOLD)
      })
    }

    if (requestBadges.includes('TRAIT_STACKED')) {
      serializedTrades = serializedTrades.filter((trade) => {
        const requestItems = trade.items.filter((i) => i.side === 'REQUEST')
        return requestItems.some((i) => (i.traitCount || 0) >= TRAIT_STACKED_THRESHOLD)
      })
    }

    // Calculate pagination after all filters applied
    let totalFiltered: number
    let paginatedTrades = serializedTrades

    if (hasPostFetchFilters) {
      // Post-fetch filters applied - use filtered count
      totalFiltered = serializedTrades.length
      const startIndex = (page - 1) * perPage
      paginatedTrades = serializedTrades.slice(startIndex, startIndex + perPage)
    } else {
      // No post-fetch filters - use DB count
      totalFiltered = dbTotal
    }

    const totalPages = Math.max(1, Math.ceil(totalFiltered / perPage))

    return NextResponse.json({
      trades: paginatedTrades,
      total: totalFiltered,
      page,
      perPage,
      totalPages,
      hasMore: page < totalPages,
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
            robuxAmount: addonType === 'ROBUX' && item.robuxAmount ? item.robuxAmount : null,
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
            robuxAmount: addonType === 'ROBUX' && item.robuxAmount ? item.robuxAmount : null,
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

    // If counter offer, notify the parent trade owner
    if (isCounterOffer) {
      const parentTrade = await prisma.trade.findUnique({
        where: { id: parentTradeId },
        select: { userId: true },
      })
      if (parentTrade) {
        await prisma.notification.create({
          data: {
            userId: parentTrade.userId,
            type: 'COUNTER_OFFER',
            message: `${user.robloxUsername} sent you a counter offer`,
            tradeId: parentTradeId,
            fromUserId: user.id,
          },
        })
      }
    }

    // Generate OG image in the background (don't block trade creation)
    // Fetch all data needed NOW while we have a connection, then generate async
    const tradeWithItems = await prisma.trade.findUnique({
      where: { id: trade.id },
      include: {
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

    if (tradeWithItems) {
      // Prepare the trade data for OG generator
      const tradeForOG: TradeForOG = {
        id: tradeWithItems.id,
        user: { robloxUsername: user.robloxUsername },
        items: tradeWithItems.items.map((item) => ({
          side: item.side,
          brainrot: item.brainrot,
          mutation: item.mutation,
          traits: item.traits,
          addonType: item.addonType,
        })),
      }

      // Generate in background - pass all data so no extra DB calls needed
      generateAndSaveOGImage(trade.id, tradeForOG).catch((error) => {
        console.error('Background OG generation failed:', error)
      })
    }

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

// Helper function to generate OG image and save URL - no extra DB queries needed
async function generateAndSaveOGImage(tradeId: string, tradeForOG: TradeForOG) {
  try {
    // Generate and upload the OG image
    const ogImageUrl = await generateAndUploadTradeOG(tradeForOG)

    if (ogImageUrl) {
      // Update the trade with the OG image URL
      await prisma.trade.update({
        where: { id: tradeId },
        data: { ogImageUrl },
      })
      console.log('OG image generated for trade:', tradeId, ogImageUrl)
    }
  } catch (error) {
    console.error('Failed to generate OG image for trade:', tradeId, error)
  }
}
