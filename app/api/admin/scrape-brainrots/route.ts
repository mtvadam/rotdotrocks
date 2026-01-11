import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

interface ScrapedBrainrot {
  name: string
  rarity: string | null
  income: string
  imageUrl: string
  description: string
  event: string | null
}

interface ApprovedBrainrot {
  name: string
  rarity: string | null
  baseCost: string
  baseIncome: string
  imageUrl: string
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

// Calculate similarity ratio (0-1, higher = more similar)
function similarity(a: string, b: string): number {
  const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normB = b.toLowerCase().replace(/[^a-z0-9]/g, '')

  if (normA === normB) return 1

  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen === 0) return 1

  const distance = levenshtein(normA, normB)
  return 1 - distance / maxLen
}

// Find the best match from existing names
function findSimilar(name: string, existingNames: string[], threshold = 0.8): { name: string; score: number } | null {
  let bestMatch: { name: string; score: number } | null = null

  for (const existing of existingNames) {
    const score = similarity(name, existing)
    if (score >= threshold && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { name: existing, score }
    }
  }

  return bestMatch
}

function createSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// GET /api/admin/scrape-brainrots - Scrape and compare brainrots
export async function GET() {
  try {
    await requireAdmin()

    // Fetch the page
    const response = await fetch('https://steal-a-brainrot.org/brainrots', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RotRocks/1.0)',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch from steal-a-brainrot.org' },
        { status: 502 }
      )
    }

    const html = await response.text()

    // Parse brainrots from the HTML
    const scraped: ScrapedBrainrot[] = []

    // Match each card - looking for data-slot="card" divs
    const cardRegex = /<div data-slot="card"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/div>/g
    const cards = html.match(cardRegex) || []

    for (const card of cards) {
      // Extract name from alt attribute or h3
      const nameMatch = card.match(/alt="([^"]+)"/) || card.match(/<h3[^>]*>([^<]+)<\/h3>/)
      const name = nameMatch?.[1]?.trim()

      if (!name) continue

      // Skip any brainrots with "Unknown" in the name
      if (name.toLowerCase().includes('unknown')) continue

      // Extract rarity badge
      const rarityMatch = card.match(/class="[^"]*bg-black text-white[^"]*"[^>]*>([^<]+)</)
      const rarity = rarityMatch?.[1]?.trim() || null

      // Extract event badge (like "LUCKY BLOCK")
      const eventMatch = card.match(/class="[^"]*bg-yellow-500[^"]*"[^>]*>([^<]+)</)
      const event = eventMatch?.[1]?.trim() || null

      // Extract income
      const incomeMatch = card.match(/<span class="font-bold[^"]*text-gray-800">([^<]+)</)
      const income = incomeMatch?.[1]?.trim() || '$0'

      // Extract image URL
      const imageMatch = card.match(/src="([^"]*\/_next\/image[^"]*)"/) ||
                         card.match(/srcset="[^"]*\/_next\/image\?url=([^&]+)/)
      let imageUrl = ''
      if (imageMatch) {
        // Decode the image URL
        const rawUrl = imageMatch[1]
        if (rawUrl.includes('url=')) {
          const urlParam = rawUrl.match(/url=([^&]+)/)?.[1]
          if (urlParam) {
            imageUrl = decodeURIComponent(urlParam)
            if (!imageUrl.startsWith('http')) {
              imageUrl = `https://steal-a-brainrot.org${imageUrl}`
            }
          }
        } else {
          imageUrl = rawUrl.startsWith('http') ? rawUrl : `https://steal-a-brainrot.org${rawUrl}`
        }
      }

      // Extract description
      const descMatch = card.match(/<p class="text-xs text-gray-500[^"]*">([^<]+)</)
      const description = descMatch?.[1]?.trim() || ''

      scraped.push({
        name,
        rarity,
        income,
        imageUrl,
        description,
        event,
      })
    }

    // Get existing brainrots from database
    const existing = await prisma.brainrot.findMany({
      select: { name: true, baseIncome: true, rarity: true },
    })
    const existingNamesLower = new Set(existing.map(b => b.name.toLowerCase()))
    const existingNamesList = existing.map(b => b.name)

    // Compare and categorize
    const newBrainrots: (ScrapedBrainrot & { similarTo?: string; similarityScore?: number })[] = []
    let exactMatches = 0

    for (const s of scraped) {
      if (existingNamesLower.has(s.name.toLowerCase())) {
        // Exact match (case-insensitive)
        exactMatches++
      } else {
        // Check for similar names
        const similar = findSimilar(s.name, existingNamesList, 0.75)
        if (similar) {
          newBrainrots.push({
            ...s,
            similarTo: similar.name,
            similarityScore: Math.round(similar.score * 100),
          })
        } else {
          newBrainrots.push(s)
        }
      }
    }

    return NextResponse.json({
      total: scraped.length,
      new: newBrainrots,
      existing: exactMatches,
      existingInDb: existing.length,
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape brainrots' },
      { status: 500 }
    )
  }
}

// POST /api/admin/scrape-brainrots - Import approved brainrots
export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { brainrots } = await request.json() as { brainrots: ApprovedBrainrot[] }

    if (!Array.isArray(brainrots) || brainrots.length === 0) {
      return NextResponse.json(
        { error: 'No brainrots provided' },
        { status: 400 }
      )
    }

    const created: string[] = []
    const failed: string[] = []

    for (const item of brainrots) {
      // Skip if name contains "Unknown"
      if (item.name.toLowerCase().includes('unknown')) {
        continue
      }

      const slug = createSlug(item.name)

      // Use the admin-approved values directly
      const baseCost = BigInt(item.baseCost || '0')
      const baseIncome = BigInt(item.baseIncome || '0')

      try {
        // If imageUrl is a full URL (Blob storage), use it for localImage
        // Otherwise, fall back to the default relative path
        const localImage = item.imageUrl && item.imageUrl.startsWith('https://')
          ? item.imageUrl
          : `/brainrot-images/brainrots/${slug}.png`

        await prisma.brainrot.create({
          data: {
            name: item.name,
            slug,
            imageUrl: item.imageUrl || '',
            localImage,
            baseCost,
            baseIncome,
            rarity: item.rarity,
            isActive: true,
          },
        })
        created.push(item.name)
      } catch (err: unknown) {
        // Likely duplicate
        if (err instanceof Error && err.message.includes('Unique constraint')) {
          failed.push(`${item.name} (already exists)`)
        } else {
          failed.push(item.name)
        }
      }
    }

    // Create audit log
    if (created.length > 0) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'IMPORT_BRAINROTS',
          targetType: 'BRAINROT',
          details: JSON.stringify({ imported: created }),
        },
      })
    }

    return NextResponse.json({
      success: true,
      created,
      failed,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to import brainrots' },
      { status: 500 }
    )
  }
}
