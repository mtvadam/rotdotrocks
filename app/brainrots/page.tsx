'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, TrendingUp, DollarSign, Sparkles, ChevronLeft, ChevronRight, ArrowUpDown, X, Gem, SlidersHorizontal, Grid3X3, LayoutGrid } from 'lucide-react'
import { brainrotCache as cache, refreshBrainrotCache } from '@/lib/prefetch'
import { DemandTrendBadge, type DemandLevel, type TrendDirection } from '@/components/trading/DemandTrendBadge'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts'

interface Brainrot {
  id: string
  name: string
  localImage: string | null
  imageUrl: string
  baseCost: string
  baseIncome: string
  rarity: string | null
  robuxValue: number | null
  demand?: DemandLevel | null
  trend?: TrendDirection | null
}

// Custom tooltip for the price chart
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: { min: number; max: number; listings: number } }>; label?: string }) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  const dateStr = label ? new Date(label + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''
  return (
    <div className="bg-darkbg-900/95 backdrop-blur-sm border border-darkbg-600 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-400 mb-1">{dateStr}</p>
      <p className="text-yellow-400 font-bold">R${d.value.toLocaleString()}</p>
      {d.payload.min !== d.payload.max && (
        <p className="text-gray-500 mt-0.5">Range: R${d.payload.min.toLocaleString()} – R${d.payload.max.toLocaleString()}</p>
      )}
      <p className="text-gray-500">{d.payload.listings} listing{d.payload.listings !== 1 ? 's' : ''}</p>
    </div>
  )
}

// Interactive price chart for the brainrot modal
function PriceHistoryChart({ brainrotId, glowRgb }: { brainrotId: string; glowRgb: string }) {
  const [data, setData] = useState<{ date: string; value: number; min: number; max: number; listings: number }[] | null>(null)
  const [demandInfo, setDemandInfo] = useState<{ demand: DemandLevel; trend: TrendDirection } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/brainrots/${brainrotId}/price-history`)
      .then(r => r.json())
      .then(d => {
        setData(d.history || [])
        if (d.demand && d.trend) setDemandInfo({ demand: d.demand, trend: d.trend })
      })
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [brainrotId])

  if (loading) {
    return (
      <div className="mt-4 rounded-xl border border-white/5 px-4 py-6" style={{ background: `rgba(${glowRgb},0.05)` }}>
        <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
          <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
          Loading price history...
        </div>
      </div>
    )
  }

  if (!data || data.length < 2) {
    return (
      <div className="mt-4 rounded-xl border border-white/5 px-4 py-4" style={{ background: `rgba(${glowRgb},0.05)` }}>
        {demandInfo && (
          <div className="flex items-center justify-center mb-2">
            <DemandTrendBadge demand={demandInfo.demand} trend={demandInfo.trend} size="sm" variant="badge" />
          </div>
        )}
        <p className="text-gray-500 text-xs text-center">Not enough price data yet</p>
      </div>
    )
  }

  const firstVal = data[0].value
  const lastVal = data[data.length - 1].value
  const change = lastVal - firstVal
  const changePct = firstVal > 0 ? ((change / firstVal) * 100).toFixed(1) : '0'
  const isUp = change > 0
  const isFlat = change === 0
  const lineColor = isUp ? '#22c55e' : isFlat ? '#6b7280' : '#ef4444'

  return (
    <div className="mt-4 rounded-xl border border-white/5 px-3 py-3" style={{ background: `rgba(${glowRgb},0.05)` }}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-gray-500 text-[10px] uppercase tracking-wider">30d Price</span>
        <div className="flex items-center gap-2">
          {demandInfo && (
            <DemandTrendBadge demand={demandInfo.demand} trend={demandInfo.trend} size="xs" variant="badge" />
          )}
          <span className={`text-xs font-bold ${isUp ? 'text-green-400' : isFlat ? 'text-gray-400' : 'text-red-400'}`}>
            {isUp ? '+' : ''}{changePct}%
          </span>
        </div>
      </div>

      {/* Interactive chart */}
      <ResponsiveContainer width="100%" height={100}>
        <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={`areaGrad-${brainrotId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: '#6b7280' }}
            tickFormatter={(d: string) => d.slice(5)}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#areaGrad-${brainrotId})`}
            dot={false}
            activeDot={{ r: 4, fill: lineColor, stroke: '#0a0a0a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Current value */}
      <div className="flex justify-between items-center mt-1 px-1">
        <span className="text-[10px] text-gray-600">{data.length} days</span>
        <span className="text-xs font-bold text-yellow-400">R${lastVal.toLocaleString()}</span>
      </div>
    </div>
  )
}

