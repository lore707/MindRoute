// ─────────────────────────────────────────────────────────────────────────
// Travel Identity Graph — schema versionato (Core / State).
//
// Questa è la STRUTTURA che il write-path del profilo alimenta (step 2
// dell'ordine di costruzione, §12 ARCHITETTURA-COGNITIVA). Non è ancora
// cablata nella generazione (step 3): qui definiamo solo la rappresentazione
// e le regole di routing, come struttura dati pura e testabile.
//
// Riferimenti spec:
//   ARCHITETTURA-COGNITIVA §7  — natura del Graph (dimensioni, principi,
//                                 tensioni, ipotesi, provenienza)
//   REASONING-ENGINE §2        — l'Intento come Principio Zero
//   REASONING-ENGINE §3        — i due livelli Core/State + regola di routing
//
// Principio cardine: il Graph memorizza INTERPRETAZIONI, non risposte. Ogni
// valore deve poter rispondere "da dove viene" e "in quali contesti vale":
// per questo la provenienza (§7.1) è parte dello schema, non un log a parte.
//
// Versionamento: bump GRAPH_VERSION quando cambia la forma dei tipi o il
// vocabolario delle dimensioni. I trait vector a 5 assi già scritti in
// trait_snapshots restano leggibili: traitVectorToDimensions() li proietta
// nel nuovo schema come SOTTOINSIEME delle dimensioni, senza migrazione DB.
// ─────────────────────────────────────────────────────────────────────────

import type { Axis, TraitVector } from "./traits";

export const GRAPH_VERSION = 1;

// ── Vocabolario delle dimensioni ──────────────────────────────────────────
// Set canonico = le 9 dimensioni proposte in §5/§7.1 + "matter" (cultura↔
// natura), nativa di MindRoute e senza equivalente §5. Il set §5 è dichiarato
// "da validare contro la matrice" (§7.1), quindi il Graph lo ospita per intero
// come spazio-obiettivo; la MISURAZIONE odierna copre solo il sottoinsieme
// mappato dai 5 assi esistenti (MEASURED_DIMENSIONS). Le altre esistono nello
// schema (forward-compat) ma restano non misurate finché la mappatura dei chip
// non viene estesa — estensione da proporre, non da implementare qui.

export type DimensionKey =
  | "authenticity"    // locale/reale ↔ curato/turistico
  | "pace"            // densità ↔ lentezza                (non misurata oggi)
  | "novelty"         // imprevisto ↔ familiare            (non misurata oggi)
  | "comfort"         // quanto il riposo pesa nelle scelte
  | "social_energy"   // immersione tra persone ↔ osservazione
  | "walkability"     // tolleranza/piacere del camminare   (non misurata oggi)
  | "food"            // quanto il cibo è motore del viaggio (non misurata oggi)
  | "control"         // pianificato ↔ emergente
  | "aesthetics"      // bellezza del percorso ↔ efficienza (non misurata oggi)
  | "matter";         // cultura ↔ natura (nativa MindRoute)

export const ALL_DIMENSIONS: DimensionKey[] = [
  "authenticity", "pace", "novelty", "comfort", "social_energy",
  "walkability", "food", "control", "aesthetics", "matter",
];

// Proiezione dei 5 assi correnti → dimensioni. Il valore [0,1] dell'asse è
// portato invariato (stessa scala di trait_snapshots): la compatibilità con
// lo storico è per costruzione. Nota di polarità: ogni asse conserva il proprio
// significato di polo documentato in AXIS_NAMES — qui mappiamo solo la chiave.
export const AXIS_TO_DIMENSION: Record<Axis, DimensionKey> = {
  exposure:  "authenticity",
  comfort:   "comfort",
  social:    "social_energy",
  matter:    "matter",
  structure: "control",
};

// Il sottoinsieme effettivamente misurabile oggi (immagine di AXIS_TO_DIMENSION).
export const MEASURED_DIMENSIONS: DimensionKey[] =
  Object.values(AXIS_TO_DIMENSION);

// ── Contesto di viaggio (§3.4) ────────────────────────────────────────────
// Un'evidenza senza contesto di viaggio non può essere instradata (§3.4):
// è quindi obbligatorio in ogni provenienza. La compagnia NON è un Fact neutro
// (§3.2): modula energia sociale, comfort, ritmo, budget — perciò vive qui.

export type Companions = "solo" | "couple" | "friends" | "family" | "unknown";
export type TripFormat = "weekend" | "short" | "long" | "unknown";

