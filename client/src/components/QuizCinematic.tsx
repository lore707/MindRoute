/**
 * QuizCinematic.tsx
 * ───────────────────────────────────────────────────────────────
 * Quiz Q1 → Q4 for MindRoute (Path B — "I have a direction").
 *
 * Q1 path · Q2 where · Q3 trip type · Q4 defining moment
 * Cinematic shell, hover-driven photo crossfade, sticky side panel,
 * profile-so-far cumulativo, shimmer continue.
 *
 * Props
 *   - onComplete(answers)         → tutte e 4 le risposte raccolte
 *   - onSelectGuided?()           → l'utente sceglie "guided" in Q1 (branch a Path A)
 *   - onBackFromQ1?()             → back dalla Q1 (es. torna allo split intro)
 *   - initialAnswers?             → pre-fill (es. path già scelto upstream)
 *   - initialStep? (1..4)         → step iniziale (default 1)
 * ─────────────────────────────────────────────────────────────── */

import { Fragment, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

// Mappa nome-inglese (identità memorizzata in answers, letta dalle mappe di
// Profiling.tsx) → chiave i18n esistente per il SOLO display. Il valore salvato
// resta in inglese: traduciamo solo ciò che si vede.
const NAME_KEY: Record<string, string> = {
  // Q2 regioni
  "Close to home": "b.q1.chips.close",
  "Europe": "b.q1.chips.europe",
  "Asia": "b.q1.chips.asia",
  "Americas": "b.q1.chips.americas",
  "Africa & Middle East": "b.q1.chips.africa",
  "Oceania": "b.q1.chips.oceania",
  // Q3 tipi di viaggio
  "Culture & history": "b.q2.chips.culture",
  "Nature & adventure": "b.q2.chips.nature",
  "Food & wine": "b.q2.chips.food",
  "Beach & relax": "b.q2.chips.beach",
  "City & nightlife": "b.q2.chips.city",
  "Off the grid": "b.q2.chips.offgrid",
  "Road trip": "b.q2.chips.roadtrip",
  "Trekking & sports": "b.q2.chips.trekking",
  "Wellness & spa": "b.q2.chips.wellness",
  "Discovery, surprise me": "b.q2.chips.discovery",
  // Q4 momenti
  "Eating at local spots": "b.q3.chip1",
  "Getting lost in authentic neighborhoods": "b.q3.chip2",
  "Seeing iconic landmarks": "b.q3.chip3",
  "Being immersed in nature": "b.q3.chip4",
  "Living something completely new": "b.q3.chip5",
  "Photographing something extraordinary": "b.q3.chip6",
  "Finding a place I didn't know existed": "b.q3.chip7",
  // Q6 obiettivi emotivi
  "Disconnect from routine": "b.q6.chip1",
  "Regain energy and lightness": "b.q6.chip2",
  "Feel free and spontaneous": "b.q6.chip3",
  "Be amazed again": "b.q6.chip4",
  "Feel the place deeply": "b.q6.chip5",
  "Step outside my comfort zone": "b.q6.chip6",
  // Q7 da evitare
  "Crowded places": "chips.crowded",
  "Touristy restaurants": "chips.touristy",
  "Resort hotels": "chips.resort",
  "Guided tours": "chips.guided",
  "Museums for hours": "chips.museums",
  "Nightlife and clubs": "chips.nightlife",
  "Strict schedules": "chips.schedules",
  "Long transits": "chips.transits",
  "Early mornings": "chips.mornings",
  "Small talk with strangers": "chips.smalltalk",
  "Too unfamiliar food": "chips.unfamiliarfood",
  "Too much walking": "chips.toomuchwalking",
  "Feeling too isolated": "chips.tooisolated",
  "Spending without clear value": "chips.tooexpensive",
  "Staying too long in one place": "chips.toolong",
};

export type Answers = {
  path?: "guided" | "intentional";
  region?: string;
  tripTypes?: string[];
  defining?: string[];        // multi 1..3 (Q4)
  pace?: number;              // 0..100  (Q5)
  emotionalGoals?: string[];  // multi 1..3 (Q6)
  avoid?: string[];           // multi (Q7)
};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface QuizCinematicProps {
  onComplete?: (a: Answers) => void;
  onSelectGuided?: () => void;
  onBackFromQ1?: () => void;
  initialAnswers?: Answers;
  initialStep?: Step;
}

export function QuizCinematic({
  onComplete,
  onSelectGuided,
  onBackFromQ1,
  initialAnswers,
  initialStep = 1,
}: QuizCinematicProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {});

  // Se i props iniziali cambiano dopo il mount (es. user torna indietro dal vecchio quiz),
  // resincronizza.
  useEffect(() => {
    if (initialAnswers) setAnswers((prev) => ({ ...prev, ...initialAnswers }));
  }, [initialAnswers]);

  function next() {
    if (step === 1 && answers.path === "guided") {
      onSelectGuided?.();
      return;
    }
    if (step === 7) {
      onComplete?.(answers);
      return;
    }
    setStep((step + 1) as Step);
  }
  // Q1: la scelta della card avanza immediatamente (niente bottone Continua).
  // Si passa il valore esplicito perché lo stato `answers` aggiornato non è
  // ancora leggibile in modo sincrono qui.
  function pickPath(p: "guided" | "intentional") {
    setAnswers({ ...answers, path: p });
    if (p === "guided") { onSelectGuided?.(); return; }
    setStep(2);
  }
  function back() {
    if (step === 1) {
      onBackFromQ1?.();
      return;
    }
    setStep((step - 1) as Step);
  }

  return (
    <div className="quiz-cinematic">
      <BgGrain />
      <StepRail step={step} onStep={(s) => setStep(s as Step)} />
      <div className="qc-stage">
        <div className="qc-container">
          {step === 1 && <Q1 answers={answers} onPick={pickPath} onBack={back} hasBackFromQ1={!!onBackFromQ1} />}
          {step === 2 && <Q2 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === 3 && <Q3 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === 4 && <Q4 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === 5 && <Q5 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === 6 && <Q6 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === 7 && <Q7 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
        </div>
      </div>
    </div>
  );
}

/* ════════════ shared bits ════════════ */
export function BgGrain() {
  return <div className="qc-grain" />;
}

export function StepRail({ step, onStep }: { step: Step; onStep: (n: number) => void }) {
  return (
    <div className="qc-step-rail">
      {[1, 2, 3, 4, 5, 6, 7].map((n) => {
        const cls = n === step ? "active" : n < step ? "done" : "";
        return (
          <div key={n} className={"qc-step-dot " + cls} onClick={() => n <= step && onStep(n)}>
            {n < step ? "✓" : n}
          </div>
        );
      })}
    </div>
  );
}

export function HeaderStrip({ label, count, fillPct }: { label: string; count: string; fillPct: number }) {
  return (
    <div className="qc-header-strip">
      <span className="qc-label">{label}</span>
      <div className="qc-progress-line"><div className="qc-fill" style={{ width: `${fillPct}%` }} /></div>
      <span className="qc-count">{count}</span>
    </div>
  );
}

// RichTitle: recupera il "tocco" editoriale dei titoli. La stringa tradotta usa
// "\n" per l'a-capo (<br/>) e *asterischi* per la parola in corsivo (<em>).
function RichTitle({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {line.split("*").map((seg, i) =>
            i % 2 === 1 ? <em key={i}>{seg}</em> : <Fragment key={i}>{seg}</Fragment>
          )}
        </Fragment>
      ))}
    </>
  );
}

