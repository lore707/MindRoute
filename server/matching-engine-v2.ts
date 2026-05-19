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
  BookingProvider,
  EnergyLevel,
  TransportMode,
  WeatherCondition,
  DayV2,
  MomentV2,
  HighlightV2,
  MapPointV2,
  TripMetaV2,
} from "../shared/schema";

// ── V2 Zod schemas — runtime validation for Claude output ─────────────────

const momentTypeSchema = z.enum([
  "transport", "accommodation", "food", "experience", "walk", "view", "rest",
]) satisfies z.ZodType<MomentType>;

const bookingStatusSchema = z.enum([
  "bookable_now", "reserve_recommended", "walk_in",
]) satisfies z.ZodType<BookingStatus>;

const bookingProviderSchema = z.enum([
  "skyscanner", "trainline", "flixbus", "booking", "getyourguide",
  "viator", "civitatis", "musement", "klook", "samboat",
  "thefork", "expedia_cars", "welcome_pickups", "direct", "none",
]) satisfies z.ZodType<BookingProvider>;

const energyLevelSchema = z.enum(["low", "medium", "high"]) satisfies z.ZodType<EnergyLevel>;

const transportModeSchema = z.enum([
  "walk", "taxi", "metro", "bus", "train", "ferry", "drive", "flight",
]) satisfies z.ZodType<TransportMode>;

const weatherConditionSchema = z.enum([
  "sunny", "cloudy", "rain", "mixed", "snow",
]) satisfies z.ZodType<WeatherCondition>;

const bookingInfoV2Schema = z.object({
  provider: bookingProviderSchema,
  affiliate_url: z.string(),
  display_label: z.string(),
  status: bookingStatusSchema,
});

const transportToNextV2Schema = z.object({
  mode: transportModeSchema,
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
  time_label: z.enum(["morning", "lunch", "afternoon", "evening", "night"]),
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
   - For walk_in moments, OMIT the booking object entirely (do not include provider="none").
   - affiliate_url must be a real, well-formed URL. Use the affiliate templates
     defined earlier in the prompt. Never invent provider URLs.

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
   - weather_forecast: realistic for destination + month. condition is one of
     sunny/cloudy/rain/mixed/snow.
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
      "weather_forecast": { "temp_min": 18, "temp_max": 26, "condition": "sunny", "note": "Sea still warm" },
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
            "provider": "skyscanner",
            "affiliate_url": "https://www.skyscanner.it/transport/voli/mxp/hba/",
            "display_label": "Find flights",
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
            "provider": "booking",
            "affiliate_url": "https://www.booking.com/hotel/au/the-nook-hobart.html",
            "display_label": "Reserve room",
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

  return itineraryV2Schema.parse(JSON.parse(cleanJson));
}
