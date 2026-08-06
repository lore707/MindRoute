/**
 * verify-moment-slots.ts — le due cause dei bug "la cena non si apre" e
 * "la cena esce doppia o non esce".
 *
 *  1) time_label: il modello emette "cena"/"dinner"/"colazione" anche quando
 *     chiediamo i token canonici. Prima non erano nella mappa dei sinonimi e
 *     looseEnum LANCIAVA: il blocco del giorno falliva la validazione e veniva
 *     rigenerato o perso.
 *  2) fascia lato client: "cena" e "pranzo" cadevano nel default → la cena
 *     compariva nella fascia MATTINA.
 *
 * Uso:  npx tsx script/verify-moment-slots.ts
 */
import { itineraryV2Schema } from "../server/matching-engine-v2";

let fail = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${ok ? "" : `  → ${JSON.stringify(got)}`}`);
  if (!ok) fail++;
};

/* ── 1. il generatore accetta le etichette che il modello emette davvero ── */
const moment = (time_label: string) => ({
  id: "m1", type: "food", title_evocative: "T", title_operational: "T",
  time_label, description: "d", why_this: "w",
});
const day = (time_label: string) => ({
  day_number: 1, arc: "a", title_evocative: "t", subtitle: "s",
  energy_level: "medium", cost_bookable_total: 0, cost_onsite_estimate: 0,
  // lo schema esige >= 2 momenti al giorno: il secondo e' riempitivo, quello
  // sotto esame e' il primo.
  moments: [moment(time_label), { ...moment("morning"), id: "m2" }],
});
const itin = (time_label: string) => ({
  destination: "Lisbona", country: "Portogallo", summary: "s", duration_days: 1,
  manifesto: "m", highlights: [], closing_quote: "q",
  total_cost_bookable: 0, total_cost_onsite_estimate: 0, total_cost_range: "0",
  days: [day(time_label)],
});

const parseSlot = (label: string): string | null => {
  const r = itineraryV2Schema.safeParse(itin(label));
  return r.success ? (r.data.days[0].moments[0].time_label as string) : null;
};

console.log("\n1. time_label accettati dal generatore (null = blocco RIFIUTATO)\n");
const cases: Array<[string, string]> = [
  ["cena", "evening"], ["dinner", "evening"], ["sera", "evening"],
  ["pranzo", "lunch"], ["colazione", "morning"], ["breakfast", "morning"],
  ["midday", "lunch"], ["mattina", "morning"], ["evening", "evening"],
];
for (const [input, want] of cases) {
  const got = parseSlot(input);
  check(`"${input}" → ${want}`, got === want, got);
}

/* ── 2. la fascia lato client (stessa tabella di pages/Itinerary.tsx) ── */
function bandFromTimeLabel(tl?: string) {
  switch ((tl ?? "").toLowerCase()) {
    case "lunch": case "pranzo": case "mezzogiorno": case "noon": case "midday": return "pranzo";
    case "afternoon": case "pomeriggio": return "pomeriggio";
    case "evening": case "night": case "sera": case "notte": case "cena": case "dinner": return "sera";
    default: return "mattina";
  }
}
console.log("\n2. fascia lato client\n");
for (const [input, want] of [["cena", "sera"], ["dinner", "sera"], ["pranzo", "pranzo"], ["evening", "sera"]] as const) {
  const got = bandFromTimeLabel(input);
  check(`"${input}" → ${want}`, got === want, got);
}

console.log(fail === 0 ? "\nTutto verde.\n" : `\n${fail} controlli falliti.\n`);
process.exit(fail === 0 ? 0 : 1);
