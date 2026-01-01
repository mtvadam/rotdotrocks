'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ScrollText, User, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { RobloxAvatar, Select } from '@/components/ui'

interface AuditLog {
  id: string
  action: string
  targetType: string | null
  targetId: string | null
  details: string | null
  createdAt: string
  admin: {
    id: string
    robloxUsername: string
    robloxAvatarUrl: string | null
  }
}

const ACTION_COLORS: Record<string, string> = {
  USER_BANNED: 'bg-red-500/20 text-red-400',
  USER_UNBANNED: 'bg-green-500/20 text-green-400',
  USER_FROZEN: 'bg-blue-500/20 text-blue-400',
  USER_UNFROZEN: 'bg-green-500/20 text-green-400',
  GEMS_ADJUSTED: 'bg-purple-500/20 text-purple-400',
  ROLE_CHANGED: 'bg-orange-500/20 text-orange-400',
  REPORT_RESOLVED: 'bg-green-500/20 text-green-400',
  REPORT_DISMISSED: 'bg-gray-500/20 text-gray-400',
  REPORT_IN_REVIEW: 'bg-blue-500/20 text-blue-400',
  TRADE_VERIFIED: 'bg-green-500/20 text-green-400',
  TRADE_UNVERIFIED: 'bg-orange-500/20 text-orange-400',
  IP_BANNED: 'bg-red-500/20 text-red-400',
  IP_UNBANNED: 'bg-green-500/20 text-green-400',
  RATE_LIMITS_UPDATED: 'bg-orange-500/20 text-orange-400',
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<string>('')
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

  const fetchLogs = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (actionFilter) params.set('action', actionFilter)

    const res = await fetch(`/api/admin/audit-logs?${params}`)
    const data = await res.json()
    if (data.logs) {
      setLogs(data.logs)
      setTotal(data.total)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [actionFilter])

  const uniqueActions = [...new Set(logs.map((l) => l.action))]

  const formatDetails = (details: string | null) => {
    if (!details) return null
    try {
      const parsed = JSON.parse(details)
      return (
        <pre className="text-xs text-gray-400 bg-darkbg-700 rounded-lg p-3 overflow-x-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )
    } catch {
      return <p className="text-xs text-gray-400">{details}</p>
    }
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
            <ScrollText className="w-6 h-6 text-gray-400" />
            Audit Logs
          </h1>
          <p className="text-sm text-gray-500">{total} total entries</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <Select
          value={actionFilter}
          onChange={setActionFilter}
          options={[
            { value: '', label: 'All Actions' },
            ...uniqueActions.map((action) => ({
              value: action,
              label: action.replace(/_/g, ' ')
            }))
          ]}
        />
      </motion.div>

      {/* Logs List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2"
      >
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 skeleton rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <div className="h-4 w-24 skeleton rounded" />
                      <div className="h-4 w-28 skeleton rounded" />
                    </div>
                    <div className="h-3 w-40 skeleton rounded" />
                  </div>
                  <div className="h-3 w-32 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-darkbg-800 rounded-xl p-8 text-center text-gray-500">
            No audit logs found
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLog === log.id
            return (
              <div
                key={log.id}
                className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-darkbg-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <RobloxAvatar
                      avatarUrl={log.admin.robloxAvatarUrl}
                      username={log.admin.robloxUsername}
                      size="sm"
                    />
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">
                          {log.admin.robloxUsername}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            ACTION_COLORS[log.action] || 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {log.targetType && (
                          <span>Target: {log.targetType}</span>
                        )}
                        {log.targetId && (
                          <span className="font-mono">{log.targetId.slice(0, 8)}...</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                    {log.details && (
                      isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-500" />
                      )
                    )}
                  </div>
                </button>

                {isExpanded && log.details && (
                  <div className="px-4 pb-4">
                    {formatDetails(log.details)}
                  </div>
                )}
              </div>
            )
          })
        )}
      </motion.div>
    </div>
  )
}
