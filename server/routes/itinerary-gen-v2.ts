// ─────────────────────────────────────────────────────────────────────────
// /api/itinerary/generate-v2 — moment-based itinerary endpoint
//
// Pipeline:
//   1. Call Claude via generateItineraryV2ForDestination → rough ItineraryV2
//   2. Enrich: replace LLM image URLs with real Unsplash photos, geocode
//      locations missing lat/lng, recompute cost totals, build map_points.
//   3. Persist with schemaVersion=2 (days[] uses the new moment shape).
// ─────────────────────────────────────────────────────────────────────────

import type { Express } from "express";
import { storage } from "../storage";
import { itineraryLimiter } from "../rate-limiter";
import { generateItineraryV2ForDestination, type ItineraryV2 } from "../matching-engine-v2";
import { fetchUnsplashHero, fetchDayImageWithFallback, buildDestinationPhotoPool, mapWithConcurrency } from "../unsplash";
import { recordRecentDestination } from "../recent-destinations";
import { recordPickSnapshot } from "../trait-recorder";
import { getTraitPriorForUser, formatTraitPriorBlock } from "../trait-prior";
import type { DayV2, MomentV2, MapPointV2, TripMetaV2, PlaceCategory } from "../../shared/schema";
import { requireAuth } from "../auth";
import { resolveAffiliateUrl, expediaStaySearchUrl, viatorExperienceSearchUrl, klookExperienceSearchUrl, civitatisExperienceSearchUrl, musementExperienceSearchUrl, type AffiliateContext } from "../affiliate-config";

// Contesto affiliate esteso: oltre a checkin/checkout "di cortesia" (default a
// +3 mesi, usati dagli altri provider come sempre), traccia le date REALI —
// presenti SOLO se l'utente ha davvero indicato una partenza nel quiz. Il
// deeplink alloggio usa esclusivamente quelle: mai date inventate.
type StayAffiliateContext = AffiliateContext & {
  realCheckin?: string;
  realCheckout?: string;
  lang?: string; // per la label difensiva dell'alloggio
};

// Contesto affiliate dal profilo: stessa derivazione di date del BookTab client
// (leaveDate → check-in, +days → check-out; default a +3 mesi se manca la data),
// così i link nei MOMENTI coincidono con quelli della scheda Prenota.
function buildAffiliateContext(destinationName: string, profilingInput: any): StayAffiliateContext {
  const departure = (profilingInput?.departure ?? "").trim() || undefined;
  const leaveDate = profilingInput?.leaveDate ?? profilingInput?.travelDate ?? "";
  const days = Number(profilingInput?.days) || 7;
  const m = String(leaveDate).match(/(\d{4}-\d{2}-\d{2})/);
  const base = m ? new Date(m[1]) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d; })();
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  let checkin: string | undefined, checkout: string | undefined;
  if (!isNaN(base.getTime())) {
    const co = new Date(base); co.setDate(co.getDate() + days);
    checkin = fmt(base); checkout = fmt(co);
  }
  // Date REALI (solo se l'utente le ha date): check-out = check-in + NOTTI,
  // dove notti = giorni itinerario − 1 (un viaggio di 7 giorni dorme 6 notti —
  // stessa convenzione della scheda Prenota). Derivato, non inventato.
  let realCheckin: string | undefined, realCheckout: string | undefined;
  if (m && !isNaN(new Date(m[1]).getTime())) {
    const nights = Math.max(1, days - 1);
    const rc = new Date(m[1]);
    const rco = new Date(rc); rco.setDate(rco.getDate() + nights);
    realCheckin = fmt(rc); realCheckout = fmt(rco);
  }
  const lang = profilingInput?.lang === "it" ? "it" : "en";
  return { destinationName, departure, checkin, checkout, realCheckin, realCheckout, lang };
}

