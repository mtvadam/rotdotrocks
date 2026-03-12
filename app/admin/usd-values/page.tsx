'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  DollarSign, Search, Save, Loader2, Check, X, RefreshCw,
  ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, TrendingDown, Minus, History, BarChart3
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Legend
} from 'recharts'

type DemandLevel = 'TERRIBLE' | 'LOW' | 'NORMAL' | 'HIGH' | 'AMAZING'
type TrendIndicator = 'LOWERING' | 'STABLE' | 'RISING'

interface MutationValue {
  mutationId: string
  robuxValue: number
  demand: DemandLevel
  trend: TrendIndicator
  mutation: {
    id: string
    name: string
    multiplier: number
  }
}

interface Brainrot {
  id: string
  name: string
  slug: string
  localImage: string | null
  robuxValue: number | null
  rarity: string | null
  demand: DemandLevel
  trend: TrendIndicator
  mutationValues: MutationValue[]
}

interface Mutation {
  id: string
  name: string
  multiplier: number
}

interface EditedValue {
  mutations?: Record<string, string | null>
  demand?: DemandLevel
  trend?: TrendIndicator
  mutationDemand?: Record<string, DemandLevel>  // mutationId -> demand
  mutationTrend?: Record<string, TrendIndicator> // mutationId -> trend
}

interface HistorySnapshot {
  date: string
  mutationId: string
  mutationName: string
  avgRobuxPrice: number
  count: number
  usedForDemand: boolean
}

interface DemandInfo {
  demand: DemandLevel
  trend: TrendIndicator
  totalSnapshots: number
  uniqueDays: number
}

interface HistoryData {
  snapshots: HistorySnapshot[]
  demandInfo: DemandInfo
}

type SortField = 'name' | 'rarity' | 'demand'
type SortDirection = 'asc' | 'desc'

