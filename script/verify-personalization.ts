import assert from "node:assert/strict";
import {
  MEANINGFUL_LEARNING_EVENTS,
  buildDerivedUserModel,
  extractQuizEvidence,
  selectRelevantEvidence,
  validateRationaleEvidenceIds,
  type PersonalizationEvidence,
} from "../shared/personalization";

const quizEvidence = extractQuizEvidence({
  days: 7,
  fastProfile: {
    companions: "couple",
    pace: "slow",
    intentions: ["disconnect"],
    interests: ["local-food"],
    avoid: ["crowds"],
    note: "Voglio sentirmi lontano dalla routine",
  },
});
assert.equal(quizEvidence[0]?.content, "Voglio sentirmi lontano dalla routine");
assert.ok(quizEvidence.some((item) => item.eventType === "quiz_avoid" && item.content === "crowds"));

const evidence: PersonalizationEvidence[] = quizEvidence.map((item, index) => ({
  id: index + 1,
  kind: "declaration",
  eventType: item.eventType,
  content: item.content,
  context: item.context,
  strength: "explicit",
  createdAt: new Date(2026, 0, index + 1),
}));
evidence.push({
  id: 99,
  kind: "behavior",
  eventType: "destination_selected",
  content: "Ha scelto Kyoto",
  context: { companions: "solo", durationDays: 3, destination: "Kyoto" },
  strength: "observed",
  createdAt: new Date(2026, 1, 1),
});

const model = buildDerivedUserModel(evidence, 4);
assert.equal(model.patterns.length, 4);
assert.ok(model.patterns.every((pattern) => pattern.evidenceIds.length === 1));

const relevant = selectRelevantEvidence(evidence, { companions: "couple", durationDays: 7 }, 3);
assert.ok(relevant.every((item) => item.id !== 99));
assert.deepEqual(validateRationaleEvidenceIds([1, 99, 999, 1, "2"], [1, 2, 99]), [1, 99]);

assert.ok(MEANINGFUL_LEARNING_EVENTS.has("activity_replaced"));
assert.ok(!MEANINGFUL_LEARNING_EVENTS.has("panel_opened"));

console.log("personalization vertical slice: ok");
