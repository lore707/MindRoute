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
 * UI is English-only to stay coherent with QuizCinematic. Selections are emitted
 * as stable IDs; Profiling.tsx maps them to i18n labels for the matching engine.
 *
 * Props
 *   - onComplete(answers)   → all 7 answers collected
 *   - onBackFromQ1?()       → back from Q1 (e.g. return to the path picker)
 *   - initialAnswers?       → pre-fill
 *   - initialStep? (1..7)   → starting step (default 1)
 * ─────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
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
const VIBES = [
  { id: "wild",         ic: "🔥", name: "Wild",          meta: "untamed, off the leash",         cat: "new" },
  { id: "quiet",        ic: "🌙", name: "Quiet",         meta: "low volume, deep rest",          cat: "explore" },
  { id: "chaotic",      ic: "🎲", name: "Chaotic",       meta: "messy, alive, unpredictable",    cat: "discover" },
  { id: "intimate",     ic: "🕯", name: "Intimate",      meta: "small, close, personal",         cat: "nature" },
  { id: "solitary",     ic: "🚶", name: "Solitary",      meta: "just you and the road",          cat: "explore" },
  { id: "regenerating", ic: "🌱", name: "Regenerating",  meta: "come back restored",             cat: "nature" },
  { id: "authentic",    ic: "🫀", name: "Authentic",     meta: "real over polished",             cat: "food" },
  { id: "quietluxury",  ic: "🥂", name: "Quiet luxury",  meta: "understated, refined",           cat: "iconic" },
  { id: "spiritual",    ic: "🕊",  name: "Spiritual",     meta: "inward, sacred, still",          cat: "iconic" },
  { id: "festive",      ic: "🎉", name: "Festive",       meta: "music, people, celebration",     cat: "new" },
  { id: "adventure",    ic: "⛰",  name: "Adventure",      meta: "adrenaline, the edge",           cat: "nature" },
  { id: "romantic",     ic: "🌹", name: "Romantic",      meta: "tender, made for two",           cat: "new" },
  { id: "cultural",     ic: "🏛", name: "Cultural",       meta: "history, art, meaning",          cat: "iconic" },
  { id: "explorative",  ic: "🧭", name: "Explorative",   meta: "curiosity-led, no map",          cat: "discover" },
];

const NEEDS = [
  { id: "disconnect", ic: "🔌", name: "Disconnect from routine", meta: "switch the daily mind off",       feel: "You need a real exit door from your everyday self.",          cat: "explore" },
  { id: "alive",      ic: "⚡", name: "Feel alive again",        meta: "wake something up",               feel: "You're chasing the spark that routine has dimmed.",           cat: "new" },
  { id: "slow",       ic: "🐌", name: "Slow down",               meta: "drop the pace, breathe",          feel: "You need permission to do less and feel more.",               cat: "nature" },
  { id: "surprise",   ic: "✨", name: "Be surprised",            meta: "let it catch you off guard",      feel: "You want to be caught off guard by something real.",          cat: "discover" },
  { id: "recharge",   ic: "🔋", name: "Recharge my energy",      meta: "come back with a full tank",      feel: "You want to land back home lighter than you left.",           cat: "food" },
  { id: "change",     ic: "🔄", name: "Change something",        meta: "shift, even slightly",            feel: "Something needs to move — even a small thing.",               cat: "photo" },
  { id: "celebrate",  ic: "🥂", name: "Celebrate",               meta: "mark the moment",                 feel: "There's a moment worth marking with a place.",                cat: "iconic" },
  { id: "findself",   ic: "🧭", name: "Find myself",             meta: "meet who you are far from home",  feel: "You want to meet the version of you that lives far away.",    cat: "explore" },
];

