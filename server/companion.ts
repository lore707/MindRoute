// ─────────────────────────────────────────────────────────────────────────
// Travel companion (Fase 1) — context assembly + streaming reply.
//
// The companion knows three things:
//   1. WHO the user is        → trait prior (reused from trait-prior.ts)
//   2. WHAT the trip is        → a compact digest of the itinerary (v1 or v2)
//   3. WHERE in the trip we are → today vs tripMeta.travel_dates
//
// The big, stable block (profile + itinerary digest) is sent as the `system`
// param with cache_control:ephemeral so re-asking on the same trip is cheap.
// Default model is Haiku 4.5 for a snappy companion feel; the heavier turns
// (full day rebuilds, tool use) belong to Fase 2.
// ─────────────────────────────────────────────────────────────────────────

import { client } from "./matching-engine";
import { getTraitPriorForUser, formatTraitPriorBlock } from "./trait-prior";
import { computeCoverage } from "@shared/profile-coverage";
import { computeAccountInsights, continentOf } from "./account-insights";
import { getTripStatus } from "@shared/trip-status";
import type { Itinerary } from "@shared/schema";

const COMPANION_MODEL = "claude-haiku-4-5-20251001";

export type ChatTurn = { role: "user" | "assistant"; content: string };

// ── Where in the trip are we? ──────────────────────────────────────────────
// Returns a short human line, or null if we can't tell (v1 rows without dates,
// or unparseable date strings — degrade gracefully).
function tripPositionLine(itin: Itinerary): string | null {
  const dates = (itin as any).tripMeta?.travel_dates as { start?: string; end?: string } | undefined;
  if (!dates?.start) return null;
  const start = new Date(dates.start);
  const end = dates.end ? new Date(dates.end) : start;
  if (isNaN(+start)) return null;

  const now = new Date();
  const dayMs = 86_400_000;
  // Compare at day granularity (ignore time of day).
  const startDay = Math.floor(+start / dayMs);
  const endDay = Math.floor(+end / dayMs);
  const today = Math.floor(+now / dayMs);

  const totalDays = Math.max(1, endDay - startDay + 1);
  if (today < startDay) {
    const left = startDay - today;
    return `The trip hasn't started yet: ${left} day(s) to departure (${dates.start}).`;
  }
  if (today > endDay) {
    return `The trip is over (ended ${dates.end ?? dates.start}). The user is likely reminiscing or planning the next one.`;
  }
  const dayNo = today - startDay + 1;
  return `RIGHT NOW the user is on DAY ${dayNo} of ${totalDays} of this trip. Anchor your help to today's plan unless they ask otherwise.`;
}

// ── Phase of the journey ────────────────────────────────────────────────────
// Machine-readable counterpart of tripPositionLine: drives the two-act funnel
// (perfect-before vs consult-during) both in the prompt and in the UI chips.
export type TripPhase = "before" | "during" | "after" | "unknown";
export function tripPhaseInfo(itin: Itinerary): {
  phase: TripPhase; dayNo?: number; totalDays?: number; daysToDeparture?: number;
} {
  const dates = (itin as any).tripMeta?.travel_dates as { start?: string; end?: string } | undefined;
  if (!dates?.start) return { phase: "unknown" };
  const start = new Date(dates.start);
  const end = dates.end ? new Date(dates.end) : start;
  if (isNaN(+start)) return { phase: "unknown" };
  const dayMs = 86_400_000;
  const startDay = Math.floor(+start / dayMs);
  const endDay = Math.floor(+end / dayMs);
  const today = Math.floor(+Date.now() / dayMs);
  const totalDays = Math.max(1, endDay - startDay + 1);
  if (today < startDay) return { phase: "before", daysToDeparture: startDay - today, totalDays };
  if (today > endDay) return { phase: "after", totalDays };
  return { phase: "during", dayNo: today - startDay + 1, totalDays };
}

// ── L1/L2 signal block ──────────────────────────────────────────────────────
// What the user literally told us in the two onboarding levels, so the companion
// is the natural continuation of the funnel — not a generic chatbot.
//   L1 = the quick quiz (sensation/mode/duration/total budget).
//   L2 = progressive refinement (pace/companions/lodging/food/movement/avoid…).
// We also surface which L2 dimensions are STILL OPEN so the bot can close them
// conversationally and re-tune the plan.
function profilingSignalBlock(itin: Itinerary, lang: "en" | "it"): string {
  const p = (itin as any).profilingInput as any;
  if (!p || typeof p !== "object") return "";
  const l1 = p._l1 ?? {};
  const parts: string[] = [];
  if (l1.sensation) parts.push(`feeling they're after: ${l1.sensation}`);
  if (l1.mode) parts.push(`entry: ${l1.mode === "meta" ? "had a destination in mind" : "asked to be surprised"}`);
  if (l1.city) parts.push(`stated place: ${l1.city}`);
  if (typeof p.budgetTotalPerPerson === "number" && p.budgetTotalPerPerson > 0) {
    parts.push(`TOTAL budget target: €${Math.round(p.budgetTotalPerPerson)} per person, all-in excl. flights — they care about hitting it; check the plan against it when money comes up`);
  }
  if (p.days) parts.push(`duration: ${p.days} days`);

  let openLine = "";
  try {
    const cov = computeCoverage(p);
    if (cov.open.length > 0) {
      const labels = cov.open.map((d) => (lang === "it" ? d.label_it : d.label_en)).join(", ");
      openLine = `\nStill UNANSWERED about them (L2 gaps — ${cov.pct}% complete): ${labels}. When it helps the trip, gently ask ONE of these and, once answered, actually re-tune the plan (you can edit it).`;
    } else {
      openLine = `\nTheir profile is fully filled (100%).`;
    }
  } catch { /* coverage best-effort */ }

  if (parts.length === 0 && !openLine) return "";
  return `\n═══════════════════════════════════════
WHAT THEY TOLD US (their onboarding — L1 quick quiz + L2 refinement)
═══════════════════════════════════════
${parts.length ? "- " + parts.join("\n- ") : "(no quick-quiz detail on file)"}${openLine}`;
}

