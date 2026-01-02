'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, ArrowRightLeft, Gem, Loader2 } from 'lucide-react'
import { BrainrotPicker } from './BrainrotPicker'
import { TradeItemDisplay } from './TradeItemDisplay'
import { useAuth } from '@/components/Providers'
import { useToast } from '@/components/ui'
import { easeOut, modalVariants, backdropVariants } from '@/lib/animations'

// Trade add-ons for flexibility
const TRADE_ADDONS = [
  { id: 'addon-robux', name: 'Add Robux', image: '/trade-only/add-robux.png' },
  { id: 'addon-adds', name: 'Adds', image: '/trade-only/trade-adds.png' },
  { id: 'addon-upgrade', name: 'Upgrade', image: '/trade-only/trade-upgrade.png' },
  { id: 'addon-downgrade', name: 'Downgrade', image: '/trade-only/trade-downgrade.png' },
]

interface TradeItem {
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
  eventId?: string
  event?: {
    id: string
    name: string
  }
  calculatedIncome?: string
}

interface TradeBuilderModalProps {
  onClose: () => void
  onSuccess?: () => void
  parentTradeId?: string // For counter offers
  initialOfferItems?: TradeItem[]
  initialRequestItems?: TradeItem[]
}

export function TradeBuilderModal({ onClose, onSuccess, parentTradeId, initialOfferItems = [], initialRequestItems = [] }: TradeBuilderModalProps) {
  const { user, refreshUser } = useAuth()
  const toast = useToast()
  const [offerItems, setOfferItems] = useState<TradeItem[]>(initialOfferItems)
  const [requestItems, setRequestItems] = useState<TradeItem[]>(initialRequestItems)
  const [pickerSide, setPickerSide] = useState<'OFFER' | 'REQUEST' | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const isCounterOffer = !!parentTradeId
  const gemCost = isCounterOffer ? 0 : 5

  const handleAddItem = (side: 'OFFER' | 'REQUEST') => {
    const items = side === 'OFFER' ? offerItems : requestItems
    if (items.length >= 4) {
      setError('Maximum 4 items per side')
      return
    }
    setEditingIndex(null)
    setPickerSide(side)
  }

  const handleEditItem = (side: 'OFFER' | 'REQUEST', index: number) => {
    setEditingIndex(index)
    setPickerSide(side)
  }

  const handleSelectItem = (item: TradeItem) => {
    if (editingIndex !== null) {
      // Editing existing item - replace it
      if (pickerSide === 'OFFER') {
        setOfferItems((prev) => prev.map((it, i) => i === editingIndex ? item : it))
      } else {
        setRequestItems((prev) => prev.map((it, i) => i === editingIndex ? item : it))
      }
    } else {
      // Adding new item
      if (pickerSide === 'OFFER') {
        setOfferItems((prev) => [...prev, item])
      } else {
        setRequestItems((prev) => [...prev, item])
      }
    }
    setPickerSide(null)
    setEditingIndex(null)
    setError('')
  }

  const handleRemoveItem = (side: 'OFFER' | 'REQUEST', index: number) => {
    if (side === 'OFFER') {
      setOfferItems((prev) => prev.filter((_, i) => i !== index))
    } else {
      setRequestItems((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // Get item being edited for initial picker values
  const getEditingItem = () => {
    if (editingIndex === null || !pickerSide) return undefined
    const items = pickerSide === 'OFFER' ? offerItems : requestItems
    return items[editingIndex]
  }

  const handleAddAddon = (side: 'OFFER' | 'REQUEST', addon: typeof TRADE_ADDONS[0]) => {
    const items = side === 'OFFER' ? offerItems : requestItems
    if (items.length >= 4) {
      setError('Maximum 4 items per side')
      return
    }

    const addonItem: TradeItem = {
      brainrotId: addon.id,
      brainrot: {
        id: addon.id,
        name: addon.name,
        localImage: addon.image,
        baseIncome: '0',
      },
    }

    if (side === 'OFFER') {
      setOfferItems((prev) => [...prev, addonItem])
    } else {
      setRequestItems((prev) => [...prev, addonItem])
    }
    setError('')
  }

  // Check if an addon is already added to a side
  const isAddonAdded = (side: 'OFFER' | 'REQUEST', addonId: string) => {
    const items = side === 'OFFER' ? offerItems : requestItems
    return items.some((item) => item.brainrotId === addonId)
  }

  const handleSubmit = async () => {
    if (offerItems.length === 0 || requestItems.length === 0) {
      setError('Must have at least one item on each side')
      return
    }

    if (!isCounterOffer && (!user || user.gems < 5)) {
      setError('Not enough gems (need 5)')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerItems: offerItems.map((item) => ({
            brainrotId: item.brainrotId,
            mutationId: item.mutationId,
            eventId: item.eventId,
            traitIds: item.traitIds,
            calculatedIncome: item.calculatedIncome,
          })),
          requestItems: requestItems.map((item) => ({
            brainrotId: item.brainrotId,
            mutationId: item.mutationId,
            eventId: item.eventId,
            traitIds: item.traitIds,
            calculatedIncome: item.calculatedIncome,
          })),
          parentTradeId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create trade')
        toast.error(data.error || 'Failed to create trade')
        return
      }

      refreshUser()
      toast.success(isCounterOffer ? 'Counter offer sent!' : 'Trade created successfully!')
      onSuccess?.()
      onClose()
    } catch {
      setError('Something went wrong')
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = offerItems.length > 0 && requestItems.length > 0 && !submitting

  return (
    <>
      <motion.div
        variants={backdropVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        onClick={onClose}
        className="fixed inset-0 z-40 flex items-start md:items-center justify-center pt-4 md:pt-0 bg-black/40 backdrop-blur-sm will-change-[opacity] overflow-y-auto"
      >
        <motion.div
          variants={modalVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
          className="bg-darkbg-900/95 backdrop-blur-xl rounded-2xl w-full max-w-3xl max-h-[calc(100dvh-2rem)] md:max-h-[85vh] mx-3 md:mx-4 mb-4 md:mb-0 overflow-hidden flex flex-col shadow-2xl border border-darkbg-700 flex-shrink-0"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-3 md:p-4 border-b border-darkbg-700 flex-shrink-0">
              <div className="flex items-center gap-2 md:block">
                <h2 className="text-base md:text-lg font-bold text-white">
                  {isCounterOffer ? 'Counter Offer' : 'Create Trade'}
                </h2>
                {!isCounterOffer && (
                  <span className="text-xs md:text-sm text-gray-500 flex items-center gap-1">
                    <Gem className="w-3 h-3 md:w-4 md:h-4 text-amber-500" />
                    <span className="hidden md:inline">Costs</span> 5 gems
                  </span>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="p-2 rounded-xl bg-darkbg-800 hover:bg-darkbg-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4">
              <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr] gap-2 md:gap-4">
                {/* Offer Side */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white">
                      You&apos;re Offering
                    </h3>
                    <span className="text-sm text-gray-500">{offerItems.length}/4</span>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {offerItems.map((item, index) => {
                        const isAddon = item.brainrotId.startsWith('addon-')
                        return (
                          <TradeItemDisplay
                            key={`offer-${index}-${item.brainrotId}`}
                            item={{
                              id: index.toString(),
                              brainrot: item.brainrot,
                              mutation: item.mutation,
                              event: item.event,
                              traits: item.traits?.map((t) => ({ trait: t })),
                              calculatedIncome: item.calculatedIncome,
                            }}
                            index={index}
                            interactive
                            onEdit={isAddon ? undefined : () => handleEditItem('OFFER', index)}
                            onRemove={() => handleRemoveItem('OFFER', index)}
                          />
                        )
                      })}
                    </AnimatePresence>
                    {offerItems.length < 4 && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{
                          scale: 1.01,
                          borderColor: 'rgba(34, 197, 94, 0.5)',
                          transition: { duration: 0.15 },
                        }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleAddItem('OFFER')}
                        className="w-full py-4 border-2 border-dashed border-darkbg-600 rounded-xl text-gray-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        {offerItems.length > 0 ? 'Add Another' : 'Add Item'}
                      </motion.button>
                    )}
                    {/* Quick Add-ons */}
                    {offerItems.length < 4 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="pt-2"
                      >
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Quick add</p>
                        <div className="flex flex-wrap gap-1.5">
                          {TRADE_ADDONS.map((addon) => {
                            const added = isAddonAdded('OFFER', addon.id)
                            return (
                              <motion.button
                                key={addon.id}
                                whileHover={{ scale: added ? 1 : 1.05 }}
                                whileTap={{ scale: added ? 1 : 0.95 }}
                                onClick={() => !added && handleAddAddon('OFFER', addon)}
                                disabled={added}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  added
                                    ? 'bg-darkbg-700 text-gray-500 cursor-not-allowed opacity-50'
                                    : 'bg-darkbg-700 hover:bg-darkbg-600 text-gray-300'
                                }`}
                              >
                                <Image src={addon.image} alt={addon.name} width={16} height={16} className="rounded" />
                                {addon.name}
                              </motion.button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>

                {/* Arrow - visible on mobile as horizontal divider, centered vertically on desktop */}
                <div className="flex items-center justify-center py-2 md:py-0">
                  <motion.div
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="rotate-90 md:rotate-0"
                  >
                    <ArrowRightLeft className="w-6 h-6 text-green-500/60" />
                  </motion.div>
                </div>

                {/* Request Side */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease: easeOut }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`font-semibold transition-all duration-300 ${
                      requestItems.length === 0
                        ? 'text-green-400 md:text-white animate-pulse md:animate-none drop-shadow-[0_0_8px_rgba(34,197,94,0.6)] md:drop-shadow-none'
                        : 'text-white'
                    }`}>
                      You&apos;re Looking For
                    </h3>
                    <span className="text-sm text-gray-500">{requestItems.length}/4</span>
                  </div>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {requestItems.map((item, index) => {
                        const isAddon = item.brainrotId.startsWith('addon-')
                        return (
                          <TradeItemDisplay
                            key={`request-${index}-${item.brainrotId}`}
                            item={{
                              id: index.toString(),
                              brainrot: item.brainrot,
                              mutation: item.mutation,
                              event: item.event,
                              traits: item.traits?.map((t) => ({ trait: t })),
                              calculatedIncome: item.calculatedIncome,
                            }}
                            index={index}
                            interactive
                            onEdit={isAddon ? undefined : () => handleEditItem('REQUEST', index)}
                            onRemove={() => handleRemoveItem('REQUEST', index)}
                          />
                        )
                      })}
                    </AnimatePresence>
                    {requestItems.length < 4 && (
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        whileHover={{
                          scale: 1.01,
                          borderColor: 'rgba(34, 197, 94, 0.5)',
                          transition: { duration: 0.15 },
                        }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => handleAddItem('REQUEST')}
                        className="w-full py-4 border-2 border-dashed border-darkbg-600 rounded-xl text-gray-500 hover:text-green-500 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        {requestItems.length > 0 ? 'Add Another' : 'Add Item'}
                      </motion.button>
                    )}
                    {/* Quick Add-ons */}
                    {requestItems.length < 4 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="pt-2"
                      >
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">Quick add</p>
                        <div className="flex flex-wrap gap-1.5">
                          {TRADE_ADDONS.map((addon) => {
                            const added = isAddonAdded('REQUEST', addon.id)
                            return (
                              <motion.button
                                key={addon.id}
                                whileHover={{ scale: added ? 1 : 1.05 }}
                                whileTap={{ scale: added ? 1 : 0.95 }}
                                onClick={() => !added && handleAddAddon('REQUEST', addon)}
                                disabled={added}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  added
                                    ? 'bg-darkbg-700 text-gray-500 cursor-not-allowed opacity-50'
                                    : 'bg-darkbg-700 hover:bg-darkbg-600 text-gray-300'
                                }`}
                              >
                                <Image src={addon.image} alt={addon.name} width={16} height={16} className="rounded" />
                                {addon.name}
                              </motion.button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    transition={{ duration: 0.2, ease: easeOut }}
                    className="mt-4 text-sm text-red-500 text-center bg-red-900/20 py-2 px-4 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1, ease: easeOut }}
              className="p-3 md:p-4 border-t border-darkbg-700 flex-shrink-0"
            >
              <motion.button
                whileHover={canSubmit ? { scale: 1.01, y: -1 } : {}}
                whileTap={canSubmit ? { scale: 0.99 } : {}}
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`
                  w-full py-2.5 md:py-3 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm md:text-base
                  ${canSubmit
                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/25'
                    : 'bg-darkbg-700 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : isCounterOffer ? (
                  'Send Counter Offer'
                ) : (
                  <>
                    <Gem className="w-4 h-4" />
                    Create Trade ({gemCost} gems)
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>

      {/* Brainrot Picker */}
      <AnimatePresence>
        {pickerSide && (
          <BrainrotPicker
            onSelect={handleSelectItem}
            onClose={() => {
              setPickerSide(null)
              setEditingIndex(null)
            }}
            initialItem={getEditingItem()}
          />
        )}
      </AnimatePresence>
    </>
  )
}
