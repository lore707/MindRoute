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
imageQuery: z.string().optional(),
  dayImageUrl: z.string().optional(),
  affiliateLinks: affiliateLinksSchema,
  affiliateLabels: z.record(z.string(), z.string()).optional(),
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
  tripSummary: z.string().optional(),
  highlights: z.array(z.string()).optional(),
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

8. TRIP TYPE → CONCRETE REQUIREMENTS (every selected chip adds MANDATORY elements):
   - "Cultura e storia" → at least 2 days must include a meaningful cultural experience (historical site, local tradition, artisan workshop, ancient ruins) — but NOT museums if "stanchezza da musei" is in anti-patterns. Culture can be lived, not just visited.
   - "Natura e avventura" → at least 2 days must include outdoor/nature activities (hiking, kayaking, snorkeling, wildlife, national parks)
   - "Food e vino" → at least 3 meals must be at NAMED specific restaurants known for quality. Include 1 food experience (cooking class, market tour, wine tasting, food trail).
   - "Mare e relax" → at least 2 days must include beach/sea time with no scheduled activities — pure relaxation.
   - "Città e vita notturna" → at least 2 evenings must include nightlife (bars, live music, clubs). Name specific real venues.
   - "Fuori dal mondo" → destination must be remote, off-the-beaten-path. No major tourist cities.
   - "Road trip" → itinerary must include driving/riding between locations as a core experience. Mention car/scooter rental.
   - "Trekking e sport" → at least 3 days must include physical activities (hiking, climbing, diving, surfing, cycling).
   - "Wellness e spa" → at least 2 experiences must be wellness-related (spa, hammam, thermal baths, yoga, meditation).
   - "Scoperta, sorprendimi" → choose a destination the user would NEVER have searched for. Prioritize obscure, surprising, emotionally resonant places.

9. MOMENT CHIPS → ITINERARY STRUCTURE:
   - "mangiare nei posti locali" → EVERY meal must be at a local, non-touristic place. Zero international restaurants, zero hotel restaurants.
   - "perdermi nei quartieri autentici" → at least 2 mornings/afternoons must be unstructured exploration of local neighborhoods with no specific destination.
   - "vedere luoghi iconici" → include the destination's most famous landmark/experience, but at an off-peak time or from an unusual angle.
   - "stare immerso nella natura" → at least 1 full day must be spent entirely in nature with zero urban elements.
   - "vivere qualcosa di completamente nuovo" → include at least 1 experience the user has probably never done before (specific to the destination).
   - "fotografare qualcosa di straordinario" → include at least 2 moments specifically chosen for visual impact, with time of day optimized for light (golden hour, blue hour, dawn).

10. ATMOSPHERE CHIPS → TONE AND SETTING:
    - "Terrazza sul mare al tramonto" → at least 2 evenings must be at waterfront/terrace settings with sunset views.
    - "Mercato caotico e colorato" → include at least 1 vibrant market experience (morning market, night market, bazaar).
    - "Sentiero di montagna all'alba" → include at least 1 early morning hike/walk with views.
    - "Caffè europeo, giorno di pioggia" → include at least 1 slow café morning with no schedule.
    - "Tempio silenzioso al tramonto" → include at least 1 spiritual/contemplative setting.
    - "Festa di paese, luci e musica" → include at least 1 local festivity, live music, or community event.

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

BUDGET-DESTINATION FIT — CRITICAL CHECK before choosing any destination:
- Calculate realistic round-trip flight cost per person from departure city.
- Flights must NOT exceed 35% of the per-person budget. If budget is €1,500-3,000 per person, flights must be under €1,050 per person round-trip.
- Calculate: (flight × people) + (accommodation × nights) + (food × days × people) + (activities). The TOTAL must fit within (budget per person × number of people).
- If the destination is structurally too expensive for the budget (e.g. Raja Ampat on €1,500/person, Japan on €500/person), REJECT IT and choose a more affordable destination that still matches the psychological profile.
- Budget categories translate to these HARD LIMITS per person per day (excluding flights):
  * "< €500" total = max €50-70/day per person (accommodation + food + activities)
  * "€500-€1,500" total = max €100-180/day per person
  * "€1,500-€3,000" total = max €200-350/day per person
  * "No limits" = no cap
- ALWAYS show the math in budgetSummary so the user can verify.

PATH B SPECIFIC:
- The region is already defined. Focus on finding the BEST specific destination within that region.
- If the user specified a precise place or city, honor it and build around it.

PATH A SPECIFIC:
- First infer the macro-region that best fits the psychological profile, then choose the specific destination within it.