export type IntentId =
  | "disconnect"    // staccare
  | "find_self"     // ritrovarmi
  | "feel_alive"    // sentirsi vivo
  | "wonder"        // meravigliarsi
  | "celebrate"     // festeggiare
  | "step_out";     // uscire dalla comfort zone

export interface TravelContext {
  companions: Companions;
  format: TripFormat;
  intentId: IntentId | null;
}

/** Due contesti differiscono se cambia la compagnia O il formato (§3.3). */
export function contextsDiffer(a: TravelContext, b: TravelContext): boolean {
  return a.companions !== b.companions || a.format !== b.format;
}

/** Deriva il formato dalla durata (weekend ≤3, short 4-6, long ≥7). */
export function tripFormatFromDays(days: number | null | undefined): TripFormat {
  if (!days || days <= 0) return "unknown";
  if (days <= 3) return "weekend";
  if (days <= 6) return "short";
  return "long";
}

// ── Provenienza (§7.1) ────────────────────────────────────────────────────
// L'ordine dei pesi delle fonti è quello di §7.3/§8: smentita > conferma >
// pattern multi-viaggio > comportamento singolo > inferenza da quiz > prior.

export type EvidenceSource =
  | "conversation_deny"     // smentita esplicita — peso massimo (§8)
  | "conversation_confirm"  // conferma esplicita
  | "behavior"              // comportamento (pick, click, rigenerazione)
  | "quiz"                  // inferenza dalle risposte del quiz
  | "prior";                // proiezione da prior del Core

export const SOURCE_WEIGHT: Record<EvidenceSource, number> = {
  conversation_deny: 1.0,
  conversation_confirm: 0.85,
  behavior: 0.6,
  quiz: 0.4,
  prior: 0.2,
};

export interface Provenance {
  source: EvidenceSource;
  context: TravelContext;   // in quale contesto di viaggio è nato il segnale
  at: string;               // ISO timestamp
  note?: string;            // "inferita dalla risposta sulla serata, quiz 12/07"
}

// ── Strati del Graph (§7.1) ───────────────────────────────────────────────

export interface DimensionValue {
  key: DimensionKey;
  value: number;            // [0,1]
  confidence: number;       // [0,1] — sale con conferme concordanti, scende con divergenza
  provenance: Provenance[];
  // Solo nel Core: valori condizionali per contesto quando i dati mostrano
  // divergenza STABILE (§3.3) — es. energia sociale 0.3 da solo / 0.7 con amici.
  // Entrambi veri, nessuna contraddizione.
  conditional?: Array<{ when: Partial<TravelContext>; value: number; confidence: number }>;
}

/** Frase operativa derivata dalle dimensioni (§7.1). Il formato in cui il
 *  Graph parla al generatore: l'LLM di L5 riceve principi, non numeri. */
export interface Principle {
  id: string;
  text: string;
  fromDimensions: DimensionKey[];
  priority: number;         // ordinato per quanto serve l'Intento (§5-S5)
  provenance: Provenance[];
}

/** Tensione conservata, MAI mediata (§7.1). "Staccare"+"sentirmi vivo" non fa
 *  media: produce alternanza/sequenza. */
export interface Tension {
  id: string;
  poles: [string, string];
  resolution: string;       // come si risolve nel tempo (alternanza/sequenza), mai una media
  provenance: Provenance[];
}

/** Affermazione a bassa confidenza in attesa di verifica, con provenienza
 *  (§7.1). Coda di lavoro del Conversation Engine. Può essere condizionale
 *  ("in coppia: comfort alto — da verificare se vale in generale", §3.3). */
export interface OpenHypothesis {
  id: string;
  statement: string;
  dimension?: DimensionKey;
  confidence: number;
  conditional?: Partial<TravelContext>;
  provenance: Provenance;
}

/** L'Intento (§2): la trasformazione desiderata. È per natura uno State, non
 *  un tratto (§3.2) — nessuno ha bisogno di staccare per sempre. Può essere
 *  composito e in tensione (§2.2). */
export interface Intent {
  id: IntentId | null;
  confidence: number;
  composite?: IntentId[];
  provenance: Provenance[];
}

// ── I due livelli (§3.2) ──────────────────────────────────────────────────

/** Ciò che si ripete attraverso i contesti. Cambia lentamente, memoria lunga.
 *  NON contiene l'Intento (che è uno State). Può avere valori condizionali. */
