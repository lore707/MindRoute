// ─────────────────────────────────────────────────────────────────────────
// Trait snapshot recorder — central helper called from the itinerary-gen
// routes (v1 and v2). Captures a "pick" snapshot when the user commits to
// a destination, blended with the destination's own trait vector when known.
// ─────────────────────────────────────────────────────────────────────────

import { storage } from "./storage";
import { computeTraitVector, blendWithDestination, MAPPING_VERSION } from "@shared/traits";
import { getDestinationTraitVector } from "./destination-traits";

export async function recordPickSnapshot(args: {
  userId: number | null | undefined;
  profilingInput: any;
  destinationName: string;
  itineraryId: number;
}): Promise<void> {
  const { userId, profilingInput, destinationName, itineraryId } = args;
  if (!userId || !profilingInput) return; // anonymous → no history possible

  try {
    const quizVector = computeTraitVector({
      answers: profilingInput.answers ?? [],
      companions: profilingInput.companions ?? null,
      budget: profilingInput.budget ?? null,
      travelStyle: profilingInput.travelStyle ?? null,
      constraints: profilingInput.constraints ?? null,
    });

    const destVector = getDestinationTraitVector(destinationName);
    const finalVector = destVector ? blendWithDestination(quizVector, destVector) : quizVector;

    await storage.createTraitSnapshot({
      userId,
      traits: finalVector,
      source: "pick",
      sourceItineraryId: itineraryId,
      mappingVersion: MAPPING_VERSION,
      // Carry the signal that produced this pick. Genuine picks hold the real
      // quiz selections; "Genera dal profilo" picks hold synthetic canonical
      // keys. The Ritratto's verbatim seek/avoid reads only "quiz" snapshots,
      // so synthetic pick signals never surface as the user's words.
      rawSignal: {
        answers: profilingInput.answers ?? [],
        companions: profilingInput.companions ?? null,
        budget: profilingInput.budget ?? null,
        travelStyle: profilingInput.travelStyle ?? null,
        constraints: profilingInput.constraints ?? null,
      },
    });
  } catch (e) {
    // Trait snapshot is non-critical — never fail the itinerary generation.
    console.warn("[traits] pick snapshot failed:", e);
  }
}
