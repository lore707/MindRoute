// Google Places grounding — the ONLY honest source for opening hours and price
// level. Everything here is DORMANT unless GOOGLE_PLACES_API_KEY is set: with no
// key, groundPlace() returns null and the itinerary degrades to the qualitative,
// model-written text (which, per the Fase 1b prompt gate, no longer invents exact
// hours/prices). This means facts shown to the user as precise are sourced, never
// hallucinated. Wire it in freely — it cannot fire in an environment without the
// key, so it is safe on the live path until billing is provisioned.

export type PlaceGrounding = {
  name: string;
  /** Google price_level 0–4 → rendered as €…€€€€. Undefined when unknown. */
  priceLevel?: number;
  /** True/false from the live "open_now"; undefined when Google has no hours. */
  openNow?: boolean;
  /** Human weekday_text lines ("Monday: 9:00 AM – 5:00 PM"). Undefined if none. */
  hours?: string[];
};

const KEY = process.env.GOOGLE_PLACES_API_KEY;

// Same cache discipline as geocode: place facts are stable for days, the API bills
// per request, so we memoize hits AND misses. Hours/openNow drift, so a shorter TTL.
const cache = new Map<string, { v: PlaceGrounding | null; ts: number }>();
const TTL_MS = 6 * 60 * 60 * 1000; // 6h — opening hours are stable enough intra-day

/**
 * Resolve real opening hours + price level for a named place. Returns null when
 * the key is absent, the place is not found, or the API errors — callers must
 * treat null as "no grounded facts, fall back to qualitative text".
 */
export async function groundPlace(query: string): Promise<PlaceGrounding | null> {
  if (!KEY) return null;
  const key = query.trim().toLowerCase();
  if (!key) return null;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < TTL_MS) return hit.v;

  try {
    // 1) Text Search → place_id of the best match.
    const searchUrl =
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${KEY}`;
    const sr = await fetch(searchUrl);
    const sd = await sr.json();
    const top = sd?.results?.[0];
    if (!top?.place_id) {
      cache.set(key, { v: null, ts: Date.now() });
      return null;
    }

    // 2) Place Details → opening_hours + price_level (minimal field mask = lower bill).
    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${top.place_id}` +
      `&fields=name,price_level,opening_hours&key=${KEY}`;
    const dr = await fetch(detailsUrl);
    const dd = await dr.json();
    const r = dd?.result;
    const v: PlaceGrounding = {
      name: r?.name ?? top.name ?? query,
      priceLevel: typeof r?.price_level === "number" ? r.price_level : undefined,
      openNow: typeof r?.opening_hours?.open_now === "boolean" ? r.opening_hours.open_now : undefined,
      hours: Array.isArray(r?.opening_hours?.weekday_text) ? r.opening_hours.weekday_text : undefined,
    };
    cache.set(key, { v, ts: Date.now() });
    return v;
  } catch {
    cache.set(key, { v: null, ts: Date.now() });
    return null;
  }
}

/** Cheap guard so callers can skip the whole grounding pass when disabled. */
export const placesEnabled = (): boolean => !!KEY;
