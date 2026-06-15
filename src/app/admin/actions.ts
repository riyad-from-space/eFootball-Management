'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { isServiceRoleConfigured } from '@/utils/supabase/config'
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  isAdminConfigured,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
} from '@/lib/auth'
import { generateFixtures, type TeamRef } from '@/utils/fixtureGenerator'
import { computeStandings, determineWinner, determineBracketSlot } from '@/utils/resultProcessor'
import { ZodError } from 'zod'
import {
  tournamentSchema,
  teamSchema,
  fixtureEditSchema,
  scheduleSchema,
  resultSchema,
} from '@/lib/validation'
import type { Match } from '@/types/database.types'
import type { ActionResult } from '@/lib/types'

const PUBLIC_PATHS = ['/', '/tournament', '/fixtures', '/results', '/bracket', '/standings', '/champion', '/admin']
function revalidateAll() {
  for (const p of PUBLIC_PATHS) revalidatePath(p)
}

// ─── Auth ──────────────────────────────────────────────────────────────────
export async function getAdminStatus(): Promise<{
  supabaseReady: boolean
  adminReady: boolean
  authed: boolean
}> {
  const jar = await cookies()
  return {
    supabaseReady: isServiceRoleConfigured(),
    adminReady: isAdminConfigured(),
    authed: verifySessionToken(jar.get(SESSION_COOKIE)?.value),
  }
}

export async function login(password: string): Promise<ActionResult> {
  if (!isAdminConfigured()) {
    return { ok: false, error: 'Admin password is not configured on the server (ADMIN_PASSWORD).' }
  }
  if (!verifyPassword(password)) {
    return { ok: false, error: 'Incorrect password.' }
  }
  const token = createSessionToken()
  if (!token) return { ok: false, error: 'Server session secret is not configured.' }
  const jar = await cookies()
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return { ok: true }
}

export async function logout(): Promise<void> {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
}

async function requireAdmin() {
  const jar = await cookies()
  if (!verifySessionToken(jar.get(SESSION_COOKIE)?.value)) {
    throw new Error('Not authenticated.')
  }
  if (!isServiceRoleConfigured()) {
    throw new Error('Supabase service role is not configured on the server.')
  }
  return createAdminClient()
}

function fail(e: unknown): ActionResult {
  if (e instanceof ZodError) {
    const first = e.issues[0]
    const where = first?.path?.length ? `${first.path.join('.')}: ` : ''
    return { ok: false, error: first ? `${where}${first.message}` : 'Invalid input.' }
  }
  const msg = e instanceof Error ? e.message : 'Something went wrong.'
  return { ok: false, error: msg }
}

