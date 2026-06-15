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

export async function buildCompanionSystem(opts: {
  itinerary: Itinerary;
  userId: number | null;
  userName?: string | null;
  lang: "en" | "it";
  coords?: { lat: number; lng: number } | null;
}): Promise<string> {
  const { itinerary, userId, userName, lang, coords } = opts;
  const prior = await getTraitPriorForUser(userId);
  const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
  const isV2 = (itinerary as any).schemaVersion === 2;
  const digest = isV2 ? digestV2(itinerary) : digestV1(itinerary);
  const position = tripPositionLine(itinerary);
  const locLine = coords
    ? `\nThe traveller's CURRENT location is lat ${coords.lat.toFixed(4)}, lng ${coords.lng.toFixed(4)}. Use the find_nearby tool to ground "near me / right now" suggestions in real places.`
    : "";

  const langLine = lang === "it"
    ? "Reply in ITALIAN. Warm, concise, like a knowledgeable friend — not a brochure."
    : "Reply in ENGLISH. Warm, concise, like a knowledgeable friend — not a brochure.";

  return `You are MindRoute's travel companion: a personal guide who already knows this traveller and their trip, and stays with them before, during and after the journey.

${langLine}

How you behave:
- You already have their itinerary below — never ask them to paste it again.
- Be practical and specific: name the actual places, days and moments from their plan.
- During the trip, anchor advice to where they are today. If they ask "what now / where do I eat", call find_nearby and reason from real options plus today's moments.
- When the user wants to keep or remember a place/activity that is part of their plan, call save_moment with that moment's id (the [id:...] tag in the plan below) so it lands in their saved collection. Only the moments listed below have ids; never invent one.
- Suggest, reassure, adapt. If they want to change the plan, talk it through and give them the concrete swap to make.
- Keep replies short by default (a few sentences). Expand only when they ask for detail.
- If you don't know something real-time (live opening hours, today's weather), say so plainly and give your best informed guess.
${isV2 ? "" : "\nNOTE: this is a legacy itinerary without per-moment ids — save_moment is unavailable here; just talk the user through it."}
${userName ? `\nThe traveller's name is ${userName}.` : ""}
${position ? `\n${position}` : ""}${locLine}
${priorBlock}
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
];

export type CompanionToolEvent = { tool: string; label: string };

export interface CompanionToolContext {
  itinerary: Itinerary;
  userId: number | null;
  coords?: { lat: number; lng: number } | null;
  lang: "en" | "it";
  saveMoment: (row: {
    userId: number;
    itineraryId: number;
    momentId: string;
    momentSnapshot: any;
  }) => Promise<void>;
  alreadySaved: (userId: number, itineraryId: number, momentId: string) => Promise<boolean>;
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
      .map((p) => `- ${p.name} (${p.type}${p.distance_m != null ? `, ${p.distance_m}m` : ""})`)
      .join("\n");
    return {
      result: `Real places near the traveller right now:\n${list}`,
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
  const MAX_TURNS = 4; // guard against tool loops

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.messages.stream({
      model: COMPANION_MODEL,
      max_tokens: 1200,
      system: systemBlock,
      tools: COMPANION_TOOLS as any,
      messages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        full += event.delta.text;
        onChunk(event.delta.text);
      }
    }

    const finalMsg = await stream.finalMessage();
    messages.push({ role: "assistant", content: finalMsg.content });

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
