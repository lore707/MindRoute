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
  DayRole,
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

// null → undefined per i campi OPZIONALI: il modello emette spesso null per
// "assente" (visto in prod: energy_note:null). Un singolo null non deve far
// fallire il parse di un blocco parallelo — il fallback single-call RADDOPPIA
// il tempo di generazione (230s osservati contro ~115s).
const optStr = z.preprocess((v) => (v == null ? undefined : v), z.string().optional());
const optNum = z.preprocess((v) => (v == null ? undefined : v), z.number().optional());

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

// Alloggio = criteri di ricerca (mai un nome di property): zona, tipo, fascia,
// motivo. Tollerante: campi con default "" così un oggetto parziale non fa
// fallire l'intero itinerario; il rewrite server degrada di campo in campo.
const stayRecommendationV2Schema = z.object({
  district: z.string().default(""),
  style: z.string().default(""),
  budget_range: z.string().default(""),
  why: z.string().default(""),
});

// Esperienze = query di ricerca composta (mai un prodotto/tour nominato).
// Tollerante come lo stay: default "" così un oggetto parziale non fa fallire
// l'itinerario; il builder degrada di campo in campo.
const experienceRecommendationV2Schema = z.object({
  search_query: z.string().default(""),
  label: z.string().default(""),
  why: z.string().default(""),
});

const bookingInfoV2Schema = z.object({
  // Free string — provider names are too varied/localized to enumerate without
  // failing valid itineraries ("tripadvisor", "trenitalia", "liberty lines",
  // "hotels.com"). The affiliate steer lives in the prompt, not in validation.
  provider: z.string(),
  affiliate_url: z.string(),
  display_label: z.string(),
  status: bookingStatusSchema,
  stay_recommendation: stayRecommendationV2Schema.optional(),
  experience_recommendation: experienceRecommendationV2Schema.optional(),
});

const transportToNextV2Schema = z.object({
  // Free string — Claude localizes/combines modes ("a piedi", "bici", "aliscafo",
  // "bici → a piedi"); enumerating them rigidly only triggers costly 500s.
  mode: z.string(),
  duration_min: z.number(),
  cost_estimate: optStr,
  note: optStr,
});

// Tollerante alla forma "prosa": nei blocchi paralleli il modello a volte
// emette plan_b come stringa secca ("Se piove: Museo X") — la riconduciamo a
// {trigger:"", alternative} invece di far fallire l'intero parse.
const planBV2Schema = z.preprocess(
  (v) => (typeof v === "string" ? { trigger: "", alternative: v } : v),
  z.object({
    trigger: z.string().default(""),
    alternative: z.string(),
  }),
);

// Input `any`: i campi immagine hanno default('') quindi l'input ammette l'assenza.
const momentV2Schema: z.ZodType<MomentV2, z.ZodTypeDef, any> = z.object({
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
  start_time: optStr,
  end_time: optStr,
  duration_min: optNum,
  cost_min: optNum,
  cost_max: optNum,
  cost_note: optStr,
  location_name: optStr,
  location_address: optStr,
  location_lat: optNum,
  location_lng: optNum,
  image_url: z.string().default(""), // non richiesto all'LLM: riempito dall'enrichment
  image_alt: z.string().default(""), // come image_url: non più richiesto all'LLM
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
  note: optStr,
});

const dayRoleSchema = looseEnum<DayRole>(
  ["arrivo", "apice", "esplorazione", "riposo", "decantazione", "trasferimento", "partenza"],
  {
    arrival: "arrivo", peak: "apice", climax: "apice",
    exploration: "esplorazione", explore: "esplorazione",
    rest: "riposo", relax: "riposo",
    "wind-down": "decantazione", winddown: "decantazione", decompression: "decantazione",
    transfer: "trasferimento", transit: "trasferimento",
    departure: "partenza",
  },
);

