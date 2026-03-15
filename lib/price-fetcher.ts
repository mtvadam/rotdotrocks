import { prisma } from '@/lib/db'

// Eldorado library API – returns all brainrots listed on their marketplace
interface EldoradoTradeEnv {
  id: string
  name: string
  value: string
  childTradeEnvironments: EldoradoTradeEnv[]
}

interface EldoradoLibrary {
  tradeEnvironments: EldoradoTradeEnv[]
}

interface EldoradoBrainrot {
  name: string   // exact name from Eldorado
  rarity: string // rarity from Eldorado
}

async function fetchEldoradoBrainrotList(): Promise<EldoradoBrainrot[]> {
  const res = await fetch('https://www.eldorado.gg/api/library/259/CustomItem', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Eldorado library API: HTTP ${res.status}`)
  const data: EldoradoLibrary = await res.json()

  const brainrots: EldoradoBrainrot[] = []
  // tradeEnvironments[0] = "Brainrot" item type
  const brainrotType = data.tradeEnvironments?.find(te => te.value === 'Brainrot')
  if (!brainrotType) return brainrots

  // Level 1 = rarities, Level 2 = individual brainrot names
  for (const rarity of brainrotType.childTradeEnvironments) {
    for (const brainrot of rarity.childTradeEnvironments) {
      if (brainrot.value && brainrot.value !== 'Other') {
        brainrots.push({ name: brainrot.value, rarity: rarity.value })
      }
    }
  }
  return brainrots
}

function mutationToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-')
}

const roundToNearest50 = (value: number) => Math.round(value / 50) * 50

interface EldoradoOffer {
  offer: {
    id: string
    offerTitle: string
    pricePerUnitInUSD: { amount: number; currency: string }
    quantity: number
  }
  userOrderInfo: {
    feedbackScore: number
    ratingCount: number
  }
}

interface EldoradoResponse {
  pageIndex: number
  totalPages: number
  recordCount: number
  pageSize: number
  results: EldoradoOffer[]
}

export interface PriceResult {
  brainrotId: string
  brainrotName: string
  mutation: string
  mutationId: string
  usdPrice: number | null
  robuxPrice: number | null
  listingCount: number
  isOutlier: boolean
  error?: string
}

function getMinListings(rarity: string, mutationName: string): number {
  const isRareMutation = !['Default', 'Gold'].includes(mutationName)
  const r = rarity.toLowerCase()
  if (r === 'og') return isRareMutation ? 1 : 3
  if (r === 'secret') return isRareMutation ? 3 : 10
  if (r === 'brainrot god' || r === 'god') return isRareMutation ? 3 : 8
  if (r === 'legendary') return isRareMutation ? 5 : 10
  if (r === 'mythic') return isRareMutation ? 3 : 8
  if (r === 'epic') return isRareMutation ? 5 : 10
  // Event/limited rarities (festive, valentines, admin, taco, etc.)
  return isRareMutation ? 2 : 5
}

async function fetchBrainrotPrice(
  brainrotName: string,
  rarity: string,
  mutation: string = 'default',
  signal?: AbortSignal
): Promise<{ price: number | null; count: number; error?: string }> {
  const isDefault = mutation.toLowerCase() === 'default'

  const params = new URLSearchParams({
    gameId: '259',
    category: 'CustomItem',
    usePerGameScore: 'false',
    tradeEnvironmentValue0: 'Brainrot',
    tradeEnvironmentValue1: rarity,
    tradeEnvironmentValue2: brainrotName,
    pageIndex: '1',
    pageSize: '24',
    offerSortingCriterion: 'Price',
    isAscending: 'true',
  })

  if (isDefault) {
    params.set('offerAttributeIdsCsv', '1-0')
  } else {
    params.set('steal-a-brainrot-mutations', mutationToSlug(mutation))
  }

  if (rarity === 'OG') {
    params.set('lowestPrice', '300')
  } else if (rarity === 'Secret') {
    params.set('lowestPrice', '1')
  }

  const apiUrl = `https://www.eldorado.gg/api/flexibleOffers?${params.toString()}`

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.eldorado.gg/',
      },
      signal,
    })

    if (!response.ok) {
      return { price: null, count: 0, error: `HTTP ${response.status}` }
    }

    const data: EldoradoResponse = await response.json()

    if (!data.results || data.results.length === 0) {
      return { price: null, count: 0 }
    }

    const brainrotNameLower = brainrotName.toLowerCase()
    const trustedOffers = data.results.filter(r =>
      r.userOrderInfo.feedbackScore >= 85 &&
      r.userOrderInfo.ratingCount >= 3 &&
      r.offer.offerTitle.toLowerCase().includes(brainrotNameLower)
    )

    if (trustedOffers.length === 0) {
      return { price: null, count: 0 }
    }

    const offers = trustedOffers.sort((a, b) =>
      a.offer.pricePerUnitInUSD.amount - b.offer.pricePerUnitInUSD.amount
    )

    const prices = offers.map(o => o.offer.pricePerUnitInUSD.amount)
    const median = prices[Math.floor(prices.length / 2)]

    let validOffers = offers
    if (prices.length >= 3) {
      validOffers = offers.filter(o => o.offer.pricePerUnitInUSD.amount >= median * 0.2)
    }

    if (validOffers.length === 0) {
      return { price: null, count: 0 }
    }

    return {
      price: validOffers[0].offer.pricePerUnitInUSD.amount,
      count: validOffers.length,
    }
  } catch (error) {
    return { price: null, count: 0, error: `Fetch error: ${error}` }
  }
}

