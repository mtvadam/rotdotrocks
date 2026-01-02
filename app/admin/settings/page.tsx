'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, RotateCcw, Loader2, Check, AlertCircle, Snowflake } from 'lucide-react'

interface SnowSettings {
  variant: 'square' | 'round' | 'snowflake'
  color: string
  pixelResolution: number
  speed: number
  density: number
  flakeSize: number
  minFlakeSize: number
  brightness: number
  depthFade: number
  farPlane: number
  direction: number
}

interface SiteSettings {
  snowEnabled: boolean
  snow: SnowSettings
}

const DEFAULT_SNOW_SETTINGS: SnowSettings = {
  variant: 'square',
  color: '#ffffff',
  pixelResolution: 80,
  speed: 0.8,
  density: 0.2,
  flakeSize: 0.006,
  minFlakeSize: 1.25,
  brightness: 1,
  depthFade: 8,
  farPlane: 29,
  direction: 100,
}

const DEFAULT_SETTINGS: SiteSettings = {
  snowEnabled: true,
  snow: DEFAULT_SNOW_SETTINGS
}

const VARIANT_OPTIONS = [
  { value: 'square', label: 'Square', description: 'Pixelated square flakes' },
  { value: 'round', label: 'Round', description: 'Circular soft flakes' },
  { value: 'snowflake', label: 'Snowflake', description: 'Detailed snowflake shapes' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSnowSeason, setIsSnowSeason] = useState(false)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/settings')
      const data = await res.json()
      if (data.settings) {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data.settings,
          snow: { ...DEFAULT_SNOW_SETTINGS, ...(data.settings.snow || {}) }
        })
        setIsSnowSeason(data.isSnowSeason)
      }
    } catch {
      setError('Failed to load settings')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const updateSetting = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
    setSaved(false)
  }

  const updateSnowSetting = <K extends keyof SnowSettings>(key: K, value: SnowSettings[K]) => {
    setSettings(prev => ({
      ...prev,
      snow: { ...prev.snow, [key]: value }
    }))
    setHasChanges(true)
    setSaved(false)
  }

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
    setHasChanges(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      setSaved(true)
      setHasChanges(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
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
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Settings className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Site Settings</h1>
            <p className="text-sm text-gray-500">Configure site-wide features and effects</p>
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
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
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

      {loading ? (
        <div className="space-y-4">
          <div className="h-48 skeleton rounded-xl" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seasonal Snow Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-darkbg-900 rounded-xl border border-darkbg-700 overflow-hidden"
          >
            <div className="p-6 border-b border-darkbg-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <Snowflake className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Seasonal Snow Effect</h2>
                  <p className="text-sm text-gray-500">
                    Display falling snow during winter season (Dec 1 - Jan 31)
                  </p>
                </div>
                {isSnowSeason ? (
                  <span className="ml-auto px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
                    Currently in season
                  </span>
                ) : (
                  <span className="ml-auto px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full">
                    Off season
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Snow Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Enable Snow</p>
                  <p className="text-sm text-gray-500">
                    Show pixel snow effect when in season
                  </p>
                </div>
                <button
                  onClick={() => updateSetting('snowEnabled', !settings.snowEnabled)}
                  className={`relative w-14 h-8 rounded-full transition-colors ${
                    settings.snowEnabled ? 'bg-green-600' : 'bg-darkbg-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                      settings.snowEnabled ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {/* Variant */}
              <div>
                <p className="font-medium text-white mb-3">Variant</p>
                <div className="grid grid-cols-3 gap-3">
                  {VARIANT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => updateSnowSetting('variant', option.value as SnowSettings['variant'])}
                      disabled={!settings.snowEnabled}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        settings.snow.variant === option.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-darkbg-600 bg-darkbg-800 hover:border-darkbg-500'
                      } ${!settings.snowEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <p className={`font-medium ${
                        settings.snow.variant === option.value ? 'text-blue-400' : 'text-white'
                      }`}>
                        {option.label}
                      </p>
                      <p className="text-sm text-gray-500">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-white">Color</p>
                  <p className="text-sm text-gray-500">Snow flake color</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.snow.color}
                    onChange={(e) => updateSnowSetting('color', e.target.value)}
                    disabled={!settings.snowEnabled}
                    className="w-10 h-10 rounded-lg border border-darkbg-600 bg-darkbg-700 cursor-pointer disabled:opacity-50"
                  />
                  <input
                    type="text"
                    value={settings.snow.color}
                    onChange={(e) => updateSnowSetting('color', e.target.value)}
                    disabled={!settings.snowEnabled}
                    className="w-28 px-3 py-2 bg-darkbg-700 border border-darkbg-600 rounded-lg text-white font-mono text-sm disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pixel Resolution */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Pixel Resolution</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.pixelResolution}</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="300"
                    step="10"
                    value={settings.snow.pixelResolution}
                    onChange={(e) => updateSnowSetting('pixelResolution', parseInt(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">Lower = more pixelated</p>
                </div>

                {/* Speed */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Speed</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.speed.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={settings.snow.speed}
                    onChange={(e) => updateSnowSetting('speed', parseFloat(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Density */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Density</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.density.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.6"
                    step="0.01"
                    value={settings.snow.density}
                    onChange={(e) => updateSnowSetting('density', parseFloat(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Flake Size */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Flake Size</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.flakeSize.toFixed(3)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.001"
                    max="0.03"
                    step="0.001"
                    value={settings.snow.flakeSize}
                    onChange={(e) => updateSnowSetting('flakeSize', parseFloat(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Brightness */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Brightness</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.brightness.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="2"
                    step="0.1"
                    value={settings.snow.brightness}
                    onChange={(e) => updateSnowSetting('brightness', parseFloat(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Depth Fade */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Depth Fade</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.depthFade}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    step="1"
                    value={settings.snow.depthFade}
                    onChange={(e) => updateSnowSetting('depthFade', parseInt(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Far Plane */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Far Plane</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.farPlane}</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="1"
                    value={settings.snow.farPlane}
                    onChange={(e) => updateSnowSetting('farPlane', parseInt(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>

                {/* Direction */}
                <div>
                  <div className="flex justify-between mb-2">
                    <p className="font-medium text-white">Direction</p>
                    <span className="text-blue-400 font-mono text-sm">{settings.snow.direction}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={settings.snow.direction}
                    onChange={(e) => updateSnowSetting('direction', parseInt(e.target.value))}
                    disabled={!settings.snowEnabled}
                    className="w-full accent-blue-500 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Info Box */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-darkbg-800 rounded-lg border border-darkbg-700"
          >
            <h3 className="text-sm font-medium text-white mb-2">How Seasonal Effects Work</h3>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Snow only appears during the winter season (December 1st through January 31st)</li>
              <li>• When enabled, a pixel snow effect displays behind page content</li>
              <li>• Changes take effect within 60 seconds due to caching</li>
              <li>• The effect is GPU-accelerated and only renders when visible</li>
            </ul>
          </motion.div>
        </div>
      )}
    </div>
  )
}
