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
import { fetchUnsplashHero, fetchMomentImage, fetchDayImageWithFallback, buildDestinationPhotoPool, mapWithConcurrency } from "../unsplash";
import { recordRecentDestination } from "../recent-destinations";
import { recordPickSnapshot } from "../trait-recorder";
import { getTraitPriorForUser, formatTraitPriorBlock } from "../trait-prior";
import type { DayV2, MomentV2, MapPointV2, TripMetaV2, PlaceCategory } from "../../shared/schema";
import { requireAuth } from "../auth";
import { resolveAffiliateUrl, type AffiliateContext } from "../affiliate-config";

// Contesto affiliate dal profilo: stessa derivazione di date del BookTab client
// (leaveDate → check-in, +days → check-out; default a +3 mesi se manca la data),
// così i link nei MOMENTI coincidono con quelli della scheda Prenota.
function buildAffiliateContext(destinationName: string, profilingInput: any): AffiliateContext {
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
  return { destinationName, departure, checkin, checkout };
}

// Riscrive booking.affiliate_url di UN momento col link canonico del provider.
// Se il provider non è monetizzabile (nessun partner reale) o il momento è
// walk_in, rimuove l'oggetto booking: mai un bottone con URL inventato/morto.
function rewriteMomentBooking(moment: MomentV2, affCtx: AffiliateContext): void {
  const b = moment.booking;
  if (!b) return;
  if (b.status === "walk_in") { moment.booking = undefined; return; }
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
): Promise<MapPointV2 | null> {
  // Booking: rewrite the LLM-emitted affiliate_url with the canonical one for
  // its provider (or drop the booking if the provider isn't monetizable).
  rewriteMomentBooking(moment, affCtx);

  // Image: LLM URLs are unreliable (fake photo IDs return 404). Always
  // overwrite with a real Unsplash fetch keyed on location + type.
  const realImg = await fetchMomentImage(moment.location_name, moment.type, destinationName);
  moment.image_url = realImg ?? heroFallback;

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

// Enrichment di UN solo giorno (companion regenerate_day): immagine del giorno,
// immagine + geocode per ogni momento, ricalcolo costi. Mutua il giorno in place.
export async function enrichDayV2(day: DayV2, destinationName: string, profilingInput?: any): Promise<void> {
  const affCtx = buildAffiliateContext(destinationName, profilingInput);
  const heroData = await fetchUnsplashHero(destinationName);
  const heroUrl = heroData?.url ?? "";
  const dayImg = await fetchDayImageWithFallback(`${day.title_evocative} ${day.arc}`, destinationName);
  day.hero_image_url = dayImg ?? heroUrl;
  for (const m of day.moments) {
    await enrichMoment(m, destinationName, day.day_number, day.hero_image_url, affCtx);
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

async function enrichItineraryV2(rough: ItineraryV2, destinationName: string, profilingInput?: any): Promise<ItineraryV2> {
  const affCtx = buildAffiliateContext(destinationName, profilingInput);

  // 1. Hero image — overwrite LLM URL with real Unsplash hero.
  const heroData = await fetchUnsplashHero(destinationName);
  const heroUrl = heroData?.url ?? rough.hero_image_url;
  rough.hero_image_url = heroUrl;

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
      const mp = await enrichMoment(m, destinationName, day.day_number, day.hero_image_url, affCtx);
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

function itineraryV2ToInsert(v2: ItineraryV2, destinationId: number, userId: number | null, profilingInput: any): any {
  const tripMeta: TripMetaV2 = {
    em_word: v2.em_word,
    travel_dates: v2.travel_dates,
    total_cost_bookable: v2.total_cost_bookable,
    total_cost_onsite_estimate: v2.total_cost_onsite_estimate,
    total_cost_range: v2.total_cost_range,
    map_points: v2.map_points,
    highlights_v2: v2.highlights,
  };
  return {
    destinationId,
    userId,
    createdAt: new Date().toISOString(),
    days: v2.days,
    // Legacy text columns kept populated for backward-compat readers.
    // budgetSummary/packingList/etc. mapped from v2 fields where applicable.
    budgetSummary: JSON.stringify({ total_cost_range: v2.total_cost_range }),
    packingList: "{}",
    bestTime: v2.travel_dates ? `${v2.travel_dates.start} → ${v2.travel_dates.end}` : "",
    gettingThere: "{}",
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
          const rough = await generateItineraryV2ForDestination(input, destinationName, priorBlock);
          const enriched = await enrichItineraryV2(rough, destinationName, input);
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
