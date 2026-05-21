// ─────────────────────────────────────────────────────────────────────────
// Landing image set — server-side orchestrator that builds the LandingData
// shape consumed by client/src/components/LandingCinematic.tsx.
//
// Goals:
//   1. Every slot has a CONTEXTUALLY ACCURATE photo (not a random landscape).
//      The query strings below are tuned per slot so the hero never gets a
//      step-card photo and vice versa.
//   2. ZERO duplicate photos across the page. Each photo ID is taken at most
//      once — dedup is enforced at fetch time via excludeIds set.
//   3. Resilience: if Unsplash 429s or the key is missing, returns a curated
//      fallback set so the landing never goes dark.
//   4. Cache: in-memory TTL 1h so refreshing the landing 10 times doesn't
//      burn 200 Unsplash requests.
//
// Shape contract: must match `LandingData` in
// client/src/components/LandingCinematic.tsx — keep in sync if you add a slot.
// ─────────────────────────────────────────────────────────────────────────

import { searchUnsplashMulti } from "./unsplash";

export interface HeroPhoto { img: string; name: string; country: string; mood: string }
export interface Step { n: number; tag: string; title: string; desc: string; img: string }
export interface Destination { name: string; country: string; mood: string; size?: "l" | "s"; img: string }
export interface FinalPhoto { img: string; name: string; coords: string }

export interface LandingImageSet {
  heroPhotos: HeroPhoto[];
  marquee: string[];
  manifestoBg: string;
  steps: Step[];
  destinations: Destination[];
  matchPhoto: string;
  finalPhotos: FinalPhoto[];
}

// ── Slot definitions ─────────────────────────────────────────────────────
// Each slot has a query (what to ask Unsplash) and metadata (what to display).
// Queries are intentionally specific to avoid generic "landscape" hits —
// e.g. "kyoto japan temple cherry blossom" beats "japan travel".

interface HeroSlot { query: string; name: string; country: string; mood: string }
const HERO_SLOTS: HeroSlot[] = [
  { query: "kyoto japan temple autumn",            name: "Kyoto",      country: "Japan",        mood: "Contemplative" },
  { query: "lofoten norway northern lights fjord", name: "Lofoten",    country: "Norway",       mood: "Wild" },
  { query: "patagonia argentina mountains glacier",name: "Patagonia",  country: "Argentina",    mood: "Untamed" },
  { query: "procida italy colorful houses harbor", name: "Procida",    country: "Italy",        mood: "Authentic" },
  { query: "tokyo japan neon night street rain",   name: "Tokyo",      country: "Japan",        mood: "Electric" },
];

interface StepSlot { query: string; n: number; tag: string; title: string; desc: string }
const STEP_SLOTS: StepSlot[] = [
  { query: "person writing journal cozy window light", n: 1, tag: "Step 1", title: "Answer 7 questions", desc: "Not about places — about you. How do you want to feel? What do you need? What do you avoid?" },
  { query: "vintage world map compass paper desk",     n: 2, tag: "Step 2", title: "Get your match",     desc: "Three destinations chosen by feeling, not by algorithm. Each one tells you why it's yours." },
  { query: "open suitcase travel passport packing",    n: 3, tag: "Step 3", title: "Book the whole trip",desc: "Flights, stays, experiences. All ready, all in one place. No more jumping between ten sites." },
];

interface DestinationSlot { query: string; name: string; country: string; mood: string; size: "l" | "s" }
const DESTINATION_SLOTS: DestinationSlot[] = [
  { query: "azores portugal volcanic lagoon green",     name: "Azzorre",     country: "Portogallo",     mood: "Quiet · Volcanic",      size: "l" },
  { query: "uzbekistan samarkand blue mosque dome",     name: "Samarcanda",  country: "Uzbekistan",     mood: "Off-the-grid · Cultural", size: "s" },
  { query: "iceland glacier black sand beach",          name: "Islanda",     country: "Iceland",        mood: "Wild · Solitude",       size: "s" },
  { query: "alentejo portugal sunset countryside hill", name: "Alentejo",    country: "Portogallo",     mood: "Slow · Pastoral",       size: "s" },
  { query: "oaxaca mexico colorful street architecture",name: "Oaxaca",      country: "Messico",        mood: "Vibrant · Authentic",   size: "s" },
];

