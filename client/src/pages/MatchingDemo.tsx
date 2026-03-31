import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";

const SCENARIOS_IT = [
  {
    chips: [
      { label: "Come vuoi sentirti?", options: ["Selvaggio","Silenzioso","Caotico","Autentico","Rigenerante","Festoso"], active: [1, 4] },
      { label: "Di cosa hai bisogno?", options: ["Staccare dalla routine","Sentirmi vivo","Rallentare","Sorprendermi"], active: [0, 2] },
      { label: "Cosa eviti?", options: ["Luoghi affollati","Hotel resort","Programmi rigidi","Visite guidate"], active: [0, 2] },
      { label: "Con chi viaggi?", options: ["Solo","Partner","Amici","Famiglia"], active: [0] },
      { label: "Dove vuoi andare?", options: ["Europa","Asia","Americhe","Ovunque"], active: [0] },
    ],
    dest: "Ikaria, Grecia",
    img: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=700&q=75",
    why: "Hai scelto 'silenzioso' e 'staccare dalla routine' — segnali che non cerchi una vacanza ma un azzeramento. Ikaria è l'isola dove i bar aprono a mezzanotte e il tempo smette di avere senso.",
    pills: ["🤫 Silenzioso", "🔌 Staccare", "✈️ Europa solo"],
  },
  {
    chips: [
      { label: "Come vuoi sentirti?", options: ["Selvaggio","Silenzioso","Caotico","Autentico","Rigenerante","Festoso"], active: [2, 5] },
      { label: "Di cosa hai bisogno?", options: ["Staccare dalla routine","Sentirmi vivo","Rallentare","Sorprendermi"], active: [1, 3] },
      { label: "Cosa eviti?", options: ["Luoghi affollati","Hotel resort","Programmi rigidi","Musei"], active: [1] },
      { label: "Con chi viaggi?", options: ["Solo","Partner","Amici","Famiglia"], active: [2] },
      { label: "Dove vuoi andare?", options: ["Europa","Asia","Americhe","Ovunque"], active: [1] },
    ],
    dest: "Chiang Mai, Thailandia",
    img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=700&q=75",
    why: "Hai scelto 'festoso' e 'sentirmi vivo' con gli amici. Chiang Mai ha tutto: templi nascosti tra gli alberi, street food esplosivo e una vita notturna che inizia nel mercato.",
    pills: ["⚡ Festoso", "👥 Amici", "🌏 Asia"],
  },
  {
    chips: [
      { label: "Come vuoi sentirti?", options: ["Selvaggio","Romantico","Intimo","Autentico","Lusso discreto","Esplorativo"], active: [1, 2] },
      { label: "Di cosa hai bisogno?", options: ["Staccare dalla routine","Sentirmi vivo","Rallentare","Festeggiare"], active: [3] },
      { label: "Cosa eviti?", options: ["Luoghi affollati","Hotel resort","Programmi rigidi","Visite guidate"], active: [0] },
      { label: "Con chi viaggi?", options: ["Solo","Partner","Amici","Famiglia"], active: [1] },
      { label: "Dove vuoi andare?", options: ["Europa","Asia","Americhe","Ovunque"], active: [0] },
    ],
    dest: "Alentejo, Portogallo",
    img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=700&q=75",
    why: "Hai scelto 'romantico' e 'festeggiare' in coppia. L'Alentejo ha vigneti infiniti, quintas del 1600 trasformate in hotel di design e cene a lume di candela sotto le stelle.",
    pills: ["💑 Romantico", "🥂 Festeggiare", "🏰 Europa coppia"],
  },
];

