import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'
import { SUPABASE_URL, isServiceRoleConfigured } from './config'

/**
 * Server-only Supabase client using the SERVICE ROLE key.
 * It bypasses Row Level Security, so it is ONLY ever created inside server
 * actions that have already verified the admin password. Never import this
 * into a client component.
 *
 * Throws when the service role key is missing — server actions surface this as
 * a configuration error (spec: fail loudly, never fall back).
 */
export function createAdminClient() {
  if (!isServiceRoleConfigured()) {
    throw new Error(
      'Supabase service role is not configured. Set NEXT_PUBLIC_SUPABASE_URL, ' +
        'NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  return createSupabaseClient<Database>(
    SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