═══════════════════════════════════════
STEP 3 — COMPANIONS & TRAVEL STYLE
═══════════════════════════════════════
COMPANIONS — apply as HARD STRUCTURAL RULES for every single day:

PARTNER (coppia):
- Every day MUST include at least one intimate moment designed for two: a private dinner spot, a couples experience, a sunset just for them.
- Restaurants must be romantic — no communal tables, no fast food, no noisy places. Prioritize candlelit terraces, hidden courtyards, seaside tables for two.
- Accommodation must be couple-appropriate: double room with charm, no dorms, no shared bathrooms.
- Activities should alternate between shared adventures (kayak for two, cooking class together) and slow contemplative moments (walking hand in hand through a village, lying on an empty beach).
- Evening experiences must be intimate — never suggest group activities, pub crawls, or nightlife unless specifically requested.
- Tone: warm, sensory, connective. Words like "insieme", "voi due", "condividere".

SOLO:
- Emphasize personal freedom and spontaneous choices throughout.
- Include moments of deliberate solitude — a solo sunrise, a long walk alone, a café with a notebook.
- Restaurants should be solo-friendly: bar seating, communal tables, street food markets where eating alone is natural.
- Include at least 2 opportunities across the trip for organic social encounters (hostel common areas, group tours, local bars).
- Accommodation: hostels with social spaces if budget is low, boutique hotels with character if budget allows.
- Tone: empowering, self-directed. Words like "solo tu", "a modo tuo", "senza dover spiegare a nessuno".

FRIENDS (amici, 2+):
- Every day MUST include at least one high-energy shared experience: group activity, adventure sport, collective meal with drinks.
- NIGHTLIFE IS MANDATORY unless "vita notturna e club" is in anti-patterns: include the BEST bars, rooftop cocktails, live music venues, or clubs in the destination. Name specific real venues.
- At least 2 evenings must feature going out together — not just dinner but after-dinner drinks, dancing, or nightlife exploration.
- Restaurants must be group-friendly: large tables, sharing plates, lively atmosphere, good for conversation.
- Include at least 1 adrenaline/fun activity: boat party, quad biking, zip-lining, snorkeling group trip, wine tasting with laughs.
- Balance group energy with 1-2 "free time" windows where individuals can recharge.
- Accommodation: apartments or villas with shared living spaces if budget allows, otherwise adjacent rooms in a social hotel/hostel.
- Tone: energetic, celebratory, fun. Words like "tutti insieme", "risate", "quella sera che non dimenticherete".

FAMILY (famiglia):
- ALL activities must be verified safe and accessible for children (specify ages if mentioned).
- Zero physically extreme activities, zero long hikes (max 1-2 hours gentle walking), zero dangerous water sports.
- Meals must be at family-friendly restaurants with children's options or flexible menus. No fine dining, no late-night-only places.
- Include kid-friendly experiences: animal encounters, easy beaches, interactive cultural sites, gelato stops, playgrounds.
- Accommodation MUST have family rooms or connecting rooms, be centrally located, and have practical amenities (washing machine, kitchen if possible).
- Schedule must respect children's rhythms: no early starts, afternoon rest/pool time, dinner by 8pm.
- Transport must be easy: no long transfers, prefer destinations where attractions are close together.
- Tone: warm, practical, joyful. Words like "per tutta la famiglia", "i bambini adoreranno", "senza stress".

TRAVEL STYLE — structural rules for itinerary architecture:

BASE FISSA:
- Traveler stays in ONE accommodation for ALL 7 nights. ZERO location changes.
- Name the SAME hotel in day 1 evening and day 7 morning. Every evening returns to this base.
- Day trips radiate from the base (max 1-2 hours each way) and always return.
- The base itself must be described with personality — it becomes "home" during the trip.

DUE TAPPE — CRITICAL STRUCTURAL RULE:
- The trip MUST have exactly TWO DISTINCT ZONES in TWO DIFFERENT LOCATIONS.
- Zone 1: Days 1-3 (or 1-4). Zone 2: Days 4-7 (or 5-7).
- The two zones MUST be geographically different — different cities, different islands, different regions. NOT two neighborhoods of the same city.
- Each zone MUST have its own accommodation — name TWO DIFFERENT hotels.
- Each zone must have a distinctly different CHARACTER: e.g. Zone 1 = coastal/relaxing, Zone 2 = mountain/active. Or Zone 1 = urban/cultural, Zone 2 = rural/nature.
- The transition between zones must be described as an experience (scenic drive, ferry ride, train journey), not just "transfer".
- BAD: "Giorni 1-3 Raja Ampat nord, Giorni 4-7 Raja Ampat sud" — this is NOT two zones.
- GOOD: "Giorni 1-3 Salonicco (urban, culture, food), Giorni 4-7 Halkidiki coast (beach, nature, slow)" — this IS two zones.