const dayV2Schema: z.ZodType<DayV2, z.ZodTypeDef, any> = z.object({
  day_number: z.number(),
  date: optStr,
  role: dayRoleSchema.optional(),
  arc: z.string(),
  title_evocative: z.string(),
  subtitle: z.string(),
  hero_image_url: z.string().default(""), // idem: foto reali attaccate dopo
  weather_forecast: weatherForecastV2Schema.optional(),
  energy_level: energyLevelSchema,
  energy_note: optStr,
  walking_distance_km: optNum,
  cost_bookable_total: z.number().default(0), // ricalcolato sempre server-side
  cost_onsite_estimate: z.number().default(0),
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
  hero_image_url: z.string().default(""), // idem: foto reali attaccate dopo
  manifesto: z.string(),
  em_word: optStr,
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
  const budgetTarget = typeof input.budgetTotalPerPerson === "number" && input.budgetTotalPerPerson > 0
    ? Math.round(input.budgetTotalPerPerson) : null;
  const budgetTargetBlock = budgetTarget ? `
7b. TARGET BUDGET (traveler-stated — TREAT AS THE BUDGET SPINE)
   - The traveler set a TOTAL budget of €${budgetTarget} per person for the WHOLE trip,
     everything included EXCEPT international flights.
   - DECOMPOSE it logically: split €${budgetTarget} across lodging, food, activities/
     experiences and local transport in proportions that fit ${days} days AND this
     destination's REAL price level — a cheap country and an expensive one must never
     produce the same split. Per-day moment costs and the lodging tier you pick must add
     up toward this figure, not drift from it.
   - VERIFY feasibility before committing. First compute the realistic bottom-up cost.
     Then:
       • If €${budgetTarget} is ACHIEVABLE here for ${days} days, tune your choices
         (lodging tier, dining style, how many paid experiences) so that
         total_cost_bookable + total_cost_onsite_estimate land within ~10% of it, and make
         total_cost_range bracket €${budgetTarget}.
       • If it is UNREALISTIC — too low to be safe/decent, or far more than is honestly
         spendable here — do NOT fake the numbers to match. Produce the nearest HONEST
         range, let total_cost_range reflect reality, and lean the itinerary toward the
         value/level that figure actually buys.
   - Honesty over flattery: a confidently-wrong budget destroys trust. Every number must
     survive a sanity check against everything plausible for THIS place, THESE days, THIS
     style.
` : "";
  return `
═══════════════════════════════════════════════════════════════════════════
MOMENT STRUCTURE RULES — v2 schema (moment-based itinerary)
═══════════════════════════════════════════════════════════════════════════

GUIDING PRINCIPLE: the position and type of every CTA is a FUNCTION of the day's
role and the moment's function — never a free choice. Conversion density does NOT
scale with the number of days: it scales with the number of PEAKS (experience CTA)
and BASES (lodging CTA). A long trip has more stays and a more diluted cadence —
not more buttons everywhere.

1. THE TWO-PHASE ALGORITHM — build the skeleton BEFORE any content.

PHASE A — SKELETON (assign roles first, no content yet).
Give every day exactly ONE role. The role — not free choice — fixes the CTA logic
of that day's four moments. Roles:
   • arrivo        — always day 1. Journey → base. Strong anchor: lodging (evening). No experiences.
   • apice         — the trip's signature experience. The ONLY role that converts experiences.
   • esplorazione  — local immersion, medium pace. Mostly prose; at most 1 light optional activity.
   • riposo        — deliberate decompression. ZERO CTA — a button here breaks trust.
   • decantazione  — second-to-last day, wind-down. Prose, minimal conversion.
   • trasferimento — change of base mid-trip. A mini-arrival: new lodging (evening) + new transfer (afternoon).
   • partenza      — always the last day. Zero CTA, or a return transfer if bookable.

SCALING (derive the counts from trip length — density follows peaks & bases, not days):
   • Peaks (apici) ≈ 1 every 3.5 days, rounded.  4d→1 · 7d→2 · 10d→3 · 14d→4
   • Bases ≈ 1 every 6 days.  ≤5d→1 · 6–11d→1–2 · 12+→2–3  (each extra base = one trasferimento day)
   • Rests (riposi) = 0 below 5 days, then ~1 every 5–6 days.
   • Day 1 = arrivo. Last day = partenza. Penultimate tends to decantazione.

HARD RULES — validate the skeleton, recompute if it fails:
   • Day 1 is arrivo; the last day is partenza.
   • NEVER two apici in a row — between any two apici put at least one esplorazione or riposo.

MONO-BASE vs MULTI-STOP (this decides how many trasferimento days exist):
   • DEFAULT mono-base: one base for the whole trip, ZERO trasferimento days. A single
     city/town (Kyoto, Lisbon, Marrakech, Naples) is ALWAYS mono-base.
   • MULTI-STOP only when the destination is a WIDE AREA that genuinely requires moving
     base — a country or large region (Uzbekistan: Samarkand/Bukhara/Khiva; Patagonia;
     Puglia; the Azores; Albania; an island group). Then add trasferimento days per the
     bases rule above. When unsure, choose mono-base.

PHASE B — FILL. Only after the skeleton validates, fill each day's four moments
following its role's CTA logic and the three placement rules (§3).

2. FOUR FIXED MOMENTS PER DAY — mattina · pranzo · pomeriggio · sera.
Every day has exactly these four moments, in this order (time_label = morning, lunch,
afternoon, evening), so the frontend draws every day identically. Standard function:
   • mattina    — the day's main activity (the signature experience on apice days).
   • pranzo     — meal pause. NEVER converts (we have no restaurant partner). ALWAYS filled,
                  in prose, as a pacing anchor — write it complete with NO button.
   • pomeriggio — secondary activity, or the transfer to the base.
   • sera       — dinner + check-in. The lodging CTA lives here on arrivo & trasferimento days.
   Long-haul arrival: render the whole flight as the SINGLE mattina transport moment
   ("Milan MXP → Sydney → Hobart HBA — 27h via SYD") — never split Departure/Layover/Arrival.

2b. THE THREE CTA-PLACEMENT RULES — applied mechanically. Everything NOT covered by
   these three is prose with NO button — pranzo ALWAYS included.
   (a) SIGNATURE EXPERIENCE → always mattina, only on apice days. Never afternoon/evening,
       never on a non-apice day. One strong experience CTA per apice (max 2).
   (b) LODGING → always sera, on every arrivo and every trasferimento day. Once per base.
   (c) TRANSFER → always pomeriggio (last leg before the base) or mattina on partenza
       (return). ALWAYS conditional: a CTA only if the mode is bookable AND we have the
       partner; otherwise honest prose, no button.
   Rest days: zero CTA, full stop. Esplorazione/decantazione: prose + at most one light
   optional activity CTA. NEVER promote another day to apice just to add conversion.

2c. PARTNER MAP — pick booking.provider by category + region. We have NO Booking, NO
   GetYourGuide, NO restaurant partner. The affiliate_url is normalized server-side, so
   the PROVIDER token is what must be correct.
   • Lodging (sera on arrivo/trasferimento)        → hotels  (or tablet_hotels for boutique/design)
     LODGING = SEARCH CRITERIA, NEVER A PROPERTY. You must NOT name any specific
     hotel/riad/ryokan/guesthouse anywhere (title, location_name, description,
     display_label): named properties get invented or disappear. Instead the lodging
     booking carries "stay_recommendation": { "district": the recommended
     neighbourhood, "style": the lodging type (boutique, traditional ryokan,
     aparthotel, guesthouse…), "budget_range": €/night band CONSISTENT with the
     user's declared budget and the §7 budget decomposition (never a random number),
     "why": WHY that district fits THIS traveller — pace, walking distances, evening
     vibe. Rich and specific, it is the heart of the value. }
     location_name = "<district>, <city>" (the area, for the map pin).
     display_label = ${input.lang === "it" ? `"Vedi hotel disponibili a <district>"` : `"See available hotels in <district>"`}.
   • Flights / packages (mattina transport, partenza)→ expedia
   • Coach between cities (transfer, Europe ground) → flixbus
   • Boat rental / coastal hop (transfer)           → samboat
   • Signature experience (mattina on apice), by REGION in preference order:
       Europe         → viator → musement
       Mediterranean  → civitatis → viator
       Asia           → klook → viator
       Latin America  → civitatis → viator
       India · Africa · North America · Oceania → viator
     EXPERIENCES (ANY provider — viator, civitatis, musement, klook) = NEVER A NAMED
     PRODUCT. Do NOT name any specific tour/product/operator/company anywhere
     (title, location_name, description, display_label): named products hallucinate
     or go stale. THE DISTINCTION THAT MATTERS: landmarks, monuments, districts and
     natural places are FACTS and MUST stay named — "the Colosseum", "Gion district",
     "Fushimi Inari at dawn". Only the commercial seller is banned. The WHAT-YOU-SEE
     is nameable; the WHO-SELLS-IT is not. location_name = the area/landmark where
     it happens, never an operator. Describe the experience by CATEGORY + PLACE
     (${input.lang === "it"
       ? `"una cooking class di cucina marocchina nella medina", "un tour a piedi all'alba tra i torii del Fushimi Inari"`
       : `"a Moroccan cooking class inside the medina", "a dawn walking tour through the Fushimi Inari torii"`}),
     never by provider brand; display_label = the category (${input.lang === "it" ? `"Vedi esperienze: Cooking class marocchina"` : `"See experiences: Moroccan cooking class"`}).
     For EVERY experience provider (viator, klook, civitatis, musement) the booking ALSO carries "experience_recommendation": {
       "search_query": destination city + experience type + ONE useful nuance
         (district, time of day, style, theme). Good: ${input.lang === "it"
           ? `"Kyoto cerimonia del tè tradizionale", "Roma tour serale street food Trastevere",
         "Lisbona degustazione vino con vista"`
           : `"Kyoto traditional tea ceremony", "Rome evening street food tour Trastevere",
         "Lisbon wine tasting with a view"`}. Calibrated: specific enough to focus
         results, NEVER so narrow it risks zero results — no exact times, no venue
         names, no rare constraints; when in doubt prefer a broad theme ("street
         food", "historic walking tour") over a rigid filter. Natural searchable
         language in the response language, no quotes/operators.
       "label": short human category the user reads (${input.lang === "it" ? `"Cerimonia del tè tradizionale"` : `"Traditional tea ceremony"`}) — NOT a product name.
       "why": WHY this experience fits THIS traveller. Rich and specific — it is the value.
     }
     location_name = the area/landmark where it happens (for the map pin), never an operator.
   • Restaurants (pranzo & dinner) → NO partner → always prose, never a CTA.

2d. FALLBACK — better no CTA than a fake one (the absolute rule).
   • Apice with no bookable experience available → keep it STRONG PROSE (why you go, the
     right hour, what you risk missing). No fake button. Do NOT promote another day to
     apice to compensate — the skeleton stays valid, that peak simply doesn't monetize.
   • Transfer not bookable (e.g. you arrive on foot, or a scheduled ferry we can't sell)
     → prose, no CTA.
   • Any moment without a coherent partner → honest prose.

3. MOMENT IMAGE
   - Do NOT include any image_url or hero_image_url fields. Real photos are
     attached by the system afterwards — any URL you write is discarded.

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

6. BOOKING INFO (status + provider; placement is §2b, partner choice is §2c)
   - status = "bookable_now" → strong CTA, completable now (flight, hotel, paid tour).
   - status = "reserve_recommended" → reserve advised but walk-in possible (timed-entry sights).
   - status = "walk_in" → no booking; info only (free viewpoint, public beach, a wander).
   - A moment is bookable ONLY when §2b places a CTA there AND §2c has a real partner for
     it. Everything else — pranzo, restaurants, rest-day moments, unbookable transfers,
     free wanders — is walk_in. When in doubt, prefer walk_in over a forced link.
   - For walk_in moments OMIT the booking object entirely (never provider="none").
   - provider — one of: expedia, hotels, tablet_hotels, civitatis, musement, klook,
     viator, tripadvisor, flixbus, samboat, expedia_cars. NEVER skyscanner, booking,
     getyourguide, trainline, welcome_pickups or airbnb — they earn nothing and are
     DROPPED server-side (the moment becomes walk_in). The PROVIDER is what matters:
     affiliate_url is normalized server-side from provider + destination, so a correct
     provider guarantees a correct link even if your URL is imperfect. (You may leave
     affiliate_url as a plain placeholder like the destination's official site.)
   - display_label — ACTION + OBJECT in the response language, naming the real place:
     ${input.lang === "it"
       ? `"Prenota il volo per Lisbona", "Prenota l'esperienza · Tour della Medina",
     "Vedi hotel disponibili a Higashiyama". Never a bare "Prenota" or "Click here".`
       : `"Book the flight to Lisbon", "Book the experience · Medina Tour",
     "See available hotels in Higashiyama". Never a bare "Book" or "Click here".`}
     EXCEPTION lodging: never a property name — the label names the DISTRICT (see §2c).
     EXCEPTION experiences (ANY provider): never a product name — the label names the
     CATEGORY (see §2c), e.g. ${input.lang === "it" ? `"Vedi esperienze: Cerimonia del tè"` : `"See experiences: Tea ceremony"`}.

7. COSTS
   - cost_bookable_total per day = sum of cost_max for all moments with
     booking.status === "bookable_now" or "reserve_recommended".
   - cost_onsite_estimate per day = sum of cost estimates for walk_in moments
     plus a generous buffer for incidentals (coffee, snacks, local transport).
   - total_cost_bookable = sum of cost_bookable_total across all days.
   - total_cost_onsite_estimate = sum of cost_onsite_estimate across all days.
   - total_cost_range = display-ready string, e.g. "€1.800–2.400/pp".
${budgetTargetBlock}

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

11. CONTENT COHERENCE & HONESTY
   - GEOGRAPHIC COHERENCE: a single day's moments must be near each other. No breakfast
     in the north and lunch at the far south of the island. The transport_to_next you
     state must be realistic.
   - PACING ANCHORS: lunch and dinner give the day rhythm even when they don't convert —
     ALWAYS fill them, in prose.
   - LIVE-DATA HONESTY: you do NOT have real-time hours, transit times or prices. Keep
     start_time/duration/cost as HONEST, INDICATIVE estimates — never present a precise
     number as certain. Confidently-wrong destroys trust more than a vague-but-honest range.

12. WORD LIMITS — keep the narrative the star but contained, so it doesn't bloat:
   - subtitle (the day's narrative beat) ≤ 40 words.
   - each moment description ≤ 35 words.
   - why_this ≤ 20 words.

13. SELF-CHECK before returning (fix silently if any fails):
   - Skeleton valid: day 1 = arrivo, last = partenza, never two apici in a row.
   - Peak/base counts match the scaling for this length.
   - Every apice has ONE signature experience (or strong prose if no partner) in mattina.
   - Every arrivo & trasferimento has ONE lodging CTA in sera.
   - Rest days: zero CTA. No out-of-context CTA anywhere; pranzo never has a CTA.
   - Experience partner chosen by region (§2c). Each provider is from the allowed set.
   - Each image is real or omitted; each practical figure is honest/indicative.

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
      "role": "arrivo",
      "arc": "Arrival",
      "title_evocative": "Left Milan Behind — The Southern Edge Begins",
      "subtitle": "Train south, ferry to the island, first dinner under the cliffs.",
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
          "image_alt": "Aircraft above clouds",
          "booking": {
            "provider": "expedia",
            "affiliate_url": "https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Flights-Search?leg1=from%3AMXP%2Cto%3AHBA%2Cdeparture%3A20260710%2F1&passengers=adults%3A1&trip=roundtrip&mode=search",
            "display_label": "${input.lang === "it" ? "Prenota il volo per Hobart" : "Book the flight to Hobart"}",
            "status": "bookable_now"
          },
          "description": "Two long legs with one layover in Sydney. Aim for an evening MXP departure if you want to land fresh.",
          "why_this": "Your 'long-haul OK' chip said this is fine — the destination earns the distance.",
          "transport_to_next": { "mode": "taxi", "duration_min": 25, "cost_estimate": "€20–30", "note": "Grab a cab at arrivals" }
        },
        {
          "id": "d1m2",
          "type": "food",
          "title_evocative": "First Bite on the Ground",
          "title_operational": "Lunch on arrival — harbourside café",
          "time_label": "lunch",
          "cost_min": 12,
          "cost_max": 20,
          "image_alt": "Simple plate by the water",
          "description": "A plate and a coffee by the water — pure pacing, no plans. You've just landed.",
          "why_this": "Your 'slow arrivals' note: don't schedule the first meal, just land into it.",
          "transport_to_next": { "mode": "walk", "duration_min": 8 }
        },
        {
          "id": "d1m3",
          "type": "transport",
          "title_evocative": "The Last Leg to Base",
          "title_operational": "Transfer to Battery Point",
          "time_label": "afternoon",
          "cost_min": 0,
          "cost_max": 8,
          "image_alt": "Coastal road to the neighbourhood",
          "description": "Short hop to the neighbourhood, then a slow first wander to get your bearings before dark.",
          "why_this": "Light on purpose — you're tired with bags, no heavy activity on arrival.",
          "transport_to_next": { "mode": "walk", "duration_min": 5 }
        },
        {
          "id": "d1m4",
          "type": "accommodation",
          "title_evocative": "Settle, Slowly",
          "title_operational": "${input.lang === "it" ? "Check-in in zona Battery Point" : "Check-in in the Battery Point area"}",
          "time_label": "evening",
          "start_time": "00:30",
          "duration_min": 60,
          "cost_min": 95,
          "cost_max": 130,
          "cost_note": "per night, double room",
          "location_name": "Battery Point, Hobart",
          "location_address": "Battery Point, Hobart TAS",
          "location_lat": -42.8923,
          "location_lng": 147.3315,
          "image_alt": "Battery Point streets at dusk",
          "booking": {
            "provider": "hotels",
            "affiliate_url": "https://www.expedia.com/Hotel-Search?destination=Battery%20Point%2C%20Hobart",
            "display_label": "${input.lang === "it" ? "Vedi hotel disponibili a Battery Point" : "See available hotels in Battery Point"}",
            "status": "bookable_now",
            "stay_recommendation": {
              "district": "Battery Point",
              "style": "${input.lang === "it" ? "guesthouse di carattere" : "characterful guesthouse"}",
              "budget_range": "${input.lang === "it" ? "€95–130/notte" : "€95–130/night"}",
              "why": "${input.lang === "it" ? "Vicoli georgiani silenziosi a 10 minuti a piedi dal porto: la sera cammini, non guidi — ed è il silenzio che hai chiesto." : "Quiet Georgian lanes 10 minutes on foot from the harbour: evenings on foot, not behind a wheel — the quiet you asked for."}"
            }
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
    { "day": 1, "lat": -42.8923, "lng": 147.3315, "label": "Battery Point" }
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
  // Oltre ai fence markdown, il modello a volte APPENDE prosa dopo il JSON
  // ("{...}\nEcco perché…") → JSON.parse fallisce su "unexpected non-whitespace
  // after JSON". Ritagliamo dal primo '{'/'[' all'ultima '}'/']' così il
  // payload resta parsabile qualunque cosa lo circondi.
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  const starts = [clean.indexOf("{"), clean.indexOf("[")].filter((i) => i >= 0);
  if (starts.length === 0) return clean;
  const start = Math.min(...starts);
  const end = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
  return end > start ? clean.slice(start, end + 1) : clean;
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

HARD RULE while rewriting: NEVER introduce named commercial sellers — no specific
hotels/riads/guesthouses, no named tours/operators/companies. Landmarks, monuments,
districts and natural places are facts and stay named. Lodging bookings keep their
stay_recommendation and experience bookings keep their experience_recommendation
UNCHANGED unless the flag is about them. (A repaired moment must not re-introduce
what the main generation was forbidden to write.)

Return ONLY the corrected moments, as a JSON array: [{...moment}, ...] — one object per flagged id, SAME id, identical moment schema, ALL text fields in ${langName}. Do NOT return the days or the rest of the itinerary. JSON only, no prose, start with [ end with ].`;

  // Output mirato (solo i momenti corretti, ~1-2K token) invece dell'intero
  // itinerario ri-emesso (~15-20K token): quando la CoV scatta non raddoppia
  // più il tempo di generazione, e i momenti NON flaggati restano davvero
  // byte-per-byte intatti (la ri-emissione completa li ri-campionava tutti).
  const msg = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });
  const text = msg.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("");
  const corrected = z.array(momentV2Schema).parse(JSON.parse(extractJson(text)));
  const byId = new Map(corrected.map((m) => [m.id, m]));
  const flagged = new Set(violations.map((v) => v.id));
  for (const day of itinerary.days) {
    day.moments = day.moments.map((m) => (flagged.has(m.id) && byId.has(m.id) ? byId.get(m.id)! : m));
  }
  return itinerary;
}

