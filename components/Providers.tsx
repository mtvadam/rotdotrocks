'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { ToastProvider } from '@/components/ui'

// Auth Context
interface User {
  id: string
  robloxUsername: string
  robloxUserId: string | null
  robloxAvatarUrl: string | null
  role: 'USER' | 'MOD' | 'ADMIN'
  gems: number
}

interface AuthContextType {
  user: User | null
  loading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within Providers')
  return context
}

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Always use dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Auth handling
  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </AuthContext.Provider>
  )
}