SCOPERTA:
- Traveler moves every 1-2 days to a new location — minimum 3 different accommodations across the trip.
- Transport between locations must be easy (max 3 hours), scenic, and described as part of the experience.
- Each location adds a distinctly different dimension — never repeat the same vibe.
- Name a DIFFERENT hotel for each location.

NOT SPECIFIED: infer travel style from pace slider (structured = base fissa, balanced = due tappe, spontaneous = scoperta) and quiz answers.

═══════════════════════════════════════
STEP 3B — ACCOMMODATION & FOOD MATCHING
═══════════════════════════════════════
The user's accommodation and food preferences are HARD CONSTRAINTS, not suggestions.

ACCOMMODATION MATCHING — the selected price range defines the type:
- "Ostello / Capsule (€0-30)": ONLY hostels, capsule hotels, or guesthouses under €30/night. Name real hostels.
- "Economico ma carino (€30-60)": Budget hotels, B&Bs, guesthouses, riads in the €30-60 range. Clean and charming but not luxury.
- "Comfort medio (€60-120)": Mid-range hotels, aparthotels, well-reviewed 3-star properties. Good location, good reviews.
- "Boutique / Design (€120-200)": Design hotels, boutique properties with personality, unique stays. NOT generic chain hotels.
- "Lusso (€200+)": 4-5 star hotels, luxury resorts, exceptional properties. Premium everything.
- "Mix": Alternate between budget and splurge nights. First/last night can be nicer, middle nights more economical.
The hotel you choose MUST fall within the selected price range. Verify real prices mentally before naming it.

FOOD MATCHING — the selected food style defines every meal recommendation:
- "Street food e mercati (€5-15)": ONLY street food stalls, market food, cheap local eateries. No sit-down restaurants over €15/person.
- "Mix locale economico (€10-25)": Local restaurants, trattorias, family-run places. Authentic but affordable.
- "Qualche buon ristorante (€20-50)": Mix of casual lunches and proper restaurant dinners. Dinner can be a real restaurant experience.
- "Foodie (€40+)": Every meal is an experience. Recommend the BEST restaurants in the destination, hidden gems that foodies seek out.
- "Mix — street food quotidiano, cena speciale ogni tanto": Daily meals are cheap street food/market food (€5-15). But 2-3 dinners across the trip should be at a proper restaurant (€25-40) — a reward evening.
For EVERY lunch and dinner slot, the restaurant recommendation MUST match the food style selected. If "street food", never recommend a €50 restaurant. If "foodie", never recommend a generic tourist trap.

DIETARY RESTRICTIONS — if any are selected, they are ABSOLUTE:
- "Vegetariano": ZERO meat in any meal recommendation. Every restaurant must have verified vegetarian options.
- "Vegano": ZERO animal products. Only restaurants with vegan menus or destinations where vegan eating is easy.
- "Senza glutine": Verify that recommended restaurants can accommodate gluten-free. Mention it explicitly.
- "Halal" / "Kosher": Only destinations and restaurants where these are readily available.
- "Allergie specifiche": Mention that restaurants should be informed in advance.

PHYSICAL EFFORT — defines activity intensity:
- "Basso — comfort e trasporti comodi": Max 3-4km walking per day. Use taxis, transfers. No hiking, no strenuous activities.
- "Normale — cammino volentieri": 5-8km walking per day is fine. Light hikes (1-2 hours), cycling, swimming. No extreme sports.
- "Alto — adoro camminare per ore": 10-15km walking days are welcome. Multi-hour hikes, active exploration, physical challenges.
- "Estremo — trekking serio": Full-day treks, mountaineering, serious physical challenges. The harder the better.

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

THE TRIP SUMMARY must be a single evocative line that captures the geographic and emotional arc of the entire trip — where it starts, where it goes, and what it feels like. Example: "Da Volos al Pèlio, tra boschi di castagni e calette nascoste dove il tempo si ferma". Max 15 words.

THE HIGHLIGHTS must be exactly 4 short chips with emoji that represent the most memorable experiences of the trip — places, activities, or moments. Format: ["🏛 Place Name", "🏖 Beach Name", "🍽 Restaurant Name", "🌅 Experience"]. Use relevant emojis.

THE CLOSING MESSAGE must be a single sentence that feels like a promise — something poetic that captures the essence of what this trip will give them. Not "buon viaggio". Something that makes them want to leave tomorrow.

