import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

// Environment variables (should be in .env.local)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client for browser
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}

// Singleton instance for client-side
let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (typeof window === 'undefined') {
    // Server-side: always create new instance
    return createClient()
  }

  // Client-side: use singleton
  if (!browserClient) {
    browserClient = createClient()
  }
  return browserClient
}

// Export types
export type { Database }
export type SupabaseClient = ReturnType<typeof createClient>
