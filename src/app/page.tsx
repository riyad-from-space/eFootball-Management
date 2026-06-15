'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  Trophy,
  Award,
  Calendar,
  GitBranch,
  ListOrdered,
  ChevronRight,
  Crown,
  Activity,
  Zap,
} from 'lucide-react'
import { useActiveTournamentData } from '@/lib/useTournamentData'
import ConfigError from '@/components/ConfigError'
import MatchCard from '@/components/MatchCard'
import TeamBadge from '@/components/TeamBadge'
import { MatchCardSkeleton, Skeleton } from '@/components/Skeleton'
import { knockoutRoundRank, statusLabel } from '@/lib/display'
import type { Team } from '@/types/database.types'

export default function HomePage() {
  const { loading, configured, error, tournament, matches, standings } = useActiveTournamentData()

  const real = useMemo(() => matches.filter((m) => !m.is_bye), [matches])

  const liveAndUpcoming = useMemo(
    () =>
      real
        .filter((m) => m.status === 'live' || m.status === 'scheduled')
        .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
        .slice(0, 4),
    [real]
  )

  const recentResults = useMemo(
    () =>
      real
        .filter((m) => m.status === 'completed' || m.status === 'walkover')
        .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
        .slice(0, 4),
    [real]
  )

  const progress = useMemo(() => {
    const done = real.filter((m) => m.status === 'completed' || m.status === 'walkover').length
    return { done, total: real.length, pct: real.length ? Math.round((done / real.length) * 100) : 0 }
  }, [real])

  const bracketPreview = useMemo(() => {
    if (!tournament || tournament.format === 'league') return []
    const stage = tournament.format === 'league_playoffs' ? 'playoffs' : 'knockout'
    const stageMatches = real.filter((m) => m.stage === stage)
    if (stageMatches.length === 0) return []
    const maxRank = Math.max(...stageMatches.map((m) => knockoutRoundRank(m.round_label)))
    return stageMatches.filter((m) => knockoutRoundRank(m.round_label) === maxRank).slice(0, 4)
  }, [real, tournament])

  const champion = useMemo<Team | null>(() => {
    const final = real.find((m) => (m.round_label === 'Final' || m.round_label === 'Playoff Final') && m.winner_id)
    if (final) return final.winner_id === final.home_team?.id ? final.home_team : final.away_team
    if (tournament?.format === 'league' && tournament.status === 'completed' && standings.length > 0) {
      return standings[0].team ?? null
    }
    return null
  }, [real, standings, tournament])

  if (!configured) return <ConfigError />

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="rounded-2xl border border-dashed border-dark-border bg-dark-card/40 p-16 text-center">
          <Trophy className="mx-auto mb-4 h-10 w-10 text-dark-muted" />
          <h1 className="text-2xl font-black text-white">eFootball Appifylab</h1>
          <p className="mt-2 text-dark-muted">
            No tournament is active right now. The next competition will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {error && (
        <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm text-brand-secondary">
          {error}
        </div>
      )}

      {/* Hero — active tournament + champion prize */}
      <section className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card p-6 md:p-10">
        <div className="absolute top-0 right-0 h-80 w-80 rounded-full bg-brand-primary/5 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-brand-accent/5 blur-3xl" />
        <div className="relative space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-secondary/15 px-3 py-1 text-xxs font-black uppercase tracking-widest text-brand-secondary">
            <Activity className="h-3.5 w-3.5" /> Active Tournament
          </span>
          <h1 className="text-3xl md:text-6xl font-black uppercase tracking-tight text-white">{tournament.name}</h1>
          {tournament.description && (
            <p className="max-w-2xl text-sm md:text-base text-slate-400">{tournament.description}</p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {tournament.champion_prize && (
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-2">
                <Award className="h-4 w-4 text-brand-primary" />
                <span className="text-sm font-bold text-brand-primary">Prize: {tournament.champion_prize}</span>
              </div>
            )}
            <Link
              href="/tournament"
              className="inline-flex items-center gap-1.5 rounded-full border border-dark-border bg-black/40 px-4 py-2 text-sm font-semibold text-white hover:border-brand-primary/40"
            >
              Tournament details <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Champion */}
      {champion && (
        <section className="glow-card flex flex-col items-center gap-3 p-6 text-center md:flex-row md:text-left">
          <Crown className="h-8 w-8 text-brand-primary" />
          <TeamBadge name={champion.name} logo={champion.logo} color={champion.color} size="lg" />
          <div className="flex-1">
            <p className="text-xxs font-black uppercase tracking-widest text-brand-primary">Champion</p>
            <p className="text-2xl font-black text-white">{champion.name}</p>
          </div>
          <Link href="/champion" className="rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-black">
            Celebrate →
          </Link>
        </section>
      )}

      {/* Progress */}
      <section className="rounded-xl border border-dark-border bg-dark-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-white">
            <Zap className="h-4 w-4 text-brand-primary" /> Tournament Progress
          </h2>
          <span className="text-sm font-bold text-brand-primary">
            {progress.done}/{progress.total}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-black/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-accent transition-all"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
      </section>

      {/* Live & upcoming */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Calendar className="h-5 w-5 text-brand-accent" /> Live & Upcoming
          </h2>
          <Link href="/fixtures" className="text-sm font-semibold text-brand-accent hover:underline">
            All fixtures →
          </Link>
        </div>
        {liveAndUpcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-8 text-center text-dark-muted">
            No upcoming matches scheduled.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {liveAndUpcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* Recent results */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-black text-white">
            <Trophy className="h-5 w-5 text-brand-primary" /> Recent Results
          </h2>
          <Link href="/results" className="text-sm font-semibold text-brand-accent hover:underline">
            All results →
          </Link>
        </div>
        {recentResults.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-8 text-center text-dark-muted">
            No results yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {recentResults.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      {/* Bracket preview / standings preview */}
      {tournament.format === 'league' ? (
        standings.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <ListOrdered className="h-5 w-5 text-brand-primary" /> Top of the Table
              </h2>
              <Link href="/standings" className="text-sm font-semibold text-brand-accent hover:underline">
                Full table →
              </Link>
            </div>
            <div className="space-y-2">
              {standings.slice(0, 3).map((s) => (
                <div key={s.id} className="glow-card flex items-center gap-3 p-3">
                  <span className="w-6 text-center font-black text-brand-primary">{s.rank}</span>
                  <TeamBadge name={s.team?.name ?? null} logo={s.team?.logo} color={s.team?.color} size="sm" />
                  <span className="min-w-0 flex-1 truncate font-semibold text-white">{s.team?.name}</span>
                  <span className="font-black text-brand-primary">{s.points} pts</span>
                </div>
              ))}
            </div>
          </section>
        )
      ) : (
        bracketPreview.length > 0 && (
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-black text-white">
                <GitBranch className="h-5 w-5 text-brand-accent" /> Bracket Preview
              </h2>
              <Link href="/bracket" className="text-sm font-semibold text-brand-accent hover:underline">
                Full bracket →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {bracketPreview.map((m) => (
                <div key={m.id} className="glow-card p-4">
                  <p className="mb-2 text-xxs font-black uppercase tracking-widest text-dark-muted">{m.round_label}</p>
                  <div className="space-y-1.5">
                    {[m.home_team, m.away_team].map((t, idx) => {
                      const score = idx === 0 ? m.home_score : m.away_score
                      const win = m.winner_id && (idx === 0 ? m.home_team?.id : m.away_team?.id) === m.winner_id
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamBadge name={t?.name ?? null} logo={t?.logo} color={t?.color} size="sm" />
                            <span className={`truncate text-sm ${win ? 'font-bold text-white' : 'text-slate-300'}`}>
                              {t?.name ?? 'TBD'}
                            </span>
                          </div>
                          <span className="font-black tabular-nums text-dark-muted">
                            {m.status === 'completed' || m.status === 'walkover' ? (score ?? 0) : statusLabel(m.status)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      )}
    </div>
  )
}
