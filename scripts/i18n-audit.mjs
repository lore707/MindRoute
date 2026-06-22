import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = "client/src";

// 1) Raccogli tutte le chiavi DEFINITE (i18n.tsx + i18n-dict/*) e quali lingue hanno.
//    Entry tipica: "key": { en: "...", it: "..." }  — anche su una riga.
const dictFiles = [
  "lib/i18n.tsx",
  ...readdirSync(join(ROOT, "lib/i18n-dict")).map(f => `lib/i18n-dict/${f}`),
];

const defined = new Map(); // key -> {en:bool, it:bool}
// Body allows one level of nested braces so placeholder values like
// { en: "Continue with {n}" } are still recognised as defined entries.
const entryRe = /["']([\w.:-]+)["']\s*:\s*\{((?:[^{}]|\{[^{}]*\})*?)\}/g;
for (const rel of dictFiles) {
  let src;
  try { src = readFileSync(join(ROOT, rel), "utf8"); } catch { continue; }
  let m;
  while ((m = entryRe.exec(src))) {
    const key = m[1];
    const body = m[2];
    const hasEn = /\ben\s*:\s*["'`]/.test(body);
    const hasIt = /\bit\s*:\s*["'`]/.test(body);
    if (!hasEn && !hasIt) continue; // non è una entry di traduzione
    const prev = defined.get(key) || { en: false, it: false };
    defined.set(key, { en: prev.en || hasEn, it: prev.it || hasIt });
  }
}

// 2) Raccogli tutte le chiavi USATE via t("...") / t('...') in tutto client/src.
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(tsx?|ts)$/.test(e.name)) out.push(p);
  }
  return out;
}
const used = new Map(); // key -> Set(file)
const dynamic = new Set(); // file con t(`...${}`) o t(variabile)
const tStatic = /\bt\(\s*["']([^"']+)["']\s*\)/g;
const tDynamic = /\bt\(\s*[`a-zA-Z_$]/g;
for (const file of walk(ROOT)) {
  if (file.includes("i18n-dict") || file.endsWith("i18n.tsx")) continue;
  const src = readFileSync(file, "utf8");
  let m;
  while ((m = tStatic.exec(src))) {
    const k = m[1];
    if (!used.has(k)) used.set(k, new Set());
    used.get(k).add(file.replace(/\\/g, "/"));
  }
  if (tDynamic.test(src)) dynamic.add(file.replace(/\\/g, "/"));
}

// 3) Report.
const missingKey = [];      // usata ma non definita -> mostra chiave grezza
for (const [k, files] of used) {
  if (!defined.has(k)) missingKey.push([k, [...files]]);
}
const missingLang = [];     // definita ma manca una lingua -> fallback a EN allo switch
for (const [k, langs] of defined) {
  if (!langs.en || !langs.it) missingLang.push([k, langs.en ? "manca IT" : "manca EN"]);
}

console.log(`\n=== Chiavi DEFINITE: ${defined.size} | USATE (statiche): ${used.size} ===`);

console.log(`\n### A) Chiavi USATE ma NON DEFINITE (mostrano la chiave grezza): ${missingKey.length}`);
for (const [k, files] of missingKey.sort()) console.log(`  ${k}   ← ${files.map(f=>f.replace("client/src/","")).join(", ")}`);

console.log(`\n### B) Voci DEFINITE con una lingua MANCANTE (fallback a EN): ${missingLang.length}`);
for (const [k, what] of missingLang.sort()) console.log(`  ${k}   (${what})`);

console.log(`\n### C) File con t() DINAMICO (chiavi non verificabili staticamente): ${dynamic.size}`);
for (const f of [...dynamic].sort()) console.log(`  ${f.replace("client/src/","")}`);

// 4) Risoluzione chiavi DINAMICHE contro gli id reali.
const drainChipKeys = ["guided","crowded","museums","resort","nightlife","touristy","transits","mornings","schedules","smalltalk","unfamiliarfood","toomuchwalking","tooisolated","tooexpensive","toolong"];
const monthKeys = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const pathAStyleChipKeys = ["wild","quiet","chaotic","intimate","solitary","regenerating","authentic","quietluxury","spiritual","festive","adventure","romantic","cultural","explorative"];
const pathADistanceChipKeys = ["close","continent","far","anywhere"];
const pathBGeoChipKeys = ["close","europe","asia","americas","africa","oceania"];
const pathBTypeChipKeys = ["culture","nature","food","beach","city","offgrid","roadtrip","trekking","wellness","discovery"];
const q4ids = ["market","trail","cafe","seaside"];

// id locali di QuizCinematicA (estratti dal file: option arrays { id: "..." }).
const qcaSrc = readFileSync(join(ROOT, "components/QuizCinematicA.tsx"), "utf8");
const qcaIds = [...qcaSrc.matchAll(/\bid:\s*["']([\w-]+)["']/g)].map(m => m[1]);
const uniq = a => [...new Set(a)];

const families = [
  ["a.q1.chips.", pathAStyleChipKeys, ""],
  ["chips.", drainChipKeys, ""],
  ["a.q7.chips.", pathADistanceChipKeys, ""],
  ["b.q1.chips.", pathBGeoChipKeys, ""],
  ["b.q2.chips.", pathBTypeChipKeys, ""],
  ["months.", monthKeys, ""],
  ["q4.", q4ids, ""],
  ["q4.", q4ids, ".sub"],
  // QuizCinematicA meta/feel — usa gli id locali del file (superset, tollerante)
  ["qa.vibe.", uniq(qcaIds), ".meta"],
  ["qa.need.", uniq(qcaIds), ".meta"],
  ["qa.need.", uniq(qcaIds), ".feel"],
  ["qa.drain.", uniq(qcaIds), ".meta"],
  ["qa.dist.", uniq(qcaIds), ".meta"],
  ["qa.dist.", uniq(qcaIds), ".dur"],
];

console.log(`\n### D) Chiavi DINAMICHE generate dagli id ma NON definite:`);
let dynMissing = 0;
for (const [prefix, ids, suffix] of families) {
  // per le famiglie qa.* (id locali superset) segnaliamo solo se ESISTE almeno
  // una chiave del prefisso ma ne manca qualcuna → buco reale; se non esiste
  // nessuna chiave del prefisso, l'id non appartiene a quella famiglia (skip).
  const anyDefined = [...defined.keys()].some(k => k.startsWith(prefix) && k.endsWith(suffix));
  for (const id of ids) {
    const key = `${prefix}${id}${suffix}`;
    if (defined.has(key)) continue;
    if (prefix.startsWith("qa.") && !anyDefined) continue; // famiglia inesistente, id non pertinente
    // per qa.* tolleriamo id non pertinenti: segnaliamo solo se la maggior parte degli id del prefisso esiste
    if (prefix.startsWith("qa.")) {
      const definedForPrefix = [...defined.keys()].filter(k => k.startsWith(prefix) && k.endsWith(suffix)).length;
      if (definedForPrefix < 3) continue; // prefisso marginale, evita falsi positivi
    }
    console.log(`  ${key}`);
    dynMissing++;
  }
}
if (dynMissing === 0) console.log("  (nessuna)");

// landing.how.stepN
const landMax = Math.max(0, ...[...defined.keys()].map(k => { const m = k.match(/^landing\.how\.step(\d+)\./); return m ? +m[1] : 0; }));
console.log(`\n### E) landing.how.step: definiti fino a step${landMax} (verifica che il codice non chieda oltre)`);
