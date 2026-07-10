// ─────────────────────────────────────────────────────────────────────────
// Affiliate IDs — central source of truth.
//
// Solo gli affiliate ATTUALMENTE FUNZIONANTI sono mantenuti qui. Booking e
// GetYourGuide sono stati rimossi (programma partner non accettato) — non
// generare URL verso quei due network.
//
// I valori di default che vedi qui sotto sono gli ID reali del progetto.
// Sovrascrivibili via env var (in Render → Environment) se cambiano.
//
// Altri affiliate (CJ Affiliate e Awin: Hotels.com, Expedia, Viator, FlixBus,
// SamBoat, Undercovertourist, Tablet Hotels) sono ancora hardcoded nel prompt
// del matching engine perché usano URL completi con click-id, non IDs
// parametrici. Se in futuro li vuoi anche tu in questo config, sono URL
// statici da incollare in costanti.
// ─────────────────────────────────────────────────────────────────────────

function envOr(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : fallback;
}

export const AFFILIATES = {
  // Civitatis — aid + cmp parameters on every URL.
  civitatisAid:     envOr("AFFILIATE_CIVITATIS_AID", "112605"),
  civitatisCmp:     envOr("AFFILIATE_CIVITATIS_CMP", "mindroute"),
  // Klook — aid parameter.
  klookAid:         envOr("AFFILIATE_KLOOK_AID",     "116532"),
  // Musement — UTM-based tracking (utm_source/medium/campaign).
  musementCampaign: envOr("AFFILIATE_MUSEMENT_CAMPAIGN", "mindroute-7388"),
  // Ferry crossings (Sardegna/Sicilia/Corsica/isole greche…). SLOT VUOTO:
  // SamBoat NON copre le traversate (è noleggio barche). Quando ti iscrivi a
  // Direct Ferries / Ferryhopper, incolla qui l'URL affiliato completo (o
  // settalo in Render → AFFILIATE_FERRY_URL) e le isole iniziano a rendere.
  // Finché è vuoto, il traghetto resta info onesta senza link.
  ferryUrl:         envOr("AFFILIATE_FERRY_URL", ""),
} as const;

// ── URL builders ─────────────────────────────────────────────────────────

export function civitatisCityUrl(citySlug: string): string {
  return `https://www.civitatis.com/it/${citySlug}/?aid=${AFFILIATES.civitatisAid}&cmp=${AFFILIATES.civitatisCmp}`;
}

export function klookSearchUrl(city: string): string {
  return `https://www.klook.com/search/?q=${encodeURIComponent(city)}&aid=${AFFILIATES.klookAid}`;
}

export function musementCityUrl(citySlug: string): string {
  return `https://www.musement.com/it/${citySlug}/?utm_source=affiliate&utm_medium=affiliate&utm_campaign=${AFFILIATES.musementCampaign}`;
}

// Viator — ricerca per testo (globale): copre attività, tour, esperienze e food
// tour per QUALSIASI luogo. pid/mcid sono gli id affiliate reali del progetto
// (gli stessi del prompt del matching engine).
export function viatorSearchUrl(text: string): string {
  return `https://www.viator.com/searchResults/all?text=${encodeURIComponent(text)}&pid=P00293604&mcid=42383&medium=link`;
}

// Hotels.com via CJ click wrapper — ricerca per città (+ date opzionali). URL
// interno lasciato grezzo come gli altri link del progetto (CJ lo tollera).
export function hotelsComUrl(city: string, checkin?: string, checkout?: string): string {
  const dateQs = `${checkin ? `&q-check-in=${checkin}` : ""}${checkout ? `&q-check-out=${checkout}` : ""}`;
  return `https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=${encodeURIComponent(city)}${dateQs}`;
}

// ── CANONICAL PROVIDER RESOLVER ──────────────────────────────────────────
// Single source of truth: dato un provider v2 (booking.provider) + il contesto
// del viaggio, restituisce l'URL affiliato REALE — gli stessi formati usati dal
// BookTab (client buildAffiliateUrls). Usato per RISCRIVERE server-side ogni
// booking.affiliate_url generato dall'LLM (mai più link inventati/morti) e dal
// companion per citare esattamente gli stessi link. Ritorna null per provider
// non monetizzabili (booking.com, skyscanner, getyourguide, welcome_pickups…):
// il chiamante declassa quel momento a walk_in invece di mostrare un link finto.
export interface AffiliateContext {
  destinationName: string;   // "City, Region, Country" completo
  departure?: string;        // città di partenza (per i voli)
  checkin?: string;          // YYYY-MM-DD
  checkout?: string;         // YYYY-MM-DD
}

