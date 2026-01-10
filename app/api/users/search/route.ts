import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// GET /api/users/search?q=username - Search users by username for mentions
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()

    if (!query || query.length < 1) {
      return NextResponse.json({ users: [] })
    }

    // Search for users matching the query (case-insensitive)
    const users = await prisma.user.findMany({
      where: {
        robloxUsername: {
          contains: query,
          mode: 'insensitive',
        },
        isBanned: false,
      },
      select: {
        id: true,
        robloxUsername: true,
        robloxUserId: true,
        robloxAvatarUrl: true,
      },
      take: 8, // Limit to 8 suggestions
      orderBy: {
        // Prioritize exact matches and shorter usernames
        robloxUsername: 'asc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('User search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
