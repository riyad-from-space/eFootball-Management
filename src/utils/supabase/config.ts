// Single place that decides whether Supabase is configured.
// The spec requires showing a configuration error (never a localStorage
// fallback) when it is not, so every data path funnels through this.

const PLACEHOLDERS = ['your-project-id', 'YOUR_PROJECT_ID', 'YOUR_ANON_KEY_HERE']

function looksReal(value: string | undefined): value is string {
  if (!value) return false
  return !PLACEHOLDERS.some((p) => value.includes(p))
}

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** True only when both public Supabase env vars are present and not placeholders. */
export function isSupabaseConfigured(): boolean {
  return looksReal(SUPABASE_URL) && looksReal(SUPABASE_ANON_KEY)
}

/** Server-only: the service-role key is required for admin writes. */
export function isServiceRoleConfigured(): boolean {
  return isSupabaseConfigured() && looksReal(process.env.SUPABASE_SERVICE_ROLE_KEY)
}
