'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { LogIn, Mail, Lock, Gamepad2, Wallet, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, PasswordInput } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()

  // Form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Handle email/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // In production, this would call Supabase auth
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Mock validation
      if (!email || !password) {
        throw new Error('Please enter your email and password')
      }

      // Redirect to casino
      router.push('/casino')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle wallet connect
  const handleWalletConnect = async (walletType: 'metamask' | 'walletconnect') => {
    setError(null)
    setIsLoading(true)

    try {
      // In production, this would connect to wallet
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push('/casino')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wallet connection failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-pink/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Gamepad2 className="w-10 h-10 text-neon-pink" />
            <span className="font-display text-3xl text-white">GTA.BET</span>
          </Link>
          <p className="mt-2 text-text-secondary">Welcome back, player</p>
        </div>

        <Card className="backdrop-blur-sm bg-bg-secondary/80">
          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-status-error/10 border border-status-error/30 flex items-center gap-2 text-status-error text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={isLoading}
            />

            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default text-neon-pink focus:ring-neon-pink"
                />
                <span className="text-sm text-text-secondary">Remember me</span>
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-neon-pink hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              leftIcon={<LogIn className="w-5 h-5" />}
            >
              Sign In
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-default" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-bg-secondary text-text-tertiary">
                Or continue with
              </span>
            </div>
          </div>

          {/* Wallet connect options */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => handleWalletConnect('metamask')}
              disabled={isLoading}
              leftIcon={
                <svg className="w-5 h-5" viewBox="0 0 35 33" fill="none">
                  <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726" stroke="#E17726" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2.66284 1L15.6849 10.809L13.3548 4.99098L2.66284 1Z" fill="#E27625" stroke="#E27625" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M28.2295 23.5334L24.7345 28.872L32.2175 30.9323L34.3611 23.6501L28.2295 23.5334Z" fill="#E27625" stroke="#E27625" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M1.27271 23.6501L3.40355 30.9323L10.8865 28.872L7.39157 23.5334L1.27271 23.6501Z" fill="#E27625" stroke="#E27625" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
            >
              MetaMask
            </Button>

            <Button
              type="button"
              variant="outline"
              fullWidth
              onClick={() => handleWalletConnect('walletconnect')}
              disabled={isLoading}
              leftIcon={<Wallet className="w-5 h-5 text-blue-500" />}
            >
              WalletConnect
            </Button>
          </div>
        </Card>

        {/* Sign up link */}
        <p className="mt-6 text-center text-text-secondary">
          {"Don't have an account? "}
          <Link href="/register" className="text-neon-pink hover:underline font-medium">
            Sign up
          </Link>
        </p>

        {/* Terms */}
        <p className="mt-4 text-center text-xs text-text-tertiary">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-neon-pink hover:underline">
            Terms of Service
          </Link>
          {' and '}
          <Link href="/privacy" className="text-neon-pink hover:underline">
            Privacy Policy
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
