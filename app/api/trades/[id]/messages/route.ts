import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// URL regex to detect links in messages
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi

// Mention regex to find @username patterns
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g

// Check if a URL is from roblox.com (including subdomains)
function isRobloxUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()
    return hostname === 'roblox.com' || hostname.endsWith('.roblox.com')
  } catch {
    return false
  }
}

// Filter message content: remove non-Roblox links
function filterMessageContent(content: string): { filtered: string; blockedLinks: string[] } {
  const blockedLinks: string[] = []

  const filtered = content.replace(URL_REGEX, (match) => {
    if (isRobloxUrl(match)) {
      return match // Keep Roblox links
    }
    blockedLinks.push(match)
    return '[link removed]'
  })

  return { filtered, blockedLinks }
}

// Extract mentioned usernames from message content
function extractMentions(content: string): string[] {
  const mentions: string[] = []
  let match: RegExpExecArray | null
  const regex = new RegExp(MENTION_REGEX.source, 'g')
  while ((match = regex.exec(content)) !== null) {
    mentions.push(match[1]) // Group 1 is the username without @
  }
  return [...new Set(mentions)] // Remove duplicates
}

// Rate limit: max 1 message per 2 seconds per user per trade
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 2000
const CLEANUP_THRESHOLD_MS = 60000 // Clean up entries older than 1 minute
let lastCleanup = Date.now()

// Clean up stale entries from the rate limit map
function cleanupRateLimitMap() {
  const now = Date.now()
  const cutoff = now - CLEANUP_THRESHOLD_MS
  
  for (const [key, timestamp] of rateLimitMap.entries()) {
    if (timestamp < cutoff) {
      rateLimitMap.delete(key)
    }
  }
  
  lastCleanup = now
}

function checkRateLimit(userId: string, tradeId: string): boolean {
  const now = Date.now()
  
  // Run cleanup every minute to prevent memory growth
  if (now - lastCleanup > CLEANUP_THRESHOLD_MS) {
    cleanupRateLimitMap()
  }
  
  const key = `${userId}:${tradeId}`
  const lastMessage = rateLimitMap.get(key)

  if (lastMessage && now - lastMessage < RATE_LIMIT_MS) {
    return false
  }

  rateLimitMap.set(key, now)
  return true
}

// GET /api/trades/[id]/messages - Get messages for a trade
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: tradeId } = await params

    // Verify trade exists
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { id: true, status: true },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Get cursor for pagination
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const messages = await prisma.tradeMessage.findMany({
      where: { tradeId },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            robloxUsername: true,
            robloxUserId: true,
            robloxAvatarUrl: true,
          },
        },
      },
    })

    const nextCursor = messages.length === limit ? messages[messages.length - 1]?.id : null

    return NextResponse.json({
      messages,
      nextCursor,
    })
  } catch (error) {
    console.error('Get trade messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/trades/[id]/messages - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is banned or frozen
    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is banned' }, { status: 403 })
    }
    if (user.isFrozen) {
      return NextResponse.json({ error: 'Your account is frozen' }, { status: 403 })
    }

    const { id: tradeId } = await params
    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Trim and validate message length
    const trimmedContent = content.trim()
    if (trimmedContent.length === 0) {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    }
    if (trimmedContent.length > 1000) {
      return NextResponse.json({ error: 'Message too long (max 1000 characters)' }, { status: 400 })
    }

    // Check rate limit
    if (!checkRateLimit(user.id, tradeId)) {
      return NextResponse.json({ error: 'Please wait before sending another message' }, { status: 429 })
    }

    // Verify trade exists and is open/pending
    const trade = await prisma.trade.findUnique({
      where: { id: tradeId },
      select: { id: true, status: true, userId: true },
    })

    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }

    // Only allow messages on open or pending trades
    if (!['OPEN', 'PENDING'].includes(trade.status)) {
      return NextResponse.json({ error: 'Cannot send messages on closed trades' }, { status: 400 })
    }

    // Filter message content (remove non-Roblox links)
    const { filtered, blockedLinks } = filterMessageContent(trimmedContent)

    // Extract mentions from the filtered message
    const mentionedUsernames = extractMentions(filtered)

    // Create message
    const message = await prisma.tradeMessage.create({
      data: {
        tradeId,
        userId: user.id,
        content: filtered,
      },
      include: {
        user: {
          select: {
            id: true,
            robloxUsername: true,
            robloxUserId: true,
            robloxAvatarUrl: true,
          },
        },
      },
    })

    // Create notifications for mentioned users
    if (mentionedUsernames.length > 0) {
      // Find users by their usernames (case-insensitive)
      const mentionedUsers = await prisma.user.findMany({
        where: {
          robloxUsername: {
            in: mentionedUsernames,
            mode: 'insensitive',
          },
          isBanned: false,
          // Don't notify yourself
          NOT: { id: user.id },
        },
        select: { id: true, robloxUsername: true },
      })

      // Create notifications for each mentioned user
      if (mentionedUsers.length > 0) {
        await prisma.notification.createMany({
          data: mentionedUsers.map((mentionedUser) => ({
            userId: mentionedUser.id,
            type: 'MENTION',
            message: `${user.robloxUsername} mentioned you in a trade chat`,
            tradeId,
            fromUserId: user.id,
          })),
        })
      }
    }

    return NextResponse.json({
      message,
      blockedLinks: blockedLinks.length > 0 ? blockedLinks : undefined,
    })
  } catch (error) {
    console.error('Send trade message error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
