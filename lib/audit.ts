import { prisma } from './db'

export const AuditActions = {
  USER_BANNED: 'USER_BANNED',
  USER_UNBANNED: 'USER_UNBANNED',
  USER_FROZEN: 'USER_FROZEN',
  USER_UNFROZEN: 'USER_UNFROZEN',
  GEMS_ADJUSTED: 'GEMS_ADJUSTED',
  ROLE_CHANGED: 'ROLE_CHANGED',
  REPORT_RESOLVED: 'REPORT_RESOLVED',
  REPORT_DISMISSED: 'REPORT_DISMISSED',
  REPORT_IN_REVIEW: 'REPORT_IN_REVIEW',
  TRADE_VERIFIED: 'TRADE_VERIFIED',
  TRADE_UNVERIFIED: 'TRADE_UNVERIFIED',
  IP_BANNED: 'IP_BANNED',
  IP_UNBANNED: 'IP_UNBANNED',
  RATE_LIMITS_UPDATED: 'RATE_LIMITS_UPDATED',
} as const

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions]

export async function createAuditLog(
  adminId: string,
  action: AuditAction,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  return prisma.auditLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      details: details ? JSON.stringify(details) : null,
    },
  })
}
