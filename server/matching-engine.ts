import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const BUDGET_MAP: Record<string, string> = {
  "low":                        "maximum €500 per person all included — hostels or guesthouses max €25/night, street food and local markets only, free or low-cost activities only",
  "medium":                     "between €500 and €1,500 per person all included — budget hotels or riads €40-80/night per person, mix of local restaurants €10-25/meal, some paid experiences",
  "high":                       "between €1,500 and €3,000 per person all included — boutique hotels €100-150/night, good restaurants €30-60/meal, premium experiences",
  "unlimited":                  "unlimited budget, aim for luxury and quality in every choice",
  "Meno di €500":               "maximum €500 per person all included — hostels or guesthouses max €25/night, street food and local markets only, free or low-cost activities only",
  "€500 – €1.500":              "between €500 and €1,500 per person all included — budget hotels or riads €40-80/night per person, mix of local restaurants €10-25/meal, some paid experiences",
  "€500 – €1.500 ":             "between €500 and €1,500 per person all included — budget hotels or riads €40-80/night per person, mix of local restaurants €10-25/meal, some paid experiences",
  "€1.500 – €3.000":            "between €1,500 and €3,000 per person all included — boutique hotels €100-150/night, good restaurants €30-60/meal, premium experiences",
  "I soldi non sono un problema": "unlimited budget, aim for luxury and quality in every choice",
  "Under €500":                 "maximum €500 per person all included — hostels or guesthouses max €25/night, street food and local markets only, free or low-cost activities only",
  "Money's not an issue":       "unlimited budget, aim for luxury and quality in every choice",
};

export const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ProfilingInput {
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
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    throw new Error(`Model returned invalid JSON: ${cleanJson.slice(0, 200)}`);
  }
  return generatedResponseSchema.parse(parsed);
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

