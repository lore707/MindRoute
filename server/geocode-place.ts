// ─────────────────────────────────────────────────────────────────────────
// Destination-level geocoder — cities, regions, archipelagos. NOT for
// street-level POIs (itinerary-gen has its own cache + query-biasing logic).
//
// Nominatim free-text search is unreliable on fuzzy areas and Italian
// exonyms, and its first hit can be an arbitrary building: measured failures
// include "Georgia, Caucaso" → a cathedral in Vladikavkaz, "Isole Lofoten,
// Norvegia" → a glass hut, "Patagonia, Argentina & Cile" → no result at all.
// Resolution chain:
//   1. Nominatim on the full name, limit=5, keeping only area-like results
//      (boundary/place, or natural islands) — and when the name carries a
//      recognisable country segment ("…, Norvegia") rejecting results in the
//      wrong country (kills "Patagonia, Arizona").
//   2. Same query on the first comma segment alone ("Georgia").
//   3. Wikipedia IT title lookup (prop=coordinates, redirects=1) — it
//      understands Italian names natively and resolves to the *notable*
//      place (Salento → the Lecce peninsula, not the comune in Campania).
// ─────────────────────────────────────────────────────────────────────────

export interface GeocodedPlace {
  lat: number;
  lng: number;
  flag: string; // emoji flag, "🌍" when the country is unknown
}

