'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Gauge, Save, RotateCcw, Loader2, Check, AlertCircle } from 'lucide-react'

interface RateLimit {
  endpoint: string
  description: string
  max: number
  windowMs: number
  windowDisplay: string
  isDefault: boolean
}

interface RateLimitDefaults {
  [key: string]: { max: number; windowMs: number }
}

const WINDOW_OPTIONS = [
  { value: 60 * 1000, label: '1 minute' },
  { value: 5 * 60 * 1000, label: '5 minutes' },
  { value: 15 * 60 * 1000, label: '15 minutes' },
  { value: 30 * 60 * 1000, label: '30 minutes' },
  { value: 60 * 60 * 1000, label: '1 hour' },
]

export default function RateLimitsPage() {
  const [rateLimits, setRateLimits] = useState<RateLimit[]>([])
  const [defaults, setDefaults] = useState<RateLimitDefaults>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  const fetchRateLimits = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/rate-limits')
      const data = await res.json()
      if (data.rateLimits) {
        setRateLimits(data.rateLimits)
        setDefaults(data.defaults || {})
      }
    } catch (err) {
      setError('Failed to load rate limits')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRateLimits()
  }, [])

  const updateRateLimit = (endpoint: string, field: 'max' | 'windowMs', value: number) => {
    setRateLimits(prev => prev.map(rl => {
      if (rl.endpoint === endpoint) {
        return { ...rl, [field]: value }
      }
      return rl
    }))
    setHasChanges(true)
    setSaved(false)
  }

  const resetToDefaults = () => {
    setRateLimits(prev => prev.map(rl => {
      const def = defaults[rl.endpoint]
      if (def) {
        return { ...rl, max: def.max, windowMs: def.windowMs }
      }
      return rl
    }))
    setHasChanges(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/rate-limits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rateLimits: rateLimits.map(rl => ({
            endpoint: rl.endpoint,
            max: rl.max,
            windowMs: rl.windowMs
          }))
        })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      setHasChanges(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rate limits')
    }
    setSaving(false)
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Gauge className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Rate Limits</h1>
            <p className="text-sm text-gray-500">Configure API rate limiting per endpoint</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-400">{error}</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-darkbg-900 rounded-xl border border-darkbg-700 overflow-hidden"
      >
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex-1 h-12 skeleton rounded-lg" />
                <div className="w-24 h-12 skeleton rounded-lg" />
                <div className="w-40 h-12 skeleton rounded-lg" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-darkbg-800 border-b border-darkbg-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Endpoint
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Max Requests
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Time Window
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-darkbg-700">
              {rateLimits.map((rl) => {
                const isModified = defaults[rl.endpoint] && (
                  rl.max !== defaults[rl.endpoint].max ||
                  rl.windowMs !== defaults[rl.endpoint].windowMs
                )

                return (
                  <tr key={rl.endpoint} className="hover:bg-darkbg-800/50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{rl.endpoint}</p>
                        <p className="text-sm text-gray-500">{rl.description}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        min="1"
                        value={rl.max}
                        onChange={(e) => updateRateLimit(rl.endpoint, 'max', parseInt(e.target.value) || 1)}
                        className="w-24 px-3 py-2 bg-darkbg-700 border border-darkbg-600 rounded-lg text-white font-mono focus:outline-none focus:border-green-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={rl.windowMs}
                        onChange={(e) => updateRateLimit(rl.endpoint, 'windowMs', parseInt(e.target.value))}
                        className="px-3 py-2 bg-darkbg-700 border border-darkbg-600 rounded-lg text-white focus:outline-none focus:border-green-500"
                      >
                        {WINDOW_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-mono ${isModified ? 'text-orange-400' : 'text-gray-400'}`}>
                        {rl.max} / {formatWindow(rl.windowMs)}
                        {isModified && (
                          <span className="ml-2 text-xs text-orange-400">(modified)</span>
                        )}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mt-6 p-4 bg-darkbg-800 rounded-lg border border-darkbg-700"
      >
        <h3 className="text-sm font-medium text-white mb-2">How Rate Limiting Works</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Rate limits are applied per user (for authenticated endpoints) or per IP (for public endpoints)</li>
          <li>• When a user exceeds the limit, they receive a 429 (Too Many Requests) response</li>
          <li>• Changes take effect immediately (within 60 seconds due to caching)</li>
          <li>• The cache is stored in-memory, so limits reset on server restart</li>
        </ul>
      </motion.div>
    </div>
  )
}

function formatWindow(ms: number): string {
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds}s`
  const minutes = seconds / 60
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  return `${hours}h`
}
