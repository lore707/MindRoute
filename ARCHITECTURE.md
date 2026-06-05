# MindRoute — Architecture map

Reference document so contributors (and Claude) can skip exploration when answering questions about flows, contracts, and invariants. Reading this should mean fewer `grep`s.

For project setup, build commands and stack overview see `CLAUDE.md`.

---

## User journey & data flow

```
Landing → Profiling (7Q) → Destinations (pick 1 of 3) → Itinerary (cinematic + PDF download)
```

| Step | Page | API call | Persists |
|---|---|---|---|
| 1. Profile user | `client/src/pages/Profiling.tsx` | `POST /api/profiling` (path from `@shared/routes.api.profiling.submit`) | `profilingInputs`, `destinations` (3 candidates with hero images) |
| 2. Pick destination | `client/src/pages/Destinations.tsx` | `POST /api/itinerary/generate-stream` (SSE) | `itineraries` (with days, mapPoints, dayImageUrl, hero) |
| 3. View itinerary | `client/src/pages/Itinerary.tsx` | `GET /api/itinerary/:destinationId` | — |
| 3b. Stream narrative | `client/src/pages/ItineraryStream.tsx` | `POST /api/itinerary/stream-narrative` (SSE) | Placeholder, then background fills `itineraries` |
| 4. Save PDF | `client/src/components/ItineraryPrint.tsx` (HTML printed via browser `window.print()` in an isolated window) | — | — |

**Main user path** is `generate-stream` (step 2). `stream-narrative` is the "ChatGPT-style live text" alternative entry. Both end up with the same `itineraries` row shape.

---

## Server file map

| File | Lines | Purpose |
|---|---|---|
| `server/index.ts` | ~120 | Express init, middleware, Vite mount, port 5000 |
| `server/routes.ts` | ~20 | Slim entry — registers each route module |
| `server/routes/profiling.ts` | ~55 | `/api/profiling/*` — 2 endpoints |
| `server/routes/itinerary-gen.ts` | ~440 | 4 generation endpoints (generate, stream-structured, stream-narrative, generate-stream) |
| `server/routes/itinerary-detail.ts` | ~95 | Read/edit existing itineraries (GET, PATCH, regenerate-day) |
| `server/routes/misc.ts` | ~40 | recent-destination, my-trips, stats |
| `server/unsplash.ts` | ~150 | `fetchUnsplashHero`, `fetchDayImageWithFallback`, `mapWithConcurrency` |
| `server/recent-destinations.ts` | ~20 | `recordRecentDestination` fire-and-forget |
| `server/matching-engine.ts` | ~800 | Claude API calls + Zod schemas for LLM output. Destinations match + itinerary generation + day regeneration + streaming variants |
| `server/auth.ts` | — | Google OAuth + passport |
| `server/db.ts` | — | pg pool |
| `server/storage.ts` / `storage-db.ts` | — | DB-backed storage layer (DatabaseStorage) |
| `server/rate-limiter.ts` | — | `profilingLimiter`, `itineraryLimiter` |

When adding a new endpoint: pick the matching route module, don't add it to `server/routes.ts`.

---

## Client file map (key files)

| File | Purpose |
|---|---|
| `client/src/pages/Landing.tsx` | Marketing home |
| `client/src/pages/Profiling.tsx` | 7-question quiz, multi-path |
| `client/src/pages/profiling/questions.ts` | Question definitions + theme map |
| `client/src/pages/Destinations.tsx` | Shows 3 candidates, kicks off generate-stream |
| `client/src/pages/Itinerary.tsx` | Renders the finished itinerary (cinematic) |
| `client/src/pages/ItineraryStream.tsx` | ChatGPT-style streaming entry |
| `client/src/components/ItineraryCinematic.tsx` | Cinematic web layout (legacy; live layout is `ItineraryRedesign.tsx`) |
| `client/src/components/ItineraryPrint.tsx` | HTML A4 magazine layout, browser-printed to PDF |
| `client/src/components/WorldMap.tsx` | Leaflet map for itinerary |
| `client/src/lib/i18n.tsx` | `t()` + EN/IT key dictionary |
| `client/src/styles/itinerary-cinematic.css` | Cinematic page styles |

---

## Schema (Drizzle, in `shared/schema.ts`)

| Table | Key fields | Notes |
|---|---|---|
| `users` | id, googleId, email, name, picture | OAuth users |
| `destinations` | id, name, whyYours, experiencePreview, practicalInfo, imageUrl | 3-at-a-time, cleared between profilings |
| `profilingInputs` | id, input (JSONB) | Single row updated each profiling |
| `itineraries` | id, destinationId, destinationName, days (JSONB), whyYours, tripSummary, highlights (array), budgetSummary, packingList, bestTime, gettingThere, closingMessage, heroImageUrl, heroPhotographer, heroPhotographerUrl, topAffiliateLinks (JSONB), rawNarrative, userId, createdAt | The big one |
| `recentDestinations` | id, destinationName, flag, lat, lon, createdAt | Home/map widget |
| `session` | sid, sess, expire | Managed by connect-pg-simple, don't touch |

`days` JSONB shape per item:
```ts
{ dayNumber, title, morning, lunch, afternoon, evening,
  imageQuery, dayImageUrl,                  // see image pipeline
  affiliateLinks, affiliateLabels,           // booking CTAs
  mapPoints }                                // [{ lat, lng, label, slot }]
```

API contracts live in `shared/routes.ts` (Zod input/output schemas per endpoint). Always edit there, not at the route handler.

---

## Image pipeline