export interface CoreIdentity {
  dimensions: Partial<Record<DimensionKey, DimensionValue>>;
  principles: Principle[];
  tensions: Tension[];
  openHypotheses: OpenHypothesis[];
}

/** La configurazione di QUESTO viaggio. Nasce a ogni viaggio, eredita i prior
 *  del Core, muore col viaggio lasciando in eredità solo ciò che il routing
 *  promuove (§3.2). Contiene l'Intento. */
export interface TravelState {
  id: string;
  context: TravelContext;
  intent: Intent;
  dimensions: Partial<Record<DimensionKey, DimensionValue>>;
  principles: Principle[];
  tensions: Tension[];
  openHypotheses: OpenHypothesis[];
  createdAt: string;
}

export interface TravelIdentityGraph {
  version: number;
  core: CoreIdentity;
  states: TravelState[];    // storico; l'ultimo è il viaggio corrente
}

export function emptyGraph(): TravelIdentityGraph {
  return {
    version: GRAPH_VERSION,
    core: { dimensions: {}, principles: [], tensions: [], openHypotheses: [] },
    states: [],
  };
}

// ── Mappatura 5 assi → dimensioni (compat trait_snapshots) ────────────────
// Proietta un TraitVector (lo snapshot già scritto) nel sottoinsieme misurato
// delle dimensioni del Graph. La confidenza nasce dalla distanza dal neutro:
// un asse a 0.5 non porta segnale → confidenza 0 (coerente con il prior EMA
// che scarta la banda neutra). |v-0.5|*2 ∈ [0,1].

export function confidenceFromValue(value: number): number {
  return Math.min(1, Math.abs(value - 0.5) * 2);
}

export function traitVectorToDimensions(
  vector: TraitVector,
  provenance: Provenance,
): Partial<Record<DimensionKey, DimensionValue>> {
  const out: Partial<Record<DimensionKey, DimensionValue>> = {};
  for (const axis of Object.keys(vector) as Axis[]) {
    const key = AXIS_TO_DIMENSION[axis];
    const value = vector[axis];
    out[key] = {
      key,
      value,
      confidence: confidenceFromValue(value),
      provenance: [provenance],
    };
  }
  return out;
}

// ── Regola di routing Core/State (§3.3) ───────────────────────────────────
// "Un'evidenza scrive SEMPRE nello State del viaggio corrente. Scrive nel Core
//  solo quando lo stesso segnale ricorre in almeno due State con contesto
//  diverso." Fino ad allora il Core registra al massimo un'ipotesi aperta
//  condizionale. Corollario: dimensioni con divergenza stabile per contesto →
//  valori condizionali nel Core, non contraddizione (§3.3, split di contesto §3.4).

/** Il lato ("polo") verso cui una dimensione pende in uno State. Neutro entro
 *  la banda [0.42,0.58] — la stessa che il prior EMA scarta. */
export type Lean = "left" | "right" | "neutral";

export function leanOf(value: number): Lean {
  if (value > 0.58) return "right";
  if (value < 0.42) return "left";
  return "neutral";
}

export interface CorePromotion {
  kind: "core" | "core_conditional_hypothesis" | "state_only";
  dimension: DimensionKey;
  value?: number;
  confidence?: number;
  conditional?: Array<{ when: Partial<TravelContext>; value: number; confidence: number }>;
  hypothesis?: OpenHypothesis;
  /** Gli State (id) che hanno concorso alla decisione — provenienza della promozione. */
  supportingStateIds: string[];
}

/**
 * Valuta se una dimensione debba promuovere al Core, dato lo storico degli
 * State. Pura, senza effetti: la usa integrateStateIntoGraph() per ricostruire
 * il Core, ed è direttamente testabile (test di isolamento di contesto, §10).
 *
 * Regola:
 *  - il segnale (lean non neutro) ricorre in ≥2 State con contesto DIVERSO
 *    e concorde nella direzione → promozione a valore di Core;
 *  - ricorre cross-contesto ma con direzioni OPPOSTE stabili → valore
 *    CONDIZIONALE per contesto (non contraddizione, §3.3);
 *  - appare ma non cross-contesto (uno State, o più State stesso contesto) →
 *    ipotesi aperta condizionale nel Core;
 *  - non appare → resta nello State.
 */
