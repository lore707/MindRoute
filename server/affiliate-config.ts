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