// Same 15 anti-patterns as Path B Q7 — ids match the chips.* i18n keys.
const DRAINS = [
  { id: "crowded",        ic: "👥", name: "Crowded places",                meta: "everyone with the same camera",   cat: "explore" },
  { id: "touristy",       ic: "🍽", name: "Touristy restaurants",          meta: "menu in five languages",          cat: "food" },
  { id: "resort",         ic: "🏨", name: "Resort hotels",                 meta: "the place stays outside the gate",cat: "new" },
  { id: "guided",         ic: "🚌", name: "Guided tours",                  meta: "earphone, headcount, no detours", cat: "iconic" },
  { id: "museums",        ic: "🏛", name: "Museums for hours",             meta: "marathon of plaques",             cat: "iconic" },
  { id: "nightlife",      ic: "🎵", name: "Nightlife and clubs",           meta: "lights, decibels, late",          cat: "new" },
  { id: "schedules",      ic: "📅", name: "Strict schedules",              meta: "by-the-minute itinerary",         cat: "discover" },
  { id: "transits",       ic: "🚆", name: "Long transits",                 meta: "more travel than trip",           cat: "explore" },
  { id: "mornings",       ic: "⏰", name: "Early mornings",                meta: "alarms on holiday? no",           cat: "discover" },
  { id: "smalltalk",      ic: "💬", name: "Small talk with strangers",     meta: "constant social effort",          cat: "explore" },
  { id: "unfamiliarfood", ic: "🍜", name: "Too unfamiliar food",           meta: "every meal a question mark",      cat: "food" },
  { id: "toomuchwalking", ic: "👟", name: "Too much walking",              meta: "10k steps before breakfast",      cat: "nature" },
  { id: "tooisolated",    ic: "🏝",  name: "Feeling too isolated",          meta: "no signal, no people, no help",   cat: "nature" },
  { id: "tooexpensive",   ic: "💸", name: "Spending without clear value",  meta: "paying for the label",            cat: "iconic" },
  { id: "toolong",        ic: "⏳", name: "Staying too long in one place",  meta: "one base, zero rotation",         cat: "discover" },
];

