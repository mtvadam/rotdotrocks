'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Flag,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  User,
  MessageSquare,
} from 'lucide-react'
import { RobloxAvatar } from '@/components/ui'

interface Report {
  id: string
  type: string
  status: string
  description: string
  expectedValue: string | null
  actualValue: string | null
  adminNote: string | null
  createdAt: string
  resolvedAt: string | null
  reporter: {
    id: string
    robloxUsername: string
    robloxAvatarUrl: string | null
  }
  resolvedBy: {
    id: string
    robloxUsername: string
  } | null
  brainrot: {
    id: string
    name: string
    baseCost: string
    baseIncome: string
    localImage: string | null
  } | null
  trait: {
    id: string
    name: string
    multiplier: number
    localImage: string | null
  } | null
  mutation: {
    id: string
    name: string
    multiplier: number
  } | null
}

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>
}) {
  const { reportId } = use(params)
  const router = useRouter()
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')

  const fetchReport = async () => {
    const res = await fetch(`/api/reports/${reportId}`)
    const data = await res.json()
    if (data.report) {
      setReport(data.report)
      setAdminNote(data.report.adminNote || '')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReport()
  }, [reportId])

  const handleStatusChange = async (status: string) => {
    setActionLoading(status)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      })
      const data = await res.json()
      if (data.report) {
        setReport({ ...report, ...data.report })
      }
    } catch (error) {
      console.error('Action failed:', error)
    }
    setActionLoading(null)
  }

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { icon: typeof CheckCircle; color: string }> = {
      RESOLVED: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400' },
      DISMISSED: { icon: XCircle, color: 'bg-gray-500/20 text-gray-400' },
      IN_REVIEW: { icon: Clock, color: 'bg-blue-500/20 text-blue-400' },
      OPEN: { icon: AlertCircle, color: 'bg-orange-500/20 text-orange-400' },
    }
    const config = configs[status] || configs.OPEN
    const Icon = config.icon
    return (
      <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${config.color}`}>
        <Icon className="w-4 h-4" />
        {status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          <div className="h-8 skeleton rounded w-48" />
          <div className="h-64 skeleton rounded-xl" />
          <div className="h-48 skeleton rounded-xl" />
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Report not found</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Reports
      </motion.button>

      {/* Report Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-6 mb-6"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Flag className="w-6 h-6 text-orange-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                {report.type.replace(/_/g, ' ')} Report
              </h1>
              <p className="text-sm text-gray-500">
                ID: {report.id}
              </p>
            </div>
          </div>
          {getStatusBadge(report.status)}
        </div>

        {/* Reporter */}
        <div className="flex items-center gap-3 p-3 bg-darkbg-700 rounded-lg mb-4">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-400">Reported by</span>
          <RobloxAvatar
            avatarUrl={report.reporter.robloxAvatarUrl}
            username={report.reporter.robloxUsername}
            size="xs"
          />
          <span className="font-medium text-white">{report.reporter.robloxUsername}</span>
          <span className="text-sm text-gray-500 ml-auto">
            {new Date(report.createdAt).toLocaleString()}
          </span>
        </div>

        {/* Description */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Description
          </h3>
          <p className="text-white bg-darkbg-700 rounded-lg p-4">{report.description}</p>
        </div>

        {/* Expected vs Actual */}
        {(report.expectedValue || report.actualValue) && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            {report.expectedValue && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Expected Value</h3>
                <p className="text-green-400 bg-darkbg-700 rounded-lg p-3 font-mono">
                  {report.expectedValue}
                </p>
              </div>
            )}
            {report.actualValue && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Actual Value</h3>
                <p className="text-red-400 bg-darkbg-700 rounded-lg p-3 font-mono">
                  {report.actualValue}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Referenced Items */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {report.brainrot && (
            <div className="bg-darkbg-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Brainrot</h3>
              <div className="flex items-center gap-3">
                {report.brainrot.localImage && (
                  <Image
                    src={report.brainrot.localImage}
                    alt={report.brainrot.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div>
                  <p className="font-medium text-white">{report.brainrot.name}</p>
                  <p className="text-xs text-gray-500">
                    Cost: ${report.brainrot.baseCost} | Income: ${report.brainrot.baseIncome}/s
                  </p>
                </div>
              </div>
            </div>
          )}
          {report.trait && (
            <div className="bg-darkbg-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Trait</h3>
              <div className="flex items-center gap-3">
                {report.trait.localImage && (
                  <Image
                    src={report.trait.localImage}
                    alt={report.trait.name}
                    width={40}
                    height={40}
                    className="rounded"
                  />
                )}
                <div>
                  <p className="font-medium text-white">{report.trait.name}</p>
                  <p className="text-xs text-gray-500">
                    Multiplier: {report.trait.multiplier}x
                  </p>
                </div>
              </div>
            </div>
          )}
          {report.mutation && (
            <div className="bg-darkbg-700 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Mutation</h3>
              <div>
                <p className="font-medium text-white">{report.mutation.name}</p>
                <p className="text-xs text-gray-500">
                  Multiplier: {report.mutation.multiplier}x
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Admin Response */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Admin Response</h2>

        {report.resolvedBy && (
          <div className="flex items-center gap-3 p-3 bg-darkbg-700 rounded-lg mb-4">
            <span className="text-sm text-gray-400">Resolved by</span>
            <span className="font-medium text-white">{report.resolvedBy.robloxUsername}</span>
            {report.resolvedAt && (
              <span className="text-sm text-gray-500 ml-auto">
                {new Date(report.resolvedAt).toLocaleString()}
              </span>
            )}
          </div>
        )}

        <div className="mb-4">
          <label className="text-sm font-medium text-gray-400 mb-2 block">Admin Note</label>
          <textarea
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Add a note about this report..."
            className="w-full px-4 py-3 bg-darkbg-700 border border-darkbg-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
            rows={3}
            disabled={report.status === 'RESOLVED' || report.status === 'DISMISSED'}
          />
        </div>

        {report.status !== 'RESOLVED' && report.status !== 'DISMISSED' && (
          <div className="flex gap-3">
            <button
              onClick={() => handleStatusChange('IN_REVIEW')}
              disabled={actionLoading !== null || report.status === 'IN_REVIEW'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              <Clock className="w-4 h-4" />
              Mark In Review
            </button>
            <button
              onClick={() => handleStatusChange('RESOLVED')}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Resolve
            </button>
            <button
              onClick={() => handleStatusChange('DISMISSED')}
              disabled={actionLoading !== null}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Dismiss
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
