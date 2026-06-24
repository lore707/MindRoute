// ─────────────────────────────────────────────────────────────────────────
// matching-engine v2 — moment-based itinerary generation
//
// Why a separate file: matching-engine.ts is ~1300 lines of v1 prompt logic
// that still has callers (destination chooser, day regeneration). v2 reuses
// the profile-precision sections of buildPrompt but replaces the JSON
// OUTPUT FORMAT block entirely, plus appends MOMENT STRUCTURE RULES.
// ─────────────────────────────────────────────────────────────────────────

import { z } from "zod";
import { buildPrompt, client, type ProfilingInput } from "./matching-engine";
import type {
  MomentType,
  BookingStatus,
  EnergyLevel,
  WeatherCondition,
  DayV2,
  MomentV2,
  HighlightV2,
  MapPointV2,
  TripMetaV2,
} from "../shared/schema";

// ── V2 Zod schemas — runtime validation for Claude output ─────────────────

// Loose enum: Claude, quando genera con lang="it", a volte emette i token
// strutturali in italiano ("cibo" invece di "food", "pioggia" invece di "rain").
// Con un z.enum rigido un solo valore localizzato fa fallire l'INTERO parse v2
// → fallback costoso al legacy stream. Qui normalizziamo (trim+lowercase+
// sinonimi IT) RICONDUCENDO al token canonico EN, così il resto dell'app — che
// indicizza per chiave inglese — continua a funzionare. (1A audit)
function looseEnum<T extends string>(canonical: readonly T[], synonyms: Record<string, T> = {}): z.ZodType<T> {
  const set = new Set<string>(canonical as readonly string[]);
  return z.preprocess((v) => {
    if (typeof v !== "string") return v;
    const k = v.trim().toLowerCase();
    if (set.has(k)) return k;
    return synonyms[k] ?? v;
  }, z.enum(canonical as unknown as [T, ...T[]])) as unknown as z.ZodType<T>;
}

const momentTypeSchema = looseEnum<MomentType>(
  ["transport", "accommodation", "food", "experience", "walk", "view", "rest"],
  {
    trasporto: "transport", spostamento: "transport",
    alloggio: "accommodation", hotel: "accommodation", soggiorno: "accommodation",
    cibo: "food", mangiare: "food", pasto: "food", ristorante: "food",
    esperienza: "experience", attività: "experience", "attivita": "experience",
    camminata: "walk", passeggiata: "walk", "a piedi": "walk",
    vista: "view", panorama: "view", veduta: "view",
    riposo: "rest", pausa: "rest", relax: "rest",
  },
) satisfies z.ZodType<MomentType>;

const bookingStatusSchema = looseEnum<BookingStatus>(
  ["bookable_now", "reserve_recommended", "walk_in"],
  {
    prenotabile: "bookable_now", "prenotabile_ora": "bookable_now", prenotabile_adesso: "bookable_now",
    consigliato: "reserve_recommended", consigliata: "reserve_recommended", "prenotazione_consigliata": "reserve_recommended",
    "senza_prenotazione": "walk_in", "accesso_libero": "walk_in", walkin: "walk_in",
  },
) satisfies z.ZodType<BookingStatus>;

const energyLevelSchema = looseEnum<EnergyLevel>(
  ["low", "medium", "high"],
  { basso: "low", bassa: "low", medio: "medium", media: "medium", alto: "high", alta: "high" },
) satisfies z.ZodType<EnergyLevel>;

const weatherConditionSchema = looseEnum<WeatherCondition>(
  ["sunny", "cloudy", "rain", "mixed", "snow"],
  {
    soleggiato: "sunny", sole: "sunny", sereno: "sunny",
    nuvoloso: "cloudy", coperto: "cloudy", nuvole: "cloudy",
    pioggia: "rain", piovoso: "rain", piova: "rain",
    misto: "mixed", variabile: "mixed",
    neve: "snow", nevoso: "snow",
  },
) satisfies z.ZodType<WeatherCondition>;

const bookingInfoV2Schema = z.object({
  // Free string — provider names are too varied/localized to enumerate without
  // failing valid itineraries ("tripadvisor", "trenitalia", "liberty lines",
  // "hotels.com"). The affiliate steer lives in the prompt, not in validation.
  provider: z.string(),
  affiliate_url: z.string(),
  display_label: z.string(),
  status: bookingStatusSchema,
});

