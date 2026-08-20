/**
 * verify-hooks.ts — nessun hook dentro una vista chiamata condizionalmente.
 * ───────────────────────────────────────────────────────────────
 * La dashboard rende le sue viste come FUNZIONI, non come componenti:
 *
 *     {view === "home"     && HomeView()}
 *     {view === "trips"    && CollectionView()}
 *
 * È una scelta legittima — sono chiusure sullo stato del padre — ma ha una
 * conseguenza che non si vede leggendo il file: gli hook scritti dentro
 * `HomeView` sono hook DEL PADRE. Se `HomeView()` smette di essere chiamata
 * (l'utente cambia vista), quell'hook sparisce dalla sequenza, React solleva
 * "rendered fewer hooks than expected" e l'albero muore.
 *
 * Il guasto che ne segue è muto: nessun messaggio a schermo, semplicemente la
 * navigazione smette di rispondere. È successo davvero — un `useMemo` dentro
 * HomeView ha reso inaccessibili la sezione viaggi e ogni link che cambiava
 * vista, e dal browser sembrava che i bottoni fossero morti.
 *
 * Uso:  npx tsx script/verify-hooks.ts
 */
import { readFileSync } from "node:fs";

const FILES = [
  "client/src/components/AccountDashboard.tsx",
];

/** Funzioni-vista: `const XView = () => (` o `= () => {`. */
const VIEW_DECL = /^\s*const\s+([A-Z][A-Za-z0-9]*(?:View|Section|Card|Footer))\s*=\s*(?:\([^)]*\)|[A-Za-z0-9_]+)\s*=>/;
const HOOK = /\buse(?:Memo|State|Effect|LayoutEffect|Ref|Callback|Reducer|Context|Id|Transition|DeferredValue)\s*\(/;

let fail = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  if (ok) console.log(`  ok    ${name}`);
  else { fail++; console.log(`  FAIL  ${name}${got !== undefined ? `\n        ${String(got)}` : ""}`); }
};

console.log("\nHook dentro le viste chiamate a mano\n");

for (const file of FILES) {
  const lines = readFileSync(file, "utf8").split("\n");

  // Quali di queste funzioni sono invocate come `Nome()` dentro il JSX?
  const src = lines.join("\n");
  const decls: Array<{ name: string; start: number }> = [];
  lines.forEach((l, i) => {
    const m = l.match(VIEW_DECL);
    if (m) decls.push({ name: m[1], start: i });
  });

  const called = decls.filter(d =>
    new RegExp(`\\{[^}\\n]*\\b${d.name}\\(\\)`).test(src) || new RegExp(`&&\\s*${d.name}\\(\\)`).test(src),
  );

  check(`${file}: trovate le viste`, decls.length > 0, `${decls.length} dichiarazioni`);
  console.log(`        chiamate come funzione: ${called.map(c => c.name).join(", ") || "nessuna"}`);

  for (let i = 0; i < called.length; i++) {
    const d = called[i];
    // il corpo arriva fino alla dichiarazione successiva (o a fine file)
    const nextStart = decls
      .map(x => x.start)
      .filter(s => s > d.start)
      .sort((a, b) => a - b)[0] ?? lines.length;

    const offenders: string[] = [];
    for (let j = d.start; j < nextStart; j++) {
      if (HOOK.test(lines[j])) offenders.push(`riga ${j + 1}: ${lines[j].trim().slice(0, 76)}`);
    }
    check(
      `${d.name} non contiene hook`,
      offenders.length === 0,
      offenders.length ? offenders.join("\n        ") : undefined,
    );
  }
}

console.log(
  fail === 0
    ? "\nTutto verde.\n"
    : `\n${fail} controlli falliti. Sposta l'hook nel corpo del componente: dentro una\nvista chiamata condizionalmente sparisce al cambio di vista e rompe React.\n`,
);
process.exit(fail === 0 ? 0 : 1);
