'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  Database, Search, Save, Loader2, Check, X, RefreshCw, Plus, Trash2,
  Edit2, PlusCircle, MinusCircle, Download, ChevronDown, ChevronRight, ChevronUp, AlertCircle, Upload, ArrowRight, Sparkles
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

// --- Scrape response types ---

interface ScrapedNewBrainrot {
  name: string
  slug: string
  rarity: string | null
  baseCost: string
  baseIncome: string
  imageUrl: string
}

interface BrainrotDiff {
  field: string
  old: string
  new: string
}

interface ScrapedUpdatedBrainrot {
  id: string
  name: string
  diffs: BrainrotDiff[]
  scraped: Record<string, unknown>
}

interface ScrapedRemovedBrainrot {
  id: string
  name: string
  rarity: string | null
}

interface ScrapedNewTrait {
  name: string
  multiplier: number
  imageUrl: string
  category: string
}

interface ScrapedUpdatedTrait {
  id: string
  name: string
  diffs: { field: string; old: string; new: string }[]
}

interface ScrapeResult {
  brainrots: {
    total: number
    new: ScrapedNewBrainrot[]
    updated: ScrapedUpdatedBrainrot[]
    removed: ScrapedRemovedBrainrot[]
    unchanged: number
    existingInDb: number
  }
  traits: {
    total: number
    new: ScrapedNewTrait[]
    updated: ScrapedUpdatedTrait[]
    existingInDb: number
  }
}

interface EditableBrainrot {
  originalName: string
  name: string
  rarity: string
  baseCost: string
  baseIncome: string
  imageUrl: string
  originalImageUrl: string
  approved: boolean
}

interface ApprovableUpdatedBrainrot extends ScrapedUpdatedBrainrot {
  approved: boolean
}

interface ApprovableRemovedBrainrot extends ScrapedRemovedBrainrot {
  approved: boolean
}

interface ApprovableNewTrait extends ScrapedNewTrait {
  approved: boolean
}

interface ApprovableUpdatedTrait extends ScrapedUpdatedTrait {
  approved: boolean
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
  const [updatedBrainrots, setUpdatedBrainrots] = useState<ApprovableUpdatedBrainrot[]>([])
  const [removedBrainrots, setRemovedBrainrots] = useState<ApprovableRemovedBrainrot[]>([])
  const [newTraits, setNewTraits] = useState<ApprovableNewTrait[]>([])
  const [updatedTraits, setUpdatedTraits] = useState<ApprovableUpdatedTrait[]>([])
  const [importing, setImporting] = useState(false)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadingBrainrotId, setUploadingBrainrotId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  // Collapsible sections in scrape modal
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

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

  // Ranking modal state
  const [rankingModalOpen, setRankingModalOpen] = useState(false)
  const [rankingItems, setRankingItems] = useState<Brainrot[]>([])
  const [rankingSearch, setRankingSearch] = useState('')
  const [savingRankings, setSavingRankings] = useState(false)
  const [rankingSaved, setRankingSaved] = useState(false)

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

  // Ranking modal functions
  const openRankingModal = () => {
    const currentNew = brainrots
      .filter(b => b.isNew)
      .sort((a, b) => (a.newDisplayOrder ?? 999) - (b.newDisplayOrder ?? 999))
    setRankingItems(currentNew)
    setRankingSearch('')
    setRankingModalOpen(true)
    setRankingSaved(false)
  }

  const moveRankingItem = (index: number, direction: 'up' | 'down') => {
    setRankingItems(prev => {
      const next = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next
    })
  }

  const removeRankingItem = (index: number) => {
    setRankingItems(prev => prev.filter((_, i) => i !== index))
  }

  const addRankingItem = (brainrot: Brainrot) => {
    if (rankingItems.length >= 12) return
    if (rankingItems.some(r => r.id === brainrot.id)) return
    setRankingItems(prev => [...prev, brainrot])
  }

