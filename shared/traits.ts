// ─────────────────────────────────────────────────────────────────────────
// Trait engine — 5-axis psychological profile.
//
// Source of truth for: tassonomia, chip→axis weights, mapping version.
// A "trait snapshot" is produced by computeTraitVector(quizPayload) at two
// events: (1) profiling submit, (2) destination pick. Snapshots are stored
// in `traitSnapshots` and aggregated via EMA to derive the user's current
// profile. The aggregation lives in server/trait-aggregator.ts.
//
// Versioning: bump MAPPING_VERSION whenever any weight or chip set changes.
// Old snapshots stay readable (their mappingVersion column marks the era);
// the aggregator can choose to ignore mismatched versions or migrate.
// ─────────────────────────────────────────────────────────────────────────

export const MAPPING_VERSION = 1;

// ── Axes ──────────────────────────────────────────────────────────────────
// All axes are continuous [0, 1] after sigmoid normalization. 0 = "left",
// 1 = "right". 0.5 = neutral. Names are stable identifiers — never rename
// without bumping MAPPING_VERSION.

export type Axis = "exposure" | "comfort" | "social" | "matter" | "structure";

export const AXIS_NAMES: Record<Axis, { left: string; right: string; it: { left: string; right: string } }> = {
  exposure:  { left: "mainstream",  right: "offbeat",    it: { left: "mainstream",  right: "offbeat" } },
  comfort:   { left: "comfort",     right: "roughing",   it: { left: "comfort",     right: "rude" } },
  social:    { left: "intimo",      right: "sociale",    it: { left: "intimo",      right: "sociale" } },
  matter:    { left: "cultura",     right: "natura",     it: { left: "cultura",     right: "natura" } },
  structure: { left: "pianificato", right: "spontaneo",  it: { left: "pianificato", right: "spontaneo" } },
};

export type TraitVector = Record<Axis, number>;

export const NEUTRAL_VECTOR: TraitVector = {
  exposure: 0.5, comfort: 0.5, social: 0.5, matter: 0.5, structure: 0.5,
};

// ── Chip → axis contributions ─────────────────────────────────────────────
// Raw contributions (sum before sigmoid). Convention: positive = pushes toward
// the "right" end of the axis, negative = toward the "left". Magnitudes:
//   0.2-0.4 = mild signal       (one of several chips agreeing)
//   0.5-0.7 = strong signal     (chip carries the trait clearly)
//   0.8-0.9 = defining signal   (chip is essentially a vote for that pole)
//
// Empty axes are 0 (no contribution). Keys are normalized to the canonical
// CHIP_KEYS below (label-to-key normalization handled by normalizeChip()).

type Contrib = Partial<TraitVector>;

const STYLE_TRAITS: Record<string, Contrib> = {
  wild:         { exposure: +0.8, comfort: +0.7, matter: +0.6 },
  quiet:        { social: -0.8 },
  chaotic:      { social: +0.7 },
  intimate:     { social: -0.6 },
  solitary:     { social: -0.9 },
  regenerating: { comfort: -0.3, matter: +0.4 },
  authentic:    { exposure: +0.6 },
  quietluxury:  { exposure: -0.4, comfort: -0.9 },
  spiritual:    { social: -0.5, matter: +0.2 },
  festive:      { social: +0.8 },
  adventure:    { comfort: +0.7, matter: +0.8 },
  romantic:     { social: -0.4 },
  cultural:     { matter: -0.9 },
  explorative:  { exposure: +0.4, structure: +0.5 },
};

const NEED_TRAITS: Record<string, Contrib> = {
  // a.q2 + b.q6 — semantically merged where labels align
  disconnect: { exposure: +0.3, structure: +0.4 },
  alive:      { comfort: +0.6, matter: +0.4 },
  slowdown:   { comfort: -0.3, structure: -0.5 },
  surprise:   { exposure: +0.7, structure: +0.7 },
  recharge:   { comfort: -0.4, matter: +0.3 },
  change:     { exposure: +0.5 },
  celebrate:  { social: +0.6 },
  findself:   { social: -0.6, matter: +0.2 },
  free:       { structure: +0.6 },           // b.q6 only ("Feel free and spontaneous")
};

