import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        robloxUsername: user.robloxUsername,
        robloxUserId: user.robloxUserId,
        robloxAvatarUrl: user.robloxAvatarUrl,
        role: user.role,
        gems: user.gems,
      },
    })
  } catch (error) {
    // Log without exposing details
    console.error('User session check failed')
    return NextResponse.json({ user: null }, { status: 500 })
  }
}