// Eyebrow: il numero domanda resta in grassetto come nel design. La stringa
// tradotta usa " · " come separatore, così bolda solo il primo segmento.
function Eyebrow({ text }: { text: string }) {
  const [head, ...rest] = text.split(" · ");
  return (
    <div className="qc-q-eyebrow">
      <strong>{head}</strong>{rest.length ? " · " + rest.join(" · ") : ""}
    </div>
  );
}

function paceLabelKey(v: number) {
  if (v <= 33) return "qb.pace.label.structured";
  if (v >= 67) return "qb.pace.label.spontaneous";
  return "qb.pace.label.balanced";
}

function ProfileCard({ answers, pending }: { answers: Answers; pending: string }) {
  const { t } = useI18n();
  const avoidCount = answers.avoid?.length ?? 0;
  const tName = (n: string) => (NAME_KEY[n] ? t(NAME_KEY[n]) : n);
  const tList = (arr?: string[]) => (arr && arr.length ? arr.map(tName).join(" · ") : null);
  return (
    <div className="qc-profile-card">
      <div className="qc-profile-head">{t("qb.profile.head")}</div>
      <ProfileRow label={t("qb.profile.q1")} value={answers.path === "guided" ? t("qb.profile.q1.guided") : answers.path === "intentional" ? t("qb.profile.q1.int") : null} pending={pending === "Q1"} />
      <ProfileRow label={t("qb.profile.q2")} value={answers.region ? tName(answers.region) : null} pending={pending === "Q2"} />
      <ProfileRow label={t("qb.profile.q3")} value={tList(answers.tripTypes)} pending={pending === "Q3"} />
      <ProfileRow label={t("qb.profile.q4")} value={tList(answers.defining)} pending={pending === "Q4"} />
      <ProfileRow label={t("qb.profile.q5")} value={typeof answers.pace === "number" ? `${t(paceLabelKey(answers.pace))} · ${answers.pace}/100` : null} pending={pending === "Q5"} />
      <ProfileRow label={t("qb.profile.q6")} value={tList(answers.emotionalGoals)} pending={pending === "Q6"} />
      <ProfileRow label={t("qb.profile.q7")} value={avoidCount ? `${avoidCount} ${avoidCount > 1 ? t("qb.profile.items.pl") : t("qb.profile.items")}` : null} pending={pending === "Q7"} />
    </div>
  );
}

