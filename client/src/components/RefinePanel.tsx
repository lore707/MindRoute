// ─────────────────────────────────────────────────────────────────────────
// RefinePanel.tsx — Onboarding L2 (questionario sequenziale post-generazione)
//
// DESIGN: stesso linguaggio cinematic di L1 (quiz-cinematic.css) — overlay a
// tutto schermo, foto di sfondo che cambia in crossfade, titolo editoriale
// serif, opzioni qc-option, CTA shimmer. Le immagini sono gli stessi scatti del
// quiz (questionThemes).
//
// LOGICA: l'utente vede già il primo itinerario; un invito ("ti somiglia al
// X%") apre l'overlay e risponde a TUTTE le domande L2 aperte una in fila
// all'altra (ritmo/compagnia/dove dormi/come mangi/come ti muovi/cosa eviti/da
// dove parti). Le risposte si accumulano in locale: NESSUNA rigenerazione tra
// una domanda e l'altra. Solo alla fine parte UNA singola POST /refine con tutti
// i campi → una rigenerazione completa sulla stessa meta → coverage che sale.
//
// La % è onesta: copertura reale del profilo (shared/profile-coverage.ts). Parte
// ~55% (solo L1) e arriva a 100%. Durante il questionario mostriamo la %
// OTTIMISTICA (profilo + bozza) così la barra cresce a ogni risposta.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";
import "@/styles/quiz-cinematic.css";
import { computeCoverage, type CoverageDimKey } from "@shared/profile-coverage";
import { questionThemes } from "@/pages/profiling/questionThemes";

type Lang = "it" | "en";
const L = (lang: Lang, it: string, en: string) => (lang === "it" ? it : en);

// Risolve l'immagine di sfondo da una chiave-tema (gli stessi scatti del quiz).
const themeImg = (key: string) =>
  (questionThemes[key] ?? questionThemes.default).imageUrl.replace("w=1200", "w=1600");

type Opt = { value: string; it: string; en: string; emoji: string; theme?: string; meta_it?: string; meta_en?: string };
type DimField = "pace" | "companions" | "accommodation" | "food" | "travelStyle" | "departure" | "avoid";

