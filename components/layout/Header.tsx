'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Menu,
  Bell,
  Wallet,
  ChevronDown,
  LogOut,
  User,
  Settings,
  History,
  Gift,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Avatar, UserAvatar } from '@/components/ui/Avatar'
import { Dropdown, DropdownItem, DropdownSeparator, DropdownLabel } from '@/components/ui/Dropdown'
import { Badge } from '@/components/ui/Badge'
import { type Currency, CURRENCIES, formatCurrency } from '@/lib/utils'

interface HeaderProps {
  onMenuClick: () => void
  user?: {
    id: string
    username: string
    avatar?: string
    vipLevel: number
  } | null
  balance?: number
  currency?: Currency
  onCurrencyChange?: (currency: Currency) => void
}

// Currency icons as simple colored circles for now
const CurrencyIcon = ({ currency }: { currency: Currency }) => {
  const color = CURRENCIES[currency]?.color || '#888'
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-2xs font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {currency.charAt(0)}
    </div>
  )
}

export function Header({
  onMenuClick,
  user,
  balance = 0,
  currency = 'USD',
  onCurrencyChange,
}: HeaderProps) {
  const [notificationCount] = useState(3)

  const currencies: Currency[] = ['USD', 'BTC', 'ETH', 'USDT', 'SOL']

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[var(--sidebar-width)] z-30 h-16 bg-bg-secondary/95 backdrop-blur-md border-b border-border-default">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">
        {/* Left side - Mobile menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Mobile logo */}
          <Link href="/" className="lg:hidden font-display text-xl">
            <span className="text-neon-pink">GTA</span>
            <span className="text-text-primary">.BET</span>
          </Link>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-4">
          {user ? (
            <>
              {/* Balance */}
              <Dropdown
                align="right"
                trigger={
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-bg-hover border border-border-default transition-colors">
                    <CurrencyIcon currency={currency} />
                    <span className="font-mono text-sm font-semibold text-text-primary">
                      {formatCurrency(balance, currency)}
                    </span>
                    <ChevronDown className="w-4 h-4 text-text-tertiary" />
                  </button>
                }
              >
                <DropdownLabel>Select Currency</DropdownLabel>
                {currencies.map((c) => (
                  <DropdownItem
                    key={c}
                    value={c}
                    onClick={() => onCurrencyChange?.(c)}
                    icon={<CurrencyIcon currency={c} />}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{CURRENCIES[c].name}</span>
                      <span className="text-text-tertiary font-mono text-xs">
                        {formatCurrency(balance, c)}
                      </span>
                    </div>
                  </DropdownItem>
                ))}
                <DropdownSeparator />
                <DropdownItem icon={<Wallet className="w-4 h-4" />}>
                  <Link href="/wallet">Manage Wallet</Link>
                </DropdownItem>
              </Dropdown>

              {/* Deposit Button */}
              <Button
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                className="hidden sm:flex"
              >
                Deposit
              </Button>

              {/* Notifications */}
              <Dropdown
                align="right"
                trigger={
                  <button className="relative p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors">
                    <Bell className="w-5 h-5" />
                    {notificationCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-status-error text-white text-2xs font-bold flex items-center justify-center">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                }
                menuClassName="w-80"
              >
                <div className="p-3 border-b border-border-default">
                  <h3 className="font-semibold text-text-primary">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {/* Sample notifications */}
                  <div className="p-3 hover:bg-bg-hover transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-neon-green/20 flex items-center justify-center">
                        <Gift className="w-4 h-4 text-neon-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">Daily reward claimed!</p>
                        <p className="text-xs text-text-tertiary mt-0.5">2 hours ago</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 hover:bg-bg-hover transition-colors cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                        <Wallet className="w-4 h-4 text-neon-cyan" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary">Deposit confirmed</p>
                        <p className="text-xs text-text-tertiary mt-0.5">5 hours ago</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2 border-t border-border-default">
                  <Link
                    href="/notifications"
                    className="block w-full text-center text-sm text-neon-pink hover:underline"
                  >
                    View all notifications
                  </Link>
                </div>
              </Dropdown>

              {/* User Menu */}
              <Dropdown
                align="right"
                trigger={
                  <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-bg-tertiary transition-colors">
                    <Avatar src={user.avatar} name={user.username} size="sm" />
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-medium text-text-primary">{user.username}</p>
                      <Badge variant="vip" size="sm">VIP {user.vipLevel}</Badge>
                    </div>
                    <ChevronDown className="hidden md:block w-4 h-4 text-text-tertiary" />
                  </button>
                }
              >
                <div className="p-3 border-b border-border-default">
                  <UserAvatar
                    src={user.avatar}
                    name={user.username}
                    info={`VIP Level ${user.vipLevel}`}
                  />
                </div>
                <div className="py-1">
                  <DropdownItem icon={<User className="w-4 h-4" />}>
                    <Link href="/profile">Profile</Link>
                  </DropdownItem>
                  <DropdownItem icon={<Wallet className="w-4 h-4" />}>
                    <Link href="/wallet">Wallet</Link>
                  </DropdownItem>
                  <DropdownItem icon={<History className="w-4 h-4" />}>
                    <Link href="/bets">Bet History</Link>
                  </DropdownItem>
                  <DropdownItem icon={<Gift className="w-4 h-4" />}>
                    <Link href="/rewards">Rewards</Link>
                  </DropdownItem>
                  <DropdownItem icon={<Settings className="w-4 h-4" />}>
                    <Link href="/settings">Settings</Link>
                  </DropdownItem>
                </div>
                <DropdownSeparator />
                <DropdownItem icon={<LogOut className="w-4 h-4" />} danger>
                  Sign Out
                </DropdownItem>
              </Dropdown>
            </>
          ) : (
            <>
              {/* Login/Register buttons */}
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
              <Button size="sm">
                Register
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
