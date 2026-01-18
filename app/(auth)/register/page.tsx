'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { UserPlus, Mail, Lock, User, Gift, Gamepad2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, PasswordInput } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { cn } from '@/lib/utils'

// Password strength checker
function getPasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-status-error' }
  if (score <= 2) return { score, label: 'Fair', color: 'bg-neon-orange' }
  if (score <= 3) return { score, label: 'Good', color: 'bg-neon-yellow' }
  return { score, label: 'Strong', color: 'bg-neon-green' }
}

export default function RegisterPage() {
  const router = useRouter()

  // Form state
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Validation
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)
  const [checkingUsername, setCheckingUsername] = useState(false)

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password === confirmPassword && password.length > 0

  // Check username availability
  const checkUsername = async (name: string) => {
    if (name.length < 3) {
      setUsernameAvailable(null)
      return
    }

    setCheckingUsername(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    // Mock: usernames starting with 'taken' are unavailable
    setUsernameAvailable(!name.toLowerCase().startsWith('taken'))
    setCheckingUsername(false)
  }

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all required fields')
      return
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service')
      return
    }

    setIsLoading(true)

    try {
      // In production, this would call Supabase auth
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Redirect to casino
      router.push('/casino')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 py-12">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-neon-cyan/10 rounded-full blur-3xl" />
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
          <p className="mt-2 text-text-secondary">Join the Vice City Casino</p>
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

          {/* Register form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={isLoading}
            />

            <div>
              <Input
                label="Username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  checkUsername(e.target.value)
                }}
                placeholder="Choose a username"
                leftIcon={<User className="w-4 h-4" />}
                disabled={isLoading}
                rightIcon={
                  checkingUsername ? (
                    <div className="w-4 h-4 border-2 border-neon-pink border-t-transparent rounded-full animate-spin" />
                  ) : usernameAvailable === true ? (
                    <CheckCircle2 className="w-4 h-4 text-neon-green" />
                  ) : usernameAvailable === false ? (
                    <AlertCircle className="w-4 h-4 text-status-error" />
                  ) : null
                }
              />
              {usernameAvailable === false && (
                <p className="mt-1 text-xs text-status-error">Username is already taken</p>
              )}
            </div>

            <div>
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                disabled={isLoading}
              />
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          'h-1 flex-1 rounded-full transition-colors',
                          i <= passwordStrength.score
                            ? passwordStrength.color
                            : 'bg-bg-tertiary'
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Password strength: <span className={cn(
                      passwordStrength.score <= 1 && 'text-status-error',
                      passwordStrength.score === 2 && 'text-neon-orange',
                      passwordStrength.score === 3 && 'text-neon-yellow',
                      passwordStrength.score >= 4 && 'text-neon-green'
                    )}>{passwordStrength.label}</span>
                  </p>
                </div>
              )}
            </div>

            <div>
              <PasswordInput
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                disabled={isLoading}
              />
              {confirmPassword.length > 0 && (
                <p className={cn(
                  'mt-1 text-xs',
                  passwordsMatch ? 'text-neon-green' : 'text-status-error'
                )}>
                  {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                </p>
              )}
            </div>

            <Input
              label="Referral Code (optional)"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Enter referral code"
              leftIcon={<Gift className="w-4 h-4" />}
              disabled={isLoading}
              hint="Get extra bonuses with a referral code"
            />

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border-default text-neon-pink focus:ring-neon-pink"
              />
              <span className="text-sm text-text-secondary">
                I agree to the{' '}
                <Link href="/terms" className="text-neon-pink hover:underline">
                  Terms of Service
                </Link>
                {' and '}
                <Link href="/privacy" className="text-neon-pink hover:underline">
                  Privacy Policy
                </Link>
                , and confirm that I am at least 18 years old.
              </span>
            </label>

            <Button
              type="submit"
              fullWidth
              size="lg"
              isLoading={isLoading}
              leftIcon={<UserPlus className="w-5 h-5" />}
            >
              Create Account
            </Button>
          </form>

          {/* Benefits */}
          <div className="mt-6 p-4 rounded-lg bg-bg-tertiary/50 space-y-2">
            <p className="text-sm font-medium text-text-primary">What you get:</p>
            <ul className="space-y-1 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                Free welcome bonus
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                Provably fair games
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                VIP rewards program
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-neon-green" />
                Instant crypto payouts
              </li>
            </ul>
          </div>
        </Card>

        {/* Sign in link */}
        <p className="mt-6 text-center text-text-secondary">
          Already have an account?{' '}
          <Link href="/login" className="text-neon-pink hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