const MOMENT_TRAITS: Record<string, Contrib> = {
  // b.q3 (must-see moments)
  localfood:                { exposure: +0.4 },
  authentic_neighborhoods:  { exposure: +0.5, social: -0.3 },
  iconic_landmarks:         { exposure: -0.6, matter: -0.4 },
  nature_immersion:         { matter: +0.8, comfort: +0.3 },
  completely_new:           { exposure: +0.5, structure: +0.4 },
  photography:              {},               // truly neutral — anyone photographs
  undiscovered:             { exposure: +0.8 },
};

const TYPE_TRAITS: Record<string, Contrib> = {
  // b.q2 (trip type)
  culture:   { matter: -0.8 },
  nature:    { matter: +0.8 },
  food:      { social: +0.2 },
  beach:     { comfort: -0.4, matter: +0.3 },
  city:      { matter: -0.6, social: +0.3 },
  offgrid:   { exposure: +0.8, comfort: +0.6, matter: +0.5 },
  roadtrip:  { exposure: +0.4, structure: +0.5 },
  trekking:  { matter: +0.7, comfort: +0.7 },
  wellness:  { social: -0.4, comfort: -0.6 },
  discovery: { exposure: +0.7, structure: +0.6 },
};

const ATMOSPHERE_TRAITS: Record<string, Contrib> = {
  // a.q4 + b.q4 (image picks)
  medina:  { social: +0.5, exposure: -0.2 },
  nordic:  { comfort: +0.3, social: -0.4 },
  temple:  { matter: -0.3, social: -0.5 },
  desert:  { matter: +0.7, comfort: +0.5 },
  seaside: { comfort: -0.3, matter: +0.3 },
  market:  { social: +0.6, exposure: +0.3 },
  trail:   { matter: +0.7, comfort: +0.5 },
  cafe:    { social: -0.3, comfort: -0.4 },
};

const ANTI_TRAITS: Record<string, Contrib> = {
  // chips.* drains (15)
  guided:         { structure: +0.3, matter: +0.2 },
  crowded:        { social: -0.5, exposure: +0.5 },
  museums:        { matter: +0.6 },
  resort:         { exposure: +0.7, comfort: +0.3 },
  nightlife:      { social: -0.7 },
  touristy:       { exposure: +0.6 },
  transits:       { comfort: -0.4 },
  mornings:       { comfort: -0.5 },
  schedules:      { structure: +0.7 },
  smalltalk:      { social: -0.6 },
  unfamiliarfood: { exposure: -0.3, comfort: -0.4 },
  toomuchwalking: { comfort: -0.6 },
  tooisolated:    { social: +0.5, exposure: -0.3 },
  tooexpensive:   {},                          // budget signal, not psychological
  toolong:        { structure: +0.4 },
};

// Merge everything into one canonical map. Key collisions across categories
// are intentional: e.g. "discovery" exists as both a b.q2.type chip and the
// semantic concept of "scoperta" travel style. Last-wins is fine here because
// these maps are disjoint by construction.
const CHIP_TRAITS: Record<string, Contrib> = {
  ...STYLE_TRAITS,
  ...NEED_TRAITS,
  ...MOMENT_TRAITS,
  ...TYPE_TRAITS,
  ...ATMOSPHERE_TRAITS,
  ...ANTI_TRAITS,
};

// ── Label → canonical key (IT/EN, case-insensitive) ───────────────────────
// The quiz serializes chip selections as translated labels (Italian or
// English) into answers[]. Mapping back to canonical keys decouples the
// trait engine from i18n drift and keeps weights stable across languages.

