'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Plus, BadgeCheck, Loader2, ArrowRightLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { TradeCard, TradeCardSkeleton, TradeBuilderModal, TradeFilters, defaultFilters } from '@/components/trading'
import type { TradeFiltersState } from '@/components/trading'
import { useAuth } from '@/components/Providers'
import { PageTransition, Select } from '@/components/ui'
import { AdminAbuseCard, LiveEventCard, UpcomingEventCard } from '@/components/AdminAbuseCard'
import { easeOut, staggerContainer } from '@/lib/animations'

const PER_PAGE = 12

// Cache trades by page for instant navigation
const tradesCache: Record<string, { trades: Trade[]; totalPages: number; timestamp: number }> = {}

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

interface Brainrot {
  id: string
  name: string
  localImage: string | null
  baseIncome: string
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
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest')
  const [lastRefresh, setLastRefresh] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [filters, setFilters] = useState<TradeFiltersState>(defaultFilters)
  const [brainrots, setBrainrots] = useState<Brainrot[]>([])

  // Fetch brainrots for filter autocomplete
  useEffect(() => {
    fetch('/api/brainrots/all')
      .then(res => res.json())
      .then(data => setBrainrots(data.brainrots || []))
      .catch(console.error)
  }, [])

  // Check if any advanced filters are active
  const hasAdvancedFilters =
    filters.offerBrainrots.length > 0 ||
    filters.offerIncomeMin || filters.offerIncomeMax ||
    filters.offerValueMin || filters.offerValueMax ||
    filters.offerTradeTypes.length > 0 ||
    filters.requestBrainrots.length > 0 ||
    filters.requestIncomeMin || filters.requestIncomeMax ||
    filters.requestValueMin || filters.requestValueMax ||
    filters.requestTradeTypes.length > 0

