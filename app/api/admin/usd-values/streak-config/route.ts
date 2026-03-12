import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireModOrAdmin } from '@/lib/auth'

const CONFIG_KEY = 'trait_streak_multipliers'
const DEFAULT_STREAKS: Record<string, number> = { '3': 2, '5': 3 }

// GET - fetch current streak config
export async function GET() {
  try {
    const user = await requireModOrAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })
    const streaks = config ? JSON.parse(config.value) : DEFAULT_STREAKS
    return NextResponse.json({ streaks })
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Get streak config error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - update streak config (admin: apply directly, mod: submit for approval)
export async function PUT(request: Request) {
  try {
    const user = await requireModOrAdmin()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { streaks } = await request.json()

    // Validate: keys must be positive integers, values must be positive numbers
    if (!streaks || typeof streaks !== 'object') {
      return NextResponse.json({ error: 'Invalid streaks object' }, { status: 400 })
    }

    const cleaned: Record<string, number> = {}
    for (const [key, value] of Object.entries(streaks)) {
      const k = parseInt(key)
      const v = Number(value)
      if (isNaN(k) || k < 1 || isNaN(v) || v <= 0) {
        return NextResponse.json({ error: `Invalid entry: ${key} → ${value}` }, { status: 400 })
      }
      cleaned[String(k)] = v
    }

    const isAdmin = user.role === 'ADMIN'

    if (!isAdmin) {
      // Mod: submit for approval
      const config = await prisma.systemConfig.findUnique({ where: { key: CONFIG_KEY } })
      const oldStreaks = config ? JSON.parse(config.value) : DEFAULT_STREAKS

      await prisma.pendingEdit.create({
        data: {
          editType: 'streak_config',
          description: `Update streak multipliers: ${Object.entries(cleaned).map(([k, v]) => `${k}→${v}x`).join(', ')}`,
          oldData: JSON.stringify(oldStreaks),
          newData: JSON.stringify(cleaned),
          submitterId: user.id,
        },
      })

      return NextResponse.json({ submitted: true })
    }

    // Admin: apply directly
    await prisma.systemConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(cleaned) },
      create: { key: CONFIG_KEY, value: JSON.stringify(cleaned) },
    })

    return NextResponse.json({ streaks: cleaned })
  } catch (error: any) {
    if (error?.message === 'Unauthorized' || error?.message === 'Forbidden') {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    console.error('Update streak config error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