const transportToNextV2Schema = z.object({
  // Free string — Claude localizes/combines modes ("a piedi", "bici", "aliscafo",
  // "bici → a piedi"); enumerating them rigidly only triggers costly 500s.
  mode: z.string(),
  duration_min: z.number(),
  cost_estimate: z.string().optional(),
  note: z.string().optional(),
});

const planBV2Schema = z.object({
  trigger: z.string(),
  alternative: z.string(),
});

const momentV2Schema: z.ZodType<MomentV2> = z.object({
  id: z.string(),
  type: momentTypeSchema,
  title_evocative: z.string(),
  title_operational: z.string(),
  // English canonical + Italian equivalents Claude emits when lang="it":
  // normalizziamo al token EN così i consumer (icone/slot) restano coerenti.
  time_label: looseEnum<MomentV2["time_label"]>(
    ["morning", "lunch", "afternoon", "evening", "night"],
    { mattina: "morning", mezzogiorno: "lunch", pranzo: "lunch", pomeriggio: "afternoon", sera: "evening", notte: "night" },
  ),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  duration_min: z.number().optional(),
  cost_min: z.number().optional(),
  cost_max: z.number().optional(),
  cost_note: z.string().optional(),
  location_name: z.string().optional(),
  location_address: z.string().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  image_url: z.string(),
  image_alt: z.string(),
  booking: bookingInfoV2Schema.optional(),
  description: z.string(),
  why_this: z.string(),
  transport_to_next: transportToNextV2Schema.optional(),
  plan_b: planBV2Schema.optional(),
});

const weatherForecastV2Schema = z.object({
  temp_min: z.number(),
  temp_max: z.number(),
  condition: weatherConditionSchema,
  note: z.string().optional(),
});

const dayV2Schema: z.ZodType<DayV2> = z.object({
  day_number: z.number(),
  date: z.string().optional(),
  arc: z.string(),
  title_evocative: z.string(),
  subtitle: z.string(),
  hero_image_url: z.string(),
  weather_forecast: weatherForecastV2Schema.optional(),
  energy_level: energyLevelSchema,
  energy_note: z.string().optional(),
  walking_distance_km: z.number().optional(),
  cost_bookable_total: z.number(),
  cost_onsite_estimate: z.number(),
  moments: z.array(momentV2Schema).min(2).max(6),
});

const highlightV2Schema: z.ZodType<HighlightV2> = z.object({
  icon: z.string(),
  name: z.string(),
  description: z.string(),
});

const mapPointV2Schema: z.ZodType<MapPointV2> = z.object({
  day: z.number(),
  lat: z.number(),
  lng: z.number(),
  label: z.string(),
});

export const itineraryV2Schema = z.object({
  destination: z.string(),
  country: z.string(),
  duration_days: z.number(),
  travel_dates: z.object({ start: z.string(), end: z.string() }).optional(),
  hero_image_url: z.string(),
  manifesto: z.string(),
  em_word: z.string().optional(),
  highlights: z.array(highlightV2Schema),
  days: z.array(dayV2Schema),
  total_cost_bookable: z.number(),
  total_cost_onsite_estimate: z.number(),
  total_cost_range: z.string(),
  closing_quote: z.string(),
  map_points: z.array(mapPointV2Schema).optional(),
});

export type ItineraryV2 = z.infer<typeof itineraryV2Schema>;

// ── V2 prompt builder ─────────────────────────────────────────────────────
//
// Strategy: call the v1 buildPrompt to get the full profile-precision
// context (chips extraction, tilt inference, day-arc rules, etc.) — then
// truncate at the v1 OUTPUT FORMAT marker and append v2 rules + JSON
// template. The marker is "IMAGE QUERY & IMAGE URL" in the v1 prompt;
// everything before it is profile/precision logic that applies to v2 too.

const V1_OUTPUT_MARKER = "IMAGE QUERY & IMAGE URL";

export function buildPromptV2(input: ProfilingInput, priorBlock = ""): string {
  const v1 = buildPrompt(input, priorBlock);
  const idx = v1.indexOf(V1_OUTPUT_MARKER);
  if (idx === -1) {
    throw new Error("buildPromptV2: v1 OUTPUT FORMAT marker not found — buildPrompt has drifted");
  }
  const profileContext = v1.substring(0, idx).trimEnd();
  return profileContext + "\n\n" + v2OutputSection(input);
}

