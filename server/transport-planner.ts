// ─────────────────────────────────────────────────────────────────────────
// Transport planner — decide DETERMINISTICALLY how the traveller reaches the
// destination, instead of letting the LLM default every Day-1 to a flight.
//
// Root problem it fixes: the itinerary prompt hard-codes "DAY 1 = flight from
// departure". So a 300 km hop or a Sardinia trip both became "Volo". That is
// wrong for the user AND leaves money on the table — MindRoute monetises
// intercity BUS (FlixBus) and, in future, FERRY crossings, not just flights.
//
// Design: geocode departure + destination (reusing the robust destination
// geocoder), compute the great-circle distance, detect island/water crossings
// from a curated list, then pick candidate modes from distance bands. The
// decision is computed here; the LLM only writes the copy around it.
//
// Monetisation mapping:
//   · ground short/medium  → FlixBus primary (Awin)          → we earn
//   · island crossing      → flight (Expedia) + ferry INFO   → ferry earns
//                            only once a ferry affiliate is wired (slot ready)
//   · long-haul            → flight (Expedia)                → we earn
//
// Fail-safe: if either endpoint can't be geocoded we return null and the
// caller injects nothing → the prompt keeps its previous (flight-default)
// behaviour. Never worse than today.
// ─────────────────────────────────────────────────────────────────────────

import { geocodeDestination } from "./geocode-place";

export type TransportMode = "bus" | "train" | "car" | "flight" | "ferry";

export interface TransportPlan {
  distanceKm: number;
  isIsland: boolean;         // destination requires a sea crossing from a mainland departure
  groundAvailable: boolean;  // train/bus/car is a realistic way to arrive
  flightRecommended: boolean;
  ferryRelevant: boolean;
  // Medium range where ground AND air are both legitimate: present all modes
  // side by side and let the traveller choose — no forced hierarchy.
  neutralChoice: boolean;
  primary: TransportMode;    // drives the Day-1 affiliate link key
  modes: TransportMode[];     // ordered, best-first — drives the copy
}

// Great-circle distance in km.
function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

// Curated island / sea-crossing markers (IT + EN). Matched as whole words
// against the whole destination name. Intentionally covers the Mediterranean
// cases MindRoute actually gets from Italian departures; incompleteness is
// safe — an unlisted island simply falls through to the distance logic and
// gets a flight, same as today.
const ISLAND_MARKERS = [
  // Italy
  "sardegna", "sardinia", "sicilia", "sicily", "elba", "ischia", "capri",
  "eolie", "aeolian", "egadi", "pantelleria", "lampedusa", "ponza", "giglio",
  "favignana", "procida", "asinara", "maddalena",
  // Western Med
  "corsica", "corse", "maiorca", "mallorca", "minorca", "menorca", "ibiza",
  "formentera", "baleari", "balearic",
  // Greece / Eastern Med
  "creta", "crete", "rodi", "rhodes", "santorini", "mykonos", "corfu", "corfù",
  "zante", "zakynthos", "cicladi", "cyclades", "kos", "naxos", "paros", "milos",
  "lefkada", "cefalonia", "kefalonia", "skiathos", "samos", "chios",
  "cipro", "cyprus", "malta", "gozo",
  // Atlantic / farther but still ferry-plausible only when close
  "canarie", "canary", "tenerife", "lanzarote", "fuerteventura", "madeira",
  // Generic
  "isola", "isole", "island", "islands", "arcipelago", "archipelago",
];

function looksLikeIsland(destinationName: string): boolean {
  const n = normalize(destinationName);
  return ISLAND_MARKERS.some((m) => new RegExp(`\\b${normalize(m)}\\b`).test(n));
}

/**
 * Resolve how to reach `destinationName` from `departure`. Returns null when
 * either endpoint can't be located (caller then leaves the prompt unchanged).
 */
