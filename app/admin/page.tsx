'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, ArrowRightLeft, Flag, Gem, UserX, Snowflake, Clock } from 'lucide-react'
import { StatCard } from '@/components/admin'
import { formatNumber } from '@/lib/utils'

interface Stats {
  users: {
    total: number
    new7d: number
    new30d: number
    banned: number
    frozen: number
  }
  trades: {
    total: number
    active: number
  }
  reports: {
    total: number
    pending: number
  }
  gems: {
    total: number
    average: number
  }
  recentAuditLogs: Array<{
    id: string
    action: string
    targetType: string | null
    targetId: string | null
    details: string | null
    createdAt: string
    admin: {
      id: string
      robloxUsername: string
    }
  }>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.stats) {
          setStats(data.stats)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          <div className="h-8 skeleton rounded w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 skeleton rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Failed to load statistics</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold text-white mb-6"
      >
        Dashboard
      </motion.h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={formatNumber(stats.users.total)}
          subValue={`+${stats.users.new7d} this week`}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Active Trades"
          value={formatNumber(stats.trades.active)}
          subValue={`${formatNumber(stats.trades.total)} total`}
          icon={ArrowRightLeft}
          color="green"
        />
        <StatCard
          label="Pending Reports"
          value={stats.reports.pending}
          subValue={`${stats.reports.total} total`}
          icon={Flag}
          color={stats.reports.pending > 0 ? 'orange' : 'green'}
        />
        <StatCard
          label="Gems in Circulation"
          value={formatNumber(stats.gems.total)}
          subValue={`${stats.gems.average} avg per user`}
          icon={Gem}
          color="purple"
        />
        <StatCard
          label="Banned Users"
          value={stats.users.banned}
          icon={UserX}
          color="red"
        />
        <StatCard
          label="Frozen Users"
          value={stats.users.frozen}
          icon={Snowflake}
          color="blue"
        />
        <StatCard
          label="New Users (30d)"
          value={stats.users.new30d}
          icon={Users}
          color="green"
        />
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-darkbg-700">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            Recent Admin Activity
          </h2>
        </div>
        <div className="divide-y divide-darkbg-700">
          {stats.recentAuditLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">
              No admin activity yet
            </div>
          ) : (
            stats.recentAuditLogs.map((log) => (
              <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">
                    {log.admin.robloxUsername}
                  </span>
                  <span className="text-sm text-gray-400">
                    {log.action.replace(/_/g, ' ')}
                  </span>
                  {log.targetType && (
                    <span className="text-xs text-gray-500">
                      {log.targetType}
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  )
}
