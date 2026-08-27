/**
 * edited-moment.ts — il contratto di ciò che sopravvive a una modifica.
 *
 * Quando l'utente personalizza un giorno, quel giorno viene riscritto in DB
 * come `editedMoments` (più i 4 slot v1 raggruppati, che restano il fallback
 * per PDF e rigenerazione). Chi scrive è la schermata Modifica; chi rilegge è
 * il mapper della pagina itinerario.
 *
 * Prima le due liste di campi vivevano in due file diversi e si erano già
 * disallineate: l'editor salvava titolo e descrizione e basta, quindi
 * personalizzare un giorno CANCELLAVA orari, costi, trasporti e l'insight
 * ("perché proprio questo") di tutte le sue tappe — cioè la cosa per cui il
 * prodotto esiste.
 *
 * Qui la lista è UNA. Scrittura e lettura sono simmetriche per costruzione, e
 * `script/verify-edit-roundtrip.ts` lo verifica a ogni build.
 * ─────────────────────────────────────────────────────────────── */

/** Forma esatta di un momento personalizzato, come finisce nel JSONB. */
export type EditedMoment = {
  // identità e struttura
  id?: string;
  t?: string;              // etichetta di fascia localizzata (legacy v1)
  band?: string;           // fascia canonica: vince su `t` in lettura
  ic?: string;
  type?: string;
  kindLabel?: string;
  // contenuto
  title?: string;
  desc?: string;
  why?: string;            // l'insight: senza questo la tappa è una riga d'agenda
  guide?: {
    whatItIs?: string;
    whereItIs?: string;
    whyVisit?: string;
    historyCulture?: string;
    steps?: Array<{ title: string; detail: string }>;
    practicalTips?: string[];
  };
  planB?: string;
  // tempo e numeri
  startTime?: string;
  endTime?: string;
  durationLabel?: string;
  costLabel?: string;
  transport?: string;
  // luogo
  locationName?: string;
  locationAddress?: string;
  lat?: number;
  lng?: number;
  imageUrl?: string;
  // conversione
  cta?: string;
  ctaUrl?: string;
  ctaPrice?: string;
  ctaStatus?: string;
  ctaProvider?: string;
};

/** L'elenco autorevole. Aggiungere un campo qui lo fa sopravvivere ovunque. */
export const EDITED_MOMENT_FIELDS = [
  "id", "t", "band", "ic", "type", "kindLabel",
  "title", "desc", "why", "guide", "planB",
  "startTime", "endTime", "durationLabel", "costLabel", "transport",
  "locationName", "locationAddress", "lat", "lng", "imageUrl",
  "cta", "ctaUrl", "ctaPrice", "ctaStatus", "ctaProvider",
] as const;

export type EditedMomentField = typeof EDITED_MOMENT_FIELDS[number];

const NUMERIC: ReadonlySet<string> = new Set(["lat", "lng"]);

/** SCRITTURA — momento a schermo → oggetto da persistere. */
export function toEditedMoment(m: Record<string, any>): EditedMoment {
  const out: Record<string, any> = {};
  for (const k of EDITED_MOMENT_FIELDS) {
    const v = m[k];
    if (v === undefined || v === null || v === "") continue;
    if (NUMERIC.has(k) && typeof v !== "number") continue;
    out[k] = v;
  }
  return out as EditedMoment;
}

/** LETTURA — oggetto persistito → momento a schermo.
 *  `fallbackId` serve perché senza id la card resta MUTA al click (le
 *  schermate aprono il dettaglio solo se c'è un id). */
export function fromEditedMoment(e: Record<string, any>, fallbackId: string): Record<string, any> {
  const out: Record<string, any> = {};
  for (const k of EDITED_MOMENT_FIELDS) {
    const v = e?.[k];
    if (v === undefined || v === null || v === "") continue;
    if (NUMERIC.has(k) && typeof v !== "number") continue;
    out[k] = v;
  }
  const id = typeof out.id === "string" ? out.id.trim() : "";
  out.id = id || fallbackId;
  return out;
}
