'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Gamepad2,
  Wallet,
  Gift,
  Menu,
  X,
  Dice1,
  Rocket,
  Grid3x3,
  Target,
  CircleDot,
  History,
  Settings,
  HelpCircle,
  Trophy,
  MessageSquare,
  Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Bottom nav items (always visible)
const bottomNavItems = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Casino', href: '/casino', icon: Gamepad2 },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Rewards', href: '/rewards', icon: Gift },
]

// Full menu items for drawer
const menuSections = [
  {
    title: 'Games',
    items: [
      { name: 'Dice', href: '/casino/dice', icon: Dice1 },
      { name: 'Crash', href: '/casino/crash', icon: Rocket, badge: 'Live' },
      { name: 'Mines', href: '/casino/mines', icon: Grid3x3 },
      { name: 'Limbo', href: '/casino/limbo', icon: Target },
      { name: 'Plinko', href: '/casino/plinko', icon: CircleDot, isNew: true },
    ],
  },
  {
    title: 'Account',
    items: [
      { name: 'Bet History', href: '/bets', icon: History },
      { name: 'Rewards', href: '/rewards', icon: Gift },
      { name: 'VIP Club', href: '/vip', icon: Star },
    ],
  },
  {
    title: 'More',
    items: [
      { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
      { name: 'Chat', href: '/chat', icon: MessageSquare },
      { name: 'Settings', href: '/settings', icon: Settings },
      { name: 'Help', href: '/help', icon: HelpCircle },
    ],
  },
]

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname()

  // Close on route change
  useEffect(() => {
    onClose()
  }, [pathname, onClose])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-bg-secondary border-r border-border-default z-50 lg:hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border-default">
              <Link href="/" className="font-display text-2xl" onClick={onClose}>
                <span className="text-neon-pink">GTA</span>
                <span className="text-text-primary">.BET</span>
              </Link>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Sections */}
            <nav className="flex-1 overflow-y-auto py-4">
              {menuSections.map((section) => (
                <div key={section.title} className="mb-6">
                  <div className="px-4 mb-2 text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
                    {section.title}
                  </div>
                  <div className="space-y-1 px-2">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2.5 rounded-lg',
                            'transition-colors',
                            isActive
                              ? 'bg-neon-pink/10 text-neon-pink'
                              : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                          )}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="flex-1 font-medium text-sm">{item.name}</span>
                          {item.badge && (
                            <span className="px-1.5 py-0.5 text-2xs font-bold uppercase rounded bg-status-error text-white">
                              {item.badge}
                            </span>
                          )}
                          {item.isNew && (
                            <span className="px-1.5 py-0.5 text-2xs font-bold uppercase rounded bg-neon-cyan text-black">
                              New
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>

            {/* VIP Progress */}
            <div className="p-4 border-t border-border-default">
              <div className="p-3 rounded-lg bg-gradient-to-r from-neon-pink/10 to-neon-purple/10 border border-neon-pink/20">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="w-4 h-4 text-neon-yellow" />
                  <span className="text-sm font-semibold text-text-primary">VIP Level 3</span>
                </div>
                <div className="h-1.5 rounded-full bg-bg-tertiary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-neon-pink to-neon-purple"
                    style={{ width: '65%' }}
                  />
                </div>
                <p className="mt-1.5 text-2xs text-text-tertiary">
                  $3,500 / $5,000 to VIP 4
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Bottom Tab Bar for mobile
export function BottomTabBar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <>
      <MobileNav isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-bg-secondary/95 backdrop-blur-md border-t border-border-default safe-area-pb">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg',
                  'transition-colors min-w-[60px]',
                  isActive ? 'text-neon-pink' : 'text-text-secondary'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-2xs font-medium">{item.name}</span>
              </Link>
            )
          })}

          {/* Menu button */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 py-2 px-4 rounded-lg text-text-secondary min-w-[60px]"
          >
            <Menu className="w-5 h-5" />
            <span className="text-2xs font-medium">Menu</span>
          </button>
        </div>
      </nav>
    </>
  )
}
