'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  DollarSign, Search, Save, Loader2, Check, X, RefreshCw,
  ChevronDown, ChevronRight
} from 'lucide-react'

interface MutationValue {
  mutationId: string
  robuxValue: number
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
  mutationValues: MutationValue[]
}

interface Mutation {
  id: string
  name: string
  multiplier: number
}

interface EditedValue {
  base?: string | null
  mutations?: Record<string, string | null>
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

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/usd-values')
      const data = await res.json()
      setBrainrots(data.brainrots || [])
      setMutations(data.mutations || [])
    } catch (err) {
      console.error('Failed to fetch data')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const toggleExpanded = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const updateBaseValue = (brainrotId: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [brainrotId]: {
        ...prev[brainrotId],
        base: value === '' ? null : value,
      },
    }))
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
    return edited.base !== undefined || (edited.mutations && Object.keys(edited.mutations).length > 0)
  }

  const saveChanges = async (brainrotId: string) => {
    const edited = editedValues[brainrotId]
    if (!edited) return

    setSaving(brainrotId)
    try {
      const updates: Array<{ brainrotId: string; mutationId?: string; robuxValue: string | null }> = []

      // Base value update
      if (edited.base !== undefined) {
        updates.push({ brainrotId, robuxValue: edited.base })
      }

      // Mutation-specific updates
      if (edited.mutations) {
        for (const [mutationId, value] of Object.entries(edited.mutations)) {
          updates.push({ brainrotId, mutationId, robuxValue: value })
        }
      }

      if (updates.length > 0) {
        const res = await fetch('/api/admin/usd-values/mutation-values', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        })

        if (res.ok) {
          // Refresh data
          await fetchData()
          // Clear edited state for this brainrot
          setEditedValues(prev => {
            const next = { ...prev }
            delete next[brainrotId]
            return next
          })
          setSuccess(brainrotId)
          setTimeout(() => setSuccess(null), 2000)
        }
      }
    } catch (err) {
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

  // Get effective value for a mutation (with fallback logic)
  const getEffectiveValue = (brainrot: Brainrot, mutationId: string): { value: number | null; isFallback: boolean; source: string } => {
    // Check for explicit value
    const explicitValue = brainrot.mutationValues.find(mv => mv.mutationId === mutationId)
    if (explicitValue) {
      return { value: explicitValue.robuxValue, isFallback: false, source: 'explicit' }
    }

    // Get the target mutation's multiplier
    const targetMutation = mutations.find(m => m.id === mutationId)
    if (!targetMutation) {
      return { value: brainrot.robuxValue, isFallback: true, source: 'base' }
    }

    // Find next lower mutation with a value
    const sortedMutations = [...mutations].sort((a, b) => b.multiplier - a.multiplier)
    for (const mutation of sortedMutations) {
      if (mutation.multiplier < targetMutation.multiplier) {
        const fallbackValue = brainrot.mutationValues.find(mv => mv.mutationId === mutation.id)
        if (fallbackValue) {
          return { value: fallbackValue.robuxValue, isFallback: true, source: mutation.name }
        }
      }
    }

    // Fall back to base value
    return { value: brainrot.robuxValue, isFallback: true, source: 'base' }
  }

  const getCurrentValue = (brainrot: Brainrot, type: 'base' | 'mutation', mutationId?: string): string => {
    const edited = editedValues[brainrot.id]
    if (type === 'base') {
      if (edited?.base !== undefined) {
        return edited.base ?? ''
      }
      return brainrot.robuxValue?.toString() ?? ''
    } else if (mutationId) {
      if (edited?.mutations?.[mutationId] !== undefined) {
        return edited.mutations[mutationId] ?? ''
      }
      const mutationValue = brainrot.mutationValues.find(mv => mv.mutationId === mutationId)
      return mutationValue?.robuxValue?.toString() ?? ''
    }
    return ''
  }

  const filteredBrainrots = useMemo(() =>
    brainrots.filter(b => b.name.toLowerCase().includes(search.toLowerCase())),
    [brainrots, search]
  )

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
            <p className="text-sm text-gray-500">Set Robux market values for brainrots and mutations</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Brainrot</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Rarity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Base Robux Value</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-darkbg-700">
                {filteredBrainrots.map((brainrot) => {
                  const isExpanded = expandedRows.has(brainrot.id)
                  const hasEdits = hasChanges(brainrot.id)
                  const isSaving = saving === brainrot.id
                  const isSuccess = success === brainrot.id

                  return (
                    <motion.tr
                      key={brainrot.id}
                      layout
                      className="hover:bg-darkbg-800/50"
                    >
                      <td colSpan={5} className="p-0">
                        {/* Main row */}
                        <div className="flex items-center px-4 py-3">
                          {/* Expand button */}
                          <button
                            onClick={() => toggleExpanded(brainrot.id)}
                            className="p-1 text-gray-400 hover:text-white transition-colors mr-2"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>

                          {/* Brainrot info */}
                          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                            {brainrot.localImage && (
                              <Image src={brainrot.localImage} alt={brainrot.name} width={32} height={32} className="rounded" />
                            )}
                            <span className="text-white font-medium">{brainrot.name}</span>
                          </div>

                          {/* Rarity */}
                          <div className="w-24 text-gray-400 text-sm">
                            {brainrot.rarity || '-'}
                          </div>

                          {/* Base Robux Value */}
                          <div className="w-40">
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                              <input
                                type="number"
                                value={getCurrentValue(brainrot, 'base')}
                                onChange={(e) => updateBaseValue(brainrot.id, e.target.value)}
                                placeholder="0"
                                className="w-full pl-9 pr-3 py-1.5 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-green-500"
                              />
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-2 ml-4 min-w-[140px]">
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
                                <Check className="w-4 h-4" /> Saved
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expanded mutation values */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-2 ml-8 border-l-2 border-darkbg-700">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-3">
                                  Mutation-Specific Values
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                  {mutations.map((mutation) => {
                                    const currentValue = getCurrentValue(brainrot, 'mutation', mutation.id)
                                    const effective = getEffectiveValue(brainrot, mutation.id)
                                    const hasExplicitValue = brainrot.mutationValues.some(mv => mv.mutationId === mutation.id)
                                    const isEdited = editedValues[brainrot.id]?.mutations?.[mutation.id] !== undefined

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
                                        {effective.isFallback && !hasExplicitValue && !isEdited && (
                                          <div className="mt-1 text-xs text-gray-500 italic">
                                            Inherits from {effective.source}
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
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
