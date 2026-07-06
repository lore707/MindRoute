# ROADMAP — Prioritized by impact (handoff snapshot, 2026-07-06)

The lens: MindRoute is functionally complete for launch; revenue is affiliate
clicks; the next constraint is **conversion of cold social traffic**, then
**data quality of the profile**, then scale.

---

## P0 — Before/while pushing traffic

1. **Auth-gate softening** (conversion, likely the single highest-ROI change).
   GA4 shows drop-off between `quiz_cta_click` and `quiz_started`: cold users hit
   Google login before seeing any value. Options, in ascending effort:
   let the quiz run anonymously and gate at "save/see full itinerary"; or gate
   after showing the 3 matched destinations. The rate limiter already handles
   anonymous users by IP, so the backend is ready.
2. **Verify affiliate program status outside the code** (CJ, Awin, Civitatis,
   Klook, Musement, Viator dashboards): IDs are wired and correct, but a
   deactivated program silently zeroes revenue.
3. **Mobile end-to-end pass** of landing → L1 → itinerary → book tab on a real
   phone (social traffic ≈ 90% mobile in-app browsers).

## P1 — Technical debt with real risk

4. **Kill the global `profilingInputs` fallback** (SECURITY.md #5): backfill
   per-itinerary snapshots, delete the single-row table path. Removes the last
   cross-user race.
5. **Zod-validate `days` on `/edit` + `/mappoints`** (SECURITY.md #3).
6. **Breaking dependency upgrades** as a dedicated task: `drizzle-orm@0.45.2`
   (SQLi advisory; low practical risk here) and Vite major (dev-only advisory).
7. **Error monitoring** (e.g. Sentry): today errors live only in Render logs;
   the crash-guard posture (log-and-continue) makes silent degradation possible.
   The `[unsplash]`/`[companion]` log prefixes are the current "monitoring".

## P2 — Product leverage

8. **Public destination pages** (SEO.md #1) — the only organic-acquisition lever.
9. **Analytics gaps** (ANALYTICS.md): companion engagement, trip lifecycle
   (`travel_dates_confirmed`, `trip_status`), share funnel, PDF saves.
10. **Passive trip-taken inference**: pre-raise the check-in suspicion from
    behavioral signals (itinerary opened during travel window, hearts, GPS use
    by the companion) so the "did you go?" ask lands even better. The
    self-report chain shipped 2026-07-06; this is its refinement.
11. **v2 regen path for legacy day-regeneration UI**: `regenerate-day` rejects
    v2 rows (companion's `regenerate_day` tool covers v2); unify eventually.

## P3 — Scale (when traffic justifies it)

12. **Generation queue + pre-generated popular destinations** (Anthropic cost
    spikes under virality; see DECISIONS bottlenecks #3).
13. **Cache `destinations-feed` / landing images** (per-request recompute today).
14. **Unsplash paid tier or image cache** once hero-fallback repetition becomes
    visible under load.
15. **Migration files** (`drizzle-kit generate`) the day a second environment or
    developer appears (DECISIONS #1).
16. **Nonce-based CSP** (SECURITY.md #1).

## Explicitly not worth doing (rejected, keep it that way)

- Migrating v1 itineraries to v2 (DECISIONS #2).
- Replacing the custom i18n with i18next (DECISIONS #8).
- Server-rendered PDF generation (DECISIONS #9).
- Re-adding Booking.com / GetYourGuide links (partnerships rejected; DECISIONS #5).
