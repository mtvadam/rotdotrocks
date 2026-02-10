'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from './Providers'
import { GemDisplay, RobloxAvatar, NotificationBell } from './ui'
import { Menu, X, Calculator, ArrowRightLeft, LogOut, User, Sparkles, Shield, HelpCircle } from 'lucide-react'
import { prefetchBrainrots } from '@/lib/prefetch'

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
    </svg>
  )
}

export function NavBar() {
  const { user, loading, refreshUser } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === '/trading') return pathname === '/trading' || pathname.startsWith('/trading/')
    return pathname === path || pathname.startsWith(path + '/')
  }

  // Prefetch brainrots data for instant page load
  useEffect(() => {
    prefetchBrainrots()
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      refreshUser()
      window.location.href = '/'
    } catch {
      window.location.href = '/'
    }
  }

  return (
    <nav className="sticky top-0 z-50 bg-darkbg-900/80 backdrop-blur-lg border-b border-darkbg-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl font-bold text-white">
              rot<span className="text-green-500">.rocks</span>
            </span>
          </Link>

          {/* Desktop Nav - Centered between elements on smaller screens, absolute center on xl+ */}
          <div className="hidden md:flex items-center justify-center gap-6 lg:gap-4 xl:gap-6 flex-1 xl:flex-none xl:absolute xl:left-1/2 xl:-translate-x-1/2">
            <Link
              href="/trading"
              className={`flex items-center gap-2 transition-colors duration-200 ${
                isActive('/trading') && !pathname.includes('/calculator')
                  ? 'text-green-400'
                  : 'text-gray-300 hover:text-green-400/50'
              }`}
              title="Trading"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span className="hidden lg:inline">Trading</span>
            </Link>
            <Link
              href="/brainrots"
              className={`flex items-center gap-2 transition-colors duration-200 ${
                isActive('/brainrots')
                  ? 'text-green-400'
                  : 'text-gray-300 hover:text-green-400/50'
              }`}
              title="Index"
            >
              <Sparkles className="w-4 h-4" />
              <span className="hidden lg:inline">Index</span>
            </Link>
            <Link
              href="/trading/calculator"
              className={`flex items-center gap-2 transition-colors duration-200 ${
                pathname === '/trading/calculator'
                  ? 'text-green-400'
                  : 'text-gray-300 hover:text-green-400/50'
              }`}
              title="Calculator"
            >
              <Calculator className="w-4 h-4" />
              <span className="hidden lg:inline">Calculator</span>
            </Link>
            <Link
              href="/faq"
              className={`flex items-center gap-2 transition-colors duration-200 ${
                isActive('/faq')
                  ? 'text-green-400'
                  : 'text-gray-300 hover:text-green-400/50'
              }`}
              title="FAQ"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden lg:inline">FAQ</span>
            </Link>
            <a
              href="https://discord.gg/N5fnmraeee"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-gray-300 hover:text-indigo-400 transition-colors"
              title="Discord"
            >
              <DiscordIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Discord</span>
            </a>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* User section */}
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-16 h-8 skeleton rounded-lg" />
                <div className="w-6 h-6 skeleton rounded-full" />
                <div className="hidden sm:block w-20 h-4 skeleton rounded" />
              </div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <GemDisplay />
                <NotificationBell />
                <RobloxAvatar
                  avatarUrl={user.robloxAvatarUrl}
                  username={user.robloxUsername}
                  size="sm"
                />
                <div className="hidden sm:flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-300">
                    {user.robloxUsername}
                  </span>
                  {(user.role === 'ADMIN' || user.role === 'MOD') && (
                    <Link
                      href="/admin"
                      className={`p-2 transition-colors ${user.role === 'MOD' ? 'text-gray-400 hover:text-orange-400' : 'text-gray-400 hover:text-red-400'}`}
                      title={user.role === 'MOD' ? 'Mod Panel' : 'Admin Panel'}
                    >
                      <Shield className="w-5 h-5" />
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                <User className="w-4 h-4" />
                Login
              </Link>
            )}

            {/* Mobile menu button - 44px minimum touch target */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-3 -mr-2 text-gray-400 hover:text-gray-200 active:bg-darkbg-700 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="md:hidden overflow-hidden border-t border-darkbg-700"
            >
              <div className="py-3 flex flex-col gap-1">
                <Link
                  href="/trading"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-colors duration-200 ${
                    isActive('/trading') && !pathname.includes('/calculator')
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-gray-200 hover:text-green-400/50 hover:bg-darkbg-800 active:bg-darkbg-700'
                  }`}
                >
                  <ArrowRightLeft className="w-5 h-5" />
                  Trading
                </Link>
                <Link
                  href="/brainrots"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-colors duration-200 ${
                    isActive('/brainrots')
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-gray-200 hover:text-green-400/50 hover:bg-darkbg-800 active:bg-darkbg-700'
                  }`}
                >
                  <Sparkles className="w-5 h-5" />
                  Index
                </Link>
                <Link
                  href="/trading/calculator"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-colors duration-200 ${
                    pathname === '/trading/calculator'
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-gray-200 hover:text-green-400/50 hover:bg-darkbg-800 active:bg-darkbg-700'
                  }`}
                >
                  <Calculator className="w-5 h-5" />
                  Calculator
                </Link>
                <Link
                  href="/faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-base transition-colors duration-200 ${
                    isActive('/faq')
                      ? 'text-green-400 bg-green-500/10'
                      : 'text-gray-200 hover:text-green-400/50 hover:bg-darkbg-800 active:bg-darkbg-700'
                  }`}
                >
                  <HelpCircle className="w-5 h-5" />
                  FAQ
                </Link>
                <a
                  href="https://discord.gg/N5fnmraeee"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-200 hover:bg-darkbg-800 active:bg-darkbg-700 rounded-xl transition-colors text-base"
                >
                  <DiscordIcon className="w-5 h-5" />
                  Discord
                </a>
                {user && (
                  <>
                    <div className="my-2 border-t border-darkbg-700" />
                    {(user.role === 'ADMIN' || user.role === 'MOD') && (
                      <Link
                        href="/admin"
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 hover:bg-darkbg-800 active:bg-darkbg-700 rounded-xl transition-colors text-base ${user.role === 'MOD' ? 'text-orange-400' : 'text-red-400'}`}
                      >
                        <Shield className="w-5 h-5" />
                        {user.role === 'MOD' ? 'Mod Panel' : 'Admin Panel'}
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleLogout()
                      }}
                      className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-darkbg-800 active:bg-darkbg-700 rounded-xl transition-colors text-base w-full text-left"
                    >
                      <LogOut className="w-5 h-5" />
                      Logout
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  )
}