export function buildPrompt(input: ProfilingInput): string {
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
  const days = Math.min(input.days, 14);
  const travelStyle = input.travelStyle || "not specified";

  const budgetText = BUDGET_MAP[input.budget] || `budget: ${input.budget}`;

  const period = input.leaveDate || "2025-06-15";
  const { checkin, checkout, checkinCompact, checkoutCompact } =
    buildCheckinCheckout(period, days);

  return `You are the engine of MindRoute, a psychological travel profiling platform. Your goal is not to generate a generic itinerary — it is to create the most personally resonant travel experience possible for this specific human being.

═══════════════════════════════════════
USER PROFILE — READ EVERY LINE CAREFULLY
═══════════════════════════════════════
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
STEP 0 — EXTRACT CHIPS + INFER TILT (do this first, verbatim, internal)
═══════════════════════════════════════
Parse the quiz answers and structured profile. Extract VERBATIM into these exact categories — no paraphrasing, no inference yet:

STYLE_CHIPS (from Path A Q1 or Path B Q2): list every selected chip verbatim
NEED_CHIPS (from Path A Q2 or Path B Q6): list every selected chip verbatim
ANTI_PATTERN_CHIPS (from Path A Q3 or Path B Q7): list every selected chip verbatim — these are HARD VETOES
ATMOSPHERE_CHIPS (from image selections Q4): list selected values
MOMENT_CHIPS (from Path B Q3): list every selected chip verbatim
PACE_SLIDER: number 0-100 (0=structured, 100=spontaneous)
DISTANCE_CHIP (from Path A Q7): value
GEO_CHIP (from Path B Q1): value
REJECTION_TEXT (from Path A Q6): text verbatim
COMPANIONS: value
BUDGET_TIER: low / medium / high / unlimited
TRAVEL_STYLE: base fissa / due tappe / scoperta / not specified
ACCOMMODATION_PREF: value
FOOD_PREF: value
EFFORT_LEVEL: value

These extracted values are the SOURCE OF TRUTH for everything that follows. Every constraint, prohibition, and requirement derives from this list — never from general travel knowledge, never from invented preferences, never from "what most travelers want".

── 0b — DOMINANT CHIPS + TILT INFERENCE (mandatory) ──
List the 2-3 DOMINANT chips: those that appear in multiple categories, or are emotionally strongest, or carry the heaviest mandate. These dictate every concrete choice (hotel type, restaurant style, transport mode, activity density). Secondary chips refine WITHIN the dominant frame, never against it.

Then classify the profile on two axes — name the specific chips that drove each call:

MAINSTREAM ↔ OFFBEAT axis:
  pushers MAINSTREAM: "Comfort medio" / "Boutique / Design" / "Lusso" accommodation, "Famiglia", "Lusso discreto", "Cibo sconosciuto" in anti-patterns, "Troppo isolato" in anti-patterns, "Lunghi trasferimenti" in anti-patterns.
  pushers OFFBEAT: "Selvaggio", "Solitario", "Fuori dal mondo", "Scoperta, sorprendimi", "Sorprendermi", "Ostello / Capsule", "Autentico"+"Esplorativo" together, "Ovunque sorprendimi davvero".
  → TILT_M_O = mainstream / offbeat / neutral.

COMFORT ↔ RAW axis:
  pushers COMFORT: "Comfort medio"/"Boutique"/"Lusso", "Famiglia", "Sveglie presto" anti-pattern, "Troppo camminare" anti-pattern, "Programmi rigidi" anti-pattern, PACE_SLIDER ≤ 30.
  pushers RAW: "Avventuroso", "Trekking e sport", "Selvaggio", "Ostello / Capsule", PACE_SLIDER ≥ 70, travel style = "scoperta".
  → TILT_C_R = comfort / raw / neutral.

The tilts determine the CHARACTER of every concrete element of the itinerary. If TILT_C_R = comfort, every hotel must be design/boutique-feel even when not luxury-tier; every transport must be the smooth option (taxi over local bus); every restaurant must be table-service not communal counters; activity density must not exceed 2-3 anchors/day. If TILT_C_R = raw, the reverse. Do NOT mix tilts within the same itinerary unless the chips themselves contradict.

═══════════════════════════════════════
STEP 1 — CHIP-TO-CONSTRAINT MAPPING (MANDATORY — apply ALL of these)
═══════════════════════════════════════
Every chip selected is a HARD CONSTRAINT, not a preference. Apply ALL of the following:

── STYLE CHIPS → DESTINATION CHARACTER ──
- "Selvaggio" / "Wild" → destination MUST be raw, untamed, off-beaten-path. No resort towns.
- "Silenzioso" / "Quiet" → destination MUST be calm, low-crowd. Eliminate: Santorini July, Venice, Dubrovnik, Mykonos main town peak season.
- "Caotico" / "Chaotic" → destination MUST have vibrant chaotic energy: medinas, Asian megacities, market cities.
- "Intimo" / "Intimate" → destination MUST feel small-scale, personal. Villages, small towns, boutique scenes.
- "Solitario" / "Solitary" → itinerary MUST include multiple solo moments. Destinations with solo-travel infrastructure.
- "Rigenerante" / "Regenerating" → destination MUST have restorative quality: nature, thermal baths, slow pace. No overstimulating cities.
- "Autentico" / "Authentic" → destination MUST have strong local identity untouched by mass tourism. Name neighborhoods, not tourist zones.
- "Lusso discreto" / "Quiet luxury" → destination MUST have refined, understated luxury available. Design hotels, fine dining without ostentation.
- "Spirituale" / "Spiritual" → destination MUST have spiritual/contemplative dimension: temples, monasteries, sacred landscapes, meditation culture.
- "Festoso" / "Festive" → destination MUST have celebratory, social, lively atmosphere. Local festivals, piazzas, vibrant nightlife.
- "Avventuroso" / "Adventure" → destination MUST offer physical adventure: mountains, sea activities, adrenaline sports.
- "Romantico" / "Romantic" → destination MUST have romantic infrastructure: intimate restaurants, beautiful scenery, couples activities.
- "Culturale" / "Cultural" → destination MUST have deep cultural/historical identity accessible beyond museums.
- "Esplorativo" / "Explorative" → destination MUST reward curiosity: hidden alleys, unexpected discoveries, layered complexity.

── NEED CHIPS → TRIP EMOTIONAL PURPOSE ──
- "Staccare dalla routine" / "Disconnect from routine" → trip MUST feel genuinely different from daily life. No destinations that feel like "work travel". Language throughout: slowness, release, disconnection.
- "Sentirmi vivo di nuovo" / "Feel alive again" → trip MUST offer intensity. Physical, sensory, or emotional challenge. Language: presence, aliveness, body responding.
- "Rallentare" / "Slow down" → maximum 2 activities per day. Long lunches. Afternoon rest. No rushing.
- "Sorprendermi" / "Be surprised" → destination MUST be unexpected for this profile. Avoid obvious choices.
- "Ricaricare le energie" / "Recharge my energy" → trip MUST be restorative. No exhausting schedules. Language: restoration, breathing deeply, lightness.
- "Cambiare qualcosa" / "Change something" → trip MUST feel transformative. Include at least 1 genuinely new experience.
- "Festeggiare" / "Celebrate" → trip MUST feel indulgent and joyful. Beautiful settings, special meals, celebratory moments.
- "Ritrovarmi" / "Find myself" → trip MUST offer solitude and introspection. Solo moments, journaling spots, contemplative settings.

── ANTI-PATTERN CHIPS → ABSOLUTE PROHIBITIONS ──
Every anti-pattern is a VETO. Violating even one is a failure.
- "Visite guidate" / "Guided tours" → ZERO group tours anywhere in the itinerary. Self-guided only.
- "Luoghi affollati" / "Crowded places" → ELIMINATE any destination known for extreme overcrowding. Time all visits for off-peak hours. Never suggest peak-time tourist hotspots.
- "Stanchezza da musei" / "Museums fatigue" → ZERO museums, ZERO cultural institutions, ZERO guided visits to historical sites. Culture must be lived (food, neighborhoods, people) not visited.
- "Hotel resort" / "Resort hotels" → ONLY independent, locally-run accommodation. No hotel chains, no resorts, no all-inclusive.
- "Vita notturna e club" / "Nightlife & clubs" → ZERO bars, clubs, or nightlife suggestions. Evening = quiet dinner and early rest.
- "Ristoranti turistici" / "Touristy restaurants" → ONLY authentic local places. No English menus visible from outside, no tourist-trap pricing.
- "Lunghi trasferimenti" / "Long transits" → Maximum 1 hour between any two points within a single day. No multi-hour daily commutes.
- "Sveglie presto" / "Early mornings" → No activity before 9:00am. Gentle starts always.
- "Programmi rigidi" / "Strict schedules" → Maximum 2 planned activities per day. Rest of day explicitly unscheduled.
- "Chiacchiere con sconosciuti" / "Small talk with strangers" → Avoid forced social activities. No group tours, no hostel common room emphasis.
- "Cibo sconosciuto" / "Unfamiliar food" → Suggest recognizable food cultures. No extreme/unusual cuisine unless specifically requested.
- "Troppo camminare" / "Too much walking" → Maximum 4-5km per day. Use transport. No long walking days.
- "Troppo isolato" / "Too isolated" → Destination MUST have social infrastructure: cafés, restaurants, other people around.
- "Spendere senza valore chiaro" → Every expense must feel worth it. No overpriced tourist experiences.
- "Stare troppo a lungo nello stesso posto" → If trip > 5 days: mandatory location change or strong daily variation.

── COMPANIONS → STRUCTURAL ITINERARY RULES ──
- "Amici" / "Friends": MANDATORY every day — at least 1 group activity, at least 2 evenings out (bars, clubs, live music) UNLESS "vita notturna" in anti-patterns. Group-friendly restaurants. Shared accommodation. Tone: energetic, celebratory.
- "Partner": MANDATORY every day — at least 1 intimate couple moment. Romantic restaurant settings. No communal tables. Activities designed for two. Tone: warm, sensory, connective.
- "Solo" / "Da solo": Include deliberate solitude moments AND at least 2 organic social opportunities (unless "chiacchiere" in anti-patterns). Solo-friendly restaurants. Freedom-forward language.
- "Famiglia": ALL activities child-safe. No extreme sports. Family restaurants. Early dinners (by 8pm). Centrally located accommodation.

── TRIP TYPE CHIPS → MANDATORY ITINERARY ELEMENTS ──
- "Cultura e storia" → ≥2 days with meaningful cultural experience (NOT museums if "stanchezza da musei" in anti-patterns — use neighborhoods, artisans, local traditions instead).
- "Natura e avventura" → ≥2 days with outdoor/nature activity (hiking, kayaking, snorkeling, wildlife).
- "Food e vino" → ≥3 meals at NAMED quality restaurants + 1 food experience (market, cooking class, wine tasting).
- "Mare e relax" → ≥2 days with unscheduled beach/sea time. No activities those mornings/afternoons.
- "Città e vita notturna" → ≥2 evenings with nightlife. Name real venues. (Override ONLY if "vita notturna" in anti-patterns.)
- "Fuori dal mondo" → Destination MUST be genuinely remote. No direct flights from major hubs.
- "Road trip" → Itinerary MUST include driving between locations. Mention car/scooter rental.
- "Trekking e sport" → ≥3 days with physical challenge (hiking, climbing, diving, surfing, cycling).
- "Wellness e spa" → ≥2 wellness experiences (spa, hammam, thermal baths, yoga, meditation).
- "Scoperta, sorprendimi" → Destination must be genuinely unexpected. Avoid obvious choices.

── MOMENT CHIPS (Path B Q3) → ITINERARY MOMENTS ──
- "mangiare nei posti locali" → EVERY meal at local non-touristic places. Zero international chains, zero hotel restaurants.
- "perdermi nei quartieri autentici" → ≥2 unstructured neighborhood exploration sessions.
- "vedere luoghi iconici" → Include the destination's most famous landmark, but off-peak time or unusual angle.
- "stare immerso nella natura" → ≥1 full day entirely in nature, zero urban elements.
- "vivere qualcosa di completamente nuovo" → ≥1 experience the user has probably never done before.
- "fotografare qualcosa di straordinario" → ≥2 moments specifically for visual impact, time-of-day optimized.
- "trovare un posto che non sapevo esistesse" → ≥1 genuinely obscure local discovery.

── ATMOSPHERE CHIPS (image selections) → SETTING TONE ──
- "seaside" (terrazza sul mare) → ≥2 evenings at waterfront/terrace with sunset views.
- "market" (mercato caotico) → ≥1 vibrant market experience.
- "trail" (sentiero di montagna) → ≥1 early morning hike/walk with views.
- "cafe" (caffè europeo) → ≥1 slow café morning with no schedule.
- "medina" → destination has labyrinthine old town character.
- "nordic" → destination has raw, dramatic, edge-of-world quality.
- "temple" → destination has spiritual/ancient atmosphere.
- "desert" → destination has vast, open, freedom quality.

── PACE SLIDER → ITINERARY DENSITY ──
- 0-20 (structured): Every slot filled. Time-stamped. Max 1 unscheduled hour per day.
- 21-40 (mostly planned): 3 planned activities per day. 1-2 flexible slots.
- 41-60 (balanced): 2 planned activities per day. Afternoons often open.
- 61-80 (loose): 1-2 anchor points per day. Rest deliberately open.
- 81-100 (spontaneous): 1 anchor per day maximum. Emphasize wandering and improvisation.

── DISTANCE CHIP (Path A) → GEOGRAPHY ──
- "Vicino a casa" / "Close to home": NO flights. Ground transport ONLY (car/train/bus). All 3 within 4h ground from departure.
- "Stesso continente" / "Same continent": Stay within departure continent. Europe → only European destinations.
- "Lontano" / "Far away": Long-haul preferred. Asia, Americas, Africa, Oceania.
- "Ovunque, sorprendimi davvero": Anything, prioritize genuine surprise.

── GEO CHIP (Path B) → ABSOLUTE GEOGRAPHIC CONSTRAINT ──
- "Europa": ALL options MUST be in Europe. No exceptions.
- "Asia": ALL options MUST be in Asia.
- "Americhe": ALL options MUST be in the Americas.
- "Africa e Medio Oriente": ALL options MUST be in Africa or Middle East.
- "Oceania": ALL options MUST be in Oceania.
- "Vicino a casa": ALL options within 4h ground transport from departure. NO flights.
- If user specified a precise place in the addendum field → destination MUST honor that choice.

── REJECTION TEXT (Path A Q6) → ELIMINATE SIMILAR DESTINATIONS ──
Parse the rejection text carefully. If user says "non mi piace X perché Y", identify what X represents and eliminate all destinations with the same Y quality. Example: "non mi dice nulla New York" → eliminate all overwhelming megacities. "Le Maldive troppo perfette" → eliminate all resort-type beach destinations.

── BUDGET → HARD SPENDING LIMITS ──
- "low" (< €500): Max €50-70/day per person excluding flights. Flights max €175/pp round-trip.
- "medium" (€500-€1,500): Max €100-180/day per person excluding flights. Flights max €525/pp.
- "high" (€1,500-€3,000): Max €200-350/day per person excluding flights. Flights max €1,050/pp.
- "unlimited": No cap.
Never suggest a destination structurally incompatible with the budget. Verify the math before finalizing.

── ACCOMMODATION PREFERENCE → HOTEL TYPE ──
- "Ostello / Capsule": ONLY hostels or capsule hotels under €30/night.
- "Economico ma carino": Budget hotels, B&Bs, guesthouses €30-60/night.
- "Comfort medio": Mid-range hotels €60-120/night.
- "Boutique / Design": Design or boutique hotels €120-200/night.
- "Lusso": Luxury 4-5 star €200+/night.
- "Mix": Alternate budget and splurge nights.
The hotel named MUST fall within this range. Verify mentally before naming.

── FOOD PREFERENCE → EVERY MEAL ──
- "Street food e mercati": ONLY street food/market under €15/person. No sit-down restaurants.
- "Mix locale economico": Local trattorias and family-run places €10-25/person.
- "Qualche buon ristorante": Mix of casual lunches and proper dinners €20-50/person.
- "Foodie": BEST restaurants only. Hidden gems. €40+/person. Food IS the trip.
- "Mix — street food quotidiano, cena speciale ogni tanto": Daily street food + 2-3 special dinners across the trip.
Every lunch and dinner slot MUST match this selection. No exceptions.

── PHYSICAL EFFORT → ACTIVITY INTENSITY ──
- "Basso": Max 3-4km/day. Taxi and transport. No hiking.
- "Normale": 5-8km/day. Light hikes (1-2h), cycling, swimming.
- "Alto": 10-15km/day. Multi-hour hikes, active exploration.
- "Estremo": Full-day treks, mountaineering, serious challenges.

── DIETARY RESTRICTIONS → ABSOLUTE ──
- "Vegetariano": ZERO meat. Verify every restaurant has vegetarian options.
- "Vegano": ZERO animal products.
- "Senza glutine": Verify GF availability at all recommended places.
- "Halal" / "Kosher": Only verified halal/kosher options.

═══════════════════════════════════════
STEP 2 — PSYCHOLOGICAL PORTRAIT (internal reasoning, do not output)
═══════════════════════════════════════
Using the extracted chips and constraints from Step 0-1, build the full psychological portrait:

1. CORE EMOTIONAL NEED: What is the deepest driver? Combine NEED_CHIPS + open text + life context signals.

2. TRAVEL IDENTITY: How do they move through the world? Combine STYLE_CHIPS + COMPANIONS + PACE_SLIDER.

3. THE DEFINING MOMENT: What single experience would make this traveler say "this trip changed me"? Build Days 4-5 around creating this moment.

4. CONTRADICTIONS AS SIGNALS: Embrace tensions — "staccare" + "sentirmi vivo" = needs both rest AND rupture. Never flatten into generic middle ground.

5. LIFE PHASE READING:
   - "ritrovarmi" = searching for identity, needs contemplative space
   - "staccare davvero" = exhausted, needs total decompression
   - "meravigliarmi di nuovo" = has lost wonder, needs to rediscover it
   - "sentirmi vivo di nuovo" = flat phase, needs intensity and presence
   - "festeggiare" = positive transition, wants to celebrate hard
   - "uscire dalla zona di comfort" = ready for genuine transformation

6. AESTHETIC SENSIBILITY: From ATMOSPHERE_CHIPS and image selections — what visual/sensory world does this person inhabit?

═══════════════════════════════════════
STEP 3 — DESTINATION SELECTION
═══════════════════════════════════════
Choose the destination that BEST matches the complete constraint map from Step 1 and portrait from Step 2.

DESTINATION PHILOSOPHY:
- Famous or unknown — what matters is the FIT with this specific person.
- A famous destination chosen for the RIGHT psychological reasons beats an obscure one chosen to seem original.
- Within ANY destination, go beyond the obvious: choose neighborhoods, experiences, restaurants that most tourists never find.
- Balance must-see vs hidden gems based on MOMENT_CHIPS:
  * "vedere luoghi iconici" selected → 60% must-see, 40% hidden
  * "trovare un posto che non sapevo esistesse" selected → 20% must-see, 80% hidden
  * Default balanced → 40% must-see, 60% hidden

SEASONALITY CHECK — verify destination is genuinely pleasant during travel period:
- Never suggest a destination that is objectively bad during stated period (monsoon, 45°C heat, polar winter).
- Example: August Atlantic Morocco coast = perfect. August Marrakech medina = avoid. December Maldives = perfect. December Iceland = dramatic but cold.

REACHABILITY CHECK:
- Weekend (3-4 days): max 4h flight.
- One week: max 8-10h flight.
- 10-14 days: anywhere.
- "Vicino a casa": ground transport only, max 4h.

BUDGET-DESTINATION FIT — verify math before finalizing:
(flight round-trip/pp) + (hotel × nights) + (food × days) + (activities) ≤ budget per person.
If math fails → REJECT and choose different destination.

PATH B: Region already defined. Find the BEST specific destination within it. Honor any specific place mentioned.
PATH A: Infer macro-region from psychological portrait, then choose specific destination within it.

═══════════════════════════════════════
STEP 4 — COMPANIONS & TRAVEL STYLE
═══════════════════════════════════════
Apply companion rules as HARD STRUCTURAL REQUIREMENTS every single day:

PARTNER: Every day ≥1 intimate couple moment. Romantic restaurants (no communal tables). Couple activities alternate shared adventure + slow contemplation. Zero group activities unless requested. Tone: warm, sensory, "voi due", "condividere".

SOLO: Personal freedom emphasized. Deliberate solitude moments. Solo-friendly restaurants. ≥2 organic social opportunities across the trip (unless "chiacchiere" anti-pattern). Tone: empowering, "solo tu", "a modo tuo".

FRIENDS: Every day ≥1 high-energy shared experience. ≥2 evenings going out (unless "vita notturna" anti-pattern). Group-friendly restaurants. ≥1 adrenaline/fun activity. Shared accommodation. Tone: energetic, "tutti insieme", "quella sera che non dimenticherete".

FAMILY: All activities child-safe. No extreme sports. Family restaurants. Dinner by 8pm. Central accommodation with amenities. Afternoon rest time. Tone: warm, practical, "i bambini adoreranno".

TRAVEL STYLE — itinerary architecture:

BASE FISSA: ONE accommodation for ALL nights. Every evening returns to base. Day trips radiate out (max 2h each way). Same hotel named on Day 1 and Day 7.

DUE TAPPE: EXACTLY 2 distinct zones in 2 different locations. Zone 1: Days 1-3/4. Zone 2: Days 4-7/5-7. Different cities/regions (NOT same city different neighborhoods). 2 different hotels named. Different character per zone (e.g. urban/coastal, nature/city). Transition described as experience. BAD: "North Raja Ampat / South Raja Ampat". GOOD: "Thessaloniki (urban, culture) / Halkidiki (beach, nature)".

SCOPERTA: Move every 1-2 days. Minimum 3 accommodations. Max 3h transport between locations. Each location different vibe. Different hotel named per location.

NOT SPECIFIED: Infer from PACE_SLIDER — 0-40 = base fissa, 41-70 = due tappe, 71-100 = scoperta.

═══════════════════════════════════════
STEP 5 — ITINERARY ARCHITECTURE
═══════════════════════════════════════
The itinerary MUST have a clear EMOTIONAL ARC — not flat identical days but a journey with intentional rhythm.

DAY 1 — DEPARTURE & ARRIVAL:
- morning: Flight from departure. Format: "Volo [CITY] [IATA] → [DEST] [IATA], [airline if known], ~[duration], ~€[cost]/pp. [1 sentence anticipation or aerial view]." Include expedia_flights link.
- lunch: In-flight or first local spot if short flight.
- afternoon: Airport transfer → hotel. Transport method, ~duration, ~€cost/pp. First impression sentence. Check-in.
- evening: First gentle dinner. Named restaurant. ~€X/pp. Sensory first contact with destination. Include tripadvisor link.

DAYS 2-3 — IMMERSION:
- morning: Named activity/place + best arrival time. Affiliate link.
- lunch: Named restaurant + neighborhood + ~€X/pp. Affiliate link.
- afternoon: Named activity different character from morning. Affiliate link.
- evening: Named dinner + atmosphere + ~€X/pp. Affiliate link.

DAYS 4-5 — PEAK EXPERIENCES (THE DEFINING MOMENT HERE):
- THE DEFINING MOMENT must appear in Day 4 or 5. Most fully described. Most emotionally charged.
- Every slot has affiliate link. Zero exceptions.
- If "due tappe" or "scoperta": Day 4 morning = travel from Location 1 to Location 2 + check-in Hotel 2.

DAY 6 — DECELERATION:
- morning: Slow and unstructured. Market, café, walk. Still a specific named place.
- afternoon: Last meaningful experience — something remembered as "the last afternoon there".
- evening: Penultimate dinner. Special but not the peak.

DAY LAST — EMOTIONAL CLOSURE & DEPARTURE:
- morning: Final experience before departure. Specific place + time ("alle 7, prima dei bagagli").
- lunch: Last meal. Named café or bar. "L'ultimo caffè a [NAME] prima dell'aeroporto."
- afternoon: Full return journey. "Transfer [hotel] → aeroporto [IATA], [method], ~[duration], ~€[cost]/pp. Volo [dest IATA] → [home IATA], ~[duration], atterraggio [time range]." Skyscanner link.
- evening: Arrival home. "[City] con [emotional souvenir — not a physical object]." No affiliate link needed.

For trips < 7 days: compress proportionally. 4 days = Day 1 arrival / Days 2-3 peak / Day 4 closure+departure.

MANDATORY SLOT RULES — every day, every slot:
- Every morning: ≥1 affiliate link (activity or expedia_flights Day 1)
- Every lunch: ≥1 tripadvisor link (exception: in-flight Day 1)
- Every afternoon: ≥1 affiliate link (activity, hotel, or return flight last day)
- Every evening: ≥1 affiliate link (restaurant or tripadvisor fallback, exception: home arrival)
- Every slot: max 3 sentences. S1 = what. S2 = how it feels/looks/smells. S3 = practical detail or cost.
- Time hints when relevant: "arriva alle 8 prima delle folle", "golden hour alle 19:30"
- Costs always shown: ~€X/pp for every transport, activity, restaurant
- Logistical transitions ARE experiences: "40 min di taxi lungo la costa, finestre aperte, odore di sale" — never "transfer to hotel"

═══════════════════════════════════════
STEP 6 — TONE & EMOTIONAL LANGUAGE
═══════════════════════════════════════
The NEED_CHIPS selected must be VISIBLE and FELT throughout the language — not mentioned but embodied:

- "Staccare dalla routine" → slowness and release: "nessuna fretta", "lasciare andare", "il silenzio che si deposita", "senza dover essere nessuno"
- "Meravigliarmi di nuovo" → wonder and surprise: "non te lo aspettavi", "per la prima volta", "qualcosa si apre", "ti fermi e non sai perché"
- "Sentirmi vivo di nuovo" → intensity and presence: "il corpo che risponde", "presente", "pelle d'oca", "acceso"
- "Ritrovarmi" → quiet and introspection: "spazio per pensare", "il silenzio che parla", "senza dover essere niente per nessuno"
- "Ritrovare energia e leggerezza" → restoration: "come svuotarsi", "respiro profondo", "più leggero di quando sei partito"
- "Uscire dalla zona di comfort" → edges and firsts: "non l'avresti mai fatto", "oltre quello che conosci", "il confine che si sposta"
- "Festeggiare" → joy and deserving: "te lo sei guadagnato", "brindisi", "il momento di goderti davvero tutto"
- "Rallentare" → deliberate slowness: "il tempo si dilata", "nessun posto dove essere", "una mattina che non finisce mai"

THE WHYYOURS must be so precise the user thinks "how did it know?". It MUST:
- Reference specific elements from their actual quiz answers (name the chips, quote the text)
- Explain the psychological reason this destination fits this specific emotional need
- Feel written by someone who truly understands them, not a travel catalog
- Be 2-3 sentences maximum — devastating precision, never generic

THE TRIP SUMMARY: one evocative line capturing geographic + emotional arc. "Da Volos al Pèlio, tra boschi di castagni e calette nascoste dove il tempo si ferma." Max 15 words.

THE HIGHLIGHTS: exactly 4 chips with emoji representing most memorable experiences. Format: ["🏛 Place Name", "🏖 Beach Name", "🍽 Restaurant Name", "🌅 Experience"]. Use specific real names.

THE CLOSING MESSAGE: one poetic sentence that feels like a promise. Not "buon viaggio". Something that makes them want to leave tomorrow.

═══════════════════════════════════════
STEP 7 — QUALITY & REALISM CHECKS
═══════════════════════════════════════
Before finalizing, verify every item on this list:

1. NAMES ARE REAL — NON-NEGOTIABLE:
   - 90%+ confident → use specific name ("Taverna Aktaion, Volos")
   - 50-90% confident → use name + area ("Warung near Senaru village entrance")
   - Below 50% → use honest format: "ristoranti locali di [AREA]" — NEVER invent fake names
   For remote areas: describe TYPE not fake name. "Homestay nel villaggio" not "Sunset Homestay Paradise".

2. TRANSPORT DETAILS — for EVERY location change:
   - Departure point, arrival point, method, duration, cost
   - BAD: "Transfer to hotel" / "Trasferimento verso la costa"
   - GOOD: "Minibus da Sorong a porto speedboat (30 min, ~€3), poi speedboat verso Waisai (1h, ~€15)"

3. BUDGET VERIFIED: (accommodation × nights) + (food × days) + (activities) + flights ≤ stated budget.

4. EVERY ANTI-PATTERN = ZERO: Scan every slot. If any prohibited element appears → remove it.

5. COMPANIONS HONORED: Every day contains ≥1 element designed specifically for the companion type.

6. DEFINING MOMENT EXISTS: Peak experience prominently in Days 4-5.

7. EMOTIONAL ARC: Day 1 gentle → Days 2-3 immersion → Days 4-5 peak → Day 6 deceleration → Day 7 closure.

8. SEASONALITY CORRECT: Destination genuinely pleasant during stated period.

9. LOGISTICALLY POSSIBLE: Every day's activities achievable with real distances and times.

10. TRAVEL STYLE RESPECTED: Base fissa = zero moves. Due tappe = exactly one. Scoperta = multiple.

11. CHIP COMPLIANCE CHECK: For each chip in ANTI_PATTERN_CHIPS — does any slot violate it? If yes, fix it.

12. FOOD STYLE COMPLIANCE: Every meal matches FOOD_PREF. No restaurant above budget tier.

13. ACCOMMODATION COMPLIANCE: Named hotel within ACCOMMODATION_PREF price range.

14. TILT ALIGNMENT (from Step 0b):
    - Mainstream tilt + you named a remote homestay or village-only spot → MISMATCH, replace.
    - Offbeat tilt + you named a chain hotel or a fully touristic neighborhood → MISMATCH, replace.
    - Comfort tilt + an itinerary with 5+ km walks/day, 7am starts, or communal-table dinners → MISMATCH, soften it.
    - Raw tilt + design-hotel-only stays, taxi-only transport, no physical/sensory friction → MISMATCH, sharpen it.

15. CHIP-MAPPING GRID (internal, mandatory gate before emitting JSON):
    Build a mental table — for EVERY named concrete element (hotel, every lunch, every evening, every morning activity, every afternoon activity, every transport leg) → which 1+ DOMINANT chips does it satisfy? Which (if any) does it violate?
    REPLACE any element where:
      - it satisfies ZERO dominant chips AND it doesn't solve a logistical need (transport between zones, check-in, return flight) → replace with one that satisfies at least 1 dominant chip
      - it violates ANY dominant chip or any anti-pattern chip → replace
    Re-run the grid after replacement. Only emit JSON when every element passes. "Interesting", "famous", or "well-rated" are NOT chips — they do not count as justification.

═══════════════════════════════════════
MANDATORY SPECIFIC NAMES
═══════════════════════════════════════
- 1 REAL hotel matching profile + budget → HOTEL_NAME
- 2 REAL experiences with searchable names → EXPERIENCE_1, EXPERIENCE_2
- 1 REAL dinner restaurant → DINNER_RESTAURANT
- 1 REAL café or lunch spot → LUNCH_SPOT
- 2 REAL landmarks/places → PLACE_1, PLACE_2
- REAL IATA codes: departure "${input.departure}", destination
- Real dates: check-in ${checkin}, check-out ${checkout}
- Compact dates: ${checkinCompact}, ${checkoutCompact}
- CITY_NAME = destination city (never hotel name)
- CITY_SLUG = lowercase with hyphens

Pre-built link templates (replace CITY_NAME, CITY_SLUG, ARRIVAL_IATA):
- Hotels.com: https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=CITY_NAME&q-check-in=${checkin}&q-check-out=${checkout}
- Expedia flights: https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Flights-Search?leg1=from%3A${input.departure.replace(/ /g, '%20')}%2Cto%3AARRIVAL_IATA%2Cdeparture%3A${checkinCompact}%2F1&leg2=from%3AARRIVAL_IATA%2Cto%3A${input.departure.replace(/ /g, '%20')}%2Cdeparture%3A${checkoutCompact}%2F1&passengers=adults%3A1&trip=roundtrip&mode=search
- Expedia packages: https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/lp/b/package-savings
- Expedia cars: https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Cars?startDate=${checkin}&endDate=${checkout}&pickUpLocation=CITY_NAME
- Viator: https://www.viator.com/searchResults/all?text=CITY_NAME&pid=P00293604&mcid=42383&medium=link
- Klook: https://www.klook.com/search/?q=CITY_NAME&aid=116532
- Civitatis: https://www.civitatis.com/it/CITY_SLUG/?aid=112605&cmp=mindroute
- Musement: https://www.musement.com/it/CITY_SLUG/?utm_source=affiliate&utm_medium=affiliate&utm_campaign=mindroute-7388
- TripAdvisor: https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME
- Undercovertourist: https://www.kqzyfj.com/click-101710513-15733832
- Tablet Hotels: https://www.kqzyfj.com/click-101710513-15686837
- FlixBus IT: https://www.awin1.com/cread.php?awinmid=110876&awinaffid=2830626&ued=https%3A%2F%2Fwww.flixbus.it (use for European ground transport between cities)
- SamBoat IT: https://www.awin1.com/cread.php?awinmid=32681&awinaffid=2830626&ued=https%3A%2F%2Fwww.samboat.it (use for coastal/island destinations: Croatia, Greece, Italy coasts, Mediterranean)

DETECT DESTINATION REGION:
- Europe: Italy, France, Spain, Portugal, Germany, Austria, UK, Netherlands, Belgium, Poland, Czech Republic, Hungary, Romania, Sweden, Norway, Denmark, Finland, Ireland, Switzerland
- Mediterranean: Greece, Croatia, Turkey, Cyprus, Malta, Montenegro, Albania
- Asia: Japan, China, Korea, Thailand, Vietnam, Indonesia, Bali, Cambodia, Laos, Myanmar, Malaysia, Singapore, Philippines, Sri Lanka
- India: India and all Indian cities
- Africa: Morocco, Egypt, Kenya, Tanzania, South Africa, Ghana, Senegal, Ethiopia, Nigeria, Tunisia, Algeria
- LatAm: Mexico, Colombia, Peru, Brazil, Argentina, Chile, Ecuador, Bolivia, Costa Rica, Panama, Guatemala, Cuba
- NorthAmerica: United States, Canada

AFFILIATE LINKS — topAffiliateLinks (all relevant by region):
- "expedia_flights": always
- "hotels": always
- "expedia_packages": always
- "expedia_cars": when destination requires driving
- "civitatis_1" + "civitatis_2": Europe + Mediterranean + LatAm
- "musement_1": Europe + Mediterranean
- "flixbus": Europe only — when destination involves intercity ground travel
- "samboat": Mediterranean + Europe coastal destinations (Croatia, Greece, Italian coasts, Sardinia, Sicily, Montenegro, Albania)
- "klook_1" + "klook_2": Asia + India
- "viator_1" + "viator_2": Africa + NorthAmerica + Oceania
- "undercovertourist": NorthAmerica ONLY if Orlando or Los Angeles
- "tripadvisor": always
- "tablet_hotels": always — boutique and design hotels alternative to Hotels.com
- "flixbus": Europe only — when destination involves intercity ground travel
- "samboat": Mediterranean + coastal Europe — coastal/island destinations only

affiliateLinks inside each day:
- "expedia_flights": Day 1 morning + last day afternoon
- "hotels_hotel": Day 1 afternoon (check-in)
- "expedia_cars": any day that involves car rental pickup — use for road trips and destinations requiring driving
- "flixbus": any day involving intercity bus travel within Europe — e.g. day trip by bus, transfer between cities
- "samboat": any day involving ferry, boat rental, or island hopping — Mediterranean and coastal Europe only
- Activities morning/afternoon by region: civitatis_morning, civitatis_afternoon, musement_morning, musement_afternoon (Europe/Med), klook_morning, klook_afternoon (Asia/India), viator_morning, viator_afternoon (Africa/NorthAmerica/Oceania)
- Places morning/afternoon: civitatis_place_morning, civitatis_place_afternoon (Europe/Med/LatAm), klook_place_morning, klook_place_afternoon (Asia/India), viator_place_morning, viator_place_afternoon (Africa/NorthAmerica/Oceania)
- "tripadvisor_lunch": all regions, all lunch slots
- "tripadvisor_evening": all regions, all evening slots
- "tripadvisor_evening_fallback": all regions, fallback

CONTEXTUAL LINK RULES — apply these based on what actually happens that day:
- Day with ferry/boat crossing → add "samboat" in that slot (morning or afternoon)
- Day with intercity bus in Europe → add "flixbus" in that slot
- Day with car rental pickup → add "expedia_cars" in afternoon slot of pickup day
- Day in theme park area (Orlando, LA) → add "undercovertourist" in morning slot
- Never add flixbus for air travel or long-haul destinations
- Never add samboat for landlocked destinations

Do NOT use Google Maps links. Only monetizable affiliate links.

IMAGE QUERY & IMAGE URL — every day:
- "imageQuery": specific visual phrase for day's highlight
- "dayImageUrl": REAL Unsplash URL with photo ID you are confident exists. Format: "https://images.unsplash.com/photo-[REAL_ID]?w=800&h=500&fit=crop". Never invent fake IDs.

affiliateLabels — for EVERY key in affiliateLinks, matching key with REAL name of place/experience/restaurant shown to user.

MAP POINTS — every day, array of GPS coordinates for all real places:
- Experiences/activities (slot: "Mattina" or "Pomeriggio")
- Restaurants/cafés (slot: "Pranzo" or "Sera")
- Landmarks/neighborhoods (slot: "Mattina" or "Pomeriggio")
- Hotel on Day 1 only (slot: "Hotel")
- Ferry ports (slot: "Traghetto")
- Car rental (slot: "Noleggio")
Each mapPoint: real GPS coordinates + imageUrl (Unsplash) + affiliateUrl (most relevant link).

RESPONSE LANGUAGE: Write ALL text fields in ${input.lang === 'it' ? 'Italian' : 'English'}. Every single field. Do NOT mix languages.

REQUIRED JSON:
{
  "destinations": [
    {
      "name": "City, Country",
      "imageUrl": "https://images.unsplash.com/photo-[ID]?w=600&h=400&fit=crop",
      "whyYours": "EXACTLY 2 short sentences (~25 words total). S1: diagnosis ('Non cerchi X, cerchi Y'). S2: this destination + one precise sensory beat.",
      "experiencePreview": "1 short evocative sentence in first person",
      "practicalInfo": "✈️ [flight duration + cost] · 🏨 [hotel type + price range] · 📅 [best period]"
    }
  ],
  "itineraries": [
    {
      "destinationName": "City, Country",
      "tripSummary": "One evocative line — geographic + emotional arc, max 15 words",
      "highlights": ["🏛 Place Name", "🏖 Beach Name", "🍽 Restaurant Name", "🌅 Experience"],
      "days": [
        {
          "dayNumber": 1,
          "title": "Evocative emotional title for departure+arrival day",
          "morning": "Volo [DEPARTURE_CITY] [IATA] → [DESTINATION_CITY] [IATA], durata ~[DURATION], ~[COST]/pp. [1 sentence anticipation or aerial view].",
          "lunch": "Pranzo a bordo / al gate — oppure [FIRST_LOCAL_SPOT] se volo breve e arrivo mattutino.",
          "afternoon": "Transfer aeroporto → [HOTEL_NAME], [TRANSPORT_METHOD], ~[DURATION], ~[COST]/pp. [1 sentence first impression]. Check-in.",
          "evening": "[DINNER_RESTAURANT] — [1 sentence sensory]. [~€X/pp, distanza hotel].",
          "imageQuery": "arrival scene or aerial view of destination",
          "dayImageUrl": "https://images.unsplash.com/photo-[REAL_ID]?w=800&h=500&fit=crop",
          "affiliateLinks": {
            "expedia_flights": "https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Flights-Search?...",
            "hotels_hotel": "https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=CITY_NAME&q-check-in=${checkin}&q-check-out=${checkout}",
            "tripadvisor_evening_fallback": "https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME"
          },
          "affiliateLabels": {
            "expedia_flights": "Volo DEPARTURE_IATA → ARRIVAL_IATA",
            "hotels_hotel": "Hotel a CITY_NAME",
            "tripadvisor_evening_fallback": "Ristoranti CITY_NAME"
          },
          "mapPoints": [
            { "label": "HOTEL_NAME", "slot": "Hotel", "lat": 0.0000, "lng": 0.0000, "imageUrl": "https://images.unsplash.com/photo-[ID]?w=400&h=250&fit=crop", "affiliateUrl": "https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=CITY_NAME&q-check-in=${checkin}&q-check-out=${checkout}" }
          ]
        },
        {
          "dayNumber": 2,
          "title": "Evocative emotional title",
          "morning": "PLACE_1 real name — sensory description. Time hint. ~€X/pp.",
          "lunch": "LUNCH_SPOT real name — neighborhood, ~€X/pp.",
          "afternoon": "EXPERIENCE_1 real name — sensory detail. ~€X/pp.",
          "evening": "DINNER_RESTAURANT real name — atmosphere. ~€X/pp.",
          "imageQuery": "specific visual scene for this day",
          "dayImageUrl": "https://images.unsplash.com/photo-[REAL_ID]?w=800&h=500&fit=crop",
          "affiliateLinks": {
            "civitatis_morning": "https://www.civitatis.com/it/CITY_SLUG/?aid=112605&cmp=mindroute",
            "tripadvisor_lunch": "https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME",
            "civitatis_afternoon": "https://www.civitatis.com/it/CITY_SLUG/?aid=112605&cmp=mindroute",
            "tripadvisor_evening": "https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME"
          },
          "affiliateLabels": {
            "civitatis_morning": "PLACE_1 NAME",
            "tripadvisor_lunch": "LUNCH_SPOT NAME",
            "civitatis_afternoon": "EXPERIENCE_1 NAME",
            "tripadvisor_evening": "DINNER_RESTAURANT NAME"
          },
          "mapPoints": []
        }
      ],
      "budgetSummary": "{\"items\":[{\"label\":\"Voli a/r\",\"detail\":\"MXP→XXX a/r\",\"perPerson\":\"€XXX\",\"total\":\"€XXX\"},{\"label\":\"Alloggio\",\"detail\":\"X notti @ €XX/notte a camera\",\"perPerson\":\"€XXX\",\"total\":\"€XXX\"},{\"label\":\"Pasti\",\"detail\":\"media €XX/giorno a persona\",\"perPerson\":\"€XXX\",\"total\":\"€XXX\"},{\"label\":\"Esperienze\",\"detail\":\"attività principali\",\"perPerson\":\"€XXX\",\"total\":\"€XXX\"},{\"label\":\"Trasporti locali\",\"detail\":\"trasferimenti interni\",\"perPerson\":\"€XXX\",\"total\":\"€XXX\"},{\"label\":\"TOTALE STIMATO\",\"detail\":\"entro budget dichiarato €XXX/pp\",\"perPerson\":\"€XXX\",\"total\":\"€XXX\"}]}",
      "packingList": "{\"items\":[{\"emoji\":\"☀️\",\"label\":\"Crema solare SPF50+\"},{\"emoji\":\"🦟\",\"label\":\"Repellente antizanzare\"},{\"emoji\":\"👟\",\"label\":\"Scarpe comode\"},{\"emoji\":\"🩱\",\"label\":\"Costume\"},{\"emoji\":\"🧴\",\"label\":\"Shampoo solido\"},{\"emoji\":\"📱\",\"label\":\"Adattatore prese\"}]}",
      "bestTime": "Max 8 words — specific months or season",
      "gettingThere": "{\"steps\":[{\"day\":\"Giorno 1\",\"from\":\"Milano MXP\",\"to\":\"Destination IATA\",\"method\":\"Volo\",\"duration\":\"~Xh\",\"cost\":\"~€XXX/pp\",\"notes\":\"direct or stopover info\"},{\"day\":\"Giorno 1\",\"from\":\"Aeroporto\",\"to\":\"Hotel\",\"method\":\"Taxi/Bus\",\"duration\":\"~Xmin\",\"cost\":\"~€XX/pp\",\"notes\":\"booking advice\"}]}",
      "closingMessage": "1 poetic sentence — a promise, not a farewell. Never generic.",
      "topAffiliateLinks": {
        "expedia_flights": "https://www.tkqlhce.com/click-101710513-10581071?url=...",
        "hotels": "https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=CITY_NAME&q-check-in=${checkin}&q-check-out=${checkout}",
        "tripadvisor": "https://www.tripadvisor.it/Search?q=ristoranti+CITY_NAME",
        "civitatis_1": "https://www.civitatis.com/it/CITY_SLUG/?aid=112605&cmp=mindroute",
        "civitatis_2": "https://www.civitatis.com/it/CITY_SLUG/?aid=112605&cmp=mindroute",
        "musement_1": "https://www.musement.com/it/CITY_SLUG/?utm_source=affiliate&utm_medium=affiliate&utm_campaign=mindroute-7388"
      }
    }
  ]
}

Generate exactly ${days} days in the itinerary.

CRITICAL: Respond ONLY with the JSON object. No text before or after. No explanations. Start with { end with }. Pure JSON only.`;
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

  const budgetText = BUDGET_MAP[input.budget] || `budget: ${input.budget}`;

  const prompt = `You are the engine of MindRoute, a psychological travel profiling platform. Your task is to generate exactly 3 destinations that are deeply, precisely matched to this specific human being.

USER PROFILE — READ EVERY LINE
═══════════════════════════════════════
Path: ${path}
Budget: ${budgetText}
Departing from: ${input.departure} | Period: ${input.leaveDate} | Days: ${input.days}
Travel companions: ${input.companions || "not specified"}
${structuredProfileBlock ? `Structured profile:\n${structuredProfileBlock}\n\n` : ""}Quiz answers: ${profileAnswers.map((a, i) => `Q${i + 1}: ${a}`).join(" | ")}

═══════════════════════════════════════
STEP 0 — EXTRACT CHIPS + INFER TILT (do this first, verbatim, internal)
═══════════════════════════════════════
Parse ALL answers and structured profile. Extract VERBATIM — no paraphrasing, no inference yet:

STYLE_CHIPS: [list every style chip selected verbatim]
NEED_CHIPS: [list every need/feeling chip selected]
ANTI_PATTERN_CHIPS: [list every anti-pattern chip selected — these are HARD VETOES]
ATMOSPHERE_CHIPS: [image selections]
MOMENT_CHIPS: [must-see/moment chips from Path B Q3]
PACE_SLIDER: [0-100]
DISTANCE_CHIP: [Path A Q7 value]
GEO_CHIP: [Path B Q1 value]
GEOGRAPHIC_CONSTRAINT: [precise place if user specified one]
REJECTION_TEXT: [Path A Q6 verbatim]
COMPANIONS: [value]
BUDGET_TIER: [low/medium/high/unlimited]
TRIP_TYPE_CHIPS: [all trip type chips selected]

These are the SOURCE OF TRUTH. Everything that follows derives from this list and ONLY this list. Never invent chips that aren't there. Never ignore chips that are there.

── 0b — TILT INFERENCE (mandatory; drives Slot 3 and verification) ──
Classify the profile on two independent axes. For each, name the SPECIFIC chips that drove the call. If no chips push either direction → tilt = neutral.

MAINSTREAM ↔ OFFBEAT axis:
  pushers MAINSTREAM: "Comfort medio" / "Boutique / Design" / "Lusso" accommodation, "Famiglia" companions, "Lusso discreto", "Cibo sconosciuto" in anti-patterns, "Troppo isolato" in anti-patterns, "Lunghi trasferimenti" in anti-patterns, very short trips (≤4 days) with "comfort" signals.
  pushers OFFBEAT: "Selvaggio", "Solitario", "Fuori dal mondo" trip type, "Scoperta, sorprendimi" trip type, "Sorprendermi" need, "Ostello / Capsule" accommodation, "Autentico"+"Esplorativo" together, DISTANCE_CHIP = "Ovunque sorprendimi davvero".
  → TILT_M_O = mainstream / offbeat / neutral + the 1-3 chips that drove it.

COMFORT ↔ RAW axis:
  pushers COMFORT: "Comfort medio" / "Boutique" / "Lusso", "Famiglia", "Sveglie presto" in anti-patterns, "Troppo camminare" in anti-patterns, "Programmi rigidi" in anti-patterns, PACE_SLIDER ≤ 30.
  pushers RAW: "Avventuroso", "Trekking e sport", "Selvaggio", "Ostello / Capsule", PACE_SLIDER ≥ 70, travel style = "scoperta".
  → TILT_C_R = comfort / raw / neutral + the 1-3 chips that drove it.

The tilts are NOT preferences to balance — they are READINGS that determine the character of all 3 slots. If TILT_M_O = mainstream, do NOT inject offbeat picks "for variety". If TILT_M_O = offbeat, do NOT soften with mainstream picks "for safety". If neutral, choose purely by fit per slot.

═══════════════════════════════════════
STEP 1 — BUILD CONSTRAINTS (apply ALL)
═══════════════════════════════════════

── GEOGRAPHIC CONSTRAINTS (ABSOLUTE — cannot be overridden) ──
Path B GEO_CHIP:
- "Europa" → ALL 3 destinations MUST be in Europe. Violating this = failure.
- "Asia" → ALL 3 MUST be in Asia.
- "Americhe" → ALL 3 MUST be in the Americas.
- "Africa e Medio Oriente" → ALL 3 MUST be in Africa or Middle East.
- "Oceania" → ALL 3 MUST be in Oceania.
- "Vicino a casa" → ALL 3 reachable by ground transport (car/train/bus) from departure city. NO flights. Max 4h ground travel.

Path A DISTANCE_CHIP:
- "Vicino a casa" → ALL 3 reachable by ground transport ONLY from departure city. NO flights. Max 4h. Apply distance progression: Slot 1 = max 1.5h, Slot 2 = 1.5-2.5h, Slot 3 = 2.5-4h.
- "Stesso continente" → ALL 3 on same continent as departure city.
- "Lontano" → long-haul preferred, different continent.
- "Ovunque" → no geographic constraint, prioritize surprise.

If user specified a precise place in addendum → ALL 3 must be within or variations of that place.

GEOGRAPHIC CONSTRAINT OVERRIDE RULE: If geographic constraint is active, it supersedes EVERYTHING else — including the desire for diversity. Three destinations in Italy is correct if geo constraint is "Europe" and user specified "Italy". Three destinations within 4h of Milan is correct if geo constraint is "Vicino a casa" from Milan.

PRECISE DESTINATION OVERRIDE RULE — HIGHEST PRIORITY:
If the user specified a precise destination in the addendum field (a specific country, region, or city), ALL 3 slots MUST be variations of that destination. Do not propose alternatives outside it.

- Specific country (e.g. "Giappone", "Spagna") → 3 different cities or regions within that country
- Specific region (e.g. "Toscana", "Andalusia") → 3 different towns or areas within that region  
- Specific city (e.g. "Tokyo", "Barcellona") → 3 different neighborhoods, nearby areas, or day-trip extensions of that city
- Specific island (e.g. "Sardegna", "Bali") → 3 different areas or coasts of that island

In all cases: slot 1 = most famous/obvious area, slot 2 = same destination different character, slot 3 = hidden gem within the same destination.
Never propose a different country or region when the user has already decided where to go.
In all cases: slot 1 = most famous/obvious area, slot 2 = same destination different character, slot 3 = hidden gem within the same destination.
Never propose a different country or region when the user has already decided where to go.
── ANTI-PATTERN VETOES (each one ELIMINATES destination types) ──
- "Vita notturna e club" in anti-patterns → ELIMINATE any destination CHOSEN for its nightlife. Beach+friends destination: choose beach WITHOUT club scene.
- "Luoghi affollati" → ELIMINATE destinations at peak overcrowding season. Choose same destination TYPE but less crowded version or off-peak timing.
- "Hotel resort" → ELIMINATE any destination where independent accommodation is scarce.
- "Ristoranti turistici" → ELIMINATE destinations known primarily for tourist-trap food scenes.
- "Stanchezza da musei" → ELIMINATE destinations where the main draw IS museums/cultural visits. Favor destinations with lived culture (food, neighborhoods, people).
- "Lunghi trasferimenti" → ELIMINATE destinations requiring complex multi-leg logistics.
- "Troppo isolato" → ELIMINATE overly remote destinations with no social infrastructure.
- "Cibo sconosciuto" → FAVOR destinations with familiar or Mediterranean-adjacent food cultures.

── COMPANIONS → DESTINATION INFRASTRUCTURE ──
- "Amici": Destination MUST have group-friendly infrastructure: shared apartments/villas available, restaurants with big tables, group activities. Nightlife infrastructure MANDATORY unless "vita notturna" anti-pattern active.
- "Partner": Destination MUST be romantic in texture. Intimate restaurants, beautiful settings, couple experiences. AVOID party/backpacker destinations.
- "Solo": Destination MUST be solo-travel-friendly. Safe for solo travelers. Either social hostel scene OR genuinely peaceful for solo introspection (depending on STYLE_CHIPS).
- "Famiglia": Destination MUST have child-safe infrastructure, easy beaches or nature, family restaurants, no extreme logistics.

── TRIP TYPE → DESTINATION MANDATORY FEATURES ──
- "Mare e relax" → Destination MUST have quality beach/sea. Calm water, clean, accessible.
- "Città e vita notturna" → Destination MUST be city with genuine nightlife scene. UNLESS "vita notturna" anti-pattern.
- "Cultura e storia" → Destination MUST have rich cultural/historical heritage liveable beyond museums.
- "Food e vino" → Destination MUST have extraordinary local food scene. Think across all continents — every region has food destinations. Do not default to the same list every time.
- "Natura e avventura" → Destination MUST have strong outdoor/nature as primary draw.
- "Trekking e sport" → Destination MUST have serious outdoor challenges.
- "Wellness e spa" → Destination MUST have quality spa/thermal/wellness infrastructure.
- "Fuori dal mondo" → Destination MUST be genuinely remote. Very few direct European connections.
- "Road trip" → Destination MUST suit driving: good roads, interesting multi-point route, car rental available.
- "Scoperta, sorprendimi" → AVOID any obvious/popular destination. Choose something the user would never search for.

── STYLE CHIPS → DESTINATION CHARACTER ──
- "Selvaggio" → raw, untamed, off-beaten-path destination. No resort towns.
- "Silenzioso" → calm, low-crowd. Eliminate peak-season overtourist spots.
- "Caotico" → vibrant chaotic energy: medinas, Asian megacities, market towns.
- "Intimo" → small-scale, personal: villages, small towns, boutique scenes.
- "Solitario" → genuine solitude available: remote areas, off-season destinations.
- "Rigenerante" → restorative quality: nature, thermal baths, slow pace.
- "Autentico" → strong local identity not overrun by mass tourism.
- "Lusso discreto" → refined understated luxury: design hotels, fine dining without ostentation.
- "Spirituale" → spiritual/contemplative dimension: temples, sacred landscapes, silence.
- "Festoso" → celebratory social atmosphere: local festivals, piazzas, vibrant energy.
- "Avventuroso" → physical adventure available: mountains, sea, adrenaline sports.
- "Romantico" → romantic infrastructure: intimate restaurants, beautiful scenery, couples culture.
- "Culturale" → deep cultural/historical identity accessible beyond museums.
- "Esplorativo" → rewards curiosity: hidden alleys, unexpected discoveries, layered complexity.

── ATMOSPHERE CHIPS → DESTINATION TEXTURE ──
- "seaside" → destination with waterfront dining culture, sunset terraces.
- "market" → destination with vibrant market life — can be anywhere with strong street market culture.
- "trail" → destination with accessible mountain/nature trails.
- "cafe" → destination with strong café culture.
- "medina" → destination with labyrinthine old town character — not necessarily Arabic/North African.
- "nordic" → dramatic, edge-of-world quality (Norway, Iceland, Faroe Islands, Scottish Highlands).
- "temple" → spiritual/ancient atmosphere (Southeast Asia, India, Japan, Middle East).
- "desert" → vast, open, freedom quality (Morocco, Oman, Jordan, Atacama).

── NEED CHIPS → DESTINATION EMOTIONAL MATCH ──
- "Staccare dalla routine" → destination must feel genuinely different from user's daily life.
- "Sentirmi vivo di nuovo" → destination must offer intensity: physical, sensory, or emotional challenge.
- "Meravigliarmi di nuovo" → destination must have genuine wow-factor: extraordinary landscapes or culture.
- "Ritrovarmi" → destination must offer solitude and introspective space.
- "Festeggiare" → destination must feel celebratory: beautiful, indulgent, joyful.
- "Uscire dalla zona di comfort" → destination must genuinely challenge: different culture, different language.
- "Rallentare" → destination must enable genuine slowness. No overwhelming logistics.

── REJECTION TEXT → ELIMINATE SIMILAR DESTINATIONS ──
Parse rejection text carefully. Identify what the rejected place REPRESENTS and eliminate all destinations with the same quality. "Non mi dice nulla New York" → eliminate overwhelming megacities. "Le Maldive troppo perfette" → eliminate resort-only beach destinations. "Barcellona d'estate troppo caotica" → reduce chaotic/overcrowded options.

── BUDGET HARD LIMITS ──
- "low" (< €500): flights max €175/pp round-trip. Daily spend max €50-70/pp excl. flights.
- "medium" (€500-€1,500): flights max €525/pp. Daily max €100-180/pp excl. flights.
- "high" (€1,500-€3,000): flights max €1,050/pp. Daily max €200-350/pp excl. flights.
- "unlimited": no cap.
Verify: (flights/pp) + (hotel × nights) + (food × days) + (activities) ≤ budget/pp.
If math fails → REJECT the destination.

── REACHABILITY ──
- Weekend (3-4 days): max 4h flight OR 4h ground if "vicino a casa".
- One week: max 9h flight.
- 10-14 days: anywhere.
- "Vicino a casa": ground only, NO flights.

═══════════════════════════════════════
STEP 2 — DESTINATION SELECTION ENGINE
═══════════════════════════════════════

CRITICAL ANTI-BIAS RULES — read before selecting anything:

MAINSTREAM IS CORRECT when the profile calls for it. Paris for romantic+luxury+partner is the RIGHT answer. Barcelona for friends+city+nightlife is the RIGHT answer. Tokyo for cultural+foodie+solo is the RIGHT answer. Never penalize a famous destination for being famous — penalize it only if it genuinely fails the profile.

OBSCURE IS WRONG when it doesn't fit. Proposing an unknown village to someone who selected "Festoso" + "Amici" + "Vita notturna" is a failure, not a virtue.

BANNED AS DEFAULT FALLBACKS — use ONLY if they genuinely fit better than all alternatives:
Georgia/Tbilisi, Morocco/Marrakech, Albania, Montenegro, North Macedonia, Ohrid, Ksamil, Plovdiv.
These appear too frequently. Before selecting any of these, ask: "Is there a destination that fits this profile BETTER?" If yes, use that instead.

DESTINATION UNIVERSE — think across ALL of these before deciding:
CITIES: Paris, London, Amsterdam, Rome, Florence, Naples, Barcelona, Madrid, Lisbon, Porto, Berlin, Vienna, Prague, Budapest, Krakow, Warsaw, Athens, Istanbul, Dubai, Tokyo, Kyoto, Osaka, Seoul, Bangkok, Singapore, Hong Kong, Bali, Ho Chi Minh City, Hanoi, Marrakech, Cape Town, Nairobi, Cairo, New York, Los Angeles, Miami, Mexico City, Buenos Aires, Rio, Medellin, Lima, Sydney, Melbourne
BEACH: Amalfi, Cinque Terre, Sardinia, Sicily, Ibiza, Mallorca, Mykonos, Santorini, Rhodes, Crete, Cyprus, Malta, Algarve, Costa Brava, Corsica, Hvar, Dubrovnik, Montenegro coast, Turkish Riviera, Zanzibar, Maldives, Phuket, Koh Samui, Bali Seminyak, Tulum, Cancun, Caribbean islands
NATURE: Dolomites, Swiss Alps, Norwegian Fjords, Iceland, Scottish Highlands, Azores, Madeira, Canary Islands, Faroe Islands, Lapland, Patagonia, Amazon, Galápagos, New Zealand, Costa Rica, Rwanda, Kenya, Tanzania, Nepal, Bhutan, Ladakh, Yunnan
HIDDEN GEMS: Puglia, Matera, Procida, Alberobello, Favignana, Pantelleria, Aeolian Islands, Gozo, Vis, Korčula, Brač, Paxos, Ikaria, Naxos, Milos, Samos, Lesbos, Chania, Rethymno, Plovdiv, Tbilisi (only if genuinely best fit), Kotor, Prizren, Gjirokastër, Ohrid (only if genuinely best fit), Tavira, Évora, Sintra, Peneda-Gerês, Serra da Estrela, Alentejo, Friuli, Val d'Orcia, Cilento, Basilicata, Aspromonte

CHIP WEIGHTING RULE — before selecting, identify dominant signals:
1. List all chips selected by the user
2. Identify the 2-3 DOMINANT chips — those that appear in multiple categories or are emotionally strongest
3. These OVERRIDE secondary chips in destination selection
4. Secondary chips refine the choice WITHIN the dominant category

Example: User selects "Mare e relax" (trip type) + "Partner" (companions) + "Romantico" (style) + "Autentico" (secondary style) → DOMINANT = beach+romantic+partner. Choose a romantic beach destination. "Autentico" means: choose the authentic version of that beach destination (local restaurants, boutique hotels) — NOT abandon the beach for an inland village.

Example: User selects "Città e vita notturna" + "Amici" + "Festoso" + "Caotico" → DOMINANT = city+nightlife+friends. Choose a great party/nightlife city. Do not propose a quiet village because "Autentico" was also selected.

GENERATE EXACTLY 3 DESTINATIONS:

SLOT 1 — PERFECT FIT (mainstream, famous, or niche — whatever fits BEST):
The destination that most precisely matches ALL dominant chips and constraints.
If Paris fits → choose Paris. If Mykonos fits → choose Mykonos. If a small Sicilian village fits → choose that.
No bias toward famous OR obscure. Pure profile matching.
Budget: full stated budget.

SLOT 2 — SAME EMOTION, DIFFERENT ANGLE:
A destination that delivers the SAME core emotional experience as Slot 1 but from an unexpected direction.
Not necessarily cheaper — different in CHARACTER, not just price.
The user should think: "I would never have thought of this, but it gives me exactly what I wanted."
This can be mainstream or obscure — what matters is that it offers the same dominant emotional experience through a different lens.
Do NOT default to: Georgia, Albania, Montenegro, North Macedonia unless they genuinely are the best match.
Think: same vibe, different geography, different culture, different season optimization.

SLOT 3 — DEPTH PICK (character DETERMINED by TILT_M_O from Step 0b — do NOT default to "surprise"):
The destination that goes deepest into the dominant emotional need. Its character adapts to the user's tilt:

  - TILT_M_O = mainstream → famous, recognizable destination chosen for a LESS OBVIOUS angle (e.g. Trastevere as the lens on Rome, Hydra as the lens on Greek islands, Naoshima as the lens on Japan). Still inside the comfort zone the user signaled. The depth is in the angle, not in the obscurity. Do NOT propose an unknown village.
  - TILT_M_O = offbeat → genuine off-the-beaten-path destination the user would never find alone. This is the ONLY slot where surprise belongs, and ONLY when the user explicitly signaled offbeat.
  - TILT_M_O = neutral → strongest alternative to Slots 1+2 that satisfies the dominant chips through a different geographic/cultural lens. No bias toward famous or obscure — bias toward fit.

In all 3 tilt cases this slot must still respect ALL hard constraints (geographic, budget, anti-patterns, companions, seasonality) and must be clearly distinct in character from Slots 1 and 2.

DIVERSITY REQUIREMENT:
- 3 different countries if possible (or 3 clearly distinct regions)
- 3 different emotional tones or geographic contexts
- Never repeat the same destination type across all 3 slots

ANTI-REPETITION CHECK — before finalizing:
- Are any of the 3 destinations Georgia/Tbilisi, Morocco/Marrakech, Albania, Montenegro? If yes: is this genuinely the BEST fit for this specific profile, better than all alternatives? If not → replace.
- Are all 3 destinations in the same geographic region without a geographic constraint forcing it? If yes → diversify.
- Are all 3 destinations nature/wilderness focused when the profile has strong urban/social signals? If yes → fix at least 2 slots.
- Are all 3 destinations obscure/unknown when the dominant chips clearly call for mainstream quality? If yes → fix at least Slot 1.

SEASONALITY CHECK — for ALL 3 slots:
Verify each destination is genuinely good during stated travel period.
Rainy season, extreme heat, polar winter, peak overcrowding = REJECT.
Default to summer (June-August) if no period specified.

═══════════════════════════════════════
STEP 3 — WHYYOURS FORMULA (apply to all 3)
═══════════════════════════════════════
The whyYours field MUST be EXACTLY 2 short sentences. ~25 words total. No more.
Sentence 1 — DIAGNOSIS: name the emotional need behind the user's quiz answers in a single sharp line. Format: "Non cerchi X, cerchi Y." (or equivalent in the response language). Y must reference a chip/answer verbatim or paraphrase it tightly.
Sentence 2 — PLACE + MOMENT: name THIS destination and ONE precise sensory beat (specific time of day, specific street/quality/sound) that delivers that need. No generic adjectives ("beautiful", "magical", "perfect").

BAD whyYours: "Questo posto è perfetto per chi ama la natura e vuole rilassarsi."
BAD whyYours (too long): "Hai scelto X — segnale che cerchi Y. La destinazione offre Z. Il momento che ricorderai: W."
GOOD whyYours: "Non cerchi una vacanza, cerchi silenzio abitato. Procida te lo dà al mattino presto, quando i pescatori rientrano a Marina Corricella e l'isola è tua."
GOOD whyYours: "You don't want crowds, you want presence. Procida gives you that at dawn, when the boats return to Marina Corricella and the island is yours."

PRACTICALINFO FORMAT — use this exact format for all 3:
"✈️ [flight duration and approx cost] · 🏨 [hotel type matching accommodation pref + price range] · 📅 [best months to visit]"
Example: "✈️ ~2h30 da Milano, ~€180/pp a/r · 🏨 Boutique hotel centro storico €90-130/notte · 📅 Aprile-giugno, settembre-ottobre"
For "Vicino a casa" (no flight): "🚗 [transport method + duration + approx cost] · 🏨 [type + price] · 📅 [best period]"

═══════════════════════════════════════
STEP 4 — VERIFICATION SELF-CHECK (mandatory before emitting JSON)
═══════════════════════════════════════
For EACH of the 3 destinations, internally tabulate the following grid. Do not output the grid — use it as a gate.

For destination N:
  - DOMINANT_CHIPS_SATISFIED: which of the 2-3 dominant chips from Step 0 does this destination clearly satisfy? Name them.
  - ANTI_PATTERN_TRIGGERS: does this destination trigger any chip in ANTI_PATTERN_CHIPS at peak season? Name them or write NONE.
  - TILT_ALIGNMENT: does this destination match TILT_M_O? On the offbeat↔mainstream axis, an offbeat-tilt user paired with a mainstream destination = mismatch; a mainstream-tilt user paired with a remote unknown = mismatch. Allowed only on neutral tilt.
  - GEO_OK / BUDGET_OK / REACH_OK / SEASON_OK: pass/fail each one.

REPLACE the destination if ANY of these is true:
  - Zero dominant chips satisfied
  - Any anti-pattern triggered
  - Tilt mismatch on a non-neutral axis
  - Any of GEO/BUDGET/REACH/SEASON = fail

After replacement, re-run the check on the new destination. Only when all 3 destinations pass cleanly, emit the JSON. Never emit a destination that fails this check "because it's interesting" — interestingness is not a chip.

═══════════════════════════════════════
RESPONSE LANGUAGE: Write all text fields in ${input.lang === 'it' ? 'Italian' : 'English'}.

REQUIRED JSON — respond ONLY with this, no text outside:
{
  "destinations": [
    {
      "name": "Specific City or Area, Country",
      "imageUrl": "https://images.unsplash.com/photo-[REAL_ID]?w=600&h=400&fit=crop",
      "whyYours": "EXACTLY 2 short sentences (~25 words) following the formula above — diagnosis + place/moment",
      "experiencePreview": "1 short evocative sentence in first person — what it FEELS like to be there",
      "practicalInfo": "✈️ [duration + cost] · 🏨 [hotel type + price] · 📅 [best period]"
    },
    {
      "name": "Same Emotion Different Angle, Country",
      "imageUrl": "https://images.unsplash.com/photo-[REAL_ID]?w=600&h=400&fit=crop",
      "whyYours": "EXACTLY 2 short sentences (~25 words) — diagnosis + this destination/moment that delivers the same emotional experience from a different angle",
      "experiencePreview": "1 short evocative sentence in first person",
      "practicalInfo": "✈️ [duration + cost] · 🏨 [type + price] · 📅 [best period]"
    },
    {
      "name": "Genuine Surprise, Country",
      "imageUrl": "https://images.unsplash.com/photo-[REAL_ID]?w=600&h=400&fit=crop",
      "whyYours": "EXACTLY 2 short sentences (~25 words) — diagnosis + the surprising precise reason this destination is the right answer for this profile",
      "experiencePreview": "1 short evocative sentence in first person",
      "practicalInfo": "✈️ [duration + cost] · 🏨 [type + price] · 📅 [best period]"
    }
  ]
}`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
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

export async function generateItineraryStreamingStructured(
  input: ProfilingInput,
  destinationName: string,
  onDay: (day: any) => void,
  onMeta: (meta: any) => void
): Promise<void> {
  const days = Math.min(input.days, 14);
  const { checkin, checkout, checkinCompact, checkoutCompact } = buildCheckinCheckout(input.leaveDate, days);

  const prompt = buildPrompt({ ...input, _destinationOverride: destinationName } as any);

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 20000,
    messages: [{ role: "user", content: prompt }],
  });

  let buffer = "";
  let fullText = "";

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      buffer += event.delta.text;
      fullText += event.delta.text;

      while (true) {
        const dayMatch = buffer.match(/"dayNumber"\s*:\s*(\d+)[\s\S]*?"evening"\s*:\s*"[^"]*"[\s\S]*?"affiliateLinks"[\s\S]*?\}(?=\s*[,\]])/);
        if (!dayMatch) break;

        try {
          const startIdx = buffer.indexOf('{"dayNumber":', buffer.indexOf(dayMatch[0]));
          const endIdx = buffer.indexOf(dayMatch[0]) + dayMatch[0].length;
          const dayJson = buffer.substring(startIdx, endIdx);

          const day = JSON.parse(dayJson);
          if (day.dayNumber) {
            onDay(day);
            buffer = buffer.substring(endIdx);
          } else {
            break;
          }
        } catch {
          break;
        }
      }
    }
  }

  try {
    const cleanJson = fullText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleanJson);
    const itin = parsed.itineraries?.[0];
    if (itin) {
      onMeta({
        destinationName: itin.destinationName,
        tripSummary: itin.tripSummary,
        highlights: itin.highlights,
        whyYours: itin.whyYours,
        budgetSummary: itin.budgetSummary,
        packingList: itin.packingList,
        bestTime: itin.bestTime,
        gettingThere: itin.gettingThere,
        closingMessage: itin.closingMessage,
        topAffiliateLinks: itin.topAffiliateLinks,
        days: itin.days,
      });
    }
  } catch (e) {
    console.error("Meta parse error:", e);
  }
}