const SCENARIOS_EN = [
  {
    chips: [
      { label: "How do you want to feel?", options: ["Wild","Quiet","Chaotic","Authentic","Regenerating","Festive"], active: [1, 4] },
      { label: "What do you need?", options: ["Disconnect","Feel alive","Slow down","Be surprised"], active: [0, 2] },
      { label: "What do you avoid?", options: ["Crowded places","Resorts","Strict schedules","Guided tours"], active: [0, 2] },
      { label: "Who are you traveling with?", options: ["Solo","Partner","Friends","Family"], active: [0] },
      { label: "Where do you want to go?", options: ["Europe","Asia","Americas","Anywhere"], active: [0] },
    ],
    dest: "Ikaria, Greece",
    img: "https://images.unsplash.com/photo-1504893524553-b855bce32c67?w=700&q=75",
    why: "You chose 'quiet' and 'disconnect' — signals that you need a reset, not just a vacation. Ikaria is the island where bars open at midnight and time stops making sense.",
    pills: ["🤫 Quiet", "🔌 Disconnect", "✈️ Europe solo"],
  },
  {
    chips: [
      { label: "How do you want to feel?", options: ["Wild","Quiet","Chaotic","Authentic","Regenerating","Festive"], active: [2, 5] },
      { label: "What do you need?", options: ["Disconnect","Feel alive","Slow down","Be surprised"], active: [1, 3] },
      { label: "What do you avoid?", options: ["Crowded places","Resorts","Strict schedules","Museums"], active: [1] },
      { label: "Who are you traveling with?", options: ["Solo","Partner","Friends","Family"], active: [2] },
      { label: "Where do you want to go?", options: ["Europe","Asia","Americas","Anywhere"], active: [1] },
    ],
    dest: "Chiang Mai, Thailand",
    img: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=700&q=75",
    why: "You chose 'festive' and 'feel alive' with friends. Chiang Mai has it all: hidden temples, explosive street food and nightlife that starts in the market.",
    pills: ["⚡ Festive", "👥 Friends", "🌏 Asia"],
  },
  {
    chips: [
      { label: "How do you want to feel?", options: ["Wild","Romantic","Intimate","Authentic","Quiet luxury","Explorative"], active: [1, 2] },
      { label: "What do you need?", options: ["Disconnect","Feel alive","Slow down","Celebrate"], active: [3] },
      { label: "What do you avoid?", options: ["Crowded places","Resorts","Strict schedules","Guided tours"], active: [0] },
      { label: "Who are you traveling with?", options: ["Solo","Partner","Friends","Family"], active: [1] },
      { label: "Where do you want to go?", options: ["Europe","Asia","Americas","Anywhere"], active: [0] },
    ],
    dest: "Alentejo, Portugal",
    img: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=700&q=75",
    why: "You chose 'romantic' and 'celebrate' as a couple. Alentejo has endless vineyards, 1600s quintas turned into design hotels and candlelit dinners under the stars.",
    pills: ["💑 Romantic", "🥂 Celebrate", "🏰 Europe couple"],
  },
];

function useTypewriter(text: string, speed = 18, active = false) {
  const [displayed, setDisplayed] = useState("");
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!active) { setDisplayed(""); indexRef.current = 0; return; }
    indexRef.current = 0;
    setDisplayed("");
    function step() {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current < text.length) {
        ref.current = setTimeout(step, speed);
      }
    }
    ref.current = setTimeout(step, 80);
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [text, active]);

  return displayed;
}

