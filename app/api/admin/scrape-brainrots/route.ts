import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { put } from '@vercel/blob'

const WIKI_BASE = 'https://stealabrainrot.fandom.com'
const WIKI_API = `${WIKI_BASE}/api.php`
const USER_AGENT = 'Mozilla/5.0 (compatible; RotRocks/1.0)'

// ====== Types ======

interface WikiBrainrot {
  name: string
  slug: string
  rarity: string | null
  baseCost: string
  baseIncome: string
  imageUrl: string
  imageFile: string
  status: string
}

interface WikiTrait {
  name: string
  multiplier: number
  imageUrl: string
  category: string
}

interface BrainrotDiff {
  field: string
  old: string
  new: string
}

interface ScrapedNew {
  name: string
  slug: string
  rarity: string | null
  baseCost: string
  baseIncome: string
  imageUrl: string
}

interface ScrapedUpdated {
  id: string
  name: string
  diffs: BrainrotDiff[]
  scraped: WikiBrainrot
}

interface ScrapedRemoved {
  id: string
  name: string
  rarity: string | null
}

interface TraitNew {
  name: string
  multiplier: number
  imageUrl: string
  category: string
}

interface TraitUpdated {
  id: string
  name: string
  diffs: { field: string; old: string; new: string }[]
}

// ====== Wiki API helpers ======

async function wikiQuery(params: Record<string, string>) {
  const url = new URL(WIKI_API)
  url.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), { headers: { 'User-Agent': USER_AGENT } })
  return res.json()
}

// Get all pages that use any brainrot template variant
// Wiki uses multiple templates: Brainrot_Infobox, Brainrot_Infobox_New, Brainrot, Character
async function getAllBrainrotPageTitles(): Promise<string[]> {
  const titleSet = new Set<string>()

  const templates = [
    'Template:Brainrot_Infobox',
    'Template:Brainrot_Infobox_New',
    'Template:Brainrot',
    'Template:Character',
  ]

  for (const template of templates) {
    let continueParam = ''
    while (true) {
      const params: Record<string, string> = {
        action: 'query',
        list: 'embeddedin',
        eititle: template,
        einamespace: '0', // Main namespace only
        eilimit: '500',
      }
      if (continueParam) params.eicontinue = continueParam

      const data = await wikiQuery(params)
      if (data.query?.embeddedin) {
        for (const page of data.query.embeddedin) {
          titleSet.add(page.title)
        }
      }
      if (data.continue?.eicontinue) {
        continueParam = data.continue.eicontinue
      } else {
        break
      }
    }
  }

  return [...titleSet]
}

// Batch fetch wikitext for multiple pages (max 50 per request)
async function batchFetchWikitext(titles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const batchSize = 50

  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize)
    const data = await wikiQuery({
      action: 'query',
      titles: batch.join('|'),
      prop: 'revisions',
      rvprop: 'content',
      rvslots: 'main',
    })

    if (data.query?.pages) {
      for (const page of Object.values(data.query.pages) as Array<{ title: string; revisions?: Array<{ slots?: { main?: { '*': string } } }> }>) {
        const content = page.revisions?.[0]?.slots?.main?.['*']
        if (content) {
          result.set(page.title, content)
        }
      }
    }
  }

  return result
}

// Batch resolve image filenames to URLs
async function batchResolveImages(imageFiles: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (imageFiles.length === 0) return result

  const batchSize = 50
  const uniqueFiles = [...new Set(imageFiles)]

  for (let i = 0; i < uniqueFiles.length; i += batchSize) {
    const batch = uniqueFiles.slice(i, i + batchSize)
    const titles = batch.map(f => `File:${f}`)

    const data = await wikiQuery({
      action: 'query',
      titles: titles.join('|'),
      prop: 'imageinfo',
      iiprop: 'url',
    })

    if (data.query?.pages) {
      for (const page of Object.values(data.query.pages) as Array<{ title: string; imageinfo?: Array<{ url: string }> }>) {
        const url = page.imageinfo?.[0]?.url
        if (url) {
          // Strip "File:" prefix from title to get filename
          const filename = page.title.replace(/^File:/, '')
          result.set(filename, url)
        }
      }
    }
  }

  return result
}

