# SEO — Current state and opportunities

## What exists (verified 2026-07-06)

| Piece | Where | Notes |
|---|---|---|
| Default meta + OG + Twitter card | `client/index.html` between `<!--OG:START-->`/`<!--OG:END-->` markers | The markers are **load-bearing**: the server rewrites this block for share pages |
| Per-itinerary OG unfurl | `GET /i/:token` in `server/routes/itinerary-detail.ts` (prod only) | Injects title/description/branded OG image server-side because crawlers don't run JS |
| Branded OG card | `GET /og/itinerary/:token/og.png` (`server/og-card.ts`) | 1200×630 PNG rendered server-side, cached 24h |
| `robots.txt` | `client/public/` | Allow all, `Disallow: /api/`, sitemap pointer |
| `sitemap.xml` | `client/public/` | 3 URLs: `/`, `/come-funziona`, `/privacy` — **static, manually maintained** |
| `llms.txt` | `client/public/` | AI-crawler description of the product |
| Performance (SEO-relevant) | `index.html` pre-hero shell, preloaded LCP image, deferred gtag, code-split routes | Core Web Vitals are a ranking factor; see DECISIONS #10 before touching |

## Architectural reality to understand first

MindRoute is a **SPA behind auth for almost everything**. The only public,
indexable surfaces are: landing (`/`), `/come-funziona`, `/privacy`, and shared
itineraries (`/i/:token`). Itinerary content is personalized and gated — classic
content-SEO (destination pages) **does not exist yet** and would be a product
decision, not a patch (see Opportunities #1).

## Gaps / opportunities (prioritized)

1. **Public destination pages** (big lever): the 16-destination catalog +
   `destinations-feed` could render public, crawlable landing pages
   (`/destinations/lisbona`) with static content + CTA into the quiz. This is
   the only path to organic acquisition at scale; everything else is hygiene.
2. **`<html lang="en">` vs mostly-Italian content**: the shell claims English;
   the primary audience and much copy is Italian. Either serve `lang` from the
   i18n state at render or pick `it` as default. Affects hreflang eligibility.
3. **No canonical tags**: add `<link rel="canonical">` to the public routes
   (especially `/i/:token`, which is reachable via multiple hosts —
   onrender.com + mindroute.co both serve it; canonical should pin mindroute.co).
4. **No structured data**: JSON-LD `WebSite` + `Organization` on the landing;
   `TouristTrip` schema on shared itineraries is a natural fit.
5. **Sitemap is static**: fine for 3 URLs; if destination pages (#1) happen,
   generate it server-side.
6. **Duplicate-host indexing**: the Render `onrender.com` host serves the same
   app as `mindroute.co`. Add canonical (#3) or a host-level redirect on Render
   to avoid split indexing.