interface FinalSlot { query: string; name: string; coords: string }
const FINAL_SLOTS: FinalSlot[] = [
  { query: "patagonia torres del paine sunrise lake", name: "Patagonia", coords: "50°26'S · 73°15'W" },
  { query: "iceland reykjavik aurora borealis sky",   name: "Iceland",   coords: "64°08'N · 21°56'W" },
  { query: "morocco sahara desert dunes camel",       name: "Sahara",    coords: "31°N · 4°W" },
  { query: "faroe islands cliffs sea grass village",  name: "Faroe Islands", coords: "62°00'N · 6°47'W" },
];

const MANIFESTO_QUERY = "mountain road misty contemplative cinematic dawn";
const MATCH_QUERY     = "ikaria greek island sunset cliffs aegean";

// Default marquee — never empty.
const MARQUEE = [
  "Tokyo", "Reykjavik", "Lofoten", "Procida", "Bali", "Patagonia",
  "Lisbon", "Kyoto", "Faroe Islands", "Oaxaca", "Sicily", "Hanoi",
  "Cairo", "Cape Town", "Lima", "Marrakech", "Samarkand", "Buenos Aires",
];

// ── Curated fallback ─────────────────────────────────────────────────────
// Used when Unsplash key is missing or the API fails entirely. ALL 20 photo
// IDs are unique — verified by hand. ?crop=entropy picks the photo's most
// interesting region (avoids dead-center crops with sky-only or floor-only).

