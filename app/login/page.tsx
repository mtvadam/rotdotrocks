'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/Providers'

type Step = 'enter' | 'challenge' | 'verifying'

const STORAGE_KEY = 'rocks_auth_challenge'

interface StoredChallenge {
  robloxUsername: string
  challengePhrase: string
  expiresAt: string
}

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [step, setStep] = useState<Step>('enter')
  const [robloxUsername, setRobloxUsername] = useState('')
  const [challengePhrase, setChallengePhrase] = useState('')
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/trading')
    }
  }, [authLoading, user, router])

  // Restore challenge from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        const data: StoredChallenge = JSON.parse(stored)
        const expires = new Date(data.expiresAt)

        // Check if still valid
        if (expires > new Date()) {
          setRobloxUsername(data.robloxUsername)
          setChallengePhrase(data.challengePhrase)
          setExpiresAt(expires)
          setStep('challenge')
        } else {
          // Expired, clear it
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Update countdown timer
  useEffect(() => {
    if (!expiresAt || step !== 'challenge') return

    const updateTimer = () => {
      const now = new Date()
      const diff = expiresAt.getTime() - now.getTime()

      if (diff <= 0) {
        setTimeLeft('Expired')
        localStorage.removeItem(STORAGE_KEY)
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, step])

  const handleGetChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!robloxUsername.trim()) {
      setError('Please enter your Roblox username')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robloxUsername }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to get challenge')
        return
      }

      const expires = new Date(data.expiresAt)
      setChallengePhrase(data.challengePhrase)
      setExpiresAt(expires)
      setStep('challenge')

      // Store in localStorage
      const toStore: StoredChallenge = {
        robloxUsername,
        challengePhrase: data.challengePhrase,
        expiresAt: data.expiresAt,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch (err) {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyChallenge = async () => {
    await navigator.clipboard.writeText(challengePhrase)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleVerify = async () => {
    setStep('verifying')
    setError('')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ robloxUsername, challengePhrase }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Verification failed')
        setStep('challenge')
        return
      }

      // Clear stored challenge on success
      localStorage.removeItem(STORAGE_KEY)

      await refreshUser()
      router.push('/trading')
    } catch (err) {
      setError('Something went wrong')
      setStep('challenge')
    }
  }

  const handleTryDifferentAccount = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRobloxUsername('')
    setChallengePhrase('')
    setExpiresAt(null)
    setError('')
    setStep('enter')
  }

  // Show loading while checking auth status
  if (authLoading || user) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-darkbg-950 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-darkbg-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-green-500 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="bg-darkbg-900 rounded-2xl border border-darkbg-700 p-6">
          {step === 'enter' && (
            <>
              <h1 className="text-2xl font-bold text-white mb-2">
                Login to RotDotRocks
              </h1>
              <p className="text-gray-400 mb-6">
                Verify your Roblox account to start trading
              </p>

              <form onSubmit={handleGetChallenge}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Roblox Username
                  </label>
                  <input
                    type="text"
                    value={robloxUsername}
                    onChange={(e) => setRobloxUsername(e.target.value)}
                    placeholder="e.g., builderman"
                    className="w-full px-4 py-3 bg-darkbg-800 rounded-xl border-0 focus:ring-2 focus:ring-green-500 text-white placeholder-gray-500"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Continue'
                  )}
                </button>
              </form>
            </>
          )}

          {step === 'challenge' && (
            <>
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-white">
                  Verify Your Account
                </h1>
                {timeLeft && timeLeft !== 'Expired' && (
                  <span className="text-sm font-mono text-amber-400 bg-amber-900/30 px-2 py-1 rounded">
                    {timeLeft}
                  </span>
                )}
              </div>
              <p className="text-gray-400 mb-2">
                Verifying as <span className="font-semibold text-green-500">{robloxUsername}</span>
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Add this code to your Roblox profile &quot;About&quot; section
              </p>

              {/* Challenge Code */}
              <div className="mb-6">
                <div className="flex items-center gap-2 p-4 bg-darkbg-800 rounded-xl">
                  <code className="flex-1 text-lg font-mono text-green-400 select-all break-all">
                    {challengePhrase}
                  </code>
                  <button
                    onClick={handleCopyChallenge}
                    className="p-2 hover:bg-darkbg-700 rounded-lg transition-colors flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <Copy className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="mb-6 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-900/30 text-green-400 rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </span>
                  <p className="text-sm text-gray-400">
                    Copy the code above
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-900/30 text-green-400 rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </span>
                  <p className="text-sm text-gray-400">
                    Go to your{' '}
                    <a
                      href="https://www.roblox.com/users/profile"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-500 hover:underline inline-flex items-center gap-1"
                    >
                      Roblox profile
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-900/30 text-green-400 rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </span>
                  <p className="text-sm text-gray-400">
                    Paste the code anywhere in your &quot;About&quot; section
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-900/30 text-green-400 rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </span>
                  <p className="text-sm text-gray-400">
                    Click &quot;Verify&quot; below (you can remove the code after)
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 mb-4">{error}</p>
              )}

              {timeLeft === 'Expired' ? (
                <div className="space-y-3">
                  <p className="text-sm text-red-500 text-center">Challenge expired. Please try again.</p>
                  <button
                    onClick={handleTryDifferentAccount}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={handleVerify}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    Verify
                  </button>
                  <button
                    onClick={handleTryDifferentAccount}
                    className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try a different account
                  </button>
                </div>
              )}
            </>
          )}

          {step === 'verifying' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                Verifying...
              </h2>
              <p className="text-gray-400">
                Checking your Roblox profile
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
