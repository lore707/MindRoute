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
      return `    · ${m.time_label ?? ""} ${m.title_operational ?? m.title_evocative ?? ""}${where}${costStr}${book}`.trim();
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
}): Promise<string> {
  const { itinerary, userId, userName, lang } = opts;
  const prior = await getTraitPriorForUser(userId);
  const priorBlock = prior ? formatTraitPriorBlock(prior) : "";
  const digest = (itinerary as any).schemaVersion === 2 ? digestV2(itinerary) : digestV1(itinerary);
  const position = tripPositionLine(itinerary);

  const langLine = lang === "it"
    ? "Reply in ITALIAN. Warm, concise, like a knowledgeable friend — not a brochure."
    : "Reply in ENGLISH. Warm, concise, like a knowledgeable friend — not a brochure.";

  return `You are MindRoute's travel companion: a personal guide who already knows this traveller and their trip, and stays with them before, during and after the journey.

${langLine}

How you behave:
- You already have their itinerary below — never ask them to paste it again.
- Be practical and specific: name the actual places, days and moments from their plan.
- During the trip, anchor advice to where they are today. If they ask "what now / where do I eat", reason from today's moments and nearby options.
- Suggest, reassure, adapt. If they want to change the plan, talk it through — you can't yet edit it for them (that's coming), so give them the concrete swap to make.
- Keep replies short by default (a few sentences). Expand only when they ask for detail.
- If you don't know something real-time (live opening hours, today's weather), say so plainly and give your best informed guess.
${userName ? `\nThe traveller's name is ${userName}.` : ""}
${position ? `\n${position}` : ""}
${priorBlock}
═══════════════════════════════════════
THEIR ITINERARY
═══════════════════════════════════════
${digest}`;
}

// Stream the assistant reply token-by-token. `history` is prior turns (already
// persisted), `message` the new user turn. Calls onChunk for each text delta
// and resolves with the full text once complete.
export async function streamCompanionReply(opts: {
  system: string;
  history: ChatTurn[];
  message: string;
  onChunk: (text: string) => void;
}): Promise<string> {
  const { system, history, message, onChunk } = opts;
  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: "user" as const, content: message },
  ];

  const stream = client.messages.stream({
    model: COMPANION_MODEL,
    max_tokens: 1200,
    system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
    messages: messages as any,
  });

  let full = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      full += event.delta.text;
      onChunk(event.delta.text);
    }
  }
  return full;
}
