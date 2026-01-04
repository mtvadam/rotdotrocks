import sharp from 'sharp'
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
  greenBg: 'rgba(34, 197, 94, 0.1)',
  greenLight: 'rgba(34, 197, 94, 0.2)',
  orange: '#f59e0b',
  orangeBg: 'rgba(245, 158, 11, 0.1)',
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

// Load image from public directory or return null
async function loadImage(imagePath: string | null): Promise<Buffer | null> {
  if (!imagePath) return null

  try {
    // Handle both absolute paths and paths starting with /
    const publicDir = path.join(process.cwd(), 'public')
    const fullPath = imagePath.startsWith('/')
      ? path.join(publicDir, imagePath)
      : path.join(publicDir, imagePath)

    return await fs.readFile(fullPath)
  } catch (error) {
    console.error(`Failed to load image: ${imagePath}`, error)
    return null
  }
}

// Create a rounded rectangle SVG path
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  return `M${x + r},${y} h${w - 2 * r} a${r},${r} 0 0 1 ${r},${r} v${h - 2 * r} a${r},${r} 0 0 1 -${r},${r} h-${w - 2 * r} a${r},${r} 0 0 1 -${r},-${r} v-${h - 2 * r} a${r},${r} 0 0 1 ${r},-${r} z`
}

