/**
 * moment-times.ts — il contratto temporale delle tappe. Logica pura, zero
 * dipendenze (niente DB, niente rete): così si può verificare da riga di
 * comando senza provisionare nulla.
 *
 * Perché esiste: dal redesign 2026-08 l'interfaccia dell'itinerario è
 * TEMPORALE — il filo del giorno e le etichette sulla mappa leggono
 * `start_time`. Il prompt ora lo pretende su ogni tappa (§2d), ma un modello
 * resta un modello: qui si riallinea quello che dice a quello che mostriamo.
 *
 * Principio: mai inventare un orario. Se la sequenza non torna, l'orario si
 * TOGLIE — l'interfaccia degrada da sola alla fascia ("Sera"), che è vera.
 * ─────────────────────────────────────────────────────────────── */
import type { DayV2, MomentV2 } from "../shared/schema";

/** "09:30" · "9.30" · "7:30 PM" → minuti dalla mezzanotte. null se non è un orario. */
export function parseClock(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{1,2})[:.h](\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59) return null;
  const ap = m[3]?.toLowerCase();
  if (ap === "pm" && h < 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  if (h > 23) return null;
  return h * 60 + min;
}

/** Fascia dedotta dall'ORARIO: se il modello scrive "20:30" la tappa è di sera,
 *  qualunque etichetta ci abbia messo accanto. */
export function bandFromClock(min: number): MomentV2["time_label"] {
  if (min < 5 * 60) return "night";
  if (min < 11 * 60) return "morning";
  if (min < 14 * 60 + 30) return "lunch";
  if (min < 18 * 60 + 30) return "afternoon";
  if (min < 23 * 60) return "evening";
  return "night";
}

export const fmtClock = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Riallinea gli orari di un giorno:
 *   1. la fascia segue l'orario;
 *   2. una sequenza che torna indietro nel tempo perde l'orario incoerente
 *      (non lo correggiamo: un orario inventato è una bugia leggibile);
 *   3. `end_time` è DERIVATO da start_time + duration_min, mai preso dal
 *      modello, così non può contraddirli.
 */
export function normalizeDayTimes(day: DayV2): void {
  let last: number | null = null;
  for (const m of day.moments) {
    const start = parseClock(m.start_time);
    if (start == null) {
      m.start_time = undefined;
      m.end_time = undefined;
      continue;
    }
    if (last != null && start <= last) {
      console.warn(`[v2] giorno ${day.day_number}: orario non crescente "${m.start_time}" → rimosso`);
      m.start_time = undefined;
      m.end_time = undefined;
      continue;
    }
    last = start;
    m.time_label = bandFromClock(start);
    const dur = typeof m.duration_min === "number" && m.duration_min > 0 ? m.duration_min : null;
    // Modulo 24h: una cena alle 23:30 che dura 90 minuti finisce all'01:00,
    // non alle "25:00".
    m.end_time = dur ? fmtClock((start + dur) % (24 * 60)) : undefined;
  }
}
