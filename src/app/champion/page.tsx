'use client'

import { useEffect, useMemo, useRef, type ComponentType } from 'react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { Crown, Trophy, Award, Sparkles } from 'lucide-react'
import { useActiveTournamentData } from '@/lib/useTournamentData'
import ConfigError from '@/components/ConfigError'
import TeamBadge from '@/components/TeamBadge'
import { Skeleton } from '@/components/Skeleton'
import type { Team } from '@/types/database.types'

export default function ChampionPage() {
  const { loading, configured, error, tournament, matches, standings } = useActiveTournamentData()

  const result = useMemo(() => {
    const final = matches.find(
      (m) => (m.round_label === 'Final' || m.round_label === 'Playoff Final') && m.winner_id
    )
    if (final) {
      const champion: Team | null = final.winner_id === final.home_team?.id ? final.home_team : final.away_team
      const runnerUp: Team | null = final.winner_id === final.home_team?.id ? final.away_team : final.home_team
      return { champion, runnerUp, score: `${final.home_score ?? 0} – ${final.away_score ?? 0}` }
    }
    // Pure league: the table-topper is champion once the admin marks it completed.
    if (tournament?.format === 'league' && tournament.status === 'completed' && standings.length > 0) {
      return { champion: standings[0].team ?? null, runnerUp: standings[1]?.team ?? null, score: `${standings[0].points} pts` }
    }
    return null
  }, [matches, standings, tournament])

  if (!configured) return <ConfigError />

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    )
  }

  if (!tournament || !result?.champion) {
    return (
      <div className="rounded-2xl border border-dashed border-dark-border bg-dark-card/40 p-12 text-center animate-fadeIn">
        <Crown className="mx-auto mb-3 h-10 w-10 text-dark-muted" />
        <h1 className="text-xl font-black text-white">No champion crowned yet</h1>
        <p className="mt-2 text-sm text-dark-muted">
          The champion will be revealed here once the final is decided.
        </p>
        <Link href="/bracket" className="mt-4 inline-block text-sm font-semibold text-brand-accent hover:underline">
          Follow the bracket →
        </Link>
      </div>
    )
  }

  return (
    <ChampionReveal
      tournamentName={tournament.name}
      prize={tournament.champion_prize}
      champion={result.champion}
      runnerUp={result.runnerUp}
      score={result.score}
      error={error}
    />
  )
}

function ChampionReveal({
  tournamentName,
  prize,
  champion,
  runnerUp,
  score,
  error,
}: {
  tournamentName: string
  prize: string | null
  champion: Team
  runnerUp: Team | null
  score: string
  error: string | null
}) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const colors = ['#ccff00', '#00f0ff', '#ff007f']
    confetti({ particleCount: 160, spread: 100, origin: { y: 0.3 }, colors })
    const end = Date.now() + 1500
    const tick = () => {
      confetti({ particleCount: 5, angle: 60, spread: 70, origin: { x: 0 }, colors })
      confetti({ particleCount: 5, angle: 120, spread: 70, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(tick)
    }
    tick()
  }, [])

  return (
    <div className="space-y-6 animate-fadeIn">
      {error && (
        <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm text-brand-secondary">
          {error}
        </div>
      )}

      <section className="glow-card relative overflow-hidden p-8 md:p-12 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 via-transparent to-transparent" />
        <div className="relative flex flex-col items-center gap-4">
          <span className="inline-flex items-center gap-2 text-xxs font-black uppercase tracking-[0.35em] text-brand-primary">
            <Sparkles className="h-3.5 w-3.5" /> {tournamentName} Champion
          </span>

          <div className="relative">
            <Trophy className="absolute -top-6 left-1/2 -translate-x-1/2 h-10 w-10 text-brand-primary animate-bounce-short" />
            <TeamBadge name={champion.name} logo={champion.logo} color={champion.color} size="xl" className="mt-6" />
          </div>

          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white glow-text">
            {champion.name}
          </h1>

          {prize && (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-4 py-2">
              <Award className="h-4 w-4 text-brand-primary" />
              <span className="text-sm font-bold text-brand-primary">{prize}</span>
            </div>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Crown} label="Winner" value={champion.name} accent />
        <StatCard icon={Trophy} label="Final Score" value={score} />
        {runnerUp && <StatCard icon={Award} label="Runner-up" value={runnerUp.name} />}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/bracket" className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-semibold text-white hover:border-brand-primary/40">
          View bracket
        </Link>
        <Link href="/results" className="rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-sm font-semibold text-white hover:border-brand-primary/40">
          All results
        </Link>
      </div>
    </div>
  )
}

function StatCard({
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
    <div className="glow-card p-5 text-center">
      <Icon className={`mx-auto mb-2 h-6 w-6 ${accent ? 'text-brand-primary' : 'text-brand-accent'}`} />
      <p className="text-xxs font-bold uppercase tracking-widest text-dark-muted">{label}</p>
      <p className={`mt-1 font-black ${accent ? 'text-brand-primary' : 'text-white'}`}>{value}</p>
    </div>
  )
}
