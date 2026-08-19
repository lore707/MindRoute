/**
 * portrait-insights.ts — il motore del Ritratto: cosa MindRoute ha scoperto.
 *
 * Logica pura, zero React e zero fetch: prende i dati reali dell'account e
 * produce confidenza, evoluzione e insight. Così è verificabile da riga di
 * comando (script/verify-portrait.ts) e non può inventare nulla.
 *
 * Regola che governa tutto il file: **un insight esiste solo se dietro c'è un
 * conteggio vero**. Il numero non si mostra nel titolo (la specifica vieta i
 * dati numerici inutili), ma sta in `why` ed esce quando l'utente chiede
 * "perché". Niente "Sei un esploratore al 73%": quello è un punteggio, non una
 * scoperta.
 * ─────────────────────────────────────────────────────────────── */

export type InsightId =
  | "continent-loyal" | "continent-gap" | "season-gap" | "duration-long"
  | "duration-short" | "dreamer" | "nature" | "solo" | "unplanned" | "comfort-drift";

export type Insight = {
  id: InsightId;
  /** Peso 0-1: ordina quali 4 mostrare. */
  strength: number;
  /** Chiave i18n del titolo (max 6 parole nel testo). */
  titleKey: string;
  /** Chiave i18n della spiegazione breve (max 12 parole). */
  bodyKey: string;
  /** Variabili per l'interpolazione. */
  vars: Record<string, string | number>;
  /** Il conteggio vero dietro l'insight — si mostra su "perché". */
  why: { key: string; vars: Record<string, string | number> };
  /** Può diventare il prossimo passo (sezione "What's next"). */
  actionable: boolean;
  /** Testo-sfida da passare alla generazione, se azionabile. */
  challengeKey?: string;
};

export type PortraitTrip = {
  dest: string;
  continent?: string;
  rawDate?: string;
  taken?: boolean;
  duration?: string;
};

export type PortraitSignals = {
  trips: PortraitTrip[];
  seek: string[];
  avoid: string[];
  vector: Record<string, number> | null;
  snapshotCount: number;
  ownWords: string | null;
};

/* ── numeri di base ───────────────────────────────────────────────────────── */

const MONTH_OF = (iso?: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d.getUTCMonth(); // 0-11
};

