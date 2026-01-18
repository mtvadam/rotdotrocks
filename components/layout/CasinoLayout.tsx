'use client'

import { useState, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomTabBar } from './MobileNav'
import { cn } from '@/lib/utils'
import { type Currency } from '@/lib/utils'

interface CasinoLayoutProps {
  children: ReactNode
}

// Mock user for development
const mockUser = {
  id: '1',
  username: 'GTA_Player',
  avatar: null,
  vipLevel: 3,
}

export function CasinoLayout({ children }: CasinoLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currency, setCurrency] = useState<Currency>('USD')
  const [balance] = useState(1234.56)

  // In production, this would come from auth context
  const user = mockUser

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sidebar - Desktop only */}
      <Sidebar
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Header */}
      <Header
        onMenuClick={() => setMobileMenuOpen(true)}
        user={user}
        balance={balance}
        currency={currency}
        onCurrencyChange={setCurrency}
      />

      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen pt-16 pb-20 lg:pb-6',
          'transition-all duration-200',
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'
        )}
        style={{
          '--sidebar-width': sidebarCollapsed ? '72px' : '240px',
        } as React.CSSProperties}
      >
        <div className="max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  )
}