// ── Generazione parallela: scheletro + blocchi di giorni concorrenti ───────
// Il tempo di una chiamata LLM è ~lineare nei token EMESSI: un itinerario di
// 7 giorni (~15-20K token) in una sola chiamata costa 3+ minuti di attesa.
// Qui: 1 chiamata breve produce lo SCHELETRO del viaggio (arco narrativo,
// ruoli §2b, highlights, manifesto), poi N chiamate PARALLELE scrivono i
// giorni a blocchi — ognuna riceve il prompt di precisione COMPLETO (identico
// al percorso storico) + lo scheletro condiviso per coerenza. Qualsiasi
// errore → fallback trasparente alla singola chiamata storica: il caso
// peggiore è la lentezza di prima, mai una qualità diversa in silenzio.

const skeletonDayV2Schema = z.object({
  day_number: z.number(),
  role: dayRoleSchema.optional(),
  arc: z.string(),
  title_evocative: z.string(),
  subtitle: z.string().default(""),
  energy_level: energyLevelSchema.optional(),
});

const skeletonV2Schema = z.object({
  destination: z.string(),
  country: z.string(),
  duration_days: z.number(),
  manifesto: z.string(),
  em_word: optStr,
  highlights: z.array(highlightV2Schema),
  total_cost_range: z.string(),
  closing_quote: z.string(),
  days: z.array(skeletonDayV2Schema),
});

