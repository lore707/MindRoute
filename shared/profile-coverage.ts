export type CoverageDimKey =
  | "destination" | "intent" | "interests" | "duration" | "budget"
  | "companions" | "pace" | "avoid" | "departure"
  | "accommodation" | "food" | "movement";

export type CoverageDim = {
  key: CoverageDimKey;
  label_it: string;
  label_en: string;
  question_it: string;
  question_en: string;
  done: boolean;
  core: boolean;
};

export type Coverage = { pct: number; dims: CoverageDim[]; open: CoverageDim[] };

const hasStr = (value: unknown) => typeof value === "string" && value.trim().length > 0;
const hasArr = (value: unknown) => Array.isArray(value) && value.length > 0;

function optionalDimensions(p: any): CoverageDim[] {
  return [
    { key: "accommodation", core: false, label_it: "Dove dormi", label_en: "Where you sleep", question_it: "Che tipo di alloggio ti farebbe stare davvero bene?", question_en: "What kind of stay would genuinely suit you?", done: hasStr(p?.accommodation) },
    { key: "food", core: false, label_it: "Come mangi", label_en: "How you eat", question_it: "Quanto deve contare il cibo in questo viaggio?", question_en: "How much should food matter on this trip?", done: hasStr(p?.food) },
    { key: "movement", core: false, label_it: "Come ti muovi", label_en: "How you move", question_it: "Preferisci una base o più tappe?", question_en: "Would you rather have one base or multiple stops?", done: hasStr(p?.movement) || (hasStr(p?.travelStyle) && !["slow", "balanced", "intense"].includes(p.travelStyle)) },
  ];
}

export function computeCoverage(p: any): Coverage {
  const fast = p?.fastProfile?.schema === "fast-v2" ? p.fastProfile : null;
  if (fast) {
    const core: CoverageDim[] = [
      { key: "destination", core: true, label_it: "Direzione", label_en: "Direction", question_it: "", question_en: "", done: hasStr(fast?.direction?.mode) },
      { key: "intent", core: true, label_it: "Bisogno", label_en: "Intent", question_it: "", question_en: "", done: hasArr(fast?.intentions) },
      { key: "interests", core: true, label_it: "Interessi", label_en: "Interests", question_it: "", question_en: "", done: hasArr(fast?.interests) },
      { key: "companions", core: true, label_it: "Compagnia", label_en: "Travel party", question_it: "", question_en: "", done: hasStr(fast?.companions) },
      { key: "pace", core: true, label_it: "Ritmo", label_en: "Pace", question_it: "", question_en: "", done: hasStr(fast?.pace) },
      { key: "duration", core: true, label_it: "Durata", label_en: "Duration", question_it: "", question_en: "", done: !!fast?.duration?.days },
      { key: "budget", core: true, label_it: "Budget", label_en: "Budget", question_it: "", question_en: "", done: hasStr(fast?.budget?.tier) },
      { key: "avoid", core: true, label_it: "Confini", label_en: "Boundaries", question_it: "", question_en: "", done: Array.isArray(fast?.avoid) },
      { key: "departure", core: true, label_it: "Partenza", label_en: "Departure", question_it: "", question_en: "", done: hasStr(fast?.departure) },
    ];
    const optional = optionalDimensions(p);
    const coreDone = core.filter((dim) => dim.done).length;
    const optionalDone = optional.filter((dim) => dim.done).length;
    const pct = Math.round((coreDone / core.length) * 88 + (optionalDone / optional.length) * 12);
    return { pct, dims: [...core, ...optional], open: optional.filter((dim) => !dim.done) };
  }

  const l1 = p?._l1 ?? {};
  const core: CoverageDim[] = [
    { key: "destination", core: true, label_it: "Meta", label_en: "Destination", question_it: "", question_en: "", done: hasStr(l1.city) || hasStr(l1.sensation) || hasStr(l1.mode) },
    { key: "duration", core: true, label_it: "Durata", label_en: "Duration", question_it: "", question_en: "", done: !!p?.days },
    { key: "budget", core: true, label_it: "Budget", label_en: "Budget", question_it: "", question_en: "", done: hasStr(p?.budget) },
    { key: "companions", core: false, label_it: "Compagnia", label_en: "Travel party", question_it: "Con chi parti?", question_en: "Who are you traveling with?", done: hasStr(p?.companions) },
    { key: "pace", core: false, label_it: "Ritmo", label_en: "Pace", question_it: "Le giornate ti sembrano troppo piene o troppo vuote?", question_en: "Do the days feel too full or too empty?", done: hasStr(p?.pace) },
    { key: "avoid", core: false, label_it: "Cosa eviti", label_en: "What to avoid", question_it: "Cosa vuoi evitare?", question_en: "What do you want to avoid?", done: hasArr(p?.avoid) || hasStr(p?.avoid) },
    { key: "departure", core: false, label_it: "Da dove parti", label_en: "Where you start", question_it: "Da dove parti?", question_en: "Where are you starting from?", done: hasStr(p?.departure) },
  ];
  const optional = optionalDimensions(p);
  const dims = [...core, ...optional];
  const coreDone = core.filter((dim) => dim.done).length;
  const optionalDone = optional.filter((dim) => dim.done).length;
  const pct = Math.round((coreDone / core.length) * 88 + (optionalDone / optional.length) * 12);
  return { pct, dims, open: dims.filter((dim) => !dim.core && !dim.done) };
}
