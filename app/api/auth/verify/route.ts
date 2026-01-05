import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sha256 } from '@/lib/crypto'
import { createSession, setSessionCookie } from '@/lib/auth'
import { verifyChallengeInProfile, fetchRobloxProfile, fetchRobloxAvatar } from '@/lib/roblox'
import { checkRateLimitDynamic } from '@/lib/rate-limit'

// POST /api/auth/verify - Verify challenge and create session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { robloxUsername, challengePhrase } = body

    if (!robloxUsername || !challengePhrase) {
      return NextResponse.json({ error: 'Username and challenge required' }, { status: 400 })
    }

    // Rate limit (configurable via admin panel)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const rateLimitKey = `auth-verify:${ip}:${robloxUsername}`
    const rateLimit = await checkRateLimitDynamic(rateLimitKey, 'auth-verify')

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please try again later.' },
        { status: 429 }
      )
    }

    // Find the challenge (case-insensitive)
    const challengeHash = sha256(challengePhrase)
    const challenge = await prisma.authChallenge.findFirst({
      where: {
        robloxUsername: {
          equals: robloxUsername,
          mode: 'insensitive'
        },
        challengeHash,
        expiresAt: { gte: new Date() },
      },
    })

    if (!challenge) {
      return NextResponse.json(
        { error: 'Invalid or expired challenge. Please start over.' },
        { status: 400 }
      )
    }

    // Verify the challenge phrase is in the Roblox profile
    const verified = await verifyChallengeInProfile(robloxUsername, challengePhrase)

    if (!verified) {
      return NextResponse.json(
        { error: 'Challenge phrase not found in your Roblox profile description. Please make sure you added it exactly as shown.' },
        { status: 400 }
      )
    }

    // Fetch the full profile to get userId and correct username capitalization
    const profile = await fetchRobloxProfile(robloxUsername)

    if (!profile) {
      return NextResponse.json(
        { error: 'Failed to fetch Roblox profile. Please try again.' },
        { status: 500 }
      )
    }

    // Use the correct username from Roblox API (with proper capitalization)
    const correctUsername = profile.username

    // Check if user should be admin (from ADMINS env var)
    const adminUsernames = (process.env.ADMINS || '')
      .split(',')
      .map(u => u.trim().toLowerCase())
      .filter(u => u.length > 0)

    const isAdmin = adminUsernames.includes(correctUsername.toLowerCase())

    // Check if user should be mod (from MODS env var)
    const modUsernames = (process.env.MODS || '')
      .split(',')
      .map(u => u.trim().toLowerCase())
      .filter(u => u.length > 0)

    const isMod = modUsernames.includes(correctUsername.toLowerCase())

    // Fetch avatar URL
    const avatarUrl = await fetchRobloxAvatar(profile.userId)

    // Create or update user with Roblox user ID and correct username
    let user = await prisma.user.findFirst({
      where: {
        robloxUsername: {
          equals: correctUsername,
          mode: 'insensitive'
        }
      },
    })

    // Determine role: ADMIN > MOD > USER
    const determineRole = () => {
      if (isAdmin) return 'ADMIN'
      if (isMod) return 'MOD'
      return 'USER'
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          robloxUsername: correctUsername,
          robloxUserId: profile.userId,
          robloxAvatarUrl: avatarUrl,
          role: determineRole(),
          gems: 20, // Starting gems
          lastIpAddress: ip !== 'unknown' ? ip : null,
        },
      })
    } else {
      // Update robloxUserId if not set, upgrade role if in env list, fix username capitalization, and refresh avatar
      const updates: any = {}
      if (!user.robloxUserId) {
        updates.robloxUserId = profile.userId
      }
      // Upgrade to admin if in ADMINS list
      if (isAdmin && user.role !== 'ADMIN') {
        updates.role = 'ADMIN'
      }
      // Upgrade to mod if in MODS list (but not if already admin)
      if (isMod && user.role !== 'ADMIN' && user.role !== 'MOD') {
        updates.role = 'MOD'
      }
      // Always update to correct capitalization from Roblox API
      if (user.robloxUsername !== correctUsername) {
        updates.robloxUsername = correctUsername
      }
      // Always refresh avatar on login
      if (avatarUrl) {
        updates.robloxAvatarUrl = avatarUrl
      }
      // Store IP address on login
      if (ip !== 'unknown') {
        updates.lastIpAddress = ip
      }

      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updates,
        })
      }
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Your account has been banned.' },
        { status: 403 }
      )
    }

    // Create session
    const token = await createSession(user.id)
    await setSessionCookie(token)

    // Clean up the challenge
    await prisma.authChallenge.delete({ where: { id: challenge.id } })

    return NextResponse.json({
      success: true,
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
    // Log error without exposing details
    console.error('Verification failed')
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
