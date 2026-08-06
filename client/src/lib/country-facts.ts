/**
 * country-facts.ts — le "note utili" della schermata Logistica: fuso, valuta,
 * lingua, emergenze.
 *
 * Tabella CURATA a mano, non generata: se il paese non c'è, la tessera non
 * viene mostrata. Meglio un dato in meno che un dato inventato (doc 05).
 * Il fuso NON è un numero fisso: si calcola con Intl fra la zona della
 * destinazione e quella del browser, quindi tiene conto dell'ora legale reale
 * nel giorno del viaggio.
 * ─────────────────────────────────────────────────────────────── */

export type CountryFacts = {
  tz: string;        // zona IANA rappresentativa
  currency: string;  // simbolo + nome breve
  langIt: string;
  langEn: string;
  emergency: string;
};

// Chiavi normalizzate (minuscole, senza accenti): sia forma IT che EN.
const FACTS: Record<string, CountryFacts> = {
  italia:        { tz: "Europe/Rome",       currency: "Euro (€)",            langIt: "Italiano",  langEn: "Italian",    emergency: "112" },
  italy:         { tz: "Europe/Rome",       currency: "Euro (€)",            langIt: "Italiano",  langEn: "Italian",    emergency: "112" },
  francia:       { tz: "Europe/Paris",      currency: "Euro (€)",            langIt: "Francese",  langEn: "French",     emergency: "112" },
  france:        { tz: "Europe/Paris",      currency: "Euro (€)",            langIt: "Francese",  langEn: "French",     emergency: "112" },
  spagna:        { tz: "Europe/Madrid",     currency: "Euro (€)",            langIt: "Spagnolo",  langEn: "Spanish",    emergency: "112" },
  spain:         { tz: "Europe/Madrid",     currency: "Euro (€)",            langIt: "Spagnolo",  langEn: "Spanish",    emergency: "112" },
  portogallo:    { tz: "Europe/Lisbon",     currency: "Euro (€)",            langIt: "Portoghese", langEn: "Portuguese", emergency: "112" },
  portugal:      { tz: "Europe/Lisbon",     currency: "Euro (€)",            langIt: "Portoghese", langEn: "Portuguese", emergency: "112" },
  germania:      { tz: "Europe/Berlin",     currency: "Euro (€)",            langIt: "Tedesco",   langEn: "German",     emergency: "112" },
  germany:       { tz: "Europe/Berlin",     currency: "Euro (€)",            langIt: "Tedesco",   langEn: "German",     emergency: "112" },
  austria:       { tz: "Europe/Vienna",     currency: "Euro (€)",            langIt: "Tedesco",   langEn: "German",     emergency: "112" },
  "paesi bassi": { tz: "Europe/Amsterdam",  currency: "Euro (€)",            langIt: "Olandese",  langEn: "Dutch",      emergency: "112" },
  netherlands:   { tz: "Europe/Amsterdam",  currency: "Euro (€)",            langIt: "Olandese",  langEn: "Dutch",      emergency: "112" },
  olanda:        { tz: "Europe/Amsterdam",  currency: "Euro (€)",            langIt: "Olandese",  langEn: "Dutch",      emergency: "112" },
  belgio:        { tz: "Europe/Brussels",   currency: "Euro (€)",            langIt: "Francese e olandese", langEn: "French & Dutch", emergency: "112" },
  belgium:       { tz: "Europe/Brussels",   currency: "Euro (€)",            langIt: "Francese e olandese", langEn: "French & Dutch", emergency: "112" },
  grecia:        { tz: "Europe/Athens",     currency: "Euro (€)",            langIt: "Greco",     langEn: "Greek",      emergency: "112" },
  greece:        { tz: "Europe/Athens",     currency: "Euro (€)",            langIt: "Greco",     langEn: "Greek",      emergency: "112" },
  irlanda:       { tz: "Europe/Dublin",     currency: "Euro (€)",            langIt: "Inglese",   langEn: "English",    emergency: "112" },
  ireland:       { tz: "Europe/Dublin",     currency: "Euro (€)",            langIt: "Inglese",   langEn: "English",    emergency: "112" },
  finlandia:     { tz: "Europe/Helsinki",   currency: "Euro (€)",            langIt: "Finlandese", langEn: "Finnish",   emergency: "112" },
  finland:       { tz: "Europe/Helsinki",   currency: "Euro (€)",            langIt: "Finlandese", langEn: "Finnish",   emergency: "112" },
  estonia:       { tz: "Europe/Tallinn",    currency: "Euro (€)",            langIt: "Estone",    langEn: "Estonian",   emergency: "112" },
  slovenia:      { tz: "Europe/Ljubljana",  currency: "Euro (€)",            langIt: "Sloveno",   langEn: "Slovenian",  emergency: "112" },
  croazia:       { tz: "Europe/Zagreb",     currency: "Euro (€)",            langIt: "Croato",    langEn: "Croatian",   emergency: "112" },
  croatia:       { tz: "Europe/Zagreb",     currency: "Euro (€)",            langIt: "Croato",    langEn: "Croatian",   emergency: "112" },
  malta:         { tz: "Europe/Malta",      currency: "Euro (€)",            langIt: "Maltese e inglese", langEn: "Maltese & English", emergency: "112" },
  cipro:         { tz: "Asia/Nicosia",      currency: "Euro (€)",            langIt: "Greco",     langEn: "Greek",      emergency: "112" },
  cyprus:        { tz: "Asia/Nicosia",      currency: "Euro (€)",            langIt: "Greco",     langEn: "Greek",      emergency: "112" },

  "regno unito": { tz: "Europe/London",     currency: "Sterlina (£)",        langIt: "Inglese",   langEn: "English",    emergency: "999 / 112" },
  "united kingdom": { tz: "Europe/London",  currency: "Pound (£)",           langIt: "Inglese",   langEn: "English",    emergency: "999 / 112" },
  inghilterra:   { tz: "Europe/London",     currency: "Sterlina (£)",        langIt: "Inglese",   langEn: "English",    emergency: "999 / 112" },
  scozia:        { tz: "Europe/London",     currency: "Sterlina (£)",        langIt: "Inglese",   langEn: "English",    emergency: "999 / 112" },
  scotland:      { tz: "Europe/London",     currency: "Pound (£)",           langIt: "Inglese",   langEn: "English",    emergency: "999 / 112" },
  svizzera:      { tz: "Europe/Zurich",     currency: "Franco svizzero (CHF)", langIt: "Tedesco, francese, italiano", langEn: "German, French, Italian", emergency: "112" },
  switzerland:   { tz: "Europe/Zurich",     currency: "Swiss franc (CHF)",   langIt: "Tedesco, francese, italiano", langEn: "German, French, Italian", emergency: "112" },
  norvegia:      { tz: "Europe/Oslo",       currency: "Corona norvegese (NOK)", langIt: "Norvegese", langEn: "Norwegian", emergency: "112" },
  norway:        { tz: "Europe/Oslo",       currency: "Norwegian krone (NOK)", langIt: "Norvegese", langEn: "Norwegian", emergency: "112" },
  svezia:        { tz: "Europe/Stockholm",  currency: "Corona svedese (SEK)", langIt: "Svedese",  langEn: "Swedish",    emergency: "112" },
  sweden:        { tz: "Europe/Stockholm",  currency: "Swedish krona (SEK)", langIt: "Svedese",   langEn: "Swedish",    emergency: "112" },
  danimarca:     { tz: "Europe/Copenhagen", currency: "Corona danese (DKK)", langIt: "Danese",    langEn: "Danish",     emergency: "112" },
  denmark:       { tz: "Europe/Copenhagen", currency: "Danish krone (DKK)",  langIt: "Danese",    langEn: "Danish",     emergency: "112" },
  islanda:       { tz: "Atlantic/Reykjavik", currency: "Corona islandese (ISK)", langIt: "Islandese", langEn: "Icelandic", emergency: "112" },
  iceland:       { tz: "Atlantic/Reykjavik", currency: "Icelandic króna (ISK)", langIt: "Islandese", langEn: "Icelandic", emergency: "112" },
  polonia:       { tz: "Europe/Warsaw",     currency: "Zloty (PLN)",         langIt: "Polacco",   langEn: "Polish",     emergency: "112" },
  poland:        { tz: "Europe/Warsaw",     currency: "Zloty (PLN)",         langIt: "Polacco",   langEn: "Polish",     emergency: "112" },
  "repubblica ceca": { tz: "Europe/Prague", currency: "Corona ceca (CZK)",   langIt: "Ceco",      langEn: "Czech",      emergency: "112" },
  "czech republic":  { tz: "Europe/Prague", currency: "Czech koruna (CZK)",  langIt: "Ceco",      langEn: "Czech",      emergency: "112" },
  cechia:        { tz: "Europe/Prague",     currency: "Corona ceca (CZK)",   langIt: "Ceco",      langEn: "Czech",      emergency: "112" },
  ungheria:      { tz: "Europe/Budapest",   currency: "Fiorino (HUF)",       langIt: "Ungherese", langEn: "Hungarian",  emergency: "112" },
  hungary:       { tz: "Europe/Budapest",   currency: "Forint (HUF)",        langIt: "Ungherese", langEn: "Hungarian",  emergency: "112" },
  romania:       { tz: "Europe/Bucharest",  currency: "Leu (RON)",           langIt: "Rumeno",    langEn: "Romanian",   emergency: "112" },
  turchia:       { tz: "Europe/Istanbul",   currency: "Lira turca (TRY)",    langIt: "Turco",     langEn: "Turkish",    emergency: "112" },
  turkey:        { tz: "Europe/Istanbul",   currency: "Turkish lira (TRY)",  langIt: "Turco",     langEn: "Turkish",    emergency: "112" },
  albania:       { tz: "Europe/Tirane",     currency: "Lek (ALL)",           langIt: "Albanese",  langEn: "Albanian",   emergency: "112" },

  marocco:       { tz: "Africa/Casablanca", currency: "Dirham (MAD)",        langIt: "Arabo e francese", langEn: "Arabic & French", emergency: "19 (polizia) · 15" },
  morocco:       { tz: "Africa/Casablanca", currency: "Dirham (MAD)",        langIt: "Arabo e francese", langEn: "Arabic & French", emergency: "19 (police) · 15" },
  egitto:        { tz: "Africa/Cairo",      currency: "Sterlina egiziana (EGP)", langIt: "Arabo", langEn: "Arabic",     emergency: "122" },
  egypt:         { tz: "Africa/Cairo",      currency: "Egyptian pound (EGP)", langIt: "Arabo",    langEn: "Arabic",     emergency: "122" },
  tunisia:       { tz: "Africa/Tunis",      currency: "Dinaro (TND)",        langIt: "Arabo e francese", langEn: "Arabic & French", emergency: "197" },
  "sud africa":  { tz: "Africa/Johannesburg", currency: "Rand (ZAR)",        langIt: "Inglese",   langEn: "English",    emergency: "10111" },
  "south africa": { tz: "Africa/Johannesburg", currency: "Rand (ZAR)",       langIt: "Inglese",   langEn: "English",    emergency: "10111" },
  kenya:         { tz: "Africa/Nairobi",    currency: "Scellino (KES)",      langIt: "Swahili e inglese", langEn: "Swahili & English", emergency: "999 / 112" },

  "stati uniti": { tz: "America/New_York",  currency: "Dollaro (USD)",       langIt: "Inglese",   langEn: "English",    emergency: "911" },
  "united states": { tz: "America/New_York", currency: "Dollar (USD)",       langIt: "Inglese",   langEn: "English",    emergency: "911" },
  usa:           { tz: "America/New_York",  currency: "Dollaro (USD)",       langIt: "Inglese",   langEn: "English",    emergency: "911" },
  canada:        { tz: "America/Toronto",   currency: "Dollaro canadese (CAD)", langIt: "Inglese e francese", langEn: "English & French", emergency: "911" },
  messico:       { tz: "America/Mexico_City", currency: "Peso (MXN)",        langIt: "Spagnolo",  langEn: "Spanish",    emergency: "911" },
  mexico:        { tz: "America/Mexico_City", currency: "Peso (MXN)",        langIt: "Spagnolo",  langEn: "Spanish",    emergency: "911" },
  brasile:       { tz: "America/Sao_Paulo", currency: "Real (BRL)",          langIt: "Portoghese", langEn: "Portuguese", emergency: "190" },
  brazil:        { tz: "America/Sao_Paulo", currency: "Real (BRL)",          langIt: "Portoghese", langEn: "Portuguese", emergency: "190" },
  argentina:     { tz: "America/Argentina/Buenos_Aires", currency: "Peso (ARS)", langIt: "Spagnolo", langEn: "Spanish", emergency: "911" },
  cile:          { tz: "America/Santiago",  currency: "Peso (CLP)",          langIt: "Spagnolo",  langEn: "Spanish",    emergency: "133" },
  chile:         { tz: "America/Santiago",  currency: "Peso (CLP)",          langIt: "Spagnolo",  langEn: "Spanish",    emergency: "133" },
  peru:          { tz: "America/Lima",      currency: "Sol (PEN)",           langIt: "Spagnolo",  langEn: "Spanish",    emergency: "105" },
  perù:          { tz: "America/Lima",      currency: "Sol (PEN)",           langIt: "Spagnolo",  langEn: "Spanish",    emergency: "105" },
  colombia:      { tz: "America/Bogota",    currency: "Peso (COP)",          langIt: "Spagnolo",  langEn: "Spanish",    emergency: "123" },
  cuba:          { tz: "America/Havana",    currency: "Peso cubano (CUP)",   langIt: "Spagnolo",  langEn: "Spanish",    emergency: "106" },

  giappone:      { tz: "Asia/Tokyo",        currency: "Yen (¥)",             langIt: "Giapponese", langEn: "Japanese",  emergency: "110 (polizia) · 119" },
  japan:         { tz: "Asia/Tokyo",        currency: "Yen (¥)",             langIt: "Giapponese", langEn: "Japanese",  emergency: "110 (police) · 119" },
  "corea del sud": { tz: "Asia/Seoul",      currency: "Won (KRW)",           langIt: "Coreano",   langEn: "Korean",     emergency: "112 · 119" },
  "south korea": { tz: "Asia/Seoul",        currency: "Won (KRW)",           langIt: "Coreano",   langEn: "Korean",     emergency: "112 · 119" },
  cina:          { tz: "Asia/Shanghai",     currency: "Yuan (CNY)",          langIt: "Cinese",    langEn: "Chinese",    emergency: "110 · 120" },
  china:         { tz: "Asia/Shanghai",     currency: "Yuan (CNY)",          langIt: "Cinese",    langEn: "Chinese",    emergency: "110 · 120" },
  thailandia:    { tz: "Asia/Bangkok",      currency: "Baht (THB)",          langIt: "Thai",      langEn: "Thai",       emergency: "191 · 1669" },
  thailand:      { tz: "Asia/Bangkok",      currency: "Baht (THB)",          langIt: "Thai",      langEn: "Thai",       emergency: "191 · 1669" },
  vietnam:       { tz: "Asia/Ho_Chi_Minh",  currency: "Dong (VND)",          langIt: "Vietnamita", langEn: "Vietnamese", emergency: "113 · 115" },
  indonesia:     { tz: "Asia/Jakarta",      currency: "Rupia (IDR)",         langIt: "Indonesiano", langEn: "Indonesian", emergency: "112" },
  india:         { tz: "Asia/Kolkata",      currency: "Rupia (INR)",         langIt: "Hindi e inglese", langEn: "Hindi & English", emergency: "112" },
  "sri lanka":   { tz: "Asia/Colombo",      currency: "Rupia (LKR)",         langIt: "Singalese", langEn: "Sinhala",    emergency: "119" },
  nepal:         { tz: "Asia/Kathmandu",    currency: "Rupia (NPR)",         langIt: "Nepalese",  langEn: "Nepali",     emergency: "100" },
  "emirati arabi uniti": { tz: "Asia/Dubai", currency: "Dirham (AED)",       langIt: "Arabo",     langEn: "Arabic",     emergency: "999" },
  "united arab emirates": { tz: "Asia/Dubai", currency: "Dirham (AED)",      langIt: "Arabo",     langEn: "Arabic",     emergency: "999" },
  giordania:     { tz: "Asia/Amman",        currency: "Dinaro (JOD)",        langIt: "Arabo",     langEn: "Arabic",     emergency: "911" },
  jordan:        { tz: "Asia/Amman",        currency: "Dinar (JOD)",         langIt: "Arabo",     langEn: "Arabic",     emergency: "911" },

  australia:     { tz: "Australia/Sydney",  currency: "Dollaro australiano (AUD)", langIt: "Inglese", langEn: "English", emergency: "000" },
  "nuova zelanda": { tz: "Pacific/Auckland", currency: "Dollaro neozelandese (NZD)", langIt: "Inglese", langEn: "English", emergency: "111" },
  "new zealand": { tz: "Pacific/Auckland",  currency: "New Zealand dollar (NZD)", langIt: "Inglese", langEn: "English", emergency: "111" },
};