═══════════════════════════════════════
STEP 7 — QUALITY & REALISM CHECKS
═══════════════════════════════════════
Before finalizing output, mentally verify:

1. NAMES ARE REAL — THIS IS CRITICAL AND NON-NEGOTIABLE:
   Every hotel, restaurant, café, experience, and landmark must be a REAL SPECIFIC BUSINESS that exists on Google Maps or TripAdvisor. NEVER invent plausible-sounding names.
   
   CONFIDENCE RULE:
   - If you are 90%+ confident a place exists → use the specific name (e.g. "Taverna Aktaion, Volos")
   - If you are 50-90% confident → use the name + area (e.g. "Warung near Senaru village entrance")
   - If you are below 50% confident → use the honest format: "ristoranti locali di [AREA]" or "guesthouse a [VILLAGE]" — NEVER invent a fake name
   
   FOR REMOTE/OBSCURE DESTINATIONS:
   - It is BETTER to say "pranzo in uno dei warung del villaggio di pescatori" than to invent "Warung Sunset Paradise"
   - For accommodation in remote areas, describe the TYPE if you don't know specific names: "homestay nel villaggio", "guesthouse sulla spiaggia principale", "rifugio di montagna gestito da locali"
   - For transport, be SPECIFIC about the method even if you don't know the company: "minibus locale da X a Y (circa 2h, ~€5)", "barca condivisa dal porto principale (partenze mattina, ~€15)", "taxi condiviso dalla piazza del villaggio"
   
   TRANSPORT DETAILS — for EVERY location change in the itinerary:
   - Specify: departure point, arrival point, transport method, approximate duration, approximate cost
   - For flights: use real IATA codes, mention if direct or with stopover, approximate cost
   - For ferries: mention port name, approximate frequency, approximate cost
   - For buses/trains: mention station/stop, approximate frequency and duration
   - For remote areas: mention if 4x4 is needed, if roads are paved, if booking in advance is necessary
   
   BAD examples: "Transfer to hotel", "Trasferimento verso la costa"
   GOOD examples: "Minibus da Sorong a porto speedboat (30 min, ~€3), poi speedboat verso Waisai (1h, ~€15 — partenze 9:00 e 14:00)", "Traghetto da Pireo a Naxos con Blue Star Ferries (5h, ~€35 — prenotare online)"
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

IMAGE QUERY & IMAGE URL — for EVERY day, include:
- "imageQuery": a specific visual searchable phrase for the day's highlight
- "dayImageUrl": a REAL Unsplash photo URL that you know exists. Use only photo IDs you are confident are real Unsplash photos of the destination or similar landscapes. Format: "https://images.unsplash.com/photo-[REAL_ID]?w=800&h=500&fit=crop". If you are not confident about a specific photo ID, use a well-known Unsplash photo of that country or region. NEVER invent fake photo IDs — use only IDs you have seen in your training data.

