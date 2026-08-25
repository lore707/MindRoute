import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "wouter";
import type { FastProfile } from "@shared/schema";
import { pressable } from "@/lib/pressable";
import { EASE } from "@/lib/motion";
import { useI18n } from "@/lib/i18n";
import { FlowNav } from "@/components/FlowNav";
import { GenerationRitual } from "@/components/GenerationRitual";
import { setFlow } from "@/lib/flow-storage";
import { track } from "@/lib/analytics";
import { useToast } from "@/hooks/use-toast";
import { questionThemes } from "./profiling/questionThemes";
import "@/styles/quiz-cinematic.css";

type Lang = "it" | "en";
type Step = "direction" | "intent" | "shape" | "practical" | "boundaries";
type DirectionMode = FastProfile["direction"]["mode"];
type Pace = FastProfile["pace"];
type Companion = FastProfile["companions"];
type DateMode = FastProfile["dates"]["mode"];
type Option = { id: string; it: string; en: string; metaIt?: string; metaEn?: string; icon: string; theme: string };
type DurationOption = Option & { minDays: number; maxDays: number; days: number };
type BudgetOption = Option & { code: FastProfile["budget"]["tier"] };

const L = (lang: Lang, it: string, en: string) => (lang === "it" ? it : en);
const qp = (key: string) => { try { return new URLSearchParams(window.location.search).get(key); } catch { return null; } };
const themeImg = (key: string) => (questionThemes[key] ?? questionThemes.default).imageUrl.replace("w=1200", "w=1600");
const STEPS: Step[] = ["direction", "intent", "shape", "practical", "boundaries"];
const STEP_THEME: Record<Step, string> = { direction: "anywhere", intent: "explorative", shape: "authentic", practical: "city", boundaries: "quiet" };
const DRAFT_KEY = "mindroute-fast-v2-draft";