// Riscrive booking.affiliate_url di UN momento col link canonico del provider.
// Se il provider non è monetizzabile (nessun partner reale) o il momento è
// walk_in, rimuove l'oggetto booking: mai un bottone con URL inventato/morto.
// ALLOGGIO: se il booking porta stay_recommendation (criteri di ricerca), il
// link diventa una Hotel-Search Expedia su zona+città(+date reali) — risultati
// veri e disponibili, mai una property nominata dall'AI.
function rewriteMomentBooking(moment: MomentV2, affCtx: StayAffiliateContext): void {
  const b = moment.booking;
  if (!b) return;
  if (b.status === "walk_in") { moment.booking = undefined; return; }

  const stay = b.stay_recommendation;
  const isLodging = moment.type === "accommodation" || /^(hotels|tablet_hotels|hotel)$/i.test((b.provider ?? "").trim());
  if (isLodging && stay) {
    const parts = (affCtx.destinationName ?? "").split(",").map(s => s.trim()).filter(Boolean);
    const city = parts[0] ?? "";
    const country = parts.length > 1 ? parts[parts.length - 1] : undefined;
    b.affiliate_url = expediaStaySearchUrl({
      district: stay.district || undefined,
      city, country,
      checkin: affCtx.realCheckin,   // SOLO date reali: assenti → ricerca senza date
      checkout: affCtx.realCheckout,
      lang: affCtx.lang,             // IT → EUR+italiano, EN → USD+en_US
    });
    // Difesa anti-specifico-finto: se la label del modello non nomina la zona
    // (probabile property inventata), la riscriviamo sul QUARTIERE; se manca
    // pure il district, resta la città. Mai il nome di una struttura.
    const place = (stay.district || city).trim();
    if (place && !(b.display_label ?? "").toLowerCase().includes(place.toLowerCase())) {
      b.display_label = affCtx.lang === "it"
        ? `Vedi hotel disponibili a ${place}`
        : `See available hotels in ${place}`;
    }
    return;
  }

  // ESPERIENZE VIATOR/KLOOK: query composta dall'AI (mai un prodotto nominato)
  // → ricerca free-text localizzata. Senza query degrada a "cosa fare a
  // <città>"; senza neanche la città il builder torna null → percorso
  // standard del provider (catalogo città).
  const exp = b.experience_recommendation;
  const expProvider = (b.provider ?? "").trim().toLowerCase();
  if (exp && (expProvider === "viator" || expProvider === "klook" || expProvider === "civitatis" || expProvider === "musement")) {
    const city = (affCtx.destinationName ?? "").split(",")[0].trim();
    const args = { searchQuery: exp.search_query, city, lang: affCtx.lang };
    const url = expProvider === "klook" ? klookExperienceSearchUrl(args)
      : expProvider === "civitatis" ? civitatisExperienceSearchUrl(args)
      : expProvider === "musement" ? musementExperienceSearchUrl(args)
      : viatorExperienceSearchUrl(args);
    if (url) {
      b.affiliate_url = url;
      // Difesa anti-prodotto-finto: se la label CTA non riflette la categoria
      // (probabile nome di tour inventato), la riscriviamo sulla categoria.
      const cat = (exp.label ?? "").trim();
      if (cat && !(b.display_label ?? "").toLowerCase().includes(cat.toLowerCase())) {
        b.display_label = affCtx.lang === "it" ? `Vedi esperienze: ${cat}` : `See experiences: ${cat}`;
      }
      return;
    }
  }

  const url = resolveAffiliateUrl(b.provider, affCtx);
  if (url) b.affiliate_url = url;
  else moment.booking = undefined; // provider senza partner → declassa a walk_in
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=en`);
    const d = await r.json();
    if (d?.[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
    return null;
  } catch { return null; }
}

// Recompute day-level cost aggregates from moments. LLM arithmetic is
// unreliable — always override.
function recomputeDayCosts(day: DayV2): void {
  let bookable = 0;
  let onsite = 0;
  for (const m of day.moments) {
    const cost = m.cost_max ?? m.cost_min ?? 0;
    const isBookable = m.booking?.status === "bookable_now" || m.booking?.status === "reserve_recommended";
    if (isBookable) bookable += cost;
    else onsite += cost;
  }
  day.cost_bookable_total = bookable;
  day.cost_onsite_estimate = onsite;
}

// Enrich a single moment in-place: real image + geocode if needed. Returns
// any map_point that should be added to the top-level map_points array.
async function enrichMoment(
  moment: MomentV2,
  destinationName: string,
  dayNumber: number,
  heroFallback: string,
  affCtx: AffiliateContext,
  nextPoolImage?: () => string | null,
): Promise<MapPointV2 | null> {
  // Booking: rewrite the LLM-emitted affiliate_url with the canonical one for
  // its provider (or drop the booking if the provider isn't monetizable).
  rewriteMomentBooking(moment, affCtx);

  // Image: LLM URLs are unreliable (fake photo IDs return 404). Always
  // overwrite with a real photo. Le foto vengono da un POOL geo-concreto
  // deduplicato (2-3 search totali) invece di una search Unsplash PER momento:
  // ~28 chiamate in meno a generazione — il free tier è 50/ora e ci stavamo
  // dentro a malapena — e decine di secondi risparmiati.
  moment.image_url = nextPoolImage?.() ?? heroFallback;

  // Geocode: only if we have a location_name and the LLM didn't already
  // provide coords. Bias the query with the city so Nominatim doesn't
  // return a same-named place on the other side of the world.
  if (moment.location_name && (typeof moment.location_lat !== "number" || typeof moment.location_lng !== "number")) {
    const city = destinationName.split(",")[0].trim();
    const coords = await geocode(`${moment.location_name} ${city}`);
    if (coords) {
      moment.location_lat = coords.lat;
      moment.location_lng = coords.lng;
    }
  }

  if (typeof moment.location_lat === "number" && typeof moment.location_lng === "number" && moment.location_name) {
    return {
      day: dayNumber,
      lat: moment.location_lat,
      lng: moment.location_lng,
      label: moment.location_name,
      category: momentTypeToCategory(moment.type),
    };
  }
  return null;
}

// Categoria mappa dal tipo di momento v2. accommodation→lodging (l'alloggio ora
// è SEMPRE pingato), food→food, experience→experience, view→sight (tramonti/
// spiagge), walk→sight. transport/rest non hanno un luogo da pingare → other.
function momentTypeToCategory(type: string): PlaceCategory {
  switch (type) {
    case "accommodation": return "lodging";
    case "food":          return "food";
    case "experience":    return "experience";
    case "view":          return "sight";
    case "walk":          return "sight";
    default:              return "custom";
  }
}

// Allocatore di foto dal pool: ogni chiamata restituisce una foto non ancora
// usata (o null quando il pool è esaurito → il chiamante usa il day hero).
function makePoolAllocator(pool: Array<{ id: string; url: string }>): () => string | null {
  let i = 0;
  return () => (i < pool.length ? pool[i++].url : null);
}

// Enrichment di UN solo giorno (companion regenerate_day): immagine del giorno,
// immagine + geocode per ogni momento, ricalcolo costi. Mutua il giorno in place.
export async function enrichDayV2(day: DayV2, destinationName: string, profilingInput?: any): Promise<void> {
  const affCtx = buildAffiliateContext(destinationName, profilingInput);
  const [heroData, pool] = await Promise.all([
    fetchUnsplashHero(destinationName),
    buildDestinationPhotoPool(destinationName, 8),
  ]);
  const heroUrl = heroData?.url ?? "";
  const dayImg = await fetchDayImageWithFallback(`${day.title_evocative} ${day.arc}`, destinationName);
  day.hero_image_url = dayImg ?? heroUrl;
  const nextImg = makePoolAllocator(pool);
  for (const m of day.moments) {
    await enrichMoment(m, destinationName, day.day_number, day.hero_image_url, affCtx, nextImg);
  }
  recomputeDayCosts(day);
}

// Dedup moment images: same Unsplash URL across two moments is jarring.
// When we detect a duplicate, blank it so the UI falls back to the day
// hero image (cheaper than firing a second Unsplash request, which would
// likely return the same top-result for the same query anyway).
function dedupMomentImages(days: DayV2[], heroFallback: string): void {
  const seen = new Set<string>();
  for (const d of days) {
    for (const m of d.moments) {
      if (m.image_url && seen.has(m.image_url)) {
        m.image_url = d.hero_image_url || heroFallback;
      } else if (m.image_url) {
        seen.add(m.image_url);
      }
    }
  }
}

// Prefetch avviabile PRIMA/insieme alla chiamata LLM (la destinazione è nota
// dall'inizio): hero + pool foto viaggiano in parallelo ai ~2-3 minuti di
// generazione invece di accodarsi dopo.
export function prefetchDestinationImages(destinationName: string) {
  return {
    hero: fetchUnsplashHero(destinationName).catch(() => null),
    pool: buildDestinationPhotoPool(destinationName, 30).catch(() => [] as Array<{ id: string; url: string }>),
  };
}

export async function enrichItineraryV2(
  rough: ItineraryV2,
  destinationName: string,
  profilingInput?: any,
  prefetch?: ReturnType<typeof prefetchDestinationImages>,
): Promise<ItineraryV2> {
  const affCtx = buildAffiliateContext(destinationName, profilingInput);

  // 0. Date di viaggio — fonte unica: la stessa finestra dei link di booking
  //    (leaveDate, o +3 mesi da oggi). L'LLM le inventava senza ancora
  //    temporale e finivano NEL PASSATO ("15/06/2025" mostrato in UI a
  //    luglio 2026). Placeholder finché travel_dates_confirmed !== true.
  if (affCtx.checkin && affCtx.checkout) {
    rough.travel_dates = { start: affCtx.checkin, end: affCtx.checkout };
    const start = new Date(affCtx.checkin + "T12:00:00Z");
    for (const d of rough.days) {
      const dd = new Date(start); dd.setUTCDate(dd.getUTCDate() + (d.day_number - 1));
      (d as any).date = dd.toISOString().split("T")[0];
    }
  }

  // 1. Hero image — overwrite LLM URL with real Unsplash hero.
  const pf = prefetch ?? prefetchDestinationImages(destinationName);
  const [heroData, pool] = await Promise.all([pf.hero, pf.pool]);
  const heroUrl = heroData?.url ?? rough.hero_image_url;
  rough.hero_image_url = heroUrl;
  const nextImg = makePoolAllocator(pool);

  // 2. Per-day enrichment, capped at 2 days in flight to avoid burst on
  //    Nominatim (1 req/sec) and Unsplash (50 req/hr per-IP free tier).
  const allMapPoints: MapPointV2[] = [];

  await mapWithConcurrency(rough.days, 2, async (day) => {
    // Day hero image
    const dayQuery = `${day.title_evocative} ${day.arc}`;
    const dayImg = await fetchDayImageWithFallback(dayQuery, destinationName);
    day.hero_image_url = dayImg ?? heroUrl;

    // Moments: process serially within a day to respect Nominatim rate limit
    // (1 req/sec per host) — concurrency lives at the day-level (2 days in
    // parallel × 1 moment serial = 2 Nominatim req/sec, safe).
    for (const m of day.moments) {
      const mp = await enrichMoment(m, destinationName, day.day_number, day.hero_image_url, affCtx, nextImg);
      if (mp) allMapPoints.push(mp);
    }

    recomputeDayCosts(day);
  });

  // 3. Dedup repeated images across moments — pick day hero as fallback.
  dedupMomentImages(rough.days, heroUrl);

  // 4. Top-level totals — always recompute from per-day numbers.
  rough.total_cost_bookable = rough.days.reduce((a, d) => a + d.cost_bookable_total, 0);
  rough.total_cost_onsite_estimate = rough.days.reduce((a, d) => a + d.cost_onsite_estimate, 0);

  // 5. Top-level map_points: prefer the LLM's if present and well-formed,
  //    otherwise use the enriched list. Keep at most 1 point per (day,label)
  //    to avoid clutter on the map.
  if (!rough.map_points || rough.map_points.length === 0) {
    const seen = new Set<string>();
    rough.map_points = allMapPoints.filter(p => {
      const k = `${p.day}|${p.label}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }

  return rough;
}

