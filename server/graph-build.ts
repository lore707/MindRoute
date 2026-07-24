// ─────────────────────────────────────────────────────────────────────────
// Graph-driven generation (step 3 dell'ordine di costruzione §12).
//
// Costruisce un Travel Identity Graph IN MEMORIA per la generazione corrente
// (nessuna tabella, nessuna migrazione) e lo rende come blocco di prompt che
// SOSTITUISCE le risposte grezze del quiz per il generatore L5 (§2, §12.3):
//   - lo State corrente dalle risposte del quiz (computeTraitVector) + contesto
//     (compagnia, formato, Intento);
//   - il Core dal prior EMA (getTraitPriorForUser), se esiste;
//   - readGraphForContext(graph, contesto) → mai il Core nudo (§3.3).
//
// L'Intento è il Principio Zero (§2.3): precede e ordina ogni principio, e
// deforma l'arco narrativo (§7-D2 / Catalogo delle Trasformazioni §9). La
// generazione segue la Decision Cascade (§7): quartieri → arco → alloggio →
// esperienze → ristorazione → trasporti → micro, ogni stadio vincolato dai
// precedenti. Ogni decisione deve poter citare il principio/Intento che la
// giustifica (tracciabilità §7, prodotta dal modello, non mostrata all'utente).
//
// Reversibilità: attivo dietro flag GRAPH_GEN (default on). GRAPH_GEN=0 →
// il generatore torna al prompt precedente, senza redeploy.
// ─────────────────────────────────────────────────────────────────────────

import type { ProfilingInput } from "./matching-engine";
import { computeTraitVector, extractChipKeys, AXIS_NAMES, type Axis } from "@shared/traits";
import {
  emptyGraph, integrateStateIntoGraph, readGraphForContext, traitVectorToDimensions,
  tripFormatFromDays, AXIS_TO_DIMENSION, GRAPH_VERSION,
  type TravelContext, type TravelState, type Companions, type IntentId,
  type DimensionKey, type DimensionValue, type Provenance, type Intent,
} from "@shared/graph";
import type { TraitPrior } from "./trait-prior";

export function graphGenEnabled(): boolean {
  return process.env.GRAPH_GEN !== "0";
}

// ── Intento: inferenza dalle chip need/feeling ────────────────────────────
// Mappa le chiavi canoniche del quiz (NEED_TRAITS + sensazioni L1) sugli Intenti
// del §9. L'Intento è un'inferenza, non un campo del form (§2.2): confidenza
// proporzionale a quante evidenze concordano.
const NEED_TO_INTENT: Record<string, IntentId> = {
  disconnect: "disconnect",
  slowdown:   "disconnect",   // rallentare/silenzio = decomprimere
  recharge:   "disconnect",
  alive:      "feel_alive",
  surprise:   "wonder",
  celebrate:  "celebrate",
  findself:   "find_self",
  change:     "step_out",
  free:       "step_out",
};

const INTENT_IT: Record<IntentId, string> = {
  disconnect: "staccare / decomprimere",
  find_self:  "ritrovarsi",
  feel_alive: "sentirsi vivo",
  wonder:     "meravigliarsi",
  celebrate:  "festeggiare",
  step_out:   "uscire dalla comfort zone",
};

export function inferIntent(input: ProfilingInput, context: TravelContext): Intent {
  const keys = extractChipKeys(input.answers);
  const hits: IntentId[] = [];
  for (const k of keys) if (NEED_TO_INTENT[k]) hits.push(NEED_TO_INTENT[k]);
  const prov: Provenance[] = [{ source: "quiz", context, at: new Date().toISOString(), note: "inferito dalle chip need/feeling del quiz" }];
  if (hits.length === 0) return { id: null, confidence: 0, provenance: prov };
  // Intento dominante = il più frequente; se ne emergono due distinti forti è
  // composito e in tensione (§2.2), conservata come alternanza (mai media).
  const counts = new Map<IntentId, number>();
  for (const h of hits) counts.set(h, (counts.get(h) ?? 0) + 1);
  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const dominant = ranked[0][0];
  const composite = ranked.filter(([, n]) => n >= 1).map(([id]) => id);
  const confidence = Math.min(0.9, 0.4 + 0.2 * ranked[0][1]);
  return {
    id: dominant,
    confidence,
    composite: composite.length > 1 ? composite : undefined,
    provenance: prov,
  };
}

