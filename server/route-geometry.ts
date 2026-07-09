// ─────────────────────────────────────────────────────────────────────────
// Geometria del percorso del giorno — strade VERE, non linee d'aria.
//
// Catena (tutta keyless, costo €0):
//   1. Valhalla demo (valhalla1.openstreetmap.de) — profilo pedestrian
//      (o auto sopra i 25 km in linea d'aria): shape polyline6 per tratta
//      + durata/distanza per tratta.
//   2. OSRM demo (router.project-osrm.org) — solo profilo driving, ma
//      comunque strade reali: meglio di una retta.
//   3. null → il client disegna una curva morbida (mai la retta secca).
//
// Il chiamante (route endpoint) CACHEA il risultato in tripMeta: una
// chiamata esterna per giorno per itinerario, per sempre. La politeness
// verso i demo server è strutturale, non un rate-limit.
// ─────────────────────────────────────────────────────────────────────────

export interface RoutePointIn { lat: number; lng: number }
export interface RouteLeg { t: number; m: number; mid: [number, number] }
export interface RouteGeometry {
  profile: "foot" | "car";
  coords: Array<[number, number]>; // [lat, lng]
  legs: RouteLeg[];                // una per tratta (n punti → n-1 legs)
}

const UA = { "User-Agent": "MindRoute/1.0 (day route)", "Content-Type": "application/json" };

function haversineM(a: RoutePointIn, b: RoutePointIn): number {
  const R = 6371000, rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Decoder polyline (Google encoded, precisione parametrica: Valhalla usa 1e6).
function decodePolyline(str: string, precision = 6): Array<[number, number]> {
  const factor = Math.pow(10, precision);
  const out: Array<[number, number]> = [];
  let index = 0, lat = 0, lng = 0;
  while (index < str.length) {
    for (const which of [0, 1] as const) {
      let result = 0, shift = 0, byte = 0x20;
      while (byte >= 0x20) {
        byte = str.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      }
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta; else lng += delta;
    }
    out.push([lat / factor, lng / factor]);
  }
  return out;
}

// Downsample: le shape urbane possono superare i 2-3k punti; per una linea
// su mappa ne bastano molti meno e tripMeta non deve gonfiarsi.
function thin(coords: Array<[number, number]>, max = 600): Array<[number, number]> {
  if (coords.length <= max) return coords;
  const step = (coords.length - 1) / (max - 1);
  const out: Array<[number, number]> = [];
  for (let i = 0; i < max; i++) out.push(coords[Math.round(i * step)]);
  return out;
}

function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function valhalla(points: RoutePointIn[], profile: "foot" | "car"): Promise<RouteGeometry | null> {
  try {
    const body = JSON.stringify({
      locations: points.map(p => ({ lat: p.lat, lon: p.lng })),
      costing: profile === "foot" ? "pedestrian" : "auto",
      units: "kilometers",
    });
    const r = await fetchWithTimeout(
      `https://valhalla1.openstreetmap.de/route?json=${encodeURIComponent(body)}`,
      { headers: UA }, 7000,
    );
    if (!r.ok) return null;
    const d = await r.json();
    const tripLegs = d?.trip?.legs;
    if (!Array.isArray(tripLegs) || tripLegs.length === 0) return null;
    const coords: Array<[number, number]> = [];
    const legs: RouteLeg[] = [];
    for (const leg of tripLegs) {
      const shape = decodePolyline(String(leg.shape ?? ""), 6);
      if (shape.length === 0) return null;
      const mid = shape[Math.floor(shape.length / 2)];
      legs.push({
        t: Math.round(leg.summary?.time ?? 0),
        m: Math.round((leg.summary?.length ?? 0) * 1000),
        mid,
      });
      // evita il punto duplicato alla giunzione tra le tratte
      coords.push(...(coords.length ? shape.slice(1) : shape));
    }
    return { profile, coords: thin(coords), legs };
  } catch {
    return null;
  }
}

async function osrm(points: RoutePointIn[]): Promise<RouteGeometry | null> {
  try {
    const path = points.map(p => `${p.lng},${p.lat}`).join(";");
    const r = await fetchWithTimeout(
      `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson&steps=false`,
      { headers: UA }, 7000,
    );
    if (!r.ok) return null;
    const d = await r.json();
    const route = d?.routes?.[0];
    if (!route?.geometry?.coordinates?.length) return null;
    const coords: Array<[number, number]> = route.geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    const legsIn: any[] = Array.isArray(route.legs) ? route.legs : [];
    // OSRM non dà la shape per-tratta con overview: midpoint approssimato
    // ripartendo la shape totale in proporzione alle distanze delle tratte.
    const totalM = legsIn.reduce((s, l) => s + (l.distance ?? 0), 0) || 1;
    let acc = 0;
    const legs: RouteLeg[] = legsIn.map((l) => {
      const midFrac = (acc + (l.distance ?? 0) / 2) / totalM;
      acc += l.distance ?? 0;
      const mid = coords[Math.min(coords.length - 1, Math.round(midFrac * (coords.length - 1)))];
      return { t: Math.round(l.duration ?? 0), m: Math.round(l.distance ?? 0), mid };
    });
    return { profile: "car", coords: thin(coords), legs };
  } catch {
    return null;
  }
}

/** Percorso su strada tra i punti (in ordine). null = usa il fallback client. */
export async function computeRouteGeometry(points: RoutePointIn[]): Promise<RouteGeometry | null> {
  if (points.length < 2) return null;
  let straight = 0;
  for (let i = 1; i < points.length; i++) straight += haversineM(points[i - 1], points[i]);
  const profile: "foot" | "car" = straight > 25_000 ? "car" : "foot";
  return (await valhalla(points, profile)) ?? (await osrm(points));
}