// Set di opzioni per ogni dimensione L2 → mappate sul campo profilo che il
// generatore v2 sa leggere (vedi buildConstraintsFromProfile lato server).
const OPTIONS: Record<Exclude<CoverageDimKey, "destination" | "duration" | "budget">, {
  field: DimField;
  multi?: boolean;
  text?: boolean;
  bgTheme: string; // sfondo di default della domanda
  opts?: Opt[];
}> = {
  pace: {
    field: "pace", bgTheme: "slowdown",
    opts: [
      { value: "relaxed", it: "Più relax", en: "More relaxed", emoji: "🍃", theme: "slowdown", meta_it: "giornate ariose, pause vere", meta_en: "airy days, real pauses" },
      { value: "balanced", it: "Equilibrato", en: "Balanced", emoji: "⚖️", theme: "authentic", meta_it: "un ritmo che respira", meta_en: "a breathing rhythm" },
      { value: "intense", it: "Più intense", en: "More intense", emoji: "🔥", theme: "adventure", meta_it: "riempire ogni ora", meta_en: "fill every hour" },
    ],
  },
  companions: {
    field: "companions", bgTheme: "intimate",
    opts: [
      { value: "solo", it: "Da solo", en: "Solo", emoji: "🚶", theme: "solitary", meta_it: "il mio passo, le mie scelte", meta_en: "my pace, my choices" },
      { value: "couple", it: "In coppia", en: "As a couple", emoji: "💞", theme: "intimate", meta_it: "due, e basta", meta_en: "just the two of us" },
      { value: "friends", it: "Con amici", en: "With friends", emoji: "🎉", theme: "festive", meta_it: "energia di gruppo", meta_en: "group energy" },
      { value: "family", it: "In famiglia", en: "With family", emoji: "👨‍👩‍👧", theme: "nature", meta_it: "ritmi per tutti", meta_en: "a pace for everyone" },
    ],
  },
  accommodation: {
    field: "accommodation", bgTheme: "quietluxury",
    opts: [
      { value: "hostel", it: "Ostello", en: "Hostel", emoji: "🎒", theme: "offgrid", meta_it: "essenziale, sociale", meta_en: "lean, social" },
      { value: "budget", it: "Hotel semplice", en: "Simple hotel", emoji: "🏨", theme: "city", meta_it: "comodo senza pensieri", meta_en: "comfortable, no fuss" },
      { value: "boutique", it: "Boutique / Design", en: "Boutique / Design", emoji: "🛋", theme: "authentic", meta_it: "carattere e dettaglio", meta_en: "character and detail" },
      { value: "luxury", it: "Lusso", en: "Luxury", emoji: "🥂", theme: "quietluxury", meta_it: "il meglio, senza ostentare", meta_en: "the best, understated" },
    ],
  },
  food: {
    field: "food", bgTheme: "food",
    opts: [
      { value: "street", it: "Street food", en: "Street food", emoji: "🌮", theme: "food", meta_it: "dove mangia la gente", meta_en: "where locals eat" },
      { value: "local", it: "Locali autentici", en: "Authentic local spots", emoji: "🍷", theme: "authentic", meta_it: "trattorie, niente trappole", meta_en: "real spots, no traps" },
      { value: "mix", it: "Un mix", en: "A mix", emoji: "🍽", theme: "food", meta_it: "un po' di tutto", meta_en: "a bit of everything" },
      { value: "foodie", it: "Esperienze gastronomiche", en: "Fine dining", emoji: "✨", theme: "quietluxury", meta_it: "tavoli che ricordi", meta_en: "tables you remember" },
    ],
  },
  movement: {
    field: "travelStyle", bgTheme: "discovery",
    opts: [
      { value: "fixed", it: "Base fissa", en: "Single base", emoji: "📍", theme: "city", meta_it: "una casa, niente valigie", meta_en: "one home, no repacking" },
      { value: "two", it: "Due basi", en: "Two bases", emoji: "🔀", theme: "cultural", meta_it: "il meglio di due luoghi", meta_en: "the best of two places" },
      { value: "roadtrip", it: "Road trip", en: "Road trip", emoji: "🚐", theme: "roadtrip", meta_it: "la strada è il viaggio", meta_en: "the road is the trip" },
      { value: "discover", it: "Scoperta continua", en: "Always moving", emoji: "🧭", theme: "discovery", meta_it: "ogni notte un posto nuovo", meta_en: "a new place each night" },
    ],
  },
  avoid: {
    field: "avoid", multi: true, bgTheme: "quiet",
    opts: [
      { value: "crowds", it: "Folla e turisti", en: "Crowds & tourists", emoji: "👥" },
      { value: "museums", it: "Troppi musei", en: "Too many museums", emoji: "🏛" },
      { value: "early", it: "Sveglie presto", en: "Early mornings", emoji: "⏰" },
      { value: "long_walks", it: "Lunghe camminate", en: "Long walks", emoji: "👟" },
      { value: "nightlife", it: "Vita notturna", en: "Nightlife", emoji: "🎵" },
      { value: "long_transfers", it: "Lunghi spostamenti", en: "Long transfers", emoji: "🚆" },
    ],
  },
  departure: {
    field: "departure", text: true, bgTheme: "city",
  },
};

interface Props {
  itineraryId: number;
  profilingInput: any;
  schemaVersion: number;
  lang: Lang;
  onRefined: () => Promise<unknown> | void;
}

