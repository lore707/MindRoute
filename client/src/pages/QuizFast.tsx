// ─────────────────────────────────────────────────────────────────────────
// QuizFast.tsx — Onboarding L1 (≤4 domande, ~45-60s)
//
// Filosofia (Netflix, non configuratore): portare l'utente davanti al PRIMO
// itinerario nel minor tempo possibile. Niente compagnia, alloggio, cibo,
// "cosa evitare": quelle vivono in L2 (refine post-generazione, vedi
// RefinePanel + /api/itinerary/:id/refine).
//
// DESIGN: riusa il linguaggio cinematic del quiz storico (quiz-cinematic.css):
// foto a tutto schermo che cambia (crossfade) al variare del chip, grain,
// titolo editoriale con accento, shimmer CTA. Le immagini sono quelle reali di
// questionThemes (stessi scatti del vecchio quiz) → niente buttato via.
//
// Bivio iniziale → due utenti diversi:
//   • "Ho già una meta"  → /api/profiling/direct (salta il matcher e /destinations)
//   • "Sorprendimi"      → /api/profiling (matcher) → auto-pick top match
// Poi /api/itinerary/generate-v2 → /itinerary/:id?l2=1.
// ─────────────────────────────────────────────────────────────────────────

import { useEffect, useMemo, useRef, useState } from "react";
import { pressable } from "@/lib/pressable";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import "@/styles/quiz-cinematic.css";
import { useI18n } from "@/lib/i18n";
import { FlowNav } from "@/components/FlowNav";
import { setFlow } from "@/lib/flow-storage";
import { track } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { questionThemes } from "./profiling/questionThemes";
import { GenerationRitual } from "@/components/GenerationRitual";

type Mode = "meta" | "surprise";
type Lang = "it" | "en";
const L = (lang: Lang, it: string, en: string) => (lang === "it" ? it : en);
// Query param (dev/preview: ?mode, ?gen, ?noanim).
const qp = (k: string): string | null => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };

// Risolve l'immagine di sfondo da una chiave-tema (gli stessi scatti del quiz).
const themeImg = (key: string) =>
  (questionThemes[key] ?? questionThemes.default).imageUrl.replace("w=1200", "w=1600");

type Opt = { id: string; it: string; en: string; emoji: string; theme: string; meta_it?: string; meta_en?: string };

// 6 sensazioni MUTUAMENTE ESCLUSIVE, una per direzione del profilo (assi del
// trait engine): quiete, natura, meraviglia, cultura, adrenalina, fuori rotta.
// Prima "Staccare la spina" e "Rallentare" erano quasi la stessa risposta
// (fuse in "quiet") e "Uscire dalla routine" non discriminava (in viaggio lo
// vogliono tutti) → al suo posto "Capire un posto" (asse social/cultura, che
// mancava del tutto) e "Fuori rotta" (asse exposure).
const SENSATIONS: Opt[] = [
  { id: "quiet",   it: "Silenzio e respiro", en: "Silence & breath", emoji: "🌙", theme: "quiet", meta_it: "staccare, rallentare, zero sveglie", meta_en: "switch off, slow down, no alarms" },
  { id: "nature",  it: "Natura vera", en: "Real nature", emoji: "🌲", theme: "nature", meta_it: "foreste, vette, acqua", meta_en: "forests, peaks, water" },
  { id: "wonder",  it: "Meravigliarmi", en: "Be amazed", emoji: "✨", theme: "explorative", meta_it: "posti che tolgono il fiato", meta_en: "places that take your breath away" },
  { id: "culture", it: "Capire un posto", en: "Understand a place", emoji: "🏺", theme: "cultural", meta_it: "persone, cucina, storie vere", meta_en: "people, food, true stories" },
  { id: "alive",   it: "Sentirmi vivo", en: "Feel alive", emoji: "🔥", theme: "adventure", meta_it: "adrenalina, intensità", meta_en: "adrenaline, intensity" },
  { id: "offbeat", it: "Fuori rotta", en: "Off the beaten path", emoji: "🧭", theme: "offgrid", meta_it: "niente folla, niente ovvio", meta_en: "no crowds, nothing obvious" },
];