export async function generateItineraryStreaming(
  input: ProfilingInput,
  destinationName: string,
  onChunk: (text: string) => void
): Promise<void> {
  const days = Math.min(input.days, 14);
  const lang = input.lang === 'it' ? 'Italian' : 'English';
  const { checkin, checkout } = buildCheckinCheckout(input.leaveDate, days);

  const prompt = `You are MindRoute, a psychological travel platform. Generate a ${days}-day itinerary for ${destinationName}.

PROFILE:
Budget: ${input.budget}
From: ${input.departure} | Days: ${days} | Period: ${input.leaveDate}
Companions: ${input.companions || "not specified"}
Style: ${input.travelStyle || "not specified"}
Answers: ${input.answers.slice(1).join(" | ")}

Write the itinerary in ${lang} using EXACTLY these markers:

[WHY_YOURS]
2-3 sentences — psychologically precise, reference specific answers.

[TRIP_SUMMARY]
One evocative line, max 15 words.

[HIGHLIGHTS]
4 chips with emoji, comma separated.

[DAY_1]
Title: evocative emotional title
Morning: flight from ${input.departure}, duration, cost. One sentence anticipation.
Lunch: in-flight or first local spot.
Afternoon: airport transfer, first impression. Check-in.
Evening: first dinner, named restaurant, cost.

[DAY_2]
Title: evocative emotional title
Morning: named place/activity, time hint, cost.
Lunch: named restaurant, neighborhood, cost.
Afternoon: named activity, cost.
Evening: named restaurant, atmosphere, cost.

[Continue for all ${days} days]

[DAY_${days}]
Title: closure title
Morning: last experience before departure.
Lunch: last coffee or meal, named.
Afternoon: return journey details, flight home.
Evening: arrival home with emotional note.

[CLOSING]
One poetic promise sentence.

[BUDGET]
Flights: ~€X/pp | Hotel: ~€X/pp/night | Food: ~€X/day | Activities: ~€X | TOTAL: ~€X/pp

[PACKING]
6-8 items with emoji.

[GETTING_THERE]
Step by step transport.`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      onChunk(event.delta.text);
    }
  }
}