// ── Persistence: map ItineraryV2 → DB row (schemaVersion=2) ───────────────

// tripMeta v2 da un itinerario arricchito — usato sia alla creazione che al
// refine L2 (rigenerazione completa) così i due percorsi restano coerenti.
export function buildTripMetaV2(v2: ItineraryV2): TripMetaV2 {
  return {
    em_word: v2.em_word,
    travel_dates: v2.travel_dates,
    total_cost_bookable: v2.total_cost_bookable,
    total_cost_onsite_estimate: v2.total_cost_onsite_estimate,
    total_cost_range: v2.total_cost_range,
    map_points: v2.map_points,
    highlights_v2: v2.highlights,
  };
}

// Colonna legacy budgetSummary come {items:[{label,total}]} — il formato che
// Redesign (share) e Dashboard sanno già disegnare come barre. Prima era un
// blob {total_cost_range} che nessun parser riconosceva → JSON grezzo a schermo.
function buildLegacyBudgetSummary(v2: ItineraryV2, lang: "it" | "en"): string {
  const eur = (n: number) => `€${Math.round(n)}`;
  const items: Array<{ label: string; total: string }> = [];
  if (v2.total_cost_bookable) items.push({ label: lang === "it" ? "Prenotabile ora" : "Bookable now", total: eur(v2.total_cost_bookable) });
  if (v2.total_cost_onsite_estimate) items.push({ label: lang === "it" ? "In loco (stima)" : "On-site (est.)", total: eur(v2.total_cost_onsite_estimate) });
  if (!items.length) return "";
  items.push({ label: lang === "it" ? "Totale" : "Total", total: eur((v2.total_cost_bookable ?? 0) + (v2.total_cost_onsite_estimate ?? 0)) });
  return JSON.stringify({ items });
}

