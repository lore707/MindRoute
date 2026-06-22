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

import { useEffect, useMemo, useState } from "react";

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

function paceLabel(v: number) {
  if (v <= 33) return "Structured";
  if (v >= 67) return "Spontaneous";
  return "Balanced";
}

function ProfileCard({ answers, pending }: { answers: Answers; pending: string }) {
  const avoidCount = answers.avoid?.length ?? 0;
  return (
    <div className="qc-profile-card">
      <div className="qc-profile-head">Your profile so far</div>
      <ProfileRow label="Q1 · path" value={answers.path === "guided" ? "Guided discovery" : answers.path === "intentional" ? "Intentional route" : null} pending={pending === "Q1"} />
      <ProfileRow label="Q2 · where" value={answers.region ?? null} pending={pending === "Q2"} />
      <ProfileRow label="Q3 · trip type" value={answers.tripTypes?.join(" · ") ?? null} pending={pending === "Q3"} />
      <ProfileRow label="Q4 · defining moment" value={answers.defining?.join(" · ") ?? null} pending={pending === "Q4"} />
      <ProfileRow label="Q5 · pace" value={typeof answers.pace === "number" ? `${paceLabel(answers.pace)} · ${answers.pace}/100` : null} pending={pending === "Q5"} />
      <ProfileRow label="Q6 · emotional goals" value={answers.emotionalGoals?.join(" · ") ?? null} pending={pending === "Q6"} />
      <ProfileRow label="Q7 · avoid" value={avoidCount ? `${avoidCount} item${avoidCount > 1 ? "s" : ""}` : null} pending={pending === "Q7"} />
    </div>
  );
}

function ProfileRow({ label, value, pending }: { label: string; value: string | null; pending: boolean }) {
  if (!pending && !value) return null;
  return (
    <div className={"qc-profile-row" + (pending ? " pending" : "")}>
      <div className="qc-profile-row-l">{label}</div>
      <div className="qc-profile-row-v">{value ?? "awaiting your choice…"}</div>
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
  const sel = answers.path ?? null;
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label="The starting point" count="01 / 07" fillPct={14} />
        <div className="qc-q-head qc-center">
          <div className="qc-q-eyebrow"><strong>Question 01</strong> · the starting point</div>
          <h1 className="qc-q-title">What kind of traveler<br />are you, <em>today?</em></h1>
          <p className="qc-q-sub">Start from how you feel today. The rest of the journey will follow that direction.</p>
        </div>
      </div>
      {/* Il click su una card avanza subito: niente bottone Continua. */}
      <div className="qc-q1-cards">
        <PathCard kind="guided" selected={sel === "guided"} onClick={() => onPick("guided")} />
        <PathCard kind="intentional" selected={sel === "intentional"} onClick={() => onPick("intentional")} />
      </div>
      {hasBackFromQ1 && (
        <div className="qc-nav">
          <button className="qc-back" onClick={onBack}>← Back</button>
          <span />
        </div>
      )}
    </>
  );
}

