/**
 * Defaults intelligenti per il modal "Genera dal profilo".
 *
 * Strategia: l'utente returning non rifà il quiz né compila form vuoti. I
 * 4-5 micro-input (compagnia, durata, partenza, data, budget) si pre-compilano
 * dai segnali che abbiamo già.
 *
 * Sorgenti per ogni campo:
 *   - days       → mediana di itinerary.days.length sui past trips dell'utente
 *                  (fallback 7)
 *   - leaveDate  → oggi + 60 giorni in formato YYYY-MM-DD. Non abbiamo la data
 *                  effettiva del viaggio nei trip salvati, quindi proponiamo
 *                  un orizzonte di pianificazione generico
 *   - companions, budget, departure → best-effort dall'ultimo profilingInput
 *                  globale (singleton; vedi storage.saveProfilingInput).
 *                  Se mancano: companions="couple", budget="medio",
 *                  departure="" (l'UI mostrerà placeholder)
 *
 * Note: persistere companions/budget/departure per itinerario richiederebbe
 * una migrazione. Per ora il "best-effort dal singleton" copre l'utente
 * tipico che genera un viaggio alla volta. Da rivedere se introduciamo
 * multi-tenant senza clearAll.
 */
import { storage } from "./storage";

export interface ProfileDefaults {
  days: number;
  leaveDate: string;
  departure: string;
  companions: string;
  budget: string;
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

export async function computeProfileDefaults(userId: number): Promise<ProfileDefaults> {
  const trips = await storage.getUserItineraries(userId);
  const tripDays = trips
    .map((t: any) => (Array.isArray(t.days) ? t.days.length : 0))
    .filter((n: number) => n > 0);
  const days = median(tripDays) ?? 7;

  const horizonDate = new Date(Date.now() + 60 * 86400_000);
  const leaveDate = horizonDate.toISOString().slice(0, 10);

  let companions = "couple";
  let budget = "medio";
  let departure = "";
  try {
    const last = await storage.getProfilingInput();
    if (last && typeof last === "object") {
      if (typeof last.companions === "string" && last.companions.length > 0) companions = last.companions;
      if (typeof last.budget === "string" && last.budget.length > 0) budget = last.budget;
      if (typeof last.departure === "string" && last.departure.length > 0) departure = last.departure;
    }
  } catch {
    // singleton mancante, restiamo sui default neutri
  }

  return { days, leaveDate, departure, companions, budget };
}
