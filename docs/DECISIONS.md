# DECISIONS — Architecture decisions, trade-offs, rejected alternatives

The reasoning that normally lives only in the senior engineer's head. Numbered so
other docs can reference them. Each entry: decision → why → what was rejected →
consequences to be aware of.

---

## 1. `db:push` instead of migration files

**Decision:** Drizzle schema changes are applied with `npm run db:push` (schema
diffing, no migration files), run manually against prod.

**Why:** Solo-dev velocity. Migrations add ceremony with no second environment to
protect (there is no staging; `main` = prod).

**Rejected:** `drizzle-kit generate` + committed migrations.

**Consequences:** The **deploy-order hazard** — Render deploys code on push, but
`db:push` is manual, so code that reads a new column crashes prod until the push
is run. This shaped decision #3 (jsonb-first). If the project ever gets a second
developer or a staging env, switch to migration files; until then, follow the
choreography in AI-GUIDE §1.3.

## 2. Two itinerary schemas forever (v1 slots, v2 moments), no data migration

**Decision:** `schemaVersion` column dispatches readers; v1 rows are never
migrated to v2.

**Why:** v1 rows are free-text (`morning: "…"`), v2 is structured moments. A
faithful conversion would need an LLM pass over every historical row — cost and
hallucination risk for zero user benefit (old trips are read-mostly keepsakes).

**Rejected:** batch LLM migration; dropping v1 support.

**Consequences:** every reader carries a v1 branch; new features (companion
editing, refine, moments hearts) are legitimately **v2-only** and must gate
explicitly with a friendly error, not crash.

## 3. `tripMeta` jsonb as the extension point for per-trip metadata

**Decision:** New per-itinerary facts (`travel_dates_confirmed`, `trip_status`,
`map_points`, costs…) go into the `tripMeta` jsonb column, with pure helpers in
`shared/trip-status.ts`, instead of new columns.

