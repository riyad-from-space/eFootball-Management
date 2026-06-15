import { initials } from '@/lib/display'

type Size = 'sm' | 'md' | 'lg' | 'xl'

const SIZES: Record<Size, { box: string; text: string; img: number }> = {
  sm: { box: 'h-8 w-8', text: 'text-xs', img: 32 },
  md: { box: 'h-11 w-11', text: 'text-sm', img: 44 },
  lg: { box: 'h-16 w-16', text: 'text-xl', img: 64 },
  xl: { box: 'h-24 w-24', text: 'text-3xl', img: 96 },
}

const DEFAULT_GRADIENT = 'from-lime-400 to-emerald-500'

export interface TeamBadgeProps {
  name: string | null
  logo?: string | null
  color?: string | null
  size?: Size
  className?: string
}

/**
 * Reusable esports-style team badge. Renders the logo image when a URL is set,
 * otherwise a gradient crest with the team's monogram. Consistent, rounded,
 * gradient-backed. Falls back to a neutral "TBD" badge when there is no team.
 */
export default function TeamBadge({ name, logo, color, size = 'md', className = '' }: TeamBadgeProps) {
  const s = SIZES[size]
  const gradient = color && color.startsWith('from-') ? color : DEFAULT_GRADIENT

  if (!name) {
    return (
      <div
        className={`${s.box} ${className} shrink-0 rounded-xl border border-dark-border bg-dark-card flex items-center justify-center text-dark-muted font-bold ${s.text}`}
        aria-label="To be decided"
      >
        ?
      </div>
    )
  }

  const isUrl = !!logo && /^https?:\/\//.test(logo)

  return (
    <div
      className={`${s.box} ${className} shrink-0 rounded-xl overflow-hidden border border-white/10 shadow-lg flex items-center justify-center bg-gradient-to-br ${gradient}`}
      title={name}
      aria-label={name}
    >
      {isUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logo!} alt={name} width={s.img} height={s.img} className="h-full w-full object-cover" />
      ) : logo ? (
        <span className={`${s.text} leading-none`}>{logo}</span>
      ) : (
        <span className={`${s.text} font-black tracking-tight text-black/85 drop-shadow`}>{initials(name)}</span>
      )}
    </div>
  )
}