// ====== Parsing ======

function parseInfobox(wikitext: string): Record<string, string> {
  // Find the start of any brainrot infobox template
  const startMatch = wikitext.match(/\{\{(?:Brainrot[_ ]Infobox(?:[_ ]New)?|Brainrot|Character)\s*\n?\|/i)
  if (!startMatch || startMatch.index === undefined) return {}

  // Walk from the opening {{ to find the matching closing }} using pair tracking
  const templateStart = startMatch.index
  let depth = 0
  let endIdx = -1

  for (let i = templateStart; i < wikitext.length - 1; i++) {
    if (wikitext[i] === '{' && wikitext[i + 1] === '{') {
      depth++
      i++
    } else if (wikitext[i] === '}' && wikitext[i + 1] === '}') {
      depth--
      if (depth === 0) {
        endIdx = i
        break
      }
      i++
    }
  }

  if (endIdx === -1) return {}

  // Extract params: everything after the first | until the matching }}
  const paramsStart = templateStart + startMatch[0].length
  const rawParams = wikitext.substring(paramsStart, endIdx)

  // Split by | handling nested {{ }}, [[ ]], and <> blocks with pair tracking
  const params: Record<string, string> = {}
  let paramDepth = 0
  let current = ''

  for (let i = 0; i < rawParams.length; i++) {
    const c = rawParams[i]
    const next = rawParams[i + 1]

    if (c === '{' && next === '{') { paramDepth++; current += '{{'; i++; continue }
    if (c === '}' && next === '}') { paramDepth--; current += '}}'; i++; continue }
    if (c === '[' && next === '[') { paramDepth++; current += '[['; i++; continue }
    if (c === ']' && next === ']') { paramDepth--; current += ']]'; i++; continue }
    if (c === '<') paramDepth++
    else if (c === '>') paramDepth--

    if (c === '|' && paramDepth <= 0) {
      paramDepth = 0
      const eqIdx = current.indexOf('=')
      if (eqIdx > 0) {
        params[current.substring(0, eqIdx).trim().toLowerCase()] = current.substring(eqIdx + 1).trim()
      }
      current = ''
      continue
    }
    current += c
  }
  if (current) {
    const eqIdx = current.indexOf('=')
    if (eqIdx > 0) {
      params[current.substring(0, eqIdx).trim().toLowerCase()] = current.substring(eqIdx + 1).trim()
    }
  }

  return params
}

function parseGameValue(str: string): string {
  if (!str) return '0'
  // Handle template wrappers like {{$|30M}} or {{$/s|150K}}
  const templateMatch = str.match(/\{\{\$(?:\/s)?\|([^}]+)\}\}/)
  if (templateMatch) str = templateMatch[1]

  // Strip HTML tags (e.g. <span style="color: lime"><b>2M</b></span>)
  str = str.replace(/<[^>]+>/g, '')
  // Strip wiki bold/italic markers
  str = str.replace(/'{2,}/g, '')
  // Remove $, commas
  str = str.replace(/[$,]/g, '').trim()
  // Remove /s suffix (income per second)
  str = str.replace(/\/s\b/gi, '').trim()
  // Take first value before "or", "formally", "formerly", or " / " separator
  str = str.split(/\s+(?:or|formally|formerly)\s+|\s+\/\s+/i)[0].trim()
  // Take first value before parenthetical
  str = str.split('(')[0].trim()

  // Handle non-numeric placeholders
  if (/^(TBA|Unknown|N\/A|None|\?\?\?|Free|0|Maybe.*)$/i.test(str) || str === '') return '0'

  const suffixes: Record<string, number> = {
    'K': 1_000, 'M': 1_000_000, 'B': 1_000_000_000, 'T': 1_000_000_000_000,
  }
  const match = str.match(/^([\d.]+)\s*([KMBT])?$/i)
  if (!match) return '0'

  const num = parseFloat(match[1])
  const suffix = match[2]?.toUpperCase()
  const multiplier = suffix ? (suffixes[suffix] || 1) : 1
  return String(Math.round(num * multiplier))
}

function createSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function cleanWikiMarkup(str: string): string {
  return str
    .replace(/\{\{([^{}|]+?)(?:\|[^{}]*)?\}\}/g, '$1') // {{Template|args}} → Template
    .replace(/\[\[[^\]]+\|([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/'{2,}/g, '')
    .trim()
}

// ====== Fuzzy matching ======

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []
  for (let i = 0; i <= b.length; i++) matrix[i] = [i]
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j

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

function similarity(a: string, b: string): number {
  const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '')
  const normB = b.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normA === normB) return 1
  const maxLen = Math.max(normA.length, normB.length)
  if (maxLen === 0) return 1

  const levenshteinScore = 1 - levenshtein(normA, normB) / maxLen

  // Boost score if one string fully contains the other (e.g. "2026" contains "26")
  const shorter = normA.length <= normB.length ? normA : normB
  const longer = normA.length > normB.length ? normA : normB
  if (shorter.length >= 2 && longer.includes(shorter)) {
    const containmentScore = shorter.length / longer.length
    return Math.max(levenshteinScore, 0.5 + containmentScore * 0.5)
  }

  return levenshteinScore
}

function findSimilar(name: string, existingNames: string[], threshold = 0.8): { name: string; score: number } | null {
  let best: { name: string; score: number } | null = null
  for (const existing of existingNames) {
    const score = similarity(name, existing)
    if (score >= threshold && (!best || score > best.score)) {
      best = { name: existing, score }
    }
  }
  return best
}

// ====== Trait parsing ======

async function scrapeTraits(): Promise<WikiTrait[]> {
  const data = await wikiQuery({
    action: 'parse',
    page: 'Traits',
    prop: 'text',
  })
  const html = data.parse?.text?.['*'] || ''
  const traits: WikiTrait[] = []

  const tableRegex = /<table class="fandom-table">([\s\S]*?)<\/table>/g
  let tableMatch

  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableHtml = tableMatch[1]

    const captionMatch = tableHtml.match(/<caption>([\s\S]*?)<\/caption>/)
    const category = captionMatch ? captionMatch[1].replace(/<[^>]+>/g, '').trim() : 'Unknown'

    const rowRegex = /<tr>\s*<td>([\s\S]*?)<\/tr>/g
    let rowMatch

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1]
      const cells = rowHtml.split(/<\/td>\s*(?:<td>|\s*$)/).map(c => c.trim())

      if (cells.length >= 2) {
        const nameCell = cells[0]

        // Extract trait name
        const nameFromLink = nameCell.match(/<a[^>]*>([^<]+)<\/a>/)
        let traitName = nameFromLink
          ? nameFromLink[1].trim()
          : nameCell.replace(/<[^>]+>/g, '').trim()

        // Extract image URL (prefer href to static.wikia, fallback to data-src, skip base64)
        let imageUrl = ''
        const hrefMatch = nameCell.match(/<a[^>]*href="(https?:\/\/static\.wikia[^"]*)"/)
        const dataSrcMatch = nameCell.match(/data-src="([^"]+)"/)
        const srcMatch = nameCell.match(/src="([^"]+)"/)

        if (hrefMatch) {
          imageUrl = hrefMatch[1]
        } else if (dataSrcMatch) {
          imageUrl = dataSrcMatch[1]
        } else if (srcMatch && !srcMatch[1].startsWith('data:')) {
          imageUrl = srcMatch[1]
        }
        imageUrl = imageUrl.replace(/\/scale-to-width-down\/\d+/, '')

        // Extract multiplier
        const multText = cells[1].replace(/<[^>]+>/g, '').trim()
        let multiplier = 0

        if (multText.includes('÷') || multText.includes('/')) {
          const divMatch = multText.match(/[÷/]\s*([\d.]+)/i)
          if (divMatch) multiplier = 1 / parseFloat(divMatch[1])
        } else {
          const multMatch = multText.match(/([\d.]+)\s*[x×]/i)
          if (multMatch) multiplier = parseFloat(multMatch[1])
        }

        if (traitName && multiplier > 0) {
          traits.push({ name: traitName, multiplier, imageUrl, category })
        }
      }
    }
  }

  return traits
}

