import { z } from 'zod'

// Shared between React Hook Form (client) and server actions (server),
// so the same rules validate on both sides.

export const FORMATS = ['knockout', 'league', 'league_playoffs'] as const

// These helpers are IDEMPOTENT: they accept a string, '', null, or undefined
// and always normalize empty values to null. This matters because the same
// schema validates on the client (React Hook Form) and again on the server
// (server action) — so the schema must accept its own transformed output.
const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional().transform((v) => v || null)

const optionalUrl = z
  .union([z.string().trim().url('Logo must be a valid URL').max(500), z.literal(''), z.null()])
  .optional()
  .transform((v) => v || null)

const optionalDate = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))

export const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
})
export type LoginInput = z.infer<typeof loginSchema>

export const tournamentSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    description: optionalText(2000),
    format: z.enum(FORMATS),
    champion_prize: optionalText(200),
    start_date: optionalDate,
    end_date: optionalDate,
  })
  .refine(
    (d) => !d.start_date || !d.end_date || d.start_date <= d.end_date,
    { message: 'End date cannot be before start date', path: ['end_date'] }
  )
export type TournamentInput = z.infer<typeof tournamentSchema>

// Full team names only — reject obvious 2–4 letter all-caps abbreviations
// (FCB, RMA, LIV, MCI...) per the spec.
const ABBREV = /^[A-Z]{2,4}$/
export const teamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80)
    .refine((n) => !ABBREV.test(n), 'Use the full team name, not an abbreviation'),
  logo: optionalUrl,
  color: optionalText(120),
})
export type TeamInput = z.infer<typeof teamSchema>

export const scheduleSchema = z.object({
  scheduled_at: z.string().min(1, 'Pick a date and time'),
})
export type ScheduleInput = z.infer<typeof scheduleSchema>

const teamIdOrEmpty = z
  .union([z.literal(''), z.string().uuid()])
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))

export const fixtureEditSchema = z
  .object({
    home_team_id: teamIdOrEmpty,
    away_team_id: teamIdOrEmpty,
    round_label: z.string().trim().min(1, 'Round label is required').max(60),
    round_number: z.coerce.number().int().min(1).max(99),
    scheduled_at: z.string().nullable().optional().transform((v) => v || null),
  })
  .refine(
    (d) => !d.home_team_id || !d.away_team_id || d.home_team_id !== d.away_team_id,
    { message: 'A team cannot play itself', path: ['away_team_id'] }
  )
export type FixtureEditInput = z.infer<typeof fixtureEditSchema>

export const resultSchema = z
  .object({
    outcome: z.enum(['result', 'walkover']),
    home_score: z.coerce.number().int().min(0).max(99),
    away_score: z.coerce.number().int().min(0).max(99),
    // which side won by walkover, when outcome === 'walkover'
    walkover_winner: z.enum(['home', 'away']).optional(),
  })
  .refine((d) => d.outcome !== 'walkover' || !!d.walkover_winner, {
    message: 'Select which team advances by walkover',
    path: ['walkover_winner'],
  })
export type ResultInput = z.infer<typeof resultSchema>

export const createTournamentTeamsSchema = z.object({
  playoff_teams: z.coerce.number().int().min(2).max(16).optional(),
})

export const gallerySchema = z.object({
  title: optionalText(120),
})
export type GalleryInput = z.infer<typeof gallerySchema>

// File names allowed for upload — keep extension whitelist in sync with the bucket.
export const ALLOWED_IMAGE_EXT = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const
