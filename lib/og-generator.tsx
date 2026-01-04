import { ImageResponse } from '@vercel/og'
import { put } from '@vercel/blob'
import path from 'path'
import fs from 'fs/promises'

// Image dimensions
const OG_WIDTH = 1200
const OG_HEIGHT = 630

// Colors
const COLORS = {
  background: '#0f1219',
  cardBg: '#1a1f2e',
  cardBorder: '#2d3548',
  white: '#ffffff',
  gray: '#6b7280',
  darkGray: '#4b5563',
  green: '#22c55e',
  orange: '#f59e0b',
  imageBg: '#1f2937',
}

// Mutation colors
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

// Format income for display
function formatIncome(income: number): string {
  if (income >= 1_000_000_000_000) return `${(Math.floor(income / 1_000_000_000_000 * 10) / 10).toFixed(1)}T`
  if (income >= 1_000_000_000) return `${(Math.floor(income / 1_000_000_000 * 10) / 10).toFixed(1)}B`
  if (income >= 1_000_000) return `${(Math.floor(income / 1_000_000 * 10) / 10).toFixed(1)}M`
  if (income >= 1_000) return `${(Math.floor(income / 1_000 * 10) / 10).toFixed(1)}K`
  return Math.floor(income).toString()
}

// Trade item type for the generator
export interface TradeItemForOG {
  brainrot: {
    name: string
    baseIncome: bigint
    localImage: string | null
  } | null
  mutation: {
    name: string
    multiplier: number
  } | null
  traits: Array<{
    trait: {
      multiplier: number
    }
  }>
  addonType?: string | null
}

export interface TradeForOG {
  id: string
  user: {
    robloxUsername: string
  }
  items: Array<TradeItemForOG & { side: string }>
}

// Addon display info
const ADDON_INFO: Record<string, { name: string; image: string }> = {
  ROBUX: { name: 'Add Robux', image: '/trade-only/add-robux.png' },
  ADDS: { name: 'Adds', image: '/trade-only/trade-adds.png' },
  UPGRADE: { name: 'Upgrade', image: '/trade-only/trade-upgrade.png' },
  DOWNGRADE: { name: 'Downgrade', image: '/trade-only/trade-downgrade.png' },
}

// Calculate total income for items
function calculateTotal(items: TradeItemForOG[]): number {
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

// Load image from public directory and convert to base64 data URI
async function loadImageAsDataUri(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null

  try {
    const publicDir = path.join(process.cwd(), 'public')
    const fullPath = imagePath.startsWith('/')
      ? path.join(publicDir, imagePath)
      : path.join(publicDir, imagePath)

    const buffer = await fs.readFile(fullPath)
    const base64 = buffer.toString('base64')
    // Detect mime type from extension
    const ext = path.extname(fullPath).toLowerCase()
    const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'
    return `data:${mimeType};base64,${base64}`
  } catch (error) {
    console.error(`Failed to load image: ${imagePath}`, error)
    return null
  }
}

// Generate the OG image for a trade using @vercel/og with embedded base64 images
export async function generateTradeOGImage(trade: TradeForOG): Promise<Buffer> {
  const offerItems = trade.items.filter(i => i.side === 'OFFER').slice(0, 6)
  const requestItems = trade.items.filter(i => i.side === 'REQUEST').slice(0, 6)

  const offerTotal = calculateTotal(offerItems)
  const requestTotal = calculateTotal(requestItems)

  // Pre-load all images as base64 data URIs
  const imageCache = new Map<string, string | null>()

  for (const item of [...offerItems, ...requestItems]) {
    let imagePath = item.brainrot?.localImage || null
    if (item.addonType && ADDON_INFO[item.addonType]) {
      imagePath = ADDON_INFO[item.addonType].image
    }
    if (imagePath && !imageCache.has(imagePath)) {
      imageCache.set(imagePath, await loadImageAsDataUri(imagePath))
    }
  }

  // Helper to get image data URI
  const getImageDataUri = (item: TradeItemForOG): string | null => {
    let imagePath = item.brainrot?.localImage || null
    if (item.addonType && ADDON_INFO[item.addonType]) {
      imagePath = ADDON_INFO[item.addonType].image
    }
    return imagePath ? imageCache.get(imagePath) || null : null
  }

  // Helper to get item name
  const getItemName = (item: TradeItemForOG): string => {
    if (item.addonType && ADDON_INFO[item.addonType]) {
      return ADDON_INFO[item.addonType].name
    }
    return item.brainrot?.name || '?'
  }

  // Render items grid
  const renderItemGrid = (items: TradeItemForOG[]) => {
    if (items.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100px' }}>
          <span style={{ fontSize: '14px', color: COLORS.gray }}>No items</span>
        </div>
      )
    }

    const row1 = items.slice(0, 3)
    const row2 = items.slice(3, 6)

    const renderRow = (rowItems: TradeItemForOG[]) => (
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {rowItems.map((item, i) => {
          const imageDataUri = getImageDataUri(item)
          const itemName = getItemName(item)
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <div style={{ position: 'relative', display: 'flex' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    backgroundColor: COLORS.imageBg,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {imageDataUri ? (
                    <img
                      src={imageDataUri}
                      width={76}
                      height={76}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '24px', color: COLORS.gray }}>?</span>
                  )}
                </div>
                {item.mutation && item.mutation.name !== 'Default' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: COLORS.imageBg,
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
                {itemName.length > 12 ? itemName.slice(0, 11) + '...' : itemName}
              </span>
            </div>
          )
        })}
      </div>
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
        {renderRow(row1)}
        {row2.length > 0 && renderRow(row2)}
      </div>
    )
  }

  const imageResponse = new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: COLORS.background,
          padding: '32px 40px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '32px', fontWeight: 'bold', color: 'white' }}>
            Trade by {trade.user.robloxUsername}
          </span>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: COLORS.green }}>
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
              backgroundColor: COLORS.cardBg,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${COLORS.cardBorder}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', color: COLORS.green, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                Offering
              </span>
              <span style={{ fontSize: '18px', color: COLORS.green, fontWeight: '600', backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: '4px 12px', borderRadius: '9999px' }}>
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
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="2.5">
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
              backgroundColor: COLORS.cardBg,
              borderRadius: '16px',
              padding: '20px',
              border: `1px solid ${COLORS.cardBorder}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '16px', color: COLORS.orange, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 'bold' }}>
                Wants
              </span>
              <span style={{ fontSize: '18px', color: COLORS.orange, fontWeight: '600', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: '4px 12px', borderRadius: '9999px' }}>
                ${formatIncome(requestTotal)}/s
              </span>
            </div>
            {renderItemGrid(requestItems)}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
          <span style={{ fontSize: '14px', color: COLORS.darkGray }}>
            Brainrot Clicker Trading Hub
          </span>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
    }
  )

  // Convert ImageResponse to Buffer
  const arrayBuffer = await imageResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

// Upload the generated image to Vercel Blob
export async function uploadTradeOGImage(tradeId: string, imageBuffer: Buffer): Promise<string> {
  const blob = await put(`og-images/trades/${tradeId}.png`, imageBuffer, {
    access: 'public',
    contentType: 'image/png',
  })

  return blob.url
}

// Main function to generate and upload OG image for a trade
export async function generateAndUploadTradeOG(trade: TradeForOG): Promise<string | null> {
  try {
    const imageBuffer = await generateTradeOGImage(trade)
    const blobUrl = await uploadTradeOGImage(trade.id, imageBuffer)
    return blobUrl
  } catch (error) {
    console.error('Failed to generate/upload OG image:', error)
    return null
  }
}
