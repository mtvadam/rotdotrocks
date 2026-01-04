import { ImageResponse } from '@vercel/og'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

function formatIncome(income: number): string {
  if (income >= 1_000_000_000_000) return `${(Math.floor(income / 1_000_000_000_000 * 10) / 10).toFixed(1)}T`
  if (income >= 1_000_000_000) return `${(Math.floor(income / 1_000_000_000 * 10) / 10).toFixed(1)}B`
  if (income >= 1_000_000) return `${(Math.floor(income / 1_000_000 * 10) / 10).toFixed(1)}M`
  if (income >= 1_000) return `${(Math.floor(income / 1_000 * 10) / 10).toFixed(1)}K`
  return Math.floor(income).toString()
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tradeId: string }> }
) {
  try {
    const { tradeId } = await params

    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
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
                trait: { select: { multiplier: true } },
              },
            },
          },
        },
      },
    })

    if (!trade) {
      return new Response('Trade not found', { status: 404 })
    }

    const offerItems = trade.items.filter(i => i.side === 'OFFER').slice(0, 6)
    const requestItems = trade.items.filter(i => i.side === 'REQUEST').slice(0, 6)

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

    const renderItems = (items: typeof offerItems) => {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#2d3548',
                borderRadius: '8px',
                padding: '8px 16px',
              }}
            >
              <span style={{ fontSize: '16px', color: 'white' }}>
                {item.brainrot?.name || '?'}
              </span>
              {item.mutation && item.mutation.name !== 'Default' && (
                <span style={{ fontSize: '14px', color: '#fbbf24' }}>
                  ({item.mutation.name})
                </span>
              )}
            </div>
          ))}
        </div>
      )
    }

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f1219',
            padding: '40px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>
              Trade by {trade.user.robloxUsername}
            </span>
          </div>

          {/* Trade Content */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Offer Side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <span style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Offering
              </span>
              <span style={{ fontSize: '20px', color: '#22c55e', marginBottom: '16px', fontWeight: '600' }}>
                ${formatIncome(offerTotal)}/s
              </span>
              {renderItems(offerItems)}
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            {/* Request Side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <span style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Requesting
              </span>
              <span style={{ fontSize: '20px', color: '#22c55e', marginBottom: '16px', fontWeight: '600' }}>
                ${formatIncome(requestTotal)}/s
              </span>
              {renderItems(requestItems)}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px' }}>
            <span style={{ fontSize: '16px', color: '#4b5563' }}>rot.rocks</span>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (error) {
    console.error('OG Image generation error:', error)
    return new Response('Failed to generate image', { status: 500 })
  }
}