  const fetchTrades = useCallback(async (pageNum: number = 1) => {
    const cacheKey = `${tab}-${sort}-${pageNum}-${JSON.stringify(filters)}`

    // Use cache if available
    if (tradesCache[cacheKey]) {
      const cached = tradesCache[cacheKey]
      // Cache valid for 30 seconds
      if (Date.now() - cached.timestamp < 30000) {
        setTrades(cached.trades)
        setTotalPages(cached.totalPages)
        setLoading(false)
        return
      }
    }

    setLoading(true)

    try {
      const params = new URLSearchParams({
        tab,
        sort,
        page: pageNum.toString(),
        perPage: PER_PAGE.toString(),
      })

      // Add advanced filter params
      if (filters.offerBrainrots.length > 0) {
        params.set('offerBrainrots', filters.offerBrainrots.map(b => b.id).join(','))
      }
      if (filters.offerIncomeMin) {
        params.set('offerIncomeMin', filters.offerIncomeMin)
      }
      if (filters.offerIncomeMax) {
        params.set('offerIncomeMax', filters.offerIncomeMax)
      }
      if (filters.offerValueMin) {
        params.set('offerValueMin', filters.offerValueMin)
      }
      if (filters.offerValueMax) {
        params.set('offerValueMax', filters.offerValueMax)
      }
      if (filters.offerTradeTypes.length > 0) {
        params.set('offerTradeTypes', filters.offerTradeTypes.join(','))
      }
      if (filters.requestBrainrots.length > 0) {
        params.set('requestBrainrots', filters.requestBrainrots.map(b => b.id).join(','))
      }
      if (filters.requestIncomeMin) {
        params.set('requestIncomeMin', filters.requestIncomeMin)
      }
      if (filters.requestIncomeMax) {
        params.set('requestIncomeMax', filters.requestIncomeMax)
      }
      if (filters.requestValueMin) {
        params.set('requestValueMin', filters.requestValueMin)
      }
      if (filters.requestValueMax) {
        params.set('requestValueMax', filters.requestValueMax)
      }
      if (filters.requestTradeTypes.length > 0) {
        params.set('requestTradeTypes', filters.requestTradeTypes.join(','))
      }

      const res = await fetch(`/api/trades?${params}`)
      const data = await res.json()

      setTrades(data.trades || [])
      setTotalPages(data.totalPages || 1)

      // Cache the result — evict oldest entry if at capacity
      const cacheKeys = Object.keys(tradesCache)
      if (cacheKeys.length >= 20) {
        const oldest = cacheKeys.reduce((a, b) =>
          tradesCache[a].timestamp < tradesCache[b].timestamp ? a : b
        )
        delete tradesCache[oldest]
      }
      tradesCache[cacheKey] = {
        trades: data.trades || [],
        totalPages: data.totalPages || 1,
        timestamp: Date.now(),
      }
    } catch (err) {
      console.error('Failed to fetch trades:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [tab, sort, filters])

  // Track previous values to detect what changed
  const prevTabRef = useRef(tab)
  const prevSortRef = useRef(sort)
  const prevFiltersRef = useRef(filters)

  // Single useEffect to handle all fetch logic - prevents double fetches
  useEffect(() => {
    const tabChanged = prevTabRef.current !== tab
    const sortChanged = prevSortRef.current !== sort
    const filtersChanged = prevFiltersRef.current !== filters

    // Update refs
    prevTabRef.current = tab
    prevSortRef.current = sort
    prevFiltersRef.current = filters

    // If tab, sort, or filters changed, reset to page 1 and fetch
    if (tabChanged || sortChanged || filtersChanged) {
      if (page !== 1) {
        setPage(1) // This will trigger another render, which will fetch page 1
        return
      }
    }

    // Fetch the current page
    fetchTrades(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tab, sort, filters, refreshTrigger])

  // Force refresh - clears cache and fetches fresh data
  const handleTradeCreated = useCallback(() => {
    // Clear all cache entries
    Object.keys(tradesCache).forEach(key => delete tradesCache[key])
    // Reset to page 1 and trigger refetch
    if (page === 1) {
      // Already on page 1, need to trigger a refetch
      setRefreshTrigger(t => t + 1)
    } else {
      setPage(1)
    }
  }, [page])

  // Manual refresh with rate limit (5 seconds)
  const handleRefresh = useCallback(() => {
    const now = Date.now()
    if (now - lastRefresh < 5000) return // 5 second rate limit

    setLastRefresh(now)
    setRefreshing(true)
    // Clear cache for current view
    Object.keys(tradesCache).forEach(key => delete tradesCache[key])
    // Trigger refetch via state change
    setRefreshTrigger(t => t + 1)
  }, [lastRefresh])

  const canRefresh = Date.now() - lastRefresh >= 5000

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
          className="bg-darkbg-900/90 backdrop-blur-sm rounded-2xl border border-darkbg-700 p-3 md:p-4 mb-6"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
            {/* Tabs - full width on mobile/tablet */}
            <div className="flex gap-1 p-1 bg-darkbg-800 rounded-xl w-full lg:w-auto">
              {allTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`
                    relative flex-1 lg:flex-initial px-3 lg:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap flex items-center justify-center
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
                  <span className="relative z-10 flex items-center gap-1.5 text-sm lg:text-base">
                    {t.icon}
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Sort + Filters + Refresh row */}
            <div className="flex items-center gap-2 w-full lg:w-auto lg:flex-1 justify-between lg:justify-end">
              {/* Sort */}
              <Select
                value={sort}
                onChange={(value) => setSort(value as 'newest' | 'oldest')}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                ]}
              />

              {/* Advanced Filters */}
              <TradeFilters
                filters={filters}
                onFiltersChange={setFilters}
                brainrots={brainrots}
              />

              {/* Refresh Button */}
              <motion.button
                whileHover={canRefresh ? { scale: 1.05 } : {}}
                whileTap={canRefresh ? { scale: 0.95 } : {}}
                onClick={handleRefresh}
                disabled={!canRefresh || refreshing}
                className={`
                  p-2.5 rounded-xl transition-colors
                  ${canRefresh && !refreshing
                    ? 'bg-darkbg-800 hover:bg-darkbg-700 text-gray-400 hover:text-white'
                    : 'bg-darkbg-800 text-gray-600 cursor-not-allowed'
                  }
                `}
                title={canRefresh ? 'Refresh trades' : 'Wait 5 seconds'}
              >
                <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </motion.button>
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
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-4"
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
                <ArrowRightLeft className="w-8 h-8 text-gray-400" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:gap-4">
                {trades.map((trade, index) => (
                  <TradeCard key={trade.id} trade={trade} index={index} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mt-6 flex items-center justify-center gap-2"
                >
                  {/* Previous button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages: (number | 'ellipsis')[] = []
                      const maxVisible = 5

                      if (totalPages <= maxVisible + 2) {
                        // Show all pages
                        for (let i = 1; i <= totalPages; i++) pages.push(i)
                      } else {
                        // Always show first page
                        pages.push(1)

                        // Calculate range around current page
                        let start = Math.max(2, page - 1)
                        let end = Math.min(totalPages - 1, page + 1)

                        // Adjust if at edges
                        if (page <= 3) {
                          end = Math.min(totalPages - 1, 4)
                        } else if (page >= totalPages - 2) {
                          start = Math.max(2, totalPages - 3)
                        }

                        // Add ellipsis if needed
                        if (start > 2) pages.push('ellipsis')

                        // Add middle pages
                        for (let i = start; i <= end; i++) pages.push(i)

                        // Add ellipsis if needed
                        if (end < totalPages - 1) pages.push('ellipsis')

                        // Always show last page
                        pages.push(totalPages)
                      }

                      return pages.map((p, i) =>
                        p === 'ellipsis' ? (
                          <span key={`ellipsis-${i}`} className="px-2 text-gray-500">...</span>
                        ) : (
                          <motion.button
                            key={p}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setPage(p)}
                            className={`min-w-[36px] h-9 px-3 rounded-lg font-medium transition-colors ${
                              page === p
                                ? 'bg-green-600 text-white'
                                : 'bg-darkbg-800 hover:bg-darkbg-700 text-gray-300'
                            }`}
                          >
                            {p}
                          </motion.button>
                        )
                      )
                    })()}
                  </div>

                  {/* Next button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
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
            onSuccess={handleTradeCreated}
          />
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