export async function resolveTransportPlan(
  departure: string,
  destinationName: string,
): Promise<TransportPlan | null> {
  const dep = (departure ?? "").trim();
  const dest = (destinationName ?? "").trim();
  if (!dep || !dest) return null;

  const [depGeo, destGeo] = await Promise.all([
    geocodeDestination(dep),
    geocodeDestination(dest),
  ]);
  if (!depGeo || !destGeo) return null;

  const distanceKm = Math.round(haversineKm(depGeo, destGeo));
  const island = looksLikeIsland(dest);

  // ── Sea crossing ────────────────────────────────────────────────────────
  // Destination is an island reachable by ferry. Flight is the fast option
  // (monetised via Expedia); ferry is a real, scenic alternative we surface
  // honestly. Ferry only makes sense at regional range — beyond ~1200 km a
  // ferry is impractical, so we drop it (long-haul islands → flight only).
  if (island) {
    const ferryRelevant = distanceKm <= 1200;
    return {
      distanceKm,
      isIsland: true,
      groundAvailable: false,
      flightRecommended: true,
      ferryRelevant,
      neutralChoice: false,
      primary: "flight",
      modes: ferryRelevant ? ["flight", "ferry"] : ["flight"],
    };
  }

  // ── Overland ──────────────────────────────────────────────────────────
  // Short hop: ground only. FlixBus first (we monetise it), train/car after.
  // A flight here would be absurd, so we don't offer one.
  if (distanceKm <= 350) {
    return {
      distanceKm,
      isIsland: false,
      groundAvailable: true,
      flightRecommended: false,
      ferryRelevant: false,
      neutralChoice: false,
      primary: "bus",
      modes: ["bus", "train", "car"],
    };
  }

  // Medium: bus, train AND flight are all legitimate. Present them side by
  // side and let the traveller choose — no forced hierarchy. Day-1 link stays
  // on the bus (the mode we monetise) but the copy names all three.
  if (distanceKm <= 900) {
    return {
      distanceKm,
      isIsland: false,
      groundAvailable: true,
      flightRecommended: true,
      ferryRelevant: false,
      neutralChoice: true,
      primary: "bus",
      modes: ["bus", "train", "flight"],
    };
  }

  // Long-ish, still same-continent range: flight is the sensible lead, with a
  // scenic overland train mentioned for those who want it.
  if (distanceKm <= 1500) {
    return {
      distanceKm,
      isIsland: false,
      groundAvailable: true,
      flightRecommended: true,
      ferryRelevant: false,
      neutralChoice: false,
      primary: "flight",
      modes: ["flight", "train"],
    };
  }

  // Long-haul / intercontinental: flight only.
  return {
    distanceKm,
    isIsland: false,
    groundAvailable: false,
    flightRecommended: true,
    ferryRelevant: false,
    neutralChoice: false,
    primary: "flight",
    modes: ["flight"],
  };
}

// ── Prompt injection ───────────────────────────────────────────────────────
// Renders the plan as a high-salience block that OVERRIDES the static Day-1
// "flight from departure" instruction in STEP 5. Kept in the DYNAMIC part of
// the prompt (per-destination), never the cached system part.
const MODE_LABEL: Record<TransportMode, { it: string; en: string }> = {
  bus:    { it: "autobus intercity (FlixBus)", en: "intercity bus (FlixBus)" },
  train:  { it: "treno", en: "train" },
  car:    { it: "auto/noleggio", en: "car/rental" },
  flight: { it: "volo", en: "flight" },
  ferry:  { it: "traghetto (nave)", en: "ferry" },
};