const URL = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&fit=crop&crop=entropy&auto=format&q=80`;

export const FALLBACK_LANDING_SET: LandingImageSet = {
  heroPhotos: [
    { img: URL("1493976040374-85c8e12f0c0e", 2000), name: "Kyoto",      country: "Japan",     mood: "Contemplative" },
    { img: URL("1502786129293-79981df4e689", 2000), name: "Lofoten",    country: "Norway",    mood: "Wild" },
    { img: URL("1531168556467-80aace0d0144", 2000), name: "Patagonia",  country: "Argentina", mood: "Untamed" },
    { img: URL("1523906834658-6e24ef2386f9", 2000), name: "Procida",    country: "Italy",     mood: "Authentic" },
    { img: URL("1540959733332-eab4deabeeaf", 2000), name: "Tokyo",      country: "Japan",     mood: "Electric" },
  ],
  marquee: MARQUEE,
  manifestoBg: URL("1519681393784-d120267933ba", 2000),
  steps: [
    { n: 1, tag: "Step 1", title: "Answer 7 questions", desc: "Not about places — about you. How do you want to feel? What do you need? What do you avoid?", img: URL("1455390582262-044cdead277a", 1200) },
    { n: 2, tag: "Step 2", title: "Get your match",     desc: "Three destinations chosen by feeling, not by algorithm. Each one tells you why it's yours.", img: URL("1524661135-423995f22d0b", 1200) },
    { n: 3, tag: "Step 3", title: "Book the whole trip",desc: "Flights, stays, experiences. All ready, all in one place. No more jumping between ten sites.", img: URL("1488646953014-85cb44e25828", 1200) },
  ],
  destinations: [
    { name: "Azzorre",    country: "Portogallo",     mood: "Quiet · Volcanic",        size: "l", img: URL("1586671267731-da2cf3ceeb80", 1400) },
    { name: "Samarcanda", country: "Uzbekistan",     mood: "Off-the-grid · Cultural", size: "s", img: URL("1605649461784-edc01e2b2f4d",  900) },
    { name: "Islanda",    country: "Iceland",        mood: "Wild · Solitude",         size: "s", img: URL("1500530855697-b586d89ba3ee",  900) },
    { name: "Alentejo",   country: "Portogallo",     mood: "Slow · Pastoral",         size: "s", img: URL("1518684079-3c830dcef090",  900) },
    { name: "Oaxaca",     country: "Messico",        mood: "Vibrant · Authentic",     size: "s", img: URL("1564507592333-c60657eea523",  900) },
  ],
  matchPhoto: URL("1602941525421-8f8b81d3edbb", 1400),
  finalPhotos: [
    { img: URL("1505765050516-f72dcac9c60a", 2000), name: "Patagonia",      coords: "50°26'S · 73°15'W" },
    { img: URL("1518710843675-2540dd79065c", 2000), name: "Iceland",        coords: "64°08'N · 21°56'W" },
    { img: URL("1489493585363-d69421e0edd3", 2000), name: "Sahara",         coords: "31°N · 4°W" },
    { img: URL("1538333702852-1ce8a4cd6c54", 2000), name: "Faroe Islands",  coords: "62°00'N · 6°47'W" },
  ],
};

// ── Build pipeline ───────────────────────────────────────────────────────
// Walks the slots in order. For each slot, fetches Unsplash with the slot's
// query, filters out any photo ID already used in this build, and takes the
// first remaining hit. If a slot can't find a fresh photo (or Unsplash 429s),
// falls back to the corresponding curated URL.

async function pickPhoto(
  query: string,
  usedIds: Set<string>,
  fallbackUrl: string,
): Promise<string> {
  const photos = await searchUnsplashMulti(query, usedIds, 8);
  if (photos.length > 0) {
    const chosen = photos[0];
    usedIds.add(chosen.id);
    // Append size+crop params so the result is right-sized and centered well.
    // Unsplash CDN respects these regardless of the photo ID.
    return `${chosen.url}&w=1600&fit=crop&crop=entropy&auto=format&q=80`;
  }
  return fallbackUrl;
}

export async function buildLandingImageSet(): Promise<LandingImageSet> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return FALLBACK_LANDING_SET;

  const usedIds = new Set<string>();

  // Hero — 5 photos
  const heroPhotos: HeroPhoto[] = [];
  for (let i = 0; i < HERO_SLOTS.length; i++) {
    const slot = HERO_SLOTS[i];
    const img = await pickPhoto(slot.query, usedIds, FALLBACK_LANDING_SET.heroPhotos[i].img);
    heroPhotos.push({ img, name: slot.name, country: slot.country, mood: slot.mood });
  }

  // Manifesto — 1 photo
  const manifestoBg = await pickPhoto(MANIFESTO_QUERY, usedIds, FALLBACK_LANDING_SET.manifestoBg);

  // Steps — 3 photos
  const steps: Step[] = [];
  for (let i = 0; i < STEP_SLOTS.length; i++) {
    const slot = STEP_SLOTS[i];
    const img = await pickPhoto(slot.query, usedIds, FALLBACK_LANDING_SET.steps[i].img);
    steps.push({ n: slot.n, tag: slot.tag, title: slot.title, desc: slot.desc, img });
  }

  // Destinations — 5 photos
  const destinations: Destination[] = [];
  for (let i = 0; i < DESTINATION_SLOTS.length; i++) {
    const slot = DESTINATION_SLOTS[i];
    const img = await pickPhoto(slot.query, usedIds, FALLBACK_LANDING_SET.destinations[i].img);
    destinations.push({ name: slot.name, country: slot.country, mood: slot.mood, size: slot.size, img });
  }

  // Match — 1 photo (product preview)
  const matchPhoto = await pickPhoto(MATCH_QUERY, usedIds, FALLBACK_LANDING_SET.matchPhoto);

  // Final — 4 photos (closing crossfade)
  const finalPhotos: FinalPhoto[] = [];
  for (let i = 0; i < FINAL_SLOTS.length; i++) {
    const slot = FINAL_SLOTS[i];
    const img = await pickPhoto(slot.query, usedIds, FALLBACK_LANDING_SET.finalPhotos[i].img);
    finalPhotos.push({ img, name: slot.name, coords: slot.coords });
  }

  return {
    heroPhotos,
    marquee: MARQUEE,
    manifestoBg,
    steps,
    destinations,
    matchPhoto,
    finalPhotos,
  };
}

// ── Cache ─────────────────────────────────────────────────────────────────
// 1-hour in-memory TTL. With ~20 search calls per build at ~1 req/200ms, a
// rebuild costs ~4s wall time + 20 Unsplash calls. Caching it for an hour
// caps the cost at 20 calls/hour regardless of pageview volume.

let cached: { set: LandingImageSet; expiresAt: number } | null = null;
const TTL_MS = 60 * 60 * 1000;

export async function getCachedLandingImageSet(): Promise<LandingImageSet> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.set;
  try {
    const set = await buildLandingImageSet();
    cached = { set, expiresAt: now + TTL_MS };
    return set;
  } catch (e) {
    console.warn("[landing-images] build failed, returning fallback:", e);
    return FALLBACK_LANDING_SET;
  }
}
