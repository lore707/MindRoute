// ─────────────────────────────────────────────────────────────────────────
// Verifica del write-path del profilo (trait vector + EMA).
//
//   npx tsx script/verify-trait-writepath.ts --dry
//     Nessun DB: prova la CATENA (decodifica risposte L1 → vettore non
//     neutro → derivazione vettore destinazione dal testo → blend → EMA).
//
//   $env:DATABASE_URL="..." ; npx tsx script/verify-trait-writepath.ts
//     Ispezione: colonne di trait_snapshots (raw_signal presente?), conteggi
//     per source, ultimi 5 snapshot con assi. Sola lettura.
//
//   $env:DATABASE_URL="..." ; npx tsx script/verify-trait-writepath.ts --simulate <userId>
//     Prova E2E: INSERT di uno snapshot di test via la stessa catena del
//     runtime → riletto dal DB → confronto valori → DELETE (cleanup).
//     Il valore DEVE risultare cambiato e non-neutro, o FAIL.
// ─────────────────────────────────────────────────────────────────────────
import { computeTraitVector, blendWithDestination, emaAggregate, MAPPING_VERSION, type TraitVector } from "../shared/traits";
import { getDestinationTraitVector, deriveDestinationTraitVector } from "../server/destination-traits";

const fmt = (v: TraitVector) => Object.entries(v).map(([a, x]) => `${a}=${x.toFixed(2)}`).join(" ");
const isNeutral = (v: TraitVector) => Object.values(v).every((x) => x > 0.42 && x < 0.58);
let failures = 0;
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`${ok ? " ✓" : " ✗ FAIL"} ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

// Input REALE del funnel live (QuizFast, ramo Sorprendimi, utente "cultura").
const L1_INPUT = {
  answers: ["path_a", JSON.stringify({ emotional_goals: ["Capire un posto", "Understand a place", "persone, cucina, storie vere"], pace: "balanced" })],
  companions: "couple", budget: "medium", travelStyle: null, constraints: null,
};
const DEST_TEXT = "Salonicco è la città dei mercati storici e dello street food: quartieri autentici lontani dai circuiti turistici, musei bizantini e vita che scorre lenta nelle taverne.";

async function dry() {
  console.log("═══ 1. Vettore dal quiz L1 (risposte JSON del funnel live) ═══");
  const quizV = computeTraitVector(L1_INPUT);
  console.log("   ", fmt(quizV));
  check("vettore NON neutro (la decodifica JSON funziona)", !isNeutral(quizV));
  check("asse matter tirato verso cultura (<0.42)", quizV.matter < 0.42, `matter=${quizV.matter.toFixed(2)}`);

  console.log("═══ 2. Vettore destinazione derivato dal testo del matcher ═══");
  const destV = deriveDestinationTraitVector(DEST_TEXT);
  check("derivazione riuscita (≥2 keyword)", !!destV, destV ? fmt(destV) : "null");

  console.log("═══ 3. Blend (revealed preference) ═══");
  const blended = destV ? blendWithDestination(quizV, destV) : quizV;
  console.log("   ", fmt(blended));
  check("il pick SPOSTA il vettore rispetto al solo quiz",
    Object.keys(quizV).some((a) => Math.abs((blended as any)[a] - (quizV as any)[a]) > 0.02));

  console.log("═══ 4. EMA su una storia di snapshot ═══");
  const history = [quizV, blended, blended];
  const ema = emaAggregate(history);
  console.log("   ", fmt(ema));
  check("EMA non neutro (il prior verrebbe iniettato nel prompt)", !isNeutral(ema));

  console.log("═══ 5. Fallback esatti dal catalogo curato ═══");
  check("kyoto → vettore dalla mappa", !!getDestinationTraitVector("Kyoto, Giappone"));
  check("destinazione ignota senza testo → null onesto", getDestinationTraitVector("Xyzzy, Nowhere") === null);
}

async function db(simulateUserId: number | null) {
  const { pool } = await import("../server/db");
  console.log("═══ Colonne di trait_snapshots ═══");
  const cols = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'trait_snapshots' ORDER BY ordinal_position");
  const names = cols.rows.map((r: any) => r.column_name);
  console.log("   ", names.join(", "));
  check("colonna raw_signal presente (senza, OGNI insert fallisce)", names.includes("raw_signal"));

  console.log("═══ Snapshot esistenti ═══");
  const counts = await pool.query("SELECT source, COUNT(*) n FROM trait_snapshots GROUP BY source");
  console.log("   ", counts.rows.map((r: any) => `${r.source}=${r.n}`).join("  ") || "(vuota)");
  const last = await pool.query("SELECT id, user_id, source, traits, created_at FROM trait_snapshots ORDER BY id DESC LIMIT 5");
  for (const r of last.rows) console.log(`    #${r.id} u${r.user_id} [${r.source}] ${fmt(r.traits)} ${r.created_at}`);

  if (simulateUserId != null) {
    console.log(`═══ Simulazione E2E (user ${simulateUserId}, con cleanup) ═══`);
    const quizV = computeTraitVector(L1_INPUT);
    const destV = deriveDestinationTraitVector(DEST_TEXT);
    const finalV = destV ? blendWithDestination(quizV, destV) : quizV;
    const ins = await pool.query(
      `INSERT INTO trait_snapshots (user_id, traits, source, mapping_version, raw_signal)
       VALUES ($1, $2, 'pick', $3, $4) RETURNING id`,
      [simulateUserId, JSON.stringify(finalV), MAPPING_VERSION, JSON.stringify({ answers: ["__verify_writepath__"] })]);
    const id = ins.rows[0].id;
    const back = await pool.query("SELECT traits FROM trait_snapshots WHERE id = $1", [id]);
    const readV = back.rows[0]?.traits as TraitVector | undefined;
    check("scrittura → rilettura identica", !!readV && JSON.stringify(readV) === JSON.stringify(finalV));
    check("valore scritto NON neutro", !!readV && !isNeutral(readV), readV ? fmt(readV) : "");
    await pool.query("DELETE FROM trait_snapshots WHERE id = $1", [id]);
    console.log(`    snapshot di test #${id} scritto, verificato e rimosso`);
  }
  await pool.end();
}

const args = process.argv.slice(2);
if (args.includes("--dry")) {
  await dry();
} else {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL mancante. Usa --dry per la prova senza DB.");
    process.exit(1);
  }
  const si = args.indexOf("--simulate");
  await db(si >= 0 ? Number(args[si + 1]) : null);
}
console.log(failures === 0 ? "\nTUTTO OK" : `\n${failures} FALLIMENTI`);
process.exit(failures === 0 ? 0 : 1);
