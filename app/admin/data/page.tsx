'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Database, Search, Save, Loader2, Check, X, RefreshCw, Plus, Trash2,
  Edit2, PlusCircle, MinusCircle, Download, ChevronDown, AlertCircle, Upload
} from 'lucide-react'

type Tab = 'brainrots' | 'traits' | 'mutations'

interface DataItem {
  [key: string]: unknown
  id: string
  name: string
  isActive: boolean
}

interface Brainrot extends DataItem {
  slug: string
  baseCost: string
  baseIncome: string
  rarity: string | null
  localImage: string | null
  isNew: boolean
  newDisplayOrder: number | null
}

interface Trait extends DataItem {
  multiplier: number
  localImage: string | null
}

interface Mutation extends DataItem {
  multiplier: number
}

interface ScrapedBrainrot {
  name: string
  rarity: string | null
  income: string
  imageUrl: string
  description: string
  event: string | null
  similarTo?: string
  similarityScore?: number
}

interface EditableBrainrot {
  originalName: string
  name: string
  rarity: string
  baseCost: string
  baseIncome: string
  imageUrl: string
  approved: boolean
  similarTo?: string
  similarityScore?: number
}

interface ScrapeResult {
  total: number
  new: ScrapedBrainrot[]
  existing: number
  existingInDb: number
}

// Parse income like "$60.0M", "$1.2B" to raw number string
function parseIncomeToNumber(incomeStr: string): string {
  const cleaned = incomeStr.replace(/[$,]/g, '').trim()
  const match = cleaned.match(/^([\d.]+)([KMBT])?$/i)
  if (!match) return '0'

  const num = parseFloat(match[1])
  const suffix = (match[2] || '').toUpperCase()

  let multiplier = 1
  switch (suffix) {
    case 'K': multiplier = 1_000; break
    case 'M': multiplier = 1_000_000; break
    case 'B': multiplier = 1_000_000_000; break
    case 'T': multiplier = 1_000_000_000_000; break
  }

  return Math.floor(num * multiplier).toString()
}