// ── Itinerary digest ───────────────────────────────────────────────────────
// Dispatch on schemaVersion (same contract the UI readers follow).
function digestV2(itin: Itinerary): string {
  const days: any[] = Array.isArray(itin.days) ? itin.days : [];
  const lines = days.map((d) => {
    const moments: any[] = Array.isArray(d.moments) ? d.moments : [];
    const ms = moments.map((m) => {
      const where = m.location_name ? ` @ ${m.location_name}` : "";
      const book = m.booking?.status && m.booking.status !== "walk_in" ? ` [${m.booking.status}]` : "";
      const cost = m.cost_max ?? m.cost_min;
      const costStr = typeof cost === "number" && cost > 0 ? ` ~€${cost}` : "";
      const idTag = m.id ? ` [id:${m.id}]` : "";
      return `    · ${m.time_label ?? ""} ${m.title_operational ?? m.title_evocative ?? ""}${where}${costStr}${book}${idTag}`.trim();
    }).join("\n");
    return `  Day ${d.day_number}${d.date ? ` (${d.date})` : ""} — ${d.title_evocative ?? ""} [${d.arc ?? ""}, energy: ${d.energy_level ?? "?"}]\n${ms}`;
  });
  const meta = (itin as any).tripMeta ?? {};
  return [
    `Destination: ${itin.destinationName ?? "?"}${itin.country ? `, ${itin.country}` : ""}`,
    meta.travel_dates ? `Dates: ${meta.travel_dates.start} → ${meta.travel_dates.end}` : "",
    meta.total_cost_range ? `Budget: ${meta.total_cost_range}` : "",
    itin.whyYours ? `Why this trip is theirs: ${itin.whyYours}` : "",
    "",
    "Day-by-day plan:",
    ...lines,
  ].filter(Boolean).join("\n");
}

function digestV1(itin: Itinerary): string {
  const days: any[] = Array.isArray(itin.days) ? itin.days : [];
  const lines = days.map((d) => {
    const slots = ["morning", "lunch", "afternoon", "evening"]
      .map((s) => (d[s] ? `    · ${s}: ${String(d[s]).slice(0, 220)}` : ""))
      .filter(Boolean)
      .join("\n");
    return `  Day ${d.dayNumber ?? "?"} — ${d.title ?? ""}\n${slots}`;
  });
  return [
    `Destination: ${itin.destinationName ?? "?"}${itin.country ? `, ${itin.country}` : ""}`,
    itin.bestTime ? `Best time: ${itin.bestTime}` : "",
    itin.budgetSummary ? `Budget: ${itin.budgetSummary}` : "",
    itin.whyYours ? `Why this trip is theirs: ${itin.whyYours}` : "",
    "",
    "Day-by-day plan:",
    ...lines,
  ].filter(Boolean).join("\n");
}

// ── Memoria dell'intero ecosistema ─────────────────────────────────────────
// Ciò che il companion sa dell'utente ATTRAVERSO MindRoute (non solo il viaggio
// aperto): quanti viaggi, dove gravita, durata tipica, mete recenti. È la base
// per fare lo "specchio" — osservazioni che solo la sua memoria rende possibili.
function crossTripBlock(trips: Itinerary[], currentId: number | undefined): string {
  if (!Array.isArray(trips) || trips.length <= 1) return ""; // primo viaggio → niente storico
  const ins = computeAccountInsights(trips);
  const recent = [...trips]
    .sort((a, b) => +new Date((b as any).createdAt ?? 0) - +new Date((a as any).createdAt ?? 0))
    .filter((t) => t.id !== currentId)
    .slice(0, 8)
    .map((t) => { const c = continentOf(t); return `${t.destinationName ?? "?"}${c ? ` (${c})` : ""}`; });
  const lines: string[] = [];
  lines.push(`Trips planned in MindRoute so far: ${ins.patterns.tripCount}.`);
  if (ins.patterns.topContinent && ins.patterns.topContinentRatio != null)
    lines.push(`Gravitates toward ${ins.patterns.topContinent} (${Math.round(ins.patterns.topContinentRatio * 100)}% of trips).`);
  if (ins.patterns.avgDays != null)
    lines.push(`Typical length ~${Math.round(ins.patterns.avgDays)} days${ins.patterns.shortTripBias ? " (leans short)" : ins.patterns.longTripBias ? " (leans long)" : ""}.`);
  if (recent.length) lines.push(`Recent destinations: ${recent.join(" · ")}.`);
  return `
═══════════════════════════════════════
WHAT YOU KNOW ABOUT THEM ACROSS MINDROUTE (their history — be the mirror only you can be)
═══════════════════════════════════════
${lines.join("\n")}
Use this to name real patterns ("your last trips were all coastal / low-nightlife / nature…") and to make proposals only your memory makes possible. Stay light: observe, don't lecture, and never force it when it doesn't fit.`;
}

