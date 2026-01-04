import { ImageResponse } from '@vercel/og'
import { prisma } from '@/lib/db'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs/promises'

export const runtime = 'nodejs'

function formatIncome(income: number): string {
  if (income >= 1_000_000_000_000) return `${(Math.floor(income / 1_000_000_000_000 * 10) / 10).toFixed(1)}T`
  if (income >= 1_000_000_000) return `${(Math.floor(income / 1_000_000_000 * 10) / 10).toFixed(1)}B`
  if (income >= 1_000_000) return `${(Math.floor(income / 1_000_000 * 10) / 10).toFixed(1)}M`
  if (income >= 1_000) return `${(Math.floor(income / 1_000 * 10) / 10).toFixed(1)}K`
  return Math.floor(income).toString()
}

async function getImageAsBase64(localImagePath: string): Promise<string | null> {
  try {
    const fullPath = path.join(process.cwd(), 'public', localImagePath)
    const fileBuffer = await fs.readFile(fullPath)
    const pngBuffer = await sharp(fileBuffer).png().toBuffer()
    return `data:image/png;base64,${pngBuffer.toString('base64')}`
  } catch {
    return null
  }
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
              select: { name: true, localImage: true, baseIncome: true },
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

    // Pre-load all images
    const allItems = [...offerItems, ...requestItems]
    const imageMap = new Map<string, string | null>()
    await Promise.all(
      allItems.map(async (item) => {
        if (item.brainrot?.localImage) {
          const base64 = await getImageAsBase64(item.brainrot.localImage)
          imageMap.set(item.brainrot.localImage, base64)
        }
      })
    )

    const renderItems = (items: typeof offerItems) => {
      // 3 per row, max 2 rows
      const rows: typeof items[] = []
      for (let i = 0; i < items.length; i += 3) {
        rows.push(items.slice(i, i + 3))
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
          {rows.map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
              {row.map((item, i) => {
                const imgSrc = item.brainrot?.localImage
                  ? imageMap.get(item.brainrot.localImage)
                  : null

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      width: '140px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '120px',
                        height: '120px',
                        backgroundColor: '#2d3548',
                        borderRadius: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          width={110}
                          height={110}
                          style={{ objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: '48px' }}>🧠</span>
                      )}
                    </div>
                    <span
                      style={{
                        display: 'flex',
                        fontSize: '13px',
                        color: 'white',
                        marginTop: '6px',
                        textAlign: 'center',
                      }}
                    >
                      {(item.brainrot?.name || '?').length > 14
                        ? (item.brainrot?.name || '?').slice(0, 13) + '…'
                        : item.brainrot?.name || '?'}
                    </span>
                    {item.mutation && item.mutation.name !== 'Default' && (
                      <span style={{ display: 'flex', fontSize: '11px', color: '#fbbf24' }}>
                        {item.mutation.name}
                      </span>
                    )}
                  </div>
                )
              })}
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
            padding: '24px 32px',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '22px', fontWeight: 'bold', color: 'white' }}>
              Trade by {trade.user.robloxUsername}
            </span>
          </div>

          {/* Trade Content */}
          <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            {/* Offer Side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#22c55e', marginBottom: '8px', fontWeight: '600' }}>
                ${formatIncome(offerTotal)}/s
              </span>
              {renderItems(offerItems)}
            </div>

            {/* Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>

            {/* Request Side */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#22c55e', marginBottom: '8px', fontWeight: '600' }}>
                ${formatIncome(requestTotal)}/s
              </span>
              {renderItems(requestItems)}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
            <span style={{ fontSize: '14px', color: '#4b5563' }}>rot.rocks</span>
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
