// ─────────────────────────────────────────────────────────────────────────
// Account insights — Wrapped-style aggregations over a user's itineraries.
//
// Reads what's already in the DB: itineraries.country, .days, .tripMeta,
// .createdAt. No new tables. The endpoint that consumes this lives in
// server/routes/misc.ts (/api/me/account-insights).
//
// Pattern recognition that gets fed to the Haiku headline:
//   - top continent (Europa/Asia/Americhe/Africa/Medio Oriente/Oceania)
//   - average trip length (giorni)
//   - island/coast ratio (proxy for "isolano contemplativo")
//   - capital-avoidance signal (poche capitali → conferma offbeat)
//   - budget tier proxy (da tripMeta v2 quando disponibile)
// ─────────────────────────────────────────────────────────────────────────

import type { Itinerary } from "@shared/schema";
import { getTripStatus } from "@shared/trip-status";

export type Continent = "europe" | "asia" | "americas" | "africa" | "middleeast" | "oceania";

export const CONTINENT_LABEL_IT: Record<Continent, string> = {
  europe:     "Europa",
  asia:       "Asia",
  americas:   "Americhe",
  africa:     "Africa",
  middleeast: "Medio Oriente",
  oceania:    "Oceania",
};

export const CONTINENT_LABEL_EN: Record<Continent, string> = {
  europe:     "Europe",
  asia:       "Asia",
  americas:   "Americas",
  africa:     "Africa",
  middleeast: "Middle East",
  oceania:    "Oceania",
};

export function continentLabel(c: Continent, lang: "en" | "it"): string {
  return (lang === "it" ? CONTINENT_LABEL_IT : CONTINENT_LABEL_EN)[c];
}

// Mappa country → continent. Costruita dai 20 country del catalogo + varianti
// comuni (sigle, italiano, country composite). Lookup è case-insensitive e
// tollerante a varianti perché itineraries.country viene dall'AI di matching.
const COUNTRY_TO_CONTINENT: Record<string, Continent> = {
  // Europe (catalogo)
  "portugal": "europe", "portogallo": "europe",
  "norway": "europe", "norvegia": "europe",
  "georgia": "europe", "georgia (caucaso)": "europe",
  "albania": "europe",
  "italy": "europe", "italia": "europe",
  "czech republic": "europe", "repubblica ceca": "europe", "cechia": "europe",
  "iceland": "europe", "islanda": "europe",
  // Europe (varianti comuni che il matcher può ritornare)
  "spain": "europe", "spagna": "europe",
  "france": "europe", "francia": "europe",
  "germany": "europe", "germania": "europe",
  "greece": "europe", "grecia": "europe",
  "croatia": "europe", "croazia": "europe",
  "slovenia": "europe",
  "switzerland": "europe", "svizzera": "europe",
  "austria": "europe",
  "netherlands": "europe", "paesi bassi": "europe", "olanda": "europe",
  "belgium": "europe", "belgio": "europe",
  "ireland": "europe", "irlanda": "europe",
  "united kingdom": "europe", "uk": "europe", "regno unito": "europe", "england": "europe",
  "scotland": "europe", "scozia": "europe",
  "sweden": "europe", "svezia": "europe",
  "denmark": "europe", "danimarca": "europe",
  "finland": "europe", "finlandia": "europe",
  "poland": "europe", "polonia": "europe",
  "hungary": "europe", "ungheria": "europe",
  "romania": "europe", "romania (europa)": "europe",
  "bulgaria": "europe",
  "estonia": "europe", "latvia": "europe", "lithuania": "europe",
  "malta": "europe",

  // Asia (catalogo)
  "india": "asia",
  "laos": "asia",
  "japan": "asia", "giappone": "asia",
  // Asia (varianti)
  "thailand": "asia", "thailandia": "asia",
  "vietnam": "asia",
  "cambodia": "asia", "cambogia": "asia",
  "indonesia": "asia", "bali": "asia",
  "china": "asia", "cina": "asia",
  "south korea": "asia", "corea del sud": "asia", "korea": "asia",
  "philippines": "asia", "filippine": "asia",
  "malaysia": "asia",
  "singapore": "asia",
  "sri lanka": "asia",
  "nepal": "asia",
  "bhutan": "asia",
  "mongolia": "asia",
  "myanmar": "asia",

  // Middle East (catalogo)
  "uzbekistan": "middleeast",
  "turkey": "middleeast", "turchia": "middleeast",
  // Middle East (varianti)
  "jordan": "middleeast", "giordania": "middleeast",
  "israel": "middleeast", "israele": "middleeast",
  "lebanon": "middleeast", "libano": "middleeast",
  "iran": "middleeast",
  "oman": "middleeast",
  "uae": "middleeast", "united arab emirates": "middleeast", "emirati arabi uniti": "middleeast",
  "saudi arabia": "middleeast", "arabia saudita": "middleeast",
  "egypt": "middleeast", "egitto": "middleeast", // culturale: spesso aggregato a ME nei viaggi

  // Americas (catalogo)
  "colombia": "americas",
  "argentina/chile": "americas", "argentina": "americas", "chile": "americas", "cile": "americas",
  "mexico": "americas", "messico": "americas",
  // Americas (varianti)
  "usa": "americas", "united states": "americas", "stati uniti": "americas",
  "canada": "americas",
  "peru": "americas", "perù": "americas",
  "bolivia": "americas",
  "brazil": "americas", "brasile": "americas",
  "uruguay": "americas",
  "ecuador": "americas",
  "cuba": "americas",
  "dominican republic": "americas", "repubblica dominicana": "americas",
  "costa rica": "americas",
  "panama": "americas",
  "guatemala": "americas",
  "nicaragua": "americas",

  // Africa (catalogo)
  "morocco": "africa", "marocco": "africa",
  // Africa (varianti)
  "south africa": "africa", "sudafrica": "africa",
  "namibia": "africa",
  "kenya": "africa",
  "tanzania": "africa",
  "ethiopia": "africa", "etiopia": "africa",
  "rwanda": "africa",
  "uganda": "africa",
  "madagascar": "africa",
  "senegal": "africa",
  "tunisia": "africa",
  "ghana": "africa",
  "botswana": "africa",
  "zambia": "africa",
  "zimbabwe": "africa",
  "mozambique": "africa", "mozambico": "africa",

  // Oceania
  "australia": "oceania",
  "new zealand": "oceania", "nuova zelanda": "oceania",
  "fiji": "oceania",
  "french polynesia": "oceania", "polinesia francese": "oceania",
};

