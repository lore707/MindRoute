// ─────────────────────────────────────────────────────────────────────────
// Per-destination trait vectors. Used to blend with the quiz-derived vector
// when the user picks a destination (revealed preference signal).
//
// Each vector is 5 numbers in [0, 1]:
//   - exposure  (0=mainstream, 1=offbeat)
//   - comfort   (0=plush,      1=roughing)
//   - social    (0=intimate,   1=crowded/social)
//   - matter    (0=culture,    1=nature)
//   - structure (0=planned,    1=spontaneous)
//
// Numbers are editorial reads keyed on the catalog's keywords. They are
// versioned implicitly with destination-catalog.ts: if a destination's
// character changes (different itineraries, repositioning), update here.
// ─────────────────────────────────────────────────────────────────────────

import { type TraitVector, type Axis } from "@shared/traits";

// Keys = city/area prefix (before the first comma in destinationName),
// lowercased. Match is case-insensitive on lookup.
const VECTORS: Record<string, TraitVector> = {
  // Quiet-nature / recovery cluster
  "azzorre":     { exposure: 0.78, comfort: 0.40, social: 0.15, matter: 0.88, structure: 0.40 },
  "alentejo":    { exposure: 0.72, comfort: 0.30, social: 0.22, matter: 0.60, structure: 0.35 },
  "madeira":     { exposure: 0.55, comfort: 0.40, social: 0.30, matter: 0.78, structure: 0.40 },

  // Raw-wild / explorer cluster
  "isole lofoten":            { exposure: 0.85, comfort: 0.75, social: 0.18, matter: 0.92, structure: 0.55 },
  "reykjavík":                { exposure: 0.60, comfort: 0.70, social: 0.30, matter: 0.92, structure: 0.70 },
  "patagonia":                { exposure: 0.80, comfort: 0.88, social: 0.18, matter: 0.95, structure: 0.50 },

  // Offbeat-cultural cluster
  "georgia":     { exposure: 0.85, comfort: 0.65, social: 0.65, matter: 0.50, structure: 0.65 },
  "albania":     { exposure: 0.85, comfort: 0.70, social: 0.55, matter: 0.55, structure: 0.65 },
  "uzbekistan":  { exposure: 0.80, comfort: 0.55, social: 0.40, matter: 0.20, structure: 0.35 },

  // Spiritual / contemplative cluster
  "varanasi":        { exposure: 0.85, comfort: 0.85, social: 0.75, matter: 0.10, structure: 0.55 },
  "luang prabang":   { exposure: 0.70, comfort: 0.40, social: 0.25, matter: 0.30, structure: 0.25 },
  "kyoto":           { exposure: 0.30, comfort: 0.25, social: 0.40, matter: 0.10, structure: 0.20 },
  "cappadocia":      { exposure: 0.45, comfort: 0.35, social: 0.45, matter: 0.65, structure: 0.30 },

  // Vibrant-sensory cluster
  "marrakech":   { exposure: 0.40, comfort: 0.55, social: 0.78, matter: 0.20, structure: 0.55 },
  "napoli":      { exposure: 0.50, comfort: 0.75, social: 0.85, matter: 0.20, structure: 0.75 },
  "medellín":    { exposure: 0.65, comfort: 0.45, social: 0.80, matter: 0.35, structure: 0.60 },
  "oaxaca":      { exposure: 0.65, comfort: 0.50, social: 0.72, matter: 0.18, structure: 0.55 },

  // Romantic-mainstream-european cluster
  "puglia":      { exposure: 0.40, comfort: 0.30, social: 0.50, matter: 0.45, structure: 0.40 },
  "lisbona":     { exposure: 0.25, comfort: 0.30, social: 0.55, matter: 0.20, structure: 0.35 },
  "praga":       { exposure: 0.20, comfort: 0.25, social: 0.55, matter: 0.10, structure: 0.25 },
};