function formatNumber(numStr: string): string {
  const num = BigInt(numStr)
  if (num >= BigInt(1_000_000_000_000)) return (Number(num) / 1_000_000_000_000).toFixed(1) + 'T'
  if (num >= BigInt(1_000_000_000)) return (Number(num) / 1_000_000_000).toFixed(1) + 'B'
  if (num >= BigInt(1_000_000)) return (Number(num) / 1_000_000).toFixed(1) + 'M'
  if (num >= BigInt(1_000)) return (Number(num) / 1_000).toFixed(1) + 'K'
  return numStr
}

const RARITY_COLOR_MAP: Record<string, string> = {
  common: 'rarity-common',
  rare: 'rarity-rare',
  epic: 'rarity-epic',
  legendary: 'rarity-legendary',
  mythic: 'rarity-mythic',
  'brainrot god': 'rarity-god animation-always-running',
  god: 'rarity-god animation-always-running',
  secret: 'rarity-secret animation-always-running',
  festive: 'rarity-festive animation-always-running',
  og: 'rarity-og animation-always-running',
  admin: 'rarity-admin animation-always-running',
}

const RARITY_BORDER_MAP: Record<string, { border: string; animated?: string; glow?: string }> = {
  common: { border: 'border-green-700/40', glow: 'hover:shadow-[0_0_25px_rgba(0,128,0,0.35)]' },
  rare: { border: 'border-cyan-500/40', glow: 'hover:shadow-[0_0_25px_rgba(0,255,255,0.35)]' },
  epic: { border: 'border-purple-600/40', glow: 'hover:shadow-[0_0_25px_rgba(128,0,128,0.35)]' },
  legendary: { border: 'border-yellow-500/40', glow: 'hover:shadow-[0_0_25px_rgba(255,255,0,0.35)]' },
  mythic: { border: 'border-red-500/40', glow: 'hover:shadow-[0_0_25px_rgba(255,0,0,0.35)]' },
  'brainrot god': { border: 'border-pink-500/40', animated: 'card-border-animated card-border-god', glow: 'shadow-[0_0_20px_rgba(255,0,128,0.25)]' },
  god: { border: 'border-pink-500/40', animated: 'card-border-animated card-border-god', glow: 'shadow-[0_0_20px_rgba(255,0,128,0.25)]' },
  secret: { border: 'border-gray-400/40', animated: 'card-border-animated card-border-secret', glow: 'shadow-[0_0_20px_rgba(255,255,255,0.15)]' },
  festive: { border: 'border-red-500/40', animated: 'card-border-animated card-border-festive', glow: 'shadow-[0_0_20px_rgba(255,0,0,0.25)]' },
  og: { border: 'border-yellow-500/40', animated: 'card-border-animated card-border-og', glow: 'shadow-[0_0_20px_rgba(255,255,0,0.25)]' },
  admin: { border: 'border-amber-500/40', animated: 'card-border-animated card-border-admin', glow: 'shadow-[0_0_20px_rgba(255,165,0,0.25)]' },
}

