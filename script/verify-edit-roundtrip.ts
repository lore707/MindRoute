/**
 * verify-edit-roundtrip.ts — "se modifico un giorno, cosa perdo?"
 *
 * Il rischio del salvataggio non è che il server risponda 500: risponde 200 e
 * scrive. Il rischio è che un campo sparisca in silenzio, e che l'utente se ne
 * accorga solo dopo, quando la tappa che aveva personalizzato ha perso l'orario
 * e il "perché proprio questo".
 *
 * È già successo: l'editor salvava titolo e descrizione, il lettore si
 * aspettava molto di più. Qui si verifica il giro completo
 *
 *     schermata Modifica → toEditedMoment → JSON (quello che va in DB)
 *                        → fromEditedMoment → schermata itinerario
 *
 * su un momento con TUTTI i campi valorizzati. Nessun DB richiesto: il server
 * scrive `days` verbatim come JSONB (storage-db.ts: updateItineraryMapPoints),
 * quindi il giro è interamente client-side ed è tutto qui dentro.
 *
 * Uso:  npx tsx script/verify-edit-roundtrip.ts
 */
import { EDITED_MOMENT_FIELDS, toEditedMoment, fromEditedMoment } from "../shared/edited-moment";

let fail = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${ok ? "" : `  → ${JSON.stringify(got)}`}`);
  if (!ok) fail++;
};

/* Un momento "pieno": ogni campo che l'interfaccia sa mostrare. */
const full: Record<string, any> = {
  id: "d2m3", t: "Pomeriggio", band: "pomeriggio", ic: "📍",
  type: "walk", kindLabel: "Passeggiata",
  title: "Passeggiata sul lungomare",
  desc: "La luce qui, a quest'ora, è semplicemente perfetta.",
  why: "La tua giornata compatta merita un respiro lungo: mare, luce, niente da prenotare.",
  guide: {
    whatItIs: "Il lungomare contemporaneo della città.",
    whereItIs: "Sul fronte mare, a sud della Torre Bianca.",
    whyVisit: "Unisce vita locale, architettura e tramonto.",
    historyCulture: "Il ridisegno moderno ha restituito il mare alla città.",
    steps: [
      { title: "Parti dalla Torre Bianca", detail: "Usala come punto di orientamento." },
      { title: "Segui il mare", detail: "Fermati nelle installazioni più interessanti." },
    ],
    practicalTips: ["Vai nell'ultima ora di luce."],
  },
  planB: "Se piove → il museo bizantino, a due isolati.",
  startTime: "12:30", endTime: "14:00",
  durationLabel: "1.5h", costLabel: "€0", transport: "A piedi · ~5 min",
  locationName: "Nea Paralia", locationAddress: "Leof. Nikis, Thessaloniki", lat: 40.6255, lng: 22.9481,
  imageUrl: "https://images.unsplash.com/photo-abc",
  cta: "Vedi disponibilità", ctaUrl: "https://example.test/x",
  ctaPrice: "€18", ctaStatus: "reserve_recommended", ctaProvider: "viator",
};

console.log("\n1. giro completo: schermo → DB → schermo\n");

// Il salvataggio serializza in JSON: se un valore non sopravvive a
// JSON.stringify/parse, in DB non ci arriva.
const persisted = JSON.parse(JSON.stringify(toEditedMoment(full)));
const back = fromEditedMoment(persisted, "fallback-id");

for (const k of EDITED_MOMENT_FIELDS) {
  const same = typeof full[k] === "object"
    ? JSON.stringify(back[k]) === JSON.stringify(full[k])
    : back[k] === full[k];
  check(`${k} conservato`, same, { atteso: full[k], letto: back[k] });
}

console.log("\n2. l'elenco dei campi è davvero UNO\n");
{
  const written = Object.keys(persisted).sort();
  const declared = [...EDITED_MOMENT_FIELDS].sort();
  check("scritti = dichiarati", JSON.stringify(written) === JSON.stringify(declared),
    { scritti: written, dichiarati: declared });
}

console.log("\n3. casi limite\n");
{
  // Senza id la card resterebbe MUTA al click: deve arrivare il ricambio.
  const r = fromEditedMoment({ title: "T" }, "d1e1");
  check("id mancante → id di ricambio", r.id === "d1e1", r.id);
  const r2 = fromEditedMoment({ id: "   ", title: "T" }, "d1e2");
  check("id vuoto → id di ricambio", r2.id === "d1e2", r2.id);
}
{
  // Coordinate: un "40.62" stringa manderebbe la tappa fuori mappa.
  const r = fromEditedMoment({ id: "x", lat: "40.62", lng: 22.9 }, "f");
  check("lat non numerica → scartata", r.lat === undefined, r.lat);
  check("lng numerica → conservata", r.lng === 22.9, r.lng);
}
{
  // Un campo sconosciuto non deve passare: il DB non è un sacco.
  const w = toEditedMoment({ ...full, campoInventato: "x" }) as Record<string, any>;
  check("campo fuori elenco → non persistito", w.campoInventato === undefined, w.campoInventato);
}
{
  // Il minimo sindacale: una tappa appena creata dall'utente.
  const nuovo = { t: "Pomeriggio", band: "pomeriggio", ic: "📍", title: "Nuova tappa", desc: "" };
  const r = fromEditedMoment(JSON.parse(JSON.stringify(toEditedMoment(nuovo))), "d3e1");
  check("tappa nuova: titolo conservato", r.title === "Nuova tappa", r.title);
  check("tappa nuova: fascia conservata", r.band === "pomeriggio", r.band);
  check("tappa nuova: descrizione vuota non persistita", r.desc === undefined, r.desc);
}

console.log(fail === 0 ? "\nTutto verde.\n" : `\n${fail} controlli falliti.\n`);
process.exit(fail === 0 ? 0 : 1);
