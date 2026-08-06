/**
 * verify-moment-slots.ts — il contratto temporale dell'itinerario v2.
 *
 * Copre due generazioni di bug:
 *
 *  A) "la cena non si apre" / "la cena esce doppia o non esce" (2026-08-05)
 *     time_label fuori lista → looseEnum LANCIAVA → il blocco-giorno falliva
 *     la validazione e finiva nel fallback single-call.
 *
 *  B) l'interfaccia e' diventata TEMPORALE (2026-08-06): il filo del giorno e
 *     le etichette sulla mappa leggono start_time. Quindi ora si verifica che:
 *     · nessun valore ignoto faccia piu' fallire un giorno (fallback, non throw);
 *     · l'ORARIO comandi sulla fascia;
 *     · una sequenza oraria incoerente perda l'orario invece di mostrarlo;
 *     · end_time sia DERIVATO, mai preso dal modello.
 *
 * Uso:  npx tsx script/verify-moment-slots.ts
 */
import { itineraryV2Schema } from "../server/matching-engine-v2";
import { parseClock, bandFromClock, normalizeDayTimes } from "../server/moment-times";
import type { DayV2 } from "../shared/schema";

let fail = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${ok ? "" : `  → ${JSON.stringify(got)}`}`);
  if (!ok) fail++;
};

/* ── fixture minima ma COMPLETA (lo schema esige >= 2 momenti al giorno) ── */
const moment = (over: Record<string, unknown> = {}) => ({
  id: "m1", type: "food", title_evocative: "T", title_operational: "T",
  time_label: "morning", description: "d", why_this: "w", ...over,
});
const day = (moments: any[]) => ({
  day_number: 1, arc: "a", title_evocative: "t", subtitle: "s",
  energy_level: "medium", cost_bookable_total: 0, cost_onsite_estimate: 0,
  moments,
});
const itin = (moments: any[]) => ({
  destination: "Lisbona", country: "Portogallo", summary: "s", duration_days: 1,
  manifesto: "m", highlights: [], closing_quote: "q",
  total_cost_bookable: 0, total_cost_onsite_estimate: 0, total_cost_range: "0",
  days: [day(moments)],
});

const parseFirst = (over: Record<string, unknown>) => {
  const r = itineraryV2Schema.safeParse(itin([moment(over), moment({ ...{}, id: "m2" })]));
  return r.success ? r.data.days[0].moments[0] : null;
};

/* ── 1. etichette che il modello emette davvero ── */
console.log("\n1. time_label accettati dal generatore (null = blocco RIFIUTATO)\n");
for (const [input, want] of [
  ["cena", "evening"], ["dinner", "evening"], ["sera", "evening"],
  ["pranzo", "lunch"], ["colazione", "morning"], ["breakfast", "morning"],
  ["midday", "lunch"], ["mattina", "morning"], ["evening", "evening"],
] as const) {
  const m = parseFirst({ time_label: input });
  check(`"${input}" → ${want}`, m?.time_label === want, m?.time_label ?? null);
}

/* ── 2. valori IGNOTI: non devono piu' uccidere il giorno ── */
console.log("\n2. valori ignoti → fallback, mai un throw\n");
for (const label of ["brunch", "aperitivo", "golden hour", "", "qualsiasi_cosa"]) {
  const m = parseFirst({ time_label: label });
  check(`time_label "${label}" non fa fallire il blocco`, m !== null, m);
}
{
  const m = parseFirst({ type: "sightseeing" });
  check(`type ignoto → "experience"`, m?.type === "experience", m?.type ?? null);
}
{
  const r = itineraryV2Schema.safeParse(itin([
    moment({ booking: { provider: "x", affiliate_url: "u", display_label: "l", status: "boh" } }),
    moment({ id: "m2" }),
  ]));
  const st = r.success ? (r.data.days[0].moments[0] as any).booking?.status : null;
  check(`booking.status ignoto → "walk_in" (mai promettere prenotabilita')`, st === "walk_in", st);
}