affiliateLabels — for EVERY key in affiliateLinks, include a matching key in affiliateLabels with the REAL NAME of the place/experience/restaurant. This name will be shown to the user on the booking button. Use the actual name, not a generic label.

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
      "tripSummary": "One evocative line describing the arc of the trip — e.g. 'Da Salonicco alla penisola Calcidica, tra storia e mare cristallino'",
      "highlights": ["🏛 Ano Poli", "🏖 Halkidiki", "🍽 Ergon House", "🌅 Tramonto a Kassandra"],
      "days": [
      
        {
      "dayNumber": 1,
          "title": "Evocative emotional title — not descriptive",
          "morning": "Sensory description of morning experience — max 15 words",
          "lunch": "LUNCH_SPOT real name + brief sensory detail — max 10 words",
          "afternoon": "Sensory description of afternoon — max 15 words",
          "evening": "Sensory description of evening — max 15 words",
         "imageQuery": "specific landscape or experience name for Unsplash photo search",
          "dayImageUrl": "https://images.unsplash.com/photo-[REAL_PHOTO_ID]?w=800&h=500&fit=crop",
      "affiliateLinks": {
            "getyourguide_morning": "https://www.getyourguide.com/s/?q=EXPERIENCE_1_NAME&partner_id=0BCSNBX8",
            "thefork_lunch": "https://www.thefork.it/search#q=LUNCH_SPOT_NAME",
            "getyourguide_place_afternoon": "https://www.getyourguide.com/s/?q=PLACE_1_NAME+tour&partner_id=0BCSNBX8",
            "tripadvisor_evening_fallback": "https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME"
          },
          "affiliateLabels": {
            "getyourguide_morning": "EXPERIENCE_1_NAME",
            "thefork_lunch": "LUNCH_SPOT_NAME",
            "getyourguide_place_afternoon": "PLACE_1_NAME",
            "tripadvisor_evening_fallback": "Ristoranti CITY_NAME"
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
         "imageQuery": "specific visual scene for this day",
          "dayImageUrl": "https://images.unsplash.com/photo-[REAL_PHOTO_ID]?w=800&h=500&fit=crop",
      "affiliateLinks": {
            "getyourguide_afternoon": "https://www.getyourguide.com/s/?q=EXPERIENCE_2_NAME&partner_id=0BCSNBX8",
            "thefork_evening": "https://www.thefork.it/search#q=DINNER_RESTAURANT_NAME"
          },
          "affiliateLabels": {
            "getyourguide_afternoon": "EXPERIENCE_2_NAME",
            "thefork_evening": "DINNER_RESTAURANT_NAME"
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
- Each destination must deeply match the psychological profile AND all logistical constraints
- Never suggest the same destination twice
- The whyYours must be devastatingly personal — reference specific quiz answers
- Balance must-see iconic experiences with hidden local discoveries based on profile
- Verify seasonality — destination must be pleasant during stated travel period

BUDGET-DESTINATION FIT — HARD CONSTRAINT:
- Calculate realistic round-trip flight cost per person from the departure city.
- Flights must NOT exceed 35% of the per-person budget.
- If budget is "< €500": only destinations reachable for under €175 flight per person (short-haul Europe, nearby countries)
- If budget is "€500-€1,500": flights under €525 per person (medium-haul, Southern Europe, North Africa, Turkey)
- If budget is "€1,500-€3,000": flights under €1,050 per person (long-haul possible but not ultra-remote)
- If budget is "No limits": any destination
- If a destination is structurally too expensive for the budget, DO NOT suggest it regardless of how well it matches the profile. Find an equally fitting destination that is affordable.

DESTINATION DIVERSITY — CRITICAL:
- You know EVERY place on Earth. Use that knowledge. Do NOT default to the same 50 "travel blogger" destinations (Bali, Thailand, Iceland, Japan, Portugal, Greece islands, etc.).
- The 3 destinations MUST follow this EXACT structure:
  * DESTINATION 1 — WELL-KNOWN: A famous, iconic destination that perfectly matches the profile. The "dream" choice.
  * DESTINATION 2 — LESSER-KNOWN & MOST AFFORDABLE: A less mainstream destination that fits the profile AND is the cheapest option within the budget range. This is the "smart" choice — great value, fewer tourists, still amazing.
  * DESTINATION 3 — UNKNOWN GEM: A place most people have NEVER heard of. Obscure, surprising, emotionally resonant. The "discovery" choice that makes the user think "I would never have found this on my own."
- Think small: a specific village, a specific valley, a specific island — not a whole country. "Matera, Italy" not "Italy". "Zagori, Greece" not "Greece". "Sapa, Vietnam" not "Vietnam". "Alentejo coast, Portugal" not "Portugal".
- Consider: tiny Mediterranean islands, Balkan villages, Caucasus mountains, Central Asian cities, West African coasts, South American highlands, Southeast Asian hill towns, Nordic fjord villages, Eastern European thermal towns, Indian Ocean atolls, Pacific islands, Patagonian estancias, Omani wadis, Georgian wine valleys, Albanian riviera, Slovenian alps, Faroe Islands, Azores villages, Cabo Verde, São Tomé, Reunion, Rodrigues, Socotra, Lofoten fishing villages, Scottish highlands bothies.
- The more precisely you name the destination (specific town/area, not country/region), the better the result.

REACHABILITY — HARD CONSTRAINT:
- Weekend (3-4 days): max 4h flight from departure city
- One week (7 days): max 8-10h flight
- 10-14 days: anywhere
- Travel companions affect budget: "partner" = budget × 2, "friends" = budget × group size, "family" = budget × family size. The TOTAL must work.

TRIP TYPE MATCHING:
- If user selected "Cultura e storia": at least 2 of 3 destinations must have strong cultural/historical identity
- If user selected "Mare e relax": at least 2 of 3 must have coastline/beaches
- If user selected "Natura e avventura": at least 2 of 3 must have strong nature/outdoor offerings
- If user selected "Città e vita notturna": at least 2 of 3 must be cities with nightlife
- If multiple types selected: each destination should cover a different combination

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
    max_tokens: 3000,
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
    max_tokens: 16000,
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
