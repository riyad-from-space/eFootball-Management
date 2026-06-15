import { AlertTriangle, Database } from 'lucide-react'

/**
 * Shown when Supabase is not configured. The spec forbids any localStorage /
 * mock fallback, so every data page renders this instead of fake data.
 */
export default function ConfigError({ detail }: { detail?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="glow-card glow-card-pink max-w-lg w-full p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-secondary/15 border border-brand-secondary/30">
          <AlertTriangle className="h-7 w-7 text-brand-secondary" />
        </div>
        <h1 className="text-xl font-black text-white">Supabase is not configured</h1>
        <p className="mt-3 text-sm text-dark-muted leading-relaxed">
          {detail ??
            'This site reads all of its data from Supabase. Set the required environment variables, run the database schema, then reload.'}
        </p>
        <div className="mt-6 rounded-lg border border-dark-border bg-black/40 p-4 text-left">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-dark-muted">
            <Database className="h-3.5 w-3.5" /> Required environment variables
          </div>
          <ul className="space-y-1 font-mono text-xs text-dark-muted">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>SUPABASE_SERVICE_ROLE_KEY</li>
            <li>ADMIN_PASSWORD</li>
          </ul>
        </div>
        <p className="mt-4 text-xs text-dark-muted">See <span className="font-semibold text-white">README.md</span> for full setup steps.</p>
      </div>
    </div>
  )
}
