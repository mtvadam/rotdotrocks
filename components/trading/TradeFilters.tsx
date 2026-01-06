'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import {
  X,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  TrendingDown,
  Coins,
  Sparkles,
  Check,
  ChevronDown,
} from 'lucide-react'

// Types
interface Brainrot {
  id: string
  name: string
  localImage: string | null
  baseIncome: string
}

type TradeType = 'UPGRADE' | 'DOWNGRADE' | 'ROBUX' | 'ADDS'

export interface TradeFiltersState {
  offerBrainrots: Brainrot[]
  offerIncomeMin: string
  offerIncomeMax: string
  offerValueMin: string
  offerValueMax: string
  offerTradeTypes: TradeType[]
  requestBrainrots: Brainrot[]
  requestIncomeMin: string
  requestIncomeMax: string
  requestValueMin: string
  requestValueMax: string
  requestTradeTypes: TradeType[]
}

interface TradeFiltersProps {
  filters: TradeFiltersState
  onFiltersChange: (filters: TradeFiltersState) => void
  brainrots: Brainrot[]
}

export const defaultFilters: TradeFiltersState = {
  offerBrainrots: [],
  offerIncomeMin: '',
  offerIncomeMax: '',
  offerValueMin: '',
  offerValueMax: '',
  offerTradeTypes: [],
  requestBrainrots: [],
  requestIncomeMin: '',
  requestIncomeMax: '',
  requestValueMin: '',
  requestValueMax: '',
  requestTradeTypes: [],
}