// "4–5 giorni" rimosso: era lo stesso tempo del weekend lungo, ripetitivo.
// Niente 21+: la generazione è tarata per restare veloce (scelta di prodotto).
const DURATIONS: (Opt & { days: number })[] = [
  { id: "weekend", it: "Weekend lungo", en: "Long weekend", emoji: "🌆", theme: "city", days: 4, meta_it: "3–4 giorni", meta_en: "3–4 days" },
  { id: "week", it: "Una settimana", en: "One week", emoji: "🌿", theme: "nature", days: 7, meta_it: "il classico", meta_en: "the classic" },
  { id: "10-14", it: "10–14 giorni", en: "10–14 days", emoji: "🧭", theme: "adventure", days: 12, meta_it: "tempo per perdersi", meta_en: "time to get lost" },
  { id: "unsure", it: "Non lo so ancora", en: "Not sure yet", emoji: "🎲", theme: "anywhere", days: 7, meta_it: "decidiamo insieme", meta_en: "we'll decide together" },
];

const BUDGETS: (Opt & { code: string })[] = [
  { id: "poco", it: "Poco", en: "Light", emoji: "🎒", theme: "offgrid", code: "low", meta_it: "essenziale, furbo", meta_en: "lean, smart" },
  { id: "giusto", it: "Il giusto", en: "Just right", emoji: "🍷", theme: "authentic", code: "medium", meta_it: "comodo senza eccessi", meta_en: "comfortable, no excess" },
  { id: "qualcosa", it: "Mi concedo qualcosa", en: "Treat myself", emoji: "🌅", theme: "romantic", code: "high", meta_it: "qualche lusso scelto", meta_en: "a few chosen luxuries" },
  { id: "nonpunto", it: "Non è il punto", en: "Not the point", emoji: "💎", theme: "quietluxury", code: "unlimited", meta_it: "il meglio, senza pensieri", meta_en: "the best, no thinking" },
];

// Partenze comuni (Italia): un tap riempie il campo. Resta free-text per altre.
const DEPARTURE_SUGGESTIONS = ["Milano", "Roma", "Bergamo", "Bologna", "Venezia", "Napoli"];

const CITY_SUGGESTIONS: { name: string; theme: string }[] = [
  { name: "Lisbona", theme: "europe" }, { name: "Tokyo", theme: "asia" },
  { name: "Parigi", theme: "romantic" }, { name: "Bali", theme: "beach" },
  { name: "New York", theme: "city" }, { name: "Sicilia", theme: "beach" },
  { name: "Marrakech", theme: "africa" }, { name: "Islanda", theme: "wild" },
];

const STEP_DEFAULT_THEME: Record<string, string> = {
  mode: "anywhere", city: "city", sensation: "explorative", duration: "discovery", budget: "authentic",
};