const daysOf = (duration?: string): number | null => {
  if (!duration) return null;
  const m = String(duration).match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

/** Viaggi che l'utente dice di aver fatto davvero. */
export const takenTrips = (trips: PortraitTrip[]) => trips.filter(t => t.taken);

/**
 * CONFIDENZA 0-100 — quanto MindRoute può dire di conoscere questa persona.
 *
 * Non è un numero decorativo: sotto il 30% la specifica vieta di mostrare
 * insight, quindi deve salire solo su prove vere.
 *   · uno snapshot del profilo         = 1 prova
 *   · un viaggio CONFERMATO            = 2 prove (vale il doppio di uno sognato)
 *   · le parole scelte dall'utente     = 1 prova
 *   · ogni chip "cosa cerco" (max 4)   = mezza prova
 * Saturazione esponenziale e tetto a 95: non diremo mai di conoscere
 * qualcuno con certezza.
 */
export function computeConfidence(s: PortraitSignals): number {
  const evidence =
    s.snapshotCount
    + takenTrips(s.trips).length * 2
    + (s.ownWords ? 1 : 0)
    + Math.min(s.seek.length, 4) * 0.5;
  if (evidence <= 0) return 0;
  return Math.min(95, Math.round(100 * (1 - Math.exp(-evidence / 4.5))));
}

/* ── evoluzione ───────────────────────────────────────────────────────────── */

export const AXES = ["exposure", "comfort", "social", "matter", "structure"] as const;
export type Axis = typeof AXES[number];

export type EvolutionStep = {
  /** "change" = un cambiamento vero; "now" = dove stai andando adesso. */
  kind: "change" | "now";
  axis: Axis;
  /** true = polo alto dell'asse DOPO il cambiamento. */
  hi: boolean;
  /** Da dove veniva: serve a dire "da X a Y", non solo "sei Y". */
  fromHi: boolean;
  delta: number;
  /** Il VIAGGIO in cui il cambiamento si e' visto. E' l'ancora giusta:
   *  "dopo Marrakech" dice qualcosa, "2026" no — soprattutto se tutti i
   *  viaggi sono dello stesso anno, che e' il caso normale di un account
   *  nuovo. */
  trip: { dest: string; img?: string; href?: string; when: string | null } | null;
  /** Posizione nella sequenza dei viaggi (1-based): l'etichetta di ripiego
   *  quando il viaggio non si riesce ad agganciare. */
  ordinal: number;
};

export type EvolutionTrip = { dest: string; img?: string; href?: string; rawDate?: string };

const monthLabel = (iso: string, lang: "it" | "en"): string | null => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const M = lang === "it"
    ? ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${M[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Le tappe che hanno DAVVERO cambiato il modo di viaggiare.
 *
 * Tre regole che nascono da quello che si vedeva a schermo:
 *  · soglia 0.15 (specifica): sotto, e' rumore e non una storia;
 *  · niente due tappe di fila con lo stesso polo — "Sfidante / Sfidante" non
 *    e' un'evoluzione, e' la stessa cosa scritta due volte;
 *  · ogni tappa e' agganciata al VIAGGIO in cui il cambiamento si e' visto.
 *    L'anno da solo non spiega niente quando tutti i viaggi sono dello stesso
 *    anno — ed e' la situazione normale di un profilo nuovo.
 *
 * L'ultima tappa non e' un polo in piu': e' "dove stai andando", la direzione
 * che le altre insieme disegnano.
 */
export function buildEvolution(
  snaps: Array<{ createdAt: string; traits: Record<string, number> }>,
  trips: EvolutionTrip[] = [],
  lang: "it" | "en" = "it",
  maxSteps = 4,
): EvolutionStep[] {
  const valid = snaps
    .filter(s => s.traits && s.createdAt && !isNaN(new Date(s.createdAt).getTime()))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  if (valid.length < 2) return [];

  // Viaggi datati, in ordine: servono per agganciare ogni cambiamento.
  const dated = trips
    .filter(t => t.rawDate && !isNaN(new Date(t.rawDate).getTime()))
    .map(t => ({ t, at: +new Date(t.rawDate!) }))
    .sort((a, b) => a.at - b.at);

  const moves: Array<Omit<EvolutionStep, "ordinal">> = [];
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1].traits, cur = valid[i].traits;
    let axis: Axis | null = null, delta = 0;
    for (const a of AXES) {
      const d = (cur[a] ?? 0.5) - (prev[a] ?? 0.5);
      if (Math.abs(d) > Math.abs(delta)) { delta = d; axis = a; }
    }
    if (!axis || Math.abs(delta) < 0.15) continue;

    // Il viaggio piu' vicino nel tempo allo snapshot: e' li' che il
    // cambiamento si e' manifestato.
    const at = +new Date(valid[i].createdAt);
    let best: typeof dated[number] | null = null, bestDist = Infinity;
    for (const x of dated) {
      const d = Math.abs(x.at - at);
      if (d < bestDist) { bestDist = d; best = x; }
    }
    moves.push({
      kind: "change",
      axis,
      hi: (cur[axis] ?? 0.5) >= 0.5,
      fromHi: (prev[axis] ?? 0.5) >= 0.5,
      delta,
      trip: best
        ? { dest: best.t.dest, img: best.t.img, href: best.t.href, when: best.t.rawDate ? monthLabel(best.t.rawDate, lang) : null }
        : null,
    });
  }
  if (moves.length === 0) return [];

  // I piu' forti, rimessi in ordine cronologico: la storia si legge avanti.
  const strongest = moves
    .slice()
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, maxSteps);
  const chrono = moves.filter(m => strongest.includes(m));

  // Due tappe di fila sullo stesso polo dello stesso asse non raccontano nulla.
  const kept: Array<Omit<EvolutionStep, "ordinal">> = [];
  for (const m of chrono) {
    const last = kept[kept.length - 1];
    if (last && last.axis === m.axis && last.hi === m.hi) continue;
    kept.push(m);
  }

  const out: EvolutionStep[] = kept.map((m, i) => ({ ...m, ordinal: i + 1 }));

  // "Dove stai andando": l'asse su cui il profilo si e' spostato di piu' NEL
  // COMPLESSO, dal primo snapshot all'ultimo. Non un polo ripetuto: una
  // direzione.
  const first = valid[0].traits, last = valid[valid.length - 1].traits;
  let dirAxis: Axis = "exposure", dirDelta = 0;
  for (const a of AXES) {
    const d = (last[a] ?? 0.5) - (first[a] ?? 0.5);
    if (Math.abs(d) > Math.abs(dirDelta)) { dirDelta = d; dirAxis = a; }
  }
  out.push({
    kind: "now",
    axis: dirAxis,
    hi: (last[dirAxis] ?? 0.5) >= 0.5,
    fromHi: (first[dirAxis] ?? 0.5) >= 0.5,
    delta: dirDelta,
    trip: null,
    ordinal: out.length + 1,
  });
  return out;
}

