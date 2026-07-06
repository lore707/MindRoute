# MindRoute — Documentation index

This folder is the **knowledge transfer** from the original development era (2025–2026).
It exists so that any future engineer — human or AI — can continue working on this
codebase **without tribal knowledge**. Everything here explains *why*, not just *what*.

## Reading order

| Doc | Read it when |
|---|---|
| [`AI-GUIDE.md`](AI-GUIDE.md) | **First**, before touching any code. Invariants, fragile areas, workflow. |
| [`DECISIONS.md`](DECISIONS.md) | Before proposing an architectural change — the alternative you're considering was probably already rejected, and here's why. |
| [`SECURITY.md`](SECURITY.md) | Before adding endpoints or touching auth/session/validation. |
| [`ANALYTICS.md`](ANALYTICS.md) | Before adding/renaming GA4 events or touching conversion funnels. |
| [`SEO.md`](SEO.md) | Before touching `index.html`, meta tags, share links or public routes. |
| [`ROADMAP.md`](ROADMAP.md) | When deciding what to work on next. Prioritized by impact. |

## Other living documents (repo root)

| File | Role |
|---|---|
| `CLAUDE.md` | Stack, conventions, commands. Loaded automatically by Claude Code. |
| `ARCHITECTURE.md` | Low-level flow/file/schema map. **Partially stale** (pre-v2 era) — see the update note at its top; `docs/` is authoritative where they conflict. |
| `DEVELOPMENT_NOTES.md` | Early-era debugging notes. Mostly superseded; kept for the debugging checklist. |

## The product in one paragraph (2026-07 state)

MindRoute turns a short psychological quiz into a personalized, bookable travel
itinerary. Two onboarding levels: **L1** (`/start`, ≤4 questions, QuizFast) gets a
first itinerary fast; **L2** (RefinePanel, "this trip matches you X%") deepens the
profile and regenerates in place. Itineraries are **moment-based** (schema v2) with
per-moment affiliate booking links rewritten server-side to real partner URLs. The
**AI companion** (Haiku, SSE, tool-use) lives with the traveller before/during/after
the trip, can edit the plan, and — after the trip's real dates pass — asks whether the
trip actually happened (`trip_status`), which feeds back into the **trait engine**
(5-axis profile, EMA-weighted: confirmed trips count 2.2×). The account is a
dashboard app-shell showing the collection, the portrait, and the atlas.

Revenue = affiliate commissions (CJ, Awin, Civitatis, Klook, Musement, Viator).
Deploy = Render, auto-deploy on push to `main`. There is **no staging environment**:
`main` is production. Treat every push accordingly.
