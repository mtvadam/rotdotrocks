'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Sparkles } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function BrainrotsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-darkbg-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 bg-darkbg-800 rounded-2xl flex items-center justify-center border border-darkbg-700">
          <AlertTriangle className="w-8 h-8 text-yellow-500" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-white mb-3">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="text-gray-400 mb-8 leading-relaxed">
          The brainrot index could not be loaded right now. This is a temporary issue — all brainrots are still cataloged safely.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-green-500/25 w-full sm:w-auto justify-center"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 hover:text-white font-semibold rounded-xl transition-colors border border-darkbg-700 w-full sm:w-auto justify-center"
          >
            <Sparkles className="w-4 h-4" />
            Go home
          </Link>
        </div>

        {/* Digest for support reference */}
        {error.digest && (
          <p className="mt-6 text-xs text-gray-600 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
