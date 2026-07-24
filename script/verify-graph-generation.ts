// ─────────────────────────────────────────────────────────────────────────
// Verifica della generazione guidata dal Graph (step 3). Le famiglie di test
// della §10 su profili sintetici, al livello di COSTRUZIONE del prompt
// (deterministico, nessuna chiamata LLM — è il gate da superare PRIMA di
// qualsiasi test manuale):
//   - Tracciabilità: il prompt L5 contiene Decision Cascade + obbligo di
//     tracciabilità; nessuna decisione orfana ammessa.
//   - Discriminazione: due Graph diversi, stessa destinazione/Facts →
//     blocchi Graph visibilmente diversi (principi/dimensioni).
//   - Discriminazione d'Intento: due profili con Intenti diversi → effetto
//     sull'arco diverso (struttura, non solo aggettivi).
//   - Reversibilità: GRAPH_GEN=0 → nessun blocco Graph, torna il prompt vecchio.
//   - Descrittore neutro: revealed-preference fira su destinazioni GENERATE
//     (fuori catalogo) grazie al descrittore neutro.
//
//   npx tsx script/verify-graph-generation.ts
// ─────────────────────────────────────────────────────────────────────────
import type { ProfilingInput } from "../server/matching-engine";
import { buildGraphBlock, buildGenerationGraph, inferIntent, buildGenerationContext } from "../server/graph-build";
import { buildPromptV2 } from "../server/matching-engine-v2";
import { revealedPreferenceVector } from "../server/destination-traits";

let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? " ✓" : " ✗ FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

function input(answers: string[], over: Partial<ProfilingInput> = {}): ProfilingInput {
  return {
    answers, budget: "medium", departure: "Milano", days: 7, leaveDate: "2026-09-10",
    companions: "couple", lang: "it", ...over,
  };
}
const L1 = (goal: string, pace: string) => JSON.stringify({ emotional_goals: [goal], pace });

// Due profili con preferenze SIMILI ma Intenti diversi (rallentare vs sentirsi vivo).
const slowInput  = input(["path_a", L1("Silenzio e respiro", "relaxed"), "autentico", "intimo"]);
const aliveInput = input(["path_a", L1("Sentirmi vivo", "intense"), "autentico", "intimo"]);
// Due profili con dimensioni DIVERSE (per la discriminazione generale).
const cultureInput = input(["path_a", L1("Capire un posto", "balanced"), "culturale", "silenzioso"]);
const natureInput  = input(["path_a", L1("Natura vera", "balanced"), "avventuroso", "festoso"], { companions: "friends" });

console.log("═══ 0. Inferenza dell'Intento (Principio Zero) ═══");
const ctxSlow = buildGenerationContext(slowInput);
check("silenzio/rallentare → Intento 'staccare'", inferIntent(slowInput, ctxSlow).id === "disconnect",
  String(inferIntent(slowInput, ctxSlow).id));
const ctxAlive = buildGenerationContext(aliveInput);
check("sentirsi vivo → Intento 'feel_alive'", inferIntent(aliveInput, ctxAlive).id === "feel_alive",
  String(inferIntent(aliveInput, ctxAlive).id));

console.log("═══ 1. Tracciabilità: cascade + obbligo di tracciabilità nel prompt L5 ═══");
const gCulture = buildGraphBlock(cultureInput, null, true);
check("contiene TRAVEL IDENTITY GRAPH", gCulture.includes("TRAVEL IDENTITY GRAPH"));
check("contiene PRINCIPIO ZERO (Intento)", gCulture.includes("PRINCIPIO ZERO"));
check("contiene la Decision Cascade D1..D7",
  ["D1.", "D2.", "D3.", "D4.", "D5.", "D6.", "D7."].every((d) => gCulture.includes(d)));
check("contiene l'obbligo di TRACCIABILITÀ", gCulture.includes("TRACCIABILITÀ"));
check("ribadisce CRITERI, NON NOMI", gCulture.includes("CRITERI, NON NOMI"));

console.log("═══ 2. Discriminazione: due Graph diversi → blocchi diversi ═══");
const gNature = buildGraphBlock(natureInput, null, true);
check("i due blocchi Graph differiscono", gCulture !== gNature);
// I principi devono divergere sul baricentro cultura↔natura.
check("cultura → principio culturale", /baricentro è culturale/i.test(gCulture));
check("natura → principio natura", /baricentro è la natura/i.test(gNature));

console.log("═══ 3. Discriminazione d'INTENTO: stesso profilo, Intento diverso → arco diverso ═══");
const gSlow = buildGraphBlock(slowInput, null, true);
const gAlive = buildGraphBlock(aliveInput, null, true);
const arcOf = (block: string) => (block.match(/Effetto sull'arco: (.+)/)?.[1] ?? "").trim();
const arcSlow = arcOf(gSlow), arcAlive = arcOf(gAlive);
check("l'effetto sull'arco DIFFERISCE tra i due Intenti", !!arcSlow && !!arcAlive && arcSlow !== arcAlive);
check("staccare → picco abbassato/spostato avanti", /ABBASSAL|STATO|quiete/i.test(arcSlow), arcSlow.slice(0, 60) + "…");
check("sentirsi vivo → intensità anticipata/alta", /ALZA|ANTICIPA|rottura/i.test(arcAlive), arcAlive.slice(0, 60) + "…");

console.log("═══ 4. Reversibilità: GRAPH_GEN=0 → nessun Graph, prompt vecchio ═══");
process.env.GRAPH_GEN = "0";
const off = buildGraphBlock(cultureInput, null, true);
const promptOff = buildPromptV2(cultureInput, "", off);
check("buildGraphBlock('') quando disattivato", off === "");
check("prompt disattivato MANTIENE le risposte grezze", promptOff.includes("Quiz answers:"));
delete process.env.GRAPH_GEN;
const on = buildGraphBlock(cultureInput, null, true);
const promptOn = buildPromptV2(cultureInput, "", on);
check("prompt attivo NON contiene le risposte grezze", !promptOn.includes("Quiz answers:"));
check("prompt attivo contiene il Graph", promptOn.includes("TRAVEL IDENTITY GRAPH"));
check("prompt attivo tiene i Facts logistici", promptOn.includes("FACTS — logistics") || promptOn.includes("Budget:"));
check("prompt attivo inietta l'arco guidato dall'Intento nella PHASE A", promptOn.includes("INTENT-DRIVEN ARC"));

console.log("═══ 5. Descrittore neutro: revealed-preference fira FUORI catalogo ═══");
// Nomi non presenti nella mappa curata: senza descrittore → null; con descrittore → fira.
const chosen = { name: "Salonicco, Grecia", neutralDescriptor: "Mediterranean port city, historic markets, Byzantine museums, walkable quarters" };
const rejected = [{ name: "Tromsø, Norvegia", neutralDescriptor: "Arctic coastal town, fjords, wild nature, northern lights" }];
check("senza descrittore (solo nomi generati) → null onesto",
  revealedPreferenceVector({ name: chosen.name }, [{ name: rejected[0].name }]) === null);
const rev = revealedPreferenceVector(chosen, rejected);
check("con descrittore neutro → contrasto calcolato", !!rev, rev ? `matter=${rev.matter.toFixed(2)}` : "null");
check("la scelta 'culturale' vs scarto 'natura' → matter < 0.5", !!rev && rev.matter < 0.5);

console.log(failures === 0 ? "\nTUTTO OK" : `\n${failures} FALLIMENTI`);
process.exit(failures === 0 ? 0 : 1);
