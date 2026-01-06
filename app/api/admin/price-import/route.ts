import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// Name mappings: DB name -> Eldorado name
const NAME_MAPPINGS: Record<string, string> = {
  'Burguro And Fryuro': 'Burguro and Fryuro',
  'Chimnino': 'Chimino',
}

// Map DB mutation name (lowercase) -> Eldorado mutation ID
const MUTATION_IDS: Record<string, number> = {
  'default': 0,
  'gold': 1,
  'diamond': 2,
  'bloodrot': 3,
  'candy': 4,
  'lava': 5,
  'galaxy': 6,
  'yin yang': 7,
  'radioactive': 8,
  'rainbow': 9,
  'cursed': 10,
}

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

async function fetchBrainrotPrice(
  brainrotName: string,
  rarity: string,
  mutation: string = 'default'
): Promise<{ price: number | null; count: number; error?: string }> {
  const mutationId = MUTATION_IDS[mutation.toLowerCase()]
  if (mutationId === undefined) {
    return { price: null, count: 0, error: `Unknown mutation: ${mutation}` }
  }

  const params = new URLSearchParams({
    gameId: '259',
    category: 'CustomItem',
    usePerGameScore: 'false',
    tradeEnvironmentValue0: 'Brainrot',
    tradeEnvironmentValue1: rarity,
    tradeEnvironmentValue2: brainrotName,
    pageIndex: '1',
    pageSize: '24',
    offerAttributeIdsCsv: `1-${mutationId}`,
    offerSortingCriterion: 'Price',
    isAscending: 'true',
  })

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

    // Filter: trusted sellers, title contains brainrot name
    const brainrotNameLower = brainrotName.toLowerCase()
    const trustedOffers = data.results.filter(r =>
      r.userOrderInfo.feedbackScore >= 85 &&
      r.userOrderInfo.ratingCount >= 3 &&
      r.offer.offerTitle.toLowerCase().includes(brainrotNameLower)
    )

    if (trustedOffers.length === 0) {
      return { price: null, count: 0 }
    }

    // Sort by price
    const offers = trustedOffers.sort((a, b) =>
      a.offer.pricePerUnitInUSD.amount - b.offer.pricePerUnitInUSD.amount
    )

    // Filter fake listings (<20% of median)
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
      count: validOffers.length
    }
  } catch (error) {
    return { price: null, count: 0, error: `Fetch error: ${error}` }
  }
}

// GET: Fetch price for a single brainrot+mutation
export async function GET(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const brainrotName = searchParams.get('name')
  const rarity = searchParams.get('rarity')
  const mutation = searchParams.get('mutation') || 'default'

  if (!brainrotName || !rarity) {
    return NextResponse.json({ error: 'Missing name or rarity' }, { status: 400 })
  }

  const eldoradoName = NAME_MAPPINGS[brainrotName] || brainrotName
  const result = await fetchBrainrotPrice(eldoradoName, rarity, mutation)

  // Round Robux to nearest 50
  const roundToNearest50 = (value: number) => Math.round(value / 50) * 50

  return NextResponse.json({
    brainrotName,
    mutation,
    usdPrice: result.price,
    robuxPrice: result.price ? roundToNearest50(result.price * 100) : null,
    listingCount: result.count,
    error: result.error
  })
}

// Brainrots worth checking outside Secret/OG
const EXTRA_BRAINROTS = [
  'Raccooni Jandelini',
  'Los Lucky Blocks',
  'Mythic Lucky Block',
  'Brainrot God Lucky Block',
  'Festive Lucky Block',
]

// POST: Get list of all brainrots to import
export async function POST(request: NextRequest) {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const brainrots = await prisma.brainrot.findMany({
    where: {
      isActive: true,
      OR: [
        { rarity: { in: ['Secret', 'OG'] } },
        { name: { in: EXTRA_BRAINROTS } }
      ]
    },
    select: {
      id: true,
      name: true,
      rarity: true,
      mutationValues: {
        include: {
          mutation: { select: { id: true, name: true } }
        }
      }
    },
    orderBy: [
      { rarity: 'asc' },
      { name: 'asc' }
    ]
  })

  const mutations = await prisma.mutation.findMany({
    select: { id: true, name: true },
    orderBy: { multiplier: 'asc' }
  })

  return NextResponse.json({ brainrots, mutations })
}
