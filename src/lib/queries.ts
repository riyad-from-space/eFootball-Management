import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Tournament, Team, MatchWithTeams, StandingWithTeam } from '@/types/database.types'

// Client-side data fetchers shared by the public pages. They take whatever
// Supabase client the caller already created (browser or server read client).

type DB = SupabaseClient<Database>

const MATCH_SELECT = '*, home_team:home_team_id(*), away_team:away_team_id(*)'
const STANDING_SELECT = '*, team:team_id(*)'

export async function fetchAllTournaments(db: DB): Promise<Tournament[]> {
  const { data, error } = await db.from('tournaments').select('*').order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchActiveTournament(db: DB): Promise<Tournament | null> {
  const { data, error } = await db.from('tournaments').select('*').eq('is_active', true).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function fetchTournamentById(db: DB, id: string): Promise<Tournament | null> {
  const { data, error } = await db.from('tournaments').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data
}

export async function fetchTeams(db: DB, tournamentId: string): Promise<Team[]> {
  const { data, error } = await db.from('teams').select('*').eq('tournament_id', tournamentId).order('name')
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function fetchMatches(db: DB, tournamentId: string): Promise<MatchWithTeams[]> {
  const { data, error } = await db
    .from('matches')
    .select(MATCH_SELECT)
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as MatchWithTeams[]
}

export async function fetchStandings(db: DB, tournamentId: string): Promise<StandingWithTeam[]> {
  const { data, error } = await db
    .from('standings')
    .select(STANDING_SELECT)
    .eq('tournament_id', tournamentId)
    .order('rank', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as StandingWithTeam[]
}
