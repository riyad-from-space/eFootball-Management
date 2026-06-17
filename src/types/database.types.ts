// Database types — kept in sync by hand with supabase/schema.sql.
// (Regenerate with `npx supabase gen types typescript` if you wire up the CLI.)

export type TournamentFormat = 'knockout' | 'league' | 'league_playoffs'
export type TournamentStatus = 'draft' | 'ongoing' | 'completed'
export type MatchStage = 'league' | 'playoffs' | 'knockout'
export type MatchStatus = 'scheduled' | 'live' | 'completed' | 'walkover'

export interface Database {
  public: {
    Tables: {
      tournaments: {
        Row: {
          id: string
          name: string
          description: string | null
          format: TournamentFormat
          champion_prize: string | null
          start_date: string | null
          end_date: string | null
          is_active: boolean
          status: TournamentStatus
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          format: TournamentFormat
          champion_prize?: string | null
          start_date?: string | null
          end_date?: string | null
          is_active?: boolean
          status?: TournamentStatus
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['tournaments']['Insert']>
        Relationships: []
      }
      teams: {
        Row: {
          id: string
          tournament_id: string
          name: string
          logo: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          name: string
          logo?: string | null
          color?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          home_team_id: string | null
          away_team_id: string | null
          round_number: number
          round_label: string | null
          match_number: number
          stage: MatchStage
          is_bye: boolean
          status: MatchStatus
          home_score: number | null
          away_score: number | null
          winner_id: string | null
          is_walkover: boolean
          next_match_id: string | null
          scheduled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          home_team_id?: string | null
          away_team_id?: string | null
          round_number?: number
          round_label?: string | null
          match_number?: number
          stage?: MatchStage
          is_bye?: boolean
          status?: MatchStatus
          home_score?: number | null
          away_score?: number | null
          winner_id?: string | null
          is_walkover?: boolean
          next_match_id?: string | null
          scheduled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['matches']['Insert']>
        Relationships: []
      }
      standings: {
        Row: {
          id: string
          tournament_id: string
          team_id: string
          played: number
          won: number
          drawn: number
          lost: number
          goals_for: number
          goals_against: number
          goal_difference: number
          points: number
          rank: number | null
          updated_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          team_id: string
          played?: number
          won?: number
          drawn?: number
          lost?: number
          goals_for?: number
          goals_against?: number
          points?: number
          rank?: number | null
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['standings']['Insert']>
        Relationships: []
      }
      gallery_images: {
        Row: {
          id: string
          tournament_id: string
          title: string | null
          image_url: string
          storage_path: string | null
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          tournament_id: string
          title?: string | null
          image_url: string
          storage_path?: string | null
          position?: number
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['gallery_images']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row aliases used across the app.
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
export type Standing = Database['public']['Tables']['standings']['Row']
export type GalleryImage = Database['public']['Tables']['gallery_images']['Row']

// A match joined with its team rows, as the UI consumes it.
export interface MatchWithTeams extends Match {
  home_team: Team | null
  away_team: Team | null
}

// A standings row joined with its team.
export interface StandingWithTeam extends Standing {
  team: Team | null
}
