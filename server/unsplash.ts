/**
 * Unsplash image-fetching helpers and a bounded-concurrency utility.
 *
 * Pipeline contract (do NOT regress):
 *   - Hero: `fetchUnsplashHero(destinationName)` returns one curated photo for
 *     the destination, falling back through a query cascade.
 *   - Day:  `fetchDayImageWithFallback(query, destinationName)` returns one
 *     real photo per itinerary day, falling back if the LLM's query is too
 *     specific. Retries on 429/5xx with exponential backoff. Returns null
 *     only after all stages + retries exhausted — caller must use the hero
 *     URL as final safety net so users never see a missing photo.
 *   - Concurrency: `mapWithConcurrency` staggers 7 day-fetches into 3-wide
 *     waves to stay under Unsplash's per-second burst throttle.
 */

/**
 * Pick the best photo out of a relevance-ordered Unsplash result set.
 *
 * Unsplash already sorts `search` by relevance, so blindly taking results[0]
 * gives the most-on-topic photo — but often a mediocre/awkward one. We keep
 * relevance by only looking at the top few, then prefer the most-liked among
 * them (likes are a solid proxy for "polished, well-composed, not junk").
 * Photos with almost no engagement are skipped unless nothing better exists.
 */
function pickBestPhoto<T extends { likes?: number }>(results: T[] | undefined): T | null {
  if (!Array.isArray(results) || results.length === 0) return null;
  const top = results.slice(0, 5);
  // Highest-liked within the top relevance band.
  const best = top.reduce((b, p) => ((p?.likes ?? 0) > (b?.likes ?? 0) ? p : b), top[0]);
  return best ?? top[0];
}

// Unsplash quality/safety filter — keeps out flagged/low-grade content.
const QUALITY = "content_filter=high";

export async function fetchUnsplashHero(destinationName: string): Promise<{ url: string; photographer: string; photographerUrl: string } | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  // Build multiple query variants from most specific to most generic
  const parts = destinationName.split(",").map(s => s.trim());
  const city = parts[0] ?? destinationName;
  const country = parts[1] ?? "";

  const queries = [
    `${city} ${country} landscape`.trim(),
    `${city} travel`.trim(),
    `${city} beach ocean nature`.trim(),
    `${country} landscape travel`.trim(),
    `${country} nature`.trim(),
  ].filter(q => q.length > 3);

  const uniqueQueries = Array.from(new Set(queries));

  async function searchUnsplash(query: string): Promise<{ url: string; photographer: string; photographerUrl: string } | null> {
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=8&${QUALITY}`,
        { headers: { Authorization: `Client-ID ${key}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const photo = pickBestPhoto(data.results as any[]);
        if (!photo) return null;
        // Build a right-sized hero (~1600px webp) from `raw` instead of `full`
        // (which is multi-MB) — same photo, a fraction of the bytes.
        const raw = photo.urls?.raw as string | undefined;
        const url = raw
          ? `${raw}${raw.includes("?") ? "&" : "?"}w=1600&q=80&auto=format&fit=crop`
          : (photo.urls?.regular ?? photo.urls?.full ?? null);
        if (!url) return null;
        return {
          url,
          photographer: photo.user?.name ?? "Unknown",
          photographerUrl: photo.user?.links?.html ?? "https://unsplash.com",
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  for (const query of uniqueQueries) {
    const result = await searchUnsplash(query);
    if (result) return result;
  }

  // Fallback GEO-coerente: il nome città/paese nudo quasi sempre rende qualcosa
  // sul posto. Niente più "tropical island paradise" (dava spiagge a caso anche
  // per Reykjavík → immagini nonsense).
  if (city) { const r = await searchUnsplash(city); if (r) return r; }
  if (country) { const r = await searchUnsplash(country); if (r) return r; }
  return null;
}

/**
 * Costruisce un POOL di foto reali DISTINTE per una destinazione, in poche
 * chiamate (per_page alto), deduplicate per ID. Serve ad assegnare un'immagine
 * DIVERSA a hero + ogni card-giorno senza ripetizioni e con poche richieste
 * (vs decine di search per_page=1 che ritornano lo stesso top-result e
 * saturano il rate-limit del free tier). Query CONCRETE (città/paese), così le
 * foto sono sempre on-topic. Ogni url è già dimensionato a ~1080px.
 */
export async function buildDestinationPhotoPool(
  destinationName: string,
  want = 24,
): Promise<Array<{ id: string; url: string }>> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const parts = destinationName.split(",").map(s => s.trim());
  const city = parts[0] ?? destinationName;
  const country = parts[1] ?? "";
  const queries = [
    `${city} ${country}`.trim(),
    `${city} cityscape`.trim(),
    `${city} landmark`.trim(),
    `${city} street`.trim(),
    `${city} nature landscape`.trim(),
    `${country} landscape travel`.trim(),
  ].filter(q => q.length > 2);

  const used = new Set<string>();
  const pool: Array<{ id: string; url: string }> = [];
  for (const q of queries) {
    if (pool.length >= want) break;
    const photos = await searchUnsplashMulti(q, used, 12);
    for (const p of photos) {
      if (used.has(p.id)) continue;
      used.add(p.id);
      pool.push({ id: p.id, url: p.url });
    }
  }
  return pool;
}

