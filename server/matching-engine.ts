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
- Choose 1 REAL hotel with a precise name matching the profile and budget (e.g. "Casa Camper Barcelona", "Riad Yasmine Marrakech", "Generator Hostel Lisboa") — call it HOTEL_NAME
- Choose 2 REAL experiences with precise searchable names on GetYourGuide (e.g. "Alhambra Skip-the-Line Guided Tour", "Lisbon Fado Night with Dinner") — call them EXPERIENCE_1 and EXPERIENCE_2
- Choose 1 REAL restaurant for dinner with a precise name (e.g. "Bar del Pla Barcelona", "Cervejaria Ramiro Lisbon", "Trattoria da Enzo al 29 Rome") — call it DINNER_RESTAURANT
- Choose 1 REAL café or lunch spot with a precise name — call it LUNCH_SPOT
- Use REAL IATA airport codes: departure from "${input.departure}", arrival at the chosen destination
- Use real dates: check-in ${checkin}, check-out ${checkout}

AFFILIATE LINKS RULES:
topAffiliateLinks (one block for the whole itinerary):
- booking_hotel: Booking.com search for HOTEL_NAME with real dates
- booking_search: Booking.com general search for the destination city with real dates
- skyscanner: Skyscanner flight link with real IATA codes and compact dates
- getyourguide_1: GetYourGuide search for EXPERIENCE_1
- getyourguide_2: GetYourGuide search for EXPERIENCE_2
- thefork: TheFork search for DINNER_RESTAURANT
- tripadvisor: TripAdvisor search for the destination city

affiliateLinks inside each day (only add keys that genuinely match that day's content):
- "getyourguide_morning": add ONLY on the day when EXPERIENCE_1 appears in the morning field
- "getyourguide_afternoon": add ONLY on the day when EXPERIENCE_2 appears in the afternoon field
- "thefork_lunch": add ONLY on the day when LUNCH_SPOT appears in the lunch field
- "thefork_evening": add ONLY on the day when DINNER_RESTAURANT appears in the evening field
- Do NOT add affiliateLinks to days where none of the above match

RESPONSE LANGUAGE: Write all text fields in Italian.

REQUIRED JSON (the day examples below show the affiliateLinks structure — apply the same logic to all ${days} days):
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
          "lunch": "LUNCH_SPOT real name + max 5 words description",
          "afternoon": "Max 10 words",
          "evening": "Max 10 words",
          "affiliateLinks": {
            "getyourguide_morning": "https://www.getyourguide.com/s/?q=EXPERIENCE_1_NAME_URL_ENCODED&partner_id=0BCSNBX8",
            "thefork_lunch": "https://www.thefork.it/ricerca?q=LUNCH_SPOT_NAME_URL_ENCODED"
          }
        },
        {
          "dayNumber": 2,
          "title": "Short title",
          "morning": "Max 10 words",
          "lunch": "Max 8 words",
          "afternoon": "EXPERIENCE_2 real name + max 8 words",
          "evening": "DINNER_RESTAURANT real name + max 5 words",
          "affiliateLinks": {
            "getyourguide_afternoon": "https://www.getyourguide.com/s/?q=EXPERIENCE_2_NAME_URL_ENCODED&partner_id=0BCSNBX8",
            "thefork_evening": "https://www.thefork.it/ricerca?q=DINNER_RESTAURANT_NAME_URL_ENCODED"
          }
        }
      ],
      "budgetSummary": "1 short line with estimated total within budget",
      "packingList": "5 items separated by commas",
      "bestTime": "max 8 words",
      "gettingThere": "max 12 words with real IATA airport code",
      "closingMessage": "1 short final sentence",
      "topAffiliateLinks": {
        "booking_hotel": "https://www.booking.com/search.html?ss=HOTEL_NAME_URL_ENCODED&aid=304142&checkin=${checkin}&checkout=${checkout}&lang=it",
        "booking_search": "https://www.booking.com/search.html?ss=CITY_COUNTRY_URL_ENCODED&aid=304142&checkin=${checkin}&checkout=${checkout}&lang=it",
        "skyscanner": "https://www.skyscanner.net/transport/flights/DEPARTURE_IATA/ARRIVAL_IATA/${checkinCompact}/${checkoutCompact}/",
        "getyourguide_1": "https://www.getyourguide.com/s/?q=EXPERIENCE_1_NAME_URL_ENCODED&partner_id=0BCSNBX8",
        "getyourguide_2": "https://www.getyourguide.com/s/?q=EXPERIENCE_2_NAME_URL_ENCODED&partner_id=0BCSNBX8",
        "thefork": "https://www.thefork.it/ricerca?q=DINNER_RESTAURANT_NAME_URL_ENCODED",
        "tripadvisor": "https://www.tripadvisor.it/Search?q=CITY_NAME_URL_ENCODED"
      }
    }
  ]
}

Generate exactly ${days} days in the itinerary.`;
}

export async function generateDestinations(input: ProfilingInput): Promise<{
  destinations: GeneratedDestination[];
  itineraries: Map<string, GeneratedItinerary>;
}> {
  const prompt = buildPrompt(input);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3200,
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