function v2OutputSection(input: ProfilingInput): string {
  const lang = input.lang === "it" ? "Italian" : "English";
  const days = Math.min(input.days, 14);
  return `
═══════════════════════════════════════════════════════════════════════════
MOMENT STRUCTURE RULES — v2 schema (moment-based itinerary)
═══════════════════════════════════════════════════════════════════════════

The output is no longer four fixed time-slots (morning/lunch/afternoon/evening).
Each day is an array of "moments" — discrete experiences with full operational
detail. Apply the following rules strictly.

1. MOMENT COUNT PER DAY
   - Minimum 2 moments, maximum 6.
   - Day 1 (arrival) and final day (departure) with long-haul flight: 2–3 moments only.
   - Intermediate days: 3–5 moments. Never force 4 fixed.
   - Avoid filling for the sake of filling. If a day has 3 strong beats, 3 is right.

2. DAY 1 MANDATORY MIX
   - At least 1 moment of type "transport" (the arrival flight/train/etc.).
   - At least 1 moment of type "accommodation" (check-in or bag drop).
   - If arrival is after 19:00 local, accommodation is the evening moment.
   - If arrival is before 14:00 local, accommodation is bag-drop in the morning/early afternoon.
   - Long-haul flight: render as a SINGLE moment with title_operational like
     "Milan MXP → Sydney → Hobart HBA — 27h via SYD". Do NOT split into
     Departure / Layover / Arrival — that inflates the list artificially.
     Capture stopover details inside "description".

2b. DAY 1 CONVERSION DOCTRINE — function of the moment decides the CTA
   Day 1 is ARRIVAL, not activity. It has exactly ONE strong booking anchor: the
   accommodation. The traveler is tired and carrying bags — do not load it with
   things to book. Decide each moment's booking by its FUNCTION, never by default:
   - ARRIVAL TRANSPORT (morning): give it a booking ONLY if a real partner fits the
     ACTUAL mode — flight → Expedia flights, long-distance coach → FlixBus. If the
     real mode has no matching partner (scheduled ferry, regional train, generic
     "transfer"), make it walk_in with honest prose and NO booking object. This
     converts weakly — never force a mismatched link onto it.
   - THE TRANSIT MEAL (lunch at the gate / on board / on first arrival): ALWAYS
     walk_in. NO booking object, ever. It converts zero. It is still a real beat —
     write it so it reads complete WITHOUT a button (no dangling CTA, no apology).
   - TRANSFER TO BASE + first light orientation (afternoon): the last hop to the
     lodging gets a booking ONLY if it is genuinely bookable through a fitting
     partner (FlixBus coach, a pre-booked private transfer). A scheduled ferry or a
     short taxi has no partner → prose, no button. The first light wander of the
     neighbourhood is always walk_in. NEVER place a 2–3h paid tour here.
   - ACCOMMODATION (evening, or bag-drop if arrival is early): THIS is the day's one
     real conversion. provider = hotels (or tablet_hotels), status = "bookable_now".
     Booked once, it covers the whole trip. The welcome dinner in a local tavern is
     normally not bookable → walk_in prose, no forced TripAdvisor link.
   - Bookable EXPERIENCES (boat trips, guided tours, paid activities, classes) NEVER
     appear on Day 1. They live on the rested mid/peak days. Day 1 carries at most
     one strong CTA (the stay) — sometimes the arrival flight too, nothing more.

3. MOMENT IMAGE
   - Every moment has its own image_url. NEVER reuse the same image for two
     different moments in the same itinerary. Each moment.image_url must be
     unique and visually distinct.
   - Use REAL Unsplash URLs only: "https://images.unsplash.com/photo-[REAL_ID]?w=800&h=500&fit=crop".
     Never invent IDs. If unsure, prefer the destination's most-photographed landmark
     for accommodation moments and generic scenes (food plate, beach view, mountain trail)
     for the rest — never invent IDs the LLM is unsure of.

4. WHY_THIS — psychological anchor
   - Always reference a specific element from the user's profile/chips.
   - Examples: "You flagged 'quiet over crowded' — Battery Point at dusk is exactly that.",
     "Your 'slow mornings' preference shows: this café opens at 7am, you're not rushed."
   - NEVER generic ("you'll love this", "perfect for you", "amazing experience").
   - 1 sentence, max 20 words.

5. PLAN_B
   - MANDATORY on moments of type "view", "walk", and any outdoor "experience".
   - Optional for "transport", "accommodation", "food", "rest".
   - trigger: "If raining" / "If sold out" / "If closed Monday" / etc.
   - alternative: 1 short sentence with a concrete swap.

6. BOOKING INFO
   - status = "bookable_now" → strong CTA, the user can complete the booking now
     (flight, hotel, paid tour with date selection).
   - status = "reserve_recommended" → recommend reservation but walk-in is possible
     (popular restaurants, museums with timed entry).
   - status = "walk_in" → no booking needed, info only (free viewpoint, public beach).
   - DECIDE walk_in vs bookable BY FUNCTION + PARTNER-FIT, not by default. A moment
     is bookable_now / reserve_recommended ONLY when it is genuinely reservable AND a
     real partner from our set fits its actual mode (see rule 2b for Day 1). A transit
     meal, a scheduled ferry, a generic transfer, a free wander → walk_in. When in
     doubt on an arrival/transit moment, prefer walk_in over a forced link.
   - COVERAGE: once a moment IS classified bookable (not walk_in), it MUST carry a
     "booking" object with a valid affiliate_url — never a bookable moment without a
     link. The judgement is "is this really bookable through us?", not "attach a
     button everywhere".
   - For walk_in moments, OMIT the booking object entirely (do not include provider="none").
   - affiliate_url — USE ONLY the affiliate link templates defined earlier in this
     prompt (Expedia, Hotels.com, Tablet Hotels, Civitatis, Musement, Klook, Viator,
     TripAdvisor, FlixBus, SamBoat). NEVER use skyscanner.com, booking.com,
     getyourguide.com, airbnb.com or any other non-affiliate URL — those earn nothing.
     Match the template to the moment: transport→Expedia flights (or FlixBus/SamBoat
     for ground/sea), accommodation→Hotels.com/Tablet Hotels, food→TripAdvisor,
     experience/tour/view→Civitatis/Musement (Europe) · Klook (Asia) · Viator (rest).
   - provider — one of: expedia, hotels, tablet_hotels, civitatis, musement, klook,
     viator, tripadvisor, flixbus, samboat, expedia_cars. Never use skyscanner,
     getyourguide, booking.com, trainline, welcome_pickups or airbnb — they earn
     nothing and will be DROPPED server-side (the moment becomes walk_in). Getting
     the provider RIGHT is what matters most: the affiliate_url is normalized
     server-side from the provider + destination, so a correct provider guarantees a
     correct link even if your URL is imperfect.
   - display_label — write an ACTION + OBJECT label in the response language, naming
     the real place: e.g. "Prenota il volo per Lisbona", "Prenota un tavolo · Taverna
     Aktaion", "Prenota l'esperienza · Tour della Medina", "Prenota l'hotel · Riad
     Dar Anika". Never a bare "Prenota"/"Book" and never "Find flights"/"Click here".

7. COSTS
   - cost_bookable_total per day = sum of cost_max for all moments with
     booking.status === "bookable_now" or "reserve_recommended".
   - cost_onsite_estimate per day = sum of cost estimates for walk_in moments
     plus a generous buffer for incidentals (coffee, snacks, local transport).
   - total_cost_bookable = sum of cost_bookable_total across all days.
   - total_cost_onsite_estimate = sum of cost_onsite_estimate across all days.
   - total_cost_range = display-ready string, e.g. "€1.800–2.400/pp".

8. TRANSPORT_TO_NEXT
   - On every moment EXCEPT the last of the day, include transport_to_next.
   - mode + duration_min + cost_estimate (string like "€5–8" or omit if free walk).
   - note (optional) — 1 short phrase: "10 min a piedi lungo il pier".

9. DAY HEADER FIELDS
   - Do NOT output weather_forecast. We never show invented weather for a future
     date — it would be fabricated. Omit the field entirely.
   - energy_level: low | medium | high based on walking_distance_km + total moment count.
   - energy_note: 1 short sentence, only if energy is unusual ("Heavy travel day — keep evening soft").
   - walking_distance_km: realistic estimate for the day's walking.

10. LANGUAGE
   - ALL text fields in ${lang}. Every single field. No mixed-language output.

═══════════════════════════════════════════════════════════════════════════
REQUIRED JSON OUTPUT — v2 schema
═══════════════════════════════════════════════════════════════════════════

Return a SINGLE JSON object (not wrapped in destinations[] / itineraries[]).
Exactly ${days} days in the "days" array.

{
  "destination": "City, Region, Country",
  "country": "Country name only",
  "duration_days": ${days},
  "travel_dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD" },
  "hero_image_url": "https://images.unsplash.com/photo-[REAL_ID]?w=1600&h=900&fit=crop",
  "manifesto": "Long evocative quote — why this place is yours. 2–3 sentences, sensory, specific.",
  "em_word": "single word from manifesto to italicize for emphasis",
  "highlights": [
    { "icon": "🏔", "name": "Highlight name", "description": "1 short evocative sentence" },
    { "icon": "🌊", "name": "Highlight name", "description": "1 short evocative sentence" },
    { "icon": "🍽", "name": "Highlight name", "description": "1 short evocative sentence" },
    { "icon": "🌅", "name": "Highlight name", "description": "1 short evocative sentence" }
  ],
  "days": [
    {
      "day_number": 1,
      "date": "YYYY-MM-DD",
      "arc": "Arrival",
      "title_evocative": "Left Milan Behind — The Southern Edge Begins",
      "subtitle": "Train south, ferry to the island, first dinner under the cliffs.",
      "hero_image_url": "https://images.unsplash.com/photo-[REAL_ID]?w=1200&h=600&fit=crop",
      "energy_level": "medium",
      "energy_note": "Heavy travel day — keep evening soft",
      "walking_distance_km": 3.5,
      "cost_bookable_total": 420,
      "cost_onsite_estimate": 35,
      "moments": [
        {
          "id": "d1m1",
          "type": "transport",
          "title_evocative": "The Long Crossing",
          "title_operational": "Milan MXP → Sydney → Hobart HBA — 27h via SYD",
          "time_label": "morning",
          "start_time": "10:15",
          "end_time": "23:45",
          "duration_min": 1620,
          "cost_min": 850,
          "cost_max": 1100,
          "cost_note": "round-trip per person",
          "image_url": "https://images.unsplash.com/photo-[REAL_ID]?w=800&h=500&fit=crop",
          "image_alt": "Aircraft above clouds",
          "booking": {
            "provider": "expedia",
            "affiliate_url": "https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Flights-Search?leg1=from%3AMXP%2Cto%3AHBA%2Cdeparture%3A20260710%2F1&passengers=adults%3A1&trip=roundtrip&mode=search",
            "display_label": "Prenota il volo per Hobart",
            "status": "bookable_now"
          },
          "description": "Two long legs with one layover in Sydney. Aim for an evening MXP departure if you want to land fresh.",
          "why_this": "Your 'long-haul OK' chip said this is fine — the destination earns the distance.",
          "transport_to_next": { "mode": "taxi", "duration_min": 25, "cost_estimate": "€20–30", "note": "Pre-book a Welcome Pickup" }
        },
        {
          "id": "d1m2",
          "type": "accommodation",
          "title_evocative": "Settle, Slowly",
          "title_operational": "Check-in: The Nook Guesthouse, Battery Point",
          "time_label": "evening",
          "start_time": "00:30",
          "duration_min": 60,
          "cost_min": 95,
          "cost_max": 130,
          "cost_note": "per night, double room",
          "location_name": "The Nook Guesthouse",
          "location_address": "Battery Point, Hobart TAS",
          "location_lat": -42.8923,
          "location_lng": 147.3315,
          "image_url": "https://images.unsplash.com/photo-[REAL_ID]?w=800&h=500&fit=crop",
          "image_alt": "Guesthouse exterior at dusk",
          "booking": {
            "provider": "hotels",
            "affiliate_url": "https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=Hobart&q-check-in=2026-07-10&q-check-out=2026-07-17",
            "display_label": "Prenota l'hotel · The Nook Guesthouse",
            "status": "bookable_now"
          },
          "description": "Drop bags, take a short walk to the harbour even if it's late — first sense of the place matters.",
          "why_this": "You flagged 'quiet over crowded' — Battery Point at midnight is exactly that."
        }
      ]
    }
  ],
  "total_cost_bookable": 1850,
  "total_cost_onsite_estimate": 320,
  "total_cost_range": "€1.800–2.400/pp",
  "closing_quote": "1 poetic sentence — a promise, not a farewell.",
  "map_points": [
    { "day": 1, "lat": -42.8923, "lng": 147.3315, "label": "The Nook Guesthouse" }
  ]
}

CRITICAL: Respond ONLY with the JSON object. No text before or after. No
explanations. Start with { end with }. Pure JSON only.`;
}