const LABEL_TO_KEY: Record<string, string> = {
  // a.q1 style (14)
  "selvaggio": "wild", "wild": "wild",
  "silenzioso": "quiet", "quiet": "quiet",
  "caotico": "chaotic", "chaotic": "chaotic",
  "intimo": "intimate", "intimate": "intimate",
  "solitario": "solitary", "solitary": "solitary",
  "rigenerante": "regenerating", "regenerating": "regenerating",
  "autentico": "authentic", "authentic": "authentic",
  "lusso discreto": "quietluxury", "quiet luxury": "quietluxury",
  "spirituale": "spiritual", "spiritual": "spiritual",
  "festoso": "festive", "festive": "festive",
  "avventuroso": "adventure", "adventure": "adventure",
  "romantico": "romantic", "romantic": "romantic",
  "culturale": "cultural", "cultural": "cultural",
  "esplorativo": "explorative", "explorative": "explorative",

  // a.q2 + b.q6 need/feeling (8 + 6, merged semantically)
  "staccare dalla routine": "disconnect",
  "staccare davvero dalla routine": "disconnect",
  "disconnect from routine": "disconnect",
  "sentirmi vivo di nuovo": "alive",
  "feel alive again": "alive",
  "rallentare": "slowdown",
  "slow down": "slowdown",
  "sorprendermi": "surprise",
  "be surprised": "surprise",
  "meravigliarmi di nuovo": "surprise",
  "be amazed again": "surprise",
  "ricaricare le energie": "recharge",
  "recharge my energy": "recharge",
  "ritrovare energia e leggerezza": "recharge",
  "regain energy and lightness": "recharge",
  "cambiare qualcosa": "change",
  "change something": "change",
  "uscire dalla mia zona di comfort": "change",
  "step outside my comfort zone": "change",
  "festeggiare": "celebrate",
  "celebrate": "celebrate",
  "ritrovarmi": "findself",
  "find myself": "findself",
  "sentire profondamente il luogo": "findself",
  "feel the place deeply": "findself",
  "sentirmi libero e spontaneo": "free",
  "feel free and spontaneous": "free",

  // b.q3 moments (7)
  "mangiare nei posti locali": "localfood",
  "eating at local spots": "localfood",
  "perdermi nei quartieri autentici": "authentic_neighborhoods",
  "getting lost in authentic neighborhoods": "authentic_neighborhoods",
  "vedere luoghi iconici": "iconic_landmarks",
  "seeing iconic landmarks": "iconic_landmarks",
  "stare immerso nella natura": "nature_immersion",
  "being immersed in nature": "nature_immersion",
  "vivere qualcosa di completamente nuovo": "completely_new",
  "living something completely new": "completely_new",
  "fotografare qualcosa di straordinario": "photography",
  "photographing something extraordinary": "photography",
  "trovare un posto che non sapevo esistesse": "undiscovered",
  "finding a place i didn't know existed": "undiscovered",

  // b.q2 trip type (10)
  "cultura e storia": "culture", "culture & history": "culture",
  "natura e avventura": "nature", "nature & adventure": "nature",
  "food e vino": "food", "food & wine": "food",
  "mare e relax": "beach", "beach & relax": "beach",
  "città e vita notturna": "city", "city & nightlife": "city",
  "fuori dal mondo": "offgrid", "off the grid": "offgrid",
  "road trip": "roadtrip",
  "trekking e sport": "trekking", "trekking & sports": "trekking",
  "wellness e spa": "wellness", "wellness & spa": "wellness",
  "scoperta, sorprendimi": "discovery", "discovery, surprise me": "discovery",

  // atmosphere images — values, not labels (already canonical)
  "medina": "medina", "nordic": "nordic", "temple": "temple", "desert": "desert",
  "seaside": "seaside", "market": "market", "trail": "trail", "cafe": "cafe",

  // chips.* drains (15)
  "visite guidate": "guided", "guided tours": "guided",
  "luoghi affollati": "crowded", "crowded places": "crowded",
  "stanchezza da musei": "museums", "museums fatigue": "museums",
  "hotel resort": "resort", "resort hotels": "resort",
  "vita notturna e club": "nightlife", "nightlife & clubs": "nightlife",
  "ristoranti turistici": "touristy", "touristy restaurants": "touristy",
  "lunghi trasferimenti": "transits", "long transits": "transits",
  "sveglie presto": "mornings", "early mornings": "mornings",
  "programmi rigidi": "schedules", "strict schedules": "schedules",
  "chiacchiere con sconosciuti": "smalltalk", "small talk with strangers": "smalltalk",
  "cibo sconosciuto": "unfamiliarfood", "unfamiliar food": "unfamiliarfood",
  "troppo camminare": "toomuchwalking", "too much walking": "toomuchwalking",
  "troppo isolato": "tooisolated", "too isolated": "tooisolated",
  "spendere senza valore chiaro": "tooexpensive", "spending without clear value": "tooexpensive",
  "stare troppo a lungo nello stesso posto": "toolong", "staying too long in one place": "toolong",
};

function normalizeChip(label: string): string | null {
  const k = label.trim().toLowerCase()
    .replace(/[‘’]/g, "'")     // smart quotes → straight
    .replace(/\s+/g, " ");
  return LABEL_TO_KEY[k] ?? null;
}

