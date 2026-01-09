'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cookie, X } from 'lucide-react'
import Link from 'next/link'

const CONSENT_STORAGE_KEY = 'cookie_consent'

export function CookieConsent() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!consent) {
      // Small delay to prevent flash on page load
      const timer = setTimeout(() => setShow(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted')
    setShow(false)
  }

  const handleDecline = () => {
    localStorage.setItem(CONSENT_STORAGE_KEY, 'declined')
    setShow(false)
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-[200]"
        >
          <div className="bg-darkbg-900/95 backdrop-blur-xl border border-darkbg-700 rounded-2xl p-5 shadow-2xl shadow-black/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-500/20 rounded-xl flex-shrink-0">
                <Cookie className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold mb-1">Cookie Notice</h3>
                <p className="text-sm text-gray-400 mb-4">
                  We use cookies to keep you logged in and remember your preferences.
                  No tracking or advertising cookies.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleAccept}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2 bg-darkbg-700 hover:bg-darkbg-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    Decline
                  </button>
                  <Link
                    href="/privacy"
                    className="px-4 py-2 text-gray-500 hover:text-gray-400 text-sm transition-colors"
                  >
                    Learn more
                  </Link>
                </div>
              </div>
              <button
                onClick={handleDecline}
                className="p-1 text-gray-500 hover:text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