// ── Chain of Verification (2B) — anti-pattern guard ───────────────────────
// Dopo la generazione, un passaggio economico con Haiku verifica l'itinerario
// contro ciò che l'utente vuole EVITARE (dedotto dalle risposte del quiz +
// note). Se trova violazioni chiare (es. "no caos" → mercato affollato), una
// singola correzione mirata (Sonnet) riscrive SOLO i momenti incriminati,
// lasciando intatto il resto. Tutto best-effort: se la verifica fallisce o va
// in timeout, restituiamo l'itinerario originale senza bloccare l'utente.
const COV_HAIKU = "claude-haiku-4-5-20251001";

function buildAvoidDigest(input: ProfilingInput): string | null {
  const parts: string[] = [];
  if (Array.isArray(input.answers) && input.answers.length) parts.push(`Quiz answers (mix of likes and dislikes): ${input.answers.join("; ")}`);
  if (input.constraints) parts.push(`Constraints / notes: ${input.constraints}`);
  return parts.length ? parts.join("\n") : null;
}

function extractJson(text: string): string {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

async function verifyAvoidViolations(
  itinerary: ItineraryV2, input: ProfilingInput,
): Promise<Array<{ id: string; issue: string }>> {
  const avoidDigest = buildAvoidDigest(input);
  if (!avoidDigest) return [];
  const digest = itinerary.days
    .map((d) => `Day ${d.day_number} — ${d.title_evocative}\n` +
      (d.moments ?? []).map((m) => `  [${m.id}] (${m.type}) ${m.title_evocative}: ${m.description}`).join("\n"))
    .join("\n\n");

  const prompt = `You are a strict itinerary reviewer. From the traveler's quiz answers and notes, infer ONLY what they explicitly want to AVOID (anti-patterns, dislikes, hard constraints). Then scan the itinerary and flag moments that CLEARLY violate those avoidances — e.g. they said "no crowds / no chaos" but a moment is a crowded chaotic market, or "no long transfers" but a moment is a 6h bus.

TRAVELER (extract the dislikes):
${avoidDigest}

ITINERARY:
${digest}

Return STRICT JSON only: {"violations":[{"id":"d2m3","issue":"crowded market — user avoids crowds"}]}. Empty array if nothing clearly violates. Be conservative: only clear, defensible violations, max 5. JSON only.`;

  const msg = await client.messages.create({
    model: COV_HAIKU,
    max_tokens: 700,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("");
  const parsed = JSON.parse(extractJson(text));
  return Array.isArray(parsed?.violations)
    ? parsed.violations.filter((v: any) => v && typeof v.id === "string").slice(0, 5)
    : [];
}

async function correctAvoidViolations(
  itinerary: ItineraryV2, violations: Array<{ id: string; issue: string }>, input: ProfilingInput,
): Promise<ItineraryV2> {
  const langName = input.lang === "it" ? "Italian" : "English";
  const avoidDigest = buildAvoidDigest(input) ?? "";
  const prompt = `You will fix a travel itinerary. The traveler wants to AVOID certain things; a reviewer flagged violations. Rewrite ONLY the flagged moments so they NO LONGER violate, keeping each day coherent (geography, timing, and any booking links must stay valid and realistic). Keep every OTHER field and moment EXACTLY as-is.

AVOID (from traveler):
${avoidDigest}

FLAGGED VIOLATIONS (rewrite these moment ids):
${violations.map((v) => `- ${v.id}: ${v.issue}`).join("\n")}

CURRENT ITINERARY JSON:
${JSON.stringify(itinerary)}

Return the FULL corrected itinerary as a SINGLE JSON object, identical v2 schema, ALL text fields in ${langName}. JSON only, no prose, start with { end with }.`;

  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 24000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("");
  return itineraryV2Schema.parse(JSON.parse(extractJson(text)));
}

// ── V2 generation entry point ─────────────────────────────────────────────

export async function generateItineraryV2ForDestination(
  input: ProfilingInput,
  destinationName: string,
  priorBlock = ""
): Promise<ItineraryV2> {
  const prompt = buildPromptV2({ ...input, _destinationOverride: destinationName } as any, priorBlock);

  // Higher max_tokens than v1: each day has 2–6 moments with ~15 fields each,
  // plus day-level fields (weather, energy, costs). 24K leaves headroom for
  // 7-day trips with 5 moments avg without truncation.
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 24000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  const cleanJson = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  let itinerary = itineraryV2Schema.parse(JSON.parse(cleanJson));

  // Chain of Verification (2B): controllo anti-pattern + correzione mirata.
  try {
    const violations = await verifyAvoidViolations(itinerary, input);
    if (violations.length > 0) {
      console.log(`[v2 CoV] ${violations.length} avoid-violation(s), correcting:`, violations.map((v) => v.id).join(", "));
      itinerary = await correctAvoidViolations(itinerary, violations, input);
    }
  } catch (e) {
    console.warn("[v2 CoV] verification/correction skipped (best-effort):", e);
  }

  return itinerary;
}

// ── Rigenerazione di UN solo giorno (companion regenerate_day) ─────────────
// Riusa lo schema dayV2; passiamo il giorno corrente come template così il
// modello copia la struttura esatta. Niente immagini/coords qui — l'enrichment
// (geocode + Unsplash) avviene dopo via enrichDayV2.
export async function regenerateDayV2(
  destinationName: string,
  day: DayV2,
  feedback: string,
  contextSummary: string,
  lang: "en" | "it",
): Promise<DayV2> {
  // Day 1 = arrival. Same conversion doctrine as the main generator (rule 2b):
  // one strong anchor (accommodation), transit meal converts zero, no paid
  // experiences. Injected only when regenerating day 1 so other days stay free.
  const day1Doctrine = day.day_number === 1 ? `
- THIS IS DAY 1 (arrival). It has ONE strong booking anchor: the accommodation (provider "hotels" or "tablet_hotels", status "bookable_now") — booked once, covers the whole trip.
- Arrival transport: a booking ONLY if a real partner fits the actual mode (flight, long-distance coach). A scheduled ferry, regional train or generic transfer has no partner → walk_in prose, no booking object.
- The transit meal (at the gate / on board / on first arrival) is ALWAYS walk_in: no booking object — it converts zero but stays a real beat that must read complete without a button.
- NO bookable experiences, tours, boats or paid activities on day 1 — the traveller is tired with bags. Those belong to the rested mid/peak days.` : "";

  const prompt = `You are MindRoute's itinerary engine. Regenerate ONE day of a trip to ${destinationName}.

CURRENT DAY (JSON — copy this exact structure and field names, same value types):
${JSON.stringify(day)}

OTHER DAYS of this trip (so you do NOT repeat their places):
${contextSummary}

USER REQUEST for the new version of this day: ${feedback || "refresh it with different but equally good moments"}

Rules:
- Return ONLY a JSON object for the new day — same schema/keys/types as CURRENT DAY.
- Keep "day_number" and "date" unchanged.
- Use REAL, well-known places in ${destinationName}; set "location_name" on every moment (needed for map + booking). Do NOT reuse the places already used on the OTHER DAYS.
- 3 to 6 moments. All numeric fields are numbers. Write every visible text field in ${lang === "it" ? "Italian" : "English"}.
- Leave image URLs as-is or empty and do not invent map_points — images and coordinates are set server-side.
- BOOKING by function + partner-fit, not by default: mark a moment "bookable_now"/"reserve_recommended" ONLY if it is genuinely reservable through a real partner. Transit meals, free wanders, scheduled ferries and generic transfers are walk_in — omit their booking object. When unsure, prefer walk_in.
- AFFILIATE URLS: if a moment is bookable, REUSE the exact affiliate link host/click-wrapper already present in CURRENT DAY's bookings (same domain) — NEVER invent a new booking domain (no booking.com, getyourguide, skyscanner, airbnb). If there is no equivalent partner URL to copy, make the moment walk_in instead of inventing a link.${day1Doctrine}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as any).text)
    .join("");
  const parsed = dayV2Schema.parse(JSON.parse(extractJson(text)));
  parsed.day_number = day.day_number;
  parsed.date = day.date;
  return parsed;
}