// L'effetto dell'Intento sulla FORMA dell'arco (§7-D2, Catalogo Trasformazioni
// §9): posizione e natura del picco, densità, ruolo della chiusura. È il cuore
// della discriminazione d'Intento (§10): due profili con preferenze identiche e
// Intenti diversi devono produrre archi strutturalmente diversi, non solo toni.
const INTENT_ARC: Record<IntentId, string> = {
  disconnect:
    "Sposta il PICCO in avanti e ABBASSALO: il climax è uno STATO (una quiete raggiunta), non un evento. Primi giorni a bassa densità, molti margini non pianificati, il momento lento è il baricentro di ogni giornata. La chiusura non decomprime (si è già decompresso): consolida la calma. Se l'Intento è composito con 'sentirsi vivo', DOPPIO MOVIMENTO — decomprimere nei primi giorni, poi accendere: alternanza, mai media.",
  feel_alive:
    "ALZA e ANTICIPA l'intensità: il picco arriva presto ed è alto, un evento di rottura. Giornate dense verso l'inizio-centro, recupero pieno la sera (mai sacrificare il riposo per l'intensità). La CHIUSURA è decompressione. Isola almeno un momento di adrenalina/novità come apice.",
  wonder:
    "Costruisci verso un picco di STUPORE — un'esperienza che l'utente non si aspetta, collocata a metà-arco così l'attesa la carica. Semina piccole scoperte crescenti prima del picco. La meraviglia nasce dal contrasto: alterna ordinario e straordinario.",
  celebrate:
    "Concentra il viaggio su UN picco memorabile e social; se il budget è basso, sacrifica la distribuzione per rendere quel singolo momento indimenticabile. La chiusura celebra ciò che è stato.",
  find_self:
    "Il picco è un momento SOLITARIO e contemplativo, non un evento social. Proteggi spazio non pianificato e silenzioso. L'arco è interiore: meno tappe, più profondità; la chiusura è una presa di coscienza, non un finale spettacolare.",
  step_out:
    "L'arco è una progressione di sfide crescenti: ogni giorno spinge un po' oltre la comfort zone precedente. Il picco è l'esperienza più fuori-registro. La chiusura riconosce la distanza percorsa.",
};

// ── Costruzione del Graph per la generazione ──────────────────────────────

function companionsOf(input: ProfilingInput): Companions {
  const c = (input.companions ?? "").toLowerCase();
  if (/(solo|alone|da solo)/.test(c)) return "solo";
  if (/(couple|coppia|partner)/.test(c)) return "couple";
  if (/(family|famiglia)/.test(c)) return "family";
  if (/(friend|amici)/.test(c)) return "friends";
  return "unknown";
}

export function buildGenerationContext(input: ProfilingInput): TravelContext {
  const ctx: TravelContext = {
    companions: companionsOf(input),
    format: tripFormatFromDays(input.days),
    intentId: null,
  };
  ctx.intentId = inferIntent(input, ctx).id;
  return ctx;
}

/** Costruisce il Graph in memoria: Core dal prior (ricorrenza cross-viaggio),
 *  State corrente dalle risposte del quiz. Ritorna anche la vista letta per il
 *  contesto (readGraphForContext) e l'Intento. */
export function buildGenerationGraph(input: ProfilingInput, prior?: TraitPrior | null) {
  const context = buildGenerationContext(input);
  const intent = inferIntent(input, context);

  let graph = emptyGraph();
  // Core dal prior EMA: rappresenta ciò che ricorre attraverso i viaggi passati.
  if (prior && prior.snapshotCount >= 3) {
    const prov: Provenance = { source: "prior", context, at: new Date().toISOString(), note: `EMA su ${prior.snapshotCount} viaggi (${prior.confirmedCount} confermati)` };
    graph.core.dimensions = traitVectorToDimensions(prior.vector, prov);
  }
  // State corrente dal quiz.
  const quizVector = computeTraitVector({
    answers: input.answers ?? [],
    companions: input.companions ?? null,
    budget: input.budget ?? null,
    travelStyle: input.travelStyle ?? null,
    constraints: input.constraints ?? null,
  });
  const stateProv: Provenance = { source: "quiz", context, at: new Date().toISOString(), note: "quiz corrente" };
  const currentState: TravelState = {
    id: "current",
    context,
    intent,
    dimensions: traitVectorToDimensions(quizVector, stateProv),
    principles: [], tensions: [], openHypotheses: [],
    createdAt: new Date().toISOString(),
  };
  graph = integrateStateIntoGraph(graph, currentState);

  const view = readGraphForContext(graph, context);
  return { graph, view, intent, context, quizVector };
}

// ── Sintesi dei principi (S5, deterministica) ─────────────────────────────
// Frasi operative dalle dimensioni con confidenza sufficiente. È il formato in
// cui il Graph parla al generatore (§7.1: l'LLM riceve principi, non numeri).
// Ogni principio dichiara le dimensioni che lo giustificano (tracciabilità).

interface OpPrinciple { text: string; from: DimensionKey[] }

