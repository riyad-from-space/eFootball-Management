'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchActiveTournament, fetchTeams, fetchMatches, fetchStandings } from '@/lib/queries'
import type { Tournament, Team, MatchWithTeams, StandingWithTeam } from '@/types/database.types'

export interface TournamentData {
  loading: boolean
  configured: boolean
  error: string | null
  tournament: Tournament | null
  teams: Team[]
  matches: MatchWithTeams[]
  standings: StandingWithTeam[]
}

const EMPTY: TournamentData = {
  loading: true,
  configured: true,
  error: null,
  tournament: null,
  teams: [],
  matches: [],
  standings: [],
}

/**
 * Loads the active tournament plus its teams, matches and standings, and keeps
 * them live via Supabase Realtime. Renders a config-error flag (never mock data)
 * when Supabase is unconfigured.
 */
export function useActiveTournamentData(): TournamentData {
  const [state, setState] = useState<TournamentData>(EMPTY)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const db = createClient()
    if (!db) {
      setState({ ...EMPTY, loading: false, configured: false })
      return
    }
    try {
      const tournament = await fetchActiveTournament(db)
      if (!tournament) {
        setState({ ...EMPTY, loading: false })
        return
      }
      const [teams, matches, standings] = await Promise.all([
        fetchTeams(db, tournament.id),
        fetchMatches(db, tournament.id),
        fetchStandings(db, tournament.id),
      ])
      setState({ loading: false, configured: true, error: null, tournament, teams, matches, standings })
    } catch (e) {
      setState({ ...EMPTY, loading: false, error: e instanceof Error ? e.message : 'Failed to load data.' })
    }
  }, [])

  useEffect(() => {
    const db = createClient()
    if (!db) {
      setState({ ...EMPTY, loading: false, configured: false })
      return
    }
    load()

    const reload = () => {
      if (debounce.current) clearTimeout(debounce.current)
      debounce.current = setTimeout(load, 250)
    }

    const channel = db.channel('efootball-public')
    for (const table of ['tournaments', 'teams', 'matches', 'standings']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, reload)
    }
    channel.subscribe()

    return () => {
      if (debounce.current) clearTimeout(debounce.current)
      db.removeChannel(channel)
    }
  }, [load])

  return state
}