export async function buildCompanionSystem(opts: {
  itinerary: Itinerary;
  userId: number | null;
  userName?: string | null;
  lang: "en" | "it";
  coords?: { lat: number; lng: number } | null;
  proactive?: boolean;
  trips?: Itinerary[];
}): Promise<string> {
  const { itinerary, userId, userName, lang, coords, proactive, trips } = opts;
  const crossBlock = crossTripBlock(trips ?? [], (itinerary as any).id);
  const prior = await getTraitPriorForUser(userId);
  const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
  const isV2 = (itinerary as any).schemaVersion === 2;
  const digest = isV2 ? digestV2(itinerary) : digestV1(itinerary);
  const position = tripPositionLine(itinerary);
  const { phase } = tripPhaseInfo(itinerary);
  const status = getTripStatus(itinerary);
  // A viaggio finito e non ancora confermato, il bot deve prima capire SE ci è
  // andato (set_trip_status) — è il segnale che rende reali gli insight.
  const needsCheckin = phase === "after" && status === "planned";
  const signalBlock = profilingSignalBlock(itinerary, lang);

  // Two-act funnel made explicit so the companion's role is obvious to itself —
  // and, through its behaviour, to the user.
  const phaseMission =
    phase === "during"
      ? `YOUR ROLE RIGHT NOW — ON-THE-SPOT CONSULTANT. They're traveling. Be the local fixer: what to do now, where to eat nearby, weather + plan B, last-minute swaps. Lead with the present moment. Use find_nearby and web_search liberally for REAL, current places and events — never generic advice.`
      : phase === "after"
      ? (needsCheckin
        ? `YOUR ROLE RIGHT NOW — the trip's dates have passed but you don't yet know if they actually went. FIRST find out: gently ask whether they made it (one light question). When they answer, call set_trip_status ("confirmed" if they went, "skipped" if they didn't) — this is what makes their profile real, not just planned. If they went, then help them save the moments they loved and reflect; if they didn't, no guilt — just note it and offer to seed the next trip.`
        : `YOUR ROLE RIGHT NOW — they're back. Help them save the moments they loved and seed the next trip.`)
      : `YOUR ROLE RIGHT NOW — PERFECT THE TRIP BEFORE DEPARTURE. The plan exists; your job is to make it even more theirs: refine pace, swap weak moments, fill the open L2 gaps (ask one, then re-tune the plan), pressure-test the budget, and research real alternatives on the web. Be the finishing pass on their itinerary.`;
  const locLine = coords
    ? `\nThe traveller's CURRENT location is lat ${coords.lat.toFixed(4)}, lng ${coords.lng.toFixed(4)}. Use the find_nearby tool to ground "near me / right now" suggestions in real places.`
    : "";

  const langLine = lang === "it"
    ? "Reply in ITALIAN. Warm, concise, like a knowledgeable friend — not a brochure."
    : "Reply in ENGLISH. Warm, concise, like a knowledgeable friend — not a brochure.";

  return `You are MindRoute's travel companion: a personal guide who already knows this traveller and their trip, and stays with them before, during and after the journey. You are the THIRD act of their onboarding — L1 built the trip, L2 refined it, and you perfect and then live it with them.

${langLine}

${phaseMission}

How you behave:
- You already have their itinerary below — never ask them to paste it again.
- Be practical and specific: name the actual places, days and moments from their plan.
- During the trip, anchor advice to where they are today. If they ask "what now / where do I eat", call find_nearby and reason from real options plus today's moments.
- When the user wants to keep or remember a place/activity that is part of their plan, call save_moment with that moment's id (the [id:...] tag in the plan below) so it lands in their saved collection. Only the moments listed below have ids; never invent one.
- You can ACTUALLY edit the plan: remove_moment drops a moment, replace_moment swaps one, add_moment adds a new stop, and regenerate_day rebuilds a WHOLE day from scratch (use it when they want a whole day reworked — "make day 3 relaxed", "redo day 2 around food"). Propose the change in words first; only call the tool once the user clearly agrees ("yes", "do it", "redo it"). For anything "near me / nearby", call find_nearby first and use a REAL place + its coordinates. After editing, tell them it's done — the plan refreshes on their screen.
- Keep replies short by default (a few sentences). Expand only when they ask for detail.
- TONE — you OBSERVE, REMEMBER and SUGGEST. Speak little; but when you speak, say something only your memory of THIS traveller makes possible. The traveller is the protagonist: frame insight as "here's what I've learned about you", never "look how clever I am". Never fake intimacy ("I missed you", "so glad you're back") — it reads artificial. No "How can I help?" — that puts the work on them; you already know enough to lead.
- BOOKING LINKS ARE MANDATORY: whenever you PROPOSE or RECOMMEND something bookable — a place, activity, tour, restaurant, hotel, swap or added stop — you MUST call get_booking_link (pass its category and name) and include the EXACT url it returns in the same reply, as a clear "Book it: <url>". Never invent a URL, and never propose a bookable thing without its link. Only purely free/walk-in things (a public square, a stroll) need no link.
- You can SEARCH THE WEB (web_search) for real, current info: actual restaurants and their reviews, monuments and sights, events happening during the trip, "what's the best X in <place>". Use it when the itinerary and find_nearby aren't enough, and prefer real named places over generic advice. When you recommend a real place found via search, still call get_booking_link to hand over its booking link.
- For WEATHER, you have a real forecast: call get_weather instead of guessing. Use it to advise on a day (beach vs indoors, rain plan, what to pack) — proactively when it clearly matters.
- If you don't know something else real-time (live opening hours, ticket availability), say so plainly and give your best informed guess.
${isV2 ? "" : "\nNOTE: this is a legacy itinerary without per-moment ids — save_moment is unavailable here; just talk the user through it."}
${userName ? `\nThe traveller's name is ${userName}.` : ""}
${position ? `\n${position}` : ""}${locLine}
${proactive ? `
═══════════════════════════════════════
PROACTIVE OPENER — the user just opened you. Do NOT wait, and NEVER open with "how can I help". Lead with ONE precise observation only YOU could make (from their profile, THIS plan, or their history across MindRoute), then offer ONE concrete next step. ~3–5 lines, no re-listing the plan.
${phase === "during"
  ? `· During the trip: call get_weather and lead with today (weather + one practical tip). Optionally add ONE fresh, real, bookable idea near them (find_nearby / web_search, then get_booking_link).`
  : needsCheckin
  ? `· The trip's dates have passed and you don't know yet if they went. Open by warmly asking whether they actually made it to ${itinerary.destinationName ?? "the trip"} — nothing else. When they reply, call set_trip_status (confirmed/skipped). Only after that, if they went, ask what they'd do again and their single best moment. Keep it to one short, human question now.`
  : phase === "after"
  ? `· After the trip: don't pitch anything. In one short message ask the three reflection questions — what they'd do again, what they'd skip, the single best moment — and tell them their answers sharpen their profile for next time.`
  : `· Before departure: scan THIS plan against what you know about them and surface the SINGLE most useful thing — a day that contradicts their stated pace ("Day X looks busier than the relaxed rhythm you wanted — want me to slow it down?"), a key booking still missing close to departure, a budget that won't hold, or a cross-trip pattern worth naming. Then offer to act (you can actually edit the plan).`}
End with one short, low-pressure question.
═══════════════════════════════════════` : ""}
${crossBlock}
${priorBlock}
${signalBlock}
═══════════════════════════════════════
THEIR ITINERARY
═══════════════════════════════════════
${digest}`;
}