**Hero** (one per destination/itinerary): `fetchUnsplashHero(name)` tries 5 query variants (`city country landscape`, `city travel`, etc.) and falls back to `"tropical island paradise landscape"`. Stored in `itineraries.heroImageUrl` + photographer attribution.

**Day images** (one per itinerary day): `fetchDayImageWithFallback(query, name)` cascade:
1. `${city} ${query}` — geo-grounded
2. `${query}` — in case LLM query is already geographic
3. `${city} travel landscape` — guaranteed something at least about the right place

Each stage retries 429/5xx with 1s/2s/4s exponential backoff. Logs `[unsplash]` warnings on transient failures so rate-limit pressure is visible in production logs.

**Concurrency**: 7 days are fetched with `mapWithConcurrency(days, 3, ...)`, **not** `Promise.all`. Three-wide waves stay under Unsplash's per-second burst throttle (which returns 429 even if hourly quota isn't exhausted).

**Final fallback**: every call site does `extras.dayImageUrl = dayImg ?? heroUrl`. If Unsplash is completely exhausted, the day shows the destination's hero image. **The user never sees a missing photo.**

**Invariants**:
- The field is `dayImageUrl` (with `Url`). Never `dayImage`.
- The LLM's `dayImageUrl` is **always** overridden — its photo IDs are usually hallucinated.
- Don't reintroduce `keyDayIndices` — every day must have a real image.

---

## PDF pipeline

The PDF keepsake is an **HTML/CSS magazine layout printed by the browser** (no `@react-pdf/renderer`). `handleSavePdf` in `Itinerary.tsx` renders `client/src/components/ItineraryPrint.tsx` to static markup (`react-dom/server`), opens an **isolated `window.open` document**, injects `client/src/styles/itinerary-pdf.css` (imported with Vite `?inline`) + Google Fonts, and calls `window.print()`. The user picks "Save as PDF" (margins: none). The separate window keeps the template's global CSS (`*`, `body`, `@page`) from touching the app.

**Why isolated window**: the print stylesheet is intentionally global (resets, `@page`, `@media print`). Importing it into the SPA would clobber the app, so it's injected only into the throwaway print window.

**Data-driven + honest**: `ItineraryPrint` is fed `ItineraryData` (from `mapItineraryToCinematic`) + the raw `itineraries` row (budget/gettingThere/packingList parsed inline) + affiliate URLs. It does **not** use `useI18n` (no provider in `renderToStaticMarkup`) — language comes via a `lang` prop, and the cinematic strings are already localized. Per the honesty policy it omits anything not in the data: no minute-level times, no phone numbers, no per-day "why" beyond `day.sub`. Sections degrade gracefully when a field is missing.

**Edits flow through**: because `mapItineraryToCinematic` → `buildMoments` prefers `day.editedMoments`, "Modalità Cura" edits saved to the DB appear in the PDF too.

---

## Streaming endpoints — when each is used

Four endpoints generate itineraries; they differ by streaming UX:

| Endpoint | Streams what | Used by | Notes |
|---|---|---|---|
| `POST /api/itinerary/generate` | Nothing — single JSON response | (legacy / API tests) | Synchronous, slowest UX |
| `POST /api/itinerary/generate-stream` | SSE progress steps 1–5 | `Destinations.tsx` (main path) | Images + maps fetched synchronously before `done`. Background extra geocoding after. |
| `POST /api/itinerary/stream-structured` | SSE per-day JSON + metadata | (unused by current UI) | Real-time "day appears" pattern |
| `POST /api/itinerary/stream-narrative` | SSE text chunks (ChatGPT-style) | `ItineraryStream.tsx` (alternate entry) | Saves a placeholder row immediately. Background regenerates structured itinerary, fetches images, updates the same row. Client must poll to see the enriched version. |

When fixing image-pipeline bugs, update **all four** endpoints unless the fix is clearly specific to one.

---

## Hard invariants (do not violate)

- **Port 5000** in all environments. Render firewalls other ports.
- **ESM throughout** — no `require()`. Use dynamic `import()` for lazy/runtime imports.
- **Field is `dayImageUrl`** (with `Url`). Never `dayImage`.
- **Anthropic model**: prefer `claude-sonnet-4-6` or newer. Prompt caching on large catalog payloads.
- **Shared types first**: DB tables in `shared/schema.ts`, API contracts in `shared/routes.ts`.
- **i18n**: every user-visible string through `t()` from `lib/i18n.tsx`.
- **Colors**: Tailwind semantic tokens (`bg-background`, `text-foreground`). Never hard-code hex on the web side.
- **Auto-deploys on push to `main`** via Render. CI runs `npm run check` + `npm run build` first.

---

## Auth (Google OAuth)

- `passport-google-oauth20` strategy in `server/auth.ts`.
- Session persisted in Postgres via `connect-pg-simple` (table `session`).
- `(req as any).user?.id` is set on authenticated requests; `null` for anonymous.
- Anonymous users can still complete the full journey — itineraries are saved with `userId: null`. Only `/api/my-trips` requires auth.

---

## Common pitfalls

- **Editing schema → forgetting `npm run db:push`**: changes won't apply in dev DB.
- **Adding to `server/routes.ts` instead of a per-domain module**: route file will grow again, defeating the split.
- **Returning the LLM's `dayImageUrl` instead of fetching from Unsplash**: that's the bug from `3e2736a` — never do it.
- **Importing `itinerary-pdf.css` normally** (not `?inline`): its global resets (`*`, `body`, `@page`) clobber the whole app. It must only be injected into the isolated print window.
- **Using `Promise.all` on per-day Unsplash fetches**: triggers 429 burst. Use `mapWithConcurrency(..., 3, ...)`.
