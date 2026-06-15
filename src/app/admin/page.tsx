'use client'

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ShieldCheck, Lock, LogOut, Plus, Pencil, Trash2, Loader2, X, Check, Power,
  RefreshCw, Calendar, ListOrdered, Users, Trophy, ArrowLeftRight, Flag, AlertTriangle,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { fetchAllTournaments, fetchTeams, fetchMatches } from '@/lib/queries'
import {
  loginSchema, tournamentSchema, teamSchema, fixtureEditSchema, resultSchema, FORMATS,
} from '@/lib/validation'
import {
  getAdminStatus, login, logout,
  createTournament, updateTournament, deleteTournament, setActiveTournament, setTournamentStatus,
  createTeam, updateTeam, deleteTeam,
  regenerateFixtures, updateFixture, swapFixtureTeams,
  saveResult, clearResult,
} from './actions'
import type { ActionResult } from '@/lib/types'
import type { Tournament, Team, MatchWithTeams } from '@/types/database.types'
import ConfigError from '@/components/ConfigError'
import TeamBadge from '@/components/TeamBadge'

const FORMAT_LABEL: Record<string, string> = {
  knockout: 'Knockout',
  league: 'League (Round Robin)',
  league_playoffs: 'League + Playoffs',
}
const GRADIENTS = [
  'from-lime-400 to-emerald-500', 'from-sky-400 to-blue-600', 'from-fuchsia-500 to-pink-600',
  'from-amber-400 to-orange-600', 'from-violet-500 to-purple-700', 'from-rose-500 to-red-600',
  'from-cyan-400 to-teal-600', 'from-slate-200 to-slate-400',
]

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function fromLocalInput(local: string): string | null {
  if (!local) return null
  return new Date(local).toISOString()
}

// ─── Page shell: config → login → dashboard ──────────────────────────────────
export default function AdminPage() {
  const [phase, setPhase] = useState<'loading' | 'config' | 'login' | 'ready'>('loading')
  const [missing, setMissing] = useState<string>('')

  const check = useCallback(async () => {
    const s = await getAdminStatus()
    if (!s.supabaseReady || !s.adminReady) {
      setMissing(
        [!s.supabaseReady && 'Supabase (URL / anon / service-role key)', !s.adminReady && 'ADMIN_PASSWORD']
          .filter(Boolean)
          .join(' and ')
      )
      setPhase('config')
    } else setPhase(s.authed ? 'ready' : 'login')
  }, [])

  useEffect(() => {
    check()
  }, [check])

  if (phase === 'loading')
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" />
      </div>
    )
  if (phase === 'config') return <ConfigError detail={`Missing server configuration: ${missing}. See README.md.`} />
  if (phase === 'login') return <LoginForm onSuccess={check} />
  return <Dashboard onLogout={check} />
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [serverError, setServerError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null)
    const res = await login(values.password)
    if (res.ok) onSuccess()
    else setServerError(res.error)
  })

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <form onSubmit={onSubmit} className="glow-card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
            <Lock className="h-6 w-6 text-brand-primary" />
          </div>
          <h1 className="text-xl font-black text-white">Admin Login</h1>
          <p className="text-sm text-dark-muted">eFootball Appifylab</p>
        </div>
        <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-dark-muted">Password</label>
        <input
          type="password"
          autoFocus
          {...register('password')}
          className="w-full rounded-lg border border-dark-border bg-black/40 px-3 py-2.5 text-white outline-none focus:border-brand-primary/50"
        />
        {formState.errors.password && (
          <p className="mt-1 text-xs text-brand-secondary">{formState.errors.password.message}</p>
        )}
        {serverError && <p className="mt-2 text-xs text-brand-secondary">{serverError}</p>}
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 font-bold text-black disabled:opacity-60"
        >
          {formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Sign in
        </button>
      </form>
    </div>
  )
}

