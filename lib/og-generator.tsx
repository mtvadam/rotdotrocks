import satori from 'satori'
import sharp from 'sharp'
import { put } from '@vercel/blob'
import path from 'path'
import fs from 'fs/promises'

// Image dimensions
const OG_WIDTH = 1200
const OG_HEIGHT = 630

// Load fonts for OG images
let comicNeueFont: ArrayBuffer | null = null
let interFont: ArrayBuffer | null = null

async function loadComicNeueFont(): Promise<ArrayBuffer | null> {
  if (comicNeueFont) return comicNeueFont

  try {
    const fontPath = path.join(process.cwd(), 'public', 'ComicNeue-Bold.ttf')
    const fontBuffer = await fs.readFile(fontPath)
    comicNeueFont = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength)
    return comicNeueFont
  } catch (error) {
    console.error('Failed to load Comic Neue font:', error)
    return null
  }
}

async function loadInterFont(): Promise<ArrayBuffer | null> {
  if (interFont) return interFont

  try {
    // Try loading static Inter Bold first (if available)
    const staticFontPath = path.join(process.cwd(), 'public', 'Inter-Bold.ttf')
    try {
      const fontBuffer = await fs.readFile(staticFontPath)
      interFont = fontBuffer.buffer.slice(fontBuffer.byteOffset, fontBuffer.byteOffset + fontBuffer.byteLength)
      return interFont
    } catch {
      // Static font not found, try fetching from Google Fonts
      const response = await fetch('https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZJhiJ-Ek-_EeA.woff')
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer()
        interFont = arrayBuffer
        return interFont
      }
    }
    return null
  } catch (error) {
    console.error('Failed to load Inter font:', error)
    return null
  }
}

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

// Mutation colors/gradients matching globals.css
function getMutationStyle(name: string): { background: string; textColor: string } {
  const lowerName = name.toLowerCase()
  switch (lowerName) {
    case 'gold':
      return { background: 'linear-gradient(135deg, #ffd700, #ffec80, #ffd700)', textColor: '#000000' }
    case 'diamond':
      return { background: 'linear-gradient(135deg, #00ffff, #80ffff, #00ffff)', textColor: '#000000' }
    case 'rainbow':
      return { background: 'linear-gradient(90deg, #ff0000, #ff8000, #ffff00, #00ff00, #0080ff, #8000ff, #ff0000)', textColor: '#ffffff' }
    case 'bloodrot':
    case 'bloodroot':
      return { background: '#800000', textColor: '#ffffff' }
    case 'candy':
      return { background: 'linear-gradient(135deg, #ff00e6, #ff80f0, #ff00e6)', textColor: '#000000' }
    case 'lava':
      return { background: 'linear-gradient(135deg, #ff6200, #ff0000, #ff6200)', textColor: '#ffffff' }
    case 'galaxy':
      return { background: 'linear-gradient(135deg, #ff00ff, #8000ff, #ff00ff)', textColor: '#ffffff' }
    case 'yin yang':
    case 'yinyang':
      return { background: 'linear-gradient(135deg, #000000, #ffffff, #000000)', textColor: '#888888' }
    case 'radioactive':
      return { background: 'linear-gradient(135deg, #00ff00, #80ff80, #00ff00)', textColor: '#000000' }
    case 'cursed':
      return { background: 'linear-gradient(135deg, #000000, #ff0000, #000000)', textColor: '#ffffff' }
    default:
      return { background: '#9ca3af', textColor: '#ffffff' }
  }
}

