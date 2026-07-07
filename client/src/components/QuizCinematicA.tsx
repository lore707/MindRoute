/**
 * QuizCinematicA.tsx
 * ───────────────────────────────────────────────────────────────
 * Quiz Q1 → Q7 for MindRoute (Path A — "Guided discovery", I don't know where to go).
 *
 * Same cinematic editorial language as QuizCinematic (Path B): cinematic shell,
 * hover-driven photo crossfade, sticky head, sticky side panel, profile-so-far,
 * shimmer continue. Reuses the qc-* CSS classes and the shared primitives
 * (BgGrain, StepRail, HeaderStrip, SideCard, FooterNav, BgPhotos).
 *
 *   Q1 style · Q2 need · Q3 drains · Q4 visual pull · Q5 chaos · Q6 identity filter (text) · Q7 distance
 *
 * All user-visible strings are resolved via useI18n(). Keys live in:
 *   - client/src/lib/i18n-dict/quizA.ts  (prefix "qa.")
 *   - client/src/lib/i18n.tsx             (existing keys reused via id)
 * Selections emitted in onComplete are stable IDs — unchanged.
 *
 * Props
 *   - onComplete(answers)   → all 7 answers collected
 *   - onBackFromQ1?()       → back from Q1 (e.g. return to the path picker)
 *   - initialAnswers?       → pre-fill
 *   - initialStep? (1..7)   → starting step (default 1)
 * ─────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { pressable } from "@/lib/pressable";
import { useI18n } from "@/lib/i18n";
import { BgGrain, StepRail, HeaderStrip, SideCard, FooterNav, BgPhotos } from "./QuizCinematic";

export type AnswersA = {
  vibes?: string[];     // Q1 ids (1..3)
  needs?: string[];     // Q2 ids (1..3)
  needsNote?: string;   // Q2 optional addendum
  drains?: string[];    // Q3 ids (matches chips.* keys)
  drainsNote?: string;  // Q3 optional addendum
  visual?: string[];    // Q4 ids (up to 2)
  chaos?: number;       // Q5 slider 0..100
  rejection?: string;   // Q6 free text (optional)
  distance?: string;    // Q7 id (single)
};

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface QuizCinematicAProps {
  onComplete?: (a: AnswersA) => void;
  onBackFromQ1?: () => void;
  initialAnswers?: AnswersA;
  initialStep?: Step;
}

/* ════════════ data ════════════ */
const IMG = (id: string) => `https://images.unsplash.com/photo-${id}?w=1400&q=85&auto=format`;

/* Static data keeps only ids, emoji, img, cat.
 * All human-readable text (name, meta, feel) is resolved at render time
 * via t() so the component stays language-agnostic. */

const VIBES = [
  { id: "wild",         ic: "🔥", cat: "new",      img: IMG("1464822759023-fed622ff2c3b") },
  { id: "quiet",        ic: "🌙", cat: "explore",  img: IMG("1476514525535-07fb3b4ae5f1") },
  { id: "chaotic",      ic: "🎲", cat: "discover", img: IMG("1488646953014-85cb44e25828") },
  { id: "intimate",     ic: "🕯", cat: "nature",   img: IMG("1495474472287-4d71bcdd2085") },
  { id: "solitary",     ic: "🚶", cat: "explore",  img: IMG("1500530855697-b586d89ba3ee") },
  { id: "regenerating", ic: "🌱", cat: "nature",   img: IMG("1518548419970-58e3b4079ab2") },
  { id: "authentic",    ic: "🫀", cat: "food",     img: IMG("1513635269975-59663e0ac1ad") },
  { id: "quietluxury",  ic: "🥂", cat: "iconic",   img: IMG("1551632811-561732d1e306") },
  { id: "spiritual",    ic: "🕊",  cat: "iconic",   img: IMG("1493246507139-91e8fad9978e") },
  { id: "festive",      ic: "🎉", cat: "new",      img: IMG("1528360983277-13d401cdc186") },
  { id: "adventure",    ic: "⛰",  cat: "nature",   img: IMG("1506905925346-21bda4d32df4") },
  { id: "romantic",     ic: "🌹", cat: "new",      img: IMG("1500375592092-40eb2168fd21") },
  { id: "cultural",     ic: "🏛", cat: "iconic",   img: IMG("1502602898657-3e91760cbb34") },
  { id: "explorative",  ic: "🧭", cat: "discover", img: IMG("1467269204594-9661b134dd2b") },
];

