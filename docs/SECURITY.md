# SECURITY — Audit (2026-07-06) and standing posture

Full-repo audit performed at handoff. This documents what protects the app, what
was fixed, and what remains open (with why it wasn't auto-fixed).

Note: the project uses **PostgreSQL on Render via Drizzle**, not Supabase — there
is no RLS layer; authorization is enforced entirely in Express middleware.

---

## What is in place (verified)

| Control | Where | Notes |
|---|---|---|
| No secrets in git | `.gitignore` (`.env`), grep-verified | All keys via env vars; `render.yaml` + CI use references, not values |
| Session hardening | `server/index.ts` | httpOnly, `secure` in prod, `sameSite: lax`, 30d; **throws at boot if `SESSION_SECRET` missing in prod** (dev fallback can't leak into prod) |
| CORS | `server/index.ts` | Reflects same-origin (works on any domain/CDN), explicit `ALLOWED_ORIGINS` for real cross-origin; disallowed origins get headers omitted, never a 500 |
| Rate limiting (3 tiers) | `server/rate-limiter.ts`, `auth.ts` | Global 50/h per-IP on mutations; 3/day per-user on profiling + itinerary generation (the expensive AI paths); 20/15min on auth endpoints. DB-backed (multi-instance safe), **fails open by design** (availability first), owner bypass via `OWNER_EMAILS` |
| AuthZ on itineraries | `routes/itinerary-detail.ts` `ownsItinerary` | Every by-id endpoint: `requireAuth` + ownership check |
| Public share is PII-free | `GET /api/share/:token` | Strips `userId` **and** `profilingInput` (quiz answers); token is 72-bit random `base64url` |
| XSS on OG injection | `escapeHtml` in `itinerary-detail.ts` | Server-injected meta for `/i/:token` fully escaped |
| No PII in logs | `server/index.ts` request logger | Method/path/status/duration only — response bodies deliberately never logged |
| SQL injection | Drizzle everywhere | The only raw `sql\`\`` (rate limiter) uses bound parameters |
| Input validation | Zod on `shared/routes.ts` contracts + per-endpoint schemas | refine, saved-places, travel-dates, trip-status, share all validated |
| Crash resilience | Process-level guards | Unhandled rejection/exception logged, process keeps serving |
| OAuth callback host | `callbackURLFor()` | Follows the request host (multi-domain), each host must be registered in Google Console |

## Fixed during this audit

1. **Dependency vulnerabilities**: `npm audit fix` applied — 13 → 3
   (babel, esbuild-in-tsx, form-data, ip-address→express-rate-limit, lodash,
   path-to-regexp, picomatch, ws all patched). `check` + `build` verified green.
2. **Security headers added** (`server/index.ts`): `X-Content-Type-Options:
   nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy:
   strict-origin-when-cross-origin`.

## Open issues — documented, not auto-fixed (and why)

| # | Issue | Risk | Why not fixed now | Recommended fix |
|---|---|---|---|---|
| 1 | **No Content-Security-Policy** | XSS depth-of-defense missing | `index.html` relies on deliberate inline scripts (gtag stub, pre-hero removal) and inline styles; a naive CSP breaks the site. | Design a nonce-based CSP: allow `images.unsplash.com`, GA, OSM tiles, Open-Meteo; move inline scripts to nonced blocks. |
| 2 | **Remaining npm audit (3)**: `drizzle-orm` <0.45.2 (SQLi via *identifiers*), `vite`/`esbuild` (dev-server only) | Low: we never interpolate identifiers into Drizzle queries; vite issue doesn't affect prod builds | Both fixes are breaking upgrades | Schedule `drizzle-orm@0.45.2` + `vite` major bump as a dedicated task with regression pass |
| 3 | **`PATCH /api/itinerary/:id/edit` and `/mappoints` accept unvalidated `days`/`mapPoints` JSON** | Owner-only (authZ enforced) data-shape corruption; stored-XSS surface is low because React escapes rendering | The `days` shape is dual-schema (v1/v2) — a strict Zod schema is a real project, not a patch | Write `daysV1Schema | daysV2Schema` in `shared/schema.ts` and validate both endpoints |
| 4 | **Legacy itineraries with `userId: null`** are readable/editable by *any* authenticated user | Limited to pre-auth-era rows | Deliberate trade-off to not break historical trips (comment in `ownsItinerary`) | Backfill: assign or archive null-user rows, then drop the null-passes clause |
| 5 | **Global `profilingInputs` single-row fallback** | Cross-user data bleed under concurrency (user B's GET can read user A's just-saved quiz) on *legacy* rows only | New rows carry their own `profilingInput` snapshot; removing the fallback breaks legacy reads | Backfill snapshots, delete the fallback path and the table |
| 6 | **Owner email hardcoded as `OWNER_EMAILS` default** (`rate-limiter.ts`) | Privacy nit — it's in a public-ish repo | It's the intended default for the solo dev | Move to env-only if the repo goes public |
| 7 | **`/api/me/portrait-card.png` and OG PNG rendering** fetch remote images server-side from stored URLs | SSRF is bounded (URLs originate from Unsplash pipeline, not user input) | Current sources are trusted-by-construction | If user-supplied image URLs ever appear, allowlist hosts |
| 8 | **No CSRF tokens** | Mutations rely on `sameSite: lax` cookies + CORS | `lax` blocks cross-site POSTs in modern browsers; acceptable for current risk profile | If embedding/webviews expand, add a CSRF token or `sameSite: strict` for the session |

## Secrets inventory (env vars, never in code)

`DATABASE_URL`, `SESSION_SECRET`, `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (fallback only — real callback
follows request host), `UNSPLASH_ACCESS_KEY` (optional), `ALLOWED_ORIGINS`
(optional), `OWNER_EMAILS` (optional), `AFFILIATE_*` overrides (optional — real
IDs are non-secret defaults in `affiliate-config.ts`; affiliate IDs are public
by nature, they appear in every emitted URL).

## Checklist for new endpoints

1. Auth: `requireAuth` unless deliberately public (then document why).
2. Ownership: if the resource has a `userId`, check it (`ownsItinerary` pattern).
3. Validation: Zod-parse the body/params — never bare `req.body` reads.
4. Rate limit: expensive (AI/external API) endpoints get `itineraryLimiter`-class
   limits; everything mutation-shaped is already under the global limiter.
5. Output: strip PII from anything reachable without a session (share/OG paths).
6. Logs: never log bodies, emails, tokens.
