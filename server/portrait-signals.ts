/**
 * portrait-signals.ts — gli stessi segnali che il Ritratto mostra a schermo,
 * ricostruiti sul server per poterli passare alla generazione.
 *
 * Perché esiste: il Ritratto calcolava tutto nel browser. Quando l'utente
 * premeva "genera un viaggio pensato per te", al matching engine arrivava il
 * vettore a 5 assi e nient'altro — non le frasi che l'utente aveva appena
 * letto su di sé. La proposta non poteva rispondere a un'analisi che non
 * aveva mai ricevuto.
 *
 * Lo stesso motore (shared/portrait-insights) gira ora su entrambi i lati:
 * quello che l'utente legge e quello che il generatore riceve sono per
 * costruzione la stessa cosa.
 * ─────────────────────────────────────────────────────────────── */
import { storage } from "./storage";
import { continentOf, continentLabel } from "./account-insights";
import { MAPPING_VERSION } from "@shared/traits";
import {
  buildEvolution, formatPortraitBlock, computeConfidence, AXIS_POLE_LABELS,
  type PortraitSignals, type PortraitTrip, type EvolutionTrip, type EvolutionStep,
} from "@shared/portrait-insights";
import { getPortraitReading } from "./portrait-reading";

/** Le parole vere dell'utente: solo da snapshot di quiz con segnale grezzo. */
function seekAvoidFrom(snaps: any[]): { seek: string[]; avoid: string[]; ownWords: string | null } {
  for (let i = snaps.length - 1; i >= 0; i--) {
    const s = snaps[i];
    if (s?.source !== "quiz" || !s?.rawSignal) continue;
    const raw = s.rawSignal as any;
    const seek = Array.isArray(raw?.seek) ? raw.seek.filter((x: unknown) => typeof x === "string") : [];
    const avoid = Array.isArray(raw?.avoid) ? raw.avoid.filter((x: unknown) => typeof x === "string") : [];
    const ownWords = typeof raw?.ownWords === "string" ? raw.ownWords : null;
    if (seek.length || avoid.length || ownWords) return { seek, avoid, ownWords };
  }
  return { seek: [], avoid: [], ownWords: null };
}

const dayCountOf = (t: any): string | undefined =>
  Array.isArray(t?.days) && t.days.length > 0 ? `${t.days.length} giorni` : undefined;

/**
 * Il blocco di prompt col Ritratto di questo utente.
 * Stringa vuota quando non c'è abbastanza materiale: meglio nessun blocco che
 * un blocco che afferma cose che i dati non reggono.
 */
export async function buildPortraitPromptBlock(userId: number, lang: "it" | "en" = "it"): Promise<string> {
  try {
    const [itineraries, snaps] = await Promise.all([
      storage.getUserItineraries(userId),
      storage.getTraitSnapshots(userId),
    ]);

    const trips: PortraitTrip[] = itineraries.map((t: any) => {
      const cont = continentOf(t);
      return {
        dest: (t.destinationName ?? "").trim(),
        continent: cont ? continentLabel(cont, "it") : undefined, // il motore confronta etichette IT
        rawDate: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
        taken: (t.tripMeta as any)?.trip_status === "confirmed",
        duration: dayCountOf(t),
      };
    }).filter((t: PortraitTrip) => t.dest);

    const valid = snaps
      .filter((s: any) => s.mappingVersion === MAPPING_VERSION && s.traits)
      .map((s: any) => ({ createdAt: new Date(s.createdAt).toISOString(), traits: s.traits as Record<string, number> }));

    const { seek, avoid, ownWords } = seekAvoidFrom(snaps as any[]);
    const signals: PortraitSignals = {
      trips,
      seek, avoid, ownWords,
      vector: valid.length > 0 ? valid[valid.length - 1].traits : null,
      snapshotCount: valid.length,
    };

    const evoTrips: EvolutionTrip[] = trips.map(t => ({ dest: t.dest, rawDate: t.rawDate }));
    const evolution = buildEvolution(valid, evoTrips, lang);
    return formatPortraitBlock(signals, evolution, computeConfidence(signals));
  } catch (err) {
    // Un ritratto che non si riesce a comporre non deve impedire una
    // generazione: si perde la precisione, non il viaggio.
    console.warn("[portrait] blocco non componibile:", err);
    return "";
  }
}


