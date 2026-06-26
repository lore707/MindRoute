// ─────────────────────────────────────────────────────────────────────────
// RefinePanel.tsx — Onboarding L2 (questionario sequenziale post-generazione)
//
// L'utente vede già il primo itinerario; sopra appare un invito ("ti somiglia
// al X%") e, a sua richiesta, risponde a TUTTE le domande L2 aperte una in fila
// all'altra (ritmo/compagnia/dove dormi/come mangi/come ti muovi/cosa eviti/da
// dove parti). Le risposte si accumulano in locale: NESSUNA rigenerazione tra
// una domanda e l'altra. Solo alla fine parte UNA singola POST /refine con tutti
// i campi → una rigenerazione completa sulla stessa meta → coverage che sale.
//
// La % è onesta: copertura reale del profilo (shared/profile-coverage.ts), la
// stessa calcolata server-side. Parte ~55% (solo L1) e arriva a 100%. Durante il
// questionario mostriamo la % OTTIMISTICA (profilo + bozza) così la barra cresce
// a ogni risposta, prima ancora di rigenerare.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, ArrowRight } from "lucide-react";
import { computeCoverage, type CoverageDimKey } from "@shared/profile-coverage";
import { questionThemes } from "@/pages/profiling/questionThemes";

type Lang = "it" | "en";
const L = (lang: Lang, it: string, en: string) => (lang === "it" ? it : en);

// Miniatura dalla stessa libreria di scatti del quiz (questionThemes).
const themeThumb = (key?: string) =>
  key ? (questionThemes[key] ?? questionThemes.default).imageUrl.replace("w=1200", "w=240") : "";

type Opt = { value: string; it: string; en: string; theme?: string };
type DimField = "pace" | "companions" | "accommodation" | "food" | "travelStyle" | "departure" | "avoid";

