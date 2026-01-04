import { ImageResponse } from '@vercel/og'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'

// Base URL for images - use environment variable or fallback
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://rot.rocks'

function formatIncome(income: number): string {
  if (income >= 1_000_000_000_000) return `${(Math.floor(income / 1_000_000_000_000 * 10) / 10).toFixed(1)}T`
  if (income >= 1_000_000_000) return `${(Math.floor(income / 1_000_000_000 * 10) / 10).toFixed(1)}B`
  if (income >= 1_000_000) return `${(Math.floor(income / 1_000_000 * 10) / 10).toFixed(1)}M`
  if (income >= 1_000) return `${(Math.floor(income / 1_000 * 10) / 10).toFixed(1)}K`
  return Math.floor(income).toString()
}

// Get mutation color for OG image
function getMutationColor(name: string): string {
  const lowerName = name.toLowerCase()
  switch (lowerName) {
    case 'gold': return '#fbbf24'
    case 'diamond': return '#60a5fa'
    case 'rainbow': return '#f472b6'
    case 'bloodrot':
    case 'bloodroot': return '#ef4444'
    case 'candy': return '#f472b6'
    case 'lava': return '#f97316'
    case 'galaxy': return '#a855f7'
    case 'yin yang':
    case 'yinyang': return '#9ca3af'
    case 'radioactive': return '#22c55e'
    case 'cursed': return '#7c3aed'
    default: return '#9ca3af'
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tradeId: string }> }
) {
  let debugStep = 'init'
  let tradeId = 'unknown'

  try {
    debugStep = 'parsing params'
    const resolvedParams = await params
    tradeId = resolvedParams.tradeId

    debugStep = 'fetching trade from db'
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
      return new Response('Trade not found', { status: 404 })
    }

    debugStep = 'filtering items'
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

    debugStep = 'calculating totals'
    const offerTotal = calculateTotal(offerItems)
    const requestTotal = calculateTotal(requestItems)

    debugStep = 'preparing render'
    // Render items as a grid (3 per row, max 2 rows = 6 items)
    const renderItemGrid = (items: typeof offerItems) => {
      if (items.length === 0) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>No items</span>
          </div>
        )
      }

      // Split into rows of 3
      const row1 = items.slice(0, 3)
      const row2 = items.slice(3, 6)

      const renderRow = (rowItems: typeof items) => (
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          {rowItems.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {/* Image container with mutation badge */}
              <div style={{ position: 'relative', display: 'flex' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: '#1f2937',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {item.brainrot?.localImage ? (
                    <img
                      src={`${BASE_URL}${item.brainrot.localImage}`}
                      alt={item.brainrot.name}
                      width={76}
                      height={76}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '24px', color: '#6b7280' }}>?</span>
                  )}
                </div>
                {/* Mutation badge */}
                {item.mutation && item.mutation.name !== 'Default' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: '#1f2937',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      color: getMutationColor(item.mutation.name),
                      border: `1px solid ${getMutationColor(item.mutation.name)}`,
                    }}
                  >
                    {item.mutation.name.charAt(0)}
                  </div>
                )}
              </div>
              {/* Brainrot name */}
              <span
                style={{
                  fontSize: '11px',
                  color: 'white',
                  textAlign: 'center',
                  maxWidth: '80px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.brainrot?.name || '?'}
              </span>
            </div>
          ))}
        </div>
      )

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {renderRow(row1)}
          {row2.length > 0 && renderRow(row2)}
        </div>
      )
    }

    debugStep = 'generating ImageResponse'
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0f1219',
            padding: '32px 40px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
              Trade by {trade.user.robloxUsername}
            </span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
              rot.rocks
            </span>
          </div>

          {/* Trade Content */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
            {/* Offer Side */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                backgroundColor: '#1a1f2e',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #2d3548',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                  Offering
                </span>
                <span style={{ fontSize: '18px', color: '#22c55e', fontWeight: '600', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '4px 12px', borderRadius: '9999px' }}>
                  ${formatIncome(offerTotal)}/s
                </span>
              </div>
              {renderItemGrid(offerItems)}
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Request Side */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                backgroundColor: '#1a1f2e',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid #2d3548',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '16px', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                  Wants
                </span>
                <span style={{ fontSize: '18px', color: '#f59e0b', fontWeight: '600', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '9999px' }}>
                  ${formatIncome(requestTotal)}/s
                </span>
              </div>
              {renderItemGrid(requestItems)}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <span style={{ fontSize: '14px', color: '#4b5563' }}>
              Brainrot Clicker Trading Hub
            </span>
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

    // Return an error image so we can see what went wrong on Vercel
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack?.split('\n').slice(0, 3).join('\n') : ''

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#1a0000',
            padding: '40px',
            fontFamily: 'monospace',
          }}
        >
          <div style={{ display: 'flex', marginBottom: '20px' }}>
            <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#ef4444' }}>
              OG Generation Error
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', color: '#f87171', marginBottom: '4px' }}>Message:</span>
              <span style={{ fontSize: '18px', color: '#fecaca', wordBreak: 'break-all' }}>
                {errorMessage}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', color: '#f87171', marginBottom: '4px' }}>Stack:</span>
              <span style={{ fontSize: '12px', color: '#fca5a5', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {errorStack || 'No stack trace'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', color: '#f87171', marginBottom: '4px' }}>Debug Info:</span>
              <span style={{ fontSize: '12px', color: '#fca5a5' }}>
                Step: {debugStep} | TradeID: {tradeId} | BASE_URL: {BASE_URL}
              </span>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  }
}
