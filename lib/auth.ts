import { cookies } from 'next/headers'
import { prisma } from './db'
import { sha256, generateToken } from './crypto'
import { User } from '@prisma/client'

const SESSION_COOKIE_NAME = 'rocks_session_token'
const SESSION_DURATION_DAYS = 7 // Reduced from 90 for security

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (!token) return null

  const tokenHash = sha256(token)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } })
    return null
  }

  if (session.user.isBanned) return null

  return session.user
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

// SELLER is a valid UserRole in the Prisma schema (USER | SELLER | MOD | ADMIN).
// It is assigned when a seller application is approved. ADMIN is also allowed
// here so that admins can access seller-only routes without needing a separate
// seller account.
export async function requireSeller(): Promise<User> {
  const user = await requireAuth()
  if (user.role !== 'SELLER' && user.role !== 'ADMIN') {
    throw new Error('Seller access required')
  }
  return user
}

export async function requireAdmin(): Promise<User | null> {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') return null
  return user
}

/**
 * Returns user if they are a MOD or ADMIN.
 * Used for USD value management access.
 */
export async function requireModOrAdmin(): Promise<User | null> {
  const user = await getCurrentUser()
  if (!user) return null
  if (user.role !== 'MOD' && user.role !== 'ADMIN') return null
  return user
}

/**
 * Check if user is admin (for conditional rendering)
 */
export function isAdmin(user: User): boolean {
  return user.role === 'ADMIN'
}

/**
 * Check if user is mod only (for conditional rendering)
 */
export function isMod(user: User): boolean {
  return user.role === 'MOD'
}

export async function createSession(userId: string): Promise<string> {
  // Use cryptographically secure random token generation
  const token = generateToken(32) // 256 bits of entropy
  const tokenHash = sha256(token)
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt },
  })

  return token
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS)

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict', // Changed from 'lax' for better CSRF protection
    expires: expiresAt,
    path: '/',
  })
}

export async function logout() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

  if (token) {
    const tokenHash = sha256(token)
    await prisma.session.deleteMany({ where: { tokenHash } })
  }

  cookieStore.delete(SESSION_COOKIE_NAME)
}
