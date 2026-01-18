'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { type Currency } from '@/lib/utils'

// User type for casino
interface User {
  id: string
  username: string
  email: string
  avatar?: string | null
  role: 'player' | 'vip' | 'mod' | 'admin' | 'super_admin'
  vipLevel: number
  vipPoints: number
  totalWagered: number
  referralCode: string
  twoFactorEnabled: boolean
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected'
}

interface Wallet {
  currency: Currency
  balance: number
  lockedBalance: number
  depositAddress?: string
}

// Auth Context
interface AuthContextType {
  user: User | null
  wallets: Wallet[]
  loading: boolean
  selectedCurrency: Currency
  setSelectedCurrency: (currency: Currency) => void
  refreshUser: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within Providers')
  return context
}

// Query Client with casino-optimized settings
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000, // 30 seconds
        refetchOnWindowFocus: true,
        retry: 2,
      },
      mutations: {
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}

// Mock user for development
const mockUser: User = {
  id: '1',
  username: 'GTA_Player',
  email: 'player@gta.bet',
  avatar: null,
  role: 'player',
  vipLevel: 3,
  vipPoints: 3500,
  totalWagered: 15000,
  referralCode: 'GTAWIN',
  twoFactorEnabled: false,
  kycStatus: 'none',
}

const mockWallets: Wallet[] = [
  { currency: 'USD', balance: 1234.56, lockedBalance: 0 },
  { currency: 'BTC', balance: 0.025, lockedBalance: 0, depositAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh' },
  { currency: 'ETH', balance: 0.5, lockedBalance: 0, depositAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
  { currency: 'USDT', balance: 500, lockedBalance: 0 },
  { currency: 'SOL', balance: 10, lockedBalance: 0 },
]

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('USD')

  // Always use dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  // Auth handling
  const refreshUser = async () => {
    try {
      // TODO: Replace with actual API call
      // const res = await fetch('/api/auth/me')
      // if (res.ok) {
      //   const data = await res.json()
      //   setUser(data.user)
      //   setWallets(data.wallets)
      // }

      // For development, use mock data
      setUser(mockUser)
      setWallets(mockWallets)
    } catch {
      setUser(null)
      setWallets([])
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    // TODO: Implement actual login
    setUser(mockUser)
    setWallets(mockWallets)
  }

  const logout = async () => {
    // TODO: Implement actual logout
    setUser(null)
    setWallets([])
  }

  useEffect(() => {
    refreshUser()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider
        value={{
          user,
          wallets,
          loading,
          selectedCurrency,
          setSelectedCurrency,
          refreshUser,
          login,
          logout,
        }}
      >
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)',
            },
          }}
        />
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

// Hook to get current balance
export function useBalance(currency?: Currency) {
  const { wallets, selectedCurrency } = useAuth()
  const targetCurrency = currency || selectedCurrency
  const wallet = wallets.find(w => w.currency === targetCurrency)
  return wallet?.balance ?? 0
}

// Hook to get all wallets
export function useWallets() {
  const { wallets } = useAuth()
  return wallets
}