// ====== Image download helper ======

async function downloadImageToBlob(
  imageUrl: string,
  slug: string,
  folder: 'brainrots' | 'traits'
): Promise<string | null> {
  try {
    const res = await fetch(imageUrl, { headers: { 'User-Agent': USER_AGENT } })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') || 'image/png'
    const buffer = await res.arrayBuffer()

    let ext = 'png'
    if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg'
    else if (contentType.includes('webp')) ext = 'webp'
    else if (contentType.includes('gif')) ext = 'gif'

    const filename = `${slug}.${ext}`
    const blob = await put(`brainrot-images/${folder}/${filename}`, Buffer.from(buffer), {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    })

    return blob.url
  } catch (err) {
    console.error(`Failed to download image for ${slug}:`, err)
    return null
  }
}

// ====== Non-brainrot page exclusion ======

// Pages that use brainrot/character templates but are NOT actual brainrots
const NON_BRAINROT_PAGES = new Set([
  'Mutations',
  'Lucky Blocks',
  'Craft Machine',
  'Extinct',
  'Base',
  'Cash',
  'Luck',
  'Brainrot Dealer',
  'Rainbow Machine',
  'Witch Fuse',
  'Indonesian Event',
  'Aura Farm Boat',
  'Brainrot Trader',
  'Merchandise', // Duplicate of "Festive 67" page
])