export function RefinePanel({ itineraryId, profilingInput, schemaVersion, lang, onRefined }: Props) {
  const coverage = useMemo(() => computeCoverage(profilingInput ?? {}), [profilingInput]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  // ── Stato del questionario sequenziale ────────────────────────────────────
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [textVal, setTextVal] = useState("");
  const [picked, setPicked] = useState<string | null>(null); // highlight prima di avanzare

  // Le dimensioni aperte vengono "congelate": non rigeneriamo finché non finisce,
  // quindi coverage.open resta stabile durante tutto il flusso.
  const queue = coverage.open;
  const total = queue.length;
  const activeDim = queue[idx] ?? null;
  const isLast = idx >= total - 1;
  const cfg = activeDim ? (OPTIONS as any)[activeDim.key] : null;

  // % ottimistica: profilo persistito + risposte già date in bozza.
  const optimistic = useMemo(
    () => computeCoverage({ ...(profilingInput ?? {}), ...draft }),
    [profilingInput, draft],
  );

  // ── Sfondo crossfade (doppio buffer, come L1) ─────────────────────────────
  const firstImg = themeImg(OPTIONS[(coverage.open[0]?.key as keyof typeof OPTIONS) ?? "pace"]?.bgTheme ?? "default");
  const [activeImg, setActiveImg] = useState(firstImg);
  const [imgA, setImgA] = useState(firstImg);
  const [imgB, setImgB] = useState("");
  const [showA, setShowA] = useState(true);
  const prevImg = useRef(firstImg);
  useEffect(() => {
    if (activeImg === prevImg.current) return;
    prevImg.current = activeImg;
    if (showA) { setImgB(activeImg); setShowA(false); }
    else { setImgA(activeImg); setShowA(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImg]);

  // Al cambio domanda → sfondo di default della dimensione.
  useEffect(() => {
    if (cfg) setActiveImg(themeImg(cfg.bgTheme ?? "default"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDim?.key]);

  const hoverBg = (theme?: string) => setActiveImg(themeImg(theme ?? cfg?.bgTheme ?? "default"));

  const reset = () => { setDraft({}); setIdx(0); setMultiSel([]); setTextVal(""); setPicked(null); setErr(""); setDone(false); };

  // Apertura automatica al primo arrivo dal funnel veloce (?l2=1).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("l2") === "1" && coverage.open.length > 0) {
      reset();
      setOpen(true);
      p.delete("l2");
      const qs = p.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blocca lo scroll del body SOLO mentre l'overlay è aperto, ripristinando il
  // valore precedente alla chiusura/smontaggio. Evita di toccare il body quando
  // chiuso (così non blocca mai lo scroll delle pagine).
  useEffect(() => {
    if (typeof document === "undefined" || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Rete di sicurezza: qualunque cosa accada, allo smontaggio del componente il
  // body torna scrollabile (così l'overlay non può MAI lasciare la pagina bloccata).
  useEffect(() => {
    return () => { if (typeof document !== "undefined") document.body.style.overflow = ""; };
  }, []);

  // Esc chiude l'overlay — non si resta mai "intrappolati".
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) { setOpen(false); reset(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  // Refine disponibile solo sugli itinerari moment-based (v2).
  if (schemaVersion !== 2) return null;

  const openPanel = () => { reset(); setOpen(true); };
  const closePanel = () => { if (!busy) { setOpen(false); reset(); } };

  // Invio finale: una sola chiamata con tutte le risposte → una rigenerazione.
  const finalize = async (patch: Record<string, any>) => {
    if (Object.keys(patch).length === 0) { setOpen(false); reset(); return; }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/itinerary/${itineraryId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "refine failed");
      await onRefined();
      setDone(true);
    } catch (e: any) {
      setErr(L(lang, "Non sono riuscito a rigenerare. Riprova.", "Couldn't regenerate. Try again."));
    } finally {
      setBusy(false);
    }
  };

  // Passa alla prossima domanda, oppure rigenera se era l'ultima.
  const advance = (nextDraft: Record<string, any>) => {
    setMultiSel([]); setTextVal(""); setPicked(null);
    if (isLast) finalize(nextDraft);
    else setIdx((i) => i + 1);
  };

  const pickSingle = (field: DimField, value: string) => {
    setPicked(value);
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    setTimeout(() => advance(nextDraft), 260); // breve highlight, come L1
  };
  const confirmMulti = (field: DimField) => {
    const nextDraft = multiSel.length ? { ...draft, [field]: multiSel } : { ...draft };
    setDraft(nextDraft);
    advance(nextDraft);
  };
  const confirmText = (field: DimField) => {
    const v = textVal.trim();
    const nextDraft = v.length >= 2 ? { ...draft, [field]: v } : { ...draft };
    setDraft(nextDraft);
    advance(nextDraft);
  };
  const skip = () => advance({ ...draft });

  const pct = coverage.pct;
  const optimisticPct = optimistic.pct;
  const allDone = coverage.open.length === 0;

  // ── Banner fisso (sempre visibile finché il profilo non è pieno) ──────────
  const Banner = (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={openPanel}
      data-testid="refine-open"
      className="fixed z-[120] bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-full shadow-[0_12px_40px_rgba(233,69,96,0.35)] border border-[#E94560]/40 cursor-pointer"
      style={{ background: "linear-gradient(120deg, rgba(20,12,18,0.92), rgba(40,16,28,0.92))", backdropFilter: "blur(10px)" }}
    >
      <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[#E94560]/15">
        <Sparkles className="w-4 h-4 text-[#E94560]" />
      </span>
      <span className="text-left">
        <span className="block text-[13px] font-semibold text-white leading-tight">
          {allDone
            ? L(lang, "Questo viaggio ti somiglia al 100%", "This trip is 100% you")
            : L(lang, `Ti somiglia al ${pct}%`, `${pct}% you`)}
        </span>
        {!allDone && (
          <span className="block text-[11px] text-white/55 leading-tight">
            {L(lang, `${total} domande per renderlo tuo`, `${total} questions to make it yours`)}
          </span>
        )}
      </span>
      {!allDone && (
        <span className="ml-1 w-14 h-1.5 rounded-full bg-white/15 overflow-hidden">
          <span className="block h-full bg-[#E94560]" style={{ width: `${pct}%` }} />
        </span>
      )}
    </motion.button>
  );

  // ── Sfondo cinematic (come L1) ────────────────────────────────────────────
  const Bg = (
    <>
      <div className="qc-bg-stage" aria-hidden>
        <div className="qc-bg-photo" style={{ backgroundImage: imgA ? `url("${imgA}")` : undefined, opacity: showA ? 1 : 0 }} />
        <div className="qc-bg-photo" style={{ backgroundImage: imgB ? `url("${imgB}")` : undefined, opacity: showA ? 0 : 1 }} />
      </div>
      <div className="qc-grain" aria-hidden />
    </>
  );

  return (
    <>
      {!open && Banner}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="quiz-cinematic"
            style={{ position: "fixed", inset: 0, zIndex: 200, overflowY: "auto" }}
          >
            {Bg}

            {/* close — visibile e solido così non si resta intrappolati */}
            <button
              onClick={closePanel}
              data-testid="refine-close"
              style={{
                position: "fixed", top: 18, right: 18, zIndex: 20,
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 999,
                background: "rgba(233,69,96,0.92)", color: "#fff", fontWeight: 600, fontSize: 13,
                border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 8px 24px -8px rgba(0,0,0,0.6)",
              }}
            >
              ✕ {L(lang, "Chiudi", "Close")}
            </button>

            {/* click sull'area scura (fuori dal contenuto) = chiudi */}
            <div className="qc-stage" onClick={(e) => { if (e.target === e.currentTarget && !busy) { setOpen(false); reset(); } }}>
              <div className="qc-container" style={{ paddingLeft: 56 }}>
                {/* header strip con progress ottimistico */}
                <div className="qc-header-strip">
                  <span className="qc-label">MindRoute</span>
                  <span className="qc-progress-line"><span className="qc-fill" style={{ width: `${optimisticPct}%` }} /></span>
                  <span className="qc-count">
                    {busy || done || allDone ? `${optimisticPct}%` : `${Math.min(idx + 1, total)} / ${total}`}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {busy ? (
                    <motion.div key="busy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", minHeight: "55vh" }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", border: "2px solid #E94560", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                      <p className="qc-q-sub" style={{ marginTop: 26, justifyContent: "center", maxWidth: 460 }}>
                        {L(lang, "Sto riscrivendo il viaggio su di te…", "Rewriting the trip around you…")}
                      </p>
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                    </motion.div>
                  ) : done || allDone ? (
                    <motion.div key="done" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      style={{ textAlign: "center", maxWidth: 640, margin: "0 auto", paddingTop: 24 }}>
                      <div className="qc-q-head qc-center">
                        <span className="qc-q-eyebrow"><strong>{coverage.open.length === 0 ? L(lang, "Profilo completo", "Profile complete") : L(lang, "Aggiornato", "Updated")}</strong></span>
                        <h1 className="qc-q-title">
                          {coverage.open.length === 0
                            ? <>{L(lang, "Ora ti somiglia al ", "Now it's ")}<em>100%</em></>
                            : <>{L(lang, "Viaggio ", "Trip ")}<em>{L(lang, "riscritto", "rewritten")}</em></>}
                        </h1>
                        <p className="qc-q-sub" style={{ justifyContent: "center" }}>
                          {coverage.open.length === 0
                            ? L(lang, "Ogni risposta resta nel tuo profilo per i prossimi viaggi.", "Everything you answer stays in your profile for next trips.")
                            : L(lang, "L'ho riscritto sulle tue risposte. Puoi affinarlo ancora quando vuoi.", "I rewrote it around your answers. You can refine it further anytime.")}
                        </p>
                      </div>
                      {/* Handoff al companion: il passo successivo del funnel — perfeziona
                          ancora o chiedi un dettaglio, con accesso al web in tempo reale. */}
                      <p className="qc-q-sub" style={{ justifyContent: "center", fontSize: 14, marginTop: 22 }}>
                        {L(lang, "Vuoi limarlo ancora o chiedere un dettaglio? Il tuo compagno di viaggio può perfezionarlo con te — e cercare sul web in tempo reale.",
                                "Want to fine-tune it or ask a detail? Your travel companion can perfect it with you — and search the live web.")}
                      </p>
                      <div className="qc-nav" style={{ justifyContent: "center", borderTop: "none", marginTop: 12, paddingTop: 0 }}>
                        <button className="qc-back" onClick={() => { setOpen(false); reset(); }}>
                          {L(lang, "Torna al viaggio", "Back to the trip")}
                        </button>
                        <button
                          className="qc-continue"
                          data-testid="refine-open-companion"
                          onClick={() => {
                            setOpen(false); reset();
                            if (typeof window !== "undefined") window.dispatchEvent(new Event("mindroute:open-companion"));
                          }}
                        >
                          {L(lang, "Chiedi al compagno", "Ask the companion")} →
                        </button>
                      </div>
                    </motion.div>
                  ) : activeDim && cfg ? (
                    <motion.div key={activeDim.key} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4 }}>
                      <div className="qc-q-head">
                        <span className="qc-q-eyebrow"><strong>{lang === "it" ? activeDim.label_it : activeDim.label_en}</strong></span>
                        <h1 className="qc-q-title">{lang === "it" ? activeDim.question_it : activeDim.question_en}</h1>
                      </div>

                      {cfg.text ? (
                        <div style={{ maxWidth: 560 }}>
                          <input
                            autoFocus value={textVal}
                            onChange={(e) => setTextVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") confirmText(cfg.field); }}
                            placeholder={L(lang, "La tua città di partenza…", "Your departure city…")}
                            data-testid="refine-text" className="qc-precise-input" style={{ fontSize: 18, padding: "18px 22px" }}
                          />
                          <div className="qc-nav">
                            <button className="qc-back" onClick={skip} data-testid="refine-skip">{L(lang, "Salta", "Skip")}</button>
                            <button className="qc-continue" onClick={() => confirmText(cfg.field)} data-testid="refine-continue">
                              {isLast ? L(lang, "Genera il viaggio", "Generate the trip") : L(lang, "Continua", "Continue")} →
                            </button>
                          </div>
                        </div>
                      ) : cfg.multi ? (
                        <div style={{ maxWidth: 720 }}>
                          <div className="qc-options qc-options-twocol">
                            {cfg.opts.map((o: Opt) => {
                              const sel = multiSel.includes(o.value);
                              return (
                                <div
                                  key={o.value}
                                  className={`qc-option ${sel ? "selected" : ""}`}
                                  onClick={() => setMultiSel(sel ? multiSel.filter((v) => v !== o.value) : [...multiSel, o.value])}
                                  data-testid={`refine-opt-${o.value}`}
                                >
                                  <div className="qc-option-ic">{o.emoji}</div>
                                  <div className="qc-option-body"><div className="qc-option-name">{L(lang, o.it, o.en)}</div></div>
                                  <div className="qc-option-mark"><span className="qc-circle" /></div>
                                </div>
                              );
                            })}
                          </div>
                          <div className="qc-nav">
                            <button className="qc-back" onClick={skip} data-testid="refine-skip">{L(lang, "Salta", "Skip")}</button>
                            <button className="qc-continue" onClick={() => confirmMulti(cfg.field)} data-testid="refine-continue">
                              {multiSel.length === 0
                                ? L(lang, "Niente da evitare", "Nothing to avoid")
                                : isLast ? L(lang, "Genera il viaggio", "Generate the trip") : L(lang, "Continua", "Continue")} →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ maxWidth: 720 }}>
                          <div className="qc-options">
                            {cfg.opts.map((o: Opt) => (
                              <div
                                key={o.value}
                                className={`qc-option ${picked === o.value ? "selected" : ""}`}
                                onMouseEnter={() => hoverBg(o.theme)} onMouseLeave={() => hoverBg()}
                                onClick={() => pickSingle(cfg.field, o.value)}
                                data-testid={`refine-opt-${o.value}`}
                              >
                                <div className="qc-option-ic">{o.emoji}</div>
                                <div className="qc-option-body">
                                  <div className="qc-option-name">{L(lang, o.it, o.en)}</div>
                                  {(o.meta_it || o.meta_en) && <div className="qc-option-meta">{L(lang, o.meta_it ?? "", o.meta_en ?? "")}</div>}
                                </div>
                                <div className="qc-option-mark"><span className="qc-circle" /></div>
                              </div>
                            ))}
                          </div>
                          <div className="qc-nav">
                            <button className="qc-back" onClick={skip} data-testid="refine-skip">{L(lang, "Salta", "Skip")}</button>
                            <span className="qc-q-sub" style={{ fontSize: 13, maxWidth: 340 }}>
                              {L(lang, "Scegli e si va avanti. Generi alla fine.", "Pick one and we move on. Generation runs at the end.")}
                            </span>
                          </div>
                        </div>
                      )}

                      {err && <p style={{ marginTop: 18, color: "#E94560", fontSize: 13 }}>{err}</p>}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
