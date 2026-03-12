import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireModOrAdmin } from '@/lib/auth'

const VALID_DEMANDS = ['TERRIBLE', 'LOW', 'NORMAL', 'HIGH', 'AMAZING']
const VALID_TRENDS = ['LOWERING', 'STABLE', 'RISING']

// PUT - Bulk update demand/trend on BrainrotMutationValue rows
export async function PUT(request: NextRequest) {
  const user = await requireModOrAdmin()
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const { updates } = await request.json()
    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates array required' }, { status: 400 })
    }

    const isAdmin = user.role === 'ADMIN'

    if (!isAdmin) {
      // Mod: create pending edits
      const pendingEdits = []
      for (const u of updates) {
        const { brainrotId, mutationId, demand, trend } = u
        if (!brainrotId || !mutationId) continue

        const [brainrot, mutation, existing] = await Promise.all([
          prisma.brainrot.findUnique({ where: { id: brainrotId }, select: { name: true } }),
          prisma.mutation.findUnique({ where: { id: mutationId }, select: { name: true } }),
          prisma.brainrotMutationValue.findUnique({
            where: { brainrotId_mutationId: { brainrotId, mutationId } },
            select: { demand: true, trend: true },
          }),
        ])

        const changes: string[] = []
        if (demand && VALID_DEMANDS.includes(demand)) changes.push(`demand: ${existing?.demand} → ${demand}`)
        if (trend && VALID_TRENDS.includes(trend)) changes.push(`trend: ${existing?.trend} → ${trend}`)
        if (changes.length === 0) continue

        pendingEdits.push({
          editType: 'mutation_demand_trend',
          targetId: `${brainrotId}:${mutationId}`,
          description: `Update ${brainrot?.name} × ${mutation?.name} ${changes.join(', ')}`,
          oldData: JSON.stringify({ demand: existing?.demand, trend: existing?.trend }),
          newData: JSON.stringify({ demand, trend }),
          submitterId: user.id,
        })
      }

      if (pendingEdits.length > 0) {
        await prisma.pendingEdit.createMany({ data: pendingEdits })
      }
      return NextResponse.json({ submitted: true, count: pendingEdits.length })
    }

    // Admin: apply directly
    const operations = []
    for (const u of updates) {
      const { brainrotId, mutationId, demand, trend } = u
      if (!brainrotId || !mutationId) continue

      const data: Record<string, string> = {}
      if (demand && VALID_DEMANDS.includes(demand)) data.demand = demand
      if (trend && VALID_TRENDS.includes(trend)) data.trend = trend
      if (Object.keys(data).length === 0) continue

      operations.push(
        prisma.brainrotMutationValue.update({
          where: { brainrotId_mutationId: { brainrotId, mutationId } },
          data,
        })
      )
    }

    if (operations.length > 0) {
      await prisma.$transaction(operations)
      await prisma.auditLog.create({
        data: {
          adminId: user.id,
          action: 'BULK_UPDATE_MUTATION_DEMAND_TREND',
          targetType: 'BrainrotMutationValue',
          targetId: 'bulk',
          details: JSON.stringify({ updateCount: operations.length }),
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating mutation demand/trend:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
