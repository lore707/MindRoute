// ─────────────────────────────────────────────────────────────────────────
// Account "Atlante" — geolocates every place the user has generated an
// itinerary for, so the account map can plot their real travel footprint.
//
// Coordinates resolution, cheapest → most expensive:
//   1. recentDestinations table  — already maps destinationName → lat/lon
//      (written after every generation). A warm, persistent cache.
//   2. in-memory cache           — survives within the server process.
//   3. live geocode (geocode-place.ts, Nominatim area-filtered → Wikipedia
//      IT fallback) — capped + polite; results are persisted back
//      into recentDestinations with an OLD createdAt so they act purely as a
//      coord cache and never pollute the recency-based landing feed / matcher.
//
// On main all itineraries are v1 (no per-day coords), so a single destination
// centroid per trip is what we plot — exactly what a world atlas wants.
// ─────────────────────────────────────────────────────────────────────────

import { storage } from "./storage";
import { continentOf, continentLabel } from "./account-insights";
import { geocodeDestination } from "./geocode-place";

export interface AtlasPlace {
  name: string;             // short city label
  fullName: string;         // full destinationName
  lat: number;
  lng: number;
  trips: number;            // itineraries to this place
  days: number;             // total days across them
  lastDate: string | null;  // "mag 2026" / "May 2026" (per request lang)
  continent: string | null; // localized label
  heroImageUrl: string | null;
  href: string;             // most recent itinerary
}

export interface AtlasResponse {
  places: AtlasPlace[];
  unlocated: string[];
  stats: { trips: number; days: number; cities: number; continents: number };
}

const MONTH = {
  it: ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
};
function shortDate(iso: string | Date | null | undefined, lang: "en" | "it"): string | null {
  if (!iso) return null;
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${MONTH[lang][d.getMonth()]} ${d.getFullYear()}`;
}

function norm(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}
function cityOf(fullName: string): string {
  return fullName.split(",")[0].trim() || fullName.trim();
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// In-memory geocode cache (process lifetime). null = known-unresolvable.
const memCache = new Map<string, { lat: number; lng: number } | null>();

interface Group {
  fullName: string;
  city: string;
  trips: number;
  days: number;
  lastDate: string | null;
  continent: string | null;
  heroImageUrl: string | null;
  href: string;
  cacheDate: Date;          // date to persist a geocode miss under (old → out of feed)
}

const MAX_LIVE_GEOCODES = 12;

export async function buildAtlas(userId: number, lang: "en" | "it" = "it"): Promise<AtlasResponse> {
  const trips = await storage.getUserItineraries(userId); // desc by id (newest first)

  // ── group by destination (newest trip per group wins for hero/href/date) ──
  const groups = new Map<string, Group>();
  let totalDays = 0;
  const continentsAll = new Set<string>();

  for (const t of trips) {
    const full = (t.destinationName ?? "").trim();
    const dayCount = Array.isArray(t.days) ? t.days.length : 0;
    totalDays += dayCount;
    const cont = continentOf(t);
    if (cont) continentsAll.add(cont);
    if (!full) continue;

    const key = norm(full);
    const existing = groups.get(key);
    if (existing) {
      existing.trips += 1;
      existing.days += dayCount;
    } else {
      const created = t.createdAt ? new Date(t.createdAt) : null;
      groups.set(key, {
        fullName: full,
        city: cityOf(full),
        trips: 1,
        days: dayCount,
        lastDate: shortDate(t.createdAt, lang),
        continent: cont ? continentLabel(cont, lang) : null,
        heroImageUrl: t.heroImageUrl ?? null,
        href: `/itinerary/${t.id}`,
        cacheDate: created && !isNaN(created.getTime()) ? created : new Date(Date.now() - 90 * 86400_000),
      });
    }
  }

  // ── warm cache from recentDestinations (name → lat/lon) ──
  const known = new Map<string, { lat: number; lng: number }>();
  try {
    const { db } = await import("./db");
    const { recentDestinations } = await import("@shared/schema");
    const rows = await db
      .select({ name: recentDestinations.destinationName, lat: recentDestinations.lat, lon: recentDestinations.lon })
      .from(recentDestinations);
    for (const row of rows) {
      if (row.lat == null || row.lon == null) continue;
      known.set(norm(row.name), { lat: row.lat, lng: row.lon });
    }
  } catch (e) {
    console.warn("[atlas] recentDestinations cache read failed:", e);
  }

  const places: AtlasPlace[] = [];
  const unlocated: string[] = [];
  const toGeocode: Group[] = [];

  for (const g of Array.from(groups.values())) {
    const hit = known.get(norm(g.fullName)) ?? known.get(norm(g.city)) ?? memCache.get(norm(g.fullName));
    if (hit) {
      places.push(toPlace(g, hit));
    } else if (memCache.has(norm(g.fullName))) {
      unlocated.push(g.city); // previously failed to resolve
    } else {
      toGeocode.push(g);
    }
  }

  // ── live geocode the misses (capped + polite), persist as cold cache rows ──
  let budget = MAX_LIVE_GEOCODES;
  for (const g of toGeocode) {
    if (budget <= 0) { unlocated.push(g.city); continue; }
    budget -= 1;
    const hit = await geocodeDestination(g.fullName);
    const coords = hit ? { lat: hit.lat, lng: hit.lng } : null;
    memCache.set(norm(g.fullName), coords);
    if (coords) {
      places.push(toPlace(g, coords));
      void persistCoord(g.fullName, coords, hit!.flag, g.cacheDate);
    } else {
      unlocated.push(g.city);
    }
    await sleep(350); // be polite to Nominatim
  }

  // Stable order: most-visited then alphabetical.
  places.sort((a, b) => b.trips - a.trips || a.name.localeCompare(b.name));

  return {
    places,
    unlocated,
    stats: {
      trips: trips.length,
      days: totalDays,
      cities: groups.size,
      continents: continentsAll.size,
    },
  };
}

function toPlace(g: Group, coords: { lat: number; lng: number }): AtlasPlace {
  return {
    name: g.city,
    fullName: g.fullName,
    lat: coords.lat,
    lng: coords.lng,
    trips: g.trips,
    days: g.days,
    lastDate: g.lastDate,
    continent: g.continent,
    heroImageUrl: g.heroImageUrl,
    href: g.href,
  };
}

// Persist a freshly geocoded coordinate into recentDestinations as a cold cache
// row (old createdAt → never enters the 7-day landing feed or matcher freshness
// window). Best-effort; failure just means we geocode again next time.
async function persistCoord(name: string, coords: { lat: number; lng: number }, flag: string, when: Date): Promise<void> {
  try {
    const { db } = await import("./db");
    const { recentDestinations } = await import("@shared/schema");
    await db.insert(recentDestinations).values({
      destinationName: name,
      flag,
      lat: coords.lat,
      lon: coords.lng,
      createdAt: when,
    });
  } catch (e) {
    console.warn("[atlas] persistCoord failed:", e);
  }
}
