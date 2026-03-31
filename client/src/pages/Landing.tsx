import React, { useEffect, useRef, useState } from "react";
import { MatchingDemo } from "./MatchingDemo";
import { Link } from "wouter";
import { motion, useInView, AnimatePresence } from "framer-motion";
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

  return (
    <div style={{ background: "#080B12", color: "white", fontFamily: "'Georgia', serif", overflowX: "hidden", minHeight: "100vh" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes pulse { 0%,100% { opacity:0.15; } 50% { opacity:0.28; } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        @keyframes shimmer { to { left:100%; } }
        .fadeup-1 { animation: fadeUp 0.9s ease both; }
        .fadeup-2 { animation: fadeUp 0.9s 0.15s ease both; }
        .fadeup-3 { animation: fadeUp 0.9s 0.3s ease both; }
        .fadeup-4 { animation: fadeUp 0.9s 0.45s ease both; }
        .cta-btn { transition: all 0.25s ease; }
        .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 20px 50px rgba(233,69,96,0.35) !important; }
        .diff-row:hover { background: rgba(255,255,255,0.025) !important; }
        .step-card:hover { border-color: rgba(233,69,96,0.35) !important; transform: translateY(-2px); }
        .step-card { transition: all 0.25s ease; }
      `}</style>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", overflow: "hidden" }}>
        {/* Background */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(233,69,96,0.12), transparent)" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.015) 1px, transparent 0)", backgroundSize: "40px 40px" }} />

        <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center", position: "relative", zIndex: 1 }}>
          {/* Logo */}
          <div className="fadeup-1" style={{ marginBottom: 28 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              <Logo className="w-10 h-10" />
              <span style={{ fontSize: 20, fontWeight: 400, letterSpacing: -0.3, color: "rgba(255,255,255,0.9)" }}>MindRoute</span>
            </div>
          </div>

          {/* Kicker */}
          <div className="fadeup-1" style={{ marginBottom: 24 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.25)", padding: "5px 14px", borderRadius: 20, fontFamily: "system-ui, sans-serif" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E94560", display: "inline-block" }} />
              {lang === "it" ? "Profilazione di viaggio con IA" : "AI-powered travel profiling"}
            </span>
          </div>

          {/* H1 */}
          <h1 className="fadeup-2" style={{ fontSize: "clamp(44px, 8vw, 92px)", lineHeight: 0.95, letterSpacing: "-3px", fontWeight: 400, marginBottom: 28, maxWidth: 880, margin: "0 auto 28px" }}>
            {lang === "it" ? (
              <>Il viaggio inizia<br /><em style={{ fontStyle: "italic", color: "#E94560" }}>da chi sei</em></>
            ) : (
              <>Travel starts<br /><em style={{ fontStyle: "italic", color: "#E94560" }}>with who you are</em></>
            )}
          </h1>

          {/* Subtitle */}
          <p className="fadeup-3" style={{ fontSize: "clamp(16px,2.2vw,20px)", color: "rgba(255,255,255,0.5)", maxWidth: 620, margin: "0 auto 40px", lineHeight: 1.75, fontFamily: "system-ui, sans-serif", fontWeight: 300 }}>
            {lang === "it"
              ? "Non partiamo dalla meta. Partiamo da quello che si muove dentro di te, poi troviamo il luogo che ti somiglia davvero."
              : "We don't start with a destination. We start with what is moving inside you, then find the place that feels right."}
          </p>

          {/* CTA Row */}
          <div className="fadeup-4" style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", justifyContent: "center", marginBottom: 64 }}>
            <a href={startHref} className="cta-btn" data-testid="link-begin"
              style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#E94560", color: "white", fontSize: 15, fontWeight: 600, padding: "15px 32px", borderRadius: 50, boxShadow: "0 12px 36px rgba(233,69,96,0.28)", textDecoration: "none", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.2px" }}>
              {lang === "it" ? "Inizia il viaggio" : "Start your journey"}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 50, padding: "10px 18px 10px 10px" }}>
              <div style={{ display: "flex" }}>
                {["S","M","A"].map(l => <div key={l} style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F48B9A,#E94560)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", marginLeft: l === "S" ? 0 : -8, border: "2px solid #080B12", fontFamily: "system-ui" }}>{l}</div>)}
              </div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", fontFamily: "system-ui, sans-serif" }}>
                {lang === "it" ? "\"Sembra scritto per me.\"" : "\"It feels written for me.\""}
              </span>
            </div>
          </div>

          {/* Stats row */}
          <div className="fadeup-4" style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap" }}>
            {(lang === "it"
              ? [["7", "domande"], ["3", "mete in sintonia"], ["~3 min", "per scoprirle"]]
              : [["7", "questions"], ["3", "matched destinations"], ["~3 min", "to discover them"]]
            ).map(([val, label]) => (
              <div key={val} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: -1, color: "white", lineHeight: 1 }}>{val}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, fontFamily: "system-ui, sans-serif", letterSpacing: "0.5px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.3 }}>
          <span style={{ fontSize: 9, letterSpacing: "3px", textTransform: "uppercase", fontFamily: "system-ui" }}>
            {lang === "it" ? "scopri" : "scroll"}
          </span>
          <svg style={{ animation: "float 2s ease-in-out infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </div>
      </section>

   <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── COME FUNZIONA + MOCK ───────────────────────────── */}
      <section ref={howRef} style={{ padding: "100px 24px", position: "relative", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 10% 50%, rgba(233,69,96,0.05), transparent)" }} />

        <div style={{ maxWidth: 1180, margin: "0 auto", position: "relative" }}>
          {/* Section header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={howInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }} style={{ marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", marginBottom: 12, fontFamily: "system-ui, sans-serif" }}>
              {lang === "it" ? "Come prende forma" : "How it unfolds"}
            </p>
            <h2 style={{ fontSize: "clamp(30px,4vw,48px)", fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.05, maxWidth: 500 }}>
              {lang === "it" ? "Tre passi verso un posto che ti assomiglia" : "Three steps toward a place that feels yours"}
            </h2>
          </motion.div>

      {/* 3 step orizzontali */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 56 }}>
            {(lang === "it" ? [
              { n: "01", title: "Dicci chi sei", desc: "7 domande sul tuo modo di sentire, non sulle tue preferenze di viaggio.", icon: "💬" },
              { n: "02", title: "Scopri il tuo posto", desc: "Tre destinazioni costruite sul tuo profilo emotivo — mainstream, smart, e una scoperta.", icon: "🗺" },
              { n: "03", title: "Ottieni il tuo piano", desc: "Un itinerario completo, con ritmo, tono e logistica calibrati su di te.", icon: "📍" },
            ] : [
              { n: "01", title: "Tell us who you are", desc: "7 questions about how you feel right now, not your travel preferences.", icon: "💬" },
              { n: "02", title: "Discover your place", desc: "Three destinations built on your emotional profile — mainstream, smart, and a discovery.", icon: "🗺" },
              { n: "03", title: "Get your plan", desc: "A complete itinerary with rhythm, tone, and logistics calibrated to you.", icon: "📍" },
            ]).map((step, i) => (
              <motion.div key={step.n} initial={{ opacity: 0, y: 16 }} animate={howInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.12, duration: 0.6 }}
                className="step-card"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "24px 20px", display: "flex", gap: 16, alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 10, background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{step.icon}</div>
                <div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "system-ui", letterSpacing: "1px", marginBottom: 4 }}>{step.n}</div>
                  <div style={{ fontSize: 15, fontWeight: 400, marginBottom: 5, letterSpacing: -0.3 }}>{step.title}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, fontFamily: "system-ui, sans-serif", fontWeight: 300 }}>{step.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Trust badges */}
          <motion.div initial={{ opacity: 0 }} animate={howInView ? { opacity: 1 } : {}} transition={{ delay: 0.4 }} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 48 }}>
            {(lang === "it" ? ["🔒 100% privato", "⚡ ~3 minuti", "✨ Gratis"] : ["🔒 100% private", "⚡ ~3 minutes", "✨ Free"]).map(b => (
              <span key={b} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", fontFamily: "system-ui" }}>{b}</span>
            ))}
          </motion.div>

          {/* Demo full-width */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={howInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.3, duration: 0.8 }}>
            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", fontFamily: "system-ui" }}>
                {lang === "it" ? "Ecco cosa ricevi" : "This is what you get"}
              </span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
            </div>
            <MatchingDemo />
        </motion.div>
        </div>
      </section>
     <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── DIFFERENZA ───────────────────────────────────── */}
      <section ref={diffRef} style={{ padding: "100px 24px", position: "relative", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 90% 50%, rgba(233,69,96,0.05), transparent)" }} />

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 64, alignItems: "start" }}>
            {/* Left copy */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={diffInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", marginBottom: 16, fontFamily: "system-ui" }}>
                {lang === "it" ? "La differenza" : "Why it's different"}
              </p>
              <h2 style={{ fontSize: "clamp(28px,4vw,46px)", fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.06, marginBottom: 24 }}>
                {lang === "it" ? (
                  <>Gli altri chiedono <em style={{ color: "#E94560", fontStyle: "italic" }}>dove.</em><br />Noi chiediamo <em style={{ color: "#E94560", fontStyle: "italic" }}>perché.</em></>
                ) : (
                  <>Others ask <em style={{ color: "#E94560", fontStyle: "italic" }}>where.</em><br />We ask <em style={{ color: "#E94560", fontStyle: "italic" }}>why.</em></>
                )}
              </h2>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.85, fontFamily: "system-ui, sans-serif", fontWeight: 300, marginBottom: 20 }}>
                {lang === "it"
                  ? "La maggior parte dei travel planner parte dalla meta. MindRoute parte da te — da quel momento in cui senti che hai bisogno di cambiare aria anche se non sai ancora dove."
                  : "Most travel planners start with the destination. MindRoute starts with you — from that moment when you feel you need a change even if you don't know where yet."}
              </p>
              <p style={{ fontSize: 15, fontStyle: "italic", color: "#E94560", fontWeight: 400 }}>
                {lang === "it" ? "La destinazione è la risposta. Tu sei la domanda." : "The destination is the answer. You are the question."}
              </p>
            </motion.div>

            {/* Comparison table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={diffInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.15, duration: 0.7 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, overflow: "hidden" }}>
                {/* Header */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
                    {lang === "it" ? "Altri planner" : "Other planners"}
                  </div>
                  <div style={{ padding: "14px 18px", fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#E94560", fontFamily: "system-ui" }}>
                    MindRoute
                  </div>
                </div>
                {(lang === "it" ? [
                  ['"Dove vuoi andare?"', '"Che cosa ti manca davvero?"'],
                  ["Filtra per stelle e date", "Legge il tuo modo di viaggiare"],
                  ["Destinazioni popolari", "Luoghi che ti calzano addosso"],
                  ["Itinerario generico", "Piano calibrato sul tuo ritmo"],
                  ["Ottimizza la logistica", "Ottimizza come vuoi stare"],
                ] : [
                  ['"Where do you want to go?"', '"What have you been missing?"'],
                  ["Filters by stars and dates", "Reads your traveler identity"],
                  ["Popular destinations", "Places that actually fit you"],
                  ["Generic itinerary", "Plan tuned to your pace"],
                  ["Optimizes logistics", "Optimizes how you want to feel"],
                ]).map(([left, right], i) => (
                  <div key={i} className="diff-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s" }}>
                    <div style={{ padding: "13px 18px", fontSize: 13, color: "rgba(255,255,255,0.25)", lineHeight: 1.5, fontFamily: "system-ui", borderRight: "1px solid rgba(255,255,255,0.05)" }}>{left}</div>
                    <div style={{ padding: "13px 18px", fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.5, fontFamily: "system-ui", fontWeight: 500, background: "rgba(233,69,96,0.04)" }}>{right}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

     <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── CTA FINALE ───────────────────────────────────── */}
      <section ref={ctaRef} style={{ padding: "100px 24px 80px", textAlign: "center", position: "relative", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(233,69,96,0.08), transparent)" }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={ctaInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
          <Logo className="w-12 h-12" />
          <h2 style={{ fontSize: "clamp(26px,4vw,44px)", fontWeight: 400, letterSpacing: -1.5, lineHeight: 1.1, margin: "24px 0 16px" }}>
            {lang === "it" ? "Smetti di forzare la meta.\nInizia ad ascoltarti davvero." : "Stop forcing the destination.\nStart listening to yourself."}
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", marginBottom: 36, fontFamily: "system-ui, sans-serif", fontWeight: 300, lineHeight: 1.7 }}>
            {lang === "it" ? "Rispondi a poche domande e lascia che il posto giusto venga verso di te." : "Answer a few questions and let the right place come closer."}
          </p>
          <a href={startHref} className="cta-btn" data-testid="link-start-profiling"
            style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#E94560", color: "white", fontSize: 15, fontWeight: 600, padding: "16px 36px", borderRadius: 50, boxShadow: "0 12px 36px rgba(233,69,96,0.25)", textDecoration: "none", fontFamily: "system-ui, sans-serif" }}>
            {lang === "it" ? "Inizia il tuo profilo" : "Begin your profile"}
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
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.7, fontFamily: "system-ui", maxWidth: 200 }}>
                {lang === "it" ? "Viaggi costruiti sul tuo carattere, non sulle tue preferenze." : "Trips built around who you are, not what you filter for."}
              </p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui", marginBottom: 12 }}>{lang === "it" ? "Prodotto" : "Product"}</p>
              {[{ href: "/profiling", label: lang === "it" ? "Inizia il viaggio" : "Start journey" }, { href: "/privacy", label: "Privacy Policy" }].map(l => (
                <div key={l.href} style={{ marginBottom: 8 }}>
                  <Link href={l.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", fontFamily: "system-ui" }}>{l.label}</Link>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui", marginBottom: 12 }}>{lang === "it" ? "Contatti" : "Contact"}</p>
              <a href="mailto:mindroutetravel@gmail.com" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", fontFamily: "system-ui" }}>mindroutetravel@gmail.com</a>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", fontFamily: "system-ui", marginBottom: 12 }}>Social</p>
              {[{ label: "Instagram", icon: "◎" }, { label: "TikTok", icon: "◈" }].map(s => (
                <div key={s.label} style={{ marginBottom: 8 }}>
                  <a href="#" style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 6 }}>
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
