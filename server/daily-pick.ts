// ─────────────────────────────────────────────────────────────────────────
// Daily pick — "una meta che ti somiglia" per la Home della dashboard.
// 100% deterministico e SENZA chiamate AI: aggrega gli snapshot del trait
// engine dell'utente, classifica il catalogo per coerenza numerica (i vettori
// attivati in 2A), esclude le mete già visitate e ne ruota una al giorno tra le
// top. Il "perché" è templato dai 2-3 assi più marcati del profilo.
// ─────────────────────────────────────────────────────────────────────────
import { storage } from "./storage";
import { destinationCatalog } from "./destination-catalog";
import { getDestinationTraitVector, destinationCoherence } from "./destination-traits";
import { fetchUnsplashHero } from "./unsplash";
import { emaAggregate, AXIS_NAMES, MAPPING_VERSION, type TraitVector, type Axis } from "@shared/traits";

// Per-destination hero, cached per day. The catalog stores a single frozen
// photo ID per destination, which over time reads as a tired/weak image. We
// instead pull a quality-filtered, popularity-ranked hero for the chosen
// destination (one Unsplash call per destination per day, memoised here) and
// fall back to the curated catalog URL whenever the API is unavailable.
const heroCache = new Map<string, string>();
async function dailyHero(name: string, dayKey: number, fallback: string): Promise<string> {
  const cacheKey = `${name}|${dayKey}`;
  const cached = heroCache.get(cacheKey);
  if (cached) return cached;
  let url = fallback;
  try {
    const hero = await fetchUnsplashHero(name);
    if (hero?.url) url = hero.url;
  } catch { /* keep the curated fallback */ }
  heroCache.set(cacheKey, url);
  if (heroCache.size > 64) heroCache.delete(heroCache.keys().next().value as string);
  return url;
}

export interface DailyPick {
  name: string;
  country: string;
  imageUrl: string;
  why: string;
  coherence: number;
}

function buildWhy(user: TraitVector, lang: "en" | "it"): string {
  const axes = (Object.keys(user) as Axis[])
    .map((ax) => ({ ax, v: user[ax], dist: Math.abs(user[ax] - 0.5) }))
    .sort((a, b) => b.dist - a.dist)
    .filter((x) => x.dist > 0.12)
    .slice(0, 3);
  const poles = axes.map((x) => {
    const L = AXIS_NAMES[x.ax];
    return lang === "it" ? (x.v < 0.5 ? L.it.left : L.it.right) : (x.v < 0.5 ? L.left : L.right);
  });
  if (poles.length === 0) {
    return lang === "it"
      ? "Una meta che risuona col tuo modo di viaggiare."
      : "A place that resonates with how you travel.";
  }
  return lang === "it"
    ? `Coerente con come viaggi: ${poles.join(", ")}.`
    : `Matches how you travel: ${poles.join(", ")}.`;
}

async function rankForUser(userId: number): Promise<{
  user: TraitVector;
  ranked: Array<{ d: typeof destinationCatalog[number]; score: number }>;
} | null> {
  const snaps = await storage.getTraitSnapshots(userId);
  const vecs = snaps
    .filter((s) => s.mappingVersion === MAPPING_VERSION)
    .map((s) => s.traits as TraitVector);
  if (vecs.length === 0) return null;
  const user = emaAggregate(vecs);

  const trips = await storage.getUserItineraries(userId);
  const visited = new Set(
    trips.map((t: any) => (t.destinationName || "").split(",")[0].trim().toLowerCase()).filter(Boolean),
  );

  const ranked = destinationCatalog
    .map((d) => {
      const v = getDestinationTraitVector(d.name);
      return v ? { d, score: destinationCoherence(user, v) } : null;
    })
    .filter((x): x is { d: typeof destinationCatalog[number]; score: number } => !!x)
    .filter((x) => !visited.has(x.d.name.split(",")[0].trim().toLowerCase()))
    .sort((a, b) => b.score - a.score);

  return ranked.length > 0 ? { user, ranked } : null;
}

function dayOfYear(): number {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0).getTime();
  return Math.floor((Date.now() - startOfYear) / 86400000);
}

export async function computeDailyPick(userId: number, lang: "en" | "it"): Promise<DailyPick | null> {
  const r = await rankForUser(userId);
  if (!r) return null;

  // Rotazione giornaliera stabile tra le top-5 (stesso pick per tutto il giorno).
  const top = r.ranked.slice(0, 5);
  const day = dayOfYear();
  const pick = top[day % top.length];

  return {
    name: pick.d.name,
    country: pick.d.country,
    imageUrl: await dailyHero(pick.d.name, day, pick.d.imageUrl),
    why: buildWhy(r.user, lang),
    coherence: Math.round(pick.score * 100) / 100,
  };
}

// ── "Recommended for you today" (home dashboard, 3 card) ────────────────
// Stesso motore del daily pick, esteso a N proposte: finestra rotante sulle
// top-8 così le card cambiano ogni giorno senza AI né costi. matchPct è la
// coerenza numerica dei vettori (0-100), MAI un numero inventato. Niente
// prezzi: non abbiamo un'API prezzi, quindi non li mostriamo (scelta 2026-07).
export interface DailyPickCard {
  name: string;
  country: string;
  region: string;
  imageUrl: string;
  matchPct: number;
  tags: string[];
}

export async function computeDailyPicks(
  userId: number,
  lang: "en" | "it",
  n = 3,
): Promise<{ picks: DailyPickCard[]; why: string } | null> {
  const r = await rankForUser(userId);
  if (!r) return null;

  const pool = r.ranked.slice(0, Math.max(n, 8));
  const day = dayOfYear();
  const chosen: typeof pool = [];
  for (let i = 0; i < pool.length && chosen.length < n; i++) {
    chosen.push(pool[(day + i * Math.max(1, Math.floor(pool.length / n))) % pool.length]);
  }
  // Dedup di sicurezza (la finestra rotante può collidere con pool piccoli).
  const seen = new Set<string>();
  const picks: DailyPickCard[] = [];
  for (const p of chosen) {
    if (seen.has(p.d.name)) continue;
    seen.add(p.d.name);
    picks.push({
      name: p.d.name,
      country: p.d.country,
      region: p.d.region,
      imageUrl: await dailyHero(p.d.name, day, p.d.imageUrl),
      matchPct: Math.round(p.score * 100),
      tags: (p.d.keywords || []).slice(0, 3),
    });
  }
  // Ordina per match discendente: la prima card è il "best match".
  picks.sort((a, b) => b.matchPct - a.matchPct);

  return { picks, why: buildWhy(r.user, lang) };
}
