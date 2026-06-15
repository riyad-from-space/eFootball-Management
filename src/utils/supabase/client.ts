import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

/**
 * Browser (read-only) Supabase client used by public pages for data + realtime.
 * Returns null when Supabase is not configured so callers can render the
 * configuration error instead of crashing (spec: no localStorage fallback).
 */
export function createClient() {
  if (!isSupabaseConfigured()) return null
  return createBrowserClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!)
}
