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
import { emaAggregate, AXIS_NAMES, MAPPING_VERSION, type TraitVector, type Axis } from "@shared/traits";

export interface TraitPrior {
  vector: TraitVector;
  snapshotCount: number;
}

export async function getTraitPriorForUser(userId: number | null | undefined): Promise<TraitPrior | null> {
  if (!userId) return null;
  try {
    const snapshots = await storage.getTraitSnapshots(userId);
    const valid = snapshots
      .filter(s => s.mappingVersion === MAPPING_VERSION)
      .map(s => s.traits as TraitVector);
    if (valid.length < 3) return null;
    return { vector: emaAggregate(valid), snapshotCount: valid.length };
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
  return `

═══════════════════════════════════════
PRIOR PROFILE — aggregated from this user's past ${prior.snapshotCount} trips
═══════════════════════════════════════
This is a SOFT PRIOR built from the user's previous trips on MindRoute (quiz answers + destinations they actually picked). Use it to break ties when the current quiz is ambiguous, and to recognize when the current quiz contradicts past behavior (which is a signal in itself — they may be looking for a deliberate change). The CURRENT quiz answers always win over the prior; the prior is background, not foreground.

${lines.join("\n")}

`;
}
