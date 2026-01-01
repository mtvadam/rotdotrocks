'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Search, X, Plus, Check, ArrowDownUp, ArrowLeft, Flag, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { TruncatedText } from '@/components/ui'
import { formatIncome } from '@/lib/utils'
import { easeOut, modalVariants, backdropVariants, staggerContainer, staggerChild } from '@/lib/animations'

interface Brainrot {
  id: string
  name: string
  localImage: string | null
  baseIncome: string
  rarity: string | null
}

interface Mutation {
  id: string
  name: string
  multiplier: number
}

interface Trait {
  id: string
  name: string
  localImage: string | null
  multiplier: number
}


// Module-level cache so data persists across modal opens
const dataCache: {
  brainrots: Brainrot[]
  mutations: Mutation[]
  traits: Trait[]
  loaded: boolean
  imagesPreloaded: boolean
  loading: boolean
} = {
  brainrots: [],
  mutations: [],
  traits: [],
  loaded: false,
  imagesPreloaded: false,
  loading: false,
}

// Prefetch picker data - call this on page load for instant picker
export function prefetchPickerData() {
  if (dataCache.loaded || dataCache.loading) return
  dataCache.loading = true

  Promise.all([
    fetch('/api/brainrots').then((r) => r.json()),
    fetch('/api/mutations').then((r) => r.json()),
    fetch('/api/traits').then((r) => r.json()),
  ]).then(([b, m, t]) => {
    dataCache.brainrots = b.brainrots || []
    dataCache.mutations = m.mutations || []
    dataCache.traits = t.traits || []
    dataCache.loaded = true
    dataCache.loading = false
    preloadImages(dataCache.brainrots)
  })
}

// Preload all brainrot images for instant display
function preloadImages(brainrots: Brainrot[]) {
  if (dataCache.imagesPreloaded) return
  dataCache.imagesPreloaded = true

  // Preload images in batches to avoid overwhelming the browser
  const batchSize = 20
  let index = 0

  const loadBatch = () => {
    const batch = brainrots.slice(index, index + batchSize)
    batch.forEach((brainrot) => {
      if (brainrot.localImage) {
        const img = new window.Image()
        img.src = brainrot.localImage
      }
    })
    index += batchSize
    if (index < brainrots.length) {
      // Load next batch after a short delay
      setTimeout(loadBatch, 50)
    }
  }

  loadBatch()
}

interface SelectedItem {
  brainrotId: string
  brainrot: Brainrot
  mutationId?: string
  mutation?: Mutation
  traitIds?: string[]
  traits?: Trait[]
  calculatedIncome?: string
}

interface InitialItem {
  brainrotId: string
  brainrot: {
    id: string
    name: string
    localImage: string | null
    baseIncome: string
  }
  mutationId?: string
  mutation?: {
    id: string
    name: string
    multiplier: number
  }
  traitIds?: string[]
  traits?: Array<{
    id: string
    name: string
    localImage: string | null
    multiplier: number
  }>
}

interface BrainrotPickerProps {
  onSelect: (item: SelectedItem) => void
  onClose: () => void
  initialItem?: InitialItem
}

function getMutationClass(name: string): string {
  const lowerName = name.toLowerCase()
  switch (lowerName) {
    case 'gold': return 'mutation-gold'
    case 'diamond': return 'mutation-diamond'
    case 'rainbow': return 'mutation-rainbow'
    case 'bloodrot':
    case 'bloodroot': return 'mutation-bloodrot'
    case 'candy': return 'mutation-candy'
    case 'lava': return 'mutation-lava'
    case 'galaxy': return 'mutation-galaxy'
    case 'yin yang':
    case 'yinyang': return 'mutation-yinyang'
    case 'radioactive': return 'mutation-radioactive'
    default: return 'text-gray-400'
  }
}

