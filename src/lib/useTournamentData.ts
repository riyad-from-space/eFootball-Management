'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { fetchActiveTournament, fetchTeams, fetchMatches, fetchStandings, fetchGallery } from '@/lib/queries'
import type { Tournament, Team, MatchWithTeams, StandingWithTeam, GalleryImage } from '@/types/database.types'

export interface TournamentData {
  loading: boolean
  configured: boolean
  error: string | null
  tournament: Tournament | null
  teams: Team[]
  matches: MatchWithTeams[]
  standings: StandingWithTeam[]
  gallery: GalleryImage[]
}

const EMPTY: TournamentData = {
  loading: true,
  configured: true,
  error: null,
  tournament: null,
  teams: [],
  matches: [],
  standings: [],
  gallery: [],
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
      const [teams, matches, standings, gallery] = await Promise.all([
        fetchTeams(db, tournament.id),
        fetchMatches(db, tournament.id),
        fetchStandings(db, tournament.id),
        // Fail-safe: if the gallery table isn't set up yet, don't break the rest.
        fetchGallery(db, tournament.id).catch(() => []),
      ])
      setState({ loading: false, configured: true, error: null, tournament, teams, matches, standings, gallery })
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
    for (const table of ['tournaments', 'teams', 'matches', 'standings', 'gallery_images']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, reload)
    }
    channel.subscribe()

    // Fallbacks so data stays fresh even if a realtime UPDATE event is missed
    // (e.g. before REPLICA IDENTITY FULL is set): refetch when the tab regains
    // focus, and poll on a slow interval as a safety net.
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', onVisible)
    const poll = setInterval(load, 15000)

    return () => {
      if (debounce.current) clearTimeout(debounce.current)
      clearInterval(poll)
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisible)
      db.removeChannel(channel)
    }
  }, [load])

  return state
}
