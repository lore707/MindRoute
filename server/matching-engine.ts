import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ProfilingInput {
  answers: string[];
  budget: string;
  departure: string;
  days: number;
  leaveDate: string;
  companions?: string;
  constraints?: string;
}

const affiliateLinksSchema = z.record(z.string(), z.string()).optional();

const itineraryDaySchema = z.object({
  dayNumber: z.number(),
  title: z.string(),
  morning: z.string(),
  lunch: z.string(),
  afternoon: z.string(),
  evening: z.string(),
  affiliateLinks: affiliateLinksSchema,
  mapPoints: z.array(z.object({
    label: z.string(),
    slot: z.string(),
    lat: z.number(),
    lng: z.number(),
  })).optional(),
});

const generatedDestinationSchema = z.object({
  name: z.string(),
  whyYours: z.string(),
  experiencePreview: z.string(),
  practicalInfo: z.string(),
  imageUrl: z.string().url(),
});

const generatedItinerarySchema = z.object({
  destinationName: z.string(),
  days: z.array(itineraryDaySchema),
  budgetSummary: z.string(),
  packingList: z.string(),
  bestTime: z.string(),
  gettingThere: z.string(),
  closingMessage: z.string(),
  topAffiliateLinks: z.record(z.string(), z.string()).optional(),
});

const generatedResponseSchema = z.object({
  destinations: z.array(generatedDestinationSchema).min(1),
  itineraries: z.array(generatedItinerarySchema).min(1),
});

type GeneratedDestination = z.infer<typeof generatedDestinationSchema>;
type GeneratedItinerary = z.infer<typeof generatedItinerarySchema>;

function parseModelResponse(responseText: string) {
  const cleanJson = responseText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return generatedResponseSchema.parse(JSON.parse(cleanJson));
}

function buildCheckinCheckout(leaveDate: string, days: number): {
  checkin: string;
  checkout: string;
  checkinCompact: string;
  checkoutCompact: string;
} {
  try {
    const d = new Date(leaveDate);
    if (isNaN(d.getTime())) throw new Error("invalid");
    const checkout = new Date(d);
    checkout.setDate(checkout.getDate() + days);
    const fmt = (dt: Date) => dt.toISOString().split("T")[0];
    const fmtCompact = (dt: Date) => fmt(dt).replace(/-/g, "");
    return {
      checkin: fmt(d),
      checkout: fmt(checkout),
      checkinCompact: fmtCompact(d),
      checkoutCompact: fmtCompact(checkout),
    };
  } catch {
    return {
      checkin: "2025-06-15",
      checkout: "2025-06-22",
      checkinCompact: "20250615",
      checkoutCompact: "20250622",
    };
  }
}

