# ANALYTICS — GA4 event catalog

**Measurement ID:** `G-XJC8RN21Z6`. The gtag snippet lives in `client/index.html`
(deferred to idle — the inline `dataLayer` stub queues early calls, the 155KB
library loads after LCP; don't "fix" this by moving it back to blocking).

**Single chokepoint:** every event goes through `client/src/lib/analytics.ts`
(`track()` / `trackAffiliate()`). **No direct `gtag()` calls in components** —
keep it that way so events can be renamed/audited in one file.

---

## Event catalog

| Event | Fired from | Meaning / params |
|---|---|---|
| `quiz_cta_click` | `Landing.tsx` | User clicked the landing CTA toward the quiz. **The delta `quiz_cta_click − quiz_started` measures the auth-gate drop-off** — the single most important conversion number for social traffic. |
| `quiz_started` | `Profiling.tsx`, `QuizFast.tsx` | Quiz actually began (post-gate). Fired by both L1 (`/start`) and full path. |
| `quiz_completed` | `Profiling.tsx` | All quiz answers submitted. |
| `generate_itinerary_started` | `Destinations.tsx` | User picked a destination; generation kicked off. |
| `itinerary_generated` | `Destinations.tsx` | SSE generation reached `done` — an itinerary exists. |
| `email_signup` | `Profiling.tsx` (reads `?welcome=1` once) | New Google account created. The flag is set by the OAuth callback redirect for first-time users and consumed exactly once client-side. |
| `affiliate_click` | `ItineraryDashboard.tsx` (3 sites), `ItineraryRedesign.tsx` (3), `ItineraryCinematic.tsx` (1), `Itinerary.tsx` BookTab (2) | **The revenue event.** Params: `provider` (canonical partner via `affiliateProvider()`), `destination`. Uses `transport_type: "beacon"` because the click navigates away — a plain event would be lost exactly when it matters. |

## The funnel

```
quiz_cta_click → quiz_started → quiz_completed → generate_itinerary_started
              ↘ (drop = auth gate)                → itinerary_generated → affiliate_click
```

## Conventions

- Event names: `snake_case`, verb-phrase, stable forever (renaming breaks GA4
  history — add a new event instead).
- `trackAffiliate` must be used for anything that opens a partner link;
  `affiliateProvider()` normalizes raw keys (`expedia_flights`, `klook_1`, v2
  `booking.provider` values) to canonical partner names — extend it when adding
  a partner (see DECISIONS #5).
- Fail-silent by design: no gtag (ad-blocker, SSR) → no-op, never an error.

## Known gaps / opportunities (not yet implemented)

1. **Companion engagement**: no events for chat opened / message sent / tool
   used (`set_trip_status` especially — it's a profile-quality conversion).
2. **Trip lifecycle**: `travel_dates_confirmed` and `trip_status` answers are
   product-critical signals with no GA4 counterpart yet.
3. **Share funnel**: `/api/itinerary/:id/share` creation and `/i/:token` public
   views are untracked (public page has the GA snippet but no dedicated event).
4. **L2 refinement**: RefinePanel answers/regenerations untracked.
5. **PDF saves**: `handleSavePdf` untracked.
6. Server-side conversion mirror (Measurement Protocol) if ad-blocker loss ever
   needs quantifying.