type Tab = 'tournaments' | 'teams' | 'fixtures' | 'results'

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('tournaments')
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<MatchWithTeams[]>([])
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const notify = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const loadTournaments = useCallback(async () => {
    const db = createClient()
    if (!db) return
    try {
      const list = await fetchAllTournaments(db)
      setTournaments(list)
      setSelectedId((cur) => cur || list.find((t) => t.is_active)?.id || list[0]?.id || '')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to load tournaments', false)
    }
  }, [notify])

  const loadTournamentData = useCallback(async (id: string) => {
    const db = createClient()
    if (!db || !id) {
      setTeams([])
      setMatches([])
      return
    }
    try {
      const [t, m] = await Promise.all([fetchTeams(db, id), fetchMatches(db, id)])
      setTeams(t)
      setMatches(m)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to load tournament data', false)
    }
  }, [notify])

  useEffect(() => {
    loadTournaments()
  }, [loadTournaments])
  useEffect(() => {
    if (selectedId) loadTournamentData(selectedId)
  }, [selectedId, loadTournamentData])

  // run an action then refresh
  const run = useCallback(
    async (p: Promise<ActionResult>, successMsg: string) => {
      const res = await p
      if (res.ok) {
        notify(successMsg)
        await loadTournaments()
        if (selectedId) await loadTournamentData(selectedId)
      } else {
        notify(res.error, false)
      }
      return res.ok
    },
    [notify, loadTournaments, loadTournamentData, selectedId]
  )

  const selected = tournaments.find((t) => t.id === selectedId) ?? null

  const TABS: { key: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
    { key: 'tournaments', label: 'Tournaments', icon: Trophy },
    { key: 'teams', label: 'Teams', icon: Users },
    { key: 'fixtures', label: 'Fixtures', icon: Calendar },
    { key: 'results', label: 'Results', icon: ListOrdered },
  ]

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Admin Dashboard</h1>
            <p className="text-sm text-dark-muted">eFootball Appifylab</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await logout()
            onLogout()
          }}
          className="flex items-center gap-2 rounded-lg border border-dark-border px-3 py-2 text-sm font-semibold text-dark-muted hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </header>

      {/* Tournament selector (shared by teams/fixtures/results) */}
      {tab !== 'tournaments' && (
        <div className="flex items-center gap-3 rounded-xl border border-dark-border bg-dark-card p-3">
          <span className="text-xs font-bold uppercase tracking-wider text-dark-muted">Tournament</span>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="flex-1 rounded-lg border border-dark-border bg-black/40 px-3 py-2 text-sm text-white outline-none"
          >
            {tournaments.length === 0 && <option value="">No tournaments — create one first</option>}
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_active ? '• ACTIVE' : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto no-scrollbar rounded-xl border border-dark-border bg-dark-card p-1">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold whitespace-nowrap ${
                tab === t.key ? 'bg-brand-primary text-black' : 'text-dark-muted hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          )
        })}
      </nav>

      {tab === 'tournaments' && <TournamentsTab tournaments={tournaments} run={run} />}
      {tab === 'teams' && <TeamsTab tournament={selected} teams={teams} run={run} />}
      {tab === 'fixtures' && <FixturesTab tournament={selected} teams={teams} matches={matches} run={run} />}
      {tab === 'results' && <ResultsTab tournament={selected} matches={matches} run={run} />}

      {toast && (
        <div
          className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2.5 text-sm font-semibold shadow-xl lg:bottom-6 ${
            toast.ok
              ? 'border-brand-primary/30 bg-dark-card text-brand-primary'
              : 'border-brand-secondary/40 bg-dark-card text-brand-secondary'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  )
}

type RunFn = (p: Promise<ActionResult>, successMsg: string) => Promise<boolean>

// ─── Modal ──────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="glow-card w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-black text-white">{title}</h3>
          <button onClick={onClose} className="text-dark-muted hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const inputCls = 'w-full rounded-lg border border-dark-border bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-brand-primary/50'
const labelCls = 'mb-1 block text-xs font-bold uppercase tracking-wider text-dark-muted'
function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-xs text-brand-secondary">{msg}</p> : null
}