// Per ogni dimensione misurata: frase per polo sinistro / destro. Soglia sul
// valore letto dal Graph (banda neutra esclusa).
const PRINCIPLE_BY_DIM: Partial<Record<DimensionKey, { left: string; right: string }>> = {
  authenticity: {
    left:  "Punta su luoghi riconoscibili e ben serviti; l'iconico non è un difetto.",
    right: "Dormi e vivi in quartieri veri, non in zone turistiche; nomina strade e mercati locali, non cartoline.",
  },
  comfort: {
    left:  "Il riposo conta: basi curate, trasporti morbidi, densità contenuta (2-3 ancore/giorno).",
    right: "Accetta il ruvido come parte dell'esperienza: essenziale ben posizionato, avventura sopra la comodità.",
  },
  social_energy: {
    left:  "Proteggi momenti di osservazione e intimità; serate raccolte, non folla.",
    right: "Cerca immersione tra le persone: piazze, mercati, vita sociale come motore delle serate.",
  },
  control: {
    left:  "Struttura la giornata: orari, prenotazioni, poche alternative aperte.",
    right: "Lascia margine all'emergente: poche fisse, spazio per l'imprevisto.",
  },
  matter: {
    left:  "Il baricentro è culturale: storia, arte, quartieri, cibo come lettura del luogo.",
    right: "Il baricentro è la natura: paesaggio, mare/montagna, immersione ambientale.",
  },
};

export function synthesizePrinciples(view: Partial<Record<DimensionKey, DimensionValue>>): OpPrinciple[] {
  const out: OpPrinciple[] = [];
  for (const [k, dv] of Object.entries(view) as Array<[DimensionKey, DimensionValue]>) {
    if (!dv) continue;
    const rule = PRINCIPLE_BY_DIM[k];
    if (!rule) continue;                     // dimensione non misurata → nessun principio
    if (dv.value >= 0.42 && dv.value <= 0.58) continue; // neutra → nessun segnale
    if (dv.confidence < 0.12) continue;      // troppo debole
    out.push({ text: dv.value < 0.5 ? rule.left : rule.right, from: [k] });
  }
  // max 5-7 attivi (§7.1): teniamo i più confidenti.
  return out.slice(0, 7);
}

// ── Tensioni (S4): conservate, mai mediate ────────────────────────────────
export function detectTensions(input: ProfilingInput): Array<{ poles: [string, string]; resolution: string }> {
  const keys = new Set(extractChipKeys(input.answers));
  const tensions: Array<{ poles: [string, string]; resolution: string }> = [];
  // staccare + sentirsi vivo → decompressione E rottura (alternanza nel tempo)
  if ((keys.has("disconnect") || keys.has("slowdown") || keys.has("recharge")) && keys.has("alive")) {
    tensions.push({ poles: ["staccare", "sentirsi vivo"], resolution: "alternanza nell'arco: prima decomprimere, poi accendere — mai una media tiepida" });
  }
  return tensions;
}

// ── Rendering del blocco di prompt ────────────────────────────────────────

function axisLabel(dim: DimensionKey, value: number, lang: "it" | "en"): string {
  // Riporta il polo leggibile per le dimensioni mappate sui 5 assi.
  const axis = (Object.keys(AXIS_TO_DIMENSION) as Axis[]).find((a) => AXIS_TO_DIMENSION[a] === dim);
  if (!axis) return dim;
  const names = AXIS_NAMES[axis];
  const labels = lang === "it" ? names.it : names;
  return value < 0.5 ? labels.left : labels.right;
}

/**
 * Il blocco che sostituisce le risposte grezze: Facts già altrove nel prompt;
 * qui l'interpretazione (Graph). `cascade` aggiunge la Decision Cascade +
 * tracciabilità (per il generatore dell'itinerario L5); per la sola proposta
 * L1 basta la parte identitaria.
 */
