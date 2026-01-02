'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Copy, Check, Loader2, ExternalLink, RefreshCw, ChevronDown } from 'lucide-react'
import { useAuth } from '@/components/Providers'
import { easeOut } from '@/lib/animations'

type Step = 'choose' | 'phrase-enter' | 'phrase-challenge' | 'verifying'

const STORAGE_KEY = 'rocks_auth_challenge'

interface StoredChallenge {
  robloxUsername: string
  challengePhrase: string
  expiresAt: string
}

const floatingBrainrots = [
  { src: '/brainrot-images/brainrots/tralalero-tralala.png', className: 'top-[15%] left-[8%]', delay: 0, size: 60 },
  { src: '/brainrot-images/brainrots/bombardiro-crocodilo.png', className: 'top-[20%] right-[10%]', delay: 0.5, size: 70 },
  { src: '/brainrot-images/brainrots/cappuccino-assassino.png', className: 'bottom-[25%] left-[5%]', delay: 1, size: 55 },
  { src: '/brainrot-images/brainrots/brr-brr-patapim.png', className: 'bottom-[15%] right-[8%]', delay: 1.5, size: 65 },
  { src: '/brainrot-images/brainrots/chimpanzini-bananini.png', className: 'top-[45%] left-[3%]', delay: 2, size: 50 },
  { src: '/brainrot-images/brainrots/tung-tung-tung-sahur.png', className: 'top-[40%] right-[5%]', delay: 2.5, size: 55 },
]

function RobloxIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 56 56" fill="currentColor">
      <path d="M11.676 0 0 44.166 43.577 56l11.676-44.166zm20.409 35.827-12.177-3.308 3.264-12.342 12.182 3.308z"/>
    </svg>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading, refreshUser } = useAuth()
  const [step, setStep] = useState<Step>('choose')
  const [robloxUsername, setRobloxUsername] = useState('')
  const [challengePhrase, setChallengePhrase] = useState('')
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPhraseOption, setShowPhraseOption] = useState(false)

  // Check for OAuth errors
  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        'invalid_state': 'Session expired. Please try again.',
        'missing_params': 'Authentication failed. Please try again.',
        'token_exchange_failed': 'Failed to authenticate with Roblox. Please try again.',
        'userinfo_failed': 'Failed to get your Roblox info. Please try again.',
        'account_banned': 'Your account has been banned.',
        'oauth_not_configured': 'OAuth is not configured. Please use phrase verification.',
      }
      setError(errorMessages[errorParam] || decodeURIComponent(errorParam))
    }
  }, [searchParams])

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

        if (expires > new Date()) {
          setRobloxUsername(data.robloxUsername)
          setChallengePhrase(data.challengePhrase)
          setExpiresAt(expires)
          setStep('phrase-challenge')
          setShowPhraseOption(true)
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  // Update countdown timer
  useEffect(() => {
    if (!expiresAt || step !== 'phrase-challenge') return

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

  const handleOAuthLogin = () => {
    setLoading(true)
    window.location.href = '/api/auth/roblox'
  }

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
      setStep('phrase-challenge')

      const toStore: StoredChallenge = {
        robloxUsername,
        challengePhrase: data.challengePhrase,
        expiresAt: data.expiresAt,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
    } catch {
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
        setStep('phrase-challenge')
        return
      }

      localStorage.removeItem(STORAGE_KEY)
      await refreshUser()
      router.push('/trading')
    } catch {
      setError('Something went wrong')
      setStep('phrase-challenge')
    }
  }

  const handleStartOver = () => {
    localStorage.removeItem(STORAGE_KEY)
    setRobloxUsername('')
    setChallengePhrase('')
    setExpiresAt(null)
    setError('')
    setStep('choose')
    setShowPhraseOption(false)
  }

  if (authLoading || user) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-darkbg-950 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-darkbg-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Floating Brainrots Background */}
      <div className="absolute inset-0 pointer-events-none">
        {floatingBrainrots.map((rot, i) => (
          <motion.div
            key={i}
            className={`absolute ${rot.className} opacity-15`}
            initial={{ y: 0, rotate: 0, scale: 0.8 }}
            animate={{
              y: [0, -15, 0],
              rotate: [-8, 8, -8],
              scale: [0.8, 0.85, 0.8],
            }}
            transition={{
              duration: 5 + i * 0.5,
              repeat: Infinity,
              delay: rot.delay,
              ease: "easeInOut"
            }}
          >
            <Image
              src={rot.src}
              alt=""
              width={rot.size}
              height={rot.size}
              className="select-none blur-[0.5px]"
            />
          </motion.div>
        ))}
      </div>


      <div className="w-full max-w-md relative z-10">
        {/* Back Link */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-green-500 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="bg-darkbg-900/80 backdrop-blur-xl rounded-2xl border border-darkbg-700 p-6 shadow-2xl"
        >
          <AnimatePresence mode="wait">
            {/* Choose Login Method */}
            {step === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Welcome to rot.rocks
                  </h1>
                  <p className="text-gray-400">
                    Login with your Roblox account to start trading
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-sm text-red-400"
                  >
                    {error}
                  </motion.div>
                )}

                {/* OAuth Button */}
                <button
                  onClick={handleOAuthLogin}
                  disabled={loading}
                  className="w-full py-4 bg-white hover:bg-gray-100 text-gray-900 font-semibold rounded-xl transition-colors flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <RobloxIcon className="w-5 h-5" />
                      Continue with Roblox
                    </>
                  )}
                </button>

                <div className="mt-4 text-center">
                  <p className="text-xs text-gray-500">
                    You&apos;ll be redirected to Roblox to authorize
                  </p>
                </div>

                {/* Alternative Method */}
                <div className="mt-6 pt-6 border-t border-darkbg-700">
                  <button
                    onClick={() => setShowPhraseOption(!showPhraseOption)}
                    className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <span>Having trouble? Use manual verification</span>
                    <motion.div
                      animate={{ rotate: showPhraseOption ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showPhraseOption && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4">
                          <button
                            onClick={() => setStep('phrase-enter')}
                            className="w-full py-3 bg-darkbg-800 hover:bg-darkbg-700 text-gray-300 font-medium rounded-xl transition-colors border border-darkbg-600 hover:border-darkbg-500"
                          >
                            Verify via Profile Description
                          </button>
                          <p className="mt-2 text-xs text-gray-600 text-center">
                            Add a code to your Roblox profile to verify
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Phrase - Enter Username */}
            {step === 'phrase-enter' && (
              <motion.div
                key="phrase-enter"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  onClick={() => setStep('choose')}
                  className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 text-sm transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>

                <h1 className="text-2xl font-bold text-white mb-2">
                  Manual Verification
                </h1>
                <p className="text-gray-400 mb-6">
                  Enter your Roblox username to get a verification code
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
                      className="w-full px-4 py-3 bg-darkbg-800 rounded-xl border-2 border-transparent focus:border-green-500 focus:ring-0 focus:outline-none text-white placeholder-gray-500 transition-colors"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-500 mb-4">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Get Verification Code'
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {/* Phrase - Challenge */}
            {step === 'phrase-challenge' && (
              <motion.div
                key="phrase-challenge"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-2xl font-bold text-white">
                    Verify Account
                  </h1>
                  {timeLeft && timeLeft !== 'Expired' && (
                    <span className="text-sm font-mono text-amber-400 bg-amber-900/30 px-2 py-1 rounded">
                      {timeLeft}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 mb-1">
                  Verifying as <span className="font-semibold text-green-500">{robloxUsername}</span>
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  Add this code to your Roblox profile &quot;About&quot; section
                </p>

                {/* Challenge Code */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 p-4 bg-darkbg-800 rounded-xl border border-darkbg-600">
                    <code className="flex-1 text-lg font-mono text-green-400 select-all break-all">
                      {challengePhrase}
                    </code>
                    <button
                      onClick={handleCopyChallenge}
                      className="p-2 hover:bg-darkbg-700 rounded-lg transition-colors flex-shrink-0 active:scale-95"
                    >
                      {copied ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5 text-gray-500 hover:text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mb-6 space-y-3">
                  {[
                    'Copy the code above',
                    <>Go to your <a href="https://www.roblox.com/users/profile" target="_blank" rel="noopener noreferrer" className="text-green-500 hover:underline inline-flex items-center gap-1">Roblox profile<ExternalLink className="w-3 h-3" /></a></>,
                    'Paste the code in your "About" section',
                    'Click "Verify" below (you can remove the code after)',
                  ].map((text, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <span className="flex-shrink-0 w-6 h-6 bg-green-900/30 text-green-400 rounded-full flex items-center justify-center text-sm font-bold">
                        {i + 1}
                      </span>
                      <p className="text-sm text-gray-400">{text}</p>
                    </motion.div>
                  ))}
                </div>

                {error && (
                  <p className="text-sm text-red-500 mb-4">{error}</p>
                )}

                {timeLeft === 'Expired' ? (
                  <div className="space-y-3">
                    <p className="text-sm text-red-500 text-center">Challenge expired. Please try again.</p>
                    <button
                      onClick={handleStartOver}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors active:scale-[0.98]"
                    >
                      Start Over
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleVerify}
                      className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-xl transition-colors active:scale-[0.98]"
                    >
                      Verify
                    </button>
                    <button
                      onClick={handleStartOver}
                      className="w-full py-2 text-gray-500 hover:text-gray-300 text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Start over
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Verifying */}
            {step === 'verifying' && (
              <motion.div
                key="verifying"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                </motion.div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Verifying...
                </h2>
                <p className="text-gray-400">
                  Checking your Roblox profile
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] bg-darkbg-950 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-green-500 animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