// Set di opzioni per ogni dimensione L2 → mappate sul campo profilo che il
// generatore v2 sa leggere (vedi buildConstraintsFromProfile lato server).
const OPTIONS: Record<Exclude<CoverageDimKey, "destination" | "duration" | "budget">, {
  field: DimField;
  multi?: boolean;
  text?: boolean;
  opts?: Opt[];
}> = {
  pace: {
    field: "pace",
    opts: [
      { value: "relaxed", it: "Più relax", en: "More relaxed", theme: "slowdown" },
      { value: "balanced", it: "Equilibrato", en: "Balanced", theme: "authentic" },
      { value: "intense", it: "Più intense", en: "More intense", theme: "adventure" },
    ],
  },
  companions: {
    field: "companions",
    opts: [
      { value: "solo", it: "Da solo", en: "Solo", theme: "solitary" },
      { value: "couple", it: "In coppia", en: "As a couple", theme: "intimate" },
      { value: "friends", it: "Con amici", en: "With friends", theme: "festive" },
      { value: "family", it: "In famiglia", en: "With family", theme: "nature" },
    ],
  },
  accommodation: {
    field: "accommodation",
    opts: [
      { value: "hostel", it: "Ostello", en: "Hostel", theme: "offgrid" },
      { value: "budget", it: "Hotel semplice", en: "Simple hotel", theme: "city" },
      { value: "boutique", it: "Boutique / Design", en: "Boutique / Design", theme: "authentic" },
      { value: "luxury", it: "Lusso", en: "Luxury", theme: "quietluxury" },
    ],
  },
  food: {
    field: "food",
    opts: [
      { value: "street", it: "Street food", en: "Street food", theme: "food" },
      { value: "local", it: "Locali autentici", en: "Authentic local spots", theme: "authentic" },
      { value: "mix", it: "Un mix", en: "A mix", theme: "food" },
      { value: "foodie", it: "Esperienze gastronomiche", en: "Fine dining", theme: "quietluxury" },
    ],
  },
  movement: {
    field: "travelStyle",
    opts: [
      { value: "fixed", it: "Base fissa", en: "Single base", theme: "city" },
      { value: "two", it: "Due basi", en: "Two bases", theme: "cultural" },
      { value: "roadtrip", it: "Road trip", en: "Road trip", theme: "roadtrip" },
      { value: "discover", it: "Scoperta continua", en: "Always moving", theme: "discovery" },
    ],
  },
  avoid: {
    field: "avoid",
    multi: true,
    opts: [
      { value: "crowds", it: "Folla e turisti", en: "Crowds & tourists" },
      { value: "museums", it: "Troppi musei", en: "Too many museums" },
      { value: "early", it: "Sveglie presto", en: "Early mornings" },
      { value: "long_walks", it: "Lunghe camminate", en: "Long walks" },
      { value: "nightlife", it: "Vita notturna", en: "Nightlife" },
      { value: "long_transfers", it: "Lunghi spostamenti", en: "Long transfers" },
    ],
  },
  departure: {
    field: "departure",
    text: true,
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
  // Le risposte si accumulano qui (keyed by campo profilo). Si invia tutto in
  // una sola POST /refine alla fine.
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [idx, setIdx] = useState(0);
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [textVal, setTextVal] = useState("");

  // Le dimensioni aperte vengono "congelate" all'apertura: non rigeneriamo finché
  // non finisce, quindi coverage.open resta stabile durante tutto il flusso.
  const queue = coverage.open;
  const total = queue.length;
  const activeDim = queue[idx] ?? null;
  const isLast = idx >= total - 1;

  // % ottimistica: profilo persistito + risposte già date in bozza.
  const optimistic = useMemo(
    () => computeCoverage({ ...(profilingInput ?? {}), ...draft }),
    [profilingInput, draft],
  );

  const reset = () => { setDraft({}); setIdx(0); setMultiSel([]); setTextVal(""); setErr(""); setDone(false); };

  // Apertura automatica al primo arrivo dal funnel veloce (?l2=1).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("l2") === "1" && coverage.open.length > 0) {
      reset();
      setOpen(true);
      // pulisci il flag così un reload non riapre
      p.delete("l2");
      const qs = p.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setMultiSel([]);
    setTextVal("");
    if (isLast) finalize(nextDraft);
    else setIdx((i) => i + 1);
  };

  // Handlers per i tre tipi di domanda — accumulano nel draft, non inviano.
  const pickSingle = (field: DimField, value: string) => {
    const nextDraft = { ...draft, [field]: value };
    setDraft(nextDraft);
    advance(nextDraft);
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

  return (
    <>
      {!open && Banner}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={closePanel} />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="relative w-full sm:max-w-[480px] sm:rounded-3xl rounded-t-3xl p-6 sm:p-7 border border-white/10"
              style={{ background: "linear-gradient(180deg, #16101a, #120c14)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] tracking-[0.18em] uppercase text-[#E94560] font-semibold">
                    {L(lang, "Migliora il viaggio", "Improve the trip")}
                  </span>
                  {!busy && !done && total > 0 && (
                    <span className="text-[11px] text-white/40">
                      {L(lang, `Domanda ${Math.min(idx + 1, total)} di ${total}`, `Question ${Math.min(idx + 1, total)} of ${total}`)}
                    </span>
                  )}
                </div>
                <button onClick={closePanel} className="text-white/40 hover:text-white transition-colors" data-testid="refine-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* progress — durante il questionario mostra la % ottimistica */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.span className="block h-full bg-[#E94560]" animate={{ width: `${optimisticPct}%` }} transition={{ duration: 0.5 }} />
                </div>
                <span className="text-[12px] font-semibold text-white/70 tabular-nums">{optimisticPct}%</span>
              </div>

              {busy ? (
                <div className="py-10 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-[#E94560] border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                  <p className="mt-5 text-[14px] text-white/70 max-w-[300px]">
                    {L(lang, "Sto riscrivendo il viaggio su di te…", "Rewriting the trip around you…")}
                  </p>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : done || allDone ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#E94560]/15 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-[#E94560]" />
                  </div>
                  <h3 className="text-[18px] font-semibold text-white mb-2">
                    {coverage.open.length === 0 ? L(lang, "Profilo completo", "Profile complete") : L(lang, "Viaggio aggiornato", "Trip updated")}
                  </h3>
                  <p className="text-[13px] text-white/55 max-w-[320px] mx-auto">
                    {coverage.open.length === 0
                      ? L(lang, "Questo viaggio ti somiglia al 100%. Ogni risposta resta nel tuo profilo per i prossimi viaggi.", "This trip is 100% you. Everything you answer stays in your profile for next trips.")
                      : L(lang, "L'ho riscritto sulle tue risposte. Puoi affinarlo ancora quando vuoi.", "I rewrote it around your answers. You can refine it further anytime.")}
                  </p>
                  <button onClick={() => { setOpen(false); reset(); }} className="mt-6 px-6 py-3 rounded-xl bg-[#E94560] text-white font-medium hover:brightness-110 transition-all">
                    {L(lang, "Torna al viaggio", "Back to the trip")}
                  </button>
                </div>
              ) : activeDim ? (
                <ActiveQuestion
                  dimKey={activeDim.key}
                  question={lang === "it" ? activeDim.question_it : activeDim.question_en}
                  lang={lang}
                  isLast={isLast}
                  multiSel={multiSel}
                  setMultiSel={setMultiSel}
                  textVal={textVal}
                  setTextVal={setTextVal}
                  onPickSingle={pickSingle}
                  onConfirmMulti={confirmMulti}
                  onConfirmText={confirmText}
                  onSkip={skip}
                />
              ) : null}

              {err && <p className="mt-4 text-[12px] text-[#E94560] text-center">{err}</p>}

              {!busy && !done && !allDone && activeDim && (
                <p className="mt-5 text-center text-[11px] text-white/35">
                  {L(lang, "Rispondi a tutte: la generazione parte alla fine · puoi saltare quello che non ti interessa", "Answer them all: generation runs at the end · skip anything you don't care about")}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Domanda attiva ──────────────────────────────────────────────────────────
function ActiveQuestion({
  dimKey, question, lang, isLast, multiSel, setMultiSel, textVal, setTextVal,
  onPickSingle, onConfirmMulti, onConfirmText, onSkip,
}: {
  dimKey: CoverageDimKey;
  question: string;
  lang: Lang;
  isLast: boolean;
  multiSel: string[];
  setMultiSel: (v: string[]) => void;
  textVal: string;
  setTextVal: (v: string) => void;
  onPickSingle: (field: DimField, value: string) => void;
  onConfirmMulti: (field: DimField) => void;
  onConfirmText: (field: DimField) => void;
  onSkip: () => void;
}) {
  const cfg = (OPTIONS as any)[dimKey];
  if (!cfg) return null;

  const primaryLabel = isLast
    ? L(lang, "Genera il viaggio", "Generate the trip")
    : L(lang, "Continua", "Continue");

  return (
    <div>
      <h3 className="text-[19px] sm:text-[21px] font-semibold text-white leading-snug mb-5">{question}</h3>

      {cfg.text ? (
        <div>
          <input
            autoFocus
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onConfirmText(cfg.field); }}
            placeholder={L(lang, "La tua città di partenza…", "Your departure city…")}
            data-testid="refine-text"
            className="w-full px-4 py-3.5 rounded-xl text-[15px] bg-white/5 border border-white/15 focus:border-[#E94560] outline-none text-white transition-all"
          />
          <button
            onClick={() => onConfirmText(cfg.field)}
            className="mt-4 w-full py-3 rounded-xl bg-[#E94560] text-white font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            {primaryLabel} <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={onSkip} className="mt-3 w-full text-[12px] text-white/40 hover:text-white/70 transition-colors">
            {L(lang, "Salta questa domanda", "Skip this question")}
          </button>
        </div>
      ) : cfg.multi ? (
        <div>
          <div className="flex flex-wrap gap-2.5">
            {cfg.opts.map((o: Opt) => {
              const sel = multiSel.includes(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => setMultiSel(sel ? multiSel.filter((v) => v !== o.value) : [...multiSel, o.value])}
                  data-testid={`refine-opt-${o.value}`}
                  className={`px-4 py-2.5 rounded-full text-[13px] border transition-all ${sel ? "border-[#E94560] bg-[#E94560] text-white" : "border-white/15 text-white/70 hover:border-[#E94560]"}`}
                >
                  {L(lang, o.it, o.en)}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => onConfirmMulti(cfg.field)}
            className="mt-5 w-full py-3 rounded-xl bg-[#E94560] text-white font-medium hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            {multiSel.length === 0 ? L(lang, "Niente da evitare", "Nothing to avoid") : primaryLabel} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {cfg.opts.map((o: Opt) => (
            <button
              key={o.value}
              onClick={() => onPickSingle(cfg.field, o.value)}
              data-testid={`refine-opt-${o.value}`}
              className="w-full text-left pl-2 pr-4 py-2 rounded-xl text-[15px] border border-white/12 text-white/85 bg-white/5 hover:border-[#E94560] hover:bg-[#E94560]/10 transition-all flex items-center gap-3 group"
            >
              {o.theme && (
                <span
                  className="w-12 h-12 rounded-lg bg-cover bg-center shrink-0 border border-white/10"
                  style={{ backgroundImage: `url("${themeThumb(o.theme)}")` }}
                />
              )}
              <span className="flex-1">{L(lang, o.it, o.en)}</span>
              <ArrowRight className="w-4 h-4 text-white/25 group-hover:text-[#E94560] transition-colors" />
            </button>
          ))}
          <button onClick={onSkip} className="mt-2 w-full text-[12px] text-white/40 hover:text-white/70 transition-colors">
            {L(lang, "Salta questa domanda", "Skip this question")}
          </button>
        </div>
      )}
    </div>
  );
}
