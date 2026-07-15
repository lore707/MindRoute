// ─────────────────────────────────────────────────────────────────────────
// Daily Compass — la home non chiede "vuoi un itinerario?", dice "ho
// osservato qualcosa su di te". Card generate da SEGNALI REALI, zero AI:
//   · temporalità (meteo vero a casa, stagione)
//   · pattern del profilo (monotonia di continente, fughe sempre brevi)
//   · contraddizioni (tratti dichiarati vs comportamento)
//   · memoria (un viaggio di ~un anno fa)
//   · capitoli mancanti (continenti mai toccati)
//   · ultime interazioni (momenti cuorati di recente)
// 5 TIPI con comportamenti diversi al click (gestiti dal client):
//   reflection → micro-conversazione inline (risposta salvata in
//                compass_signals), discovery → mostra una meta e basta,
//   growth → sfida (pre-compila l'override di "Genera dal profilo"),
//   memory → riapre un vecchio itinerario, journey → genera.
// Cadenza: stabile per l'intera giornata (seed = giorno dell'anno) MA
// event-based: il seed include i conteggi di viaggi/momenti/segnali, quindi
// concludere un viaggio, cuorare un momento o rispondere a una card
// rimescola la selezione. Le reflection già risposte negli ultimi 20 giorni
// non vengono riproposte.
// ─────────────────────────────────────────────────────────────────────────
import { storage } from "./storage";
import { db } from "./db";
import { compassSignals } from "@shared/schema";
import { and, eq, gte } from "drizzle-orm";
import { emaAggregate, MAPPING_VERSION, type TraitVector } from "@shared/traits";
import { computeAccountInsights, continentOf, continentLabel, type Continent } from "./account-insights";
import { destinationCatalog } from "./destination-catalog";
import { getDestinationTraitVector, destinationCoherence } from "./destination-traits";
import { computeProfileDefaults } from "./profile-defaults";
import { geocodeDestination } from "./geocode-place";

type Lang = "en" | "it";

export interface CompassCard {
  id: string;      // id semantico stabile (chiave di compass_signals)
  type: "reflection" | "discovery" | "growth" | "memory" | "journey";
  icon: string;
  title: string;
  sub?: string;
  // reflection
  question?: string;
  options?: string[];
  // discovery
  destination?: { name: string; country: string; imageUrl: string; matchPct: number | null };
  // growth → testo che pre-compila contextOverride di "Genera dal profilo"
  challenge?: string;
  // memory
  href?: string;
}

interface Candidate { card: CompassCard; priority: number }

const bi = (lang: Lang, en: string, it: string) => (lang === "it" ? it : en);

