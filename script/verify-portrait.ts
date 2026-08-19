/**
 * verify-portrait.ts — il Ritratto non deve mai inventare.
 *
 * La specifica pone regole numeriche precise (§7): confidenza 0-100, insight
 * solo sopra il 30%, massimo 4, evoluzione solo sui cambiamenti oltre il 15%.
 * Sono esattamente le regole che, sbagliate, producono un profilo che sembra
 * sapere cose che non sa — il modo più veloce di perdere la fiducia di chi
 * legge. Qui si verificano su dati finti ma realistici.
 *
 * Uso:  npx tsx script/verify-portrait.ts
 */
import {
  computeConfidence, buildEvolution, buildInsights, visibleInsights,
  nextStepInsight, takenTrips, formatPortraitBlock, type PortraitSignals,
} from "../shared/portrait-insights";
import { portraitDict } from "../client/src/lib/i18n-dict/portrait";

let fail = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${ok ? "" : `  → ${JSON.stringify(got)}`}`);
  if (!ok) fail++;
};

const trip = (o: Partial<PortraitSignals["trips"][number]> = {}) => ({
  dest: "X", continent: "Europa", rawDate: "2026-06-01", taken: true, duration: "5 giorni", ...o,
});
const signals = (o: Partial<PortraitSignals> = {}): PortraitSignals => ({
  trips: [], seek: [], avoid: [], vector: null, snapshotCount: 0, ownWords: null, ...o,
});

/* ── 1. confidenza ── */
console.log("\n1. confidenza: sale solo su prove vere\n");
check("nessun segnale → 0%", computeConfidence(signals()) === 0, computeConfidence(signals()));
{
  const solo = computeConfidence(signals({ snapshotCount: 1 }));
  const molti = computeConfidence(signals({ snapshotCount: 6, trips: [trip(), trip(), trip()], ownWords: "x", seek: ["a", "b", "c", "d"] }));
  check("un solo snapshot resta basso (<35%)", solo < 35, solo);
  check("molte prove salgono sopra il 90%", molti > 90, molti);
  check("mai 100%: il tetto e' 95", molti <= 95, molti);
}
{
  // Un viaggio CONFERMATO deve valere piu' di uno soltanto sognato.
  const sognato = computeConfidence(signals({ trips: [trip({ taken: false }), trip({ taken: false })] }));
  const fatto = computeConfidence(signals({ trips: [trip(), trip()] }));
  check("i viaggi fatti pesano piu' di quelli sognati", fatto > sognato, { sognato, fatto });
}

/* ── 2. la soglia del 30% ── */
console.log("\n2. sotto il 30% di confidenza non si mostra nulla\n");
{
  const s = signals({ trips: [trip({ continent: "Europa" }), trip({ continent: "Europa" }), trip({ continent: "Europa" })] });
  check("insight nascosti a confidenza bassa", visibleInsights(s, 20).length === 0, visibleInsights(s, 20).length);
  check("insight visibili a confidenza alta", visibleInsights(s, 80).length > 0, visibleInsights(s, 80).length);
  check("mai piu' di 4", visibleInsights(s, 95).length <= 4, visibleInsights(s, 95).length);
}

/* ── 3. gli insight nascono da conteggi veri ── */
console.log("\n3. ogni insight regge su un fatto\n");
{
  const s = signals({
    trips: [
      trip({ continent: "Europa" }), trip({ continent: "Europa" }),
      trip({ continent: "Europa" }), trip({ continent: "Asia" }),
    ],
  });
  const ids = buildInsights(s).map(i => i.id);
  check("3 su 4 in Europa → 'continent-loyal'", ids.includes("continent-loyal"), ids);
  check("continenti mai toccati → 'continent-gap'", ids.includes("continent-gap"), ids);
}
{
  // Un solo continente in archivio: "torni sempre li'" non e' una scoperta,
  // e' l'unica cosa che sappiamo. Non deve uscire.
  const s = signals({ trips: [trip(), trip(), trip()] });
  check("un solo continente → niente 'continent-loyal'",
    !buildInsights(s).map(i => i.id).includes("continent-loyal"), buildInsights(s).map(i => i.id));
}
{
  const estate = [6, 7, 8, 9].map(m => trip({ rawDate: `2026-0${m}-01` }));
  const inverno = signals({ trips: [...estate.slice(0, 3), trip({ rawDate: "2026-01-15" })] });
  check("nessun viaggio d'inverno → 'season-gap'",
    buildInsights(signals({ trips: estate })).map(i => i.id).includes("season-gap"), null);
  check("un viaggio d'inverno → niente 'season-gap'",
    !buildInsights(inverno).map(i => i.id).includes("season-gap"), null);
}
{
  const lunghi = signals({ trips: Array.from({ length: 4 }, () => trip({ duration: "12 giorni" })) });
  const brevi = signals({ trips: Array.from({ length: 4 }, () => trip({ duration: "3 giorni" })) });
  check("viaggi lunghi → 'duration-long'", buildInsights(lunghi).map(i => i.id).includes("duration-long"), null);
  check("viaggi brevi → 'duration-short'", buildInsights(brevi).map(i => i.id).includes("duration-short"), null);
}
{
  const s = signals({ trips: [trip({ taken: false }), trip({ taken: false }), trip({ taken: false }), trip()] });
  const dre = buildInsights(s).find(i => i.id === "dreamer");
  check("piu' sognati che fatti → 'dreamer'", !!dre, null);
  check("il 'perche'' porta i numeri veri", dre?.why.vars.k === 1 && dre?.why.vars.n === 4, dre?.why.vars);
}
{
  // Archivio vuoto: nessun insight, mai un titolo che finge.
  check("zero viaggi → zero insight", buildInsights(signals()).length === 0, buildInsights(signals()).length);
}

/* ── 4. evoluzione: solo i cambiamenti oltre il 15% ── */
console.log("\n4. evoluzione: solo i cambiamenti veri\n");
{
  const snap = (y: number, traits: Record<string, number>) => ({ createdAt: `${y}-06-01T00:00:00Z`, traits });
  const rumore = buildEvolution([
    snap(2024, { exposure: .5, comfort: .5, social: .5, matter: .5, structure: .5 }),
    snap(2025, { exposure: .55, comfort: .52, social: .5, matter: .5, structure: .5 }),
  ]);
  check("delta sotto il 15% → nessuna tappa", rumore.length === 0, rumore.length);

  const storia = buildEvolution([
    snap(2023, { exposure: .2, comfort: .5, social: .5, matter: .5, structure: .5 }),
    snap(2024, { exposure: .8, comfort: .5, social: .5, matter: .5, structure: .5 }),
    snap(2025, { exposure: .8, comfort: .5, social: .2, matter: .5, structure: .5 }),
  ]);
  check("due cambiamenti forti + oggi = 3 tappe", storia.length === 3, storia.length);
  check("l'ultima tappa e' la DIREZIONE, non un polo in piu'",
    storia[storia.length - 1].kind === "now", storia[storia.length - 1]);
  check("le tappe precedenti sono cambiamenti",
    storia.slice(0, -1).every(x => x.kind === "change"), storia.map(x => x.kind));
  check("ogni cambiamento dice da dove veniva",
    storia.slice(0, -1).every(x => typeof x.fromHi === "boolean"), storia.map(x => x.fromHi));
  check("un solo snapshot → niente timeline", buildEvolution([snap(2025, { exposure: .8 })]).length === 0, null);

  // Mai piu' di 4 tappe passate + oggi, anche con dieci anni di storia.
  const lunga = buildEvolution(Array.from({ length: 9 }, (_, i) =>
    snap(2016 + i, { exposure: i % 2 === 0 ? .1 : .9, comfort: .5, social: .5, matter: .5, structure: .5 })));
  check("timeline capata a 5 tappe totali", lunga.length <= 5, lunga.length);

  // "Sfidante / Sfidante" di fila non e' un'evoluzione: e' la stessa cosa
  // scritta due volte. Era esattamente cio' che si vedeva a schermo.
  const ripetuta = buildEvolution([
    snap(2026, { exposure: .5, comfort: .1, social: .5, matter: .5, structure: .5 }),
    snap(2026, { exposure: .5, comfort: .9, social: .5, matter: .5, structure: .5 }),
    snap(2026, { exposure: .5, comfort: .2, social: .5, matter: .5, structure: .5 }),
    snap(2026, { exposure: .5, comfort: .95, social: .5, matter: .5, structure: .5 }),
  ]);
  const cambi = ripetuta.filter(x => x.kind === "change");
  let doppioni = 0;
  for (let i = 1; i < cambi.length; i++) {
    if (cambi[i].axis === cambi[i - 1].axis && cambi[i].hi === cambi[i - 1].hi) doppioni++;
  }
  check("mai due tappe di fila sullo stesso polo", doppioni === 0, cambi.map(x => `${x.axis}:${x.hi}`));
}
{
  // L'ancora e' il VIAGGIO, non l'anno: con tutti i viaggi nello stesso anno
  // (il caso normale di un profilo nuovo) l'anno non distingue nulla.
  const snap = (iso: string, traits: Record<string, number>) => ({ createdAt: iso, traits });
  const conViaggi = buildEvolution(
    [
      snap("2026-03-01T00:00:00Z", { exposure: .2, comfort: .5, social: .5, matter: .5, structure: .5 }),
      snap("2026-07-01T00:00:00Z", { exposure: .85, comfort: .5, social: .5, matter: .5, structure: .5 }),
    ],
    [
      { dest: "Marrakech", rawDate: "2026-06-28T00:00:00Z" },
      { dest: "Lofoten", rawDate: "2026-01-10T00:00:00Z" },
    ],
    "it",
  );
  const primo = conViaggi.find(x => x.kind === "change");
  check("il cambiamento e' agganciato al viaggio piu' vicino",
    primo?.trip?.dest === "Marrakech", primo?.trip);
  check("...e porta con se' quando", !!primo?.trip?.when, primo?.trip?.when);

  // Senza viaggi datati non si inventa un'ancora: resta l'ordinale.
  const senza = buildEvolution([
    snap("2026-03-01T00:00:00Z", { exposure: .2, comfort: .5, social: .5, matter: .5, structure: .5 }),
    snap("2026-07-01T00:00:00Z", { exposure: .85, comfort: .5, social: .5, matter: .5, structure: .5 }),
  ], [], "it");
  const p0 = senza.find(x => x.kind === "change");
  check("senza viaggi datati → nessuna ancora inventata", p0?.trip === null, p0?.trip);
  check("...ma resta l'ordinale", (p0?.ordinal ?? 0) >= 1, p0?.ordinal);
}

/* ── 5. il prossimo passo ── */
console.log("\n5. il prossimo passo\n");
{
  const s = signals({ trips: [trip({ continent: "Europa" }), trip({ continent: "Europa" }), trip({ continent: "Europa" }), trip({ continent: "Asia" })] });
  const list = visibleInsights(s, 80);
  const nx = nextStepInsight(list);
  check("esiste un insight azionabile", !!nx, null);
  check("l'azionabile porta una sfida", !!nx?.challengeKey, nx?.challengeKey);
}
{
  // Nessun insight → nessun passo inventato.
  check("lista vuota → nessun prossimo passo", nextStepInsight([]) === null, null);
}

/* ── 6. il dizionario copre tutto, in DUE lingue ── */
console.log("\n6. copertura del dizionario\n");
{
  const tutti = buildInsights(signals({
    trips: [
      trip({ continent: "Europa", duration: "12 giorni", rawDate: "2026-07-01" }),
      trip({ continent: "Europa", duration: "12 giorni", rawDate: "2026-08-01" }),
      trip({ continent: "Europa", duration: "12 giorni", rawDate: "2026-09-01", taken: false }),
      trip({ continent: "Asia", duration: "12 giorni", rawDate: "2026-06-01", taken: false }),
    ],
    seek: ["natura", "silenzio"],
    vector: { matter: .8, structure: .2, comfort: .3, social: .2, exposure: .5 },
  }));
  let mancanti: string[] = [];
  for (const i of tutti) {
    for (const k of [i.titleKey, i.bodyKey, i.why.key, ...(i.challengeKey ? [i.challengeKey] : [])]) {
      if (!portraitDict[k]) mancanti.push(k);
      else if (!portraitDict[k].it || !portraitDict[k].en) mancanti.push(`${k} (lingua mancante)`);
    }
  }
  check(`${tutti.length} insight, tutte le chiavi tradotte`, mancanti.length === 0, mancanti);

  // Le tappe dell'evoluzione: 5 assi × 2 poli × (titolo + frase).
  const evoMancanti: string[] = [];
  for (const a of ["exposure", "comfort", "social", "matter", "structure"]) {
    for (const pol of ["hi", "lo"]) {
      for (const suf of ["t", "p"]) {
        const k = `pt.evo.${a}.${pol}.${suf}`;
        if (!portraitDict[k]?.it || !portraitDict[k]?.en) evoMancanti.push(k);
      }
    }
  }
  check("20 chiavi dell'evoluzione presenti in IT e EN", evoMancanti.length === 0, evoMancanti);
}

/* ── 7. i limiti di parole della specifica ── */
console.log("\n7. limiti di parole (specifica §6)\n");
{
  const words = (s: string) => s.replace(/\{[^}]+\}/g, "X").trim().split(/\s+/).filter(Boolean).length;
  const troppo: string[] = [];
  for (const [k, v] of Object.entries(portraitDict)) {
    // titolo insight ≤ 6 · spiegazione ≤ 12 · tappa: titolo ≤ 2, frase ≤ 5
    const lim = /^pt\.in\..*\.t$/.test(k) ? 6
      : /^pt\.in\..*\.b$/.test(k) ? 12
        : /^pt\.evo\..*\.t$/.test(k) ? 2
          : /^pt\.evo\..*\.p$/.test(k) ? 5
            : null;
    if (lim == null) continue;
    for (const lg of ["it", "en"] as const) {
      const w = words(v[lg]);
      if (w > lim) troppo.push(`${k}.${lg}: ${w} > ${lim}`);
    }
  }
  check("nessun testo sfora il suo limite", troppo.length === 0, troppo);
}

/* -- 8. nessuna stringa a meta' fra due lingue -- */
console.log("\n8. italiano e inglese: nessuna stringa lasciata indietro\n");
{
  // "Meta' in italiano e meta' in inglese" e' un difetto che si vede solo
  // usando il prodotto nella lingua giusta: quindi va colto qui.
  // Nessuna eccezione: dopo il difetto del titolo ("Ecco chi sei you are oggi.")
  // ogni chiave deve avere due valori veri. Una traduzione vuota non e' piu'
  // ammessa nemmeno "di proposito".
  const ammesse = new Set<string>([]);
  const senzaLingua: string[] = [];
  const nonTradotte: string[] = [];
  for (const [k, v] of Object.entries(portraitDict)) {
    if (ammesse.has(k)) continue;
    if (typeof v.it !== "string" || v.it.trim() === "") { senzaLingua.push(k + " (IT)"); continue; }
    if (typeof v.en !== "string" || v.en.trim() === "") { senzaLingua.push(k + " (EN)"); continue; }
    if (v.it.trim() === v.en.trim()) nonTradotte.push(k + ': "' + v.en + '"');
  }
  check("ogni chiave ha entrambe le lingue", senzaLingua.length === 0, senzaLingua);
  check("nessuna chiave con IT identico a EN", nonTradotte.length === 0, nonTradotte);
}

/* -- 9. il ponte verso la generazione -- */
console.log("\n9. il Ritratto arriva davvero al generatore\n");
{
  const s = signals({
    trips: [
      trip({ continent: "Europa", rawDate: "2026-07-01" }),
      trip({ continent: "Europa", rawDate: "2026-08-01" }),
      trip({ continent: "Europa", rawDate: "2026-09-01" }),
      trip({ continent: "Asia", rawDate: "2026-06-01" }),
    ],
    snapshotCount: 4,
  });
  const evo = buildEvolution([
    { createdAt: "2026-02-01T00:00:00Z", traits: { exposure: .2, comfort: .5, social: .5, matter: .5, structure: .5 } },
    { createdAt: "2026-08-01T00:00:00Z", traits: { exposure: .85, comfort: .5, social: .5, matter: .5, structure: .5 } },
  ], [{ dest: "Marrakech", rawDate: "2026-07-20T00:00:00Z" }], "it");
  const blocco = formatPortraitBlock(s, evo, 85);

  check("il blocco esiste", blocco.length > 200, blocco.length);
  check("porta le SCOPERTE, non solo i numeri", /continent/i.test(blocco), null);
  check("porta la DIREZIONE del cambiamento", /WHERE THEY ARE HEADING/.test(blocco), null);
  check("aggancia il cambiamento al viaggio", blocco.includes("Marrakech"), null);
  check("dice al modello COSA FARNE", /at least ONE of the three destinations/.test(blocco), null);
  // Non deve mai contenere un punteggio: non e' cio' che diciamo all'utente.
  check("nessun punteggio grezzo nel blocco", !/0\.\d\d/.test(blocco), null);
}
{
  // Nessun materiale = nessun blocco. Meglio niente che un'analisi inventata.
  check("profilo vuoto → blocco vuoto",
    formatPortraitBlock(signals(), [], 0) === "", formatPortraitBlock(signals(), [], 0));
  // Confidenza sotto soglia: niente scoperte, quindi niente da dire.
  const povero = signals({ trips: [trip(), trip(), trip()], snapshotCount: 1 });
  check("confidenza bassa → nessuna scoperta nel blocco",
    !/WHAT WE TOLD THEM/.test(formatPortraitBlock(povero, [], 20)), null);
}

console.log(fail === 0 ? "\nTutto verde.\n" : `\n${fail} controlli falliti.\n`);
process.exit(fail === 0 ? 0 : 1);