const DEMAND_CONFIG: Record<DemandLevel, { label: string; color: string; bg: string; border: string }> = {
  TERRIBLE: { label: 'Terrible', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  LOW: { label: 'Low', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  NORMAL: { label: 'Normal', color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
  HIGH: { label: 'High', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  AMAZING: { label: 'Amazing', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
}

const TREND_CONFIG: Record<TrendIndicator, { label: string; color: string; icon: typeof TrendingUp }> = {
  LOWERING: { label: 'Lowering', color: 'text-red-400', icon: TrendingDown },
  STABLE: { label: 'Stable', color: 'text-gray-400', icon: Minus },
  RISING: { label: 'Rising', color: 'text-green-400', icon: TrendingUp },
}

const DEMAND_ORDER: DemandLevel[] = ['TERRIBLE', 'LOW', 'NORMAL', 'HIGH', 'AMAZING']

function DemandBadge({ demand }: { demand: DemandLevel }) {
  const config = DEMAND_CONFIG[demand]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.color} ${config.bg} border ${config.border}`}>
      {config.label}
    </span>
  )
}

function TrendBadge({ trend }: { trend: TrendIndicator }) {
  const config = TREND_CONFIG[trend]
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  )
}


const CHART_COLORS = [
  '#4ade80', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6',
  '#34d399', '#38bdf8', '#fb923c', '#c084fc', '#fb7185',
]

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-darkbg-800 border border-darkbg-600 rounded-lg px-3 py-2 shadow-xl">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-mono font-medium">R$ {entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function PriceHistoryPanel({ brainrotId, mutations }: { brainrotId: string; mutations: Mutation[] }) {
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/usd-values/history?brainrotId=${brainrotId}&days=${days}`)
        if (res.ok) {
          const data = await res.json()
          setHistory(data)
        }
      } catch {
        // ignore
      }
      setLoading(false)
    }
    fetchHistory()
  }, [brainrotId, days])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-gray-500 text-sm justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading history...
      </div>
    )
  }

  if (!history || history.snapshots.length === 0) {
    return (
      <div className="py-6 text-gray-500 text-sm text-center">
        No price history available
      </div>
    )
  }

  const { snapshots, demandInfo } = history

  // Get unique mutation names
  const mutationNames = [...new Set(snapshots.map(s => s.mutationName))].sort((a, b) => {
    const mA = mutations.find(m => m.name === a)
    const mB = mutations.find(m => m.name === b)
    return (mA?.multiplier ?? 0) - (mB?.multiplier ?? 0)
  })

  // Build chart data: one row per date, one key per mutation (daily avg)
  const allDates = [...new Set(snapshots.map(s => s.date))].sort()
  const chartData = allDates.map(date => {
    const row: Record<string, string | number> = { date: date.slice(5) } // "MM-DD" format
    for (const mName of mutationNames) {
      const snap = snapshots.find(s => s.date === date && s.mutationName === mName)
      if (snap) row[mName] = snap.avgRobuxPrice
    }
    return row
  })

  // Summary stats per mutation
  const mutationStats = mutationNames.map((mName, i) => {
    const vals = allDates
      .map(d => snapshots.find(s => s.date === d && s.mutationName === mName)?.avgRobuxPrice)
      .filter((v): v is number => v !== undefined)
    const latest = vals[vals.length - 1] || 0
    const first = vals[0] || 0
    const pctChange = first > 0 ? ((latest - first) / first * 100) : 0
    return { name: mName, latest, pctChange, color: CHART_COLORS[i % CHART_COLORS.length], dataPoints: vals.length }
  })

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">
              {demandInfo.totalSnapshots} snapshots / {demandInfo.uniqueDays} days
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DemandBadge demand={demandInfo.demand} />
            <TrendBadge trend={demandInfo.trend} />
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[7, 14, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                days === d
                  ? 'bg-darkbg-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-darkbg-800/50 rounded-lg p-3 border border-darkbg-700">
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#374151' }}
                tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />
              {mutationNames.length > 1 && (
                <Legend
                  wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
                  iconType="circle"
                  iconSize={8}
                />
              )}
              {mutationNames.map((mName, i) => (
                <Line
                  key={mName}
                  type="monotone"
                  dataKey={mName}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Mutation summary cards */}
      <div className="flex flex-wrap gap-2">
        {mutationStats.map(({ name, latest, pctChange, color, dataPoints }) => (
          <div key={name} className="bg-darkbg-800 rounded-lg px-3 py-2 flex items-center gap-3 border border-darkbg-700">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <div>
              <div className="text-xs text-gray-400">{name}</div>
              <div className="text-sm text-white font-mono">R$ {latest.toLocaleString()}</div>
            </div>
            {dataPoints >= 2 && Math.abs(pctChange) >= 1 && (
              <span className={`text-xs font-medium ${pctChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {pctChange > 0 ? '+' : ''}{pctChange.toFixed(1)}%
              </span>
            )}
            <span className="text-xs text-gray-600">{dataPoints}d</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RobuxValuesPage() {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [brainrots, setBrainrots] = useState<Brainrot[]>([])
  const [mutations, setMutations] = useState<Mutation[]>([])
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editedValues, setEditedValues] = useState<Record<string, EditedValue>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [interpolating, setInterpolating] = useState(false)
  const [interpolateMsg, setInterpolateMsg] = useState<string | null>(null)
  const [demandFilter, setDemandFilter] = useState<DemandLevel | 'ALL'>('ALL')
  const [expandedTab, setExpandedTab] = useState<Record<string, 'values' | 'history'>>({})
  const [traits, setTraits] = useState<{ id: string; name: string; multiplier: number; valueMultiplier: number; localImage: string | null }[]>([])
  const [traitEdits, setTraitEdits] = useState<Record<string, string>>({})
  const [savingTrait, setSavingTrait] = useState<string | null>(null)
  const [showTraits, setShowTraits] = useState(false)
  const [showStreaks, setShowStreaks] = useState(false)
  const [streakConfig, setStreakConfig] = useState<Record<string, number>>({ '3': 2, '5': 3 })
  const [streakEdits, setStreakEdits] = useState<{ threshold: string; multiplier: string }[]>([])
  const [savingStreaks, setSavingStreaks] = useState(false)
  const [streakMsg, setStreakMsg] = useState<string | null>(null)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-50" />
    return sortDirection === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [valRes, traitRes, streakRes] = await Promise.all([
        fetch('/api/admin/usd-values'),
        fetch('/api/traits'),
        fetch('/api/admin/usd-values/streak-config'),
      ])
      const data = await valRes.json()
      setBrainrots(data.brainrots || [])
      setMutations(data.mutations || [])
      if (traitRes.ok) {
        const traitData = await traitRes.json()
        setTraits((traitData.traits || []).filter((t: { id: string }) => t))
      }
      if (streakRes.ok) {
        const streakData = await streakRes.json()
        setStreakConfig(streakData.streaks || { '3': 2, '5': 3 })
      }
    } catch {
      console.error('Failed to fetch data')
    }
    setLoading(false)
  }, [])

  const [traitMsg, setTraitMsg] = useState<string | null>(null)

  const saveTraitValue = async (traitId: string) => {
    const val = traitEdits[traitId]
    if (val === undefined) return
    setSavingTrait(traitId)
    try {
      const res = await fetch(`/api/admin/data/traits/${traitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valueMultiplier: parseFloat(val) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTraitMsg(data.error || 'Failed to save')
        setTimeout(() => setTraitMsg(null), 3000)
        return
      }
      if (data.submitted) {
        setTraitMsg('Submitted for approval')
        setTimeout(() => setTraitMsg(null), 3000)
      } else {
        setTraits(prev => prev.map(t => t.id === traitId ? { ...t, valueMultiplier: parseFloat(val) } : t))
      }
      setTraitEdits(prev => { const next = { ...prev }; delete next[traitId]; return next })
    } catch { /* ignore */ } finally {
      setSavingTrait(null)
    }
  }

  const startEditingStreaks = () => {
    setStreakEdits(
      Object.entries(streakConfig)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([threshold, multiplier]) => ({ threshold, multiplier: String(multiplier) }))
    )
    setShowStreaks(true)
  }

  const addStreakRow = () => {
    setStreakEdits(prev => [...prev, { threshold: '', multiplier: '' }])
  }

  const removeStreakRow = (index: number) => {
    setStreakEdits(prev => prev.filter((_, i) => i !== index))
  }

  const saveStreakConfig = async () => {
    const streaks: Record<string, number> = {}
    for (const { threshold, multiplier } of streakEdits) {
      const t = parseInt(threshold)
      const m = parseFloat(multiplier)
      if (isNaN(t) || t < 1 || isNaN(m) || m <= 0) {
        setStreakMsg('Invalid values — thresholds must be positive integers, multipliers must be positive numbers')
        setTimeout(() => setStreakMsg(null), 4000)
        return
      }
      streaks[String(t)] = m
    }
    setSavingStreaks(true)
    try {
      const res = await fetch('/api/admin/usd-values/streak-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ streaks }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.submitted) {
          setStreakMsg('Submitted for approval')
        } else {
          setStreakConfig(data.streaks)
          setStreakMsg('Saved')
        }
        setTimeout(() => setStreakMsg(null), 3000)
      } else {
        const data = await res.json()
        setStreakMsg(data.error || 'Failed to save')
        setTimeout(() => setStreakMsg(null), 4000)
      }
    } catch {
      setStreakMsg('Error saving streak config')
      setTimeout(() => setStreakMsg(null), 4000)
    } finally {
      setSavingStreaks(false)
    }
  }

  const runInterpolation = async () => {
    setInterpolating(true)
    setInterpolateMsg(null)
    try {
      const res = await fetch('/api/admin/usd-values/interpolate', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setInterpolateMsg(`Fixed ${data.updated} brainrot${data.updated !== 1 ? 's' : ''} (${data.skipped} unchanged)`)
        await fetchData()
      } else {
        setInterpolateMsg(`Error: ${data.error}`)
      }
    } catch {
      setInterpolateMsg('Error running interpolation')
    }
    setInterpolating(false)
    setTimeout(() => setInterpolateMsg(null), 4000)
  }

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (!expandedTab[id]) {
          setExpandedTab(prev => ({ ...prev, [id]: 'values' }))
        }
      }
      return next
    })
  }

  const updateMutationValue = (brainrotId: string, mutationId: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [brainrotId]: {
        ...prev[brainrotId],
        mutations: {
          ...prev[brainrotId]?.mutations,
          [mutationId]: value === '' ? null : value,
        },
      },
    }))
  }

  const hasChanges = (brainrotId: string) => {
    const edited = editedValues[brainrotId]
    if (!edited) return false
    return edited.demand !== undefined ||
           edited.trend !== undefined ||
           (edited.mutations && Object.keys(edited.mutations).length > 0) ||
           (edited.mutationDemand && Object.keys(edited.mutationDemand).length > 0) ||
           (edited.mutationTrend && Object.keys(edited.mutationTrend).length > 0)
  }

  const updateDemand = (brainrotId: string, value: DemandLevel) => {
    setEditedValues(prev => ({
      ...prev,
      [brainrotId]: {
        ...prev[brainrotId],
        demand: value,
      },
    }))
  }

  const updateTrend = (brainrotId: string, value: TrendIndicator) => {
    setEditedValues(prev => ({
      ...prev,
      [brainrotId]: {
        ...prev[brainrotId],
        trend: value,
      },
    }))
  }

  const updateMutationDemand = (brainrotId: string, mutationId: string, value: DemandLevel) => {
    setEditedValues(prev => ({
      ...prev,
      [brainrotId]: {
        ...prev[brainrotId],
        mutationDemand: {
          ...prev[brainrotId]?.mutationDemand,
          [mutationId]: value,
        },
      },
    }))
  }

  const updateMutationTrend = (brainrotId: string, mutationId: string, value: TrendIndicator) => {
    setEditedValues(prev => ({
      ...prev,
      [brainrotId]: {
        ...prev[brainrotId],
        mutationTrend: {
          ...prev[brainrotId]?.mutationTrend,
          [mutationId]: value,
        },
      },
    }))
  }

  const saveChanges = async (brainrotId: string) => {
    const edited = editedValues[brainrotId]
    if (!edited) return

    setSaving(brainrotId)
    try {
      const promises: Promise<Response>[] = []

      if (edited.demand !== undefined || edited.trend !== undefined) {
        const brainrotUpdate: Record<string, unknown> = {}
        if (edited.demand !== undefined) brainrotUpdate.demand = edited.demand
        if (edited.trend !== undefined) brainrotUpdate.trend = edited.trend

        promises.push(
          fetch(`/api/admin/usd-values/brainrots/${brainrotId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(brainrotUpdate),
          })
        )
      }

      if (edited.mutations && Object.keys(edited.mutations).length > 0) {
        const updates: Array<{ brainrotId: string; mutationId?: string; robuxValue: string | null }> = []
        for (const [mutationId, value] of Object.entries(edited.mutations)) {
          updates.push({ brainrotId, mutationId, robuxValue: value })
        }
        promises.push(
          fetch('/api/admin/usd-values/mutation-values', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates }),
          })
        )
      }

      // Mutation-specific demand/trend changes
      const mutDTUpdates: Array<{ brainrotId: string; mutationId: string; demand?: DemandLevel; trend?: TrendIndicator }> = []
      if (edited.mutationDemand) {
        for (const [mutationId, demand] of Object.entries(edited.mutationDemand)) {
          const existing = mutDTUpdates.find(u => u.mutationId === mutationId)
          if (existing) { existing.demand = demand } else { mutDTUpdates.push({ brainrotId, mutationId, demand }) }
        }
      }
      if (edited.mutationTrend) {
        for (const [mutationId, trend] of Object.entries(edited.mutationTrend)) {
          const existing = mutDTUpdates.find(u => u.mutationId === mutationId)
          if (existing) { existing.trend = trend } else { mutDTUpdates.push({ brainrotId, mutationId, trend }) }
        }
      }
      if (mutDTUpdates.length > 0) {
        promises.push(
          fetch('/api/admin/usd-values/mutation-values/demand-trend', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: mutDTUpdates }),
          })
        )
      }

      if (promises.length > 0) {
        const results = await Promise.all(promises)
        const allOk = results.every(res => res.ok)

        if (allOk) {
          // Check if any response was a pending submission (mod flow)
          const bodies = await Promise.all(results.map(r => r.clone().json()))
          const anySubmitted = bodies.some(b => b.submitted)

          if (!anySubmitted) await fetchData()
          setEditedValues(prev => {
            const next = { ...prev }
            delete next[brainrotId]
            return next
          })
          setSuccess(anySubmitted ? 'submitted' : brainrotId)
          setTimeout(() => setSuccess(null), 3000)
        }
      }
    } catch {
      console.error('Failed to save')
    }
    setSaving(null)
  }

  const discardChanges = (brainrotId: string) => {
    setEditedValues(prev => {
      const next = { ...prev }
      delete next[brainrotId]
      return next
    })
  }

  const getEffectiveValue = (brainrot: Brainrot, mutationId: string): { value: number | null; isFallback: boolean; source: string } => {
    const explicitValue = brainrot.mutationValues.find(mv => mv.mutationId === mutationId)
    if (explicitValue) {
      return { value: explicitValue.robuxValue, isFallback: false, source: 'explicit' }
    }

    const targetMutation = mutations.find(m => m.id === mutationId)
    if (!targetMutation) {
      return { value: null, isFallback: true, source: 'none' }
    }

    const sortedMutations = [...mutations].sort((a, b) => b.multiplier - a.multiplier)
    for (const mutation of sortedMutations) {
      if (mutation.multiplier < targetMutation.multiplier) {
        const fallbackValue = brainrot.mutationValues.find(mv => mv.mutationId === mutation.id)
        if (fallbackValue) {
          return { value: fallbackValue.robuxValue, isFallback: true, source: mutation.name }
        }
      }
    }

    return { value: null, isFallback: true, source: 'none' }
  }

  const getCurrentMutationValue = (brainrot: Brainrot, mutationId: string): string => {
    const edited = editedValues[brainrot.id]
    if (edited?.mutations?.[mutationId] !== undefined) {
      return edited.mutations[mutationId] ?? ''
    }
    const mutationValue = brainrot.mutationValues.find(mv => mv.mutationId === mutationId)
    return mutationValue?.robuxValue?.toString() ?? ''
  }

  const filteredBrainrots = useMemo(() => {
    let filtered = brainrots.filter(b => b.name.toLowerCase().includes(search.toLowerCase()))

    if (demandFilter !== 'ALL') {
      filtered = filtered.filter(b => b.demand === demandFilter)
    }

    return filtered.sort((a, b) => {
      let comparison = 0
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortField === 'rarity') {
        const aRarity = a.rarity || ''
        const bRarity = b.rarity || ''
        if (!aRarity && bRarity) return 1
        if (aRarity && !bRarity) return -1
        comparison = aRarity.localeCompare(bRarity)
      } else if (sortField === 'demand') {
        comparison = DEMAND_ORDER.indexOf(a.demand) - DEMAND_ORDER.indexOf(b.demand)
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [brainrots, search, sortField, sortDirection, demandFilter])

  // Demand distribution counts
  const demandCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: brainrots.length }
    for (const level of DEMAND_ORDER) {
      counts[level] = brainrots.filter(b => b.demand === level).length
    }
    return counts
  }, [brainrots])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <DollarSign className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Robux Values</h1>
            <p className="text-sm text-gray-500">Market values, demand levels, and price history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {interpolateMsg && (
            <span className={`text-xs ${interpolateMsg.includes('Error') ? 'text-red-400' : 'text-green-400'}`}>
              {interpolateMsg}
            </span>
          )}
          <button
            onClick={runInterpolation}
            disabled={interpolating || loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/30 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {interpolating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4" />
            )}
            Run Interpolation
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Trait Value Multipliers */}
      <div className="mb-4">
        <button
          onClick={() => setShowTraits(prev => !prev)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {showTraits ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Trait Value Multipliers
          <span className="text-xs text-gray-600">({traits.length} traits)</span>
          {traitMsg && <span className="text-xs text-blue-400 ml-2">{traitMsg}</span>}
        </button>
        {showTraits && (
          <div className="mt-3 bg-darkbg-800 rounded-xl border border-darkbg-700 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-px bg-darkbg-700">
              {traits.map(trait => {
                const editVal = traitEdits[trait.id]
                const displayPct = editVal !== undefined
                  ? `${((parseFloat(editVal) - 1) * 100).toFixed(0)}%`
                  : `${((trait.valueMultiplier - 1) * 100).toFixed(0)}%`
                const isPositive = (editVal !== undefined ? parseFloat(editVal) : trait.valueMultiplier) >= 1
                const hasEdit = editVal !== undefined

                return (
                  <div key={trait.id} className="bg-darkbg-800 px-3 py-2.5 flex items-center gap-2">
                    {trait.localImage && (
                      <Image src={trait.localImage} alt="" width={20} height={20} className="rounded shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{trait.name}</div>
                      <div className={`text-[10px] font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : ''}{displayPct}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        value={editVal ?? trait.valueMultiplier}
                        onChange={(e) => setTraitEdits(prev => ({ ...prev, [trait.id]: e.target.value }))}
                        className="w-14 px-1.5 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-xs font-mono text-right focus:outline-none focus:border-green-500"
                      />
                      {hasEdit && (
                        <button
                          onClick={() => saveTraitValue(trait.id)}
                          disabled={savingTrait === trait.id}
                          className="p-1 text-green-400 hover:text-green-300 transition-colors"
                        >
                          {savingTrait === trait.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Streak Multipliers */}
      {(
        <div className="mb-4">
          <button
            onClick={() => showStreaks ? setShowStreaks(false) : startEditingStreaks()}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            {showStreaks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Trait Streak Multipliers
            <span className="text-xs text-gray-600">
              ({Object.keys(streakConfig).length} thresholds)
            </span>
            {streakMsg && <span className={`text-xs ml-2 ${streakMsg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>{streakMsg}</span>}
          </button>
          {showStreaks && (
            <div className="mt-3 bg-darkbg-800 rounded-xl border border-darkbg-700 p-4">
              <p className="text-xs text-gray-500 mb-3">
                When a brainrot has N or more traits, the total trait bonus is multiplied. e.g. 3 traits threshold with 2x multiplier means the additive bonus is doubled.
              </p>
              <div className="space-y-2">
                {streakEdits.map((row, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 w-16">Traits &ge;</span>
                      <input
                        type="number"
                        min="1"
                        value={row.threshold}
                        onChange={(e) => setStreakEdits(prev => prev.map((r, j) => j === i ? { ...r, threshold: e.target.value } : r))}
                        className="w-16 px-2 py-1.5 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono text-right focus:outline-none focus:border-green-500"
                        placeholder="3"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400">=</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        value={row.multiplier}
                        onChange={(e) => setStreakEdits(prev => prev.map((r, j) => j === i ? { ...r, multiplier: e.target.value } : r))}
                        className="w-16 px-2 py-1.5 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono text-right focus:outline-none focus:border-green-500"
                        placeholder="2"
                      />
                      <span className="text-xs text-gray-400">x bonus</span>
                    </div>
                    <button
                      onClick={() => removeStreakRow(i)}
                      className="p-1 text-red-400 hover:text-red-300 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={addStreakRow}
                  className="px-3 py-1.5 text-xs bg-darkbg-700 hover:bg-darkbg-600 text-gray-300 rounded transition-colors"
                >
                  + Add threshold
                </button>
                <button
                  onClick={saveStreakConfig}
                  disabled={savingStreaks}
                  className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-500 text-white rounded transition-colors flex items-center gap-1.5"
                >
                  {savingStreaks ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search + Demand filter */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search brainrots..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setDemandFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              demandFilter === 'ALL'
                ? 'bg-darkbg-700 text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All ({demandCounts.ALL})
          </button>
          {DEMAND_ORDER.map(level => {
            const config = DEMAND_CONFIG[level]
            const count = demandCounts[level] || 0
            if (count === 0) return null
            return (
              <button
                key={level}
                onClick={() => setDemandFilter(demandFilter === level ? 'ALL' : level)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  demandFilter === level
                    ? `${config.bg} ${config.color} ${config.border}`
                    : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
              >
                {config.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mb-4 flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span className="text-gray-400">Explicit value</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gray-600 rounded" />
          <span className="text-gray-400 italic">Inherited/fallback</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-darkbg-900 rounded-xl border border-darkbg-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-darkbg-800 border-b border-darkbg-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase w-10"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Brainrot
                      <SortIcon field="name" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    <button
                      onClick={() => handleSort('rarity')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Rarity
                      <SortIcon field="rarity" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">
                    <button
                      onClick={() => handleSort('demand')}
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      Demand
                      <SortIcon field="demand" />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trend</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkbg-700">
                {filteredBrainrots.map((brainrot) => {
                  const isExpanded = expandedRows.has(brainrot.id)
                  const hasEdits = hasChanges(brainrot.id)
                  const isSaving = saving === brainrot.id
                  const isSuccess = success === brainrot.id || success === 'submitted'
                  const currentDemand = editedValues[brainrot.id]?.demand ?? brainrot.demand
                  const currentTrend = editedValues[brainrot.id]?.trend ?? brainrot.trend
                  const activeTab = expandedTab[brainrot.id] || 'values'

                  return (
                    <React.Fragment key={brainrot.id}>
                    <motion.tr
                      layout
                      className="hover:bg-darkbg-800/50"
                    >
                      {/* Expand button */}
                      <td className="px-4 py-3 w-10">
                        <button
                          onClick={() => toggleExpanded(brainrot.id)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Brainrot info */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {brainrot.localImage && (
                            <Image src={brainrot.localImage} alt={brainrot.name} width={32} height={32} className="rounded" />
                          )}
                          <div>
                            <span className="text-white font-medium">{brainrot.name}</span>
                            {brainrot.mutationValues.length > 0 && (
                              <div className="text-xs text-gray-500">
                                {brainrot.mutationValues.length} value{brainrot.mutationValues.length !== 1 ? 's' : ''} set
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rarity */}
                      <td className="px-4 py-3 text-gray-400 text-sm">
                        {brainrot.rarity || '-'}
                      </td>

                      {/* Demand */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <DemandBadge demand={currentDemand} />
                          <select
                            value={currentDemand}
                            onChange={(e) => updateDemand(brainrot.id, e.target.value as DemandLevel)}
                            className="w-7 h-7 bg-transparent border border-darkbg-600 rounded text-transparent cursor-pointer focus:outline-none hover:border-darkbg-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M3%205l3%203%203-3%22%2f%3e%3c%2fsvg%3e')] bg-center bg-no-repeat"
                          >
                            <option value="TERRIBLE">Terrible</option>
                            <option value="LOW">Low</option>
                            <option value="NORMAL">Normal</option>
                            <option value="HIGH">High</option>
                            <option value="AMAZING">Amazing</option>
                          </select>
                        </div>
                      </td>

                      {/* Trend */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TrendBadge trend={currentTrend} />
                          <select
                            value={currentTrend}
                            onChange={(e) => updateTrend(brainrot.id, e.target.value as TrendIndicator)}
                            className="w-7 h-7 bg-transparent border border-darkbg-600 rounded text-transparent cursor-pointer focus:outline-none hover:border-darkbg-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%2212%22%20height%3d%2212%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M3%205l3%203%203-3%22%2f%3e%3c%2fsvg%3e')] bg-center bg-no-repeat"
                          >
                            <option value="LOWERING">Lowering</option>
                            <option value="STABLE">Stable</option>
                            <option value="RISING">Rising</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasEdits && (
                            <>
                              <button
                                onClick={() => discardChanges(brainrot.id)}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => saveChanges(brainrot.id)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Save
                              </button>
                            </>
                          )}
                          {isSuccess && !hasEdits && (
                            <span className="text-green-400 text-sm flex items-center gap-1">
                              <Check className="w-4 h-4" /> {success === 'submitted' ? 'Submitted for approval' : 'Saved'}
                            </span>
                          )}
                        </div>
                      </td>
                    </motion.tr>

                    {/* Expanded panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.tr
                          key={`${brainrot.id}-expanded`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td colSpan={6} className="px-4 pb-4 pt-0">
                            <div className="ml-8 border-l-2 border-darkbg-700 pl-4">
                              {/* Tab switcher */}
                              <div className="flex items-center gap-1 mb-3">
                                <button
                                  onClick={() => setExpandedTab(prev => ({ ...prev, [brainrot.id]: 'values' }))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    activeTab === 'values'
                                      ? 'bg-darkbg-700 text-white'
                                      : 'text-gray-500 hover:text-gray-300'
                                  }`}
                                >
                                  <DollarSign className="w-3.5 h-3.5" />
                                  Mutation Values
                                </button>
                                <button
                                  onClick={() => setExpandedTab(prev => ({ ...prev, [brainrot.id]: 'history' }))}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                    activeTab === 'history'
                                      ? 'bg-darkbg-700 text-white'
                                      : 'text-gray-500 hover:text-gray-300'
                                  }`}
                                >
                                  <History className="w-3.5 h-3.5" />
                                  Price History
                                </button>
                              </div>

                              {activeTab === 'values' ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {mutations.map((mutation) => {
                                    const currentValue = getCurrentMutationValue(brainrot, mutation.id)
                                    const effective = getEffectiveValue(brainrot, mutation.id)
                                    const hasExplicitValue = brainrot.mutationValues.some(mv => mv.mutationId === mutation.id)
                                    const isEdited = editedValues[brainrot.id]?.mutations?.[mutation.id] !== undefined
                                    const mv = brainrot.mutationValues.find(mv => mv.mutationId === mutation.id)
                                    const curMutDemand = editedValues[brainrot.id]?.mutationDemand?.[mutation.id] ?? mv?.demand ?? 'NORMAL'
                                    const curMutTrend = editedValues[brainrot.id]?.mutationTrend?.[mutation.id] ?? mv?.trend ?? 'STABLE'

                                    return (
                                      <div key={mutation.id} className="bg-darkbg-800 rounded-lg p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm text-white font-medium">{mutation.name}</span>
                                          <span className="text-xs text-gray-500">{mutation.multiplier}x</span>
                                        </div>
                                        <div className="relative">
                                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                                          <input
                                            type="number"
                                            value={currentValue}
                                            onChange={(e) => updateMutationValue(brainrot.id, mutation.id, e.target.value)}
                                            placeholder={effective.isFallback ? `${effective.value || '0'} (${effective.source})` : '0'}
                                            className={`w-full pl-9 pr-3 py-1.5 bg-darkbg-700 border rounded text-sm font-mono focus:outline-none focus:border-green-500 ${
                                              hasExplicitValue || isEdited
                                                ? 'border-green-600/50 text-white'
                                                : 'border-darkbg-600 text-gray-400 italic'
                                            }`}
                                          />
                                        </div>
                                        {effective.isFallback && !hasExplicitValue && !isEdited && effective.source !== 'none' && (
                                          <div className="mt-1 text-xs text-gray-500 italic">
                                            Inherits from {effective.source}
                                          </div>
                                        )}
                                        {/* Mutation-specific demand/trend */}
                                        {hasExplicitValue && (
                                          <div className="flex items-center gap-2 mt-2">
                                            <div className="flex items-center gap-1">
                                              <DemandBadge demand={curMutDemand} />
                                              <select
                                                value={curMutDemand}
                                                onChange={(e) => updateMutationDemand(brainrot.id, mutation.id, e.target.value as DemandLevel)}
                                                className="w-5 h-5 bg-transparent border border-darkbg-600 rounded text-transparent cursor-pointer focus:outline-none hover:border-darkbg-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%228%22%20height%3d%228%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M3%205l3%203%203-3%22%2f%3e%3c%2fsvg%3e')] bg-center bg-no-repeat"
                                              >
                                                <option value="TERRIBLE">Terrible</option>
                                                <option value="LOW">Low</option>
                                                <option value="NORMAL">Normal</option>
                                                <option value="HIGH">High</option>
                                                <option value="AMAZING">Amazing</option>
                                              </select>
                                            </div>
                                            <div className="flex items-center gap-1">
                                              <TrendBadge trend={curMutTrend} />
                                              <select
                                                value={curMutTrend}
                                                onChange={(e) => updateMutationTrend(brainrot.id, mutation.id, e.target.value as TrendIndicator)}
                                                className="w-5 h-5 bg-transparent border border-darkbg-600 rounded text-transparent cursor-pointer focus:outline-none hover:border-darkbg-500 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg%20xmlns%3d%22http%3a%2f%2fwww.w3.org%2f2000%2fsvg%22%20width%3d%228%22%20height%3d%228%22%20viewBox%3d%220%200%2012%2012%22%3e%3cpath%20fill%3d%22%239ca3af%22%20d%3d%22M3%205l3%203%203-3%22%2f%3e%3c%2fsvg%3e')] bg-center bg-no-repeat"
                                              >
                                                <option value="LOWERING">Lowering</option>
                                                <option value="STABLE">Stable</option>
                                                <option value="RISING">Rising</option>
                                              </select>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <PriceHistoryPanel brainrotId={brainrot.id} mutations={mutations} />
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
            {filteredBrainrots.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                {search ? `No brainrots matching "${search}"` : 'No brainrots found'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
