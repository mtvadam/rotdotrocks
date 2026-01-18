'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Dice1,
  Rocket,
  Grid3x3,
  Target,
  CircleDot,
  Wallet,
  History,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  MessageSquare,
  Gift,
  Star,
  Gamepad2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip } from '@/components/ui/Tooltip'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: string
  isNew?: boolean
}

const mainNavItems: NavItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Casino', href: '/casino', icon: Gamepad2 },
]

const gameNavItems: NavItem[] = [
  { name: 'Dice', href: '/casino/dice', icon: Dice1 },
  { name: 'Crash', href: '/casino/crash', icon: Rocket, badge: 'Live' },
  { name: 'Mines', href: '/casino/mines', icon: Grid3x3 },
  { name: 'Limbo', href: '/casino/limbo', icon: Target },
  { name: 'Plinko', href: '/casino/plinko', icon: CircleDot, isNew: true },
]

const userNavItems: NavItem[] = [
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Bets', href: '/bets', icon: History },
  { name: 'Rewards', href: '/rewards', icon: Gift },
]

const bottomNavItems: NavItem[] = [
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({ isCollapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname()

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon

    const content = (
      <Link
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg',
          'transition-all duration-200',
          isActive
            ? 'bg-neon-pink/10 text-neon-pink'
            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary',
          isCollapsed && 'justify-center'
        )}
      >
        <Icon className={cn('w-5 h-5 flex-shrink-0', isActive && 'text-neon-pink')} />
        {!isCollapsed && (
          <>
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
          </>
        )}
      </Link>
    )

    if (isCollapsed) {
      return (
        <Tooltip content={item.name} side="right">
          {content}
        </Tooltip>
      )
    }

    return content
  }

  const NavSection = ({ title, items }: { title?: string; items: NavItem[] }) => (
    <div className="space-y-1">
      {title && !isCollapsed && (
        <div className="px-3 py-2 text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
          {title}
        </div>
      )}
      {items.map(item => (
        <NavItemComponent key={item.href} item={item} />
      ))}
    </div>
  )

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'fixed left-0 top-0 bottom-0 z-40',
        'bg-bg-secondary border-r border-border-default',
        'flex flex-col',
        'hidden lg:flex'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border-default">
        <Link href="/" className="flex items-center gap-2">
          {!isCollapsed ? (
            <span className="font-display text-2xl tracking-wider">
              <span className="text-neon-pink">GTA</span>
              <span className="text-text-primary">.BET</span>
            </span>
          ) : (
            <span className="font-display text-2xl text-neon-pink">G</span>
          )}
        </Link>
        <button
          onClick={onToggleCollapse}
          className={cn(
            'p-1.5 rounded-md',
            'text-text-tertiary hover:text-text-primary',
            'hover:bg-bg-tertiary transition-colors',
            isCollapsed && 'absolute right-2'
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        <NavSection items={mainNavItems} />
        <NavSection title="Games" items={gameNavItems} />
        <NavSection title="Account" items={userNavItems} />
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-border-default space-y-1">
        {bottomNavItems.map(item => (
          <NavItemComponent key={item.href} item={item} />
        ))}
      </div>

      {/* VIP Progress (only when expanded) */}
      {!isCollapsed && (
        <div className="p-3 border-t border-border-default">
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
      )}
    </motion.aside>
  )
}