function partitionDays(n: number, chunks = 3): number[][] {
  const size = Math.ceil(n / chunks);
  const groups: number[][] = [];
  for (let start = 1; start <= n; start += size) {
    groups.push(Array.from({ length: Math.min(size, n - start + 1) }, (_, i) => start + i));
  }
  return groups;
}

async function callSonnetJson(prompt: string, maxTokens: number): Promise<any> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = message.content.filter((b) => b.type === "text").map((b) => (b as any).text).join("");
  return JSON.parse(extractJson(text));
}

async function generateItineraryV2Parallel(input: ProfilingInput, basePrompt: string): Promise<ItineraryV2> {
  const langName = input.lang === "it" ? "Italian" : "English";
  const days = Math.min(input.days, 14);

  const skeletonPrompt = `${basePrompt}

═══════════════════════════════════════════════════════════════════════════
OVERRIDE FOR THIS RESPONSE — TRIP SKELETON ONLY (first pass of a two-pass build)
═══════════════════════════════════════════════════════════════════════════
Ignore the REQUIRED JSON OUTPUT above for THIS response. Return ONLY the trip
skeleton — NO moments — as STRICT JSON:
{
  "destination": "City, Region, Country",
  "country": "Country name only",
  "duration_days": ${days},
  "manifesto": "Long evocative quote — why this place is yours. 2-3 sentences, sensory, specific.",
  "em_word": "single word from manifesto to italicize",
  "highlights": [ 4 items: { "icon": "emoji", "name": "...", "description": "1 short evocative sentence" } ],
  "total_cost_range": "€min-max/pp",
  "closing_quote": "...",
  "days": [ exactly ${days} items: { "day_number": 1, "role": "arrivo|apice|esplorazione|riposo|decantazione|trasferimento|partenza", "arc": "...", "title_evocative": "...", "subtitle": "...", "energy_level": "low|medium|high" } ]
}
Every rule above (day roles §2b, arc doctrine, precision, grounding) applies
to this skeleton. ALL text in ${langName}. JSON only, start with { end with }.`;

  const skeleton = skeletonV2Schema.parse(await callSonnetJson(skeletonPrompt, 3000));
  if (skeleton.days.length !== days) throw new Error(`skeleton has ${skeleton.days.length} days, expected ${days}`);

  const skeletonJson = JSON.stringify(skeleton);
  const chunkSchema = z.object({ days: z.array(dayV2Schema) });
  const chunks = await Promise.all(partitionDays(days).map(async (dayNums) => {
    const chunkPrompt = `${basePrompt}

═══════════════════════════════════════════════════════════════════════════
OVERRIDE FOR THIS RESPONSE — FULL DAYS ${dayNums.join(", ")} ONLY (second pass)
═══════════════════════════════════════════════════════════════════════════
The trip skeleton is already FIXED (do NOT change roles, arcs or titles):
${skeletonJson}

Ignore the REQUIRED JSON OUTPUT above for THIS response. Write ONLY the full
day objects for days ${dayNums.join(", ")} — every field of the day schema
(2-6 moments each, per-day costs, energy, transports) — as STRICT JSON:
{"days":[ ...one complete day object per requested day... ]}
- Follow each day's skeleton role and the CTA doctrine (§2) for that role.
- Keep continuity with neighbouring days as sketched in the skeleton, but do
  NOT re-plan days outside ${dayNums.join(", ")}.
- Do NOT reuse a venue/place that clearly belongs to another day's theme.
- Do NOT include any image_url / hero_image_url (attached later by the system).
- plan_b and transport_to_next, when present, MUST be objects exactly as in
  the schema above (plan_b = {"trigger","alternative"}), never plain strings.
ALL text in ${langName}. JSON only, start with { end with }.`;
    const parsed = chunkSchema.parse(await callSonnetJson(chunkPrompt, 12000));
    const got = parsed.days.map((d) => d.day_number).sort((a, b) => a - b).join(",");
    if (got !== dayNums.join(",")) throw new Error(`chunk mismatch: wanted ${dayNums.join(",")}, got ${got}`);
    return parsed.days;
  }));

  const allDays = chunks.flat().sort((a, b) => a.day_number - b.day_number);
  return itineraryV2Schema.parse({
    ...skeleton,
    hero_image_url: "",
    days: allDays,
    // Ricalcolati comunque da enrichItineraryV2 su base per-momento.
    total_cost_bookable: 0,
    total_cost_onsite_estimate: 0,
  });
}

