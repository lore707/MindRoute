import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, pool } from "./db";
import { derivedUserModels, personalizationDecisions, userEvidence } from "@shared/schema";
import {
  buildDerivedUserModel,
  extractQuizEvidence,
  selectRelevantEvidence,
  validateRationaleEvidenceIds,
  type PersonalizationEvidence,
} from "@shared/personalization";

const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 32);

export async function ensurePersonalizationTables(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS user_evidence (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id),
      kind text NOT NULL,
      event_type text NOT NULL,
      content text NOT NULL,
      source text NOT NULL,
      source_id text NOT NULL,
      context jsonb NOT NULL DEFAULT '{}'::jsonb,
      strength text NOT NULL,
      status text NOT NULL DEFAULT 'active',
      created_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS user_evidence_source_unique ON user_evidence(user_id, source, source_id)`,
    `CREATE INDEX IF NOT EXISTS user_evidence_user_created_idx ON user_evidence(user_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS derived_user_models (
      user_id integer PRIMARY KEY REFERENCES users(id),
      summary text NOT NULL,
      patterns jsonb NOT NULL DEFAULT '[]'::jsonb,
      evidence_through timestamp,
      version integer NOT NULL DEFAULT 1,
      updated_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE TABLE IF NOT EXISTS personalization_decisions (
      id serial PRIMARY KEY,
      user_id integer NOT NULL REFERENCES users(id),
      itinerary_id integer NOT NULL REFERENCES itineraries(id),
      event_type text NOT NULL,
      reason text NOT NULL,
      evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      feedback text,
      created_at timestamp NOT NULL DEFAULT now()
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS personalization_decision_itinerary_event_unique ON personalization_decisions(itinerary_id, event_type)`,
    `CREATE INDEX IF NOT EXISTS personalization_decision_user_created_idx ON personalization_decisions(user_id, created_at)`,
  ];
  for (const statement of statements) await pool.query(statement);
}

async function activeEvidence(userId: number): Promise<PersonalizationEvidence[]> {
  const rows = await db.select().from(userEvidence)
    .where(and(eq(userEvidence.userId, userId), eq(userEvidence.status, "active")))
    .orderBy(desc(userEvidence.createdAt))
    .limit(80);
  return rows.map((row) => ({
    id: row.id,
    kind: row.kind as PersonalizationEvidence["kind"],
    eventType: row.eventType,
    content: row.content,
    context: row.context ?? {},
    strength: row.strength as PersonalizationEvidence["strength"],
    createdAt: row.createdAt,
  }));
}

async function saveEvidence(input: {
  userId: number;
  kind: "declaration" | "behavior" | "feedback";
  eventType: string;
  content: string;
  source: string;
  sourceId: string;
  context?: Record<string, unknown>;
  strength: "explicit" | "observed";
}): Promise<void> {
  await db.insert(userEvidence).values({ ...input, context: input.context ?? {} })
    .onConflictDoNothing({ target: [userEvidence.userId, userEvidence.source, userEvidence.sourceId] });
}

async function rebuildDerivedUserModel(userId: number): Promise<void> {
  const evidence = await activeEvidence(userId);
  const model = buildDerivedUserModel(evidence);
  await db.insert(derivedUserModels).values({ userId, ...model, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: derivedUserModels.userId,
      set: { ...model, updatedAt: new Date() },
    });
}

export async function captureQuizEvidence(userId: number, input: any): Promise<void> {
  const drafts = extractQuizEvidence(input);
  const quizId = hash(input);
  await Promise.all(drafts.map((draft, index) => saveEvidence({
    userId,
    kind: "declaration",
    eventType: draft.eventType,
    content: draft.content,
    source: "quiz",
    sourceId: `${quizId}:${index}`,
    context: draft.context,
    strength: "explicit",
  })));
  if (drafts.length) await rebuildDerivedUserModel(userId);
}

export async function getPersonalizationContext(userId: number | null, input: any, destination?: string): Promise<{
  promptBlock: string;
  evidenceIds: number[];
}> {
  if (!userId) return { promptBlock: "", evidenceIds: [] };
  const evidence = await activeEvidence(userId);
  if (!evidence.length) return { promptBlock: "", evidenceIds: [] };
  const fast = input?.fastProfile ?? {};
  const current = {
    destination,
    companions: fast.companions ?? input?.companions,
    durationDays: Number(fast.durationDays ?? input?.days) || undefined,
  };
  const relevant = selectRelevantEvidence(evidence, current);
  const [stored] = await db.select().from(derivedUserModels).where(eq(derivedUserModels.userId, userId)).limit(1);
  const fallback = buildDerivedUserModel(evidence);
  const summary = stored?.summary || fallback.summary;
  const evidenceLines = relevant.map((item) => `[${item.id}] ${item.eventType}: ${item.content}`).join("\n");
  return {
    evidenceIds: relevant.map((item) => item.id),
    promptBlock: `

EVIDENCE-BACKED PERSONALIZATION (current trip constraints always win)
Derived user model: ${summary}
Current trip: ${JSON.stringify(current)}
Relevant evidence:
${evidenceLines}
Use only evidence that is genuinely relevant. In the top-level \"personalization\"
return one concise reason and cite only the numeric evidence IDs supplied above.
Never invent evidence, preferences or certainty.`,
  };
}

export async function recordPersonalizationDecision(input: {
  userId: number | null;
  itineraryId: number;
  destination: string;
  reason?: string;
  evidenceIds?: unknown;
  allowedEvidenceIds: number[];
}): Promise<void> {
  if (!input.userId || !input.reason?.trim()) return;
  const evidenceIds = validateRationaleEvidenceIds(input.evidenceIds, input.allowedEvidenceIds);
  if (!evidenceIds.length) return;
  await db.insert(personalizationDecisions).values({
    userId: input.userId,
    itineraryId: input.itineraryId,
    eventType: "destination_selected",
    reason: input.reason.trim(),
    evidenceIds,
  }).onConflictDoNothing({
    target: [personalizationDecisions.itineraryId, personalizationDecisions.eventType],
  });
  await saveEvidence({
    userId: input.userId,
    kind: "behavior",
    eventType: "destination_selected",
    content: `Ha scelto ${input.destination}`,
    source: "itinerary",
    sourceId: `${input.itineraryId}:destination_selected`,
    context: { itineraryId: input.itineraryId, destination: input.destination },
    strength: "observed",
  });
  await rebuildDerivedUserModel(input.userId);
}

export async function getPersonalizationRationale(userId: number, itineraryId: number) {
  const [decision] = await db.select().from(personalizationDecisions)
    .where(and(eq(personalizationDecisions.userId, userId), eq(personalizationDecisions.itineraryId, itineraryId)))
    .orderBy(desc(personalizationDecisions.createdAt))
    .limit(1);
  return decision ? { reason: decision.reason, feedback: decision.feedback } : null;
}

export async function savePersonalizationFeedback(input: {
  userId: number;
  itineraryId: number;
  feedback: "confirmed" | "corrected";
  correction?: string;
}): Promise<boolean> {
  const [decision] = await db.select().from(personalizationDecisions)
    .where(and(eq(personalizationDecisions.userId, input.userId), eq(personalizationDecisions.itineraryId, input.itineraryId)))
    .orderBy(desc(personalizationDecisions.createdAt))
    .limit(1);
  if (!decision) return false;
  const correction = input.correction?.trim();
  const feedbackValue = input.feedback === "corrected" && correction ? `corrected: ${correction}` : input.feedback;
  await db.update(personalizationDecisions).set({ feedback: feedbackValue }).where(eq(personalizationDecisions.id, decision.id));
  await saveEvidence({
    userId: input.userId,
    kind: "feedback",
    eventType: input.feedback === "confirmed" ? "suggestion_confirmed" : "suggestion_rejected",
    content: input.feedback === "confirmed" ? `Ha confermato: ${decision.reason}` : correction || "La motivazione proposta non lo rappresenta",
    source: "personalization_feedback",
    sourceId: `${decision.id}:${input.feedback}:${hash(correction ?? "")}`,
    context: { itineraryId: input.itineraryId },
    strength: input.feedback === "corrected" && correction ? "explicit" : "observed",
  });
  await rebuildDerivedUserModel(input.userId);
  return true;
}
