'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Search, TrendingUp, DollarSign, Sparkles } from 'lucide-react'
import { Select } from '@/components/ui'
import { brainrotCache as cache } from '@/lib/prefetch'

interface Brainrot {
  id: string
  name: string
  localImage: string | null
  imageUrl: string
  baseCost: string
  baseIncome: string
  rarity: string | null
  robuxValue: number | null
}

function formatNumber(numStr: string): string {
  const num = BigInt(numStr)
  if (num >= BigInt(1_000_000_000_000)) {
    return (Number(num) / 1_000_000_000_000).toFixed(1) + 'T'
  } else if (num >= BigInt(1_000_000_000)) {
    return (Number(num) / 1_000_000_000).toFixed(1) + 'B'
  } else if (num >= BigInt(1_000_000)) {
    return (Number(num) / 1_000_000).toFixed(1) + 'M'
  } else if (num >= BigInt(1_000)) {
    return (Number(num) / 1_000).toFixed(1) + 'K'
  }
  return numStr
}

function getRarityColor(rarity: string | null): string {
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

function getRarityBorder(rarity: string | null): { border: string; animated?: string } {
  if (!rarity) return { border: 'border-darkbg-700 hover:border-darkbg-600' }
  const r = rarity.toLowerCase()
  if (r === 'common') return { border: 'border-green-700/50 hover:border-green-600 hover:shadow-[0_0_20px_rgba(0,128,0,0.3)]' }
  if (r === 'rare') return { border: 'border-cyan-500/50 hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]' }
  if (r === 'epic') return { border: 'border-purple-600/50 hover:border-purple-500 hover:shadow-[0_0_20px_rgba(128,0,128,0.3)]' }
  if (r === 'legendary') return { border: 'border-yellow-500/50 hover:border-yellow-400 hover:shadow-[0_0_20px_rgba(255,255,0,0.3)]' }
  if (r === 'mythic') return { border: 'border-red-500/50 hover:border-red-400 hover:shadow-[0_0_20px_rgba(255,0,0,0.3)]' }
  if (r === 'brainrot god' || r === 'god') return { border: 'border-pink-500/50', animated: 'card-border-animated card-border-god' }
  if (r === 'secret') return { border: 'border-gray-400/50', animated: 'card-border-animated card-border-secret' }
  if (r === 'festive') return { border: 'border-red-500/50', animated: 'card-border-animated card-border-festive' }
  if (r === 'og') return { border: 'border-yellow-500/50', animated: 'card-border-animated card-border-og' }
  if (r === 'admin') return { border: 'border-amber-500/50', animated: 'card-border-animated card-border-admin' }
  return { border: 'border-darkbg-700 hover:border-darkbg-600' }
}

export default function BrainrotsPage() {
  const [brainrots, setBrainrots] = useState<Brainrot[]>(cache.brainrots)
  const [loading, setLoading] = useState(!cache.loaded)
  const [search, setSearch] = useState('')
  const [rarityFilter, setRarityFilter] = useState<string>('all')
  const [scrolled, setScrolled] = useState(false)
  const [activeCardId, setActiveCardId] = useState<string | null>(null)

  // Toggle card on tap (for mobile)
  const handleCardTap = useCallback((id: string) => {
    setActiveCardId(prev => prev === id ? null : id)
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (cache.loaded) {
      setBrainrots(cache.brainrots)
      setLoading(false)
      return
    }
    fetch('/api/brainrots/all')
      .then(res => res.json())
      .then(data => {
        cache.brainrots = data.brainrots || []
        cache.loaded = true
        setBrainrots(cache.brainrots)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const rarities = ['all', ...new Set(brainrots.map(b => b.rarity).filter(Boolean))] as string[]

  const filtered = brainrots.filter(b => {
    const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase())
    const matchesRarity = rarityFilter === 'all' || b.rarity === rarityFilter
    return matchesSearch && matchesRarity
  })

  // Sort by base income descending
  const sorted = [...filtered].sort((a, b) => {
    return Number(BigInt(b.baseIncome) - BigInt(a.baseIncome))
  })

  return (
    <div className="min-h-screen bg-darkbg-950">
      {/* Header */}
      <div className={`border-b border-darkbg-800 sticky top-16 z-40 transition-all duration-300 ${scrolled ? 'bg-black/40 backdrop-blur-xl' : 'bg-darkbg-950/80 backdrop-blur-sm'}`}>
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-green-400" />
                brainrot index
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {brainrots.length} brainrots cataloged
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="search brainrots..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    window.scrollTo({ top: 0, behavior: 'smooth' })
                  }}
                  className="pl-10 pr-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 w-full sm:w-64"
                />
              </div>

              {/* Rarity filter */}
              <Select
                value={rarityFilter}
                onChange={setRarityFilter}
                options={rarities.map(r => ({
                  value: r,
                  label: r === 'all' ? 'All Rarities' : r,
                }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {[...Array(18)].map((_, i) => (
              <div key={i} className="aspect-square skeleton rounded-2xl" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg">no brainrots found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {sorted.map((brainrot, i) => {
              const isActive = activeCardId === brainrot.id
              return (
                <motion.div
                  key={brainrot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  onClick={() => handleCardTap(brainrot.id)}
                  className={`group relative bg-darkbg-800 rounded-2xl border ${getRarityBorder(brainrot.rarity).border} ${getRarityBorder(brainrot.rarity).animated || ''} transition-all duration-300 cursor-pointer overflow-hidden`}
                >
                  {/* Image container */}
                  <div className="aspect-square p-3 sm:p-4 relative">
                    <Image
                      src={brainrot.localImage || brainrot.imageUrl}
                      alt={brainrot.name}
                      fill
                      className="object-contain p-2 group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Name & Rarity */}
                  <div className="px-2 sm:px-3 pb-2 sm:pb-3">
                    <p className="text-white font-semibold text-xs sm:text-sm truncate">{brainrot.name}</p>
                    {brainrot.rarity && (
                      <p className={`text-[10px] sm:text-xs ${getRarityColor(brainrot.rarity)}`}>{brainrot.rarity}</p>
                    )}
                  </div>

                  {/* Stats overlay - hover on desktop, tap on mobile */}
                  <div className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-200 flex flex-col items-center justify-center p-2 sm:p-3 overflow-hidden ${isActive ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'}`}>
                    <Image
                      src={brainrot.localImage || brainrot.imageUrl}
                      alt={brainrot.name}
                      width={40}
                      height={40}
                      className="object-contain mb-1 sm:mb-2 flex-shrink-0"
                    />
                    <p className="text-white font-bold text-center text-[10px] sm:text-xs mb-1 sm:mb-2 truncate w-full px-1">{brainrot.name}</p>

                    <div className="w-full space-y-1 sm:space-y-1.5 flex-shrink-0">
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-gray-400 flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5" />
                          cost
                        </span>
                        <span className="text-white font-mono">${formatNumber(brainrot.baseCost)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-gray-400 flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" />
                          income
                        </span>
                        <span className="text-green-400 font-mono">${formatNumber(brainrot.baseIncome)}/s</span>
                      </div>
                      {brainrot.rarity && (
                        <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                          <span className="text-gray-400 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5" />
                            rarity
                          </span>
                          <span className={getRarityColor(brainrot.rarity)}>{brainrot.rarity}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-gray-400 flex items-center gap-0.5">
                          <DollarSign className="w-2.5 h-2.5" />
                          value
                        </span>
                        <span className={brainrot.robuxValue ? "text-yellow-400 font-mono" : "text-gray-500"}>
                          {brainrot.robuxValue ? `R$${brainrot.robuxValue.toLocaleString()}` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Tap hint on mobile */}
                    <p className="text-[8px] text-gray-500 mt-1 md:hidden flex-shrink-0">tap to close</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
