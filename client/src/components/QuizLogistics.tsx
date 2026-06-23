/**
 * QuizLogistics.tsx
 * ───────────────────────────────────────────────────────────────
 * Logistica · Chapter II (The Frame) + Chapter III (The Texture)
 * In continuità con QuizCinematic (Q1→Q7). Stesso linguaggio visivo:
 * sticky head, step rail, header strip, side panel sticky, shimmer CTA.
 *
 * Montaggio: drop-in dentro Profiling.tsx (Path B) al posto del vecchio
 * form logistico. onComplete(answers) → mappato su formData → submit.
 *
 * Coerenza vs QuizCinematic:
 *   - header strip + titolo dentro .ql-sticky-head (fissi durante lo scroll)
 *   - Chapter II richiede i 5 anchor prima di proseguire (Continue disabled)
 *   - CTA shimmer + disabled identici al cinematic
 *
 * Answers shape: vedi LogisticsAnswers in fondo file.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

const tx = (t: (k: string) => string, key: string, vars: Record<string, string | number>) => {
  let s = t(key);
  for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  return s;
};

/* ════════════ types ════════════ */
export type LogisticsAnswers = {
  // Chapter II — Frame
  budget?: "shoestring" | "mid" | "upper" | "open";
  openWallet?: boolean;
  whenMode?: "dates" | "month" | "period";
  months?: string[];          // whenMode === "month"
  dateFrom?: string;          // whenMode === "dates" (ISO yyyy-mm-dd)
  dateTo?: string;            // whenMode === "dates"
  periods?: string[];         // whenMode === "period"
  duration?: "weekend" | "week" | "twoweek" | "long";
  who?: "solo" | "partner" | "friends" | "family";
  adults?: number;            // who === "friends" | "family"
  kids?: number;              // who === "friends" | "family"
  kidsAges?: number[];        // età dei bambini (len === kids)
  city?: string;
  // Chapter III — Texture
  move?: "base" | "twostops" | "discovery";
  sleep?: string;
  food?: string;
  effort?: number;
  diet?: string[];
  notes?: string;
};

export type ProfileSummary = {
  name?: string;
  region?: string;
  tripTypes?: string[];
  defining?: string[];
  rhythmLabel?: string;
  feeling?: string;
  avoidCount?: number;
};

type Chapter = 2 | 3;

type TierItem = {
  id: string;
  grade: number;
  name: string;
  meta: string;
  range: string;
  mixed?: boolean;
};

/* ════════════ data ════════════ */
const TIERS = [
  { id: "shoestring", dots: 1, lbl: "Local & simple",         range: "Under €500 pp",      est: [300, 500] as const },
  { id: "mid",        dots: 2, lbl: "Comfortable middle",     range: "€500 – €1,500 pp",   est: [500, 1500] as const },
  { id: "upper",      dots: 3, lbl: "Considered comfort",     range: "€1,500 – €3,000 pp", est: [1500, 3000] as const },
  { id: "open",       dots: 4, lbl: "Money isn't the limit", range: "€3,000+ pp",          est: [3000, 6000] as const },
];

const MONTHS = [
  { nm: "Jan", season: "Winter", c: "rgba(94,140,182,.55)" },
  { nm: "Feb", season: "Winter", c: "rgba(94,140,182,.45)" },
  { nm: "Mar", season: "Spring", c: "rgba(120,170,110,.45)" },
  { nm: "Apr", season: "Spring", c: "rgba(140,180,100,.5)" },
  { nm: "May", season: "Spring", c: "rgba(160,180,90,.5)" },
  { nm: "Jun", season: "Summer", c: "rgba(220,160,70,.55)" },
  { nm: "Jul", season: "Summer", c: "rgba(230,140,60,.6)" },
  { nm: "Aug", season: "Summer", c: "rgba(220,130,70,.55)" },
  { nm: "Sep", season: "Autumn", c: "rgba(200,110,80,.5)" },
  { nm: "Oct", season: "Autumn", c: "rgba(180,90,90,.55)" },
  { nm: "Nov", season: "Autumn", c: "rgba(150,80,100,.5)" },
  { nm: "Dec", season: "Winter", c: "rgba(110,130,180,.5)" },
];

const PERIODS = [
  { id: "Spring",  c: "rgba(140,180,100,.9)" },
  { id: "Summer",  c: "rgba(230,140,60,.9)" },
  { id: "Autumn",  c: "rgba(180,90,90,.9)" },
  { id: "Winter",  c: "rgba(94,140,182,.9)" },
  { id: "Anytime", c: "rgba(212,168,83,.9)" },
];

const DURATIONS = [
  { id: "weekend", lbl: "Long weekend",        meta: "3–4 days",                bars: [1, 0, 0, 0, 0], mult: 0.6 },
  { id: "week",    lbl: "One week",            meta: "5–7 days",                bars: [1, 1, 0, 0, 0], mult: 1.0 },
  { id: "twoweek", lbl: "10–14 days",          meta: "two unhurried weeks",     bars: [1, 1, 1, 0, 0], mult: 1.6 },
];

const SAVED_CITIES = ["Milan", "London", "Rome", "Paris", "New York"];

// Smart-fill (3A): mappature dai default di profilo (/api/profiling/defaults,
// gli stessi usati dalla shortcut "Genera dal profilo") verso lo stato logistico.
const BUDGET_FROM_DEFAULT: Record<string, NonNullable<LogisticsAnswers["budget"]>> = {
  basso: "shoestring", low: "shoestring",
  medio: "mid", medium: "mid", mid: "mid",
  alto: "upper", high: "upper", upper: "upper",
  unlimited: "open", open: "open",
};
const WHO_FROM_DEFAULT: Record<string, NonNullable<LogisticsAnswers["who"]>> = {
  solo: "solo", couple: "partner", partner: "partner", coppia: "partner",
  friends: "friends", amici: "friends", family: "family", famiglia: "family",
};
function durationFromDays(n: unknown): LogisticsAnswers["duration"] | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  if (n <= 4) return "weekend";
  if (n <= 7) return "week";
  return "twoweek";
}