export function evaluateCorePromotion(
  dimension: DimensionKey,
  states: TravelState[],
): CorePromotion {
  // Raccogli gli State in cui la dimensione porta un lean non neutro.
  const leaning = states
    .map((s) => ({ s, dim: s.dimensions[dimension] }))
    .filter((x): x is { s: TravelState; dim: DimensionValue } => !!x.dim && leanOf(x.dim.value) !== "neutral");

  if (leaning.length === 0) {
    return { kind: "state_only", dimension, supportingStateIds: [] };
  }

  // Cerca coppie cross-contesto (contesti che differiscono).
  const rightLeaning = leaning.filter((x) => leanOf(x.dim.value) === "right");
  const leftLeaning = leaning.filter((x) => leanOf(x.dim.value) === "left");

  const hasCrossContext = (group: typeof leaning): boolean => {
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++)
        if (contextsDiffer(group[i].s.context, group[j].s.context)) return true;
    return false;
  };

  const rightCross = hasCrossContext(rightLeaning);
  const leftCross = hasCrossContext(leftLeaning);

  // Divergenza stabile per contesto: entrambi i poli ricorrono, ciascuno in un
  // contesto diverso → valori condizionali (§3.3), il Core si arricchisce.
  const rightCtx = new Set(rightLeaning.map((x) => `${x.s.context.companions}|${x.s.context.format}`));
  const leftCtx = new Set(leftLeaning.map((x) => `${x.s.context.companions}|${x.s.context.format}`));
  const opposedByContext =
    rightLeaning.length > 0 && leftLeaning.length > 0 &&
    Array.from(rightCtx).every((c) => !leftCtx.has(c)); // nessun contesto sta su entrambi i poli

  if (opposedByContext && (rightCross || leftCross || (rightCtx.size + leftCtx.size >= 2))) {
    const conditional = [
      ...aggregateByContext(rightLeaning),
      ...aggregateByContext(leftLeaning),
    ];
    return {
      kind: "core",
      dimension,
      conditional,
      supportingStateIds: leaning.map((x) => x.s.id),
    };
  }

  // Promozione: un polo concorde ricorre cross-contesto. Ma si generalizza SOLO
  // lungo gli attributi di contesto effettivamente VARIATI tra gli State di
  // supporto; quelli costanti restano CONDIZIONI (non è provato che il valore
  // valga fuori da essi). È il presidio anti-contaminazione di §3.1/§10: comfort
  // visto solo in viaggi di coppia — anche di formati diversi — diventa un valore
  // "in coppia", non un valore generale che si proietterebbe su un viaggio con
  // amici. Solo quando VARIA anche la compagnia il valore diventa companions-agnostico.
  const winner = rightCross ? rightLeaning : leftCross ? leftLeaning : null;
  if (winner) {
    const value = mean(winner.map((x) => x.dim.value));
    const confidence = Math.min(1, mean(winner.map((x) => x.dim.confidence)) + 0.1 * (winner.length - 1));
    const supportingStateIds = winner.map((x) => x.s.id);
    const companionsSet = new Set(winner.map((x) => x.s.context.companions));
    const formatSet = new Set(winner.map((x) => x.s.context.format));
    const when: Partial<TravelContext> = {};
    if (companionsSet.size === 1) when.companions = Array.from(companionsSet)[0];
    if (formatSet.size === 1) when.format = Array.from(formatSet)[0];
    if (Object.keys(when).length === 0) {
      // Ha variato sia compagnia sia formato → valore di Core generale.
      return { kind: "core", dimension, value, confidence, supportingStateIds };
    }
    // Ha variato solo un attributo → valore di Core condizionato sul costante.
    return { kind: "core", dimension, conditional: [{ when, value, confidence }], supportingStateIds };
  }

  // Appare ma non cross-contesto → ipotesi aperta condizionale nel Core.
  const strongest = leaning.slice().sort((a, b) => b.dim.confidence - a.dim.confidence)[0];
  const side = leanOf(strongest.dim.value);
  return {
    kind: "core_conditional_hypothesis",
    dimension,
    supportingStateIds: leaning.map((x) => x.s.id),
    hypothesis: {
      id: `hyp:${dimension}:${strongest.s.id}`,
      statement: `${dimension} tende a ${side} nel contesto ${strongest.s.context.companions}/${strongest.s.context.format} — da verificare se vale in generale`,
      dimension,
      confidence: strongest.dim.confidence,
      conditional: { companions: strongest.s.context.companions, format: strongest.s.context.format },
      provenance: strongest.dim.provenance[0],
    },
  };
}

