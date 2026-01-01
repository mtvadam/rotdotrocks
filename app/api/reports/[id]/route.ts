import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { createAuditLog, AuditActions } from '@/lib/audit'

// GET - Get report details (admin only)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { id } = await params

    const report = await prisma.report.findUnique({
      where: { id },
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
            localImage: true,
          },
        },
        trait: {
          select: {
            id: true,
            name: true,
            multiplier: true,
            localImage: true,
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

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

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
    console.error('Failed to fetch report')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

// PATCH - Update report status (admin only)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { id } = await params

    const body = await req.json()
    const { status, adminNote } = body

    const validStatuses = ['OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const existingReport = await prisma.report.findUnique({
      where: { id },
    })

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (status) {
      updateData.status = status
      if (status === 'RESOLVED' || status === 'DISMISSED') {
        updateData.resolvedById = admin.id
        updateData.resolvedAt = new Date()
      }
    }
    if (adminNote !== undefined) {
      updateData.adminNote = adminNote
    }

    const report = await prisma.report.update({
      where: { id },
      data: updateData,
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
      },
    })

    // Create audit log
    if (status) {
      const action =
        status === 'RESOLVED'
          ? AuditActions.REPORT_RESOLVED
          : status === 'DISMISSED'
            ? AuditActions.REPORT_DISMISSED
            : AuditActions.REPORT_IN_REVIEW

      await createAuditLog(admin.id, action, 'REPORT', id, {
        previousStatus: existingReport.status,
        newStatus: status,
        adminNote,
      })
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Failed to update report')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

// DELETE - Delete report (admin only)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    const { id } = await params

    const report = await prisma.report.findUnique({
      where: { id },
    })

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    await prisma.report.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete report')
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
