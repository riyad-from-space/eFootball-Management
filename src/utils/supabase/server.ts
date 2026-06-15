import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from './config'

/**
 * Server-side read-only client (anon key) for Server Components.
 * No cookies/session: this app does not use Supabase Auth — admin writes go
 * through the service-role client in admin.ts. Returns null when unconfigured.
 */
export function createReadClient() {
  if (!isSupabaseConfigured()) return null
  return createSupabaseClient<Database>(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