**Why:** Eliminates the deploy-order hazard (#1): a jsonb sub-field ships
atomically with the code. Also keeps the table narrow.

**Rejected:** one column per fact (repeatedly caused the "RICHIEDE db:push su
prod" coordination problem — see `public_token`, `tagline`, `raw_signal` eras).

**Consequences:** can't index or query these fields efficiently in SQL. If a
field ever needs aggregate queries/analytics (candidate: `trip_status`), promote
it to a real column *then*, with the safe choreography.

## 4. "Drop-in redesign" pattern — new component beside the old, old left orphaned

**Decision:** Major UI reworks are new components (`ItineraryRedesign`,
`ItineraryDashboard`, `AccountDashboard`, `QuizCinematicA`, `QuizFast`) mounted
in place of the old ones; the old components stay in the tree, unmounted.

**Why:** Instant rollback (swap the import), zero-risk iteration on prod, and the
old component often still exports shared types/mappers (e.g.
`ItineraryCinematic.tsx` exports `mapItineraryToCinematic` used everywhere).

**Rejected:** in-place rewrites (risk on a no-staging pipeline); feature flags
(overkill for one dev).

**Consequences:** dead code accumulates (list in AI-GUIDE §5). Periodically prune
*only after* confirming nothing imports the orphan's exports.

## 5. Affiliate links: server-side rewrite, single source of truth

**Decision:** The LLM proposes a `booking.provider`; `resolveAffiliateUrl()`
(`server/affiliate-config.ts`) rewrites every `affiliate_url` to the real partner
deep link. Providers without a partnership → moment demoted to `walk_in`.
Booking.com and GetYourGuide are banned (applications rejected). The Day-1
anchor is always lodging ("dove dormire" is the product's booking advantage).
The companion cites the *same* links via `get_booking_link` (plan-moment lookup
first, then category fallback).

**Why:** LLMs invent dead/wrong URLs; revenue depends on every link carrying the
right affiliate IDs. One resolver = one place to audit and update.

**Rejected:** trusting LLM URLs (produced dead links); client-side-only link
building (BookTab still builds URLs client-side — the resolver mirrors those
formats; keep them in sync when touching either).

**Consequences:** adding a partner = one `case` in the resolver + BookTab
counterpart + provider normalization in `canonicalProvider`. CJ/Awin links are
full click-wrapper URLs with hardcoded IDs (they're not parametric).

## 6. Trait engine: EMA over snapshots, revealed preference > intention

**Decision:** 5 axes (exposure/comfort/social/matter/structure), chip→axis
weights in `shared/traits.ts`, snapshots at profiling + destination pick, EMA
aggregation. Since 2026-07: `emaAggregateWeighted` — trips **confirmed as
actually taken** weigh 2.2×, skipped 0.5×. The prior is injected into matching
as a *soft* block ("current quiz always wins").

**Why:** What users pick (and even more, where they actually go) reveals more
than what they claim. The soft-prior framing prevents the profile from becoming
a filter bubble — a contradicting quiz is treated as deliberate change-seeking.

**Rejected:** hard constraints from the profile; per-trip full re-profiling.

**Consequences:** any weight/chip change requires bumping `MAPPING_VERSION`.
The "trip actually happened" chain (real dates → check-in → `trip_status` →
weighting) is the foundation of profile realism — see `shared/trip-status.ts`.

## 7. Companion on Haiku with server-side agentic loop

**Decision:** The travel companion runs `claude-haiku-4-5` with a hand-rolled
tool loop (`runCompanionAgent`), SSE streaming, prompt-cached system block, and
tools: save_moment, find_nearby (OSM), get_weather (Open-Meteo), get_booking_link,
remove/replace/add_moment, regenerate_day, set_trip_status, plus Anthropic
server-side web_search.

**Why:** Haiku is fast/cheap enough for a chat that must feel instant and may be
opened casually; the expensive work (day regeneration) delegates to the Sonnet
matching engine. The system block (profile + itinerary digest + history) is
stable per trip → `cache_control: ephemeral` makes repeat turns cheap.

**Rejected:** Sonnet for chat (latency/cost); client-side tool orchestration
(secrets, consistency).

**Consequences:** MAX_TURNS=6 guards tool loops; `pause_turn` handling is
required for web_search. The companion's phase logic (before/during/after) is
the trigger surface for the post-trip check-in — see #6.

## 8. Custom i18n instead of i18next

**Decision:** Tiny homegrown `t()` with EN/IT dictionaries split into
`client/src/lib/i18n-dict/*` modules.

**Why:** Two languages, one dev, zero pluralization complexity worth a library.
Bundle size matters (see #10).

**Consequences:** no ICU plurals — components do manual `n === 1 ?` branching.
AI-generated content is monolingual by design (`itineraries.lang`), so the UI
follows the *content's* language on itinerary pages, not the global toggle.

## 9. PDF = browser-printed HTML in an isolated window

**Decision:** `ItineraryPrint.tsx` rendered via `renderToStaticMarkup`, injected
into a throwaway `window.open` document with `itinerary-pdf.css?inline`, printed
by the user ("Save as PDF").

**Why:** `@react-pdf/renderer` (rejected) meant a second layout system, huge
bundle, and worse typography. Browser print gives real CSS, page-break control,
and zero server cost.

**Consequences:** the print CSS is intentionally global — it must never be
imported into the SPA. No `useI18n` inside (no provider in static render):
language via `lang` prop.

## 10. Performance posture (do not regress)

Route-level code splitting (main bundle 785→151KB gz), PDF renderer behind
dynamic import (Itinerary 528→33KB gz), Leaflet lazy-loaded per tab,
`unsplashSized()` on every image, static pre-hero shell in `index.html` for LCP,
gtag deferred to idle. **Why:** social traffic is ~90% mobile on slow in-app
browsers; first paint is the funnel's first gate.

## 11. Uptime-first error posture

Process-level crash guards (log & continue), rate limiter fails **open**, DB
maintenance after `listen()`, single capped pg pool shared with the session
store, geocode cache. **Why:** read-mostly product on a small Render instance —
availability beats strictness everywhere except payments (none) and auth.

## 12. Grounding & precision doctrine (matching + generation)

`server/experience-bank.ts` provides real anchors for ANY destination (16
curated + live OSM/Wikidata via `resolveGroundingBlock`) with a freshness nudge
for variety. The matching prompt carries bidirectional tilt guards (TILT_M_O,
TILT_C_R) and verification gates so neither mainstream nor offbeat wins by
default. Only *grounded* geometry is presented as fact (distances computed, not
LLM-claimed). **Why:** the product's credibility is "real places, honest
claims"; a single hallucinated restaurant costs more trust than ten generic tips.

## 13. Nested side-projects in the repo

`HE-Lead-Events-Agent/` (Python lead-gen, separate product, gitignored) and
`content-factory/` (`npm run content` → branded IG/TikTok carousels). They share
the repo for convenience only — **no code coupling**. Don't import across.

## Known bottlenecks / scalability concerns (when growth comes)

1. **Global `profilingInputs` slot** — a single-row table used as fallback for
   legacy rows; cross-user race under concurrency. Mitigated (per-itinerary
   `profilingInput` snapshot persisted since mid-2026) but the fallback path
   still exists. Kill it once legacy rows don't matter.
2. **Unsplash free tier** — the pipeline retries and falls back to hero, but a
   traffic spike will exhaust quota; result is repeated hero images, not errors.
3. **Anthropic cost under virality** — generation endpoints are rate-limited
   3/day/user, but a spike is still linear cost. A queue + cached "popular
   destination" pre-generations is the natural next step.
4. **Single Render instance** — the DB-backed rate limiter and session store are
   already multi-instance-safe; the in-process geocode cache is not (fine, it's
   just a cache).
5. **`/api/destinations-feed` and landing images** are recomputed per request —
   cheap now, cacheable later.