// ── Derivazione per keyword da testo NEUTRO della destinazione ─────────────
// keyword→contributi sui 5 assi, stessa sigmoide del quiz. Con <2 keyword il
// ritratto è troppo povero → null (degradazione onesta: meglio nessun vettore
// che uno rumoroso).
//
// IMPORTANTE (correzione revealed-preference, 2026-07-24): questa derivazione
// va alimentata SOLO con testo neutro sulla destinazione (nome, tipologia,
// descrittori generici). NON con whyYours/experiencePreview: quella è copy che
// il matcher scrive su misura per l'utente sulla base del suo stesso profilo —
// derivarne il vettore era un anello di autoconferma che rinforzava il profilo
// senza far entrare informazione nuova. Il segnale valido è il CONTRASTO tra
// la destinazione scelta e le due scartate (revealedPreferenceVector), calcolato
// su vettori neutri.
import { traitSigmoid } from "@shared/traits";

const KEYWORD_CONTRIB: Array<[RegExp, Partial<Record<Axis, number>>]> = [
  [/trekk|hik(e|ing)|escursion|sentier|vett[ae]|peak|cime|montagn|mountain/i, { matter: +0.5, comfort: +0.35 }],
  [/natur|forest|foresta|parco nazionale|national park|wild|selvagg/i,        { matter: +0.5 }],
  [/spiagg|beach|\bmare\b|\bsea\b|coast|costier|isol[ae]|island|fiord/i,      { matter: +0.3 }],
  [/muse[oi]|museum|cattedral|cathedral|palazz|palace|storia|history|storic|historic|templ|rovin|ruins|archeolog|galler/i, { matter: -0.45 }],
  [/nightlife|vita notturna|club|movida|fest[ae]|festival/i,                  { social: +0.5 }],
  [/mercat|market|bazaar|suq|souk|street food/i,                              { social: +0.35, exposure: +0.15 }],
  [/villagg|village|borgh|remot|sperdut|fuori rotta|off the beaten|pochi turisti|non turistic|autentic|authentic/i, { exposure: +0.5 }],
  [/iconic|famos|famous|celebre|classic|imperdibil|must.?see|cartolina/i,     { exposure: -0.35 }],
  [/lusso|luxur|resort|\bspa\b|benesser|wellness|eleganz/i,                   { comfort: -0.45 }],
  [/zaino|backpack|avventur|adventur|adrenalin|kayak|rafting|surf/i,          { comfort: +0.45, matter: +0.2 }],
  [/silenzi|silence|quiet|tranquill|calm|lentezz|slow|contemplat|monaster/i,  { social: -0.35 }],
  [/road.?trip|on the road|itinerant|spontane/i,                              { structure: +0.4 }],
];

export function deriveDestinationTraitVector(text: string | null | undefined): TraitVector | null {
  if (!text || !text.trim()) return null;
  const acc: Record<Axis, number> = { exposure: 0, comfort: 0, social: 0, matter: 0, structure: 0 };
  let hits = 0;
  for (const [re, contrib] of KEYWORD_CONTRIB) {
    if (!re.test(text)) continue;
    hits++;
    for (const [axis, w] of Object.entries(contrib)) acc[axis as Axis] += w as number;
  }
  if (hits < 2) return null;
  return {
    exposure:  traitSigmoid(acc.exposure),
    comfort:   traitSigmoid(acc.comfort),
    social:    traitSigmoid(acc.social),
    matter:    traitSigmoid(acc.matter),
    structure: traitSigmoid(acc.structure),
  };
}

// Vettore NEUTRO della destinazione: catalogo curato per nome (letture
// editoriali indipendenti dall'utente), poi derivazione keyword dal solo NOME
// (città/paese: raramente porta ≥2 keyword → null onesto). Non usa mai copy
// persuasiva. compass.ts/daily-pick.ts passano nomi di catalogo → colpiscono
// la mappa. Il vecchio secondo parametro `descriptionText` è stato rimosso:
// era il canale con cui la copy persuasiva entrava nel profilo.
export function getDestinationTraitVector(
  name: string | null | undefined,
): TraitVector | null {
  if (!name) return null;
  const key = name.split(",")[0].trim().toLowerCase();
  return VECTORS[key] ?? deriveDestinationTraitVector(name);
}

