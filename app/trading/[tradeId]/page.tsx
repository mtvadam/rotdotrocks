import { Metadata } from 'next'
import { prisma } from '@/lib/db'
import TradePageClient from './TradePageClient'

// Helper to format income for metadata
function formatIncome(income: bigint | string): string {
  const num = typeof income === 'bigint' ? Number(income) : parseFloat(String(income))
  if (num >= 1_000_000_000_000) return `${(Math.round(num / 1_000_000_000_000 * 10) / 10).toFixed(1)}T`
  if (num >= 1_000_000_000) return `${(Math.round(num / 1_000_000_000 * 10) / 10).toFixed(1)}B`
  if (num >= 1_000_000) return `${(Math.round(num / 1_000_000 * 10) / 10).toFixed(1)}M`
  if (num >= 1_000) return `${(Math.round(num / 1_000 * 10) / 10).toFixed(1)}K`
  return Math.round(num).toString()
}

export async function generateMetadata(
  { params }: { params: Promise<{ tradeId: string }> }
): Promise<Metadata> {
  const { tradeId } = await params

  try {
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        id: true,
        ogImageUrl: true,
        user: {
          select: { robloxUsername: true },
        },
        items: {
          include: {
            brainrot: {
              select: { name: true, baseIncome: true },
            },
            mutation: {
              select: { name: true, multiplier: true },
            },
            traits: {
              include: {
                trait: {
                  select: { multiplier: true },
                },
              },
            },
          },
        },
      },
    })

    if (!trade) {
      return {
        title: 'Trade Not Found | rot.rocks',
        description: 'This trade could not be found.',
      }
    }

    const offerItems = trade.items.filter(i => i.side === 'OFFER')
    const requestItems = trade.items.filter(i => i.side === 'REQUEST')

    // Calculate totals
    const calculateTotal = (items: typeof offerItems) => {
      let total = 0
      for (const item of items) {
        if (item.brainrot) {
          const baseIncome = Number(item.brainrot.baseIncome)
          const mutationMult = item.mutation?.multiplier || 1
          const traitSum = item.traits.reduce((sum, t) => sum + t.trait.multiplier, 0) || 1
          total += baseIncome * mutationMult * traitSum
        }
      }
      return total
    }

    const offerTotal = calculateTotal(offerItems)
    const requestTotal = calculateTotal(requestItems)

    // Build description
    const offerNames = offerItems.slice(0, 3).map(i => i.brainrot?.name || 'Unknown').join(', ')
    const requestNames = requestItems.slice(0, 3).map(i => i.brainrot?.name || 'Unknown').join(', ')

    const title = `Trade by ${trade.user.robloxUsername} | rot.rocks`

    // Use pre-generated OG image from Vercel Blob if available, fallback to dynamic route
    const ogImageUrl = trade.ogImageUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://rot.rocks'}/api/og/trade/${tradeId}`

    return {
      title,
      openGraph: {
        title,
        type: 'website',
        url: `https://rot.rocks/trading/${tradeId}`,
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `Trade by ${trade.user.robloxUsername}`,
          },
        ],
        siteName: 'rot.rocks',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        images: [ogImageUrl],
      },
      other: {
        'theme-color': '#22c55e', // Green bar on Discord embeds
      },
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Trade | rot.rocks',
      description: 'View this trade on rot.rocks',
    }
  }
}

export default async function TradePage({ params }: { params: Promise<{ tradeId: string }> }) {
  const { tradeId } = await params
  return <TradePageClient tradeId={tradeId} />
}