const VISUALS = [
  { id: "medina", name: "Ancient medina alley",   sub: "Warm stone, spice air, labyrinth calm",  img: "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1400&q=85&auto=format" },
  { id: "nordic", name: "Nordic cliffs & silence", sub: "Edge of the world, raw nature, solitude", img: "https://images.unsplash.com/photo-1511497584788-876760111969?w=1400&q=85&auto=format" },
  { id: "temple", name: "Temple at dusk",          sub: "Golden light, ancient ritual, inner quiet", img: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1400&q=85&auto=format" },
  { id: "desert", name: "Empty desert road",       sub: "Infinite horizon, freedom, no one watching", img: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1400&q=85&auto=format" },
];

const PACE_STAGES = [
  { id: "structured",  threshold: 33,  name: "Structured",  meta: "every day already mapped",        feel: "You want a clear plan so you can stop thinking and just feel.",       img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&q=85&auto=format" },
  { id: "balanced",    threshold: 66,  name: "Balanced",    meta: "the spine is set, the rest isn't", feel: "You want a structure to lean on and freedom to wander off it.",      img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85&auto=format" },
  { id: "spontaneous", threshold: 101, name: "Spontaneous", meta: "decide it in the morning",        feel: "You want the day to surprise you — no slot, no countdown, no map.",  img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85&auto=format" },
];
function paceStage(v: number) {
  return PACE_STAGES.find((s) => v <= s.threshold) ?? PACE_STAGES[1];
}

const DISTANCES = [
  { id: "close",     ic: "🏡", name: "Close to home",               meta: "a few hours, no jet lag",      dur: "≤4h · no flights", cat: "explore" },
  { id: "continent", ic: "✈️", name: "Same continent",              meta: "familiar, but elsewhere",      dur: "short haul",       cat: "iconic" },
  { id: "far",       ic: "🌏", name: "Far away",                    meta: "another world, another clock", dur: "long haul",        cat: "new" },
  { id: "anywhere",  ic: "🎲", name: "Anywhere, truly surprise me", meta: "maximum openness",             dur: "no limits",        cat: "discover" },
];

const vibeName = (id: string) => VIBES.find((v) => v.id === id)?.name ?? id;
const needName = (id: string) => NEEDS.find((n) => n.id === id)?.name ?? id;
const visualName = (id: string) => VISUALS.find((v) => v.id === id)?.name ?? id;
const distanceName = (id: string) => DISTANCES.find((d) => d.id === id)?.name ?? id;
function chaosLabel(v: number) {
  if (v <= 33) return "Structured";
  if (v >= 67) return "Spontaneous";
  return "Balanced";
}

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
  const vibes = answers.vibes ?? [];
  const needs = answers.needs ?? [];
  const drains = answers.drains ?? [];
  const visual = answers.visual ?? [];
  return (
    <div className="qc-profile-card">
      <div className="qc-profile-head">Your profile so far</div>
      <Row label="Q1 · style"   value={vibes.length ? vibes.map(vibeName).join(" · ") : null}   pending={pending === "Q1"} />
      <Row label="Q2 · need"    value={needs.length ? needs.map(needName).join(" · ") : null}   pending={pending === "Q2"} />
      <Row label="Q3 · drains"  value={drains.length ? `${drains.length} pattern${drains.length > 1 ? "s" : ""}` : null} pending={pending === "Q3"} />
      <Row label="Q4 · visual"  value={visual.length ? visual.map(visualName).join(" · ") : null} pending={pending === "Q4"} />
      <Row label="Q5 · chaos"   value={typeof answers.chaos === "number" ? `${chaosLabel(answers.chaos)} · ${answers.chaos}/100` : null} pending={pending === "Q5"} />
      <Row label="Q6 · filter"  value={answers.rejection?.trim() ? "noted" : null} pending={pending === "Q6"} />
      <Row label="Q7 · distance" value={answers.distance ? distanceName(answers.distance) : null} pending={pending === "Q7"} />
    </div>
  );
}
function Row({ label, value, pending }: { label: string; value: string | null; pending: boolean }) {
  if (!pending && !value) return null;
  return (
    <div className={"qc-profile-row" + (pending ? " pending" : "")}>
      <div className="qc-profile-row-l">{label}</div>
      <div className="qc-profile-row-v">{value ?? "awaiting your choice…"}</div>
    </div>
  );
}

/* ════════════ Q1 · style ════════════ */
function Q1({ answers, setAnswers, onNext, onBack, hasBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void; hasBack: boolean }) {
  const selected = answers.vibes ?? [];
  const isFull = selected.length >= 3;
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, vibes: selected.filter((x) => x !== id) });
    else if (selected.length < 3) setAnswers({ ...answers, vibes: [...selected, id] });
  }
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label="Your style" count="01 / 07" fillPct={14} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 01</strong> · the colour of the trip</div>
          <h1 className="qc-q-title">3 words for your<br /><em>dream trip</em></h1>
          <div className="qc-q-sub">
            Pick up to 3. The combination reveals who you are far more than any single one.
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 selected</div>
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
              <div key={v.id} data-cat={v.cat}
                className={"qc-option" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                onClick={() => !dis && toggle(v.id)}>
                <div className="qc-option-ic">{v.ic}</div>
                <div className="qc-option-body">
                  <div className="qc-option-name">{v.name}</div>
                  <div className="qc-option-meta">{v.meta}</div>
                </div>
                <div className="qc-option-mark">{sel ? `#${rank}` : ""}<div className="qc-circle" /></div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q1" />
          <SideCard head="Why this question" icon="?"><p>The three words together tell us much more than one choice ever could. This is where your way of travelling starts to show.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back" canContinue={selected.length > 0} ctaLabel={selected.length ? `Continue with ${selected.length}` : "Pick at least 1"} onBack={hasBack ? onBack : undefined} onNext={onNext} />
    </>
  );
}

/* ════════════ Q2 · need ════════════ */
function Q2({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.needs ?? [];
  const isFull = selected.length >= 3;
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, needs: selected.filter((x) => x !== id) });
    else if (selected.length < 3) setAnswers({ ...answers, needs: [...selected, id] });
  }
  const activeId = hoverId || (selected.length ? selected[selected.length - 1] : null);
  const activeN = NEEDS.find((n) => n.id === activeId);
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label="Your need" count="02 / 07" fillPct={28} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 02</strong> · the real compass</div>
          <h1 className="qc-q-title">What do you<br /><em>need</em> right now?</h1>
          <div className="qc-q-sub">
            Not what you want to do — what you need to feel. Pick up to 3.
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 selected</div>
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
                <div key={n.id} data-cat={n.cat}
                  className={"qc-option" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                  onClick={() => !dis && toggle(n.id)}
                  onMouseEnter={() => setHoverId(n.id)} onMouseLeave={() => setHoverId(null)}>
                  <div className="qc-option-ic">{n.ic}</div>
                  <div className="qc-option-body">
                    <div className="qc-option-name">{n.name}</div>
                    <div className="qc-option-meta">{n.meta}</div>
                  </div>
                  <div className="qc-option-mark">{sel ? `#${rank}` : ""}<div className="qc-circle" /></div>
                </div>
              );
            })}
          </div>
          <div className="qc-note">
            <div className="qc-note-label">Want to tell us more? <em>(optional)</em></div>
            <input className="qc-note-input" type="text" value={answers.needsNote ?? ""}
              onChange={(e) => setAnswers({ ...answers, needsNote: e.target.value })}
              placeholder="In your own words — the life behind the need…" />
          </div>
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{activeN ? activeN.feel : "Hover an answer to see what it means about you."}</div>
          </div>
          <ProfileCardA answers={answers} pending="Q2" />
          <SideCard head="Why this question" icon="?"><p>The gap between how you're living now and what you need is the real compass — it tells us not just where to send you, but why that trip makes sense right now.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to your style" canContinue={selected.length > 0} ctaLabel={selected.length ? `Continue with ${selected.length}` : "Pick at least 1"} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q3 · drains ════════════ */
