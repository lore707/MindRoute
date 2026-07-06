# AI-GUIDE — Instructions for future AI models (and new humans)

Assume you know nothing about this project. This file tells you how to work here
without breaking things that took months to get right.

---

## 1. The three rules that prevent 90% of damage

1. **`main` = production.** Render auto-deploys every push. There is no staging.
   Run `npm run check` **and** `npm run build` locally before every push — CI runs
   them too, but by then the deploy is already queued.
2. **Never `git add -A` blindly.** Design handoff zips get extracted into the repo
   root (`/README.md`, `/Giorno per Giorno - Agenda.html` are gitignored artifacts
   of this). Stage files explicitly, by name.
3. **Schema changes deploy in the wrong order by default.** `npm run db:push` is
   manual; the code deploy is automatic. If you add a DB column and push code that
   reads it, production crashes until someone runs `db:push`. This is why recent
   features (trip status, travel dates, share tokens) live in **`tripMeta` jsonb**
   instead of new columns — a jsonb sub-field needs no migration and deploys
   atomically with the code. Prefer that pattern for per-itinerary metadata.
   If you *must* add a column: make the reading code null-tolerant first, push,
   run `db:push`, *then* push code that depends on it.

## 2. Hard invariants (violating these = regression)

- **Port 5000** everywhere. Render firewalls everything else.
- **ESM only.** No `require()`. Dynamic `import()` for lazy/runtime loading.
- The day-image field is **`dayImageUrl`** (with `Url`). Never `dayImage`.
- The LLM's image URLs are **always overridden** by real Unsplash fetches — LLM
  photo IDs are hallucinated.
- Per-day Unsplash fetches use `mapWithConcurrency(days, 3, …)`, **never
  `Promise.all`** (burst 429 even under hourly quota).
- Every user-visible string goes through `t()` (`client/src/lib/i18n.tsx` +
  `i18n-dict/` modules). AI-generated content is **monolingual and frozen at
  creation** — `itineraries.lang` forces the reader UI to that language; don't
  try to translate stored content.
- Colors: Tailwind semantic tokens on the web side (`bg-background`, …). The
  cinematic/dashboard CSS files use their own CSS custom properties
  (`--accent`, `--gold`, `--teal`, `--ink*`, `--stroke*`) — reuse those tokens,
  never new hex literals.
- `itinerary-pdf.css` is imported **only** with Vite `?inline` and injected into
  the isolated print window. Importing it normally clobbers the whole app
  (global `*`, `body`, `@page` resets).
- Affiliate URLs come from **one place**: `server/affiliate-config.ts`
  (`resolveAffiliateUrl`). Booking.com and GetYourGuide are **banned** (partner
  applications rejected) — never generate links to them. Providers without a
  real partner → the moment is demoted to `walk_in`, never a fake button.
- Anthropic models: itinerary/matching on `claude-sonnet-4-6`+ with prompt
  caching on large payloads; the companion deliberately runs Haiku (see DECISIONS).

## 3. Dual-schema dispatch (the single most important data fact)

`itineraries.schemaVersion` selects the shape of `days`:

- **v1** (`=1`, legacy): `{ dayNumber, title, morning, lunch, afternoon, evening, mapPoints, editedMoments? }`
- **v2** (`=2`, current): `{ day_number, title_evocative, arc, energy_level, moments: MomentV2[] }`
  plus top-level `tripMeta` (`travel_dates`, `trip_status`, `map_points`,
  `highlights_v2`, costs, `em_word`).

**Every reader dispatches on `schemaVersion`.** There was a deliberate decision
NOT to migrate v1 rows (see DECISIONS #2). When you add a feature that reads
`days`, handle both shapes or explicitly gate on `schemaVersion === 2` (as
companion editing and refine do). v1 rows are real users' trips — don't break them.

`tripMeta` is the **schema-less extension point**. Current keys:
`em_word, travel_dates, travel_dates_confirmed(+_at), trip_status(+_at),
total_cost_bookable, total_cost_onsite_estimate, total_cost_range, map_points,
highlights_v2`. Pure helpers for status logic live in `shared/trip-status.ts` —
use them, don't re-derive phase/status locally (the companion's `tripPhaseInfo`
predates them and is the only sanctioned duplicate).

## 4. Fragile areas — think twice, test after