export async function generateDayRegeneration(
  profilingInput: any,
  destinationName: string,
  currentDay: any,
  dayIndex: number,
  feedback: string
): Promise<any> {
  const lang = profilingInput?.lang || "it";
  const prompt = `Sei un travel planner esperto. Devi rigenerare SOLO il giorno ${dayIndex + 1} di un itinerario a ${destinationName}.

Giorno attuale:
- Titolo: ${currentDay.title}
- Mattina: ${currentDay.morning}
- Pranzo: ${currentDay.lunch}
- Pomeriggio: ${currentDay.afternoon}
- Sera: ${currentDay.evening}

${feedback ? `Richiesta dell'utente: ${feedback}` : "Crea una variazione interessante mantenendo lo stesso tono."}

Rispondi SOLO con un oggetto JSON valido con questa struttura:
{
  "dayNumber": ${dayIndex + 1},
  "title": "titolo del giorno",
  "morning": "descrizione mattina",
  "lunch": "descrizione pranzo",
  "afternoon": "descrizione pomeriggio",
  "evening": "descrizione sera",
  "imageQuery": "query per immagine"
}

Lingua: ${lang}. Nessun testo fuori dal JSON.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

export async function generateItineraryForDestination(
  input: ProfilingInput,
  destinationName: string
): Promise<GeneratedItinerary> {
  const prompt = buildPrompt({ ...input, _destinationOverride: destinationName } as any);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 20000,
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

export async function generateDestinations(input: ProfilingInput): Promise<{
  destinations: GeneratedDestination[];
  itineraries: Map<string, GeneratedItinerary>;
}> {
  const destinations = await generateDestinationsOnly(input);
  const itineraries = new Map<string, GeneratedItinerary>();
  return { destinations, itineraries };
}
