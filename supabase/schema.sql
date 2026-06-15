-- ============================================================================
-- eFootball Appifylab — Supabase schema (single source of truth)
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste this whole file → Run.
--   It is idempotent: safe to run again after edits.
--
-- SECURITY MODEL
--   Public (anon key) can READ every table. Nobody can WRITE with the anon key.
--   All writes go through Next.js server actions using the service-role key,
--   which bypasses RLS and is gated by the admin password. See README.md.
-- ============================================================================

-- gen_random_uuid() lives in pgcrypto (preinstalled on Supabase).
create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- updated_at helper
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ----------------------------------------------------------------------------
-- 1. tournaments
-- ----------------------------------------------------------------------------
create table if not exists public.tournaments (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  description    text,
  format         text not null check (format in ('knockout', 'league', 'league_playoffs')),
  champion_prize text,
  start_date     date,
  end_date       date,
  is_active      boolean not null default false,
  -- lifecycle: draft → ongoing → completed (drives the champion experience)
  status         text not null default 'draft' check (status in ('draft', 'ongoing', 'completed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- At most ONE active tournament at a time (spec: only one tournament can be active).
create unique index if not exists uniq_one_active_tournament
  on public.tournaments (is_active)
  where is_active = true;

drop trigger if exists trg_tournaments_updated_at on public.tournaments;
create trigger trg_tournaments_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2. teams  (full team names only — no abbreviations)
-- ----------------------------------------------------------------------------
create table if not exists public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  logo          text,                       -- optional image URL; badge falls back to initials
  color         text default 'from-lime-400 to-emerald-500', -- gradient for the esports badge
  created_at    timestamptz not null default now()
);

create index if not exists idx_teams_tournament_id on public.teams(tournament_id);
-- A team name is unique within its own tournament (not globally).
create unique index if not exists uniq_team_name_per_tournament
  on public.teams (tournament_id, lower(name));

-- ----------------------------------------------------------------------------
-- 3. matches  (fixtures + results + bracket linkage)
-- ----------------------------------------------------------------------------
create table if not exists public.matches (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  home_team_id  uuid references public.teams(id) on delete set null,
  away_team_id  uuid references public.teams(id) on delete set null,
  round_number  integer not null default 1,
  round_label   text,                       -- 'Round of 16', 'Quarterfinal', 'Final', 'Matchday 1'...
  match_number  integer not null default 0, -- order within a round (for bracket positioning)
  stage         text not null default 'league' check (stage in ('league', 'playoffs', 'knockout')),
  is_bye        boolean not null default false,
  status        text not null default 'scheduled'
                  check (status in ('scheduled', 'live', 'completed', 'walkover')),
  home_score    integer check (home_score >= 0),
  away_score    integer check (away_score >= 0),
  winner_id     uuid references public.teams(id) on delete set null,
  is_walkover   boolean not null default false,
  next_match_id uuid references public.matches(id) on delete set null,
  scheduled_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_matches_tournament_id on public.matches(tournament_id);
create index if not exists idx_matches_status        on public.matches(status);
create index if not exists idx_matches_scheduled_at  on public.matches(scheduled_at);
create index if not exists idx_matches_round         on public.matches(tournament_id, round_number, match_number);

drop trigger if exists trg_matches_updated_at on public.matches;
create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. standings  (recomputed by the result server action after every result)
-- ----------------------------------------------------------------------------
create table if not exists public.standings (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid not null references public.tournaments(id) on delete cascade,
  team_id          uuid not null references public.teams(id) on delete cascade,
  played           integer not null default 0,
  won              integer not null default 0,
  drawn            integer not null default 0,
  lost             integer not null default 0,
  goals_for        integer not null default 0,
  goals_against    integer not null default 0,
  goal_difference  integer generated always as (goals_for - goals_against) stored,
  points           integer not null default 0,
  rank             integer,
  updated_at       timestamptz not null default now(),
  unique (tournament_id, team_id)
);

create index if not exists idx_standings_tournament_id on public.standings(tournament_id);
create index if not exists idx_standings_ranking
  on public.standings(tournament_id, points desc, goal_difference desc, goals_for desc);

drop trigger if exists trg_standings_updated_at on public.standings;
create trigger trg_standings_updated_at
  before update on public.standings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Row Level Security — public read, no anon writes
-- ----------------------------------------------------------------------------
alter table public.tournaments enable row level security;
alter table public.teams       enable row level security;
alter table public.matches     enable row level security;
alter table public.standings   enable row level security;

do $$
begin
  -- tournaments
  drop policy if exists "public read tournaments" on public.tournaments;
  create policy "public read tournaments" on public.tournaments for select using (true);
  -- teams
  drop policy if exists "public read teams" on public.teams;
  create policy "public read teams" on public.teams for select using (true);
  -- matches
  drop policy if exists "public read matches" on public.matches;
  create policy "public read matches" on public.matches for select using (true);
  -- standings
  drop policy if exists "public read standings" on public.standings;
  create policy "public read standings" on public.standings for select using (true);
end $$;
-- NOTE: there are intentionally NO insert/update/delete policies.
-- The anon key therefore cannot write. Server actions use the service-role key.

-- ----------------------------------------------------------------------------
-- 6. Realtime — publish all four tables (idempotent)
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.tournaments;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.teams;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.matches;
  exception when duplicate_object then null; end;
  begin
    alter publication supabase_realtime add table public.standings;
  exception when duplicate_object then null; end;
end $$;