/* ── insight ──────────────────────────────────────────────────────────────── */

const WINTER = new Set([11, 0, 1]); // dic, gen, feb
const NATURE_WORDS = ["natur", "mare", "montagn", "silenz", "verde", "ocean", "nature", "sea", "mountain", "wild", "quiet"];

/**
 * Tutti gli insight che i dati REGGONO, ordinati per forza.
 * Il chiamante prende i primi 4 (specifica §3) e li mostra solo se la
 * confidenza supera il 30% (specifica §7).
 */
export function buildInsights(s: PortraitSignals): Insight[] {
  const out: Insight[] = [];
  const trips = s.trips;
  const done = takenTrips(trips);
  const n = trips.length;

  /* 1. Un continente che ritorna. */
  if (n >= 3) {
    const byCont = new Map<string, number>();
    for (const t of trips) {
      const c = (t.continent ?? "").trim();
      if (c) byCont.set(c, (byCont.get(c) ?? 0) + 1);
    }
    const top = Array.from(byCont.entries()).sort((a, b) => b[1] - a[1])[0];
    if (top && top[1] / n >= 0.6 && byCont.size > 1) {
      out.push({
        id: "continent-loyal", strength: top[1] / n,
        titleKey: "pt.in.contLoyal.t", bodyKey: "pt.in.contLoyal.b",
        vars: { continent: top[0] },
        why: { key: "pt.in.contLoyal.w", vars: { k: top[1], n } },
        actionable: true, challengeKey: "pt.ch.contLoyal",
      });
    }
    // Un continente MAI toccato è una scoperta, non una mancanza.
    const ALL = ["Europa", "Asia", "Africa", "Americhe", "Oceania"];
    const missing = ALL.filter(c => !byCont.has(c));
    if (missing.length > 0 && missing.length < ALL.length) {
      out.push({
        id: "continent-gap", strength: 0.55,
        titleKey: "pt.in.contGap.t", bodyKey: "pt.in.contGap.b",
        vars: { continent: missing[0] },
        why: { key: "pt.in.contGap.w", vars: { continent: missing[0], n } },
        actionable: true, challengeKey: "pt.ch.contGap",
      });
    }
  }

  /* 2. Una stagione che manca. */
  if (n >= 4) {
    const months = trips.map(t => MONTH_OF(t.rawDate)).filter((m): m is number => m != null);
    if (months.length >= 4) {
      const winter = months.filter(m => WINTER.has(m)).length;
      if (winter === 0) {
        out.push({
          id: "season-gap", strength: 0.6,
          titleKey: "pt.in.season.t", bodyKey: "pt.in.season.b", vars: {},
          why: { key: "pt.in.season.w", vars: { n: months.length } },
          actionable: true, challengeKey: "pt.ch.season",
        });
      }
    }
  }

  /* 3. La durata dice il ritmo. */
  {
    const ds = trips.map(t => daysOf(t.duration)).filter((d): d is number => d != null && d > 0);
    if (ds.length >= 3) {
      const avg = ds.reduce((a, b) => a + b, 0) / ds.length;
      if (avg >= 8) {
        out.push({
          id: "duration-long", strength: Math.min(0.7, avg / 14),
          titleKey: "pt.in.durLong.t", bodyKey: "pt.in.durLong.b", vars: {},
          why: { key: "pt.in.durLong.w", vars: { avg: Math.round(avg) } },
          actionable: false,
        });
      } else if (avg <= 4) {
        out.push({
          id: "duration-short", strength: 0.6,
          titleKey: "pt.in.durShort.t", bodyKey: "pt.in.durShort.b", vars: {},
          why: { key: "pt.in.durShort.w", vars: { avg: Math.round(avg) } },
          actionable: true, challengeKey: "pt.ch.durShort",
        });
      }
    }
  }

  /* 4. Sognati e non partiti. È il dato più onesto che abbiamo. */
  if (n >= 4 && done.length < n) {
    const ratio = 1 - done.length / n;
    if (ratio >= 0.5) {
      out.push({
        id: "dreamer", strength: 0.5 + ratio * 0.3,
        titleKey: "pt.in.dreamer.t", bodyKey: "pt.in.dreamer.b", vars: {},
        why: { key: "pt.in.dreamer.w", vars: { k: done.length, n } },
        actionable: false,
      });
    }
  }

  /* 5. La natura, se la chiedi davvero. */
  {
    const hits = s.seek.filter(c => NATURE_WORDS.some(w => c.toLowerCase().includes(w))).length;
    const matter = s.vector?.matter;
    if (hits >= 2 || (typeof matter === "number" && matter >= 0.7)) {
      out.push({
        id: "nature", strength: 0.65,
        titleKey: "pt.in.nature.t", bodyKey: "pt.in.nature.b", vars: {},
        why: { key: "pt.in.nature.w", vars: { k: hits } },
        actionable: false,
      });
    }
  }

  /* 6. Assi molto polarizzati: struttura e comfort raccontano come viaggi. */
  {
    const st = s.vector?.structure;
    if (typeof st === "number" && st <= 0.3) {
      out.push({
        id: "unplanned", strength: 0.55,
        titleKey: "pt.in.unplanned.t", bodyKey: "pt.in.unplanned.b", vars: {},
        why: { key: "pt.in.unplanned.w", vars: {} },
        actionable: false,
      });
    }
    const cf = s.vector?.comfort;
    if (typeof cf === "number" && cf <= 0.35) {
      out.push({
        id: "comfort-drift", strength: 0.5,
        titleKey: "pt.in.comfort.t", bodyKey: "pt.in.comfort.b", vars: {},
        why: { key: "pt.in.comfort.w", vars: {} },
        actionable: true, challengeKey: "pt.ch.comfort",
      });
    }
    const so = s.vector?.social;
    if (typeof so === "number" && so <= 0.25) {
      out.push({
        id: "solo", strength: 0.5,
        titleKey: "pt.in.solo.t", bodyKey: "pt.in.solo.b", vars: {},
        why: { key: "pt.in.solo.w", vars: {} },
        actionable: false,
      });
    }
  }

  return out.sort((a, b) => b.strength - a.strength);
}