// ====== GET: Scrape and compare ======

export async function GET() {
  try {
    await requireAdmin()

    // 1. Get all brainrot page titles from wiki
    const pageTitles = await getAllBrainrotPageTitles()

    // 2. Batch fetch wikitext
    const wikitextMap = await batchFetchWikitext(pageTitles)

    // 3. Parse infobox data from wikitext
    const wikibrainrots: WikiBrainrot[] = []
    const imageFiles: string[] = []

    for (const [title, wikitext] of wikitextMap) {
      // Skip known non-brainrot pages
      if (NON_BRAINROT_PAGES.has(title)) continue

      const params = parseInfobox(wikitext)
      if (Object.keys(params).length === 0) continue

      const imageFile = params.image1 || ''
      if (imageFile) imageFiles.push(imageFile)

      let rarity = params.rarity || null
      if (rarity) {
        rarity = cleanWikiMarkup(rarity)
        // Strip " New" suffix from template-based rarity (e.g. "Brainrot God New" → "Brainrot God")
        rarity = rarity.replace(/\s+New$/i, '').trim()
        // Strip parenthetical info (e.g. "Secret (formerly Rare)" → "Secret")
        rarity = rarity.split('(')[0].trim()
        // Normalize case: "secret" → "Secret", "brainrot god" → "Brainrot God"
        rarity = rarity.replace(/\b\w/g, c => c.toUpperCase())
      }

      // Handle field name variants: Character template uses "in-game_status"
      let status = params.status || params['in-game_status'] || 'Unknown'
      status = cleanWikiMarkup(status)

      wikibrainrots.push({
        name: title,
        slug: createSlug(title),
        rarity,
        baseCost: parseGameValue(params.cost || '0'),
        baseIncome: parseGameValue(params.income || '0'),
        imageUrl: '', // Will be resolved below
        imageFile,
        status,
      })
    }

    // 4. Batch resolve image URLs
    const imageUrlMap = await batchResolveImages(imageFiles)
    for (const brainrot of wikibrainrots) {
      if (brainrot.imageFile) {
        brainrot.imageUrl = imageUrlMap.get(brainrot.imageFile) || ''
      }
    }

    // 5. Get existing DB data
    const existingBrainrots = await prisma.brainrot.findMany({
      select: {
        id: true, name: true, slug: true, rarity: true,
        baseCost: true, baseIncome: true, imageUrl: true,
        localImage: true, isActive: true,
      },
    })
    const existingByNameLower = new Map(existingBrainrots.map(b => [b.name.toLowerCase(), b]))
    const existingNamesList = existingBrainrots.map(b => b.name)

    // 6. Categorize: new, updated, removed, unchanged
    const newBrainrots: ScrapedNew[] = []
    const updatedBrainrots: ScrapedUpdated[] = []
    let unchangedCount = 0
    const wikiNamesLower = new Set(wikibrainrots.map(b => b.name.toLowerCase()))
    // Track DB entries that were fuzzy-matched so they don't appear as "removed"
    const fuzzyMatchedIds = new Set<string>()

    for (const wiki of wikibrainrots) {
      const existing = existingByNameLower.get(wiki.name.toLowerCase())

      if (!existing) {
        // Check for similar names (potential rename / spelling discrepancy)
        const similar = findSimilar(wiki.name, existingNamesList, 0.75)

        if (similar) {
          // High-confidence match: treat as an update to the existing entry
          const matchedExisting = existingByNameLower.get(similar.name.toLowerCase())
          if (matchedExisting) {
            fuzzyMatchedIds.add(matchedExisting.id)
            const diffs: BrainrotDiff[] = []

            // Name discrepancy is the primary diff
            diffs.push({ field: 'name', old: matchedExisting.name, new: wiki.name })

            if (wiki.rarity && matchedExisting.rarity !== wiki.rarity) {
              diffs.push({ field: 'rarity', old: matchedExisting.rarity || 'null', new: wiki.rarity })
            }
            const existingCost = matchedExisting.baseCost.toString()
            if (wiki.baseCost !== '0' && existingCost !== wiki.baseCost) {
              diffs.push({ field: 'baseCost', old: existingCost, new: wiki.baseCost })
            }
            const existingIncome = matchedExisting.baseIncome.toString()
            if (wiki.baseIncome !== '0' && existingIncome !== wiki.baseIncome) {
              diffs.push({ field: 'baseIncome', old: existingIncome, new: wiki.baseIncome })
            }
            if (wiki.imageUrl && matchedExisting.imageUrl !== wiki.imageUrl) {
              diffs.push({ field: 'imageUrl', old: matchedExisting.imageUrl || 'none', new: wiki.imageUrl })
            }

            updatedBrainrots.push({
              id: matchedExisting.id,
              name: matchedExisting.name,
              diffs,
              scraped: wiki,
            })
            continue
          }
        }

        // No match at all - genuinely new
        newBrainrots.push({
          name: wiki.name,
          slug: wiki.slug,
          rarity: wiki.rarity,
          baseCost: wiki.baseCost,
          baseIncome: wiki.baseIncome,
          imageUrl: wiki.imageUrl,
        })
      } else {
        // Compare values to detect updates
        const diffs: BrainrotDiff[] = []

        if (wiki.rarity && existing.rarity !== wiki.rarity) {
          diffs.push({ field: 'rarity', old: existing.rarity || 'null', new: wiki.rarity })
        }

        const existingCost = existing.baseCost.toString()
        if (wiki.baseCost !== '0' && existingCost !== wiki.baseCost) {
          diffs.push({ field: 'baseCost', old: existingCost, new: wiki.baseCost })
        }

        const existingIncome = existing.baseIncome.toString()
        if (wiki.baseIncome !== '0' && existingIncome !== wiki.baseIncome) {
          diffs.push({ field: 'baseIncome', old: existingIncome, new: wiki.baseIncome })
        }

        // Check if image source changed (wiki URL different from stored reference)
        if (wiki.imageUrl && existing.imageUrl !== wiki.imageUrl) {
          diffs.push({ field: 'imageUrl', old: existing.imageUrl || 'none', new: wiki.imageUrl })
        }

        if (diffs.length > 0) {
          updatedBrainrots.push({
            id: existing.id,
            name: existing.name,
            diffs,
            scraped: wiki,
          })
        } else {
          unchangedCount++
        }
      }
    }

    // Find removed: in DB but not on wiki (only active ones, excluding fuzzy-matched)
    const removedBrainrots: ScrapedRemoved[] = []
    for (const existing of existingBrainrots) {
      if (existing.isActive && !wikiNamesLower.has(existing.name.toLowerCase()) && !fuzzyMatchedIds.has(existing.id)) {
        removedBrainrots.push({
          id: existing.id,
          name: existing.name,
          rarity: existing.rarity,
        })
      }
    }

    // 7. Scrape traits
    const wikiTraits = await scrapeTraits()

    const existingTraits = await prisma.trait.findMany({
      select: { id: true, name: true, multiplier: true, imageUrl: true },
    })
    const existingTraitsByName = new Map(existingTraits.map(t => [t.name.toLowerCase(), t]))

    const newTraits: TraitNew[] = []
    const updatedTraits: TraitUpdated[] = []
    const existingTraitNames = existingTraits.map(t => t.name)

    for (const wt of wikiTraits) {
      const existing = existingTraitsByName.get(wt.name.toLowerCase())
      if (!existing) {
        // Check for fuzzy match (e.g. "2026" matching "26")
        const similar = findSimilar(wt.name, existingTraitNames, 0.6)

        if (similar) {
          // High-confidence match: treat as update to fix name discrepancy
          const matchedExisting = existingTraitsByName.get(similar.name.toLowerCase())
          if (matchedExisting) {
            const diffs: { field: string; old: string; new: string }[] = []
            diffs.push({ field: 'name', old: matchedExisting.name, new: wt.name })
            if (Math.abs(matchedExisting.multiplier - wt.multiplier) > 0.001) {
              diffs.push({ field: 'multiplier', old: `${matchedExisting.multiplier}x`, new: `${wt.multiplier}x` })
            }
            updatedTraits.push({ id: matchedExisting.id, name: matchedExisting.name, diffs })
            continue
          }
        }

        // No match at all - genuinely new
        newTraits.push({ ...wt })
      } else if (Math.abs(existing.multiplier - wt.multiplier) > 0.001) {
        updatedTraits.push({
          id: existing.id,
          name: existing.name,
          diffs: [{ field: 'multiplier', old: `${existing.multiplier}x`, new: `${wt.multiplier}x` }],
        })
      }
    }

    // Sort new brainrots by rarity for easier review
    const rarityOrder: Record<string, number> = {
      'Common': 1, 'Rare': 2, 'Epic': 3, 'Legendary': 4,
      'Mythic': 5, 'Brainrot God': 6, 'Secret': 7, 'OG': 8,
    }
    newBrainrots.sort((a, b) => {
      const ra = rarityOrder[a.rarity || ''] || 99
      const rb = rarityOrder[b.rarity || ''] || 99
      return ra - rb || a.name.localeCompare(b.name)
    })

    return NextResponse.json({
      brainrots: {
        total: wikibrainrots.length,
        new: newBrainrots,
        updated: updatedBrainrots,
        removed: removedBrainrots,
        unchanged: unchangedCount,
        existingInDb: existingBrainrots.length,
      },
      traits: {
        total: wikiTraits.length,
        new: newTraits,
        updated: updatedTraits,
        existingInDb: existingTraits.length,
      },
    })
  } catch (error) {
    console.error('Scrape error:', error)
    return NextResponse.json(
      { error: 'Failed to scrape wiki' },
      { status: 500 }
    )
  }
}