/**
 * Fetch a real Unsplash image for a single itinerary day.
 *
 * Resilience layered on top of a 3-stage query cascade:
 *   - retries 429 / 5xx with exponential backoff (1s, 2s, 4s) — short bursts
 *     during Promise.all of 7 days were silently 429ing and leaving days
 *     without images.
 *   - logs every transient failure so we can see rate-limit pressure in
 *     production rather than discovering it only in user reports.
 *   - returns null only after all stages + all retries exhausted; the
 *     caller is expected to fall back to the hero image as a final safety
 *     net so the user never sees a missing photo.
 */
export async function fetchDayImageWithFallback(query: string | null | undefined, destinationName: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const city = (destinationName || "").split(",")[0].trim();

  const tryQuery = async (q: string): Promise<string | null> => {
    if (!q || q.trim().length < 2) return null;
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q.trim())}&orientation=landscape&per_page=5&${QUALITY}`;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
        if (r.ok) {
          const d = await r.json();
          return pickBestPhoto(d.results as any[])?.urls?.regular ?? null;
        }
        if (r.status === 429 || r.status >= 500) {
          if (attempt < 2) {
            console.warn(`[unsplash] ${r.status} on "${q}", retrying in ${1000 * Math.pow(2, attempt)}ms (attempt ${attempt + 1}/3)`);
            await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt)));
            continue;
          }
          console.warn(`[unsplash] ${r.status} on "${q}" — gave up after 3 attempts`);
        }
        return null;
      } catch (e) {
        if (attempt < 2) {
          await new Promise(res => setTimeout(res, 1000 * Math.pow(2, attempt)));
          continue;
        }
        console.warn(`[unsplash] network error on "${q}":`, e instanceof Error ? e.message : e);
        return null;
      }
    }
    return null;
  };

  if (city && query) {
    const url = await tryQuery(`${city} ${query}`);
    if (url) return url;
  }
  if (query) {
    const url = await tryQuery(query);
    if (url) return url;
  }
  if (city) {
    const url = await tryQuery(`${city} travel landscape`);
    if (url) return url;
  }
  return null;
}

/**
 * Fetch a real Unsplash image for a single moment (v2 schema).
 *
 * Query cascade tuned for moment specificity:
 *   1. `${city} ${location_name} ${type}` — most specific (location + activity)
 *   2. `${city} ${location_name}` — location alone
 *   3. `${city} ${type}` — destination + activity type
 *   4. `${city} travel landscape` — final fallback
 *
 * Returns null only if all stages + all retries fail. Caller should fall back
 * to the day's hero image so the moment never renders without a photo.
 */
export async function fetchMomentImage(
  locationName: string | null | undefined,
  type: string | null | undefined,
  destinationName: string,
): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const city = (destinationName || "").split(",")[0].trim();

  // Build a moment-specific query. Map abstract types to query words that
  // Unsplash actually has photos for ("rest" and "walk" return junk; biased
  // alternatives below land on usable scenes).
  const typeQueryMap: Record<string, string> = {
    transport: "airport flight",
    accommodation: "hotel room",
    food: "restaurant food",
    experience: "tour activity",
    walk: "street neighborhood",
    view: "viewpoint sunset",
    rest: "cafe relaxation",
  };
  const typeQuery = type ? (typeQueryMap[type] ?? type) : "";

  const queries: string[] = [];
  if (city && locationName) queries.push(`${city} ${locationName} ${typeQuery}`.trim());
  if (city && locationName) queries.push(`${city} ${locationName}`.trim());
  if (city && typeQuery) queries.push(`${city} ${typeQuery}`.trim());
  queries.push(`${city} travel landscape`.trim());

  for (const q of queries.filter(s => s.length > 3)) {
    const url = await fetchDayImageWithFallback(q, destinationName);
    if (url) return url;
  }
  return null;
}

/**
 * Search Unsplash and return multiple distinct photos, filtering out any photo
 * IDs already used. Used by the landing-images pipeline to guarantee zero
 * duplicates across the page even when adjacent queries return overlapping
 * results.
 *
 * Returns shape includes the photo `id` so the caller can track which photos
 * are already taken across the full landing build.
 */
export async function searchUnsplashMulti(
  query: string,
  excludeIds: ReadonlySet<string>,
  perPage = 8,
): Promise<Array<{ id: string; url: string; photographer: string; photographerUrl: string }>> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=landscape&per_page=${perPage}&${QUALITY}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
      if (r.ok) {
        const d = await r.json();
        const photos = (d.results ?? []) as Array<any>;
        return photos
          .map(p => ({
            id: p.id as string,
            url: (p.urls?.regular ?? p.urls?.full) as string,
            photographer: (p.user?.name ?? "Unknown") as string,
            photographerUrl: (p.user?.links?.html ?? "https://unsplash.com") as string,
          }))
          .filter(p => !!p.id && !!p.url && !excludeIds.has(p.id));
      }
      if (r.status === 429 || r.status >= 500) {
        if (attempt < 2) {
          await new Promise(res => setTimeout(res, 800 * Math.pow(2, attempt)));
          continue;
        }
        console.warn(`[unsplash] multi-search ${r.status} on "${query}" — gave up`);
      }
      return [];
    } catch (e) {
      if (attempt < 2) {
        await new Promise(res => setTimeout(res, 800 * Math.pow(2, attempt)));
        continue;
      }
      console.warn(`[unsplash] multi-search network error on "${query}":`, e instanceof Error ? e.message : e);
      return [];
    }
  }
  return [];
}

/**
 * Run async tasks with a bounded concurrency cap, instead of `Promise.all` which
 * fires them all simultaneously. Used to avoid burst-rate-limiting Unsplash with
 * 7 day-image fetches in parallel — at 3-wide we stagger naturally over ~1.5s
 * and stay below the per-second throttle that returns 429s.
 */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