function getRarityClass(rarity: string | null): string {
  if (!rarity) return 'text-gray-400'
  const r = rarity.toLowerCase()
  if (r === 'common') return 'rarity-common'
  if (r === 'rare') return 'rarity-rare'
  if (r === 'epic') return 'rarity-epic'
  if (r === 'legendary') return 'rarity-legendary'
  if (r === 'mythic') return 'rarity-mythic'
  if (r === 'brainrot god' || r === 'god') return 'rarity-god animation-always-running'
  if (r === 'secret') return 'rarity-secret animation-always-running'
  if (r === 'festive') return 'rarity-festive animation-always-running'
  if (r === 'og') return 'rarity-og animation-always-running'
  if (r === 'admin') return 'rarity-admin animation-always-running'
  return 'text-gray-400'
}

function BrainrotTileSkeleton() {
  return (
    <div className="p-2 rounded-xl bg-darkbg-800 animate-pulse aspect-square flex flex-col items-center justify-center">
      <div className="w-12 h-12 rounded-lg bg-darkbg-700" />
      <div className="mt-2 h-3 w-16 rounded bg-darkbg-700" />
    </div>
  )
}

export function BrainrotPicker({ onSelect, onClose, initialItem }: BrainrotPickerProps) {
  const [search, setSearch] = useState('')
  // Initialize from cache immediately if available
  const [brainrots, setBrainrots] = useState<Brainrot[]>(dataCache.brainrots)
  const [mutations, setMutations] = useState<Mutation[]>(dataCache.mutations)
  const [traits, setTraits] = useState<Trait[]>(dataCache.traits)
  const [loading, setLoading] = useState(!dataCache.loaded)

  // Initialize from initialItem if editing
  const [selectedBrainrot, setSelectedBrainrot] = useState<Brainrot | null>(
    initialItem ? {
      id: initialItem.brainrot.id,
      name: initialItem.brainrot.name,
      localImage: initialItem.brainrot.localImage,
      baseIncome: initialItem.brainrot.baseIncome,
      rarity: null,
    } : null
  )
  const [selectedMutation, setSelectedMutation] = useState<Mutation | null>(
    initialItem?.mutation ? {
      id: initialItem.mutation.id,
      name: initialItem.mutation.name,
      multiplier: initialItem.mutation.multiplier,
    } : null
  )
  const [selectedTraits, setSelectedTraits] = useState<Trait[]>(
    initialItem?.traits?.map(t => ({
      id: t.id,
      name: t.name,
      localImage: t.localImage,
      multiplier: t.multiplier,
    })) || []
  )
  const [traitSearch, setTraitSearch] = useState('')
  const [traitSortAsc, setTraitSortAsc] = useState(false)
  const [showTraitsFade, setShowTraitsFade] = useState(true)
  const [view, setView] = useState<'picker' | 'report'>('picker')
  const [reportType, setReportType] = useState('CALCULATION_FORMULA')
  const [reportDescription, setReportDescription] = useState('')
  const [reportExpected, setReportExpected] = useState('')
  const [reportActual, setReportActual] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  const isEditing = !!initialItem

  const handleTraitsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 10
    setShowTraitsFade(!isAtBottom)
  }

  const calculatedIncome = selectedBrainrot
    ? (() => {
        const baseIncome = BigInt(selectedBrainrot.baseIncome)
        const mutationMultiplier = selectedMutation?.multiplier ?? 1

        // Check for sleepy trait (halves income)
        const hasSleepy = selectedTraits.some(t => t.name.toLowerCase() === 'sleepy')
        const sleepyMultiplier = hasSleepy ? 0.5 : 1

        // Get traits excluding sleepy for multiplier calculation
        const traitsForCalc = selectedTraits.filter(t => t.name.toLowerCase() !== 'sleepy')

        let combinedMultiplier: number
        if (traitsForCalc.length === 0) {
          // No traits: just mutation
          combinedMultiplier = mutationMultiplier
        } else if (traitsForCalc.length === 1) {
          // Single trait: trait + (mutation - 1)
          combinedMultiplier = traitsForCalc[0].multiplier + (mutationMultiplier - 1)
        } else {
          // Multiple traits: first negates 1, rest are full
          // Example: 3x 6x traits = (6-1) + 6 + 6 = 17 (with default mutation)
          // With Gold 2x: (6-1) + 6 + 6 + (2-1) = 18
          const firstTrait = traitsForCalc[0].multiplier - 1
          const otherTraits = traitsForCalc.slice(1).reduce((sum, t) => sum + t.multiplier, 0)
          // 5 + 12 + 0 = 17 for 3x6x with default 1x mutation
          // 5 + 12 + 1 = 18 for 3x6x with Gold 2x mutation
          combinedMultiplier = firstTrait + otherTraits + (mutationMultiplier - 1)
        }

        // Apply sleepy multiplier at the end to avoid BigInt integer division issues
        // Use 10000x scaling for precision with small values like 0.5
        const finalMultiplier = combinedMultiplier * sleepyMultiplier
        const scaledIncome = baseIncome * BigInt(Math.round(finalMultiplier * 10000))
        const income = scaledIncome / BigInt(10000)
        const remainder = scaledIncome % BigInt(10000)

        // If there's a fractional part, include it in the display
        if (remainder > 0 && income === BigInt(0)) {
          // For very small values like 0.5, show the decimal
          const decimal = Number(scaledIncome) / 10000
          return decimal.toString()
        }
        return income.toString()
      })()
    : null

  useEffect(() => {
    // Use cached data if available
    if (dataCache.loaded) {
      setBrainrots(dataCache.brainrots)
      setMutations(dataCache.mutations)
      setTraits(dataCache.traits)
      setLoading(false)
      // Preload images (no-op if already done)
      preloadImages(dataCache.brainrots)
      return
    }

    // Fetch and cache
    Promise.all([
      fetch('/api/brainrots').then((r) => r.json()),
      fetch('/api/mutations').then((r) => r.json()),
      fetch('/api/traits').then((r) => r.json()),
    ]).then(([b, m, t]) => {
      const brainrotsData = b.brainrots || []
      const mutationsData = m.mutations || []
      const traitsData = t.traits || []

      // Cache the data
      dataCache.brainrots = brainrotsData
      dataCache.mutations = mutationsData
      dataCache.traits = traitsData
      dataCache.loaded = true

      // Preload all images in background
      preloadImages(brainrotsData)

      setBrainrots(brainrotsData)
      setMutations(mutationsData)
      setTraits(traitsData)
      setLoading(false)
    })
  }, [])

  const filteredBrainrots = brainrots.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  // Filter and sort traits by multiplier
  const sortedTraits = traits
    .filter((t) => t.name.toLowerCase().includes(traitSearch.toLowerCase()))
    .sort((a, b) => traitSortAsc ? a.multiplier - b.multiplier : b.multiplier - a.multiplier)

  const handleConfirm = () => {
    if (!selectedBrainrot) return
    onSelect({
      brainrotId: selectedBrainrot.id,
      brainrot: selectedBrainrot,
      mutationId: selectedMutation?.id,
      mutation: selectedMutation || undefined,
      traitIds: selectedTraits.map((t) => t.id),
      traits: selectedTraits,
      calculatedIncome: calculatedIncome || undefined,
    })
  }

  const toggleTrait = (trait: Trait) => {
    setSelectedTraits((prev) =>
      prev.find((t) => t.id === trait.id)
        ? prev.filter((t) => t.id !== trait.id)
        : [...prev, trait]
    )
  }

  const handleReportSubmit = async () => {
    if (!reportDescription.trim()) {
      setReportError('Please provide a description')
      return
    }
    setReportLoading(true)
    setReportError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: reportType,
          description: reportDescription,
          expectedValue: reportExpected || undefined,
          actualValue: reportActual || undefined,
          brainrotId: selectedBrainrot?.id,
          traitId: selectedTraits[0]?.id,
          mutationId: selectedMutation?.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      setReportSuccess(true)
      setTimeout(() => {
        setView('picker')
        setReportType('CALCULATION_FORMULA')
        setReportDescription('')
        setReportExpected('')
        setReportActual('')
        setReportSuccess(false)
      }, 1500)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to submit')
    }
    setReportLoading(false)
  }

  const REPORT_TYPES = [
    { value: 'BRAINROT_VALUE', label: 'Incorrect Brainrot Value' },
    { value: 'TRAIT_MULTIPLIER', label: 'Incorrect Trait Multiplier' },
    { value: 'MUTATION_MULTIPLIER', label: 'Incorrect Mutation Multiplier' },
    { value: 'CALCULATION_FORMULA', label: 'Calculation Formula Bug' },
    { value: 'OTHER', label: 'Other Issue' },
  ]

  return (
    <AnimatePresence>
      <motion.div
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md"
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="bg-darkbg-900/90 backdrop-blur-xl rounded-2xl w-full max-w-2xl h-[80vh] mx-4 overflow-hidden flex flex-col shadow-2xl border border-darkbg-700"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-darkbg-700">
            <div className="flex items-center gap-2">
              {view === 'report' && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setView('picker')}
                  className="p-2 rounded-lg hover:bg-darkbg-800 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </motion.button>
              )}
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                {view === 'report' && <Flag className="w-5 h-5 text-orange-400" />}
                {view === 'picker' ? (isEditing ? 'Edit Item' : 'Select Brainrot') : 'Report an Issue'}
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-darkbg-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </motion.button>
          </div>

          {view === 'picker' && loading ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4">
                <div className="h-10 bg-darkbg-800 rounded-xl animate-pulse" />
              </div>
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-2 grid grid-cols-3 sm:grid-cols-4 gap-3 scrollbar-hide">
                {Array.from({ length: 12 }).map((_, i) => (
                  <BrainrotTileSkeleton key={i} />
                ))}
              </div>
            </div>
          ) : view === 'picker' && !selectedBrainrot ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="p-4">
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, ease: easeOut }}
                  className="relative"
                >
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search brainrots..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-darkbg-800 rounded-xl border-2 border-transparent focus:border-green-500 focus:ring-0 focus:outline-none text-white placeholder-gray-500 transition-colors"
                  />
                </motion.div>
              </div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-2 grid grid-cols-3 sm:grid-cols-4 gap-3 scrollbar-hide"
              >
                {filteredBrainrots.map((brainrot, index) => (
                  <motion.button
                    key={brainrot.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
                    whileHover={{
                      scale: 1.05,
                      transition: { duration: 0.15, ease: easeOut },
                    }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedBrainrot(brainrot)}
                    className="
                      relative p-2 rounded-xl bg-darkbg-800
                      border-2 border-transparent
                      hover:border-green-500/50 hover:bg-green-900/20
                      hover:shadow-[0_4px_20px_rgba(34,197,94,0.15)]
                      transition-all duration-200 text-center group
                      aspect-square flex flex-col items-center justify-center
                    "
                  >
                    <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
                      {brainrot.localImage ? (
                        <Image
                          src={brainrot.localImage}
                          alt={brainrot.name}
                          width={48}
                          height={48}
                          priority={index < 16}
                          className="rounded-lg object-contain max-w-full max-h-full transition-transform duration-200 group-hover:scale-110"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-darkbg-700" />
                      )}
                    </div>
                    <TruncatedText
                      text={brainrot.name}
                      className="mt-1 text-xs font-medium text-white w-full px-1 font-comic"
                    />
                    {brainrot.rarity && (
                      <span className={`text-[9px] ${getRarityClass(brainrot.rarity)}`}>
                        {brainrot.rarity}
                      </span>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            </div>
          ) : view === 'picker' && selectedBrainrot ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, ease: easeOut }}
              className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 scrollbar-hide"
            >
              {/* Selected Brainrot */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: easeOut }}
                className="flex items-center gap-3 p-3 bg-green-900/20 rounded-xl border border-green-800"
              >
                {selectedBrainrot.localImage ? (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Image
                      src={selectedBrainrot.localImage}
                      alt={selectedBrainrot.name}
                      width={56}
                      height={56}
                      className="rounded-lg"
                    />
                  </motion.div>
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-darkbg-700" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white font-comic">{selectedBrainrot.name}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Base: {formatIncome(selectedBrainrot.baseIncome)}</span>
                    {selectedBrainrot.rarity && (
                      <>
                        <span className="text-gray-600">•</span>
                        <span className={getRarityClass(selectedBrainrot.rarity)}>{selectedBrainrot.rarity}</span>
                      </>
                    )}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setSelectedBrainrot(null)
                    setSelectedMutation(null)
                    setSelectedTraits([])
                  }}
                  className="text-sm text-green-500 hover:text-green-400 font-medium flex-shrink-0"
                >
                  Change
                </motion.button>
              </motion.div>

              {/* Mutation */}
              <div>
                <p className="text-sm font-semibold text-gray-300 mb-2">Mutation</p>
                <div className="flex flex-wrap gap-2">
                  {/* None option */}
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                    whileHover={{ scale: 1.05, y: -1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedMutation(null)}
                    className={`
                      relative px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
                      ${!selectedMutation
                        ? 'bg-darkbg-700 ring-2 ring-green-500 shadow-lg text-white'
                        : 'bg-darkbg-800 hover:bg-darkbg-700 text-gray-400'
                      }
                    `}
                  >
                    Default
                    {!selectedMutation && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                  {[...mutations]
                    .filter((m) => m.name.toLowerCase() !== 'default')
                    .sort((a, b) => a.multiplier - b.multiplier)
                    .map((mutation, index) => {
                    const isSelected = selectedMutation?.id === mutation.id
                    return (
                      <motion.button
                        key={mutation.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.15, delay: (index + 1) * 0.03 }}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedMutation(mutation)}
                        className={`
                          animation-always-running relative px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-200
                          ${isSelected
                            ? 'bg-darkbg-700 ring-2 ring-green-500 shadow-lg'
                            : 'bg-darkbg-800 hover:bg-darkbg-700'
                          }
                        `}
                      >
                        <span className={getMutationClass(mutation.name)}>
                          {mutation.name}
                        </span>
                        <span className="text-gray-400 ml-1">({mutation.multiplier}x)</span>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center shadow"
                          >
                            <Check className="w-3 h-3 text-white" />
                          </motion.div>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Traits */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-300">
                    Traits ({selectedTraits.length} selected)
                  </p>
                  <button
                    onClick={() => setTraitSortAsc(!traitSortAsc)}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title={traitSortAsc ? 'Sorted low to high' : 'Sorted high to low'}
                  >
                    <ArrowDownUp className={`w-4 h-4 transition-transform ${traitSortAsc ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                {/* Trait Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search traits..."
                    value={traitSearch}
                    onChange={(e) => setTraitSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-darkbg-800 rounded-lg border border-transparent focus:border-green-500 focus:ring-0 focus:outline-none text-sm text-white placeholder-gray-500 transition-colors"
                  />
                </div>
                <div
                  onScroll={handleTraitsScroll}
                  style={{
                    boxShadow: showTraitsFade && sortedTraits.length > 6
                      ? 'inset 0 -20px 20px -20px rgba(0,0,0,0.8)'
                      : 'inset 0 0 0 0 rgba(0,0,0,0)',
                    transition: 'box-shadow 0.3s ease'
                  }}
                  className="max-h-48 overflow-y-auto overflow-x-hidden grid grid-cols-2 sm:grid-cols-3 gap-2 p-1 scrollbar-green rounded-lg"
                >
                    {sortedTraits.map((trait) => {
                      const isSelected = selectedTraits.some((t) => t.id === trait.id)
                      return (
                        <motion.button
                          key={trait.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggleTrait(trait)}
                          className={`
                            relative flex items-center gap-2 p-2 rounded-lg text-left transition-all duration-200
                            ${isSelected
                              ? 'bg-green-900/30 border-2 border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.2)]'
                              : 'bg-darkbg-800 border-2 border-transparent hover:border-darkbg-600'
                            }
                          `}
                        >
                          {trait.localImage ? (
                            <Image src={trait.localImage} alt={trait.name} width={24} height={24} className="rounded" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-darkbg-700" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{trait.name}</p>
                            <p className="text-[10px] text-gray-500">{trait.multiplier}x</p>
                          </div>
                          <AnimatePresence mode="wait">
                            {isSelected ? (
                              <motion.div
                                key="check"
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                exit={{ scale: 0, rotate: 90 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            ) : (
                              <motion.div
                                key="plus"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="w-5 h-5 flex items-center justify-center"
                              >
                                <Plus className="w-4 h-4 text-gray-400" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      )
                    })}
                    {sortedTraits.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4 col-span-full">No traits found</p>
                    )}
                </div>
              </div>

              {/* Calculated Income */}
              <AnimatePresence>
                {calculatedIncome && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: easeOut }}
                    className="p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 rounded-xl border border-green-800"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-gray-400">Calculated Income</p>
                      <div className="text-right">
                        <motion.p
                          key={calculatedIncome}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="text-xl font-bold text-green-400"
                        >
                          {formatIncome(calculatedIncome)}
                        </motion.p>
                        <p className="text-[10px] text-gray-500 font-mono">
                          ${Number(calculatedIncome).toLocaleString()}/s
                        </p>
                      </div>
                    </div>

                    {/* Step-by-step breakdown */}
                    <div className="space-y-2 text-xs">
                      {(() => {
                        const steps: React.ReactNode[] = []
                        const hasSleepy = selectedTraits.some(t => t.name.toLowerCase() === 'sleepy')
                        const traitsForCalc = selectedTraits.filter(t => t.name.toLowerCase() !== 'sleepy')
                        const mutMult = selectedMutation?.multiplier ?? 1
                        let runningMultiplier = 1

                        // Step 1: Base income display
                        steps.push(
                          <div key="base" className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                            <div className="w-20 text-gray-500">Base</div>
                            <div className="flex-1 text-white font-medium">{formatIncome(selectedBrainrot.baseIncome)}</div>
                          </div>
                        )

                        // Calculate running multiplier based on actual formula
                        if (traitsForCalc.length === 0) {
                          // No traits: just mutation
                          runningMultiplier = mutMult
                          if (mutMult !== 1) {
                            steps.push(
                              <div key="mutation" className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                                <div className="w-20 text-gray-500">× {mutMult}</div>
                                <div className="flex-1">
                                  <span className={`font-medium ${getMutationClass(selectedMutation!.name)}`}>
                                    {selectedMutation!.name}
                                  </span>
                                </div>
                                <div className="text-gray-600 text-[10px]">mutation</div>
                              </div>
                            )
                          }
                        } else if (traitsForCalc.length === 1) {
                          // Single trait: trait + (mutation - 1)
                          const trait = traitsForCalc[0]
                          runningMultiplier = trait.multiplier + (mutMult - 1)
                          steps.push(
                            <div key="trait-0" className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                              <div className="w-20 text-gray-500">× {trait.multiplier}</div>
                              <div className="flex-1 text-white font-medium">{trait.name}</div>
                              <div className="text-gray-600 text-[10px]">trait multiplier</div>
                            </div>
                          )
                          if (mutMult !== 1) {
                            steps.push(
                              <div key="mutation" className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                                <div className="w-20 text-gray-500">+ {mutMult - 1}</div>
                                <div className="flex-1">
                                  <span className={`font-medium ${getMutationClass(selectedMutation!.name)}`}>
                                    {selectedMutation!.name}
                                  </span>
                                </div>
                                <div className="text-gray-600 text-[10px]">{mutMult}x - 1</div>
                              </div>
                            )
                          }
                        } else {
                          // Multiple traits: (first - 1) + rest + (mutation - 1)
                          traitsForCalc.forEach((trait, i) => {
                            if (i === 0) {
                              const val = trait.multiplier - 1
                              runningMultiplier = val
                              steps.push(
                                <div key={`trait-${i}`} className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                                  <div className="w-20 text-gray-500">{val}</div>
                                  <div className="flex-1 text-white font-medium">{trait.name}</div>
                                  <div className="text-gray-600 text-[10px]">{trait.multiplier}x - 1 (first)</div>
                                </div>
                              )
                            } else {
                              runningMultiplier += trait.multiplier
                              steps.push(
                                <div key={`trait-${i}`} className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                                  <div className="w-20 text-gray-500">+ {trait.multiplier}</div>
                                  <div className="flex-1 text-white font-medium">{trait.name}</div>
                                  <div className="text-gray-600 text-[10px]">{trait.multiplier}x (full)</div>
                                </div>
                              )
                            }
                          })
                          if (mutMult !== 1) {
                            runningMultiplier += (mutMult - 1)
                            steps.push(
                              <div key="mutation" className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                                <div className="w-20 text-gray-500">+ {mutMult - 1}</div>
                                <div className="flex-1">
                                  <span className={`font-medium ${getMutationClass(selectedMutation!.name)}`}>
                                    {selectedMutation!.name}
                                  </span>
                                </div>
                                <div className="text-gray-600 text-[10px]">{mutMult}x - 1</div>
                              </div>
                            )
                          }
                        }

                        // Sleepy halves the result
                        if (hasSleepy) {
                          runningMultiplier *= 0.5
                          steps.push(
                            <div key="sleepy" className="flex items-center gap-2 p-2 bg-darkbg-800/50 rounded-lg">
                              <div className="w-20 text-gray-500">× 0.5</div>
                              <div className="flex-1 text-white font-medium">Sleepy</div>
                              <div className="text-gray-600 text-[10px]">halves income</div>
                            </div>
                          )
                        }

                        // Final multiplier
                        steps.push(
                          <div key="total" className="flex items-center gap-2 p-2 bg-green-900/30 rounded-lg border border-green-800/50">
                            <div className="w-20 text-green-400 font-bold">= {runningMultiplier}x</div>
                            <div className="flex-1 text-green-400 font-medium">Total Multiplier</div>
                          </div>
                        )

                        return steps
                      })()}
                    </div>

                    {/* Report link */}
                    <button
                      onClick={() => {
                        setView('report')
                        if (calculatedIncome) {
                          setReportActual(calculatedIncome)
                        }
                      }}
                      className="mt-3 text-xs text-gray-500 hover:text-gray-400 underline transition-colors"
                    >
                      Is something incorrect?
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}

          {/* Report View */}
          {view === 'report' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {reportSuccess ? (
                <div className="flex-1 flex flex-col items-center justify-center py-12">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                  >
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white mb-2">Report Submitted</h3>
                  <p className="text-gray-400 text-sm">Thank you for helping improve our data!</p>
                </div>
              ) : (
                <>
                  {/* Context */}
                  {selectedBrainrot && (
                    <div className="flex items-center gap-3 p-3 bg-darkbg-800 rounded-lg">
                      {selectedBrainrot.localImage && (
                        <Image src={selectedBrainrot.localImage} alt={selectedBrainrot.name} width={40} height={40} className="rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-white text-sm">{selectedBrainrot.name}</p>
                        <p className="text-xs text-gray-500">
                          Base: {formatIncome(selectedBrainrot.baseIncome)}
                          {selectedMutation && ` | ${selectedMutation.name} (${selectedMutation.multiplier}x)`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Type Selection */}
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Issue Type</label>
                    <div className="space-y-2">
                      {REPORT_TYPES.map((rt) => (
                        <button
                          key={rt.value}
                          onClick={() => setReportType(rt.value)}
                          className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                            reportType === rt.value
                              ? 'border-green-500 bg-green-500/10'
                              : 'border-darkbg-700 bg-darkbg-800 hover:border-darkbg-600'
                          }`}
                        >
                          <p className="font-medium text-white text-sm">{rt.label}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">Description *</label>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      placeholder="Describe the issue..."
                      className="w-full px-4 py-3 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Expected vs Actual */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Expected</label>
                      <input
                        type="text"
                        value={reportExpected}
                        onChange={(e) => setReportExpected(e.target.value)}
                        placeholder="What it should be"
                        className="w-full px-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-400 mb-2 block">Actual</label>
                      <input
                        type="text"
                        value={reportActual}
                        onChange={(e) => setReportActual(e.target.value)}
                        placeholder="What it currently is"
                        className="w-full px-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                      />
                    </div>
                  </div>

                  {reportError && (
                    <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      {reportError}
                    </div>
                  )}

                  <button
                    onClick={handleReportSubmit}
                    disabled={reportLoading || !reportDescription.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                  >
                    {reportLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Report
                      </>
                    )}
                  </button>
                </>
              )}
            </motion.div>
          )}

          {/* Footer */}
          <AnimatePresence>
            {selectedBrainrot && view === 'picker' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.2, ease: easeOut }}
                className="p-4 border-t border-darkbg-700"
              >
                <motion.button
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={handleConfirm}
                  className="
                    w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl
                    transition-colors shadow-lg shadow-green-500/25
                  "
                >
                  {isEditing ? 'Update Item' : 'Add Item'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