// ====== POST: Apply approved changes ======

interface ApprovedAction {
  type: 'create' | 'update' | 'deactivate'
  // For create:
  name?: string
  rarity?: string | null
  baseCost?: string
  baseIncome?: string
  imageUrl?: string
  // For update:
  id?: string
  fields?: Record<string, string>
  // For deactivate:
  // id is used
}

interface ApprovedTraitAction {
  type: 'create' | 'update'
  name?: string
  multiplier?: number
  imageUrl?: string
  id?: string
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json() as {
      brainrots?: ApprovedAction[]
      traits?: ApprovedTraitAction[]
    }

    const results = {
      brainrots: { created: [] as string[], updated: [] as string[], deactivated: [] as string[], failed: [] as string[] },
      traits: { created: [] as string[], updated: [] as string[], failed: [] as string[] },
    }

    // Process brainrot actions
    if (body.brainrots) {
      for (const action of body.brainrots) {
        try {
          if (action.type === 'create' && action.name) {
            const slug = createSlug(action.name)

            // Download image if available
            let localImage: string | null = null
            const imageUrl = action.imageUrl || ''
            if (imageUrl && !imageUrl.includes('blob.vercel-storage.com')) {
              localImage = await downloadImageToBlob(imageUrl, slug, 'brainrots')
            }

            await prisma.brainrot.create({
              data: {
                name: action.name,
                slug,
                imageUrl,
                localImage,
                baseCost: BigInt(action.baseCost || '0'),
                baseIncome: BigInt(action.baseIncome || '0'),
                rarity: action.rarity || null,
                isActive: true,
              },
            })
            results.brainrots.created.push(action.name)
          } else if (action.type === 'update' && action.id && action.fields) {
            const updateData: Record<string, unknown> = {}

            for (const [field, value] of Object.entries(action.fields)) {
              if (field === 'baseCost' || field === 'baseIncome') {
                updateData[field] = BigInt(value)
              } else if (field === 'name') {
                updateData.name = value
                updateData.slug = createSlug(value)
              } else if (field === 'imageUrl') {
                updateData.imageUrl = value
                // Re-download image if URL changed
                const existing = await prisma.brainrot.findUnique({
                  where: { id: action.id },
                  select: { slug: true },
                })
                if (existing) {
                  const newLocal = await downloadImageToBlob(value, existing.slug, 'brainrots')
                  if (newLocal) updateData.localImage = newLocal
                }
              } else {
                updateData[field] = value
              }
            }

            await prisma.brainrot.update({
              where: { id: action.id },
              data: updateData,
            })
            results.brainrots.updated.push(action.id)
          } else if (action.type === 'deactivate' && action.id) {
            await prisma.brainrot.update({
              where: { id: action.id },
              data: { isActive: false },
            })
            results.brainrots.deactivated.push(action.id)
          }
        } catch (err: unknown) {
          const name = action.name || action.id || 'unknown'
          if (err instanceof Error && err.message.includes('Unique constraint')) {
            results.brainrots.failed.push(`${name} (already exists)`)
          } else {
            results.brainrots.failed.push(name)
          }
        }
      }
    }

