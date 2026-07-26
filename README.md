# flikpik 🎬

**Stop arguing. Start watching.** flikpik is a group movie-decision app. Every
member keeps a personal *Want to Watch* list; when it's movie night, a group
leader starts a decision session, everyone swipes Yay/Nay on the combined pool,
and the first movie to a majority wins.

This is a ground-up rewrite of
[nickdidio/Web-Programming-2021S](https://github.com/nickdidio/Web-Programming-2021S)
(Express/Handlebars/MongoDB) rebuilt in **Next.js 15** with a modern UI,
real-time sessions, and a relational database.

## Guest mode (sign-up is optional)

You don't need an account to try flikpik. **"Browse without an account"** on the
landing page (or any Watch List / Search link) drops you into a local-only
experience: search TMDB, build a watch list, and mark things watched — all
stored in your browser (`localStorage`), never the database. Account-only
features (groups, movie-night sessions, and shared reviews) prompt a free
sign-up. Middleware gates the account-only routes; the watch list and search
render for everyone.

## List packs — trending + pre-built movie sets

Beyond the evergreen file-based lists, flikpik has **DB-backed "packs"** that refresh
themselves and jump straight into a session:

- **Sources** — TMDB is the backbone (`/trending/movie/week`, `/movie/now_playing`,
  `/movie/popular`, all free). A **Google Trends** signal ("Trending in Search") comes
  from Google's free public **RSS feed**, parsed in `src/lib/google-trends.ts` — *not*
  the Trends API (alpha/allowlisted). Google blocks datacenter IPs intermittently, so
  it's **best-effort**: any failure returns `{ degraded: true }` and the pack falls back
  to TMDB trending, never empty.
- **Model** — `list_packs` / `list_pack_items` / `list_pack_history`. Items snapshot
  `title`/`poster`/`release`, so pages render straight from Postgres (no live TMDB call).
  Packs are declared in code (`PACK_REGISTRY` in `src/lib/packs.ts`) and populated by the
  refresh job.
- **Refresh** — Neon `pg_cron` can't make HTTP calls, so the scheduler is external:
  **Vercel Cron** (`vercel.json`) hits `POST /api/cron/refresh-packs` weekly (guarded by
  `CRON_SECRET`), which fetches and upserts into Neon. A **GitHub Actions** workflow
  (`.github/workflows/refresh-packs.yml`) is the portable fallback. First run / local:
  start the app, then `npm run packs:refresh`.
- **Surfaces** — packs appear on `/lists` (with a "Refreshed weekly · N new" badge), each
  at `/lists/[slug]`, and as one-tap **launch tiles** on `/rooms/new` that seed a room
  with the pack. Launch snapshots the movies into the room, so a later refresh never
  mutates a session already in progress.

## Anonymous rooms (no account on either side)

You don't need an account to *run* a movie night either. **"Start a movie night"**
(`/rooms/new`, or the nav) spins up an ephemeral room: you get a short join code,
share it, and everyone swipes — the first movie to a majority wins. Identity is
scoped to the room, not the world:

- **Join code** — short, human-transcribable, unique among *live* rooms (reuses the
  no-ambiguous-glyph `generateInviteCode`).
- **Host token** — 128-bit, minted at creation, stored in the browser. Holding it
  *is* host authority (no account). A `#host=…` link lets a host recover control.
- **Participant token** — issued on join, stored client-side, so refresh-and-reconnect
  rehydrates the same seat.

Room state is ephemeral rows in Postgres with a TTL (`rooms`, `room_participants`,
`room_movies`, `room_votes`) — nothing durable, nothing to GDPR-delete. Realtime uses
the same SSE-poll pattern as account sessions. Mitigations are behavioral: per-IP join
rate-limit, room lock on start, aggressive expiry, a room-size cap, and host kick. The
pool is host-curated (search + add in-room) and participants may contribute their local
list. See `src/lib/rooms.ts` and `src/app/rooms/`.

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) · React 19 · TypeScript |
| Database | Neon PostgreSQL · Drizzle ORM |
| Auth | next-auth (JWT strategy) · bcrypt (cost 12) |
| Movie data | TMDB API (server-only bearer token) |
| Real-time | Server-Sent Events with a 2s polling fallback |
| Styling | Tailwind CSS v4 · flikpik design system (cinematic, base44-derived) |

## Getting started

### 1. Install

```bash
npm install
```

### 2. Environment

Copy the example env file and fill in real values:

```bash
cp .env.example .env.local
```

- **`DATABASE_URL`** — create a project at [console.neon.tech](https://console.neon.tech)
  and copy the pooled connection string (must include `?sslmode=require`).
- **`TMDB_ACCESS_TOKEN`** — the v4 *API Read Access Token* from
  [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api).
  This is server-only and never reaches the browser.
- **`NEXTAUTH_SECRET`** — `openssl rand -base64 32`.
- **`NEXTAUTH_URL`** — `http://localhost:3000` in development.

### 3. Database migrations

```bash
npm run db:generate   # generate SQL from src/db/schema.ts
npm run db:migrate    # apply to your Neon database
# or, for quick local iteration:
npm run db:push
```

### 4. Seed (optional)

Creates 4 test users (alice/bob/carol/dave — all `password123`), 10 popular
movies, overlapping watch lists, one group, and sample reviews:

```bash
npm run seed
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in as **alice /
password123** if you seeded.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema directly (dev) |
| `npm run db:studio` | Drizzle Studio |
| `npm run seed` | Seed test data |

## Project structure

```
src/
├── app/
│   ├── (authenticated)/        # route group — layout enforces auth
│   │   ├── watchlist/          # want-to-watch + watched
│   │   ├── movies/{search,[id]}
│   │   ├── groups/[id]/session # lobby → swiping → result
│   │   └── profile/
│   ├── login/ · signup/ · page.tsx (landing)
│   └── api/                    # auth, movies, watchlist, reviews, groups, session
├── components/{ui,movies,groups,layout,providers}
├── db/            # schema.ts, index.ts (Drizzle+Neon), seed.ts, migrations/
├── lib/           # tmdb, auth, session, groups, queries, validation, utils
└── styles/tokens.ts
```

## How the decision session works

1. **Leader starts** a session and picks MPAA rating filters.
2. **Pool is built** from every member's *want to watch* list, excluding
   anything any member has already watched, filtered by rating. Needs ≥ 2 movies.
3. **Threshold** = `floor(members / 2) + 1` (simple majority).
4. **Lobby** — members mark ready (or the leader force-starts).
5. **Swiping** — one card at a time; Yay/Nay buttons or touch swipe.
6. **Real-time tally** — each Yay bumps the movie's count; the first to cross
   the threshold wins. Updates stream over SSE (2s polling fallback).
7. **Winner** — confetti reveal; the movie moves to every member's watched list.
8. **No consensus** — if everyone finishes with no winner, the top-voted movie
   is shown and the leader can try again.

## Security notes

- The TMDB token lives only in `src/lib/tmdb.ts` (`server-only`); the client
  calls `/api/movies/*`, never TMDB directly.
- Passwords are hashed with bcrypt (cost 12).
- All API inputs are validated with Zod; Drizzle parameterizes every query.
- API routes are rate-limited (10 req/s per user) and auth-guarded via
  `middleware.ts` + per-route checks.