const DIRECTIONS: Option[] = [
  { id: "fixed", it: "Ho già una meta", en: "I have a destination", metaIt: "Costruiscila intorno a me", metaEn: "Build it around me", icon: "◎", theme: "city" },
  { id: "region", it: "Ho una zona in mente", en: "I have a region in mind", metaIt: "Dammi tre direzioni compatibili", metaEn: "Give me three fitting directions", icon: "◌", theme: "europe" },
  { id: "open", it: "Sorprendimi", en: "Surprise me", metaIt: "Parti da ciò che cerco", metaEn: "Start from what I need", icon: "✦", theme: "anywhere" },
];
const REGIONS: Option[] = [
  { id: "near_home", it: "Vicino casa", en: "Close to home", icon: "⌂", theme: "home" },
  { id: "europe", it: "Europa", en: "Europe", icon: "◫", theme: "europe" },
  { id: "asia", it: "Asia", en: "Asia", icon: "◉", theme: "asia" },
  { id: "americas", it: "Americhe", en: "Americas", icon: "◇", theme: "americas" },
  { id: "africa_middle_east", it: "Africa e Medio Oriente", en: "Africa & Middle East", icon: "△", theme: "africa" },
  { id: "oceania", it: "Oceania", en: "Oceania", icon: "≈", theme: "oceania" },
];
const INTENTIONS: Option[] = [
  { id: "disconnect", it: "Staccare davvero", en: "Truly disconnect", icon: "◐", theme: "quiet" },
  { id: "recharge", it: "Recuperare energia", en: "Recharge", icon: "↟", theme: "regenerating" },
  { id: "alive", it: "Sentirmi vivo", en: "Feel alive", icon: "↯", theme: "adventure" },
  { id: "slowdown", it: "Rallentare", en: "Slow down", icon: "—", theme: "quiet" },
  { id: "surprise", it: "Essere sorpreso", en: "Be surprised", icon: "✦", theme: "explorative" },
  { id: "celebrate", it: "Celebrare", en: "Celebrate", icon: "✺", theme: "festive" },
  { id: "findself", it: "Ritrovarmi", en: "Find myself", icon: "○", theme: "spiritual" },
  { id: "change", it: "Vivere qualcosa di nuovo", en: "Experience something new", icon: "↗", theme: "offgrid" },
];
const INTERESTS: Option[] = [
  { id: "nature", it: "Natura e paesaggi", en: "Nature & landscapes", icon: "⌁", theme: "nature" },
  { id: "culture", it: "Cultura e storia", en: "Culture & history", icon: "▥", theme: "cultural" },
  { id: "food", it: "Cibo e vita locale", en: "Food & local life", icon: "◒", theme: "food" },
  { id: "beach", it: "Mare e benessere", en: "Sea & wellbeing", icon: "≈", theme: "beach" },
  { id: "adventure", it: "Avventura", en: "Adventure", icon: "△", theme: "adventure" },
  { id: "city", it: "Città e creatività", en: "Cities & creativity", icon: "▦", theme: "city" },
  { id: "offgrid", it: "Luoghi insoliti", en: "Unusual places", icon: "◇", theme: "offgrid" },
  { id: "authentic", it: "Incontri e autenticità", en: "People & authenticity", icon: "∞", theme: "authentic" },
];
const COMPANIONS: Option[] = [
  { id: "solo", it: "Solo", en: "Solo", icon: "○", theme: "solitary" },
  { id: "couple", it: "In coppia", en: "As a couple", icon: "♡", theme: "romantic" },
  { id: "friends", it: "Con amici", en: "With friends", icon: "∴", theme: "festive" },
  { id: "family", it: "In famiglia", en: "With family", icon: "⌂", theme: "authentic" },
];
const PACES: Option[] = [
  { id: "slow", it: "Lento", en: "Slow", metaIt: "Poche ancore, molto respiro", metaEn: "Few anchors, plenty of room", icon: "—", theme: "quiet" },
  { id: "balanced", it: "Equilibrato", en: "Balanced", metaIt: "Pieno ma sostenibile", metaEn: "Full but sustainable", icon: "◐", theme: "authentic" },
  { id: "intense", it: "Intenso", en: "Intense", metaIt: "Sfrutta bene ogni giorno", metaEn: "Make the most of every day", icon: "↯", theme: "adventure" },
];
const DURATIONS: DurationOption[] = [
  { id: "weekend", it: "Weekend", en: "Weekend", metaIt: "3-4 giorni", metaEn: "3-4 days", icon: "03", theme: "city", minDays: 3, maxDays: 4, days: 4 },
  { id: "week", it: "Una settimana", en: "One week", metaIt: "5-7 giorni", metaEn: "5-7 days", icon: "07", theme: "nature", minDays: 5, maxDays: 7, days: 7 },
  { id: "eight-ten", it: "8-10 giorni", en: "8-10 days", icon: "10", theme: "explorative", minDays: 8, maxDays: 10, days: 9 },
  { id: "ten-fourteen", it: "11-14 giorni", en: "11-14 days", icon: "14", theme: "adventure", minDays: 11, maxDays: 14, days: 12 },
];
const BUDGETS: BudgetOption[] = [
  { id: "low", code: "low", it: "Essenziale", en: "Essential", metaIt: "Semplice e intelligente", metaEn: "Simple and smart", icon: "€", theme: "offgrid" },
  { id: "medium", code: "medium", it: "Equilibrato", en: "Balanced", metaIt: "Comfort senza eccessi", metaEn: "Comfort without excess", icon: "€€", theme: "authentic" },
  { id: "high", code: "high", it: "Comfort", en: "Comfort", metaIt: "Qualità e momenti speciali", metaEn: "Quality and special moments", icon: "€€€", theme: "romantic" },
  { id: "unlimited", code: "unlimited", it: "Premium", en: "Premium", metaIt: "La qualità viene prima", metaEn: "Quality comes first", icon: "◆", theme: "quietluxury" },
];
const PERIODS: Option[] = [
  { id: "spring", it: "Primavera", en: "Spring", icon: "◌", theme: "nature" },
  { id: "summer", it: "Estate", en: "Summer", icon: "☼", theme: "beach" },
  { id: "autumn", it: "Autunno", en: "Autumn", icon: "◇", theme: "authentic" },
  { id: "winter", it: "Inverno", en: "Winter", icon: "✣", theme: "nordic" },
  { id: "anytime", it: "Quando conviene", en: "Whenever works best", icon: "✦", theme: "anywhere" },
];
const AVOIDS: Option[] = [
  { id: "crowded", it: "Troppa folla", en: "Crowds", icon: "⋮", theme: "quiet" },
  { id: "schedules", it: "Programmi rigidi", en: "Rigid schedules", icon: "▦", theme: "chaotic" },
  { id: "transits", it: "Troppi trasferimenti", en: "Too many transfers", icon: "⇢", theme: "roadtrip" },
  { id: "mornings", it: "Sveglie molto presto", en: "Very early starts", icon: "◔", theme: "quiet" },
  { id: "nightlife", it: "Vita notturna", en: "Nightlife", icon: "☾", theme: "city" },
  { id: "resort", it: "Resort turistici", en: "Tourist resorts", icon: "□", theme: "beach" },
  { id: "guided", it: "Troppe visite guidate", en: "Too many guided tours", icon: "◎", theme: "cultural" },
  { id: "toomuchwalking", it: "Troppo sforzo fisico", en: "Too much physical effort", icon: "△", theme: "adventure" },
  { id: "tooexpensive", it: "Spese impreviste", en: "Unexpected costs", icon: "€", theme: "authentic" },
  { id: "museums", it: "Troppi musei", en: "Too many museums", icon: "▥", theme: "cultural" },
];
const DEPARTURES = ["Milano", "Roma", "Bergamo", "Bologna", "Venezia", "Napoli"];

