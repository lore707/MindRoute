# MindRoute — CLAUDE.md

Il sistema di ragionamento di MindRoute è specificato in docs/ARCHITETTURA-COGNITIVA.md (gerarchia dei livelli, ordine di costruzione) e docs/REASONING-ENGINE.md (pipeline, Graph Core/State, Decision Cascade). Ogni modifica al matching engine, al profilo utente o alla generazione dell'itinerario deve essere conforme a questi documenti. Leggerli prima di proporre modifiche in quelle aree.

> **For data flows, file map, schema overview, image/PDF pipelines, and hard invariants, read `ARCHITECTURE.md` first.** This file covers stack and conventions only.
>
> **Knowledge base:** `docs/` holds the full engineering handoff — start with
> `docs/AI-GUIDE.md` (working rules, fragile areas) and `docs/DECISIONS.md`
> (why things are the way they are, rejected alternatives). Security posture in
> `docs/SECURITY.md`, GA4 event catalog in `docs/ANALYTICS.md`, priorities in
> `docs/ROADMAP.md`. Where `ARCHITECTURE.md` and `docs/` disagree, `docs/` wins.

## MindRoute Operating System

`docs/operating-system/` is the **creative and product source of truth**: brand philosophy,
visual and motion language, layout, storytelling, typography, colour, materials, space,
interaction, and the landing storyboard. Start from `docs/operating-system/README.md`;
`constitution.md` holds the non-negotiable rules that govern every other document there,
and the three appendices cover connections between documents, shared vocabulary
(`appendix-grammar.md`), and things that must never be done (`appendix-guardrails.md`).

The existing engineering docs remain the **engineering source of truth**: `ARCHITECTURE.md`,
`docs/AI-GUIDE.md`, `docs/DECISIONS.md`, `docs/SECURITY.md`, `docs/ANALYTICS.md`,
`docs/SEO.md`, `docs/ROADMAP.md`, plus `docs/ARCHITETTURA-COGNITIVA.md` and
`docs/REASONING-ENGINE.md` for the reasoning system. Nothing in the Operating System
replaces them.

**How they interact:** the Operating System decides *what* an experience should be and
*why*; the engineering docs decide *how* it is built and what it must not break. When
they appear to conflict, it is a design problem, not a licence to pick one — surface the
conflict instead of silently resolving it. Hard technical invariants (port 5000, shared
schema first, Zod-validated contracts, `t()` for user-visible strings, semantic colour
tokens) always hold.

### When To Read Which Documents

Landing page

→ Read the entire Design Bible.

Dashboard

→ Read Brand Philosophy, Visual Language, Layout Principles, Spatial System, Interaction Principles and Engineering Principles.

Frontend components

→ Read Typography, Materials, Motion Cookbook and Engineering Principles.

Animations

→ Read Motion Language, Motion Cookbook and Interaction Principles.

New product features

→ Read Brand Philosophy, Storytelling Principles, Constitution and Engineering Principles.

Matching engine

→ Read REASONING-ENGINE.md and ARCHITETTURA-COGNITIVA.md.

Backend

→ Read ARCHITECTURE.md and AI-GUIDE.md.

### Design Rules

Never implement generic SaaS interfaces.

Never introduce UI patterns that contradict the Design Bible.

Never prioritize implementation convenience over emotional experience.

Every visual decision must reinforce MindRoute's identity.

Every interaction must have narrative purpose.

Every animation must exist inside the Motion Cookbook.

If uncertain,

read the Constitution.

### Before writing code

Before implementing any frontend change, verify consistency with the Operating System:

1. Does the change respect `constitution.md` and `appendix-guardrails.md`?
2. Does it use the existing tokens and scales (typography, colour, spacing, materials) instead of new one-off values?
3. If it moves: is the motion in `03-motion-language`'s vocabulary, and is there already a recipe in `11-motion-cookbook`? Reduced-motion handled?
4. If it speaks: does the copy follow `05-storytelling-principles` (truth first, no invented specifics, illustrative demos labelled), in **both IT and EN**?
5. Is it responsive on desktop, tablet and phone — verified, not assumed?

If the change requires breaking one of these, stop and say so before implementing.

---

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