function ProfileRow({ label, value, pending }: { label: string; value: string | null; pending: boolean }) {
  const { t } = useI18n();
  if (!pending && !value) return null;
  return (
    <div className={"qc-profile-row" + (pending ? " pending" : "")}>
      <div className="qc-profile-row-l">{label}</div>
      <div className="qc-profile-row-v">{value ?? t("qb.profile.awaiting")}</div>
    </div>
  );
}

export function SideCard({ head, icon, children, tone }: { head: string; icon: string; children: React.ReactNode; tone?: "default" | "privacy" }) {
  return (
    <div className={"qc-side-card" + (tone === "privacy" ? " privacy" : "")}>
      <div className="qc-side-card-head"><div className="qc-ic">{icon}</div>{head}</div>
      {children}
    </div>
  );
}

export function FooterNav({ backLabel, canContinue, ctaLabel, onBack, onNext }: { backLabel: string; canContinue: boolean; ctaLabel: string; onBack?: () => void; onNext: () => void }) {
  return (
    <div className="qc-nav">
      {onBack ? <button className="qc-back" onClick={onBack}>← {backLabel}</button> : <span />}
      <button className="qc-continue" disabled={!canContinue} onClick={onNext}>{ctaLabel} →</button>
    </div>
  );
}

/* ════════════ Q1 · path ════════════ */
function Q1({ answers, onPick, onBack, hasBackFromQ1 }: { answers: Answers; onPick: (p: "guided" | "intentional") => void; onBack: () => void; hasBackFromQ1: boolean }) {
  const { t } = useI18n();
  const sel = answers.path ?? null;
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label={t("qb.header.q1")} count="01 / 07" fillPct={14} />
        <div className="qc-q-head qc-center">
          <Eyebrow text={t("qb.q1.eyebrow")} />
          <h1 className="qc-q-title"><RichTitle text={t("qb.q1.title")} /></h1>
          <p className="qc-q-sub">{t("qb.q1.sub")}</p>
        </div>
      </div>
      {/* Il click su una card avanza subito: niente bottone Continua. */}
      <div className="qc-q1-cards">
        <PathCard kind="guided" selected={sel === "guided"} onClick={() => onPick("guided")} />
        <PathCard kind="intentional" selected={sel === "intentional"} onClick={() => onPick("intentional")} />
      </div>
      {hasBackFromQ1 && (
        <div className="qc-nav">
          <button className="qc-back" onClick={onBack}>← {t("qb.nav.back")}</button>
          <span />
        </div>
      )}
    </>
  );
}

function PathCard({ kind, selected, onClick }: { kind: "guided" | "intentional"; selected: boolean; onClick: () => void }) {
  const { t } = useI18n();
  if (kind === "guided") return (
    <div className={"qc-card qc-card-guided" + (selected ? " selected" : "")} onClick={onClick}>
      <div className="qc-card-img" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85&auto=format)" }} />
      <div className="qc-card-num">A</div>
      <div className="qc-card-body">
        <div className="qc-card-tag"><span className="dot" />{t("qb.q1.guided.tag")}</div>
        <h3>{t("qb.q1.guided.title")}</h3>
        <p className="qc-card-desc">{t("qb.q1.guided.desc")}</p>
        <div className="qc-card-foot">
          <div className="qc-card-foot-label">{t("qb.q1.guided.cta")}</div>
          <div className="qc-card-arrow">→</div>
        </div>
      </div>
    </div>
  );
  return (
    <div className={"qc-card qc-card-intentional" + (selected ? " selected" : "")} onClick={onClick}>
      <div className="qc-card-img" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=85&auto=format)" }} />
      <div className="qc-pin-overlay">
        <div className="qc-pin" />
        <div className="qc-pin-line" />
        <div className="qc-pin-label">{t("qb.q1.int.pin")}<small>48°51'N · 2°21'E</small></div>
      </div>
      <div className="qc-card-num">B</div>
      <div className="qc-card-body">
        <div className="qc-card-tag"><span className="dot" />{t("qb.q1.int.tag")}</div>
        <h3>{t("qb.q1.int.title")}</h3>
        <p className="qc-card-desc">{t("qb.q1.int.desc")}</p>
        <div className="qc-card-foot">
          <div className="qc-card-foot-label">{t("qb.q1.int.cta")}</div>
          <div className="qc-card-arrow">→</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════ Q2 · region ════════════ */
