import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'

// GET /api/trades/[id] - Get single trade with counter offers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const trade = await prisma.trade.findUnique({
      where: { id },
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
        counterOffers: {
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
          },
          orderBy: { createdAt: 'desc' },
        },
        requests: {
          include: {
            requester: {
              select: {
                id: true,
                robloxUsername: true,
                robloxUserId: true,
                robloxAvatarUrl: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Addon display info
    const ADDON_INFO: Record<string, { name: string; image: string }> = {
      ROBUX: { name: 'Add Robux', image: '/trade-only/add-robux.png' },
      ADDS: { name: 'Adds', image: '/trade-only/trade-adds.png' },
      UPGRADE: { name: 'Upgrade', image: '/trade-only/trade-upgrade.png' },
      DOWNGRADE: { name: 'Downgrade', image: '/trade-only/trade-downgrade.png' },
    }

    // Helper to serialize item with addon support
    const serializeItem = (item: typeof trade.items[0]) => {
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
      return {
        ...item,
        calculatedIncome: item.calculatedIncome?.toString() || null,
        brainrot: item.brainrot ? {
          ...item.brainrot,
          baseIncome: item.brainrot.baseIncome.toString(),
        } : null,
      }
    }

    // Serialize BigInt values and handle addon items
    const serializedTrade = {
      ...trade,
      items: trade.items.map(serializeItem),
      counterOffers: trade.counterOffers.map((co) => ({
        ...co,
        items: co.items.map(serializeItem),
      })),
    }

    return NextResponse.json({ trade: serializedTrade })
  } catch (error) {
    console.error('Get trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/trades/[id] - Update trade status or verify
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is banned or frozen (admins exempt for moderation)
    if (user.role !== 'ADMIN') {
      if (user.isBanned) {
        return NextResponse.json({ error: 'Your account is banned' }, { status: 403 })
      }
      if (user.isFrozen) {
        return NextResponse.json({ error: 'Your account is frozen' }, { status: 403 })
      }
    }

    const { id } = await params
    const body = await request.json()
    const { status, isVerified, acceptCounterOfferId } = body

    const trade = await prisma.trade.findUnique({
      where: { id },
      include: { counterOffers: true },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Handle accepting a counter offer
    if (acceptCounterOfferId) {
      if (trade.userId !== user.id) {
        return NextResponse.json({ error: 'Only trade owner can accept counter offers' }, { status: 403 })
      }

      const counterOffer = trade.counterOffers.find((co) => co.id === acceptCounterOfferId)
      if (!counterOffer) {
        return NextResponse.json({ error: 'Counter offer not found' }, { status: 404 })
      }

      // Update both trades
      await prisma.$transaction([
        prisma.trade.update({
          where: { id: trade.id },
          data: { status: 'PENDING' },
        }),
        prisma.trade.update({
          where: { id: acceptCounterOfferId },
          data: { status: 'PENDING' },
        }),
      ])

      return NextResponse.json({ success: true })
    }

    // Handle status update
    if (status) {
      if (trade.userId !== user.id) {
        return NextResponse.json({ error: 'Only trade owner can update status' }, { status: 403 })
      }

      if (!['PENDING', 'COMPLETED', 'CANCELLED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      await prisma.trade.update({
        where: { id },
        data: { status },
      })

      return NextResponse.json({ success: true })
    }

    // Handle verification (admin only)
    if (typeof isVerified === 'boolean') {
      if (user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Only admins can verify trades' }, { status: 403 })
      }

      await prisma.trade.update({
        where: { id },
        data: {
          isVerified,
          verifiedByUserId: isVerified ? user.id : null,
          verifiedAt: isVerified ? new Date() : null,
        },
      })

      // Create audit log for verification action
      await createAuditLog(
        user.id,
        isVerified ? AuditActions.TRADE_VERIFIED : AuditActions.TRADE_UNVERIFIED,
        'trade',
        id,
        { tradeOwnerId: trade.userId }
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 })
  } catch (error) {
    console.error('Update trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/trades/[id] - Delete/cancel a trade
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is banned or frozen (admins exempt for moderation)
    if (user.role !== 'ADMIN') {
      if (user.isBanned) {
        return NextResponse.json({ error: 'Your account is banned' }, { status: 403 })
      }
      if (user.isFrozen) {
        return NextResponse.json({ error: 'Your account is frozen' }, { status: 403 })
      }
    }

    const { id } = await params

    const trade = await prisma.trade.findUnique({
      where: { id },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    if (trade.userId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Soft delete by setting status to CANCELLED
    await prisma.trade.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete trade error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
