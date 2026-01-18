'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Gamepad2,
  Wallet,
  Gift,
  MessageSquare,
  Settings,
  Shield,
  BarChart3,
  ChevronLeft,
  LogOut,
  Bell,
  Search,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: number
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Users', href: '/admin/users', icon: Users, badge: 3 },
  { name: 'Games', href: '/admin/games', icon: Gamepad2 },
  { name: 'Transactions', href: '/admin/transactions', icon: Wallet },
  { name: 'Promotions', href: '/admin/promotions', icon: Gift },
  { name: 'Reports', href: '/admin/reports', icon: FileText },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Security', href: '/admin/security', icon: Shield },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full bg-bg-secondary border-r border-border-default z-40 transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-default">
          {!sidebarCollapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <Gamepad2 className="w-8 h-8 text-neon-pink" />
              <span className="font-display text-xl text-white">ADMIN</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'p-2 rounded-lg hover:bg-bg-tertiary transition-colors',
              sidebarCollapsed && 'mx-auto'
            )}
          >
            <ChevronLeft className={cn(
              'w-5 h-5 text-text-tertiary transition-transform',
              sidebarCollapsed && 'rotate-180'
            )} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative',
                  isActive
                    ? 'bg-neon-pink/10 text-neon-pink'
                    : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium">{item.name}</span>
                    {item.badge && (
                      <Badge variant="error" size="sm" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
                {isActive && (
                  <motion.div
                    layoutId="admin-nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-neon-pink rounded-r-full"
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Back to casino */}
        <div className="absolute bottom-4 left-0 right-0 px-2">
          <Link
            href="/casino"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
              'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
            )}
          >
            <LogOut className="w-5 h-5" />
            {!sidebarCollapsed && <span className="font-medium">Back to Casino</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn(
        'flex-1 transition-all duration-300',
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      )}>
        {/* Header */}
        <header className="h-16 bg-bg-secondary border-b border-border-default flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search..."
              leftIcon={<Search className="w-4 h-4" />}
              className="w-64"
              inputSize="sm"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications */}
            <button className="relative p-2 rounded-lg hover:bg-bg-tertiary transition-colors">
              <Bell className="w-5 h-5 text-text-secondary" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-status-error rounded-full" />
            </button>

            {/* Admin user */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-text-primary">Admin</p>
                <p className="text-xs text-text-tertiary">Super Admin</p>
              </div>
              <Avatar name="Admin" size="sm" />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