export default function QuizFast() {
  const { lang: i18nLang } = useI18n() as any;
  const lang: Lang = i18nLang === "it" ? "it" : "en";
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode | null>(null);
  const [city, setCity] = useState("");
  // Aeroporto/città di partenza: serve a tracciare la tratta volo corretta
  // nell'itinerario (matching-engine usa input.departure per IATA + link voli).
  const [departure, setDeparture] = useState("");
  const [sensation, setSensation] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);
  // Budget totale a persona opzionale (€, tutto incluso): se compilato, l'AI lo
  // scompone e ne verifica la fattibilità in fase di generazione.
  const [budgetTotal, setBudgetTotal] = useState("");
  // Data di partenza OPZIONALE e saltabile (ISO YYYY-MM-DD o ""). Se presente,
  // i link alloggio diventano precisi (check-in/check-out derivato dalla
  // durata); se assente restano ricerche zona+città. MAI date inventate.
  const [leaveDate, setLeaveDate] = useState("");

  // ?gen=1 = anteprima della schermata di attesa (solo per verifica visiva).
  const [generating, setGenerating] = useState(() => { try { return new URLSearchParams(window.location.search).get("gen") === "1"; } catch { return false; } });

  const steps = useMemo<string[]>(() => {
    if (!mode) return ["mode"];
    return ["mode", mode === "meta" ? "city" : "sensation", "duration", "budget"];
  }, [mode]);
  const [stepIdx, setStepIdx] = useState(0);
  const current = steps[stepIdx];

  // /start?mode=meta|surprise → salta il bivio (usato dal path picker del
  // quiz profondo: "ho già una direzione" atterra qui già instradato).
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("mode");
    if (m === "meta" || m === "surprise") { setMode(m); setStepIdx(1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Sfondo crossfade (doppio buffer) ─────────────────────────────────────
  const [activeImg, setActiveImg] = useState(themeImg(STEP_DEFAULT_THEME.mode));
  const [imgA, setImgA] = useState(activeImg);
  const [imgB, setImgB] = useState("");
  const [showA, setShowA] = useState(true);
  const prevImg = useRef(activeImg);
  useEffect(() => {
    if (activeImg === prevImg.current) return;
    prevImg.current = activeImg;
    if (showA) { setImgB(activeImg); setShowA(false); }
    else { setImgA(activeImg); setShowA(true); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImg]);

  // Al cambio step → torna all'immagine di default dello step (più la selezione).
  useEffect(() => {
    const selTheme =
      current === "sensation" ? SENSATIONS.find((s) => s.id === sensation)?.theme :
      current === "duration" ? DURATIONS.find((d) => d.id === duration)?.theme :
      current === "budget" ? BUDGETS.find((b) => b.id === budget)?.theme :
      current === "city" ? CITY_SUGGESTIONS.find((c) => c.name === city)?.theme :
      undefined;
    setActiveImg(themeImg(selTheme ?? STEP_DEFAULT_THEME[current] ?? "default"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const hoverBg = (theme?: string) => setActiveImg(themeImg(theme ?? STEP_DEFAULT_THEME[current] ?? "default"));

  const goNext = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => {
    if (stepIdx === 0) { setLocation("/"); return; }
    if (current === "city" || current === "sensation") { setMode(null); setStepIdx(0); return; }
    setStepIdx((i) => Math.max(i - 1, 0));
  };
  const chooseMode = (m: Mode) => { setMode(m); setStepIdx(1); };

  const buildProfile = () => {
    const currentLang = localStorage.getItem("mindroute-lang") || "en";
    const dur = DURATIONS.find((d) => d.id === duration);
    const bud = BUDGETS.find((b) => b.id === budget);
    const sens = SENSATIONS.find((s) => s.id === sensation);
    const sensLabel = sens ? `${sens.it} / ${sens.en}` : "";
    // emotional_goals come TOKEN PULITI: titolo IT + EN (mappati sui vettori
    // del trait engine in shared/traits.ts) + descrizione (segnale ricco per
    // il matcher: "niente folla, niente ovvio" discrimina più del titolo).
    const sensGoals = sens ? [sens.it, sens.en, sens.meta_it ?? ""].filter(Boolean) : [];
    // Path marker coerente col matcher storico: meta → path_b (ha una meta),
    // surprise → path_a (aperto). La logica delle 3 destinazioni (3 angoli per
    // città precisa via specific_place, 3 mete dal profilo per surprise) resta
    // quella originale di generateDestinationsOnly.
    const answers: string[] = [mode === "meta" ? "path_b" : "path_a"];
    if (mode === "surprise" && sens) answers.push(JSON.stringify({ emotional_goals: sensGoals, pace: "balanced" }));
    else if (mode === "meta" && city.trim()) answers.push(JSON.stringify({ specific_place: city.trim() }));
    // Cifra totale opzionale: solo numeri, >0.
    const totalNum = parseInt(budgetTotal.replace(/[^\d]/g, ""), 10);
    const hasTotal = Number.isFinite(totalNum) && totalNum > 0;
    return {
      answers,
      days: dur?.days ?? 7,
      leaveDate: leaveDate, // "" se l'utente non ha date (mai inventata)
      budget: bud?.code ?? "medium",
      departure: departure.trim(),
      companions: "",
      travelStyle: "",
      constraints: "",
      lang: currentLang,
      ...(hasTotal ? { budgetTotalPerPerson: totalNum } : {}),
      _l1: {
        mode,
        city: mode === "meta" ? city.trim() : undefined,
        sensation: mode === "surprise" ? sensLabel : undefined,
        durationId: duration ?? undefined,
        budgetId: budget ?? undefined,
        budgetTotalPerPerson: hasTotal ? totalNum : undefined,
      },
    } as Record<string, any>;
  };

  // Fine L1 → genera le 3 destinazioni con la logica originale (matcher) e porta
  // a /destinations per la scelta 1-di-3. La generazione dell'itinerario e L2
  // restano sulla pagina successiva, identiche al flusso storico.
  const runGen = async () => {
    setGenerating(true);
    try {
      const profile = buildProfile();
      setFlow("mind_profiling_input", JSON.stringify(profile));
      const r = await fetch("/api/profiling", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "matching failed");
      const dests = await r.json();
      if (!Array.isArray(dests) || dests.length === 0) throw new Error("no destinations");
      setFlow("mind_destinations", JSON.stringify(dests));
      track("quiz_completed", { path: mode === "meta" ? "fast_meta" : "fast_surprise" });
      setLocation("/destinations");
    } catch (err) {
      setGenerating(false);
      toast({ title: L(lang, "Qualcosa è andato storto. Riprova.", "Something went wrong. Try again."), variant: "destructive" });
    }
  };

  const hasDeparture = departure.trim().length >= 2;
  // Per proseguire (ramo "meta") servono meta + aeroporto di partenza: senza
  // partenza l'itinerario non traccia la tratta volo corretta.
  const canContinueCity = city.trim().length >= 2 && hasDeparture;

  // ── Sfondo (sempre montato) ───────────────────────────────────────────────
  const Bg = (
    <>
      <div className="qc-bg-stage" aria-hidden>
        <div className="qc-bg-photo" style={{ backgroundImage: imgA ? `url("${imgA}")` : undefined, opacity: showA ? 1 : 0 }} />
        <div className="qc-bg-photo" style={{ backgroundImage: imgB ? `url("${imgB}")` : undefined, opacity: showA ? 0 : 1 }} />
      </div>
      <div className="qc-grain" aria-hidden />
    </>
  );

  if (generating) {
    // Attesa narrativa: passi REALI del matching (profilo → confronto → scelta).
    // L'ultimo non si spunta mai da timer: si completa navigando al risultato.
    return (
      <div className="quiz-cinematic" style={{ position: "relative", minHeight: "100vh" }}>
        {Bg}
        <div style={{ position: "relative", zIndex: 5, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
          <GenerationRitual
            lede={L(lang, "Abbiamo capito abbastanza.", "We've understood enough.")}
            sub={L(lang, "Ora lasciaci trovare le mete che ti somigliano.", "Now let us find the places that feel like you.")}
            stepMs={7000}
            steps={lang === "it"
              ? ["Leggo cosa cerchi", "Confronto i luoghi che ti somigliano", "Scelgo le tue 3 destinazioni"]
              : ["Reading what you're after", "Comparing places that feel like you", "Choosing your 3 destinations"]}
          />
        </div>
      </div>
    );
  }

  // Prima della scelta del ramo steps=["mode"] e il contatore leggeva "1 / 1":
  // entrambi i rami hanno 4 passi, quindi mostriamo 4 da subito.
  const total = mode ? steps.length : 4;
  const progressPct = ((stepIdx + (current === "mode" ? 0 : 1)) / total) * 100;

  return (
    <div className="quiz-cinematic" style={{ position: "relative", minHeight: "100vh" }}>
      {Bg}
      <FlowNav />
      <div className="qc-stage">
        <div className="qc-container">
          {/* header strip */}
          <div className="qc-header-strip">
            <span className="qc-label">MindRoute</span>
            <span className="qc-progress-line"><span className="qc-fill" style={{ width: `${progressPct}%` }} /></span>
            <span className="qc-count">{stepIdx + 1} / {total}</span>
          </div>

          {/* ?noanim=1 (solo preview headless): senza, l'exit di AnimatePresence
              non completa sotto virtual-time e lo step vecchio resta a schermo. */}
          <AnimatePresence mode="wait">
            <motion.div key={current}
              initial={qp("noanim") === "1" ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={qp("noanim") === "1" ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: qp("noanim") === "1" ? 0 : 0.4 }}>

              {current === "mode" && (
                <>
                  <div className="qc-q-head qc-center">
                    <span className="qc-q-eyebrow"><strong>{L(lang, "Si parte", "Let's begin")}</strong></span>
                    <h1 className="qc-q-title">{L(lang, "Da dove ", "Where do we ")}<em>{L(lang, "partiamo?", "start?")}</em></h1>
                  </div>
                  <div className="qc-q1-cards">
                    <div {...pressable}
                      className={`qc-card ${mode === "meta" ? "selected" : ""}`}
                      onMouseEnter={() => hoverBg("city")} onMouseLeave={() => hoverBg()}
                      onClick={() => chooseMode("meta")} data-testid="fast-mode-meta"
                    >
                      <div className="qc-card-img" style={{ backgroundImage: `url("${themeImg("city")}")` }} />
                      <div className="qc-card-body">
                        <span className="qc-card-tag"><span className="dot" />{L(lang, "Ho le idee chiare", "I know")}</span>
                        <h3>{L(lang, "Ho già una ", "I have a ")}<em>{L(lang, "meta", "destination")}</em></h3>
                        <p className="qc-card-desc">{L(lang, "So dove voglio andare. Costruiscimelo addosso.", "I know where I want to go. Build it around me.")}</p>
                        <div className="qc-card-foot">
                          <span className="qc-card-foot-label">{L(lang, "Scegli la città", "Pick the city")}</span>
                          <span className="qc-card-arrow">→</span>
                        </div>
                      </div>
                    </div>
                    <div {...pressable}
                      className={`qc-card ${mode === "surprise" ? "selected" : ""}`}
                      onMouseEnter={() => hoverBg("anywhere")} onMouseLeave={() => hoverBg()}
                      onClick={() => chooseMode("surprise")} data-testid="fast-mode-surprise"
                    >
                      <div className="qc-card-img" style={{ backgroundImage: `url("${themeImg("anywhere")}")` }} />
                      <div className="qc-card-body">
                        <span className="qc-card-tag"><span className="dot" />{L(lang, "Fidati di me", "Trust me")}</span>
                        <h3>{L(lang, "", "")}<em>{L(lang, "Sorprendimi", "Surprise me")}</em></h3>
                        <p className="qc-card-desc">{L(lang, "Non so ancora dove. Portami dove dovrei essere.", "I don't know yet. Take me where I should be.")}</p>
                        <div className="qc-card-foot">
                          <span className="qc-card-foot-label">{L(lang, "Parti dall'emozione", "Start from the feeling")}</span>
                          <span className="qc-card-arrow">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {current === "city" && (
                <>
                  <div className="qc-q-head">
                    <span className="qc-ack">{L(lang, "Idee chiare. Mi piace.", "Clear ideas. I like it.")}</span>
                    <span className="qc-q-eyebrow"><strong>{L(lang, "La meta", "Destination")}</strong></span>
                    <h1 className="qc-q-title">{L(lang, "C'è già un posto che ti ", "Is there a place already ")}<em>{L(lang, "chiama?", "calling you?")}</em></h1>
                    <p className="qc-q-sub">{L(lang, "Una città, un'isola, un paese. Lo modelliamo su di te.", "A city, an island, a country. We'll shape it around you.")}</p>
                  </div>
                  <div style={{ maxWidth: 560 }}>
                    <input
                      autoFocus value={city}
                      onChange={(e) => { setCity(e.target.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && canContinueCity) goNext(); }}
                      placeholder={L(lang, "Es: Lisbona, Giappone, Dolomiti…", "e.g. Lisbon, Japan, the Dolomites…")}
                      data-testid="fast-city-input" className="qc-precise-input" style={{ fontSize: 18, padding: "18px 22px" }}
                    />
                    <div className="qc-options qc-options-twocol" style={{ marginTop: 16 }}>
                      {CITY_SUGGESTIONS.map((c) => (
                        <div {...pressable}
                          key={c.name}
                          className={`qc-option ${city === c.name ? "selected" : ""}`}
                          onMouseEnter={() => hoverBg(c.theme)} onMouseLeave={() => hoverBg(CITY_SUGGESTIONS.find((x) => x.name === city)?.theme)}
                          onClick={() => { setCity(c.name); hoverBg(c.theme); }} data-testid={`fast-city-${c.name}`}
                        >
                          <div className="qc-option-ic">📍</div>
                          <div className="qc-option-body"><div className="qc-option-name">{c.name}</div></div>
                          <div className="qc-option-mark"><span className="qc-circle" /></div>
                        </div>
                      ))}
                    </div>

                    {/* Aeroporto/città di partenza — necessario per la tratta volo corretta */}
                    <div style={{ marginTop: 24 }}>
                      <label className="qc-q-sub" style={{ display: "block", fontSize: 14, marginBottom: 8 }}>
                        ✈️ {L(lang, "Da dove parti?", "Where do you fly from?")} <em>{L(lang, "serve per il volo giusto", "needed for the right flight")}</em>
                      </label>
                      <input
                        value={departure}
                        onChange={(e) => setDeparture(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && canContinueCity) goNext(); }}
                        placeholder={L(lang, "Es: Milano, Roma, MXP…", "e.g. Milan, Rome, MXP…")}
                        data-testid="fast-departure-input" className="qc-precise-input" style={{ fontSize: 17, padding: "16px 22px" }}
                      />
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                        {DEPARTURE_SUGGESTIONS.map((d) => (
                          <button
                            key={d}
                            onClick={() => setDeparture(d)}
                            data-testid={`fast-departure-${d}`}
                            className={`qc-back ${departure === d ? "selected" : ""}`}
                            style={departure === d ? { borderColor: "var(--qc-accent)", color: "var(--qc-accent)" } : undefined}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="qc-nav">
                      <button className="qc-back" onClick={goBack} data-testid="fast-back">← {L(lang, "Indietro", "Back")}</button>
                      <button className="qc-continue" onClick={goNext} disabled={!canContinueCity} data-testid="fast-city-continue">
                        {L(lang, "Continua", "Continue")} →
                      </button>
                    </div>
                  </div>
                </>
              )}

              {(current === "sensation" || current === "duration" || current === "budget") && (() => {
                // Micro-copy di continuità: una riga DERIVATA dalla scelta
                // precedente (statica, zero attese) — l'AI "sta già pensando",
                // non sta compilando un database.
                const sensPicked = SENSATIONS.find((s) => s.id === sensation);
                const durAckMap: Record<string, [string, string]> = {
                  weekend: ["Weekend lungo: dritti al punto.", "Long weekend: straight to the point."],
                  week: ["Una settimana: c'è respiro.", "One week: room to breathe."],
                  "10-14": ["Dieci giorni e più: possiamo perderci.", "Ten days and more: we can get lost."],
                  unsure: ["Sul tempo decidiamo noi. Ci sta.", "We'll pick the timing. Fair."],
                };
                const ack =
                  current === "sensation" ? L(lang, "Ci pensiamo noi. Partiamo da te.", "Leave it to us. We start from you.")
                  : current === "duration" ? (mode === "meta" && city.trim()
                      ? L(lang, `«${city.trim()}». Costruiamolo su misura.`, `“${city.trim()}”. Let's tailor it.`)
                      : sensPicked ? L(lang, `${sensPicked.it}: è già una direzione.`, `${sensPicked.en}: that's already a direction.`) : "")
                  : (duration && durAckMap[duration]) ? L(lang, durAckMap[duration][0], durAckMap[duration][1]) : "";
                const cfg =
                  current === "sensation"
                    ? { eyebrow: L(lang, "L'emozione", "The feeling"), titleA: L(lang, "Che sensazione stai ", "What feeling are you "), titleB: L(lang, "cercando?", "after?"), sub: L(lang, "È la domanda più MindRoute di tutte. Niente filtri.", "The most MindRoute question of all. No filters."), opts: SENSATIONS, sel: sensation, pick: (id: string) => { setSensation(id); setTimeout(goNext, 260); } }
                    : current === "duration"
                    ? { eyebrow: L(lang, "Il tempo", "Time"), titleA: L(lang, "Quanto tempo ", "How much time "), titleB: L(lang, "hai?", "do you have?"), sub: "", opts: DURATIONS, sel: duration, pick: (id: string) => { setDuration(id); setTimeout(goNext, 260); } }
                    // Ultima domanda: il chip SELEZIONA soltanto — la generazione parte
                    // dal bottone esplicito qui sotto. Prima il chip auto-generava, ma
                    // chi tornava indietro o compilava partenza/cifra DOPO la scelta
                    // restava senza alcun tasto "avanti".
                    // Framing emozionale, non finanziario: il budget è una
                    // conseguenza dello stile di viaggio (le fasce lo sono già).
                    : { eyebrow: L(lang, "Il budget", "Budget"), titleA: L(lang, "Come vuoi ", "How do you want to "), titleB: L(lang, "vivertelo?", "live it?"), sub: L(lang, "Serve solo per il tono. Il resto lo affiniamo dopo.", "Just for the tone. We refine the rest later."), opts: BUDGETS, sel: budget, pick: (id: string) => { setBudget(id); } };
                return (
                  <>
                    <div className="qc-q-head">
                      {ack && <span className="qc-ack">{ack}</span>}
                      <span className="qc-q-eyebrow"><strong>{cfg.eyebrow}</strong></span>
                      <h1 className="qc-q-title">{cfg.titleA}<em>{cfg.titleB}</em></h1>
                      {cfg.sub && <p className="qc-q-sub">{cfg.sub}</p>}
                    </div>
                    <div className="qc-options" style={{ maxWidth: 720 }}>
                      {cfg.opts.map((o: any) => (
                        <div {...pressable}
                          key={o.id}
                          className={`qc-option ${cfg.sel === o.id ? "selected" : ""}`}
                          onMouseEnter={() => hoverBg(o.theme)}
                          onMouseLeave={() => hoverBg(cfg.opts.find((x: any) => x.id === cfg.sel)?.theme)}
                          onClick={() => cfg.pick(o.id)}
                          data-testid={`fast-${current}-${o.id}`}
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
                    {current === "budget" && mode === "surprise" && (
                      <div style={{ maxWidth: 720, marginTop: 18 }}>
                        <label className="qc-q-sub" style={{ display: "block", fontSize: 14, marginBottom: 8 }}>
                          ✈️ {L(lang, "Da dove parti?", "Where do you fly from?")} <em>{L(lang, "serve per il volo giusto", "needed for the right flight")}</em>
                        </label>
                        <input
                          value={departure}
                          onChange={(e) => setDeparture(e.target.value)}
                          placeholder={L(lang, "Es: Milano, Roma, MXP…", "e.g. Milan, Rome, MXP…")}
                          data-testid="fast-departure-input" className="qc-precise-input" style={{ fontSize: 17, padding: "16px 22px", maxWidth: 360 }}
                        />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                          {DEPARTURE_SUGGESTIONS.map((d) => (
                            <button key={d} onClick={() => setDeparture(d)} data-testid={`fast-departure-${d}`}
                              className="qc-back" style={departure === d ? { borderColor: "var(--qc-accent)", color: "var(--qc-accent)" } : undefined}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {current === "budget" && (
                      <div style={{ maxWidth: 720, marginTop: 18 }}>
                        <label className="qc-q-sub" style={{ display: "block", fontSize: 13.5, marginBottom: 8 }}>
                          📅 {L(lang, "Hai già una data di partenza? ", "Got a departure date already? ")}
                          <em>{L(lang, "date esatte su hotel e voli (opzionale)", "for exact hotel & flight dates (optional)")}</em>
                        </label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 18 }}>
                          <input
                            type="date" value={leaveDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) => setLeaveDate(e.target.value)}
                            data-testid="fast-leavedate" className="qc-precise-input"
                            style={{ fontSize: 16, padding: "14px 18px", maxWidth: 230, colorScheme: "dark" }}
                          />
                          <button
                            onClick={() => setLeaveDate("")}
                            data-testid="fast-leavedate-skip"
                            className="qc-back"
                            style={leaveDate === "" ? { borderColor: "var(--qc-accent)", color: "var(--qc-accent)" } : undefined}
                          >
                            {L(lang, "Non ho ancora date", "No dates yet")}
                          </button>
                        </div>
                        <label className="qc-q-sub" style={{ display: "block", fontSize: 13.5, marginBottom: 8 }}>
                          {L(lang, "Hai una cifra in testa? ", "Got a number in mind? ")}
                          <em>{L(lang, "Budget totale a persona, tutto incluso (opzionale)", "Total budget per person, all-in (optional)")}</em>
                        </label>
                        <div style={{ position: "relative", maxWidth: 320 }}>
                          <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", color: "var(--qc-ink-faint)", fontSize: 18, pointerEvents: "none" }}>€</span>
                          <input
                            type="text" inputMode="numeric" value={budgetTotal}
                            onChange={(e) => setBudgetTotal(e.target.value.replace(/[^\d]/g, ""))}
                            placeholder={L(lang, "es. 1500", "e.g. 1500")}
                            data-testid="fast-budget-total" className="qc-precise-input"
                            style={{ fontSize: 18, padding: "16px 22px 16px 36px" }}
                          />
                        </div>
                        <p className="qc-q-sub" style={{ fontSize: 12, marginTop: 8, color: "var(--qc-ink-faint)" }}>
                          {L(lang, "La useremo come traccia: la scomponiamo e verifichiamo che regga davvero. Voli esclusi.",
                                  "We'll use it as a target: we break it down and check it actually holds. Flights excluded.")}
                        </p>
                      </div>
                    )}
                    <div className="qc-nav">
                      <button className="qc-back" onClick={goBack} data-testid="fast-back">← {L(lang, "Indietro", "Back")}</button>
                      {current === "budget" ? (
                        <button
                          className="qc-continue"
                          onClick={runGen}
                          disabled={!budget || (mode === "surprise" && !hasDeparture)}
                          data-testid="fast-generate"
                        >
                          {!budget
                            ? L(lang, "Scegli una fascia", "Pick a tier")
                            : mode === "surprise" && !hasDeparture
                            ? L(lang, "Inserisci la partenza", "Add your departure")
                            : L(lang, "Genera le destinazioni", "Generate my destinations")} →
                        </button>
                      ) : null}
                    </div>
                  </>
                );
              })()}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
