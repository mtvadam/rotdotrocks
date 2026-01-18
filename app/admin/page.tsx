'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users,
  Wallet,
  Gamepad2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  MoreHorizontal,
} from 'lucide-react'
import { Card, StatCard } from '@/components/ui/Card'
import { Badge, MultiplierBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatCurrency } from '@/lib/utils'

interface DashboardStats {
  revenue: {
    today: number
    change: number
  }
  users: {
    total: number
    active: number
    new24h: number
  }
  bets: {
    total: number
    today: number
  }
  payouts: {
    today: number
    pending: number
  }
}

interface RecentBet {
  id: string
  user: string
  game: string
  amount: number
  multiplier: number
  profit: number
  timestamp: Date
}

interface RecentUser {
  id: string
  username: string
  avatar?: string
  wagered: number
  vipTier: string
  joinedAt: Date
}

// Mock data
const mockStats: DashboardStats = {
  revenue: {
    today: 12450.50,
    change: 8.5,
  },
  users: {
    total: 15420,
    active: 1234,
    new24h: 89,
  },
  bets: {
    total: 2500000,
    today: 15678,
  },
  payouts: {
    today: 8234.20,
    pending: 12,
  },
}

const mockRecentBets: RecentBet[] = [
  { id: '1', user: 'HighRoller', game: 'Crash', amount: 500, multiplier: 3.42, profit: 1210, timestamp: new Date(Date.now() - 60000) },
  { id: '2', user: 'CryptoKing', game: 'Dice', amount: 100, multiplier: 0, profit: -100, timestamp: new Date(Date.now() - 120000) },
  { id: '3', user: 'LuckyDice', game: 'Mines', amount: 50, multiplier: 2.5, profit: 75, timestamp: new Date(Date.now() - 180000) },
  { id: '4', user: 'WhaleAlert', game: 'Plinko', amount: 1000, multiplier: 0.5, profit: -500, timestamp: new Date(Date.now() - 240000) },
  { id: '5', user: 'BetMaster', game: 'Limbo', amount: 200, multiplier: 5.0, profit: 800, timestamp: new Date(Date.now() - 300000) },
]

const mockRecentUsers: RecentUser[] = [
  { id: '1', username: 'NewPlayer123', wagered: 0, vipTier: 'bronze', joinedAt: new Date(Date.now() - 3600000) },
  { id: '2', username: 'CryptoNewbie', wagered: 150, vipTier: 'bronze', joinedAt: new Date(Date.now() - 7200000) },
  { id: '3', username: 'GamingPro', wagered: 1200, vipTier: 'silver', joinedAt: new Date(Date.now() - 14400000) },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setStats(mockStats)
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-bg-tertiary rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-bg-tertiary rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-text-secondary">Failed to load statistics</div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary">Welcome back, Admin</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">Export</Button>
          <Button size="sm">View Reports</Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Revenue"
          value={`$${formatCurrency(stats.revenue.today, 'USD')}`}
          change={stats.revenue.change}
          icon={<DollarSign className="w-5 h-5" />}
        />
        <StatCard
          label="Active Users"
          value={stats.users.active.toLocaleString()}
          changeLabel={`${stats.users.new24h} new today`}
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          label="Total Bets Today"
          value={stats.bets.today.toLocaleString()}
          changeLabel={`${(stats.bets.total / 1000000).toFixed(1)}M total`}
          icon={<Gamepad2 className="w-5 h-5" />}
        />
        <StatCard
          label="Payouts Today"
          value={`$${formatCurrency(stats.payouts.today, 'USD')}`}
          changeLabel={`${stats.payouts.pending} pending`}
          icon={<Wallet className="w-5 h-5" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-text-primary">Revenue Overview</h3>
            <select className="text-sm bg-bg-tertiary border border-border-default rounded-lg px-3 py-1.5 text-text-secondary">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-64 flex items-center justify-center bg-bg-tertiary/50 rounded-lg">
            <div className="text-center">
              <Activity className="w-12 h-12 text-text-tertiary mx-auto mb-2" />
              <p className="text-text-tertiary">Revenue chart will appear here</p>
            </div>
          </div>
        </Card>

        {/* Game Distribution */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-text-primary">Bets by Game</h3>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'Crash', bets: 5420, percentage: 35, color: 'bg-neon-cyan' },
              { name: 'Dice', bets: 4200, percentage: 27, color: 'bg-neon-pink' },
              { name: 'Mines', bets: 2890, percentage: 19, color: 'bg-neon-green' },
              { name: 'Plinko', bets: 1800, percentage: 12, color: 'bg-neon-yellow' },
              { name: 'Limbo', bets: 1368, percentage: 7, color: 'bg-neon-purple' },
            ].map((game) => (
              <div key={game.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-secondary">{game.name}</span>
                  <span className="text-sm font-medium text-text-primary">
                    {game.bets.toLocaleString()} ({game.percentage}%)
                  </span>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${game.percentage}%` }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className={cn('h-full rounded-full', game.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bets */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-5 h-5 text-text-tertiary" />
              Recent Bets
            </h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            {mockRecentBets.map((bet) => (
              <div
                key={bet.id}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={bet.user} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{bet.user}</p>
                    <p className="text-xs text-text-tertiary">{bet.game}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono text-text-secondary">
                    ${formatCurrency(bet.amount, 'USD')}
                  </p>
                  <p className={cn(
                    'text-xs font-mono font-medium',
                    bet.profit >= 0 ? 'text-neon-green' : 'text-status-error'
                  )}>
                    {bet.profit >= 0 ? '+' : ''}{formatCurrency(bet.profit, 'USD')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Users */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-text-primary flex items-center gap-2">
              <Users className="w-5 h-5 text-text-tertiary" />
              New Users
            </h3>
            <Button variant="ghost" size="sm">View All</Button>
          </div>
          <div className="space-y-3">
            {mockRecentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg bg-bg-tertiary/50"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={user.username} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{user.username}</p>
                    <p className="text-xs text-text-tertiary">
                      {user.joinedAt.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="default" size="sm" className="capitalize">
                    {user.vipTier}
                  </Badge>
                  <p className="text-xs text-text-tertiary mt-1">
                    ${formatCurrency(user.wagered, 'USD')} wagered
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <h3 className="font-heading font-semibold text-text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending Withdrawals', value: '12', action: 'Review', href: '/admin/transactions' },
            { label: 'User Reports', value: '3', action: 'View', href: '/admin/reports' },
            { label: 'Failed Deposits', value: '0', action: 'Check', href: '/admin/transactions' },
            { label: 'System Alerts', value: '1', action: 'Resolve', href: '/admin/security' },
          ].map((item) => (
            <div
              key={item.label}
              className="p-4 rounded-lg bg-bg-tertiary/50 flex flex-col"
            >
              <p className="text-sm text-text-tertiary">{item.label}</p>
              <p className="text-2xl font-bold text-text-primary my-2">{item.value}</p>
              <Button variant="outline" size="sm" className="mt-auto">
                {item.action}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
