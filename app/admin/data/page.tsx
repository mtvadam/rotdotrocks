'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Database, Search, Save, Loader2, Check, X, RefreshCw } from 'lucide-react'

type Tab = 'brainrots' | 'traits' | 'mutations'

interface Brainrot {
  id: string
  name: string
  slug: string
  baseCost: string
  baseIncome: string
  rarity: string | null
  isActive: boolean
  localImage: string | null
}

interface Trait {
  id: string
  name: string
  multiplier: number
  isActive: boolean
  localImage: string | null
}

interface Mutation {
  id: string
  name: string
  multiplier: number
  isActive: boolean
}

export default function DataManagementPage() {
  const [tab, setTab] = useState<Tab>('brainrots')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [brainrots, setBrainrots] = useState<Brainrot[]>([])
  const [traits, setTraits] = useState<Trait[]>([])
  const [mutations, setMutations] = useState<Mutation[]>([])

  // Track edited values
  const [editedBrainrots, setEditedBrainrots] = useState<Record<string, Partial<Brainrot>>>({})
  const [editedTraits, setEditedTraits] = useState<Record<string, Partial<Trait>>>({})
  const [editedMutations, setEditedMutations] = useState<Record<string, Partial<Mutation>>>({})

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/data')
      const data = await res.json()
      setBrainrots(data.brainrots || [])
      setTraits(data.traits || [])
      setMutations(data.mutations || [])
    } catch (err) {
      console.error('Failed to fetch data')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const saveBrainrot = async (id: string) => {
    const edits = editedBrainrots[id]
    if (!edits) return

    setSaving(id)
    try {
      const res = await fetch(`/api/admin/data/brainrots/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      })
      if (res.ok) {
        const data = await res.json()
        setBrainrots(prev => prev.map(b => b.id === id ? data.brainrot : b))
        setEditedBrainrots(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        setSuccess(id)
        setTimeout(() => setSuccess(null), 2000)
      }
    } catch (err) {
      console.error('Failed to save')
    }
    setSaving(null)
  }

  const saveTrait = async (id: string) => {
    const edits = editedTraits[id]
    if (!edits) return

    setSaving(id)
    try {
      const res = await fetch(`/api/admin/data/traits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      })
      if (res.ok) {
        const data = await res.json()
        setTraits(prev => prev.map(t => t.id === id ? data.trait : t))
        setEditedTraits(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        setSuccess(id)
        setTimeout(() => setSuccess(null), 2000)
      }
    } catch (err) {
      console.error('Failed to save')
    }
    setSaving(null)
  }

  const saveMutation = async (id: string) => {
    const edits = editedMutations[id]
    if (!edits) return

    setSaving(id)
    try {
      const res = await fetch(`/api/admin/data/mutations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(edits),
      })
      if (res.ok) {
        const data = await res.json()
        setMutations(prev => prev.map(m => m.id === id ? data.mutation : m))
        setEditedMutations(prev => {
          const next = { ...prev }
          delete next[id]
          return next
        })
        setSuccess(id)
        setTimeout(() => setSuccess(null), 2000)
      }
    } catch (err) {
      console.error('Failed to save')
    }
    setSaving(null)
  }

  const formatNumber = (numStr: string): string => {
    const num = BigInt(numStr)
    return num.toLocaleString()
  }

  const filteredBrainrots = brainrots.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredTraits = traits.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredMutations = mutations.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { id: 'brainrots' as Tab, label: 'Brainrots', count: brainrots.length },
    { id: 'traits' as Tab, label: 'Traits', count: traits.length },
    { id: 'mutations' as Tab, label: 'Mutations', count: mutations.length },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Database className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Data Management</h1>
            <p className="text-sm text-gray-500">Update values instantly without server restart</p>
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

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 p-1 bg-darkbg-800 rounded-xl">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`
                relative px-4 py-2 rounded-lg font-medium transition-colors
                ${tab === t.id ? 'text-white' : 'text-gray-400 hover:text-white'}
              `}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="data-tab"
                  className="absolute inset-0 bg-green-600 rounded-lg"
                  transition={{ duration: 0.2 }}
                />
              )}
              <span className="relative z-10">
                {t.label} <span className="text-xs opacity-60">({t.count})</span>
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={`Search ${tab}...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-darkbg-900 rounded-xl border border-darkbg-700 overflow-hidden">
          {/* Brainrots Table */}
          {tab === 'brainrots' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-darkbg-800 border-b border-darkbg-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Brainrot</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Rarity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Base Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Base Income</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Active</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkbg-700">
                  {filteredBrainrots.map((brainrot) => {
                    const edits = editedBrainrots[brainrot.id] || {}
                    const hasChanges = Object.keys(edits).length > 0
                    const isSaving = saving === brainrot.id
                    const isSuccess = success === brainrot.id

                    return (
                      <tr key={brainrot.id} className="hover:bg-darkbg-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {brainrot.localImage && (
                              <Image src={brainrot.localImage} alt={brainrot.name} width={32} height={32} className="rounded" />
                            )}
                            <span className="text-white font-medium">{brainrot.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={edits.rarity !== undefined ? (edits.rarity || '') : (brainrot.rarity || '')}
                            onChange={(e) => setEditedBrainrots(prev => ({
                              ...prev,
                              [brainrot.id]: { ...prev[brainrot.id], rarity: e.target.value }
                            }))}
                            className="w-24 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                            placeholder="None"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={edits.baseCost !== undefined ? edits.baseCost : brainrot.baseCost}
                            onChange={(e) => setEditedBrainrots(prev => ({
                              ...prev,
                              [brainrot.id]: { ...prev[brainrot.id], baseCost: e.target.value }
                            }))}
                            className="w-32 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={edits.baseIncome !== undefined ? edits.baseIncome : brainrot.baseIncome}
                            onChange={(e) => setEditedBrainrots(prev => ({
                              ...prev,
                              [brainrot.id]: { ...prev[brainrot.id], baseIncome: e.target.value }
                            }))}
                            className="w-32 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-green-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditedBrainrots(prev => ({
                              ...prev,
                              [brainrot.id]: { ...prev[brainrot.id], isActive: !(edits.isActive !== undefined ? edits.isActive : brainrot.isActive) }
                            }))}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              (edits.isActive !== undefined ? edits.isActive : brainrot.isActive)
                                ? 'bg-green-500'
                                : 'bg-darkbg-600'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                              (edits.isActive !== undefined ? edits.isActive : brainrot.isActive)
                                ? 'translate-x-4'
                                : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasChanges && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditedBrainrots(prev => {
                                  const next = { ...prev }
                                  delete next[brainrot.id]
                                  return next
                                })}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => saveBrainrot(brainrot.id)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isSuccess ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Save
                              </button>
                            </div>
                          )}
                          {isSuccess && !hasChanges && (
                            <span className="text-green-400 text-sm flex items-center gap-1 justify-end">
                              <Check className="w-4 h-4" /> Saved
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredBrainrots.length === 0 && (
                <div className="text-center py-10 text-gray-500">No brainrots found</div>
              )}
            </div>
          )}

          {/* Traits Table */}
          {tab === 'traits' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-darkbg-800 border-b border-darkbg-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Trait</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Multiplier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Active</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkbg-700">
                  {filteredTraits.map((trait) => {
                    const edits = editedTraits[trait.id] || {}
                    const hasChanges = Object.keys(edits).length > 0
                    const isSaving = saving === trait.id
                    const isSuccess = success === trait.id

                    return (
                      <tr key={trait.id} className="hover:bg-darkbg-800/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {trait.localImage && (
                              <Image src={trait.localImage} alt={trait.name} width={32} height={32} className="rounded" />
                            )}
                            <span className="text-white font-medium">{trait.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              value={edits.multiplier !== undefined ? edits.multiplier : trait.multiplier}
                              onChange={(e) => setEditedTraits(prev => ({
                                ...prev,
                                [trait.id]: { ...prev[trait.id], multiplier: parseFloat(e.target.value) }
                              }))}
                              className="w-24 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-green-500"
                            />
                            <span className="text-gray-500 text-sm">x</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditedTraits(prev => ({
                              ...prev,
                              [trait.id]: { ...prev[trait.id], isActive: !(edits.isActive !== undefined ? edits.isActive : trait.isActive) }
                            }))}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              (edits.isActive !== undefined ? edits.isActive : trait.isActive)
                                ? 'bg-green-500'
                                : 'bg-darkbg-600'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                              (edits.isActive !== undefined ? edits.isActive : trait.isActive)
                                ? 'translate-x-4'
                                : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasChanges && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditedTraits(prev => {
                                  const next = { ...prev }
                                  delete next[trait.id]
                                  return next
                                })}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => saveTrait(trait.id)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isSuccess ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Save
                              </button>
                            </div>
                          )}
                          {isSuccess && !hasChanges && (
                            <span className="text-green-400 text-sm flex items-center gap-1 justify-end">
                              <Check className="w-4 h-4" /> Saved
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredTraits.length === 0 && (
                <div className="text-center py-10 text-gray-500">No traits found</div>
              )}
            </div>
          )}

          {/* Mutations Table */}
          {tab === 'mutations' && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-darkbg-800 border-b border-darkbg-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Mutation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Multiplier</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Active</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-darkbg-700">
                  {filteredMutations.map((mutation) => {
                    const edits = editedMutations[mutation.id] || {}
                    const hasChanges = Object.keys(edits).length > 0
                    const isSaving = saving === mutation.id
                    const isSuccess = success === mutation.id

                    return (
                      <tr key={mutation.id} className="hover:bg-darkbg-800/50">
                        <td className="px-4 py-3">
                          <span className="text-white font-medium">{mutation.name}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              step="0.1"
                              value={edits.multiplier !== undefined ? edits.multiplier : mutation.multiplier}
                              onChange={(e) => setEditedMutations(prev => ({
                                ...prev,
                                [mutation.id]: { ...prev[mutation.id], multiplier: parseFloat(e.target.value) }
                              }))}
                              className="w-24 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-green-500"
                            />
                            <span className="text-gray-500 text-sm">x</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditedMutations(prev => ({
                              ...prev,
                              [mutation.id]: { ...prev[mutation.id], isActive: !(edits.isActive !== undefined ? edits.isActive : mutation.isActive) }
                            }))}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              (edits.isActive !== undefined ? edits.isActive : mutation.isActive)
                                ? 'bg-green-500'
                                : 'bg-darkbg-600'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                              (edits.isActive !== undefined ? edits.isActive : mutation.isActive)
                                ? 'translate-x-4'
                                : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {hasChanges && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditedMutations(prev => {
                                  const next = { ...prev }
                                  delete next[mutation.id]
                                  return next
                                })}
                                className="p-1.5 text-gray-400 hover:text-white transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => saveMutation(mutation.id)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : isSuccess ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Save className="w-4 h-4" />
                                )}
                                Save
                              </button>
                            </div>
                          )}
                          {isSuccess && !hasChanges && (
                            <span className="text-green-400 text-sm flex items-center gap-1 justify-end">
                              <Check className="w-4 h-4" /> Saved
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredMutations.length === 0 && (
                <div className="text-center py-10 text-gray-500">No mutations found</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
