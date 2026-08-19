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
  buildEvolution, formatPortraitBlock, computeConfidence,
  type PortraitSignals, type PortraitTrip, type EvolutionTrip,
} from "@shared/portrait-insights";

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
