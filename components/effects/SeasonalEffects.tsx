'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import PixelSnow to avoid SSR issues with Three.js
const PixelSnow = dynamic(() => import('./PixelSnow'), {
  ssr: false,
  loading: () => null
})

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

interface SeasonalData {
  showSnow: boolean
  snow: SnowSettings | null
}

export default function SeasonalEffects() {
  const [data, setData] = useState<SeasonalData | null>(null)

  useEffect(() => {
    // Check if we're in snow season client-side first (quick check)
    const now = new Date()
    const month = now.getMonth()
    const isSnowSeason = month === 11 || month === 0 // Dec or Jan

    if (!isSnowSeason) {
      setData({ showSnow: false, snow: null })
      return
    }

    // Fetch settings from API
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings/seasonal')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch {
        // Silently fail - no snow if API fails
        setData({ showSnow: false, snow: null })
      }
    }

    fetchSettings()
  }, [])

  // Don't render anything until we know the settings
  if (!data?.showSnow || !data.snow) {
    return null
  }

  const { snow } = data

  return (
    <div className="fixed inset-0 pointer-events-none z-[1]">
      <PixelSnow
        variant={snow.variant}
        color={snow.color}
        pixelResolution={snow.pixelResolution}
        speed={snow.speed}
        density={snow.density}
        flakeSize={snow.flakeSize}
        minFlakeSize={snow.minFlakeSize}
        brightness={snow.brightness}
        depthFade={snow.depthFade}
        farPlane={snow.farPlane}
        direction={snow.direction}
      />
    </div>
  )
}