function Q3({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const selected = answers.drains ?? [];
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, drains: selected.filter((x) => x !== id) });
    else setAnswers({ ...answers, drains: [...selected, id] });
  }
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label="Drains" count="03 / 07" fillPct={42} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 03</strong> · the boundaries</div>
          <h1 className="qc-q-title">What <em>drains you</em><br />when you travel?</h1>
          <div className="qc-q-sub">
            What you reject says more than what you want. Pick as many as you feel — even none.
            <div className="qc-pick-counter"><strong>{selected.length}</strong> selected</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div>
          <div className="qc-options qc-options-twocol">
            {DRAINS.map((d) => {
              const sel = selected.includes(d.id);
              return (
                <div key={d.id} data-cat={d.cat}
                  className={"qc-option" + (sel ? " selected" : "")}
                  onClick={() => toggle(d.id)}>
                  <div className="qc-option-ic">{d.ic}</div>
                  <div className="qc-option-body">
                    <div className="qc-option-name">{d.name}</div>
                    <div className="qc-option-meta">{d.meta}</div>
                  </div>
                  <div className="qc-option-mark">{sel ? "Drains" : ""}<div className="qc-circle" /></div>
                </div>
              );
            })}
          </div>
          <div className="qc-note">
            <div className="qc-note-label">Anything else that kills the vibe? <em>(optional)</em></div>
            <input className="qc-note-input" type="text" value={answers.drainsNote ?? ""}
              onChange={(e) => setAnswers({ ...answers, drainsNote: e.target.value })}
              placeholder="Something specific that ruins a trip for you…" />
          </div>
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q3" />
          <SideCard head="Why this question" icon="?"><p>Anti-patterns are identity markers. The combinations define the hard boundaries of your trip — what it can never be.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to your need" canContinue={true} ctaLabel={selected.length ? "Continue" : "Skip — continue"} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q4 · visual pull ════════════ */
