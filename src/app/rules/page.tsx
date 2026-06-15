import React from 'react'
import {
  BookOpen,
  Shield,
  WifiOff,
  Camera,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Zap,
  Info,
} from 'lucide-react'

export const metadata = {
  title: 'Rules | eFootball Appifylab',
  description:
    'Official tournament rules on eFootball Appifylab — match settings, squad regulations, disconnect rules, and fair play policy.',
}

// ─── Rule data ────────────────────────────────────────────────────────────────

const RULE_SECTIONS = [
  {
    id: 'match',
    title: 'Match Settings',
    icon: Clock,
    accent: 'text-brand-primary border-brand-primary/30 bg-brand-primary/5',
    iconBg: 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary',
    rules: [
      { text: 'Match Duration: 10 minutes per match', highlight: true },
      { text: 'Game Speed: Normal' },
      { text: 'Condition (Home/Away): Excellent (Green Arrow)' },
      { text: 'Injuries: Off' },
      { text: 'Extra Time: On (in knockout stages)' },
      { text: 'Penalty Shootout: On (in knockout stages)' },
      { text: 'Max substitutions: 5 players (in 3 stoppage windows)' },
    ],
  },
  {
    id: 'squad',
    title: 'Squad Rules',
    icon: Users,
    accent: 'text-brand-accent border-brand-accent/30 bg-brand-accent/5',
    iconBg: 'bg-brand-accent/10 border-brand-accent/20 text-brand-accent',
    rules: [
      { text: 'Only Dream Teams are allowed in this tournament.', highlight: true },
      { text: 'Team cannot be changed after the tournament starts.', highlight: true },
      { text: 'Epic, Big Time, and Show Time players are restricted to a maximum of 3 in the starting XI.' },
      { text: 'No duplicate players allowed in the squad.' },
      { text: 'Max squad strength: 3100 or below.' },
    ],
  },
  {
    id: 'disconnect',
    title: 'Disconnect Rules',
    icon: WifiOff,
    accent: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5',
    iconBg: 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400',
    rules: [
      { text: 'Within the first 10 minutes: match must be restarted.', highlight: true },
      { text: 'After 40 minutes: player leading by 2 or more goals wins the match.', highlight: true },
      { text: 'During the second half: player with more goals at the time of disconnect wins.' },
      { text: '3 disconnects by the same player may result in a forfeit at admin discretion.' },
      { text: 'Players must ensure a stable connection (minimum 3 bars in matchmaking).' },
      { text: 'Intentional disconnects (rage quits) result in an immediate 3-0 forfeit.' },
    ],
  },
  {
    id: 'screenshot',
    title: 'Screenshots & Proof',
    icon: Camera,
    accent: 'text-purple-400 border-purple-400/30 bg-purple-400/5',
    iconBg: 'bg-purple-400/10 border-purple-400/20 text-purple-400',
    rules: [
      { text: 'Winner must submit a screenshot of the final score.', highlight: true },
      { text: 'Failure to provide proof may lead to a rematch.' },
      { text: 'Screenshots must be uploaded to the admin panel immediately after the match.' },
      { text: 'Any form of tampering with screenshots is a permanent ban offence.' },
    ],
  },
  {
    id: 'scheduling',
    title: 'Scheduling & Deadlines',
    icon: Calendar,
    accent: 'text-brand-secondary border-brand-secondary/30 bg-brand-secondary/5',
    iconBg: 'bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary',
    rules: [
      { text: 'Match must start before 12:30 AM (midnight deadline).', highlight: true },
      { text: 'Players are responsible for arranging matches themselves.' },
      { text: 'Delaying a match without notice may result in a forfeit.' },
      { text: 'If both players fail to arrange the match, the result may be recorded as a draw.' },
      { text: 'All match arrangements must be confirmed via the group chat or admin.' },
    ],
  },
  {
    id: 'fairplay',
    title: 'Fair Play',
    icon: Shield,
    accent: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/5',
    iconBg: 'bg-emerald-400/10 border-emerald-400/20 text-emerald-400',
    rules: [
      { text: 'Any form of network tampering (lag switching) is strictly prohibited — permanent ban.' },
      { text: 'Time-wasting (passing in own half for more than 3 in-game minutes) is reportable.' },
      { text: 'All disputes must be supported by video or screenshot evidence.' },
      { text: 'Admin decisions are final. Arguing with admins may result in a warning or ban.' },
    ],
  },
]

// ─── Rule item ────────────────────────────────────────────────────────────────