// ── V2 generation entry point ─────────────────────────────────────────────

async function generateItineraryV2SingleCall(prompt: string): Promise<ItineraryV2> {
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

export async function generateItineraryV2ForDestination(
  input: ProfilingInput,
  destinationName: string,
  priorBlock = ""
): Promise<ItineraryV2> {
  const prompt = buildPromptV2({ ...input, _destinationOverride: destinationName } as any, priorBlock);
  const days = Math.min(input.days, 14);

  let itinerary: ItineraryV2;
  if (days >= 4) {
    try {
      const t0 = Date.now();
      itinerary = await generateItineraryV2Parallel(input, prompt);
      console.log(`[v2 parallel] ${days} days generated in ${Math.round((Date.now() - t0) / 1000)}s`);
    } catch (e) {
      console.warn("[v2 parallel] fallback to single-call:", e instanceof Error ? e.message : e);
      itinerary = await generateItineraryV2SingleCall(prompt);
    }
  } else {
    // 1-3 giorni: output già piccolo, il parallelismo non ripaga.
    itinerary = await generateItineraryV2SingleCall(prompt);
  }

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
  // Il giorno regenerato mantiene il suo RUOLO e ne applica la logica CTA (stessa
  // dottrina del generatore principale §2b). Fallback: G1 senza ruolo = arrivo.
  const role: DayRole | undefined = day.role ?? (day.day_number === 1 ? "arrivo" : undefined);
  const roleRule: Record<DayRole, string> = {
    arrivo: `arrival — ONE strong anchor = lodging (provider "hotels"/"tablet_hotels", bookable_now) in the EVENING. LODGING = SEARCH CRITERIA, never a property name: the booking carries stay_recommendation {district, style, budget_range coherent with the user's budget, why that district fits this traveller}; location_name/display_label name the DISTRICT, never a hotel. Arrival transport gets a CTA only if a real partner fits the mode (expedia flight, flixbus coach), else prose. The lunch is a transit meal: walk_in, no booking. NO bookable experiences/tours today.`,
    trasferimento: `base change — a mini-arrival: ONE lodging CTA (hotels/tablet_hotels) in the EVENING with stay_recommendation {district, style, budget_range, why} and NO property name (district only) + the transfer in the afternoon (CTA only if bookable via a partner). No paid experiences.`,
    apice: `peak — ONE signature experience CTA in the MORNING (viator/civitatis/musement/klook by region), max one. For ANY experience provider: NO named tour/product/operator in any field — describe by category + landmark (landmarks/monuments/districts MUST stay named: only the commercial seller is banned; location_name = area/landmark, never an operator). For EVERY experience provider (viator/klook/civitatis/musement) the booking ALSO carries experience_recommendation {search_query: city + type + one nuance, label: human category, why}. Afternoon/evening stay light. Lunch never converts.`,
    esplorazione: `exploration — mostly prose, at most ONE light optional activity CTA. Lunch never converts.`,
    riposo: `rest — ZERO CTA anywhere. A button here breaks trust.`,
    decantazione: `wind-down — prose, minimal conversion, at most one light optional activity.`,
    partenza: `departure — zero CTA, or a return transfer in the morning only if bookable.`,
  };
  const roleDoctrine = role ? `\n- THIS DAY'S ROLE is "${role}": ${roleRule[role]}` : "";

  const prompt = `You are MindRoute's itinerary engine. Regenerate ONE day of a trip to ${destinationName}.

CURRENT DAY (JSON — copy this exact structure and field names, same value types):
${JSON.stringify(day)}

OTHER DAYS of this trip (so you do NOT repeat their places):
${contextSummary}

USER REQUEST for the new version of this day: ${feedback || "refresh it with different but equally good moments"}

Rules:
- Return ONLY a JSON object for the new day — same schema/keys/types as CURRENT DAY. Keep "day_number", "date" and "role" unchanged.
- Use REAL, well-known places in ${destinationName}; set "location_name" on every moment (needed for map + booking). Do NOT reuse the places already used on the OTHER DAYS.
- FOUR moments — mattina, pranzo, pomeriggio, sera (time_label morning/lunch/afternoon/evening). The pranzo is ALWAYS prose, never a CTA. All numeric fields are numbers. Write every visible text field in ${lang === "it" ? "Italian" : "English"}.
- Leave image URLs as-is or empty and do not invent map_points — images and coordinates are set server-side.
- BOOKING by function + partner-fit, not by default: mark a moment "bookable_now"/"reserve_recommended" ONLY if it is genuinely reservable through a real partner (provider one of: expedia, hotels, tablet_hotels, civitatis, musement, klook, viator, flixbus, samboat). The affiliate_url is normalized server-side from the provider — getting the PROVIDER right is what matters; never use booking.com, getyourguide, skyscanner or airbnb. Free wanders, scheduled ferries and generic transfers are walk_in — omit their booking object. Experience moments (ANY provider: viator/civitatis/musement/klook): NO named tour/product/operator in any field — describe by category + landmark (landmarks/monuments/districts MUST stay named; only the commercial seller is banned; location_name = area/landmark, never an operator); for EVERY experience provider (viator/klook/civitatis/musement) the booking ALSO carries experience_recommendation {search_query: city + type + one nuance, label: human category, why}.${roleDoctrine}`;

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
