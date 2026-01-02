'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink } from 'lucide-react'

interface EventInfo {
  name: string
  description: string | null
  startUtc: string
  endUtc: string | null
  eventUrl: string | null
}

interface AdminAbuseData {
  live: EventInfo | null
  upcoming: EventInfo | null
}

function formatCountdown(diff: number): string {
  if (diff <= 0) return 'now'
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

function EventCard({ event, isLive }: { event: EventInfo; isLive: boolean }) {
  const [countdown, setCountdown] = useState('')
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const cardRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const target = isLive && event.endUtc
        ? new Date(event.endUtc)
        : new Date(event.startUtc)
      setCountdown(formatCountdown(target.getTime() - now.getTime()))
    }

    update()
    const i = setInterval(update, 60000)
    return () => clearInterval(i)
  }, [event, isLive])

  const handleMouseEnter = () => {
    if (!event.description || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const tooltipWidth = 256 // w-64 = 16rem = 256px
    // Check if tooltip would overflow right side of viewport
    let left = rect.left
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = window.innerWidth - tooltipWidth - 16
    }
    setTooltipPos({ top: rect.bottom + 8, left })
    setShowTooltip(true)
  }

  return (
    <>
      <a
        ref={cardRef}
        href={event.eventUrl || 'https://www.roblox.com/games/109983668079237/Steal-a-Brainrot'}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setShowTooltip(false)}
        className={`
          group/card flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-nowrap
          ${isLive
            ? 'bg-red-950/40 hover:bg-red-950/60'
            : 'bg-darkbg-800/60 hover:bg-darkbg-800'
          }
        `}
      >
        {isLive && (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
        <span className={`text-xs font-medium ${isLive ? 'text-red-400' : 'text-gray-300'}`}>
          {isLive ? event.name : 'Next Admin Abuse'}
        </span>
        {!isLive && <span className="text-[10px] text-gray-500">in</span>}
        <span className={`text-xs ${isLive ? 'font-mono text-red-400/70' : 'text-green-500 font-mono'}`}>
          {isLive ? (event.endUtc ? countdown : 'LIVE') : countdown}
        </span>
        <ExternalLink className={`w-3 h-3 shrink-0 ${isLive ? 'text-red-400/50' : 'text-gray-500'} md:w-0 md:group-hover/card:w-3 transition-all duration-200 overflow-hidden`} />
      </a>

      {/* Portal tooltip with glass effect */}
      {typeof window !== 'undefined' && event.description && showTooltip && createPortal(
        <div
          style={{ top: tooltipPos.top, left: tooltipPos.left }}
          className="fixed z-[100] w-64 p-2 bg-darkbg-950/90 backdrop-blur-xl border border-darkbg-600 rounded-lg shadow-2xl shadow-black/50 pointer-events-none"
        >
          <p className="text-xs text-gray-400">{event.description}</p>
        </div>,
        document.body
      )}
    </>
  )
}

function useAdminAbuseData() {
  const [data, setData] = useState<AdminAbuseData>({ live: null, upcoming: null })
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (fresh = false) => {
    try {
      const res = await fetch(`/api/admin-abuse${fresh ? '?fresh=1' : ''}`)
      const json = await res.json()
      setData(json)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Poll for end time if live event has no end date
  useEffect(() => {
    if (!data.live || data.live.endUtc) return
    const interval = setInterval(() => fetchData(true), 60000)
    return () => clearInterval(interval)
  }, [data.live, fetchData])

  return { data, loading }
}

export function LiveEventCard() {
  const { data, loading } = useAdminAbuseData()
  if (loading || !data.live) return null
  return <EventCard event={data.live} isLive />
}

export function UpcomingEventCard() {
  const { data, loading } = useAdminAbuseData()
  if (loading || !data.upcoming) return null
  return <EventCard event={data.upcoming} isLive={false} />
}

export function AdminAbuseCard() {
  const { data, loading } = useAdminAbuseData()

  if (loading) return null
  if (!data.live && !data.upcoming) return null

  return (
    <div className="flex flex-row gap-2">
      {data.live && <EventCard event={data.live} isLive />}
      {data.upcoming && <EventCard event={data.upcoming} isLive={false} />}
    </div>
  )
}
