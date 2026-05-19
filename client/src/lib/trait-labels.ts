/**
 * Derivatore deterministico: 5 assi psicologici (TraitVector) → 4 etichette
 * user-friendly con percentuali, per il blocco "I tuoi quattro tratti" della
 * pagina /my-account.
 *
 * Strategia: definiamo ~10 candidati polari (es. "Slow travel" vs
 * "Spontaneous heart" su structure axis); per ogni candidato calcoliamo uno
 * "score" in [0,1] derivato dagli assi che lo definiscono; teniamo solo quelli
 * sopra una soglia di significatività (0.58) per evitare di restituire
 * candidati neutri quando il vector è ancora in formazione; ordiniamo per
 * score discendente e prendiamo i top 4.
 *
 * Niente AI: regole pure, output identico a parità di input → deterministico
 * e cache-friendly. Se il vector è troppo neutro per dare 4 etichette
 * significative, riempiamo con placeholder "in formazione".
 *
 * Mantenere allineato con shared/traits.ts: se AXIS_NAMES cambia o la
 * semantica left/right si inverte, aggiornare anche le formule `score()` qui.
 */
import type { TraitVector } from "@shared/traits";

export interface TraitLabel {
  pct: string;      // "94%"
  name: string;     // "Slow travel"
  desc: string;     // sottotitolo breve in uppercase nella UI
  bar: number;      // 0-100, alimenta la barra gradient
}

interface Candidate {
  name: string;
  desc: string;
  score: (v: TraitVector) => number; // 0-1
}

// Coppie polari: per ogni asse abbiamo due candidati opposti, così a parità di
// vector emerge sempre uno dei due (mai entrambi, perché la soglia 0.58 esclude
// l'opposto quando il primo è forte). I desc sono brevi, evocativi.
const CANDIDATES: Candidate[] = [
  // structure axis (pianificato ↔ spontaneo) — pace_slider feeds here
  { name: "Slow travel",        desc: "Bassa intensità · ritmo lento",        score: v => 1 - v.structure },
  { name: "Spontaneous heart",  desc: "Decidere strada facendo",              score: v => v.structure },
  // matter axis (cultura ↔ natura)
  { name: "Coastal soul",       desc: "Mare & natura prima della metropoli",  score: v => v.matter },
  { name: "Culture-first",      desc: "Musei, storia, città vive",            score: v => 1 - v.matter },
  // exposure axis (mainstream ↔ offbeat)
  { name: "Authentic over polished", desc: "Trattorie locali · no tourist trap", score: v => v.exposure },
  { name: "Curated comfort",    desc: "Sceglie luoghi noti e ben tenuti",     score: v => 1 - v.exposure },
  // social axis (intimo ↔ sociale)
  { name: "Solo spirit",        desc: "Cerca silenzio e introspezione",       score: v => 1 - v.social },
  { name: "Social heart",       desc: "Cerca tavolate, persone, vita",        score: v => v.social },
  // comfort axis (comfort ↔ rude/raw)
  { name: "Adventure seeker",   desc: "Sceglie scomodità che ricordi",        score: v => v.comfort },
  { name: "Comfort lover",      desc: "Letti morbidi · esperienze curate",    score: v => 1 - v.comfort },
];

const THRESHOLD = 0.58;
const TARGET = 4;

export function deriveTraitLabels(vector: TraitVector | null | undefined): TraitLabel[] {
  if (!vector) return inFormationPlaceholders();

  const scored = CANDIDATES
    .map(c => ({ c, s: c.score(vector) }))
    .filter(x => x.s >= THRESHOLD)
    .sort((a, b) => b.s - a.s);

  // De-dup per asse: non vogliamo "Slow travel 88%" + "Spontaneous heart 12%"
  // (matematicamente impossibile data la soglia, ma per sicurezza scartiamo
  // candidati la cui formula tocca lo stesso asse di uno già scelto).
  const usedAxisIds = new Set<string>();
  const top: Array<{ c: Candidate; s: number }> = [];
  for (const x of scored) {
    const axisId = axisIdOf(x.c.name);
    if (usedAxisIds.has(axisId)) continue;
    usedAxisIds.add(axisId);
    top.push(x);
    if (top.length === TARGET) break;
  }

  const labels: TraitLabel[] = top.map(x => {
    const pct = Math.round(x.s * 100);
    return { pct: `${pct}%`, name: x.c.name, desc: x.c.desc, bar: pct };
  });

  // Riempi con placeholder se non abbiamo raggiunto 4 etichette significative
  while (labels.length < TARGET) {
    labels.push(placeholderAt(labels.length));
  }
  return labels;
}

function axisIdOf(name: string): string {
  // Hard-coded perché CANDIDATES è dichiarato e l'ordine è prevedibile. Tenere
  // allineato con le coppie polari sopra.
  if (name === "Slow travel" || name === "Spontaneous heart") return "structure";
  if (name === "Coastal soul" || name === "Culture-first") return "matter";
  if (name === "Authentic over polished" || name === "Curated comfort") return "exposure";
  if (name === "Solo spirit" || name === "Social heart") return "social";
  if (name === "Adventure seeker" || name === "Comfort lover") return "comfort";
  return name;
}

function inFormationPlaceholders(): TraitLabel[] {
  return Array.from({ length: TARGET }, (_, i) => placeholderAt(i));
}

function placeholderAt(i: number): TraitLabel {
  const stubs = [
    { name: "Profilo in formazione", desc: "Più viaggi · più precisione" },
    { name: "Tratto in attesa", desc: "Aggiungi un itinerario" },
    { name: "Segnale debole", desc: "Servono più dati per essere precisi" },
    { name: "Tratto in attesa", desc: "Aggiungi un itinerario" },
  ];
  const s = stubs[i] ?? stubs[stubs.length - 1];
  return { pct: "—", name: s.name, desc: s.desc, bar: 12 };
}