function toggleLimited(values: string[], value: string, max: number) {
  if (values.includes(value)) return values.filter((item) => item !== value);
  if (values.length >= max) return [...values.slice(1), value];
  return [...values, value];
}
function optionLabel(options: Option[], id: string | null, lang: Lang) {
  const option = options.find((item) => item.id === id);
  return option ? L(lang, option.it, option.en) : "";
}

export default function QuizFast() {
  const { lang: rawLang } = useI18n() as { lang: string };
  const lang: Lang = rawLang === "it" ? "it" : "en";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [stepIdx, setStepIdx] = useState(0);
  const current = STEPS[stepIdx];
  const [direction, setDirection] = useState<DirectionMode | null>(null);
  const [place, setPlace] = useState("");
  const [region, setRegion] = useState<string | null>(null);
  const [directionFlexibility, setDirectionFlexibility] = useState<"required" | "inspiration">("required");
  const [intentions, setIntentions] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [companions, setCompanions] = useState<Companion | null>(null);
  const [pace, setPace] = useState<Pace | null>(null);
  const [duration, setDuration] = useState<string | null>(null);
  const [departure, setDeparture] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("flexible");
  const [exactDate, setExactDate] = useState("");
  const [period, setPeriod] = useState<string | null>(null);
  const [budget, setBudget] = useState<FastProfile["budget"]["tier"] | null>(null);
  const [budgetTotal, setBudgetTotal] = useState("");
  const [budgetIncludesFlights, setBudgetIncludesFlights] = useState(false);
  const [avoid, setAvoid] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(() => qp("gen") === "1");
  const restored = useRef(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    track(stepIdx === 0 ? "quiz_started" : "quiz_step_viewed", {
      quiz_version: "fast-v2",
      step: current,
      step_number: stepIdx + 1,
    });
  }, [current, stepIdx]);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.direction) setDirection(draft.direction);
      if (typeof draft.place === "string") setPlace(draft.place);
      if (draft.region) setRegion(draft.region);
      if (draft.directionFlexibility) setDirectionFlexibility(draft.directionFlexibility);
      if (Array.isArray(draft.intentions)) setIntentions(draft.intentions);
      if (Array.isArray(draft.interests)) setInterests(draft.interests);
      if (draft.companions) setCompanions(draft.companions);
      if (draft.pace) setPace(draft.pace);
      if (draft.duration) setDuration(draft.duration);
      if (typeof draft.departure === "string") setDeparture(draft.departure);
      if (draft.dateMode) setDateMode(draft.dateMode);
      if (typeof draft.exactDate === "string") setExactDate(draft.exactDate);
      if (draft.period) setPeriod(draft.period);
      if (draft.budget) setBudget(draft.budget);
      if (typeof draft.budgetTotal === "string") setBudgetTotal(draft.budgetTotal);
      if (typeof draft.budgetIncludesFlights === "boolean") setBudgetIncludesFlights(draft.budgetIncludesFlights);
      if (Array.isArray(draft.avoid)) setAvoid(draft.avoid);
      if (typeof draft.note === "string") setNote(draft.note);
      if (Number.isInteger(draft.stepIdx)) setStepIdx(Math.max(0, Math.min(draft.stepIdx, STEPS.length - 1)));
    } catch { /* ignore invalid draft */ }
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ stepIdx, direction, place, region, directionFlexibility, intentions, interests, companions, pace, duration, departure, dateMode, exactDate, period, budget, budgetTotal, budgetIncludesFlights, avoid, note }));
    } catch { /* best-effort */ }
  }, [stepIdx, direction, place, region, directionFlexibility, intentions, interests, companions, pace, duration, departure, dateMode, exactDate, period, budget, budgetTotal, budgetIncludesFlights, avoid, note]);
  useEffect(() => {
    if (qp("mode") === "meta") setDirection("fixed");
    if (qp("mode") === "surprise") setDirection("open");
  }, []);

  const [activeImg, setActiveImg] = useState(themeImg(STEP_THEME.direction));
  const [imgA, setImgA] = useState(activeImg);
  const [imgB, setImgB] = useState("");
  const [showA, setShowA] = useState(true);
  const previousImg = useRef(activeImg);
  useEffect(() => {
    if (activeImg === previousImg.current) return;
    previousImg.current = activeImg;
    if (showA) { setImgB(activeImg); setShowA(false); } else { setImgA(activeImg); setShowA(true); }
  }, [activeImg, showA]);
  useEffect(() => setActiveImg(themeImg(STEP_THEME[current])), [current]);

  const hoverTheme = (theme?: string) => setActiveImg(themeImg(theme ?? STEP_THEME[current]));
  const durationOption = DURATIONS.find((item) => item.id === duration);
  const totalNumber = Number.parseInt(budgetTotal.replace(/[^\d]/g, ""), 10);
  const validTotal = Number.isFinite(totalNumber) && totalNumber > 0;
  const canContinue = useMemo(() => {
    if (current === "direction") return direction === "fixed" ? place.trim().length >= 2 : direction === "region" ? !!region : direction === "open";
    if (current === "intent") return intentions.length > 0 && interests.length > 0;
    if (current === "shape") return !!companions && !!pace && !!duration;
    if (current === "practical") return departure.trim().length >= 2 && (dateMode === "exact" ? !!exactDate : !!period) && !!budget;
    return true;
  }, [current, direction, place, region, intentions, interests, companions, pace, duration, departure, dateMode, exactDate, period, budget]);

  const goBack = () => {
    if (stepIdx === 0) { setLocation("/"); return; }
    setStepIdx((value) => Math.max(0, value - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const goNext = () => {
    if (!canContinue) return;
    setStepIdx((value) => Math.min(STEPS.length - 1, value + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const buildProfile = () => {
    if (!direction || !companions || !pace || !durationOption || !budget) throw new Error("incomplete profile");
    const currentLang = localStorage.getItem("mindroute-lang") === "it" ? "it" : "en";
    const fastProfile: FastProfile = {
      schema: "fast-v2",
      direction: { mode: direction, ...(direction === "fixed" ? { place: place.trim() } : {}), ...(direction === "region" && region ? { region } : {}), flexibility: direction === "fixed" ? directionFlexibility : "inspiration" },
      intentions,
      interests,
      companions,
      pace,
      duration: { id: durationOption.id, minDays: durationOption.minDays, maxDays: durationOption.maxDays, days: durationOption.days },
      dates: { mode: dateMode, ...(dateMode === "exact" ? { date: exactDate } : { period: period ?? "anytime" }) },
      budget: { tier: budget, ...(validTotal ? { totalPerPerson: totalNumber } : {}), includesFlights: budgetIncludesFlights },
      departure: departure.trim(),
      avoid,
      ...(note.trim() ? { note: note.trim() } : {}),
    };
    const constraints = [avoid.length ? `avoid: ${avoid.join(", ")}` : "", note.trim() ? `traveler note: ${note.trim()}` : ""].filter(Boolean).join(" | ");
    return {
      answers: [direction === "open" ? "path_a" : "path_b", JSON.stringify(fastProfile)],
      days: durationOption.days,
      leaveDate: dateMode === "exact" ? exactDate : `flexible:${period}`,
      budget,
      departure: departure.trim(),
      companions,
      pace,
      travelStyle: pace,
      constraints,
      avoid,
      lang: currentLang,
      quizVersion: "fast-v2",
      fastProfile,
      ...(validTotal ? { budgetTotalPerPerson: totalNumber, budgetIncludesFlights } : {}),
      _l1: { mode: direction === "fixed" ? "meta" : direction === "region" ? "region" : "surprise", city: direction === "fixed" ? place.trim() : undefined, region: direction === "region" ? region : undefined, sensation: intentions.join(", "), durationId: durationOption.id, budgetId: budget },
    };
  };

  const runGeneration = async () => {
    setGenerating(true);
    try {
      const profile = buildProfile();
      setFlow("mind_profiling_input", JSON.stringify(profile));
      const response = await fetch("/api/profiling", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || "matching failed");
      const destinations = await response.json();
      if (!Array.isArray(destinations) || destinations.length === 0) throw new Error("no destinations");
      setFlow("mind_destinations", JSON.stringify(destinations));
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      track("quiz_completed", { path: `fast_v2_${direction}`, quiz_version: "fast-v2", completion_seconds: Math.round((Date.now() - startedAt.current) / 1000), intentions: intentions.join(","), interests: interests.join(","), companions, pace, duration: durationOption?.id, avoid_count: avoid.length });
      setLocation("/destinations");
    } catch {
      setGenerating(false);
      toast({ title: L(lang, "Qualcosa è andato storto. Le tue risposte sono al sicuro: riprova.", "Something went wrong. Your answers are safe: try again."), variant: "destructive" });
    }
  };

  const Bg = <><div className="qc-bg-stage" aria-hidden><div className="qc-bg-photo" style={{ backgroundImage: imgA ? `url("${imgA}")` : undefined, opacity: showA ? 1 : 0 }} /><div className="qc-bg-photo" style={{ backgroundImage: imgB ? `url("${imgB}")` : undefined, opacity: showA ? 0 : 1 }} /></div><div className="qc-grain" aria-hidden /></>;
  if (generating) return <div className="quiz-cinematic" style={{ position: "relative", minHeight: "100vh" }}>{Bg}<div className="qc-generation-wrap"><GenerationRitual lede={L(lang, "Abbiamo capito abbastanza.", "We've understood enough.")} sub={L(lang, "Una sola ricerca, costruita su tutto ciò che ci hai detto.", "One search, shaped by everything you told us.")} stepMs={7000} steps={lang === "it" ? ["Metto in ordine bisogni e vincoli", "Confronto mete davvero compatibili", "Scelgo tre risposte diverse per te"] : ["Ordering your needs and constraints", "Comparing genuinely compatible places", "Choosing three different answers for you"]} /></div></div>;

  const progress = ((stepIdx + 1) / STEPS.length) * 100;
  const copy: Record<Step, { eyebrowIt: string; eyebrowEn: string; titleIt: [string, string]; titleEn: [string, string]; subIt: string; subEn: string }> = {
    direction: { eyebrowIt: "La direzione", eyebrowEn: "Direction", titleIt: ["Da dove", "partiamo?"], titleEn: ["Where do we", "start?"], subIt: "Puoi indicare una meta, una zona o lasciarci il mondo intero.", subEn: "Name a place, a region, or leave the whole world open." },
    intent: { eyebrowIt: "Il perché", eyebrowEn: "The why", titleIt: ["Cosa deve", "lasciarti?"], titleEn: ["What should it", "give you?"], subIt: "Scegli fino a due bisogni e due interessi. Sono il cuore del matching.", subEn: "Pick up to two needs and two interests. They drive the match." },
    shape: { eyebrowIt: "Il ritmo", eyebrowEn: "The rhythm", titleIt: ["Che forma avrà", "questo viaggio?"], titleEn: ["What shape should", "this trip take?"], subIt: "Tre scelte rapide cambiano densità, distanze e giornate.", subEn: "Three quick choices change density, distances and days." },
    practical: { eyebrowIt: "I vincoli", eyebrowEn: "Constraints", titleIt: ["Facciamolo stare", "nella realtà."], titleEn: ["Let's make it work", "in real life."], subIt: "Partenza, periodo e budget escludono le mete sbagliate prima di generare.", subEn: "Departure, timing and budget rule out bad matches before generation." },
    boundaries: { eyebrowIt: "I confini", eyebrowEn: "Boundaries", titleIt: ["Cosa non deve", "succedere?"], titleEn: ["What must not", "happen?"], subIt: "Scegline fino a due. Per noi sono limiti, non semplici preferenze.", subEn: "Pick up to two. We treat them as boundaries, not suggestions." },
  };
  const c = copy[current];
  const renderOption = (option: Option, selected: boolean, onClick: () => void) => <div {...pressable} key={option.id} className={`qc-option qc-fast-option compact ${selected ? "selected" : ""}`} onMouseEnter={() => hoverTheme(option.theme)} onMouseLeave={() => hoverTheme()} onClick={onClick} data-testid={`fast-${current}-${option.id}`}><div className="qc-option-ic">{option.icon}</div><div className="qc-option-body"><div className="qc-option-name">{L(lang, option.it, option.en)}</div>{(option.metaIt || option.metaEn) && <div className="qc-option-meta">{L(lang, option.metaIt ?? "", option.metaEn ?? "")}</div>}</div><div className="qc-option-mark"><span className="qc-circle" /></div></div>;

  return <div className="quiz-cinematic" style={{ position: "relative", minHeight: "100vh" }}>
    {Bg}<FlowNav />
    <div className="qc-stage qc-fast-stage"><div className="qc-container qc-container-flat qc-fast-container">
      <div className="qc-header-strip"><span className="qc-label">MindRoute</span><span className="qc-progress-line"><span className="qc-fill" style={{ width: `${progress}%` }} /></span><span className="qc-count">{stepIdx + 1} / {STEPS.length}</span></div>
      <AnimatePresence mode="wait"><motion.div key={current} initial={qp("noanim") === "1" ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={qp("noanim") === "1" ? undefined : { opacity: 0, y: -10 }} transition={{ duration: qp("noanim") === "1" ? 0 : 0.3, ease: EASE }}>
        <div className="qc-q-head qc-fast-head"><span className="qc-q-eyebrow"><strong>{L(lang, c.eyebrowIt, c.eyebrowEn)}</strong></span><h1 className="qc-q-title">{L(lang, c.titleIt[0], c.titleEn[0])} <em>{L(lang, c.titleIt[1], c.titleEn[1])}</em></h1><p className="qc-q-sub">{L(lang, c.subIt, c.subEn)}</p></div>

        {current === "direction" && <div className="qc-fast-stack"><div className="qc-fast-grid three">{DIRECTIONS.map((option) => renderOption(option, direction === option.id, () => { setDirection(option.id as DirectionMode); setDirectionFlexibility(option.id === "fixed" ? "required" : "inspiration"); }))}</div>{direction === "fixed" && <div className="qc-fast-panel"><label className="qc-fast-label">{L(lang, "Quale posto hai in mente?", "Which place do you have in mind?")}</label><input autoFocus value={place} onChange={(event) => setPlace(event.target.value)} placeholder={L(lang, "Es. Kyoto, Portogallo, Dolomiti...", "E.g. Kyoto, Portugal, Dolomites...")} className="qc-precise-input" data-testid="fast-place" /><div className="qc-fast-segment"><button className={directionFlexibility === "required" ? "selected" : ""} onClick={() => setDirectionFlexibility("required")}>{L(lang, "Voglio proprio questa", "I want this exact place")}</button><button className={directionFlexibility === "inspiration" ? "selected" : ""} onClick={() => setDirectionFlexibility("inspiration")}>{L(lang, "Usala come ispirazione", "Use it as inspiration")}</button></div></div>}{direction === "region" && <div className="qc-fast-grid three qc-fast-subgrid">{REGIONS.map((option) => renderOption(option, region === option.id, () => setRegion(option.id)))}</div>}</div>}

        {current === "intent" && <div className="qc-fast-split"><section className="qc-fast-group"><div className="qc-fast-group-head"><div><span>01</span><h2>{L(lang, "Cosa ti serve adesso", "What you need now")}</h2></div><span className={`qc-pick-counter ${intentions.length === 2 ? "full" : ""}`}><strong>{intentions.length}</strong>/2</span></div><div className="qc-fast-grid two">{INTENTIONS.map((option) => renderOption(option, intentions.includes(option.id), () => setIntentions((values) => toggleLimited(values, option.id, 2))))}</div></section><section className="qc-fast-group"><div className="qc-fast-group-head"><div><span>02</span><h2>{L(lang, "Cosa ti attira", "What draws you in")}</h2></div><span className={`qc-pick-counter ${interests.length === 2 ? "full" : ""}`}><strong>{interests.length}</strong>/2</span></div><div className="qc-fast-grid two">{INTERESTS.map((option) => renderOption(option, interests.includes(option.id), () => setInterests((values) => toggleLimited(values, option.id, 2))))}</div></section></div>}

        {current === "shape" && <div className="qc-fast-stack"><section className="qc-fast-group"><div className="qc-fast-group-head"><div><span>01</span><h2>{L(lang, "Con chi parti", "Who you're going with")}</h2></div></div><div className="qc-fast-grid four">{COMPANIONS.map((option) => renderOption(option, companions === option.id, () => setCompanions(option.id as Companion)))}</div></section><section className="qc-fast-group"><div className="qc-fast-group-head"><div><span>02</span><h2>{L(lang, "Che ritmo vuoi", "The pace you want")}</h2></div></div><div className="qc-fast-grid three">{PACES.map((option) => renderOption(option, pace === option.id, () => setPace(option.id as Pace)))}</div></section><section className="qc-fast-group"><div className="qc-fast-group-head"><div><span>03</span><h2>{L(lang, "Quanto tempo hai", "How much time you have")}</h2></div></div><div className="qc-fast-grid five">{DURATIONS.map((option) => renderOption(option, duration === option.id, () => setDuration(option.id)))}</div></section></div>}

        {current === "practical" && <div className="qc-fast-practical"><section className="qc-fast-panel"><span className="qc-fast-kicker">01 · {L(lang, "Partenza", "Departure")}</span><label className="qc-fast-label">{L(lang, "Da dove parti?", "Where are you leaving from?")}</label><input value={departure} onChange={(event) => setDeparture(event.target.value)} placeholder={L(lang, "Città o aeroporto", "City or airport")} className="qc-precise-input" data-testid="fast-departure" /><div className="qc-fast-chips">{DEPARTURES.map((city) => <button key={city} className={departure === city ? "selected" : ""} onClick={() => setDeparture(city)}>{city}</button>)}</div></section><section className="qc-fast-panel"><span className="qc-fast-kicker">02 · {L(lang, "Quando", "When")}</span><div className="qc-fast-segment"><button className={dateMode === "flexible" ? "selected" : ""} onClick={() => setDateMode("flexible")}>{L(lang, "Sono flessibile", "I'm flexible")}</button><button className={dateMode === "exact" ? "selected" : ""} onClick={() => setDateMode("exact")}>{L(lang, "Ho una data", "I have a date")}</button></div>{dateMode === "exact" ? <input type="date" value={exactDate} min={new Date().toISOString().slice(0, 10)} onChange={(event) => setExactDate(event.target.value)} className="qc-precise-input" data-testid="fast-date" /> : <div className="qc-fast-grid periods">{PERIODS.map((option) => renderOption(option, period === option.id, () => setPeriod(option.id)))}</div>}</section><section className="qc-fast-panel qc-fast-budget-panel"><span className="qc-fast-kicker">03 · Budget</span><div className="qc-fast-grid four">{BUDGETS.map((option) => renderOption(option, budget === option.code, () => setBudget(option.code)))}</div><div className="qc-fast-budget-row"><div><label className="qc-fast-label">{L(lang, "Hai una cifra totale?", "Do you have a total amount?")} <small>{L(lang, "opzionale, per persona", "optional, per person")}</small></label><div className="qc-money-input"><span>€</span><input inputMode="numeric" value={budgetTotal} onChange={(event) => setBudgetTotal(event.target.value.replace(/[^\d]/g, ""))} placeholder="1200" data-testid="fast-budget-total" /></div></div>{validTotal && <button className={`qc-flight-toggle ${budgetIncludesFlights ? "selected" : ""}`} onClick={() => setBudgetIncludesFlights((value) => !value)}><span className="qc-circle" />{budgetIncludesFlights ? L(lang, "Include i voli", "Includes flights") : L(lang, "Esclude i voli", "Excludes flights")}</button>}</div></section></div>}

        {current === "boundaries" && <div className="qc-fast-stack"><div className="qc-fast-group-head qc-fast-boundary-head"><div><h2>{L(lang, "Scegli solo ciò che cambierebbe davvero il viaggio", "Only pick what would truly change the trip")}</h2></div><span className={`qc-pick-counter ${avoid.length === 2 ? "full" : ""}`}><strong>{avoid.length}</strong>/2</span></div><div className="qc-fast-grid two">{AVOIDS.map((option) => renderOption(option, avoid.includes(option.id), () => setAvoid((values) => toggleLimited(values, option.id, 2))))}</div><div className="qc-fast-panel qc-fast-note"><label className="qc-fast-label">{L(lang, "C'è qualcosa che dobbiamo assolutamente sapere?", "Is there anything we absolutely need to know?")} <small>{L(lang, "opzionale", "optional")}</small></label><textarea value={note} maxLength={500} onChange={(event) => setNote(event.target.value)} placeholder={L(lang, "Accessibilità, bambini, alimentazione, ansia negli spostamenti, un momento irrinunciabile...", "Accessibility, children, diet, travel anxiety, one must-have moment...")} className="qc-textarea qc-fast-textarea" data-testid="fast-note" /><p className="qc-precise-hint">{L(lang, "Quello che scrivi qui può modificare davvero mete, ritmo e attività.", "What you write here can genuinely change the destinations, pace and activities.")}</p></div></div>}

        <div className="qc-nav qc-fast-nav"><button className="qc-back" onClick={goBack} data-testid="fast-back">← {L(lang, "Indietro", "Back")}</button><div className="qc-fast-summary" aria-live="polite">{current === "intent" && intentions.length > 0 && interests.length > 0 && `${optionLabel(INTENTIONS, intentions[0], lang)} · ${optionLabel(INTERESTS, interests[0], lang)}`}{current === "shape" && companions && pace && `${optionLabel(COMPANIONS, companions, lang)} · ${optionLabel(PACES, pace, lang)}`}{current === "boundaries" && L(lang, "Tutto resta modificabile nell'itinerario", "Everything remains editable in your itinerary")}</div><button className="qc-continue" onClick={current === "boundaries" ? runGeneration : goNext} disabled={!canContinue} data-testid={current === "boundaries" ? "fast-generate" : "fast-continue"}>{current === "boundaries" ? L(lang, "Trova le mie 3 mete", "Find my 3 places") : L(lang, "Continua", "Continue")} →</button></div>
      </motion.div></AnimatePresence>
    </div></div>
  </div>;
}
