'use client'

import { useState, useEffect, useCallback } from 'react'

interface Mutation {
  id: string
  name: string
}

interface BrainrotMutationValue {
  mutationId: string
  robuxValue: number
  mutation: { id: string; name: string }
}

interface Brainrot {
  id: string
  name: string
  rarity: string
  mutationValues: BrainrotMutationValue[]
}

interface PriceResult {
  brainrotId: string
  brainrotName: string
  mutation: string
  mutationId: string
  usdPrice: number | null
  robuxPrice: number | null
  listingCount: number
  isOutlier: boolean
  error?: string
}

interface EditedValue {
  brainrotId: string
  mutationId: string
  robuxValue: number
}

const MUTATION_ORDER = ['Default', 'Gold', 'Diamond', 'Bloodrot', 'Candy', 'Lava', 'Galaxy', 'Yin Yang', 'Radioactive', 'Cursed', 'Rainbow']

export default function PriceImportPage() {
  const [brainrots, setBrainrots] = useState<Brainrot[]>([])
  const [mutations, setMutations] = useState<Mutation[]>([])
  const [results, setResults] = useState<Map<string, PriceResult>>(new Map())
  const [editedValues, setEditedValues] = useState<Map<string, number>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [isFetching, setIsFetching] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [totalToFetch, setTotalToFetch] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [filterRarity, setFilterRarity] = useState<string>('all')
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)

  // Load brainrots and mutations
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/price-import', { method: 'POST' })
        const data = await res.json()
        setBrainrots(data.brainrots || [])
        setMutations(data.mutations || [])
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const getMinListings = (rarity: string) => {
    if (rarity === 'OG') return 3
    if (rarity === 'Secret') return 10
    return 15
  }

  const fetchPrice = useCallback(async (brainrot: Brainrot, mutation: Mutation) => {
    const key = `${brainrot.id}-${mutation.id}`

    try {
      const params = new URLSearchParams({
        name: brainrot.name,
        rarity: brainrot.rarity,
        mutation: mutation.name.toLowerCase()
      })

      const res = await fetch(`/api/admin/price-import?${params}`)
      const data = await res.json()

      const minListings = getMinListings(brainrot.rarity)
      const isOutlier = data.listingCount < minListings

      const result: PriceResult = {
        brainrotId: brainrot.id,
        brainrotName: brainrot.name,
        mutation: mutation.name,
        mutationId: mutation.id,
        usdPrice: data.usdPrice,
        robuxPrice: data.robuxPrice,
        listingCount: data.listingCount || 0,
        isOutlier,
        error: data.error
      }

      setResults(prev => new Map(prev).set(key, result))

      // Auto-fill edited value if not outlier and has price
      if (data.robuxPrice && !isOutlier) {
        setEditedValues(prev => new Map(prev).set(key, data.robuxPrice))
      }

      return result
    } catch (error) {
      console.error('Fetch error:', error)
      return null
    }
  }, [])

  const fetchAllPrices = async () => {
    setIsFetching(true)
    setCurrentIndex(0)

    // Build list of all brainrot+mutation combinations
    const combinations: { brainrot: Brainrot; mutation: Mutation }[] = []

    for (const brainrot of brainrots) {
      if (filterRarity !== 'all' && brainrot.rarity !== filterRarity) continue

      for (const mutation of mutations) {
        combinations.push({ brainrot, mutation })
      }
    }

    setTotalToFetch(combinations.length)

    // Fetch sequentially with delay
    for (let i = 0; i < combinations.length; i++) {
      const { brainrot, mutation } = combinations[i]
      setCurrentIndex(i + 1)
      await fetchPrice(brainrot, mutation)
      await new Promise(r => setTimeout(r, 500)) // Rate limiting
    }

    setIsFetching(false)
  }

  const handleValueChange = (brainrotId: string, mutationId: string, value: string) => {
    const key = `${brainrotId}-${mutationId}`
    const numValue = parseInt(value, 10)

    if (isNaN(numValue) || value === '') {
      setEditedValues(prev => {
        const next = new Map(prev)
        next.delete(key)
        return next
      })
    } else {
      setEditedValues(prev => new Map(prev).set(key, numValue))
    }
  }

  const saveValues = async () => {
    if (editedValues.size === 0) {
      setSaveMessage('No values to save')
      return
    }

    setIsSaving(true)
    setSaveMessage('')

    try {
      // Build updates array
      const updates: { brainrotId: string; mutationId: string; robuxValue: number }[] = []
      editedValues.forEach((robuxValue, key) => {
        const [brainrotId, mutationId] = key.split('-')
        updates.push({ brainrotId, mutationId, robuxValue })
      })

      // Bulk save using PUT endpoint
      const res = await fetch('/api/admin/usd-values/mutation-values', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      })

      if (res.ok) {
        setSaveMessage(`Saved ${updates.length} values successfully!`)
        // Clear edited values after save
        setEditedValues(new Map())
        // Reload brainrots to get updated values
        const reloadRes = await fetch('/api/admin/price-import', { method: 'POST' })
        const data = await reloadRes.json()
        setBrainrots(data.brainrots || [])
      } else {
        const error = await res.json()
        setSaveMessage(`Error: ${error.error || 'Failed to save'}`)
      }
    } catch (error) {
      setSaveMessage('Error saving values')
      console.error(error)
    } finally {
      setIsSaving(false)
    }
  }

  const uniqueRarities = [...new Set(brainrots.map(b => b.rarity))].sort()

  const filteredBrainrots = brainrots.filter(b => {
    if (filterRarity !== 'all' && b.rarity !== filterRarity) return false
    if (showOnlyMissing) {
      // Check if any mutation is missing a value
      const hasAllValues = mutations.every(m => {
        const key = `${b.id}-${m.id}`
        return editedValues.has(key) || results.get(key)?.robuxPrice
      })
      return !hasAllValues
    }
    return true
  })

  const completedCount = editedValues.size
  const totalMutationCombos = filteredBrainrots.length * mutations.length

  if (isLoading) {
    return <div className="p-6">Loading...</div>
  }

  return (
    <div className="p-6 max-w-full">
      <h1 className="text-2xl font-bold mb-4">Price Import from Eldorado</h1>

      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 space-y-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Filter by Rarity</label>
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2"
            >
              <option value="all">All Rarities</option>
              {uniqueRarities.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyMissing}
              onChange={(e) => setShowOnlyMissing(e.target.checked)}
              className="w-4 h-4"
            />
            <span>Show only missing values</span>
          </label>

          <button
            onClick={fetchAllPrices}
            disabled={isFetching}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
          >
            {isFetching ? 'Fetching...' : 'Fetch All Prices'}
          </button>

          <button
            onClick={saveValues}
            disabled={isSaving || editedValues.size === 0}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded font-medium"
          >
            {isSaving ? 'Saving...' : `Save ${editedValues.size} Values`}
          </button>
        </div>

        {/* Progress */}
        {isFetching && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Fetching prices...</span>
              <span>{currentIndex} / {totalToFetch}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(currentIndex / totalToFetch) * 100}%` }}
              />
            </div>
          </div>
        )}

        {saveMessage && (
          <p className={saveMessage.includes('Error') ? 'text-red-400' : 'text-green-400'}>
            {saveMessage}
          </p>
        )}

        {/* Stats */}
        <div className="flex gap-6 text-sm text-gray-400">
          <span>Brainrots: {filteredBrainrots.length}</span>
          <span>Values to save: {completedCount}</span>
          <span>Results fetched: {results.size}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 sticky top-0">
            <tr>
              <th className="text-left p-3 min-w-[200px]">Brainrot</th>
              <th className="text-left p-3 w-20">Rarity</th>
              {MUTATION_ORDER.map(m => (
                <th key={m} className="text-center p-3 min-w-[100px]">{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBrainrots.map(brainrot => {
              return (
                <tr key={brainrot.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                  <td className="p-3 font-medium">{brainrot.name}</td>
                  <td className="p-3 text-gray-400">{brainrot.rarity}</td>
                  {MUTATION_ORDER.map(mutName => {
                    const mutation = mutations.find(m => m.name.toLowerCase() === mutName.toLowerCase())
                    if (!mutation) return <td key={mutName} className="p-2">-</td>

                    const key = `${brainrot.id}-${mutation.id}`
                    const result = results.get(key)
                    const editedValue = editedValues.get(key)
                    const existingValue = brainrot.mutationValues.find(mv => mv.mutationId === mutation.id)?.robuxValue

                    return (
                      <td key={mutName} className="p-2">
                        <div className="flex flex-col gap-1">
                          {/* Fetched price */}
                          {result && (
                            <div className={`text-xs ${result.isOutlier ? 'text-yellow-500' : 'text-gray-400'}`}>
                              {result.usdPrice !== null ? (
                                <>
                                  ${result.usdPrice.toFixed(2)} ({result.listingCount})
                                  {result.isOutlier && ' ⚠️'}
                                </>
                              ) : (
                                <span className="text-red-400">No listings</span>
                              )}
                            </div>
                          )}

                          {/* Input */}
                          <input
                            type="number"
                            value={editedValue ?? existingValue ?? ''}
                            onChange={(e) => handleValueChange(brainrot.id, mutation.id, e.target.value)}
                            placeholder="R$"
                            className={`w-full bg-gray-700 border rounded px-2 py-1 text-sm
                              ${editedValue !== undefined ? 'border-blue-500' : 'border-gray-600'}
                              ${existingValue && !editedValue ? 'text-gray-400' : ''}`}
                          />
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredBrainrots.length === 0 && (
        <p className="text-center text-gray-400 py-8">No brainrots found</p>
      )}
    </div>
  )
}
