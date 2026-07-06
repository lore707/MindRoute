// ─────────────────────────────────────────────────────────────────────────
// Trait prior — reads a user's snapshot history, EMA-aggregates it, and
// formats a block injected into the matching-engine prompt as a soft prior.
//
// "Prior" not "constraint": the current quiz answers still rule. The prior
// nudges the engine when the quiz is ambiguous, and gives it the long-arc
// view of what this user actually picks (revealed preference). With < 3
// snapshots there isn't enough signal — we return null and the prompt
// continues unchanged.
// ─────────────────────────────────────────────────────────────────────────

import { storage } from "./storage";
import { emaAggregateWeighted, AXIS_NAMES, MAPPING_VERSION, type TraitVector, type Axis } from "@shared/traits";
import { getTripStatus, type TripStatus } from "@shared/trip-status";

export interface TraitPrior {
  vector: TraitVector;
  snapshotCount: number;
  // Quanti degli snapshot provengono da viaggi EFFETTIVAMENTE fatti (confirmed).
  // Se >0, l'aggregato è "reale" e non solo sognato — lo diciamo nel prompt.
  confirmedCount: number;
}

// Un viaggio fatto è preferenza rivelata → pesa più del solo generato; uno
// saltato è un segnale più debole (l'utente NON c'è andato).
const STATUS_WEIGHT: Record<TripStatus, number> = {
  confirmed: 2.2,
  planned: 1.0,
  skipped: 0.5,
};

export async function getTraitPriorForUser(userId: number | null | undefined): Promise<TraitPrior | null> {
  if (!userId) return null;
  try {
    const snapshots = await storage.getTraitSnapshots(userId);
    // Stato del viaggio per id, così ogni snapshot eredita il peso della sua fonte.
    const trips = await storage.getUserItineraries(userId).catch(() => []);
    const statusById = new Map<number, TripStatus>();
    for (const t of trips) statusById.set((t as any).id, getTripStatus(t));

    const valid = snapshots
      .filter(s => s.mappingVersion === MAPPING_VERSION)
      .map(s => {
        const status = s.sourceItineraryId != null ? statusById.get(s.sourceItineraryId) : undefined;
        return { vector: s.traits as TraitVector, status: status ?? "planned" as TripStatus };
      });
    if (valid.length < 3) return null;

    const weighted = valid.map(v => ({ vector: v.vector, weight: STATUS_WEIGHT[v.status] }));
    const confirmedCount = valid.filter(v => v.status === "confirmed").length;
    return { vector: emaAggregateWeighted(weighted), snapshotCount: valid.length, confirmedCount };
  } catch (e) {
    console.warn("[trait-prior] fetch failed:", e);
    return null;
  }
}

// Convert a trait vector to a short English block the matching prompt can
// read. Axes are described by which pole they lean toward + magnitude tag.
// Skipped if value is within [0.42, 0.58] — neutral axes add noise.
export function formatTraitPriorBlock(prior: TraitPrior): string {
  const lines: string[] = [];
  for (const axis of Object.keys(prior.vector) as Axis[]) {
    const v = prior.vector[axis];
    if (v >= 0.42 && v <= 0.58) continue; // neutral — skip
    const labels = AXIS_NAMES[axis];
    const pole = v < 0.5 ? labels.left : labels.right;
    const dist = Math.abs(v - 0.5);
    const magnitude = dist > 0.30 ? "strong" : dist > 0.18 ? "clear" : "mild";
    lines.push(`  - ${axis}: ${magnitude} ${pole} (${v.toFixed(2)})`);
  }
  if (lines.length === 0) {
    // All axes neutral → no useful prior — caller should probably ignore.
    return "";
  }
  const realLine = prior.confirmedCount > 0
    ? ` Of these, ${prior.confirmedCount} ${prior.confirmedCount === 1 ? "trip was" : "trips were"} CONFIRMED as actually taken — those weigh more here, because a trip they truly went on is revealed preference, not just intention.`
    : "";

  return `

═══════════════════════════════════════
PRIOR PROFILE — aggregated from this user's past ${prior.snapshotCount} trips
═══════════════════════════════════════
This is a SOFT PRIOR built from the user's previous trips on MindRoute (quiz answers + destinations they actually picked).${realLine} Use it to break ties when the current quiz is ambiguous, and to recognize when the current quiz contradicts past behavior (which is a signal in itself — they may be looking for a deliberate change). The CURRENT quiz answers always win over the prior; the prior is background, not foreground.

${lines.join("\n")}

`;
}