function RuleItem({ text, highlight }: { text: string; highlight?: boolean }) {
  return (
    <li className="flex items-start gap-3">
      {highlight ? (
        <CheckCircle2 className="h-4 w-4 text-brand-primary mt-0.5 shrink-0" />
      ) : (
        <span className="h-1.5 w-1.5 rounded-full bg-dark-muted/60 mt-2 shrink-0" />
      )}
      <span
        className={`text-sm leading-relaxed ${
          highlight ? 'text-white font-semibold' : 'text-slate-400'
        }`}
      >
        {text}
      </span>
    </li>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RulesPage() {
  return (
    <div className="space-y-8 animate-fadeIn">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-dark-border bg-dark-card p-6 md:p-10">
        <div className="absolute top-0 right-0 w-72 h-72 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-brand-accent/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-brand-primary text-xxs font-black uppercase tracking-[0.25em]">
            <Zap className="h-3.5 w-3.5" />
            Official Regulations
          </div>
          <h1 className="text-3xl md:text-5xl font-black uppercase text-white tracking-tight">
            Tournament{' '}
            <span className="text-brand-primary glow-text">Rules</span>
          </h1>
          <p className="text-dark-muted text-sm md:text-base">
            Read and follow all rules carefully. Violations may result in forfeit, penalty, or
            permanent ban from the tournament.
          </p>
        </div>

        {/* Quick rule pills */}
        <div className="relative mt-6 flex flex-wrap gap-3">
          {[
            { icon: Clock, label: '10 Min Matches' },
            { icon: Users, label: 'Dream Teams Only' },
            { icon: Calendar, label: 'Start Before 12:30 AM' },
            { icon: Camera, label: 'Screenshots Required' },
          ].map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-dark-border bg-black/40 text-xs font-bold text-dark-muted"
            >
              <Icon className="h-3.5 w-3.5 text-brand-primary" />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Rule sections ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {RULE_SECTIONS.map((section, idx) => {
          const Icon = section.icon
          return (
            <div
              key={section.id}
              className={`relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:-translate-y-0.5 ${section.accent}`}
            >
              {/* Section number watermark */}
              <span className="absolute top-3 right-4 text-5xl font-black opacity-5 select-none text-white">
                {String(idx + 1).padStart(2, '0')}
              </span>

              {/* Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`p-2.5 rounded-xl border ${section.iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  {section.title}
                </h2>
              </div>

              {/* Rules */}
              <ul className="space-y-3">
                {section.rules.map((rule, i) => (
                  <RuleItem key={i} text={rule.text} highlight={rule.highlight} />
                ))}
              </ul>

              {/* Section footer */}
              <div className="mt-5 pt-4 border-t border-white/5">
                <span className="text-xxs font-black uppercase tracking-widest text-dark-muted/50">
                  Section {idx + 1}.0
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Important Notice ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-5 flex gap-4">
        <div className="shrink-0 p-2.5 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary h-fit">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-black text-white uppercase tracking-wide">
            Important Notice
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Rules are subject to change before the tournament starts. All participants will be
            notified of any updates. Matches must be played on the latest version of the eFootball
            client. Admin decisions are <strong className="text-white">final and binding</strong>.
          </p>
        </div>
      </div>

      {/* ── Quick Reference Card ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-dark-border bg-dark-card overflow-hidden">
        <div className="px-5 py-3 border-b border-dark-border bg-black/20 flex items-center gap-2">
          <Info className="h-4 w-4 text-brand-accent" />
          <h3 className="text-xs font-black text-white uppercase tracking-widest">
            Quick Reference
          </h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 divide-x divide-y divide-dark-border/40">
          {[
            { label: 'Match Length', value: '10 min', color: 'text-brand-primary' },
            { label: 'Squad Type', value: 'Dream Team', color: 'text-brand-accent' },
            { label: 'Deadline', value: '12:30 AM', color: 'text-brand-secondary' },
            { label: 'Max Strength', value: '3100', color: 'text-yellow-400' },
            { label: 'Epic Players', value: 'Max 3', color: 'text-purple-400' },
            { label: 'Disconnects', value: 'Max 3', color: 'text-red-400' },
            { label: 'Proof', value: 'Screenshot', color: 'text-emerald-400' },
            { label: 'Squad Lock', value: 'On Start', color: 'text-brand-primary' },
          ].map(({ label, value, color }) => (
            <div key={label} className="p-4 flex flex-col gap-1">
              <span className={`text-base font-black ${color}`}>{value}</span>
              <span className="text-xxs text-dark-muted font-bold uppercase tracking-wider">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