const tradeTypeOptions: { value: TradeType; label: string; icon: React.ReactNode }[] = [
  { value: 'UPGRADE', label: 'Upgrades', icon: <TrendingUp className="w-3.5 h-3.5 text-green-400" /> },
  { value: 'DOWNGRADE', label: 'Downgrades', icon: <TrendingDown className="w-3.5 h-3.5 text-red-400" /> },
  { value: 'ROBUX', label: 'Robux', icon: <Coins className="w-3.5 h-3.5 text-amber-400" /> },
  { value: 'ADDS', label: 'Adds', icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" /> },
]

export function TradeFilters({ filters, onFiltersChange, brainrots }: TradeFiltersProps) {
  // Count active filters per side
  const offerCount = useMemo(() => {
    let count = 0
    if (filters.offerBrainrots.length) count++
    if (filters.offerIncomeMin || filters.offerIncomeMax) count++
    if (filters.offerValueMin || filters.offerValueMax) count++
    if (filters.offerTradeTypes.length) count++
    return count
  }, [filters.offerBrainrots, filters.offerIncomeMin, filters.offerIncomeMax, filters.offerValueMin, filters.offerValueMax, filters.offerTradeTypes])

  const requestCount = useMemo(() => {
    let count = 0
    if (filters.requestBrainrots.length) count++
    if (filters.requestIncomeMin || filters.requestIncomeMax) count++
    if (filters.requestValueMin || filters.requestValueMax) count++
    if (filters.requestTradeTypes.length) count++
    return count
  }, [filters.requestBrainrots, filters.requestIncomeMin, filters.requestIncomeMax, filters.requestValueMin, filters.requestValueMax, filters.requestTradeTypes])

  return (
    <div className="contents">
      {/* Offer Filter Button */}
      <FilterButton
        label="Offering"
        icon={<ArrowUpRight className="w-3.5 h-3.5" />}
        count={offerCount}
        color="green"
      >
        <FilterPanel title="Filter by Offer" subtitle="What they're trading away">
          <BrainrotSearch
            label="Brainrots"
            placeholder="Search..."
            selected={filters.offerBrainrots}
            onSelect={(b) => onFiltersChange({ ...filters, offerBrainrots: [...filters.offerBrainrots, b] })}
            onRemove={(id) => onFiltersChange({ ...filters, offerBrainrots: filters.offerBrainrots.filter(b => b.id !== id) })}
            brainrots={brainrots}
          />
          <IncomeRangeInput
            label="Total Income"
            min={filters.offerIncomeMin}
            max={filters.offerIncomeMax}
            onMinChange={(v) => onFiltersChange({ ...filters, offerIncomeMin: v })}
            onMaxChange={(v) => onFiltersChange({ ...filters, offerIncomeMax: v })}
          />
          <ValueRangeInput
            label="Total Value"
            min={filters.offerValueMin}
            max={filters.offerValueMax}
            onMinChange={(v) => onFiltersChange({ ...filters, offerValueMin: v })}
            onMaxChange={(v) => onFiltersChange({ ...filters, offerValueMax: v })}
          />
          <TradeTypeSelect
            label="Trade-Only"
            selected={filters.offerTradeTypes}
            onToggle={(type) =>
              onFiltersChange({
                ...filters,
                offerTradeTypes: filters.offerTradeTypes.includes(type)
                  ? filters.offerTradeTypes.filter(t => t !== type)
                  : [...filters.offerTradeTypes, type],
              })
            }
          />
          {offerCount > 0 && (
            <button
              onClick={() => onFiltersChange({ ...filters, offerBrainrots: [], offerIncomeMin: '', offerIncomeMax: '', offerValueMin: '', offerValueMax: '', offerTradeTypes: [] })}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear offer filters
            </button>
          )}
        </FilterPanel>
      </FilterButton>

      {/* Request Filter Button */}
      <FilterButton
        label="Wants"
        icon={<ArrowDownLeft className="w-3.5 h-3.5" />}
        count={requestCount}
        color="amber"
      >
        <FilterPanel title="Filter by Request" subtitle="What they're looking for">
          <BrainrotSearch
            label="Brainrots"
            placeholder="Search..."
            selected={filters.requestBrainrots}
            onSelect={(b) => onFiltersChange({ ...filters, requestBrainrots: [...filters.requestBrainrots, b] })}
            onRemove={(id) => onFiltersChange({ ...filters, requestBrainrots: filters.requestBrainrots.filter(b => b.id !== id) })}
            brainrots={brainrots}
          />
          <IncomeRangeInput
            label="Total Income"
            min={filters.requestIncomeMin}
            max={filters.requestIncomeMax}
            onMinChange={(v) => onFiltersChange({ ...filters, requestIncomeMin: v })}
            onMaxChange={(v) => onFiltersChange({ ...filters, requestIncomeMax: v })}
          />
          <ValueRangeInput
            label="Total Value"
            min={filters.requestValueMin}
            max={filters.requestValueMax}
            onMinChange={(v) => onFiltersChange({ ...filters, requestValueMin: v })}
            onMaxChange={(v) => onFiltersChange({ ...filters, requestValueMax: v })}
          />
          <TradeTypeSelect
            label="Trade-Only"
            selected={filters.requestTradeTypes}
            onToggle={(type) =>
              onFiltersChange({
                ...filters,
                requestTradeTypes: filters.requestTradeTypes.includes(type)
                  ? filters.requestTradeTypes.filter(t => t !== type)
                  : [...filters.requestTradeTypes, type],
              })
            }
          />
          {requestCount > 0 && (
            <button
              onClick={() => onFiltersChange({ ...filters, requestBrainrots: [], requestIncomeMin: '', requestIncomeMax: '', requestValueMin: '', requestValueMax: '', requestTradeTypes: [] })}
              className="w-full py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Clear request filters
            </button>
          )}
        </FilterPanel>
      </FilterButton>
    </div>
  )
}

// Reusable filter button with dropdown
function FilterButton({
  label,
  icon,
  count,
  color,
  children,
}: {
  label: string
  icon: React.ReactNode
  count: number
  color: 'green' | 'amber'
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    if (isOpen && buttonRef.current && !isMobile) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: Math.min(rect.left, window.innerWidth - 320),
      })
    }
  }, [isOpen, isMobile])

  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const colorClasses = {
    green: {
      active: 'border-green-500 text-green-400',
      badge: 'bg-green-500',
      icon: 'text-green-500',
    },
    amber: {
      active: 'border-amber-500 text-amber-400',
      badge: 'bg-amber-500',
      icon: 'text-amber-500',
    },
  }[color]

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-1.5 px-3 py-2.5
          bg-darkbg-800 rounded-xl
          border-2 transition-all duration-200
          ${isOpen || count > 0 ? colorClasses.active : 'border-transparent text-gray-400 hover:text-white hover:border-darkbg-600'}
        `}
      >
        <span className={count > 0 ? colorClasses.icon : ''}>{icon}</span>
        <span className="text-sm font-medium hidden sm:inline">{label}</span>
        {count > 0 && (
          <span className={`min-w-[18px] h-[18px] px-1 ${colorClasses.badge} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
            {count}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Desktop Dropdown */}
      {typeof window !== 'undefined' && !isMobile && createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{ top: position.top, left: position.left }}
              className="fixed w-[300px] bg-darkbg-900/95 backdrop-blur-xl border border-darkbg-700 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50"
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Mobile Bottom Sheet */}
      {typeof window !== 'undefined' && isMobile && createPortal(
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              />
              <motion.div
                ref={panelRef}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed inset-x-0 bottom-0 bg-darkbg-900 rounded-t-3xl border-t border-darkbg-700 overflow-hidden z-50 max-h-[80vh]"
              >
                <div className="flex justify-center py-3">
                  <div className="w-10 h-1 bg-darkbg-600 rounded-full" />
                </div>
                {children}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

function FilterPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="p-4 space-y-4">
      <div className="pb-2 border-b border-darkbg-700">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

// Sort search results by relevance
function sortByRelevance(items: Brainrot[], query: string): Brainrot[] {
  const q = query.toLowerCase()
  return items
    .map(item => {
      const name = item.name.toLowerCase()
      let score = 0

      // Exact match = highest priority
      if (name === q) score = 100
      // Starts with query = high priority
      else if (name.startsWith(q)) score = 80
      // Word starts with query = medium-high priority
      else if (name.split(' ').some(word => word.startsWith(q))) score = 60
      // Contains query = medium priority
      else if (name.includes(q)) score = 40
      // Fuzzy: characters appear in order = low priority
      else {
        let queryIndex = 0
        for (const char of name) {
          if (char === q[queryIndex]) queryIndex++
          if (queryIndex === q.length) break
        }
        if (queryIndex === q.length) score = 20
      }

      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}

function BrainrotSearch({ label, placeholder, selected, onSelect, onRemove, brainrots }: {
  label: string
  placeholder: string
  selected: Brainrot[]
  onSelect: (brainrot: Brainrot) => void
  onRemove: (id: string) => void
  brainrots: Brainrot[]
}) {
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 })
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = useMemo(() => {
    if (!search.trim()) return []
    const selectedIds = new Set(selected.map(b => b.id))
    const available = brainrots.filter(b => !selectedIds.has(b.id))
    return sortByRelevance(available, search).slice(0, 5)
  }, [search, brainrots, selected])

  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [showSuggestions, search])

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-400">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          className="w-full pl-9 pr-3 py-2 bg-darkbg-800 border-2 border-transparent focus:border-green-500 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none transition-colors"
        />
        {/* Portal for suggestions dropdown */}
        {typeof window !== 'undefined' && createPortal(
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                className="fixed z-[100] max-h-40 overflow-y-auto bg-darkbg-900/90 backdrop-blur-xl border border-darkbg-600 rounded-xl shadow-2xl shadow-black/50"
              >
                {suggestions.map((brainrot) => (
                  <button
                    key={brainrot.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { onSelect(brainrot); setSearch(''); setShowSuggestions(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-darkbg-700/80 transition-colors text-left"
                  >
                    {brainrot.localImage && (
                      <Image src={brainrot.localImage} alt="" width={24} height={24} className="rounded" />
                    )}
                    <span className="text-sm text-white truncate">{brainrot.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((brainrot) => (
            <div key={brainrot.id} className="flex items-center gap-1 pl-1 pr-2 py-0.5 bg-darkbg-700 rounded-lg">
              {brainrot.localImage && (
                <Image src={brainrot.localImage} alt="" width={18} height={18} className="rounded" />
              )}
              <span className="text-xs text-white">{brainrot.name}</span>
              <button onClick={() => onRemove(brainrot.id)} className="p-0.5 hover:bg-darkbg-600 rounded">
                <X className="w-3 h-3 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function IncomeRangeInput({ label, min, max, onMinChange, onMaxChange }: {
  label: string
  min: string
  max: string
  onMinChange: (v: string) => void
  onMaxChange: (v: string) => void
}) {
  const [activeField, setActiveField] = useState<'min' | 'max'>('min')
  const presets = ['1K', '10K', '1M', '1B']

  const applyPreset = (value: string) => {
    if (activeField === 'max') {
      onMaxChange(value)
    } else {
      onMinChange(value)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-400">{label}</label>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-1">Min</p>
          <input
            type="text"
            placeholder="0"
            value={min}
            onChange={(e) => onMinChange(e.target.value)}
            onFocus={() => setActiveField('min')}
            className={`w-full px-3 py-2 bg-darkbg-800 border-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none transition-colors text-center ${activeField === 'min' ? 'border-green-500' : 'border-transparent'}`}
          />
        </div>
        <span className="text-gray-500 text-xs flex-shrink-0 pt-5">–</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-1">Max</p>
          <input
            type="text"
            placeholder="∞"
            value={max}
            onChange={(e) => onMaxChange(e.target.value)}
            onFocus={() => setActiveField('max')}
            className={`w-full px-3 py-2 bg-darkbg-800 border-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none transition-colors text-center ${activeField === 'max' ? 'border-green-500' : 'border-transparent'}`}
          />
        </div>
      </div>
      <div className="flex gap-1">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => applyPreset(preset)}
            className="flex-1 py-1 bg-darkbg-700 hover:bg-darkbg-600 text-[10px] font-medium text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  )
}

function TradeTypeSelect({ label, selected, onToggle }: {
  label: string
  selected: TradeType[]
  onToggle: (type: TradeType) => void
}) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-400">{label}</label>
      <div className="grid grid-cols-2 gap-1.5">
        {tradeTypeOptions.map((option) => {
          const isSelected = selected.includes(option.value)
          return (
            <button
              key={option.value}
              onClick={() => onToggle(option.value)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border transition-all ${
                isSelected
                  ? 'bg-green-900/20 border-green-500 text-white'
                  : 'bg-darkbg-800 border-transparent hover:border-darkbg-600 text-gray-400'
              }`}
            >
              {option.icon}
              <span className="text-xs font-medium">{option.label}</span>
              {isSelected && <Check className="w-3 h-3 text-green-500 ml-auto" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ValueRangeInput({ label, min, max, onMinChange, onMaxChange }: {
  label: string
  min: string
  max: string
  onMinChange: (v: string) => void
  onMaxChange: (v: string) => void
}) {
  const [activeField, setActiveField] = useState<'min' | 'max'>('min')
  const presets = ['1K', '10K', '100K', '1M']

  const applyPreset = (value: string) => {
    if (activeField === 'max') {
      onMaxChange(value)
    } else {
      onMinChange(value)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-400 flex items-center gap-1">
        <Coins className="w-3 h-3 text-yellow-400" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-1">Min</p>
          <input
            type="text"
            placeholder="0"
            value={min}
            onChange={(e) => onMinChange(e.target.value)}
            onFocus={() => setActiveField('min')}
            className={`w-full px-3 py-2 bg-darkbg-800 border-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none transition-colors text-center ${activeField === 'min' ? 'border-yellow-500' : 'border-transparent'}`}
          />
        </div>
        <span className="text-gray-500 text-xs flex-shrink-0 pt-5">–</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-500 mb-1">Max</p>
          <input
            type="text"
            placeholder="∞"
            value={max}
            onChange={(e) => onMaxChange(e.target.value)}
            onFocus={() => setActiveField('max')}
            className={`w-full px-3 py-2 bg-darkbg-800 border-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none transition-colors text-center ${activeField === 'max' ? 'border-yellow-500' : 'border-transparent'}`}
          />
        </div>
      </div>
      <div className="flex gap-1">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => applyPreset(preset)}
            className="flex-1 py-1 bg-darkbg-700 hover:bg-darkbg-600 text-[10px] font-medium text-gray-400 hover:text-white rounded-lg transition-colors"
          >
            R${preset}
          </button>
        ))}
      </div>
    </div>
  )
}
