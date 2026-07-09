/**
 * Fire-and-forget helper that records a destination into `recent_destinations`
 * for the home/map widget. Called after every successful itinerary generation;
 * any failure is logged but never propagated (the user already has their
 * itinerary — this is purely cosmetic state).
 */
/**
 * Returns the most recently proposed destination names (deduped, newest first).
 * Fed into the matcher as a "freshness" nudge so two users rarely get an identical
 * trio. Best-effort: any failure returns [] and the matcher behaves as before.
 */
export async function getRecentDestinationNames(limit = 15): Promise<string[]> {
  try {
    const { db } = await import("./db");
    const { recentDestinations } = await import("@shared/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db
      .select({ name: recentDestinations.destinationName })
      .from(recentDestinations)
      .orderBy(desc(recentDestinations.createdAt))
      .limit(60);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      const n = (r.name || "").trim();
      if (!n) continue;
      const k = n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("getRecentDestinationNames error:", e);
    return [];
  }
}

export async function recordRecentDestination(destinationName: string) {
  try {
    const { geocodeDestination } = await import("./geocode-place");
    const place = await geocodeDestination(destinationName);
    if (!place) return; // unlocated: skip rather than store a wrong pin
    const { db } = await import("./db");
    const { recentDestinations } = await import("@shared/schema");
    await db.insert(recentDestinations).values({ destinationName, flag: place.flag, lat: place.lat, lon: place.lng });
  } catch (e) {
    console.error("recordRecentDestination error:", e);
  }
}

// ── Ledger PER-UTENTE delle proposte (mostrate, non scelte) ────────────────
// Fix della causa radice del "propone sempre le stesse": il sistema sapeva
// cosa l'utente aveva SCELTO, non cosa gli aveva MOSTRATO. Best-effort ovunque:
// se la tabella non esiste ancora (db:push non fatto) tutto degrada a no-op e
// la generazione si comporta come prima.

/** Ultimi nomi DISTINTI proposti a QUESTO utente (più recenti prima). */
export async function getProposedNamesForUser(userId: number | null, limit = 12): Promise<string[]> {
  if (!userId) return [];
  try {
    const { db } = await import("./db");
    const { proposedDestinations } = await import("@shared/schema");
    const { desc, eq } = await import("drizzle-orm");
    const rows = await db
      .select({ name: proposedDestinations.destinationName })
      .from(proposedDestinations)
      .where(eq(proposedDestinations.userId, userId))
      .orderBy(desc(proposedDestinations.createdAt))
      .limit(48);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      const n = (r.name || "").trim();
      if (!n) continue;
      const k = n.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error("getProposedNamesForUser error:", e);
    return [];
  }
}

/** Registra la tripletta appena proposta a questo utente (fire-and-forget). */
export async function recordProposedForUser(userId: number | null, names: string[]) {
  if (!userId || names.length === 0) return;
  try {
    const { db } = await import("./db");
    const { proposedDestinations } = await import("@shared/schema");
    const rows = names
      .map(n => (n || "").trim())
      .filter(Boolean)
      .map(destinationName => ({ userId, destinationName }));
    if (rows.length) await db.insert(proposedDestinations).values(rows);
  } catch (e) {
    console.error("recordProposedForUser error:", e);
  }
}

// Seed di esplorazione DETERMINISTICO su (settimana ISO × utente): stessa
// settimana + stesso utente = stesse proposte (coerenza nel ciclo decisionale,
// che per un viaggio è di giorni/settimane); settimana nuova = angolo nuovo.
// Utenti diversi nella stessa settimana ottengono seed diversi.
function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // lun=0 … dom=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // giovedì della settimana
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
  );
  return `${date.getUTCFullYear()}-W${week}`;
}

export function weeklyExplorationSeed(userId: number | null): number {
  const key = `${isoWeekKey()}:${userId ?? "anon"}`;
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}
