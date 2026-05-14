// ─────────────────────────────────────────────────────────────────────────
// Per-destination trait vectors. Used to blend with the quiz-derived vector
// when the user actually picks a destination (revealed preference signal).
//
// TODO(editorial): fill in the 20 destinations from server/destination-catalog.ts.
// Each vector is 5 numbers in [0, 1]:
//   - exposure  (0=mainstream, 1=offbeat)
//   - comfort   (0=plush,      1=roughing)
//   - social    (0=intimate,   1=crowded/social)
//   - matter    (0=culture,    1=nature)
//   - structure (0=planned,    1=spontaneous)
//
// Until populated, getDestinationTraitVector() returns null and the blender
// silently falls back to the quiz vector (so the snapshot is still captured,
// it just doesn't get the destination-pick correction yet).
// ─────────────────────────────────────────────────────────────────────────

import { type TraitVector } from "@shared/traits";

// Match against itinerary.destinationName / destination.name. Keys are the
// city/area prefix before the comma — matched case-insensitively.
const VECTORS: Record<string, TraitVector> = {
  // Example (fill in based on your editorial sense of each destination):
  // "azzorre":      { exposure: 0.75, comfort: 0.55, social: 0.20, matter: 0.85, structure: 0.55 },
  // "kyoto":        { exposure: 0.30, comfort: 0.30, social: 0.40, matter: 0.10, structure: 0.30 },
};

export function getDestinationTraitVector(name: string | null | undefined): TraitVector | null {
  if (!name) return null;
  const key = name.split(",")[0].trim().toLowerCase();
  return VECTORS[key] ?? null;
}