export interface FetchOptions {
  onProgress?: (fetched: number, total: number) => void | Promise<void>
  onBatchComplete?: (results: PriceResult[]) => void | Promise<void>
  batchSize?: number
  batchDelay?: number
  fetchTimeout?: number
}

/**
 * Fetch prices for all brainrots listed on Eldorado across all mutations.
 * Searches all rarities that have Eldorado listings.
 * Uses batched parallel requests with delays to avoid rate limiting.
 */
export async function fetchAllBrainrotPrices(
  onProgressOrOpts?: ((fetched: number, total: number) => void | Promise<void>) | FetchOptions
): Promise<PriceResult[]> {
  // Support legacy callback signature
  const opts: FetchOptions = typeof onProgressOrOpts === 'function'
    ? { onProgress: onProgressOrOpts }
    : onProgressOrOpts ?? {}

  const { onProgress, onBatchComplete, batchSize = 5, batchDelay = 250, fetchTimeout = 8000 } = opts

  // 1. Fetch brainrot list dynamically from Eldorado
  let eldoradoList: EldoradoBrainrot[] = []
  try {
    eldoradoList = await fetchEldoradoBrainrotList()
    console.log(`[price-fetcher] Fetched ${eldoradoList.length} brainrots from Eldorado`)
  } catch (err) {
    console.error('[price-fetcher] Failed to fetch Eldorado brainrot list, falling back to DB:', err)
  }

  // 2. Get our DB brainrots and mutations
  const dbBrainrots = await prisma.brainrot.findMany({
    where: { isActive: true },
    select: { id: true, name: true, rarity: true },
  })

  const mutations = await prisma.mutation.findMany({
    select: { id: true, name: true },
    orderBy: { multiplier: 'asc' },
  })

  // 3. Match Eldorado names to DB records using fuzzy matching
  // Normalize: lowercase, strip non-alphanumeric, collapse spaces
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()

  // Build lookup maps
  const dbByExact = new Map(dbBrainrots.map(b => [b.name.toLowerCase(), b]))
  const dbByNormalized = new Map(dbBrainrots.map(b => [normalize(b.name), b]))

  // Levenshtein distance for fuzzy matching (minor typos)
  function levenshtein(a: string, b: string): number {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length
    const matrix: number[][] = []
    for (let i = 0; i <= b.length; i++) matrix[i] = [i]
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b[i - 1] === a[j - 1] ? 0 : 1
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        )
      }
    }
    return matrix[b.length][a.length]
  }

  function findBestMatch(eldName: string) {
    // 1. Exact case-insensitive
    const exact = dbByExact.get(eldName.toLowerCase())
    if (exact) return exact

    // 2. Normalized match (strips punctuation, collapses spaces)
    const norm = normalize(eldName)
    const normalized = dbByNormalized.get(norm)
    if (normalized) return normalized

    // 3. Fuzzy: find closest match within edit distance threshold
    // Allow up to 2 edits for names >= 6 chars, 1 for shorter
    const maxDist = norm.length >= 6 ? 2 : 1
    let bestDb = null
    let bestDist = Infinity
    for (const db of dbBrainrots) {
      const dist = levenshtein(norm, normalize(db.name))
      if (dist < bestDist && dist <= maxDist) {
        bestDist = dist
        bestDb = db
      }
    }
    return bestDb
  }

  type MatchedBrainrot = { id: string; name: string; rarity: string; eldoradoName: string }
  const matched: MatchedBrainrot[] = []
  const usedIds = new Set<string>()

  if (eldoradoList.length > 0) {
    const unmatched: string[] = []
    for (const eld of eldoradoList) {
      const db = findBestMatch(eld.name)
      if (db && !usedIds.has(db.id)) {
        matched.push({ id: db.id, name: db.name, rarity: eld.rarity, eldoradoName: eld.name })
        usedIds.add(db.id)
      } else if (!db) {
        unmatched.push(eld.name)
      }
    }
    console.log(`[price-fetcher] Matched ${matched.length}/${eldoradoList.length} Eldorado brainrots to DB`)
    if (unmatched.length > 0) {
      console.log(`[price-fetcher] Unmatched: ${unmatched.slice(0, 10).join(', ')}${unmatched.length > 10 ? ` (+${unmatched.length - 10} more)` : ''}`)
    }
  } else {
    // Fallback: use DB brainrots if Eldorado API failed
    for (const b of dbBrainrots) {
      if (b.rarity && !['Common', 'Rare'].includes(b.rarity)) {
        matched.push({ id: b.id, name: b.name, rarity: b.rarity, eldoradoName: b.name })
      }
    }
    console.log(`[price-fetcher] Fallback: using ${matched.length} DB brainrots`)
  }

  const results: PriceResult[] = []

  // Build all combinations
  const combinations: { brainrot: MatchedBrainrot; mutation: typeof mutations[0] }[] = []
  for (const brainrot of matched) {
    for (const mutation of mutations) {
      combinations.push({ brainrot, mutation })
    }
  }

  const BATCH_SIZE = batchSize
  const BATCH_DELAY = batchDelay

  console.log(`[price-fetcher] ${combinations.length} combinations (${matched.length} brainrots × ${mutations.length} mutations)`)
  if (onProgress) {
    await onProgress(0, combinations.length)
  }

  for (let i = 0; i < combinations.length; i += BATCH_SIZE) {
    const batch = combinations.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map(async ({ brainrot, mutation }) => {
        const result = await fetchBrainrotPriceWithTimeout(brainrot.eldoradoName, brainrot.rarity, mutation.name.toLowerCase(), fetchTimeout)
        const minListings = getMinListings(brainrot.rarity, mutation.name)
        const isOutlier = result.count < minListings

        return {
          brainrotId: brainrot.id,
          brainrotName: brainrot.name,
          mutation: mutation.name,
          mutationId: mutation.id,
          usdPrice: result.price,
          robuxPrice: result.price ? roundToNearest50(result.price * 100) : null,
          listingCount: result.count,
          isOutlier,
          error: result.error,
        }
      })
    )

    results.push(...batchResults)

    if (onBatchComplete) {
      const withPrices = batchResults.filter(r => r.robuxPrice !== null)
      if (withPrices.length > 0) {
        await onBatchComplete(withPrices)
      }
    }

    if (onProgress) {
      await onProgress(Math.min(i + BATCH_SIZE, combinations.length), combinations.length)
    }

    if (i + BATCH_SIZE < combinations.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY))
    }
  }

  return results
}

/** Wrapper that aborts individual fetches that take too long */
async function fetchBrainrotPriceWithTimeout(
  brainrotName: string,
  rarity: string,
  mutation: string,
  timeoutMs: number
): Promise<{ price: number | null; count: number; error?: string }> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const result = await fetchBrainrotPrice(brainrotName, rarity, mutation, controller.signal)
    clearTimeout(timer)
    return result
  } catch {
    return { price: null, count: 0, error: 'Timeout' }
  }
}