// ── Fase 2: agentic tools ──────────────────────────────────────────────────
// Two safe, high-value tools. save_moment is reversible (delete from account)
// and internal; find_nearby is read-only. Heavier/destructive actions (day
// rebuilds) stay out until v2 has a proper regen path.
const COMPANION_TOOLS = [
  {
    name: "save_moment",
    description:
      "Save (bookmark) a specific moment from THIS itinerary into the traveller's saved collection so they can find it later in their account. Use when the user wants to keep/remember/save a place or activity that is part of their plan. Only moments listed in the plan with an [id:...] tag can be saved.",
    input_schema: {
      type: "object" as const,
      properties: {
        moment_id: { type: "string", description: "The id of the moment to save, copied exactly from the [id:...] tag in the plan." },
      },
      required: ["moment_id"],
    },
  },
  {
    name: "find_nearby",
    description:
      "Find REAL, existing places near the traveller's current location (from OpenStreetMap). Call this BEFORE recommending where to go now / what's nearby, so suggestions are real, not invented. If location is unknown it returns nothing — then reason from the itinerary instead.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: { type: "string", description: "Optional kind of place: 'food', 'museum', 'viewpoint', 'park', or 'landmark'." },
      },
    },
  },
  {
    name: "get_weather",
    description:
      "Get the REAL current weather and 6-day forecast for the trip's location (or the traveller's live position if available). Call this whenever weather is relevant: the user asks about it, or you're advising on what to do on a given day (beach vs museum, rain plan, what to pack). Never guess weather — use this.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "remove_moment",
    description:
      "Remove a moment from the traveller's plan (it disappears from that day). Use ONLY after the user has clearly agreed to drop it. Only moments listed with an [id:...] tag can be removed.",
    input_schema: {
      type: "object" as const,
      properties: {
        moment_id: { type: "string", description: "The id of the moment to remove, copied exactly from its [id:...] tag." },
      },
      required: ["moment_id"],
    },
  },
  {
    name: "replace_moment",
    description:
      "Replace a moment in the plan with a different place/activity. Use ONLY after the user agreed to the swap. Prefer REAL places: if the swap is 'something near me / nearby', call find_nearby first and pass a real place's name and coordinates. Keeps the same slot/day.",
    input_schema: {
      type: "object" as const,
      properties: {
        moment_id: { type: "string", description: "The id of the moment being replaced (from its [id:...] tag)." },
        new_title: { type: "string", description: "Short title of the new place/activity." },
        new_location_name: { type: "string", description: "Optional real place name (for maps/booking)." },
        lat: { type: "number", description: "Optional latitude of the new place (use find_nearby's value when available)." },
        lng: { type: "number", description: "Optional longitude of the new place." },
        note: { type: "string", description: "Optional one-line description of what they'll do there." },
      },
      required: ["moment_id", "new_title"],
    },
  },
  {
    name: "get_booking_link",
    description:
      "Get the REAL affiliate booking link for anything you propose (activity, tour, restaurant, place, hotel, flight, transport) or for a specific moment. Always returns a real URL to hand over — never invent booking URLs yourself. Call this every time you recommend something bookable.",
    input_schema: {
      type: "object" as const,
      properties: {
        moment_id: { type: "string", description: "Optional: the [id:...] of the moment, if the recommendation is an existing plan moment." },
        category: { type: "string", description: "Kind of thing: 'experience'/'tour'/'activity', 'restaurant', 'hotel', 'flight', 'transport'. Drives which partner is used." },
        query: { type: "string", description: "The place/activity name to search (e.g. 'Sagrada Familia tickets', 'sushi omakase'). Used to build a targeted link." },
      },
    },
  },
  {
    name: "regenerate_day",
    description:
      "Rebuild an ENTIRE day of the plan from scratch based on what the user wants (e.g. 'make day 3 more relaxed', 'redo day 2 around food and markets'). Heavier than add/replace — use ONLY when the user wants a whole day reworked and has agreed. v2 plans only.",
    input_schema: {
      type: "object" as const,
      properties: {
        day_number: { type: "number", description: "Which day to rebuild (the Day N number in the plan)." },
        feedback: { type: "string", description: "What they want different about that day (mood, theme, pace). Empty = just refresh it." },
      },
      required: ["day_number"],
    },
  },
  {
    name: "set_trip_status",
    description:
      "Record whether the traveller ACTUALLY went on this trip, once its dates have passed. Call it after they tell you they made it ('confirmed') or that they didn't go ('skipped'). This is what turns their profile from intention into real, revealed preference — call it as soon as their answer is clear, then continue the conversation naturally.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", description: "'confirmed' if they went on the trip, 'skipped' if they did not." },
      },
      required: ["status"],
    },
  },
  {
    name: "add_moment",
    description:
      "Add a NEW moment/stop to a given day of the plan. Use ONLY after the user agreed. Prefer real places (call find_nearby for 'near me' additions and pass real coordinates). The day_number must be one that exists in the plan.",
    input_schema: {
      type: "object" as const,
      properties: {
        day_number: { type: "number", description: "Which day to add it to (the Day N number shown in the plan)." },
        title: { type: "string", description: "Short title of the new place/activity." },
        time_label: { type: "string", description: "Optional time/slot label, e.g. '20:00' or 'Evening'." },
        location_name: { type: "string", description: "Optional real place name." },
        lat: { type: "number", description: "Optional latitude (use find_nearby's value when available)." },
        lng: { type: "number", description: "Optional longitude." },
        note: { type: "string", description: "Optional one-line description." },
      },
      required: ["day_number", "title"],
    },
  },
];

export type CompanionToolEvent = { tool: string; label: string };

export interface CompanionToolContext {
  itinerary: Itinerary;
  userId: number | null;
  coords?: { lat: number; lng: number } | null;
  // Coordinate del viaggio (fallback per il meteo quando manca il GPS live).
  tripCoords?: { lat: number; lng: number } | null;
  lang: "en" | "it";
  saveMoment: (row: {
    userId: number;
    itineraryId: number;
    momentId: string;
    momentSnapshot: any;
  }) => Promise<void>;
  alreadySaved: (userId: number, itineraryId: number, momentId: string) => Promise<boolean>;
  // Persiste i giorni modificati (remove/replace moment). Salva l'intero array.
  saveDays?: (days: any[]) => Promise<void>;
  // Persiste giorni + tripMeta (per ri-allineare i pin mappa dopo un edit).
  saveTrip?: (days: any[], tripMeta: any) => Promise<void>;
  // Registra se il viaggio è stato fatto (confirmed) o no (skipped).
  setTripStatus?: (status: "confirmed" | "skipped") => Promise<void>;
}