function PathCard({ kind, selected, onClick }: { kind: "guided" | "intentional"; selected: boolean; onClick: () => void }) {
  if (kind === "guided") return (
    <div className={"qc-card qc-card-guided" + (selected ? " selected" : "")} onClick={onClick}>
      <div className="qc-card-img" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85&auto=format)" }} />
      <div className="qc-card-num">A</div>
      <div className="qc-card-body">
        <div className="qc-card-tag"><span className="dot" />Guided discovery</div>
        <h3>I don't know <em>where to go.</em></h3>
        <p className="qc-card-desc">If all you know is the feeling you are chasing, we'll turn it into a place that makes sense.</p>
        <div className="qc-card-foot">
          <div className="qc-card-foot-label">Let the destination emerge</div>
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
        <div className="qc-pin-label">Paris, France<small>48°51'N · 2°21'E</small></div>
      </div>
      <div className="qc-card-num">B</div>
      <div className="qc-card-body">
        <div className="qc-card-tag"><span className="dot" />Intentional route</div>
        <h3>I already have <em>a direction.</em></h3>
        <p className="qc-card-desc">If you have a place, a region, or even just a clear instinct — we'll shape the trip around it.</p>
        <div className="qc-card-foot">
          <div className="qc-card-foot-label">Build around my idea</div>
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
  const [hoverId, setHoverId] = useState<string | null>(null);
  const activeId = hoverId || REGIONS.find(r => r.name === answers.region)?.id;
  const activeRegion = REGIONS.find(r => r.id === activeId) || REGIONS[1];
  return (
    <>
      <BgPhotos items={REGIONS} activeImg={activeRegion.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label="Where" count="02 / 07" fillPct={28} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 02</strong> · the territory</div>
          <h1 className="qc-q-title">Where do you<br />want to <em>go?</em></h1>
          <p className="qc-q-sub">Choose the region that feels closest to you right now. We'll narrow it down to a specific destination later.</p>
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
                <div className="qc-option-name">{r.name}</div>
                <div className="qc-option-meta">{r.coords}</div>
              </div>
              <div className="qc-option-dur">{r.dur}</div>
            </div>
          ))}
        </div>
        <aside className="qc-side">
          <div className="qc-region-preview">
            <div className="qc-region-preview-img" style={{ backgroundImage: `url(${activeRegion.img})` }} />
            <div className="qc-region-preview-body">
              <div className="qc-region-preview-label">{hoverId ? "Sample destination" : "Your region"}</div>
              <div className="qc-region-preview-name">{activeRegion.name}</div>
              <div className="qc-region-preview-coords">{activeRegion.coords}</div>
            </div>
          </div>
          <ProfileCard answers={answers} pending="Q2" />
          <SideCard head="Why this question" icon="?"><p>Geographic constraint is the starting point. The more specific you are, the more precise your itinerary will be.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to question 1" canContinue={!!answers.region} ctaLabel={answers.region ? "Continue" : "Choose a region"} onBack={onBack} onNext={onNext} />
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
  const [hoverId, setHoverId] = useState<string | null>(null);
  const selected = answers.tripTypes ?? [];
  function toggle(name: string) {
    if (selected.includes(name)) setAnswers({ ...answers, tripTypes: selected.filter(x => x !== name) });
    else if (selected.length < 3) setAnswers({ ...answers, tripTypes: [...selected, name] });
  }
  const isFull = selected.length >= 3;
  const activeImg = useMemo(() => {
    const id = hoverId || (selected.length ? TYPES.find(t => t.name === selected[selected.length - 1])?.id : null);
    return TYPES.find(t => t.id === id)?.img || TYPES[1].img;
  }, [hoverId, selected]);
  return (
    <>
      <BgPhotos items={TYPES} activeImg={activeImg} />
      <div className="qc-sticky-head">
        <HeaderStrip label="Trip type" count="03 / 07" fillPct={42} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 03</strong> · the style</div>
          <h1 className="qc-q-title">What <em>type</em> of trip?</h1>
          <div className="qc-q-sub">
            Pick up to 3. The combination says more than any single label.
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 selected</div>
          </div>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-tcards">
          {TYPES.map(t => {
            const sel = selected.includes(t.name);
            const dis = !sel && isFull;
            const rank = sel ? selected.indexOf(t.name) + 1 : null;
            return (
              <div key={t.id}
                className={"qc-tcard" + (sel ? " selected" : "") + (dis ? " disabled" : "")}
                onClick={() => !dis && toggle(t.name)}
                onMouseEnter={() => setHoverId(t.id)} onMouseLeave={() => setHoverId(null)}>
                <div className="qc-tcard-img" style={{ backgroundImage: `url(${t.img})` }} />
                {sel && <div className="qc-tcard-num">{rank}</div>}
                <div className="qc-tcard-ic">{t.ic}</div>
                <div className="qc-tcard-body">
                  <div className="qc-tcard-name">{t.name}</div>
                  <div className="qc-tcard-meta">{t.meta}</div>
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCard answers={answers} pending="Q3" />
          <SideCard head="Why this question" icon="?"><p>The combination of styles matters more than any single label. Three answers tell us the rhythm of your trip.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to where" canContinue={selected.length > 0} ctaLabel={selected.length ? `Continue with ${selected.length}` : "Pick at least 1"} onBack={onBack} onNext={onNext} />
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
        <HeaderStrip label="Must-see & why" count="04 / 07" fillPct={56} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 04</strong> · the defining moment</div>
          <h1 className="qc-q-title">What moments would make<br />this trip truly <em>special?</em></h1>
          <div className="qc-q-sub">
            Pick up to 3. The combination tells us everything about what you're really chasing.
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 selected</div>
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
                  <div className="qc-option-name">{m.name}</div>
                  <div className="qc-option-meta">{m.meta}</div>
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
            <div className="qc-feeling-text">{(hoverId || selected.length > 0) ? activeM.feel : "Hover an answer to see what it means about you."}</div>
          </div>
          <ProfileCard answers={answers} pending="Q4" />
          <SideCard head="Why this question" icon="?"><p>What feels unmissable reveals your priorities. Why that moment matters reveals the emotional reason behind the whole trip.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to trip type" canContinue={selected.length > 0} ctaLabel={selected.length ? `Continue with ${selected.length}` : "Pick at least 1"} onBack={onBack} onNext={onNext} />
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
  const value = typeof answers.pace === "number" ? answers.pace : 50;
  function setValue(v: number) { setAnswers({ ...answers, pace: Math.max(0, Math.min(100, v)) }); }
  const stage = paceStage(value);
  return (
    <>
      <BgPhotos items={PACE_STAGES} activeImg={stage.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label="The rhythm" count="05 / 07" fillPct={70} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 05</strong> · the rhythm</div>
          <h1 className="qc-q-title">How do you want<br />the days to <em>flow?</em></h1>
          <p className="qc-q-sub">From a schedule that holds you to a sky that doesn't. There's no wrong answer — only your answer.</p>
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
              <input
                type="range" min={0} max={100} value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="qc-pace-input" aria-label="Trip pace"
              />
            </div>
            <div className="qc-pace-stops">
              <button className={"qc-pace-stop" + (value <= 33 ? " active" : "")}                 onClick={() => setValue(15)}><span>Structured</span><small>plan first</small></button>
              <button className={"qc-pace-stop" + (value > 33 && value < 67 ? " active" : "")}    onClick={() => setValue(50)}><span>Balanced</span><small>spine + space</small></button>
              <button className={"qc-pace-stop" + (value >= 67 ? " active" : "")}                 onClick={() => setValue(85)}><span>Spontaneous</span><small>decide later</small></button>
            </div>
          </div>
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{stage.feel}</div>
          </div>
          <ProfileCard answers={answers} pending="Q5" />
          <SideCard head="Why this question" icon="?"><p>Two travellers in the same place can have opposite trips. The rhythm is what makes one feel like yours.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to defining moment" canContinue={true} ctaLabel="Continue" onBack={onBack} onNext={onNext} />
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
        <HeaderStrip label="Emotional goals" count="06 / 07" fillPct={84} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 06</strong> · the feeling you're chasing</div>
          <h1 className="qc-q-title">What do you want<br />to <em>feel</em> on this trip?</h1>
          <div className="qc-q-sub">
            Pick up to 3. This is the emotional shape of your journey.
            <div className={"qc-pick-counter" + (isFull ? " full" : "")}><strong>{selected.length}</strong>/3 selected</div>
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
                  <div className="qc-option-name">{e.name}</div>
                  <div className="qc-option-meta">{e.meta}</div>
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
            <div className="qc-feeling-text">{(hoverId || selected.length > 0) ? activeE.feel : "Hover an answer to see what it really means."}</div>
          </div>
          <ProfileCard answers={answers} pending="Q6" />
          <SideCard head="Why this question" icon="?"><p>Where matters less than how it makes you feel. Three emotional goals lock the destination into the right register.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to rhythm" canContinue={selected.length > 0} ctaLabel={selected.length ? `Continue with ${selected.length}` : "Pick at least 1"} onBack={onBack} onNext={onNext} />
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
  const selected = answers.avoid ?? [];
  function toggle(name: string) {
    if (selected.includes(name)) setAnswers({ ...answers, avoid: selected.filter(x => x !== name) });
    else setAnswers({ ...answers, avoid: [...selected, name] });
  }
  return (
    <>
      <div className="qc-sticky-head">
        <HeaderStrip label="What to avoid" count="07 / 07" fillPct={100} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 07</strong> · the boundaries</div>
          <h1 className="qc-q-title">What would <em>ruin</em><br />this trip for you?</h1>
          <div className="qc-q-sub">
            Pick as many as you want — even none. Naming what you don't want sharpens the part you do.
            <div className="qc-pick-counter"><strong>{selected.length}</strong> selected</div>
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
                  <div className="qc-option-name">{a.name}</div>
                  <div className="qc-option-meta">{a.meta}</div>
                </div>
                <div className="qc-option-mark">
                  {isSel ? "Avoided" : ""}
                  <div className="qc-circle" />
                </div>
              </div>
            );
          })}
        </div>
        <aside className="qc-side">
          <ProfileCard answers={answers} pending="Q7" />
          <SideCard head="Why this question" icon="?"><p>A trip is also defined by what's <em>not</em> in it. Knowing your no-zones is half of crafting the right yes.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to emotional goals" canContinue={true} ctaLabel={selected.length ? "Continue" : "Skip — continue"} onBack={onBack} onNext={onNext} />
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