function aggregateByContext(
  group: Array<{ s: TravelState; dim: DimensionValue }>,
): Array<{ when: Partial<TravelContext>; value: number; confidence: number }> {
  type Row = { s: TravelState; dim: DimensionValue };
  const byCtx = new Map<string, Row[]>();
  for (const x of group) {
    const k = `${x.s.context.companions}|${x.s.context.format}`;
    const bucket = byCtx.get(k);
    if (bucket) bucket.push(x);
    else byCtx.set(k, [x]);
  }
  return Array.from(byCtx.values()).map((xs: Row[]) => ({
    when: { companions: xs[0].s.context.companions, format: xs[0].s.context.format },
    value: mean(xs.map((x: Row) => x.dim.value)),
    confidence: mean(xs.map((x: Row) => x.dim.confidence)),
  }));
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0.5;
}

/**
 * Integra un nuovo State nel Graph e ricostruisce il Core applicando la regola
 * di routing a ogni dimensione. Lo State è SEMPRE aggiunto (l'evidenza scrive
 * sempre nello State); il Core è ricalcolato dagli State per ricorrenza
 * cross-contesto. Non muta gli argomenti — ritorna un nuovo Graph.
 */
export function integrateStateIntoGraph(
  graph: TravelIdentityGraph,
  newState: TravelState,
): TravelIdentityGraph {
  const states = [...graph.states, newState];
  const dimensions: Partial<Record<DimensionKey, DimensionValue>> = {};
  const openHypotheses: OpenHypothesis[] = [];

  for (const dim of ALL_DIMENSIONS) {
    const promo = evaluateCorePromotion(dim, states);
    if (promo.kind === "core") {
      const support = promo.supportingStateIds.flatMap(
        (id) => states.find((s) => s.id === id)?.dimensions[dim]?.provenance ?? [],
      );
      dimensions[dim] = {
        key: dim,
        value: promo.value ?? 0.5,
        confidence: promo.confidence ?? 0,
        provenance: support,
        conditional: promo.conditional,
      };
    } else if (promo.kind === "core_conditional_hypothesis" && promo.hypothesis) {
      openHypotheses.push(promo.hypothesis);
    }
    // state_only → niente nel Core (il segnale vive già nello State)
  }

  return {
    version: GRAPH_VERSION,
    core: {
      ...graph.core,
      dimensions,
      openHypotheses,
    },
    states,
  };
}

/**
 * Lettura per la generazione: il Core FILTRATO dallo State corrente, mai il
 * Core nudo (§3.3). Dove esiste un valore condizionale che matcha il contesto,
 * quello vince sul valore generale del Core; poi lo State corrente (più
 * specifico e recente) sovrascrive. È il punto anti-contaminazione (§3.1):
 * un boutique-hotel appreso in coppia non deve proiettarsi su un viaggio con amici.
 */
export function readGraphForContext(
  graph: TravelIdentityGraph,
  context: TravelContext,
): Partial<Record<DimensionKey, DimensionValue>> {
  const out: Partial<Record<DimensionKey, DimensionValue>> = {};

  for (const [k, dv] of Object.entries(graph.core.dimensions) as Array<[DimensionKey, DimensionValue]>) {
    if (!dv) continue;
    const cond = dv.conditional?.find((c) => contextMatches(c.when, context));
    if (dv.conditional && dv.conditional.length > 0) {
      // Dimensione condizionale: usa SOLO il ramo che matcha il contesto.
      // Se nessun ramo matcha, la dimensione non si proietta (niente
      // contaminazione dal ramo di un altro contesto).
      if (cond) out[k] = { key: k, value: cond.value, confidence: cond.confidence, provenance: dv.provenance };
    } else {
      out[k] = dv;
    }
  }

  // Lo State corrente sovrascrive (più recente e specifico).
  const current = graph.states[graph.states.length - 1];
  if (current) {
    for (const [k, dv] of Object.entries(current.dimensions) as Array<[DimensionKey, DimensionValue]>) {
      if (dv) out[k] = dv;
    }
  }
  return out;
}

function contextMatches(when: Partial<TravelContext>, ctx: TravelContext): boolean {
  if (when.companions !== undefined && when.companions !== ctx.companions) return false;
  if (when.format !== undefined && when.format !== ctx.format) return false;
  if (when.intentId !== undefined && when.intentId !== ctx.intentId) return false;
  return true;
}
