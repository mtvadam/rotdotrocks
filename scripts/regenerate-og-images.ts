/**
 * Script to regenerate OG images for trades.
 *
 * Usage:
 *   npx tsx scripts/regenerate-og-images.ts
 *
 * Options:
 *   --limit 10    Process only 10 trades
 *   --force       Regenerate ALL trades (even those with existing OG images)
 *
 * This script:
 * 1. Finds trades (without ogImageUrl, or all if --force)
 * 2. Generates OG images for each using @vercel/og
 * 3. Uploads to Vercel Blob
 * 4. Updates the trade with the blob URL
 */

import { PrismaClient } from '@prisma/client'
import { generateAndUploadTradeOG, TradeForOG } from '../lib/og-generator'

const prisma = new PrismaClient()

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 100
  const force = args.includes('--force')

  console.log(`[OG Regeneration] Starting with limit: ${limit}${force ? ' (FORCE mode - regenerating all)' : ''}`)

  // Find trades (all if force, otherwise only missing OG images)
  const trades = await prisma.trade.findMany({
    where: force ? {} : {
      ogImageUrl: null,
    },
    include: {
      user: {
        select: { robloxUsername: true },
      },
      items: {
        include: {
          brainrot: {
            select: { name: true, baseIncome: true, localImage: true },
          },
          mutation: {
            select: { name: true, multiplier: true },
          },
          traits: {
            include: {
              trait: { select: { multiplier: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  console.log(`[OG Regeneration] Found ${trades.length} trades to process`)

  let successCount = 0
  let failCount = 0

  for (const trade of trades) {
    try {
      console.log(`\n[OG Regeneration] Processing trade ${trade.id} by ${trade.user.robloxUsername}...`)

      const tradeForOG: TradeForOG = {
        id: trade.id,
        user: { robloxUsername: trade.user.robloxUsername },
        items: trade.items.map((item) => ({
          side: item.side,
          brainrot: item.brainrot,
          mutation: item.mutation,
          traits: item.traits,
          addonType: item.addonType,
        })),
      }

      const ogImageUrl = await generateAndUploadTradeOG(tradeForOG)

      if (ogImageUrl) {
        await prisma.trade.update({
          where: { id: trade.id },
          data: { ogImageUrl },
        })
        console.log(`[OG Regeneration] Success: ${ogImageUrl}`)
        successCount++
      } else {
        console.log(`[OG Regeneration] Failed to generate image`)
        failCount++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`[OG Regeneration] Error processing trade ${trade.id}:`, error)
      failCount++
    }
  }

  console.log(`\n[OG Regeneration] Complete!`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Failed: ${failCount}`)
  console.log(`  Total: ${trades.length}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
