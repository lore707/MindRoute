import React, { useEffect, useRef, useState } from "react";
import { MatchingDemo } from "./MatchingDemo";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import WorldMap, { DESTINATIONS } from "@/components/WorldMap";
import { useSectionVariant, type SectionVariant } from "@/lib/sectionContext";

const Logo = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
    <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
    <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
    <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
    <ellipse cx="60" cy="60" rx="5" ry="6" fill="white"/>
    <path d="M58 66L60 108L62 66" fill="#E94560" opacity="0.7"/>
    <circle cx="60" cy="48" r="3.5" fill="white"/>
  </svg>
);

export default function Landing() {
  const { t, lang } = useI18n();
  const [user, setUser] = React.useState<any>(null);
  const [itineraryCount, setItineraryCount] = useState(0);
  const [displayCount, setDisplayCount] = useState(0);
  const [liveNote, setLiveNote] = useState<{ flag: string; city: string } | null>(null);
  const heroRef = useRef(null);
  const howRef = useRef(null);
  const diffRef = useRef(null);
  const ctaRef = useRef(null);
  const howInView = useInView(howRef, { once: true, margin: "-100px" });
  const diffInView = useInView(diffRef, { once: true, margin: "-100px" });
  const ctaInView = useInView(ctaRef, { once: true, margin: "-100px" });

  React.useEffect(() => {
    fetch("/api/auth/me").then(r => r.ok ? r.json() : null).then(setUser).catch(() => setUser(null));
  }, []);

  // Stats counter
  useEffect(() => {
    const fetchStats = () => {
      fetch("/api/stats")
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data?.itineraryCount != null) setItineraryCount(data.itineraryCount); })
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (itineraryCount === 0) return;
    const end = itineraryCount;
    const duration = 2200;
    const startTime = performance.now();
    const startVal = displayCount;
    const tick = (now: number) => {
      const p = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayCount(Math.floor(startVal + (end - startVal) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [itineraryCount]);

  // Live notification per sezione mappa
  useEffect(() => {
    const shuffled = [...DESTINATIONS].sort(() => Math.random() - 0.5);
    let idx = 0;
    const show = () => {
      const dest = shuffled[idx % shuffled.length];
      idx++;
      setLiveNote({ flag: dest.flag, city: lang === "it" ? dest.name : dest.nameEn });
      setTimeout(() => setLiveNote(null), 2800);
    };
    const first = setTimeout(show, 2200);
    const interval = setInterval(show, 5000);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [lang]);

  const startHref = user ? "/profiling" : "/auth/google";

  const heroSectionRef = useRef(null);
  const mapContainerRef = useRef(null);
  const howContainerRef = useRef(null);
  const socialRef = useRef(null);
  const diffContainerRef = useRef(null);
  const { setVariant } = useSectionVariant();

  useEffect(() => {
    const sections: [React.MutableRefObject<any>, SectionVariant][] = [
      [heroSectionRef, "hero"],
      [mapContainerRef, "map"],
      [howContainerRef, "content"],
      [socialRef,       "content"],
      [diffContainerRef,"content"],
      [ctaRef,          "cta"],
    ];
    // rootMargin "-35% 0px -35% 0px" → la sezione è "attiva" solo quando
    // occupa la fascia centrale del 30% del viewport. Una sezione per volta.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const found = sections.find(([ref]) => ref.current === entry.target);
            if (found) setVariant(found[1]);
          }
        });
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
    );
    sections.forEach(([ref]) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
  }, [setVariant]);
  return (
<div className="landing-transparent-bg" style={{ color: "white", fontFamily: "'Georgia', serif", overflowX: "hidden", minHeight: "100vh" }}>     <style>{`
      @keyframes heroMesh { 0%,100%{opacity:0.015} 50%{opacity:0.03} }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse { 0%,100% { opacity:0.15; } 50% { opacity:0.28; } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes livePulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        .fadeup-1 { animation: fadeUp 0.9s ease both; }
        .fadeup-2 { animation: fadeUp 0.9s 0.15s ease both; }
        .fadeup-3 { animation: fadeUp 0.9s 0.3s ease both; }
        .fadeup-4 { animation: fadeUp 0.9s 0.45s ease both; }
        .cta-btn { transition: all 0.25s ease; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 20px 50px rgba(233,69,96,0.35) !important; }
        .diff-row:hover { background: rgba(255,255,255,0.03) !important; }
        .step-card { transition: all 0.25s ease; }
        .step-card:hover { border-color: rgba(233,69,96,0.35) !important; transform: translateY(-2px); }
        .live-dot { animation: livePulse 1.5s ease-in-out infinite; }
        @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes heroGlow { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.1);opacity:1} }
        @keyframes heroOrbit { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes heroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes heroSpin { 0%{transform:translateY(0) rotate(0deg) scale(1)} 25%{transform:translateY(-4px) rotate(180deg) scale(0.88)} 60%{transform:translateY(0) rotate(370deg) scale(1.06)} 80%{transform:translateY(0) rotate(355deg) scale(1.02)} 100%{transform:translateY(0) rotate(360deg) scale(1)} }
        @keyframes heroBeam { 0%{left:-100%;opacity:0} 10%{opacity:1} 40%{left:160%;opacity:0} 100%{left:160%;opacity:0} }
      @media (max-width: 768px) {
          .steps-grid { grid-template-columns: 1fr !important; }
          .diff-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .output-strip { flex-direction: column !important; gap: 16px !important; }
          .hero-h1 { font-size: clamp(36px, 9vw, 72px) !important; }
          .diff-table { font-size: 13px !important; }
          .diff-table-cell { padding: 12px 12px !important; }
        }
        @media (max-width: 480px) {
          .hero-stats { flex-direction: column !important; gap: 16px !important; align-items: center !important; }
        }
                @media (max-width: 1024px) {
          .hero-section-inner { padding-top: 20px !important; }
        }
        @media (max-width: 768px) {
          .hero-section-inner { padding-top: 0px !important; }
        }

      `}</style>

     {/* ── HERO ──────────────────────────────────────────── */}
  <div ref={heroSectionRef} style={{ position: "relative" }}>
<motion.section style={{ minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(80px, 10vh, 120px) 24px 60px", overflow: "hidden" }}>
<div style={{ position:"absolute", top:"18%", left:"50%", transform:"translateX(-50%)", width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle, rgba(180,30,60,0.55) 0%, rgba(140,20,45,0.30) 30%, rgba(80,10,25,0.12) 60%, transparent 75%)", pointerEvents:"none", filter:"blur(18px)" }} />
        <div style={{ position:"absolute", top:"24%", left:"50%", transform:"translateX(-50%)", width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle, rgba(233,69,96,0.45) 0%, transparent 70%)", pointerEvents:"none", filter:"blur(8px)" }} />
             <motion.div className="hero-section-inner" style={{ maxWidth: 960, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1, paddingTop: 20 }}>

       {/* Logo premium 3D */}
          <div className="fadeup-1" style={{ marginBottom: 32 }}>
            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
              <div
                id="hero-logo-wrap"
                style={{ position: "relative", width: 110, height: 110, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", perspective: "600px" }}
                onMouseMove={(e) => {
                  const el = e.currentTarget;
                  const svg = el.querySelector('#hero-logo-svg') as HTMLElement;
                  if (!svg || (svg as any)._spinning) return;
                  const r = el.getBoundingClientRect();
                  const dx = (e.clientX - r.left - r.width/2) / (r.width/2);
                  const dy = (e.clientY - r.top - r.height/2) / (r.height/2);
                  svg.style.transform = `rotateX(${-dy*14}deg) rotateY(${dx*14}deg) scale(1.06)`;
                  svg.style.animation = 'none';
                }}
                onMouseLeave={(e) => {
                  const svg = e.currentTarget.querySelector('#hero-logo-svg') as HTMLElement;
                  if (!svg || (svg as any)._spinning) return;
                  svg.style.transform = '';
                  svg.style.animation = '';
                }}
                onClick={(e) => {
                  const svg = e.currentTarget.querySelector('#hero-logo-svg') as HTMLElement;
                  const particles = e.currentTarget.querySelector('#hero-particles') as HTMLElement;
                  if (!svg || (svg as any)._spinning) return;
                  (svg as any)._spinning = true;
                  svg.style.animation = 'none';
                  svg.style.transform = '';
                  svg.style.transition = 'none';
                  setTimeout(() => {
                    svg.style.transition = '';
                    svg.style.animation = 'heroSpin 0.78s cubic-bezier(0.34,1.56,0.64,1) forwards';
                    if (particles) {
                      for (let i = 0; i < 12; i++) {
                        const p = document.createElement('div');
                        const angle = (i/12)*Math.PI*2;
                        const dist = 50 + Math.random()*25;
                        const size = 2 + Math.random()*3;
                        p.style.cssText = `position:absolute;width:${size}px;height:${size}px;border-radius:50%;background:#E94560;top:50%;left:50%;margin:${-size/2}px 0 0 ${-size/2}px;box-shadow:0 0 6px rgba(233,69,96,0.9);opacity:1;transition:transform 0.55s cubic-bezier(0.2,1,0.4,1),opacity 0.3s ease 0.25s;`;
                        particles.appendChild(p);
                        requestAnimationFrame(() => requestAnimationFrame(() => {
                          p.style.transform = `translate(${Math.cos(angle)*dist}px,${Math.sin(angle)*dist}px) scale(0.2)`;
                          p.style.opacity = '0';
                          setTimeout(() => p.remove(), 700);
                        }));
                      }
                    }
                  }, 10);
                  setTimeout(() => {
                    svg.style.animation = '';
                    (svg as any)._spinning = false;
                  }, 850);
                }}
              >
                {/* Glow anelli */}
                <div style={{ position:"absolute", inset:-30, borderRadius:"50%", background:"radial-gradient(circle,rgba(233,69,96,0.28) 0%,transparent 70%)", animation:"heroGlow 3.5s ease-in-out infinite", pointerEvents:"none" }} />
                <div style={{ position:"absolute", inset:-55, borderRadius:"50%", background:"radial-gradient(circle,rgba(233,69,96,0.10) 0%,transparent 60%)", animation:"heroGlow 3.5s ease-in-out infinite 0.7s", pointerEvents:"none" }} />

                {/* Orbit */}
                <div style={{ position:"absolute", width:118, height:118, top:"50%", left:"50%", margin:"-59px 0 0 -59px", borderRadius:"50%", border:"1px dashed rgba(233,69,96,0.22)", animation:"heroOrbit 14s linear infinite", pointerEvents:"none" }}>
                  <div style={{ position:"absolute", width:6, height:6, borderRadius:"50%", background:"radial-gradient(circle,#FFB0C0,#E94560)", boxShadow:"0 0 10px rgba(233,69,96,0.9)", top:-3, left:"50%", marginLeft:-3 }} />
                </div>
                <div style={{ position:"absolute", width:150, height:150, top:"50%", left:"50%", margin:"-75px 0 0 -75px", borderRadius:"50%", border:"0.5px solid rgba(233,69,96,0.09)", animation:"heroOrbit 22s linear infinite reverse", pointerEvents:"none" }}>
                  <div style={{ position:"absolute", width:3, height:3, borderRadius:"50%", background:"rgba(233,69,96,0.55)", boxShadow:"0 0 5px rgba(233,69,96,0.5)", top:-1.5, left:"50%", marginLeft:-1.5 }} />
                </div>

                {/* Logo SVG 3D */}
                <svg
                  id="hero-logo-svg"
                  width="90" height="90" viewBox="0 0 120 120" fill="none"
                  style={{ position:"relative", zIndex:3, animation:"heroFloat 4.5s ease-in-out infinite", transformStyle:"preserve-3d", filter:"drop-shadow(0 4px 6px rgba(0,0,0,0.9)) drop-shadow(0 6px 24px rgba(233,69,96,0.65)) drop-shadow(0 0 70px rgba(233,69,96,0.25))", transition:"transform 0.3s ease, filter 0.3s ease" }}
                >
                  <defs>
                    <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFADC0"/><stop offset="35%" stopColor="#F06080"/><stop offset="70%" stopColor="#D63055"/><stop offset="100%" stopColor="#7A1020"/></linearGradient>
                    <linearGradient id="lg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D03050" stopOpacity="0.85"/><stop offset="100%" stopColor="#3A0510" stopOpacity="0.6"/></linearGradient>
                    <linearGradient id="ls1" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0%" stopColor="rgba(255,255,255,0.4)"/><stop offset="100%" stopColor="rgba(255,255,255,0)"/></linearGradient>
                    <radialGradient id="lc" cx="40%" cy="35%" r="65%"><stop offset="0%" stopColor="#fff"/><stop offset="60%" stopColor="#FFE0E8"/><stop offset="100%" stopColor="#FFB0C0"/></radialGradient>
                    <filter id="lf1"><feDropShadow dx="1" dy="3" stdDeviation="2" floodColor="#000" floodOpacity="0.6"/></filter>
                    <filter id="lf2"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.4"/></filter>
                  </defs>
                  <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="url(#lg1)" filter="url(#lf1)"/>
                  <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="url(#ls1)" opacity="0.7"/>
                  <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="url(#lg1)" filter="url(#lf1)"/>
                  <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="url(#ls1)" opacity="0.6"/>
                  <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="url(#lg2)" opacity="0.82"/>
                  <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="url(#lg2)" opacity="0.82"/>
                  <ellipse cx="60" cy="59.5" rx="6" ry="7" fill="url(#lc)" filter="url(#lf2)"/>
                  <ellipse cx="58.2" cy="57.2" rx="2.2" ry="2.8" fill="rgba(255,255,255,0.65)"/>
                  <ellipse cx="58.5" cy="57.5" rx="0.8" ry="1" fill="rgba(255,255,255,0.95)"/>
                  <path d="M58.5 66.5L60 109L61.5 66.5" fill="url(#lg1)" opacity="0.85"/>
                  <circle cx="60" cy="47" r="4.2" fill="url(#lc)" filter="url(#lf2)"/>
                  <ellipse cx="58.6" cy="45.8" rx="1.6" ry="1.8" fill="rgba(255,255,255,0.7)"/>
                  <ellipse cx="58.8" cy="46" rx="0.6" ry="0.7" fill="rgba(255,255,255,0.95)"/>
                </svg>

                {/* Shimmer */}
                <div style={{ position:"absolute", inset:0, borderRadius:"50%", overflow:"hidden", zIndex:4, pointerEvents:"none" }}>
                  <div style={{ position:"absolute", top:"-40%", left:"-100%", width:"45%", height:"180%", background:"linear-gradient(110deg,transparent 0%,rgba(255,255,255,0.18) 50%,transparent 100%)", transform:"skewX(-20deg)", animation:"heroBeam 5s ease-in-out infinite 1s" }} />
                </div>

                {/* Particles container */}
                <div id="hero-particles" style={{ position:"absolute", inset:0, pointerEvents:"none", zIndex:5 }} />
              </div>

              {/* Wordmark */}
              <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: 1, background: "linear-gradient(135deg,rgba(255,255,255,1) 0%,rgba(255,200,210,0.9) 50%,rgba(255,255,255,0.85) 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", filter:"drop-shadow(0 0 16px rgba(255,180,190,0.2))" }}>MindRoute</span>
            </div>
          </div>

          {/* Kicker */}
          <div className="fadeup-1" style={{ marginBottom: 28 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.25)", padding: "5px 14px", borderRadius: 20, fontFamily: "system-ui, sans-serif" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E94560", display: "inline-block" }} />
              {lang === "it" ? "Profilazione di viaggio con IA" : "AI-powered travel profiling"}
            </span>
          </div>

     {/* H1 */}
          <h1 className="fadeup-2 hero-h1" style={{ fontSize: "clamp(36px, 7vw, 80px)", lineHeight: 1.05, letterSpacing: "-2.5px", fontWeight: 400, marginBottom: 28, maxWidth: 860, margin: "0 auto 28px" }}>
            {lang === "it" ? (
              <>
                <span style={{ fontStyle: "normal", color: "white" }}>Il viaggio inizia da </span><em style={{ fontStyle: "italic", color: "#E94560" }}>chi sei.</em>
              </>
            ) : (
              <>
                <span style={{ fontStyle: "normal", color: "white" }}>Travel starts with </span><em style={{ fontStyle: "italic", color: "#E94560" }}>who you are.</em>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="fadeup-3" style={{ fontSize: "clamp(16px, 2.2vw, 19px)", color: "rgba(255,255,255,0.75)", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.75, fontFamily: "system-ui, sans-serif", fontWeight: 300 }}>
          {lang === "it"
              ? "Ogni viaggio inizia da un'emozione. MindRoute la trasforma in un posto reale — destinazione, itinerario e prenotazioni pronte in meno di 3 minuti."
              : "Every trip starts from an emotion. MindRoute turns it into a real place — destination, itinerary and bookings ready in under 3 minutes."}
          </p>

          {/* CTA Row */}
          <div className="fadeup-4" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "center", marginBottom: 56 }}>
            <a href={startHref} className="cta-btn" data-testid="link-begin"
              style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#E94560", color: "white", fontSize: 15, fontWeight: 600, padding: "15px 32px", borderRadius: 50, boxShadow: "0 12px 36px rgba(233,69,96,0.28)", textDecoration: "none", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.2px" }}>
              {lang === "it" ? "Scopri il tuo viaggio" : "Discover your trip"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 50, padding: "10px 20px" }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(233,69,96,0.8)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontFamily: "system-ui, sans-serif" }}>
                {displayCount > 0
                  ? (lang === "it" ? `${displayCount.toLocaleString("it-IT")} itinerari generati` : `${displayCount.toLocaleString("en-US")} itineraries generated`)
                  : (lang === "it" ? "Migliaia di itinerari generati" : "Thousands of itineraries generated")}
              </span>
            </div>
          </div>

          {/* Stats */}
        <div className="fadeup-4" style={{ display: "flex", justifyContent: "center", gap: "clamp(16px, 5vw, 40px)", flexWrap: "wrap" }}>
            {(lang === "it"
              ? [["7", "domande"], ["3", "mete in sintonia"], ["~3 min", "per scoprirle"]]
              : [["7", "questions"], ["3", "matched destinations"], ["~3 min", "to discover them"]]
            ).map(([val, label]) => (
              <div key={val} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: -1, color: "white", lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, fontFamily: "system-ui, sans-serif", letterSpacing: "0.5px" }}>{label}</div>
              </div>
            ))}
          </div>
       </motion.div>
</motion.section>
      </div>

   {/* ── SEZIONE MAPPA ── */}
      <div ref={mapContainerRef}>
        <section
         style={{
            height: "100vh", width: "100%",
            background: "#060810",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Oceano */}
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(15,30,80,0.4) 0%, transparent 70%)" }} />

          {/* Mappa D3 */}
          <WorldMap />


          {/* Label centrale */}
          <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "4px", textTransform: "uppercase", color: "rgba(233,69,96,0.6)", fontFamily: "system-ui", marginBottom: 20 }}>
              {lang === "it" ? "Ovunque nel mondo" : "Anywhere in the world"}
            </p>
            {/* Live counter */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "rgba(6,8,16,0.65)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(233,69,96,0.22)", borderRadius: 50, padding: "12px 28px" }}>
              <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#E94560", display: "inline-block", flexShrink: 0 }} />
              <span style={{ fontSize: "clamp(22px, 3vw, 30px)", fontWeight: 300, color: "white", fontFamily: "Georgia, serif", letterSpacing: -1, lineHeight: 1 }}>
                {displayCount > 0 ? displayCount.toLocaleString("it-IT") : "···"}
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.50)", fontFamily: "system-ui", letterSpacing: "0.3px" }}>
                {lang === "it" ? "itinerari generati" : "itineraries generated"}
              </span>
            </div>
          </div>

          {/* Live notification toast */}
          <AnimatePresence mode="wait">
            {liveNote && (
              <motion.div
                key={liveNote.city}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                style={{
                  position: "absolute",
                 bottom: "clamp(16px, 4vw, 52px)", right: "clamp(12px, 3vw, 28px)",
                  background: "rgba(6,8,16,0.82)",
                  backdropFilter: "blur(18px)",
                  WebkitBackdropFilter: "blur(18px)",
                  border: "1px solid rgba(233,69,96,0.22)",
                  borderRadius: 14,
                  padding: "11px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  zIndex: 10,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(233,69,96,0.1) inset",
                  pointerEvents: "none",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{liveNote.flag}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "white", fontFamily: "system-ui", letterSpacing: "-0.2px", lineHeight: 1.2 }}>
                    {liveNote.city}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "system-ui", marginTop: 2, letterSpacing: "0.1px" }}>
                    {lang === "it" ? "itinerario generato ora" : "itinerary just generated"}
                  </div>
                </div>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", boxShadow: "0 0 6px rgba(74,222,128,0.7)", flexShrink: 0 }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Ticker partner con loghi Clearbit */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, overflow: "hidden", borderTop: "1px solid rgba(255,255,255,0.05)", zIndex: 3, background: "rgba(6,8,16,0.4)" }}>
            <div style={{ display: "flex", whiteSpace: "nowrap", animation: "tickerScroll 32s linear infinite", height: "100%", alignItems: "center" }}>
              {[
                { name: "Booking.com",    domain: "booking.com" },
                { name: "Expedia",        domain: "expedia.com" },
                { name: "GetYourGuide",   domain: "getyourguide.com" },
                { name: "Klook",          domain: "klook.com" },
                { name: "Viator",         domain: "viator.com" },
                { name: "TripAdvisor",    domain: "tripadvisor.com" },
                { name: "FlixBus",        domain: "flixbus.com" },
                { name: "Civitatis",      domain: "civitatis.com" },
                { name: "Musement",       domain: "musement.com" },
                // duplicated for seamless loop
                { name: "Booking.com",    domain: "booking.com" },
                { name: "Expedia",        domain: "expedia.com" },
                { name: "GetYourGuide",   domain: "getyourguide.com" },
                { name: "Klook",          domain: "klook.com" },
                { name: "Viator",         domain: "viator.com" },
                { name: "TripAdvisor",    domain: "tripadvisor.com" },
                { name: "FlixBus",        domain: "flixbus.com" },
                { name: "Civitatis",      domain: "civitatis.com" },
                { name: "Musement",       domain: "musement.com" },
              ].map((p, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "0 24px", flexShrink: 0 }}>
                  <img
                    src={`https://logo.clearbit.com/${p.domain}`}
                    alt={p.name}
                    style={{ width: 16, height: 16, borderRadius: 3, objectFit: "contain", opacity: 0.45, filter: "grayscale(1) brightness(2)" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "system-ui", fontWeight: 500 }}>{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

   {/* ── COME FUNZIONA ───────────────────────────────── */}
      <div ref={howContainerRef}>
<motion.section ref={howRef} style={{ padding: "100px 24px", background: "transparent", borderTop: "1px solid rgba(255,255,255,0.06)", overflow: "hidden" }}      >

        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative" }}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={howInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", marginBottom: 14, fontFamily: "system-ui, sans-serif" }}>
              {lang === "it" ? "Come funziona" : "How it works"}
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 46px)", fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.05, maxWidth: 520, color: "white", marginBottom: 0 }}>
              {lang === "it" ? "Tre cose che succedono dopo il quiz" : "Three things that happen after the quiz"}
            </h2>
          </motion.div>

          {/* 3 step — verticali su mobile */}
          <div className="steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 48 }}>
            {(lang === "it" ? [
              { n: "01", title: "Racconta chi sei", desc: "7 domande che uniscono come sei, come stai e le tue esigenze di viaggio, per costruire qualcosa che abbia davvero senso per te.", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { n: "02", title: "Scopri il tuo posto", desc: "Tre destinazioni costruite su di te: una sicura, una inaspettata, una nel mezzo. Ognuna spiegata, perché ti somiglia, non perché è popolare.", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
              { n: "03", title: "Ottieni il tuo piano", desc: "Un itinerario già pronto, con tutto organizzato, prenotazioni a portata di click e la libertà di modificarlo quando vuoi.", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
            ] : [
              { n: "01", title: "Tell us who you are", desc: "7 questions that combine who you are, how you feel and what you need from a trip — to build something that actually makes sense for you.", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
              { n: "02", title: "Discover your place", desc: "Three destinations built around you: one safe, one unexpected, one in between. Each explained — because it fits you, not because it's trending.", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
              { n: "03", title: "Get your plan", desc: "A ready-made itinerary with everything organized, bookings one click away and the freedom to change it whenever you want.", icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> },
            ]).map((step, i) => (
              <motion.div key={step.n}
                initial={{ opacity: 0, y: 16 }}
                animate={howInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                className="step-card"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "24px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 10, background: "rgba(233,69,96,0.12)", border: "1px solid rgba(233,69,96,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>{step.icon}</div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "system-ui", letterSpacing: "1px", marginBottom: 5 }}>{step.n}</div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 7, letterSpacing: -0.3, color: "white" }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.70)", lineHeight: 1.65, fontFamily: "system-ui, sans-serif", fontWeight: 300 }}>{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <motion.div initial={{ opacity: 0 }} animate={howInView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 56 }}>
            {[
              { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>, label: lang === "it" ? "100% privato" : "100% private" },
              { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, label: lang === "it" ? "~3 minuti" : "~3 minutes" },
              { icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, label: lang === "it" ? "Gratis" : "Free" },
            ].map(b => (
              <span key={b.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)", fontFamily: "system-ui" }}>
                {b.icon}{b.label}
              </span>
            ))}
          </motion.div>

          {/* Demo wrapper */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={howInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.8 }}>

            {/* Demo header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", fontFamily: "system-ui", marginBottom: 4 }}>
                  {lang === "it" ? "Anteprima del prodotto" : "Product preview"}
                </p>
               <p style={{ fontSize: 17, fontWeight: 400, color: "white", letterSpacing: -0.5 }}>
                 {lang === "it" ? (
                    <>Questo è quello che ricevi. Non un suggerimento, <em style={{ color: "#E94560", fontStyle: "italic" }}>un piano vero.</em></>
                  ) : (
                    <>This is what you get. Not a suggestion, <em style={{ color: "#E94560", fontStyle: "italic" }}>a real plan.</em></>
                  )}
                </p>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(233,69,96,0.12)", border: "1px solid rgba(233,69,96,0.30)", borderRadius: 20, padding: "6px 14px" }}>
                <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#E94560", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#E94560", fontFamily: "system-ui" }}>Live</span>
              </div>
            </div>

            {/* Demo component */}
         <MatchingDemo />

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "rgba(255,255,255,0.55)", fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
              {lang === "it"
                ? "Apri, scegli e prenoti. Senza saltare tra 10 siti diversi."
                : "Open, choose and book. Without jumping between 10 different sites."}
            </p>
          </motion.div>
        </div>
     </motion.section>
      </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── SOCIAL PROOF ─────────────────────────────────── */}
<section ref={socialRef} style={{ padding: "100px 24px", background: "transparent", position: "relative", overflow: "hidden" }}>        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% 100%, rgba(233,69,96,0.05), transparent)", pointerEvents: "none" }} />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", marginBottom: 14, fontFamily: "system-ui" }}>
              {lang === "it" ? "Chi lo usa" : "Who uses it"}
            </p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.08, color: "white", maxWidth: 500, margin: "0 auto" }}>
              {lang === "it" ? <>Persone reali,<br /><em style={{ color: "#E94560", fontStyle: "italic" }}>viaggi che ricordano.</em></> : <>Real people,<br /><em style={{ color: "#E94560", fontStyle: "italic" }}>trips they remember.</em></>}
            </h2>
          </div>

          {/* Quote cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 72 }}>
            {(lang === "it" ? [
              { quote: "Ho risposto a 7 domande e mi ha dato una destinazione che non avevo mai considerato. Era esattamente quello di cui avevo bisogno.", author: "Sara T.", tag: "Viaggiatrice solitaria" },
              { quote: "Finalmente un tool che non mi chiede dove voglio andare, ma capisce come mi sento. L'itinerario era pronto in meno di 3 minuti.", author: "Marco R.", tag: "Coppia in viaggio" },
              { quote: "Non mi aspettavo un piano così dettagliato. Prenotazioni già integrate, tutto in un posto solo.", author: "Alessia V.", tag: "Famiglia con figli" },
            ] : [
              { quote: "I answered 7 questions and it gave me a destination I'd never considered. It was exactly what I needed.", author: "Sara T.", tag: "Solo traveler" },
              { quote: "Finally a tool that doesn't ask where I want to go, but understands how I feel. The itinerary was ready in under 3 minutes.", author: "Marco R.", tag: "Couple" },
              { quote: "I didn't expect such a detailed plan. Bookings already integrated, everything in one place.", author: "Alessia V.", tag: "Family" },
            ]).map((item, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                <svg width="20" height="14" viewBox="0 0 20 14" fill="none"><path d="M0 14V8.4C0 3.733 2.533 1.067 7.6 0l1 1.6C5.467 2.4 4 4.133 3.8 6.8H7V14H0zm11 0V8.4C11 3.733 13.533 1.067 18.6 0l1 1.6c-3.133.8-4.6 2.533-4.8 5.2H18V14h-7z" fill="rgba(233,69,96,0.4)"/></svg>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.80)", lineHeight: 1.75, fontFamily: "system-ui", fontWeight: 300, flex: 1 }}>{item.quote}</p>
                <div>
                  <div style={{ fontSize: 13, color: "white", fontFamily: "system-ui", fontWeight: 500 }}>{item.author}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "system-ui", marginTop: 2, letterSpacing: "0.3px" }}>{item.tag}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Stat bar */}
          <div style={{ display: "flex", justifyContent: "center", gap: "clamp(32px, 6vw, 80px)", flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 48 }}>
            {[
              { val: displayCount > 0 ? displayCount.toLocaleString("it-IT") : "—", label: lang === "it" ? "Itinerari generati" : "Itineraries generated" },
              { val: "9", label: lang === "it" ? "Destinazioni sul globo" : "Destinations on the globe" },
              { val: "~3'", label: lang === "it" ? "Tempo medio" : "Average time" },
            ].map(s => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 300, letterSpacing: -1.5, color: "white", fontFamily: "Georgia, serif", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.40)", marginTop: 6, fontFamily: "system-ui", letterSpacing: "0.5px" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />
      {/* ── DIFFERENZA ───────────────────────────────────── */}
<div ref={diffContainerRef}>
<motion.section ref={diffRef} style={{ padding: "100px 24px", background: "transparent", borderTop: "1px solid rgba(255,255,255,0.05)", overflow: "hidden" }}      >        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 90% 50%, rgba(233,69,96,0.05), transparent)" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <div className="diff-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 64, alignItems: "start" }}>

            {/* Left copy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={diffInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", marginBottom: 16, fontFamily: "system-ui" }}>
                {lang === "it" ? "La differenza" : "Why it's different"}
              </p>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.08, marginBottom: 24, color: "white" }}>
                {lang === "it" ? (
                  <>Gli altri ti fanno scegliere.<br /><em style={{ color: "#E94560", fontStyle: "italic" }}>Noi ti togliamo il dubbio.</em></>
                ) : (
                  <>Others make you choose.<br /><em style={{ color: "#E94560", fontStyle: "italic" }}>We remove the doubt.</em></>
                )}
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.70)", lineHeight: 1.85, fontFamily: "system-ui, sans-serif", fontWeight: 300, marginBottom: 18 }}>
                {lang === "it"
                  ? "La maggior parte dei travel planner ti mostra opzioni. Poi però devi comunque decidere, confrontare, organizzare."
                  : "Most travel planners show you options. But then you still have to decide, compare, organize."}
              </p>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.70)", lineHeight: 1.85, fontFamily: "system-ui, sans-serif", fontWeight: 300, marginBottom: 24 }}>
                {lang === "it"
                  ? "MindRoute fa il contrario: parte da te e ti dà direttamente un viaggio che ha senso."
                  : "MindRoute does the opposite: it starts from you and gives you directly a trip that makes sense."}
              </p>
              <p style={{ fontSize: 15, fontStyle: "italic", color: "#E94560", fontWeight: 400 }}>
                {lang === "it" ? "La destinazione è la risposta. Tu sei la domanda." : "The destination is the answer. You are the question."}
              </p>
            </motion.div>

            {/* Comparison table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={diffInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15, duration: 0.7 }}>
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)", borderRadius: 18, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  <div style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.30)", fontFamily: "system-ui", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                    {lang === "it" ? "Altri planner" : "Other planners"}
                  </div>
                  <div style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#E94560", fontFamily: "system-ui" }}>
                    MindRoute
                  </div>
                </div>
                {(lang === "it" ? [
                  ["Ti chiedono dove andare", "Partiamo da come vuoi stare"],
                  ["Liste infinite di opzioni", "3 scelte mirate"],
                  ["Devi confrontare tutto", "Hai già una direzione chiara"],
                  ["Organizzazione manuale", "Viaggio già pronto"],
                  ["Ore tra siti diversi", "Tutto in un unico posto"],
                ] : [
                  ["Ask where you want to go", "We start from how you want to feel"],
                  ["Endless lists of options", "3 targeted choices"],
                  ["You compare everything", "You already have a clear direction"],
                  ["Manual organization", "Trip already ready"],
                  ["Hours across different sites", "Everything in one place"],
                ]).map(([left, right], i) => (
                <div key={i} className="diff-row diff-table" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s" }}>
                    <div className="diff-table-cell" style={{ padding: "13px 18px", fontSize: 13, color: "rgba(255,255,255,0.62)", lineHeight: 1.5, fontFamily: "system-ui", borderRight: "1px solid rgba(255,255,255,0.05)", textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.18)" }}>{left}</div>
                    <div className="diff-table-cell" style={{ padding: "13px 18px", fontSize: 13, color: "white", lineHeight: 1.5, fontFamily: "system-ui", fontWeight: 500, background: "rgba(233,69,96,0.05)" }}>{right}</div>
                  </div>
                ))}
              </div>

              {/* Chiusura sotto la tabella */}
              <p style={{ marginTop: 20, fontSize: 14, color: "rgba(255,255,255,0.55)", lineHeight: 1.7, fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
                {lang === "it"
                  ? "Non devi più scegliere tra infinite possibilità. Devi solo partire da quella giusta."
                  : "You no longer have to choose between endless options. You just need to start from the right one."}
              </p>
            </motion.div>
          </div>
        </div>
  </motion.section>
    </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── CTA FINALE ───────────────────────────────────── */}
      <section ref={ctaRef} style={{ padding: "100px 24px 80px", textAlign: "center", position: "relative", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(233,69,96,0.08), transparent)" }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={ctaInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
       <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <Logo className="w-12 h-12" />
          </div>
          <h2 style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.1, margin: "24px 0 16px", color: "white" }}>
            {lang === "it" ? (
              <>Smetti di forzare la meta.<br /><em style={{ color: "#E94560", fontStyle: "italic" }}>Inizia ad ascoltarti davvero.</em></>
            ) : (
              <>Stop forcing the destination.<br /><em style={{ color: "#E94560", fontStyle: "italic" }}>Start listening to yourself.</em></>
            )}
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginBottom: 12, fontFamily: "system-ui, sans-serif", fontWeight: 300, lineHeight: 1.7 }}>
            {lang === "it"
              ? "Rispondi a 7 domande. Ricevi destinazione, itinerario e prenotazioni — in meno di 3 minuti."
              : "Answer 7 questions. Get your destination, itinerary and bookings — in under 3 minutes."}
          </p>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", marginBottom: 36, fontFamily: "system-ui", letterSpacing: "0.3px" }}>
            {lang === "it" ? "Gratuito. Nessun account richiesto per iniziare." : "Free. No account required to start."}
          </p>
          <a href={startHref} className="cta-btn" data-testid="link-start-profiling"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "white", color: "#080B12", fontSize: 15, fontWeight: 700, padding: "16px 36px", borderRadius: 50, boxShadow: "0 12px 40px rgba(255,255,255,0.12)", textDecoration: "none", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.2px" }}>
            {lang === "it" ? "Inizia ora — è gratis" : "Start now — it's free"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
<footer style={{ background: "rgba(5,7,9,0.85)", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 24px 32px" }}>        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 32, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Logo className="w-7 h-7" />
                <span style={{ fontSize: 15, color: "rgba(255,255,255,0.8)" }}>MindRoute</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.7, fontFamily: "system-ui", maxWidth: 200 }}>
                {lang === "it" ? "Viaggi costruiti sul tuo carattere, non sulle tue preferenze." : "Trips built around who you are, not what you filter for."}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui", marginBottom: 12 }}>{lang === "it" ? "Prodotto" : "Product"}</p>
              {[{ href: "/profiling", label: lang === "it" ? "Inizia il viaggio" : "Start journey" }, { href: "/privacy", label: "Privacy Policy" }].map(l => (
                <div key={l.href} style={{ marginBottom: 8 }}>
                  <Link href={l.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", fontFamily: "system-ui" }}>{l.label}</Link>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui", marginBottom: 12 }}>{lang === "it" ? "Contatti" : "Contact"}</p>
              <a href="mailto:mindroutetravel@gmail.com" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", fontFamily: "system-ui" }}>mindroutetravel@gmail.com</a>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui", marginBottom: 12 }}>Social</p>
              {[
                { label: "Instagram", href: "https://instagram.com/mindroute.travel", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
                { label: "TikTok", href: "https://tiktok.com/@mindroute.travel", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg> },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: 8 }}>
                  <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 7 }}>
                    {s.icon}{s.label}
                  </a>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.04)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", fontFamily: "system-ui" }}>© 2026 MindRoute. Built for travelers who think differently.</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.1)", fontFamily: "system-ui" }}>Links in itineraries may be affiliate links.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
