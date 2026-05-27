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
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinationName)}&format=json&limit=1&accept-language=en`);
    const d = await r.json();
    if (!d?.[0]) return;
    const { lat, lon, country_code } = d[0];
    const flag = Array.from((country_code as string).toUpperCase()).map(c => String.fromCodePoint(c.charCodeAt(0) + 127397)).join('');
    const { db } = await import("./db");
    const { recentDestinations } = await import("@shared/schema");
    await db.insert(recentDestinations).values({ destinationName, flag, lat: parseFloat(lat), lon: parseFloat(lon) });
  } catch (e) {
    console.error("recordRecentDestination error:", e);
  }
}
