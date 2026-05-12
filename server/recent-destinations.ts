/**
 * Fire-and-forget helper that records a destination into `recent_destinations`
 * for the home/map widget. Called after every successful itinerary generation;
 * any failure is logged but never propagated (the user already has their
 * itinerary — this is purely cosmetic state).
 */
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