const NEEDS = [
  { id: "disconnect", ic: "🔌", cat: "explore",  img: IMG("1476514525535-07fb3b4ae5f1") },
  { id: "alive",      ic: "⚡", cat: "new",      img: IMG("1464822759023-fed622ff2c3b") },
  { id: "slow",       ic: "🐌", cat: "nature",   img: IMG("1495474472287-4d71bcdd2085") },
  { id: "surprise",   ic: "✨", cat: "discover", img: IMG("1467269204594-9661b134dd2b") },
  { id: "recharge",   ic: "🔋", cat: "food",     img: IMG("1500375592092-40eb2168fd21") },
  { id: "change",     ic: "🔄", cat: "photo",    img: IMG("1528360983277-13d401cdc186") },
  { id: "celebrate",  ic: "🥂", cat: "iconic",   img: IMG("1488646953014-85cb44e25828") },
  { id: "findself",   ic: "🧭", cat: "explore",  img: IMG("1493246507139-91e8fad9978e") },
];

/* Drain ids match the chips.* keys in i18n.tsx */
const DRAINS = [
  { id: "crowded",        ic: "👥", cat: "explore" },
  { id: "touristy",       ic: "🍽", cat: "food" },
  { id: "resort",         ic: "🏨", cat: "new" },
  { id: "guided",         ic: "🚌", cat: "iconic" },
  { id: "museums",        ic: "🏛", cat: "iconic" },
  { id: "nightlife",      ic: "🎵", cat: "new" },
  { id: "schedules",      ic: "📅", cat: "discover" },
  { id: "transits",       ic: "🚆", cat: "explore" },
  { id: "mornings",       ic: "⏰", cat: "discover" },
  { id: "smalltalk",      ic: "💬", cat: "explore" },
  { id: "unfamiliarfood", ic: "🍜", cat: "food" },
  { id: "toomuchwalking", ic: "👟", cat: "nature" },
  { id: "tooisolated",    ic: "🏝",  cat: "nature" },
  { id: "tooexpensive",   ic: "💸", cat: "iconic" },
  { id: "toolong",        ic: "⏳", cat: "discover" },
];