// ─── Tournaments tab ─────────────────────────────────────────────────────────
function TournamentsTab({ tournaments, run }: { tournaments: Tournament[]; run: RunFn }) {
  const [editing, setEditing] = useState<Tournament | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Tournament | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-black"
        >
          <Plus className="h-4 w-4" /> New Tournament
        </button>
      </div>

      {tournaments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center text-dark-muted">
          No tournaments yet. Create your first one.
        </p>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <div key={t.id} className="glow-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-white">{t.name}</h3>
                    {t.is_active && (
                      <span className="rounded-full bg-brand-primary/15 px-2 py-0.5 text-xxs font-bold text-brand-primary">
                        ACTIVE
                      </span>
                    )}
                    <span className="rounded-full bg-white/5 px-2 py-0.5 text-xxs font-bold text-dark-muted uppercase">
                      {t.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-dark-muted">
                    {FORMAT_LABEL[t.format]} {t.champion_prize ? `· Prize: ${t.champion_prize}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => run(setActiveTournament(t.id, !t.is_active), t.is_active ? 'Deactivated' : 'Activated')}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      t.is_active ? 'border-brand-secondary/30 text-brand-secondary' : 'border-brand-primary/30 text-brand-primary'
                    }`}
                  >
                    <Power className="h-3.5 w-3.5" /> {t.is_active ? 'Deactivate' : 'Set Active'}
                  </button>
                  <button
                    onClick={() => setEditing(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    onClick={() => setConfirmDelete(t)}
                    className="flex items-center gap-1.5 rounded-lg border border-dark-border px-3 py-1.5 text-xs font-semibold text-brand-secondary"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                {(['draft', 'ongoing', 'completed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => run(setTournamentStatus(t.id, s), `Status: ${s}`)}
                    className={`rounded-md px-2.5 py-1 text-xxs font-bold uppercase ${
                      t.status === s ? 'bg-brand-accent/15 text-brand-accent' : 'bg-white/5 text-dark-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TournamentForm
          tournament={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          run={run}
        />
      )}
      {confirmDelete && (
        <Modal title="Delete tournament?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-dark-muted">
            This permanently deletes <strong className="text-white">{confirmDelete.name}</strong> and all its teams,
            matches and standings.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-dark-border px-4 py-2 text-sm text-white">
              Cancel
            </button>
            <button
              onClick={async () => {
                const ok = await run(deleteTournament(confirmDelete.id), 'Tournament deleted')
                if (ok) setConfirmDelete(null)
              }}
              className="rounded-lg bg-brand-secondary px-4 py-2 text-sm font-bold text-white"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TournamentForm({ tournament, onClose, run }: { tournament: Tournament | null; onClose: () => void; run: RunFn }) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: tournament?.name ?? '',
      description: tournament?.description ?? '',
      format: tournament?.format ?? 'knockout',
      champion_prize: tournament?.champion_prize ?? '',
      start_date: tournament?.start_date ?? '',
      end_date: tournament?.end_date ?? '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const ok = tournament
      ? await run(updateTournament(tournament.id, values), 'Tournament updated')
      : await run(createTournament(values), 'Tournament created')
    if (ok) onClose()
  })

  return (
    <Modal title={tournament ? 'Edit Tournament' : 'New Tournament'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>Name</label>
          <input {...register('name')} className={inputCls} placeholder="Summer Championship 2026" />
          <FieldError msg={formState.errors.name?.message} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea {...register('description')} rows={2} className={inputCls} />
          <FieldError msg={formState.errors.description?.message} />
        </div>
        <div>
          <label className={labelCls}>Format</label>
          <select {...register('format')} className={inputCls}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABEL[f]}
              </option>
            ))}
          </select>
          <FieldError msg={formState.errors.format?.message} />
        </div>
        <div>
          <label className={labelCls}>Champion Prize</label>
          <input {...register('champion_prize')} className={inputCls} placeholder="৳1000 / Trophy + Medal" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Start Date</label>
            <input type="date" {...register('start_date')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>End Date</label>
            <input type="date" {...register('end_date')} className={inputCls} />
            <FieldError msg={formState.errors.end_date?.message} />
          </div>
        </div>
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 font-bold text-black disabled:opacity-60"
        >
          {formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {tournament ? 'Save changes' : 'Create'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Teams tab ───────────────────────────────────────────────────────────────
function TeamsTab({ tournament, teams, run }: { tournament: Tournament | null; teams: Team[]; run: RunFn }) {
  const [editing, setEditing] = useState<Team | null>(null)
  const [creating, setCreating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null)

  if (!tournament)
    return <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center text-dark-muted">Select or create a tournament first.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-dark-muted">{teams.length} team(s) · 4–32 supported</p>
        <button onClick={() => setCreating(true)} className="flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2 text-sm font-bold text-black">
          <Plus className="h-4 w-4" /> Add Team
        </button>
      </div>

      {teams.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center text-dark-muted">No teams yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <div key={t.id} className="glow-card flex items-center gap-3 p-3">
              <TeamBadge name={t.name} logo={t.logo} color={t.color} size="md" />
              <span className="min-w-0 flex-1 truncate font-semibold text-white">{t.name}</span>
              <button onClick={() => setEditing(t)} className="rounded-md p-2 text-dark-muted hover:text-white">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => setConfirmDelete(t)} className="rounded-md p-2 text-brand-secondary">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <TeamForm
          tournamentId={tournament.id}
          team={editing}
          onClose={() => {
            setCreating(false)
            setEditing(null)
          }}
          run={run}
        />
      )}
      {confirmDelete && (
        <Modal title="Delete team?" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-dark-muted">
            Delete <strong className="text-white">{confirmDelete.name}</strong>? Regenerate fixtures afterwards.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-dark-border px-4 py-2 text-sm text-white">
              Cancel
            </button>
            <button
              onClick={async () => {
                const ok = await run(deleteTeam(confirmDelete.id), 'Team deleted')
                if (ok) setConfirmDelete(null)
              }}
              className="rounded-lg bg-brand-secondary px-4 py-2 text-sm font-bold text-white"
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function TeamForm({ tournamentId, team, onClose, run }: { tournamentId: string; team: Team | null; onClose: () => void; run: RunFn }) {
  const { register, handleSubmit, watch, setValue, formState } = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: team?.name ?? '',
      logo: team?.logo ?? '',
      color: team?.color ?? GRADIENTS[0],
    },
  })
  const color = watch('color')
  const name = watch('name')

  const onSubmit = handleSubmit(async (values) => {
    const ok = team
      ? await run(updateTeam(team.id, values), 'Team updated')
      : await run(createTeam(tournamentId, values), 'Team added')
    if (ok) onClose()
  })

  return (
    <Modal title={team ? 'Edit Team' : 'Add Team'} onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex justify-center">
          <TeamBadge name={name || 'New Team'} color={color} size="xl" />
        </div>
        <div>
          <label className={labelCls}>Full Team Name</label>
          <input {...register('name')} className={inputCls} placeholder="Fathin FC" />
          <FieldError msg={formState.errors.name?.message} />
        </div>
        <div>
          <label className={labelCls}>Logo URL (optional)</label>
          <input {...register('logo')} className={inputCls} placeholder="https://…/logo.png" />
          <FieldError msg={formState.errors.logo?.message} />
        </div>
        <div>
          <label className={labelCls}>Badge Gradient</label>
          <div className="flex flex-wrap gap-2">
            {GRADIENTS.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setValue('color', g)}
                className={`h-9 w-9 rounded-lg bg-gradient-to-br ${g} ${color === g ? 'ring-2 ring-white' : ''}`}
                aria-label={g}
              />
            ))}
          </div>
        </div>
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 font-bold text-black disabled:opacity-60"
        >
          {formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {team ? 'Save' : 'Add team'}
        </button>
      </form>
    </Modal>
  )
}

// ─── Fixtures tab ─────────────────────────────────────────────────────────────
function FixturesTab({
  tournament, teams, matches, run,
}: {
  tournament: Tournament | null
  teams: Team[]
  matches: MatchWithTeams[]
  run: RunFn
}) {
  const [editing, setEditing] = useState<MatchWithTeams | null>(null)
  const [confirmGen, setConfirmGen] = useState(false)

  if (!tournament)
    return <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center text-dark-muted">Select a tournament first.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-dark-muted">{matches.length} match(es)</p>
        <button
          onClick={() => setConfirmGen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-black"
        >
          <RefreshCw className="h-4 w-4" /> {matches.length ? 'Regenerate' : 'Generate'} Fixtures
        </button>
      </div>

      {matches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center text-dark-muted">
          No fixtures. Add at least 2 teams, then generate.
        </p>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <div key={m.id} className="glow-card flex flex-wrap items-center gap-3 p-3">
              <span className="w-28 shrink-0 text-xxs font-bold uppercase tracking-wider text-dark-muted">
                {m.round_label}
              </span>
              <div className="flex flex-1 items-center justify-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-right text-white">{m.home_team?.name ?? 'TBD'}</span>
                {m.is_bye ? <span className="text-xxs text-amber-400">BYE</span> : <span className="text-dark-muted">vs</span>}
                <span className="min-w-0 flex-1 truncate text-white">{m.away_team?.name ?? 'TBD'}</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => run(swapFixtureTeams(m.id), 'Teams swapped')}
                  className="rounded-md p-2 text-dark-muted hover:text-white"
                  title="Swap home/away"
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </button>
                <button onClick={() => setEditing(m)} className="rounded-md p-2 text-dark-muted hover:text-white" title="Edit fixture">
                  <Pencil className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <FixtureForm match={editing} teams={teams} onClose={() => setEditing(null)} run={run} />}

      {confirmGen && (
        <Modal title="Generate fixtures?" onClose={() => setConfirmGen(false)}>
          <p className="text-sm text-dark-muted">
            This {matches.length ? 'replaces all existing fixtures, results and standings' : 'creates the fixtures'} for{' '}
            <strong className="text-white">{tournament.name}</strong> ({FORMAT_LABEL[tournament.format]}, {teams.length} teams).
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={() => setConfirmGen(false)} className="rounded-lg border border-dark-border px-4 py-2 text-sm text-white">
              Cancel
            </button>
            <button
              onClick={async () => {
                const ok = await run(regenerateFixtures(tournament.id), 'Fixtures generated')
                if (ok) setConfirmGen(false)
              }}
              className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-bold text-black"
            >
              Generate
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FixtureForm({ match, teams, onClose, run }: { match: MatchWithTeams; teams: Team[]; onClose: () => void; run: RunFn }) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(fixtureEditSchema),
    defaultValues: {
      home_team_id: match.home_team_id ?? '',
      away_team_id: match.away_team_id ?? '',
      round_label: match.round_label ?? '',
      round_number: match.round_number,
      scheduled_at: toLocalInput(match.scheduled_at),
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      home_team_id: values.home_team_id || null,
      away_team_id: values.away_team_id || null,
      round_label: values.round_label,
      round_number: values.round_number,
      scheduled_at: fromLocalInput(typeof values.scheduled_at === 'string' ? values.scheduled_at : ''),
    }
    const ok = await run(updateFixture(match.id, payload), 'Fixture updated')
    if (ok) onClose()
  })

  return (
    <Modal title="Edit Fixture" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className={labelCls}>Team A (home)</label>
          <select {...register('home_team_id')} className={inputCls}>
            <option value="">— TBD —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Team B (away)</label>
          <select {...register('away_team_id')} className={inputCls}>
            <option value="">— TBD —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <FieldError msg={formState.errors.away_team_id?.message} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Round Label</label>
            <input {...register('round_label')} className={inputCls} />
            <FieldError msg={formState.errors.round_label?.message} />
          </div>
          <div>
            <label className={labelCls}>Round #</label>
            <input type="number" {...register('round_number')} className={inputCls} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Date & Time</label>
          <input type="datetime-local" {...register('scheduled_at')} className={inputCls} />
        </div>
        <button
          type="submit"
          disabled={formState.isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 font-bold text-black disabled:opacity-60"
        >
          {formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Save fixture
        </button>
      </form>
    </Modal>
  )
}

// ─── Results tab ─────────────────────────────────────────────────────────────
function ResultsTab({ tournament, matches, run }: { tournament: Tournament | null; matches: MatchWithTeams[]; run: RunFn }) {
  const [editing, setEditing] = useState<MatchWithTeams | null>(null)

  if (!tournament)
    return <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center text-dark-muted">Select a tournament first.</p>

  const playable = matches.filter((m) => !m.is_bye && m.home_team_id && m.away_team_id)

  return (
    <div className="space-y-4">
      {playable.length === 0 ? (
        <p className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-10 text-center text-dark-muted">
          No playable matches yet. Generate fixtures first.
        </p>
      ) : (
        <div className="space-y-2">
          {playable.map((m) => {
            const decided = m.status === 'completed' || m.status === 'walkover'
            return (
              <div key={m.id} className="glow-card flex flex-wrap items-center gap-3 p-3">
                <span className="w-24 shrink-0 text-xxs font-bold uppercase tracking-wider text-dark-muted">{m.round_label}</span>
                <div className="flex flex-1 items-center justify-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-right text-white">{m.home_team?.name}</span>
                  <span className="rounded bg-black/50 px-2 py-0.5 font-black text-white tabular-nums">
                    {decided ? `${m.home_score ?? 0}–${m.away_score ?? 0}` : 'vs'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-white">{m.away_team?.name}</span>
                </div>
                {m.status === 'walkover' && <Flag className="h-4 w-4 text-amber-400" />}
                <button
                  onClick={() => setEditing(m)}
                  className="rounded-lg border border-dark-border px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {decided ? 'Edit' : 'Enter'} result
                </button>
              </div>
            )
          })}
        </div>
      )}

      {editing && <ResultForm match={editing} onClose={() => setEditing(null)} run={run} />}
    </div>
  )
}

function ResultForm({ match, onClose, run }: { match: MatchWithTeams; onClose: () => void; run: RunFn }) {
  const { register, handleSubmit, watch, formState } = useForm({
    resolver: zodResolver(resultSchema),
    defaultValues: {
      outcome: (match.is_walkover ? 'walkover' : 'result') as 'result' | 'walkover',
      home_score: match.home_score ?? 0,
      away_score: match.away_score ?? 0,
      walkover_winner: undefined as 'home' | 'away' | undefined,
    },
  })
  const outcome = watch('outcome')

  const onSubmit = handleSubmit(async (values) => {
    const ok = await run(saveResult(match.id, values), 'Result saved')
    if (ok) onClose()
  })

  return (
    <Modal title="Match Result" onClose={onClose}>
      <div className="mb-4 flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 flex-1 truncate text-right font-semibold text-white">{match.home_team?.name}</span>
        <span className="text-dark-muted">vs</span>
        <span className="min-w-0 flex-1 truncate font-semibold text-white">{match.away_team?.name}</span>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="flex gap-2">
          <label className={`flex-1 cursor-pointer rounded-lg border p-2 text-center text-sm font-semibold ${outcome === 'result' ? 'border-brand-primary text-brand-primary' : 'border-dark-border text-dark-muted'}`}>
            <input type="radio" value="result" {...register('outcome')} className="sr-only" /> Score
          </label>
          <label className={`flex-1 cursor-pointer rounded-lg border p-2 text-center text-sm font-semibold ${outcome === 'walkover' ? 'border-amber-400 text-amber-400' : 'border-dark-border text-dark-muted'}`}>
            <input type="radio" value="walkover" {...register('outcome')} className="sr-only" /> Walkover
          </label>
        </div>

        {outcome === 'result' ? (
          <div className="flex items-center justify-center gap-3">
            <input type="number" min={0} {...register('home_score')} className={`${inputCls} w-20 text-center text-lg`} />
            <span className="text-dark-muted">–</span>
            <input type="number" min={0} {...register('away_score')} className={`${inputCls} w-20 text-center text-lg`} />
          </div>
        ) : (
          <div>
            <label className={labelCls}>Walkover winner</label>
            <div className="flex gap-2">
              <label className="flex-1 cursor-pointer rounded-lg border border-dark-border p-2 text-center text-sm text-white">
                <input type="radio" value="home" {...register('walkover_winner')} className="mr-1" />
                {match.home_team?.name}
              </label>
              <label className="flex-1 cursor-pointer rounded-lg border border-dark-border p-2 text-center text-sm text-white">
                <input type="radio" value="away" {...register('walkover_winner')} className="mr-1" />
                {match.away_team?.name}
              </label>
            </div>
            <FieldError msg={formState.errors.walkover_winner?.message} />
          </div>
        )}

        <div className="flex gap-2">
          {(match.status === 'completed' || match.status === 'walkover') && (
            <button
              type="button"
              onClick={async () => {
                const ok = await run(clearResult(match.id), 'Result cleared')
                if (ok) onClose()
              }}
              className="rounded-lg border border-dark-border px-4 py-2.5 text-sm font-semibold text-brand-secondary"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-brand-primary py-2.5 font-bold text-black disabled:opacity-60"
          >
            {formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Save result
          </button>
        </div>
      </form>
    </Modal>
  )
}
