// ─────────────────────────────────────────────────────────────────────────
// Verifica dello schema del Travel Identity Graph (Core/State) e della regola
// di routing §3.3. Nessun DB: struttura dati pura.
//
//   npx tsx script/verify-graph-schema.ts
//
// Copre: mappa 5 assi → dimensioni; routing (state-only / ipotesi condizionale
// / promozione a Core cross-contesto); valori condizionali per contesto;
// isolamento di contesto (§10, test anti-contaminazione).
// ─────────────────────────────────────────────────────────────────────────
import {
  GRAPH_VERSION, emptyGraph, integrateStateIntoGraph, readGraphForContext,
  traitVectorToDimensions, confidenceFromValue, contextsDiffer, tripFormatFromDays,
  AXIS_TO_DIMENSION, MEASURED_DIMENSIONS,
  type TravelState, type TravelContext, type DimensionKey, type DimensionValue, type Provenance,
} from "../shared/graph";
import { type TraitVector } from "../shared/traits";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? " ✓" : " ✗ FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

const prov = (ctx: TravelContext): Provenance => ({ source: "behavior", context: ctx, at: new Date().toISOString() });

function state(id: string, ctx: TravelContext, dims: Partial<Record<DimensionKey, number>>): TravelState {
  const dimensions: Partial<Record<DimensionKey, DimensionValue>> = {};
  for (const [k, v] of Object.entries(dims) as Array<[DimensionKey, number]>) {
    dimensions[k] = { key: k, value: v, confidence: confidenceFromValue(v), provenance: [prov(ctx)] };
  }
  return { id, context: ctx, intent: { id: null, confidence: 0, provenance: [] },
    dimensions, principles: [], tensions: [], openHypotheses: [], createdAt: new Date().toISOString() };
}

const COUPLE: TravelContext = { companions: "couple", format: "short", intentId: null };
const FRIENDS: TravelContext = { companions: "friends", format: "long", intentId: null };
const COUPLE_2: TravelContext = { companions: "couple", format: "weekend", intentId: null };

console.log("═══ 0. Vocabolario e helper ═══");
check("GRAPH_VERSION definito", GRAPH_VERSION >= 1);
check("5 assi mappati su dimensioni", MEASURED_DIMENSIONS.length === 5, MEASURED_DIMENSIONS.join(", "));
check("exposure→authenticity, matter→matter", AXIS_TO_DIMENSION.exposure === "authenticity" && AXIS_TO_DIMENSION.matter === "matter");
check("contesti diversi se cambia compagnia", contextsDiffer(COUPLE, FRIENDS));
check("contesti uguali stessa compagnia+formato", !contextsDiffer(COUPLE, { ...COUPLE }));
check("tripFormatFromDays: 2→weekend, 5→short, 9→long",
  tripFormatFromDays(2) === "weekend" && tripFormatFromDays(5) === "short" && tripFormatFromDays(9) === "long");

console.log("═══ 1. Mappa TraitVector → dimensioni (neutro → confidenza 0) ═══");
const v: TraitVector = { exposure: 0.9, comfort: 0.5, social: 0.2, matter: 0.5, structure: 0.75 };
const dims = traitVectorToDimensions(v, prov(COUPLE));
check("authenticity da exposure=0.9, confidenza alta", !!dims.authenticity && dims.authenticity!.confidence > 0.7);
check("comfort=0.5 → confidenza 0 (nessun segnale)", dims.comfort!.confidence === 0);
check("ogni dimensione porta provenienza", Object.values(dims).every((d) => d!.provenance.length > 0));

console.log("═══ 2. Routing: UN solo State → niente nel Core (state-only) ═══");
let g = integrateStateIntoGraph(emptyGraph(), state("s1", COUPLE, { comfort: 0.15 }));
check("Core senza valore comfort (un solo contesto)", !g.core.dimensions.comfort);
check("Core registra un'ipotesi aperta condizionale", g.core.openHypotheses.some((h) => h.dimension === "comfort" && !!h.conditional),
  g.core.openHypotheses.map((h) => h.dimension).join(", "));

console.log("═══ 3. Routing: due State STESSO contesto → ancora niente Core ═══");
g = integrateStateIntoGraph(g, state("s2", COUPLE_2.companions === COUPLE.companions ? COUPLE : COUPLE, { comfort: 0.18 }));
check("stesso contesto ripetuto non promuove al Core", !g.core.dimensions.comfort);

console.log("═══ 4. Routing: due State contesto DIVERSO, stesso verso → promozione al Core ═══");
let g2 = integrateStateIntoGraph(emptyGraph(), state("a", COUPLE, { comfort: 0.15 }));
g2 = integrateStateIntoGraph(g2, state("b", FRIENDS, { comfort: 0.20 }));
check("comfort promosso al Core (ricorrenza cross-contesto)", !!g2.core.dimensions.comfort,
  g2.core.dimensions.comfort ? `value=${g2.core.dimensions.comfort.value.toFixed(2)}` : "assente");
check("il valore di Core porta provenienza da entrambi gli State",
  (g2.core.dimensions.comfort?.provenance.length ?? 0) >= 2);

console.log("═══ 5. Valori CONDIZIONALI per contesto (divergenza stabile, §3.3) ═══");
// social_energy: bassa da coppia, alta con amici — entrambe vere, nessuna contraddizione.
let g3 = integrateStateIntoGraph(emptyGraph(), state("c", COUPLE, { social_energy: 0.2 }));
g3 = integrateStateIntoGraph(g3, state("f", FRIENDS, { social_energy: 0.8 }));
const se = g3.core.dimensions.social_energy;
check("social_energy nel Core come valore condizionale", !!se && !!se.conditional && se.conditional.length === 2,
  se?.conditional ? se.conditional.map((c) => `${c.when.companions}=${c.value.toFixed(2)}`).join(" ") : "no conditional");

console.log("═══ 6. Isolamento di contesto (§10 anti-contaminazione) ═══");
// Core con condizionale "comfort alto in coppia"; letto per uno State con amici
// NON deve ereditare il condizionale del contesto coppia (il boutique hotel §3.1).
let g4 = integrateStateIntoGraph(emptyGraph(), state("p", COUPLE, { comfort: 0.1 }));   // comfort "alto" (plush = valore basso sull'asse)
g4 = integrateStateIntoGraph(g4, state("q", COUPLE_2, { comfort: 0.12 }));               // di nuovo coppia (contesto simile)
// Aggiungo uno State con amici SENZA segnale comfort e leggo per quel contesto.
const friendsState = state("r", FRIENDS, { matter: 0.7 });
g4 = integrateStateIntoGraph(g4, friendsState);
const readForFriends = readGraphForContext(g4, FRIENDS);
// comfort è emerso solo in contesti "coppia" → non promosso cross-contesto →
// non è un valore di Core generale → non si proietta sul contesto amici.
check("comfort del contesto coppia NON contamina il contesto amici", !readForFriends.comfort,
  readForFriends.comfort ? `LEAK value=${readForFriends.comfort.value.toFixed(2)}` : "nessuna proiezione (corretto)");
check("lo State corrente (amici) proietta il suo matter", !!readForFriends.matter);

console.log(failures === 0 ? "\nTUTTO OK" : `\n${failures} FALLIMENTI`);
process.exit(failures === 0 ? 0 : 1);