function itineraryV2ToInsert(v2: ItineraryV2, destinationId: number, userId: number | null, profilingInput: any): any {
  const tripMeta = buildTripMetaV2(v2);
  return {
    destinationId,
    userId,
    createdAt: new Date().toISOString(),
    days: v2.days,
    // Legacy text columns kept populated for backward-compat readers.
    // budgetSummary nel formato {items:[…]} che i reader sanno disegnare;
    // packingList/gettingThere vuoti (i placeholder "{}" finivano A SCHERMO
    // grezzi su share page e vista Pratica); bestTime vuoto per v2 — le date
    // vere vivono in tripMeta.travel_dates e hanno già il loro pannello.
    budgetSummary: buildLegacyBudgetSummary(v2, profilingInput?.lang === "it" ? "it" : "en"),
    packingList: "",
    bestTime: "",
    gettingThere: "",
    closingMessage: v2.closing_quote,
    destinationName: v2.destination,
    tripSummary: v2.manifesto.slice(0, 200),
    highlights: null, // v1 column unused for v2 rows; richer highlights live in tripMeta.highlights_v2
    whyYours: v2.manifesto,
    heroImageUrl: v2.hero_image_url,
    heroPhotographer: null,
    heroPhotographerUrl: null,
    topAffiliateLinks: null,
    rawNarrative: null,
    schemaVersion: 2,
    country: v2.country,
    tripMeta,
    profilingInput,
    lang: profilingInput?.lang === "it" ? "it" : "en",
  };
}