    // Process trait actions
    if (body.traits) {
      for (const action of body.traits) {
        try {
          if (action.type === 'create' && action.name) {
            const slug = createSlug(action.name)

            let localImage: string | null = null
            const imageUrl = action.imageUrl || ''
            if (imageUrl && !imageUrl.includes('blob.vercel-storage.com')) {
              localImage = await downloadImageToBlob(imageUrl, slug, 'traits')
            }

            await prisma.trait.create({
              data: {
                name: action.name,
                imageUrl,
                localImage,
                multiplier: action.multiplier || 1,
                isActive: true,
              },
            })
            results.traits.created.push(action.name)
          } else if (action.type === 'update' && action.id) {
            const updateData: Record<string, unknown> = {}
            if (action.multiplier !== undefined) updateData.multiplier = action.multiplier
            if (action.name) {
              updateData.name = action.name
            }
            if (action.imageUrl) {
              updateData.imageUrl = action.imageUrl
              const existing = await prisma.trait.findUnique({
                where: { id: action.id },
                select: { name: true },
              })
              if (existing) {
                const slug = createSlug(existing.name)
                const newLocal = await downloadImageToBlob(action.imageUrl, slug, 'traits')
                if (newLocal) updateData.localImage = newLocal
              }
            }

            await prisma.trait.update({
              where: { id: action.id },
              data: updateData,
            })
            results.traits.updated.push(action.id)
          }
        } catch (err: unknown) {
          const name = action.name || action.id || 'unknown'
          results.traits.failed.push(name)
        }
      }
    }

    // Audit log
    const totalChanges =
      results.brainrots.created.length + results.brainrots.updated.length +
      results.brainrots.deactivated.length + results.traits.created.length +
      results.traits.updated.length

    if (totalChanges > 0) {
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: 'WIKI_SCRAPE_IMPORT',
          targetType: 'BRAINROT',
          details: JSON.stringify(results),
        },
      })
    }

    return NextResponse.json({ success: true, results })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { error: 'Failed to apply changes' },
      { status: 500 }
    )
  }
}