// ── Quiz payload shape ────────────────────────────────────────────────────
// Loose because the quiz hands us a heterogeneous bag — answers[] mixes
// chip-multi-selections (often comma-separated within one slot), slider
// values as numeric strings, and free-form text. We extract what we can.

export interface QuizSignal {
  answers: string[];
  pace?: number;                                // 0-100, if known explicitly
  companions?: string | null;
  budget?: string | null;
  travelStyle?: string | null;
  constraints?: string | null;
}

function addContrib(target: Record<string, number>, contrib: Contrib): void {
  for (const [axis, w] of Object.entries(contrib)) {
    if (w === undefined) continue;
    target[axis] = (target[axis] ?? 0) + w;
  }
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

// ── Main entry: quiz → trait vector ───────────────────────────────────────

export function computeTraitVector(signal: QuizSignal): TraitVector {
  const acc: Record<string, number> = {
    exposure: 0, comfort: 0, social: 0, matter: 0, structure: 0,
  };

  // 1) Chip-based signal from answers[]. Each answer slot may contain a single
  //    chip, multiple chips joined with separators, or a slider numeric, or
  //    free text. Split on common separators and try normalization per token.
  let detectedPace: number | null = null;
  for (const raw of signal.answers ?? []) {
    if (typeof raw !== "string") continue;

    // Slider answers come through as "70" or "70 | addendum" — extract pace.
    const sliderMatch = raw.match(/^\s*(\d{1,3})\s*($|\|)/);
    if (sliderMatch) {
      const n = parseInt(sliderMatch[1], 10);
      if (n >= 0 && n <= 100) {
        detectedPace = n;
        continue;
      }
    }

    // path_a / path_b sentinels — skip
    if (/^path_[ab]$/i.test(raw.trim())) continue;

    const tokens = raw.split(/[,|]/).map(s => s.trim()).filter(Boolean);
    for (const tok of tokens) {
      const key = normalizeChip(tok);
      if (!key) continue;
      const contrib = CHIP_TRAITS[key];
      if (contrib) addContrib(acc, contrib);
    }
  }

  // 2) Pace: explicit signal wins, otherwise use whatever we sniffed in answers.
  const pace = typeof signal.pace === "number" ? signal.pace : detectedPace;
  if (pace !== null && pace !== undefined && Number.isFinite(pace)) {
    // Linear map [0,100] → [-1,+1] on structure axis. Weight ~1.0 means slider
    // is the single strongest individual signal on this axis, by design — the
    // user thought about it explicitly.
    acc.structure += (pace - 50) / 50;
  }

  // 3) Structured fields.
  const companions = (signal.companions ?? "").toLowerCase();
  if (companions) {
    if (/(solo|alone|da solo)/.test(companions))            addContrib(acc, { social: -0.7 });
    else if (/(couple|coppia|partner)/.test(companions))    addContrib(acc, { social: -0.3 });
    else if (/(family|famiglia)/.test(companions))          addContrib(acc, { social: +0.5, comfort: -0.4 });
    else if (/(friend|amici)/.test(companions))             addContrib(acc, { social: +0.6 });
  }

  const budget = (signal.budget ?? "").toLowerCase();
  if (budget) {
    if (/(low|basso|tight|economic)/.test(budget))                    addContrib(acc, { comfort: +0.2 });
    else if (/(unlimited|luxury|no.?limit|money.?s.?not)/.test(budget)) addContrib(acc, { comfort: -0.4, exposure: -0.2 });
  }

  const style = (signal.travelStyle ?? "").toLowerCase();
  if (style) {
    if (/(base fissa|home.?base)/.test(style))    addContrib(acc, { structure: -0.4 });
    else if (/(scoperta|discovery)/.test(style))  addContrib(acc, { structure: +0.6, exposure: +0.3 });
  }

  // 4) Normalize via sigmoid → [0, 1].
  return {
    exposure:  sigmoid(acc.exposure),
    comfort:   sigmoid(acc.comfort),
    social:    sigmoid(acc.social),
    matter:    sigmoid(acc.matter),
    structure: sigmoid(acc.structure),
  };
}

// ── Aggregation helpers ───────────────────────────────────────────────────

/**
 * Blend a quiz-derived vector with the destination the user actually picked.
 * The picked destination is a revealed preference signal — it often diverges
 * from what the user claimed in the quiz, and that divergence is the most
 * interesting trait signal we get. Default mix favors quiz (0.6) but lets the
 * pick correct it (0.4).
 */
export function blendWithDestination(
  quiz: TraitVector,
  destination: TraitVector,
  quizWeight = 0.6,
): TraitVector {
  const w = Math.max(0, Math.min(1, quizWeight));
  return {
    exposure:  quiz.exposure  * w + destination.exposure  * (1 - w),
    comfort:   quiz.comfort   * w + destination.comfort   * (1 - w),
    social:    quiz.social    * w + destination.social    * (1 - w),
    matter:    quiz.matter    * w + destination.matter    * (1 - w),
    structure: quiz.structure * w + destination.structure * (1 - w),
  };
}

/**
 * Inverse direction: given an aggregated TraitVector, synthesize a minimal set
 * of canonical chip labels that, if fed to computeTraitVector, would produce
 * roughly the same profile. Used by the "Genera dal profilo" flow (Ondata C)
 * to bypass the quiz for returning users — we let their accumulated profile
 * drive the matching engine instead of forcing 7 questions again.
 *
 * Strategy: per axis, pick 1-2 chips whose primary contribution points in the
 * right direction with the right magnitude (mild/clear/strong). Returns chip
 * canonical keys (not labels) which the matching engine treats the same way.
 */
export function synthesizeAnswersFromVector(vector: TraitVector): string[] {
  // Per ogni asse, pre-calcolo le chip più "rappresentative" del polo right
  // (positive contrib) e left (negative contrib). Inverto la mappa al volo —
  // solo le chip con magnitude >= 0.5 sui rispettivi assi qualificano, così
  // emergono i segnali "forti" (cultural per matter-left, nature per matter-right).
  const chipsByPole: Record<Axis, { right: string[]; left: string[] }> = {
    exposure:  { right: [], left: [] },
    comfort:   { right: [], left: [] },
    social:    { right: [], left: [] },
    matter:    { right: [], left: [] },
    structure: { right: [], left: [] },
  };
  for (const [chipKey, contrib] of Object.entries(CHIP_TRAITS)) {
    for (const [axis, w] of Object.entries(contrib)) {
      if (w === undefined) continue;
      if (Math.abs(w) < 0.5) continue;
      const ax = axis as Axis;
      if (w > 0) chipsByPole[ax].right.push(chipKey);
      else chipsByPole[ax].left.push(chipKey);
    }
  }

  const chosen = new Set<string>();
  for (const axis of Object.keys(vector) as Axis[]) {
    const v = vector[axis];
    if (v >= 0.42 && v <= 0.58) continue; // neutro → no signal
    const dist = Math.abs(v - 0.5);
    const wantRight = v > 0.5;
    const pool = wantRight ? chipsByPole[axis].right : chipsByPole[axis].left;
    if (pool.length === 0) continue;
    // Scelgo deterministicamente la prima — è arbitraria ma stabile (la mappa
    // CHIP_TRAITS è dichiarata, l'ordine è prevedibile). Per assi "forti"
    // (dist > 0.25) prendo 2 chip così il signal arriva al matching come
    // più voci coerenti, non un'unica.
    chosen.add(pool[0]);
    if (dist > 0.25 && pool.length > 1) chosen.add(pool[1]);
  }
  const out: string[] = [];
  chosen.forEach(k => out.push(k));
  return out;
}

/**
 * Exponential moving average over an ordered list of snapshots (oldest first).
 * α controls how fast the profile shifts: 0.3 means each new snapshot moves
 * the profile by 30% toward itself. With <3 snapshots returns the latest as-is
 * (EMA noise on a tiny history hides more than it reveals).
 */
export function emaAggregate(snapshots: TraitVector[], alpha = 0.3): TraitVector {
  if (snapshots.length === 0) return { ...NEUTRAL_VECTOR };
  if (snapshots.length < 3) return { ...snapshots[snapshots.length - 1] };

  let agg = { ...snapshots[0] };
  for (let i = 1; i < snapshots.length; i++) {
    const s = snapshots[i];
    agg = {
      exposure:  alpha * s.exposure  + (1 - alpha) * agg.exposure,
      comfort:   alpha * s.comfort   + (1 - alpha) * agg.comfort,
      social:    alpha * s.social    + (1 - alpha) * agg.social,
      matter:    alpha * s.matter    + (1 - alpha) * agg.matter,
      structure: alpha * s.structure + (1 - alpha) * agg.structure,
    };
  }
  return agg;
}