// Coordinate rappresentative del viaggio: usate dal meteo quando manca il GPS.
// Prima le map_points v2, poi i momenti geolocalizzati, poi i mapPoints v1.
export function itineraryCoords(itin: Itinerary): { lat: number; lng: number } | null {
  const meta = (itin as any).tripMeta ?? {};
  const mp = Array.isArray(meta.map_points) ? meta.map_points : [];
  for (const p of mp) if (typeof p?.lat === "number" && typeof p?.lng === "number") return { lat: p.lat, lng: p.lng };
  const days: any[] = Array.isArray(itin.days) ? itin.days : [];
  for (const d of days) {
    for (const m of (Array.isArray(d.moments) ? d.moments : [])) {
      if (typeof m?.location_lat === "number" && typeof m?.location_lng === "number") return { lat: m.location_lat, lng: m.location_lng };
    }
    for (const p of (Array.isArray(d.mapPoints) ? d.mapPoints : [])) {
      if (typeof p?.lat === "number" && typeof p?.lng === "number") return { lat: p.lat, lng: p.lng };
    }
  }
  return null;
}

// map_points v2 ricalcolati dai momenti geolocalizzati del piano: usati per
// tenere i PIN della mappa allineati dopo un edit del bot (la mappa v2 legge
// tripMeta.map_points, non i momenti per-giorno).
function mapPointsFromDays(days: any[]): { day: number; lat: number; lng: number; label: string }[] {
  const out: { day: number; lat: number; lng: number; label: string }[] = [];
  for (const d of (Array.isArray(days) ? days : [])) {
    for (const m of (Array.isArray(d.moments) ? d.moments : [])) {
      if (typeof m?.location_lat === "number" && typeof m?.location_lng === "number") {
        out.push({ day: d.day_number ?? 0, lat: m.location_lat, lng: m.location_lng, label: m.location_name || m.title_operational || m.title_evocative || "" });
      }
    }
  }
  return out;
}

// WMO weather code → etichetta breve + emoji, EN/IT.
function describeWeather(code: number, it: boolean): string {
  const m: Record<number, [string, string, string]> = {
    0: ["☀️", "Clear", "Sereno"],
    1: ["🌤️", "Mostly clear", "Quasi sereno"],
    2: ["⛅", "Partly cloudy", "Poco nuvoloso"],
    3: ["☁️", "Overcast", "Coperto"],
    45: ["🌫️", "Fog", "Nebbia"], 48: ["🌫️", "Rime fog", "Nebbia ghiacciata"],
    51: ["🌦️", "Light drizzle", "Pioviggine leggera"], 53: ["🌦️", "Drizzle", "Pioviggine"], 55: ["🌦️", "Heavy drizzle", "Pioviggine intensa"],
    61: ["🌧️", "Light rain", "Pioggia debole"], 63: ["🌧️", "Rain", "Pioggia"], 65: ["🌧️", "Heavy rain", "Pioggia forte"],
    66: ["🌧️", "Freezing rain", "Pioggia gelata"], 67: ["🌧️", "Freezing rain", "Pioggia gelata"],
    71: ["🌨️", "Light snow", "Neve debole"], 73: ["🌨️", "Snow", "Neve"], 75: ["❄️", "Heavy snow", "Neve forte"], 77: ["🌨️", "Snow grains", "Nevischio"],
    80: ["🌦️", "Light showers", "Rovesci leggeri"], 81: ["🌧️", "Showers", "Rovesci"], 82: ["⛈️", "Violent showers", "Rovesci violenti"],
    85: ["🌨️", "Snow showers", "Rovesci di neve"], 86: ["❄️", "Snow showers", "Rovesci di neve"],
    95: ["⛈️", "Thunderstorm", "Temporale"], 96: ["⛈️", "Thunderstorm + hail", "Temporale e grandine"], 99: ["⛈️", "Thunderstorm + hail", "Temporale e grandine"],
  };
  const e = m[code] ?? ["🌡️", "Unknown", "Indefinito"];
  return `${e[0]} ${it ? e[2] : e[1]}`;
}

