import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'
import { createSession, setSessionCookie } from '@/lib/auth'
import { fetchRobloxAvatar } from '@/lib/roblox'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
  id_token?: string
}

interface UserInfo {
  sub: string // Roblox user ID
  name?: string // Display name
  nickname?: string // Username
  preferred_username?: string // Username
  profile?: string // Profile URL
  picture?: string // Avatar URL
}

// GET /api/auth/roblox/callback - Handle OAuth callback
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error, errorDescription)
      return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(errorDescription || error)}`)
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/login?error=missing_params`)
    }

    // Verify state
    const cookieStore = await cookies()
    const storedState = cookieStore.get('oauth_state')?.value
    const codeVerifier = cookieStore.get('oauth_code_verifier')?.value

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`)
    }

    if (!codeVerifier) {
      return NextResponse.redirect(`${baseUrl}/login?error=missing_verifier`)
    }

    // Clear OAuth cookies
    cookieStore.delete('oauth_state')
    cookieStore.delete('oauth_code_verifier')

    // Exchange code for tokens
    const clientId = process.env.RBX_OAUTH_CLIENTID
    const clientSecret = process.env.RBX_OAUTH_SECRET
    const redirectUri = `${baseUrl}/api/auth/roblox/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(`${baseUrl}/login?error=oauth_not_configured`)
    }

    const tokenResponse = await fetch('https://apis.roblox.com/oauth/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: codeVerifier,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`)
    }

    const tokens: TokenResponse = await tokenResponse.json()

    // Get user info
    const userInfoResponse = await fetch('https://apis.roblox.com/oauth/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })

    if (!userInfoResponse.ok) {
      console.error('User info fetch failed')
      return NextResponse.redirect(`${baseUrl}/login?error=userinfo_failed`)
    }

    const userInfo: UserInfo = await userInfoResponse.json()

    const robloxUserId = userInfo.sub
    const robloxUsername = userInfo.preferred_username || userInfo.nickname || userInfo.name || `User${robloxUserId}`

    if (!robloxUserId) {
      return NextResponse.redirect(`${baseUrl}/login?error=no_user_id`)
    }

    // Get IP address
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'

    // Check if user should be admin
    const adminUsernames = (process.env.ADMINS || '')
      .split(',')
      .map(u => u.trim().toLowerCase())
      .filter(u => u.length > 0)

    const isAdmin = adminUsernames.includes(robloxUsername.toLowerCase())

    // Fetch avatar URL (use our own method for consistent avatars)
    const avatarUrl = await fetchRobloxAvatar(robloxUserId) || userInfo.picture

    // Create or update user
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { robloxUserId },
          { robloxUsername: { equals: robloxUsername, mode: 'insensitive' } },
        ],
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          robloxUsername,
          robloxUserId,
          robloxAvatarUrl: avatarUrl,
          role: isAdmin ? 'ADMIN' : 'USER',
          gems: 20, // Starting gems
          lastIpAddress: ip !== 'unknown' ? ip : null,
        },
      })
    } else {
      // Update user info
      const updates: Record<string, unknown> = {
        robloxUserId, // Always update in case it wasn't set
        robloxUsername, // Use OAuth username (properly capitalized)
      }

      if (isAdmin && user.role !== 'ADMIN') {
        updates.role = 'ADMIN'
      }
      if (avatarUrl) {
        updates.robloxAvatarUrl = avatarUrl
      }
      if (ip !== 'unknown') {
        updates.lastIpAddress = ip
      }

      user = await prisma.user.update({
        where: { id: user.id },
        data: updates,
      })
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.redirect(`${baseUrl}/login?error=account_banned`)
    }

    // Create session
    const sessionToken = await createSession(user.id)
    await setSessionCookie(sessionToken)

    // Redirect to trading page
    return NextResponse.redirect(`${baseUrl}/trading`)
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(`${baseUrl}/login?error=callback_failed`)
  }
}
