import type { MatchStatus } from '@/types/database.types'

// ─── Dates ─────────────────────────────────────────────────────────────────
export function formatDate(iso: string | null): string {
  if (!iso) return 'TBD'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatTime(iso: string | null): string {
  if (!iso) return 'TBD'
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return 'To be scheduled'
  return `${formatDate(iso)} · ${formatTime(iso)}`
}

// ─── Match status (public-facing labels) ────────────────────────────────────
export const PUBLIC_STATUS: Record<MatchStatus, string> = {
  scheduled: 'Upcoming',
  live: 'Live',
  completed: 'Completed',
  walkover: 'Walkover',
}

export function statusLabel(status: MatchStatus): string {
  return PUBLIC_STATUS[status] ?? 'Upcoming'
}

export function statusClasses(status: MatchStatus): string {
  switch (status) {
    case 'live':
      return 'text-brand-secondary bg-brand-secondary/15 border-brand-secondary/30'
    case 'completed':
      return 'text-brand-primary bg-brand-primary/10 border-brand-primary/25'
    case 'walkover':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/25'
    default:
      return 'text-brand-accent bg-brand-accent/10 border-brand-accent/25'
  }
}

// ─── Round ordering for bracket / fixtures ───────────────────────────────────
export function knockoutRoundRank(label: string | null): number {
  if (!label) return 0
  const l = label.toLowerCase()
  if (l.includes('playoff final') || l === 'final') return 100
  if (l.includes('semi')) return 90
  if (l.includes('quarter')) return 80
  const roundOf = l.match(/round of (\d+)/)
  if (roundOf) return 80 - Number(roundOf[1]) // R16 (64) < QF (80)
  const matchday = l.match(/matchday (\d+)/)
  if (matchday) return Number(matchday[1])
  return 50
}

export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
