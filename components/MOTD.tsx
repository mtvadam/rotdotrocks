'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface MOTDData {
  enabled: boolean
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  dismissible: boolean
  showIcon: boolean
}

// Convert URLs in text to clickable links
function linkify(text: string): React.ReactNode[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)

  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:opacity-80 transition-opacity"
        >
          {part}
        </a>
      )
    }
    return part
  })
}

const DISMISS_STORAGE_KEY = 'motd_dismissed'

// Simple hash function for message comparison
function hashMessage(message: string): string {
  let hash = 0
  for (let i = 0; i < message.length; i++) {
    const char = message.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

export function MOTD() {
  const [data, setData] = useState<MOTDData | null>(null)
  const [dismissed, setDismissed] = useState(true) // Start dismissed to prevent flash

  useEffect(() => {
    // Fetch MOTD first, then check if dismissed
    fetch('/api/settings/motd')
      .then(res => res.json())
      .then(json => {
        setData(json)

        if (!json.enabled || !json.message) {
          setDismissed(true)
          return
        }

        // Check if this specific message was dismissed
        const dismissedHash = localStorage.getItem(DISMISS_STORAGE_KEY)
        const currentHash = hashMessage(json.message)

        if (dismissedHash === currentHash) {
          // Same message was dismissed
          setDismissed(true)
        } else {
          // New message or never dismissed
          setDismissed(false)
        }
      })
      .catch(() => setData(null))
  }, [])

  const handleDismiss = () => {
    if (!data?.message) return
    setDismissed(true)
    // Store hash of the dismissed message
    localStorage.setItem(DISMISS_STORAGE_KEY, hashMessage(data.message))
  }

  // Don't show if no data, not enabled, no message, or dismissed
  if (!data || !data.enabled || !data.message || dismissed) {
    return null
  }

  const typeConfig = {
    info: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
      icon: Info,
    },
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      text: 'text-green-400',
      icon: CheckCircle,
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      icon: AlertTriangle,
    },
    error: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: XCircle,
    },
  }

  const config = typeConfig[data.type]
  const Icon = config.icon

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`relative z-[100] ${config.bg} border-b ${config.border}`}
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-3">
            {data.showIcon && <Icon className={`w-4 h-4 ${config.text} flex-shrink-0`} />}
            <p className={`text-sm ${config.text}`}>{linkify(data.message)}</p>
            {data.dismissible && (
              <button
                onClick={handleDismiss}
                className={`ml-2 p-1 rounded-lg hover:bg-white/10 transition-colors ${config.text}`}
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