async function fetchWeather(lat: number, lng: number, it: boolean): Promise<string | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=7`;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(to);
    if (!r.ok) return null;
    const d: any = await r.json();
    const cur = d.current ? `${it ? "Ora" : "Now"}: ${Math.round(d.current.temperature_2m)}°C, ${describeWeather(d.current.weather_code, it)}` : "";
    const days = d.daily?.time ?? [];
    const rows = days.slice(0, 6).map((date: string, i: number) => {
      const hi = Math.round(d.daily.temperature_2m_max[i]);
      const lo = Math.round(d.daily.temperature_2m_min[i]);
      const pop = d.daily.precipitation_probability_max?.[i];
      const popStr = typeof pop === "number" ? `, ${pop}% ${it ? "pioggia" : "rain"}` : "";
      return `${date}: ${describeWeather(d.daily.weather_code[i], it)} ${lo}–${hi}°C${popStr}`;
    });
    return [cur, ...rows].filter(Boolean).join("\n");
  } catch {
    return null;
  }
}

function findMomentById(itin: Itinerary, momentId: string): any | null {
  const days: any[] = Array.isArray(itin.days) ? itin.days : [];
  for (const d of days) {
    for (const m of (Array.isArray(d.moments) ? d.moments : [])) {
      if (m.id === momentId) return { moment: m, day: d };
    }
  }
  return null;
}

// Match best-effort di un momento per nome/luogo. Serve a far citare al bot lo
// STESSO link affiliato già nel piano quando l'utente vuole prenotare una cosa
// che è già nell'itinerario — invece di costruire un link nuovo e diverso.
function findBookableMomentByName(itin: Itinerary, query: string): any | null {
  const q = (query ?? "").trim().toLowerCase();
  if (q.length < 3) return null;
  const days: any[] = Array.isArray(itin.days) ? itin.days : [];
  for (const d of days) {
    for (const m of (Array.isArray(d.moments) ? d.moments : [])) {
      const b = m.booking;
      if (!b?.affiliate_url || b.status === "walk_in" || b.provider === "none") continue;
      const hay = `${m.location_name ?? ""} ${m.title_operational ?? ""} ${m.title_evocative ?? ""}`.toLowerCase();
      if (hay.includes(q)) return { moment: m, day: d };
    }
  }
  return null;
}

async function executeTool(
  name: string,
  input: any,
  ctx: CompanionToolContext,
): Promise<{ result: string; label: string }> {
  const it = ctx.lang === "it";
  if (name === "save_moment") {
    if (ctx.userId == null) return { result: "User not logged in; cannot save.", label: it ? "Salvataggio non riuscito" : "Couldn't save" };
    if ((ctx.itinerary as any).schemaVersion !== 2) {
      return { result: "This itinerary has no saveable moments (legacy format).", label: it ? "Non salvabile" : "Not saveable" };
    }
    const hit = findMomentById(ctx.itinerary, String(input?.moment_id ?? ""));
    if (!hit) return { result: `No moment with id "${input?.moment_id}" exists in this itinerary.`, label: it ? "Momento non trovato" : "Moment not found" };
    const { moment: m, day: d } = hit;
    const title = m.title_evocative ?? m.title_operational ?? "Momento";
    if (await ctx.alreadySaved(ctx.userId, ctx.itinerary.id, m.id)) {
      return { result: `"${title}" is already in the saved collection.`, label: it ? `Già salvato: ${title}` : `Already saved: ${title}` };
    }
    await ctx.saveMoment({
      userId: ctx.userId,
      itineraryId: ctx.itinerary.id,
      momentId: m.id,
      momentSnapshot: {
        title,
        image_url: m.image_url ?? null,
        location_name: m.location_name ?? null,
        destination_name: (ctx.itinerary as any).destinationName ?? null,
        day_number: d.day_number ?? null,
        type: m.type ?? null,
      },
    });
    return { result: `Saved "${title}" to the traveller's collection.`, label: it ? `Salvato: ${title}` : `Saved: ${title}` };
  }

  if (name === "set_trip_status") {
    if (ctx.userId == null) return { result: "User not logged in; cannot record trip status.", label: it ? "Non registrato" : "Not recorded" };
    if (!ctx.setTripStatus) return { result: "Recording trip status is unavailable here.", label: it ? "Non disponibile" : "Unavailable" };
    const raw = String(input?.status ?? "").toLowerCase();
    const status: "confirmed" | "skipped" | null =
      /(confirm|went|yes|si|sì|fatto|andato|ci sono)/.test(raw) ? "confirmed"
      : /(skip|didn|not|no|non|salt|rimand)/.test(raw) ? "skipped"
      : raw === "confirmed" ? "confirmed" : raw === "skipped" ? "skipped" : null;
    if (!status) return { result: `Unclear status "${input?.status}". Pass "confirmed" or "skipped".`, label: it ? "Stato poco chiaro" : "Unclear status" };
    try {
      await ctx.setTripStatus(status);
      (ctx.itinerary as any).tripMeta = { ...((ctx.itinerary as any).tripMeta ?? {}), trip_status: status };
      return status === "confirmed"
        ? { result: "Recorded: the traveller WENT on this trip. Their profile now counts this as a real trip. Continue warmly (what they'd do again, best moment).", label: it ? "Viaggio confermato" : "Trip confirmed" }
        : { result: "Recorded: the traveller did NOT go. No guilt — acknowledge lightly and, if it fits, offer to seed the next trip.", label: it ? "Viaggio saltato" : "Trip skipped" };
    } catch (e) {
      console.error("[companion] set_trip_status error:", e);
      return { result: "Couldn't record it; continue without.", label: it ? "Non registrato" : "Not recorded" };
    }
  }

  if (name === "remove_moment" || name === "replace_moment" || name === "add_moment" || name === "regenerate_day") {
    if (ctx.userId == null) return { result: "User not logged in; cannot edit the plan.", label: it ? "Modifica non riuscita" : "Couldn't edit" };
    if ((ctx.itinerary as any).schemaVersion !== 2) {
      return { result: "This itinerary can't be edited from chat (legacy format).", label: it ? "Non modificabile" : "Not editable" };
    }
    if (!ctx.saveTrip && !ctx.saveDays) return { result: "Editing unavailable.", label: it ? "Non modificabile" : "Not editable" };
    const days: any[] = Array.isArray(ctx.itinerary.days) ? ctx.itinerary.days : [];
    // Persiste i giorni e ri-allinea i pin mappa (tripMeta.map_points) all'edit.
    const persistEdit = async (d: any[]) => {
      const meta = { ...((ctx.itinerary as any).tripMeta ?? {}), map_points: mapPointsFromDays(d) };
      (ctx.itinerary as any).tripMeta = meta;
      if (ctx.saveTrip) await ctx.saveTrip(d, meta);
      else if (ctx.saveDays) await ctx.saveDays(d);
    };

    if (name === "regenerate_day") {
      const dayNo = Number(input?.day_number);
      const idx = days.findIndex((d: any) => d.day_number === dayNo);
      if (idx < 0) return { result: `No day ${input?.day_number} in this plan.`, label: it ? "Giorno non trovato" : "Day not found" };
      const dest = (ctx.itinerary as any).destinationName ?? "";
      const feedback = String(input?.feedback ?? "").trim();
      const contextSummary = days
        .filter((_: any, i: number) => i !== idx)
        .map((d: any) => `Day ${d.day_number}: ${d.title_evocative ?? ""} — ${(Array.isArray(d.moments) ? d.moments : []).map((m: any) => m.location_name || m.title_operational).filter(Boolean).join(", ")}`)
        .join("\n");
      try {
        const { regenerateDayV2 } = await import("./matching-engine-v2");
        const { enrichDayV2 } = await import("./routes/itinerary-gen-v2");
        const newDay = await regenerateDayV2(dest, days[idx], feedback, contextSummary, it ? "it" : "en");
        await enrichDayV2(newDay as any, dest, (ctx.itinerary as any).profilingInput);
        days[idx] = newDay;
        await persistEdit(days);
        return { result: `Rebuilt Day ${dayNo}. The plan is updated.`, label: it ? `Rigenerato il giorno ${dayNo}` : `Rebuilt day ${dayNo}` };
      } catch (e) {
        console.error("[companion] regenerate_day error:", e);
        return { result: "Couldn't rebuild that day; try again.", label: it ? "Rigenerazione fallita" : "Rebuild failed" };
      }
    }

    if (name === "add_moment") {
      const dayNo = Number(input?.day_number);
      const day = days.find((d: any) => d.day_number === dayNo);
      if (!day) return { result: `No day ${input?.day_number} in this plan.`, label: it ? "Giorno non trovato" : "Day not found" };
      const title = String(input?.title ?? "").trim();
      if (!title) return { result: "add_moment needs a title.", label: it ? "Titolo mancante" : "Missing title" };
      const newMoment: any = {
        id: `comp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        time_label: typeof input?.time_label === "string" && input.time_label.trim() ? input.time_label.trim() : (it ? "Aggiunto" : "Added"),
        title_operational: title,
        title_evocative: title,
        type: "activity",
      };
      if (typeof input?.note === "string" && input.note.trim()) newMoment.description = input.note.trim();
      if (typeof input?.location_name === "string" && input.location_name.trim()) newMoment.location_name = input.location_name.trim();
      if (Number.isFinite(input?.lat) && Number.isFinite(input?.lng)) { newMoment.location_lat = Number(input.lat); newMoment.location_lng = Number(input.lng); }
      try {
        const { fetchUnsplashHero } = await import("./unsplash");
        const img = await fetchUnsplashHero((newMoment.location_name ? `${newMoment.location_name} ` : "") + title);
        if (img?.url) newMoment.image_url = img.url;
      } catch { /* nessuna immagine */ }
      day.moments = [...(Array.isArray(day.moments) ? day.moments : []), newMoment];
      await persistEdit(days);
      return { result: `Added "${title}" to Day ${dayNo}. The plan is updated.`, label: it ? `Aggiunto: ${title}` : `Added: ${title}` };
    }

    const hit = findMomentById(ctx.itinerary, String(input?.moment_id ?? ""));
    if (!hit) return { result: `No moment with id "${input?.moment_id}" exists in this itinerary.`, label: it ? "Momento non trovato" : "Moment not found" };

    if (name === "remove_moment") {
      const title = hit.moment.title_evocative ?? hit.moment.title_operational ?? "moment";
      hit.day.moments = (hit.day.moments ?? []).filter((m: any) => m.id !== hit.moment.id);
      await persistEdit(days);
      return { result: `Removed "${title}" from Day ${hit.day.day_number}. The plan is updated.`, label: it ? `Rimosso: ${title}` : `Removed: ${title}` };
    }

    // replace_moment
    const newTitle = String(input?.new_title ?? "").trim();
    if (!newTitle) return { result: "replace_moment needs a new_title.", label: it ? "Titolo mancante" : "Missing title" };
    const m = hit.moment;
    const oldTitle = m.title_evocative ?? m.title_operational ?? "moment";
    m.title_operational = newTitle;
    m.title_evocative = newTitle;
    if (typeof input?.note === "string" && input.note.trim()) m.description = input.note.trim();
    if (typeof input?.new_location_name === "string" && input.new_location_name.trim()) m.location_name = input.new_location_name.trim();
    if (Number.isFinite(input?.lat) && Number.isFinite(input?.lng)) { m.location_lat = Number(input.lat); m.location_lng = Number(input.lng); }
    // Immagine best-effort per il nuovo posto (non bloccare oltre pochi secondi).
    try {
      const { fetchUnsplashHero } = await import("./unsplash");
      const q = (m.location_name ? `${m.location_name} ` : "") + newTitle;
      const img = await fetchUnsplashHero(q);
      if (img?.url) m.image_url = img.url;
    } catch { /* tieni l'immagine vecchia */ }
    await persistEdit(days);
    return { result: `Replaced "${oldTitle}" with "${newTitle}" on Day ${hit.day.day_number}. The plan is updated.`, label: it ? `Sostituito: ${newTitle}` : `Replaced: ${newTitle}` };
  }

  if (name === "get_booking_link") {
    const itin = ctx.itinerary as any;
    const dest = itin.destinationName ?? "";
    const td = itin.tripMeta?.travel_dates ?? {};
    let category = String(input?.category ?? "").toLowerCase();
    let query = String(input?.query ?? "").trim();

    // 1) Link a livello di momento (dati strutturati v2: booking.affiliate_url) —
    //    è il migliore quando esiste (provider giusto, deep-link reale).
    const mid = String(input?.moment_id ?? "").trim();
    if (mid) {
      const hit = findMomentById(ctx.itinerary, mid);
      const b = hit?.moment?.booking;
      if (b?.affiliate_url && b.status !== "walk_in" && b.provider !== "none") {
        return {
          result: `Booking link for "${hit.moment.title_evocative ?? hit.moment.title_operational ?? "moment"}":\nProvider: ${b.provider}\nLabel: ${b.display_label ?? ""}\nURL: ${b.affiliate_url}\nHand this exact URL to the traveller.`,
          label: it ? "Trovo come prenotare" : "Finding how to book",
        };
      }
      // Momento senza link strutturato (es. aggiunto in chat): ricaviamo categoria
      // e query dal momento per costruire comunque un link affiliato.
      if (hit && !query) query = hit.moment.location_name || hit.moment.title_operational || hit.moment.title_evocative || "";
      if (hit && !category) category = String(hit.moment.type ?? "");
    }

    // 1b) La cosa richiesta è GIÀ nel piano? Cita lo STESSO link dell'itinerario
    //     (coerenza: il bot non inventa un link diverso per un posto già pianificato).
    if (query) {
      const byName = findBookableMomentByName(ctx.itinerary, query);
      if (byName) {
        const b = byName.moment.booking;
        return {
          result: `Booking link (already in the plan) for "${byName.moment.title_evocative ?? byName.moment.title_operational ?? "moment"}":\nProvider: ${b.provider}\nLabel: ${b.display_label ?? ""}\nURL: ${b.affiliate_url}\nHand this exact URL to the traveller — it is the same link as in their itinerary.`,
          label: it ? "Trovo come prenotare" : "Finding how to book",
        };
      }
    }

    // 2) Costruiamo SEMPRE un link affiliato reale per la proposta.
    const { viatorSearchUrl, hotelsComUrl } = await import("./affiliate-config");
    const c = category;
    const q = query || dest;
    let provider = "", url = "";
    if (/(hotel|stay|sleep|accommodation|alloggio|dormire)/.test(c)) {
      provider = "Hotels.com"; url = hotelsComUrl(dest || q, td.start, td.end);
    } else if (/(flight|volo|transport|train|bus|car|transfer)/.test(c)) {
      // Voli/transfer: i link migliori (con tratta/date) sono nei topAffiliateLinks.
      const top = itin.topAffiliateLinks as Record<string, string> | null | undefined;
      const key = Object.keys(top ?? {}).find((k) => /flight|expedia|car|flixbus|train/.test(k.toLowerCase()));
      if (top && key) { provider = key; url = top[key]; }
      else { provider = "Viator"; url = viatorSearchUrl(`${q} transport`); }
    } else {
      // attività, tour, esperienze, ristoranti, luoghi → Viator (globale, per testo).
      provider = "Viator"; url = viatorSearchUrl(`${q} ${dest}`.trim());
    }

    if (url) {
      return { result: `Affiliate booking link to hand over EXACTLY (do not alter):\nProvider: ${provider}\nURL: ${url}`, label: it ? "Trovo come prenotare" : "Finding how to book" };
    }
    return { result: "Point them to the Book tab of their itinerary.", label: it ? "Vedi scheda Prenota" : "See the Book tab" };
  }

  if (name === "get_weather") {
    const c = ctx.coords ?? ctx.tripCoords ?? null;
    if (!c) {
      return { result: "No coordinates available for this trip; can't fetch real weather.", label: it ? "Meteo non disponibile" : "Weather unavailable" };
    }
    const forecast = await fetchWeather(c.lat, c.lng, it);
    if (!forecast) {
      return { result: "Weather service unavailable right now.", label: it ? "Meteo non raggiungibile" : "Weather unavailable" };
    }
    const where = ctx.coords ? (it ? "posizione attuale" : "current location") : (it ? "destinazione" : "destination");
    return {
      result: `Real weather (${where}):\n${forecast}`,
      label: it ? "Controllo il meteo" : "Checking the weather",
    };
  }

  if (name === "find_nearby") {
    if (!ctx.coords) {
      return { result: "Traveller location is unknown — no nearby data. Reason from the itinerary instead.", label: it ? "Posizione non disponibile" : "Location unavailable" };
    }
    const { fetchNearbyAnchors } = await import("./experience-bank");
    const places = await fetchNearbyAnchors(ctx.coords.lat, ctx.coords.lng, input?.category);
    if (!places.length) {
      return { result: "No real places found nearby for that query.", label: it ? "Niente nelle vicinanze" : "Nothing nearby" };
    }
    const list = places
      .map((p) => {
        const bits = [`${p.distance_m != null ? `${p.distance_m}m` : ""}`, p.cuisine ? `cuisine: ${p.cuisine}` : "", p.opening_hours ? `hours: ${p.opening_hours}` : "", p.website ? `site: ${p.website}` : ""].filter(Boolean).join(" · ");
        return `- ${p.name} (${p.type})${bits ? ` — ${bits}` : ""}`;
      })
      .join("\n");
    // Ora UTC: il modello la combina con la destinazione (di cui conosce il fuso)
    // per stimare se un posto è aperto adesso. Gli opening_hours sono in formato OSM.
    const nowUtc = new Date().toISOString().slice(0, 16).replace("T", " ");
    return {
      result: `Current time (UTC): ${nowUtc}. Reason about local opening hours (OSM format) vs the destination's timezone before saying a place is open now; if hours are missing or you're unsure, say so.\nReal places near the traveller right now:\n${list}`,
      label: it ? "Cerco posti vicini" : "Finding places nearby",
    };
  }

  return { result: `Unknown tool: ${name}`, label: name };
}

// Agentic reply loop: stream text, run any tools the model calls, continue
// until it stops. `onChunk` streams visible text; `onTool` surfaces tool
// actions to the UI. Resolves with the full visible assistant text.
export async function runCompanionAgent(opts: {
  system: string;
  history: ChatTurn[];
  message: string;
  ctx: CompanionToolContext;
  onChunk: (text: string) => void;
  onTool?: (ev: CompanionToolEvent) => void;
}): Promise<string> {
  const { system, history, message, ctx, onChunk, onTool } = opts;
  const messages: any[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  const systemBlock = [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }];
  let full = "";
  let webSearchEmitted = false;
  const MAX_TURNS = 6; // guard against tool loops (web search può aggiungere giri)

  // web_search è un tool SERVER-side (Anthropic lo esegue): su Haiku 4.5 si usa la
  // variante base. Dà al bot accesso al web reale (ristoranti, monumenti, eventi).
  const tools = [...COMPANION_TOOLS, { type: "web_search_20250305" as const, name: "web_search", max_uses: 4 }];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model: COMPANION_MODEL,
      max_tokens: 1200,
      system: systemBlock,
      tools: tools as any,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        full += event.delta.text;
        onChunk(event.delta.text);
      } else if (event.type === "content_block_start" && (event as any).content_block?.type === "server_tool_use" && !webSearchEmitted) {
        // Segnala all'utente che il bot sta cercando sul web (una volta).
        webSearchEmitted = true;
        onTool?.({ tool: "web_search", label: ctx.lang === "it" ? "Cerco sul web" : "Searching the web" });
      }
    }

    const finalMsg = await stream.finalMessage();
    messages.push({ role: "assistant", content: finalMsg.content });

    // pause_turn: il loop server-side (web search) ha raggiunto il limite ma non
    // ha finito — rimanda lo stesso contesto per farlo riprendere.
    if (finalMsg.stop_reason === "pause_turn") continue;

    const toolUses = finalMsg.content.filter((b: any) => b.type === "tool_use");
    if (finalMsg.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const toolResults: any[] = [];
    for (const tu of toolUses as any[]) {
      let result: string, label: string;
      try {
        ({ result, label } = await executeTool(tu.name, tu.input, ctx));
      } catch (err) {
        console.error("[companion] tool error:", tu.name, err);
        result = "Tool failed.";
        label = tu.name;
      }
      onTool?.({ tool: tu.name, label });
      toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: result });
    }
    messages.push({ role: "user", content: toolResults });
  }

  return full;
}
