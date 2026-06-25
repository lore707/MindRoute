// ─────────────────────────────────────────────────────────────────────────
// QuizFast.tsx — Onboarding L1 (≤4 domande, ~45-60s)
//
// Filosofia (Netflix, non configuratore): portare l'utente davanti al PRIMO
// itinerario nel minor tempo possibile. Niente compagnia, alloggio, cibo,
// "cosa evitare": quelle vivono in L2 (refine post-generazione, vedi
// RefinePanel + /api/itinerary/:id/refine).
//
// Bivio iniziale → due utenti diversi:
//   • "Ho già una meta"  → /api/profiling/direct (salta il matcher e /destinations)
//   • "Sorprendimi"      → /api/profiling (matcher) → auto-pick top match
// Poi /api/itinerary/generate-v2 → /itinerary/:id.
//
// Il profilo L1 (con `_l1`) viaggia come `input` di generate-v2 e viene
// persistito sull'itinerario: coverage e refine leggono da lì.
// ─────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, MapPin, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import { FlowNav } from "@/components/FlowNav";
import { FormChip } from "./profiling/FormChip";
import { setFlow } from "@/lib/flow-storage";
import { track } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";

type Mode = "meta" | "surprise";
type Lang = "it" | "en";

const L = (lang: Lang, it: string, en: string) => (lang === "it" ? it : en);

const SENSATIONS = [
  { id: "disconnect", it: "Staccare la spina", en: "Disconnect" },
  { id: "nature", it: "Natura vera", en: "Real nature" },
  { id: "wonder", it: "Meravigliarmi", en: "Be amazed" },
  { id: "slow", it: "Rallentare", en: "Slow down" },
  { id: "routine", it: "Uscire dalla routine", en: "Break the routine" },
  { id: "alive", it: "Sentirmi vivo", en: "Feel alive" },
];

const DURATIONS = [
  { id: "weekend", it: "Weekend lungo", en: "Long weekend", days: 4 },
  { id: "4-5", it: "4–5 giorni", en: "4–5 days", days: 5 },
  { id: "week", it: "Una settimana", en: "One week", days: 7 },
  { id: "10-14", it: "10–14 giorni", en: "10–14 days", days: 12 },
  { id: "unsure", it: "Non lo so ancora", en: "Not sure yet", days: 7 },
];

const BUDGETS = [
  { id: "poco", it: "Poco", en: "Light", code: "low" },
  { id: "giusto", it: "Il giusto", en: "Just right", code: "medium" },
  { id: "qualcosa", it: "Mi concedo qualcosa", en: "Treat myself", code: "high" },
  { id: "nonpunto", it: "Non è il punto", en: "Not the point", code: "unlimited" },
];

const CITY_SUGGESTIONS = ["Lisbona", "Tokyo", "Parigi", "Bali", "New York", "Sicilia", "Marrakech", "Islanda"];

