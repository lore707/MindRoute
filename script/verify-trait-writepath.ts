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
import { computeTraitVector, blendWithRevealedPreference, emaAggregate, MAPPING_VERSION, type TraitVector } from "../shared/traits";
import { getDestinationTraitVector, revealedPreferenceVector } from "../server/destination-traits";

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
// Tripletta con vettori neutri noti (catalogo curato): scelta "cultura/città"
// contro due scarti (una selvaggia-natura, una festosa-sociale). Il contrasto
// deve rivelare la direzione su cui la scelta diverge dagli scarti.
const CHOSEN = "Kyoto, Giappone";        // matter basso (cultura), social basso
const REJECTED = ["Patagonia, Cile", "Napoli, Italia"];

async function dry() {
  console.log("═══ 1. Vettore dal quiz L1 (risposte JSON del funnel live) ═══");
  const quizV = computeTraitVector(L1_INPUT);
  console.log("   ", fmt(quizV));
  check("vettore NON neutro (la decodifica JSON funziona)", !isNeutral(quizV));
  check("asse matter tirato verso cultura (<0.42)", quizV.matter < 0.42, `matter=${quizV.matter.toFixed(2)}`);

  console.log("═══ 2. Revealed preference: CONTRASTO scelta vs scartate (testo neutro) ═══");
  const revealed = revealedPreferenceVector({ name: CHOSEN }, REJECTED.map((n) => ({ name: n })));
  check("contrasto calcolato (vettori neutri della tripletta)", !!revealed, revealed ? fmt(revealed) : "null");
  // Kyoto è la meno "natura" del trio → il contrasto su matter deve pendere a
  // sinistra (cultura, <0.5); la copy persuasiva NON entra più nel segnale.
  check("il contrasto rivela cultura (matter < 0.5)", !!revealed && revealed.matter < 0.5,
    revealed ? `matter=${revealed.matter.toFixed(2)}` : "");

  console.log("═══ 3. Blend con deadzone (assi senza contrasto restano intatti) ═══");
  const blended = revealed ? blendWithRevealedPreference(quizV, revealed) : quizV;
  console.log("   ", fmt(blended));
  check("il pick SPOSTA il vettore rispetto al solo quiz",
    Object.keys(quizV).some((a) => Math.abs((blended as any)[a] - (quizV as any)[a]) > 0.02));

  console.log("═══ 4. EMA su una storia di snapshot ═══");
  const history = [quizV, blended, blended];
  const ema = emaAggregate(history);
  console.log("   ", fmt(ema));
  check("EMA non neutro (il prior verrebbe iniettato nel prompt)", !isNeutral(ema));

  console.log("═══ 5. Vettori neutri: catalogo + degradazione onesta ═══");
  check("kyoto → vettore dalla mappa", !!getDestinationTraitVector("Kyoto, Giappone"));
  check("destinazione ignota → null onesto (nome senza keyword)", getDestinationTraitVector("Xyzzy, Nowhere") === null);
  check("contrasto impossibile senza scarti noti → null",
    revealedPreferenceVector({ name: CHOSEN }, [{ name: "Xyzzy, Nowhere" }]) === null);
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
    const revealed = revealedPreferenceVector({ name: CHOSEN }, REJECTED.map((n) => ({ name: n })));
    const finalV = revealed ? blendWithRevealedPreference(quizV, revealed) : quizV;
    const ins = await pool.query(
      `INSERT INTO trait_snapshots (user_id, traits, source, mapping_version, raw_signal)
       VALUES ($1, $2, 'pick', $3, $4) RETURNING id`,
      [simulateUserId, JSON.stringify(finalV), MAPPING_VERSION, JSON.stringify({ answers: ["__verify_writepath__"] })]);
    const id = ins.rows[0].id;
    const back = await pool.query("SELECT traits FROM trait_snapshots WHERE id = $1", [id]);
    const readV = back.rows[0]?.traits as TraitVector | undefined;
    console.log("    inviato :", JSON.stringify(finalV));
    console.log("    riletto :", JSON.stringify(readV));
    // Confronto per-asse sui VALORI: jsonb riordina fisicamente le chiavi
    // (lunghezza, poi alfabetico), quindi JSON.stringify(a)===JSON.stringify(b)
    // fallirebbe anche a valori identici. Tolleranza minima per la precisione.
    const sameValues = !!readV && (Object.keys(finalV) as Array<keyof TraitVector>)
      .every((ax) => Math.abs(Number(readV[ax]) - finalV[ax]) < 1e-9);
    check("scrittura → rilettura: stessi valori per asse", sameValues);
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