/* ── 3. l'ORARIO comanda sulla fascia ── */
console.log("\n3. la fascia si deduce dall'orario\n");
for (const [clock, want] of [
  ["07:30", "morning"], ["12:15", "lunch"], ["16:00", "afternoon"],
  ["20:30", "evening"], ["23:40", "night"], ["02:00", "night"],
] as const) {
  const m = parseFirst({ start_time: clock, time_label: "brunch" });
  check(`"${clock}" (etichetta assurda) → ${want}`, m?.time_label === want, m?.time_label ?? null);
}
check(`parseClock("9.05") = 545`, parseClock("9.05") === 545, parseClock("9.05"));
check(`parseClock("7:30 PM") = 1170`, parseClock("7:30 PM") === 1170, parseClock("7:30 PM"));
check(`parseClock("presto") = null`, parseClock("presto") === null, parseClock("presto"));
check(`parseClock("25:00") = null`, parseClock("25:00") === null, parseClock("25:00"));
check(`bandFromClock(1110) = evening`, bandFromClock(1110) === "evening", bandFromClock(1110));

/* ── 4. sequenza oraria: incoerente = orario RIMOSSO, mai corretto a caso ── */
console.log("\n4. normalizzazione della giornata\n");
{
  const d = day([
    moment({ id: "a", start_time: "09:00", duration_min: 90 }),
    moment({ id: "b", start_time: "13:00", duration_min: 60 }),
    moment({ id: "c", start_time: "11:00" }),   // torna indietro nel tempo
    moment({ id: "d", start_time: "boh" }),      // non e' un orario
    moment({ id: "e", start_time: "20:30", duration_min: 120 }),
  ]) as unknown as DayV2;
  normalizeDayTimes(d);
  const by = (id: string) => d.moments.find(m => m.id === id)!;
  check("09:00 + 90m → end 10:30", by("a").end_time === "10:30", by("a").end_time);
  check("13:00 conservato", by("b").start_time === "13:00", by("b").start_time);
  check("11:00 dopo le 13:00 → orario rimosso", by("c").start_time === undefined, by("c").start_time);
  check('"boh" → orario rimosso', by("d").start_time === undefined, by("d").start_time);
  check("20:30 + 120m → end 22:30", by("e").end_time === "22:30", by("e").end_time);
  check("20:30 → fascia sera", by("e").time_label === "evening", by("e").time_label);
  check("senza durata, nessun end_time inventato", by("c").end_time === undefined, by("c").end_time);
}
{
  // Mezzanotte: 23:30 + 90m = 01:00 del giorno dopo, non "25:00".
  const d = day([
    moment({ id: "a", start_time: "23:30", duration_min: 90 }),
    moment({ id: "b", start_time: "23:45" }),
  ]) as unknown as DayV2;
  normalizeDayTimes(d);
  check("23:30 + 90m → end 01:00 (non 25:00)", d.moments[0].end_time === "01:00", d.moments[0].end_time);
}

/* ── 5. fascia lato client (stessa tabella di pages/Itinerary.tsx) ── */
function bandFromTimeLabel(tl?: string) {
  switch ((tl ?? "").toLowerCase()) {
    case "lunch": case "pranzo": case "mezzogiorno": case "noon": case "midday": return "pranzo";
    case "afternoon": case "pomeriggio": return "pomeriggio";
    case "evening": case "night": case "sera": case "notte": case "cena": case "dinner": return "sera";
    default: return "mattina";
  }
}
console.log("\n5. fascia lato client\n");
for (const [input, want] of [["cena", "sera"], ["dinner", "sera"], ["pranzo", "pranzo"], ["evening", "sera"]] as const) {
  check(`"${input}" → ${want}`, bandFromTimeLabel(input) === want, bandFromTimeLabel(input));
}

console.log(fail === 0 ? "\nTutto verde.\n" : `\n${fail} controlli falliti.\n`);
process.exit(fail === 0 ? 0 : 1);