const norm = (s: string) =>
  s.toLowerCase().trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");

export function countryFacts(country: string | undefined | null): CountryFacts | null {
  if (!country) return null;
  const key = norm(country);
  if (FACTS[key]) return FACTS[key];
  // "Portogallo, Europa" / "Japan (Asia)" → prova il primo segmento.
  const head = norm(key.split(/[,(]/)[0]);
  return FACTS[head] ?? null;
}

/**
 * Differenza oraria reale fra la destinazione e il fuso del browser, nel giorno
 * indicato (default: oggi). Restituisce null se il browser non sa risolvere la
 * zona — mai un numero a caso.
 */
export function tzDeltaHours(tz: string, when: Date = new Date()): number | null {
  try {
    const at = (timeZone: string) => {
      const p = new Intl.DateTimeFormat("en-US", {
        timeZone, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }).formatToParts(when);
      const get = (t: string) => Number(p.find(x => x.type === t)?.value ?? 0);
      return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    };
    const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!local) return null;
    return Math.round((at(tz) - at(local)) / 3600000);
  } catch {
    return null;
  }
}

/** Ora corrente a destinazione, formattata ("14:05"). */
export function timeAt(tz: string, lang: "it" | "en", when: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", {
      timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(when);
  } catch {
    return null;
  }
}
