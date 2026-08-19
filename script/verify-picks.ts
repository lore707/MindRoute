/**
 * verify-picks.ts — la cadenza delle proposte.
 * ───────────────────────────────────────────────────────────────
 * Le proposte della home ruotavano OGNI GIORNO. È troppo veloce: un viaggio
 * si decide in giorni o settimane, e proposte che cambiano ogni mattina
 * dicono all'utente "sto tirando a caso" invece di "ti ho capito". Ora la
 * cadenza è settimanale (stessa dottrina già usata dal matcher), con due sole
 * eccezioni: un viaggio nuovo, o un "ci sono andato".
 *
 * Il guasto che questo file previene è invisibile a occhio: se qualcuno
 * ripristinasse la rotazione giornaliera, la home continuerebbe a funzionare
 * e nessuno se ne accorgerebbe prima di un utente che smette di fidarsi.
 *
 * Uso:  npx tsx script/verify-picks.ts
 */
import { rotationKey, weekStartISO, weeklyExplorationSeed } from "../shared/rotation";

let fail = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  if (ok) console.log(`  ok    ${name}`);
  else { fail++; console.log(`  FAIL  ${name}${got !== undefined ? `  → ${String(got)}` : ""}`); }
};

console.log("\nCadenza delle proposte\n");

const U = 42;
const V = 99;

// 1. Stabile dentro la settimana, a parità di profilo.
{
  const a = rotationKey(U, 5);
  const b = rotationKey(U, 5);
  check("stesso utente, stesso profilo → stessa chiave", a === b, `${a} vs ${b}`);
}

// 2. Utenti diversi non ricevono la stessa terna nella stessa settimana.
{
  check("utenti diversi → chiavi diverse", rotationKey(U, 5) !== rotationKey(V, 5), null);
}

// 3. Gli eventi che cambiano il profilo cambiano subito le proposte:
//    un viaggio generato, un quiz rifatto, un "ci sono andato".
{
  const prima = rotationKey(U, 5);
  const dopoViaggio = rotationKey(U, 6);
  const dopoCheckIn = rotationKey(U, 7);
  check("un viaggio nuovo ricalcola subito", prima !== dopoViaggio, null);
  check("un check-in ricalcola subito", dopoViaggio !== dopoCheckIn, null);
  // Rev vicine devono finire in punti lontani della lista, altrimenti
  // "ricalcola" diventa "sposta di uno" e all'utente sembra un glitch.
  const pool = 8;
  check("rev consecutive non danno la stessa posizione nel pool",
    prima % pool !== dopoViaggio % pool, `${prima % pool} vs ${dopoViaggio % pool}`);
}

// 4. La settimana ISO è la base: la chiave contiene il seed settimanale.
{
  const seed = weeklyExplorationSeed(U);
  check("la chiave si regge sul seed settimanale del progetto",
    rotationKey(U, 0) === seed, `${rotationKey(U, 0)} vs ${seed}`);
}

// 5. weekStartISO cade sempre di lunedì — è la data che mostriamo.
{
  const bad: string[] = [];
  for (let i = 0; i < 40; i++) {
    const d = new Date(Date.UTC(2026, 0, 1 + i * 9));
    const start = weekStartISO(d);
    if (new Date(start + "T00:00:00Z").getUTCDay() !== 1) bad.push(`${d.toISOString().slice(0, 10)} → ${start}`);
  }
  check("l'inizio settimana è sempre un lunedì", bad.length === 0, bad.slice(0, 3).join(", "));
}

console.log(fail === 0 ? "\nTutto verde.\n" : `\n${fail} controlli falliti.\n`);
process.exit(fail === 0 ? 0 : 1);