export default function QuizFast() {
  const { lang: i18nLang } = useI18n() as any;
  const lang: Lang = i18nLang === "it" ? "it" : "en";
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode | null>(null);
  const [city, setCity] = useState("");
  const [sensation, setSensation] = useState<string | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [budget, setBudget] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState("");

  // Sequenza di step in base al ramo scelto.
  const steps = useMemo<string[]>(() => {
    if (!mode) return ["mode"];
    return ["mode", mode === "meta" ? "city" : "sensation", "duration", "budget"];
  }, [mode]);
  const [stepIdx, setStepIdx] = useState(0);
  const current = steps[stepIdx];

  const bg = theme === "dark"
    ? "radial-gradient(circle at 50% 12%, rgba(233,69,96,0.16), transparent 30%), radial-gradient(circle at 18% 22%, rgba(78,84,200,0.16), transparent 34%), linear-gradient(180deg, #141727 0%, #0d1020 60%, #101427 100%)"
    : "radial-gradient(circle at 50% 12%, rgba(233,69,96,0.16), transparent 32%), radial-gradient(circle at 82% 78%, rgba(233,69,96,0.08), transparent 30%), linear-gradient(180deg, #fdf5f0 0%, #f5ede6 60%, #f0e6dd 100%)";

  const goNext = () => setStepIdx((i) => Math.min(i + 1, steps.length - 1));
  const goBack = () => {
    if (stepIdx === 0) { setLocation("/"); return; }
    if (steps[stepIdx] === "city" || steps[stepIdx] === "sensation") {
      // tornando al bivio resettiamo il ramo
      setMode(null);
      setStepIdx(0);
      return;
    }
    setStepIdx((i) => Math.max(i - 1, 0));
  };

  const chooseMode = (m: Mode) => { setMode(m); setStepIdx(1); };

  const buildProfile = () => {
    const currentLang = localStorage.getItem("mindroute-lang") || "en";
    const dur = DURATIONS.find((d) => d.id === duration);
    const bud = BUDGETS.find((b) => b.id === budget);
    const sens = SENSATIONS.find((s) => s.id === sensation);
    const sensLabel = sens ? `${sens.it} / ${sens.en}` : "";

    // answers[] sintetiche per il matcher (ramo surprise). Il ramo meta non lo usa.
    const answers: string[] = ["path_fast"];
    if (mode === "surprise" && sens) {
      answers.push(JSON.stringify({ emotional_goals: [sensLabel], pace: "balanced" }));
    } else if (mode === "meta" && city.trim()) {
      answers.push(JSON.stringify({ specific_place: city.trim() }));
    }

    return {
      answers,
      days: dur?.days ?? 7,
      leaveDate: "",
      budget: bud?.code ?? "medium",
      departure: "",
      companions: "",
      travelStyle: "",
      constraints: "",
      lang: currentLang,
      _l1: {
        mode,
        city: mode === "meta" ? city.trim() : undefined,
        sensation: mode === "surprise" ? sensLabel : undefined,
        durationId: duration ?? undefined,
        budgetId: budget ?? undefined,
      },
    } as Record<string, any>;
  };

  const genMessages = lang === "it"
    ? ["Leggo cosa cerchi...", "Scelgo il posto giusto per te...", "Costruisco i tuoi giorni...", "Cerco i momenti, non le tappe...", "Quasi pronto..."]
    : ["Reading what you're after...", "Choosing the right place for you...", "Building your days...", "Looking for moments, not stops...", "Almost there..."];

  const runGen = async () => {
    setGenerating(true);
    let mi = 0;
    setGenMsg(genMessages[0]);
    const iv = setInterval(() => { mi = Math.min(mi + 1, genMessages.length - 1); setGenMsg(genMessages[mi]); }, 9000);
    try {
      const profile = buildProfile();
      setFlow("mind_profiling_input", JSON.stringify(profile));
      track("quiz_completed", { path: mode === "meta" ? "fast_meta" : "fast_surprise" });

      let destinationName = "";
      let destinationId = 0;
      let tagline: string | undefined;
      let whyYours: string | undefined;

      if (mode === "meta") {
        const r = await fetch("/api/profiling/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city: city.trim(), profile }),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "direct failed");
        const d = await r.json();
        destinationName = d.destinationName; destinationId = d.destinationId;
      } else {
        const r = await fetch("/api/profiling", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(profile),
        });
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).message || "matching failed");
        const dests = await r.json();
        const top = Array.isArray(dests) ? dests[0] : null;
        if (!top) throw new Error("no destination");
        destinationName = top.name; destinationId = top.id;
        tagline = top.tagline ?? undefined; whyYours = top.whyYours ?? undefined;
      }

      track("generate_itinerary_started", { destination: destinationName, days: profile.days, budget: profile.budget });

      const v2 = await fetch("/api/itinerary/generate-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: profile, destinationName, destinationId, tagline, whyYours }),
      });
      if (!v2.ok) throw new Error("generation failed");
      const data = await v2.json();
      track("itinerary_generated", { destination: destinationName, days: profile.days, schema: "v2" });
      clearInterval(iv);
      // ?l2=1 → la pagina itinerario apre subito l'invito al raffinamento.
      setLocation(`/itinerary/${data.id ?? destinationId}?l2=1`);
    } catch (err) {
      clearInterval(iv);
      setGenerating(false);
      toast({
        title: L(lang, "Qualcosa è andato storto. Riprova.", "Something went wrong. Try again."),
        variant: "destructive",
      });
    }
  };

  // Avanzamento automatico dopo l'ultima domanda → generazione.
  const onPickLast = () => runGen();

  const canContinueCity = city.trim().length >= 2;

  // ── render helpers ────────────────────────────────────────────────────────
  const Title = ({ kicker, title }: { kicker: string; title: string }) => (
    <div className="text-center mb-8">
      <div className="text-[11px] tracking-[0.22em] uppercase text-[#E94560] font-semibold mb-3">{kicker}</div>
      <h1 className="text-[26px] sm:text-[34px] leading-tight font-semibold text-[var(--text-primary)] max-w-[640px] mx-auto">{title}</h1>
    </div>
  );

  if (generating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: bg }}>
        <div className="w-12 h-12 rounded-full border-2 border-[#E94560] border-t-transparent" style={{ animation: "spin 0.8s linear infinite" }} />
        <p className="mt-6 text-[15px] text-[var(--text-secondary)] text-center max-w-[420px]">{genMsg}</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: bg }}>
      <FlowNav />
      <div className="max-w-[820px] mx-auto px-5 pt-[88px] sm:pt-[110px] pb-20">
        {/* progress */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${i === stepIdx ? "w-8 bg-[#E94560]" : i < stepIdx ? "w-4 bg-[#E94560]/50" : "w-4 bg-[var(--border-input)]"}`} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35 }}
          >
            {current === "mode" && (
              <div>
                <Title kicker={L(lang, "Si parte", "Let's begin")} title={L(lang, "Da dove partiamo?", "Where do we start?")} />
                <div className="grid sm:grid-cols-2 gap-4 max-w-[620px] mx-auto">
                  <button
                    onClick={() => chooseMode("meta")}
                    data-testid="fast-mode-meta"
                    className="group text-left p-6 rounded-2xl border-[1.5px] border-[var(--border-input)] bg-[var(--surface-card)] hover:border-[#E94560] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <MapPin className="w-7 h-7 text-[#E94560] mb-4" />
                    <div className="text-[18px] font-semibold text-[var(--text-primary)] mb-1">{L(lang, "Ho già una meta", "I have a destination")}</div>
                    <div className="text-[13px] text-[var(--text-secondary)]">{L(lang, "So dove voglio andare. Costruiscimelo addosso.", "I know where I want to go. Build it around me.")}</div>
                  </button>
                  <button
                    onClick={() => chooseMode("surprise")}
                    data-testid="fast-mode-surprise"
                    className="group text-left p-6 rounded-2xl border-[1.5px] border-[var(--border-input)] bg-[var(--surface-card)] hover:border-[#E94560] hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <Sparkles className="w-7 h-7 text-[#E94560] mb-4" />
                    <div className="text-[18px] font-semibold text-[var(--text-primary)] mb-1">{L(lang, "Sorprendimi", "Surprise me")}</div>
                    <div className="text-[13px] text-[var(--text-secondary)]">{L(lang, "Non so ancora dove. Portami dove dovrei essere.", "I don't know yet. Take me where I should be.")}</div>
                  </button>
                </div>
              </div>
            )}

            {current === "city" && (
              <div>
                <Title kicker={L(lang, "La meta", "Destination")} title={L(lang, "Dove ti porta la testa?", "Where's your mind taking you?")} />
                <div className="max-w-[520px] mx-auto">
                  <input
                    autoFocus
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && canContinueCity) goNext(); }}
                    placeholder={L(lang, "Una città, un'isola, un paese…", "A city, an island, a country…")}
                    data-testid="fast-city-input"
                    className="w-full px-5 py-4 rounded-xl text-[16px] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] focus:border-[#E94560] outline-none text-[var(--text-primary)] transition-all"
                  />
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {CITY_SUGGESTIONS.map((c) => (
                      <FormChip key={c} label={c} selected={city === c} onClick={() => setCity(c)} testId={`fast-city-${c}`} />
                    ))}
                  </div>
                  <button
                    onClick={goNext}
                    disabled={!canContinueCity}
                    data-testid="fast-city-continue"
                    className="mt-7 w-full py-3.5 rounded-xl bg-[#E94560] text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all flex items-center justify-center gap-2"
                  >
                    {L(lang, "Continua", "Continue")} <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {current === "sensation" && (
              <div>
                <Title kicker={L(lang, "L'emozione", "The feeling")} title={L(lang, "Che sensazione stai cercando?", "What feeling are you after?")} />
                <div className="flex flex-wrap gap-3 justify-center max-w-[560px] mx-auto">
                  {SENSATIONS.map((s) => (
                    <FormChip
                      key={s.id}
                      label={L(lang, s.it, s.en)}
                      selected={sensation === s.id}
                      onClick={() => { setSensation(s.id); setTimeout(goNext, 220); }}
                      testId={`fast-sensation-${s.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {current === "duration" && (
              <div>
                <Title kicker={L(lang, "Il tempo", "Time")} title={L(lang, "Quanto tempo hai?", "How much time do you have?")} />
                <div className="flex flex-wrap gap-3 justify-center max-w-[560px] mx-auto">
                  {DURATIONS.map((d) => (
                    <FormChip
                      key={d.id}
                      label={L(lang, d.it, d.en)}
                      selected={duration === d.id}
                      onClick={() => { setDuration(d.id); setTimeout(goNext, 220); }}
                      testId={`fast-duration-${d.id}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {current === "budget" && (
              <div>
                <Title kicker={L(lang, "Il budget", "Budget")} title={L(lang, "Quanto ti va di spendere?", "How much do you feel like spending?")} />
                <div className="flex flex-wrap gap-3 justify-center max-w-[560px] mx-auto">
                  {BUDGETS.map((b) => (
                    <FormChip
                      key={b.id}
                      label={L(lang, b.it, b.en)}
                      selected={budget === b.id}
                      onClick={() => { setBudget(b.id); setTimeout(onPickLast, 240); }}
                      testId={`fast-budget-${b.id}`}
                    />
                  ))}
                </div>
                <p className="text-center text-[12px] text-[var(--text-secondary)] mt-8 max-w-[420px] mx-auto">
                  {L(lang, "Bastano questi. Il resto lo affineremo sul tuo primo itinerario.", "That's enough. We'll refine the rest on your first itinerary.")}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* back */}
        <div className="mt-12 flex justify-center">
          <button onClick={goBack} className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] hover:text-[#E94560] transition-colors cursor-pointer" data-testid="fast-back">
            <ArrowLeft className="w-4 h-4" /> {L(lang, "Indietro", "Back")}
          </button>
        </div>
      </div>
    </div>
  );
}