const RARITY_PILL_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  common: { bg: 'bg-green-500/5', text: 'text-green-400', border: 'border-green-500/20', activeBg: 'bg-green-500/20' },
  rare: { bg: 'bg-cyan-500/5', text: 'text-cyan-400', border: 'border-cyan-500/20', activeBg: 'bg-cyan-500/20' },
  epic: { bg: 'bg-purple-500/5', text: 'text-purple-400', border: 'border-purple-500/20', activeBg: 'bg-purple-500/20' },
  legendary: { bg: 'bg-yellow-500/5', text: 'text-yellow-400', border: 'border-yellow-500/20', activeBg: 'bg-yellow-500/20' },
  mythic: { bg: 'bg-red-500/5', text: 'text-red-400', border: 'border-red-500/20', activeBg: 'bg-red-500/20' },
  'brainrot god': { bg: 'bg-pink-500/5', text: 'text-pink-400', border: 'border-pink-500/20', activeBg: 'bg-pink-500/20' },
  god: { bg: 'bg-pink-500/5', text: 'text-pink-400', border: 'border-pink-500/20', activeBg: 'bg-pink-500/20' },
  secret: { bg: 'bg-gray-400/5', text: 'text-gray-300', border: 'border-gray-400/20', activeBg: 'bg-gray-400/20' },
  festive: { bg: 'bg-red-500/5', text: 'text-red-400', border: 'border-red-500/20', activeBg: 'bg-red-500/20' },
  og: { bg: 'bg-yellow-500/5', text: 'text-yellow-400', border: 'border-yellow-500/20', activeBg: 'bg-yellow-500/20' },
  admin: { bg: 'bg-amber-500/5', text: 'text-amber-400', border: 'border-amber-500/20', activeBg: 'bg-amber-500/20' },
}

const RARITY_GLOW_RGB: Record<string, string> = {
  common: '0,128,0',
  rare: '0,255,255',
  epic: '128,0,128',
  legendary: '255,255,0',
  mythic: '255,0,0',
  'brainrot god': '255,0,128',
  god: '255,0,128',
  secret: '255,255,255',
  festive: '255,0,0',
  og: '255,255,0',
  admin: '255,165,0',
}

const RARITY_TIER_MAP: Record<string, number> = {
  common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5,
  secret: 6, festive: 6, og: 6, 'brainrot god': 7, god: 7, admin: 8,
}

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic', 'brainrot god', 'secret', 'og', 'admin']

// Unknown/event rarities (valentines, spooky, taco, etc.) get admin-style treatment
const DEFAULT_BORDER = { border: 'border-amber-500/40', animated: 'card-border-animated card-border-admin', glow: 'shadow-[0_0_20px_rgba(255,165,0,0.25)]' }

function getRarityColor(rarity: string | null): string {
  if (!rarity) return 'text-gray-400'
  return RARITY_COLOR_MAP[rarity.toLowerCase()] || 'rarity-admin animation-always-running'
}

function getRarityBorder(rarity: string | null): { border: string; animated?: string; glow?: string } {
  if (!rarity) return DEFAULT_BORDER
  return RARITY_BORDER_MAP[rarity.toLowerCase()] || DEFAULT_BORDER
}

function getRarityTier(rarity: string | null): number {
  if (!rarity) return 0
  return RARITY_TIER_MAP[rarity.toLowerCase()] || 6
}

function getGlowRgb(rarity: string | null): string {
  if (!rarity) return '255,165,0'
  return RARITY_GLOW_RGB[rarity.toLowerCase()] || '255,165,0'
}

// Display names for rarities that need special casing
const RARITY_DISPLAY_NAMES: Record<string, string> = { og: 'OG' }
function formatRarityName(rarity: string): string {
  return RARITY_DISPLAY_NAMES[rarity.toLowerCase()] || rarity
}

type SortKey = 'income' | 'cost' | 'value' | 'name'

const SORT_OPTIONS: { key: SortKey; label: string; icon: React.ReactNode }[] = [
  { key: 'income', label: 'Income', icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { key: 'value', label: 'Value', icon: <Gem className="w-3.5 h-3.5" /> },
  { key: 'cost', label: 'Cost', icon: <DollarSign className="w-3.5 h-3.5" /> },
  { key: 'name', label: 'A-Z', icon: <ArrowUpDown className="w-3.5 h-3.5" /> },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.03, delayChildren: 0.1 },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
}