// Normalizza ciò che l'LLM emette ("Hotels.com", "the fork", "expedia flights")
// al token canonico del nostro set di partner.
function canonicalProvider(raw: string): string {
  const base = (raw ?? "").trim().toLowerCase().replace(/\.(com|it|net|org)\b/g, "").replace(/\s+/g, "_");
  const syn: Record<string, string> = {
    expedia_flights: "expedia", expediaflights: "expedia", flights: "expedia", flight: "expedia", volo: "expedia",
    hotels_com: "hotels", hotelscom: "hotels", hotel: "hotels", hotels: "hotels",
    tablet: "tablet_hotels", tablethotels: "tablet_hotels", tablet_hotel: "tablet_hotels",
    trip_advisor: "tripadvisor", tripadvisor_it: "tripadvisor",
    thefork: "tripadvisor", the_fork: "tripadvisor", fork: "tripadvisor",
    flix: "flixbus", flixbus_it: "flixbus",
    ferry: "ferry", traghetto: "ferry", nave: "ferry", ferries: "ferry",
    direct_ferries: "ferry", directferries: "ferry", ferryhopper: "ferry",
    sam_boat: "samboat", samboat_it: "samboat",
    cars: "expedia_cars", car: "expedia_cars", expedia_car: "expedia_cars",
  };
  return syn[base] ?? base;
}

export function resolveAffiliateUrl(rawProvider: string, ctx: AffiliateContext): string | null {
  const provider = canonicalProvider(rawProvider);
  const full = ctx.destinationName ?? "";
  const city = full.split(",")[0].trim();
  const destEncoded = encodeURIComponent(full);
  const citySlug = city.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const ci = ctx.checkin, co = ctx.checkout;
  const hotelsDateQs = `${ci ? `&q-check-in=${ci}` : ""}${co ? `&q-check-out=${co}` : ""}`;

  switch (provider) {
    case "expedia": {
      // Senza città di partenza non c'è un deep-link volo affidabile.
      if (!ctx.departure) return null;
      const dep = encodeURIComponent(ctx.departure);
      const ciC = (ci ?? "").replace(/-/g, ""), coC = (co ?? "").replace(/-/g, "");
      const legs = ciC && coC
        ? `leg1=from%3A${dep}%2Cto%3A${destEncoded}%2Cdeparture%3A${ciC}%2F1&leg2=from%3A${destEncoded}%2Cto%3A${dep}%2Cdeparture%3A${coC}%2F1&`
        : `leg1=from%3A${dep}%2Cto%3A${destEncoded}&`;
      return `https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Flights-Search?${legs}passengers=adults%3A1&trip=roundtrip&mode=search`;
    }
    case "expedia_cars":
      return `https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Cars?${ci ? `startDate=${ci}&` : ""}${co ? `endDate=${co}&` : ""}pickUpLocation=${destEncoded}`;
    case "hotels":
      return `https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=${destEncoded}${hotelsDateQs}`;
    case "tablet_hotels":
      return `https://www.kqzyfj.com/click-101710513-15686837?url=https://www.tablethotels.com/find/results?destination=${destEncoded}`;
    case "civitatis":  return civitatisCityUrl(citySlug);
    case "musement":   return musementCityUrl(citySlug);
    case "klook":      return `${klookSearchUrl(city)}${ci ? `&startDate=${ci}` : ""}`;
    case "viator":     return `${viatorSearchUrl(full)}${ci && co ? `&startDate=${ci}&endDate=${co}` : ""}`;
    case "tripadvisor":return `https://www.tripadvisor.it/Search?q=ristoranti+${destEncoded}`;
    case "flixbus":    return `https://www.awin1.com/cread.php?awinmid=110876&awinaffid=2830626&ued=https%3A%2F%2Fwww.flixbus.it`;
    // Traghetti: link solo se hai configurato un affiliate (AFFILIATE_FERRY_URL).
    // Altrimenti null → il chiamante declassa a info onesta (nessun link finto).
    case "ferry":      return AFFILIATES.ferryUrl || null;
    case "samboat":    return `https://www.awin1.com/cread.php?awinmid=32681&awinaffid=2830626&ued=https%3A%2F%2Fwww.samboat.it%2F%3FdestinationId%3D${destEncoded}`;
    // Non monetizzabili / nessun partner → niente link canonico.
    default:           return null;
  }
}
