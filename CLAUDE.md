# MindRoute — CLAUDE.md

> **For data flows, file map, schema overview, image/PDF pipelines, and hard invariants, read `ARCHITECTURE.md` first.** This file covers stack and conventions only.

## What is this project

MindRoute is a full-stack travel recommendation SaaS. Users answer a 7-question profiling quiz (personality + logistics), an AI matching engine scores and ranks 16 destination profiles, and the user gets a day-by-day itinerary generated via Claude API streaming.

User journey: **Landing → Profiling → Destinations (pick 1 of 3) → Itinerary**

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Routing | wouter (client-side), Express 5 (server) |
| State/data | TanStack React Query |
| Forms | React Hook Form + Zod |
| Backend | Express 5, Node.js ESM, tsx runtime |
| AI | Anthropic SDK — destination matching + itinerary streaming |
| Database | PostgreSQL via Drizzle ORM |
| Auth | Google OAuth (Passport.js) + express-session + connect-pg-simple |
| Maps | Leaflet |
| i18n | Custom lightweight system (EN/IT) in `client/src/lib/i18n.tsx` |
| Build | Vite (frontend) + esbuild (backend), output to `dist/` |
| Deploy | Render (primary, port **5000**) |

---

## Repository layout

```
/client/src/
  pages/          — one file per route
  components/     — shared UI; ui/ = shadcn primitives
  lib/            — i18n, utils, context
/server/
  index.ts        — Express init, middleware, port 5000
  routes.ts       — all API endpoints
  matching-engine.ts — Anthropic scoring logic
  destination-catalog.ts — 16 hard-coded destination profiles
  auth.ts         — Google OAuth setup
  db.ts           — pg pool
  storage-db.ts   — DB-backed storage layer
/shared/
  schema.ts       — Drizzle table definitions + Zod schemas (single source of truth)
  routes.ts       — API route contracts (method/path/input/output)
/migrations/      — Drizzle migration files
/script/build.ts  — custom esbuild bundler
```

---

## Development commands

```bash
npm run dev       # start frontend + backend (Vite middleware on Express)
npm run build     # full production build → dist/
npm start         # run production build
npm run db:push   # apply Drizzle schema changes to DB (no migration file generated)
npm run check     # TypeScript type-check
```

---

## Required environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | express-session encryption key |
| `ANTHROPIC_API_KEY` | Claude API (matching + itinerary) |
| `GOOGLE_CLIENT_ID` | OAuth |
| `GOOGLE_CLIENT_SECRET` | OAuth |
| `GOOGLE_CALLBACK_URL` | e.g. `http://localhost:5000/auth/google/callback` |
| `UNSPLASH_ACCESS_KEY` | (optional) destination hero images |
| `NODE_ENV` | `development` \| `production` |
| `PORT` | defaults to 5000 |

There is no `.env.example` — infer from `render.yaml` and `.github/workflows/ci.yml`.

---

## Database schema (key tables)

- `users` — Google OAuth users
- `destinations` — destination records (populated manually / seeded)
- `itineraries` — generated trip plans linked to user + destination; `days` field is JSONB
- `profilingInputs` — raw quiz answers (JSONB)
- `recentDestinations` — recently viewed destinations for map widget
- `session` — auto-managed by connect-pg-simple

Schema lives in `/shared/schema.ts`. Always edit schema there, then run `npm run db:push`.

---

## AI integration notes

- **Destination matching** (`server/matching-engine.ts`): sends user profile to Claude, gets scored ranking of the 16 destinations in `destination-catalog.ts`.
- **Itinerary generation** (`server/routes.ts` + `client/src/pages/ItineraryStream.tsx`): streams a day-by-day plan via Anthropic streaming API.
- Use `claude-sonnet-4-6` or newer for both. Prefer prompt caching on large catalog payloads.

---

## Conventions

- **Shared types first**: define new DB tables in `/shared/schema.ts`, derive TypeScript types with Drizzle's `InferSelectModel`/`InferInsertModel`.
- **API contracts in `/shared/routes.ts`**: every endpoint has a Zod-validated input/output shape. Don't add bare `req.body` reads without validation.
- **i18n**: all user-visible strings go through `t()` from `lib/i18n.tsx`. Keys live in the same file.
- **Dark mode**: uses CSS variables in `index.css`; never hard-code colours — use Tailwind semantic tokens (`bg-background`, `text-foreground`, etc.).
- **Port is always 5000** in all environments — Render firewalls other ports.
- **ESM throughout** — no `require()`, use dynamic `import()` when needed at runtime.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main`:
1. `npm ci`
2. `npm run check` (TypeScript)
3. `npm run build` (with stub env vars)

Render auto-deploys on merge to `main`.
