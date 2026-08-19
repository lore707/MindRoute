/**
 * rotation.ts — ogni quanto cambia quello che ti proponiamo.
 * ───────────────────────────────────────────────────────────────
 * Un viaggio si decide in giorni o settimane. Proposte che cambiano ogni
 * mattina non sembrano attenzione: sembrano un sorteggio. Se martedì mostri le
 * Azzorre a qualcuno e mercoledì la home propone tutt'altro, il messaggio
 * implicito è "tira a caso" — ed è esattamente il contrario di quello che
 * MindRoute vuole dire.
 *
 * Quindi: **cadenza settimanale**, deterministica su (settimana ISO × utente).
 * Con una sola eccezione, che sarebbe stupido ignorare: quando cambia davvero
 * quello che sappiamo dell'utente (un viaggio generato, un quiz rifatto, un
 * "ci sono andato"), le proposte si ricalcolano subito — quello è `rev`.
 *
 * Logica pura, zero dipendenze: si verifica da riga di comando
 * (script/verify-picks.ts). Prima viveva dentro un modulo che importava il
 * database, e non era testabile.
 * ─────────────────────────────────────────────────────────────── */

/** Chiave della settimana ISO: "2026-W34". */
export function isoWeekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = (date.getUTCDay() + 6) % 7; // lun=0 … dom=6
  date.setUTCDate(date.getUTCDate() - dayNum + 3); // giovedì della settimana
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(
    ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
  );
  return `${date.getUTCFullYear()}-W${week}`;
}

/**
 * Seed di esplorazione deterministico su (settimana ISO × utente): stessa
 * settimana + stesso utente = stesse proposte; settimana nuova = angolo nuovo.
 * Utenti diversi nella stessa settimana ottengono seed diversi.
 */
export function weeklyExplorationSeed(userId: number | null): number {
  const key = `${isoWeekKey()}:${userId ?? "anon"}`;
  let h = 2166136261; // FNV-1a
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 100000;
}

/**
 * La chiave con cui si sceglie la posizione nel pool delle mete coerenti.
 *
 * `rev` è la revisione del profilo: quante cose sappiamo dell'utente. Il primo
 * numero moltiplicativo è primo di proposito — senza, due rev consecutive
 * cadrebbero in posizioni adiacenti del pool e "ricalcolare" somiglierebbe a
 * "spostare di uno", che a schermo sembra un difetto.
 */
export function rotationKey(userId: number, rev: number): number {
  return weeklyExplorationSeed(userId) + rev * 7919;
}

/** Lunedì della settimana ISO corrente, in ISO date. È la data che mostriamo. */
export function weekStartISO(d = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}
