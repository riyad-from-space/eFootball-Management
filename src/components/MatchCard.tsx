import TeamBadge from '@/components/TeamBadge'
import CountdownTimer from '@/components/CountdownTimer'
import { statusLabel, statusClasses, formatDate, formatTime } from '@/lib/display'
import type { MatchWithTeams } from '@/types/database.types'

function Side({
  team,
  score,
  isWinner,
  align,
}: {
  team: MatchWithTeams['home_team']
  score: number | null
  isWinner: boolean
  align: 'left' | 'right'
}) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamBadge name={team?.name ?? null} logo={team?.logo} color={team?.color} size="md" />
      <div className="min-w-0">
        <p className={`truncate font-bold ${isWinner ? 'text-white' : 'text-slate-300'}`}>
          {team?.name ?? 'To be decided'}
        </p>
        {score !== null && <p className="text-xs text-dark-muted">{isWinner ? 'Winner' : ''}</p>}
      </div>
    </div>
  )
}

export default function MatchCard({ match }: { match: MatchWithTeams }) {
  const decided = match.status === 'completed' || match.status === 'walkover'
  const homeWin = decided && match.winner_id === match.home_team_id && !!match.winner_id
  const awayWin = decided && match.winner_id === match.away_team_id && !!match.winner_id

  return (
    <div className="glow-card p-4 md:p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xxs font-black uppercase tracking-widest text-dark-muted">
          {match.round_label ?? `Round ${match.round_number}`}
        </span>
        <span className={`rounded-full border px-2.5 py-0.5 text-xxs font-bold uppercase tracking-wider ${statusClasses(match.status)}`}>
          {statusLabel(match.status)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Side team={match.home_team} score={match.home_score} isWinner={homeWin} align="left" />

        <div className="shrink-0 text-center">
          {decided ? (
            <div className="rounded-lg bg-black/50 px-3 py-1.5 text-lg font-black tabular-nums text-white">
              {match.home_score ?? 0}
              <span className="mx-1 text-dark-muted">–</span>
              {match.away_score ?? 0}
            </div>
          ) : (
            <span className="text-sm font-black text-dark-muted">VS</span>
          )}
        </div>

        <Side team={match.away_team} score={match.away_score} isWinner={awayWin} align="right" />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-dark-border/50 pt-3">
        <span className="text-xs text-dark-muted">
          {match.scheduled_at ? `${formatDate(match.scheduled_at)} · ${formatTime(match.scheduled_at)}` : 'To be scheduled'}
        </span>
        {match.status === 'scheduled' && match.scheduled_at && <CountdownTimer scheduledAt={match.scheduled_at} compact />}
        {match.status === 'walkover' && <span className="text-xs font-bold text-amber-400">Walkover</span>}
      </div>
    </div>
  )
}
