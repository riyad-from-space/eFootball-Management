/**
 * Result processing — pure functions, no storage.
 * Winner determination, league standings, and knockout/playoff advancement.
 */
import type { Match } from '@/types/database.types'

export interface ComputedStanding {
  team_id: string
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
  rank: number
}

/** Returns the winning team id, or null for a draw. */
export function determineWinner(
  homeTeamId: string | null,
  awayTeamId: string | null,
  homeScore: number,
  awayScore: number
): string | null {
  if (!homeTeamId || !awayTeamId) return homeTeamId || awayTeamId
  if (homeScore > awayScore) return homeTeamId
  if (awayScore > homeScore) return awayTeamId
  return null
}

const COUNTS_FOR_STANDINGS = (m: Match) =>
  (m.status === 'completed' || m.status === 'walkover') && !m.is_bye && m.stage === 'league'

/**
 * Compute league standings from completed league-stage matches.
 * Sorted by points, goal difference, goals for, then team id (stable).
 */
export function computeStandings(matches: Match[], teamIds: string[]): ComputedStanding[] {
  const rows = new Map<string, ComputedStanding>()
  teamIds.forEach((id) =>
    rows.set(id, {
      team_id: id,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      points: 0,
      rank: 0,
    })
  )

  for (const m of matches) {
    if (!COUNTS_FOR_STANDINGS(m) || !m.home_team_id || !m.away_team_id) continue
    const home = rows.get(m.home_team_id)
    const away = rows.get(m.away_team_id)
    if (!home || !away) continue

    const hg = m.home_score ?? 0
    const ag = m.away_score ?? 0
    home.played++
    away.played++
    home.goals_for += hg
    home.goals_against += ag
    away.goals_for += ag
    away.goals_against += hg

    if (hg > ag) {
      home.won++
      home.points += 3
      away.lost++
    } else if (ag > hg) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }
  }

  const sorted = Array.from(rows.values()).sort((a, b) => {
    const gdA = a.goals_for - a.goals_against
    const gdB = b.goals_for - b.goals_against
    if (b.points !== a.points) return b.points - a.points
    if (gdB !== gdA) return gdB - gdA
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for
    return a.team_id.localeCompare(b.team_id)
  })
  sorted.forEach((r, i) => (r.rank = i + 1))
  return sorted
}

export interface BracketAdvancement {
  nextMatchId: string
  slot: 'home' | 'away'
}

/**
 * Given a just-completed knockout/playoff match, find the next-round match and
 * the slot (home/away) the winner should occupy. Positional: matches are sorted
 * by match_number within a round; pair (0,1) → next match 0, etc.
 */
export function determineBracketSlot(
  matchesInCurrentRound: Match[],
  completedMatch: Match,
  matchesInNextRound: Match[]
): BracketAdvancement | null {
  if (matchesInNextRound.length === 0) return null
  const current = [...matchesInCurrentRound].sort((a, b) => a.match_number - b.match_number)
  const idx = current.findIndex((m) => m.id === completedMatch.id)
  if (idx === -1) return null
  const next = [...matchesInNextRound].sort((a, b) => a.match_number - b.match_number)
  const nextMatch = next[Math.floor(idx / 2)]
  if (!nextMatch) return null
  return { nextMatchId: nextMatch.id, slot: idx % 2 === 0 ? 'home' : 'away' }
}
