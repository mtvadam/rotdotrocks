/**
 * Provably Fair System
 *
 * This module implements a provably fair gaming system using cryptographic
 * hashing to ensure game outcomes cannot be manipulated.
 *
 * How it works:
 * 1. Server generates a random seed and hashes it (serverSeedHash)
 * 2. Player provides or generates their own seed (clientSeed)
 * 3. Each bet has a unique nonce (incrementing counter)
 * 4. Outcome is determined by: HMAC-SHA256(serverSeed, clientSeed:nonce)
 * 5. After the bet, server reveals the original serverSeed
 * 6. Player can verify: SHA256(serverSeed) === serverSeedHash
 */

// Utility functions for hex/buffer conversion
function hexToBuffer(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g) || []
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)))
}

function bufferToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// SHA-256 hash function (using Web Crypto API)
export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return bufferToHex(new Uint8Array(hashBuffer))
}

// HMAC-SHA256 function
export async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(key)
  const messageData = encoder.encode(message)

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  return bufferToHex(new Uint8Array(signature))
}

// Convert hex hash to a float between 0 and 1
export function hashToFloat(hash: string): number {
  // Use first 13 hex characters (52 bits) for high precision
  const hex = hash.slice(0, 13)
  const int = parseInt(hex, 16)
  // Divide by max value to get 0-1 range
  return int / parseInt('fffffffffffff', 16)
}

// Generate a random client seed
export function generateClientSeed(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return bufferToHex(array)
}

// Generate a random server seed
export function generateServerSeed(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return bufferToHex(array)
}

/**
 * Game outcome generators
 * Each game type has its own method to convert the random float to a game-specific outcome
 */

// Dice game: Roll over/under with target
export interface DiceResult {
  roll: number // 0-100
  target: number
  isOver: boolean
  win: boolean
  multiplier: number
}

export async function generateDiceResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  target: number,
  isOver: boolean
): Promise<DiceResult> {
  const combinedSeed = `${clientSeed}:${nonce}`
  const hash = await hmacSha256(serverSeed, combinedSeed)
  const float = hashToFloat(hash)
  const roll = float * 100

  // Calculate win condition
  const win = isOver ? roll > target : roll < target

  // Calculate multiplier based on win chance
  const winChance = isOver ? (100 - target) : target
  const multiplier = win ? (99 / winChance) : 0 // 1% house edge

  return {
    roll: parseFloat(roll.toFixed(2)),
    target,
    isOver,
    win,
    multiplier: parseFloat(multiplier.toFixed(4)),
  }
}

// Crash game: Generate crash point
export interface CrashResult {
  crashPoint: number
  hash: string
}

export async function generateCrashPoint(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<CrashResult> {
  const combinedSeed = `${clientSeed}:${nonce}`
  const hash = await hmacSha256(serverSeed, combinedSeed)
  const float = hashToFloat(hash)

  // Apply house edge (1%)
  // Crash point formula: 0.99 / (1 - float)
  // Capped at 1.00 for instant crash (1% of the time)
  const instant = hashToFloat(hash.slice(13, 26)) < 0.01

  let crashPoint: number
  if (instant) {
    crashPoint = 1.0
  } else {
    crashPoint = 0.99 / (1 - float)
  }

  return {
    crashPoint: Math.max(1.0, parseFloat(crashPoint.toFixed(2))),
    hash,
  }
}

// Mines game: Generate mine positions
export interface MinesResult {
  minePositions: number[]
  hash: string
}

export async function generateMinePositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  minesCount: number,
  gridSize: number = 25
): Promise<MinesResult> {
  const positions: number[] = []
  let currentNonce = 0

  while (positions.length < minesCount) {
    const combinedSeed = `${clientSeed}:${nonce}:${currentNonce}`
    const hash = await hmacSha256(serverSeed, combinedSeed)
    const float = hashToFloat(hash)
    const position = Math.floor(float * gridSize)

    if (!positions.includes(position)) {
      positions.push(position)
    }
    currentNonce++
  }

  // Get final hash for verification
  const finalHash = await hmacSha256(serverSeed, `${clientSeed}:${nonce}`)

  return {
    minePositions: positions.sort((a, b) => a - b),
    hash: finalHash,
  }
}

// Limbo game: Generate target result
export interface LimboResult {
  result: number
  hash: string
}

export async function generateLimboResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): Promise<LimboResult> {
  const combinedSeed = `${clientSeed}:${nonce}`
  const hash = await hmacSha256(serverSeed, combinedSeed)
  const float = hashToFloat(hash)

  // Same formula as crash but different display
  let result: number
  if (float < 0.01) {
    result = 1.0
  } else {
    result = 0.99 / float
  }

  return {
    result: Math.max(1.0, parseFloat(result.toFixed(2))),
    hash,
  }
}

// Plinko game: Generate ball path
export interface PlinkoResult {
  path: number[] // 0 = left, 1 = right for each row
  finalSlot: number
  hash: string
}