// ─── Tournaments ─────────────────────────────────────────────────────────────
export async function createTournament(raw: unknown): Promise<ActionResult> {
  try {
    const data = tournamentSchema.parse(raw)
    const db = await requireAdmin()
    const { error } = await db.from('tournaments').insert({ ...data, is_active: false, status: 'draft' })
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateTournament(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const data = tournamentSchema.parse(raw)
    const db = await requireAdmin()
    const { error } = await db.from('tournaments').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteTournament(id: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    // matches & standings cascade via FK ON DELETE CASCADE.
    const { error } = await db.from('tournaments').delete().eq('id', id)
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setActiveTournament(id: string, active: boolean): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    if (active) {
      // Enforce single active: clear others first, then set this one.
      const { error: clearErr } = await db.from('tournaments').update({ is_active: false }).eq('is_active', true)
      if (clearErr) throw new Error(clearErr.message)
      const { error } = await db.from('tournaments').update({ is_active: true }).eq('id', id)
      if (error) throw new Error(error.message)
    } else {
      const { error } = await db.from('tournaments').update({ is_active: false }).eq('id', id)
      if (error) throw new Error(error.message)
    }
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setTournamentStatus(
  id: string,
  status: 'draft' | 'ongoing' | 'completed'
): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { error } = await db.from('tournaments').update({ status }).eq('id', id)
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ─── Teams ───────────────────────────────────────────────────────────────────
export async function createTeam(tournamentId: string, raw: unknown): Promise<ActionResult> {
  try {
    const data = teamSchema.parse(raw)
    const db = await requireAdmin()
    const { error } = await db.from('teams').insert({ ...data, tournament_id: tournamentId })
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateTeam(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const data = teamSchema.parse(raw)
    const db = await requireAdmin()
    const { error } = await db.from('teams').update(data).eq('id', id)
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteTeam(id: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    // Capture the tournament so we can refresh standings after removal.
    const { data: team } = await db.from('teams').select('tournament_id').eq('id', id).maybeSingle()
    const { error } = await db.from('teams').delete().eq('id', id)
    if (error) throw new Error(error.message)
    if (team?.tournament_id) await recomputeStandings(db, team.tournament_id)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ─── Fixtures ──────────────────────────────────────────────────────────────────
export async function regenerateFixtures(tournamentId: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { data: tournament, error: tErr } = await db
      .from('tournaments')
      .select('id, format')
      .eq('id', tournamentId)
      .single()
    if (tErr || !tournament) throw new Error(tErr?.message || 'Tournament not found.')

    const { data: teams, error: teamErr } = await db
      .from('teams')
      .select('id, name')
      .eq('tournament_id', tournamentId)
    if (teamErr) throw new Error(teamErr.message)
    if (!teams || teams.length < 2) throw new Error('Add at least 2 teams before generating fixtures.')
    if (teams.length > 32) throw new Error('Maximum 32 teams supported.')

    const fixtures = generateFixtures(tournament.format, teams as TeamRef[], tournamentId)
    if (fixtures.length === 0) throw new Error('Could not generate fixtures for this format.')

    // Clear existing matches & standings, then insert fresh.
    const { error: delMatches } = await db.from('matches').delete().eq('tournament_id', tournamentId)
    if (delMatches) throw new Error(delMatches.message)
    const { error: delStandings } = await db.from('standings').delete().eq('tournament_id', tournamentId)
    if (delStandings) throw new Error(delStandings.message)

    const { error: insErr } = await db.from('matches').insert(fixtures)
    if (insErr) throw new Error(insErr.message)

    // Seed zeroed standings rows for league-based formats.
    if (tournament.format !== 'knockout') {
      const rows = teams.map((t) => ({ tournament_id: tournamentId, team_id: t.id }))
      const { error: stErr } = await db.from('standings').upsert(rows, { onConflict: 'tournament_id,team_id' })
      if (stErr) throw new Error(stErr.message)
    }

    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateFixture(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const data = fixtureEditSchema.parse(raw)
    const db = await requireAdmin()
    const { error } = await db
      .from('matches')
      .update({
        home_team_id: data.home_team_id ?? null,
        away_team_id: data.away_team_id ?? null,
        round_label: data.round_label,
        round_number: data.round_number,
        scheduled_at: data.scheduled_at,
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function swapFixtureTeams(id: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { data: m, error } = await db.from('matches').select('home_team_id, away_team_id').eq('id', id).single()
    if (error || !m) throw new Error(error?.message || 'Match not found.')
    const { error: upErr } = await db
      .from('matches')
      .update({ home_team_id: m.away_team_id, away_team_id: m.home_team_id })
      .eq('id', id)
    if (upErr) throw new Error(upErr.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateSchedule(id: string, raw: unknown): Promise<ActionResult> {
  try {
    const { scheduled_at } = scheduleSchema.parse(raw)
    const db = await requireAdmin()
    const { error } = await db.from('matches').update({ scheduled_at }).eq('id', id)
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setMatchLive(id: string, live: boolean): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { error } = await db.from('matches').update({ status: live ? 'live' : 'scheduled' }).eq('id', id)
    if (error) throw new Error(error.message)
    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

// ─── Results ─────────────────────────────────────────────────────────────────
async function loadTournamentMatches(
  db: Awaited<ReturnType<typeof requireAdmin>>,
  tournamentId: string
): Promise<Match[]> {
  const { data, error } = await db.from('matches').select('*').eq('tournament_id', tournamentId)
  if (error) throw new Error(error.message)
  return (data ?? []) as Match[]
}

async function recomputeStandings(
  db: Awaited<ReturnType<typeof requireAdmin>>,
  tournamentId: string
) {
  const matches = await loadTournamentMatches(db, tournamentId)
  const { data: teams, error } = await db.from('teams').select('id').eq('tournament_id', tournamentId)
  if (error) throw new Error(error.message)
  const standings = computeStandings(matches, (teams ?? []).map((t) => t.id))
  if (standings.length === 0) return
  const rows = standings.map((s) => ({ ...s, tournament_id: tournamentId }))
  const { error: upErr } = await db.from('standings').upsert(rows, { onConflict: 'tournament_id,team_id' })
  if (upErr) throw new Error(upErr.message)
}

/** Place a completed match's winner into the next round/match slot. */
async function advanceWinner(
  db: Awaited<ReturnType<typeof requireAdmin>>,
  match: Match,
  winnerId: string | null
) {
  if (!winnerId) return
  if (match.stage !== 'knockout' && match.stage !== 'playoffs') return
  const all = await loadTournamentMatches(db, match.tournament_id)
  const current = all.filter((m) => m.stage === match.stage && m.round_number === match.round_number)
  const next = all.filter((m) => m.stage === match.stage && m.round_number === match.round_number + 1)
  const adv = determineBracketSlot(current, match, next)
  if (!adv) return
  const patch = adv.slot === 'home' ? { home_team_id: winnerId } : { away_team_id: winnerId }
  const { error } = await db.from('matches').update(patch).eq('id', adv.nextMatchId)
  if (error) throw new Error(error.message)
}

/** After the league phase completes, seed playoff semifinals from standings. */
async function seedPlayoffsIfReady(
  db: Awaited<ReturnType<typeof requireAdmin>>,
  tournamentId: string
) {
  const all = await loadTournamentMatches(db, tournamentId)
  const league = all.filter((m) => m.stage === 'league')
  if (league.length === 0) return
  const leagueDone = league.every((m) => m.status === 'completed' || m.status === 'walkover' || m.is_bye)
  if (!leagueDone) return

  const playoffs = all.filter((m) => m.stage === 'playoffs').sort((a, b) => a.round_number - b.round_number || a.match_number - b.match_number)
  if (playoffs.length === 0) return
  // Only seed if not already seeded.
  const alreadySeeded = playoffs.some((m) => m.home_team_id || m.away_team_id)
  if (alreadySeeded) return

  // Standings are already recomputed before this is called.
  const { data: st, error } = await db
    .from('standings')
    .select('team_id, rank')
    .eq('tournament_id', tournamentId)
    .order('rank', { ascending: true })
  if (error) throw new Error(error.message)
  const ranked = (st ?? []).map((r) => r.team_id)
  if (ranked.length < 2) return

  const semis = playoffs.filter((m) => m.round_label === 'Playoff Semifinal')
  if (semis.length === 2 && ranked.length >= 4) {
    // SF1: seed1 vs seed4, SF2: seed2 vs seed3
    await db.from('matches').update({ home_team_id: ranked[0], away_team_id: ranked[3] }).eq('id', semis[0].id)
    await db.from('matches').update({ home_team_id: ranked[1], away_team_id: ranked[2] }).eq('id', semis[1].id)
  } else {
    // No semis (fewer teams): final is top-2.
    const final = playoffs.find((m) => m.round_label === 'Playoff Final')
    if (final) {
      await db.from('matches').update({ home_team_id: ranked[0], away_team_id: ranked[1] }).eq('id', final.id)
    }
  }
}

/** Mark the tournament completed if its final has a winner. */
async function maybeCompleteTournament(
  db: Awaited<ReturnType<typeof requireAdmin>>,
  tournamentId: string
) {
  const all = await loadTournamentMatches(db, tournamentId)
  const finals = all.filter((m) => m.round_label === 'Final' || m.round_label === 'Playoff Final')
  if (finals.length === 0) return
  const decided = finals.some((m) => (m.status === 'completed' || m.status === 'walkover') && m.winner_id)
  if (decided) {
    await db.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId)
  }
}

export async function saveResult(matchId: string, raw: unknown): Promise<ActionResult> {
  try {
    const input = resultSchema.parse(raw)
    const db = await requireAdmin()
    const { data: match, error } = await db.from('matches').select('*').eq('id', matchId).single()
    if (error || !match) throw new Error(error?.message || 'Match not found.')
    const m = match as Match

    let homeScore = input.home_score
    let awayScore = input.away_score
    let winnerId: string | null
    let status: 'completed' | 'walkover'
    let isWalkover = false

    if (input.outcome === 'walkover') {
      isWalkover = true
      status = 'walkover'
      const winnerSide = input.walkover_winner === 'away' ? m.away_team_id : m.home_team_id
      winnerId = winnerSide ?? null
      // Conventional walkover scoreline.
      homeScore = input.walkover_winner === 'home' ? 3 : 0
      awayScore = input.walkover_winner === 'away' ? 3 : 0
    } else {
      status = 'completed'
      winnerId = determineWinner(m.home_team_id, m.away_team_id, homeScore, awayScore)
    }

    const { error: upErr } = await db
      .from('matches')
      .update({
        home_score: homeScore,
        away_score: awayScore,
        status,
        winner_id: winnerId,
        is_walkover: isWalkover,
      })
      .eq('id', matchId)
    if (upErr) throw new Error(upErr.message)

    await advanceWinner(db, m, winnerId)
    await recomputeStandings(db, m.tournament_id)
    await seedPlayoffsIfReady(db, m.tournament_id)
    await maybeCompleteTournament(db, m.tournament_id)

    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function clearResult(matchId: string): Promise<ActionResult> {
  try {
    const db = await requireAdmin()
    const { data: match, error } = await db.from('matches').select('*').eq('id', matchId).single()
    if (error || !match) throw new Error(error?.message || 'Match not found.')
    const m = match as Match

    // Roll back any winner this match pushed into the next round.
    if ((m.stage === 'knockout' || m.stage === 'playoffs') && m.winner_id) {
      const all = await loadTournamentMatches(db, m.tournament_id)
      const current = all.filter((x) => x.stage === m.stage && x.round_number === m.round_number)
      const next = all.filter((x) => x.stage === m.stage && x.round_number === m.round_number + 1)
      const adv = determineBracketSlot(current, m, next)
      if (adv) {
        const patch = adv.slot === 'home' ? { home_team_id: null } : { away_team_id: null }
        await db.from('matches').update(patch).eq('id', adv.nextMatchId)
      }
    }

    const { error: upErr } = await db
      .from('matches')
      .update({ home_score: null, away_score: null, status: 'scheduled', winner_id: null, is_walkover: false })
      .eq('id', matchId)
    if (upErr) throw new Error(upErr.message)

    await recomputeStandings(db, m.tournament_id)
    // If a final was un-decided, drop tournament back to ongoing.
    await db.from('tournaments').update({ status: 'ongoing' }).eq('id', m.tournament_id).eq('status', 'completed')

    revalidateAll()
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
