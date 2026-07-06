// ─────────────────────────────────────────────────────────────────────────
// Trip status — sapere se un viaggio è stato EFFETTIVAMENTE fatto.
//
// Tutto vive in tripMeta (jsonb) → nessuna migrazione. Due assi distinti:
//   • travel_dates_confirmed  → l'utente ha fissato le date REALI (tassello 1)
//   • trip_status             → "planned" | "confirmed" | "skipped" (tassello 2)
//
// La logica di fase (before/during/after) è pura e centralizzata qui così
// server (companion, trait-prior, check-in) e client leggono la STESSA verità.
// ─────────────────────────────────────────────────────────────────────────

export type TripStatus = "planned" | "confirmed" | "skipped";

const DAY_MS = 86_400_000;

function meta(itin: any): any {
  return (itin && itin.tripMeta) || {};
}

// Stato dichiarato del viaggio. Assente → "planned" (default: esiste un piano,
// nessuna conferma che sia avvenuto).
export function getTripStatus(itin: any): TripStatus {
  const s = meta(itin).trip_status;
  return s === "confirmed" || s === "skipped" ? s : "planned";
}

// L'utente ha consolidato a mano le date reali (non il placeholder generato).
export function datesConfirmed(itin: any): boolean {
  return meta(itin).travel_dates_confirmed === true;
}

// Giorno (epoch/DAY_MS) di fine viaggio, o null se non parsabile.
export function tripEndDay(itin: any): number | null {
  const d = meta(itin).travel_dates as { start?: string; end?: string } | undefined;
  if (!d?.start) return null;
  const endStr = d.end || d.start;
  const end = new Date(endStr);
  if (isNaN(+end)) return null;
  return Math.floor(+end / DAY_MS);
}

// Il viaggio è "passato"? Vero SOLO con date REALI confermate + fine < oggi.
// Le date placeholder (+3 mesi dalla generazione) NON contano: senza conferma
// non possiamo affermare che un viaggio sia avvenuto. È il gate del check-in.
export function isTripOver(itin: any, now: number = Date.now()): boolean {
  if (!datesConfirmed(itin)) return false;
  const endDay = tripEndDay(itin);
  if (endDay == null) return false;
  return Math.floor(now / DAY_MS) > endDay;
}

// Va mostrato il check-in "ci sei andato?": viaggio passato + ancora senza
// risposta (planned). Confirmed/skipped → non chiediamo più.
export function shouldAskCheckin(itin: any, now: number = Date.now()): boolean {
  return isTripOver(itin, now) && getTripStatus(itin) === "planned";
}