const VISUALS = [
  { id: "medina", img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1400&q=85&auto=format" },
  { id: "nordic", img: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1400&q=85&auto=format" },
  { id: "temple", img: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1400&q=85&auto=format" },
  { id: "desert", img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=85&auto=format" },
];

const PACE_STAGES = [
  { id: "structured",  threshold: 33,  img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=85&auto=format" },
  { id: "balanced",    threshold: 66,  img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85&auto=format" },
  { id: "spontaneous", threshold: 101, img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85&auto=format" },
];
function paceStage(v: number) {
  return PACE_STAGES.find((s) => v <= s.threshold) ?? PACE_STAGES[1];
}

const DISTANCES = [
  { id: "close",     ic: "🏡", cat: "explore",  img: IMG("1476514525535-07fb3b4ae5f1") },
  { id: "continent", ic: "✈️", cat: "iconic",   img: IMG("1502602898657-3e91760cbb34") },
  { id: "far",       ic: "🌏", cat: "new",      img: IMG("1467269204594-9661b134dd2b") },
  { id: "anywhere",  ic: "🎲", cat: "discover", img: IMG("1506905925346-21bda4d32df4") },
];

/* need id → a.q2.chip* key (order matches NEEDS array / i18n.tsx) */
const NEED_CHIP_KEYS: Record<string, string> = {
  disconnect: "a.q2.chip1",
  alive:      "a.q2.chip2",
  slow:       "a.q2.chip3",
  surprise:   "a.q2.chip4",
  recharge:   "a.q2.chip5",
  change:     "a.q2.chip6",
  celebrate:  "a.q2.chip7",
  findself:   "a.q2.chip8",
};

/* ════════════ shell ════════════ */
export function QuizCinematicA({
  onComplete,
  onBackFromQ1,
  initialAnswers,
  initialStep = 1,
}: QuizCinematicAProps) {
  const [step, setStep] = useState<Step>(initialStep);
  const [answers, setAnswers] = useState<AnswersA>(initialAnswers ?? {});

  function next() {
    if (step === 7) { onComplete?.(answers); return; }
    setStep((step + 1) as Step);
  }
  function back() {
    if (step === 1) { onBackFromQ1?.(); return; }
    setStep((step - 1) as Step);
  }

  return (
    <div className="quiz-cinematic">
      <BgGrain />
      <StepRail step={step} onStep={(s) => setStep(s as Step)} />
      <div className="qc-stage">
        <div className="qc-container">
          {step === 1 && <Q1 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} hasBack={!!onBackFromQ1} />}
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

/* ════════════ profile-so-far ════════════ */
function ProfileCardA({ answers, pending }: { answers: AnswersA; pending: string }) {
  const { t } = useI18n();
  const vibes = answers.vibes ?? [];
  const needs = answers.needs ?? [];
  const drains = answers.drains ?? [];
  const visual = answers.visual ?? [];

  const vibeName = (id: string) => t(`a.q1.chips.${id}`);
  const needName = (id: string) => t(NEED_CHIP_KEYS[id] ?? id);
  const visualName = (id: string) => t(`q4.${id}`);
  const distanceName = (id: string) => t(`a.q7.chips.${id}`);
  function chaosLabel(v: number) {
    if (v <= 33) return t("qa.pace.structured.name");
    if (v >= 67) return t("qa.pace.spontaneous.name");
    return t("qa.pace.balanced.name");
  }

  const drainCount = drains.length;
  const drainValue = drainCount
    ? `${drainCount} ${drainCount > 1 ? t("qa.profile.patterns.pl") : t("qa.profile.patterns")}`
    : null;

  return (
    <div className="qc-profile-card">
      <div className="qc-profile-head">{t("sidebar.profileSoFar")}</div>
      <ProfileRow label={t("qa.profile.q1")} value={vibes.length ? vibes.map(vibeName).join(" · ") : null}   pending={pending === "Q1"} awaiting={t("qa.profile.awaiting")} />
      <ProfileRow label={t("qa.profile.q2")} value={needs.length ? needs.map(needName).join(" · ") : null}   pending={pending === "Q2"} awaiting={t("qa.profile.awaiting")} />
      <ProfileRow label={t("qa.profile.q3")} value={drainValue} pending={pending === "Q3"} awaiting={t("qa.profile.awaiting")} />
      <ProfileRow label={t("qa.profile.q4")} value={visual.length ? visual.map(visualName).join(" · ") : null} pending={pending === "Q4"} awaiting={t("qa.profile.awaiting")} />
      <ProfileRow label={t("qa.profile.q5")} value={typeof answers.chaos === "number" ? `${chaosLabel(answers.chaos)} · ${answers.chaos}/100` : null} pending={pending === "Q5"} awaiting={t("qa.profile.awaiting")} />
      <ProfileRow label={t("qa.profile.q6")} value={answers.rejection?.trim() ? t("qa.profile.noted") : null} pending={pending === "Q6"} awaiting={t("qa.profile.awaiting")} />
      <ProfileRow label={t("qa.profile.q7")} value={answers.distance ? distanceName(answers.distance) : null} pending={pending === "Q7"} awaiting={t("qa.profile.awaiting")} />
    </div>
  );
}

function ProfileRow({ label, value, pending, awaiting }: { label: string; value: string | null; pending: boolean; awaiting: string }) {
  if (!pending && !value) return null;
  return (
    <div className={"qc-profile-row" + (pending ? " pending" : "")}>
      <div className="qc-profile-row-l">{label}</div>
      <div className="qc-profile-row-v">{value ?? awaiting}</div>
    </div>
  );
}

/* ════════════ Q1 · style ════════════ */
function Q1({ answers, setAnswers, onNext, onBack, hasBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void; hasBack: boolean }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.vibes ?? [];
  const isFull = selected.length >= 3;
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, vibes: selected.filter((x) => x !== id) });
    else if (selected.length < 3) setAnswers({ ...answers, vibes: [...selected, id] });
  }
  const activeId = hoverId || (selected.length ? selected[selected.length - 1] : null);
  const activeImg = useMemo(() => VIBES.find((v) => v.id === activeId)?.img || VIBES[0].img, [activeId]);
  const ctaLabel = selected.length
    ? t("qa.q1.cta.full").replace("{n}", String(selected.length))
    : t("qa.q1.cta.empty");
  return (
    <>
      <BgPhotos items={VIBES} activeImg={activeImg} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("section.a.style")} count="01 / 07" fillPct={14} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>{t("q.label")} 01</strong> · {t("qa.q1.eyebrow")}</div>
          <h1 className="qc-q-title" dangerouslySetInnerHTML={{ __html: t("a.q1.text") }} />
          <div className="qc-q-sub">
            {t("qa.q1.sub")}
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 {t("qa.q1.counter")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options qc-options-twocol">
          {VIBES.map((v) => {
            const sel = selected.includes(v.id);
            const dis = !sel && isFull;
            const rank = sel ? selected.indexOf(v.id) + 1 : null;
            return (
              <div {...pressable} key={v.id} data-cat={v.cat}
                className={"qc-option" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                onClick={() => !dis && toggle(v.id)}
                onMouseEnter={() => setHoverId(v.id)} onMouseLeave={() => setHoverId(null)}>
                <div className="qc-option-ic">{v.ic}</div>
                <div className="qc-option-body">
                  <div className="qc-option-name">{t(`a.q1.chips.${v.id}`)}</div>
                  <div className="qc-option-meta">{t(`qa.vibe.${v.id}.meta`)}</div>
                </div>
                <div className="qc-option-mark">{sel ? `#${rank}` : ""}<div className="qc-circle" /></div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q1" />
          <SideCard head={t("qa.side.whyHead")} icon="?"><p>{t("a.q1.why")}</p></SideCard>
          <SideCard head={t("qa.side.privacyHead")} icon="✓" tone="privacy"><p>{t("sidebar.privacy")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("q.back")} canContinue={selected.length > 0} ctaLabel={ctaLabel} onBack={hasBack ? onBack : undefined} onNext={onNext} />
    </>
  );
}

/* ════════════ Q2 · need ════════════ */
function Q2({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.needs ?? [];
  const isFull = selected.length >= 3;
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, needs: selected.filter((x) => x !== id) });
    else if (selected.length < 3) setAnswers({ ...answers, needs: [...selected, id] });
  }
  const activeId = hoverId || (selected.length ? selected[selected.length - 1] : null);
  const activeImg = useMemo(() => NEEDS.find((n) => n.id === activeId)?.img || NEEDS[0].img, [activeId]);
  const ctaLabel = selected.length
    ? t("qa.q2.cta.full").replace("{n}", String(selected.length))
    : t("qa.q2.cta.empty");
  return (
    <>
      <BgPhotos items={NEEDS} activeImg={activeImg} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("section.a.need")} count="02 / 07" fillPct={28} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>{t("q.label")} 02</strong> · {t("qa.q2.eyebrow")}</div>
          <h1 className="qc-q-title" dangerouslySetInnerHTML={{ __html: t("a.q2.text") }} />
          <div className="qc-q-sub">
            {t("qa.q2.sub")}
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 {t("qa.q2.counter")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div>
          <div className="qc-options">
            {NEEDS.map((n) => {
              const sel = selected.includes(n.id);
              const dis = !sel && isFull;
              const rank = sel ? selected.indexOf(n.id) + 1 : null;
              return (
                <div {...pressable} key={n.id} data-cat={n.cat}
                  className={"qc-option" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                  onClick={() => !dis && toggle(n.id)}
                  onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId(null)}>
                  <div className="qc-option-ic">{n.ic}</div>
                  <div className="qc-option-body">
                    <div className="qc-option-name">{t(NEED_CHIP_KEYS[n.id] ?? n.id)}</div>
                    <div className="qc-option-meta">{t(`qa.need.${n.id}.meta`)}</div>
                  </div>
                  <div className="qc-option-mark">{sel ? `#${rank}` : ""}<div className="qc-circle" /></div>
                </div>
              );
            })}
          </div>
          <div className="qc-note">
            <div className="qc-note-label">{t("qa.q2.note.label")} <em>{t("qa.q2.note.optional")}</em></div>
            <input className="qc-note-input" type="text" value={answers.needsNote ?? ""}
              onChange={(e) => setAnswers({ ...answers, needsNote: e.target.value })}
              placeholder={t("qa.q2.note.placeholder")} />
          </div>
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">
              {activeId ? t(`qa.need.${activeId}.feel`) : t("qa.q2.feel.default")}
            </div>
          </div>
          <ProfileCardA answers={answers} pending="Q2" />
          <SideCard head={t("qa.side.whyHead")} icon="?"><p>{t("a.q2.why")}</p></SideCard>
          <SideCard head={t("qa.side.privacyHead")} icon="✓" tone="privacy"><p>{t("sidebar.privacy")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qa.q2.back")} canContinue={selected.length > 0} ctaLabel={ctaLabel} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q3 · drains ════════════ */
function Q3({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const selected = answers.drains ?? [];
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, drains: selected.filter((x) => x !== id) });
    else setAnswers({ ...answers, drains: [...selected, id] });
  }
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label={t("section.a.drains")} count="03 / 07" fillPct={42} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>{t("q.label")} 03</strong> · {t("qa.q3.eyebrow")}</div>
          <h1 className="qc-q-title" dangerouslySetInnerHTML={{ __html: t("a.q3.text") }} />
          <div className="qc-q-sub">
            {t("qa.q3.sub")}
            <div className="qc-pick-counter"><strong>{selected.length}</strong> {t("qa.q3.counter")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div>
          <div className="qc-options qc-options-twocol">
            {DRAINS.map((d) => {
              const sel = selected.includes(d.id);
              return (
                <div {...pressable} key={d.id} data-cat={d.cat}
                  className={"qc-option" + (sel ? " selected" : "")}
                  onClick={() => toggle(d.id)}>
                  <div className="qc-option-ic">{d.ic}</div>
                  <div className="qc-option-body">
                    <div className="qc-option-name">{t(`chips.${d.id}`)}</div>
                    <div className="qc-option-meta">{t(`qa.drain.${d.id}.meta`)}</div>
                  </div>
                  <div className="qc-option-mark">{sel ? t("qa.q3.mark.drain") : ""}<div className="qc-circle" /></div>
                </div>
              );
            })}
          </div>
          <div className="qc-note">
            <div className="qc-note-label">{t("qa.q3.note.label")} <em>{t("qa.q3.note.optional")}</em></div>
            <input className="qc-note-input" type="text" value={answers.drainsNote ?? ""}
              onChange={(e) => setAnswers({ ...answers, drainsNote: e.target.value })}
              placeholder={t("qa.q3.note.placeholder")} />
          </div>
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q3" />
          <SideCard head={t("qa.side.whyHead")} icon="?"><p>{t("qa.q3.side.why")}</p></SideCard>
          <SideCard head={t("qa.side.privacyHead")} icon="✓" tone="privacy"><p>{t("sidebar.privacy")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qa.q3.back")} canContinue={true} ctaLabel={selected.length ? t("qa.q3.cta.has") : t("qa.q3.cta.none")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q4 · visual pull ════════════ */
function Q4({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.visual ?? [];
  const isFull = selected.length >= 2;
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, visual: selected.filter((x) => x !== id) });
    else if (selected.length < 2) setAnswers({ ...answers, visual: [...selected, id] });
  }
  const activeId = hoverId || (selected.length ? selected[selected.length - 1] : null);
  const activeImg = useMemo(() => VISUALS.find((v) => v.id === activeId)?.img || VISUALS[0].img, [activeId]);
  const ctaLabel = selected.length
    ? t("qa.q4.cta.full").replace("{n}", String(selected.length))
    : t("qa.q4.cta.empty");
  return (
    <>
      <BgPhotos items={VISUALS} activeImg={activeImg} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("section.a.visual")} count="04 / 07" fillPct={56} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>{t("q.label")} 04</strong> · {t("qa.q4.eyebrow")}</div>
          <h1 className="qc-q-title" dangerouslySetInnerHTML={{ __html: t("a.q4.text") }} />
          <div className="qc-q-sub">
            {t("a.q4.hint")}
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/2 {t("qa.q4.counter")}</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-tcards">
          {VISUALS.map((v) => {
            const sel = selected.includes(v.id);
            const dis = !sel && isFull;
            const rank = sel ? selected.indexOf(v.id) + 1 : null;
            return (
              <div key={v.id}
                className={"qc-tcard" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                onClick={() => !dis && toggle(v.id)}
                onMouseEnter={() => setHoverId(v.id)} onMouseLeave={() => setHoverId(null)}>
                <div className="qc-tcard-img" style={{ backgroundImage: `url(${v.img})` }} />
                {sel && <div className="qc-tcard-num">{rank}</div>}
                <div className="qc-tcard-body">
                  <div className="qc-tcard-name">{t(`q4.${v.id}`)}</div>
                  <div className="qc-tcard-meta">{t(`q4.${v.id}.sub`)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q4" />
          <SideCard head={t("qa.side.whyHead")} icon="?"><p>{t("qa.q4.side.why")}</p></SideCard>
          <SideCard head={t("qa.side.privacyHead")} icon="✓" tone="privacy"><p>{t("sidebar.privacy")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qa.q4.back")} canContinue={selected.length > 0} ctaLabel={ctaLabel} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q5 · chaos ════════════ */
function Q5({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const value = typeof answers.chaos === "number" ? answers.chaos : 50;
  function setValue(v: number) { setAnswers({ ...answers, chaos: Math.max(0, Math.min(100, v)) }); }
  const stage = paceStage(value);
  return (
    <>
      <BgPhotos items={PACE_STAGES} activeImg={stage.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("section.a.chaos")} count="05 / 07" fillPct={70} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>{t("q.label")} 05</strong> · {t("qa.q5.eyebrow")}</div>
          <h1 className="qc-q-title" dangerouslySetInnerHTML={{ __html: t("a.q5.text") }} />
          <p className="qc-q-sub">{t("qa.q5.sub")}</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-pace-stage">
          <div className="qc-pace-current">
            <div className="qc-pace-label">{t(`qa.pace.${stage.id}.name`)}</div>
            <div className="qc-pace-meta">{t(`qa.pace.${stage.id}.meta`)}</div>
          </div>
          <div className="qc-pace-slider">
            <div className="qc-pace-track">
              <div className="qc-pace-fill" style={{ width: `${value}%` }} />
              <div className="qc-pace-knob" style={{ left: `${value}%` }} />
              <input type="range" min={0} max={100} value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="qc-pace-input" aria-label={t("qa.q5.eyebrow")} />
            </div>
            <div className="qc-pace-stops">
              <button className={"qc-pace-stop" + (value <= 33 ? " active" : "")} onClick={() => setValue(15)}>
                <span>{t("qa.q5.btn.structured.label")}</span>
                <small>{t("qa.q5.btn.structured.small")}</small>
              </button>
              <button className={"qc-pace-stop" + (value > 33 && value < 67 ? " active" : "")} onClick={() => setValue(50)}>
                <span>{t("qa.q5.btn.balanced.label")}</span>
                <small>{t("qa.q5.btn.balanced.small")}</small>
              </button>
              <button className={"qc-pace-stop" + (value >= 67 ? " active" : "")} onClick={() => setValue(85)}>
                <span>{t("qa.q5.btn.spontaneous.label")}</span>
                <small>{t("qa.q5.btn.spontaneous.small")}</small>
              </button>
            </div>
          </div>
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{t(`qa.pace.${stage.id}.feel`)}</div>
          </div>
          <ProfileCardA answers={answers} pending="Q5" />
          <SideCard head={t("qa.side.whyHead")} icon="?"><p>{t("qa.q5.side.why")}</p></SideCard>
          <SideCard head={t("qa.side.privacyHead")} icon="✓" tone="privacy"><p>{t("sidebar.privacy")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qa.q5.back")} canContinue={true} ctaLabel={t("qa.q5.cta")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q6 · identity filter (text) ════════════ */
function Q6({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const value = answers.rejection ?? "";
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const wordLabel = words
    ? `${words} ${words > 1 ? t("qa.q6.words") : t("qa.q6.word")}`
    : t("qa.q6.your.words");
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label={t("section.a.rejection")} count="06 / 07" fillPct={84} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>{t("q.label")} 06</strong> · {t("qa.q6.eyebrow")}</div>
          <h1 className="qc-q-title" dangerouslySetInnerHTML={{ __html: t("a.q6.text") }} />
          <p className="qc-q-sub">{t("qa.q6.sub")}</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-textcard">
          <textarea
            className="qc-textarea"
            value={value}
            onChange={(e) => setAnswers({ ...answers, rejection: e.target.value })}
            placeholder={t("a.q6.placeholder")}
          />
          <div className="qc-textarea-foot">
            <span className="qc-optional-pill">{t("qa.q6.optional.pill")}</span>
            <span>{wordLabel}</span>
          </div>
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q6" />
          <SideCard head={t("qa.side.whyHead")} icon="?"><p>{t("qa.q6.side.why")}</p></SideCard>
          <SideCard head={t("qa.side.privacyHead")} icon="✓" tone="privacy"><p>{t("sidebar.privacy")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qa.q6.back")} canContinue={true} ctaLabel={value.trim() ? t("qa.q6.cta.has") : t("qa.q6.cta.none")} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q7 · distance ════════════ */
function Q7({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const { t } = useI18n();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.distance ?? null;
  const activeId = hoverId || selected;
  const activeImg = useMemo(() => DISTANCES.find((d) => d.id === activeId)?.img || DISTANCES[0].img, [activeId]);
  return (
    <>
      <BgPhotos items={DISTANCES} activeImg={activeImg} />
      <div className="qc-sticky-head">
        <HeaderStrip label={t("section.a.distance")} count="07 / 07" fillPct={100} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>{t("q.label")} 07</strong> · {t("qa.q7.eyebrow")}</div>
          <h1 className="qc-q-title" dangerouslySetInnerHTML={{ __html: t("a.q7.text") }} />
          <p className="qc-q-sub">{t("qa.q7.sub")}</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options">
          {DISTANCES.map((d) => (
            <div {...pressable} key={d.id} data-cat={d.cat}
              className={"qc-option" + (selected === d.id ? " selected" : "")}
              onClick={() => setAnswers({ ...answers, distance: d.id })}
              onMouseEnter={() => setHoverId(d.id)} onMouseLeave={() => setHoverId(null)}>
              <div className="qc-option-ic">{d.ic}</div>
              <div className="qc-option-body">
                <div className="qc-option-name">{t(`a.q7.chips.${d.id}`)}</div>
                <div className="qc-option-meta">{t(`qa.dist.${d.id}.meta`)}</div>
              </div>
              <div className="qc-option-dur">{t(`qa.dist.${d.id}.dur`)}</div>
            </div>
          ))}
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q7" />
          <SideCard head={t("qa.side.whyHead")} icon="?"><p>{t("qa.q7.side.why")}</p></SideCard>
          <SideCard head={t("qa.side.privacyHead")} icon="✓" tone="privacy"><p>{t("sidebar.privacy")}</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel={t("qa.q7.back")} canContinue={!!selected} ctaLabel={selected ? t("qa.q7.cta.has") : t("qa.q7.cta.none")} onBack={onBack} onNext={onNext} />
    </>
  );
}