// Heuristica per estrarre un possibile "country" da destinationName quando
// la colonna country è null/empty. Cerca l'ultima parte dopo virgola.
function inferCountryFromName(name: string | null | undefined): string | null {
  if (!name) return null;
  const parts = name.split(",").map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}

export function continentOf(trip: Itinerary): Continent | null {
  const candidates = [trip.country, inferCountryFromName(trip.destinationName)];
  for (const raw of candidates) {
    if (!raw) continue;
    const key = raw.toLowerCase().trim();
    if (COUNTRY_TO_CONTINENT[key]) return COUNTRY_TO_CONTINENT[key];
    // Tentativo composite "Argentina/Chile" → prova primo segmento
    const first = key.split(/[\/&]/)[0].trim();
    if (COUNTRY_TO_CONTINENT[first]) return COUNTRY_TO_CONTINENT[first];
  }
  return null;
}

// ── Wrapped-style stats ───────────────────────────────────────────────────

export interface WrappedStats {
  destinationsExplored: number;
  daysImagined: number;
  budgetBookableEur: number | null;   // somma tripMeta.total_cost_bookable, null se nessun trip v2
  topContinent: { continent: Continent; label: string; count: number } | null;
  avgTripDays: number | null;
  tripsConfirmed: number;             // viaggi EFFETTIVAMENTE fatti (trip_status="confirmed")
}

// ── Pattern signals fed to Haiku ─────────────────────────────────────────

export interface PatternSignals {
  topContinent: string | null;      // label IT
  topContinentRatio: number | null; // 0..1
  avgDays: number | null;
  shortTripBias: boolean;           // avgDays < 5
  longTripBias: boolean;            // avgDays > 8
  tripCount: number;
}

export interface AccountInsights {
  stats: WrappedStats;
  patterns: PatternSignals;
}

export function computeAccountInsights(trips: Itinerary[], lang: "en" | "it" = "it"): AccountInsights {
  const tripCount = trips.length;

  // ── days
  const dayCounts = trips.map(t => Array.isArray(t.days) ? t.days.length : 0);
  const daysImagined = dayCounts.reduce((a, b) => a + b, 0);
  const tripsWithDays = dayCounts.filter(n => n > 0);
  const avgTripDays = tripsWithDays.length > 0
    ? tripsWithDays.reduce((a, b) => a + b, 0) / tripsWithDays.length
    : null;

  // ── budget (only v2 trips have a parseable number in tripMeta)
  let budgetBookableEur: number | null = null;
  let v2Count = 0;
  for (const t of trips) {
    const meta = (t.tripMeta ?? null) as { total_cost_bookable?: number; total_cost_onsite_estimate?: number } | null;
    if (meta && typeof meta.total_cost_bookable === "number") {
      budgetBookableEur = (budgetBookableEur ?? 0) + meta.total_cost_bookable + (meta.total_cost_onsite_estimate ?? 0);
      v2Count++;
    }
  }
  // Se nessun trip v2, lasciamo null (la UI mostra placeholder o salta il counter)

  // ── continents
  const contCounts: Record<string, number> = {};
  for (const t of trips) {
    const c = continentOf(t);
    if (!c) continue;
    contCounts[c] = (contCounts[c] ?? 0) + 1;
  }
  let topContinent: WrappedStats["topContinent"] = null;
  let topContinentRatio: number | null = null;
  const contEntries = Object.entries(contCounts) as Array<[Continent, number]>;
  if (contEntries.length > 0) {
    contEntries.sort((a, b) => b[1] - a[1]);
    const [cont, count] = contEntries[0];
    topContinent = { continent: cont, label: continentLabel(cont, lang), count };
    topContinentRatio = tripCount > 0 ? count / tripCount : null;
  }

  const tripsConfirmed = trips.filter(t => getTripStatus(t) === "confirmed").length;

  const stats: WrappedStats = {
    destinationsExplored: tripCount,
    daysImagined,
    budgetBookableEur,
    topContinent,
    avgTripDays: avgTripDays !== null ? Math.round(avgTripDays * 10) / 10 : null,
    tripsConfirmed,
  };

  const patterns: PatternSignals = {
    topContinent: topContinent?.label ?? null,
    topContinentRatio,
    avgDays: avgTripDays,
    shortTripBias: avgTripDays !== null && avgTripDays < 5,
    longTripBias: avgTripDays !== null && avgTripDays > 8,
    tripCount,
  };

  return { stats, patterns };
}