export default function BrainrotsPage() {
  const [brainrots, setBrainrots] = useState<Brainrot[]>(cache.brainrots)
  const [loading, setLoading] = useState(!cache.loaded)
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortKey>('income')
  const [scrolled, setScrolled] = useState(false)
  const [selectedBrainrot, setSelectedBrainrot] = useState<Brainrot | null>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedBrainrot) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [selectedBrainrot])

  const [page, setPage] = useState(1)
  const [compactView, setCompactView] = useState(false)
  const [pillFade, setPillFade] = useState({ left: false, right: false })
  const pillScrollRef = useRef<HTMLDivElement>(null)
  const PER_PAGE = 48

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const updatePillFade = useCallback(() => {
    const el = pillScrollRef.current
    if (!el) return
    setPillFade({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    })
  }, [])

  useEffect(() => {
    const el = pillScrollRef.current
    if (!el) return
    // Run immediately + next frame (pills may not be laid out yet)
    updatePillFade()
    requestAnimationFrame(updatePillFade)
    el.addEventListener('scroll', updatePillFade, { passive: true })
    const ro = new ResizeObserver(updatePillFade)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', updatePillFade); ro.disconnect() }
  }, [updatePillFade, brainrots])

  useEffect(() => {
    const CACHE_DURATION = 5 * 60 * 1000
    const isStale = cache.loaded && (Date.now() - cache.lastFetched > CACHE_DURATION)

    if (cache.loaded && !isStale) {
      setBrainrots(cache.brainrots)
      setLoading(false)
      return
    }

    if (isStale) {
      refreshBrainrotCache().then((freshBrainrots) => {
        setBrainrots(freshBrainrots)
        setLoading(false)
      })
    } else {
      fetch('/api/brainrots/all')
        .then(res => res.json())
        .then(data => {
          cache.brainrots = data.brainrots || []
          cache.loaded = true
          cache.lastFetched = Date.now()
          setBrainrots(cache.brainrots)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [])

  // Compute available rarities - unknown/event rarities are grouped under Admin
  const { availableRarities, rarityCounts, unknownRarities } = useMemo(() => {
    const counts: Record<string, number> = {}
    const unknowns: string[] = []
    brainrots.forEach(b => {
      const r = b.rarity?.toLowerCase() || 'unknown'
      counts[r] = (counts[r] || 0) + 1
      if (!RARITY_ORDER.includes(r) && !unknowns.includes(r)) unknowns.push(r)
    })
    // Add unknown rarity counts to admin
    unknowns.forEach(r => {
      counts['admin'] = (counts['admin'] || 0) + (counts[r] || 0)
    })
    const raritySet = new Set(brainrots.map(b => b.rarity?.toLowerCase()).filter(Boolean) as string[])
    const known = RARITY_ORDER.filter(r => raritySet.has(r))
    // Ensure admin pill shows if there are unknown rarities even without native admin brainrots
    if (unknowns.length > 0 && !known.includes('admin')) known.push('admin')
    return { availableRarities: known, rarityCounts: counts, unknownRarities: unknowns }
  }, [brainrots])

  // Filter + sort
  const sorted = useMemo(() => {
    const filtered = brainrots.filter(b => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase())
      const bRarity = b.rarity?.toLowerCase() || ''
      // Admin filter also matches unknown/event rarities
      const matchesRarity = rarityFilter === 'all'
        || bRarity === rarityFilter.toLowerCase()
        || (rarityFilter === 'admin' && unknownRarities.includes(bRarity))
      return matchesSearch && matchesRarity
    })
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'income': {
          const diff = BigInt(b.baseIncome) - BigInt(a.baseIncome)
          return diff > BigInt(0) ? 1 : diff < BigInt(0) ? -1 : 0
        }
        case 'cost': {
          const diff = BigInt(b.baseCost) - BigInt(a.baseCost)
          return diff > BigInt(0) ? 1 : diff < BigInt(0) ? -1 : 0
        }
        case 'value':
          return (b.robuxValue || 0) - (a.robuxValue || 0)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })
  }, [brainrots, search, rarityFilter, sortBy, unknownRarities])

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [search, rarityFilter, sortBy])

  // Pagination
  const totalPages = Math.ceil(sorted.length / PER_PAGE)
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const clearFilters = useCallback(() => {
    setSearch('')
    setRarityFilter('all')
    setSortBy('income')
  }, [])

  const hasActiveFilters = search || sortBy !== 'income'

  return (
    <div className="min-h-screen bg-darkbg-950">
      {/* Sticky Header with Title + Filters combined */}
      <div className={`border-b border-darkbg-800 sticky top-16 z-40 transition-all duration-300 ${scrolled ? 'bg-darkbg-950/80 backdrop-blur-xl shadow-lg shadow-black/20' : 'bg-darkbg-950'}`}>
        {/* Background gradient orbs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/4 w-72 h-72 bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute -top-10 right-1/4 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 container mx-auto px-4 pt-5 pb-3">
          {/* Title row with search + view toggle */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="flex items-center gap-3 mb-3"
          >
            <motion.div
              className="p-2 bg-gradient-to-br from-green-500/20 to-emerald-500/10 rounded-xl border border-green-500/20 flex-shrink-0"
              animate={{
                boxShadow: [
                  '0 0 12px rgba(34,197,94,0.15)',
                  '0 0 24px rgba(34,197,94,0.3)',
                  '0 0 12px rgba(34,197,94,0.15)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-5 h-5 text-green-400" />
            </motion.div>
            <div className="min-w-0 mr-auto">
              <h1 className="text-xl md:text-2xl font-black text-white leading-tight">brainrot index</h1>
              <p className="text-gray-500 text-xs">
                {sorted.length === brainrots.length
                  ? `${brainrots.length} brainrots`
                  : <>{sorted.length} of {brainrots.length}{rarityFilter !== 'all' && <span className={`ml-1 ${getRarityColor(rarityFilter)}`}>in {rarityFilter}</span>}</>
                }
              </p>
            </div>

            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="search..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className="w-full pl-9 pr-8 py-2 bg-darkbg-800 border border-darkbg-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 transition-colors text-sm"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View toggle */}
            <div className="hidden sm:flex items-center gap-0.5 bg-darkbg-800 rounded-lg border border-darkbg-700 p-0.5">
              <button
                onClick={() => setCompactView(false)}
                className={`p-1.5 rounded-md transition-all ${!compactView ? 'bg-green-600/20 text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCompactView(true)}
                className={`p-1.5 rounded-md transition-all ${compactView ? 'bg-green-600/20 text-green-400' : 'text-gray-500 hover:text-gray-300'}`}
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>

          {/* Filter row: rarity pills + sort + clear */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <div
                className="absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-all duration-300"
                style={{
                  background: 'linear-gradient(to right, rgb(33,39,57), transparent)',
                  opacity: pillFade.left ? 1 : 0,
                  transform: pillFade.left ? 'translateX(0)' : 'translateX(-8px)',
                }}
              />
              <div
                className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-all duration-300"
                style={{
                  background: 'linear-gradient(to left, rgb(33,39,57), transparent)',
                  opacity: pillFade.right ? 1 : 0,
                  transform: pillFade.right ? 'translateX(0)' : 'translateX(8px)',
                }}
              />
            <div ref={pillScrollRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => { setRarityFilter('all'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all ${
                  rarityFilter === 'all'
                    ? 'bg-white/10 text-white border-white/20'
                    : 'bg-darkbg-800 text-gray-400 border-darkbg-700 hover:text-white hover:border-darkbg-600'
                }`}
              >
                All
              </button>
              {availableRarities.map((rarity) => {
                const isActive = rarityFilter.toLowerCase() === rarity
                const pillColors = RARITY_PILL_COLORS[rarity] || RARITY_PILL_COLORS['admin']
                const count = rarityCounts[rarity] || 0
                return (
                  <button
                    key={rarity}
                    onClick={() => { setRarityFilter(rarity); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all capitalize ${
                      isActive
                        ? `${pillColors.activeBg} ${pillColors.border}`
                        : `${pillColors.bg} ${pillColors.border} hover:text-gray-200`
                    }`}
                  >
                    <span className={isActive ? `${RARITY_COLOR_MAP[rarity] || 'rarity-admin animation-always-running'}` : 'text-gray-400 hover:text-gray-200'}>
                      {formatRarityName(rarity)}
                    </span> <span className="opacity-50 ml-0.5 text-gray-400">{count}</span>
                  </button>
                )
              })}
            </div>
            </div>

            {/* Sort buttons */}
            <div className="hidden sm:flex items-center gap-0.5 bg-darkbg-800 rounded-lg border border-darkbg-700 p-0.5 flex-shrink-0">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    sortBy === opt.key
                      ? 'bg-green-600/20 text-green-400'
                      : 'text-gray-500 hover:text-white'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Mobile sort */}
            <button
              onClick={() => {
                const currentIndex = SORT_OPTIONS.findIndex(o => o.key === sortBy)
                const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length
                setSortBy(SORT_OPTIONS[nextIndex].key)
              }}
              className="sm:hidden flex items-center gap-1 px-2.5 py-1 bg-darkbg-800 rounded-lg border border-darkbg-700 text-gray-400 text-[11px] font-medium flex-shrink-0"
            >
              <SlidersHorizontal className="w-3 h-3" />
              {SORT_OPTIONS.find(o => o.key === sortBy)?.label}
            </button>


          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 pt-4 pb-8">
        {loading ? (
          <div className={`grid ${compactView ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4'}`}>
            {[...Array(24)].map((_, i) => (
              <div key={i} className="bg-darkbg-800 rounded-2xl border border-darkbg-700 overflow-hidden">
                <div className="aspect-square skeleton" />
                <div className="p-3">
                  <div className="h-4 w-3/4 skeleton rounded mb-2" />
                  <div className="h-3 w-1/2 skeleton rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : paginated.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-darkbg-800 rounded-2xl border border-darkbg-700 flex items-center justify-center">
              <Search className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg font-medium mb-2">no brainrots found</p>
            <p className="text-gray-600 text-sm mb-4">try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-darkbg-800 rounded-xl border border-darkbg-700 text-sm text-gray-300 hover:text-white hover:border-darkbg-600 transition-all"
            >
              clear all filters
            </button>
          </motion.div>
        ) : (
          <motion.div
            className={`grid ${compactView ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4'}`}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            key={`${rarityFilter}-${sortBy}-${page}`}
          >
            {paginated.map((brainrot) => {
              const rarityBorder = getRarityBorder(brainrot.rarity)
              const tier = getRarityTier(brainrot.rarity)
              const glowRgb = getGlowRgb(brainrot.rarity)

              return (
                <motion.div
                  key={brainrot.id}
                  variants={cardVariants}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedBrainrot(brainrot)}
                  className={`group relative bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-2xl border ${rarityBorder.border} ${rarityBorder.animated || ''} ${rarityBorder.glow || ''} transition-all duration-300 cursor-pointer overflow-hidden`}
                >
                  {/* Top gradient accent for higher rarities */}
                  {tier >= 3 && (
                    <div
                      className="absolute inset-x-0 top-0 h-px pointer-events-none"
                      style={{ background: `linear-gradient(to right, transparent, rgba(${glowRgb},0.5), transparent)` }}
                    />
                  )}

                  {/* Subtle overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/[0.03] pointer-events-none rounded-2xl" />

                  {/* Image */}
                  <div className="aspect-square relative p-2 sm:p-3">
                    {/* Rarity glow behind image */}
                    {tier >= 4 && (
                      <div
                        className="absolute inset-4 rounded-xl blur-2xl opacity-20 group-hover:opacity-35 transition-opacity duration-500"
                        style={{ background: `radial-gradient(circle, rgba(${glowRgb},0.6), transparent)` }}
                      />
                    )}
                    <Image
                      src={brainrot.localImage || brainrot.imageUrl}
                      alt={brainrot.name}
                      fill
                      unoptimized
                      loading="lazy"
                      className="object-contain p-1.5 sm:p-2 group-hover:scale-110 transition-transform duration-500 ease-out relative z-10"
                    />
                  </div>

                  {/* Info */}
                  <div className={`${compactView ? 'px-2 pb-2' : 'px-2.5 pb-2.5 sm:px-3 sm:pb-3'} relative z-10`}>
                    {/* Divider */}
                    <div
                      className="h-px mb-2 rounded-full"
                      style={tier >= 3
                        ? { background: `linear-gradient(to right, transparent, rgba(${glowRgb},0.3), transparent)` }
                        : { background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.06), transparent)' }
                      }
                    />

                    <p className={`text-white font-semibold ${compactView ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm'} truncate`}>
                      {brainrot.name}
                    </p>

                    {brainrot.rarity && (
                      <p className={`${compactView ? 'text-[9px]' : 'text-[10px] sm:text-xs'} font-medium ${getRarityColor(brainrot.rarity)}`}>
                        {brainrot.rarity}
                      </p>
                    )}

                    {/* Quick stats - only in non-compact */}
                    {!compactView && (
                      <div className="mt-1.5 flex items-center gap-2 text-[9px] sm:text-[10px]">
                        <span className="text-green-400/80 font-mono flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" />
                          ${formatNumber(brainrot.baseIncome)}/s
                        </span>
                        {brainrot.robuxValue && (
                          <span className="text-yellow-400/80 font-mono flex items-center gap-0.5">
                            <Gem className="w-2.5 h-2.5" />
                            R${brainrot.robuxValue.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Hover shimmer */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 group-hover:animate-shimmer"
                      style={{
                        background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)',
                        backgroundSize: '200% 100%',
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 mt-10"
          >
            <button
              onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              disabled={page === 1}
              className="p-2.5 rounded-xl bg-darkbg-800 border border-darkbg-700 text-gray-400 hover:text-white hover:border-darkbg-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1]) > 1) acc.push('ellipsis')
                acc.push(p)
                return acc
              }, [])
              .map((item, i) =>
                item === 'ellipsis' ? (
                  <span key={`e-${i}`} className="px-2 text-gray-600">...</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => { setPage(item); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
                    className={`min-w-[40px] h-10 rounded-xl text-sm font-semibold transition-all ${
                      page === item
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                        : 'bg-darkbg-800 border border-darkbg-700 text-gray-400 hover:text-white hover:border-darkbg-600'
                    }`}
                  >
                    {item}
                  </button>
                )
              )}

            <button
              onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              disabled={page === totalPages}
              className="p-2.5 rounded-xl bg-darkbg-800 border border-darkbg-700 text-gray-400 hover:text-white hover:border-darkbg-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <span className="ml-3 text-sm text-gray-600">
              {sorted.length} results
            </span>
          </motion.div>
        )}
      </div>

      {/* Brainrot Detail Modal */}
      <AnimatePresence>
        {selectedBrainrot && (() => {
          const tier = getRarityTier(selectedBrainrot.rarity)
          const border = getRarityBorder(selectedBrainrot.rarity)
          const glowRgb = getGlowRgb(selectedBrainrot.rarity)

          const auraClass =
            tier >= 7 ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500' :
            tier === 6 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
            tier === 5 ? 'bg-red-500' :
            tier === 4 ? 'bg-yellow-500' :
            tier === 3 ? 'bg-purple-600' :
            tier === 2 ? 'bg-cyan-400' :
            'bg-white'

          const stats = [
            { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'cost', value: `$${formatNumber(selectedBrainrot.baseCost)}`, color: 'text-white' },
            { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'income', value: `$${formatNumber(selectedBrainrot.baseIncome)}/s`, color: 'text-green-400' },
            selectedBrainrot.robuxValue != null
              ? { icon: <Gem className="w-3.5 h-3.5" />, label: 'value', value: `R$${selectedBrainrot.robuxValue.toLocaleString()}`, color: 'text-yellow-400' }
              : null,
          ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; color: string }[]

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setSelectedBrainrot(null)}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
              style={{ background: `radial-gradient(ellipse at 50% 40%, rgba(${glowRgb},0.15) 0%, rgba(0,0,0,0.88) 65%)` }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.78, y: 32 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.78, y: 32 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                onClick={(e) => e.stopPropagation()}
                className={`relative w-full max-w-sm max-h-[90vh] bg-gradient-to-b from-darkbg-800 to-darkbg-900 rounded-3xl border-2 ${border.border} ${border.animated || ''} overflow-y-auto overflow-x-hidden`}
                style={{ boxShadow: `0 0 80px rgba(${glowRgb},0.25), 0 0 30px rgba(${glowRgb},0.1), 0 30px 60px rgba(0,0,0,0.6)` }}
              >
                {/* Close - sticky so it stays visible when scrolling */}
                <div className="sticky top-0 z-30 flex justify-end p-3 pointer-events-none">
                  <motion.button
                    whileHover={{ scale: 1.15, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedBrainrot(null)}
                    className="pointer-events-auto w-8 h-8 rounded-full bg-darkbg-700/80 hover:bg-darkbg-600 border border-white/10 flex items-center justify-center"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </motion.button>
                </div>

                {/* Top light streak */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

                {/* Image section - shorter on mobile to leave room for chart */}
                <div className="relative aspect-[4/3] sm:aspect-square -mt-10">
                  {tier >= 2 && (
                    <motion.div
                      animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.9, 1.02, 0.9] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                      className={`absolute inset-6 rounded-full blur-3xl ${auraClass}`}
                    />
                  )}

                  {(selectedBrainrot.localImage || selectedBrainrot.imageUrl) && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.07 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={selectedBrainrot.localImage || selectedBrainrot.imageUrl}
                        alt={selectedBrainrot.name}
                        fill
                        unoptimized
                        className="object-contain p-8 relative z-10"
                        style={{ filter: tier >= 3 ? `drop-shadow(0 0 18px rgba(${glowRgb},0.75))` : 'drop-shadow(0 6px 14px rgba(0,0,0,0.6))' }}
                      />
                    </motion.div>
                  )}
                </div>

                {/* Glowing divider */}
                <div className="mx-0 h-px" style={{ background: `linear-gradient(to right, transparent, rgba(${glowRgb},0.5), transparent)` }} />

                {/* Info */}
                <div className="px-6 pt-5 pb-6">
                  <motion.h2
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="font-black text-2xl text-center leading-tight mb-2 text-white"
                  >
                    {selectedBrainrot.name}
                  </motion.h2>

                  {selectedBrainrot.rarity && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.75 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 400 }}
                      className="flex justify-center mb-5"
                    >
                      <span
                        className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border"
                        style={{ background: `rgba(${glowRgb},0.08)`, borderColor: `rgba(${glowRgb},0.25)` }}
                      >
                        <span className={getRarityColor(selectedBrainrot.rarity)}>
                          {selectedBrainrot.rarity}
                        </span>
                      </span>
                    </motion.div>
                  )}

                  {/* Stats */}
                  <div className="space-y-2">
                    {stats.map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, x: -14 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.07 }}
                        className="flex items-center justify-between rounded-xl px-4 py-3 border border-white/5"
                        style={{ background: `rgba(${glowRgb},0.05)` }}
                      >
                        <span className="text-gray-500 text-sm flex items-center gap-1.5">
                          {stat.icon} {stat.label}
                        </span>
                        <span className={`font-mono text-sm font-bold ${stat.color}`}>
                          {stat.value}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                  {/* Price History Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 }}
                  >
                    <PriceHistoryChart brainrotId={selectedBrainrot.id} glowRgb={glowRgb} />
                  </motion.div>
                </div>

                {/* Bottom gradient */}
                <div className="sticky inset-x-0 bottom-0 h-16 pointer-events-none rounded-b-3xl -mt-16"
                  style={{ background: `linear-gradient(to top, rgba(${glowRgb},0.06), transparent)` }}
                />
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </div>
  )
}
