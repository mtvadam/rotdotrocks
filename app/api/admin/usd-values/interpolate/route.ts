import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { interpolateAllBrainrotValues } from '@/lib/value-interpolation'

// POST /api/admin/usd-values/interpolate - Run value interpolation on all brainrots
export async function POST() {
  const user = await requireAdmin()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await interpolateAllBrainrotValues()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error running interpolation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
