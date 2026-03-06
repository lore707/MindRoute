# MindRoute — Replit Agent Guide

## Overview

MindRoute is an AI-powered travel profiling web application. It guides users through a 4-step flow:

1. **Landing** — A branded intro page with tagline "We don't ask where you want to go. We ask who you are."
2. **Profiling** — An intro overlay screen ("Before we begin..."), then a 7-question psychological profiling flow with text/chips/image-multiselect/slider question types, a sidebar showing "Why this question?" + "What we're mapping" + "Your profile so far", followed by an animated "Analyzing your travel soul..." transition overlay, then a practical constraints form (days, dates, budget, departure city).
3. **Destinations** — Three personalized destination cards are shown; user picks one.
4. **Itinerary** — A detailed day-by-day itinerary for the chosen destination with expandable sections, budget summary, and packing list.

The app currently uses **mock/seeded data** for destinations and itineraries. The architecture is designed for easy replacement with real AI (e.g., OpenAI) API calls later.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend

- **Framework**: React (with TypeScript), bootstrapped via Vite
- **Routing**: `wouter` (lightweight client-side routing)
- **State / Data Fetching**: TanStack React Query (`@tanstack/react-query`) for async data and caching
- **Animations**: Framer Motion for page transitions and micro-interactions
- **UI Components**: shadcn/ui (built on Radix UI primitives) with Tailwind CSS
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Fonts**: Google Fonts — `DM Serif Display` / `Plus Jakarta Sans` (also `Playfair Display` / `DM Sans` referenced in CSS variables)

**Key pages** (`client/src/pages/`):
| Page | Path | Description |
|---|---|---|
| Landing | `/` | Hero landing page |
| Profiling | `/profiling` | Multi-step quiz + practical form |
| Destinations | `/destinations` | 3 destination cards to choose from |
| Itinerary | `/itinerary/:id` | Day-by-day trip plan |

**Layout**: A persistent `Layout` component wraps all pages with a fixed navbar (MindRoute butterfly logo + "Start your journey" CTA) and `AnimatePresence` for page-level fade transitions.

**Data flow between pages**: After profiling is submitted, destination data is saved to `sessionStorage` (`mind_destinations` key) and read on the Destinations page.

**Design system**:
- Custom CSS variables in `client/src/index.css` define a warm cream/navy/coral palette
- Tailwind config extends with custom colors and border radii
- `components.json` configures shadcn/ui with `new-york` style, neutral base, CSS variables

### Backend

- **Runtime**: Node.js with Express (TypeScript, ESM)
- **Entry point**: `server/index.ts`
- **Routes**: Defined in `server/routes.ts`, registered via `registerRoutes()`
- **Dev mode**: Vite dev server runs as middleware via `server/vite.ts`
- **Prod mode**: Static files served from `dist/public` via `server/static.ts`
- **Build**: Custom build script at `script/build.ts` — runs Vite for frontend and esbuild for backend, outputting to `dist/`

