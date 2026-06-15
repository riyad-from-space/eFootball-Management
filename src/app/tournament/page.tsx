'use client'

import { useMemo, type ComponentType } from 'react'
import Link from 'next/link'
import { Info, Trophy, Users, Calendar, Activity, Award } from 'lucide-react'
import { useActiveTournamentData } from '@/lib/useTournamentData'
import ConfigError from '@/components/ConfigError'
import TeamBadge from '@/components/TeamBadge'
import { Skeleton } from '@/components/Skeleton'
import { formatDate } from '@/lib/display'

const FORMAT_LABEL: Record<string, string> = {
  knockout: 'Knockout',
  league: 'League (Round Robin)',
  league_playoffs: 'League + Playoffs',
}

export default function TournamentPage() {
  const { loading, configured, error, tournament, teams, matches } = useActiveTournamentData()

  const progress = useMemo(() => {
    const real = matches.filter((m) => !m.is_bye)
    const done = real.filter((m) => m.status === 'completed' || m.status === 'walkover').length
    return { done, total: real.length, pct: real.length ? Math.round((done / real.length) * 100) : 0 }
  }, [matches])

  if (!configured) return <ConfigError />

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-12 text-center animate-fadeIn">
        <Info className="mx-auto mb-3 h-8 w-8 text-dark-muted" />
        <p className="text-dark-muted">There is no active tournament right now.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {error && (
        <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm text-brand-secondary">
          {error}
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card p-6 md:p-10">
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-brand-primary/5 blur-3xl" />
        <div className="relative space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-primary/10 px-3 py-1 text-xxs font-black uppercase tracking-widest text-brand-primary">
            <Activity className="h-3.5 w-3.5" /> {tournament.status}
          </span>
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white">{tournament.name}</h1>
          {tournament.description && (
            <p className="max-w-2xl text-sm md:text-base leading-relaxed text-slate-400">{tournament.description}</p>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={Trophy} label="Format" value={FORMAT_LABEL[tournament.format] ?? tournament.format} />
        <InfoCard icon={Award} label="Champion Prize" value={tournament.champion_prize ?? 'TBA'} accent />
        <InfoCard icon={Users} label="Teams" value={String(teams.length)} />
        <InfoCard
          icon={Calendar}
          label="Dates"
          value={
            tournament.start_date
              ? `${formatDate(tournament.start_date)}${tournament.end_date ? ' – ' + formatDate(tournament.end_date) : ''}`
              : 'TBA'
          }
        />
      </div>

      {/* Progress */}
      <section className="rounded-xl border border-dark-border bg-dark-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">Tournament Progress</h2>
          <span className="text-sm font-bold text-brand-primary">
            {progress.done}/{progress.total} matches
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-dark-muted">{progress.pct}% complete</p>
      </section>

      {/* Teams */}
      <section>
        <h2 className="mb-3 text-sm font-black uppercase tracking-widest text-dark-muted">Participating Teams</h2>
        {teams.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-8 text-center text-dark-muted">
            No teams added yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {teams.map((t) => (
              <div key={t.id} className="glow-card flex items-center gap-3 p-3">
                <TeamBadge name={t.name} logo={t.logo} color={t.color} size="md" />
                <span className="min-w-0 flex-1 truncate font-semibold text-white">{t.name}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/fixtures" className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-semibold text-white hover:border-brand-primary/40">
          Fixtures
        </Link>
        <Link href="/standings" className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-semibold text-white hover:border-brand-primary/40">
          Standings
        </Link>
        <Link href="/bracket" className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-semibold text-white hover:border-brand-primary/40">
          Bracket
        </Link>
        <Link href="/rules" className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-semibold text-white hover:border-brand-primary/40">
          Rules
        </Link>
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{ className?: string }>
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="glow-card p-4">
      <div className={`mb-2 inline-flex rounded-lg p-2 ${accent ? 'bg-brand-primary/15 text-brand-primary' : 'bg-white/5 text-brand-accent'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xxs font-bold uppercase tracking-widest text-dark-muted">{label}</p>
      <p className={`mt-0.5 font-black ${accent ? 'text-brand-primary' : 'text-white'}`}>{value}</p>
    </div>
  )
}
