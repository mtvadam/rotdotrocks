import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { checkRateLimitDynamic } from '@/lib/rate-limit'

// POST - Create a new report (authenticated users)
export async function POST(req: Request) {
  try {
    const user = await requireAuth()

    // Check if user is banned or frozen
    if (user.isBanned) {
      return NextResponse.json({ error: 'Your account is banned' }, { status: 403 })
    }
    if (user.isFrozen) {
      return NextResponse.json({ error: 'Your account is frozen' }, { status: 403 })
    }

    // Rate limit (configurable via admin panel)
    const rateLimit = await checkRateLimitDynamic(`reports:${user.id}`, 'reports')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reports. Please wait before submitting another.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const { type, description, brainrotId, traitId, mutationId, expectedValue, actualValue } = body

    if (!type || !description) {
      return NextResponse.json(
        { error: 'Type and description are required' },
        { status: 400 }
      )
    }

    // Validate description length to prevent abuse
    if (description.length > 2000) {
      return NextResponse.json(
        { error: 'Description too long (max 2000 characters)' },
        { status: 400 }
      )
    }

    const validTypes = ['BRAINROT_VALUE', 'TRAIT_MULTIPLIER', 'MUTATION_MULTIPLIER', 'CALCULATION_FORMULA', 'OTHER']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid report type' },
        { status: 400 }
      )
    }

    const report = await prisma.report.create({
      data: {
        type,
        description,
        reporterId: user.id,
        brainrotId: brainrotId || null,
        traitId: traitId || null,
        mutationId: mutationId || null,
        expectedValue: expectedValue || null,
        actualValue: actualValue || null,
      },
      include: {
        reporter: {
          select: {
            id: true,
            robloxUsername: true,
            robloxAvatarUrl: true,
          },
        },
        brainrot: {
          select: {
            id: true,
            name: true,
            baseCost: true,
            baseIncome: true,
          },
        },
        trait: {
          select: {
            id: true,
            name: true,
            multiplier: true,
          },
        },
        mutation: {
          select: {
            id: true,
            name: true,
            multiplier: true,
          },
        },
      },
    })

    return NextResponse.json({
      report: {
        ...report,
        brainrot: report.brainrot
          ? {
              ...report.brainrot,
              baseCost: report.brainrot.baseCost.toString(),
              baseIncome: report.brainrot.baseIncome.toString(),
            }
          : null,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating report:', error)
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 })
  }
}

// GET - List reports (admin only)
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Validate and sanitize pagination params
    const rawLimit = parseInt(searchParams.get('limit') || '50')
    const rawOffset = parseInt(searchParams.get('offset') || '0')
    const limit = Math.min(Math.max(1, isNaN(rawLimit) ? 50 : rawLimit), 100)
    const offset = Math.max(0, isNaN(rawOffset) ? 0 : rawOffset)

    // Validate enums
    const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']
    const validTypes = ['BRAINROT_VALUE', 'TRAIT_MULTIPLIER', 'MUTATION_MULTIPLIER', 'CALCULATION_FORMULA', 'OTHER']

    const where: Record<string, unknown> = {}
    if (status && validStatuses.includes(status)) where.status = status
    if (type && validTypes.includes(type)) where.type = type

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              robloxUsername: true,
              robloxAvatarUrl: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              robloxUsername: true,
            },
          },
          brainrot: {
            select: {
              id: true,
              name: true,
              baseCost: true,
              baseIncome: true,
            },
          },
          trait: {
            select: {
              id: true,
              name: true,
              multiplier: true,
            },
          },
          mutation: {
            select: {
              id: true,
              name: true,
              multiplier: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where }),
    ])

    return NextResponse.json({
      reports: reports.map((r) => ({
        ...r,
        brainrot: r.brainrot
          ? {
              ...r.brainrot,
              baseCost: r.brainrot.baseCost.toString(),
              baseIncome: r.brainrot.baseIncome.toString(),
            }
          : null,
      })),
      total,
    })
  } catch (error) {
    console.error('Failed to list reports')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
