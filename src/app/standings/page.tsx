'use client'

import Link from 'next/link'
import { ListOrdered, GitBranch, Trophy } from 'lucide-react'
import { useActiveTournamentData } from '@/lib/useTournamentData'
import ConfigError from '@/components/ConfigError'
import TeamBadge from '@/components/TeamBadge'
import { Skeleton, StandingsRowSkeleton } from '@/components/Skeleton'

const COLS = [
  { key: 'played', label: 'P', title: 'Played' },
  { key: 'won', label: 'W', title: 'Won' },
  { key: 'drawn', label: 'D', title: 'Drawn' },
  { key: 'lost', label: 'L', title: 'Lost' },
  { key: 'goals_for', label: 'GF', title: 'Goals For' },
  { key: 'goals_against', label: 'GA', title: 'Goals Against' },
  { key: 'goal_difference', label: 'GD', title: 'Goal Difference' },
] as const

export default function StandingsPage() {
  const { loading, configured, error, tournament, standings } = useActiveTournamentData()

  if (!configured) return <ConfigError />

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
          <ListOrdered className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Standings</h1>
          <p className="text-sm text-dark-muted">{tournament?.name ?? 'League table'}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm text-brand-secondary">
          {error}
        </div>
      )}

      {!loading && standings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center">
          <ListOrdered className="mx-auto mb-3 h-8 w-8 text-dark-muted" />
          <p className="text-dark-muted">No standings yet. Standings appear once the league results are in.</p>
          <Link
            href="/bracket"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-accent hover:underline"
          >
            <GitBranch className="h-4 w-4" /> Knockout tournament? View the bracket
          </Link>
        </div>
      ) : (
      <div className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-dark-border text-dark-muted">
                <th className="py-3 px-4 text-center font-bold w-12">#</th>
                <th className="py-3 px-4 text-left font-bold">Team</th>
                {COLS.map((c) => (
                  <th key={c.key} className="py-3 px-3 text-center font-bold" title={c.title}>
                    {c.label}
                  </th>
                ))}
                <th className="py-3 px-4 text-center font-black text-white">PTS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <StandingsRowSkeleton key={i} />)
              ) : (
                standings.map((row) => {
                  const top = (row.rank ?? 99) <= 4
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-dark-border/40 last:border-0 hover:bg-white/3 transition-colors"
                    >
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                            row.rank === 1
                              ? 'bg-brand-primary text-black'
                              : top
                                ? 'bg-brand-primary/15 text-brand-primary'
                                : 'bg-dark-border text-dark-muted'
                          }`}
                        >
                          {row.rank}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <TeamBadge name={row.team?.name ?? null} logo={row.team?.logo} color={row.team?.color} size="sm" />
                          <span className="font-semibold text-white">{row.team?.name ?? 'Unknown team'}</span>
                          {row.rank === 1 && <Trophy className="h-4 w-4 text-brand-primary" />}
                        </div>
                      </td>
                      {COLS.map((c) => (
                        <td
                          key={c.key}
                          className={`py-3 px-3 text-center tabular-nums ${
                            c.key === 'goal_difference'
                              ? row.goal_difference > 0
                                ? 'text-brand-primary'
                                : row.goal_difference < 0
                                  ? 'text-brand-secondary'
                                  : 'text-dark-muted'
                              : 'text-slate-300'
                          }`}
                        >
                          {c.key === 'goal_difference' && row.goal_difference > 0 ? '+' : ''}
                          {row[c.key as keyof typeof row] as number}
                        </td>
                      ))}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block rounded-lg bg-brand-primary/10 px-2.5 py-1 font-black text-brand-primary tabular-nums">
                          {row.points}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {loading && <Skeleton className="h-3 w-40" />}
      <p className="text-xs text-dark-muted">
        Win = 3 pts · Draw = 1 pt · Loss = 0 pts. Sorted by points, then goal difference, then goals for.
      </p>
    </div>
  )
}
