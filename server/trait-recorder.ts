// ─────────────────────────────────────────────────────────────────────────
// Trait snapshot recorder — central helper called from the itinerary-gen
// routes (v1 and v2). Captures a "pick" snapshot when the user commits to
// a destination.
//
// Revealed preference (§9 Evoluzione): il segnale della scelta NON è il vettore
// assoluto della destinazione scelta (né tantomeno derivato dalla sua copy
// persuasiva: autoconferma), ma il CONTRASTO tra la scelta e le due scartate,
// su vettori neutri. Per questo il recorder riceve TUTTE E TRE le destinazioni
// proposte, non solo quella selezionata. Se il contrasto non è calcolabile
// (vettori neutri insufficienti) → snapshot quiz-only (degradazione onesta).
// ─────────────────────────────────────────────────────────────────────────

import { storage } from "./storage";
import { computeTraitVector, blendWithRevealedPreference, MAPPING_VERSION } from "@shared/traits";
import { revealedPreferenceVector } from "./destination-traits";

export async function recordPickSnapshot(args: {
  userId: number | null | undefined;
  profilingInput: any;
  destinationName: string;
  itineraryId: number;
  /** Tutte e tre le destinazioni proposte nella tripletta (nome), inclusa la
   *  scelta. Il contrasto scelta-vs-scartate è il segnale di preferenza
   *  rivelata. Se assente/incompleta → snapshot quiz-only. */
  proposed?: Array<{ name: string }> | null;
}): Promise<void> {
  const { userId, profilingInput, destinationName, itineraryId, proposed } = args;
  if (!userId || !profilingInput) return; // anonymous → no history possible

  try {
    const quizVector = computeTraitVector({
      answers: profilingInput.answers ?? [],
      companions: profilingInput.companions ?? null,
      budget: profilingInput.budget ?? null,
      travelStyle: profilingInput.travelStyle ?? null,
      constraints: profilingInput.constraints ?? null,
    });

    const rejectedNames = (proposed ?? [])
      .map((d) => d?.name)
      .filter((n): n is string => !!n && n !== destinationName);
    const revealed = rejectedNames.length
      ? revealedPreferenceVector(destinationName, rejectedNames)
      : null;
    if (!revealed) {
      console.warn(`[traits] no revealed-preference contrast for "${destinationName}" (rejected: ${rejectedNames.length ? rejectedNames.join(", ") : "none passed"}, neutral vectors insufficient) — pick snapshot is quiz-only`);
    }
    const finalVector = revealed ? blendWithRevealedPreference(quizVector, revealed) : quizVector;

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
    // Log di successo (prima la scrittura era muta: impossibile distinguere
    // "scrive valori neutri" da "non scrive affatto" senza guardare il DB).
    const compact = Object.entries(finalVector).map(([a, v]) => `${a}=${(v as number).toFixed(2)}`).join(" ");
    console.log(`[traits] pick snapshot saved user=${userId} itinerary=${itineraryId} revealed=${!!revealed} ${compact}`);
  } catch (e) {
    // Trait snapshot is non-critical — never fail the itinerary generation.
    console.warn("[traits] pick snapshot failed:", e);
  }
}
