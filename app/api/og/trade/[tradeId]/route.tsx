import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// This route serves as a redirect to pre-generated OG images stored in Vercel Blob.
//
// Why this approach?
// - @vercel/og with dynamic image generation was failing with 500 errors on Vercel production
// - The error occurred before our try-catch, suggesting module-level crashes
// - Pre-generation to Vercel Blob works reliably
// - This route now simply redirects to the blob URL if available
//
// Flow:
// 1. Trade is created -> OG image is generated and uploaded to Vercel Blob
// 2. ogImageUrl is saved in the database
// 3. When this route is hit, we redirect to the blob URL
// 4. If no blob URL exists, we return a simple fallback

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tradeId: string }> }
) {
  try {
    const { tradeId } = await params

    // Validate tradeId format (cuid format check)
    if (!tradeId || tradeId.length < 20 || tradeId.length > 30) {
      return new NextResponse('Invalid trade ID', { status: 400 })
    }

    // Look up the trade to get the pre-generated OG image URL
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: {
        ogImageUrl: true,
        user: {
          select: { robloxUsername: true },
        },
      },
    })

    if (!trade) {
      return new NextResponse('Trade not found', { status: 404 })
    }

    // If we have a pre-generated OG image, redirect to it
    if (trade.ogImageUrl) {
      return NextResponse.redirect(trade.ogImageUrl, {
        status: 302, // Temporary redirect so crawlers can re-check
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      })
    }

    // No pre-generated image available - trigger regeneration and return fallback
    // We'll trigger async regeneration to fix this trade
    triggerOGRegeneration(tradeId).catch(console.error)

    // Return a redirect to the default OG image
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rot.rocks'
    return NextResponse.redirect(`${baseUrl}/og-default.png`, {
      status: 302,
      headers: {
        'Cache-Control': 'public, max-age=60', // Short cache since we're regenerating
      },
    })
  } catch (error) {
    console.error('OG trade route error:', error)

    // Return fallback on any error
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rot.rocks'
    return NextResponse.redirect(`${baseUrl}/og-default.png`, { status: 302 })
  }
}

// Trigger OG image regeneration for trades that don't have one
async function triggerOGRegeneration(tradeId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rot.rocks'

    // Call the regeneration endpoint
    await fetch(`${baseUrl}/api/og/regenerate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Internal API key to prevent abuse
        'X-Internal-Key': process.env.INTERNAL_API_KEY || 'internal',
      },
      body: JSON.stringify({ tradeId }),
    })
  } catch (error) {
    console.error('Failed to trigger OG regeneration:', error)
  }
}