// Generazioni in corso, per destinationId. Se il client ricarica o ritenta mentre
// la prima generazione è ancora viva, la seconda richiesta si aggancia allo stesso
// risultato invece di avviare un secondo (costoso) giro di LLM. Resiliente ai
// touch/refresh accidentali dell'utente.
const inFlightV2 = new Map<number, Promise<{ id: number; itinerary: any }>>();

export function registerItineraryGenV2Routes(app: Express) {
  app.post("/api/itinerary/generate-v2", requireAuth, itineraryLimiter, async (req, res) => {
    try {
      const { input, destinationName, destinationId, tagline, whyYours } = req.body;
      if (!input || !destinationName || !destinationId) {
        return res.status(400).json({ message: "Missing input, destinationName or destinationId" });
      }
      const destIdNum = Number(destinationId);

      // 1) Idempotenza: se l'itinerario per questa meta esiste già (es. la prima
      //    richiesta è arrivata in fondo mentre il client si era ricaricato),
      //    restituiscilo subito senza rigenerare.
      const existing = await storage.getItinerary(destIdNum);
      if (existing) {
        return res.json({ id: existing.id, resumed: true });
      }

      // 2) Dedup in-flight: se una generazione per questa meta è già in corso,
      //    aspetta lo stesso risultato.
      let gen = inFlightV2.get(destIdNum);
      if (!gen) {
        const userId = (req.user as any)?.id ?? null;
        const prior = await getTraitPriorForUser(userId);
        let priorBlock = prior ? formatTraitPriorBlock(prior) : "";
        // Caso "città precisa" (Option C): la card scelta porta un angolo (tagline).
        // L'intero itinerario va modellato su quel carattere, non su una Barcellona
        // generica. Inietto lo steering nel priorBlock.
        if (typeof tagline === "string" && tagline.trim()) {
          priorBlock += `\n\nTRIP ANGLE (mandatory): The traveler chose the "${tagline.trim()}" way to live ${destinationName}. Shape the ENTIRE itinerary around this character — every day, every moment must clearly express it. ${typeof whyYours === "string" && whyYours.trim() ? `Why it fits them: ${whyYours.trim()}` : ""}`.trim();
        }
        gen = (async () => {
          // Hero + pool foto partono ORA, in parallelo alla generazione LLM
          // (~2-3 min): quando l'enrichment ne ha bisogno sono già risolti.
          const prefetch = prefetchDestinationImages(destinationName);
          const rough = await generateItineraryV2ForDestination(input, destinationName, priorBlock);
          const enriched = await enrichItineraryV2(rough, destinationName, input, prefetch);
          const insertRow = itineraryV2ToInsert(enriched, destIdNum, userId, input);
          const saved = await storage.createItinerary(insertRow);
          recordRecentDestination(destinationName).catch(() => {});
          recordPickSnapshot({ userId, profilingInput: input, destinationName, itineraryId: saved.id });
          return { id: saved.id, itinerary: enriched };
        })();
        inFlightV2.set(destIdNum, gen);
        gen.finally(() => inFlightV2.delete(destIdNum));
      }

      const result = await gen;
      res.json(result);
    } catch (err) {
      console.error("[generate-v2] error:", err);
      res.status(500).json({ message: "Failed to generate v2 itinerary", detail: err instanceof Error ? err.message : String(err) });
    }
  });
}
