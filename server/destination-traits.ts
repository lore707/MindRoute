// ─────────────────────────────────────────────────────────────────────────
// Per-destination trait vectors. Used to blend with the quiz-derived vector
// when the user picks a destination (revealed preference signal).
//
// Each vector is 5 numbers in [0, 1]:
//   - exposure  (0=mainstream, 1=offbeat)
//   - comfort   (0=plush,      1=roughing)
//   - social    (0=intimate,   1=crowded/social)
//   - matter    (0=culture,    1=nature)
//   - structure (0=planned,    1=spontaneous)
//
// Numbers are editorial reads keyed on the catalog's keywords. They are
// versioned implicitly with destination-catalog.ts: if a destination's
// character changes (different itineraries, repositioning), update here.
// ─────────────────────────────────────────────────────────────────────────

import { type TraitVector } from "@shared/traits";

// Keys = city/area prefix (before the first comma in destinationName),
// lowercased. Match is case-insensitive on lookup.
const VECTORS: Record<string, TraitVector> = {
  // Quiet-nature / recovery cluster
  "azzorre":     { exposure: 0.78, comfort: 0.40, social: 0.15, matter: 0.88, structure: 0.40 },
  "alentejo":    { exposure: 0.72, comfort: 0.30, social: 0.22, matter: 0.60, structure: 0.35 },
  "madeira":     { exposure: 0.55, comfort: 0.40, social: 0.30, matter: 0.78, structure: 0.40 },

  // Raw-wild / explorer cluster
  "isole lofoten":            { exposure: 0.85, comfort: 0.75, social: 0.18, matter: 0.92, structure: 0.55 },
  "reykjavík":                { exposure: 0.60, comfort: 0.70, social: 0.30, matter: 0.92, structure: 0.70 },
  "patagonia":                { exposure: 0.80, comfort: 0.88, social: 0.18, matter: 0.95, structure: 0.50 },

  // Offbeat-cultural cluster
  "georgia":     { exposure: 0.85, comfort: 0.65, social: 0.65, matter: 0.50, structure: 0.65 },
  "albania":     { exposure: 0.85, comfort: 0.70, social: 0.55, matter: 0.55, structure: 0.65 },
  "uzbekistan":  { exposure: 0.80, comfort: 0.55, social: 0.40, matter: 0.20, structure: 0.35 },

  // Spiritual / contemplative cluster
  "varanasi":        { exposure: 0.85, comfort: 0.85, social: 0.75, matter: 0.10, structure: 0.55 },
  "luang prabang":   { exposure: 0.70, comfort: 0.40, social: 0.25, matter: 0.30, structure: 0.25 },
  "kyoto":           { exposure: 0.30, comfort: 0.25, social: 0.40, matter: 0.10, structure: 0.20 },
  "cappadocia":      { exposure: 0.45, comfort: 0.35, social: 0.45, matter: 0.65, structure: 0.30 },

  // Vibrant-sensory cluster
  "marrakech":   { exposure: 0.40, comfort: 0.55, social: 0.78, matter: 0.20, structure: 0.55 },
  "napoli":      { exposure: 0.50, comfort: 0.75, social: 0.85, matter: 0.20, structure: 0.75 },
  "medellín":    { exposure: 0.65, comfort: 0.45, social: 0.80, matter: 0.35, structure: 0.60 },
  "oaxaca":      { exposure: 0.65, comfort: 0.50, social: 0.72, matter: 0.18, structure: 0.55 },

  // Romantic-mainstream-european cluster
  "puglia":      { exposure: 0.40, comfort: 0.30, social: 0.50, matter: 0.45, structure: 0.40 },
  "lisbona":     { exposure: 0.25, comfort: 0.30, social: 0.55, matter: 0.20, structure: 0.35 },
  "praga":       { exposure: 0.20, comfort: 0.25, social: 0.55, matter: 0.10, structure: 0.25 },
};

export function getDestinationTraitVector(name: string | null | undefined): TraitVector | null {
  if (!name) return null;
  const key = name.split(",")[0].trim().toLowerCase();
  return VECTORS[key] ?? null;
}
