'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Flag, ScrollText, ArrowLeft, Database, Gauge, Settings, DollarSign, Download } from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const navItems: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, adminOnly: true },
  { href: '/admin/data', label: 'Data Management', icon: Database, adminOnly: true },
  { href: '/admin/usd-values', label: 'Robux Values', icon: DollarSign },
  { href: '/admin/price-import', label: 'Price Import', icon: Download, adminOnly: true },
  { href: '/admin/users', label: 'Users', icon: Users, adminOnly: true },
  { href: '/admin/reports', label: 'Reports', icon: Flag, adminOnly: true },
  { href: '/admin/rate-limits', label: 'Rate Limits', icon: Gauge, adminOnly: true },
  { href: '/admin/settings', label: 'Site Settings', icon: Settings, adminOnly: true },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, adminOnly: true },
]

interface AdminSidebarProps {
  role: 'ADMIN' | 'MOD' | 'USER' | 'SELLER'
}

export function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname()
  const isAdmin = role === 'ADMIN'

  // Filter nav items based on role
  const visibleItems = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className="w-64 bg-darkbg-900 border-r border-darkbg-700 min-h-screen flex flex-col">
      <div className="p-4 border-b border-darkbg-700">
        <h1 className="text-xl font-bold text-white">
          {isAdmin ? 'Admin Panel' : 'Mod Panel'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">RotDotRocks</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-green-600/20 text-green-400'
                    : 'text-gray-400 hover:text-white hover:bg-darkbg-800'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-darkbg-700">
        <Link
          href="/trading"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Trading
        </Link>
      </div>
    </aside>
  )
}
