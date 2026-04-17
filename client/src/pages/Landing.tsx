import React, { useEffect, useRef, useState } from "react";
import { MatchingDemo } from "./MatchingDemo";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence, useScroll, useTransform, useSpring } from "framer-motion";
import { useI18n } from "@/lib/i18n";

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

 const startHref = user ? "/profiling" : "/auth/google";

  // Scroll effects stile Cartier
  const heroSectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroSectionRef, offset: ["start start", "end start"] });
const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.82]);
  const heroBorderRadius = useTransform(scrollYProgress, [0, 0.5], [0, 24]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const heroScaleSpring = useSpring(heroScale, { stiffness: 60, damping: 18 });
  const mapScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const mapOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.2]);
  const mapScaleSpring = useSpring(mapScale, { stiffness: 60, damping: 18 });
  return (
    <div style={{ background: "#080B12", color: "white", fontFamily: "'Georgia', serif", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
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
        @media (max-width: 768px) {
          .steps-grid { grid-template-columns: 1fr !important; }
          .diff-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .output-strip { flex-direction: column !important; gap: 16px !important; }
          .hero-h1 { font-size: clamp(36px, 9vw, 72px) !important; }
        }
                @media (max-width: 1024px) {
          .hero-section-inner { padding-top: 20px !important; }
        }
        @media (max-width: 768px) {
          .hero-section-inner { padding-top: 0px !important; }
        }

      `}</style>

     {/* ── HERO ──────────────────────────────────────────── */}
   <div ref={heroSectionRef} style={{ height: "180vh", position: "relative" }}>
<motion.section style={{ position: "sticky", top: 0, minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(80px, 10vh, 120px) 24px 60px", overflow: "hidden", scale: heroScaleSpring, borderRadius: heroBorderRadius, transformOrigin: "top center" }}>     <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 90% 70% at 50% -5%, rgba(233,69,96,0.20) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 15% 100%, rgba(100,50,180,0.08) 0%, transparent 55%), linear-gradient(180deg,#0e1018 0%,#080B12 60%)" }} />
<div style={{ position:"absolute", inset:0, backgroundImage:"linear-gradient(rgba(233,69,96,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(233,69,96,0.04) 1px,transparent 1px)", backgroundSize:"60px 60px", WebkitMaskImage:"radial-gradient(ellipse 80% 60% at 50% 0%,black 0%,transparent 70%)", maskImage:"radial-gradient(ellipse 80% 60% at 50% 0%,black 0%,transparent 70%)" }} />
<div style={{ position:"absolute", top:"18%", left:"50%", transform:"translateX(-50%)", width:340, height:340, borderRadius:"50%", background:"radial-gradient(circle, rgba(180,30,60,0.55) 0%, rgba(140,20,45,0.30) 30%, rgba(80,10,25,0.12) 60%, transparent 75%)", pointerEvents:"none", filter:"blur(18px)" }} />
        <div style={{ position:"absolute", top:"24%", left:"50%", transform:"translateX(-50%)", width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle, rgba(233,69,96,0.45) 0%, transparent 70%)", pointerEvents:"none", filter:"blur(8px)" }} />
                <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none", opacity:0.18 }} viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" fill="none">
          <path d="M-100 160 C 150 100, 300 220, 500 150 S 750 50, 950 170 S 1100 240, 1350 150" stroke="rgba(233,69,96,0.55)" strokeWidth="1" fill="none"/>
          <path d="M-100 210 C 180 150, 350 260, 560 190 S 800 90, 1000 210 S 1150 280, 1350 200" stroke="rgba(233,69,96,0.25)" strokeWidth="0.7" fill="none"/>

          <circle cx="950" cy="360" r="2.5" fill="rgba(233,69,96,0.35)"/>
          <circle cx="150" cy="280" r="2" fill="rgba(233,69,96,0.25)"/>
          <rect x="80" y="180" width="18" height="18" rx="2" stroke="rgba(233,69,96,0.18)" strokeWidth="1" fill="none"/>
          <rect x="1060" y="220" width="14" height="14" rx="2" stroke="rgba(233,69,96,0.14)" strokeWidth="1" fill="none"/>
          <rect x="180" y="520" width="10" height="10" rx="1.5" stroke="rgba(233,69,96,0.12)" strokeWidth="1" fill="none"/>
          <rect x="980" y="480" width="16" height="16" rx="2" stroke="rgba(233,69,96,0.14)" strokeWidth="1" fill="none"/>
          <rect x="600" y="120" width="12" height="12" rx="1.5" stroke="rgba(233,69,96,0.12)" strokeWidth="1" fill="none"/>
          <rect x="380" y="540" width="8" height="8" rx="1" stroke="rgba(233,69,96,0.10)" strokeWidth="1" fill="none"/>
          <rect x="820" y="150" width="10" height="10" rx="1.5" stroke="rgba(233,69,96,0.10)" strokeWidth="1" fill="none"/>
        </svg>        <div style={{ position:"absolute", top:"24%", left:"50%", transform:"translateX(-50%)", width:160, height:160, borderRadius:"50%", background:"radial-gradient(circle, rgba(233,69,96,0.45) 0%, transparent 70%)", pointerEvents:"none", filter:"blur(8px)" }} />             <motion.div className="hero-section-inner" style={{ maxWidth: 960, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1, paddingTop: 20, opacity: heroOpacity }}>

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
                <style>{`
                  @keyframes heroGlow { 0%,100%{transform:scale(1);opacity:.7} 50%{transform:scale(1.1);opacity:1} }
                  @keyframes heroOrbit { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                  @keyframes heroFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
                  @keyframes heroSpin { 0%{transform:translateY(0) rotate(0deg) scale(1)} 25%{transform:translateY(-4px) rotate(180deg) scale(0.88)} 60%{transform:translateY(0) rotate(370deg) scale(1.06)} 80%{transform:translateY(0) rotate(355deg) scale(1.02)} 100%{transform:translateY(0) rotate(360deg) scale(1)} }
                  @keyframes heroBeam { 0%{left:-100%;opacity:0} 10%{opacity:1} 40%{left:160%;opacity:0} 100%{left:160%;opacity:0} }
                `}</style>

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
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 50, padding: "10px 18px 10px 10px" }}>
              <div style={{ display: "flex" }}>
                {["S","M","A"].map(l => <div key={l} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F48B9A,#E94560)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", marginLeft: l === "S" ? 0 : -8, border: "2px solid #080B12", fontFamily: "system-ui" }}>{l}</div>)}
              </div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontFamily: "system-ui, sans-serif" }}>
                {lang === "it" ? "\"Sembra scritto per me.\"" : "\"It feels written for me.\""}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="fadeup-4" style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
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
{/* ── MAPPA MONDO + TICKER ── */}
        <style>{`
          @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          @keyframes ringOut { 0% { opacity: 0.7; } 100% { opacity: 0; } }
        `}</style>

        {/* Mappa SVG inline */}
     <motion.div style={{ position: "absolute", bottom: "-8%", left: "50%", x: "-50%", width: "105%", pointerEvents: "none", zIndex: 1, scale: mapScaleSpring, opacity: mapOpacity }}>
          <svg viewBox="0 0 2000 1000" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", display: "block" }}>
            <defs>
              <radialGradient id="ocean" cx="50%" cy="50%" r="70%">
                <stop offset="0%" stopColor="rgba(20,40,120,0.18)"/>
                <stop offset="100%" stopColor="rgba(10,20,60,0.05)"/>
              </radialGradient>
            </defs>
            <rect width="2000" height="1000" fill="url(#ocean)"/>
            <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.5">
              <line x1="0" y1="250" x2="2000" y2="250"/><line x1="0" y1="500" x2="2000" y2="500"/>
              <line x1="0" y1="750" x2="2000" y2="750"/><line x1="500" y1="0" x2="500" y2="1000"/>
              <line x1="1000" y1="0" x2="1000" y2="1000"/><line x1="1500" y1="0" x2="1500" y2="1000"/>
            </g>
            {/* Nord America */}
            <path d="M155,140 L225,110 L310,108 L385,118 L430,138 L450,168 L448,205 L420,238 L390,262 L355,275 L318,270 L280,255 L248,232 L218,205 L192,175 L162,155 Z" fill="rgba(233,69,96,0.13)" stroke="rgba(233,69,96,0.42)" strokeWidth="1.2"/>
            <path d="M310,270 L318,292 L312,315 L302,308 L298,285 Z" fill="rgba(233,69,96,0.10)" stroke="rgba(233,69,96,0.35)" strokeWidth="0.8"/>
            <path d="M248,275 L285,270 L308,285 L318,310 L308,335 L288,348 L265,342 L248,322 L238,300 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Sud America */}
            <path d="M275,360 L328,348 L368,360 L392,392 L400,440 L395,495 L378,545 L348,585 L318,605 L288,598 L262,572 L248,535 L242,488 L245,438 L255,395 Z" fill="rgba(233,69,96,0.13)" stroke="rgba(233,69,96,0.42)" strokeWidth="1.2"/>
            {/* Groenlandia */}
            <path d="M488,52 L535,38 L575,42 L598,62 L592,88 L562,105 L528,108 L498,95 L485,72 Z" fill="rgba(233,69,96,0.09)" stroke="rgba(233,69,96,0.28)" strokeWidth="0.8"/>
            {/* Islanda */}
            <path d="M618,118 L648,108 L672,115 L675,135 L655,148 L628,142 Z" fill="rgba(233,69,96,0.11)" stroke="rgba(233,69,96,0.35)" strokeWidth="0.9"/>
            {/* UK */}
            <path d="M658,178 L672,165 L688,170 L690,192 L675,205 L658,198 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Scandinavia */}
            <path d="M712,108 L728,88 L748,82 L765,92 L768,118 L752,138 L732,142 L715,130 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Europa Occidentale */}
            <path d="M688,180 L738,168 L778,172 L802,188 L808,212 L795,235 L768,248 L738,245 L712,230 L692,210 Z" fill="rgba(233,69,96,0.14)" stroke="rgba(233,69,96,0.45)" strokeWidth="1.2"/>
            <path d="M672,225 L712,218 L738,225 L742,250 L728,268 L698,272 L672,260 L660,242 Z" fill="rgba(233,69,96,0.13)" stroke="rgba(233,69,96,0.42)" strokeWidth="1.1"/>
            <path d="M762,238 L778,228 L792,235 L795,252 L788,275 L778,295 L762,310 L750,298 L748,275 L752,252 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Europa Orientale */}
            <path d="M808,178 L862,168 L908,175 L928,198 L922,225 L900,242 L868,248 L838,240 L812,222 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Russia */}
            <path d="M812,95 L945,72 L1115,68 L1268,75 L1362,88 L1378,112 L1345,132 L1268,142 L1178,145 L1088,142 L988,138 L898,135 L832,128 Z" fill="rgba(233,69,96,0.10)" stroke="rgba(233,69,96,0.32)" strokeWidth="1"/>
            {/* Turchia */}
            <path d="M908,248 L968,238 L1018,242 L1042,258 L1038,278 L1015,288 L968,288 L935,278 L912,265 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Medio Oriente */}
            <path d="M942,288 L988,278 L1025,285 L1048,308 L1052,338 L1035,358 L1005,365 L975,355 L952,332 L942,308 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Africa */}
            <path d="M718,308 L778,295 L838,302 L882,325 L908,368 L918,425 L915,488 L898,548 L868,598 L828,635 L788,648 L748,638 L712,608 L688,565 L675,515 L672,458 L678,402 L692,355 Z" fill="rgba(233,69,96,0.14)" stroke="rgba(233,69,96,0.45)" strokeWidth="1.3"/>
            {/* India */}
            <path d="M1052,305 L1098,295 L1138,302 L1158,328 L1162,368 L1148,412 L1122,448 L1092,462 L1062,452 L1042,418 L1038,375 L1042,335 Z" fill="rgba(233,69,96,0.13)" stroke="rgba(233,69,96,0.42)" strokeWidth="1.2"/>
            {/* Cina */}
            <path d="M1148,168 L1238,158 L1308,162 L1355,182 L1368,215 L1358,252 L1328,275 L1285,285 L1238,282 L1195,268 L1162,245 L1148,215 Z" fill="rgba(233,69,96,0.13)" stroke="rgba(233,69,96,0.42)" strokeWidth="1.2"/>
            {/* Giappone */}
            <path d="M1375,188 L1392,172 L1408,180 L1412,208 L1398,228 L1378,225 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            {/* Sud-est Asia */}
            <path d="M1245,295 L1288,285 L1318,298 L1322,325 L1305,342 L1272,348 L1248,335 Z" fill="rgba(233,69,96,0.12)" stroke="rgba(233,69,96,0.38)" strokeWidth="1"/>
            <path d="M1252,368 L1295,358 L1335,362 L1345,378 L1322,392 L1285,395 L1252,382 Z" fill="rgba(233,69,96,0.11)" stroke="rgba(233,69,96,0.35)" strokeWidth="0.9"/>
            {/* Australia */}
            <path d="M1378,468 L1465,448 L1548,455 L1598,482 L1615,528 L1612,582 L1588,628 L1548,655 L1498,668 L1445,658 L1398,628 L1368,585 L1355,532 L1358,482 Z" fill="rgba(233,69,96,0.13)" stroke="rgba(233,69,96,0.42)" strokeWidth="1.2"/>

            {/* PIN — Parigi */}
            <g><circle cx="748" cy="218" r="5" fill="#E94560" opacity="0.95"/><circle cx="748" cy="218" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite"/></circle><text x="756" y="212" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">Parigi</text></g>
            {/* PIN — Tokyo */}
            <g><circle cx="1392" cy="205" r="5" fill="#E94560" opacity="0.95"/><circle cx="1392" cy="205" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.5s" repeatCount="indefinite" begin="0.4s"/><animate attributeName="opacity" values="0.7;0" dur="2.5s" repeatCount="indefinite" begin="0.4s"/></circle><text x="1400" y="199" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">Tokyo</text></g>
            {/* PIN — New York */}
            <g><circle cx="322" cy="228" r="5" fill="#E94560" opacity="0.95"/><circle cx="322" cy="228" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.3s" repeatCount="indefinite" begin="0.8s"/><animate attributeName="opacity" values="0.7;0" dur="2.3s" repeatCount="indefinite" begin="0.8s"/></circle><text x="330" y="222" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">New York</text></g>
            {/* PIN — Bali */}
            <g><circle cx="1305" cy="375" r="5" fill="#E94560" opacity="0.95"/><circle cx="1305" cy="375" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.4s" repeatCount="indefinite" begin="1.2s"/><animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" begin="1.2s"/></circle><text x="1313" y="369" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">Bali</text></g>
            {/* PIN — Marrakech */}
            <g><circle cx="692" cy="355" r="5" fill="#E94560" opacity="0.95"/><circle cx="692" cy="355" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.6s" repeatCount="indefinite" begin="1.6s"/><animate attributeName="opacity" values="0.7;0" dur="2.6s" repeatCount="indefinite" begin="1.6s"/></circle><text x="700" y="349" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">Marrakech</text></g>
            {/* PIN — Sydney */}
            <g><circle cx="1502" cy="548" r="5" fill="#E94560" opacity="0.95"/><circle cx="1502" cy="548" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.4s" repeatCount="indefinite" begin="0.6s"/><animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" begin="0.6s"/></circle><text x="1510" y="542" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">Sydney</text></g>
            {/* PIN — Buenos Aires */}
            <g><circle cx="310" cy="498" r="5" fill="#E94560" opacity="0.95"/><circle cx="310" cy="498" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.2s" repeatCount="indefinite" begin="2.0s"/><animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite" begin="2.0s"/></circle><text x="318" y="492" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">Buenos Aires</text></g>
            {/* PIN — Nairobi */}
            <g><circle cx="858" cy="422" r="5" fill="#E94560" opacity="0.95"/><circle cx="858" cy="422" r="5" fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.7"><animate attributeName="r" values="5;22" dur="2.7s" repeatCount="indefinite" begin="1.4s"/><animate attributeName="opacity" values="0.7;0" dur="2.7s" repeatCount="indefinite" begin="1.4s"/></circle><text x="866" y="416" fontSize="14" fill="rgba(255,255,255,0.75)" fontFamily="system-ui" fontWeight="500">Nairobi</text></g>
          </svg>
          {/* Gradiente che fonde la mappa nello sfondo */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: "linear-gradient(to top, #080B12 0%, transparent 100%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40%", background: "linear-gradient(to bottom, #080B12 0%, transparent 100%)", pointerEvents: "none" }} />
        </motion.div>

        {/* Ticker città */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 32, overflow: "hidden", zIndex: 4, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", whiteSpace: "nowrap", animation: "tickerScroll 32s linear infinite", height: "100%", alignItems: "center" }}>
            {["Kyoto","Santorini","Marrakech","Patagonia","Lisbona","Bali","Reykjavik","Tokyo","Amalfi","Oaxaca","Dubrovnik","Zanzibar","Barcellona","Petra","Kyoto","Santorini","Marrakech","Patagonia","Lisbona","Bali","Reykjavik","Tokyo","Amalfi","Oaxaca","Dubrovnik","Zanzibar","Barcellona","Petra"].map((city, i) => (
              <React.Fragment key={i}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "3px", textTransform: "uppercase", padding: "0 16px", flexShrink: 0, fontFamily: "system-ui" }}>{city}</span>
                <span style={{ color: "rgba(233,69,96,0.3)", fontSize: 9 }}>·</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{ position: "absolute", bottom: 32, left: "50%",transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.3 }}>
          <span style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", fontFamily: "system-ui" }}>
            {lang === "it" ? "scopri" : "scroll"}
          </span>
          <svg style={{ animation: "float 2s ease-in-out infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
     </motion.section>
        </div>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />
      {/* ── COME FUNZIONA ───────────────────────────────── */}
<motion.section ref={howRef} initial={{ scale: 0.96, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-80px" }} style={{ padding: "100px 24px", position: "relative", background: "#0E1219", borderTop: "1px solid rgba(255,255,255,0.06)" }}>        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,120,255,0.05), transparent)" }} />

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
              { n: "01", title: "Racconta chi sei", desc: "7 domande che uniscono come sei, come stai e le tue esigenze di viaggio, per costruire qualcosa che abbia davvero senso per te.", icon: "💬" },
            { n: "02", title: "Scopri il tuo posto", desc: "Tre destinazioni costruite su di te: una sicura, una inaspettata, una nel mezzo. Ognuna spiegata, perché ti somiglia, non perché è popolare.", icon: "🗺" },
              { n: "03", title: "Ottieni il tuo piano", desc: "Un itinerario già pronto, con tutto organizzato, prenotazioni a portata di click e la libertà di modificarlo quando vuoi.", icon: "📍" },
            ] : [
              { n: "01", title: "Tell us who you are", desc: "7 questions that combine who you are, how you feel and what you need from a trip — to build something that actually makes sense for you.", icon: "💬" },
              { n: "02", title: "Discover your place", desc: "Three destinations built around you: one safe, one unexpected, one in between. Each explained — because it fits you, not because it's trending.", icon: "🗺" },
              { n: "03", title: "Get your plan", desc: "A ready-made itinerary with everything organized, bookings one click away and the freedom to change it whenever you want.", icon: "📍" },
            ]).map((step, i) => (
              <motion.div key={step.n}
                initial={{ opacity: 0, y: 16 }}
                animate={howInView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.12, duration: 0.6 }}
                className="step-card"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 16, padding: "24px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 42, height: 42, borderRadius: 10, background: "rgba(233,69,96,0.12)", border: "1px solid rgba(233,69,96,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{step.icon}</div>
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
            {(lang === "it" ? ["🔒 100% privato", "⚡ ~3 minuti", "✨ Gratis"] : ["🔒 100% private", "⚡ ~3 minutes", "✨ Free"]).map(b => (
              <span key={b} style={{ fontSize: 12, padding: "5px 12px", borderRadius: 20, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.65)", fontFamily: "system-ui" }}>{b}</span>
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

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />
{/* ── DIFFERENZA ───────────────────────────────────── */}
      <motion.section ref={diffRef} initial={{ scale: 0.96, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} viewport={{ once: true, margin: "-80px" }} style={{ padding: "100px 24px", position: "relative", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 90% 50%, rgba(233,69,96,0.05), transparent)" }} />

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
                  <div key={i} className="diff-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid rgba(255,255,255,0.06)", transition: "background 0.2s" }}>
                    <div style={{ padding: "13px 18px", fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, fontFamily: "system-ui", borderRight: "1px solid rgba(255,255,255,0.05)" }}>{left}</div>
                    <div style={{ padding: "13px 18px", fontSize: 13, color: "white", lineHeight: 1.5, fontFamily: "system-ui", fontWeight: 500, background: "rgba(233,69,96,0.05)" }}>{right}</div>
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

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── CTA FINALE───────────────────────────────────── */}
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
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginBottom: 36, fontFamily: "system-ui, sans-serif", fontWeight: 300, lineHeight: 1.7 }}>
            {lang === "it"
              ? "Rispondi a poche domande e lascia che il posto giusto venga verso di te."
              : "Answer a few questions and let the right place come to you."}
          </p>
          <a href={startHref} className="cta-btn" data-testid="link-start-profiling"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#E94560", color: "white", fontSize: 15, fontWeight: 600, padding: "16px 36px", borderRadius: 50, boxShadow: "0 12px 36px rgba(233,69,96,0.25)", textDecoration: "none", fontFamily: "system-ui, sans-serif" }}>
            {lang === "it" ? "Scopri il tuo viaggio" : "Discover your trip"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────── */}
      <footer style={{ background: "#050709", borderTop: "1px solid rgba(255,255,255,0.05)", padding: "48px 24px 32px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
              {[{ label: "Instagram", icon: "◎" }, { label: "TikTok", icon: "◈" }].map(s => (
                <div key={s.label} style={{ marginBottom: 8 }}>
                  <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 11 }}>{s.icon}</span>{s.label}
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