// Format income for display
function formatIncome(income: number): string {
  if (income >= 1_000_000_000_000) return `${(Math.round(income / 1_000_000_000_000 * 10) / 10).toFixed(1)}T`
  if (income >= 1_000_000_000) return `${(Math.round(income / 1_000_000_000 * 10) / 10).toFixed(1)}B`
  if (income >= 1_000_000) return `${(Math.round(income / 1_000_000 * 10) / 10).toFixed(1)}M`
  if (income >= 1_000) return `${(Math.round(income / 1_000 * 10) / 10).toFixed(1)}K`
  return Math.round(income).toString()
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

// Generate the OG image for a trade using satori + sharp for transparent PNG
export async function generateTradeOGImage(trade: TradeForOG): Promise<Buffer> {
  const offerItems = trade.items.filter(i => i.side === 'OFFER').slice(0, 6)
  const requestItems = trade.items.filter(i => i.side === 'REQUEST').slice(0, 6)

  const offerTotal = calculateTotal(offerItems)
  const requestTotal = calculateTotal(requestItems)

  // Load fonts
  const comicNeueFontData = await loadComicNeueFont()
  const interFontData = await loadInterFont()

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

  // Render items grid - dynamically sized to fill maximum space
  const renderItemGrid = (items: TradeItemForOG[], maxItems: number) => {
    if (items.length === 0) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
          <span style={{ fontSize: '28px', color: COLORS.gray }}>No items</span>
        </div>
      )
    }

    // Dynamic sizing based on total items on this side
    // Available space per side: ~520px width, ~590px height (after padding)
    const itemCount = items.length
    let imageSize: number
    let fontSize: number
    let gap: number
    let badgeSize: number

    if (itemCount === 1) {
      // Single item - fit within available height (header + image + name + income + padding)
      imageSize = 280
      fontSize = 26
      gap = 0
      badgeSize = 24
    } else if (itemCount === 2) {
      // Two items side by side
      imageSize = 200
      fontSize = 28
      gap = 24
      badgeSize = 24
    } else if (itemCount === 3) {
      // Three items in a row
      imageSize = 140
      fontSize = 22
      gap = 12
      badgeSize = 20
    } else if (itemCount <= 4) {
      // 4 items: 2x2 grid
      imageSize = 180
      fontSize = 20
      gap = 16
      badgeSize = 18
    } else {
      // 5-6 items: 3+2 or 3+3
      imageSize = 140
      fontSize = 18
      gap = 10
      badgeSize = 16
    }

    const row1 = items.slice(0, 3)
    const row2 = items.slice(3, 6)

    const renderRow = (rowItems: TradeItemForOG[]) => (
      <div style={{ display: 'flex', gap: `${gap}px`, justifyContent: 'center', alignItems: 'flex-start' }}>
        {rowItems.map((item, i) => {
          const imageDataUri = getImageDataUri(item)
          const itemName = getItemName(item)
          const maxChars = Math.max(8, Math.floor(imageSize / 12))
          // Calculate item income
          let itemIncome = 0
          if (item.brainrot) {
            const baseIncome = Number(item.brainrot.baseIncome)
            const mutationMult = item.mutation?.multiplier || 1
            const traitSum = item.traits.reduce((sum, t) => sum + t.trait.multiplier, 0) || 1
            itemIncome = baseIncome * mutationMult * traitSum
          }
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <div style={{ position: 'relative', display: 'flex' }}>
                <div
                  style={{
                    width: `${imageSize}px`,
                    height: `${imageSize}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {imageDataUri ? (
                    <img
                      src={imageDataUri}
                      width={imageSize}
                      height={imageSize}
                      style={{ objectFit: 'contain' }}
                    />
                  ) : (
                    <span style={{ fontSize: '48px', color: COLORS.gray }}>?</span>
                  )}
                </div>
                {item.mutation && item.mutation.name !== 'Default' && (() => {
                  const mutationStyle = getMutationStyle(item.mutation.name)
                  return (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        background: mutationStyle.background,
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: `${badgeSize}px`,
                        fontWeight: 'bold',
                        color: mutationStyle.textColor,
                        border: `2px solid rgba(0,0,0,0.4)`,
                        textShadow: mutationStyle.textColor === '#ffffff'
                          ? '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
                          : '-1px -1px 0 rgba(255,255,255,0.5), 1px -1px 0 rgba(255,255,255,0.5), -1px 1px 0 rgba(255,255,255,0.5), 1px 1px 0 rgba(255,255,255,0.5)',
                      }}
                    >
                      {item.mutation.name.charAt(0)}
                    </div>
                  )
                })()}
              </div>
              <span
                style={{
                  fontSize: `${fontSize}px`,
                  color: '#ffffff',
                  textAlign: 'center',
                  maxWidth: `${imageSize + 20}px`,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 700,
                  fontFamily: 'Comic Neue, cursive',
                  textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                }}
              >
                {itemName.length > maxChars ? itemName.slice(0, maxChars - 1) + '…' : itemName}
              </span>
              <span
                style={{
                  fontSize: `${Math.max(16, fontSize - 6)}px`,
                  color: COLORS.green,
                  fontWeight: 700,
                  fontFamily: 'Inter, system-ui, sans-serif',
                }}
              >
                {itemIncome > 0 ? `$${formatIncome(itemIncome)}/s` : ''}
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

  // Build fonts array for satori
  type SatoriWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  const fonts: Array<{ name: string; data: ArrayBuffer; weight?: SatoriWeight; style?: 'normal' | 'italic' }> = []
  if (comicNeueFontData) {
    fonts.push({
      name: 'Comic Neue',
      data: comicNeueFontData,
      weight: 700 as SatoriWeight,
      style: 'normal',
    })
  }
  if (interFontData) {
    fonts.push({
      name: 'Inter',
      data: interFontData,
      weight: 700 as SatoriWeight,
      style: 'normal',
    })
  }

  // Generate SVG using satori (transparent background - no backgroundColor set)
  const svg = await satori(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        {/* Green border wrapper */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1192px',
            height: '622px',
            borderRadius: '50px',
            border: `4px solid ${COLORS.green}`,
            padding: '25px 20px 40px 20px',
          }}
        >
          {/* Offer Side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: COLORS.green,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Offering
            </span>
            {renderItemGrid(offerItems, 6)}
          </div>

          {/* Arrow */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
            <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke={COLORS.green} strokeWidth="3">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>

          {/* Request Side */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1,
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '26px',
                fontWeight: 700,
                color: COLORS.orange,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontFamily: 'Inter, system-ui, sans-serif',
              }}
            >
              Wants
            </span>
            {renderItemGrid(requestItems, 6)}
          </div>
        </div>
      </div>
    ),
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      fonts: fonts,
    }
  )

  // Remove white background from SVG and convert to transparent PNG
  // Satori adds a white background rect - we need to remove it
  const svgWithoutBg = svg.replace(/<rect[^>]*fill="white"[^>]*\/>/, '')

  const pngBuffer = await sharp(Buffer.from(svgWithoutBg))
    .ensureAlpha()
    .png()
    .toBuffer()

  return pngBuffer
}

// Upload the generated image to Vercel Blob
export async function uploadTradeOGImage(tradeId: string, imageBuffer: Buffer): Promise<string> {
  const blob = await put(`og-images/trades/${tradeId}.png`, imageBuffer, {
    access: 'public',
    contentType: 'image/png',
    addRandomSuffix: false,
    allowOverwrite: true,
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
