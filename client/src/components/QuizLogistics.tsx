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

import { useMemo, useState, type ReactNode } from "react";

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
  { id: "long",    lbl: "More than two weeks", meta: "a slow stay",             bars: [1, 1, 1, 1, 1], mult: 2.2 },
];

const SAVED_CITIES = ["Milan", "London", "Rome", "Paris", "New York"];

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
}: {
  profile?: ProfileSummary;
  onComplete?: (a: LogisticsAnswers) => void;
  onBack?: () => void;
}) {
  const [chapter, setChapter] = useState<Chapter>(2);
  const [answers, setAnswers] = useState<LogisticsAnswers>({
    months: ["Oct"],
    diet: ["none"],
    effort: 2,
    openWallet: false,
    whenMode: "month",
  });

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
  answers, update, profile, onNext, onBack,
}: {
  answers: LogisticsAnswers;
  update: <K extends keyof LogisticsAnswers>(k: K, v: LogisticsAnswers[K]) => void;
  profile?: ProfileSummary;
  onNext: () => void;
  onBack: () => void;
}) {
  const budgetObj = TIERS.find((t) => t.id === answers.budget);
  const durObj    = DURATIONS.find((d) => d.id === answers.duration);
  const whoObj    = WHO_OPTIONS.find((w) => w.id === answers.who);
  const months    = answers.months ?? [];
  const periods   = answers.periods ?? [];
  const whenMode  = answers.whenMode ?? "month";

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
    whenMode === "dates"  ? (whenFilled ? "set" : "open")
    : whenMode === "period" ? (periods.length ? `${periods.length} picked` : "open")
    : (months.length ? `${months.length} picked` : "open");

  const filled = [budgetObj, whenFilled ? "y" : null, durObj, whoObj, answers.city].filter(Boolean).length;
  const cityCode = (answers.city || "").trim().slice(0, 3).toUpperCase() || "—";

  const fmtDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en", { day: "2-digit", month: "short" });
  };

  const whenStr = useMemo(() => {
    if (whenMode === "dates") return whenFilled ? `${fmtDate(answers.dateFrom)} → ${fmtDate(answers.dateTo)}` : "";
    if (whenMode === "period") return periods.join(", ");
    const order = MONTHS.map((m) => m.nm);
    return [...months].sort((a, b) => order.indexOf(a) - order.indexOf(b)).join(", ");
  }, [whenMode, whenFilled, answers.dateFrom, answers.dateTo, periods, months]);

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
          <span className="ql-label">Chapter II · The frame</span>
          <div className="ql-progress-line"><div className="ql-fill" style={{ width: `${(filled / 5) * 100}%` }} /></div>
          <span className="ql-count">{filled} of 5 anchors set</span>
        </div>

        <div className="ql-q-head">
          <div className="ql-q-eyebrow"><strong>Chapter II</strong> · giving it real shape</div>
          <h1 className="ql-q-title">Now, the <em>practical</em><br />shape of it.</h1>
          <p className="ql-q-sub">Five quick anchors — budget, time, length, company, departure. We'll keep it light. The texture comes next.</p>
        </div>
      </div>

      <div className="ql-q-grid">
        <div>
          {/* i — BUDGET */}
          <Section num="i." title="How much do you want to spend?" hint="Per person, all in — flights, stays, food, the whole texture." status={budgetObj ? "set" : "open"} filled={!!budgetObj}>
            <div className="ql-budget-scale">
              {TIERS.map((t) => (
                <div key={t.id} className={"ql-tier " + (answers.budget === t.id ? "on" : "")} onClick={() => update("budget", t.id as LogisticsAnswers["budget"])}>
                  <div className="ql-dots">
                    {[1, 2, 3, 4].map((i) => <div key={i} className={"ql-dot " + (i <= t.dots ? "fill" : "")} />)}
                  </div>
                  <div className="ql-tier-lbl">{t.lbl}</div>
                  <div className="ql-tier-range">{t.range}</div>
                </div>
              ))}
            </div>
            <div className="ql-budget-extra">
              <div className="ql-budget-extra-text">
                <span className="l">Estimated for your trip</span>
                <span className="v">{estCost ?? "Pick a tier and a duration to see a range"}</span>
              </div>
              <div className={"ql-toggle-row " + (answers.openWallet ? "on" : "")} onClick={() => update("openWallet", !answers.openWallet)}>
                <div className="ql-toggle-sw" />
                <span>Hide the numbers — surprise me</span>
              </div>
            </div>
          </Section>

          {/* ii — WHEN */}
          <Section num="ii." title="When do you want to go?" hint="Fixed dates, a flexible month, or just a season — whatever you know right now." status={whenStatus} filled={whenFilled}>
            <div className="ql-when-tabs">
              {([["dates", "Exact dates"], ["month", "Flexible month"], ["period", "Flexible period"]] as const).map(([k, l]) => (
                <div key={k} className={"ql-when-tab " + (whenMode === k ? "on" : "")} onClick={() => update("whenMode", k)}>{l}</div>
              ))}
            </div>

            {whenMode === "dates" && (
              <div className="ql-when-dates">
                <label className="ql-when-date">
                  <span>Leaving</span>
                  <input type="date" value={answers.dateFrom ?? ""} max={answers.dateTo || undefined} onChange={(e) => update("dateFrom", e.target.value)} />
                </label>
                <label className="ql-when-date">
                  <span>Returning</span>
                  <input type="date" value={answers.dateTo ?? ""} min={answers.dateFrom || undefined} onChange={(e) => update("dateTo", e.target.value)} />
                </label>
              </div>
            )}

            {whenMode === "month" && (
              <div className="ql-month-grid">
                {MONTHS.map((m) => (
                  <div
                    key={m.nm}
                    className={"ql-month " + (months.includes(m.nm) ? "on" : "")}
                    style={{ ["--mt" as string]: `linear-gradient(160deg,${m.c},rgba(26,14,26,.85))` }}
                    onClick={() => toggleMonth(m.nm)}
                  >
                    <div className="ql-mcheck" />
                    <div className="ql-mname">{m.nm}</div>
                    <div className="ql-mseason">{m.season}</div>
                  </div>
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
                  >{p.id}</button>
                ))}
              </div>
            )}
          </Section>

          {/* iii — DURATION */}
          <Section num="iii." title="How long do you have?" hint="A weekend is its own thing. Two weeks is a different animal entirely." status={durObj ? "set" : "open"} filled={!!durObj}>
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
                  <div className="ql-dur-lbl">{d.lbl}</div>
                  <div className="ql-dur-meta">{d.meta}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* iv — WHO */}
          <Section num="iv." title="Who are you traveling with?" hint="Changes everything about pace, places, and the way we plan." status={whoObj ? whoObj.lbl : "open"} filled={!!whoObj}>
            <div className="ql-who-row">
              {WHO_OPTIONS.map((w) => (
                <div key={w.id} className={"ql-who " + (answers.who === w.id ? "on" : "")} onClick={() => update("who", w.id)}>
                  <div className="ql-who-avatar">{w.svg}</div>
                  <div>
                    <div className="ql-who-lbl">{w.lbl}</div>
                    <div className="ql-who-sub">{w.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* v — DEPART */}
          <Section num="v." title="Where are you departing from?" hint="So we can price the journey honestly — and find flights you'll actually take." status={answers.city || "open"} filled={!!answers.city}>
            <input
              className="ql-depart-input"
              placeholder="e.g. Milan, London, New York…"
              value={answers.city ?? ""}
              onChange={(e) => update("city", e.target.value)}
            />
            <div className="ql-depart-saved">
              <span className="ql-depart-saved-lbl">Saved · </span>
              {SAVED_CITIES.map((c) => (
                <button key={c} className={"ql-depart-chip " + (answers.city === c ? "on" : "")} onClick={() => update("city", c)}>{c}</button>
              ))}
            </div>
          </Section>
        </div>

        <aside className="ql-side">
          <TripCard answers={answers} profile={profile} cityCode={cityCode} whenStr={whenStr} durLbl={durObj?.meta ?? "—"} budgetLbl={budgetObj?.lbl ?? null} estCost={estCost} whoLbl={whoObj?.lbl ?? null} />
          <SideCard head={<><div className="ql-side-ic">?</div>Why these five</>}>
            <p>These are the practical anchors that turn an idea into an itinerary. We'll quote and time everything around them — and surface places that match.</p>
          </SideCard>
          <SideCard variant="privacy" head={<><div className="ql-side-ic">✓</div>Privacy</>}>
            <p>Your answers shape your destinations. Never stored, never shared.</p>
          </SideCard>
        </aside>
      </div>

      <FooterNav backLbl="← Back to what to avoid" nextLbl="Continue to the texture →" onBack={onBack} onNext={onNext} canContinue={filled === 5} />
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
  const moveObj  = MOVE_OPTIONS.find((m) => m.id === answers.move);
  const sleepObj = SLEEP_TIERS.find((s) => s.id === answers.sleep);
  const foodObj  = FOOD_TIERS.find((f) => f.id === answers.food);
  const effort   = answers.effort ?? 2;
  const [effortLbl, effortCopy] = EFFORT_COPY[effort];
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
    if (diet.includes("none")) return "I eat everything";
    return diet.map((id) => DIET_OPTIONS.find((d) => d.id === id)?.lbl).join(", ");
  }, [diet]);

  return (
    <>
      <div className="ql-sticky-head">
        <div className="ql-header-strip">
          <span className="ql-label">Chapter III · The texture</span>
          <div className="ql-progress-line"><div className="ql-fill" style={{ width: `${(completion / 5) * 100}%` }} /></div>
          <span className="ql-count">{completion} of 5 textures set</span>
        </div>

        <div className="ql-q-head">
          <div className="ql-q-eyebrow"><strong>Chapter III</strong> · the texture of your days</div>
          <h1 className="ql-q-title">And the <em>texture</em><br />of your days.</h1>
          <p className="ql-q-sub">How you move, where you sleep, what you eat, how hard you push your body. The small grain that makes a trip yours.</p>
        </div>
      </div>

      <div className="ql-q-grid">
        <div>
          {/* i — MOVEMENT */}
          <Section num="i." title="How do you want to move?" hint="This shapes the entire structure of your itinerary." status={moveObj?.lbl ?? "open"} filled={!!moveObj}>
            <div className="ql-move-row">
              {MOVE_OPTIONS.map((m) => (
                <div key={m.id} className={"ql-move " + (answers.move === m.id ? "on" : "")} onClick={() => update("move", m.id as LogisticsAnswers["move"])}>
                  <div className="ql-move-diagram"><MoveDiagram id={m.id} /></div>
                  <div>
                    <div className="ql-move-lbl">{m.lbl}</div>
                    <div className="ql-move-meta">{m.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ii — SLEEP */}
          <Section num="ii." title="Where do you prefer to sleep?" hint="Shapes hotel and stay recommendations. Price is per room, per night." status={sleepObj?.range ?? "open"} filled={!!sleepObj}>
            <TierStripList items={SLEEP_TIERS} selected={answers.sleep} onPick={(id) => update("sleep", id)} gradeMax={5} />
          </Section>

          {/* iii — FOOD */}
          <Section num="iii." title="How do you want to eat?" hint="Food is part of the journey. Tell us how much of one." status={foodObj?.range ?? "open"} filled={!!foodObj}>
            <TierStripList items={FOOD_TIERS} selected={answers.food} onPick={(id) => update("food", id)} gradeMax={4} />
          </Section>

          {/* iv — EFFORT */}
          <Section num="iv." title="How much physical effort?" hint="Changes the kind of days we plan — from cable-cars to multi-day treks." status={effortLbl} filled>
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
                  {EFFORT_STOPS.map((s, i) => (
                    <span key={i} className={"ql-effort-stop " + (effort === i ? "on" : "")}>{s}</span>
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
          <Section num="v." title="Any dietary restrictions?" hint="So we never point you toward the wrong kind of place." status={diet.includes("none") ? "unrestricted" : diet.length ? `${diet.length} flagged` : "open"} filled={diet.length > 0}>
            <div className="ql-diet-chips">
              {DIET_OPTIONS.map((d) => (
                <button
                  key={d.id}
                  className={"ql-diet-chip " + (d.excl ? "ql-excl " : "") + (diet.includes(d.id) ? "on" : "")}
                  onClick={() => toggleDiet(d.id)}
                >{d.lbl}</button>
              ))}
            </div>
          </Section>

          {/* vi — NOTES */}
          <Section num="vi." title="Anything else we should know?" hint="Accessibility, fears, special needs — or just something important to mention." status={answers.notes ? "noted" : "optional"} filled={!!answers.notes}>
            <div className="ql-notes-wrap">
              <div className="ql-notes-head">
                <div className="ql-notes-ic">✎</div>
                <div className="ql-notes-lbl">Whatever you'd tell a friend who's planning this for you</div>
                <div className="ql-notes-opt">Optional</div>
              </div>
              <textarea
                value={answers.notes ?? ""}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="For example: I'm afraid of flights longer than 4 hours, I need wheelchair accessibility, I prefer ground floor rooms…"
              />
              <div className="ql-notes-suggestions">
                {NOTE_SUGGESTIONS.map((s) => (
                  <button key={s} className="ql-note-sugg" onClick={() => update("notes", answers.notes ? `${answers.notes}. ${s}` : s)}>{s}</button>
                ))}
              </div>
            </div>
          </Section>
        </div>

        <aside className="ql-side">
          <RecipeCard
            moveLbl={moveObj?.lbl ?? null}
            sleepLbl={sleepObj ? sleepObj.name.split(" · ")[0] : null}
            foodLbl={foodObj?.name ?? null}
            effortLbl={effortLbl}
            dietSummary={dietSummary}
            noteWords={answers.notes ? answers.notes.split(/\s+/).filter(Boolean).length : 0}
          />
          <SideCard head={<><div className="ql-side-ic">?</div>Why this matters</>}>
            <p>Two travelers with the same budget can have completely different trips. These six knobs decide whether yours feels rough and real, or smooth and curated — or anything in between.</p>
          </SideCard>
          <SideCard variant="privacy" head={<><div className="ql-side-ic">✓</div>Privacy</>}>
            <p>Your answers shape your destinations. Never stored, never shared.</p>
          </SideCard>
        </aside>
      </div>

      <FooterNav backLbl="← Back to the frame" nextLbl="Show me where this can take me →" onBack={onBack} onNext={onNext} canContinue primary />
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
  items, selected, onPick, gradeMax,
}: {
  items: TierItem[];
  selected?: string;
  onPick: (id: string) => void;
  gradeMax: number;
}) {
  return (
    <div className="ql-strip-list">
      {items.map((s) => (
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
            <div className="ql-strip-name">{s.name}</div>
            <div className="ql-strip-meta">{s.meta}</div>
          </div>
          <div className="ql-strip-range">{s.range}</div>
          <div className="ql-strip-radio" />
        </div>
      ))}
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
  return (
    <div className="ql-trip-card">
      <div className="ql-tc-perfs">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ql-tc-perf" />)}
      </div>
      <div className="ql-tc-perfs right">
        {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ql-tc-perf" />)}
      </div>
      <div className="ql-tc-head">
        <span className="ql-tc-name">Your trip so far{profile?.name ? ` · ${profile.name}` : ""}</span>
        <span className="ql-tc-pnr">MR · 07/09</span>
      </div>
      <div className="ql-tc-route">
        <div className="ql-tc-city">
          <span className="ql-tc-code">{cityCode}</span>
          <span className="ql-tc-nm">{answers.city || "departure"}</span>
        </div>
        <div className="ql-tc-arrow">
          <svg viewBox="0 0 60 14" fill="none">
            <path d="M2 7h50M46 2l8 5-8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="ql-tc-dur">{durLbl}</span>
        </div>
        <div className="ql-tc-city ql-tc-dst">
          <span className="ql-tc-code">{(profile?.region ?? "ASA").slice(0, 3).toUpperCase()}</span>
          <span className="ql-tc-nm">{profile?.region ? profile.region.toLowerCase() : "somewhere in Asia"}</span>
        </div>
      </div>
      <div className="ql-tc-rows">
        <Row k="Trip type" v={profile?.tripTypes?.[0] ?? "Discovery"} />
        <Row k="Rhythm" v={profile?.rhythmLabel ?? "Flowing"} />
        <Row k="Feeling" v={profile?.feeling ?? "Feel the place"} />
        <Row k="Avoid" v={profile?.avoidCount != null ? `${profile.avoidCount} patterns` : "3 patterns"} />
        <Row k="When" v={whenStr || null} fallback="to be chosen" />
        <Row k="Company" v={whoLbl} fallback="to be chosen" />
        <Row k="Tier" v={budgetLbl} fallback="to be chosen" />
        <Row k="Length" v={durLbl !== "—" ? durLbl : null} fallback="to be chosen" />
      </div>
      <div className="ql-tc-foot">
        <span className="ql-tc-stamp">stamped · {new Date().toLocaleDateString("en", { day: "2-digit", month: "short" })}</span>
        <span className="ql-tc-est">{estCost ?? "estimate pending"}</span>
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
  return (
    <div className="ql-recipe-card">
      <div className="ql-recipe-head">The texture · your recipe</div>
      <div className="ql-recipe-title">A trip with this grain</div>
      <div className="ql-recipe-list">
        <RecipeRow k="Movement" v={moveLbl} />
        <RecipeRow k="Sleep"    v={sleepLbl} />
        <RecipeRow k="Food"     v={foodLbl} />
        <div className="ql-recipe-divider" />
        <RecipeRow k="Effort"   v={effortLbl} />
        <RecipeRow k="Diet"     v={dietSummary} />
        <RecipeRow k="Notes"    v={noteWords ? `${noteWords} words` : null} fallback="—" />
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
