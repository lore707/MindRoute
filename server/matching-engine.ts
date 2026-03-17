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
  travelStyle?: string;
  constraints?: string;
  lang?: string;
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
    imageUrl: z.string().optional(),
    affiliateUrl: z.string().optional(),
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
  const travelStyle = input.travelStyle || "not specified";

  const budgetMap: Record<string, string> = {
    "< €500": "maximum €500 per person all included — hostels or guesthouses max €25/night, street food and local markets only, free or low-cost activities only",
    "€500 – €1.500": "between €500 and €1,500 per person all included — budget hotels or riads €40-80/night per person, mix of local restaurants €10-25/meal, some paid experiences",
    "€1.500 – €3.000": "between €1,500 and €3,000 per person all included — boutique hotels €100-150/night, good restaurants €30-60/meal, premium experiences",
    "No limits": "unlimited budget, aim for luxury and quality in every choice",
  };
  const budgetText = budgetMap[input.budget] || input.budget;

  const period = input.leaveDate || "2025-06-15";
  const { checkin, checkout, checkinCompact, checkoutCompact } =
    buildCheckinCheckout(period, days);

  return `You are the engine of MindRoute, a psychological travel profiling platform. Your goal is not to generate a generic itinerary — it is to create the most personally resonant travel experience possible for this specific human being.

USER PROFILE:
Path: ${path}
Budget: ${budgetText} — ABSOLUTE CONSTRAINT. Never violate this under any circumstance.
Departing from: ${input.departure} | Days: ${days} | Period: ${period}
Travel companions: ${input.companions || "not specified"}
Travel style preference: ${travelStyle}
Constraints & preferences: ${input.constraints || "none"}
${structuredProfileBlock ? `Structured profile (JSON):\n${structuredProfileBlock}\n\n` : ""}Quiz answers: ${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}
${(input as any)._destinationOverride ? `\nDESTINATION ALREADY CHOSEN: ${(input as any)._destinationOverride} — generate the itinerary ONLY for this specific destination. Do not suggest alternatives.` : ''}
TASK: Generate exactly 1 perfectly personalized destination with a ${days}-day itinerary.

═══════════════════════════════════════
STEP 1 — PSYCHOLOGICAL PORTRAIT (internal reasoning, do not output)
═══════════════════════════════════════
Before generating anything, build a precise psychological portrait of this traveler by analyzing ALL quiz answers combinatorially — not question by question, but as a whole system of signals:

1. CORE EMOTIONAL NEED: What is the deepest emotional driver behind this trip? (escape, wonder, reconnection, transformation, celebration, self-discovery, aliveness) — look especially at sensation chips and open text answers.

2. AESTHETIC SENSIBILITY: What visual and sensory world does this person belong to? (raw/wild, intimate/quiet, chaotic/vibrant, refined/slow, spiritual/contemplative) — look especially at atmosphere and image selections.

3. TRAVEL IDENTITY: How do they move through the world? (explorer, contemplator, sensualist, adventurer, romantic, cultural immersant) — combine style chips with pace slider.

4. DEALBREAKERS: What would completely ruin this trip? Treat every anti-pattern selected as an ABSOLUTE PROHIBITION.

5. THE DEFINING MOMENT: What is the one experience that would make this traveler say "this trip changed me"? Build the peak of the itinerary around creating this moment — found in Q3 answers (Path B) or Q2/Q4 (Path A).

6. CONTRADICTIONS AS SIGNALS: If the traveler selected seemingly contradictory things (e.g. "staccare dalla routine" + "vivere qualcosa di completamente nuovo"), embrace the tension — it reveals someone who needs both rest AND rupture simultaneously. Never flatten contradictions into a generic middle ground.

7. LIFE PHASE READING: Infer the emotional life phase from sensation chips:
   - "ritrovarmi" + any companions = searching for identity or reconnection
   - "staccare davvero" = exhausted, needs total disconnection
   - "meravigliarmi di nuovo" = has lost wonder, needs to rediscover it
   - "sentirmi vivo di nuovo" = flat phase, needs intensity
   - "festeggiare" = positive transition, wants to celebrate
   - "uscire dalla zona di comfort" = ready for transformation

═══════════════════════════════════════
STEP 2 — DESTINATION SELECTION
═══════════════════════════════════════
Choose the destination that BEST matches the psychological portrait built in Step 1.

DESTINATION PHILOSOPHY:
- The destination can be famous or unknown — what matters is the FIT with this specific person.
- A famous destination chosen for the right psychological reasons is always better than an obscure one chosen to seem original.
- Within ANY destination, always go beyond the obvious: choose the neighborhoods, experiences, restaurants and moments that most tourists never find.
- Balance must-see iconic experiences with hidden local discoveries based on the profile:
  * If user selected "vedere luoghi iconici" → 60% must-see, 40% hidden gems
  * If user selected "trovare un posto che non sapevo esistesse" → 20% must-see, 80% hidden gems
  * Default balanced profile → 40% must-see, 60% hidden gems
- If the destination has globally iconic landmarks and the profile calls for them, include them — but frame them in a personal, non-touristic way.

SEASONALITY CHECK — verify the destination is genuinely pleasant during the travel period:
- Never choose a destination that is objectively unpleasant during the stated period (extreme heat, monsoon, polar winter unless profile specifically calls for it).
- August Atlantic Morocco coast = perfect. August Marrakech medina = 45°C, avoid.
- Consider humidity, rain, crowds, and local holidays.

REACHABILITY CHECK — consider departure city and trip duration:
- Weekend (3-4 days) from Milan: maximum 4 hours flight.
- One week: maximum 8-10 hours flight.
- 10-14 days or more: anywhere in the world.
- Never suggest a destination that requires more travel time than the trip allows.

PATH B SPECIFIC:
- The region is already defined. Focus on finding the BEST specific destination within that region.
- If the user specified a precise place or city, honor it and build around it.

PATH A SPECIFIC:
- First infer the macro-region that best fits the psychological profile, then choose the specific destination within it.

═══════════════════════════════════════
STEP 3 — COMPANIONS & TRAVEL STYLE
═══════════════════════════════════════
COMPANIONS — apply as structural rules for every single day:

PARTNER:
- Every day must include at least one moment designed specifically for two — a shared sunset, an intimate dinner, a private experience, a romantic atmosphere.
- Tone throughout must be warm, sensory, and connective — avoid generic framing.
- Activities should deepen the bond between two people.
- The itinerary should feel like it was written for them specifically as a couple.

SOLO:
- Emphasize personal freedom and spontaneous choices throughout.
- Include moments of deliberate solitude — a solo sunrise, a long walk alone, a café with a notebook.
- Frame every activity as self-directed and self-paced.
- Include opportunities for organic social encounters without forcing them.

FRIENDS (2+):
- Every day must include at least one shared group experience (group activity, communal meal, collective evening).
- Energy should be dynamic, fun, and social — include moments of collective joy.
- Balance group activities with individual freedom windows.
- Tone should be energetic and celebratory.

FAMILY:
- All activities must be accessible to mixed ages and energy levels.
- Include a mix of active and calm moments every day.
- Never suggest anything logistically complex, physically extreme, or age-inappropriate.
- Meals must be family-friendly, accessible, and stress-free.

TRAVEL STYLE — structural rules for itinerary architecture:

BASE FISSA:
- Traveler stays in ONE accommodation for ALL days. Zero location changes.
- Day trips and explorations radiate from the base and always return.
- The base itself becomes part of the experience — describe it with personality.
- Emphasize depth of immersion over breadth of coverage.

DUE TAPPE:
- Traveler moves ONCE, between day 3 and day 4.
- Two distinct zones with different characters and rhythms.
- The transition itself must be an experience, not a logistical note.
- Each zone should feel like a complete mini-trip.

SCOPERTA:
- Traveler moves every 1-2 days to a new location.
- Transport between locations must be easy, scenic, and part of the experience.
- Each location adds a distinctly different dimension.
- Movement itself is a source of pleasure, not stress.

NOT SPECIFIED: infer travel style from pace slider (structured = base fissa, balanced = due tappe, spontaneous = scoperta) and quiz answers.

═══════════════════════════════════════
STEP 4 — ANTI-PATTERN ENFORCEMENT
═══════════════════════════════════════
Parse the constraints and anti-patterns selected. Apply these as ABSOLUTE PROHIBITIONS — never include these elements regardless of how logical they might seem:

- "luoghi affollati" → zero tourist hotspots at peak times, always suggest off-hours or alternative locations
- "ristoranti turistici" → only authentic local restaurants, no English menus, no tourist traps
- "stanchezza da musei" → zero museums, zero guided cultural visits, zero cultural institutions
- "vita notturna e club" → no bars, no clubs, no nightlife suggestions whatsoever
- "programmi rigidi" → maximum 2 planned activities per day, rest of day deliberately open and unscheduled
- "visite guidate" → only self-guided independent exploration, never suggest joining a group tour
- "lunghi trasferimenti" → maximum 1 hour travel time between any two points in a single day
- "sveglie presto" → no activity before 9am, always gentle mornings
- "chiacchiere con sconosciuti" → avoid activities that force interaction with strangers
- "troppo camminare" → maximum 5km walking per day, use transport frequently
- "hotel resort" → only local, independently-run accommodations — no chains, no resorts

═══════════════════════════════════════
STEP 5 — ITINERARY ARCHITECTURE
═══════════════════════════════════════
The itinerary must have a clear EMOTIONAL ARC — not flat identical days but a journey with intentional rhythm:

DAY 1 — ARRIVAL & FIRST BREATH: Gentle, sensory, zero pressure. Let the destination wash over them slowly. Never schedule anything demanding. The first impression of the place should be the focus.

DAYS 2-3 — IMMERSION: Deeper into the destination. First real experiences, building familiarity and comfort. The place starts to feel like theirs.

DAYS 4-5 — PEAK EXPERIENCES: The defining moments of the trip. THE DEFINING MOMENT from Step 1 must appear here — the experience they will remember forever. This is the emotional climax of the itinerary.

DAY 6 — DECELERATION: Slower rhythm, more reflective. Savoring what has been lived. A day of integration and presence.

DAY 7 — EMOTIONAL CLOSURE: A final intentional moment of beauty or meaning. The last memory must be deliberate and memorable — never end with just "transfer to airport". Give them a last image to carry home.

For trips shorter than 7 days, compress the arc proportionally while preserving its shape.

DAILY STRUCTURE RULES:
- Every day TITLE must be EVOCATIVE AND EMOTIONAL — it should create a feeling before the content is even read. ("Ultimi raggi e sale sulla pelle" YES. "Giorno 3 — Escursione" NO.)
- Every slot description must paint a SENSORY IMAGE — include what it feels like, smells like, sounds like when relevant. Not a list of activities but a lived experience.
- Logistical transitions must be framed as EXPERIENCES not logistics. ("Traghetto al tramonto verso Essaouira — due ore di oceano aperto e vento salato" not "Transfer to Essaouira")
- TIME MUST BE REALISTIC — verify that morning + lunch + afternoon + evening activities are physically possible given real distances between locations.
- THE DEFINING MOMENT must appear in Days 4-5 and be the most fully described, most emotionally charged element of the entire itinerary.
- FIRST DAY RULE: If travel involves a long flight, Day 1 must be arrival + gentle settling in only. No demanding activities on arrival day.
- LAST DAY RULE: If the flight home is in the afternoon or evening, include a meaningful final morning experience before departure.

═══════════════════════════════════════
STEP 6 — TONE & EMOTIONAL LANGUAGE
═══════════════════════════════════════
The emotional sensations selected by the user must be VISIBLE and FELT throughout the language of the entire itinerary — not just mentioned but embodied in every description:

- "staccare davvero dalla routine" → language of slowness and release. Words like: nessuna fretta, lasciare andare, il silenzio che si deposita, senza dover essere nessuno.
- "meravigliarmi di nuovo" → language of wonder and surprise. Words like: non te lo aspettavi, per la prima volta, qualcosa si apre, ti fermi e non sai perché.
- "sentirmi vivo di nuovo" → language of intensity and presence. Words like: il corpo che risponde, presente, pelle d'oca, acceso.
- "ritrovarmi" → language of quiet and introspection. Words like: spazio per pensare, il silenzio che parla, senza dover essere niente per nessuno.
- "ritrovare energia e leggerezza" → language of restoration. Words like: come svuotarsi, respiro profondo, più leggero di quando sei partito.
- "uscire dalla zona di comfort" → language of edges and firsts. Words like: non l'avresti mai fatto, oltre quello che conosci, il confine che si sposta.
- "festeggiare" → language of joy and deserving. Words like: te lo sei guadagnato, brindisi, il momento di goderti davvero tutto.

THE WHYYOURS FIELD must be so personally precise that the user thinks "how did it know?". It must:
- Reference specific elements from their actual quiz answers
- Explain the psychological reason this specific destination fits this specific emotional need
- Feel like it was written by someone who truly understands them, not a travel catalog
- Be 2-3 sentences maximum — devastatingly precise, never generic

THE CLOSING MESSAGE must be a single sentence that feels like a promise — something poetic that captures the essence of what this trip will give them. Not "buon viaggio". Something that makes them want to leave tomorrow.

═══════════════════════════════════════
STEP 7 — QUALITY & REALISM CHECKS
═══════════════════════════════════════
Before finalizing output, mentally verify:

1. NAMES ARE REAL: Every hotel, restaurant, café, experience, and landmark must be a real verifiable place on Google Maps. Never invent plausible-sounding names.
2. BUDGET IS RESPECTED: Mentally add up accommodation × nights + meals × days + activities. Verify it fits within the stated budget range.
3. ANTI-PATTERNS ARE ZERO: Scan every day for any violation of anti-pattern prohibitions.
4. COMPANIONS ARE HONORED: Every day contains at least one element specifically designed for the stated companions type.
5. THE DEFINING MOMENT EXISTS: Verify the peak experience appears prominently in Days 4-5.
6. EMOTIONAL ARC IS PRESENT: Day 1 is gentle, Days 4-5 are intense, Day 7 has emotional closure.
7. SEASONALITY IS CORRECT: The destination is genuinely pleasant during the stated travel period.
8. LOGISTICALLY POSSIBLE: Every day's activities are physically achievable given real distances and travel times.
9. TRAVEL STYLE IS RESPECTED: If base fissa, zero location changes. If due tappe, exactly one move. If scoperta, multiple locations.

═══════════════════════════════════════
MANDATORY SPECIFIC NAMES — critical for quality and affiliate links:
═══════════════════════════════════════
- Choose 1 REAL hotel with a precise name matching the profile and budget — call it HOTEL_NAME
- Choose 2 REAL experiences with precise searchable names — call them EXPERIENCE_1 and EXPERIENCE_2
- Choose 1 REAL restaurant for dinner with a precise name — call it DINNER_RESTAURANT
- Choose 1 REAL café or lunch spot with a precise name — call it LUNCH_SPOT
- Choose 2 REAL places/landmarks to visit — call them PLACE_1 and PLACE_2
- Use REAL IATA airport codes: departure from "${input.departure}", arrival at the chosen destination
- Use real dates: check-in ${checkin}, check-out ${checkout}

DETECT DESTINATION REGION — use this to choose correct affiliate links:
- Europe: Italy, France, Spain, Portugal, Germany, Austria, UK, Netherlands, Belgium, Poland, Czech Republic, Hungary, Romania, Sweden, Norway, Denmark, Finland, Ireland, Switzerland
- Mediterranean: Greece, Croatia, Turkey, Cyprus, Malta, Montenegro, Albania
- Asia: Japan, China, Korea, Thailand, Vietnam, Indonesia, Bali, Cambodia, Laos, Myanmar, Malaysia, Singapore, Philippines, Sri Lanka
- India: India and all Indian cities
- Africa: Morocco, Egypt, Kenya, Tanzania, South Africa, Ghana, Senegal, Ethiopia, Nigeria, Tunisia, Algeria
- LatAm: Mexico, Colombia, Peru, Brazil, Argentina, Chile, Ecuador, Bolivia, Costa Rica, Panama, Guatemala, Cuba
- NorthAmerica: United States, Canada, New York, Los Angeles, Chicago, San Francisco, Miami, Las Vegas, Toronto, Vancouver, Montreal

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
- viator_1: Africa + LatAm + NorthAmerica only — Viator search for EXPERIENCE_1
- viator_2: Africa + LatAm + NorthAmerica only — Viator search for EXPERIENCE_2
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
- "viator_morning": Africa/LatAm/NorthAmerica — day when EXPERIENCE_1 is in morning
- "viator_afternoon": Africa/LatAm/NorthAmerica — day when EXPERIENCE_2 is in afternoon

PLACES/LANDMARKS (morning/afternoon without an experience):
- "getyourguide_place_morning": Europe/Mediterranean — day when PLACE_1 is in morning with no experience
- "getyourguide_place_afternoon": Europe/Mediterranean — day when PLACE_2 is in afternoon with no experience
- "klook_place_morning": Asia/India — day when PLACE_1 is in morning with no experience
- "klook_place_afternoon": Asia/India — day when PLACE_2 is in afternoon with no experience
- "viator_place_morning": Africa/LatAm/NorthAmerica — day when PLACE_1 is in morning with no experience
- "viator_place_afternoon": Africa/LatAm/NorthAmerica — day when PLACE_2 is in afternoon with no experience

RESTAURANTS (lunch/evening):
- "thefork_lunch": Europe ONLY — day when LUNCH_SPOT is in lunch
- "thefork_evening": Europe ONLY — day when DINNER_RESTAURANT is in evening
- "tripadvisor_lunch": Asia + India + Africa + LatAm + NorthAmerica — day when LUNCH_SPOT is in lunch
- "tripadvisor_evening": Asia + India + Africa + LatAm + NorthAmerica — day when DINNER_RESTAURANT is in evening
- "tripadvisor_evening_fallback": any region — when evening has no specific restaurant name

Do NOT use any Google Maps links anywhere — use only monetizable affiliate links.

MAP POINTS — for each day, include a "mapPoints" array with GPS coordinates for ALL real places:
- Experiences and activities (slot: "Mattina" or "Pomeriggio")
- Restaurants and cafés (slot: "Pranzo" or "Sera")
- Landmarks and neighborhoods (slot: "Mattina" or "Pomeriggio")
- HOTEL_NAME on day 1 only (slot: "Hotel")
- Any ferry port or boat departure (slot: "Traghetto")
- Any car/scooter/quad rental location (slot: "Noleggio")
Use precise real-world GPS coordinates. Skip generic flight/airport slots.
For each mapPoint include:
- "imageUrl": real Unsplash photo URL — https://images.unsplash.com/photo-[REAL_PHOTO_ID]?w=400&h=250&fit=crop
- "affiliateUrl": most relevant affiliate link for that point

RESPONSE LANGUAGE: Write ALL text fields in ${input.lang === 'it' ? 'Italian' : 'English'} — every single field including day titles, slot descriptions, closing message, whyYours, experiencePreview, packingList, bestTime, gettingThere, budgetSummary. Do NOT mix languages.

REQUIRED JSON (day examples show affiliateLinks structure — apply same logic to all ${days} days):
{
  "destinations": [
    {
      "name": "City, Country",
      "imageUrl": "https://images.unsplash.com/photo-[ID]?w=600&h=400&fit=crop",
      "whyYours": "2-3 sentences — devastatingly personal psychological reason this destination fits",
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
          "title": "Evocative emotional title — not descriptive",
          "morning": "Sensory description of morning experience — max 15 words",
          "lunch": "LUNCH_SPOT real name + brief sensory detail — max 10 words",
          "afternoon": "Sensory description of afternoon — max 15 words",
          "evening": "Sensory description of evening — max 15 words",
          "affiliateLinks": {
            "getyourguide_morning": "https://www.getyourguide.com/s/?q=EXPERIENCE_1_NAME&partner_id=0BCSNBX8",
            "thefork_lunch": "https://www.thefork.it/search#q=LUNCH_SPOT_NAME",
            "getyourguide_place_afternoon": "https://www.getyourguide.com/s/?q=PLACE_1_NAME+tour&partner_id=0BCSNBX8",
            "tripadvisor_evening_fallback": "https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME"
          },
          "mapPoints": [
            { "label": "EXPERIENCE_1_NAME", "slot": "Mattina", "lat": 0.0000, "lng": 0.0000, "imageUrl": "https://images.unsplash.com/photo-[ID]?w=400&h=250&fit=crop", "affiliateUrl": "https://www.getyourguide.com/s/?q=EXPERIENCE_1_NAME&partner_id=0BCSNBX8" },
            { "label": "LUNCH_SPOT_NAME", "slot": "Pranzo", "lat": 0.0000, "lng": 0.0000, "imageUrl": "https://images.unsplash.com/photo-[ID]?w=400&h=250&fit=crop", "affiliateUrl": "https://www.thefork.it/search#q=LUNCH_SPOT_NAME" },
            { "label": "PLACE_1_NAME", "slot": "Pomeriggio", "lat": 0.0000, "lng": 0.0000, "imageUrl": "https://images.unsplash.com/photo-[ID]?w=400&h=250&fit=crop", "affiliateUrl": "" },
            { "label": "HOTEL_NAME", "slot": "Hotel", "lat": 0.0000, "lng": 0.0000, "imageUrl": "https://images.unsplash.com/photo-[ID]?w=400&h=250&fit=crop", "affiliateUrl": "https://www.booking.com/search.html?ss=HOTEL_NAME&aid=304142" }
          ]
        },
        {
          "dayNumber": 2,
          "title": "Evocative emotional title",
          "morning": "Max 15 words sensory description",
          "lunch": "Max 10 words",
          "afternoon": "EXPERIENCE_2 real name + sensory detail — max 15 words",
          "evening": "DINNER_RESTAURANT real name + atmosphere — max 10 words",
          "affiliateLinks": {
            "getyourguide_afternoon": "https://www.getyourguide.com/s/?q=EXPERIENCE_2_NAME&partner_id=0BCSNBX8",
            "thefork_evening": "https://www.thefork.it/search#q=DINNER_RESTAURANT_NAME"
          }
        }
      ],
      "budgetSummary": "Estimated total with breakdown — fits within stated budget",
      "packingList": "5 items separated by commas — specific to this destination and season",
      "bestTime": "max 8 words",
      "gettingThere": "max 12 words with real IATA airport code",
      "closingMessage": "1 poetic sentence that feels like a promise — never generic",
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

Generate exactly ${days} days in the itinerary.`;
}

