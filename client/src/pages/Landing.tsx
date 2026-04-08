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
      `}</style>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section ref={heroRef} style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "120px 24px 80px", overflow: "hidden" }}>
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
          <div className="fadeup-1" style={{ marginBottom: 28 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.25)", padding: "5px 14px", borderRadius: 20, fontFamily: "system-ui, sans-serif" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#E94560", display: "inline-block" }} />
              {lang === "it" ? "Profilazione di viaggio con IA" : "AI-powered travel profiling"}
            </span>
          </div>

          {/* H1 */}
          <h1 className="fadeup-2 hero-h1" style={{ fontSize: "clamp(38px, 7vw, 82px)", lineHeight: 1.05, letterSpacing: "-2.5px", fontWeight: 400, marginBottom: 28, maxWidth: 860, margin: "0 auto 28px" }}>
            {lang === "it" ? (
              <>
                <em style={{ fontStyle: "italic", color: "white", display: "block" }}>Non è difficile trovare un posto dove andare.</em>
                <em style={{ fontStyle: "italic", color: "#E94560", display: "block" }}>È difficile trovare quello giusto per te.</em>
              </>
            ) : (
              <>
                <em style={{ fontStyle: "italic", color: "white", display: "block" }}>Finding a place to go isn't hard.</em>
                <em style={{ fontStyle: "italic", color: "#E94560", display: "block" }}>Finding the right one for you is.</em>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="fadeup-3" style={{ fontSize: "clamp(16px, 2.2vw, 19px)", color: "rgba(255,255,255,0.75)", maxWidth: 580, margin: "0 auto 40px", lineHeight: 1.75, fontFamily: "system-ui, sans-serif", fontWeight: 300 }}>
            {lang === "it"
              ? "MindRoute trasforma come stai in un viaggio concreto: destinazione, itinerario e prenotazioni pronte. In meno di 3 minuti."
              : "MindRoute turns how you feel into a real trip: destination, itinerary and bookings ready. In under 3 minutes."}
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
        </div>

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

      {/* ── COME FUNZIONA ───────────────────────────────── */}
      <section ref={howRef} style={{ padding: "100px 24px", position: "relative", background: "#0E1219", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,120,255,0.05), transparent)" }} />

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
              { n: "02", title: "Scopri il tuo posto", desc: "Tre destinazioni costruite su di te: una sicura, una inaspettata, una nel mezzo. Ognuna spiegata — perché ti somiglia, non perché è popolare.", icon: "🗺" },
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
                  {lang === "it" ? "Questo è quello che ricevi — non un suggerimento, un piano vero." : "This is what you get — not a suggestion, a real plan."}
                </p>
              </div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(233,69,96,0.12)", border: "1px solid rgba(233,69,96,0.30)", borderRadius: 20, padding: "6px 14px" }}>
                <span className="live-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#E94560", display: "inline-block" }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "#E94560", fontFamily: "system-ui" }}>Live</span>
              </div>
            </div>

            {/* Demo component */}
            <div style={{ borderRadius: 24, padding: 3, background: "linear-gradient(135deg, rgba(233,69,96,0.15), rgba(255,255,255,0.04))", boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)" }}>
              <MatchingDemo />
            </div>

            {/* Output strip */}
            <div className="output-strip" style={{ display: "flex", gap: 0, marginTop: 24, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, overflow: "hidden" }}>
              {(lang === "it" ? [
                { icon: "✦", label: "Destinazione su misura", desc: "Costruita sul tuo profilo psicologico, non su cosa è di tendenza" },
                { icon: "📍", label: "Itinerario completo", desc: "Ogni giorno organizzato, con ritmo e tono calibrati su di te" },
                { icon: "🔗", label: "Tutto organizzato", desc: "Voli, hotel ed esperienze a portata di click, in un unico posto" },
              ] : [
                { icon: "✦", label: "Matched destination", desc: "Built on your psychological profile, not on what's trending" },
                { icon: "📍", label: "Complete itinerary", desc: "Every day organized, with rhythm and tone calibrated to you" },
                { icon: "🔗", label: "Everything organized", desc: "Flights, hotels and experiences one click away, all in one place" },
              ]).map((item, i) => (
                <div key={i} style={{ flex: 1, padding: "20px 22px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>{item.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "white", marginBottom: 5, fontFamily: "system-ui" }}>{item.label}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, fontFamily: "system-ui", fontWeight: 300 }}>{item.desc}</div>
                </div>
              ))}
            </div>

            {/* Frase sotto */}
            <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "rgba(255,255,255,0.55)", fontFamily: "system-ui, sans-serif", fontStyle: "italic" }}>
              {lang === "it"
                ? "Apri, scegli e prenoti. Senza saltare tra 10 siti diversi."
                : "Open, choose and book. Without jumping between 10 different sites."}
            </p>
          </motion.div>
        </div>
      </section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── DIFFERENZA ───────────────────────────────────── */}
      <section ref={diffRef} style={{ padding: "100px 24px", position: "relative", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
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
                  <>Gli altri ti fanno scegliere.<br />Noi ti togliamo il dubbio.</>
                ) : (
                  <>Others make you choose.<br />We remove the doubt.</>
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
      </section>

      <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.5), transparent)", margin: "0 10%" }} />

      {/* ── CTA FINALE ───────────────────────────────────── */}
      <section ref={ctaRef} style={{ padding: "100px 24px 80px", textAlign: "center", position: "relative", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(233,69,96,0.08), transparent)" }} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={ctaInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} style={{ maxWidth: 640, margin: "0 auto", position: "relative" }}>
          <Logo className="w-12 h-12" />
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