const SLEEP_TIERS: TierItem[] = [
  { id: "hostel",   grade: 1, name: "Hostel · Capsule",  meta: "Shared rooms, capsule pods, the bare necessities.",   range: "€0 – 30" },
  { id: "budget",   grade: 2, name: "Budget but nice",   meta: "Honest little hotels, guesthouses, character intact.", range: "€30 – 60" },
  { id: "mid",      grade: 3, name: "Mid-comfort",       meta: "Real beds, a fridge, a city-view sometimes.",          range: "€60 – 120" },
  { id: "boutique", grade: 4, name: "Boutique · Design", meta: "Stays you remember as part of the trip.",              range: "€120 – 200" },
  { id: "luxury",   grade: 5, name: "Luxury",            meta: "The hotel itself is one of the destinations.",         range: "€200+" },
  { id: "mix",      grade: 0, name: "Mix it",            meta: "Save some nights, splurge on others — your call.",    range: "varies", mixed: true },
];

const FOOD_TIERS: TierItem[] = [
  { id: "street", grade: 1, name: "Street food & markets",     meta: "Plastic stools, paper bowls, lines that locals queue in.", range: "€5 – 15" },
  { id: "local",  grade: 2, name: "Budget local mix",          meta: "Family-run kitchens, neighborhood favorites.",             range: "€10 – 25" },
  { id: "good",   grade: 3, name: "Some good restaurants",     meta: "Worth dressing up a bit for. Wine on the table.",          range: "€20 – 50" },
  { id: "foodie", grade: 4, name: "Foodie — food IS the trip", meta: "Planned around tables. Tastings, chef-led, slow lunches.", range: "€40+" },
  { id: "mix",    grade: 0, name: "Mix it",                    meta: "Street food daily, one big dinner per stop.",              range: "varies", mixed: true },
];

const EFFORT_STOPS = ["Low", "Easy", "Normal", "Active", "High", "Extreme"];
const EFFORT_COPY: Record<number, [string, string]> = {
  0: ["Comfort",  "Taxis at the door, escalators welcome. We won't put you on a 6km walking day."],
  1: ["Easy",     "A little walking, plenty of stops. We pace gently."],
  2: ["Normal",   "Happy on your feet most of the day. Standard city pace."],
  3: ["Active",   "Long walking days, hikes up to half a day, varied terrain."],
  4: ["High",     "All-day walking, real hikes, early mountain starts. You like the burn."],
  5: ["Extreme",  "Serious trekking, multi-day routes, bring the boots."],
};

const DIET_OPTIONS = [
  { id: "none",    lbl: "I eat everything",    excl: true },
  { id: "veg",     lbl: "Vegetarian" },
  { id: "vegan",   lbl: "Vegan" },
  { id: "gf",      lbl: "Gluten-free" },
  { id: "lactose", lbl: "Lactose-free" },
  { id: "halal",   lbl: "Halal" },
  { id: "kosher",  lbl: "Kosher" },
  { id: "allergy", lbl: "Specific allergies" },
];

const NOTE_SUGGESTIONS = [
  "I'm afraid of long flights",
  "I need wheelchair access",
  "I'm traveling with a baby",
  "Please avoid altitude",
];

const MOVE_OPTIONS = [
  { id: "base",       lbl: "Base camp", meta: "One place, deep immersion. You wake up in the same bed each morning." },
  { id: "twostops",   lbl: "Two stops", meta: "Two contrasting zones. A capital and a coast, a mountain and a city." },
  { id: "discovery",  lbl: "Discovery", meta: "Move, explore, change. A route across regions — never twice in the same place." },
];