/** I 4 da mostrare, con la soglia di confidenza della specifica (§7). */
export function visibleInsights(s: PortraitSignals, confidence: number, max = 4): Insight[] {
  if (confidence <= 30) return [];
  return buildInsights(s).slice(0, max);
}

/** L'insight che diventa il prossimo passo. Null se nessuno è azionabile. */
export function nextStepInsight(list: Insight[]): Insight | null {
  return list.find(i => i.actionable) ?? null;
}


/* ════════════════════════════════════════════════════════════════════════
   IL PONTE VERSO LA GENERAZIONE
   ────────────────────────────────────────────────────────────────────────
   Il Ritratto dice all'utente "torni sempre in Europa" e "non viaggi mai
   d'inverno". Poi l'utente preme "genera un viaggio pensato per te" — e al
   generatore arrivavano CINQUE NUMERI (il vettore dei tratti), non quelle
   frasi. Le due meta' del prodotto non si parlavano, e la destinazione
   proposta non poteva rispondere a un'analisi che non aveva mai ricevuto.

   Qui la stessa analisi che l'utente ha appena LETTO diventa un blocco di
   prompt. Non e' una decorazione: e' il motivo per cui la proposta puo'
   sembrare la risposta a quello che gli abbiamo appena detto di lui.

   In inglese perche' i prompt sono in inglese; i testi a schermo restano
   nel dizionario, tradotti.
   ════════════════════════════════════════════════════════════════════════ */

