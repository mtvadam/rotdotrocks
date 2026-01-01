'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Flag, ChevronRight, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
import { RobloxAvatar, Select } from '@/components/ui'

interface Report {
  id: string
  type: string
  status: string
  description: string
  expectedValue: string | null
  actualValue: string | null
  createdAt: string
  reporter: {
    id: string
    robloxUsername: string
    robloxAvatarUrl: string | null
  }
  brainrot: {
    id: string
    name: string
  } | null
  trait: {
    id: string
    name: string
    multiplier: number
  } | null
  mutation: {
    id: string
    name: string
    multiplier: number
  } | null
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('OPEN')
  const [typeFilter, setTypeFilter] = useState<string>('')

  const fetchReports = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)

    const res = await fetch(`/api/reports?${params}`)
    const data = await res.json()
    if (data.reports) {
      setReports(data.reports)
      setTotal(data.total)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchReports()
  }, [statusFilter, typeFilter])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'DISMISSED':
        return <XCircle className="w-4 h-4 text-gray-400" />
      case 'IN_REVIEW':
        return <Clock className="w-4 h-4 text-blue-400" />
      default:
        return <AlertCircle className="w-4 h-4 text-orange-400" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-orange-500/20 text-orange-400',
      IN_REVIEW: 'bg-blue-500/20 text-blue-400',
      RESOLVED: 'bg-green-500/20 text-green-400',
      DISMISSED: 'bg-gray-500/20 text-gray-400',
    }
    return (
      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${colors[status] || colors.OPEN}`}>
        {getStatusIcon(status)}
        {status}
      </span>
    )
  }

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      BRAINROT_VALUE: 'bg-purple-500/20 text-purple-400',
      TRAIT_MULTIPLIER: 'bg-blue-500/20 text-blue-400',
      MUTATION_MULTIPLIER: 'bg-green-500/20 text-green-400',
      CALCULATION_FORMULA: 'bg-orange-500/20 text-orange-400',
      OTHER: 'bg-gray-500/20 text-gray-400',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs ${colors[type] || colors.OTHER}`}>
        {type.replace(/_/g, ' ')}
      </span>
    )
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Flag className="w-6 h-6 text-orange-400" />
            Reports
          </h1>
          <p className="text-sm text-gray-500">{total} total reports</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap gap-4 mb-6"
      >
        <Select
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '', label: 'All Status' },
            { value: 'OPEN', label: 'Open' },
            { value: 'IN_REVIEW', label: 'In Review' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'DISMISSED', label: 'Dismissed' },
          ]}
        />

        <Select
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: '', label: 'All Types' },
            { value: 'BRAINROT_VALUE', label: 'Brainrot Value' },
            { value: 'TRAIT_MULTIPLIER', label: 'Trait Multiplier' },
            { value: 'MUTATION_MULTIPLIER', label: 'Mutation Multiplier' },
            { value: 'CALCULATION_FORMULA', label: 'Calculation Formula' },
            { value: 'OTHER', label: 'Other' },
          ]}
        />
      </motion.div>

      {/* Reports List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 skeleton rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-4 w-24 skeleton rounded" />
                      <div className="h-4 w-20 skeleton rounded" />
                      <div className="h-4 w-16 skeleton rounded" />
                    </div>
                    <div className="h-3 w-3/4 skeleton rounded" />
                    <div className="h-3 w-1/2 skeleton rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-darkbg-800 rounded-xl p-8 text-center text-gray-500">
            No reports found
          </div>
        ) : (
          reports.map((report) => (
            <Link
              key={report.id}
              href={`/admin/reports/${report.id}`}
              className="block bg-darkbg-800 rounded-xl border border-darkbg-700 p-4 hover:border-darkbg-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <RobloxAvatar
                    avatarUrl={report.reporter.robloxAvatarUrl}
                    username={report.reporter.robloxUsername}
                    size="sm"
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-white">
                        {report.reporter.robloxUsername}
                      </span>
                      {getTypeBadge(report.type)}
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-gray-400 line-clamp-2">{report.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {report.brainrot && (
                        <span>Brainrot: {report.brainrot.name}</span>
                      )}
                      {report.trait && (
                        <span>Trait: {report.trait.name} ({report.trait.multiplier}x)</span>
                      )}
                      {report.mutation && (
                        <span>Mutation: {report.mutation.name} ({report.mutation.multiplier}x)</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            </Link>
          ))
        )}
      </motion.div>
    </div>
  )
}
