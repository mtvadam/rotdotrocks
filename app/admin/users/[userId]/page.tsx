'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Ban,
  Snowflake,
  Gem,
  Shield,
  User as UserIcon,
  ArrowRightLeft,
  Flag,
  Clock,
} from 'lucide-react'
import { RobloxAvatar, Select } from '@/components/ui'

interface UserDetail {
  id: string
  robloxUsername: string
  robloxUserId: string | null
  robloxAvatarUrl: string | null
  role: 'USER' | 'SELLER' | 'MOD' | 'ADMIN'
  isBanned: boolean
  isFrozen: boolean
  gems: number
  lastIpAddress: string | null
  createdAt: string
  updatedAt: string
  _count: {
    trades: number
    reports: number
    tradeRequests: number
  }
}

interface Trade {
  id: string
  status: string
  isVerified: boolean
  createdAt: string
}

interface Report {
  id: string
  type: string
  status: string
  createdAt: string
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = use(params)
  const router = useRouter()
  const [user, setUser] = useState<UserDetail | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [recentReports, setRecentReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [gemAdjustment, setGemAdjustment] = useState<number>(0)

  const fetchUser = async () => {
    const res = await fetch(`/api/admin/users/${userId}`)
    const data = await res.json()
    if (data.user) {
      setUser(data.user)
      setRecentTrades(data.recentTrades || [])
      setRecentReports(data.recentReports || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUser()
  }, [userId])

  const handleAction = async (action: string, value: unknown) => {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [action]: value }),
      })
      const data = await res.json()
      if (data.user) {
        setUser(data.user)
      }
    } catch (error) {
      console.error('Action failed:', error)
    }
    setActionLoading(null)
  }

  const handleGemAdjustment = async () => {
    if (gemAdjustment === 0) return
    await handleAction('gemsAdjustment', gemAdjustment)
    setGemAdjustment(0)
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="space-y-6">
          <div className="h-8 skeleton rounded w-48" />
          <div className="h-32 skeleton rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 skeleton rounded-xl" />
            <div className="h-24 skeleton rounded-xl" />
            <div className="h-24 skeleton rounded-xl" />
          </div>
          <div className="h-48 skeleton rounded-xl" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-gray-500">User not found</p>
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
        Back to Users
      </motion.button>

      {/* User Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-6 mb-6"
      >
        <div className="flex items-start gap-4">
          <RobloxAvatar
            avatarUrl={user.robloxAvatarUrl}
            username={user.robloxUsername}
            size="lg"
          />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{user.robloxUsername}</h1>
            <div className="flex items-center gap-3 mt-2">
              {user.role === 'ADMIN' && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
              {user.role === 'MOD' && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-sm">
                  <Shield className="w-3 h-3" /> Mod
                </span>
              )}
              {user.role === 'SELLER' && (
                <span className="px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 text-sm">
                  Seller
                </span>
              )}
              {user.isBanned && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm">
                  <Ban className="w-3 h-3" /> Banned
                </span>
              )}
              {user.isFrozen && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 text-sm">
                  <Snowflake className="w-3 h-3" /> Frozen
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
              <span>ID: {user.id}</span>
              {user.robloxUserId && <span>Roblox ID: {user.robloxUserId}</span>}
              {user.lastIpAddress && <span>Last IP: {user.lastIpAddress}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-2xl font-bold text-white">
              <Gem className="w-6 h-6 text-emerald-400" />
              {user.gems}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Joined {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        <div className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <ArrowRightLeft className="w-4 h-4" />
            Trades
          </div>
          <p className="text-2xl font-bold text-white">{user._count.trades}</p>
        </div>
        <div className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <Flag className="w-4 h-4" />
            Reports Filed
          </div>
          <p className="text-2xl font-bold text-white">{user._count.reports}</p>
        </div>
        <div className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-4">
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <UserIcon className="w-4 h-4" />
            Trade Requests
          </div>
          <p className="text-2xl font-bold text-white">{user._count.tradeRequests}</p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-darkbg-800 rounded-xl border border-darkbg-700 p-6 mb-6"
      >
        <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ban/Unban */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Account Status</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleAction('isBanned', !user.isBanned)}
                disabled={actionLoading === 'isBanned'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  user.isBanned
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
                }`}
              >
                <Ban className="w-4 h-4" />
                {user.isBanned ? 'Unban User' : 'Ban User'}
              </button>
              <button
                onClick={() => handleAction('isFrozen', !user.isFrozen)}
                disabled={actionLoading === 'isFrozen'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  user.isFrozen
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Snowflake className="w-4 h-4" />
                {user.isFrozen ? 'Unfreeze' : 'Freeze'}
              </button>
            </div>
          </div>

          {/* Gem Adjustment */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Adjust Gems</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={gemAdjustment}
                onChange={(e) => setGemAdjustment(parseInt(e.target.value) || 0)}
                className="flex-1 px-4 py-2 bg-darkbg-700 border border-darkbg-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                placeholder="Amount (+ or -)"
              />
              <button
                onClick={handleGemAdjustment}
                disabled={gemAdjustment === 0 || actionLoading === 'gemsAdjustment'}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Role Change */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Role</label>
            <Select
              value={user.role}
              onChange={(value) => handleAction('role', value)}
              disabled={actionLoading === 'role'}
              options={[
                { value: 'USER', label: 'User' },
                { value: 'SELLER', label: 'Seller' },
                { value: 'MOD', label: 'Mod' },
                { value: 'ADMIN', label: 'Admin' },
              ]}
            />
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Trades */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-darkbg-700">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-gray-500" />
              Recent Trades
            </h2>
          </div>
          <div className="divide-y divide-darkbg-700">
            {recentTrades.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No trades yet
              </div>
            ) : (
              recentTrades.map((trade) => (
                <div key={trade.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        trade.status === 'OPEN'
                          ? 'bg-green-500/20 text-green-400'
                          : trade.status === 'COMPLETED'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {trade.status}
                    </span>
                    {trade.isVerified && (
                      <span className="text-xs text-green-400">Verified</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(trade.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Recent Reports */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-darkbg-700">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Flag className="w-4 h-4 text-gray-500" />
              Reports Filed
            </h2>
          </div>
          <div className="divide-y divide-darkbg-700">
            {recentReports.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No reports filed
              </div>
            ) : (
              recentReports.map((report) => (
                <div key={report.id} className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">
                      {report.type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        report.status === 'OPEN'
                          ? 'bg-orange-500/20 text-orange-400'
                          : report.status === 'RESOLVED'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {report.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