const AXIS_POLES: Record<Axis, { hi: string; lo: string }> = {
  exposure:  { hi: "seeks the unfamiliar", lo: "returns and goes deeper" },
  comfort:   { hi: "chooses friction and challenge", lo: "chooses ease and rest" },
  social:    { hi: "travels around people", lo: "travels for solitude" },
  matter:    { hi: "chooses landscape over architecture", lo: "chooses cities and human texture" },
  structure: { hi: "wants the day planned", lo: "protects unplanned time" },
};

/** Cosa ciascuna scoperta CHIEDE alla proposta. E' la parte azionabile. */
const INSIGHT_BRIEF: Record<InsightId, string> = {
  "continent-loyal": "They keep returning to one continent. Propose at least one option OUTSIDE it — not as a stunt, but as the natural next step for someone who already travels well.",
  "continent-gap": "There is a whole continent they have never visited. One of the options should open it, at a difficulty they can actually handle.",
  "season-gap": "They never travel in the cold months. If the requested dates allow it, favour a place that is BETTER off-season, and say why.",
  "duration-long": "They travel long and slow. Do not propose a place that is exhausted in three days.",
  "duration-short": "Their trips are short. Favour places that reward a short stay instead of punishing it.",
  "dreamer": "Many of their trips were planned and never taken. Favour options that are genuinely easy to depart for — the goal is a trip that HAPPENS.",
  "nature": "Nature is a real need, not a preference. Any option without a serious natural component will feel wrong to them.",
  "solo": "They travel to be alone. Avoid places whose appeal depends on company or nightlife.",
  "unplanned": "They protect unplanned time. Avoid destinations that only work with reservations booked weeks ahead.",
  "comfort-drift": "They have been drifting toward the familiar. One option should gently interrupt that drift.",
};

/**
 * Il blocco di prompt che porta il Ritratto dentro la generazione.
 * Vuoto quando non c'e' abbastanza materiale: meglio nessun blocco che un
 * blocco che afferma cose non sostenute dai dati.
 */
export function formatPortraitBlock(
  signals: PortraitSignals,
  evolution: EvolutionStep[],
  confidence = computeConfidence(signals),
): string {
  const insights = visibleInsights(signals, confidence);
  const direction = evolution.find(e => e.kind === "now");
  const changes = evolution.filter(e => e.kind === "change");
  if (insights.length === 0 && !direction) return "";

  const L: string[] = [];
  L.push("");
  L.push("═══════════════════════════════════════");
  L.push("PORTRAIT READING — what we have ALREADY TOLD this user about themselves");
  L.push("═══════════════════════════════════════");
  L.push("This is not background colour. The user has just read these sentences on their profile page and then pressed \"generate a journey designed for me\". The destinations you propose must READ AS THE ANSWER to what follows. If a proposal could have been produced without this section, it is the wrong proposal.");
  L.push("");

  if (changes.length > 0) {
    L.push("HOW THEIR TRAVEL HAS CHANGED (each step is a real movement in their profile, anchored to the trip where it showed):");
    for (const c of changes) {
      const from = c.fromHi ? AXIS_POLES[c.axis].hi : AXIS_POLES[c.axis].lo;
      const to = c.hi ? AXIS_POLES[c.axis].hi : AXIS_POLES[c.axis].lo;
      const where = c.trip ? ` (around ${c.trip.dest}${c.trip.when ? `, ${c.trip.when}` : ""})` : "";
      L.push(`  - ${c.axis}: from "${from}" to "${to}"${where}`);
    }
    L.push("");
  }

  if (direction) {
    const to = direction.hi ? AXIS_POLES[direction.axis].hi : AXIS_POLES[direction.axis].lo;
    L.push(`WHERE THEY ARE HEADING: ${direction.axis} — ${to}. The trip you propose should be the NEXT STEP in that direction, not a repetition of where they already are.`);
    L.push("");
  }

  if (insights.length > 0) {
    L.push("WHAT WE TOLD THEM WE DISCOVERED (each line is backed by a real count over their own trips):");
    for (const i of insights) {
      L.push(`  - ${INSIGHT_BRIEF[i.id]}`);
    }
    L.push("");
  }

  L.push("HOW TO USE THIS: at least ONE of the three destinations must visibly answer the discoveries above — and its \"why this fits you\" must reference the specific pattern, not a generic trait. Never contradict a discovery without saying, in the copy, that you are doing it on purpose.");
  L.push("");
  return L.join("\n");
}