const UA = { "User-Agent": "MindRoute/1.0 (destination geocoder)" };
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function flagOf(cc: string | undefined): string {
  if (!cc || cc.length !== 2) return "🌍";
  return Array.from(cc.toUpperCase())
    .map(c => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join("");
}

// Country names (Italian + English — the matcher writes them in the request
// language) that plausibly appear after the comma. Used only as a *veto*
// (reject wrong-country candidates), so incompleteness is safe — an
// unrecognised segment simply skips the check.
const COUNTRY_CC: Record<string, string> = {
  // English names that differ from the Italian entry below
  italy: "IT", portugal: "PT", spain: "ES", france: "FR", germany: "DE",
  belgium: "BE", netherlands: "NL", denmark: "DK", norway: "NO", sweden: "SE",
  finland: "FI", iceland: "IS", ireland: "IE", "united kingdom": "GB",
  scotland: "GB", england: "GB", wales: "GB", greece: "GR", croatia: "HR",
  "czech republic": "CZ", czechia: "CZ", poland: "PL", hungary: "HU",
  slovakia: "SK", latvia: "LV", lithuania: "LT", cyprus: "CY", turkey: "TR",
  ukraine: "UA", "bosnia and herzegovina": "BA", "north macedonia": "MK",
  kazakhstan: "KZ", kyrgyzstan: "KG", tajikistan: "TJ", china: "CN",
  japan: "JP", "south korea": "KR", "sri lanka": "LK", cambodia: "KH",
  thailand: "TH", malaysia: "MY", philippines: "PH", maldives: "MV",
  jordan: "JO", israel: "IL", "united arab emirates": "AE",
  "saudi arabia": "SA", morocco: "MA", egypt: "EG", ethiopia: "ET",
  "south africa": "ZA", "cape verde": "CV", "united states": "US",
  mexico: "MX", peru: "PE", chile: "CL", brazil: "BR", "new zealand": "NZ",
};

const IT_COUNTRY_CC: Record<string, string> = {
  italia: "IT", portogallo: "PT", spagna: "ES", francia: "FR", germania: "DE",
  austria: "AT", svizzera: "CH", belgio: "BE", "paesi bassi": "NL", olanda: "NL",
  danimarca: "DK", norvegia: "NO", svezia: "SE", finlandia: "FI", islanda: "IS",
  irlanda: "IE", "regno unito": "GB", scozia: "GB", inghilterra: "GB", galles: "GB",
  grecia: "GR", croazia: "HR", slovenia: "SI", albania: "AL", montenegro: "ME",
  "repubblica ceca": "CZ", cechia: "CZ", polonia: "PL", ungheria: "HU",
  romania: "RO", bulgaria: "BG", slovacchia: "SK", estonia: "EE", lettonia: "LV",
  lituania: "LT", malta: "MT", cipro: "CY", turchia: "TR", georgia: "GE",
  armenia: "AM", azerbaigian: "AZ", ucraina: "UA", serbia: "RS",
  "bosnia ed erzegovina": "BA", "macedonia del nord": "MK",
  uzbekistan: "UZ", kazakistan: "KZ", kirghizistan: "KG", tagikistan: "TJ",
  mongolia: "MN", cina: "CN", giappone: "JP", "corea del sud": "KR",
  taiwan: "TW", india: "IN", "sri lanka": "LK", nepal: "NP", bhutan: "BT",
  laos: "LA", vietnam: "VN", cambogia: "KH", thailandia: "TH", myanmar: "MM",
  birmania: "MM", malesia: "MY", singapore: "SG", indonesia: "ID",
  filippine: "PH", maldive: "MV", pakistan: "PK", iran: "IR", oman: "OM",
  giordania: "JO", israele: "IL", "emirati arabi uniti": "AE",
  "arabia saudita": "SA", marocco: "MA", tunisia: "TN", egitto: "EG",
  etiopia: "ET", kenya: "KE", tanzania: "TZ", sudafrica: "ZA", namibia: "NA",
  madagascar: "MG", ghana: "GH", senegal: "SN", "capo verde": "CV",
  mauritius: "MU", seychelles: "SC", "stati uniti": "US", canada: "CA",
  messico: "MX", guatemala: "GT", "costa rica": "CR", panama: "PA", cuba: "CU",
  colombia: "CO", ecuador: "EC", "perù": "PE", peru: "PE", bolivia: "BO",
  cile: "CL", argentina: "AR", uruguay: "UY", paraguay: "PY", brasile: "BR",
  venezuela: "VE", australia: "AU", "nuova zelanda": "NZ",
};

// "Puglia, Italia" → ["IT"]; "Patagonia, Argentina & Cile" → ["AR","CL"];
// "Georgia, Caucaso" → [] (no recognisable country → no veto).
export function countryHints(fullName: string): string[] {
  const out = new Set<string>();
  const segments = fullName.split(",").slice(1);
  for (const seg of segments) {
    for (const part of seg.split(/&|\be\b|\band\b|\//)) {
      const key = part.trim().toLowerCase();
      const cc = IT_COUNTRY_CC[key] ?? COUNTRY_CC[key];
      if (cc) out.add(cc);
    }
  }
  return Array.from(out);
}

// Area-like Nominatim results only — rejects buildings, restaurants, streets,
// peaks and other point features that free-text search loves to surface.
function isAreaResult(r: any): boolean {
  if (r.class === "boundary" || r.class === "place") return true;
  if (r.class === "natural" && ["island", "archipelago", "peninsula"].includes(r.type)) return true;
  return false;
}

async function nominatimArea(
  query: string,
  hints: string[],
): Promise<GeocodedPlace | null> {
  try {
    // addressdetails=1 is required: without it results carry no country_code,
    // so flags degrade to 🌍 and the country veto silently never fires.
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=en&addressdetails=1`,
      { headers: UA },
    );
    const results = await r.json();
    if (!Array.isArray(results)) return null;
    for (const cand of results) {
      if (!isAreaResult(cand)) continue;
      const cc = (cand.address?.country_code as string | undefined)?.toUpperCase();
      // With hints, an un-attributable candidate is rejected too — safer to
      // fall through to Wikipedia than to plot a wrong-country pin.
      if (hints.length && (!cc || !hints.includes(cc))) continue;
      const lat = parseFloat(cand.lat);
      const lng = parseFloat(cand.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      return { lat, lng, flag: flagOf(cc) };
    }
    return null;
  } catch {
    return null;
  }
}

// Wikipedia IT: exact title (with redirects) → page coordinates. No fuzzy
// search on purpose — a fuzzy match here could be anything; an exact title
// for "Puglia" / "Isole Lofoten" / "Georgia" is the notable place.
async function wikipediaIt(
  title: string,
  hints: string[],
): Promise<GeocodedPlace | null> {
  try {
    const r = await fetch(
      `https://it.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=coordinates&redirects=1&format=json`,
      { headers: UA },
    );
    const data = await r.json();
    const pages = data?.query?.pages;
    const page: any = pages ? Object.values(pages)[0] : null;
    const c = page?.coordinates?.[0];
    if (!c || !Number.isFinite(c.lat) || !Number.isFinite(c.lon)) return null;
    // Wikipedia gives no country code; derive the flag from the name's own
    // country segment when there is exactly one, else stay neutral.
    return { lat: c.lat, lng: c.lon, flag: hints.length === 1 ? flagOf(hints[0]) : "🌍" };
  } catch {
    return null;
  }
}

/**
 * Resolve a destination name ("Puglia, Italia", "Isole Lofoten, Norvegia")
 * to a representative coordinate. Returns null when nothing trustworthy is
 * found — callers must treat that as "unlocated", never plot a guess.
 *
 * Makes up to 2 Nominatim calls (300ms apart) + 1 Wikipedia call; callers
 * that loop over many names must keep their own inter-name rate limiting.
 */
export async function geocodeDestination(fullName: string): Promise<GeocodedPlace | null> {
  const name = fullName.trim();
  if (!name) return null;
  const hints = countryHints(name);
  const city = name.split(",")[0].trim();

  const full = await nominatimArea(name, hints);
  if (full) return full;

  if (city && city.toLowerCase() !== name.toLowerCase()) {
    await sleep(300);
    const byCity = await nominatimArea(city, hints);
    if (byCity) return byCity;
  }

  const byWiki = await wikipediaIt(city || name, hints);
  if (byWiki) return byWiki;

  // Compound first segment ("Lecce & Salento Peninsula", "Lecce & Valle
  // d'Itria") — anchor the pin on the head of the compound. Approximate on
  // purpose: for a world atlas the anchor city is the honest centroid.
  const head = city.split(/\s*[&\/·]\s*/)[0].trim();
  if (head && head.toLowerCase() !== city.toLowerCase()) {
    await sleep(300);
    const byHead = await nominatimArea(head, hints);
    if (byHead) return byHead;
    return wikipediaIt(head, hints);
  }
  return null;
}