  const saveRankings = async () => {
    setSavingRankings(true)
    try {
      const res = await fetch('/api/admin/data/brainrots/rankings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rankings: rankingItems.map(b => b.id) }),
      })
      if (res.ok) {
        setBrainrots(prev => prev.map(b => {
          const rankIndex = rankingItems.findIndex(r => r.id === b.id)
          if (rankIndex >= 0) {
            return { ...b, isNew: true, newDisplayOrder: rankIndex + 1 }
          }
          return { ...b, isNew: false, newDisplayOrder: null }
        }))
        setRankingSaved(true)
        setTimeout(() => setRankingSaved(false), 3000)
      }
    } catch (err) {
      console.error('Failed to save rankings')
    }
    setSavingRankings(false)
  }

  const rankingSearchResults = useMemo(() => {
    if (!rankingSearch.trim()) return []
    const q = rankingSearch.toLowerCase()
    return brainrots
      .filter(b => b.isActive && b.name.toLowerCase().includes(q) && !rankingItems.some(r => r.id === b.id))
      .slice(0, 10)
  }, [brainrots, rankingSearch, rankingItems])

  const rarityColor = (rarity: string | null) => {
    if (!rarity) return 'text-gray-400'
    const map: Record<string, string> = {
      common: 'text-green-500', rare: 'text-cyan-400', epic: 'text-purple-400',
      legendary: 'text-yellow-400', mythic: 'text-red-400', secret: 'text-gray-300',
      'brainrot god': 'text-pink-400', og: 'text-yellow-300', admin: 'text-amber-400',
      festive: 'text-red-300',
    }
    return map[rarity.toLowerCase()] || 'text-gray-400'
  }

  const rarityBorder = (rarity: string | null) => {
    if (!rarity) return 'border-darkbg-600'
    const map: Record<string, string> = {
      common: 'border-green-700/60', rare: 'border-cyan-500/60', epic: 'border-purple-600/60',
      legendary: 'border-yellow-500/60', mythic: 'border-red-500/60', secret: 'border-gray-400/60',
      'brainrot god': 'border-pink-500/60', og: 'border-yellow-500/60', admin: 'border-amber-500/60',
      festive: 'border-red-500/60',
    }
    return map[rarity.toLowerCase()] || 'border-darkbg-600'
  }

  // Scraper functions
  const handleScrape = async () => {
    setScraping(true)
    setScrapeResult(null)
    setEditableBrainrots([])
    setUpdatedBrainrots([])
    setRemovedBrainrots([])
    setNewTraits([])
    setUpdatedTraits([])
    setCollapsedSections({})

    try {
      const res = await fetch('/api/admin/scrape-brainrots')
      const data: ScrapeResult = await res.json()

      if (res.ok) {
        setScrapeResult(data)

        // Initialize editable new brainrots (values come pre-parsed from API)
        const editable: EditableBrainrot[] = (data.brainrots.new || []).map((b: ScrapedNewBrainrot) => ({
          originalName: b.name,
          name: b.name,
          rarity: b.rarity || '',
          baseCost: b.baseCost,
          baseIncome: b.baseIncome,
          imageUrl: b.imageUrl,
          originalImageUrl: b.imageUrl,
          approved: false,
        }))
        setEditableBrainrots(editable)

        // Initialize updated brainrots with approve checkboxes
        setUpdatedBrainrots((data.brainrots.updated || []).map(b => ({ ...b, approved: false })))

        // Initialize removed brainrots with approve checkboxes
        setRemovedBrainrots((data.brainrots.removed || []).map(b => ({ ...b, approved: false })))

        // Initialize new traits with approve checkboxes
        setNewTraits((data.traits.new || []).map(t => ({ ...t, approved: false })))

        // Initialize updated traits with approve checkboxes
        setUpdatedTraits((data.traits.updated || []).map(t => ({ ...t, approved: false })))
      } else {
        console.error('Scrape failed:', data)
      }
    } catch (err) {
      console.error('Scrape error:', err)
    }
    setScraping(false)
  }

  const handleImport = async () => {
    const approvedNewBrainrots = editableBrainrots.filter(b => b.approved)
    const approvedUpdatedBrainrots = updatedBrainrots.filter(b => b.approved)
    const approvedRemovedBrainrots = removedBrainrots.filter(b => b.approved)
    const approvedNewTraits = newTraits.filter(t => t.approved)
    const approvedUpdatedTraitsList = updatedTraits.filter(t => t.approved)

    const totalApproved = approvedNewBrainrots.length + approvedUpdatedBrainrots.length +
      approvedRemovedBrainrots.length + approvedNewTraits.length + approvedUpdatedTraitsList.length

    if (totalApproved === 0) return

    setImporting(true)

    try {
      // Build typed action arrays for the new POST body format
      const brainrotActions: Record<string, unknown>[] = []

      for (const b of approvedNewBrainrots) {
        brainrotActions.push({
          type: 'create',
          name: b.name,
          rarity: b.rarity || null,
          baseCost: b.baseCost,
          baseIncome: b.baseIncome,
          imageUrl: b.imageUrl,
          originalImageUrl: b.originalImageUrl,
        })
      }

      for (const b of approvedUpdatedBrainrots) {
        const fields: Record<string, string> = {}
        for (const diff of b.diffs) {
          fields[diff.field] = diff.new
        }
        brainrotActions.push({
          type: 'update',
          id: b.id,
          fields,
        })
      }

      for (const b of approvedRemovedBrainrots) {
        brainrotActions.push({
          type: 'deactivate',
          id: b.id,
        })
      }

      const traitActions: Record<string, unknown>[] = []

      for (const t of approvedNewTraits) {
        traitActions.push({
          type: 'create',
          name: t.name,
          multiplier: t.multiplier,
          imageUrl: t.imageUrl,
        })
      }

      for (const t of approvedUpdatedTraitsList) {
        const action: Record<string, unknown> = {
          type: 'update',
          id: t.id,
        }
        for (const d of t.diffs) {
          if (d.field === 'multiplier') action.multiplier = parseFloat(d.new.replace('x', ''))
          if (d.field === 'name') action.name = d.new
        }
        traitActions.push(action)
      }

      const res = await fetch('/api/admin/scrape-brainrots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brainrots: brainrotActions,
          traits: traitActions,
        }),
      })

      if (res.ok) {
        await fetchData()
        setScrapeModalOpen(false)
        setScrapeResult(null)
        setEditableBrainrots([])
        setUpdatedBrainrots([])
        setRemovedBrainrots([])
        setNewTraits([])
        setUpdatedTraits([])
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
    setUpdatedBrainrots(prev => prev.map(b => ({ ...b, approved: true })))
    setRemovedBrainrots(prev => prev.map(b => ({ ...b, approved: true })))
    setNewTraits(prev => prev.map(t => ({ ...t, approved: true })))
    setUpdatedTraits(prev => prev.map(t => ({ ...t, approved: true })))
  }

  const unapproveAll = () => {
    setEditableBrainrots(prev => prev.map(b => ({ ...b, approved: false })))
    setUpdatedBrainrots(prev => prev.map(b => ({ ...b, approved: false })))
    setRemovedBrainrots(prev => prev.map(b => ({ ...b, approved: false })))
    setNewTraits(prev => prev.map(t => ({ ...t, approved: false })))
    setUpdatedTraits(prev => prev.map(t => ({ ...t, approved: false })))
  }

  const approvedCount = editableBrainrots.filter(b => b.approved).length +
    updatedBrainrots.filter(b => b.approved).length +
    removedBrainrots.filter(b => b.approved).length +
    newTraits.filter(t => t.approved).length +
    updatedTraits.filter(t => t.approved).length

  const toggleSection = (key: string) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const hasAnyChanges = editableBrainrots.length > 0 || updatedBrainrots.length > 0 ||
    removedBrainrots.length > 0 || newTraits.length > 0 || updatedTraits.length > 0

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

  // Handle image upload for existing brainrots in the data table
  const handleExistingBrainrotImageUpload = async (brainrotId: string, slug: string, file: File) => {
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

    setUploadingBrainrotId(brainrotId)
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
        // Update the brainrot in state with the new local image
        setBrainrots(prev => prev.map(b =>
          b.id === brainrotId ? { ...b, localImage: data.localImage } : b
        ))

        // Also save to database immediately
        const saveRes = await fetch(`/api/admin/data/brainrots/${brainrotId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ localImage: data.localImage }),
        })

        if (saveRes.ok) {
          setUploadSuccess(`Image uploaded and saved!`)
          setTimeout(() => setUploadSuccess(null), 3000)
        } else {
          setUploadError('Image uploaded but failed to save to database.')
          setTimeout(() => setUploadError(null), 5000)
        }
      } else {
        setUploadError(data.error || 'Upload failed. Please try again.')
        setTimeout(() => setUploadError(null), 5000)
      }
    } catch (err) {
      console.error('Upload failed:', err)
      setUploadError('Upload failed. Please check your connection and try again.')
      setTimeout(() => setUploadError(null), 5000)
    }
    setUploadingBrainrotId(null)
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
            onClick={openRankingModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Manage New
            {brainrots.filter(b => b.isNew).length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-800 text-amber-200 text-xs font-medium rounded-full">
                {brainrots.filter(b => b.isNew).length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setScrapeModalOpen(true)
              handleScrape()
            }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Scrape Wiki
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

      {/* Upload Status Alerts */}
      {uploadError && !scrapeModalOpen && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-sm">{uploadError}</span>
        </div>
      )}
      {uploadSuccess && !scrapeModalOpen && (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-800 rounded-lg flex items-center gap-2">
          <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
          <span className="text-green-300 text-sm">{uploadSuccess}</span>
        </div>
      )}

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
                            <label className="relative flex-shrink-0 group cursor-pointer" title="Click to change image">
                              {brainrot.localImage ? (
                                <Image src={brainrot.localImage} alt={brainrot.name} width={48} height={48} className="rounded-lg object-cover w-12 h-12" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-darkbg-700 flex items-center justify-center border-2 border-dashed border-darkbg-600">
                                  <Upload className="w-5 h-5 text-gray-500" />
                                </div>
                              )}
                              {/* Always visible edit indicator */}
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center border-2 border-darkbg-900 group-hover:bg-green-500 transition-colors">
                                {uploadingBrainrotId === brainrot.id ? (
                                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                                ) : (
                                  <Edit2 className="w-3 h-3 text-white" />
                                )}
                              </div>
                              {/* Hover overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                <Upload className="w-5 h-5 text-white" />
                              </div>
                              <input
                                type="file"
                                accept=".png,.jpg,.jpeg,.webp,.gif,image/png,image/jpeg,image/webp,image/gif"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    handleExistingBrainrotImageUpload(brainrot.id, brainrot.slug, file)
                                    e.target.value = ''
                                  }
                                }}
                                disabled={uploadingBrainrotId !== null}
                              />
                            </label>
                            <input
                              type="text"
                              value={edits.name !== undefined ? edits.name : brainrot.name}
                              onChange={(e) => setEditedBrainrots(prev => ({
                                ...prev,
                                [brainrot.id]: { ...prev[brainrot.id], name: e.target.value }
                              }))}
                              className="w-40 px-2 py-1 bg-darkbg-700 border border-darkbg-600 rounded text-white text-sm font-medium focus:outline-none focus:border-green-500"
                            />
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
              className="bg-darkbg-900 rounded-2xl border border-darkbg-700 w-full max-w-4xl max-h-[80vh] overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-darkbg-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Scrape Wiki</h2>
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
                    <p className="text-gray-400">Scraping wiki...</p>
                  </div>
                ) : scrapeResult ? (
                  <div>
                    {/* Stats Bar */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
                      <div className="bg-darkbg-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{scrapeResult.brainrots.total}</div>
                        <div className="text-xs text-gray-500">Wiki Total</div>
                      </div>
                      <div className="bg-green-900/30 border border-green-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-green-400">{scrapeResult.brainrots.new.length}</div>
                        <div className="text-xs text-green-500">New</div>
                      </div>
                      <div className="bg-amber-900/30 border border-amber-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-amber-400">{scrapeResult.brainrots.updated.length}</div>
                        <div className="text-xs text-amber-500">Updated</div>
                      </div>
                      <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-red-400">{scrapeResult.brainrots.removed.length}</div>
                        <div className="text-xs text-red-500">Removed</div>
                      </div>
                      <div className="bg-darkbg-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-white">{scrapeResult.brainrots.unchanged}</div>
                        <div className="text-xs text-gray-500">Unchanged</div>
                      </div>
                      <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-400">{scrapeResult.traits.new.length + scrapeResult.traits.updated.length}</div>
                        <div className="text-xs text-blue-500">Trait Changes</div>
                      </div>
                    </div>

                    {hasAnyChanges ? (
                      <>
                        {/* Approve/Unapprove All */}
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white">
                            Review & Approve Changes
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

                        <div className="space-y-4">
                          {/* ===== NEW BRAINROTS SECTION (Green) ===== */}
                          {editableBrainrots.length > 0 && (
                            <div className="border border-green-800/50 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleSection('newBrainrots')}
                                className="w-full px-4 py-3 bg-green-900/20 flex items-center justify-between hover:bg-green-900/30 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {collapsedSections['newBrainrots'] ? (
                                    <ChevronRight className="w-4 h-4 text-green-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-green-400" />
                                  )}
                                  <PlusCircle className="w-4 h-4 text-green-400" />
                                  <span className="font-semibold text-green-300">New Brainrots</span>
                                </div>
                                <span className="px-2 py-0.5 bg-green-800/50 text-green-300 text-xs font-medium rounded-full">
                                  {editableBrainrots.length}
                                </span>
                              </button>

                              {!collapsedSections['newBrainrots'] && (
                                <div className="p-4 space-y-3">
                                  {editableBrainrots.map((brainrot, index) => (
                                    <div
                                      key={brainrot.originalName}
                                      className={`bg-darkbg-800 rounded-lg transition-colors overflow-hidden ${
                                        brainrot.approved ? 'ring-2 ring-green-500' : ''
                                      }`}
                                    >
                                      <div className="p-4 flex items-start gap-4">
                                        {/* Image with upload */}
                                        <div className="relative flex-shrink-0 group">
                                          {brainrot.imageUrl ? (
                                            <img
                                              src={brainrot.imageUrl}
                                              alt={brainrot.name}
                                              referrerPolicy="no-referrer"
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
                              )}
                            </div>
                          )}

                          {/* ===== UPDATED BRAINROTS SECTION (Amber) ===== */}
                          {updatedBrainrots.length > 0 && (
                            <div className="border border-amber-800/50 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleSection('updatedBrainrots')}
                                className="w-full px-4 py-3 bg-amber-900/20 flex items-center justify-between hover:bg-amber-900/30 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {collapsedSections['updatedBrainrots'] ? (
                                    <ChevronRight className="w-4 h-4 text-amber-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-amber-400" />
                                  )}
                                  <Edit2 className="w-4 h-4 text-amber-400" />
                                  <span className="font-semibold text-amber-300">Updated Brainrots</span>
                                </div>
                                <span className="px-2 py-0.5 bg-amber-800/50 text-amber-300 text-xs font-medium rounded-full">
                                  {updatedBrainrots.length}
                                </span>
                              </button>

                              {!collapsedSections['updatedBrainrots'] && (
                                <div className="p-4 space-y-3">
                                  {updatedBrainrots.map((brainrot, index) => (
                                    <div
                                      key={brainrot.id}
                                      className={`bg-darkbg-800 rounded-lg overflow-hidden transition-colors ${
                                        brainrot.approved ? 'ring-2 ring-amber-500' : ''
                                      }`}
                                    >
                                      <div className="px-4 py-3 flex items-center justify-between">
                                        <div className="text-white font-medium">{brainrot.name}</div>
                                        {/* Approve checkbox */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          <span className="text-xs text-gray-500">
                                            {brainrot.approved ? 'Approved' : 'Approve'}
                                          </span>
                                          <button
                                            onClick={() => setUpdatedBrainrots(prev => {
                                              const next = [...prev]
                                              next[index] = { ...next[index], approved: !next[index].approved }
                                              return next
                                            })}
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                                              brainrot.approved
                                                ? 'bg-amber-600 text-white'
                                                : 'bg-darkbg-700 text-gray-400 hover:text-white'
                                            }`}
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="px-4 pb-3 space-y-1.5">
                                        {brainrot.diffs.map((diff, di) => (
                                          <div key={di} className="text-sm">
                                            <span className="text-gray-500">{diff.field}: </span>
                                            <span className="text-red-400 font-mono line-through break-all">{diff.field === 'imageUrl' ? '(old image)' : diff.old}</span>
                                            <span className="text-gray-600 mx-1.5">&rarr;</span>
                                            <span className="text-green-400 font-mono break-all">{diff.field === 'imageUrl' ? '(new image)' : diff.new}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ===== REMOVED BRAINROTS SECTION (Red) ===== */}
                          {removedBrainrots.length > 0 && (
                            <div className="border border-red-800/50 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleSection('removedBrainrots')}
                                className="w-full px-4 py-3 bg-red-900/20 flex items-center justify-between hover:bg-red-900/30 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {collapsedSections['removedBrainrots'] ? (
                                    <ChevronRight className="w-4 h-4 text-red-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-red-400" />
                                  )}
                                  <MinusCircle className="w-4 h-4 text-red-400" />
                                  <span className="font-semibold text-red-300">Removed Brainrots</span>
                                </div>
                                <span className="px-2 py-0.5 bg-red-800/50 text-red-300 text-xs font-medium rounded-full">
                                  {removedBrainrots.length}
                                </span>
                              </button>

                              {!collapsedSections['removedBrainrots'] && (
                                <div className="p-4 space-y-2">
                                  {removedBrainrots.map((brainrot, index) => (
                                    <div
                                      key={brainrot.id}
                                      className={`bg-darkbg-800 rounded-lg px-4 py-3 flex items-center justify-between transition-colors ${
                                        brainrot.approved ? 'ring-2 ring-red-500' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <span className="text-white font-medium">{brainrot.name}</span>
                                        {brainrot.rarity && (
                                          <span className="text-xs text-gray-500 bg-darkbg-700 px-2 py-0.5 rounded">{brainrot.rarity}</span>
                                        )}
                                        <span className="text-xs text-red-400">Will be deactivated</span>
                                      </div>

                                      {/* Approve checkbox */}
                                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={() => setRemovedBrainrots(prev => {
                                            const next = [...prev]
                                            next[index] = { ...next[index], approved: !next[index].approved }
                                            return next
                                          })}
                                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                            brainrot.approved
                                              ? 'bg-red-600 text-white'
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
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ===== NEW TRAITS SECTION (Blue) ===== */}
                          {newTraits.length > 0 && (
                            <div className="border border-blue-800/50 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleSection('newTraits')}
                                className="w-full px-4 py-3 bg-blue-900/20 flex items-center justify-between hover:bg-blue-900/30 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {collapsedSections['newTraits'] ? (
                                    <ChevronRight className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-blue-400" />
                                  )}
                                  <PlusCircle className="w-4 h-4 text-blue-400" />
                                  <span className="font-semibold text-blue-300">New Traits</span>
                                </div>
                                <span className="px-2 py-0.5 bg-blue-800/50 text-blue-300 text-xs font-medium rounded-full">
                                  {newTraits.length}
                                </span>
                              </button>

                              {!collapsedSections['newTraits'] && (
                                <div className="p-4 space-y-2">
                                  {newTraits.map((trait, index) => (
                                    <div
                                      key={trait.name}
                                      className={`bg-darkbg-800 rounded-lg px-4 py-3 flex items-center justify-between transition-colors ${
                                        trait.approved ? 'ring-2 ring-blue-500' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-4 min-w-0">
                                        {trait.imageUrl ? (
                                          <img src={trait.imageUrl} alt={trait.name} referrerPolicy="no-referrer" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                        ) : (
                                          <div className="w-10 h-10 rounded bg-darkbg-700 flex items-center justify-center flex-shrink-0">
                                            <Plus className="w-4 h-4 text-gray-500" />
                                          </div>
                                        )}
                                        <div className="min-w-0">
                                          <div className="text-white font-medium">{trait.name}</div>
                                          <div className="text-sm text-gray-500 flex items-center gap-3 flex-wrap">
                                            <span>Multiplier: <span className="text-blue-400 font-mono">{trait.multiplier}x</span></span>
                                            {trait.category && <span className="text-xs bg-darkbg-700 px-2 py-0.5 rounded">{trait.category}</span>}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Approve checkbox */}
                                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={() => setNewTraits(prev => {
                                            const next = [...prev]
                                            next[index] = { ...next[index], approved: !next[index].approved }
                                            return next
                                          })}
                                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                            trait.approved
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-darkbg-700 text-gray-400 hover:text-white'
                                          }`}
                                        >
                                          <Check className="w-5 h-5" />
                                        </button>
                                        <span className="text-xs text-gray-500">
                                          {trait.approved ? 'Approved' : 'Approve'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* ===== UPDATED TRAITS SECTION (Blue) ===== */}
                          {updatedTraits.length > 0 && (
                            <div className="border border-blue-800/50 rounded-lg overflow-hidden">
                              <button
                                onClick={() => toggleSection('updatedTraits')}
                                className="w-full px-4 py-3 bg-blue-900/20 flex items-center justify-between hover:bg-blue-900/30 transition-colors"
                              >
                                <div className="flex items-center gap-2">
                                  {collapsedSections['updatedTraits'] ? (
                                    <ChevronRight className="w-4 h-4 text-blue-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-blue-400" />
                                  )}
                                  <Edit2 className="w-4 h-4 text-blue-400" />
                                  <span className="font-semibold text-blue-300">Updated Traits</span>
                                </div>
                                <span className="px-2 py-0.5 bg-blue-800/50 text-blue-300 text-xs font-medium rounded-full">
                                  {updatedTraits.length}
                                </span>
                              </button>

                              {!collapsedSections['updatedTraits'] && (
                                <div className="p-4 space-y-2">
                                  {updatedTraits.map((trait, index) => (
                                    <div
                                      key={trait.id}
                                      className={`bg-darkbg-800 rounded-lg px-4 py-3 flex items-center justify-between transition-colors ${
                                        trait.approved ? 'ring-2 ring-blue-500' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 flex-wrap">
                                        <span className="text-white font-medium">{trait.name}</span>
                                        {trait.diffs.map((d, di) => (
                                          <div key={di} className="flex items-center gap-2 text-sm">
                                            <span className="text-gray-500 text-xs">{d.field}:</span>
                                            <span className="text-red-400 font-mono line-through">{d.old}</span>
                                            <ArrowRight className="w-3 h-3 text-gray-500" />
                                            <span className="text-green-400 font-mono">{d.new}</span>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Approve checkbox */}
                                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                        <button
                                          onClick={() => setUpdatedTraits(prev => {
                                            const next = [...prev]
                                            next[index] = { ...next[index], approved: !next[index].approved }
                                            return next
                                          })}
                                          className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                                            trait.approved
                                              ? 'bg-blue-600 text-white'
                                              : 'bg-darkbg-700 text-gray-400 hover:text-white'
                                          }`}
                                        >
                                          <Check className="w-5 h-5" />
                                        </button>
                                        <span className="text-xs text-gray-500">
                                          {trait.approved ? 'Approved' : 'Approve'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 bg-darkbg-800 rounded-lg">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <p className="text-white font-medium">All up to date!</p>
                        <p className="text-gray-500 text-sm mt-1">No new, updated, or removed items found.</p>
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

                {hasAnyChanges && (
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
                        Import {approvedCount} Approved Change{approvedCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ranking Modal */}
      <AnimatePresence>
        {rankingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => !savingRankings && setRankingModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-darkbg-900 rounded-2xl border border-darkbg-700 w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-darkbg-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">New Brainrots</h2>
                    <p className="text-xs text-gray-500">Manage the home page showcase ({rankingItems.length}/12)</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {rankingSaved && (
                    <span className="text-green-400 text-sm flex items-center gap-1">
                      <Check className="w-4 h-4" /> Saved
                    </span>
                  )}
                  <button
                    onClick={saveRankings}
                    disabled={savingRankings}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {savingRankings ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => setRankingModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Preview Section - mimics home page carousel */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Preview</h3>
                  {rankingItems.length === 0 ? (
                    <div className="bg-darkbg-800 rounded-xl border border-dashed border-darkbg-600 p-8 text-center">
                      <Sparkles className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Add brainrots below to see a preview</p>
                    </div>
                  ) : (
                    <div className="bg-darkbg-950 rounded-xl border border-darkbg-700 p-4 overflow-x-auto">
                      <div className="flex gap-3" style={{ scrollbarWidth: 'none' }}>
                        {rankingItems.map((brainrot) => (
                          <div
                            key={brainrot.id}
                            className={`relative flex-shrink-0 w-[120px] bg-gradient-to-b from-darkbg-800 to-darkbg-850 rounded-xl border-2 ${rarityBorder(brainrot.rarity)} transition-all`}
                          >
                            <div className="aspect-square relative p-2">
                              {brainrot.localImage ? (
                                <Image
                                  src={brainrot.localImage}
                                  alt={brainrot.name}
                                  fill
                                  className="object-contain p-1 drop-shadow-lg"
                                  sizes="120px"
                                />
                              ) : (
                                <div className="absolute inset-2 bg-darkbg-700 rounded-lg flex items-center justify-center">
                                  <span className="text-gray-500 text-xs">No img</span>
                                </div>
                              )}
                            </div>
                            <div className="px-2 pb-2 text-center">
                              <div className="h-px mb-1.5 rounded-full bg-gradient-to-r from-transparent via-darkbg-600 to-transparent" />
                              <p className="text-white font-bold text-xs truncate">{brainrot.name}</p>
                              {brainrot.rarity && (
                                <p className={`text-[10px] font-semibold ${rarityColor(brainrot.rarity)}`}>{brainrot.rarity}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ranked List */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Rankings ({rankingItems.length}/12)
                  </h3>
                  {rankingItems.length > 0 ? (
                    <div className="space-y-1.5">
                      {rankingItems.map((brainrot, index) => (
                        <div
                          key={brainrot.id}
                          className="flex items-center gap-3 bg-darkbg-800 rounded-lg px-3 py-2 group hover:bg-darkbg-750"
                        >
                          <span className="text-amber-500 font-bold text-sm w-6 text-center">{index + 1}</span>
                          <div className="w-8 h-8 rounded flex-shrink-0 relative overflow-hidden bg-darkbg-700">
                            {brainrot.localImage ? (
                              <Image src={brainrot.localImage} alt={brainrot.name} fill className="object-cover" sizes="32px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-600 text-[8px]">?</span>
                              </div>
                            )}
                          </div>
                          <span className="text-white font-medium text-sm flex-1 truncate">{brainrot.name}</span>
                          {brainrot.rarity && (
                            <span className={`text-xs font-semibold ${rarityColor(brainrot.rarity)}`}>{brainrot.rarity}</span>
                          )}
                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => moveRankingItem(index, 'up')}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveRankingItem(index, 'down')}
                              disabled={index === rankingItems.length - 1}
                              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeRankingItem(index)}
                              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No brainrots in the showcase yet.</p>
                  )}
                </div>

                {/* Add Brainrots Search */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Add Brainrots</h3>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search brainrots to add..."
                      value={rankingSearch}
                      onChange={(e) => setRankingSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
                    />
                    {rankingSearch && (
                      <button
                        onClick={() => setRankingSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {rankingItems.length >= 12 && (
                    <p className="text-amber-400 text-xs mb-2">Maximum 12 brainrots reached.</p>
                  )}
                  {rankingSearch.trim() && rankingSearchResults.length === 0 && (
                    <p className="text-gray-500 text-sm py-2">No matching brainrots found.</p>
                  )}
                  {rankingSearchResults.length > 0 && (
                    <div className="space-y-1">
                      {rankingSearchResults.map((brainrot) => (
                        <div
                          key={brainrot.id}
                          className="flex items-center gap-3 bg-darkbg-800 rounded-lg px-3 py-2 hover:bg-darkbg-750"
                        >
                          <div className="w-8 h-8 rounded flex-shrink-0 relative overflow-hidden bg-darkbg-700">
                            {brainrot.localImage ? (
                              <Image src={brainrot.localImage} alt={brainrot.name} fill className="object-cover" sizes="32px" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-gray-600 text-[8px]">?</span>
                              </div>
                            )}
                          </div>
                          <span className="text-white font-medium text-sm flex-1 truncate">{brainrot.name}</span>
                          {brainrot.rarity && (
                            <span className={`text-xs font-semibold ${rarityColor(brainrot.rarity)}`}>{brainrot.rarity}</span>
                          )}
                          <button
                            onClick={() => addRankingItem(brainrot)}
                            disabled={rankingItems.length >= 12}
                            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded transition-colors disabled:opacity-30"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