const TAB_LABELS: Record<Tab, string> = {
  brainrots: 'Brainrots',
  traits: 'Traits',
  mutations: 'Mutations',
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

  // Scraper state
  const [scrapeModalOpen, setScrapeModalOpen] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null)
  const [editableBrainrots, setEditableBrainrots] = useState<EditableBrainrot[]>([])
  const [importing, setImporting] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

  // Add new item modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newItemData, setNewItemData] = useState<Record<string, string>>({})

  // Delete confirmation
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string | null; name: string }>({
    isOpen: false,
    id: null,
    name: '',
  })
  const [deleting, setDeleting] = useState(false)

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

  const handleDelete = async () => {
    if (!deleteModal.id) return

    setDeleting(true)
    try {
      const endpoint = tab === 'brainrots'
        ? `/api/admin/data/brainrots/${deleteModal.id}`
        : tab === 'traits'
        ? `/api/admin/data/traits/${deleteModal.id}`
        : `/api/admin/data/mutations/${deleteModal.id}`

      const res = await fetch(endpoint, { method: 'DELETE' })

      if (res.ok) {
        if (tab === 'brainrots') {
          setBrainrots(prev => prev.filter(b => b.id !== deleteModal.id))
        } else if (tab === 'traits') {
          setTraits(prev => prev.filter(t => t.id !== deleteModal.id))
        } else {
          setMutations(prev => prev.filter(m => m.id !== deleteModal.id))
        }
        setDeleteModal({ isOpen: false, id: null, name: '' })
      }
    } catch (err) {
      console.error('Failed to delete')
    }
    setDeleting(false)
  }

  // Scraper functions
  const handleScrape = async () => {
    setScraping(true)
    setScrapeResult(null)
    setEditableBrainrots([])

    try {
      const res = await fetch('/api/admin/scrape-brainrots')
      const data = await res.json()

      if (res.ok) {
        setScrapeResult(data)
        // Initialize editable brainrots with parsed values
        const editable: EditableBrainrot[] = data.new.map((b: ScrapedBrainrot) => {
          const baseIncome = parseIncomeToNumber(b.income)
          // Estimate baseCost as 50x income (can be edited)
          const baseCost = (BigInt(baseIncome) * BigInt(50)).toString()
          return {
            originalName: b.name,
            name: b.name,
            rarity: b.rarity || '',
            baseCost,
            baseIncome,
            imageUrl: b.imageUrl,
            approved: false,
            similarTo: b.similarTo,
            similarityScore: b.similarityScore,
          }
        })
        setEditableBrainrots(editable)
      } else {
        console.error('Scrape failed:', data.error)
      }
    } catch (err) {
      console.error('Scrape error:', err)
    }
    setScraping(false)
  }

  const handleImport = async () => {
    const approvedBrainrots = editableBrainrots.filter(b => b.approved)
    if (approvedBrainrots.length === 0) return

    setImporting(true)

    try {
      const res = await fetch('/api/admin/scrape-brainrots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brainrots: approvedBrainrots.map(b => ({
            name: b.name,
            rarity: b.rarity || null,
            baseCost: b.baseCost,
            baseIncome: b.baseIncome,
            imageUrl: b.imageUrl,
          })),
        }),
      })

      const data = await res.json()
      if (res.ok) {
        await fetchData()
        setScrapeModalOpen(false)
        setScrapeResult(null)
        setEditableBrainrots([])
      }
    } catch (err) {
      console.error('Import error:', err)
    }
    setImporting(false)
  }

  const updateEditableBrainrot = (index: number, field: keyof EditableBrainrot, value: string | boolean) => {
    setEditableBrainrots(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const approveAll = () => {
    setEditableBrainrots(prev => prev.map(b => ({ ...b, approved: true })))
  }

  const unapproveAll = () => {
    setEditableBrainrots(prev => prev.map(b => ({ ...b, approved: false })))
  }

  const approvedCount = editableBrainrots.filter(b => b.approved).length

  const handleImageUpload = async (index: number, file: File) => {
    const brainrot = editableBrainrots[index]
    if (!brainrot) return

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      setUploadError(`Invalid file type. Only PNG, JPEG, WebP, and GIF are allowed.`)
      setTimeout(() => setUploadError(null), 5000)
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(`File too large. Maximum size is 5MB.`)
      setTimeout(() => setUploadError(null), 5000)
      return
    }

    // Create slug from name
    const slug = brainrot.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')

    setUploadingIndex(index)
    setUploadError(null)
    setUploadSuccess(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('slug', slug)

      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (res.ok && data.localImage) {
        // Update the brainrot with the new local image path
        setEditableBrainrots(prev => {
          const next = [...prev]
          next[index] = { ...next[index], imageUrl: data.localImage }
          return next
        })
        setUploadSuccess(`Image uploaded successfully: ${data.filename || file.name}`)
        setTimeout(() => setUploadSuccess(null), 3000)
      } else {
        setUploadError(data.error || 'Upload failed. Please try again.')
        setTimeout(() => setUploadError(null), 5000)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError('Upload failed. Please check your connection and try again.')
      setTimeout(() => setUploadError(null), 5000)
    }
    setUploadingIndex(null)
  }

  const filteredBrainrots = useMemo(() =>
    brainrots.filter(b => b.name.toLowerCase().includes(search.toLowerCase())),
    [brainrots, search]
  )

  const filteredTraits = useMemo(() =>
    traits.filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
    [traits, search]
  )

  const filteredMutations = useMemo(() =>
    mutations.filter(m => m.name.toLowerCase().includes(search.toLowerCase())),
    [mutations, search]
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setScrapeModalOpen(true)
              handleScrape()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Scrape New Brainrots
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">New</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Order</th>
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
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setEditedBrainrots(prev => ({
                              ...prev,
                              [brainrot.id]: { ...prev[brainrot.id], isNew: !(edits.isNew !== undefined ? edits.isNew : brainrot.isNew) }
                            }))}
                            className={`w-10 h-6 rounded-full transition-colors ${
                              (edits.isNew !== undefined ? edits.isNew : brainrot.isNew)
                                ? 'bg-amber-500'
                                : 'bg-darkbg-600'
                            }`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${
                              (edits.isNew !== undefined ? edits.isNew : brainrot.isNew)
                                ? 'translate-x-4'
                                : 'translate-x-0'
                            }`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            min="1"
                            placeholder="-"
                            value={edits.newDisplayOrder !== undefined ? (edits.newDisplayOrder ?? '') : (brainrot.newDisplayOrder ?? '')}
                            onChange={(e) => setEditedBrainrots(prev => ({
                              ...prev,
                              [brainrot.id]: { ...prev[brainrot.id], newDisplayOrder: e.target.value === '' ? null : parseInt(e.target.value) }
                            }))}
                            disabled={!(edits.isNew !== undefined ? edits.isNew : brainrot.isNew)}
                            className="w-16 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-amber-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {hasChanges && (
                              <>
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
                              </>
                            )}
                            {isSuccess && !hasChanges && (
                              <span className="text-green-400 text-sm flex items-center gap-1">
                                <Check className="w-4 h-4" /> Saved
                              </span>
                            )}
                            {!hasChanges && !isSuccess && (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, id: brainrot.id, name: brainrot.name })}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
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
                          <div className="flex items-center justify-end gap-2">
                            {hasChanges && (
                              <>
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
                              </>
                            )}
                            {isSuccess && !hasChanges && (
                              <span className="text-green-400 text-sm flex items-center gap-1">
                                <Check className="w-4 h-4" /> Saved
                              </span>
                            )}
                            {!hasChanges && !isSuccess && (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, id: trait.id, name: trait.name })}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredTraits.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  {search ? `No traits matching "${search}"` : 'No traits found'}
                </div>
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
                          <div className="flex items-center justify-end gap-2">
                            {hasChanges && (
                              <>
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
                              </>
                            )}
                            {isSuccess && !hasChanges && (
                              <span className="text-green-400 text-sm flex items-center gap-1">
                                <Check className="w-4 h-4" /> Saved
                              </span>
                            )}
                            {!hasChanges && !isSuccess && (
                              <button
                                onClick={() => setDeleteModal({ isOpen: true, id: mutation.id, name: mutation.name })}
                                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filteredMutations.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                  {search ? `No mutations matching "${search}"` : 'No mutations found'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scrape Modal */}
      <AnimatePresence>
        {scrapeModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !scraping && !importing && setScrapeModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-darkbg-900 rounded-2xl border border-darkbg-700 w-full max-w-2xl max-h-[80vh] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-darkbg-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Scrape Brainrots</h2>
                <button
                  onClick={() => setScrapeModalOpen(false)}
                  disabled={scraping || importing}
                  className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {scraping ? (
                  <div className="text-center py-10">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Scraping steal-a-brainrot.org...</p>
                  </div>
                ) : scrapeResult ? (
                  <div>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="bg-darkbg-800 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-white">{scrapeResult.total}</div>
                        <div className="text-sm text-gray-500">Total Found</div>
                      </div>
                      <div className="bg-green-900/30 border border-green-800 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">{scrapeResult.new.length}</div>
                        <div className="text-sm text-green-500">New Brainrots</div>
                      </div>
                      <div className="bg-darkbg-800 rounded-lg p-4 text-center">
                        <div className="text-2xl font-bold text-white">{scrapeResult.existingInDb}</div>
                        <div className="text-sm text-gray-500">In Database</div>
                      </div>
                    </div>

                    {editableBrainrots.length > 0 ? (
                      <>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">
                            Review & Approve New Brainrots
                          </h3>
                          <div className="flex gap-2">
                            <button
                              onClick={approveAll}
                              className="text-sm text-green-400 hover:text-green-300"
                            >
                              Approve All
                            </button>
                            <span className="text-gray-600">|</span>
                            <button
                              onClick={unapproveAll}
                              className="text-sm text-gray-400 hover:text-white"
                            >
                              Unapprove All
                            </button>
                          </div>
                        </div>

                        {/* Upload Error Alert */}
                        {uploadError && (
                          <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <span className="text-red-300 text-sm">{uploadError}</span>
                          </div>
                        )}
                        
                        {/* Upload Success Alert */}
                        {uploadSuccess && (
                          <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-center gap-2">
                            <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                            <span className="text-green-300 text-sm">{uploadSuccess}</span>
                          </div>
                        )}

                        <div className="space-y-3 mb-4">
                          {editableBrainrots.map((brainrot, index) => (
                            <div
                              key={brainrot.originalName}
                              className={`bg-darkbg-800 rounded-lg transition-colors overflow-hidden ${
                                brainrot.approved ? 'ring-2 ring-green-500' : ''
                              } ${brainrot.similarTo ? 'ring-2 ring-yellow-500/50' : ''}`}
                            >
                              {/* Similarity warning */}
                              {brainrot.similarTo && (
                                <div className="px-4 py-2 bg-yellow-900/30 border-b border-yellow-800/50 flex items-center gap-2">
                                  <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                                  <span className="text-yellow-300 text-sm">
                                    Similar to existing: <strong>{brainrot.similarTo}</strong>
                                    <span className="text-yellow-500 ml-1">({brainrot.similarityScore}% match)</span>
                                  </span>
                                </div>
                              )}
                              <div className="p-4 flex items-start gap-4">
                                {/* Image with upload */}
                                <div className="relative flex-shrink-0 group">
                                  {brainrot.imageUrl ? (
                                    <img
                                      src={brainrot.imageUrl}
                                      alt={brainrot.name}
                                      className="w-16 h-16 rounded object-cover"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded bg-darkbg-700 flex items-center justify-center">
                                      <Upload className="w-6 h-6 text-gray-500" />
                                    </div>
                                  )}
                                  <label 
                                    className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded"
                                    title="Upload PNG, JPEG, WebP, or GIF (max 5MB)"
                                  >
                                    {uploadingIndex === index ? (
                                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                                    ) : (
                                      <Upload className="w-5 h-5 text-white" />
                                    )}
                                    <input
                                      type="file"
                                      accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          handleImageUpload(index, file)
                                          // Reset input so same file can be selected again if needed
                                          e.target.value = ''
                                        }
                                      }}
                                      disabled={uploadingIndex !== null}
                                    />
                                  </label>
                                </div>
                                <div className="flex-1 min-w-0 space-y-3">
                                  {/* Row 1: Name & Rarity */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Name</label>
                                      <input
                                        type="text"
                                        value={brainrot.name}
                                        onChange={(e) => updateEditableBrainrot(index, 'name', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Rarity</label>
                                      <input
                                        type="text"
                                        value={brainrot.rarity}
                                        onChange={(e) => updateEditableBrainrot(index, 'rarity', e.target.value)}
                                        placeholder="e.g. Common, Rare, Epic"
                                        className="w-full px-3 py-1.5 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Row 2: Base Cost & Base Income */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Base Cost</label>
                                      <input
                                        type="text"
                                        value={brainrot.baseCost}
                                        onChange={(e) => updateEditableBrainrot(index, 'baseCost', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-green-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Base Income ($/sec)</label>
                                      <input
                                        type="text"
                                        value={brainrot.baseIncome}
                                        onChange={(e) => updateEditableBrainrot(index, 'baseIncome', e.target.value)}
                                        className="w-full px-3 py-1.5 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-mono focus:outline-none focus:border-green-500"
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Approve checkbox */}
                                <div className="flex flex-col items-center gap-1">
                                  <button
                                    onClick={() => updateEditableBrainrot(index, 'approved', !brainrot.approved)}
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                      brainrot.approved
                                        ? 'bg-green-600 text-white'
                                        : 'bg-darkbg-700 text-gray-400 hover:text-white'
                                    }`}
                                  >
                                    <Check className="w-5 h-5" />
                                  </button>
                                  <span className="text-xs text-gray-500">
                                    {brainrot.approved ? 'Approved' : 'Approve'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 bg-darkbg-800 rounded-lg">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-white font-medium">All brainrots are already in the database!</p>
                        <p className="text-gray-500 text-sm mt-1">No new brainrots to import.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Failed to scrape. Try again.</p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-darkbg-700 flex items-center justify-between bg-darkbg-800/50">
                <button
                  onClick={handleScrape}
                  disabled={scraping || importing}
                  className="flex items-center gap-2 px-4 py-2 bg-darkbg-700 hover:bg-darkbg-600 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${scraping ? 'animate-spin' : ''}`} />
                  Re-scrape
                </button>

                {editableBrainrots.length > 0 && (
                  <button
                    onClick={handleImport}
                    disabled={importing || approvedCount === 0}
                    className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Import {approvedCount} Approved Brainrot{approvedCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteModal({ isOpen: false, id: null, name: '' })}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-darkbg-900 rounded-2xl border border-darkbg-700 w-full max-w-md p-6"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Delete {TAB_LABELS[tab].slice(0, -1)}</h3>
                <p className="text-gray-400">
                  Are you sure you want to delete <span className="text-white font-medium">{deleteModal.name}</span>?
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModal({ isOpen: false, id: null, name: '' })}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
