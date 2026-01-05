'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { X, Flag, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { backdropVariants, modalVariants } from '@/lib/animations'

interface BrainrotContext {
  id: string
  name: string
  baseIncome: string
  localImage?: string | null
}

interface MutationContext {
  id: string
  name: string
  multiplier: number
}

interface TraitContext {
  id: string
  name: string
  multiplier: number
  localImage?: string | null
}

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  brainrot?: BrainrotContext | null
  mutation?: MutationContext | null
  traits?: TraitContext[]
}

const REPORT_TYPES = [
  { value: 'BRAINROT_VALUE', label: 'Incorrect Brainrot Value', description: 'Base cost or income is wrong' },
  { value: 'TRAIT_MULTIPLIER', label: 'Incorrect Trait Multiplier', description: 'Trait multiplier value is wrong' },
  { value: 'MUTATION_MULTIPLIER', label: 'Incorrect Mutation Multiplier', description: 'Mutation multiplier is wrong' },
  { value: 'CALCULATION_FORMULA', label: 'Calculation Formula Bug', description: 'The income calculation is incorrect' },
  { value: 'OTHER', label: 'Other Issue', description: 'Something else is wrong' },
]

export function ReportModal({
  isOpen,
  onClose,
  brainrot,
  mutation,
  traits,
}: ReportModalProps) {
  const [type, setType] = useState('CALCULATION_FORMULA')
  const [description, setDescription] = useState('')
  const [expectedValue, setExpectedValue] = useState('')
  const [actualValue, setActualValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please provide a description')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          description,
          expectedValue: expectedValue || undefined,
          actualValue: actualValue || undefined,
          brainrotId: brainrot?.id,
          traitId: traits?.[0]?.id, // Link to first selected trait if any
          mutationId: mutation?.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit report')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
        // Reset form
        setType('CALCULATION_FORMULA')
        setDescription('')
        setExpectedValue('')
        setActualValue('')
        setSuccess(false)
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit report')
    }

    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-md"
        >
          <motion.div
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="bg-darkbg-900/90 backdrop-blur-xl rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-darkbg-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-darkbg-700">
              <div className="flex items-center gap-2">
                <Flag className="w-5 h-5 text-orange-400" />
                <h2 className="text-lg font-bold text-white">Report an Issue</h2>
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

            {success ? (
              <div className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </motion.div>
                <h3 className="text-lg font-semibold text-white mb-2">Report Submitted</h3>
                <p className="text-gray-400 text-sm">Thank you for helping improve our data!</p>
              </div>
            ) : (
              <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Context */}
                {brainrot && (
                  <div className="flex items-center gap-3 p-3 bg-darkbg-800 rounded-lg">
                    {brainrot.localImage && (
                      <Image
                        src={brainrot.localImage}
                        alt={brainrot.name}
                        width={40}
                        height={40}
                        className="rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-white text-sm">{brainrot.name}</p>
                      <p className="text-xs text-gray-500">
                        Base Income: ${brainrot.baseIncome}/s
                        {mutation && ` | ${mutation.name} (${mutation.multiplier}x)`}
                      </p>
                    </div>
                  </div>
                )}

                {traits && traits.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {traits.map((trait) => (
                      <div
                        key={trait.id}
                        className="flex items-center gap-2 px-2 py-1 bg-darkbg-800 rounded-lg"
                      >
                        {trait.localImage && (
                          <Image
                            src={trait.localImage}
                            alt={trait.name}
                            width={20}
                            height={20}
                            className="rounded"
                          />
                        )}
                        <span className="text-xs text-white">{trait.name}</span>
                        <span className="text-xs text-gray-500">{trait.multiplier}x</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Type Selection */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Issue Type
                  </label>
                  <div className="space-y-2">
                    {REPORT_TYPES.map((rt) => (
                      <button
                        key={rt.value}
                        onClick={() => setType(rt.value)}
                        className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                          type === rt.value
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-darkbg-700 bg-darkbg-800 hover:border-darkbg-600'
                        }`}
                      >
                        <p className="font-medium text-white text-sm">{rt.label}</p>
                        <p className="text-xs text-gray-500">{rt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium text-gray-400 mb-2 block">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the issue in detail..."
                    className="w-full px-4 py-3 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 resize-none"
                    rows={3}
                  />
                </div>

                {/* Expected vs Actual */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">
                      Expected Value
                    </label>
                    <input
                      type="text"
                      value={expectedValue}
                      onChange={(e) => setExpectedValue(e.target.value)}
                      placeholder="What it should be"
                      className="w-full px-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400 mb-2 block">
                      Actual Value
                    </label>
                    <input
                      type="text"
                      value={actualValue}
                      onChange={(e) => setActualValue(e.target.value)}
                      placeholder="What it currently is"
                      className="w-full px-4 py-2 bg-darkbg-800 border border-darkbg-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            {!success && (
              <div className="p-4 border-t border-darkbg-700">
                <button
                  onClick={handleSubmit}
                  disabled={loading || !description.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit Report
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
