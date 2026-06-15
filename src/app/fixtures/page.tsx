'use client'

import { useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { useActiveTournamentData } from '@/lib/useTournamentData'
import ConfigError from '@/components/ConfigError'
import MatchCard from '@/components/MatchCard'
import { MatchCardSkeleton } from '@/components/Skeleton'
import { knockoutRoundRank } from '@/lib/display'
import type { MatchWithTeams } from '@/types/database.types'

function groupByRound(matches: MatchWithTeams[]) {
  const groups = new Map<string, MatchWithTeams[]>()
  for (const m of matches) {
    const key = m.round_label ?? `Round ${m.round_number}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(m)
  }
  return Array.from(groups.entries()).sort(
    (a, b) => knockoutRoundRank(a[0]) - knockoutRoundRank(b[0])
  )
}

export default function FixturesPage() {
  const { loading, configured, error, tournament, matches } = useActiveTournamentData()

  const upcoming = useMemo(
    () =>
      matches.filter((m) => !m.is_bye && (m.status === 'scheduled' || m.status === 'live')),
    [matches]
  )
  const grouped = useMemo(() => groupByRound(upcoming), [upcoming])

  if (!configured) return <ConfigError />

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
          <Calendar className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Fixtures</h1>
          <p className="text-sm text-dark-muted">{tournament?.name ?? 'Upcoming matches'}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm text-brand-secondary">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : !tournament ? (
        <EmptyState message="No active tournament right now. Check back soon." />
      ) : grouped.length === 0 ? (
        <EmptyState message="No upcoming fixtures. They will appear here once the admin generates them." />
      ) : (
        <div className="space-y-8">
          {grouped.map(([round, group]) => (
            <section key={round}>
              <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-dark-muted">{round}</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {group.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-12 text-center">
      <Calendar className="mx-auto mb-3 h-8 w-8 text-dark-muted" />
      <p className="text-dark-muted">{message}</p>
    </div>
  )
}
