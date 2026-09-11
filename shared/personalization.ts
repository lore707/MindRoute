export type EvidenceKind = "declaration" | "behavior" | "feedback";
export type EvidenceStrength = "explicit" | "observed";

export type PersonalizationEvidence = {
  id: number;
  kind: EvidenceKind;
  eventType: string;
  content: string;
  context: Record<string, unknown>;
  strength: EvidenceStrength;
  createdAt: Date | string;
};

export type DerivedPattern = {
  key: string;
  statement: string;
  confidence: "explicit" | "supported";
  context: Record<string, unknown>;
  evidenceIds: number[];
};

export type DerivedUserModel = {
  summary: string;
  patterns: DerivedPattern[];
  evidenceThrough: Date | null;
  version: number;
};

export const MEANINGFUL_LEARNING_EVENTS = new Set([
  "destination_selected",
  "destination_rejected",
  "activity_removed",
  "activity_replaced",
  "day_regenerated",
  "pace_changed",
  "suggestion_confirmed",
  "suggestion_rejected",
  "trip_confirmed",
]);

export type QuizEvidenceDraft = {
  eventType: string;
  content: string;
  context: Record<string, unknown>;
};

export function extractQuizEvidence(input: any): QuizEvidenceDraft[] {
  const fast = input?.fastProfile ?? {};
  const context = {
    companions: fast.companions ?? input?.companions ?? null,
    durationDays: Number(fast.durationDays ?? input?.days) || null,
  };
  const drafts: QuizEvidenceDraft[] = [];
  const add = (eventType: string, content: unknown) => {
    const value = String(content ?? "").trim();
    if (value) drafts.push({ eventType, content: value, context });
  };

  add("quiz_own_words", fast.note);
  add("quiz_own_words", input?.constraints);
  if (Array.isArray(fast.intentions) && fast.intentions.length) add("quiz_intention", fast.intentions.join(", "));
  if (Array.isArray(fast.interests) && fast.interests.length) add("quiz_interest", fast.interests.join(", "));
  if (Array.isArray(fast.avoid) && fast.avoid.length) add("quiz_avoid", fast.avoid.join(", "));
  add("quiz_pace", fast.pace ?? input?.pace);

  return drafts.filter((draft, index, all) =>
    all.findIndex((candidate) => candidate.eventType === draft.eventType && candidate.content === draft.content) === index,
  );
}

export function buildDerivedUserModel(evidence: PersonalizationEvidence[], limit = 8): DerivedUserModel {
  const active = [...evidence]
    .filter((item) => item.content.trim())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
  const patterns = active.map<DerivedPattern>((item) => ({
    key: item.eventType,
    statement: item.content,
    confidence: item.strength === "explicit" ? "explicit" : "supported",
    context: item.context ?? {},
    evidenceIds: [item.id],
  }));
  return {
    summary: patterns.slice(0, 4).map((item) => item.statement).join(" · "),
    patterns,
    evidenceThrough: active.length ? new Date(active[0].createdAt) : null,
    version: 1,
  };
}

export function selectRelevantEvidence(
  evidence: PersonalizationEvidence[],
  context: { destination?: string; companions?: string; durationDays?: number },
  limit = 6,
): PersonalizationEvidence[] {
  const score = (item: PersonalizationEvidence) => {
    let value = item.strength === "explicit" ? 4 : 2;
    if (context.companions && item.context?.companions === context.companions) value += 3;
    if (context.durationDays && Number(item.context?.durationDays) === context.durationDays) value += 2;
    if (context.destination && item.context?.destination === context.destination) value += 3;
    return value;
  };
  return [...evidence]
    .sort((a, b) => score(b) - score(a) || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function validateRationaleEvidenceIds(candidate: unknown, allowedIds: number[]): number[] {
  if (!Array.isArray(candidate)) return [];
  const allowed = new Set(allowedIds);
  return Array.from(new Set(candidate.filter((id): id is number => Number.isInteger(id) && allowed.has(id as number)))).slice(0, 6);
}