/* ── I fatti di UNA tappa, ricomposti dal database ──────────────────────────
 * Il client manda solo l'indice: qui si ricostruisce la stessa evoluzione che
 * vede a schermo e si prendono i viaggi PRIMA e DOPO quello in cui il
 * cambiamento si e' visto — sono loro a dare la traiettoria, ed e' quello che
 * rende la lettura sua e non di chiunque altro.
 * ─────────────────────────────────────────────────────────────── */
async function loadSignals(userId: number, lang: "it" | "en") {
  const [itineraries, snaps] = await Promise.all([
    storage.getUserItineraries(userId),
    storage.getTraitSnapshots(userId),
  ]);
  const trips: PortraitTrip[] = itineraries.map((t: any) => {
    const cont = continentOf(t);
    return {
      dest: (t.destinationName ?? "").trim(),
      continent: cont ? continentLabel(cont, "it") : undefined,
      rawDate: t.createdAt ? new Date(t.createdAt).toISOString() : undefined,
      taken: (t.tripMeta as any)?.trip_status === "confirmed",
      duration: dayCountOf(t),
    };
  }).filter((t: PortraitTrip) => t.dest);

  const valid = snaps
    .filter((s: any) => s.mappingVersion === MAPPING_VERSION && s.traits)
    .map((s: any) => ({ createdAt: new Date(s.createdAt).toISOString(), traits: s.traits as Record<string, number> }));

  const { seek, avoid, ownWords } = seekAvoidFrom(snaps as any[]);
  const evoTrips: EvolutionTrip[] = trips.map(t => ({ dest: t.dest, rawDate: t.rawDate }));
  const evolution = buildEvolution(valid, evoTrips, lang);
  return { trips, valid, seek, avoid, ownWords, evolution };
}

const whenOf = (t: PortraitTrip, lang: "it" | "en"): string | null => {
  if (!t.rawDate) return null;
  const d = new Date(t.rawDate);
  if (isNaN(d.getTime())) return null;
  const M = lang === "it"
    ? ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${M[d.getMonth()]} ${d.getFullYear()}`;
};

/** La lettura personalizzata della tappa `stepIndex`, o null se non garantibile. */
export async function getPortraitStepReading(
  userId: number,
  stepIndex: number,
  lang: "it" | "en",
): Promise<string | null> {
  const { trips, seek, ownWords, evolution } = await loadSignals(userId, lang);
  const step: EvolutionStep | undefined = evolution[stepIndex];
  // Solo i CAMBIAMENTI: il nodo "dove stai andando" e' un consiglio, non una
  // lettura del passato, e resta il testo curato.
  if (!step || step.kind !== "change") return null;

  const dated = trips
    .filter(t => t.rawDate && !isNaN(new Date(t.rawDate).getTime()))
    .sort((a, b) => +new Date(a.rawDate!) - +new Date(b.rawDate!));
  const at = step.trip ? dated.findIndex(t => t.dest === step.trip!.dest) : -1;

  const poles = AXIS_POLE_LABELS[lang][step.axis];
  return getPortraitReading(userId, {
    lang,
    fromPole: step.fromHi ? poles.hi : poles.lo,
    toPole: step.hi ? poles.hi : poles.lo,
    atTrip: step.trip ? { dest: step.trip.dest, when: step.trip.when } : null,
    // Due prima e due dopo bastano a dare la direzione senza allungare il
    // prompt (e senza dare al modello piu' nomi del necessario da sbagliare).
    before: at > 0 ? dated.slice(Math.max(0, at - 2), at).map(t => ({ dest: t.dest, when: whenOf(t, lang) })) : [],
    after: at >= 0 ? dated.slice(at + 1, at + 3).map(t => ({ dest: t.dest, when: whenOf(t, lang) })) : [],
    ownWords,
    seek: seek.slice(0, 4),
    tripCount: trips.length,
    confirmedCount: trips.filter(t => t.taken).length,
  });
}