export function MatchingDemo() {
  const { lang } = useI18n();
  const scenarios = lang === "it" ? SCENARIOS_IT : SCENARIOS_EN;

  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [phase, setPhase] = useState<"idle" | "chips" | "result">("idle");
  const [visibleBlocks, setVisibleBlocks] = useState<number[]>([]);
  const [activeChips, setActiveChips] = useState<Record<number, number[]>>({});
  const [showResult, setShowResult] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showPills, setShowPills] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const s = scenarios[scenarioIdx];
  const destNameTyped = useTypewriter(s.dest, 45, showResult);
  const whyTyped = useTypewriter(s.why, 16, showWhy);

  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }

  function schedule(delay: number, fn: () => void) {
    const id = setTimeout(fn, delay);
    timers.current.push(id);
  }

  function startDemo(idx = scenarioIdx) {
    clearTimers();
    setVisibleBlocks([]);
    setActiveChips({});
    setShowResult(false);
    setShowWhy(false);
    setShowPills(false);
    setShowReplay(false);
    setPhase("chips");

    const sc = scenarios[idx];
    let delay = 100;

    sc.chips.forEach((block, bi) => {
      schedule(delay, () => setVisibleBlocks(prev => [...prev, bi]));
      delay += 280;
      block.active.forEach((ai, i2) => {
        schedule(delay + i2 * 180, () => {
          setActiveChips(prev => ({
            ...prev,
            [bi]: [...(prev[bi] || []), ai],
          }));
        });
      });
      delay += block.active.length * 180 + 160;
    });

    schedule(delay, () => setPhase("result"));
    delay += 500;
    schedule(delay, () => setShowResult(true));
    delay += sc.dest.length * 45 + 400;
    schedule(delay, () => setShowWhy(true));
    delay += sc.why.length * 16 + 300;
    schedule(delay, () => { setShowPills(true); setShowReplay(true); });
  }

  function handleReplay() {
    const next = (scenarioIdx + 1) % scenarios.length;
    setScenarioIdx(next);
    startDemo(next);
  }

  useEffect(() => {
    startDemo(0);
    return clearTimers;
  }, [lang]);

  return (
<div style={{ background: "#111827", borderRadius: 20, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", fontFamily: "system-ui, sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1px 1fr", minHeight: 560 }}>

        {/* LEFT — chips */}
        <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", gap: 0, background: "#131B27" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 20 }}>
            {lang === "it" ? "Le tue risposte" : "Your answers"}
          </div>

          {s.chips.map((block, bi) => (
            <div key={bi} style={{ marginBottom: 18, opacity: visibleBlocks.includes(bi) ? 1 : 0, transform: visibleBlocks.includes(bi) ? "translateY(0)" : "translateY(8px)", transition: "all 0.45s ease" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 7, fontWeight: 500 }}>{block.label}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {block.options.map((opt, oi) => {
                  const isActive = (activeChips[bi] || []).includes(oi);
                  return (
                   <span key={oi} style={{ padding: "5px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500, background: isActive ? "rgba(233,69,96,0.18)" : "rgba(255,255,255,0.08)", border: `1px solid ${isActive ? "rgba(233,69,96,0.5)" : "rgba(255,255,255,0.14)"}`, color: isActive ? "#E94560" : "rgba(255,255,255,0.6)", transition: "all 0.35s ease", whiteSpace: "nowrap" }}>
                      {opt}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}

          {phase === "result" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto", paddingTop: 8, opacity: phase === "result" ? 1 : 0, transition: "opacity 0.6s ease" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(233,69,96,0.3)", position: "relative" }}>
                <div style={{ position: "absolute", right: -1, top: -3, width: 0, height: 0, borderLeft: "6px solid rgba(233,69,96,0.6)", borderTop: "3px solid transparent", borderBottom: "3px solid transparent" }} />
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(233,69,96,0.6)", whiteSpace: "nowrap" }}>
                {lang === "it" ? "MindRoute analizza" : "MindRoute matches"}
              </div>
              <div style={{ flex: 1, height: 1, background: "rgba(233,69,96,0.3)" }} />
            </div>
          )}
        </div>

      {/* DIVIDER */}
        <div style={{ background: "rgba(255,255,255,0.08)" }} />

       {/* RIGHT — result */}
        <div style={{ padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "center", background: "#0E1520" }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 16, opacity: showResult ? 1 : 0, transition: "opacity 0.5s ease" }}>
            {lang === "it" ? "Il tuo match psicologico" : "Your psychological match"}
          </div>

          {/* Dest card */}
          <div style={{ borderRadius: 14, overflow: "hidden", position: "relative", opacity: showResult ? 1 : 0, transform: showResult ? "scale(1) translateY(0)" : "scale(0.95) translateY(10px)", transition: "all 0.7s cubic-bezier(0.22,1,0.36,1)", marginBottom: 12 }}>
            <img src={s.img} alt={s.dest} style={{ width: "100%", height: 130, objectFit: "cover", display: "block", transition: "opacity 0.5s" }} onError={(e) => (e.currentTarget.style.display = "none")} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg,transparent 30%,rgba(8,11,18,0.92))", display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 13 }}>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#E94560", background: "rgba(233,69,96,0.18)", border: "1px solid rgba(233,69,96,0.35)", borderRadius: 4, padding: "2px 7px", display: "inline-block", marginBottom: 5, width: "fit-content" }}>
                {lang === "it" ? "La tua meta" : "Your destination"}
              </div>
              <div style={{ fontSize: 19, fontWeight: 600, color: "white", letterSpacing: -0.4, lineHeight: 1.15, fontFamily: "Georgia, serif", minHeight: 24 }}>
                {destNameTyped}
                {showResult && destNameTyped.length < s.dest.length && <span style={{ display: "inline-block", width: 2, height: 18, background: "white", marginLeft: 2, animation: "blink 1s step-end infinite", verticalAlign: "middle" }} />}
              </div>
            </div>
          </div>

          {/* WhyYours */}
          <div style={{ background: "rgba(233,69,96,0.07)", border: "1px solid rgba(233,69,96,0.18)", borderLeft: "3px solid #E94560", borderRadius: 10, padding: "10px 12px", marginBottom: 12, opacity: showWhy ? 1 : 0, transform: showWhy ? "translateY(0)" : "translateY(6px)", transition: "all 0.5s ease" }}>
            <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#E94560", marginBottom: 5 }}>
              {lang === "it" ? "Perché questo posto ti somiglia" : "Why this place feels like yours"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, fontStyle: "italic", minHeight: 16 }}>
              {whyTyped}
              {showWhy && whyTyped.length < s.why.length && <span style={{ display: "inline-block", width: 2, height: 12, background: "rgba(233,69,96,0.7)", marginLeft: 1, animation: "blink 1s step-end infinite", verticalAlign: "middle" }} />}
            </div>
          </div>

          {/* Pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12, opacity: showPills ? 1 : 0, transition: "opacity 0.5s ease" }}>
            {s.pills.map((p, i) => (
              <span key={i} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.09)" }}>{p}</span>
            ))}
          </div>

          {/* Replay */}
          {showReplay && (
            <button onClick={handleReplay} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.3)", background: "transparent", border: "none", cursor: "pointer", padding: 0, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#E94560")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
              {lang === "it" ? `Prossimo profilo (${((scenarioIdx + 1) % scenarios.length) + 1}/${scenarios.length})` : `Next profile (${((scenarioIdx + 1) % scenarios.length) + 1}/${scenarios.length})`}
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}`}</style>
    </div>
  );
}