export async function generateDestinationsOnly(input: ProfilingInput): Promise<GeneratedDestination[]> {
  const rawAnswers = input.answers[0] === "path_a" || input.answers[0] === "path_b"
    ? input.answers.slice(1) : input.answers;

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
    } catch { }
  }

  const path = input.answers[0] === "path_b"
    ? "Path B (user already has a destination area in mind)"
    : "Path A (open to surprises)";

  const budgetMap: Record<string, string> = {
    "< €500": "maximum €500 per person all included",
    "€500 – €1.500": "between €500 and €1,500 per person all included",
    "€1.500 – €3.000": "between €1,500 and €3,000 per person all included",
    "No limits": "unlimited budget",
  };
  const budgetText = budgetMap[input.budget] || input.budget;

  const prompt = `You are the engine of MindRoute, a psychological travel profiling platform.

USER PROFILE:
Path: ${path}
Budget: ${budgetText}
Departing from: ${input.departure} | Period: ${input.leaveDate}
Travel companions: ${input.companions || "not specified"}
${structuredProfileBlock ? `Structured profile:\n${structuredProfileBlock}\n\n` : ""}Quiz answers: ${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}

TASK: Generate exactly 3 perfectly personalized destinations based on this psychological profile.

RULES:
- The 3 destinations must be genuinely different — different countries, different emotional tones, different continents if possible
- Each destination must deeply match the psychological profile
- Never suggest the same destination twice
- The whyYours must be devastatingly personal — reference specific quiz answers
- Balance must-see iconic experiences with hidden local discoveries based on profile
- Verify seasonality — destination must be pleasant during stated travel period
- Respond ONLY with valid JSON, no text outside JSON

RESPONSE LANGUAGE: Write all text fields in ${input.lang === 'it' ? 'Italian' : 'English'}.

REQUIRED JSON:
{
  "destinations": [
    {
      "name": "City, Country",
      "imageUrl": "https://images.unsplash.com/photo-[REAL_ID]?w=600&h=400&fit=crop",
      "whyYours": "2-3 sentences — devastatingly personal psychological reason referencing their actual quiz answers",
      "experiencePreview": "1 short evocative sentence in first person",
      "practicalInfo": "costs, flights, period in 1 short line"
    }
  ]
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  const cleanJson = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = z.object({
    destinations: z.array(generatedDestinationSchema).min(3).max(3),
  }).parse(JSON.parse(cleanJson));

  return parsed.destinations;
}

export async function generateItineraryForDestination(
  input: ProfilingInput,
  destinationName: string
): Promise<GeneratedItinerary> {
  const prompt = buildPrompt({ ...input, _destinationOverride: destinationName } as any);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 10000,
    messages: [{ role: "user", content: prompt }],
  });

  const responseText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as any).text)
    .join("");

  const cleanJson = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const parsed = z.object({
    destinations: z.array(generatedDestinationSchema).min(1),
    itineraries: z.array(generatedItinerarySchema).min(1),
  }).parse(JSON.parse(cleanJson));

  return parsed.itineraries[0];
}

// Mantieni per compatibilità
export async function generateDestinations(input: ProfilingInput): Promise<{
  destinations: GeneratedDestination[];
  itineraries: Map<string, GeneratedItinerary>;
}> {
  const destinations = await generateDestinationsOnly(input);
  const itineraries = new Map<string, GeneratedItinerary>();
  return { destinations, itineraries };
}