function Q4({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.visual ?? [];
  const isFull = selected.length >= 2;
  function toggle(id: string) {
    if (selected.includes(id)) setAnswers({ ...answers, visual: selected.filter((x) => x !== id) });
    else if (selected.length < 2) setAnswers({ ...answers, visual: [...selected, id] });
  }
  const activeId = hoverId || (selected.length ? selected[selected.length - 1] : null);
  const activeImg = useMemo(() => VISUALS.find((v) => v.id === activeId)?.img || VISUALS[0].img, [activeId]);
  return (
    <>
      <BgPhotos items={VISUALS} activeImg={activeImg} />
      <div className="qc-sticky-head">
        <HeaderStrip label="Visual pull" count="04 / 07" fillPct={56} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 04</strong> · the visual instinct</div>
          <h1 className="qc-q-title">Which of these<br /><em>pulls you in?</em></h1>
          <div className="qc-q-sub">
            Don't think. Just feel. Pick up to 2.
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/2 selected</div>
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
                  <div className="qc-tcard-name">{v.name}</div>
                  <div className="qc-tcard-meta">{v.sub}</div>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q4" />
          <SideCard head="Why this question" icon="?"><p>Visual attraction bypasses rational filters. The image you choose reveals your aesthetic soul before words get involved.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to drains" canContinue={selected.length > 0} ctaLabel={selected.length ? `Continue with ${selected.length}` : "Pick at least 1"} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q5 · chaos ════════════ */
function Q5({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const value = typeof answers.chaos === "number" ? answers.chaos : 50;
  function setValue(v: number) { setAnswers({ ...answers, chaos: Math.max(0, Math.min(100, v)) }); }
  const stage = paceStage(value);
  return (
    <>
      <BgPhotos items={PACE_STAGES} activeImg={stage.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label="Chaos level" count="05 / 07" fillPct={70} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 05</strong> · structure & chaos</div>
          <h1 className="qc-q-title">Where do you fall between<br /><em>structure and chaos?</em></h1>
          <p className="qc-q-sub">Your relationship with the unexpected changes the kind of trip that nourishes you instead of draining you.</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-pace-stage">
          <div className="qc-pace-current">
            <div className="qc-pace-label">{stage.name}</div>
            <div className="qc-pace-meta">{stage.meta}</div>
          </div>
          <div className="qc-pace-slider">
            <div className="qc-pace-track">
              <div className="qc-pace-fill" style={{ width: `${value}%` }} />
              <div className="qc-pace-knob" style={{ left: `${value}%` }} />
              <input type="range" min={0} max={100} value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="qc-pace-input" aria-label="Chaos level" />
            </div>
            <div className="qc-pace-stops">
              <button className={"qc-pace-stop" + (value <= 33 ? " active" : "")} onClick={() => setValue(15)}><span>Structured</span><small>plan first</small></button>
              <button className={"qc-pace-stop" + (value > 33 && value < 67 ? " active" : "")} onClick={() => setValue(50)}><span>Balanced</span><small>spine + space</small></button>
              <button className={"qc-pace-stop" + (value >= 67 ? " active" : "")} onClick={() => setValue(85)}><span>Spontaneous</span><small>figure it out there</small></button>
            </div>
          </div>
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{stage.feel}</div>
          </div>
          <ProfileCardA answers={answers} pending="Q5" />
          <SideCard head="Why this question" icon="?"><p>Two travellers in the same place can have opposite trips. Your tolerance for chaos is what makes one of them feel like yours.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to visual pull" canContinue={true} ctaLabel="Continue" onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q6 · identity filter (text) ════════════ */
function Q6({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const value = answers.rejection ?? "";
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label="Identity filter" count="06 / 07" fillPct={84} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 06</strong> · what you reject</div>
          <h1 className="qc-q-title">A place everyone loves<br />but that <em>does nothing for you?</em></h1>
          <p className="qc-q-sub">No wrong answers. Even "I don't know" tells us something about you.</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-textcard">
          <textarea
            className="qc-textarea"
            value={value}
            onChange={(e) => setAnswers({ ...answers, rejection: e.target.value })}
            placeholder={'E.g. The Maldives — too perfect, too still. Or New York — never felt the pull. Or Barcelona in summer — too chaotic for me.'}
          />
          <div className="qc-textarea-foot">
            <span className="qc-optional-pill">✦ Optional · skip if nothing comes to mind</span>
            <span>{words ? `${words} word${words > 1 ? "s" : ""}` : "your words"}</span>
          </div>
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q6" />
          <SideCard head="Why this question" icon="?"><p>What you reject defines you almost as much as what you desire. It's a direct way to learn what could never feel like the right trip for you.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to chaos level" canContinue={true} ctaLabel={value.trim() ? "Continue" : "Skip — continue"} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ Q7 · distance ════════════ */
function Q7({ answers, setAnswers, onNext, onBack }: { answers: AnswersA; setAnswers: (a: AnswersA) => void; onNext: () => void; onBack: () => void }) {
  const selected = answers.distance ?? null;
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label="Distance" count="07 / 07" fillPct={100} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 07</strong> · comfort & rupture</div>
          <h1 className="qc-q-title">How <em>far</em><br />do you want to go?</h1>
          <p className="qc-q-sub">Close is comfort. Far is transformation. "Anywhere" is maximum openness — let us surprise you.</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options">
          {DISTANCES.map((d) => (
            <div key={d.id} data-cat={d.cat}
              className={"qc-option" + (selected === d.id ? " selected" : "")}
              onClick={() => setAnswers({ ...answers, distance: d.id })}>
              <div className="qc-option-ic">{d.ic}</div>
              <div className="qc-option-body">
                <div className="qc-option-name">{d.name}</div>
                <div className="qc-option-meta">{d.meta}</div>
              </div>
              <div className="qc-option-dur">{d.dur}</div>
            </div>
          ))}
        </div>
        <aside className="qc-side">
          <ProfileCardA answers={answers} pending="Q7" />
          <SideCard head="Why this question" icon="?"><p>Distance reveals your comfort zone and your desire for rupture. It's the last constraint we need before we start matching places to you.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to identity filter" canContinue={!!selected} ctaLabel={selected ? "Continue" : "Choose a distance"} onBack={onBack} onNext={onNext} />
    </>
  );
}