function buildPrompt(input: ProfilingInput): string {
  const rawAnswers =
    input.answers[0] === "path_a" || input.answers[0] === "path_b"
      ? input.answers.slice(1)
      : input.answers;

  let structuredProfileBlock = "";
  let profileAnswers = rawAnswers;
  if (rawAnswers.length > 0) {
    const last = rawAnswers[rawAnswers.length - 1];
    try {
      const parsed = JSON.parse(last);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        structuredProfileBlock = JSON.stringify(parsed, null, 2);
        profileAnswers = rawAnswers.slice(0, -1);
      }
    } catch {
      // not JSON, ignore
    }
  }

  const path =
    input.answers[0] === "path_b"
      ? "Path B (user already has a destination area in mind)"
      : "Path A (open to surprises)";
  const days = Math.min(input.days, 7);

  const budgetMap: Record<string, string> = {
    "< €500": "maximum €500 per person all included",
    "€500 – €1.500": "between €500 and €1,500 per person all included, never exceed €1,500",
    "€1.500 – €3.000": "between €1,500 and €3,000 per person all included, never exceed €3,000",
    "No limits": "unlimited budget, aim for quality",
  };
  const budgetText = budgetMap[input.budget] || input.budget;

  const period = input.leaveDate || "2025-06-15";
  const { checkin, checkout, checkinCompact, checkoutCompact } =
    buildCheckinCheckout(period, days);

  return `You are the engine of MindRoute, a psychological travel profiling platform.

USER PROFILE:
Path: ${path}
Budget: ${budgetText} — STRICTLY RESPECT THIS CONSTRAINT
Departing from: ${input.departure} | Days: ${days} | Period: ${period}
Travel companions: ${input.companions || "not specified"} | Constraints: ${input.constraints || "none"}
${structuredProfileBlock ? `Structured profile (JSON):\n${structuredProfileBlock}\n\n` : ""}Quiz answers: ${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}

TASK: Generate exactly 1 perfectly personalized destination with a ${days}-day itinerary.

RULES:
- Deeply analyze the psychological profile: emotional needs, aesthetics, tolerance for chaos, travel style
- Choose a non-obvious, surprising destination that truly matches this person
- Use a personal tone, not a travel catalog tone
- Keep all sentences short and concrete
- Every field must be concise
- Total estimated budget MUST fit within the stated range
- Respond ONLY with valid JSON, absolutely no text outside the JSON

MANDATORY SPECIFIC NAMES — this is critical for quality:
- Choose 1 REAL hotel with a precise name matching the profile and budget — call it HOTEL_NAME
- Choose 2 REAL experiences with precise searchable names — call them EXPERIENCE_1 and EXPERIENCE_2
- Choose 1 REAL restaurant for dinner with a precise name — call it DINNER_RESTAURANT
- Choose 1 REAL café or lunch spot with a precise name — call it LUNCH_SPOT
- Choose 2 REAL places/landmarks to visit (museums, neighborhoods, parks) — call them PLACE_1 and PLACE_2
- Use REAL IATA airport codes: departure from "${input.departure}", arrival at the chosen destination
- Use real dates: check-in ${checkin}, check-out ${checkout}

DETECT DESTINATION REGION — use this to choose correct affiliate links:
- Europe: Italy, France, Spain, Portugal, Germany, Austria, UK, Netherlands, Belgium, Poland, Czech Republic, Hungary, Romania, Sweden, Norway, Denmark, Finland, Ireland, Switzerland
- Mediterranean: Greece, Croatia, Turkey, Cyprus, Malta, Montenegro, Albania
- Asia: Japan, China, Korea, Thailand, Vietnam, Indonesia, Bali, Cambodia, Laos, Myanmar, Malaysia, Singapore, Philippines, Sri Lanka
- India: India and all Indian cities
- Africa: Morocco, Egypt, Kenya, Tanzania, South Africa, Ghana, Senegal, Ethiopia, Nigeria, Tunisia, Algeria
- LatAm: Mexico, Colombia, Peru, Brazil, Argentina, Chile, Ecuador, Bolivia, Costa Rica, Panama, Guatemala, Cuba

AFFILIATE LINKS RULES:

topAffiliateLinks — include ALL relevant links by region:
- booking_hotel: always — Booking.com search for HOTEL_NAME with real dates
- booking_search: always — Booking.com general search for destination city with real dates
- skyscanner: always — flight link with real IATA codes and compact dates
- tripadvisor: always — TripAdvisor search for destination city
- getyourguide_1: Europe + Mediterranean only — GetYourGuide search for EXPERIENCE_1
- getyourguide_2: Europe + Mediterranean only — GetYourGuide search for EXPERIENCE_2
- klook_1: Asia + India only — Klook search for EXPERIENCE_1
- klook_2: Asia + India only — Klook search for EXPERIENCE_2
- viator_1: Africa + LatAm only — Viator search for EXPERIENCE_1
- viator_2: Africa + LatAm only — Viator search for EXPERIENCE_2
- thefork: Europe only — TheFork search for DINNER_RESTAURANT
- agoda: Asia + India only — Agoda search for HOTEL_NAME with real dates
- ferryhopper: Mediterranean/Greece only — Ferryhopper homepage
- hostelworld: LatAm + Africa only — Hostelworld search for destination city

affiliateLinks inside each day — STRATEGY: every slot must have a monetizable link, no Maps links:

EXPERIENCES (morning/afternoon):
- "getyourguide_morning": Europe/Mediterranean — day when EXPERIENCE_1 is in morning
- "getyourguide_afternoon": Europe/Mediterranean — day when EXPERIENCE_2 is in afternoon
- "klook_morning": Asia/India — day when EXPERIENCE_1 is in morning
- "klook_afternoon": Asia/India — day when EXPERIENCE_2 is in afternoon
- "viator_morning": Africa/LatAm — day when EXPERIENCE_1 is in morning
- "viator_afternoon": Africa/LatAm — day when EXPERIENCE_2 is in afternoon

PLACES/LANDMARKS (morning/afternoon without an experience):
- "getyourguide_place_morning": Europe/Mediterranean — day when PLACE_1 is in morning with no experience — link a tour of that place on GetYourGuide
- "getyourguide_place_afternoon": Europe/Mediterranean — day when PLACE_2 is in afternoon with no experience — link a tour of that place on GetYourGuide
- "klook_place_morning": Asia/India — day when PLACE_1 is in morning with no experience — link a tour of that place on Klook
- "klook_place_afternoon": Asia/India — day when PLACE_2 is in afternoon with no experience — link a tour of that place on Klook
- "viator_place_morning": Africa/LatAm — day when PLACE_1 is in morning with no experience — link a tour of that place on Viator
- "viator_place_afternoon": Africa/LatAm — day when PLACE_2 is in afternoon with no experience — link a tour of that place on Viator

RESTAURANTS (lunch/evening):
- "thefork_lunch": Europe ONLY — day when LUNCH_SPOT is in lunch
- "thefork_evening": Europe ONLY — day when DINNER_RESTAURANT is in evening
- "tripadvisor_lunch": Asia + India + Africa + LatAm — day when LUNCH_SPOT is in lunch — link TripAdvisor restaurant search for LUNCH_SPOT in city
- "tripadvisor_evening": Asia + India + Africa + LatAm — day when DINNER_RESTAURANT is in evening — link TripAdvisor restaurant search for DINNER_RESTAURANT in city

FALLBACK — if evening has no specific restaurant name:
- "tripadvisor_evening_fallback": any region — add TripAdvisor restaurants search for the city: https://www.tripadvisor.it/Restaurants-gCITY_ID-CITY_NAME.html — use this when evening slot has no DINNER_RESTAURANT

Do NOT use any Google Maps links anywhere — use only monetizable affiliate links.

MAP POINTS — for each day, include a "mapPoints" array with GPS coordinates for ALL real places in that day including:
- Experiences and activities (slot: "Mattina" or "Pomeriggio")
- Restaurants and cafés (slot: "Pranzo" or "Sera")
- Landmarks and neighborhoods (slot: "Mattina" or "Pomeriggio")
- HOTEL_NAME on day 1 only (slot: "Hotel")
- Any ferry port or boat departure if mentioned (slot: "Traghetto")
- Any car/scooter/quad rental location if mentioned (slot: "Noleggio")
Use precise real-world GPS coordinates. Skip generic flight/airport slots.

RESPONSE LANGUAGE: Write all text fields in Italian.

REQUIRED JSON (day examples show affiliateLinks structure — apply same logic to all ${days} days):
{
  "destinations": [
    {
      "name": "City, Country",
      "imageUrl": "https://images.unsplash.com/photo-[ID]?w=600&h=400&fit=crop",
      "whyYours": "1 short sentence on the psychological reason this destination fits",
      "experiencePreview": "1 short evocative sentence in first person",
      "practicalInfo": "costs, flights, period in 1 short line"
    }
  ],
  "itineraries": [
    {
      "destinationName": "City, Country",
      "days": [
        {
          "dayNumber": 1,
          "title": "Short title",
          "morning": "EXPERIENCE_1 real name + max 8 words",
          "lunch": "LUNCH_SPOT real name + max 5 words",
          "afternoon": "PLACE_1 real name + max 8 words",
          "evening": "Max 10 words — no specific restaurant",
  "affiliateLinks": {
            "getyourguide_morning": "https://www.getyourguide.com/s/?q=EXPERIENCE_1_NAME&partner_id=0BCSNBX8",
            "thefork_lunch": "https://www.thefork.it/search#q=LUNCH_SPOT_NAME",
            "getyourguide_place_afternoon": "https://www.getyourguide.com/s/?q=PLACE_1_NAME+tour&partner_id=0BCSNBX8",
            "tripadvisor_evening_fallback": "https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME"
          },
          "mapPoints": [
            { "label": "EXPERIENCE_1_NAME", "slot": "Mattina", "lat": 0.0000, "lng": 0.0000 },
            { "label": "LUNCH_SPOT_NAME", "slot": "Pranzo", "lat": 0.0000, "lng": 0.0000 },
            { "label": "PLACE_1_NAME", "slot": "Pomeriggio", "lat": 0.0000, "lng": 0.0000 },
            { "label": "HOTEL_NAME", "slot": "Hotel", "lat": 0.0000, "lng": 0.0000 }
          ]
        },
        {
          "dayNumber": 2,
          "title": "Short title",
          "morning": "Max 10 words",
          "lunch": "Max 8 words",
          "afternoon": "EXPERIENCE_2 real name + max 8 words",
          "evening": "DINNER_RESTAURANT real name + max 5 words",
          "affiliateLinks": {
            "getyourguide_afternoon": "https://www.getyourguide.com/s/?q=EXPERIENCE_2_NAME&partner_id=0BCSNBX8",
            "thefork_evening": "https://www.thefork.it/search#q=DINNER_RESTAURANT_NAME"
          }
        }
      ],
      "budgetSummary": "1 short line with estimated total within budget",
      "packingList": "5 items separated by commas",
      "bestTime": "max 8 words",
      "gettingThere": "max 12 words with real IATA airport code",
      "closingMessage": "1 short final sentence",
      "topAffiliateLinks": {
        "booking_hotel": "https://www.booking.com/search.html?ss=HOTEL_NAME&aid=304142&checkin=${checkin}&checkout=${checkout}&lang=it",
        "booking_search": "https://www.booking.com/search.html?ss=CITY_COUNTRY&aid=304142&checkin=${checkin}&checkout=${checkout}&lang=it",
        "skyscanner": "https://www.skyscanner.net/transport/flights/DEPARTURE_IATA/ARRIVAL_IATA/${checkinCompact}/${checkoutCompact}/",
        "tripadvisor": "https://www.tripadvisor.it/Search?q=CITY_NAME",
        "getyourguide_1": "https://www.getyourguide.com/s/?q=EXPERIENCE_1_NAME&partner_id=0BCSNBX8",
        "getyourguide_2": "https://www.getyourguide.com/s/?q=EXPERIENCE_2_NAME&partner_id=0BCSNBX8",
        "thefork": "https://www.thefork.it/search#q=DINNER_RESTAURANT_NAME"
      }
    }
  ]
}

Generate exactly ${days} days in the itinerary.`
}

export async function generateDestinations(input: ProfilingInput): Promise<{
  destinations: GeneratedDestination[];
  itineraries: Map<string, GeneratedItinerary>;
}> {
  const prompt = buildPrompt(input);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 6000,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  const parsed = parseModelResponse(responseText);

  const itineraries = new Map<string, GeneratedItinerary>();
  for (const itin of parsed.itineraries) {
    itineraries.set(itin.destinationName, itin);
  }

  return {
    destinations: parsed.destinations,
    itineraries,
  };
}