| Area | Why fragile |
|---|---|
| `server/matching-engine*.ts` prompts | Precision doctrine (TILT_M_O, TILT_C_R, verification gates) balances mainstream vs offbeat **bidirectionally**. Tweaking one sentence can bias all matches. Test with contrasting profiles. |
| `server/routes/itinerary-gen-v2.ts` enrichment | Order matters: LLM output → affiliate rewrite (`rewriteMomentBooking`) → geocode → images → cost recompute (`recomputeDayCosts` always overrides LLM arithmetic). |
| View functions in `ItineraryDashboard.tsx` / `AccountDashboard.tsx` | They are invoked conditionally (`view === "days" && DaysView()`), so they **must not call hooks** — hooks belong in the parent component body. Violating this crashes on tab switch. |
| `client/index.html` | Hand-tuned LCP: inline pre-hero shell, preloaded hero URL, deferred gtag, `<!--OG:START/END-->` markers rewritten server-side for share pages. Every byte there is deliberate. |
| Frontend performance setup | Route-level code splitting, PDF renderer behind dynamic import, `unsplashSized()` for every Unsplash URL. Do not re-import heavy modules statically into the main bundle (bundle went 785→151KB gz; keep it that way). |
| `server/index.ts` startup order | `/healthz` before everything (keep-alive pings); `listen()` before DB maintenance (Render port-detection window); session store reuses the single capped pg pool. Reordering breaks deploys subtly. |
| `shared/traits.ts` weights | Changing any chip weight or axis requires bumping `MAPPING_VERSION`; the aggregator filters snapshots by it. Silent weight edits corrupt longitudinal profiles. |
| Rate limiter | DB-backed, **fails open** by design (availability > strictness), owner bypass via `OWNER_EMAILS`. Dev mode is passthrough — never conclude "rate limiting is broken" from local testing. |

## 5. Dead / orphaned code (deliberate, see DECISIONS #4)

Safe to ignore, candidates for future deletion — do **not** "fix" or wire them up:
- `client/src/components/AccountRedesign.tsx` — superseded by AccountDashboard.
- The old form/body rendering in `Profiling.tsx` — Path A now uses
  `QuizCinematicA` + `QuizLogistics`; the legacy branch is unreachable.
- The v1 per-day edit mode in `Itinerary.tsx` — editing moved to
  `ItineraryRedesign` (`showEditor`) and companion tools.
- `POST /api/itinerary/stream-structured` — no UI caller.
- `ItineraryCinematic.tsx` is **not** dead: it exports `ItineraryData`,
  `mapItineraryToCinematic` and `Moment` used by the live dashboard and print.

## 6. Recommended workflow for a new feature

1. Read `CLAUDE.md`, this file, and the relevant section of `DECISIONS.md`.
2. Data first: does it need a table (`shared/schema.ts` + `db:push` choreography)
   or does it fit `tripMeta`/existing jsonb? Prefer the latter for per-trip data.
3. Contract: add Zod-validated input/output. Never read bare `req.body`.
4. Ownership: any `/api/itinerary/:id/*` endpoint goes through `requireAuth` +
   `ownsItinerary` (see `itinerary-detail.ts` for the canonical pattern).
5. UI: match the surrounding CSS token system; strings through `t()`; hooks
   never inside conditional view functions.
6. Analytics: if the feature is funnel-relevant, add a `track()` event and
   document it in `docs/ANALYTICS.md`.
7. `npm run check` + `npm run build`, stage files **by name**, conventional
   commit (`feat(scope): …` — Italian messages are the house style), push, and
   remember Render deploys it immediately.

## 7. Common mistakes already made once (don't repeat)

- Returning the LLM's `dayImageUrl` instead of fetching from Unsplash (bug `3e2736a`).
- Importing the print CSS globally.
- Trusting the LLM's cost arithmetic (always recomputed server-side now).
- Adding routes to `server/routes.ts` instead of the per-domain module.
- Fixing an image-pipeline bug in one generation endpoint out of four
  (`generate`, `generate-stream`, `stream-structured`, `stream-narrative`).
- Assuming `travel_dates` are real: unless `travel_dates_confirmed === true`,
  they may be a **placeholder** (+3 months from generation, from
  `buildAffiliateContext`). Never infer "trip happened" from unconfirmed dates.
- Assuming account stats mean real travel: only `trip_status === "confirmed"`
  counts as an actually-taken trip.