const REGIONS = [
  { id: "home",     name: "Close to home",        ic: "🏡", dur: "4h max · no flights",      coords: "local · 1–2 timezones",     img: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1400&q=85&auto=format" },
  { id: "europe",   name: "Europe",               ic: "🏰", dur: "Short haul · ~4h max",     coords: "35°–70°N · 1–3h flight",     img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=85&auto=format" },
  { id: "asia",     name: "Asia",                 ic: "⛩",  dur: "Long haul · 8–12h",        coords: "East & SE · 6–8 timezones", img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=85&auto=format" },
  { id: "americas", name: "Americas",             ic: "🗽", dur: "Transcontinental · 10–14h",coords: "N & S · 4–10 timezones",    img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85&auto=format" },
  { id: "africa",   name: "Africa & Middle East", ic: "🌍", dur: "Medium / long · 4–10h",    coords: "30°N–35°S · 2–4 timezones", img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1400&q=85&auto=format" },
  { id: "oceania",  name: "Oceania",              ic: "🐨", dur: "Long haul · 20h+ w/ stops",coords: "Pacific · 10+ timezones",   img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85&auto=format" },
];

function Q2({ answers, setAnswers, onNext, onBack }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const activeId = hoverId || REGIONS.find(r => r.name === answers.region)?.id;
  const activeRegion = REGIONS.find(r => r.id === activeId) || REGIONS[1];
  return (
    <>
      <BgPhotos items={REGIONS} activeImg={activeRegion.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("qb.header.q2")} count="02 / 07" fillPct={28} />
        <div className="qc-q-head">
          <Eyebrow text={t("qb.q2.eyebrow")} />
          <h1 className="qc-q-title"><RichTitle text={t("qb.q2.title")} /></h1>
          <p className="qc-q-sub">{t("qb.q2.sub")}</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options">
          {REGIONS.map(r => (
            <div key={r.id} data-region={r.id}
              className={"qc-option" + (answers.region === r.name ? " selected" : "")}
              onClick={() => setAnswers({ ...answers, region: r.name })}
              onMouseEnter={() => setHoverId(r.id)} onMouseLeave={() => setHoverId(null)}>
              <div className="qc-option-ic">{r.ic}</div>
              <div className="qc-option-body">
                <div className="qc-option-name">{t(NAME_KEY[r.name])}</div>
                <div className="qc-option-meta">{t(`qb.region.${r.id}.coords`)}</div>
              </div>
              <div className="qc-option-dur">{t(`qb.region.${r.id}.dur`)}</div>
            </div>
          ))}
        </div>
        <aside className="qc-side">
          <div className="qc-region-preview">
            <div className="qc-region-preview-img" style={{ backgroundImage: `url(${activeRegion.img})` }} />
            <div className="qc-region-preview-body">
              <div className="qc-region-preview-label">{hoverId ? t("qb.q2.preview.hover") : t("qb.q2.preview.sel")}</div>
              <div className="qc-region-preview-name">{t(NAME_KEY[activeRegion.name])}</div>
              <div className="qc-region-preview-coords">{t(`qb.region.${activeRegion.id}.coords`)}</div>
            </div>
          </div>
          <ProfileCard answers={answers} pending="Q2" />
          <SideCard head={t("qb.side.why")} icon="?"><p>{t("qb.q2.side.why")}</p></SideCard>
          <SideCard head={t("qb.side.privacy")} icon="✓" tone="privacy"><p>{t("qb.side.privacy.txt")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qb.q2.back")} canContinue={!!answers.region} ctaLabel={answers.region ? t("qb.nav.continue") : t("qb.q2.cta.empty")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q3 · trip type ════════════ */
const TYPES = [
  { id: "culture",   name: "Culture & history",      ic: "🏛", meta: "Museums · old towns",      img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=85&auto=format" },
  { id: "nature",    name: "Nature & adventure",     ic: "🌿", meta: "Hikes · open spaces",      img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&q=85&auto=format" },
  { id: "food",      name: "Food & wine",            ic: "🍷", meta: "Local cuisine · markets",  img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=900&q=85&auto=format" },
  { id: "beach",     name: "Beach & relax",          ic: "🏖", meta: "Sea · slow days",          img: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=900&q=85&auto=format" },
  { id: "city",      name: "City & nightlife",       ic: "🌃", meta: "Energy · late hours",      img: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=900&q=85&auto=format" },
  { id: "offgrid",   name: "Off the grid",           ic: "⛰",  meta: "Remote · disconnected",    img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=900&q=85&auto=format" },
  { id: "road",      name: "Road trip",              ic: "🚐", meta: "Drive · stops along",      img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=900&q=85&auto=format" },
  { id: "trekking",  name: "Trekking & sports",      ic: "🥾", meta: "Active · physical",        img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=900&q=85&auto=format" },
  { id: "wellness",  name: "Wellness & spa",         ic: "🌸", meta: "Reset · restorative",      img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=900&q=85&auto=format" },
  { id: "discovery", name: "Discovery, surprise me", ic: "✨", meta: "Let MindRoute pick",       img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=900&q=85&auto=format" },
];

function Q3({ answers, setAnswers, onNext, onBack }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.tripTypes ?? [];
  function toggle(name: string) {
    if (selected.includes(name)) setAnswers({ ...answers, tripTypes: selected.filter(x => x !== name) });
    else if (selected.length < 3) setAnswers({ ...answers, tripTypes: [...selected, name] });
  }
  const isFull = selected.length >= 3;
  const activeImg = useMemo(() => {
    const id = hoverId || (selected.length ? TYPES.find(ty => ty.name === selected[selected.length - 1])?.id : null);
    return TYPES.find(ty => ty.id === id)?.img || TYPES[1].img;
  }, [hoverId, selected]);
  return (
    <>
      <BgPhotos items={TYPES} activeImg={activeImg} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("qb.header.q3")} count="03 / 07" fillPct={42} />
        <div className="qc-q-head">
          <Eyebrow text={t("qb.q3.eyebrow")} />
          <h1 className="qc-q-title"><RichTitle text={t("qb.q3.title")} /></h1>
          <div className="qc-q-sub">
            {t("qb.q3.sub")}
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 {t("qb.pick.selected")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-tcards">
          {TYPES.map(ty => {
            const sel = selected.includes(ty.name);
            const dis = !sel && isFull;
            const rank = sel ? selected.indexOf(ty.name) + 1 : null;
            return (
              <div key={ty.id}
                className={"qc-tcard" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                onClick={() => !dis && toggle(ty.name)}
                onMouseEnter={() => setHoverId(ty.id)} onMouseLeave={() => setHoverId(null)}>
                <div className="qc-tcard-img" style={{ backgroundImage: `url(${ty.img})` }} />
                {sel && <div className="qc-tcard-num">{rank}</div>}
                <div className="qc-tcard-ic">{ty.ic}</div>
                <div className="qc-tcard-body">
                  <div className="qc-tcard-name">{t(NAME_KEY[ty.name])}</div>
                  <div className="qc-tcard-meta">{t(`qb.type.${ty.id}.meta`)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCard answers={answers} pending="Q3" />
          <SideCard head={t("qb.side.why")} icon="?"><p>{t("qb.q3.side.why")}</p></SideCard>
          <SideCard head={t("qb.side.privacy")} icon="✓" tone="privacy"><p>{t("qb.side.privacy.txt")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qb.q3.back")} canContinue={selected.length > 0} ctaLabel={selected.length ? `${t("qb.q3.cta.n")} ${selected.length}` : t("qb.q3.cta.empty")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q4 · defining moment ════════════ */
const MOMENTS = [
  { id: "food",     cat: "food",     ic: "🍝", name: "Eating at local spots",                  meta: "Where only locals eat",                feel: "You want to feel like you belong, not like a tourist.",              img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=85&auto=format" },
  { id: "explore",  cat: "explore",  ic: "🚶", name: "Getting lost in authentic neighborhoods", meta: "No destination, just walking",         feel: "You want to feel the place living its own life, around you.",       img: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85&auto=format" },
  { id: "iconic",   cat: "iconic",   ic: "🏛", name: "Seeing iconic landmarks",                meta: "The classic, experienced differently", feel: "You want to feel the weight of history standing in front of you.",  img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=85&auto=format" },
  { id: "nature",   cat: "nature",   ic: "🌱", name: "Being immersed in nature",               meta: "A day without pavement",               feel: "You want to feel small in front of something bigger than you.",     img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85&auto=format" },
  { id: "new",      cat: "new",      ic: "✨", name: "Living something completely new",        meta: "Never done before, never forgotten",   feel: "You want to feel alive — the kind of memory you'll keep for years.", img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1400&q=85&auto=format" },
  { id: "photo",    cat: "photo",    ic: "📸", name: "Photographing something extraordinary",  meta: "Perfect light, perfect moment",        feel: "You want one frame that tells everyone where you really were.",     img: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85&auto=format" },
  { id: "discover", cat: "discover", ic: "🗺", name: "Finding a place I didn't know existed",  meta: "The discovery that makes the trip",    feel: "You want to come back home with a secret nobody else has.",         img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=85&auto=format" },
];

function Q4({ answers, setAnswers, onNext, onBack }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.defining ?? [];
  function toggle(name: string) {
    if (selected.includes(name)) setAnswers({ ...answers, defining: selected.filter(x => x !== name) });
    else if (selected.length < 3) setAnswers({ ...answers, defining: [...selected, name] });
  }
  const isFull = selected.length >= 3;
  const activeId = hoverId || (selected.length ? MOMENTS.find(m => m.name === selected[selected.length - 1])?.id : null);
  const activeM = MOMENTS.find(m => m.id === activeId) || MOMENTS[3];
  return (
    <>
      <BgPhotos items={MOMENTS} activeImg={activeM.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("qb.header.q4")} count="04 / 07" fillPct={56} />
        <div className="qc-q-head">
          <Eyebrow text={t("qb.q4.eyebrow")} />
          <h1 className="qc-q-title"><RichTitle text={t("qb.q4.title")} /></h1>
          <div className="qc-q-sub">
            {t("qb.q4.sub")}
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 {t("qb.pick.selected")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options">
          {MOMENTS.map(m => {
            const sel = selected.includes(m.name);
            const dis = !sel && isFull;
            const rank = sel ? selected.indexOf(m.name) + 1 : null;
            return (
              <div key={m.id} data-cat={m.cat}
                className={"qc-option" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                onClick={() => !dis && toggle(m.name)}
                onMouseEnter={() => setHoverId(m.id)} onMouseLeave={() => setHoverId(null)}>
                <div className="qc-option-ic">{m.ic}</div>
                <div className="qc-option-body">
                  <div className="qc-option-name">{t(NAME_KEY[m.name])}</div>
                  <div className="qc-option-meta">{t(`qb.moment.${m.id}.meta`)}</div>
                </div>
                <div className="qc-option-mark">
                  {sel ? `#${rank}` : ""}
                  <div className="qc-circle" />
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{(hoverId || selected.length > 0) ? t(`qb.moment.${activeM.id}.feel`) : t("qb.q4.feel.empty")}</div>
          </div>
          <ProfileCard answers={answers} pending="Q4" />
          <SideCard head={t("qb.side.why")} icon="?"><p>{t("qb.q4.side.why")}</p></SideCard>
          <SideCard head={t("qb.side.privacy")} icon="✓" tone="privacy"><p>{t("qb.side.privacy.txt")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qb.q4.back")} canContinue={selected.length > 0} ctaLabel={selected.length ? `${t("qb.q4.cta.n")} ${selected.length}` : t("qb.q4.cta.empty")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q5 · pace ════════════ */
const PACE_STAGES = [
  { id: "structured",  threshold: 33, name: "Structured",  meta: "every day already mapped",       feel: "You want a clear plan so you can stop thinking and just feel.",       img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=85&auto=format" },
  { id: "balanced",    threshold: 66, name: "Balanced",    meta: "the spine is set, the rest isn't", feel: "You want a structure to lean on and freedom to wander off it.",     img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85&auto=format" },
  { id: "spontaneous", threshold:101, name: "Spontaneous", meta: "decide it in the morning",        feel: "You want the day to surprise you — no slot, no countdown, no map.", img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85&auto=format" },
];
function paceStage(v: number) {
  return PACE_STAGES.find(s => v <= s.threshold) ?? PACE_STAGES[1];
}

function Q5({ answers, setAnswers, onNext, onBack }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const value = typeof answers.pace === "number" ? answers.pace : 50;
  function setValue(v: number) { setAnswers({ ...answers, pace: Math.max(0, Math.min(100, v)) }); }
  const stage = paceStage(value);
  return (
    <>
      <BgPhotos items={PACE_STAGES} activeImg={stage.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("qb.header.q5")} count="05 / 07" fillPct={70} />
        <div className="qc-q-head">
          <Eyebrow text={t("qb.q5.eyebrow")} />
          <h1 className="qc-q-title"><RichTitle text={t("qb.q5.title")} /></h1>
          <p className="qc-q-sub">{t("qb.q5.sub")}</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-pace-stage">
          <div className="qc-pace-current">
            <div className="qc-pace-label">{t(`qb.pace.${stage.id}.name`)}</div>
            <div className="qc-pace-meta">{t(`qb.pace.${stage.id}.meta`)}</div>
          </div>
          <div className="qc-pace-slider">
            <div className="qc-pace-track">
              <div className="qc-pace-fill" style={{ width: `${value}%` }} />
              <div className="qc-pace-knob" style={{ left: `${value}%` }} />
              <input
                type="range" min={0} max={100} value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="qc-pace-input" aria-label={t("qb.q5.aria.pace")}
              />
            </div>
            <div className="qc-pace-stops">
              <button className={"qc-pace-stop" + (value <= 33 ? " active" : "")}                 onClick={() => setValue(15)}><span>{t("qb.pace.stop.structured")}</span><small>{t("qb.pace.stop.struct.sub")}</small></button>
              <button className={"qc-pace-stop" + (value > 33 && value < 67 ? " active" : "")}    onClick={() => setValue(50)}><span>{t("qb.pace.stop.balanced")}</span><small>{t("qb.pace.stop.bal.sub")}</small></button>
              <button className={"qc-pace-stop" + (value >= 67 ? " active" : "")}                 onClick={() => setValue(85)}><span>{t("qb.pace.stop.spont")}</span><small>{t("qb.pace.stop.spont.sub")}</small></button>
            </div>
          </div>
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{t(`qb.pace.${stage.id}.feel`)}</div>
          </div>
          <ProfileCard answers={answers} pending="Q5" />
          <SideCard head={t("qb.side.why")} icon="?"><p>{t("qb.q5.side.why")}</p></SideCard>
          <SideCard head={t("qb.side.privacy")} icon="✓" tone="privacy"><p>{t("qb.side.privacy.txt")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qb.q5.back")} canContinue={true} ctaLabel={t("qb.nav.continue")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q6 · emotional goals ════════════ */
const EMOTIONS = [
  { id: "disconnect", cat: "explore",  ic: "🔌", name: "Disconnect from routine",     meta: "no schedules, no notifications",        feel: "You want a real exit door from your daily mind.",                       img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1400&q=85&auto=format" },
  { id: "energy",     cat: "food",     ic: "🔋", name: "Regain energy and lightness", meta: "come back changed",                    feel: "You want to land back home a little lighter than you left.",            img: "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1400&q=85&auto=format" },
  { id: "free",       cat: "discover", ic: "🐦", name: "Feel free and spontaneous",   meta: "decide in the morning what to do",     feel: "You want days that don't ask permission from a calendar.",              img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85&auto=format" },
  { id: "wonder",     cat: "iconic",   ic: "👁",  name: "Be amazed again",            meta: "that feeling you've been missing",      feel: "You want something to silence the cynical voice in your head.",         img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=85&auto=format" },
  { id: "connect",    cat: "nature",   ic: "❤️", name: "Feel the place deeply",       meta: "genuinely connect with it",            feel: "You want a place to enter you, not just pass through your camera.",     img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85&auto=format" },
  { id: "comfort",    cat: "new",      ic: "🚀", name: "Step outside my comfort zone", meta: "push the boundary forward",            feel: "You want the version of yourself you only meet far from home.",         img: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1400&q=85&auto=format" },
];

function Q6({ answers, setAnswers, onNext, onBack }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.emotionalGoals ?? [];
  function toggle(name: string) {
    if (selected.includes(name)) setAnswers({ ...answers, emotionalGoals: selected.filter(x => x !== name) });
    else if (selected.length < 3) setAnswers({ ...answers, emotionalGoals: [...selected, name] });
  }
  const isFull = selected.length >= 3;
  const activeId = hoverId || (selected.length ? EMOTIONS.find(e => e.name === selected[selected.length - 1])?.id : null);
  const activeE = EMOTIONS.find(e => e.id === activeId) || EMOTIONS[0];
  return (
    <>
      <BgPhotos items={EMOTIONS} activeImg={activeE.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("qb.header.q6")} count="06 / 07" fillPct={84} />
        <div className="qc-q-head">
          <Eyebrow text={t("qb.q6.eyebrow")} />
          <h1 className="qc-q-title"><RichTitle text={t("qb.q6.title")} /></h1>
          <div className="qc-q-sub">
            {t("qb.q6.sub")}
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 {t("qb.pick.selected")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options">
          {EMOTIONS.map(e => {
            const sel = selected.includes(e.name);
            const dis = !sel && isFull;
            const rank = sel ? selected.indexOf(e.name) + 1 : null;
            return (
              <div key={e.id} data-cat={e.cat}
                className={"qc-option" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                onClick={() => !dis && toggle(e.name)}
                onMouseEnter={() => setHoverId(e.id)} onMouseLeave={() => setHoverId(null)}>
                <div className="qc-option-ic">{e.ic}</div>
                <div className="qc-option-body">
                  <div className="qc-option-name">{t(NAME_KEY[e.name])}</div>
                  <div className="qc-option-meta">{t(`qb.emotion.${e.id}.meta`)}</div>
                </div>
                <div className="qc-option-mark">
                  {sel ? `#${rank}` : ""}
                  <div className="qc-circle" />
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{(hoverId || selected.length > 0) ? t(`qb.emotion.${activeE.id}.feel`) : t("qb.q6.feel.empty")}</div>
          </div>
          <ProfileCard answers={answers} pending="Q6" />
          <SideCard head={t("qb.side.why")} icon="?"><p>{t("qb.q6.side.why")}</p></SideCard>
          <SideCard head={t("qb.side.privacy")} icon="✓" tone="privacy"><p>{t("qb.side.privacy.txt")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qb.q6.back")} canContinue={selected.length > 0} ctaLabel={selected.length ? `${t("qb.q6.cta.n")} ${selected.length}` : t("qb.q6.cta.empty")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q7 · avoid ════════════ */
const AVOIDS = [
  { id: "crowded",        cat: "explore",  ic: "👥", name: "Crowded places",                   meta: "everyone with the same camera" },
  { id: "touristy",       cat: "food",     ic: "🍽", name: "Touristy restaurants",             meta: "menu in five languages" },
  { id: "resort",         cat: "new",      ic: "🏨", name: "Resort hotels",                    meta: "the place stays outside the gate" },
  { id: "guided",         cat: "iconic",   ic: "🚌", name: "Guided tours",                     meta: "earphone, headcount, no detours" },
  { id: "museums",        cat: "iconic",   ic: "🏛", name: "Museums for hours",                meta: "marathon of plaques" },
  { id: "nightlife",      cat: "new",      ic: "🎵", name: "Nightlife and clubs",              meta: "lights, decibels, late" },
  { id: "schedules",      cat: "discover", ic: "📅", name: "Strict schedules",                 meta: "by-the-minute itinerary" },
  { id: "transits",       cat: "explore",  ic: "🚆", name: "Long transits",                    meta: "more travel than trip" },
  { id: "mornings",       cat: "discover", ic: "⏰", name: "Early mornings",                   meta: "alarms on holiday? no" },
  { id: "smalltalk",      cat: "explore",  ic: "💬", name: "Small talk with strangers",        meta: "constant social effort" },
  { id: "unfamiliarfood", cat: "food",     ic: "🍜", name: "Too unfamiliar food",              meta: "every meal a question mark" },
  { id: "toomuchwalking", cat: "nature",   ic: "👟", name: "Too much walking",                 meta: "10k steps before breakfast" },
  { id: "tooisolated",    cat: "nature",   ic: "🏝",  name: "Feeling too isolated",            meta: "no signal, no people, no help" },
  { id: "tooexpensive",   cat: "iconic",   ic: "💸", name: "Spending without clear value",     meta: "paying for the label" },
  { id: "toolong",        cat: "discover", ic: "⏳", name: "Staying too long in one place",    meta: "one base, zero rotation" },
];

function Q7({ answers, setAnswers, onNext, onBack }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const selected = answers.avoid ?? [];
  function toggle(name: string) {
    if (selected.includes(name)) setAnswers({ ...answers, avoid: selected.filter(x => x !== name) });
    else setAnswers({ ...answers, avoid: [...selected, name] });
  }
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label={t("qb.header.q7")} count="07 / 07" fillPct={100} />
        <div className="qc-q-head">
          <Eyebrow text={t("qb.q7.eyebrow")} />
          <h1 className="qc-q-title"><RichTitle text={t("qb.q7.title")} /></h1>
          <div className="qc-q-sub">
            {t("qb.q7.sub")}
            <div className="qc-pick-counter"><strong>{selected.length}</strong> {t("qb.pick.selected")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options qc-options-twocol">
          {AVOIDS.map(a => {
            const isSel = selected.includes(a.name);
            return (
              <div key={a.id} data-cat={a.cat}
                className={"qc-option" + (isSel ? " selected" : "")}
                onClick={() => toggle(a.name)}>
                <div className="qc-option-ic">{a.ic}</div>
                <div className="qc-option-body">
                  <div className="qc-option-name">{t(NAME_KEY[a.name])}</div>
                  <div className="qc-option-meta">{t(`qb.avoid.${a.id}.meta`)}</div>
                </div>
                <div className="qc-option-mark">
                  {isSel ? t("qb.q7.avoided") : ""}
                  <div className="qc-circle" />
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCard answers={answers} pending="Q7" />
          <SideCard head={t("qb.side.why")} icon="?"><p>{t("qb.q7.side.why")}</p></SideCard>
          <SideCard head={t("qb.side.privacy")} icon="✓" tone="privacy"><p>{t("qb.side.privacy.txt")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qb.q7.back")} canContinue={true} ctaLabel={selected.length ? t("qb.nav.continue") : t("qb.q7.cta.skip")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ shared BgPhotos ════════════ */
export function BgPhotos({ items, activeImg }: { items: Array<{ img: string }>; activeImg: string }) {
  return (
    <div className="qc-bg-stage">
      {items.map((it, i) => (
        <div key={i} className={"qc-bg-photo" + (activeImg === it.img ? " active" : "")} style={{ backgroundImage: `url(${it.img})` }} />
      ))}
    </div>
  );
}
