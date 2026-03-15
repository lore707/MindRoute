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
- Choose 1 REAL hotel with a precise name matching the profile and budget (e.g. "Casa Camper Barcelona", "Riad Yasmine Marrakech", "Generator Hostel Lisboa")
- Choose 2 REAL experiences with precise searchable names on GetYourGuide (e.g. "Alhambra Skip-the-Line Guided Tour", "Lisbon Fado Night with Dinner")
- Choose 1 REAL restaurant with a precise name (e.g. "Bar del Pla Barcelona", "Cervejaria Ramiro Lisbon", "Trattoria da Enzo al 29 Rome")
- Use REAL IATA airport codes: departure from "${input.departure}", arrival at the chosen destination
- Use real dates: check-in ${checkin}, check-out ${checkout}

AFFILIATE LINKS — build using the real names chosen above:
- booking_hotel: direct search for the specific hotel chosen, with real dates
- booking_search: general hotel search in the destination city, with real dates
- skyscanner: flight link with real IATA codes and compact dates
- getyourguide_1: link for the first specific experience chosen
- getyourguide_2: link for the second specific experience chosen
- thefork: search link for the specific restaurant chosen

RESPONSE LANGUAGE: Write all text fields (whyYours, experiencePreview, practicalInfo, title, morning, lunch, afternoon, evening, budgetSummary, packingList, bestTime, gettingThere, closingMessage) in Italian.

REQUIRED JSON:
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
          "morning": "Max 10 words",
          "lunch": "Real restaurant name + max 5 words description",
          "afternoon": "Max 10 words",
          "evening": "Max 10 words"
        }
      ],
      "budgetSummary": "1 short line with estimated total within budget",
      "packingList": "5 items separated by commas",
      "bestTime": "max 8 words",
      "gettingThere": "max 12 words with real IATA airport code",
      "closingMessage": "1 short final sentence",
      "topAffiliateLinks": {
        "booking_hotel": "https://www.booking.com/search.html?ss=SPECIFIC+HOTEL+NAME&aid=304142&checkin=${checkin}&checkout=${checkout}&lang=it",
        "booking_search": "https://www.booking.com/search.html?ss=CITY+COUNTRY&aid=304142&checkin=${checkin}&checkout=${checkout}&lang=it",
        "skyscanner": "https://www.skyscanner.net/transport/flights/DEPARTURE_IATA/ARRIVAL_IATA/${checkinCompact}/${checkoutCompact}/",
        "getyourguide_1": "https://www.getyourguide.com/s/?q=SPECIFIC+EXPERIENCE+NAME&partner_id=0BCSNBX8",
        "getyourguide_2": "https://www.getyourguide.com/s/?q=SECOND+SPECIFIC+EXPERIENCE&partner_id=0BCSNBX8",
        "thefork": "https://www.thefork.it/ricerca?q=SPECIFIC+RESTAURANT+NAME"
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








