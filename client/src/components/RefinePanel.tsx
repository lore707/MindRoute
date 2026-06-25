// ─────────────────────────────────────────────────────────────────────────
// RefinePanel.tsx — Onboarding L2 (raffinamento progressivo post-generazione)
//
// NON è un questionario: è "migliora questo viaggio". L'utente vede già
// l'itinerario; sopra appare un invito ("ti somiglia al X%") e, a sua richiesta,
// UNA domanda profonda alla volta (ritmo/compagnia/dove dormi/come mangi/come ti
// muovi/cosa eviti/da dove parti). Ogni risposta → POST /refine → RIGENERAZIONE
// completa dell'itinerario sulla stessa meta → coverage che sale.
//
// La % è onesta: copertura reale del profilo (shared/profile-coverage.ts), la
// stessa calcolata server-side. Parte ~55% (solo L1) e arriva a 100%.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check, ArrowRight } from "lucide-react";
import { computeCoverage, type CoverageDimKey } from "@shared/profile-coverage";

type Lang = "it" | "en";
const L = (lang: Lang, it: string, en: string) => (lang === "it" ? it : en);

type Opt = { value: string; it: string; en: string };

// Set di opzioni per ogni dimensione L2 → mappate sul campo profilo che il
// generatore v2 sa leggere (vedi buildConstraintsFromProfile lato server).
const OPTIONS: Record<Exclude<CoverageDimKey, "destination" | "duration" | "budget">, {
  field: "pace" | "companions" | "accommodation" | "food" | "travelStyle" | "departure" | "avoid";
  multi?: boolean;
  text?: boolean;
  opts?: Opt[];
}> = {
  pace: {
    field: "pace",
    opts: [
      { value: "relaxed", it: "Più relax", en: "More relaxed" },
      { value: "balanced", it: "Equilibrato", en: "Balanced" },
      { value: "intense", it: "Più intense", en: "More intense" },
    ],
  },
  companions: {
    field: "companions",
    opts: [
      { value: "solo", it: "Da solo", en: "Solo" },
      { value: "couple", it: "In coppia", en: "As a couple" },
      { value: "friends", it: "Con amici", en: "With friends" },
      { value: "family", it: "In famiglia", en: "With family" },
    ],
  },
  accommodation: {
    field: "accommodation",
    opts: [
      { value: "hostel", it: "Ostello", en: "Hostel" },
      { value: "budget", it: "Hotel semplice", en: "Simple hotel" },
      { value: "boutique", it: "Boutique / Design", en: "Boutique / Design" },
      { value: "luxury", it: "Lusso", en: "Luxury" },
    ],
  },
  food: {
    field: "food",
    opts: [
      { value: "street", it: "Street food", en: "Street food" },
      { value: "local", it: "Locali autentici", en: "Authentic local spots" },
      { value: "mix", it: "Un mix", en: "A mix" },
      { value: "foodie", it: "Esperienze gastronomiche", en: "Fine dining" },
    ],
  },
  movement: {
    field: "travelStyle",
    opts: [
      { value: "fixed", it: "Base fissa", en: "Single base" },
      { value: "two", it: "Due basi", en: "Two bases" },
      { value: "roadtrip", it: "Road trip", en: "Road trip" },
      { value: "discover", it: "Scoperta continua", en: "Always moving" },
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
  const [dimKey, setDimKey] = useState<CoverageDimKey | null>(null);
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [textVal, setTextVal] = useState("");
  const [justDone, setJustDone] = useState(false);

  // Apertura automatica al primo arrivo dal funnel veloce (?l2=1).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search);
    if (p.get("l2") === "1" && coverage.open.length > 0) {
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

  const nextDim = coverage.open[0] ?? null;
  const activeDim = dimKey
    ? coverage.dims.find((d) => d.key === dimKey) ?? null
    : nextDim;

  const startDim = (key: CoverageDimKey) => {
    setDimKey(key);
    setMultiSel([]);
    setTextVal("");
    setErr("");
  };

  const submit = async (patch: Record<string, any>) => {
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
      setDimKey(null);
      setJustDone(true);
      setTimeout(() => setJustDone(false), 2200);
    } catch (e: any) {
      setErr(L(lang, "Non sono riuscito a rigenerare. Riprova.", "Couldn't regenerate. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const pickSingle = (cfg: (typeof OPTIONS)[keyof typeof OPTIONS], value: string) => {
    submit({ [cfg.field]: value });
  };
  const submitMulti = (cfg: (typeof OPTIONS)[keyof typeof OPTIONS]) => {
    submit({ [cfg.field]: multiSel });
  };
  const submitText = (cfg: (typeof OPTIONS)[keyof typeof OPTIONS]) => {
    if (textVal.trim().length < 2) return;
    submit({ [cfg.field]: textVal.trim() });
  };

  const pct = coverage.pct;
  const complete = coverage.open.length === 0;

  // ── Banner fisso (sempre visibile finché il profilo non è pieno) ──────────
  const Banner = (
    <motion.button
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => { setOpen(true); if (nextDim) startDim(nextDim.key); }}
      data-testid="refine-open"
      className="fixed z-[120] bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-5 py-3 rounded-full shadow-[0_12px_40px_rgba(233,69,96,0.35)] border border-[#E94560]/40 cursor-pointer"
      style={{ background: "linear-gradient(120deg, rgba(20,12,18,0.92), rgba(40,16,28,0.92))", backdropFilter: "blur(10px)" }}
    >
      <span className="relative flex items-center justify-center w-9 h-9 rounded-full bg-[#E94560]/15">
        <Sparkles className="w-4 h-4 text-[#E94560]" />
      </span>
      <span className="text-left">
        <span className="block text-[13px] font-semibold text-white leading-tight">
          {complete
            ? L(lang, "Questo viaggio ti somiglia al 100%", "This trip is 100% you")
            : L(lang, `Ti somiglia al ${pct}%`, `${pct}% you`)}
        </span>
        {!complete && (
          <span className="block text-[11px] text-white/55 leading-tight">{L(lang, "Tocca per migliorarlo", "Tap to improve it")}</span>
        )}
      </span>
      {!complete && (
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
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => !busy && setOpen(false)} />
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
                </div>
                <button onClick={() => !busy && setOpen(false)} className="text-white/40 hover:text-white transition-colors" data-testid="refine-close">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* progress */}
              <div className="flex items-center gap-2 mb-5">
                <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <motion.span className="block h-full bg-[#E94560]" animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} />
                </div>
                <span className="text-[12px] font-semibold text-white/70 tabular-nums">{pct}%</span>
              </div>

              {busy ? (
                <div className="py-10 flex flex-col items-center text-center">
                  <div className="w-10 h-10 rounded-full border-2 border-[#E94560] border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
                  <p className="mt-5 text-[14px] text-white/70 max-w-[300px]">
                    {L(lang, "Sto riscrivendo il viaggio su di te…", "Rewriting the trip around you…")}
                  </p>
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                </div>
              ) : complete ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#E94560]/15 flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-[#E94560]" />
                  </div>
                  <h3 className="text-[18px] font-semibold text-white mb-2">{L(lang, "Profilo completo", "Profile complete")}</h3>
                  <p className="text-[13px] text-white/55 max-w-[320px] mx-auto">
                    {L(lang, "Questo viaggio ti somiglia al 100%. Ogni risposta che dai resta nel tuo profilo per i prossimi viaggi.", "This trip is 100% you. Everything you answer stays in your profile for next trips.")}
                  </p>
                  <button onClick={() => setOpen(false)} className="mt-6 px-6 py-3 rounded-xl bg-[#E94560] text-white font-medium hover:brightness-110 transition-all">
                    {L(lang, "Torna al viaggio", "Back to the trip")}
                  </button>
                </div>
              ) : activeDim ? (
                <ActiveQuestion
                  dimKey={activeDim.key}
                  question={lang === "it" ? activeDim.question_it : activeDim.question_en}
                  lang={lang}
                  multiSel={multiSel}
                  setMultiSel={setMultiSel}
                  textVal={textVal}
                  setTextVal={setTextVal}
                  onPickSingle={pickSingle}
                  onSubmitMulti={submitMulti}
                  onSubmitText={submitText}
                  remaining={coverage.open.length}
                />
              ) : null}

              {err && <p className="mt-4 text-[12px] text-[#E94560] text-center">{err}</p>}

              {!busy && !complete && (
                <p className="mt-5 text-center text-[11px] text-white/35">
                  {L(lang, `Ancora ${coverage.open.length} per il 100% · puoi fermarti quando vuoi`, `${coverage.open.length} more to 100% · stop whenever you like`)}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {justDone && !open && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed z-[120] bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-[#E94560] text-white text-[12px] font-medium shadow-lg"
        >
          {L(lang, "Viaggio aggiornato ✓", "Trip updated ✓")}
        </motion.div>
      )}
    </>
  );
}

// ── Domanda attiva ──────────────────────────────────────────────────────────
function ActiveQuestion({
  dimKey, question, lang, multiSel, setMultiSel, textVal, setTextVal,
  onPickSingle, onSubmitMulti, onSubmitText, remaining,
}: {
  dimKey: CoverageDimKey;
  question: string;
  lang: Lang;
  multiSel: string[];
  setMultiSel: (v: string[]) => void;
  textVal: string;
  setTextVal: (v: string) => void;
  onPickSingle: (cfg: any, value: string) => void;
  onSubmitMulti: (cfg: any) => void;
  onSubmitText: (cfg: any) => void;
  remaining: number;
}) {
  const cfg = (OPTIONS as any)[dimKey];
  if (!cfg) return null;

  return (
    <div>
      <h3 className="text-[19px] sm:text-[21px] font-semibold text-white leading-snug mb-5">{question}</h3>

      {cfg.text ? (
        <div>
          <input
            autoFocus
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onSubmitText(cfg); }}
            placeholder={L(lang, "La tua città di partenza…", "Your departure city…")}
            data-testid="refine-text"
            className="w-full px-4 py-3.5 rounded-xl text-[15px] bg-white/5 border border-white/15 focus:border-[#E94560] outline-none text-white transition-all"
          />
          <button
            onClick={() => onSubmitText(cfg)}
            disabled={textVal.trim().length < 2}
            className="mt-4 w-full py-3 rounded-xl bg-[#E94560] text-white font-medium disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            {L(lang, "Rigenera", "Regenerate")} <ArrowRight className="w-4 h-4" />
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
            onClick={() => onSubmitMulti(cfg)}
            disabled={multiSel.length === 0}
            className="mt-5 w-full py-3 rounded-xl bg-[#E94560] text-white font-medium disabled:opacity-40 hover:brightness-110 transition-all flex items-center justify-center gap-2"
          >
            {L(lang, "Rigenera", "Regenerate")} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {cfg.opts.map((o: Opt) => (
            <button
              key={o.value}
              onClick={() => onPickSingle(cfg, o.value)}
              data-testid={`refine-opt-${o.value}`}
              className="w-full text-left px-4 py-3.5 rounded-xl text-[15px] border border-white/12 text-white/85 bg-white/5 hover:border-[#E94560] hover:bg-[#E94560]/10 transition-all flex items-center justify-between group"
            >
              {L(lang, o.it, o.en)}
              <ArrowRight className="w-4 h-4 text-white/25 group-hover:text-[#E94560] transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
