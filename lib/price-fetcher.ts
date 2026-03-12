import { prisma } from '@/lib/db'

// Name mappings: DB name -> Eldorado name
const NAME_MAPPINGS: Record<string, string> = {
  'Burguro And Fryuro': 'Burguro and Fryuro',
  'Chimnino': 'Chimino',
}

// Brainrots worth checking outside Secret/OG
const EXTRA_BRAINROTS = [
  'Raccooni Jandelini',
  'Los Lucky Blocks',
  'Mythic Lucky Block',
  'Brainrot God Lucky Block',
  'Festive Lucky Block',
]

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
  if (rarity === 'OG') return isRareMutation ? 1 : 3
  if (rarity === 'Secret') return isRareMutation ? 3 : 10
  return isRareMutation ? 5 : 15
}

async function fetchBrainrotPrice(
  brainrotName: string,
  rarity: string,
  mutation: string = 'default'
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

/**
 * Fetch prices for all Secret/OG brainrots + extra brainrots across all mutations.
 * Uses batched parallel requests with delays to avoid rate limiting.
 */
export async function fetchAllBrainrotPrices(): Promise<PriceResult[]> {
  const brainrots = await prisma.brainrot.findMany({
    where: {
      isActive: true,
      OR: [
        { rarity: { in: ['Secret', 'OG'] } },
        { name: { in: EXTRA_BRAINROTS } },
      ],
    },
    select: { id: true, name: true, rarity: true },
    orderBy: [{ rarity: 'asc' }, { name: 'asc' }],
  })

  const mutations = await prisma.mutation.findMany({
    select: { id: true, name: true },
    orderBy: { multiplier: 'asc' },
  })

  const results: PriceResult[] = []

  // Build all combinations
  const combinations: { brainrot: typeof brainrots[0]; mutation: typeof mutations[0] }[] = []
  for (const brainrot of brainrots) {
    for (const mutation of mutations) {
      combinations.push({ brainrot, mutation })
    }
  }

  // Fetch in batches of 3 with 300ms delay between batches
  const BATCH_SIZE = 3
  const BATCH_DELAY = 300

  for (let i = 0; i < combinations.length; i += BATCH_SIZE) {
    const batch = combinations.slice(i, i + BATCH_SIZE)

    const batchResults = await Promise.all(
      batch.map(async ({ brainrot, mutation }) => {
        const eldoradoName = NAME_MAPPINGS[brainrot.name] || brainrot.name
        const rarity = brainrot.rarity || 'Common'
        const result = await fetchBrainrotPrice(eldoradoName, rarity, mutation.name.toLowerCase())
        const minListings = getMinListings(rarity, mutation.name)
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

    if (i + BATCH_SIZE < combinations.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY))
    }
  }

  return results
}