**API endpoints**:
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/profiling` | Submit quiz answers + constraints → returns 3 destinations |
| `GET` | `/api/itinerary/:destinationId` | Fetch itinerary for selected destination |

Route contracts are defined in `shared/routes.ts` using Zod schemas, shared between frontend and backend.

### Data Storage

- **Database**: PostgreSQL via `drizzle-orm/node-postgres`
- **ORM**: Drizzle ORM with schema defined in `shared/schema.ts`
- **Config**: `drizzle.config.ts` points to `shared/schema.ts`, outputs migrations to `./migrations/`
- **Connection**: `server/db.ts` uses `pg.Pool` with `DATABASE_URL` env variable

**Schema tables**:
- `destinations` — `id`, `name`, `why_yours`, `experience_preview`, `practical_info`, `image_url`
- `itineraries` — `id`, `destination_id` (FK), `days` (JSONB array), `budget_summary`, `packing_list`, `best_time`, `getting_there`, `closing_message`

The `days` field is a typed JSONB array with: `dayNumber`, `title`, `morning`, `lunch`, `afternoon`, `evening`.

**Destination Matching**: The system uses an intelligent keyword-based matching engine instead of random/static destinations:
- `server/destination-catalog.ts` — Contains 16 richly detailed destinations, each with a psychological profile (keywords, budget tiers, season fit, companion fit, duration fit) and complete 3-day itineraries
- `server/matching-engine.ts` — Scores each destination against user profiling answers using keyword overlap, budget compatibility, season matching, duration fit, companion type, and constraint handling (accessibility, flight fear, dietary). Returns the top 3 matches.
- `POST /api/profiling` clears the DB and inserts only the 3 matched destinations + itineraries per request.
- **LLM-ready**: To swap in AI, replace `generateDestinations()` in `matching-engine.ts` with an API call — the rest of the architecture stays identical.

### Shared Code

The `shared/` directory contains code used by both frontend and backend:
- `shared/schema.ts` — Drizzle table definitions + Zod insert schemas + TypeScript types
- `shared/routes.ts` — API route definitions (method, path, input/output Zod schemas) + `buildUrl()` helper

This pattern avoids duplication and ensures the frontend and backend agree on data shapes at compile time.

### Path Aliases

| Alias | Resolves to |
|---|---|
| `@/*` | `client/src/*` |
| `@shared/*` | `shared/*` |
| `@assets/*` | `attached_assets/*` |

---

## External Dependencies

### Core Runtime
- **Node.js + Express** — HTTP server
- **PostgreSQL** — Primary database (requires `DATABASE_URL` env var)
- **Drizzle ORM** — Type-safe DB queries and schema management; run `npm run db:push` to sync schema

### Frontend Libraries
- **React** + **Vite** — UI framework and bundler
- **wouter** — Client-side routing
- **TanStack React Query** — Server state management
- **Framer Motion** — Animations and page transitions
- **Radix UI** — Headless accessible UI primitives (full suite included)
- **shadcn/ui** — Component library built on Radix UI
- **Tailwind CSS** — Utility-first CSS
- **Lucide React** — Icon set
- **Zod** — Schema validation (shared frontend/backend)
- **React Hook Form** + `@hookform/resolvers` — Form state management
- **date-fns** — Date utility

### Replit-specific Plugins (dev only)
- `@replit/vite-plugin-runtime-error-modal` — Dev error overlay
- `@replit/vite-plugin-cartographer` — Replit source map tooling
- `@replit/vite-plugin-dev-banner` — Dev environment banner

### Build Tooling
- **esbuild** — Server bundle (via custom `script/build.ts`)
- **tsx** — TypeScript execution for dev server
- **drizzle-kit** — DB schema push / migration tool

### Dark Mode / Theming

- **System**: Custom `ThemeProvider` component in `client/src/components/ThemeProvider.tsx`
- **Toggle**: Moon/Sun icon button in the navbar (`Layout.tsx`), persisted via `localStorage`
- **Mechanism**: Adds/removes `.dark` class on `<html>` element; `darkMode: ["class"]` in Tailwind config
- **CSS Variables**: Defined in `client/src/index.css` under `:root` (light) and `.dark` (dark)
  - Surface: `--surface`, `--surface-alt`, `--surface-card`
  - Text: `--text-primary`, `--text-secondary`, `--text-muted`
  - Borders: `--border-subtle`, `--border-input`
  - Nav: `--nav-bg`
- **Accent colors** (`#E94560` / `#D13A52`) and **dark navy sections** (`#1A1A2E` footer/CTA) remain hardcoded — intentional design choice
- **All pages** (Landing, Profiling, Destinations, Itinerary) and Layout/LangDropdown use CSS variables for dark mode compatibility

### Internationalization (i18n)

- **System**: Custom lightweight i18n built in `client/src/lib/i18n.tsx`
- **Languages**: English (en) and Italian (it)
- **Hook**: `useI18n()` returns `{ lang, setLang, t }` where `t(key)` retrieves translated strings
- **Provider**: `I18nProvider` wraps the entire app in `App.tsx`, stores language preference in `localStorage`
- **Coverage**: All user-facing text across Landing, Profiling (intro overlay, 7 questions, logistics form, analyzing overlay), Destinations, and Itinerary pages
- **Language Switcher**: Globe icon button in navbar/intro bar toggling EN↔IT, visible on all pages

### Future Integrations (referenced in build allowlist but not yet wired)
- `openai` / `@google/generative-ai` — For real AI-powered destination recommendations
- `express-session` + `connect-pg-simple` — Session management (infrastructure present)
- `passport` / `passport-local` — Authentication (infrastructure present)
- `stripe` — Payments (infrastructure present)
- `nodemailer` — Email sending (infrastructure present)