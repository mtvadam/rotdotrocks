import { NextRequest, NextResponse } from 'next/server'
import { nanoid } from 'nanoid'
import { cookies } from 'next/headers'

// GET /api/auth/roblox - Redirect to Roblox OAuth
export async function GET(request: NextRequest) {
  const clientId = process.env.RBX_OAUTH_CLIENTID

  if (!clientId) {
    return NextResponse.json(
      { error: 'OAuth not configured' },
      { status: 500 }
    )
  }

  // Generate state and code verifier for PKCE
  const state = nanoid(32)
  const codeVerifier = nanoid(64)

  // Create code challenge (S256)
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const codeChallenge = Buffer.from(digest)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  // Store state and code verifier in cookies
  const cookieStore = await cookies()
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  })
  cookieStore.set('oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  // Build redirect URL
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/auth/roblox/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  const authUrl = `https://apis.roblox.com/oauth/v1/authorize?${params}`

  return NextResponse.redirect(authUrl)
}
