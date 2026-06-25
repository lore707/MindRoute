// ─────────────────────────────────────────────────────────────────────────
// profile-coverage.ts — "Questo viaggio ti somiglia al X%"
//
// La percentuale NON è decorativa: è la copertura reale del profilo. L1 (le 4
// domande veloci) riempie il nucleo (destinazione/sensazione + durata + budget)
// e parte volutamente "incompleta" (~55%), così ogni raffinamento L2 la fa
// salire e l'utente vede il viaggio diventare più suo. Stessa funzione su client
// (banner) e server (risposta /refine): un'unica fonte di verità.
// ─────────────────────────────────────────────────────────────────────────

export type CoverageDimKey =
  | "destination" | "duration" | "budget"          // L1 — nucleo
  | "companions" | "accommodation" | "food"        // L2
  | "movement" | "pace" | "avoid" | "departure";   // L2

export type CoverageDim = {
  key: CoverageDimKey;
  label_it: string;
  label_en: string;
  /** Domanda L2 da porre quando non è ancora compilata. */
  question_it: string;
  question_en: string;
  done: boolean;
  /** true = nucleo L1 (non riproposto in L2). */
  core: boolean;
};

export type Coverage = {
  pct: number;
  dims: CoverageDim[];
  /** Le dimensioni L2 ancora aperte, nell'ordine in cui proporle. */
  open: CoverageDim[];
};

const hasStr = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
const hasArr = (v: unknown): boolean => Array.isArray(v) && v.length > 0;

// L1 vale 55 (destinazione 25, durata 15, budget 15). I 7 assi L2 si dividono i
// restanti 45 → ~6.43 ciascuno: profilo pieno = 100%.
const CORE_WEIGHT = { destination: 25, duration: 15, budget: 15 } as const;
const L2_TOTAL = 45;

export function computeCoverage(p: any): Coverage {
  const l1 = p?._l1 ?? {};
  const destDone = hasStr(l1.city) || hasStr(l1.sensation) || hasStr(l1.mode);

  const dims: CoverageDim[] = [
    {
      key: "destination", core: true,
      label_it: "Meta", label_en: "Destination",
      question_it: "", question_en: "",
      done: destDone,
    },
    {
      key: "duration", core: true,
      label_it: "Durata", label_en: "Duration",
      question_it: "", question_en: "",
      done: !!p?.days,
    },
    {
      key: "budget", core: true,
      label_it: "Budget", label_en: "Budget",
      question_it: "", question_en: "",
      done: hasStr(p?.budget),
    },
    {
      key: "pace", core: false,
      label_it: "Ritmo", label_en: "Pace",
      question_it: "Le giornate ti sembrano troppo piene o troppo vuote?",
      question_en: "Do the days feel too full or too empty?",
      done: hasStr(p?.pace),
    },
    {
      key: "companions", core: false,
      label_it: "Compagnia", label_en: "Travel party",
      question_it: "Con chi parti?",
      question_en: "Who are you traveling with?",
      done: hasStr(p?.companions),
    },
    {
      key: "accommodation", core: false,
      label_it: "Dove dormi", label_en: "Where you sleep",
      question_it: "Dove vorresti dormire?",
      question_en: "Where would you like to sleep?",
      done: hasStr(p?.accommodation),
    },
    {
      key: "food", core: false,
      label_it: "Come mangi", label_en: "How you eat",
      question_it: "Come vuoi mangiare?",
      question_en: "How do you want to eat?",
      done: hasStr(p?.food),
    },
    {
      key: "movement", core: false,
      label_it: "Come ti muovi", label_en: "How you move",
      question_it: "Come vuoi spostarti?",
      question_en: "How do you want to get around?",
      done: hasStr(p?.travelStyle),
    },
    {
      key: "avoid", core: false,
      label_it: "Cosa eviti", label_en: "What to avoid",
      question_it: "Cosa vuoi evitare?",
      question_en: "What do you want to avoid?",
      done: hasArr(p?.avoid) || hasStr(p?.avoid),
    },
    {
      key: "departure", core: false,
      label_it: "Da dove parti", label_en: "Where you start",
      question_it: "Da dove parti?",
      question_en: "Where are you starting from?",
      done: hasStr(p?.departure),
    },
  ];

  const l2Dims = dims.filter((d) => !d.core);
  const eachW = L2_TOTAL / l2Dims.length;
  let pct = 0;
  if (destDone) pct += CORE_WEIGHT.destination;
  if (p?.days) pct += CORE_WEIGHT.duration;
  if (hasStr(p?.budget)) pct += CORE_WEIGHT.budget;
  for (const d of l2Dims) if (d.done) pct += eachW;
  pct = Math.round(Math.min(100, Math.max(0, pct)));

  return { pct, dims, open: l2Dims.filter((d) => !d.done) };
}
