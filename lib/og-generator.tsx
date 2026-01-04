import { ImageResponse } from '@vercel/og'
import { put } from '@vercel/blob'
import path from 'path'
import fs from 'fs/promises'

// Image dimensions
const OG_WIDTH = 1200
const OG_HEIGHT = 630

// Colors - minimal palette
const COLORS = {
  white: '#ffffff',
  gray: '#9ca3af',
  lightGray: '#e5e7eb',
  green: '#22c55e',
  orange: '#f59e0b',
  imageBg: 'rgba(0, 0, 0, 0.08)',
  textDark: '#1f2937',
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

// Load image and convert to base64 data URI
// Tries filesystem first (works in local dev), then falls back to HTTP (works on Vercel)
async function loadImageAsDataUri(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null

  const ext = path.extname(imagePath).toLowerCase()
  const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png'

  // Try filesystem first (faster, works in local dev and build time)
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const fullPath = imagePath.startsWith('/')
      ? path.join(publicDir, imagePath)
      : path.join(publicDir, imagePath)

    const buffer = await fs.readFile(fullPath)
    const base64 = buffer.toString('base64')
    return `data:${mimeType};base64,${base64}`
  } catch (fsError) {
    // Filesystem failed - try HTTP fallback for Vercel runtime
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rot.rocks'
      const imageUrl = imagePath.startsWith('/') ? `${baseUrl}${imagePath}` : `${baseUrl}/${imagePath}`

      const response = await fetch(imageUrl, {
        headers: { 'Accept': 'image/*' },
      })

      if (!response.ok) {
        console.error(`HTTP image fetch failed: ${response.status} for ${imageUrl}`)
        return null
      }

      const arrayBuffer = await response.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      return `data:${mimeType};base64,${base64}`
    } catch (httpError) {
      console.error(`Failed to load image via HTTP: ${imagePath}`, httpError)
      return null
    }
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

  // Render items grid - maximized for space
  const renderItemGrid = (items: TradeItemForOG[]) => {
    if (items.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <span style={{ fontSize: '20px', color: COLORS.gray }}>No items</span>
        </div>
      )
    }

    // Calculate optimal image size based on item count
    // For 1-3 items: single row, larger images
    // For 4-6 items: two rows
    const itemCount = items.length
    const isSingleRow = itemCount <= 3
    const imageSize = isSingleRow ? 140 : 120
    const gap = isSingleRow ? 24 : 16

    const row1 = items.slice(0, 3)
    const row2 = items.slice(3, 6)

    const renderRow = (rowItems: TradeItemForOG[]) => (
      <div style={{ display: 'flex', gap: `${gap}px`, justifyContent: 'center' }}>
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
                gap: '8px',
              }}
            >
              <div style={{ position: 'relative', display: 'flex' }}>
                <div
                  style={{
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    backgroundColor: COLORS.imageBg,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {imageDataUri ? (
                    <img
                      src={imageDataUri}
                      width={imageSize - 8}
                      height={imageSize - 8}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '32px', color: COLORS.gray }}>?</span>
                  )}
                </div>
                {item.mutation && item.mutation.name !== 'Default' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      backgroundColor: COLORS.white,
                      borderRadius: '6px',
                      padding: '3px 8px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: getMutationColor(item.mutation.name),
                      border: `2px solid ${getMutationColor(item.mutation.name)}`,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  >
                    {item.mutation.name.charAt(0)}
                  </div>
                )}
              </div>
              <span
                style={{
                  fontSize: '14px',
                  color: COLORS.textDark,
                  textAlign: 'center',
                  maxWidth: `${imageSize}px`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: '500',
                }}
              >
                {itemName.length > 14 ? itemName.slice(0, 13) + '...' : itemName}
              </span>
            </div>
          )
        })}
      </div>
    )

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px`, alignItems: 'center' }}>
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
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.white,
          padding: '40px 48px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Offer Side */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <span style={{ fontSize: '24px', color: COLORS.green, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>
              Offering
            </span>
            <span style={{ fontSize: '22px', color: COLORS.green, fontWeight: '600', backgroundColor: 'rgba(34, 197, 94, 0.15)', padding: '6px 16px', borderRadius: '9999px' }}>
              ${formatIncome(offerTotal)}/s
            </span>
          </div>
          {renderItemGrid(offerItems)}
        </div>

        {/* Arrow */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 32px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="2.5">
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <span style={{ fontSize: '24px', color: COLORS.orange, textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 'bold' }}>
              Wants
            </span>
            <span style={{ fontSize: '22px', color: COLORS.orange, fontWeight: '600', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '6px 16px', borderRadius: '9999px' }}>
              ${formatIncome(requestTotal)}/s
            </span>
          </div>
          {renderItemGrid(requestItems)}
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
    console.log(`[OG] Generating image for trade ${trade.id}...`)

    const imageBuffer = await generateTradeOGImage(trade)
    console.log(`[OG] Generated ${imageBuffer.length} bytes for trade ${trade.id}`)

    const blobUrl = await uploadTradeOGImage(trade.id, imageBuffer)
    console.log(`[OG] Uploaded to blob: ${blobUrl}`)

    return blobUrl
  } catch (error) {
    console.error(`[OG] Failed to generate/upload OG image for trade ${trade.id}:`, error)

    // Log more details for debugging
    if (error instanceof Error) {
      console.error(`[OG] Error name: ${error.name}`)
      console.error(`[OG] Error message: ${error.message}`)
      console.error(`[OG] Error stack: ${error.stack}`)
    }

    return null
  }
}
