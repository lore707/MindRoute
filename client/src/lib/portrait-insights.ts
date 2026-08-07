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
  /** Anno della tappa, o null per "oggi". */
  year: number | null;
  isNow: boolean;
  axis: Axis;
  /** true = polo alto dell'asse. */
  hi: boolean;
  delta: number;
};

/**
 * Le tappe che hanno DAVVERO cambiato il modo di viaggiare.
 * Soglia 0.15 come da specifica: sotto, è rumore e non una storia.
 * Massimo 4 tappe passate + "oggi", perché una timeline con dieci puntini non
 * si legge come un'evoluzione.
 */
export function buildEvolution(
  snaps: Array<{ createdAt: string; traits: Record<string, number> }>,
  maxSteps = 4,
): EvolutionStep[] {
  const valid = snaps
    .filter(s => s.traits && s.createdAt && !isNaN(new Date(s.createdAt).getTime()))
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  if (valid.length < 2) return [];

  const moves: EvolutionStep[] = [];
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1].traits, cur = valid[i].traits;
    let axis: Axis | null = null, delta = 0;
    for (const a of AXES) {
      const d = (cur[a] ?? 0.5) - (prev[a] ?? 0.5);
      if (Math.abs(d) > Math.abs(delta)) { delta = d; axis = a; }
    }
    if (!axis || Math.abs(delta) < 0.15) continue;
    moves.push({
      year: new Date(valid[i].createdAt).getUTCFullYear(),
      isNow: false,
      axis,
      hi: (cur[axis] ?? 0.5) >= 0.5,
      delta,
    });
  }
  if (moves.length === 0) return [];

  // I più forti, poi rimessi in ordine cronologico: la storia si legge avanti.
  const kept = moves
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, maxSteps)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0));

  // "Oggi" chiude sempre la riga, sull'asse oggi più marcato.
  const last = valid[valid.length - 1].traits;
  let nowAxis: Axis = "exposure", nowDist = -1;
  for (const a of AXES) {
    const d = Math.abs((last[a] ?? 0.5) - 0.5);
    if (d > nowDist) { nowDist = d; nowAxis = a; }
  }
  kept.push({ year: null, isNow: true, axis: nowAxis, hi: (last[nowAxis] ?? 0.5) >= 0.5, delta: 0 });
  return kept;
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
