'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Gem } from 'lucide-react'

interface GemData {
  gems: number
  nextRefreshAt: string
  dailyAmount: number
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Now!'

  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function GemDisplay() {
  const [data, setData] = useState<GemData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHovered, setIsHovered] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/gems')
      .then((r) => r.json())
      .then((d) => {
        if (d.gems !== undefined) {
          setData(d)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Update countdown timer
  useEffect(() => {
    if (!data?.nextRefreshAt) return

    const updateTimer = () => {
      const remaining = new Date(data.nextRefreshAt).getTime() - Date.now()
      setTimeRemaining(Math.max(0, remaining))

      // If timer hit zero, refetch to get new gems
      if (remaining <= 0) {
        fetch('/api/gems')
          .then((r) => r.json())
          .then((d) => {
            if (d.gems !== undefined) {
              setData(d)
            }
          })
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000)
    return () => clearInterval(interval)
  }, [data?.nextRefreshAt])

  // Update position when hovered
  useEffect(() => {
    if (isHovered && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left + rect.width / 2,
      })
    }
  }, [isHovered])

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-darkbg-800 rounded-lg">
        <div className="w-4 h-4 skeleton rounded" />
        <div className="w-8 h-4 skeleton rounded" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div
      ref={triggerRef}
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <motion.div
        whileHover={{ scale: 1.05 }}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-darkbg-800 rounded-lg cursor-default"
      >
        <Gem className="w-4 h-4 text-emerald-400" />
        <span className="text-sm font-semibold text-white">{data.gems}</span>
      </motion.div>

      {typeof window !== 'undefined' && isHovered && createPortal(
        <div
          style={{ top: position.top, left: position.left }}
          className="fixed z-[100] -translate-x-1/2"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="relative">
            {/* Arrow */}
            <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-darkbg-800/90 backdrop-blur-xl rotate-45 z-0" />
            {/* Tooltip content */}
            <div className="relative z-10 bg-darkbg-800/90 backdrop-blur-xl rounded-lg p-3 shadow-xl min-w-[160px]">
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">Next +{data.dailyAmount} gems in</p>
                <p className="text-lg font-bold text-emerald-400">
                  {formatTimeRemaining(timeRemaining)}
                </p>
                <p className="text-[10px] text-gray-500 mt-2">
                  +5 bonus for verified trades
                </p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