export async function generatePlinkoPath(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  rows: number
): Promise<PlinkoResult> {
  const combinedSeed = `${clientSeed}:${nonce}`
  const hash = await hmacSha256(serverSeed, combinedSeed)

  const path: number[] = []

  // Each bit of the hash determines left/right
  for (let i = 0; i < rows; i++) {
    // Use different parts of the hash for each row
    const subHash = hash.slice(i * 2, i * 2 + 2)
    const value = parseInt(subHash, 16)
    path.push(value % 2) // 0 or 1
  }

  // Final slot is sum of right moves
  const finalSlot = path.reduce((sum, dir) => sum + dir, 0)

  return {
    path,
    finalSlot,
    hash,
  }
}

/**
 * Verification functions
 * These allow players to verify game outcomes
 */

export interface VerificationResult {
  isValid: boolean
  serverSeedMatch: boolean
  outcomeMatch: boolean
  details: string
}

// Verify server seed
export async function verifyServerSeed(
  serverSeed: string,
  serverSeedHash: string
): Promise<boolean> {
  const computedHash = await sha256(serverSeed)
  return computedHash === serverSeedHash
}

// Generic verification for any game
export async function verifyBet(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  gameType: 'dice' | 'crash' | 'mines' | 'limbo' | 'plinko',
  expectedOutcome: number | number[],
  gameParams?: Record<string, unknown>
): Promise<VerificationResult> {
  // First verify server seed hash
  const serverSeedMatch = await verifyServerSeed(serverSeed, serverSeedHash)

  if (!serverSeedMatch) {
    return {
      isValid: false,
      serverSeedMatch: false,
      outcomeMatch: false,
      details: 'Server seed does not match the provided hash',
    }
  }

  // Regenerate outcome based on game type
  let outcomeMatch = false
  let details = ''

  switch (gameType) {
    case 'dice': {
      const target = gameParams?.target as number
      const isOver = gameParams?.isOver as boolean
      const result = await generateDiceResult(serverSeed, clientSeed, nonce, target, isOver)
      outcomeMatch = Math.abs(result.roll - (expectedOutcome as number)) < 0.01
      details = `Roll: ${result.roll}, Expected: ${expectedOutcome}`
      break
    }
    case 'crash': {
      const result = await generateCrashPoint(serverSeed, clientSeed, nonce)
      outcomeMatch = Math.abs(result.crashPoint - (expectedOutcome as number)) < 0.01
      details = `Crash: ${result.crashPoint}, Expected: ${expectedOutcome}`
      break
    }
    case 'mines': {
      const minesCount = gameParams?.minesCount as number
      const result = await generateMinePositions(serverSeed, clientSeed, nonce, minesCount)
      const expected = expectedOutcome as number[]
      outcomeMatch = JSON.stringify(result.minePositions) === JSON.stringify(expected.sort((a, b) => a - b))
      details = `Mines: [${result.minePositions.join(', ')}], Expected: [${expected.join(', ')}]`
      break
    }
    case 'limbo': {
      const result = await generateLimboResult(serverSeed, clientSeed, nonce)
      outcomeMatch = Math.abs(result.result - (expectedOutcome as number)) < 0.01
      details = `Result: ${result.result}, Expected: ${expectedOutcome}`
      break
    }
    case 'plinko': {
      const rows = gameParams?.rows as number
      const result = await generatePlinkoPath(serverSeed, clientSeed, nonce, rows)
      outcomeMatch = result.finalSlot === (expectedOutcome as number)
      details = `Slot: ${result.finalSlot}, Expected: ${expectedOutcome}, Path: [${result.path.join('')}]`
      break
    }
  }

  return {
    isValid: serverSeedMatch && outcomeMatch,
    serverSeedMatch,
    outcomeMatch,
    details,
  }
}

/**
 * Seed pair management
 * For managing active and historical seed pairs
 */

export interface SeedPair {
  serverSeed: string
  serverSeedHash: string
  clientSeed: string
  nonce: number
  createdAt: Date
  revealedAt?: Date
  isActive: boolean
}

// Create a new seed pair
export async function createSeedPair(clientSeed?: string): Promise<SeedPair> {
  const serverSeed = generateServerSeed()
  const serverSeedHash = await sha256(serverSeed)

  return {
    serverSeed,
    serverSeedHash,
    clientSeed: clientSeed || generateClientSeed(),
    nonce: 0,
    createdAt: new Date(),
    isActive: true,
  }
}

// Rotate seeds (reveal current and create new)
export async function rotateSeedPair(
  currentPair: SeedPair,
  newClientSeed?: string
): Promise<{ revealed: SeedPair; new: SeedPair }> {
  const revealed: SeedPair = {
    ...currentPair,
    revealedAt: new Date(),
    isActive: false,
  }

  const newPair = await createSeedPair(newClientSeed)

  return { revealed, new: newPair }
}
