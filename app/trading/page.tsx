'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, BadgeCheck, Loader2 } from 'lucide-react'
import { TradeCard, TradeCardSkeleton, TradeBuilderModal } from '@/components/trading'
import { useAuth } from '@/components/Providers'
import { PageTransition, Select } from '@/components/ui'
import { AdminAbuseCard, LiveEventCard, UpcomingEventCard } from '@/components/AdminAbuseCard'
import { easeOut, staggerContainer } from '@/lib/animations'

const INITIAL_LIMIT = 12

// Cache trades by tab for instant navigation
const tradesCache: Record<string, { trades: Trade[]; hasMore: boolean; timestamp: number }> = {}

interface Trade {
  id: string
  status: string
  isVerified: boolean
  createdAt: string
  user: {
    id: string
    robloxUsername: string
    robloxUserId: string
  }
  items: Array<{
    id: string
    side: 'OFFER' | 'REQUEST'
    brainrot: {
      id: string
      name: string
      localImage: string | null
      baseIncome: string
    }
    mutation?: {
      id: string
      name: string
      multiplier: number
    } | null
    event?: {
      id: string
      name: string
    } | null
    traits?: Array<{
      trait: {
        id: string
        name: string
        localImage: string | null
        multiplier: number
      }
    }>
    calculatedIncome?: string | null
  }>
  _count?: {
    counterOffers: number
  }
}

type Tab = 'all' | 'verified' | 'mine'

const tabs: { id: Tab; label: string; icon?: React.ReactNode }[] = [
  { id: 'all', label: 'All Trades' },
  { id: 'verified', label: 'Verified', icon: <BadgeCheck className="w-4 h-4" /> },
]

export default function TradingPage() {
  const { user } = useAuth()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [showBuilder, setShowBuilder] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchTrades = useCallback(async (reset = false) => {
    const cacheKey = `${tab}-${sort}`

    // Use cache for initial load (no search)
    if (reset && !search && tradesCache[cacheKey]) {
      const cached = tradesCache[cacheKey]
      // Cache valid for 30 seconds
      if (Date.now() - cached.timestamp < 30000) {
        setTrades(cached.trades)
        setHasMore(cached.hasMore)
        setLoading(false)
        return
      }
    }

    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams({
        tab,
        search,
        sort,
        limit: reset ? INITIAL_LIMIT.toString() : '12',
        offset: reset ? '0' : trades.length.toString(),
      })

      const res = await fetch(`/api/trades?${params}`)
      const data = await res.json()

      if (reset) {
        setTrades(data.trades || [])
        // Cache if no search filter
        if (!search) {
          tradesCache[cacheKey] = {
            trades: data.trades || [],
            hasMore: data.hasMore || false,
            timestamp: Date.now(),
          }
        }
      } else {
        setTrades((prev) => [...prev, ...(data.trades || [])])
      }
      setHasMore(data.hasMore || false)
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [tab, search, sort, trades.length])

  useEffect(() => {
    fetchTrades(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sort])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTrades(true)
  }

  const allTabs = user ? [...tabs, { id: 'mine' as Tab, label: 'My Trades' }] : tabs

  return (
    <PageTransition className="min-h-[calc(100vh-64px)] bg-darkbg-950">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: easeOut }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div className="flex-1">
            {/* Title row - narrow mobile: with live event */}
            <div className="flex items-center justify-between sm:block">
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Trading Hub
              </h1>
              <div className="sm:hidden">
                <LiveEventCard />
              </div>
            </div>
            <p className="text-gray-400 mt-1">
              Browse and post Brainrot trades
            </p>
            {/* Narrow mobile: upcoming event below description */}
            <div className="sm:hidden mt-2">
              <UpcomingEventCard />
            </div>
          </div>
          {/* sm+: both events + button together */}
          <div className="hidden sm:flex items-center gap-3">
            <AdminAbuseCard />
            {user && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowBuilder(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/25"
              >
                <Plus className="w-5 h-5" />
                New Trade
              </motion.button>
            )}
          </div>
          {/* Narrow mobile: New Trade button */}
          {user && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowBuilder(true)}
              className="sm:hidden inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/25"
            >
              <Plus className="w-5 h-5" />
              New Trade
            </motion.button>
          )}
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05, ease: easeOut }}
          className="bg-darkbg-900 rounded-2xl border border-darkbg-700 p-3 md:p-4 mb-6"
        >
          <div className="flex flex-col gap-3 md:flex-row md:gap-4">
            {/* Tabs - scrollable on mobile */}
            <div className="flex gap-1.5 md:gap-2 p-1 bg-darkbg-800 rounded-xl overflow-x-auto scrollbar-hide">
              {allTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`
                    relative px-3 md:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex-shrink-0 flex items-center justify-center
                    ${tab === t.id
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white'
                    }
                  `}
                >
                  {tab === t.id && (
                    <motion.div
                      layoutId="trading-tab"
                      className="absolute inset-0 bg-green-600 rounded-lg"
                      transition={{ duration: 0.2, ease: easeOut }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5 text-sm md:text-base">
                    {t.icon}
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + Sort row on mobile */}
            <div className="flex gap-2 md:contents">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 md:flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 md:w-5 h-4 md:h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2.5 bg-darkbg-800 rounded-xl border-2 border-transparent focus:border-green-500 focus:ring-0 focus:outline-none text-white placeholder-gray-500 transition-colors text-sm md:text-base"
                  />
                </div>
              </form>

              {/* Sort */}
              <Select
                value={sort}
                onChange={(value) => setSort(value as 'newest' | 'oldest')}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                ]}
              />
            </div>
          </div>
        </motion.div>

        {/* Trades Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-2 gap-4"
            >
              {[...Array(4)].map((_, i) => (
                <TradeCardSkeleton key={i} index={i} />
              ))}
            </motion.div>
          ) : trades.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: easeOut }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-20 h-20 mx-auto mb-4 bg-darkbg-800 rounded-2xl flex items-center justify-center"
              >
                <Search className="w-8 h-8 text-gray-400" />
              </motion.div>
              <p className="text-gray-400 mb-4">No trades found</p>
              {user && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBuilder(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/25"
                >
                  <Plus className="w-5 h-5" />
                  Create First Trade
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="trades"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <div className="grid md:grid-cols-2 gap-4">
                {trades.map((trade, index) => (
                  <TradeCard key={trade.id} trade={trade} index={index} />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 text-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fetchTrades(false)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 font-medium rounded-xl transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Load More'
                    )}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Trade Builder Modal */}
      <AnimatePresence>
        {showBuilder && (
          <TradeBuilderModal
            onClose={() => setShowBuilder(false)}
            onSuccess={() => fetchTrades(true)}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
