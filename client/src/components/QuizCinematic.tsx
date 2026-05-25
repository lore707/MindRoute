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
  defining?: string;
};

type Step = 1 | 2 | 3 | 4;

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
    if (step === 4) {
      onComplete?.(answers);
      return;
    }
    setStep((step + 1) as Step);
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
          {step === 1 && <Q1 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} hasBackFromQ1={!!onBackFromQ1} />}
          {step === 2 && <Q2 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === 3 && <Q3 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
          {step === 4 && <Q4 answers={answers} setAnswers={setAnswers} onNext={next} onBack={back} />}
        </div>
      </div>
    </div>
  );
}

/* ════════════ shared bits ════════════ */
function BgGrain() {
  return <div className="qc-grain" />;
}

function StepRail({ step, onStep }: { step: Step; onStep: (n: number) => void }) {
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

function HeaderStrip({ label, count, fillPct }: { label: string; count: string; fillPct: number }) {
  return (
    <div className="qc-header-strip">
      <span className="qc-label">{label}</span>
      <div className="qc-progress-line"><div className="qc-fill" style={{ width: `${fillPct}%` }} /></div>
      <span className="qc-count">{count}</span>
    </div>
  );
}

function ProfileCard({ answers, pending }: { answers: Answers; pending: string }) {
  return (
    <div className="qc-profile-card">
      <div className="qc-profile-head">Your profile so far</div>
      <ProfileRow label="Q1 · path" value={answers.path === "guided" ? "Guided discovery" : answers.path === "intentional" ? "Intentional route" : null} pending={pending === "Q1"} />
      <ProfileRow label="Q2 · where" value={answers.region ?? null} pending={pending === "Q2"} />
      <ProfileRow label="Q3 · trip type" value={answers.tripTypes?.join(" · ") ?? null} pending={pending === "Q3"} />
      <ProfileRow label="Q4 · defining moment" value={answers.defining ?? null} pending={pending === "Q4"} />
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

function SideCard({ head, icon, children, tone }: { head: string; icon: string; children: React.ReactNode; tone?: "default" | "privacy" }) {
  return (
    <div className={"qc-side-card" + (tone === "privacy" ? " privacy" : "")}>
      <div className="qc-side-card-head"><div className="qc-ic">{icon}</div>{head}</div>
      {children}
    </div>
  );
}

function FooterNav({ backLabel, canContinue, ctaLabel, onBack, onNext }: { backLabel: string; canContinue: boolean; ctaLabel: string; onBack?: () => void; onNext: () => void }) {
  return (
    <div className="qc-nav">
      {onBack ? <button className="qc-back" onClick={onBack}>← {backLabel}</button> : <span />}
      <button className="qc-continue" disabled={!canContinue} onClick={onNext}>{ctaLabel} →</button>
    </div>
  );
}

/* ════════════ Q1 · path ════════════ */
function Q1({ answers, setAnswers, onNext, onBack, hasBackFromQ1 }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void; hasBackFromQ1: boolean }) {
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
      <div className="qc-q1-cards">
        <PathCard kind="guided" selected={sel === "guided"} onClick={() => setAnswers({ ...answers, path: "guided" })} />
        <PathCard kind="intentional" selected={sel === "intentional"} onClick={() => setAnswers({ ...answers, path: "intentional" })} />
      </div>
      <FooterNav
        backLabel="Back"
        canContinue={!!sel}
        ctaLabel={sel === "guided" ? "Continue with guided" : "Continue"}
        onBack={hasBackFromQ1 ? onBack : undefined}
        onNext={onNext}
      />
    </>
  );
}

function PathCard({ kind, selected, onClick }: { kind: "guided" | "intentional"; selected: boolean; onClick: () => void }) {
  if (kind === "guided") return (
    <div className={"qc-card qc-card-guided" + (selected ? " selected" : "")} onClick={onClick}>
      <div className="qc-card-img" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&auto=format)" }} />
      <div className="qc-card-collage">
        <div className="qc-collage-frame qc-cf-1" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1539020140153-e8c237425f3a?w=400&auto=format)" }} />
        <div className="qc-collage-frame qc-cf-2" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1518710843675-2540dd79065c?w=400&auto=format)" }} />
        <div className="qc-collage-frame qc-cf-3" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=400&auto=format)" }} />
      </div>
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
      <div className="qc-card-img" style={{ backgroundImage: "url(https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&auto=format)" }} />
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
  { id: "home", name: "Close to home", ic: "🏡", dur: "4h max · no flights", coords: "local · 1–2 timezones", img: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1400&auto=format" },
  { id: "europe", name: "Europe", ic: "🏰", dur: "Short haul · ~4h max", coords: "35°–70°N · 1–3h flight", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&auto=format" },
  { id: "asia", name: "Asia", ic: "⛩", dur: "Long haul · 8–12h", coords: "East & SE · 6–8 timezones", img: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?w=1400&auto=format" },
  { id: "americas", name: "Americas", ic: "🗽", dur: "Transcontinental · 10–14h", coords: "N & S · 4–10 timezones", img: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1400&auto=format" },
  { id: "africa", name: "Africa & Middle East", ic: "🌍", dur: "Medium / long · 4–10h", coords: "30°N–35°S · 2–4 timezones", img: "https://images.unsplash.com/photo-1539020140153-e8c237425f3a?w=1400&auto=format" },
  { id: "oceania", name: "Oceania", ic: "🐨", dur: "Long haul · 20h+ w/ stops", coords: "Pacific · 10+ timezones", img: "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1400&auto=format" },
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
  { id: "culture", name: "Culture & history", ic: "🏛", meta: "Museums · old towns", img: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=900&auto=format" },
  { id: "nature", name: "Nature & adventure", ic: "🌿", meta: "Hikes · open spaces", img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&auto=format" },
  { id: "food", name: "Food & wine", ic: "🍷", meta: "Local cuisine · markets", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=900&auto=format" },
  { id: "beach", name: "Beach & relax", ic: "🏖", meta: "Sea · slow days", img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&auto=format" },
  { id: "city", name: "City & nightlife", ic: "🌃", meta: "Energy · late hours", img: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1f?w=900&auto=format" },
  { id: "offgrid", name: "Off the grid", ic: "⛰", meta: "Remote · disconnected", img: "https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=900&auto=format" },
  { id: "road", name: "Road trip", ic: "🚐", meta: "Drive · stops along", img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=900&auto=format" },
  { id: "trekking", name: "Trekking & sports", ic: "🥾", meta: "Active · physical", img: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=900&auto=format" },
  { id: "wellness", name: "Wellness & spa", ic: "🌸", meta: "Reset · restorative", img: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=900&auto=format" },
  { id: "discovery", name: "Discovery, surprise me", ic: "✨", meta: "Let MindRoute pick", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&auto=format" },
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
  { id: "food", cat: "food", ic: "🍝", name: "Eating at local spots", meta: "Where only locals eat", feel: "You want to feel like you belong, not like a tourist.", img: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&auto=format" },
  { id: "explore", cat: "explore", ic: "🚶", name: "Getting lost in authentic neighborhoods", meta: "No destination, just walking", feel: "You want to feel the place living its own life, around you.", img: "https://images.unsplash.com/photo-1539020140153-e8c237425f3a?w=1400&auto=format" },
  { id: "iconic", cat: "iconic", ic: "🏛", name: "Seeing iconic landmarks", meta: "The classic, experienced differently", feel: "You want to feel the weight of history standing in front of you.", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1400&auto=format" },
  { id: "nature", cat: "nature", ic: "🌱", name: "Being immersed in nature", meta: "A day without pavement", feel: "You want to feel small in front of something bigger than you.", img: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&auto=format" },
  { id: "new", cat: "new", ic: "✨", name: "Living something completely new", meta: "Never done before, never forgotten", feel: "You want to feel alive — the kind of memory you'll keep for years.", img: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=1400&auto=format" },
  { id: "photo", cat: "photo", ic: "📸", name: "Photographing something extraordinary", meta: "Perfect light, perfect moment", feel: "You want one frame that tells everyone where you really were.", img: "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=1400&auto=format" },
  { id: "discover", cat: "discover", ic: "🗺", name: "Finding a place I didn't know existed", meta: "The discovery that makes the trip", feel: "You want to come back home with a secret nobody else has.", img: "https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=1400&auto=format" },
];

function Q4({ answers, setAnswers, onNext, onBack }: { answers: Answers; setAnswers: (a: Answers) => void; onNext: () => void; onBack: () => void }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const sel = answers.defining ?? null;
  const activeId = hoverId || MOMENTS.find(m => m.name === sel)?.id;
  const activeM = MOMENTS.find(m => m.id === activeId) || MOMENTS[3];
  return (
    <>
      <BgPhotos items={MOMENTS} activeImg={activeM.img} />
      <div className="qc-sticky-head">
        <HeaderStrip label="Must-see & why" count="04 / 07" fillPct={56} />
        <div className="qc-q-head">
          <div className="qc-q-eyebrow"><strong>Question 04</strong> · the defining moment</div>
          <h1 className="qc-q-title">What moment would make<br />this trip truly <em>special?</em></h1>
          <p className="qc-q-sub">One feeling, one image. The combination tells us everything about what you're really chasing.</p>
        </div>
      </div>
      <div className="qc-q-grid">
        <div className="qc-options">
          {MOMENTS.map(m => (
            <div key={m.id} data-cat={m.cat}
              className={"qc-option" + (sel === m.name ? " selected" : "")}
              onClick={() => setAnswers({ ...answers, defining: m.name })}
              onMouseEnter={() => setHoverId(m.id)} onMouseLeave={() => setHoverId(null)}>
              <div className="qc-option-ic">{m.ic}</div>
              <div className="qc-option-body">
                <div className="qc-option-name">{m.name}</div>
                <div className="qc-option-meta">{m.meta}</div>
              </div>
              <div className="qc-option-mark">
                {sel === m.name ? "Chosen" : ""}
                <div className="qc-circle" />
              </div>
            </div>
          ))}
        </div>
        <aside className="qc-side">
          <div className="qc-feeling-card">
            <div className="qc-feeling-ic">✦</div>
            <div className="qc-feeling-text">{(hoverId && activeM.feel) || (sel && activeM.feel) || "Hover an answer to see what it means about you."}</div>
          </div>
          <ProfileCard answers={answers} pending="Q4" />
          <SideCard head="Why this question" icon="?"><p>What feels unmissable reveals your priorities. Why that moment matters reveals the emotional reason behind the whole trip.</p></SideCard>
          <SideCard head="Privacy" icon="✓" tone="privacy"><p>Your answers shape your destinations. Never stored, never shared.</p></SideCard>
        </aside>
      </div>
      <FooterNav backLabel="Back to trip type" canContinue={!!sel} ctaLabel={sel ? "Continue" : "Pick a moment"} onBack={onBack} onNext={onNext} />
    </>
  );
}

/* ════════════ shared BgPhotos ════════════ */
function BgPhotos({ items, activeImg }: { items: Array<{ img: string }>; activeImg: string }) {
  return (
    <div className="qc-bg-stage">
      {items.map((it, i) => (
        <div key={i} className={"qc-bg-photo" + (activeImg === it.img ? " active" : "")} style={{ backgroundImage: `url(${it.img})` }} />
      ))}
    </div>
  );
}
