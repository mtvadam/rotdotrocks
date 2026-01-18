import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client for server components
export async function createServerSupabase() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  })
}

// Create Supabase client for API routes
export function createRouteHandlerClient(request: Request) {
  const requestCookies = request.headers.get('cookie') || ''
  const cookiesArray = requestCookies.split(';').map(c => {
    const [name, ...value] = c.trim().split('=')
    return { name, value: value.join('=') }
  }).filter(c => c.name)

  let responseCookies: { name: string; value: string; options?: CookieOptions }[] = []

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookiesArray
      },
      setAll(cookiesToSet) {
        responseCookies = cookiesToSet
      },
    },
  })
}

// Get session from server component
export async function getSession() {
  const supabase = await createServerSupabase()
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) {
    console.error('Error getting session:', error)
    return null
  }
  return session
}

// Get user from server component
export async function getUser() {
  const session = await getSession()
  return session?.user ?? null
}
