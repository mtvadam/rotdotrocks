// Client-side exports
export { createClient, getSupabase } from './client'
export type { Database, SupabaseClient } from './client'

// Server-side exports (only import in server components/routes)
export { createServerSupabase, createRouteHandlerClient, getSession, getUser } from './server'

// Type exports
export * from './types'
