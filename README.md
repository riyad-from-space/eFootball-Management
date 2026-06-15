# eFootball Appifylab

A production-ready tournament management platform for hosting eFootball tournaments.
Create and manage multiple tournaments from a single admin dashboard; the public site
always shows the **one active tournament** with live fixtures, results, standings, a
knockout bracket, and a champion celebration.

- **Framework:** Next.js (App Router) + TypeScript
- **Styling:** Tailwind CSS (dark, neon esports theme, mobile-first)
- **Data + Realtime:** Supabase (PostgreSQL + Realtime)
- **Forms/validation:** React Hook Form + Zod
- **Hosting:** Vercel (free) + Supabase (free)

All data comes from Supabase. There is **no** demo/simulation/localStorage mode — if
Supabase is not configured the site shows a clear configuration error.

---

## What database & hosting to use

This stack is fixed and a great fit for this project — both have free tiers that
comfortably cover a community tournament:

| Concern        | Use            | Why |
| -------------- | -------------- | --- |
| Database       | **Supabase**   | Hosted PostgreSQL with built-in Realtime (live updates), row-level security, and a generous free tier. |
| Hosting        | **Vercel**     | First-class Next.js hosting, free tier, deploy straight from Git. |

You do **not** need to manage any servers. Supabase hosts the database; Vercel hosts the app.

---

## 1. Create the Supabase project

1. Go to <https://supabase.com> → sign in → **New project**.
2. Pick a name, a strong database password, and the region closest to your players.
3. Wait ~2 minutes for it to provision.

### Run the database schema

1. In the Supabase dashboard open **SQL Editor → New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy the whole file,
   paste it into the editor and click **Run**.
3. This creates the `tournaments`, `teams`, `matches` and `standings` tables (with foreign
   keys, indexes, constraints and timestamps), enables public-read row-level security,
   and turns on Realtime. It is safe to re-run.

### Get your keys

In **Project Settings → API** copy:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ server-only — never share/commit)

> Realtime is enabled by the schema. If live updates don't appear, open
> **Database → Replication → `supabase_realtime`** and confirm the four tables are included.

---

## 2. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Where it's used | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | Public read access only (RLS blocks writes) |
| `SUPABASE_SERVICE_ROLE_KEY` | server only | Lets admin server actions write data |
| `ADMIN_PASSWORD` | server only | The single admin login password |
| `SESSION_SECRET` | server only (optional) | Signs the admin session cookie |

**Security model:** the public anon key can only *read* (enforced by row-level security).
Every write goes through a Next.js server action that first checks the admin password and
then uses the service-role key. So even though the anon key ships to the browser, visitors
cannot modify any data.

---

## 3. Run locally

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Visit **/admin** and log in with `ADMIN_PASSWORD`.

### First-time setup in the admin dashboard

1. **Tournaments →** create a tournament (name, description, format, champion prize, dates).
2. **Teams →** add 4–32 teams (use full team names — e.g. "Fathin FC", not "FCB").
3. **Fixtures →** click *Generate Fixtures* (random pairing; BYEs handled automatically).
4. **Tournaments →** *Set Active* so it shows on the homepage.
5. **Results →** enter scores as matches are played. Winners advance, standings and the
   bracket update automatically, and the champion experience triggers when the final is decided.

---

## 4. Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Go to <https://vercel.com> → **Add New → Project** → import the repo.
3. In **Settings → Environment Variables** add all five variables from `.env.local`.
4. Click **Deploy**. Vercel auto-detects Next.js — no extra config needed.

Re-deploy after changing any environment variable.

---

## Pages

Public: Home, Tournament details, Fixtures, Results, Bracket, Standings, Rules, Champion.
Admin: a single password-protected dashboard at `/admin`.

## Tournament formats

- **Knockout** — single-elimination bracket, 4–32 teams, automatic BYEs and round naming
  (Round of 16/32, Quarterfinal, Semifinal, Final).
- **League** — round-robin; auto standings (P, W, D, L, GF, GA, GD, Pts).
- **League + Playoffs** — round-robin league, then the top teams advance to a playoff bracket.

## Project structure

```
src/
  app/            # public pages + /admin (dashboard) + admin/actions.ts (server actions)
  components/     # Navigation, TeamBadge, MatchCard, CountdownTimer, ConfigError, Skeleton
  lib/            # auth (signed session), validation (Zod), queries, display helpers, realtime hook
  utils/
    supabase/     # client (browser read), server (read), admin (service-role write), config
    fixtureGenerator.ts   # pure fixture generation
    resultProcessor.ts    # pure standings + bracket advancement
  types/database.types.ts # types mirroring supabase/schema.sql
supabase/schema.sql       # the single source of truth — run this in Supabase
```