// ── Revealed preference: contrasto scelta vs scartate (§9 Evoluzione) ──────
// "Quale delle 3 destinazioni ha scelto (e quali ha scartato: lo scarto è
// segnale quanto la scelta)". Il segnale valido NON è il vettore assoluto della
// scelta, ma la DIREZIONE in cui la scelta differisce dalle alternative scartate,
// su vettori neutri. Se il trio era tutto-cultura e l'utente ne sceglie una,
// "cultura" non è rivelata (nessun contrasto): ciò che emerge è l'asse su cui la
// scelta diverge dagli scarti. Ritorna un vettore in cui 0.5 = "nessun segnale
// su questo asse" e lo scostamento dalla neutralità = preferenza rivelata.
//
// Degradazione onesta: serve il vettore neutro della scelta E di almeno una
// scartata, altrimenti null (niente blend → snapshot quiz-only). Preferiamo
// nessun blend a un blend non informativo.
export function revealedPreferenceVector(
  chosenName: string,
  rejectedNames: string[],
): TraitVector | null {
  const chosen = getDestinationTraitVector(chosenName);
  if (!chosen) return null;
  const rejected = rejectedNames
    .filter((n) => n && n.trim() && n !== chosenName)
    .map((n) => getDestinationTraitVector(n))
    .filter((v): v is TraitVector => !!v);
  if (rejected.length === 0) return null;

  const axes: Axis[] = ["exposure", "comfort", "social", "matter", "structure"];
  const out = {} as TraitVector;
  for (const ax of axes) {
    const meanRejected = rejected.reduce((s, v) => s + v[ax], 0) / rejected.length;
    const delta = chosen[ax] - meanRejected;           // [-1, 1]
    out[ax] = Math.max(0, Math.min(1, 0.5 + delta));   // 0.5 = nessun contrasto
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// Trait-coherence (2A): finora i VECTORS sopra erano usati solo per fondere
// quiz↔scelta al momento del pick (trait-recorder), MAI nella SELEZIONE delle
// 3 destinazioni. Qui li attiviamo come PRIOR numerico: data il vettore
// dell'utente, classifichiamo le mete del catalogo per coerenza e iniettiamo
// una shortlist nel prompt del matcher. È un hint, non un filtro: lo slot
// "direct" dovrebbe pescare in alto, "surprise" può deviare di proposito.
// ─────────────────────────────────────────────────────────────────────────
const AXES: Axis[] = ["exposure", "comfort", "social", "matter", "structure"];

/** Coerenza in [0,1] = 1 − distanza euclidea normalizzata (più alto = più simile). */
export function destinationCoherence(user: TraitVector, dest: TraitVector): number {
  let sum = 0;
  for (const ax of AXES) { const d = (user[ax] ?? 0.5) - (dest[ax] ?? 0.5); sum += d * d; }
  return 1 - Math.sqrt(sum) / Math.sqrt(AXES.length);
}

function titleCaseKey(key: string): string {
  return key.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function rankDestinationCoherence(user: TraitVector, topN = 6): Array<{ name: string; score: number }> {
  return Object.entries(VECTORS)
    .map(([key, v]) => ({ name: titleCaseKey(key), score: destinationCoherence(user, v) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/** Blocco prompt (EN) con la shortlist di coerenza. "" se non c'è catalogo. */
export function formatDestinationCoherenceBlock(user: TraitVector): string {
  const ranked = rankDestinationCoherence(user, 6);
  if (ranked.length === 0) return "";
  const lines = ranked.map((r) => `  - ${r.name} (coherence ${r.score.toFixed(2)})`).join("\n");
  return `

═══════════════════════════════════════
TRAIT-COHERENCE SHORTLIST — numeric match on the 5 psychological axes
═══════════════════════════════════════
Computed by comparing the user's trait vector with editorial trait vectors for catalog places (exposure / comfort / social / matter / structure). It is a PRIOR, not a filter: the "direct" slot should lean toward the high-coherence options below, while "lateral" and especially "surprise" may deliberately deviate. The current quiz answers and your creative judgement still rule.

${lines}

`;
}
