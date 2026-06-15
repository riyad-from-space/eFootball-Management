'use client'

import { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { GitBranch, Crown, ListOrdered } from 'lucide-react'
import { useActiveTournamentData } from '@/lib/useTournamentData'
import ConfigError from '@/components/ConfigError'
import TeamBadge from '@/components/TeamBadge'
import { BracketRoundSkeleton } from '@/components/Skeleton'
import { statusLabel } from '@/lib/display'
import type { MatchWithTeams, Team } from '@/types/database.types'

interface RoundColumn {
  round: number
  label: string
  matches: MatchWithTeams[]
}

function buildColumns(matches: MatchWithTeams[]): RoundColumn[] {
  const byRound = new Map<number, MatchWithTeams[]>()
  for (const m of matches) {
    if (!byRound.has(m.round_number)) byRound.set(m.round_number, [])
    byRound.get(m.round_number)!.push(m)
  }
  return Array.from(byRound.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([round, ms]) => ({
      round,
      label: ms[0]?.round_label ?? `Round ${round}`,
      matches: [...ms].sort((a, b) => a.match_number - b.match_number),
    }))
}

function BracketMatch({ match }: { match: MatchWithTeams }) {
  const decided = match.status === 'completed' || match.status === 'walkover'
  const homeWin = decided && match.winner_id === match.home_team_id && !!match.winner_id
  const awayWin = decided && match.winner_id === match.away_team_id && !!match.winner_id

  const row = (team: MatchWithTeams['home_team'], score: number | null, win: boolean) => (
    <div className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 ${win ? 'bg-brand-primary/10' : ''}`}>
      <div className="flex min-w-0 items-center gap-2">
        <TeamBadge name={team?.name ?? null} logo={team?.logo} color={team?.color} size="sm" />
        <span className={`truncate text-sm ${win ? 'font-bold text-white' : 'text-slate-300'}`}>
          {team?.name ?? 'TBD'}
        </span>
      </div>
      <span className={`shrink-0 tabular-nums text-sm font-black ${win ? 'text-brand-primary' : 'text-dark-muted'}`}>
        {decided ? (score ?? 0) : '–'}
      </span>
    </div>
  )

  return (
    <div className="rounded-xl border border-dark-border bg-dark-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xxs font-bold uppercase tracking-widest text-dark-muted">
          Match {match.match_number}
        </span>
        <span className="text-xxs font-bold uppercase tracking-wider text-dark-muted">{statusLabel(match.status)}</span>
      </div>
      <div className="space-y-1">
        {row(match.home_team, match.home_score, homeWin)}
        {row(match.away_team, match.away_score, awayWin)}
      </div>
    </div>
  )
}

function ChampionBanner({ champion, prize }: { champion: Team; prize: string | null }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const end = Date.now() + 1200
    const tick = () => {
      confetti({ particleCount: 4, angle: 60, spread: 70, origin: { x: 0 }, colors: ['#ccff00', '#00f0ff', '#ff007f'] })
      confetti({ particleCount: 4, angle: 120, spread: 70, origin: { x: 1 }, colors: ['#ccff00', '#00f0ff', '#ff007f'] })
      if (Date.now() < end) requestAnimationFrame(tick)
    }
    tick()
  }, [])

  return (
    <div className="glow-card relative overflow-hidden p-6 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/10 to-transparent" />
      <div className="relative flex flex-col items-center gap-3">
        <Crown className="h-8 w-8 text-brand-primary" />
        <span className="text-xxs font-black uppercase tracking-[0.3em] text-brand-primary">Champion</span>
        <TeamBadge name={champion.name} logo={champion.logo} color={champion.color} size="xl" />
        <h2 className="text-2xl font-black text-white">{champion.name}</h2>
        {prize && <p className="text-sm text-dark-muted">Prize: <span className="font-bold text-brand-primary">{prize}</span></p>}
        <Link href="/champion" className="mt-1 text-xs font-semibold text-brand-accent hover:underline">
          View champion page →
        </Link>
      </div>
    </div>
  )
}

export default function BracketPage() {
  const { loading, configured, error, tournament, matches } = useActiveTournamentData()

  const bracketMatches = useMemo(() => {
    if (!tournament) return []
    const stage = tournament.format === 'league_playoffs' ? 'playoffs' : 'knockout'
    return matches.filter((m) => m.stage === stage)
  }, [matches, tournament])

  const columns = useMemo(() => buildColumns(bracketMatches), [bracketMatches])

  const champion = useMemo(() => {
    const final = bracketMatches.find(
      (m) => (m.round_label === 'Final' || m.round_label === 'Playoff Final') && m.winner_id
    )
    if (!final) return null
    return final.winner_id === final.home_team?.id ? final.home_team : final.away_team
  }, [bracketMatches])

  if (!configured) return <ConfigError />

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent">
          <GitBranch className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Bracket</h1>
          <p className="text-sm text-dark-muted">{tournament?.name ?? 'Knockout bracket'}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm text-brand-secondary">
          {error}
        </div>
      )}

      {champion && <ChampionBanner champion={champion} prize={tournament?.champion_prize ?? null} />}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <BracketRoundSkeleton key={i} />
          ))}
        </div>
      ) : !tournament ? (
        <EmptyState message="No active tournament right now." />
      ) : tournament.format === 'league' ? (
        <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-12 text-center">
          <ListOrdered className="mx-auto mb-3 h-8 w-8 text-dark-muted" />
          <p className="text-dark-muted">This is a league tournament — there is no knockout bracket.</p>
          <Link href="/standings" className="mt-3 inline-block text-sm font-semibold text-brand-accent hover:underline">
            View the standings →
          </Link>
        </div>
      ) : columns.length === 0 ? (
        <EmptyState message="The bracket will appear once fixtures are generated." />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {columns.map((col) => (
            <div key={col.round} className="flex w-[260px] shrink-0 flex-col gap-3">
              <div className="rounded-lg border border-dark-border bg-dark-card/60 px-3 py-2 text-center">
                <span className="text-sm font-black uppercase tracking-wider text-white">{col.label}</span>
              </div>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {col.matches.map((m) => (
                  <BracketMatch key={m.id} match={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-12 text-center">
      <GitBranch className="mx-auto mb-3 h-8 w-8 text-dark-muted" />
      <p className="text-dark-muted">{message}</p>
    </div>
  )
}