// Generate the OG image for a trade
export async function generateTradeOGImage(trade: TradeForOG): Promise<Buffer> {
  const offerItems = trade.items.filter(i => i.side === 'OFFER').slice(0, 6)
  const requestItems = trade.items.filter(i => i.side === 'REQUEST').slice(0, 6)

  const offerTotal = calculateTotal(offerItems)
  const requestTotal = calculateTotal(requestItems)

  // Create base image with background
  const baseImage = sharp({
    create: {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      channels: 4,
      background: { r: 15, g: 18, b: 25, alpha: 1 }, // #0f1219
    }
  })

  // Create composite layers
  const composites: sharp.OverlayOptions[] = []

  // Card dimensions
  const cardWidth = 460
  const cardHeight = 450
  const cardY = 100
  const leftCardX = 40
  const rightCardX = OG_WIDTH - cardWidth - 40

  // Generate left card (Offering) SVG
  const leftCardSvg = `
    <svg width="${cardWidth}" height="${cardHeight}">
      <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="16" ry="16" fill="${COLORS.cardBg}" stroke="${COLORS.cardBorder}" stroke-width="1"/>
    </svg>
  `
  composites.push({
    input: Buffer.from(leftCardSvg),
    top: cardY,
    left: leftCardX,
  })

  // Generate right card (Wants) SVG
  const rightCardSvg = `
    <svg width="${cardWidth}" height="${cardHeight}">
      <rect x="0" y="0" width="${cardWidth}" height="${cardHeight}" rx="16" ry="16" fill="${COLORS.cardBg}" stroke="${COLORS.cardBorder}" stroke-width="1"/>
    </svg>
  `
  composites.push({
    input: Buffer.from(rightCardSvg),
    top: cardY,
    left: rightCardX,
  })

  // Arrow circle in the middle
  const arrowCircleSize = 56
  const arrowX = Math.floor((OG_WIDTH - arrowCircleSize) / 2)
  const arrowY = Math.floor((OG_HEIGHT - arrowCircleSize) / 2) + 20

  const arrowSvg = `
    <svg width="${arrowCircleSize}" height="${arrowCircleSize}">
      <circle cx="${arrowCircleSize / 2}" cy="${arrowCircleSize / 2}" r="${arrowCircleSize / 2}" fill="rgba(34, 197, 94, 0.2)"/>
      <path d="M15 28h26M28 18l10 10-10 10" fill="none" stroke="${COLORS.green}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `
  composites.push({
    input: Buffer.from(arrowSvg),
    top: arrowY,
    left: arrowX,
  })

  // Header text
  const headerSvg = `
    <svg width="${OG_WIDTH}" height="60">
      <text x="40" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="bold" fill="${COLORS.white}">Trade by ${escapeXml(trade.user.robloxUsername)}</text>
      <text x="${OG_WIDTH - 40}" y="45" font-family="system-ui, -apple-system, sans-serif" font-size="24" font-weight="bold" fill="${COLORS.green}" text-anchor="end">rot.rocks</text>
    </svg>
  `
  composites.push({
    input: Buffer.from(headerSvg),
    top: 32,
    left: 0,
  })

  // Offering label and total
  const offerLabelSvg = `
    <svg width="${cardWidth}" height="40">
      <text x="${cardWidth / 2 - 60}" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="${COLORS.green}" text-anchor="end" letter-spacing="1">OFFERING</text>
      <rect x="${cardWidth / 2 - 50}" y="5" rx="12" ry="12" width="100" height="26" fill="rgba(34, 197, 94, 0.1)"/>
      <text x="${cardWidth / 2}" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${COLORS.green}" text-anchor="middle">$${formatIncome(offerTotal)}/s</text>
    </svg>
  `
  composites.push({
    input: Buffer.from(offerLabelSvg),
    top: cardY + 15,
    left: leftCardX,
  })

  // Wants label and total
  const wantsLabelSvg = `
    <svg width="${cardWidth}" height="40">
      <text x="${cardWidth / 2 - 60}" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="bold" fill="${COLORS.orange}" text-anchor="end" letter-spacing="1">WANTS</text>
      <rect x="${cardWidth / 2 - 50}" y="5" rx="12" ry="12" width="100" height="26" fill="rgba(245, 158, 11, 0.1)"/>
      <text x="${cardWidth / 2}" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" fill="${COLORS.orange}" text-anchor="middle">$${formatIncome(requestTotal)}/s</text>
    </svg>
  `
  composites.push({
    input: Buffer.from(wantsLabelSvg),
    top: cardY + 15,
    left: rightCardX,
  })

  // Footer text
  const footerSvg = `
    <svg width="${OG_WIDTH}" height="30">
      <text x="${OG_WIDTH / 2}" y="20" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${COLORS.darkGray}" text-anchor="middle">Brainrot Clicker Trading Hub</text>
    </svg>
  `
  composites.push({
    input: Buffer.from(footerSvg),
    top: OG_HEIGHT - 45,
    left: 0,
  })

  // Add brainrot images to offer side
  const itemSize = 80
  const itemGap = 12
  const itemsPerRow = 3
  const gridStartY = cardY + 70

  // Process offer items
  for (let i = 0; i < offerItems.length; i++) {
    const item = offerItems[i]
    const row = Math.floor(i / itemsPerRow)
    const col = i % itemsPerRow

    // Calculate centered position
    const itemsInRow = Math.min(itemsPerRow, offerItems.length - row * itemsPerRow)
    const rowWidth = itemsInRow * itemSize + (itemsInRow - 1) * itemGap
    const rowStartX = leftCardX + (cardWidth - rowWidth) / 2

    const x = rowStartX + col * (itemSize + itemGap)
    const y = gridStartY + row * (itemSize + itemGap + 24) // Extra space for name

    // Image background
    const imgBgSvg = `
      <svg width="${itemSize}" height="${itemSize}">
        <rect x="0" y="0" width="${itemSize}" height="${itemSize}" rx="12" ry="12" fill="${COLORS.imageBg}"/>
      </svg>
    `
    composites.push({
      input: Buffer.from(imgBgSvg),
      top: y,
      left: Math.round(x),
    })

    // Load and add brainrot image
    let imagePath = item.brainrot?.localImage || null
    let itemName = item.brainrot?.name || '?'

    // Handle addon items
    if (item.addonType && ADDON_INFO[item.addonType]) {
      imagePath = ADDON_INFO[item.addonType].image
      itemName = ADDON_INFO[item.addonType].name
    }

    const imageBuffer = await loadImage(imagePath)
    if (imageBuffer) {
      try {
        const resizedImage = await sharp(imageBuffer)
          .resize(itemSize - 4, itemSize - 4, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()

        composites.push({
          input: resizedImage,
          top: y + 2,
          left: Math.round(x) + 2,
        })
      } catch (e) {
        console.error('Failed to process image:', e)
      }
    }

    // Mutation badge
    if (item.mutation && item.mutation.name !== 'Default') {
      const mutColor = getMutationColor(item.mutation.name)
      const badgeSvg = `
        <svg width="24" height="20">
          <rect x="0" y="0" width="24" height="20" rx="4" ry="4" fill="${COLORS.imageBg}" stroke="${mutColor}" stroke-width="1"/>
          <text x="12" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="${mutColor}" text-anchor="middle">${item.mutation.name.charAt(0)}</text>
        </svg>
      `
      composites.push({
        input: Buffer.from(badgeSvg),
        top: y - 6,
        left: Math.round(x) + itemSize - 18,
      })
    }

    // Item name
    const nameSvg = `
      <svg width="${itemSize}" height="20">
        <text x="${itemSize / 2}" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${COLORS.white}" text-anchor="middle">${escapeXml(truncateName(itemName, 12))}</text>
      </svg>
    `
    composites.push({
      input: Buffer.from(nameSvg),
      top: y + itemSize + 4,
      left: Math.round(x),
    })
  }

  // Process request items
  for (let i = 0; i < requestItems.length; i++) {
    const item = requestItems[i]
    const row = Math.floor(i / itemsPerRow)
    const col = i % itemsPerRow

    // Calculate centered position
    const itemsInRow = Math.min(itemsPerRow, requestItems.length - row * itemsPerRow)
    const rowWidth = itemsInRow * itemSize + (itemsInRow - 1) * itemGap
    const rowStartX = rightCardX + (cardWidth - rowWidth) / 2

    const x = rowStartX + col * (itemSize + itemGap)
    const y = gridStartY + row * (itemSize + itemGap + 24)

    // Image background
    const imgBgSvg = `
      <svg width="${itemSize}" height="${itemSize}">
        <rect x="0" y="0" width="${itemSize}" height="${itemSize}" rx="12" ry="12" fill="${COLORS.imageBg}"/>
      </svg>
    `
    composites.push({
      input: Buffer.from(imgBgSvg),
      top: y,
      left: Math.round(x),
    })

    // Load and add brainrot image
    let imagePath = item.brainrot?.localImage || null
    let itemName = item.brainrot?.name || '?'

    // Handle addon items
    if (item.addonType && ADDON_INFO[item.addonType]) {
      imagePath = ADDON_INFO[item.addonType].image
      itemName = ADDON_INFO[item.addonType].name
    }

    const imageBuffer = await loadImage(imagePath)
    if (imageBuffer) {
      try {
        const resizedImage = await sharp(imageBuffer)
          .resize(itemSize - 4, itemSize - 4, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()

        composites.push({
          input: resizedImage,
          top: y + 2,
          left: Math.round(x) + 2,
        })
      } catch (e) {
        console.error('Failed to process image:', e)
      }
    }

    // Mutation badge
    if (item.mutation && item.mutation.name !== 'Default') {
      const mutColor = getMutationColor(item.mutation.name)
      const badgeSvg = `
        <svg width="24" height="20">
          <rect x="0" y="0" width="24" height="20" rx="4" ry="4" fill="${COLORS.imageBg}" stroke="${mutColor}" stroke-width="1"/>
          <text x="12" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="${mutColor}" text-anchor="middle">${item.mutation.name.charAt(0)}</text>
        </svg>
      `
      composites.push({
        input: Buffer.from(badgeSvg),
        top: y - 6,
        left: Math.round(x) + itemSize - 18,
      })
    }

    // Item name
    const nameSvg = `
      <svg width="${itemSize}" height="20">
        <text x="${itemSize / 2}" y="14" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="${COLORS.white}" text-anchor="middle">${escapeXml(truncateName(itemName, 12))}</text>
      </svg>
    `
    composites.push({
      input: Buffer.from(nameSvg),
      top: y + itemSize + 4,
      left: Math.round(x),
    })
  }

  // Empty state for offer side
  if (offerItems.length === 0) {
    const emptyOfferSvg = `
      <svg width="${cardWidth}" height="40">
        <text x="${cardWidth / 2}" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${COLORS.gray}" text-anchor="middle">No items</text>
      </svg>
    `
    composites.push({
      input: Buffer.from(emptyOfferSvg),
      top: gridStartY + 50,
      left: leftCardX,
    })
  }

  // Empty state for request side
  if (requestItems.length === 0) {
    const emptyRequestSvg = `
      <svg width="${cardWidth}" height="40">
        <text x="${cardWidth / 2}" y="25" font-family="system-ui, -apple-system, sans-serif" font-size="14" fill="${COLORS.gray}" text-anchor="middle">No items</text>
      </svg>
    `
    composites.push({
      input: Buffer.from(emptyRequestSvg),
      top: gridStartY + 50,
      left: rightCardX,
    })
  }

  // Composite all layers and return PNG buffer
  return await baseImage
    .composite(composites)
    .png()
    .toBuffer()
}

// Escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Truncate name if too long
function truncateName(name: string, maxLength: number): string {
  if (name.length <= maxLength) return name
  return name.slice(0, maxLength - 1) + '...'
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
