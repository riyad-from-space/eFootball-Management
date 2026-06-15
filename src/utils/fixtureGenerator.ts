/**
 * Fixture generator — pure functions, no storage.
 * Supports Knockout, League (round robin) and League + Playoffs.
 * Output rows match the `matches` table Insert shape so a server action can
 * insert them directly.
 */
import type { MatchStage, MatchStatus, TournamentFormat } from '@/types/database.types'

export interface TeamRef {
  id: string
  name: string
}

export interface GeneratedFixture {
  tournament_id: string
  home_team_id: string | null
  away_team_id: string | null
  round_number: number
  round_label: string
  match_number: number
  stage: MatchStage
  is_bye: boolean
  status: MatchStatus
  winner_id: string | null
  scheduled_at: string | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function knockoutRoundLabel(roundIndex: number, totalRounds: number): string {
  const remaining = totalRounds - roundIndex
  if (remaining === 1) return 'Final'
  if (remaining === 2) return 'Semifinal'
  if (remaining === 3) return 'Quarterfinal'
  return `Round of ${Math.pow(2, remaining)}`
}

function base(tournamentId: string): Omit<
  GeneratedFixture,
  'round_number' | 'round_label' | 'match_number' | 'home_team_id' | 'away_team_id' | 'stage' | 'is_bye' | 'status' | 'winner_id'
> {
  return { tournament_id: tournamentId, scheduled_at: null }
}

// ─── Knockout ────────────────────────────────────────────────────────────────
export function generateKnockoutFixtures(teams: TeamRef[], tournamentId: string): GeneratedFixture[] {
  if (teams.length < 2) return []
  const fixtures: GeneratedFixture[] = []
  let matchNumber = 1

  let bracketSize = 2
  while (bracketSize < teams.length) bracketSize *= 2

  const bracketed: (TeamRef | null)[] = [...shuffle(teams)]
  while (bracketed.length < bracketSize) bracketed.push(null)

  let currentRound = bracketed
  let roundIndex = 0
  const totalRounds = Math.log2(bracketSize)

  while (currentRound.length > 1) {
    const roundLabel = knockoutRoundLabel(roundIndex, totalRounds)
    const nextRound: (TeamRef | null)[] = []

    for (let i = 0; i < currentRound.length; i += 2) {
      const home = currentRound[i]
      const away = currentRound[i + 1]
      const isBye = home === null || away === null
      const present = home ?? away

      fixtures.push({
        ...base(tournamentId),
        home_team_id: home?.id ?? null,
        away_team_id: away?.id ?? null,
        round_number: roundIndex + 1,
        round_label: roundLabel,
        match_number: matchNumber++,
        stage: 'knockout',
        is_bye: isBye,
        // A bye is auto-resolved: the present team advances.
        status: isBye && present ? 'completed' : 'scheduled',
        winner_id: isBye && present ? present.id : null,
      })

      nextRound.push(isBye ? present : null)
    }
    currentRound = nextRound
    roundIndex++
  }
  return fixtures
}

// ─── League (single round robin, circle method) ───────────────────────────────
export function generateLeagueFixtures(
  teams: TeamRef[],
  tournamentId: string,
  startRound = 0,
  stage: MatchStage = 'league'
): GeneratedFixture[] {
  if (teams.length < 2) return []
  const fixtures: GeneratedFixture[] = []
  let matchNumber = 1

  const list: (TeamRef | null)[] = [...teams]
  if (list.length % 2 !== 0) list.push(null) // BYE marker

  const n = list.length
  const rounds = n - 1
  const half = n / 2
  const pinned = list[0]
  const rotatable = list.slice(1)

  for (let r = 0; r < rounds; r++) {
    const top = [pinned, ...rotatable.slice(0, half - 1)]
    const bottom = [...rotatable.slice(half - 1)].reverse()

    for (let i = 0; i < half; i++) {
      const home = r % 2 === 0 ? top[i] : bottom[i]
      const away = r % 2 === 0 ? bottom[i] : top[i]
      if (home === null || away === null) continue // skip the BYE pairing
      fixtures.push({
        ...base(tournamentId),
        home_team_id: home.id,
        away_team_id: away.id,
        round_number: startRound + r + 1,
        round_label: `Matchday ${r + 1}`,
        match_number: matchNumber++,
        stage,
        is_bye: false,
        status: 'scheduled',
        winner_id: null,
      })
    }
    rotatable.unshift(rotatable.pop()!)
  }
  return fixtures
}

// ─── League + Playoffs ─────────────────────────────────────────────────────────
// League phase + empty playoff bracket. Playoff team slots are filled by the
// result server action once the league phase completes (top seeds → semis).
export function generateLeaguePlayoffsFixtures(teams: TeamRef[], tournamentId: string): GeneratedFixture[] {
  const league = generateLeagueFixtures(teams, tournamentId, 0, 'league')
  const lastLeagueRound = league.reduce((m, f) => Math.max(m, f.round_number), 0)
  let matchNumber = league.length + 1
  const playoffs: GeneratedFixture[] = []

  const hasSemis = teams.length >= 4
  if (hasSemis) {
    for (let i = 0; i < 2; i++) {
      playoffs.push({
        ...base(tournamentId),
        home_team_id: null,
        away_team_id: null,
        round_number: lastLeagueRound + 1,
        round_label: 'Playoff Semifinal',
        match_number: matchNumber++,
        stage: 'playoffs',
        is_bye: false,
        status: 'scheduled',
        winner_id: null,
      })
    }
  }
  playoffs.push({
    ...base(tournamentId),
    home_team_id: null,
    away_team_id: null,
    round_number: lastLeagueRound + (hasSemis ? 2 : 1),
    round_label: 'Playoff Final',
    match_number: matchNumber++,
    stage: 'playoffs',
    is_bye: false,
    status: 'scheduled',
    winner_id: null,
  })
  return [...league, ...playoffs]
}

export function generateFixtures(
  format: TournamentFormat,
  teams: TeamRef[],
  tournamentId: string
): GeneratedFixture[] {
  switch (format) {
    case 'knockout':
      return generateKnockoutFixtures(teams, tournamentId)
    case 'league':
      return generateLeagueFixtures(teams, tournamentId)
    case 'league_playoffs':
      return generateLeaguePlayoffsFixtures(teams, tournamentId)
    default:
      return []
  }
}
