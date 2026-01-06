#!/usr/bin/env npx tsx

/**
 * Fetch brainrot prices from Eldorado.gg
 * Usage: npx tsx scripts/fetch-brainrot-prices.ts [brainrotName] [rarity]
 * If no args, fetches all Secret and OG brainrots from database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const MUTATION_IDS: Record<string, number> = {
  default: 0,
  gold: 1,
  diamond: 2,
  bloodrot: 3,
  candy: 4,
  lava: 5,
  galaxy: 6,
  'yin yang': 7,
  radioactive: 8,
  rainbow: 9,
  cursed: 10,
}

interface EldoradoOffer {
  offer: {
    id: string
    offerTitle: string
    pricePerUnitInUSD: { amount: number; currency: string }
    quantity: number
    userId: string
    guaranteedDeliveryTime?: string
  }
  userOrderInfo: {
    feedbackScore: number  // Rating percentage (0-100)
    ratingCount: number    // Number of sales/reviews
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
): Promise<{ price: number | null; offers: EldoradoOffer[]; recordCount: number; error?: string }> {
  const mutationId = MUTATION_IDS[mutation.toLowerCase()]
  if (mutationId === undefined) {
    return { price: null, offers: [], recordCount: 0, error: `Unknown mutation: ${mutation}` }
  }

  // Build API URL with correct params
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

  // OG brainrots: ignore listings under $300
  if (rarity === 'OG') {
    params.set('lowestPrice', '300')
  }

  const apiUrl = `https://www.eldorado.gg/api/flexibleOffers?${params.toString()}`

  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.eldorado.gg/',
        },
      })

      if (response.status === 404 || response.status === 429) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000 * attempt)) // Exponential backoff
          continue
        }
        return { price: null, offers: [], recordCount: 0, error: `Rate limited` }
      }

      if (!response.ok) {
        return { price: null, offers: [], recordCount: 0, error: `HTTP ${response.status}` }
      }

      const data: EldoradoResponse = await response.json()

      if (!data.results || data.results.length === 0) {
        return { price: null, offers: [], recordCount: 0, error: 'No listings found' }
      }

      // Filter out bad sellers: rating < 85% or less than 3 sales
      // Also filter out fake listings where title doesn't contain the brainrot name
      const brainrotNameLower = brainrotName.toLowerCase()
      const trustedOffers = data.results.filter(r =>
        r.userOrderInfo.feedbackScore >= 85 &&
        r.userOrderInfo.ratingCount >= 3 &&
        r.offer.offerTitle.toLowerCase().includes(brainrotNameLower)
      )

      if (trustedOffers.length === 0) {
        return { price: null, offers: [], recordCount: 0, error: 'No trusted sellers' }
      }

      // Sort by price (should already be sorted)
      const offers = trustedOffers.sort((a, b) =>
        a.offer.pricePerUnitInUSD.amount - b.offer.pricePerUnitInUSD.amount
      )

      // Filter out fake listings: if cheapest is <20% of median, skip it
      const prices = offers.map(o => o.offer.pricePerUnitInUSD.amount)
      const median = prices[Math.floor(prices.length / 2)]

      let validOffers = offers
      if (prices.length >= 3) {
        // Remove listings that are suspiciously cheap (<20% of median)
        validOffers = offers.filter(o => o.offer.pricePerUnitInUSD.amount >= median * 0.2)
      }

      if (validOffers.length === 0) {
        return { price: null, offers: [], recordCount: 0, error: 'No valid listings' }
      }

      const cheapest = validOffers[0].offer.pricePerUnitInUSD.amount

      return { price: cheapest, offers: validOffers, recordCount: validOffers.length }
    } catch (error) {
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 2000 * attempt))
        continue
      }
      return { price: null, offers: [], recordCount: 0, error: `Fetch error: ${error}` }
    }
  }

  return { price: null, offers: [], recordCount: 0, error: 'Max retries exceeded' }
}

// Name mappings: DB name -> Eldorado name
const NAME_MAPPINGS: Record<string, string> = {
  'Burguro And Fryuro': 'Burguro and Fryuro',
  'Chimnino': 'Chimino',
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function fetchAllMutations(brainrotName: string, rarity: string): Promise<void> {
  // Map DB name to Eldorado name if needed
  const eldoradoName = NAME_MAPPINGS[brainrotName] || brainrotName

  console.log(`\n🧠 ${brainrotName} (${rarity})`)
  console.log('─'.repeat(40))

  const mutations = Object.keys(MUTATION_IDS)
  const results: { mutation: string; price: number; count: number }[] = []

  // Fetch mutations sequentially with delay to avoid rate limiting
  for (const mutation of mutations) {
    const result = await fetchBrainrotPrice(eldoradoName, rarity, mutation)
    if (result.price !== null) {
      results.push({ mutation, price: result.price, count: result.recordCount })
    }
    await delay(500) // 500ms between requests to avoid rate limiting
  }

  if (results.length === 0) {
    console.log('   ❌ No listings found for any mutation')
    return
  }

  // Sort by mutation order
  results.sort((a, b) => MUTATION_IDS[a.mutation] - MUTATION_IDS[b.mutation])

  // Display results - higher rarity = more common = need more listings
  // Secret: 10+, OG: 3+, others (Legendary, Epic, etc.): 15+
  const minListings = rarity === 'OG' ? 3 : rarity === 'Secret' ? 10 : 15
  const defaultPrice = results.find(r => r.mutation === 'default')?.price || 0

  for (const r of results) {
    const mutationLabel = r.mutation.charAt(0).toUpperCase() + r.mutation.slice(1)

    // Mark as outlier if: too few listings OR price way off from default (likely fake listing/service)
    const isTooFewListings = r.count < minListings
    const isPriceTooHigh = defaultPrice > 0 && r.mutation !== 'default' && r.price > defaultPrice * 50
    const isPriceTooLow = defaultPrice > 0 && r.mutation !== 'default' && r.price < defaultPrice * 0.1
    const outlierMark = (isTooFewListings || isPriceTooHigh || isPriceTooLow) ? ' ⚠️' : ''

    console.log(`   ${mutationLabel.padEnd(12)} $${r.price.toFixed(2).padStart(8)} (${r.count} listings)${outlierMark}`)
  }
}

async function main() {
  const args = process.argv.slice(2)

  try {
    if (args.length === 0) {
      // Brainrots worth checking outside Secret/OG
      const EXTRA_BRAINROTS = [
        'Raccooni Jandelini',
        'Los Lucky Blocks',
        'Mythic Lucky Block',
        'Brainrot God Lucky Block',
        'Festive Lucky Block',
      ]

      // Fetch active Secret/OG brainrots + extras from database
      const brainrots = await prisma.brainrot.findMany({
        where: {
          isActive: true,
          OR: [
            { rarity: { in: ['Secret', 'OG'] } },
            { name: { in: EXTRA_BRAINROTS } }
          ]
        },
        select: {
          name: true,
          rarity: true
        },
        orderBy: [
          { rarity: 'asc' },
          { name: 'asc' }
        ]
      })

      console.log(`🧠 Fetching prices for ${brainrots.length} Secret/OG brainrots...\n`)

      for (const brainrot of brainrots) {
        await fetchAllMutations(brainrot.name, brainrot.rarity!)
      }
    } else {
      const [name, rarity = 'OG'] = args

      if (!name) {
        console.error('Error: Brainrot name is required')
        process.exit(1)
      }

      await fetchAllMutations(name, rarity)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(console.error)