export function formatGraphBlock(
  args: { view: Partial<Record<DimensionKey, DimensionValue>>; intent: Intent; input: ProfilingInput; cascade: boolean },
): string {
  const lang: "it" | "en" = args.input.lang === "it" ? "it" : "en";
  const principles = synthesizePrinciples(args.view);
  const tensions = detectTensions(args.input);

  const intentLine = args.intent.id
    ? `${INTENT_IT[args.intent.id]}${args.intent.composite && args.intent.composite.length > 1 ? ` (composito, in tensione: ${args.intent.composite.map((i) => INTENT_IT[i]).join(" + ")})` : ""} — confidenza ${(args.intent.confidence).toFixed(2)}`
    : "non identificato con sicurezza (bassa confidenza) — trattalo come ipotesi, non forzare una trasformazione non supportata";
  const arcEffect = args.intent.id ? INTENT_ARC[args.intent.id] : "Arco canonico neutro (Arrivo → Esplorazione → Immersione → Picco → Chiusura), senza deformazioni.";

  const dimLines = (Object.entries(args.view) as Array<[DimensionKey, DimensionValue]>)
    .filter(([, dv]) => dv && !(dv.value >= 0.42 && dv.value <= 0.58) && dv.confidence >= 0.12)
    .map(([k, dv]) => `  - ${k}: ${axisLabel(k, dv.value, lang)} (${dv.value.toFixed(2)}, confidenza ${dv.confidence.toFixed(2)})`)
    .join("\n") || "  - (nessuna dimensione con segnale sufficiente: profilo ancora incerto, procedi con prudenza)";

  const principleLines = principles.length
    ? principles.map((p, i) => `  P${i + 1}. ${p.text}  [da: ${p.from.join(", ")}]`).join("\n")
    : "  (nessun principio forte: usa l'Intento e i Facts come guida primaria)";

  const tensionLines = tensions.length
    ? tensions.map((t) => `  - ${t.poles[0]} ⇄ ${t.poles[1]} → ${t.resolution}`).join("\n")
    : "  (nessuna tensione rilevata)";

  const cascadeBlock = args.cascade ? `

═══════════════════════════════════════
DECISION CASCADE — costruisci l'itinerario in QUEST'ORDINE (§7)
═══════════════════════════════════════
Ogni stadio riceve come VINCOLO le decisioni degli stadi precedenti. Non saltare stadi, non anticipare contenuto prima della struttura.
  D1. QUARTIERI — la decisione madre. Scegli il quartiere-base (dove dormire) e 2-4 quartieri-teatro, ciascuno giustificato da un principio. Test: se il quartiere-base è sostituibile con "il centro" senza perdere nulla, hai fallito D1.
  D2. ARCO NARRATIVO — PRIMA del contenuto. Deriva forma dell'arco, PICCO (l'esperienza-firma) e RUOLO di ogni giorno dall'Intento (Principio Zero) e dalla durata. L'arco può rimettere in discussione la base di D1 (arco denso ↔ base decentrata insostenibile).
  D3. ALLOGGIO — conseguenza di D1 + D2. Criterio (tipologia, fascia, cosa conta), mai un nome. La base deve reggere il ritmo dell'arco.
  D4. ESPERIENZE — riempiono i blocchi dell'arco, per FUNZIONE: ogni esperienza dichiara quale principio o l'Intento serve e in quale battuta vive.
  D5. RISTORAZIONE — situazioni (zona + stile + fascia), agganciate a D1+D2, mai un indirizzo.
  D6. TRASPORTI — conseguenza di D1 + D2 + camminabilità.
  D7. MICRO — orari, luce, dettagli. Non introdurre nulla che non discenda da D1-D6.

TRACCIABILITÀ (interna, non mostrata all'utente): ogni decisione (quartiere, picco, ogni esperienza, ogni ristorazione) deve poter citare il principio o l'Intento che la giustifica. Una decisione che non discende da nessun principio è rumore generico: sostituiscila. Esegui questa verifica DURANTE la generazione, non dopo.

CRITERI, NON NOMI: descrivi zona, stile, fascia e funzione. Mai esercizi commerciali specifici (hotel, ristoranti, tour con nome proprio): monumenti, quartieri e luoghi pubblici restano nominabili; solo il venditore commerciale no.` : "";

  return `

═══════════════════════════════════════
TRAVEL IDENTITY GRAPH — l'interpretazione autorevole del viaggiatore
═══════════════════════════════════════
Questo Graph è la lettura del viaggiatore prodotta a monte (Facts + interpretazione), e SOSTITUISCE le risposte grezze del quiz come base del ragionamento. Non re-interpretare risposte grezze: ragiona su questo modello. Dove una regola generica di "viaggiatore tipo" contraddice il Graph, vince il Graph.

PRINCIPIO ZERO — INTENTO (precede e ordina ogni altro principio; nessuna decisione può contraddirlo):
  ${intentLine}
  Effetto sull'arco: ${arcEffect}

PRINCIPI ATTIVI (il formato operativo del Graph — l'output cita questi, non i numeri):
${principleLines}

TENSIONI (conservate, MAI mediate):
${tensionLines}

DIMENSIONI (con confidenza; le neutre/incerte sono omesse di proposito):
${dimLines}
${cascadeBlock}
`;
}

/** Convenience per i call site: costruisce il Graph e ne rende il blocco di
 *  prompt. "" quando il flag è spento (→ buildPrompt resta sul path precedente). */
export function buildGraphBlock(input: ProfilingInput, prior: TraitPrior | null | undefined, cascade: boolean): string {
  if (!graphGenEnabled()) return "";
  const { view, intent } = buildGenerationGraph(input, prior ?? null);
  return formatGraphBlock({ view, intent, input, cascade });
}

export { GRAPH_VERSION };