const WHO_OPTIONS: { id: NonNullable<LogisticsAnswers["who"]>; lbl: string; sub: string; svg: ReactNode }[] = [
  { id: "solo",    lbl: "Solo",    sub: "just me", svg: (
    <svg viewBox="0 0 60 60" width="36" height="36">
      <circle cx="30" cy="22" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 50c0-10 8-15 18-15s18 5 18 15" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )},
  { id: "partner", lbl: "Partner", sub: "the two of us", svg: (
    <svg viewBox="0 0 60 60" width="48" height="36">
      <circle cx="22" cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="40" cy="22" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 50c0-8 6-13 14-13s14 5 14 13" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M24 50c0-8 6-13 14-13s14 5 14 13" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )},
  { id: "friends", lbl: "Friends", sub: "a small group", svg: (
    <svg viewBox="0 0 60 60" width="52" height="36">
      <circle cx="16" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="30" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="46" cy="22" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 50c0-7 5-11 10-11s10 4 10 11" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M18 52c0-9 5-14 12-14s12 5 12 14" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M36 50c0-7 5-11 10-11s10 4 10 11" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )},
  { id: "family",  lbl: "Family",  sub: "with kids", svg: (
    <svg viewBox="0 0 60 60" width="50" height="36">
      <circle cx="20" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="40" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="30" cy="34" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 50c0-7 5-12 12-12s12 5 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M28 50c0-7 5-12 12-12s12 5 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M22 52c0-5 3.5-8 8-8s8 3 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )},
];

function MoveDiagram({ id }: { id: string }) {
  if (id === "base") {
    return (
      <svg viewBox="0 0 240 60">
        <circle cx="120" cy="30" r="9" fill="currentColor" />
        <circle cx="120" cy="30" r="22" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 4" opacity=".6" />
        <circle cx="120" cy="30" r="34" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="1 5" opacity=".35" />
      </svg>
    );
  }
  if (id === "twostops") {
    return (
      <svg viewBox="0 0 240 60">
        <line x1="70" y1="30" x2="170" y2="30" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 4" />
        <circle cx="70" cy="30" r="9" fill="currentColor" />
        <circle cx="170" cy="30" r="9" fill="currentColor" />
        <circle cx="70" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="1" opacity=".4" />
        <circle cx="170" cy="30" r="16" fill="none" stroke="currentColor" strokeWidth="1" opacity=".4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 60">
      <path d="M30 40 Q70 10 100 30 T160 30 T210 22" stroke="currentColor" strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
      <circle cx="30" cy="40" r="6" fill="currentColor" />
      <circle cx="100" cy="30" r="5" fill="currentColor" opacity=".75" />
      <circle cx="160" cy="30" r="5" fill="currentColor" opacity=".75" />
      <circle cx="210" cy="22" r="7" fill="currentColor" />
    </svg>
  );
}

/* ════════════ main shell ════════════ */
export function QuizLogistics({
  profile,
  onComplete,
  onBack,
  initial,
  onChange,
}: {
  profile?: ProfileSummary;
  onComplete?: (a: LogisticsAnswers) => void;
  onBack?: () => void;
  // Ripresa (reload/back): seme dello stato + report dei cambiamenti verso il
  // genitore, che li persiste. Così anche l'ultimo step non si perde.
  initial?: { answers?: LogisticsAnswers; chapter?: Chapter };
  onChange?: (a: LogisticsAnswers, chapter: Chapter) => void;
}) {
  const [chapter, setChapter] = useState<Chapter>(initial?.chapter ?? 2);
  const [answers, setAnswers] = useState<LogisticsAnswers>(initial?.answers ?? {
    months: ["Oct"],
    diet: ["none"],
    effort: 2,
    openWallet: false,
    whenMode: "month",
  });
  const [savedCities, setSavedCities] = useState<string[]>(SAVED_CITIES);

  // Riporta lo stato al genitore per la persistenza (resilienza reload/back).
  useEffect(() => { onChange?.(answers, chapter); }, [answers, chapter]);

  // Smart-fill (3A): per gli utenti loggati precompiliamo budget/compagnia/
  // durata/partenza dai pattern dei viaggi passati. /api/profiling/defaults dà
  // 401 agli anonimi → nessun prefill. Riempiamo solo i campi ancora vuoti, così
  // non sovrascriviamo mai una scelta dell'utente.
  useEffect(() => {
    if (initial?.answers) return; // ripresa: non sovrascrivere lo stato salvato
    let cancelled = false;
    fetch("/api/profiling/defaults")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setAnswers((a) => {
          const next = { ...a };
          const b = typeof d.budget === "string" ? BUDGET_FROM_DEFAULT[d.budget.toLowerCase()] : undefined;
          if (!next.budget && b) next.budget = b;
          const w = typeof d.companions === "string" ? WHO_FROM_DEFAULT[d.companions.toLowerCase()] : undefined;
          if (!next.who && w) next.who = w;
          const dur = durationFromDays(d.days);
          if (!next.duration && dur) next.duration = dur;
          const dep = typeof d.departure === "string" ? d.departure.trim() : "";
          if (!next.city && dep && dep.toLowerCase() !== "italia") next.city = dep;
          return next;
        });
        const dep = typeof d.departure === "string" ? d.departure.trim() : "";
        if (dep) setSavedCities([dep, ...SAVED_CITIES.filter((c) => c.toLowerCase() !== dep.toLowerCase())].slice(0, 5));
      })
      .catch(() => { /* best-effort */ });
    return () => { cancelled = true; };
  }, []);

  function update<K extends keyof LogisticsAnswers>(key: K, value: LogisticsAnswers[K]) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function nextChapter() {
    if (chapter === 2) { setChapter(3); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    onComplete?.(answers);
  }
  function prevChapter() {
    if (chapter === 3) { setChapter(2); window.scrollTo({ top: 0, behavior: "smooth" }); return; }
    onBack?.();
  }

  return (
    <div className="quiz-logistics">
      <div className={"ql-bg-stage " + (chapter === 2 ? "ql-bg-frame" : "ql-bg-texture")} />
      <div className="ql-grain" />
      <StepRail chapter={chapter} />

      <div className="ql-stage">
        <div className="ql-container">
          {chapter === 2 ? (
            <ChapterFrame
              answers={answers}
              update={update}
              profile={profile}
              savedCities={savedCities}
              onNext={nextChapter}
              onBack={prevChapter}
            />
          ) : (
            <ChapterTexture
              answers={answers}
              update={update}
              onNext={nextChapter}
              onBack={prevChapter}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════ step rail ════════════ */
function StepRail({ chapter }: { chapter: Chapter }) {
  return (
    <div className="ql-step-rail">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
        <div key={n} className="ql-step-dot done">✓</div>
      ))}
      <div className="ql-rail-divider" />
      <div className={"ql-step-dot " + (chapter === 2 ? "active" : "done")}>{chapter === 2 ? "II" : "✓"}</div>
      <div className={"ql-step-dot " + (chapter === 3 ? "active" : "")}>III</div>
    </div>
  );
}

/* ════════════ CHAPTER II — The Frame ════════════ */
function ChapterFrame({
  answers, update, profile, savedCities, onNext, onBack,
}: {
  answers: LogisticsAnswers;
  update: <K extends keyof LogisticsAnswers>(k: K, v: LogisticsAnswers[K]) => void;
  profile?: ProfileSummary;
  savedCities?: string[];
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const budgetObj = TIERS.find((t) => t.id === answers.budget);
  const durObj    = DURATIONS.find((d) => d.id === answers.duration);
  const whoObj    = WHO_OPTIONS.find((w) => w.id === answers.who);
  const months    = answers.months ?? [];
  const periods   = answers.periods ?? [];
  const whenMode  = answers.whenMode ?? "month";

  // Composizione gruppo (solo Friends / Family)
  const showGroup = answers.who === "friends" || answers.who === "family";
  const adults    = answers.adults ?? 2;
  const kids      = answers.kids ?? 0;
  const kidsAges  = answers.kidsAges ?? [];

  function pickWho(id: NonNullable<LogisticsAnswers["who"]>) {
    update("who", id);
    if ((id === "friends" || id === "family") && answers.adults == null) {
      update("adults", 2);
      update("kids", 0);
      update("kidsAges", []);
    }
  }
  function setAdults(n: number) { update("adults", Math.max(1, Math.min(12, n))); }
  function setKids(n: number) {
    const v = Math.max(0, Math.min(10, n));
    update("kids", v);
    update("kidsAges", (answers.kidsAges ?? []).slice(0, v));
  }
  function setKidAge(i: number, val: string) {
    const ages = [...(answers.kidsAges ?? [])];
    if (val === "") delete ages[i];
    else ages[i] = Math.max(0, Math.min(17, parseInt(val, 10) || 0));
    update("kidsAges", ages);
  }

  function toggleMonth(m: string) {
    const set = new Set(months);
    set.has(m) ? set.delete(m) : set.add(m);
    update("months", Array.from(set));
  }
  function togglePeriod(p: string) {
    const set = new Set(periods);
    set.has(p) ? set.delete(p) : set.add(p);
    update("periods", Array.from(set));
  }

  // "When" è soddisfatto se la modalità attiva ha dati validi (come isDateValid del vecchio form).
  const whenFilled =
    whenMode === "dates"  ? !!(answers.dateFrom && answers.dateTo)
    : whenMode === "period" ? periods.length > 0
    : months.length > 0;
  const whenStatus =
    whenMode === "dates"  ? (whenFilled ? t("ql.status.set") : t("ql.status.open"))
    : whenMode === "period" ? (periods.length ? tx(t, "ql.when.picked", { n: periods.length }) : t("ql.status.open"))
    : (months.length ? tx(t, "ql.when.picked", { n: months.length }) : t("ql.status.open"));

  const filled = [budgetObj, whenFilled ? "y" : null, durObj, whoObj, answers.city].filter(Boolean).length;
  const cityCode = (answers.city || "").trim().slice(0, 3).toUpperCase() || "—";

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en", { day: "2-digit", month: "short" });
  };

  const whenStr = useMemo(() => {
    if (whenMode === "dates") return whenFilled ? `${fmtDate(answers.dateFrom)} → ${fmtDate(answers.dateTo)}` : "";
    if (whenMode === "period") return periods.map((p) => t(`ql.period.${p.toLowerCase()}`)).join(", ");
    const order = MONTHS.map((m) => m.nm);
    return [...months].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((m) => t(`ql.months.${m.toLowerCase()}`)).join(", ");
  }, [whenMode, whenFilled, answers.dateFrom, answers.dateTo, periods, months, t]);

  const estCost = useMemo(() => {
    if (!budgetObj) return null;
    const [a, b] = budgetObj.est;
    const mult = durObj?.mult ?? 1;
    return `€${Math.round(a * mult).toLocaleString()} – €${Math.round(b * mult).toLocaleString()}`;
  }, [budgetObj, durObj]);

  return (
    <>
      <div className="ql-sticky-head">
        <div className="ql-header-strip">
          <span className="ql-label">{t("ql.ch2.strip")}</span>
          <div className="ql-progress-line"><div className="ql-fill" style={{ width: `${(filled / 5) * 100}%` }} /></div>
          <span className="ql-count">{tx(t, "ql.ch2.anchors", { n: filled })}</span>
        </div>

        <div className="ql-q-head">
          <div className="ql-q-eyebrow"><strong>{t("ql.ch2.label")}</strong> · {t("ql.ch2.eyebrow")}</div>
          <h1 className="ql-q-title" dangerouslySetInnerHTML={{ __html: t("ql.ch2.title") }} />
          <p className="ql-q-sub">{t("ql.ch2.sub")}</p>
        </div>
      </div>

      <div className="ql-q-grid">
        <div>
          {/* i — BUDGET */}
          <Section num="1." title={t("ql.s1.title")} hint={t("ql.s1.hint")} status={budgetObj ? t("ql.status.set") : t("ql.status.open")} filled={!!budgetObj}>
            <div className="ql-budget-scale">
              {TIERS.map((tier) => (
                <div key={tier.id} className={"ql-tier " + (answers.budget === tier.id ? "on" : "")} onClick={() => update("budget", tier.id as LogisticsAnswers["budget"])}>
                  <div className="ql-dots">
                    {[1, 2, 3, 4].map((i) => <div key={i} className={"ql-dot " + (i <= tier.dots ? "fill" : "")} />)}
                  </div>
                  <div className="ql-tier-lbl">{t(`ql.tier.${tier.id}.lbl`)}</div>
                  <div className="ql-tier-range">{t(`ql.tier.${tier.id}.range`)}</div>
                </div>
              ))}
            </div>
            <div className="ql-budget-extra">
              <div className="ql-budget-extra-text">
                <span className="l">{t("ql.s1.est.label")}</span>
                <span className="v">{estCost ?? t("ql.s1.est.empty")}</span>
              </div>
              <div className={"ql-toggle-row " + (answers.openWallet ? "on" : "")} onClick={() => update("openWallet", !answers.openWallet)}>
                <div className="ql-toggle-sw" />
                <span>{t("ql.s1.open.wallet")}</span>
              </div>
            </div>
          </Section>

          {/* ii — WHEN */}
          <Section num="2." title={t("ql.s2.title")} hint={t("ql.s2.hint")} status={whenStatus} filled={whenFilled}>
            <div className="ql-when-tabs">
              {([["dates", t("ql.when.dates")], ["month", t("ql.when.month")], ["period", t("ql.when.period")]] as const).map(([k, l]) => (
                <div key={k} className={"ql-when-tab " + (whenMode === k ? "on" : "")} onClick={() => update("whenMode", k)}>{l}</div>
              ))}
            </div>

            {whenMode === "dates" && (
              <div className="ql-when-dates">
                <label className="ql-when-date">
                  <span>{t("ql.when.leaving")}</span>
                  <input type="date" value={answers.dateFrom ?? ""} max={answers.dateTo || undefined} onChange={(e) => update("dateFrom", e.target.value)} />
                </label>
                <label className="ql-when-date">
                  <span>{t("ql.when.returning")}</span>
                  <input type="date" value={answers.dateTo ?? ""} min={answers.dateFrom || undefined} onChange={(e) => update("dateTo", e.target.value)} />
                </label>
              </div>
            )}

            {whenMode === "month" && (
              <div className="ql-month-table">
                {MONTHS.map((m) => (
                  <button
                    key={m.nm}
                    type="button"
                    className={"ql-month-cell " + (months.includes(m.nm) ? "on" : "")}
                    onClick={() => toggleMonth(m.nm)}
                  >{t(`ql.months.${m.nm.toLowerCase()}`)}</button>
                ))}
              </div>
            )}

            {whenMode === "period" && (
              <div className="ql-period-row">
                {PERIODS.map((p) => (
                  <button
                    key={p.id}
                    className={"ql-period-chip " + (periods.includes(p.id) ? "on" : "")}
                    style={{ ["--pc" as string]: p.c }}
                    onClick={() => togglePeriod(p.id)}
                  >{t(`ql.period.${p.id.toLowerCase()}`)}</button>
                ))}
              </div>
            )}
          </Section>

          {/* iii — DURATION */}
          <Section num="3." title={t("ql.s3.title")} hint={t("ql.s3.hint")} status={durObj ? t("ql.status.set") : t("ql.status.open")} filled={!!durObj}>
            <div className="ql-dur-row">
              {DURATIONS.map((d) => (
                <div key={d.id} className={"ql-dur " + (answers.duration === d.id ? "on" : "")} onClick={() => update("duration", d.id as LogisticsAnswers["duration"])}>
                  <div className="ql-dur-bars">
                    {d.bars.map((b, i) => (
                      <div
                        key={i}
                        className={"ql-dur-bar " + (b ? "fill" : "")}
                        style={{ height: b ? `${8 + i * 3}px` : `${4 + i}px`, opacity: b ? 1 : 0.35 }}
                      />
                    ))}
                  </div>
                  <div className="ql-dur-lbl">{t(`ql.dur.${d.id}.lbl`)}</div>
                  <div className="ql-dur-meta">{t(`ql.dur.${d.id}.meta`)}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* iv — WHO */}
          <Section num="4." title={t("ql.s4.title")} hint={t("ql.s4.hint")} status={whoObj ? t(`ql.who.${whoObj.id}.lbl`) : t("ql.status.open")} filled={!!whoObj}>
            <div className="ql-who-row">
              {WHO_OPTIONS.map((w) => (
                <div key={w.id} className={"ql-who " + (answers.who === w.id ? "on" : "")} onClick={() => pickWho(w.id)}>
                  <div className="ql-who-avatar">{w.svg}</div>
                  <div>
                    <div className="ql-who-lbl">{t(`ql.who.${w.id}.lbl`)}</div>
                    <div className="ql-who-sub">{t(`ql.who.${w.id}.sub`)}</div>
                  </div>
                </div>
              ))}
            </div>

            {showGroup && (
              <div className="ql-group-form">
                <div className="ql-group-head">{answers.who === "family" ? t("ql.group.head.family") : t("ql.group.head.friends")}</div>
                <div className="ql-group-counts">
                  <div className="ql-group-count">
                    <div className="ql-group-count-lbl">{t("ql.group.adults")}</div>
                    <div className="ql-stepper">
                      <button type="button" onClick={() => setAdults(adults - 1)} disabled={adults <= 1} aria-label={t("ql.group.aria.fewer.adults")}>−</button>
                      <span>{adults}</span>
                      <button type="button" onClick={() => setAdults(adults + 1)} disabled={adults >= 12} aria-label={t("ql.group.aria.more.adults")}>+</button>
                    </div>
                  </div>
                  <div className="ql-group-count">
                    <div className="ql-group-count-lbl">{t("ql.group.children")} <small>{t("ql.group.children.sub")}</small></div>
                    <div className="ql-stepper">
                      <button type="button" onClick={() => setKids(kids - 1)} disabled={kids <= 0} aria-label={t("ql.group.aria.fewer.children")}>−</button>
                      <span>{kids}</span>
                      <button type="button" onClick={() => setKids(kids + 1)} disabled={kids >= 10} aria-label={t("ql.group.aria.more.children")}>+</button>
                    </div>
                  </div>
                </div>
                {kids > 0 && (
                  <div className="ql-kids-ages">
                    <div className="ql-kids-ages-lbl">{t("ql.group.kids.ages.lbl")}</div>
                    <div className="ql-kids-ages-row">
                      {Array.from({ length: kids }).map((_, i) => (
                        <input
                          key={i}
                          type="number" min={0} max={17}
                          className="ql-kid-age"
                          placeholder={t("ql.group.kids.age.placeholder")}
                          value={kidsAges[i] ?? ""}
                          onChange={(e) => setKidAge(i, e.target.value)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* v — DEPART */}
          <Section num="5." title={t("ql.s5.title")} hint={t("ql.s5.hint")} status={answers.city || t("ql.status.open")} filled={!!answers.city}>
            <input
              className="ql-depart-input"
              placeholder={t("ql.s5.placeholder")}
              value={answers.city ?? ""}
              onChange={(e) => update("city", e.target.value)}
            />
            <div className="ql-depart-saved">
              <span className="ql-depart-saved-lbl">{t("ql.s5.saved")}</span>
              {(savedCities ?? SAVED_CITIES).map((c) => (
                <button key={c} className={"ql-depart-chip " + (answers.city === c ? "on" : "")} onClick={() => update("city", c)}>{c}</button>
              ))}
            </div>
          </Section>
        </div>

        <aside className="ql-side">
          <TripCard answers={answers} profile={profile} cityCode={cityCode} whenStr={whenStr} durLbl={durObj ? t(`ql.dur.${durObj.id}.meta`) : "—"} budgetLbl={budgetObj ? t(`ql.tier.${budgetObj.id}.lbl`) : null} estCost={estCost} whoLbl={whoObj ? t(`ql.who.${whoObj.id}.lbl`) : null} />
          <SideCard head={<><div className="ql-side-ic">?</div>{t("ql.side.ch2.why.head")}</>}>
            <p>{t("ql.side.ch2.why.body")}</p>
          </SideCard>
          <SideCard variant="privacy" head={<><div className="ql-side-ic">✓</div>{t("ql.privacy.head")}</>}>
            <p>{t("ql.privacy.body")}</p>
          </SideCard>
        </aside>
      </div>

      <FooterNav backLbl={t("ql.side.ch2.back.lbl")} nextLbl={t("ql.side.ch2.next.lbl")} onBack={onBack} onNext={onNext} canContinue={filled === 5} />
    </>
  );
}

/* ════════════ CHAPTER III — The Texture ════════════ */
function ChapterTexture({
  answers, update, onNext, onBack,
}: {
  answers: LogisticsAnswers;
  update: <K extends keyof LogisticsAnswers>(k: K, v: LogisticsAnswers[K]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const moveObj  = MOVE_OPTIONS.find((m) => m.id === answers.move);
  const sleepObj = SLEEP_TIERS.find((s) => s.id === answers.sleep);
  const foodObj  = FOOD_TIERS.find((f) => f.id === answers.food);
  const effort   = answers.effort ?? 2;
  const effortLbl = t(`ql.effort.${effort}.lbl`);
  const effortCopy = t(`ql.effort.${effort}.copy`);
  const diet = answers.diet ?? [];

  function toggleDiet(id: string) {
    const set = new Set(diet);
    const item = DIET_OPTIONS.find((d) => d.id === id)!;
    if (item.excl) {
      update("diet", set.has(id) ? [] : [id]);
    } else {
      set.delete("none");
      set.has(id) ? set.delete(id) : set.add(id);
      update("diet", Array.from(set));
    }
  }

  const completion = [answers.move, answers.sleep, answers.food, true, diet.length > 0].filter(Boolean).length;

  const dietSummary = useMemo(() => {
    if (diet.length === 0) return null;
    if (diet.includes("none")) return t("ql.diet.sum.none");
    return diet.map((id) => t(`ql.diet.${id}`)).join(", ");
  }, [diet, t]);

  return (
    <>
      <div className="ql-sticky-head">
        <div className="ql-header-strip">
          <span className="ql-label">{t("ql.ch3.strip")}</span>
          <div className="ql-progress-line"><div className="ql-fill" style={{ width: `${(completion / 5) * 100}%` }} /></div>
          <span className="ql-count">{tx(t, "ql.ch3.textures", { n: completion })}</span>
        </div>

        <div className="ql-q-head">
          <div className="ql-q-eyebrow"><strong>{t("ql.ch3.label")}</strong> · {t("ql.ch3.eyebrow")}</div>
          <h1 className="ql-q-title" dangerouslySetInnerHTML={{ __html: t("ql.ch3.title") }} />
          <p className="ql-q-sub">{t("ql.ch3.sub")}</p>
        </div>
      </div>

      <div className="ql-q-grid">
        <div>
          {/* i — MOVEMENT */}
          <Section num="1." title={t("ql.t1.title")} hint={t("ql.t1.hint")} status={moveObj ? t(`ql.move.${moveObj.id === "twostops" ? "two" : moveObj.id === "discovery" ? "disc" : "base"}.lbl`) : t("ql.status.open")} filled={!!moveObj}>
            <div className="ql-move-row">
              {MOVE_OPTIONS.map((m) => {
                const stem = m.id === "twostops" ? "two" : m.id === "discovery" ? "disc" : "base";
                return (
                  <div key={m.id} className={"ql-move " + (answers.move === m.id ? "on" : "")} onClick={() => update("move", m.id as LogisticsAnswers["move"])}>
                    <div className="ql-move-diagram"><MoveDiagram id={m.id} /></div>
                    <div>
                      <div className="ql-move-lbl">{t(`ql.move.${stem}.lbl`)}</div>
                      <div className="ql-move-meta">{t(`ql.move.${stem}.meta`)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ii — SLEEP */}
          <Section num="2." title={t("ql.t2.title")} hint={t("ql.t2.hint")} status={sleepObj ? t(`ql.sleep.${sleepObj.id === "boutique" ? "bout" : sleepObj.id === "luxury" ? "lux" : sleepObj.id}.range`) : t("ql.status.open")} filled={!!sleepObj}>
            <TierStripList items={SLEEP_TIERS} selected={answers.sleep} onPick={(id) => update("sleep", id)} gradeMax={5} keyPrefix="ql.sleep" stemMap={{ boutique: "bout", luxury: "lux" }} />
          </Section>

          {/* iii — FOOD */}
          <Section num="3." title={t("ql.t3.title")} hint={t("ql.t3.hint")} status={foodObj ? t(`ql.food.${foodObj.id}.range`) : t("ql.status.open")} filled={!!foodObj}>
            <TierStripList items={FOOD_TIERS} selected={answers.food} onPick={(id) => update("food", id)} gradeMax={4} keyPrefix="ql.food" stemMap={{}} />
          </Section>

          {/* iv — EFFORT */}
          <Section num="4." title={t("ql.t4.title")} hint={t("ql.t4.hint")} status={effortLbl} filled>
            <div className="ql-effort-stage">
              <div className="ql-topo">
                <svg viewBox="0 0 600 90" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ql-topo-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(233,69,96,.45)" />
                      <stop offset="100%" stopColor="rgba(233,69,96,.05)" />
                    </linearGradient>
                  </defs>
                  <path d="M0 78 L60 70 L120 60 L180 50 L240 38 L300 28 L360 20 L420 14 L480 10 L540 8 L600 6 L600 90 L0 90 Z" fill="url(#ql-topo-fill)" />
                  <path d="M0 78 L60 70 L120 60 L180 50 L240 38 L300 28 L360 20 L420 14 L480 10 L540 8 L600 6" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.2" />
                  <path d="M0 84 L60 80 L120 74 L180 68 L240 60 L300 52 L360 42 L420 34 L480 28 L540 22 L600 18" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="1" />
                </svg>
                <div className="ql-topo-marker" style={{ left: `${(effort / 5) * 100}%` }} />
              </div>
              <div className="ql-effort-track">
                <div className="ql-effort-stops">
                  {EFFORT_STOPS.map((_s, i) => (
                    <span key={i} className={"ql-effort-stop " + (effort === i ? "on" : "")}>{t(`ql.effort.stop.${i}`)}</span>
                  ))}
                </div>
                <input type="range" min={0} max={5} step={1} value={effort} onChange={(e) => update("effort", parseInt(e.target.value, 10))} />
              </div>
              <div className="ql-effort-callout">
                <strong>{effortLbl}</strong>
                <span>{effortCopy}</span>
              </div>
            </div>
          </Section>

          {/* v — DIET */}
          <Section num="5." title={t("ql.t5.title")} hint={t("ql.t5.hint")} status={diet.includes("none") ? t("ql.diet.unrestricted") : diet.length ? tx(t, "ql.diet.flagged", { n: diet.length }) : t("ql.status.open")} filled={diet.length > 0}>
            <div className="ql-diet-chips">
              {DIET_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  className={"ql-diet-chip " + (d.excl ? "ql-excl " : "") + (diet.includes(d.id) ? "on" : "")}
                  onClick={() => toggleDiet(d.id)}
                >{t(`ql.diet.${d.id}`)}</button>
              ))}
            </div>
          </Section>

          {/* vi — NOTES */}
          <Section num="6." title={t("ql.t6.title")} hint={t("ql.t6.hint")} status={answers.notes ? t("ql.t6.noted") : t("ql.t6.optional.status")} filled={!!answers.notes}>
            <div className="ql-notes-wrap">
              <div className="ql-notes-head">
                <div className="ql-notes-ic">✎</div>
                <div className="ql-notes-lbl">{t("ql.t6.head.lbl")}</div>
                <div className="ql-notes-opt">{t("ql.t6.optional")}</div>
              </div>
              <textarea
                value={answers.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                placeholder={t("ql.t6.placeholder")}
              />
              <div className="ql-notes-suggestions">
                {(["ql.note.flight", "ql.note.wheelchair", "ql.note.baby", "ql.note.altitude"] as const).map((key) => {
                  const s = t(key);
                  return (
                    <button key={key} className="ql-note-sugg" onClick={() => update("notes", answers.notes ? `${answers.notes}. ${s}` : s)}>{s}</button>
                  );
                })}
              </div>
            </div>
          </Section>
        </div>

        <aside className="ql-side">
          <RecipeCard
            moveLbl={moveObj ? t(`ql.move.${moveObj.id === "twostops" ? "two" : moveObj.id === "discovery" ? "disc" : "base"}.lbl`) : null}
            sleepLbl={sleepObj ? t(`ql.sleep.${sleepObj.id === "boutique" ? "bout" : sleepObj.id === "luxury" ? "lux" : sleepObj.id}.name`).split(" · ")[0] : null}
            foodLbl={foodObj ? t(`ql.food.${foodObj.id}.name`) : null}
            effortLbl={effortLbl}
            dietSummary={dietSummary}
            noteWords={answers.notes ? answers.notes.split(/\s+/).filter(Boolean).length : 0}
          />
          <SideCard head={<><div className="ql-side-ic">?</div>{t("ql.side.ch3.why.head")}</>}>
            <p>{t("ql.side.ch3.why.body")}</p>
          </SideCard>
          <SideCard variant="privacy" head={<><div className="ql-side-ic">✓</div>{t("ql.privacy.head")}</>}>
            <p>{t("ql.privacy.body")}</p>
          </SideCard>
        </aside>
      </div>

      <FooterNav backLbl={t("ql.side.ch3.back.lbl")} nextLbl={t("ql.side.ch3.next.lbl")} onBack={onBack} onNext={onNext} canContinue primary />
    </>
  );
}

/* ════════════ shared bits ════════════ */
function Section({
  num, title, hint, status, filled, children,
}: {
  num: string; title: string; hint: string; status: string | null; filled: boolean; children: ReactNode;
}) {
  return (
    <div className="ql-section">
      <div className="ql-section-mark">
        <div className="ql-section-num">{num}</div>
        <div className="ql-section-body">
          <h2>{title}</h2>
          <div className="ql-section-hint">{hint}</div>
        </div>
        {status && <div className={"ql-section-status " + (filled ? "filled" : "")}>{status}</div>}
      </div>
      {children}
    </div>
  );
}

function TierStripList({
  items, selected, onPick, gradeMax, keyPrefix, stemMap,
}: {
  items: TierItem[];
  selected?: string;
  onPick: (id: string) => void;
  gradeMax: number;
  keyPrefix?: string;
  stemMap?: Record<string, string>;
}) {
  const { t } = useI18n();
  return (
    <div className="ql-strip-list">
      {items.map((s) => {
        const stem = stemMap?.[s.id] ?? s.id;
        const name = keyPrefix ? t(`${keyPrefix}.${stem}.name`) : s.name;
        const meta = keyPrefix ? t(`${keyPrefix}.${stem}.meta`) : s.meta;
        const range = keyPrefix ? t(`${keyPrefix}.${stem}.range`) : s.range;
        return (
          <div key={s.id} className={"ql-strip " + (selected === s.id ? "on" : "")} onClick={() => onPick(s.id)}>
            <div className="ql-strip-grade">
              {s.mixed
                ? <span className="ql-strip-mix">mix</span>
                : Array.from({ length: gradeMax }).map((_, i) => (
                    <div key={i} className={"ql-strip-pip " + (i < s.grade ? "fill" : "")} />
                  ))
              }
            </div>
            <div className="ql-strip-body">
              <div className="ql-strip-name">{name}</div>
              <div className="ql-strip-meta">{meta}</div>
            </div>
            <div className="ql-strip-range">{range}</div>
            <div className="ql-strip-radio" />
          </div>
        );
      })}
    </div>
  );
}

function TripCard({
  answers, profile, cityCode, whenStr, durLbl, budgetLbl, estCost, whoLbl,
}: {
  answers: LogisticsAnswers;
  profile?: ProfileSummary;
  cityCode: string;
  whenStr: string;
  durLbl: string;
  budgetLbl: string | null;
  estCost: string | null;
  whoLbl: string | null;
}) {
  const { t } = useI18n();
  const adultsVal = answers.adults ?? 2;
  const kidsVal = answers.kids ?? 0;
  const groupStr = `${adultsVal} ${adultsVal === 1 ? t("ql.tc.adult.s") : t("ql.tc.adult.p")}${kidsVal ? ` · ${kidsVal} ${kidsVal === 1 ? t("ql.tc.kid.s") : t("ql.tc.kid.p")}` : ""}`;
  return (
    <div className="ql-trip-card">
      <div className="ql-tc-perfs">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ql-tc-perf" />)}
      </div>
      <div className="ql-tc-perfs right">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ql-tc-perf" />)}
      </div>
      <div className="ql-tc-head">
        <span className="ql-tc-name">{t("ql.tc.head")}{profile?.name ? ` · ${profile.name}` : ""}</span>
        <span className="ql-tc-pnr">MR · 07/09</span>
      </div>
      <div className="ql-tc-route">
        <div className="ql-tc-city">
          <span className="ql-tc-code">{cityCode}</span>
          <span className="ql-tc-nm">{answers.city || t("ql.tc.departure")}</span>
        </div>
        <div className="ql-tc-arrow">
          <svg viewBox="0 0 60 14" fill="none">
            <path d="M2 7h50M46 2l8 5-8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="ql-tc-dur">{durLbl}</span>
        </div>
        <div className="ql-tc-city ql-tc-dst">
          <span className="ql-tc-code">{(profile?.region ?? "ASA").slice(0, 3).toUpperCase()}</span>
          <span className="ql-tc-nm">{profile?.region ? profile.region.toLowerCase() : t("ql.tc.somewhere")}</span>
        </div>
      </div>
      <div className="ql-tc-rows">
        <Row k={t("ql.tc.triptype")} v={profile?.tripTypes?.[0] ?? t("ql.tc.discovery")} />
        <Row k={t("ql.tc.rhythm")} v={profile?.rhythmLabel ?? t("ql.tc.flowing")} />
        <Row k={t("ql.tc.feeling")} v={profile?.feeling ?? t("ql.tc.feelplace")} />
        <Row k={t("ql.tc.avoid")} v={profile?.avoidCount != null ? tx(t, "ql.tc.avoid.val", { n: profile.avoidCount }) : tx(t, "ql.tc.avoid.val", { n: 3 })} />
        <Row k={t("ql.tc.when")} v={whenStr || null} fallback={t("ql.tc.tbchosen")} />
        <Row k={t("ql.tc.company")} v={whoLbl} fallback={t("ql.tc.tbchosen")} />
        {(answers.who === "friends" || answers.who === "family") && (
          <Row k={t("ql.tc.group")} v={groupStr} />
        )}
        <Row k={t("ql.tc.tier")} v={budgetLbl} fallback={t("ql.tc.tbchosen")} />
        <Row k={t("ql.tc.length")} v={durLbl !== "—" ? durLbl : null} fallback={t("ql.tc.tbchosen")} />
      </div>
      <div className="ql-tc-foot">
        <span className="ql-tc-stamp">{t("ql.tc.stamped")} · {new Date().toLocaleDateString("en", { day: "2-digit", month: "short" })}</span>
        <span className="ql-tc-est">{estCost ?? t("ql.tc.est.pending")}</span>
      </div>
    </div>
  );
}

function Row({ k, v, fallback }: { k: string; v: string | null; fallback?: string }) {
  return (
    <div className="ql-tc-row">
      <span className="ql-tc-k">{k}</span>
      <span className={"ql-tc-v " + (v ? "" : "empty")}>{v ?? fallback ?? "—"}</span>
    </div>
  );
}

function RecipeCard({
  moveLbl, sleepLbl, foodLbl, effortLbl, dietSummary, noteWords,
}: {
  moveLbl: string | null; sleepLbl: string | null; foodLbl: string | null;
  effortLbl: string; dietSummary: string | null; noteWords: number;
}) {
  const { t } = useI18n();
  return (
    <div className="ql-recipe-card">
      <div className="ql-recipe-head">{t("ql.recipe.head")}</div>
      <div className="ql-recipe-title">{t("ql.recipe.title")}</div>
      <div className="ql-recipe-list">
        <RecipeRow k={t("ql.recipe.movement")} v={moveLbl} fallback={t("ql.recipe.tbchosen")} />
        <RecipeRow k={t("ql.recipe.sleep")}    v={sleepLbl} fallback={t("ql.recipe.tbchosen")} />
        <RecipeRow k={t("ql.recipe.food")}     v={foodLbl} fallback={t("ql.recipe.tbchosen")} />
        <div className="ql-recipe-divider" />
        <RecipeRow k={t("ql.recipe.effort")}   v={effortLbl} fallback={t("ql.recipe.tbchosen")} />
        <RecipeRow k={t("ql.recipe.diet")}     v={dietSummary} fallback={t("ql.recipe.tbchosen")} />
        <RecipeRow k={t("ql.recipe.notes")}    v={noteWords ? tx(t, "ql.t6.words", { n: noteWords }) : null} fallback="—" />
      </div>
    </div>
  );
}

function RecipeRow({ k, v, fallback = "to be chosen" }: { k: string; v: string | null; fallback?: string }) {
  return (
    <div className="ql-recipe-row">
      <span className="ql-recipe-k">{k}</span>
      <span className={"ql-recipe-v " + (v ? "" : "empty")}>{v ?? fallback}</span>
    </div>
  );
}

function SideCard({ head, children, variant }: { head: ReactNode; children: ReactNode; variant?: "privacy" }) {
  return (
    <div className={"ql-side-card " + (variant === "privacy" ? "ql-side-card-privacy" : "")}>
      <div className="ql-side-card-head">{head}</div>
      {children}
    </div>
  );
}

function FooterNav({ backLbl, nextLbl, onBack, onNext, primary, canContinue = true }: { backLbl: string; nextLbl: string; onBack: () => void; onNext: () => void; primary?: boolean; canContinue?: boolean }) {
  return (
    <div className="ql-q-nav">
      <button className="ql-q-back" onClick={onBack}>{backLbl}</button>
      <button className={"ql-q-continue " + (primary ? "ql-q-primary" : "")} disabled={!canContinue} onClick={onNext}>{nextLbl}</button>
    </div>
  );
}