export function formatTransportBlock(
  plan: TransportPlan,
  lang: string,
  departure: string,
): string {
  const it = lang === "it";
  const label = (m: TransportMode) => (it ? MODE_LABEL[m].it : MODE_LABEL[m].en);
  const modeList = plan.modes.map(label).join(it ? ", " : ", ");
  const primary = label(plan.primary);

  // Day-1 affiliate link key the model must emit, matching the chosen mode.
  const day1Key =
    plan.primary === "bus" ? "flixbus"
    : plan.primary === "flight" ? "expedia_flights"
    : plan.primary === "car" ? "expedia_cars"
    : "flixbus";

  const lines: string[] = [];
  lines.push("═══════════════════════════════════════");
  lines.push("TRANSPORT PLAN — OVERRIDES the Day-1 arrival mode in STEP 5");
  lines.push("═══════════════════════════════════════");
  lines.push(
    `Departure→destination straight-line distance: ~${plan.distanceKm} km${
      plan.isIsland ? " (sea crossing — island destination)" : ""
    }.`,
  );
  lines.push(
    `Arrival modes for THIS trip, best-first: ${modeList}. Primary: ${primary}.`,
  );

  if (plan.neutralChoice) {
    // Medium range — bus, train and flight all valid. Present them equally.
    lines.push(
      `This destination sits at a distance where BUS, TRAIN and FLIGHT are ALL reasonable — do NOT force one. Day 1 morning must present the arrival as a genuine CHOICE: name all three (${modeList}) with rough ~duration and ~cost/pp for each, in one or two tight sentences, and let the traveller decide. Frame the ground option as an experience, not a "transfer".`,
    );
    lines.push(
      `Attach the "flixbus" affiliate link key on Day 1 morning as the bookable CTA (still mention flight/train in the copy). The FINAL day returns the same way. Keep tripadvisor/activity links unchanged on later days.`,
    );
  } else if (!plan.flightRecommended && plan.groundAvailable) {
    // Short overland — a flight would be absurd, ground only.
    lines.push(
      `This destination is close enough to reach OVERLAND and a flight would be absurd. Do NOT mention a flight. Day 1 morning MUST be the real ground journey from ${departure} (${primary}), with ~duration and ~cost/pp, written as an experience (landscape from the window, the rhythm of the ride), not "transfer". Offer ${modeList} as options. The FINAL day returns by the same mode in reverse.`,
    );
    lines.push(
      `Day 1 morning affiliate link key MUST be "flixbus" (NOT expedia_flights). Use the FlixBus link template. Keep tripadvisor/activity links unchanged on later days.`,
    );
  } else if (plan.isIsland && plan.ferryRelevant) {
    lines.push(
      `Day 1 morning: FLIGHT is the fastest way in — write it and use the "expedia_flights" link key. Then, in the SAME slot or the getting-there notes, present the FERRY crossing as a genuine, scenic alternative (nearest mainland port → island), with ~duration honestly. Do NOT fabricate a ferry booking link — describe it as an option the traveller can book directly. Mention which suits whom (ferry = car + slow arrival + more luggage; flight = speed).`,
    );
  } else if (plan.isIsland) {
    lines.push(
      `Island destination but too far for a practical ferry: Day 1 = flight ("expedia_flights"). Do not push a ferry.`,
    );
  } else {
    // Long-haul overland-impossible or >1500 km — keep flight, but honestly.
    lines.push(
      `Day 1 morning = flight from ${departure} ("expedia_flights" link key), as the only sensible option at this distance.`,
    );
    if (plan.modes.includes("train")) {
      lines.push(
        `A long train alternative technically exists — mention it only in one honest line for travellers who prefer overland; the flight stays primary.`,
      );
    }
  }

  lines.push(
    `Ground available: ${plan.groundAvailable ? "YES" : "NO"} · Flight recommended: ${plan.flightRecommended ? "YES" : "NO"} · Ferry relevant: ${plan.ferryRelevant ? "YES" : "NO"}.`,
  );
  lines.push(`Day-1 arrival affiliate link key to use: "${day1Key}".`);
  lines.push("");
  return lines.join("\n");
}

// Convenience: resolve + format in one call. Returns "" (inject nothing) when
// the plan can't be built, preserving legacy behaviour.
export async function buildTransportBlock(
  departure: string,
  destinationName: string,
  lang: string,
): Promise<string> {
  try {
    const plan = await resolveTransportPlan(departure, destinationName);
    if (!plan) return "";
    return formatTransportBlock(plan, lang, departure);
  } catch (e) {
    console.warn("[transport-planner] failed, no block injected:", e);
    return "";
  }
}