// Meteo a casa (partenza abituale) — cache 30 min per utente.
const homeWxCache = new Map<number, { at: number; wx: { tempC: number; code: number; city: string } | null }>();
async function homeWeather(userId: number): Promise<{ tempC: number; code: number; city: string } | null> {
  const hit = homeWxCache.get(userId);
  if (hit && Date.now() - hit.at < 30 * 60_000) return hit.wx;
  let wx: { tempC: number; code: number; city: string } | null = null;
  try {
    const departure = (await computeProfileDefaults(userId)).departure?.trim();
    if (departure) {
      const geo = await geocodeDestination(departure);
      if (geo) {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lng}&current=temperature_2m,weather_code&timezone=auto`,
          { signal: AbortSignal.timeout(5000) },
        );
        if (r.ok) {
          const j = await r.json() as any;
          if (typeof j?.current?.temperature_2m === "number") {
            wx = { tempC: Math.round(j.current.temperature_2m), code: j.current.weather_code ?? 0, city: departure };
          }
        }
      }
    }
  } catch { /* niente card meteo */ }
  homeWxCache.set(userId, { at: Date.now(), wx });
  if (homeWxCache.size > 500) homeWxCache.delete(homeWxCache.keys().next().value as number);
  return wx;
}

// Miglior meta del catalogo in un continente, per coerenza col vettore utente.
function pickInContinent(user: TraitVector | null, region: string) {
  const pool = destinationCatalog.filter(d => d.region === region);
  if (pool.length === 0) return null;
  if (!user) return { d: pool[0], score: null as number | null };
  let best: { d: typeof pool[number]; score: number } | null = null;
  for (const d of pool) {
    const v = getDestinationTraitVector(d.name);
    if (!v) continue;
    const s = destinationCoherence(user, v);
    if (!best || s > best.score) best = { d, score: s };
  }
  return best ?? { d: pool[0], score: null };
}

function dayOfYear(): number {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  return Math.floor((Date.now() - start) / 86400000);
}

export async function computeCompass(userId: number, lang: Lang): Promise<{ cards: CompassCard[] }> {
  const [trips, snaps, moments] = await Promise.all([
    storage.getUserItineraries(userId),
    storage.getTraitSnapshots(userId),
    storage.getSavedMoments(userId).catch(() => []),
  ]);
  const vecs = snaps.filter(s => s.mappingVersion === MAPPING_VERSION).map(s => s.traits as TraitVector);
  const user = vecs.length > 0 ? emaAggregate(vecs) : null;
  const { patterns } = computeAccountInsights(trips, lang);

  // Reflection già risposte di recente → non riproporle.
  let answered = new Set<string>();
  let signalCount = 0;
  try {
    const since = new Date(Date.now() - 20 * 24 * 3600_000);
    const rows = await db.select().from(compassSignals)
      .where(and(eq(compassSignals.userId, userId), gte(compassSignals.createdAt, since)));
    answered = new Set(rows.map(r => r.cardId));
    signalCount = rows.length;
  } catch { /* tabella non ancora pushata → nessun filtro, degrada pulito */ }

  const C: Candidate[] = [];

  // ── 1. Temporalità: meteo vero a casa ──────────────────────────────────
  const wx = await homeWeather(userId);
  if (wx) {
    const grey = wx.code >= 51 || (wx.code === 3 && wx.tempC < 16);
    const cold = wx.tempC <= 6;
    const hot = wx.tempC >= 31;
    if (grey && !answered.has("weather-grey")) {
      C.push({ priority: 90, card: {
        id: "weather-grey", type: "reflection", icon: "🌧",
        title: bi(lang, "Escaping grey skies?", "In fuga dal grigio?"),
        sub: bi(lang, `It's raining on ${wx.city}. What's missing today?`, `Su ${wx.city} piove. Cosa ti manca oggi?`),
        question: bi(lang, "What's missing today?", "Cosa ti manca oggi?"),
        options: lang === "it"
          ? ["Silenzio", "Orizzonte", "Nuotare", "Calore"]
          : ["Silence", "Horizon", "Swimming", "Warmth"],
      }});
    } else if (cold) {
      C.push({ priority: 85, card: {
        id: "weather-cold", type: "journey", icon: "❄️",
        title: bi(lang, `${wx.tempC}° in ${wx.city}.`, `${wx.tempC}° a ${wx.city}.`),
        sub: bi(lang, "This weather deserves an escape. Generate one.", "Questo meteo merita una fuga. Generala."),
      }});
    } else if (hot) {
      const north = pickInContinent(user, "europe");
      if (north) {
        C.push({ priority: 70, card: {
          id: "weather-hot", type: "discovery", icon: "🌡",
          title: bi(lang, `${wx.tempC}° in ${wx.city}. Need air?`, `${wx.tempC}° a ${wx.city}. Serve aria?`),
          sub: bi(lang, "Look at this. No pressure.", "Guarda questa. Senza impegno."),
          destination: { name: north.d.name, country: north.d.country, imageUrl: north.d.imageUrl, matchPct: north.score ? Math.round(north.score * 100) : null },
        }});
      }
    }
  }

  // ── 2. Pattern: monotonia di continente / fughe sempre brevi ───────────
  if (patterns.topContinent && patterns.topContinentRatio != null && patterns.topContinentRatio >= 0.7 && patterns.tripCount >= 4) {
    const cont = patterns.topContinent;
    C.push({ priority: 80, card: {
      id: `monotony-${cont}`, type: "growth", icon: "🧭",
      title: bi(lang, `Almost every trip: ${cont}.`, `Quasi ogni viaggio: ${cont}.`),
      sub: bi(lang, "You've been choosing comfort lately. Challenge the routine?", "Ultimamente scegli il comfort. Sfidiamo la routine?"),
      challenge: bi(lang,
        `A continent I've never touched, nothing famous. Get me out of ${cont}.`,
        `Un continente mai toccato, niente mete famose. Portami fuori da ${cont}.`),
    }});
  }
  if (patterns.shortTripBias && patterns.tripCount >= 3 && !answered.has("short-bias")) {
    C.push({ priority: 60, card: {
      id: "short-bias", type: "growth", icon: "⏳",
      title: bi(lang, "Always quick escapes.", "Sempre fughe brevi."),
      sub: bi(lang, "What if this time you stayed?", "E se stavolta restassi?"),
      challenge: bi(lang,
        "At least 10 days, one single base, no rushing.",
        "Almeno 10 giorni, una sola base, nessuna corsa."),
    }});
  }

  // ── 3. Contraddizione: tratti dichiarati vs comportamento ──────────────
  if (user && user.exposure >= 0.65 && patterns.topContinent && (patterns.topContinentRatio ?? 0) >= 0.75 && patterns.tripCount >= 4) {
    C.push({ priority: 75, card: {
      id: "contradiction-offbeat", type: "growth", icon: "🪞",
      title: bi(lang, "You say you crave the unexpected.", "Dici di cercare l'inatteso."),
      sub: bi(lang,
        `Yet you keep returning to ${patterns.topContinent}. Interesting contradiction — explore it?`,
        `Eppure torni sempre in ${patterns.topContinent}. Contraddizione interessante — la esploriamo?`),
      challenge: bi(lang,
        "Surprise me for real: somewhere I'd never pick myself.",
        "Sorprendimi davvero: un posto che non sceglierei mai da solo."),
    }});
  }

  // ── 4. Memoria: un viaggio di ~un anno fa (o il più vecchio) ───────────
  const dated = trips
    .map(t => ({ t, at: t.createdAt ? new Date(t.createdAt).getTime() : NaN }))
    .filter(x => Number.isFinite(x.at))
    .sort((a, b) => a.at - b.at);
  const yearAgo = Date.now() - 365 * 24 * 3600_000;
  const memoryTrip =
    dated.find(x => Math.abs(x.at - yearAgo) < 45 * 24 * 3600_000)
    ?? (dated[0] && Date.now() - dated[0].at > 180 * 24 * 3600_000 ? dated[0] : undefined);
  if (memoryTrip) {
    const name = (memoryTrip.t.destinationName || "").split(",")[0];
    const months = Math.max(1, Math.round((Date.now() - memoryTrip.at) / (30 * 24 * 3600_000)));
    C.push({ priority: 65, card: {
      id: `memory-${memoryTrip.t.id}`, type: "memory", icon: "🕰",
      title: bi(lang, `${months} months ago: ${name}.`, `${months} mesi fa: ${name}.`),
      sub: bi(lang, "How has your way of travelling changed since?", "Com'è cambiato il tuo modo di viaggiare, da allora?"),
      href: `/itinerary/${memoryTrip.t.id}`,
    }});
  }

  // ── 5. Capitolo mancante: continenti mai toccati ───────────────────────
  const visited = new Set(trips.map(t => continentOf(t)).filter(Boolean) as Continent[]);
  const REGION_OF: Partial<Record<Continent, string>> = { asia: "asia", africa: "africa", americas: "americas", oceania: "oceania" };
  for (const cont of ["asia", "africa", "americas", "oceania"] as Continent[]) {
    if (visited.has(cont) || trips.length < 2) continue;
    const pick = pickInContinent(user, REGION_OF[cont]!);
    if (!pick) continue;
    C.push({ priority: 55, card: {
      id: `unexplored-${cont}`, type: "discovery", icon: "📖",
      title: bi(lang, `A missing chapter: ${continentLabel(cont, "en")}.`, `Un capitolo mancante: ${continentLabel(cont, "it")}.`),
      sub: bi(lang, "Just look. No pressure.", "Guarda e basta. Senza impegno."),
      destination: { name: pick.d.name, country: pick.d.country, imageUrl: pick.d.imageUrl, matchPct: pick.score ? Math.round(pick.score * 100) : null },
    }});
    break; // una sola per giorno
  }

  // ── 6. Ultima interazione: momento cuorato di recente ──────────────────
  const lastMoment = [...moments]
    .filter(m => m.momentSnapshot?.title)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  if (lastMoment && Date.now() - new Date(lastMoment.createdAt).getTime() < 45 * 24 * 3600_000
      && !answered.has(`moment-${lastMoment.id}`)) {
    const title = lastMoment.momentSnapshot!.title;
    C.push({ priority: 72, card: {
      id: `moment-${lastMoment.id}`, type: "reflection", icon: "✨",
      title: bi(lang, "That moment called you.", "Quel momento ti aveva chiamato."),
      sub: bi(lang, `"${title}" — want to recreate that feeling?`, `"${title}" — vuoi ricreare quella sensazione?`),
      question: bi(lang, "What made it special?", "Cosa lo rendeva speciale?"),
      options: lang === "it"
        ? ["Il posto", "Il momento della giornata", "Come mi sentivo", "Non lo so ancora"]
        : ["The place", "The time of day", "How I felt", "I don't know yet"],
    }});
  }

  // ── Fallback sempre disponibili ─────────────────────────────────────────
  if (!answered.has("need-now")) {
    C.push({ priority: 30, card: {
      id: "need-now", type: "reflection", icon: "🧩",
      title: bi(lang, "What do you need right now?", "Di cosa hai bisogno adesso?"),
      sub: bi(lang, "18 seconds. I'll remember it.", "18 secondi. Me lo ricorderò."),
      question: bi(lang, "What do you need right now?", "Di cosa hai bisogno adesso?"),
      options: lang === "it"
        ? ["Staccare", "Meraviglia", "Lentezza", "Energia"]
        : ["Disconnect", "Wonder", "Slowness", "Energy"],
    }});
  }
  C.push({ priority: 20, card: {
    id: "season-journey", type: "journey", icon: "🗺",
    title: bi(lang, "This season deserves a new chapter.", "Questa stagione merita un capitolo nuovo."),
    sub: bi(lang, "Only when it feels right: generate one.", "Solo se lo senti: generalo."),
  }});

  // ── Selezione: priorità + jitter deterministico (giorno + eventi) ──────
  // Cambia una volta al giorno, e quando succede qualcosa (nuovo viaggio,
  // momento cuorato, risposta a una card) i conteggi muovono il seed.
  const seed = dayOfYear() * 31 + trips.length * 7 + moments.length * 3 + signalCount;
  const rng = (s: string) => {
    let h = seed;
    for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) % 1000003;
    return (h % 100) / 100;
  };
  const chosen = C
    .map(c => ({ c, score: c.priority + rng(c.card.id) * 25 }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.c.card);

  // Max 5, max 2 per tipo — la varietà è parte del linguaggio.
  const out: CompassCard[] = [];
  const perType = new Map<string, number>();
  for (const card of chosen) {
    const n = perType.get(card.type) ?? 0;
    if (n >= 2) continue;
    perType.set(card.type, n + 1);
    out.push(card);
    if (out.length >= 5) break;
  }
  return { cards: out };
}
