/**
 * Planner — decides WHAT to make today: which editorial pillar and which
 * destination(s), with least-recently-used rotation persisted in state.json
 * so the feed never repeats itself back-to-back.
 *
 * Pillars:
 *   tre-posti      — "3 posti per chi…" persona hook (catalog-grounded)
 *   deep-dive      — one city in 5 real anchors (experience-bank-grounded)
 *   itinerario-30s — 3-day teaser of one city (experience-bank-grounded)
 *   quiz-bait      — typographic persona slides, drives to the quiz
 */
import fs from "fs";
import path from "path";
import { getExperienceBank, type DestinationBank } from "../server/experience-bank";
import { destinationCatalog, type CatalogDestination, type PrimaryTag } from "../server/destination-catalog";

export const PILLARS = ["tre-posti", "deep-dive", "itinerario-30s", "quiz-bait"] as const;
export type Pillar = (typeof PILLARS)[number];

export const PERSONAS: Record<PrimaryTag, string> = {
  recovery: "chi ha bisogno di staccare davvero",
  explorer: "chi odia i posti turistici",
  seeker: "chi viaggia per sentire qualcosa",
  social: "chi torna a casa con persone, non solo foto",
  romantic: "chi vuole un viaggio da ricordare in due",
};

// Cities with a curated experience bank (deep-dive / itinerario-30s).
export const BANK_CITIES = [
  "Tokyo, Japan", "Kyoto, Japan", "Lisbon, Portugal", "Porto, Portugal",
  "Barcelona, Spain", "Rome, Italy", "Paris, France", "Amsterdam, Netherlands",
  "Istanbul, Turkey", "Athens, Greece", "Marrakech, Morocco", "Bangkok, Thailand",
  "Bali, Indonesia", "Mexico City, Mexico", "Reykjavik, Iceland", "New York, USA",
];

export interface HistoryEntry {
  date: string;        // YYYY-MM-DD
  pillar: Pillar;
  subject: string;     // city or persona tag the content was about
  slug: string;
}

export interface FactoryState { history: HistoryEntry[] }

const STATE_PATH = path.join(process.cwd(), "content-factory", "state.json");

export function loadState(): FactoryState {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf-8")) as FactoryState;
  } catch {
    return { history: [] };
  }
}

export function saveState(state: FactoryState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

/** Least-recently-used pick: items never used come first, then oldest use. */
function pickLru<T>(items: T[], key: (t: T) => string, history: HistoryEntry[], n = 1): T[] {
  const lastUse = new Map<string, number>();
  history.forEach((h, i) => lastUse.set(h.subject.toLowerCase(), i));
  const sorted = [...items].sort((a, b) => {
    const la = lastUse.get(key(a).toLowerCase()) ?? -1;
    const lb = lastUse.get(key(b).toLowerCase()) ?? -1;
    return la - lb;
  });
  return sorted.slice(0, n);
}

export interface Plan {
  pillar: Pillar;
  persona?: PrimaryTag;
  /** deep-dive / itinerario-30s */
  bank?: DestinationBank;
  /** tre-posti */
  catalogPicks?: CatalogDestination[];
  subject: string; // for history
}

export function plan(state: FactoryState, force?: { pillar?: Pillar; dest?: string }): Plan {
  // Pillar: forced > least recently used in rotation order.
  let pillar: Pillar;
  if (force?.pillar) {
    pillar = force.pillar;
  } else {
    const lastByPillar = new Map<Pillar, number>();
    state.history.forEach((h, i) => lastByPillar.set(h.pillar, i));
    pillar = [...PILLARS].sort((a, b) => (lastByPillar.get(a) ?? -1) - (lastByPillar.get(b) ?? -1))[0];
  }

  // Persona rotated by how often each appeared in history subjects.
  const personaTags = Object.keys(PERSONAS) as PrimaryTag[];
  const persona = pickLru(personaTags, t => t, state.history)[0];

  if (pillar === "deep-dive" || pillar === "itinerario-30s") {
    const cityName = force?.dest
      ?? pickLru(BANK_CITIES, c => c, state.history)[0];
    const bank = getExperienceBank(cityName);
    if (!bank) throw new Error(`Nessuna experience bank per "${cityName}" — usa una di: ${BANK_CITIES.join(", ")}`);
    return { pillar, persona, bank, subject: bank.city };
  }

  if (pillar === "tre-posti") {
    // 3 catalog destinations matching the persona, least recently featured.
    const matching = destinationCatalog.filter(d => d.primaryTags.includes(persona));
    const pool = matching.length >= 3 ? matching : destinationCatalog;
    const picks = pickLru(pool, d => d.name, state.history, 3);
    return { pillar, persona, catalogPicks: picks, subject: persona };
  }

  // quiz-bait
  return { pillar, persona, subject: `quiz:${persona}` };
}
