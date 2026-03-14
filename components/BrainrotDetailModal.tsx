'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, DollarSign, TrendingUp, Gem, Loader2 } from 'lucide-react'
import { getMutationClass } from '@/lib/utils'
import { DemandTrendBadge, type DemandLevel, type TrendDirection } from '@/components/trading/DemandTrendBadge'
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from 'recharts'

interface BrainrotData {
  id: string
  name: string
  localImage: string | null
  imageUrl?: string
  baseCost: string
  baseIncome: string
  rarity: string | null
  robuxValue: number | null
  demand?: DemandLevel | null
  trend?: TrendDirection | null
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

const RARITY_BORDER_MAP: Record<string, { border: string; animated?: string }> = {
  common: { border: 'border-green-700/40' },
  rare: { border: 'border-cyan-500/40' },
  epic: { border: 'border-purple-600/40' },
  legendary: { border: 'border-yellow-500/40' },
  mythic: { border: 'border-red-500/40' },
  'brainrot god': { border: 'border-pink-500/40', animated: 'card-border-animated card-border-god' },
  god: { border: 'border-pink-500/40', animated: 'card-border-animated card-border-god' },
  secret: { border: 'border-gray-400/40', animated: 'card-border-animated card-border-secret' },
  festive: { border: 'border-red-500/40', animated: 'card-border-animated card-border-festive' },
  og: { border: 'border-yellow-500/40', animated: 'card-border-animated card-border-og' },
  admin: { border: 'border-amber-500/40', animated: 'card-border-animated card-border-admin' },
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

const DEFAULT_BORDER = { border: 'border-amber-500/40', animated: 'card-border-animated card-border-admin' }

function getRarityColor(rarity: string | null): string {
  if (!rarity) return 'text-gray-400'
  return RARITY_COLOR_MAP[rarity.toLowerCase()] || 'rarity-admin animation-always-running'
}

function getRarityBorder(rarity: string | null) {
  if (!rarity) return DEFAULT_BORDER
  return RARITY_BORDER_MAP[rarity.toLowerCase()] || DEFAULT_BORDER
}

function getGlowRgb(rarity: string | null): string {
  if (!rarity) return '255,165,0'
  return RARITY_GLOW_RGB[rarity.toLowerCase()] || '255,165,0'
}

function getRarityTier(rarity: string | null): number {
  if (!rarity) return 0
  return RARITY_TIER_MAP[rarity.toLowerCase()] || 6
}

// Chart tooltip
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

type PricePoint = { date: string; value: number; min: number; max: number; listings: number }
type MutationOption = { id: string; name: string; multiplier: number }

interface BrainrotDetailModalProps {
  brainrotId: string | null
  onClose: () => void
  /** Pass rarity so the border/glow matches immediately while loading */
  rarity?: string | null
  /** Pre-select a specific mutation for the price chart */
  initialMutationId?: string
}

// Cache brainrot list so we don't refetch every click
let brainrotCacheData: BrainrotData[] | null = null
let brainrotCachePromise: Promise<BrainrotData[]> | null = null

function fetchBrainrotList(): Promise<BrainrotData[]> {
  if (brainrotCacheData) return Promise.resolve(brainrotCacheData)
  if (brainrotCachePromise) return brainrotCachePromise
  brainrotCachePromise = fetch('/api/brainrots/all')
    .then(r => r.json())
    .then(d => {
      brainrotCacheData = d.brainrots || []
      return brainrotCacheData!
    })
    .catch(() => {
      brainrotCachePromise = null
      return []
    })
  return brainrotCachePromise
}

export function BrainrotDetailModal({ brainrotId, onClose, rarity: rarityHint, initialMutationId }: BrainrotDetailModalProps) {
  const [brainrot, setBrainrot] = useState<BrainrotData | null>(null)
  const [priceData, setPriceData] = useState<PricePoint[] | null>(null)
  const [demandInfo, setDemandInfo] = useState<{ demand: DemandLevel; trend: TrendDirection } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mutations, setMutations] = useState<MutationOption[]>([])
  const [activeMutationId, setActiveMutationId] = useState<string | null>(null)
  const [chartLoading, setChartLoading] = useState(false)

  // Initial load: brainrot data + default price history
  useEffect(() => {
    if (!brainrotId) {
      setBrainrot(null)
      setPriceData(null)
      setDemandInfo(null)
      setMutations([])
      setActiveMutationId(null)
      return
    }

    setLoading(true)
    setBrainrot(null)
    setPriceData(null)
    setDemandInfo(null)
    setMutations([])
    setActiveMutationId(null)

    const priceUrl = initialMutationId
      ? `/api/brainrots/${brainrotId}/price-history?mutationId=${initialMutationId}`
      : `/api/brainrots/${brainrotId}/price-history`

    Promise.all([
      fetchBrainrotList(),
      fetch(priceUrl).then(r => r.json()).catch(() => null),
    ]).then(([list, priceRes]) => {
      const found = list.find(b => b.id === brainrotId)
      if (found) setBrainrot(found)
      if (priceRes?.history) setPriceData(priceRes.history)
      if (priceRes?.demand && priceRes?.trend) setDemandInfo({ demand: priceRes.demand, trend: priceRes.trend })
      if (priceRes?.mutations) setMutations(priceRes.mutations)
      if (priceRes?.activeMutationId) setActiveMutationId(priceRes.activeMutationId)
    }).finally(() => setLoading(false))
  }, [brainrotId, initialMutationId])

  // Refetch chart when mutation changes (skip initial load)
  const fetchMutationPrice = (mutId: string) => {
    if (!brainrotId || mutId === activeMutationId) return
    setActiveMutationId(mutId)
    setChartLoading(true)
    fetch(`/api/brainrots/${brainrotId}/price-history?mutationId=${mutId}`)
      .then(r => r.json())
      .then(res => {
        if (res?.history) setPriceData(res.history)
        else setPriceData([])
      })
      .catch(() => setPriceData([]))
      .finally(() => setChartLoading(false))
  }

  if (!brainrotId) return null

  const b = brainrot
  // Use loaded data, then explicit hint, then check cache synchronously
  const effectiveRarity = b?.rarity ?? rarityHint ?? brainrotCacheData?.find(c => c.id === brainrotId)?.rarity ?? null
  const tier = getRarityTier(effectiveRarity)
  const border = getRarityBorder(effectiveRarity)
  const glowRgb = getGlowRgb(effectiveRarity)

  const auraClass =
    tier >= 7 ? 'bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500' :
    tier === 6 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
    tier === 5 ? 'bg-red-500' :
    tier === 4 ? 'bg-yellow-500' :
    tier === 3 ? 'bg-purple-600' :
    tier === 2 ? 'bg-cyan-400' :
    'bg-white'

  // Pre-compute price chart data
  const chartInfo = priceData && priceData.length >= 2 ? (() => {
    const firstVal = priceData[0].value
    const lastVal = priceData[priceData.length - 1].value
    const change = lastVal - firstVal
    const changePct = firstVal > 0 ? ((change / firstVal) * 100).toFixed(1) : '0'
    const isUp = change > 0
    const isFlat = change === 0
    const lineColor = isUp ? '#22c55e' : isFlat ? '#6b7280' : '#ef4444'
    return { lastVal, changePct, isUp, isFlat, lineColor }
  })() : null

  // Use latest snapshot price as source of truth, fall back to admin-set value
  const displayRobuxValue = chartInfo?.lastVal ?? b?.robuxValue

  // Apply mutation multiplier to income
  const activeMutation = mutations.find(m => m.id === activeMutationId)
  const mutMultiplier = activeMutation?.multiplier ?? 1
  const displayIncome = b ? BigInt(Math.round(Number(BigInt(b.baseIncome)) * mutMultiplier)).toString() : '0'

  const stats = b ? [
    { icon: <DollarSign className="w-3.5 h-3.5" />, label: 'cost', value: `$${formatNumber(b.baseCost)}`, color: 'text-white' },
    { icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'income', value: `$${formatNumber(displayIncome)}/s`, color: 'text-green-400' },
    displayRobuxValue != null
      ? { icon: <Gem className="w-3.5 h-3.5" />, label: 'value', value: `R$${displayRobuxValue.toLocaleString()}`, color: 'text-yellow-400' }
      : null,
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; color: string }[] : []

  return (
    <AnimatePresence>
      {brainrotId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
          style={{ background: loading ? 'rgba(0,0,0,0.85)' : `radial-gradient(ellipse at 50% 40%, rgba(${glowRgb},0.15) 0%, rgba(0,0,0,0.88) 65%)` }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.78, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.78, y: 32 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-sm bg-gradient-to-b from-darkbg-800 to-darkbg-900 rounded-3xl border-2 ${border.border} ${border.animated || ''} overflow-hidden`}
            style={b ? { boxShadow: `0 0 80px rgba(${glowRgb},0.25), 0 0 30px rgba(${glowRgb},0.1), 0 30px 60px rgba(0,0,0,0.6)` } : {}}
          >
            {/* Close button */}
            <div className="absolute top-3 right-3 z-30">
              <motion.button
                whileHover={{ scale: 1.15, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-darkbg-700/80 hover:bg-darkbg-600 border border-white/10 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-400" />
              </motion.button>
            </div>

            {loading ? (
              /* Skeleton */
              <div className="animate-pulse">
                <div className="aspect-[5/4] max-h-[40vh] bg-white/[0.03] flex items-center justify-center">
                  <div className="w-24 h-24 rounded-2xl bg-white/[0.06]" />
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="px-6 pt-4 pb-5 space-y-3">
                  <div className="h-6 w-40 bg-white/[0.06] rounded-lg mx-auto" />
                  <div className="h-5 w-20 bg-white/[0.06] rounded-full mx-auto" />
                  <div className="flex justify-center gap-4">
                    <div className="h-4 w-16 bg-white/[0.06] rounded" />
                    <div className="h-4 w-20 bg-white/[0.06] rounded" />
                    <div className="h-4 w-14 bg-white/[0.06] rounded" />
                  </div>
                  <div className="h-[140px] bg-white/[0.03] rounded-xl border border-white/[0.04]" />
                </div>
              </div>
            ) : b ? (
              <>
                {/* Image */}
                <div className="relative aspect-[5/4] max-h-[40vh]">
                  {tier >= 2 && (
                    <motion.div
                      animate={{ opacity: [0.12, 0.28, 0.12], scale: [0.9, 1.02, 0.9] }}
                      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                      className={`absolute inset-6 rounded-full blur-3xl ${auraClass}`}
                    />
                  )}
                  {(b.localImage || b.imageUrl) && (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 22, delay: 0.07 }}
                      className="absolute inset-0"
                    >
                      <Image
                        src={b.localImage || b.imageUrl!}
                        alt={b.name}
                        fill
                        unoptimized
                        className="object-contain p-8 relative z-10"
                        style={{ filter: tier >= 3 ? `drop-shadow(0 0 18px rgba(${glowRgb},0.75))` : 'drop-shadow(0 6px 14px rgba(0,0,0,0.6))' }}
                      />
                    </motion.div>
                  )}
                </div>

                <div className="h-px" style={{ background: `linear-gradient(to right, transparent, rgba(${glowRgb},0.5), transparent)` }} />

                <div className="px-6 pt-4 pb-5">
                  <h2 className="font-black text-xl text-center leading-tight mb-0.5 text-white">
                    {b.name}
                  </h2>

                  {/* Show active mutation name when not Default */}
                  {(() => {
                    const activeMut = mutations.find(m => m.id === activeMutationId)
                    return activeMut && activeMut.name !== 'Default' ? (
                      <p className={`text-center text-xs font-bold mb-1 animation-always-running ${getMutationClass(activeMut.name)}`}>
                        {activeMut.name}
                      </p>
                    ) : null
                  })()}

                  {b.rarity && (
                    <div className="flex justify-center mb-3">
                      <span
                        className="text-[11px] font-bold tracking-widest uppercase px-3 py-1 rounded-full border"
                        style={{ background: `rgba(${glowRgb},0.08)`, borderColor: `rgba(${glowRgb},0.25)` }}
                      >
                        <span className={getRarityColor(b.rarity)}>
                          {b.rarity}
                        </span>
                      </span>
                    </div>
                  )}

                  {/* Stats - compact inline */}
                  <div className="flex items-center justify-center gap-4 text-xs">
                    {stats.map((stat) => (
                      <div key={stat.label} className="flex items-center gap-1.5">
                        <span className="text-gray-500">{stat.icon}</span>
                        <span className={`font-mono font-bold ${stat.color}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Mutation picker */}
                  {mutations.length > 1 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {mutations.map((m) => {
                        const isActive = m.id === activeMutationId
                        const mutClass = getMutationClass(m.name)
                        return (
                          <button
                            key={m.id}
                            onClick={() => fetchMutationPrice(m.id)}
                            disabled={chartLoading}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all border ${
                              isActive
                                ? 'bg-white/10 border-white/20'
                                : 'bg-transparent border-transparent hover:bg-white/5'
                            }`}
                          >
                            <span className={isActive ? `animation-always-running ${mutClass}` : 'text-gray-500'}>
                              {m.name}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Price History */}
                  {chartInfo && priceData ? (
                    <div className="relative mt-3 rounded-xl border border-white/5 px-3 py-3" style={{ background: `rgba(${glowRgb},0.05)` }}>
                      {chartLoading && (
                        <div className="absolute inset-0 z-10 rounded-xl bg-darkbg-900/60 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-1 px-1">
                        <span className="text-gray-500 text-[10px] uppercase tracking-wider">30d Price</span>
                        <div className="flex items-center gap-2">
                          {demandInfo && (
                            <DemandTrendBadge demand={demandInfo.demand} trend={demandInfo.trend} size="xs" variant="badge" />
                          )}
                          <span className={`text-xs font-bold ${chartInfo.isUp ? 'text-green-400' : chartInfo.isFlat ? 'text-gray-400' : 'text-red-400'}`}>
                            {chartInfo.isUp ? '+' : ''}{chartInfo.changePct}%
                          </span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
                        <AreaChart data={priceData} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                          <defs>
                            <linearGradient id={`modalGrad-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={chartInfo.lineColor} stopOpacity={0.3} />
                              <stop offset="100%" stopColor={chartInfo.lineColor} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} tickFormatter={(d: string) => d.slice(5)} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={40} />
                          <YAxis hide domain={['dataMin - 20', 'dataMax + 20']} />
                          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />
                          <Area type="monotone" dataKey="value" stroke={chartInfo.lineColor} strokeWidth={2} fill={`url(#modalGrad-${b.id})`} dot={false} activeDot={{ r: 4, fill: chartInfo.lineColor, stroke: '#0a0a0a', strokeWidth: 2 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                      <div className="flex justify-between items-center mt-1 px-1">
                        <span className="text-[10px] text-gray-600">{priceData.length} days</span>
                        <span className="text-xs font-bold text-yellow-400">R${chartInfo.lastVal.toLocaleString()}</span>
                      </div>
                    </div>
                  ) : chartLoading ? (
                    <div className="mt-3 rounded-xl border border-white/5 px-3 py-8 flex items-center justify-center" style={{ background: `rgba(${glowRgb},0.05)` }}>
                      <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    </div>
                  ) : priceData && priceData.length < 2 ? (
                    <div className="mt-3 rounded-xl border border-white/5 px-4 py-4" style={{ background: `rgba(${glowRgb},0.05)` }}>
                      {demandInfo && (
                        <div className="flex items-center justify-center mb-2">
                          <DemandTrendBadge demand={demandInfo.demand} trend={demandInfo.trend} size="sm" variant="badge" />
                        </div>
                      )}
                      <p className="text-gray-500 text-xs text-center">Not enough price data yet</p>
                    </div>
                  ) : null}
                </div>

                <div className="absolute inset-x-0 bottom-0 h-8 pointer-events-none rounded-b-3xl"
                  style={{ background: `linear-gradient(to top, rgba(${glowRgb},0.06), transparent)` }}
                />
              </>
            ) : null}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
