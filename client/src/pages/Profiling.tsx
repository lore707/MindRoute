import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
// CSS del quiz, code-split su questa route lazy (vedi index.css).
import "@/styles/quiz-cinematic.css";
import "@/styles/quiz-logistics.css";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, HelpCircle, MapPin, Info, ChevronDown, Moon, Sun, HelpCircle as QuestionIcon, Leaf, Volume2, Zap, Heart, User, Sparkles, Landmark, Compass, Home, Globe, Plane, UtensilsCrossed, Waves, Building2, Tent, Car, Mountain, Flower2, Dice5, Camera, Search, Battery, Wind, Bird, Eye, Bus, Users, Clock, MessageCircle, Footprints, PiggyBank, Timer, Star, Coffee, Sunset } from "lucide-react";
import { useSubmitProfiling } from "@/hooks/use-profiling";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { setFlow } from "@/lib/flow-storage";
import { track } from "@/lib/analytics";
import { FlowNav } from "@/components/FlowNav";
import { Link, useLocation } from "wouter";
import LangDropdown from "@/components/LangDropdown";
import { useTheme } from "@/components/ThemeProvider";
import { AnalyzingScreen } from "./profiling/AnalyzingScreen";
import { FormChip } from "./profiling/FormChip";
import { createProfilingContent } from "./profiling/questions";
import { SliderTrack } from "./profiling/SliderTrack";
import type { ChipsQuestion, Question, TextQuestion } from "./profiling/types";
import { getQuestionTheme, getMultipleThemes, questionThemes } from './profiling/questionThemes';
import { useTraitRecognition } from "@/hooks/use-trait-recognition";
import { RecognitionBanner } from "@/components/RecognitionBanner";
import { FromProfileModal } from "@/components/FromProfileModal";
import { QuizCinematic, type Answers as CinematicAnswers } from "@/components/QuizCinematic";
import { QuizCinematicA, type AnswersA } from "@/components/QuizCinematicA";
import { QuizLogistics, type LogisticsAnswers, type ProfileSummary } from "@/components/QuizLogistics";
export default function Profiling() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const splitSceneBackground = theme === "dark"
    ? "radial-gradient(circle at 50% 16%, rgba(233,69,96,0.14), transparent 26%), radial-gradient(circle at 20% 22%, rgba(78,84,200,0.16), transparent 30%), linear-gradient(180deg, #141727 0%, #0d1020 58%, #101427 100%)"
   : "radial-gradient(circle at 50% 16%, rgba(233,69,96,0.18), transparent 28%), radial-gradient(circle at 18% 22%, rgba(233,69,96,0.10), transparent 32%), radial-gradient(circle at 80% 80%, rgba(233,69,96,0.08), transparent 30%), linear-gradient(180deg, #fdf5f0 0%, #f5ede6 60%, #f0e6dd 100%)";
  const splitStroke = theme === "dark" ? "rgba(255,255,255,0.11)" : "rgba(233,69,96,0.18)";
  const splitBadgeBg = theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(233,69,96,0.07)";
  const splitCardGlow = theme === "dark" ? "0 24px 70px rgba(4, 8, 20, 0.46)" : "0 24px 70px rgba(233, 69, 96, 0.14), 0 4px 20px rgba(180, 80, 80, 0.08)";
  const splitTrustBg = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.85)";
  const splitQuoteBg = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.56)";
  const profilingStageGlow = theme === "dark"
    ? "radial-gradient(circle at 50% 0%, rgba(233,69,96,0.18), transparent 42%)"
    : "radial-gradient(circle at 50% 0%, rgba(233,69,96,0.10), transparent 42%)";
  const questionPanelBg = theme === "dark"
    ? "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))"
    : "linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.68))";
  const questionPanelShadow = theme === "dark"
    ? "0 28px 80px rgba(0,0,0,0.34)"
    : "0 28px 80px rgba(216, 194, 199, 0.20)";
  const sidePanelBg = theme === "dark"
    ? "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))"
    : "linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.68))";
 const subtlePanelBg = theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.35)";

  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      data-testid="button-theme"
      className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-input)] text-[var(--text-secondary)] hover:border-[#E94560] hover:text-[#E94560] transition-all bg-transparent cursor-pointer"
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? <Moon className="w-[15px] h-[15px]" /> : <Sun className="w-[15px] h-[15px]" />}
    </button>
  );

  const { questionsByPath, sliderLabels, microReactions, months, analyzeTraits } = createProfilingContent(t);

  // Path A cinematic: id → label i18n (per AI/sidebar/logistica), come fa Path B in onComplete.
  const needChipKey: Record<string, string> = {
    disconnect: "a.q2.chip1", alive: "a.q2.chip2", slow: "a.q2.chip3", surprise: "a.q2.chip4",
    recharge: "a.q2.chip5", change: "a.q2.chip6", celebrate: "a.q2.chip7", findself: "a.q2.chip8",
  };
  const vibeLabel = (id: string) => t(`a.q1.chips.${id}`);
  const needLabel = (id: string) => t(needChipKey[id] ?? id);
  const drainLabel = (id: string) => t(`chips.${id}`);
  const visualLabel = (id: string) => t(`q4.${id}`);
  const distLabel = (id: string) => t(`a.q7.chips.${id}`);

  // L'ingresso è ora direttamente il QuizCinematic Q1 (scelta path): niente più
  // overlay split separato. selectedPath parte da 'b' + cinematicMode=true; la Q1
  // del cinematic gestisce guided→Path A (onSelectGuided) o intentional→prosegue.
  const [selectedPath, setSelectedPath] = useState<'a' | 'b' | null>('b');
  const [showSplit, setShowSplit] = useState(false);
  const [splitExiting, setSplitExiting] = useState(false);
  // cinematicMode=true → renderizziamo QuizCinematic invece del vecchio quiz body.
  // I valori vengono mappati in chipSelections/answers vecchie a fine cinematic, così
  // buildStructuredProfileForPathB e la sidebar profile-so-far continuano a funzionare.
  const [cinematicMode, setCinematicMode] = useState(true);
  const [cinematicAnswers, setCinematicAnswers] = useState<CinematicAnswers>({});
  const [cinematicStep, setCinematicStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  // Path A (guided discovery) — risposte cinematic + step di rientro dalla logistica.
  const [cinematicAnswersA, setCinematicAnswersA] = useState<AnswersA>({});
  const [cinematicAStep, setCinematicAStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  // Risposte logistica grezze (Chapter II+III) — fonte di verità per il profilo
  // strutturato completo letto dall'AI. Ref (non state) per leggerle in modo
  // sincrono dentro doFinalSubmit, che parte subito dopo onComplete.
  const logisticsRef = useRef<LogisticsAnswers | null>(null);
  const recognition = useTraitRecognition();
  // showRecognition gates the pre-quiz screen for returning users. Defaults to
  // true; user dismisses it via "cambia qualcosa" to fall through to the quiz.
  const [showRecognition, setShowRecognition] = useState(true);
  const [fromProfileOpen, setFromProfileOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [chipSelections, setChipSelections] = useState<Record<number, string[]>>({});
  const [imageSelections, setImageSelections] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(50);
  const [reaction, setReaction] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [visibleTraits, setVisibleTraits] = useState<string[]>([]);
  const [mobileWhyOpen, setMobileWhyOpen] = useState(false);
  const { toast } = useToast();
  const submitMutation = useSubmitProfiling();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transitionBusy = useRef(false);
  const analyzeTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Ref-guard: quiz_started deve partire UNA sola volta per sessione di quiz.
  const quizStartedRef = useRef(false);

  // email_signup — il callback OAuth manda l'utente NUOVO a /profiling?welcome=1
  // (vedi server/auth.ts). Leggiamo il flag una volta, spariamo l'evento e
  // ripuliamo l'URL così non riscatta a un eventuale reload. email_signup viaggia
  // sopra OAuth: arriverà solo quando il login Google è attivo in produzione.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "1") {
      track("email_signup");
      params.delete("welcome");
      const qs = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
  }, []);

  // quiz_started — POST-muro auth: Profiling è dentro <RequireAuth>, quindi monta
  // solo per utenti già loggati. Spariamo quando il quiz vero è a schermo (non la
  // recognition screen del ritorno, non l'analyzing). Il delta con quiz_cta_click
  // (CTA landing, pre-muro) = costo dell'auth gate.
  useEffect(() => {
    if (quizStartedRef.current) return;
    const quizVisible = !(recognition.canShow && showRecognition) && !showAnalyzing;
    if (quizVisible) {
      quizStartedRef.current = true;
      track("quiz_started");
    }
  }, [recognition.canShow, showRecognition, showAnalyzing]);

  const getPlaceholderForRegion = (regionLabel?: string) => {
    const label = (regionLabel || "").toLowerCase();

    // Mappa semplice basata sul testo visibile della chip (italiano/inglese)
    if (label.includes("europa") || label.includes("europe")) {
      return "Es: Lisbona, Dolomiti, Atene…";
    }
    if (label.includes("asia") || label.includes("asian")) {
      return "Es: Tokyo, Kyoto, Bali…";
    }
    if (label.includes("america")) {
      return "Es: New York, Patagonia, Costa Rica…";
    }
    if (label.includes("africa") || label.includes("medio") || label.includes("middle east")) {
      return "Es: Marocco, Cape Town, Giordania…";
    }
    if (label.includes("oceania")) {
      return "Es: Sydney, Nuova Zelanda, Fiji…";
    }
    if (label.includes("vicino") || label.includes("near") || label.includes("home")) {
      return "Es: città vicine, lago o montagna a poche ore…";
    }

    // Fallback generico
    return "Es: una città o un paese che ti ispira in questo momento…";
  };

  const getPlaceholderForTravelType = (chipLabel?: string) => {
    const label = (chipLabel || "").toLowerCase();
    if (label.includes("food") || label.includes("cibo") || label.includes("tradizion")) {
      return "Es: sushi autentico, street food, mercati locali…";
    }
    if (label.includes("natura") || label.includes("nature") || label.includes("paesagg")) {
      return "Es: trekking, foreste, fiordi, vulcani…";
    }
    if (label.includes("avventura") || label.includes("adventure")) {
      return "Es: surf, safari, immersioni, arrampicata…";
    }
    if (label.includes("mare") || label.includes("relax") || label.includes("beach")) {
      return "Es: spiagge tranquille, calette nascoste, isole…";
    }
    if (label.includes("cultur") || label.includes("storia") || label.includes("culture")) {
      return "Es: siti storici, quartieri antichi, musei particolari…";
    }
    if (label.includes("insolit") || label.includes("unusual") || label.includes("offgrid")) {
      return "Es: esperienze fuori rotta, luoghi poco turistici…";
    }
    return "Es: qualcosa che vorresti assolutamente includere in questo viaggio…";
  };

  const getPlaceholderForMoment = (chipLabel?: string) => {
    const label = (chipLabel || "").toLowerCase();
    if (label.includes("iconic") || label.includes("iconic") || label.includes("iconic")) {
      return "Es: Torre Eiffel, Piramidi di Giza, Machu Picchu…";
    }
    if (label.includes("quartieri") || label.includes("autentici") || label.includes("neighborhood")) {
      return "Es: mercati locali, street food, quartieri storici…";
    }
    if (label.includes("natura")) {
      return "Es: fiordi norvegesi, Himalaya, Patagonia…";
    }
    if (label.includes("mangiare") || label.includes("locali") || label.includes("posti locali")) {
      return "Es: trattorie di quartiere, bancarelle di street food…";
    }
    return "Es: un momento o un luogo che ti viene subito in mente…";
  };

  const getPlaceholderForEmotion = (chipLabel?: string) => {
    const label = (chipLabel || "").toLowerCase();
    if (label.includes("staccare")) {
      return "Es: rallentare davvero, silenzio, natura…";
    }
    if (label.includes("meravigliarmi") || label.includes("meraviglia") || label.includes("wonder")) {
      return "Es: paesaggi epici, architetture incredibili…";
    }
    if (label.includes("zona di comfort") || label.includes("comfort")) {
      return "Es: qualcosa che non ho mai fatto prima…";
    }
    if (label.includes("energia") || label.includes("leggerezza")) {
      return "Es: sentirmi più leggero, tornare carico…";
    }
    if (label.includes("sentire profondamente") || label.includes("profondamente")) {
      return "Es: entrare davvero in contatto con le persone e i luoghi…";
    }
    return "Es: come vorresti sentirti davvero, con parole tue…";
  };

  const getPlaceholderForAtmosphere = (value?: string) => {
    switch (value) {
      case "market":
        return "Es: street food, bazar, quartieri creativi…";
      case "trail":
        return "Es: trekking, silenzio, panorami…";
      case "cafe":
        return "Es: librerie, caffè storici, quartieri artistici…";
      case "seaside":
        return "Es: tramonti sul mare, passeggiate sul lungomare…";
      default:
        return "Es: cosa ti attrae davvero di questa atmosfera…";
    }
  };

  const getPlaceholderForAvoid = (chipLabel?: string) => {
    const label = (chipLabel || "").toLowerCase();
    if (label.includes("affollat") || label.includes("crowd")) {
      return "Es: preferisco villaggi piccoli o natura…";
    }
    if (label.includes("rigid") || label.includes("programma") || label.includes("schedule")) {
      return "Es: voglio giornate più libere, senza orari fissi…";
    }
    if (label.includes("visite guidate") || label.includes("tour")) {
      return "Es: preferisco scoprire i posti in autonomia…";
    }
    if (label.includes("musei")) {
      return "Es: meglio pochi musei scelti bene, non giornate intere…";
    }
    if (label.includes("club") || label.includes("vita notturna") || label.includes("night")) {
      return "Es: preferisco serate tranquille, bar locali, musica soft…";
    }
    if (label.includes("trasferimenti") || label.includes("transfer") || label.includes("lunghi")) {
      return "Es: tragitti brevi, poche mete ma ben vissute…";
    }
    return "Es: qualcos'altro che sarebbe meglio evitare per goderti davvero il viaggio…";
  };

  const [formData, setFormData] = useState({
    budget: "",
    selectedMonths: [] as string[],
    dateMode: "flexible-month" as "exact" | "flexible-month" | "flexible-period",
    dateFrom: "",
    dateTo: "",
    selectedPeriods: [] as string[],
    duration: "",
    departure: "",
  companions: "",
    travelStyle: "",
    accommodation: "",
    food: "",
    effort: "",
    dietary: [] as string[],
    constraints: "",
  });
  const [formFocus, setFormFocus] = useState<string>("budget");
  const [formStep, setFormStep] = useState<1 | 2>(1);

  const questions = selectedPath ? questionsByPath[selectedPath] : ([] as Question[]);
  const currentQ = questions[step];

  const bgImageUrl = useMemo(() => {
    const pathADefaults = [
      "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1400&q=85",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1400&q=85",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85",
      "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1400&q=85",
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1400&q=85",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&q=85",
      "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=1400&q=85",
    ];
    const pathBDefaults = [
      "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&q=85",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1400&q=85",
      "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1400&q=85",
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?w=1400&q=85",
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1400&q=85",
      "https://images.unsplash.com/photo-1520209759809-a9bcb6cb3241?w=1400&q=85",
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=85",
    ];
    const defaults = selectedPath === 'b' ? pathBDefaults : pathADefaults;
    const fallback = defaults[step] ?? questionThemes.default.imageUrl;
    if (currentQ?.type === 'images' && imageSelections.length > 0) {
      const opt = (currentQ as any).options?.find((o: any) => o.value === imageSelections[0]);
      if (opt?.src) return opt.src.replace(/w=\d+/, 'w=1400');
    }
    const sels = chipSelections[step] || [];
    if (sels.length > 0) {
      const theme = getQuestionTheme(sels);
      if (theme !== questionThemes.default) return theme.imageUrl.replace(/w=\d+/, 'w=1400');
    }
    return fallback;
  }, [chipSelections, imageSelections, step, currentQ, selectedPath]);

  useEffect(() => {
    if (!showSplit && textareaRef.current && currentQ?.type === 'text') {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [step, showSplit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // I quiz cinematic (Path A e Path B) gestiscono la navigazione internamente.
      if (e.key === 'Enter' && !e.shiftKey && !showForm && !reaction && !showSplit && !showAnalyzing && !cinematicMode && selectedPath !== 'a') {
        e.preventDefault();
        if (canContinue()) handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, answers, chipSelections, imageSelections, sliderValue, showForm, reaction, showSplit, showAnalyzing, cinematicMode, selectedPath]);

  useEffect(() => {
    return () => { analyzeTimers.current.forEach(t => clearTimeout(t)); };
  }, []);

  useEffect(() => {
    if (!submitMutation.data) return;

    analyzeTimers.current.forEach(t => clearTimeout(t));
    setShowAnalyzing(false);

    try {
    setFlow("mind_destinations", JSON.stringify(submitMutation.data));
      setLocation("/destinations");
    } catch (error) {
      console.error("Failed to persist destinations:", error);
      toast({
        title: "Impossibile salvare le destinazioni generate",
        variant: "destructive",
      });
    }
  }, [setLocation, submitMutation.data, toast]);

  useEffect(() => {
    if (!submitMutation.error) return;

    setShowAnalyzing(false);
    toast({
      title: submitMutation.error.message || "Errore durante la generazione delle destinazioni",
      variant: "destructive",
    });
  }, [submitMutation.error, toast]);

  const choosePath = (path: 'a' | 'b') => {
    setSelectedPath(path);
    if (path === 'b') {
      // Apriamo il QuizCinematic con path già pre-selezionato a "intentional"
      // (lo split ha già fatto la scelta). Q1 cinematic agisce come conferma /
      // possibilità di passare a guided (→ branca a Path A vecchio).
      setCinematicMode(true);
      setCinematicAnswers({ path: 'intentional' });
      setCinematicStep(1);
    } else {
      setCinematicMode(false);
    }
    setSplitExiting(true);
    setTimeout(() => {
      setShowSplit(false);
      setSplitExiting(false);
    }, 600);
  };

  const canContinue = () => {
    if (!currentQ) return false;
    if (currentQ.type === 'text') {
      if ((currentQ as TextQuestion).optional) return true;
      return (answers[step] || '').trim().length >= 5;
    }
    if (currentQ.type === 'chips') return (chipSelections[step] || []).length > 0;
    if (currentQ.type === 'images') return imageSelections.length > 0;
    if (currentQ.type === 'slider') return true;
    return false;
  };

  const saveCurrentAnswer = () => {
    if (!currentQ) return;
    if (currentQ.type === 'chips') {
      const selected = chipSelections[step] || [];
      const addendum = answers[`${step}_addendum`] || '';
      const precise = answers[`${step}_precise`] || '';
      setAnswers(prev => ({
        ...prev,
        [step]: selected.join(', ')
       + (precise ? ` → ${precise}` : '')
          + (addendum ? ` | ${addendum}` : '')
      }));
    } else if (currentQ.type === 'images') {
      setAnswers(prev => ({ ...prev, [step]: imageSelections.join(', ') }));
    } else if (currentQ.type === 'slider') {
      const addendum = answers[`${step}_addendum`] || '';
      setAnswers(prev => ({ ...prev, [step]: `${sliderValue}${addendum ? ` | ${addendum}` : ''}` }));
    } else if (currentQ.type === 'text') {
      const secondAnswer = answers[`${step}_b`] || '';
      if (secondAnswer) {
        setAnswers(prev => ({ ...prev, [step]: (prev[step] || '') + (secondAnswer ? ` | perché: ${secondAnswer}` : '') }));
      }
    }
  };

  const startAnalyzing = (formOverride?: typeof formData) => {
    // quiz_completed — chokepoint unico: ci passano sia il flusso form vecchio
    // (handleDiscoverClick) sia la logistica cinematic, sempre prima della generazione.
    track("quiz_completed", { path: selectedPath ?? undefined });
    analyzeTimers.current.forEach(t => clearTimeout(t));
    analyzeTimers.current = [];
    setVisibleTraits([]);
    setShowAnalyzing(true);

    submitMutation.reset();
    doFinalSubmit(formOverride);

    analyzeTraits.forEach((trait, i) => {
      const timer = setTimeout(() => {
        setVisibleTraits(prev => [...prev, trait]);
      }, 120 + i * 180);
      analyzeTimers.current.push(timer);
    });
  };

  const handleNext = () => {
    if (transitionBusy.current) return;
    transitionBusy.current = true;
    saveCurrentAnswer();
    setReaction(microReactions[step % microReactions.length]);
    setTimeout(() => {
      setReaction(null);
      if (step >= questions.length - 1) {
        setFormStep(1);
        setShowForm(true);
      } else {
        setStep(prev => prev + 1);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
      transitionBusy.current = false;
    }, 1100);
  };

  const goToStep = (target: number) => {
    // Path B: i primi 4 step (0..3) sono gestiti dal cinematic.
    // Dot 0→Q2 region · dot 1→Q3 trip type · dot 2/3→Q4 defining moment.
    if (selectedPath === 'b' && target < 4) {
      saveCurrentAnswer();
      const cinStep: 1 | 2 | 3 | 4 | 5 | 6 | 7 = target === 0 ? 2 : target === 1 ? 3 : 4;
      setCinematicStep(cinStep);
      setCinematicMode(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (target <= step) {
      saveCurrentAnswer();
      setStep(target);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goBack = () => {
    if (showForm) {
      if (formStep === 2) {
        setFormStep(1);
      } else {
        setShowForm(false);
        setFormStep(1);
        if (selectedPath === 'b') {
          // Path B: il cinematic copre Q1-Q7, torna a Q7 (avoid).
          setCinematicStep(7);
          setCinematicMode(true);
        } else {
          setStep(questions.length - 1);
        }
      }
    } else if (step > 0) {
      saveCurrentAnswer();
      setStep(step - 1);
    } else {
      // Inizio di Path A → torna alla domanda iniziale (cinematic Q1, scelta path).
      setSelectedPath('b');
      setStep(0);
      setAnswers({});
      setChipSelections({});
      setImageSelections([]);
      setSliderValue(50);
      setCinematicMode(true);
      setCinematicAnswers({});
      setCinematicStep(1);
    }
  };

  const toggleMonth = (month: string) => {
    setFormData(prev => ({
      ...prev,
      selectedMonths: prev.selectedMonths.includes(month)
        ? prev.selectedMonths.filter(m => m !== month)
        : [...prev.selectedMonths, month]
    }));
  };

  const togglePeriod = (period: string) => {
    setFormData(prev => ({
      ...prev,
      selectedPeriods: prev.selectedPeriods.includes(period)
        ? prev.selectedPeriods.filter(p => p !== period)
        : [...prev.selectedPeriods, period]
    }));
  };

  const toggleDietary = (diet: string) => {
    setFormData(prev => ({
      ...prev,
      dietary: prev.dietary.includes(diet)
        ? prev.dietary.filter(d => d !== diet)
        : [...prev.dietary, diet]
    }));
  };

  const getDateString = (formOverride?: typeof formData) => {
    const fd = formOverride ?? formData;
    if (fd.dateMode === "exact") return `${fd.dateFrom} - ${fd.dateTo}`;
    if (fd.dateMode === "flexible-month") return fd.selectedMonths.join(", ");
    return fd.selectedPeriods.join(", ");
  };

  // QuizLogistics (Chapter II+III, Path B) → vecchio shape formData, così
  // doFinalSubmit/buildStructuredProfileForPathB restano invariati e il
  // matching engine continua a ricevere gli stessi valori storici.
  const logisticsToFormData = (l: LogisticsAnswers): typeof formData => {
    const budgetMap: Record<string, string> = { shoestring: 'low', mid: 'medium', upper: 'high', open: 'unlimited' };
    const durMap: Record<string, string>    = { weekend: 'weekend', week: 'week', twoweek: '10-14', long: 'long' };
    const compMap: Record<string, string>   = { solo: 'solo', partner: 'couple', friends: 'friends', family: 'family' };
    const moveMap: Record<string, string>   = { base: 'fixed', twostops: 'two', discovery: 'discover' };
    // sleep tier id === vecchio accommodation id (hostel/budget/mid/boutique/luxury/mix)
    const foodMap: Record<string, string>   = { street: 'street', local: 'budget', good: 'mid', foodie: 'foodie', mix: 'mix' };
    const dietMap: Record<string, string>   = { none: 'none', veg: 'vegetarian', vegan: 'vegan', gf: 'gluten', lactose: 'lactose', halal: 'halal', kosher: 'kosher', allergy: 'allergies' };
    const effortToOld = (e = 2) => (e <= 1 ? 'low' : e === 2 ? 'normal' : e <= 4 ? 'high' : 'extreme');
    const groupStr = (() => {
      if (l.who !== 'friends' && l.who !== 'family') return '';
      const a = l.adults ?? 0;
      const k = l.kids ?? 0;
      if (!a && !k) return '';
      const parts = [`${a} adult${a === 1 ? '' : 's'}`];
      if (k) {
        const ages = (l.kidsAges ?? []).filter((x) => x != null);
        parts.push(`${k} child${k === 1 ? '' : 'ren'}${ages.length ? ` (ages ${ages.join(', ')})` : ''}`);
      }
      return `group: ${parts.join(', ')}`;
    })();
    const constraints = [
      l.notes?.trim(),
      l.openWallet ? 'budget: surprise me — hide the numbers' : '',
      groupStr,
    ].filter(Boolean).join(' | ');

    const whenModeMap = { dates: 'exact', month: 'flexible-month', period: 'flexible-period' } as const;
    return {
      ...formData,
      budget: l.budget ? budgetMap[l.budget] : '',
      // when: una delle tre modalità → getDateString legge il campo giusto via dateMode
      dateMode: whenModeMap[l.whenMode ?? 'month'],
      dateFrom: l.dateFrom ?? '',
      dateTo: l.dateTo ?? '',
      selectedMonths: l.months ?? [],
      selectedPeriods: l.periods ?? [],
      duration: l.duration ? durMap[l.duration] : '',
      departure: l.city ?? '',
      companions: l.who ? compMap[l.who] : '',
      travelStyle: l.move ? moveMap[l.move] : '',
      accommodation: l.sleep ?? '',
      food: l.food ? (foodMap[l.food] ?? l.food) : '',
      effort: effortToOld(l.effort),
      dietary: (l.diet ?? []).map(d => dietMap[d] ?? d),
      constraints,
    };
  };

  const isDateValid = () => {
    if (formData.dateMode === "exact") return formData.dateFrom && formData.dateTo;
    if (formData.dateMode === "flexible-month") return formData.selectedMonths.length > 0;
    return formData.selectedPeriods.length > 0;
  };

  const buildStructuredProfileForPathB = () => {
    if (selectedPath !== 'b') return null;

    // Q1 – regione + luogo preciso
    const regionAnswer = answers[0] || '';
    const precisePlace = answers[`0_precise`] || '';
    const regionLabel = regionAnswer.toLowerCase();
    let region: string | null = null;
    if (regionLabel.includes("asia")) region = "asia";
    else if (regionLabel.includes("europa") || regionLabel.includes("europe")) region = "europe";
    else if (regionLabel.includes("america")) region = "americas";
    else if (regionLabel.includes("africa") || regionLabel.includes("medio") || regionLabel.includes("middle east")) region = "africa_middle_east";
    else if (regionLabel.includes("oceania")) region = "oceania";
    else if (regionLabel.includes("vicino") || regionLabel.includes("near") || regionLabel.includes("home")) region = "near_home";

    // Q2 – tipo di viaggio
    const typeChips = chipSelections[1] || [];
    const normalizeType = (label: string) => {
      const l = label.toLowerCase();
      if (l.includes("food") || l.includes("cibo") || l.includes("gastronom")) return "food";
      if (l.includes("natura") || l.includes("nature") || l.includes("paesagg")) return "nature";
      if (l.includes("cultur") || l.includes("storia") || l.includes("heritage")) return "culture";
      if (l.includes("mare") || l.includes("spiaggia") || l.includes("relax") || l.includes("beach")) return "sea_relax";
      if (l.includes("avventura") || l.includes("adventure")) return "adventure";
      if (l.includes("insolit") || l.includes("unusual") || l.includes("offgrid")) return "unusual";
      if (l.includes("city") || l.includes("città")) return "city";
      return l.replace(/\s+/g, "_");
    };
    const normalizedTypes = typeChips.map(normalizeType);
    const travel_type_primary = normalizedTypes[0] || null;
    const travel_type_secondary = normalizedTypes.slice(1);

    // Q3 – must-see / momento (chips, multi-select)
    const mustSeeChips = chipSelections[2] || [];

    // Atmosfera (Q4 immagini)
    const atmosValue = imageSelections[0];
    let atmosphere: string | null = null;
    if (atmosValue === "market") atmosphere = "vibrant_market";
    else if (atmosValue === "trail") atmosphere = "mountain_trail";
    else if (atmosValue === "cafe") atmosphere = "european_cafe";
    else if (atmosValue === "seaside") atmosphere = "seaside_sunset";

    // Ritmo (Q5 slider)
    let pace: string = "balanced";
    if (sliderValue <= 25) pace = "structured";
    else if (sliderValue >= 75) pace = "spontaneous";

    // Obiettivi emotivi (Q6 – chips, multi-select)
    const emotionalGoalChips = chipSelections[5] || [];

    // Cose da evitare (Q7 chips)
    const avoidChips = chipSelections[6] || [];
    const normalizeAvoid = (label: string) => {
      const l = label.toLowerCase();
      if (l.includes("affollat") || l.includes("crowd")) return "crowded_places";
      if (l.includes("guidate") || l.includes("tour")) return "guided_tours";
      if (l.includes("musei")) return "museums_for_hours";
      if (l.includes("resort")) return "tourist_resorts";
      if (l.includes("vita notturna") || l.includes("night") || l.includes("club")) return "nightlife";
      if (l.includes("ristoranti turistici") || l.includes("turistici")) return "tourist_restaurants";
      if (l.includes("trasferimenti") || l.includes("transfer") || l.includes("lunghi")) return "long_transfers";
      if (l.includes("sveglie") || l.includes("presto") || l.includes("early")) return "early_mornings";
      if (l.includes("programmi") || l.includes("rigidi") || l.includes("schedule")) return "rigid_schedules";
      return l.replace(/\s+/g, "_");
    };
    const avoid = avoidChips.map(normalizeAvoid);

    const experience_priority = (answers[`1_addendum`] || mustSeeChips[0] || "");

    return {
      region,
      specific_place: precisePlace || undefined,
      travel_type_primary,
      travel_type_secondary: travel_type_secondary.length ? travel_type_secondary : undefined,
      experience_priority: experience_priority || undefined,
      must_see: mustSeeChips.length ? mustSeeChips : undefined,
      atmosphere: atmosphere || undefined,
      pace,
      emotional_goals: emotionalGoalChips.length ? emotionalGoalChips : undefined,
      avoid: avoid.length ? avoid : undefined,
    };
  };

  // Blocco logistica strutturato: le stesse voci mostrate nei pannelli a schermo
  // (TripCard + RecipeCard), con etichette allineate alle regole del prompt del
  // motore di matching (STEP 1). Diventa il sotto-oggetto `logistics` del profilo
  // strutturato → unica fonte di verità letta dall'AI in entrambe le fasi.
  const buildLogisticsBlock = (l: LogisticsAnswers) => {
    const budgetTierMap: Record<string, string>  = { shoestring: 'low', mid: 'medium', upper: 'high', open: 'unlimited' };
    const budgetLabelMap: Record<string, string> = { shoestring: 'Under €500 pp', mid: '€500–€1,500 pp', upper: '€1,500–€3,000 pp', open: 'Money is not the limit' };
    const durationLabelMap: Record<string, string> = { weekend: 'Long weekend (3–4 days)', week: 'One week (5–7 days)', twoweek: '10–14 days' };
    const durationDaysMap: Record<string, number>  = { weekend: 4, week: 7, twoweek: 12 };
    const moveLabelMap: Record<string, string>   = { base: 'base fissa', twostops: 'due tappe', discovery: 'scoperta' };
    const sleepLabelMap: Record<string, string>  = { hostel: 'Ostello / Capsule', budget: 'Economico ma carino', mid: 'Comfort medio', boutique: 'Boutique / Design', luxury: 'Lusso', mix: 'Mix' };
    const foodLabelMap: Record<string, string>   = { street: 'Street food e mercati', local: 'Mix locale economico', good: 'Qualche buon ristorante', foodie: 'Foodie', mix: 'Mix — street food quotidiano + cena speciale' };
    const dietLabelMap: Record<string, string>   = { none: 'Nessuna restrizione', veg: 'Vegetariano', vegan: 'Vegano', gf: 'Senza glutine', lactose: 'Senza lattosio', halal: 'Halal', kosher: 'Kosher', allergy: 'Allergie specifiche' };
    const effortLabel = (e = 2) => (e <= 1 ? 'Basso' : e === 2 ? 'Normale' : e <= 4 ? 'Alto' : 'Estremo');

    const when =
      l.whenMode === 'dates'  ? { mode: 'exact_dates', from: l.dateFrom, to: l.dateTo }
      : l.whenMode === 'period' ? { mode: 'flexible_period', periods: l.periods ?? [] }
      : { mode: 'flexible_month', months: l.months ?? [] };

    const companions: Record<string, unknown> = { type: l.who ?? 'solo' };
    if (l.who === 'friends' || l.who === 'family') {
      companions.adults = l.adults ?? 2;
      companions.children = l.kids ?? 0;
      if ((l.kids ?? 0) > 0) companions.children_ages = (l.kidsAges ?? []).filter((a) => a != null);
    }

    return {
      budget_tier: l.budget ? budgetTierMap[l.budget] : undefined,
      budget_label: l.budget ? budgetLabelMap[l.budget] : undefined,
      when,
      duration: l.duration ? durationLabelMap[l.duration] : undefined,
      days: l.duration ? durationDaysMap[l.duration] : undefined,
      companions,
      departure: l.city || undefined,
      movement: l.move ? moveLabelMap[l.move] : undefined,
      accommodation: l.sleep ? sleepLabelMap[l.sleep] : undefined,
      food: l.food ? foodLabelMap[l.food] : undefined,
      physical_effort: effortLabel(l.effort),
      diet: (l.diet ?? []).map((d) => dietLabelMap[d] ?? d),
      notes: l.notes?.trim() || undefined,
    };
  };

  const doFinalSubmit = (formOverride?: typeof formData) => {
    const fd = formOverride ?? formData;
    const baseAnswers = questions.map((_, i) => answers[i] || "");
    const structured = buildStructuredProfileForPathB() as Record<string, unknown> | null;
    const l = logisticsRef.current;
    // Aggancio la logistica completa al profilo strutturato → un solo schema, lo
    // stesso che l'utente vede aggiornarsi, è quello che legge l'AI.
    if (structured && l) structured.logistics = buildLogisticsBlock(l);
    const quizAnswersArray = [`path_${selectedPath}`, ...baseAnswers];
    if (structured) {
      try {
        quizAnswersArray.push(JSON.stringify(structured));
      } catch {
        // ignore JSON issues, fallback to flat answers only
      }
    }
    const durationMap: Record<string, number> = { "weekend": 4, "week": 7, "10-14": 12, "long": 15 };

    // Quando la logistica è già nel profilo strutturato, NON duplicarla nella
    // stringa constraints: lì restano solo note libere + flag "hide numbers".
    const enrichedConstraints = (structured && l)
      ? [l.notes?.trim(), l.openWallet ? 'budget: surprise me — hide the numbers' : ''].filter(Boolean).join(' | ')
      : [
          fd.constraints,
          fd.accommodation ? `accommodation: ${fd.accommodation}` : '',
          fd.food ? `food: ${fd.food}` : '',
          fd.effort ? `effort: ${fd.effort}` : '',
          fd.dietary.length > 0 ? `dietary: ${fd.dietary.join(', ')}` : '',
        ].filter(Boolean).join(' | ');

 const currentLang = localStorage.getItem("mindroute-lang") || "en";

const profilingPayload = {
      answers: quizAnswersArray,
      budget: fd.budget,
      departure: fd.departure,
      days: durationMap[fd.duration] || 7,
      leaveDate: getDateString(fd),
      companions: fd.companions,
      travelStyle: fd.travelStyle,
      constraints: enrichedConstraints,
      lang: currentLang,
    };

    setFlow("mind_profiling_input", JSON.stringify(profilingPayload));
    submitMutation.mutate(profilingPayload);
  };

  const canProceedFormStep1 = () => {
    return !!(formData.budget && isDateValid() && formData.duration && formData.departure && formData.companions);
  };

  const handleDiscoverClick = () => {
    if (!canProceedFormStep1()) {
      toast({ title: t('form.fillAll') || "Please fill in all mandatory fields", variant: "destructive" });
      return;
    }
    startAnalyzing();
  };

  const toggleChip = (chip: string) => {
    const q = currentQ as ChipsQuestion;
    setChipSelections(prev => {
      const current = prev[step] || [];
      if (q.multi) {
        if (current.includes(chip)) return { ...prev, [step]: current.filter(c => c !== chip) };
        if (q.max && current.length >= q.max) return { ...prev, [step]: [...current.slice(1), chip] };
        return { ...prev, [step]: [...current, chip] };
      } else {
        return { ...prev, [step]: current.includes(chip) ? [] : [chip] };
      }
    });
  };

  const selectImage = (value: string) => {
    setImageSelections(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value);
      if (prev.length >= 2) return [...prev.slice(1), value];
      return [...prev, value];
    });
  };

  // Barra del quiz = stessa barra di flusso di /destinations (FlowNav), così le
  // due schermate immersive restano identiche e non divergono.
  const Nav = () => <FlowNav />;

  const TopProgressBar = () => {
    const total = questions.length || 7;
    const progress = (step / (total - 1)) * 100;
    return (
      <div className="fixed top-[52px] md:top-[60px] left-0 right-0 z-[99] pt-4 md:pt-8 pb-3 px-4 md:px-10"
        style={{ background: 'linear-gradient(to bottom, rgba(7,9,15,0.92) 0%, rgba(7,9,15,0.0) 100%)', backdropFilter: 'blur(0px)' }}>
        <div className="relative flex items-center gap-4 max-w-[780px] mx-auto">

          {/* Label sezione – sinistra */}
          <span className="hidden sm:block text-[10px] font-bold tracking-[2.5px] uppercase text-[#E94560] shrink-0 w-[110px]" data-testid="text-section-label">
            {currentQ?.section}
          </span>

          {/* Rotta aerea */}
          <div className="flex-1 relative h-[28px] flex items-center">
            {/* Linea base tratteggiata */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px"
              style={{ background: 'repeating-linear-gradient(to right, rgba(233,69,96,0.22) 0px, rgba(233,69,96,0.22) 6px, transparent 6px, transparent 14px)' }} />
            {/* Linea completata */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-[#E94560] transition-all duration-700 ease-out"
              style={{ width: `${progress}%`, boxShadow: '0 0 6px rgba(233,69,96,0.5)' }} />
            {/* Punti step */}
            {Array.from({ length: total }).map((_, i) => {
              const pct = (i / (total - 1)) * 100;
              const isDone = i < step;
              const isCurrent = i === step;
              return (
                <button
                  key={i}
                  onClick={() => isDone && goToStep(i)}
                  data-testid={`progress-step-${i + 1}`}
                  title={questions[i]?.section}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-500 border-none bg-transparent p-0"
                  style={{ left: `${pct}%`, cursor: isDone ? 'pointer' : 'default' }}
                >
                  {isCurrent ? (
                    /* Dot attivo – pulse ring come i pin della WorldMap */
                    <span className="relative flex items-center justify-center w-[18px] h-[18px]">
                      <span className="absolute inset-0 rounded-full border border-[#E94560] opacity-40"
                        style={{ animation: 'dotPulse 2s ease-in-out infinite' }} />
                      <span className="w-[10px] h-[10px] rounded-full bg-[#E94560]"
                        style={{ boxShadow: '0 0 10px rgba(233,69,96,0.65)' }} />
                    </span>
                  ) : isDone ? (
                    <span className="w-[8px] h-[8px] rounded-full block bg-[#E94560] opacity-60 hover:opacity-100 transition-opacity" />
                  ) : (
                    <span className="w-[6px] h-[6px] rounded-full block bg-white opacity-15" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Contatore – destra */}
          <span className="text-[13px] text-white/50 font-semibold tabular-nums shrink-0 w-[36px] text-right" data-testid="text-step-counter">
            <span className="text-white/80">{step + 1}</span>
            <span className="text-white/30">/{total}</span>
          </span>
        </div>
      </div>
    );
  };

  if (recognition.canShow && showRecognition && !showAnalyzing) {
    return (
      <div
        className="fixed inset-0 z-[300] flex flex-col"
        style={{ background: splitSceneBackground }}
        data-testid="recognition-overlay"
      >
        <Nav />
        <div className="flex-1 flex items-center justify-center">
          <RecognitionBanner
            recognition={recognition}
            variant="full"
            onUseProfile={() => setFromProfileOpen(true)}
            onChangeProfile={() => setShowRecognition(false)}
          />
        </div>
        <FromProfileModal
          open={fromProfileOpen}
          onClose={() => setFromProfileOpen(false)}
          snapshotCount={recognition.snapshotCount}
        />
      </div>
    );
  }

  if (showSplit) {
    return (
      <div
        className={`fixed inset-0 z-[300] flex flex-col transition-all duration-600 ${splitExiting ? 'opacity-0' : 'opacity-100'}`}
        style={{ background: splitSceneBackground }}
        data-testid="split-overlay"
      >
        <Nav />

        <style>{`
          @keyframes introDrift { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          @keyframes introBreath { 0%,100% { opacity: 0.08; } 50% { opacity: 0.16; } }
          @keyframes introFloat1 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(12px,-18px) rotate(8deg); } }
          @keyframes introFloat2 { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(-15px,14px) rotate(-6deg); } }
          @keyframes splitPulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 1; } }
          @keyframes splitShimmer { 0% { transform: translateX(-120%); opacity: 0; } 18% { opacity: 0.55; } 100% { transform: translateX(220%); opacity: 0; } }
        `}</style>

        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 120 C 200 60, 450 220, 720 140 S 1050 30, 1300 160 S 1420 250, 1460 120" fill="none" stroke={splitStroke} strokeWidth="2" opacity="0.8" style={{ animation: 'introDrift 8s ease-in-out infinite' }} />
          <path d="M-20 780 C 250 720, 480 840, 700 760 S 980 680, 1200 800 S 1380 860, 1460 780" fill="none" stroke={splitStroke} strokeWidth="2" opacity="0.7" style={{ animation: 'introDrift 10s ease-in-out infinite 1s' }} />
          <circle cx="720" cy="140" r="6" fill="#E94560" style={{ animation: 'introBreath 4s ease-in-out infinite' }} />
          <circle cx="700" cy="760" r="6" fill="#E94560" style={{ animation: 'introBreath 5.5s ease-in-out infinite 0.5s' }} />
        </svg>

        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg viewBox="0 0 120 120" fill="none" className={`w-[280px] h-[280px] md:w-[500px] md:h-[500px] ${theme === "dark" ? "opacity-[0.09]" :"opacity-[0.10]" }`}>
            <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="#E94560" />
            <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="#E94560" />
            <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="#E94560" />
            <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="#E94560" />
            <ellipse cx="60" cy="60" rx="5" ry="6" fill="#E94560" />
            <path d="M58 66L60 108L62 66" fill="#E94560" />
            <circle cx="60" cy="48" r="3.5" fill="#E94560" />
          </svg>
        </div>

        <svg className="hidden md:block absolute top-[8%] left-[6%] pointer-events-none opacity-[0.18]" width="110" height="110" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.2" strokeLinecap="round" style={{ animation: 'introFloat1 7s ease-in-out infinite' }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>

        <svg className="hidden md:block absolute bottom-[10%] right-[7%] pointer-events-none opacity-[0.16]" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.3" strokeLinecap="round" style={{ animation: 'introFloat2 9s ease-in-out infinite 0.5s' }}>
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>

        <div className="absolute inset-x-0 top-[88px] z-0 flex justify-center pointer-events-none">
          <div className="h-[320px] w-[320px] rounded-full blur-3xl opacity-80" style={{ background: theme === "dark" ? "radial-gradient(circle, rgba(233,69,96,0.28), transparent 70%)" : "radial-gradient(circle, rgba(233,69,96,0.32), transparent 70%)", animation: "splitPulse 7s ease-in-out infinite" }} />
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-8 pt-[72px] md:pt-[88px] pb-10 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center w-full max-w-[1080px]"
          >
        <span className="inline-flex items-center gap-1.5 px-3.5 py-[6px] bg-[rgba(233,69,96,0.15)] rounded-full text-[11px] font-semibold text-white uppercase tracking-[2.5px] mb-4 border border-[rgba(233,69,96,0.4)] shadow-[0_0_12px_rgba(233,69,96,0.2)]">
                    <Info className="w-3 h-3" />
                    {t('q.label')} {String(step + 1).padStart(2, '0')}
                  </span>

            <h1 className="font-serif text-[clamp(34px,5vw,62px)] leading-[1.06] tracking-tight mb-4 text-[var(--text-primary)] max-w-[820px] mx-auto">
              <span dangerouslySetInnerHTML={{ __html: t('split.title').replace(/<em>/g, '<em class="italic text-[#E94560]" style="font-style:italic">') }} />
            </h1>

            <p className="text-[15px] md:text-[18px] text-[var(--text-secondary)] font-light italic leading-[1.7] mb-5 max-w-[660px] mx-auto">
              {t('split.hint')}
            </p>

            <p className="text-[12px] md:text-[13px] text-[var(--text-muted)] uppercase tracking-[0.28em] font-medium mb-10">
              {t('split.micro')}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-7 max-w-[980px] mx-auto text-left items-start">
              <button
                onClick={() => choosePath('a')}
                data-testid="button-path-a"
                className="relative overflow-hidden bg-[var(--surface-card)] border border-[var(--border-input)] rounded-[22px] md:rounded-[28px] p-5 sm:p-7 md:p-9 xl:p-10 text-left cursor-pointer transition-all duration-500 hover:border-[#E94560] hover:-translate-y-2 hover:scale-[1.01] group isolate h-auto min-h-[44px]"
                style={{ boxShadow: splitCardGlow }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: theme === "dark" ? "linear-gradient(135deg, rgba(233,69,96,0.16), transparent 45%)" : "linear-gradient(135deg, rgba(233,69,96,0.10), transparent 45%)" }} />
                <div className="absolute -left-1/3 top-0 h-full w-1/3 rotate-[16deg] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100" style={{ animation: "splitShimmer 1.3s ease forwards" }} />
                <div className="relative z-10 flex items-start justify-between gap-4 mb-7">
                  <div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E94560] border border-[rgba(233,69,96,0.16)]" style={{ background: splitBadgeBg }}>
                      {t('split.a.kicker')}
                    </span>
                  </div>
                  <div className="w-[60px] h-[60px] rounded-full bg-[rgba(233,69,96,0.08)] flex items-center justify-center shrink-0 border border-[rgba(233,69,96,0.14)] group-hover:scale-110 transition-transform duration-500">
                    <QuestionIcon className="w-7 h-7 text-[#E94560]" />
                  </div>
                </div>
                <h3 className="relative z-10 font-serif text-[28px] md:text-[32px] leading-[1.08] mb-3 text-[var(--text-primary)]">{t('split.a.title')}</h3>
                <p className="relative z-10 text-[15px] text-[var(--text-secondary)] font-light leading-[1.75] mb-5 max-w-[42ch]">{t('split.a.desc')}</p>
                <p className="relative z-10 text-[13px] text-[var(--text-muted)] leading-[1.7] mb-8 max-w-[42ch]">{t('split.a.detail')}</p>
                <div className="relative z-10 flex flex-wrap gap-2.5 mb-8">
                  {[t('split.a.chip1'), t('split.a.chip2'), t('split.a.chip3')].map((chip, i) => (
                    <span key={i} className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)] border border-[var(--border-input)] bg-[rgba(255,255,255,0.02)]">
                      {chip}
                    </span>
                  ))}
                </div>
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">{t('split.a.cta')}</span>
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[rgba(233,69,96,0.18)] text-[#E94560] group-hover:translate-x-1 transition-transform duration-400">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>

              <button
                onClick={() => choosePath('b')}
                data-testid="button-path-b"
                className="relative overflow-hidden bg-[var(--surface-card)] border border-[var(--border-input)] rounded-[22px] md:rounded-[28px] p-5 sm:p-7 md:p-9 xl:p-10 text-left cursor-pointer transition-all duration-500 hover:border-[#E94560] hover:-translate-y-2 hover:scale-[1.01] group isolate h-auto min-h-[44px]"
                style={{ boxShadow: splitCardGlow }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: theme === "dark" ? "linear-gradient(135deg, rgba(255,255,255,0.08), transparent 46%)" : "linear-gradient(135deg, rgba(233,69,96,0.08), transparent 46%)" }} />
                <div className="absolute -left-1/3 top-0 h-full w-1/3 rotate-[16deg] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100" style={{ animation: "splitShimmer 1.3s ease forwards" }} />
                <div className="relative z-10 flex items-start justify-between gap-4 mb-7">
                  <div>
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.24em] text-[#E94560] border border-[rgba(233,69,96,0.16)]" style={{ background: splitBadgeBg }}>
                      {t('split.b.kicker')}
                    </span>
                  </div>
                  <div className="w-[60px] h-[60px] rounded-full bg-[rgba(233,69,96,0.08)] flex items-center justify-center shrink-0 border border-[rgba(233,69,96,0.14)] group-hover:scale-110 transition-transform duration-500">
                    <MapPin className="w-7 h-7 text-[#E94560]" />
                  </div>
                </div>
                <h3 className="relative z-10 font-serif text-[28px] md:text-[32px] leading-[1.08] mb-3 text-[var(--text-primary)]">{t('split.b.title')}</h3>
                <p className="relative z-10 text-[15px] text-[var(--text-secondary)] font-light leading-[1.75] mb-5 max-w-[42ch]">{t('split.b.desc')}</p>
                <p className="relative z-10 text-[13px] text-[var(--text-muted)] leading-[1.7] mb-8 max-w-[42ch]">{t('split.b.detail')}</p>
                <div className="relative z-10 flex flex-wrap gap-2.5 mb-8">
                  {[t('split.b.chip1'), t('split.b.chip2'), t('split.b.chip3')].map((chip, i) => (
                    <span key={i} className="rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)] border border-[var(--border-input)] bg-[rgba(255,255,255,0.02)]">
                      {chip}
                    </span>
                  ))}
                </div>
                <div className="relative z-10 flex items-center justify-between gap-4">
                  <span className="text-[13px] font-medium text-[var(--text-primary)]">{t('split.b.cta')}</span>
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-[rgba(233,69,96,0.18)] text-[#E94560] group-hover:translate-x-1 transition-transform duration-400">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 md:gap-4 mt-8 md:mt-9 flex-wrap">
              {[t('intro.questions'), t('intro.time'), t('intro.private')].map((chip, i) => (
                <span key={i} className="text-[11px] md:text-[12px] text-[var(--text-secondary)] font-medium tracking-[0.2em] uppercase rounded-full px-4 py-2 border border-[var(--border-input)]" style={{ background: splitTrustBg }}>
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <footer className="relative z-10 px-4 md:px-8 pb-6 md:pb-8 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[11px] md:text-[13px] text-[var(--text-muted)] font-light italic max-w-[840px] rounded-[16px] md:rounded-full px-3.5 py-2.5 md:px-4 md:py-3 border border-[var(--border-input)] leading-snug" style={{ background: splitQuoteBg }}>
            "{t('intro.quote')}"
          </span>
          <div className="hidden sm:flex items-center gap-4 text-[12px] text-[var(--text-muted)]">
            <span>{t('nav.privacy')}</span>
          </div>
        </footer>
      </div>
    );
  }

  if (showAnalyzing) {
    return <AnalyzingScreen titleHtml={t('analyze.title')} visibleTraits={visibleTraits} />;
  }

  // ─── Path B · Q1→Q4 cinematic ──────────────────────────────────────────
  if (selectedPath === 'b' && cinematicMode && !showForm) {
    // Mappa cinematic name → label i18n del vecchio quiz, così
    // buildStructuredProfileForPathB normalizza correttamente e la
    // sidebar profile mostra i label tradotti.
    const cinematicRegionToOld: Record<string, string> = {
      "Close to home":         t("b.q1.chips.close"),
      "Europe":                t("b.q1.chips.europe"),
      "Asia":                  t("b.q1.chips.asia"),
      "Americas":              t("b.q1.chips.americas"),
      "Africa & Middle East":  t("b.q1.chips.africa"),
      "Oceania":               t("b.q1.chips.oceania"),
    };
    const cinematicTypeToOld: Record<string, string> = {
      "Culture & history":      t("b.q2.chips.culture"),
      "Nature & adventure":     t("b.q2.chips.nature"),
      "Food & wine":            t("b.q2.chips.food"),
      "Beach & relax":          t("b.q2.chips.beach"),
      "City & nightlife":       t("b.q2.chips.city"),
      "Off the grid":           t("b.q2.chips.offgrid"),
      "Road trip":              t("b.q2.chips.roadtrip"),
      "Trekking & sports":      t("b.q2.chips.trekking"),
      "Wellness & spa":         t("b.q2.chips.wellness"),
      "Discovery, surprise me": t("b.q2.chips.discovery"),
    };
    const cinematicMomentToOld: Record<string, string> = {
      "Eating at local spots":                  t("b.q3.chip1"),
      "Getting lost in authentic neighborhoods": t("b.q3.chip2"),
      "Seeing iconic landmarks":                t("b.q3.chip3"),
      "Being immersed in nature":               t("b.q3.chip4"),
      "Living something completely new":        t("b.q3.chip5"),
      "Photographing something extraordinary":  t("b.q3.chip6"),
      "Finding a place I didn't know existed":  t("b.q3.chip7"),
    };
    const cinematicEmotionToOld: Record<string, string> = {
      "Disconnect from routine":       t("b.q6.chip1"),
      "Regain energy and lightness":   t("b.q6.chip2"),
      "Feel free and spontaneous":     t("b.q6.chip3"),
      "Be amazed again":               t("b.q6.chip4"),
      "Feel the place deeply":         t("b.q6.chip5"),
      "Step outside my comfort zone":  t("b.q6.chip6"),
    };
    const cinematicAvoidToOld: Record<string, string> = {
      "Crowded places":                  t("chips.crowded"),
      "Touristy restaurants":            t("chips.touristy"),
      "Resort hotels":                   t("chips.resort"),
      "Guided tours":                    t("chips.guided"),
      "Museums for hours":               t("chips.museums"),
      "Nightlife and clubs":             t("chips.nightlife"),
      "Strict schedules":                t("chips.schedules"),
      "Long transits":                   t("chips.transits"),
      "Early mornings":                  t("chips.mornings"),
      "Small talk with strangers":       t("chips.smalltalk"),
      "Too unfamiliar food":             t("chips.unfamiliarfood"),
      "Too much walking":                t("chips.toomuchwalking"),
      "Feeling too isolated":            t("chips.tooisolated"),
      "Spending without clear value":    t("chips.tooexpensive"),
      "Staying too long in one place":   t("chips.toolong"),
    };

    return (
      <>
        <Nav />
        <QuizCinematic
        initialAnswers={cinematicAnswers}
        initialStep={cinematicStep}
        onComplete={(a) => {
          setCinematicAnswers(a);
          const regionLabel    = a.region   ? (cinematicRegionToOld[a.region] ?? a.region) : "";
          const typeLabels     = (a.tripTypes ?? []).map(n => cinematicTypeToOld[n] ?? n);
          const momentLabels   = (a.defining ?? []).map(n => cinematicMomentToOld[n] ?? n);
          const emotionLabels  = (a.emotionalGoals ?? []).map(n => cinematicEmotionToOld[n] ?? n);
          const avoidLabels    = (a.avoid ?? []).map(n => cinematicAvoidToOld[n] ?? n);
          const paceValue      = typeof a.pace === "number" ? a.pace : 50;
          setChipSelections(prev => ({
            ...prev,
            0: regionLabel ? [regionLabel] : [],
            1: typeLabels,
            2: momentLabels,
            5: emotionLabels,
            6: avoidLabels,
          }));
          setSliderValue(paceValue);
          setAnswers(prev => ({
            ...prev,
            0: regionLabel,
            // Luogo preciso → letto da buildStructuredProfileForPathB come specific_place.
            "0_precise": (a.specificPlace ?? "").trim(),
            1: typeLabels.join(", "),
            2: momentLabels.join(", "),
            4: String(paceValue),
            5: emotionLabels.join(", "),
            6: avoidLabels.join(", "),
          }));
          setCinematicMode(false);
          // Cinematic copre Q1–Q7. Va dritto al form logistico.
          setShowForm(true);
          setFormStep(1);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onSelectGuided={() => {
          // L'utente sceglie "guided" nella Q1 cinematic → Path A cinematic (QuizCinematicA).
          setSelectedPath('a');
          setCinematicMode(false);
          setCinematicAnswers({});
          setCinematicStep(1);
          setCinematicAnswersA({});
          setCinematicAStep(1);
          setStep(0);
          setAnswers({});
          setChipSelections({});
          setImageSelections([]);
          setSliderValue(50);
        }}
        />
      </>
    );
  }

  // ─── Path A · Q1→Q7 cinematic (guided discovery) ───────────────────────
  if (selectedPath === 'a' && !showForm && !showAnalyzing) {
    return (
      <>
        <Nav />
        <QuizCinematicA
          initialAnswers={cinematicAnswersA}
          initialStep={cinematicAStep}
          onBackFromQ1={() => {
            // Back dalla Q1 → torna al path picker (cinematic Q1 di Path B).
            setSelectedPath('b');
            setCinematicMode(true);
            setCinematicAnswers({});
            setCinematicStep(1);
          }}
          onComplete={(a) => {
            setCinematicAnswersA(a);
            const vibeLabels   = (a.vibes ?? []).map(vibeLabel);
            const needLabels   = (a.needs ?? []).map(needLabel);
            const drainLabels  = (a.drains ?? []).map(drainLabel);
            const visualLabels = (a.visual ?? []).map(visualLabel);
            const distLbl      = a.distance ? distLabel(a.distance) : '';
            const chaos        = typeof a.chaos === 'number' ? a.chaos : 50;
            const note1 = a.needsNote?.trim() ? ` | ${a.needsNote.trim()}` : '';
            const note2 = a.drainsNote?.trim() ? ` | ${a.drainsNote.trim()}` : '';
            setChipSelections(prev => ({
              ...prev,
              0: vibeLabels, 1: needLabels, 2: drainLabels, 6: distLbl ? [distLbl] : [],
            }));
            setSliderValue(chaos);
            setAnswers(prev => ({
              ...prev,
              0: vibeLabels.join(', '),
              1: needLabels.join(', ') + note1,
              2: drainLabels.join(', ') + note2,
              3: visualLabels.join(', '),
              4: String(chaos),
              5: a.rejection?.trim() ?? '',
              6: distLbl,
            }));
            setCinematicMode(false);
            // Cinematic copre Q1–Q7. Va dritto alla logistica (QuizLogistics).
            setShowForm(true);
            setFormStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </>
    );
  }

  // Path B · logistica = QuizLogistics (Chapter II + III), in continuità col cinematic.
  if (showForm && selectedPath === 'b') {
    const cinPace = typeof cinematicAnswers.pace === 'number' ? cinematicAnswers.pace : 50;
    const rhythmLabel = cinPace <= 33 ? 'Structured' : cinPace >= 67 ? 'Spontaneous' : 'Balanced';
    const logisticsProfile: ProfileSummary = {
      region: cinematicAnswers.region,
      tripTypes: cinematicAnswers.tripTypes,
      defining: cinematicAnswers.defining,
      rhythmLabel,
      feeling: cinematicAnswers.emotionalGoals?.[0],
      avoidCount: cinematicAnswers.avoid?.length,
    };
    return (
      <>
        <Nav />
        <QuizLogistics
          profile={logisticsProfile}
          onBack={() => {
            // Torna al cinematic Q7 (what to avoid).
            setShowForm(false);
            setCinematicStep(7);
            setCinematicMode(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onComplete={(l) => {
            logisticsRef.current = l;
            const mapped = logisticsToFormData(l);
            setFormData(mapped);
            startAnalyzing(mapped);
          }}
        />
      </>
    );
  }

  // Path A · logistica = QuizLogistics (come Path B). Esperienza identica end-to-end.
  if (showForm && selectedPath === 'a') {
    const a = cinematicAnswersA;
    const chaos = typeof a.chaos === 'number' ? a.chaos : 50;
    const rhythmLabel = chaos <= 33 ? 'Structured' : chaos >= 67 ? 'Spontaneous' : 'Balanced';
    const logisticsProfileA: ProfileSummary = {
      tripTypes: (a.vibes ?? []).map(vibeLabel),
      defining: (a.needs ?? []).map(needLabel),
      rhythmLabel,
      feeling: a.needs?.[0] ? needLabel(a.needs[0]) : undefined,
      avoidCount: a.drains?.length,
    };
    return (
      <>
        <Nav />
        <QuizLogistics
          profile={logisticsProfileA}
          onBack={() => {
            // Torna al cinematic Q7 (distance).
            setShowForm(false);
            setCinematicAStep(7);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onComplete={(l) => {
            logisticsRef.current = l;
            const mapped = logisticsToFormData(l);
            setFormData(mapped);
            startAnalyzing(mapped);
          }}
        />
      </>
    );
  }

  if (showForm) {
    const formSidebarContent = () => {
      const configs: Record<string, { title: string; desc: string }> = {
        budget: { title: t('form.sidebarBudgetTitle'), desc: t('form.sidebarBudgetDesc') },
        dates: { title: t('form.sidebarDateTitle'), desc: t('form.sidebarDateDesc') },
        duration: { title: t('form.sidebarDurationTitle'), desc: t('form.sidebarDurationDesc') },
        departure: { title: t('form.sidebarDepartureTitle'), desc: t('form.sidebarDepartureDesc') },
        companions: { title: t('form.sidebarCompanionsTitle'), desc: t('form.sidebarCompanionsDesc') },
        accommodation: { title: t('form.sidebarAccommodationTitle'), desc: t('form.sidebarAccommodationDesc') },
        food: { title: t('form.sidebarFoodTitle'), desc: t('form.sidebarFoodDesc') },
        effort: { title: t('form.sidebarEffortTitle'), desc: t('form.sidebarEffortDesc') },
        travelStyle: { title: t('form.sidebarTravelStyleTitle'), desc: t('form.sidebarTravelStyleDesc') },
        constraints: { title: t('form.sidebarConstraintsTitle'), desc: t('form.sidebarConstraintsDesc') },
      };
      const c = configs[formFocus] || configs.budget;
      return c;
    };

    const sideInfo = formSidebarContent();


   return (
      <div className="relative min-h-screen transition-colors duration-300" style={{ background: 'var(--surface)' }}>
        <Nav />

        <style>{`
          @keyframes profileIn { from { opacity: 0; transform: translateX(10px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes sidebarIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes blobDrift1 { 0%,100% { transform: translate(0,0) scale(1); } 33% { transform: translate(40px,-30px) scale(1.06); } 66% { transform: translate(-20px,20px) scale(0.96); } }
          @keyframes blobDrift2 { 0%,100% { transform: translate(0,0) scale(1); } 40% { transform: translate(-35px,25px) scale(1.08); } 70% { transform: translate(25px,-15px) scale(0.94); } }
          @keyframes blobDrift3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,35px) scale(1.04); } }
        `}</style>

        {/* Atmospheric background blobs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '8%', right: '5%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,30,60,0.38) 0%, rgba(140,20,45,0.18) 40%, transparent 70%)', filter: 'blur(60px)', animation: 'blobDrift1 14s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '15%', right: '12%', width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,0.28) 0%, transparent 70%)', filter: 'blur(24px)', animation: 'blobDrift1 14s ease-in-out infinite 1.5s' }} />
          <div style={{ position: 'absolute', bottom: '20%', left: '3%', width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(160,25,55,0.30) 0%, rgba(100,15,35,0.14) 45%, transparent 70%)', filter: 'blur(55px)', animation: 'blobDrift2 18s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '50%', left: '35%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,0.12) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'blobDrift3 22s ease-in-out infinite' }} />
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] min-h-screen max-w-[1400px] mx-auto pt-[64px] md:pt-[88px]" style={{ zIndex: 1 }}>

          {/* MAIN FORM */}
          <main className="relative py-6 md:py-10 px-4 sm:px-12 xl:px-16 pb-[120px]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>

              {/* Step header */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#E94560] text-white font-bold text-[14px] shrink-0 shadow-[0_6px_20px_rgba(233,69,96,0.25)]">
                  {formStep}
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[2.5px] uppercase text-[#E94560] mb-0.5">
                    {formStep === 1 ? 'Dettagli pratici' : 'Preferenze viaggio'}
                  </p>
                  <h1 className="font-serif text-[clamp(22px,3vw,32px)] leading-[1.2] text-[var(--text-primary)]">
                    {formStep === 1 ? t('form.title') : 'Affina il tuo viaggio'}
                  </h1>
                </div>
                <div className="ml-auto hidden sm:flex items-center gap-1.5 text-[12px] text-[var(--text-muted)]">
                  <div className={`w-7 h-1.5 rounded-full transition-all ${formStep >= 1 ? 'bg-[#E94560]' : 'bg-[var(--border-input)]'}`} />
                  <div className={`w-7 h-1.5 rounded-full transition-all ${formStep >= 2 ? 'bg-[#E94560]' : 'bg-[var(--border-input)]'}`} />
                </div>
              </div>

              <form className="space-y-6 max-w-[680px]">
                {formStep === 1 && (
                  <div className="space-y-6">

                    {/* Budget */}
                    <div
                      className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]"
                      style={{ background: sidePanelBg }}
                      onFocus={() => setFormFocus('budget')}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <PiggyBank className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.budget')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.budgetSub')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {[['low', t('form.budgetLow')], ['medium', t('form.budgetMed')], ['high', t('form.budgetHigh')], ['unlimited', t('form.budgetUnlimited')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.budget === val} onClick={() => setFormData(p => ({ ...p, budget: val }))} testId={`budget-${val}`} />
                        ))}
                      </div>
                    </div>

                    {/* Date + Durata */}
                    <div
                      className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]"
                      style={{ background: sidePanelBg }}
                      onFocus={() => setFormFocus('dates')}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <Plane className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.when')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.whenSub')}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {(['exact', 'flexible-month', 'flexible-period'] as const).map(mode => (
                          <button key={mode} type="button" onClick={() => setFormData(p => ({ ...p, dateMode: mode }))}
                            data-testid={`date-mode-${mode}`}
                            className={`px-4 py-2 rounded-full text-[13px] border transition-all cursor-pointer ${formData.dateMode === mode ? 'border-[#E94560] text-[#E94560] bg-[rgba(233,69,96,0.07)] font-medium' : 'border-[var(--border-input)] text-[var(--text-secondary)] bg-transparent hover:border-[#E94560]'}`}
                          >
                            {mode === 'exact' ? t('form.dateExact') : mode === 'flexible-month' ? t('form.dateFlexMonth') : t('form.dateFlexPeriod')}
                          </button>
                        ))}
                      </div>
                      {formData.dateMode === 'exact' && (
                        <div className="flex gap-3 flex-wrap">
                          <div className="flex-1 min-w-[140px]">
                            <label className="text-[12px] text-[var(--text-muted)] mb-1 block">{t('form.dateFrom')}</label>
                            <input type="date" data-testid="input-date-from" value={formData.dateFrom} onChange={e => setFormData(p => ({ ...p, dateFrom: e.target.value }))}
                              className="w-full px-4 py-3 bg-[var(--surface-card)] border border-[var(--border-input)] rounded-xl text-[14px] text-[var(--text-primary)] outline-none focus:border-[#E94560]" />
                          </div>
                          <div className="flex-1 min-w-[140px]">
                            <label className="text-[12px] text-[var(--text-muted)] mb-1 block">{t('form.dateTo')}</label>
                            <input type="date" data-testid="input-date-to" value={formData.dateTo} onChange={e => setFormData(p => ({ ...p, dateTo: e.target.value }))}
                              className="w-full px-4 py-3 bg-[var(--surface-card)] border border-[var(--border-input)] rounded-xl text-[14px] text-[var(--text-primary)] outline-none focus:border-[#E94560]" />
                          </div>
                        </div>
                      )}
                      {formData.dateMode === 'flexible-month' && (
                        <>
                          <p className="text-[12px] text-[var(--text-muted)] mb-3">{t('form.dateMonthSub')}</p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {months.map((m, i) => (
                              <button key={i} type="button" data-testid={`month-${i}`} onClick={() => toggleMonth(m)}
                                className={`px-3 py-2.5 rounded-xl text-[13px] border transition-all cursor-pointer ${formData.selectedMonths.includes(m) ? 'border-[#E94560] bg-[#E94560] text-white font-medium' : 'border-[var(--border-input)] text-[var(--text-secondary)] bg-[var(--surface-card)] hover:border-[#E94560]'}`}
                              >{m}</button>
                            ))}
                          </div>
                        </>
                      )}
                      {formData.dateMode === 'flexible-period' && (
                        <>
                          <p className="text-[12px] text-[var(--text-muted)] mb-3">{t('form.datePeriodSub')}</p>
                          <div className="flex flex-wrap gap-3">
                            {[['Spring', t('form.periodSpring')], ['Summer', t('form.periodSummer')], ['Autumn', t('form.periodAutumn')], ['Winter', t('form.periodWinter')], ['Anytime', t('form.periodAnytime')]].map(([val, label]) => (
                              <FormChip key={val} label={label} selected={formData.selectedPeriods.includes(val)} onClick={() => togglePeriod(val)} testId={`period-${val.toLowerCase()}`} />
                            ))}
                          </div>
                        </>
                      )}

                      <div className="grid gap-6 md:grid-cols-2 mt-6 pt-5 border-t border-dashed border-[var(--border-input)]">
                        <div onFocus={() => setFormFocus('duration')}>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                              <Timer className="w-3.5 h-3.5 text-[#E94560]" />
                            </div>
                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{t('form.duration')}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {[['weekend', t('form.durationWeekend')], ['week', t('form.durationWeek')], ['10-14', t('form.duration1014')], ['long', t('form.durationLong')]].map(([val, label]) => (
                              <FormChip key={val} label={label} selected={formData.duration === val} onClick={() => setFormData(p => ({ ...p, duration: val }))} testId={`duration-${val}`} />
                            ))}
                          </div>
                        </div>
                        <div onFocus={() => setFormFocus('companions')}>
                          <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                              <Users className="w-3.5 h-3.5 text-[#E94560]" />
                            </div>
                            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{t('form.companions')}</h3>
                          </div>
                          <div className="flex flex-wrap gap-2.5">
                            {[['solo', t('form.solo')], ['couple', t('form.partner')], ['friends', t('form.friends')], ['family', t('form.family')]].map(([val, label]) => (
                              <FormChip key={val} label={label} selected={formData.companions === val} onClick={() => setFormData(p => ({ ...p, companions: val }))} testId={`companions-${val}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Partenza */}
                    <div
                      className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]"
                      style={{ background: sidePanelBg }}
                      onFocus={() => setFormFocus('departure')}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.departure')}</h3>
                      </div>
                      <input type="text" data-testid="input-departure" value={formData.departure} onChange={e => setFormData(p => ({ ...p, departure: e.target.value }))} placeholder={t('form.departurePlaceholder')}
                        className="w-full mt-3 px-5 py-4 bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-2xl text-[15px] text-[var(--text-primary)] outline-none focus:border-[#E94560] focus:shadow-[0_4px_20px_rgba(233,69,96,0.06)] placeholder:text-[var(--text-muted)] placeholder:font-light transition-all" />
                    </div>

                  </div>
                )}

                {formStep === 2 && (
                  <div className="space-y-6">
<div className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('travelStyle')}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <Compass className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.travelStyle')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.travelStyleSub')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {[['fixed', t('form.travelStyleFixed')], ['two', t('form.travelStyleTwo')], ['discover', t('form.travelStyleDiscover')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.travelStyle === val} onClick={() => setFormData(p => ({ ...p, travelStyle: val }))} testId={`travelstyle-${val}`} />
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('accommodation')}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <Home className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.accommodation')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.accommodationSub')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {[['hostel', t('form.accHostel')], ['budget', t('form.accBudget')], ['mid', t('form.accMid')], ['boutique', t('form.accBoutique')], ['luxury', t('form.accLuxury')], ['mix', t('form.accMix')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.accommodation === val} onClick={() => setFormData(p => ({ ...p, accommodation: val }))} testId={`acc-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('food')}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <UtensilsCrossed className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.food')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.foodSub')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {[['street', t('form.foodStreet')], ['budget', t('form.foodBudget')], ['mid', t('form.foodMid')], ['foodie', t('form.foodFoodie')], ['mix', t('form.foodMix')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.food === val} onClick={() => setFormData(p => ({ ...p, food: val }))} testId={`food-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('effort')}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <Mountain className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.effort')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.effortSub')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {[['low', t('form.effortLow')], ['normal', t('form.effortNormal')], ['high', t('form.effortHigh')], ['extreme', t('form.effortExtreme')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.effort === val} onClick={() => setFormData(p => ({ ...p, effort: val }))} testId={`effort-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]" style={{ background: sidePanelBg }}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <Leaf className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.dietary')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.dietarySub')}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {[['none', t('form.dietNone')], ['vegetarian', t('form.dietVegetarian')], ['vegan', t('form.dietVegan')], ['gluten', t('form.dietGluten')], ['lactose', t('form.dietLactose')], ['halal', t('form.dietHalal')], ['kosher', t('form.dietKosher')], ['allergies', t('form.dietAllergies')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.dietary.includes(val)} onClick={() => toggleDietary(val)} testId={`diet-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] md:rounded-[24px] border border-[var(--border-input)] p-4 sm:p-6 transition-all hover:shadow-[0_6px_28px_rgba(233,69,96,0.08)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('constraints')}>
                      <div className="flex items-center gap-3 mb-5">
                        <div className="w-9 h-9 rounded-xl bg-[rgba(233,69,96,0.10)] border border-[rgba(233,69,96,0.15)] flex items-center justify-center shrink-0">
                          <MessageCircle className="w-4 h-4 text-[#E94560]" />
                        </div>
                        <div>
                          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">{t('form.constraints')}</h3>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{t('form.constraintsSub')}</p>
                        </div>
                      </div>
                      <textarea
                        data-testid="input-constraints"
                        value={formData.constraints}
                        onChange={e => setFormData(p => ({ ...p, constraints: e.target.value }))}
                        placeholder={t('form.constraintsPlaceholder')}
                        className="w-full px-5 py-4 bg-[var(--surface)] border-[1.5px] border-[var(--border-input)] rounded-2xl text-[14px] leading-[1.7] text-[var(--text-primary)] outline-none resize-none min-h-[100px] focus:border-[#E94560] focus:shadow-[0_4px_20px_rgba(233,69,96,0.06)] placeholder:text-[var(--text-muted)] placeholder:font-light transition-all"
                      />
                    </div>

                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-4">
                  <button type="button" onClick={goBack} data-testid="button-form-back" aria-label="Indietro"
                    className="inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-3 min-h-[44px] min-w-[44px] text-[var(--text-secondary)] text-[14px] bg-transparent border border-transparent cursor-pointer rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] hover:border-[var(--border-input)] transition-all">
                    <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">{t('q.back')}</span>
                  </button>
                  {formStep === 1 ? (
                    <button type="button" onClick={() => { if (!canProceedFormStep1()) { toast({ title: t('form.fillAll') || "Compila tutti i campi obbligatori", variant: "destructive" }); return; } setFormStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-4 min-h-[52px] bg-[#E94560] text-white rounded-full font-semibold text-[15px] border-none cursor-pointer shadow-[0_8px_26px_rgba(233,69,96,0.22)] hover:bg-[#D13A52] hover:-translate-y-0.5 transition-all group">
                      {t('q.continue')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button type="button" onClick={handleDiscoverClick} data-testid="button-submit"
                      className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 sm:px-8 py-3.5 sm:py-4 min-h-[52px] bg-[#E94560] text-white rounded-full font-semibold text-[15px] border-none cursor-pointer shadow-[0_8px_26px_rgba(233,69,96,0.22)] hover:bg-[#D13A52] hover:-translate-y-0.5 transition-all group">
                      {t('form.discover')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          </main>

          {/* SIDEBAR PROFILO LIVE */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-[88px] h-[calc(100vh-88px)] py-10 pr-8 overflow-y-auto">

            {/* Sezione Quiz */}
            {Object.keys(answers).filter(k => !k.includes('_') && answers[k]).length > 0 && (
              <div className="rounded-[20px] border border-[var(--border-input)] p-5" style={{ background: sidePanelBg, animation: 'sidebarIn 0.4s ease both' }}>
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-[#E94560] mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E94560] inline-block" />
                  Il tuo profilo
                </div>
                <div className="space-y-2">
                  {questions.map((q, i) => {
                    const a = answers[i];
                    if (!a) return null;
                    const short = a.length > 48 ? a.substring(0, 48) + '…' : a;
                    return (
                      <div key={i} className="flex gap-2 items-start" style={{ animation: `profileIn 0.3s ease ${i * 0.04}s both` }}>
                        <span className="shrink-0 w-5 h-5 rounded-full bg-[rgba(233,69,96,0.1)] text-[#E94560] text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.5px] text-[var(--text-muted)] font-medium">{q.section}</p>
                          <p className="text-[12px] text-[var(--text-secondary)] leading-[1.5]">{short}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sezione Logistica */}
            {(formData.budget || formData.selectedMonths.length > 0 || formData.duration || formData.departure || formData.companions || formData.accommodation || formData.food || formData.effort) && (
              <div className="rounded-[20px] border border-[var(--border-input)] p-5" style={{ background: sidePanelBg, animation: 'sidebarIn 0.4s ease 0.1s both' }}>
                <div className="text-[10px] font-bold tracking-[2px] uppercase text-[#E94560] mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E94560] inline-block" />
                  Logistica
                </div>
                <div className="space-y-2">
                  {formData.budget && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease both' }}>
                      <span className="text-[var(--text-muted)]">Budget</span>
                      <span className="text-[var(--text-primary)] font-medium capitalize">{formData.budget}</span>
                    </div>
                  )}
                  {(formData.selectedMonths.length > 0 || formData.dateFrom) && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.05s both' }}>
                      <span className="text-[var(--text-muted)]">Periodo</span>
                      <span className="text-[var(--text-primary)] font-medium">{formData.selectedMonths.length > 0 ? formData.selectedMonths.slice(0, 2).join(', ') + (formData.selectedMonths.length > 2 ? '…' : '') : formData.dateFrom}</span>
                    </div>
                  )}
                  {formData.duration && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.1s both' }}>
                      <span className="text-[var(--text-muted)]">Durata</span>
                      <span className="text-[var(--text-primary)] font-medium">{formData.duration}</span>
                    </div>
                  )}
                  {formData.departure && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.15s both' }}>
                      <span className="text-[var(--text-muted)]">Partenza</span>
                      <span className="text-[var(--text-primary)] font-medium">{formData.departure}</span>
                    </div>
                  )}
                  {formData.companions && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.2s both' }}>
                      <span className="text-[var(--text-muted)]">Con chi</span>
                      <span className="text-[var(--text-primary)] font-medium capitalize">{formData.companions}</span>
                    </div>
                  )}
                  {formData.travelStyle && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.22s both' }}>
                      <span className="text-[var(--text-muted)]">Stile viaggio</span>
                      <span className="text-[var(--text-primary)] font-medium capitalize">{formData.travelStyle}</span>
                    </div>
                  )}
                  {formData.accommodation && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.25s both' }}>
                      <span className="text-[var(--text-muted)]">Alloggio</span>
                      <span className="text-[var(--text-primary)] font-medium capitalize">{formData.accommodation}</span>
                    </div>
                  )}
                  {formData.food && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.3s both' }}>
                      <span className="text-[var(--text-muted)]">Cibo</span>
                      <span className="text-[var(--text-primary)] font-medium capitalize">{formData.food}</span>
                    </div>
                  )}
                  {formData.effort && (
                    <div className="flex justify-between text-[12px]" style={{ animation: 'profileIn 0.3s ease 0.35s both' }}>
                      <span className="text-[var(--text-muted)]">Ritmo fisico</span>
                      <span className="text-[var(--text-primary)] font-medium capitalize">{formData.effort}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Help contestuale */}
            <div className="rounded-[20px] border border-[var(--border-input)] p-5" style={{ background: sidePanelBg, animation: 'sidebarIn 0.4s ease 0.2s both' }}>
              <div className="flex items-center gap-2 mb-2 text-[13px] font-semibold text-[var(--text-primary)]">
                <HelpCircle className="w-4 h-4 text-[#E94560] shrink-0" />
                {sideInfo.title}
              </div>
              <p className="text-[13px] text-[var(--text-secondary)] leading-[1.7] font-light">{sideInfo.desc}</p>
            </div>

            <div className="flex items-start gap-2 p-3.5 rounded-xl text-[11px] text-[var(--text-muted)] leading-[1.5] border border-[var(--border-input)]" style={{ background: subtlePanelBg }}>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {t('sidebar.privacy')}
            </div>

          </aside>
        </div>
      </div>
    );
   }
 const getChipIcon = (opt: string): JSX.Element | null => {
    const o = opt.toLowerCase();
    const icon = (I: React.ComponentType<{className?: string}>) => <I className="w-3.5 h-3.5 shrink-0" />;
    // Path A — stile viaggio
    if (o.includes("selvag") || o.includes("wild")) return icon(Leaf);
    if (o.includes("silenz") || o.includes("quiet")) return icon(Volume2);
    if (o.includes("caotico") || o.includes("chaotic")) return icon(Zap);
    if (o.includes("intimo") || o.includes("intimate")) return icon(Heart);
    if (o.includes("solitario") || o.includes("solitary")) return icon(User);
    if (o.includes("rigenerante") || o.includes("regenerating")) return icon(Sparkles);
    if (o.includes("autentico") || o.includes("authentic")) return icon(Star);
    if (o.includes("lusso") || o.includes("luxury")) return icon(Sparkles);
    if (o.includes("spirituale") || o.includes("spiritual")) return icon(Sunset);
    if (o.includes("festoso") || o.includes("festive")) return icon(Zap);
    if (o.includes("avventuroso") || o.includes("adventure")) return icon(Tent);
    if (o.includes("romantico") || o.includes("romantic")) return icon(Heart);
    if (o.includes("culturale") || o.includes("cultural")) return icon(Landmark);
    if (o.includes("esplorativo") || o.includes("explorative")) return icon(Compass);
    // Path A — distanza
    if (o.includes("vicino a casa") || o.includes("close to home")) return icon(Home);
    if (o.includes("stesso continente") || o.includes("same continent")) return icon(Globe);
    if (o.includes("lontano") || o.includes("far away")) return icon(Plane);
    if (o.includes("ovunque") || o.includes("anywhere")) return icon(Globe);
    // Path B — geo
    if (o.includes("europa") || o.includes("europe")) return icon(Landmark);
    if (o.includes("asia")) return icon(Sunset);
    if (o.includes("americhe") || o.includes("americas")) return icon(Globe);
    if (o.includes("africa") || o.includes("medio") || o.includes("middle")) return icon(Sunset);
    if (o.includes("oceania")) return icon(Waves);
    // Path B — tipo viaggio
    if (o.includes("cultura") || o.includes("storia") || o.includes("history")) return icon(Landmark);
    if (o.includes("natura") || o.includes("nature") || o.includes("avventura")) return icon(Leaf);
    if (o.includes("food") || o.includes("vino") || o.includes("wine")) return icon(UtensilsCrossed);
    if (o.includes("mare") || o.includes("beach") || o.includes("relax")) return icon(Waves);
    if (o.includes("città") || o.includes("city") || o.includes("notturna")) return icon(Building2);
    if (o.includes("fuori dal mondo") || o.includes("off the grid")) return icon(Tent);
    if (o.includes("road trip")) return icon(Car);
    if (o.includes("trekking") || o.includes("sport")) return icon(Mountain);
    if (o.includes("wellness") || o.includes("spa")) return icon(Flower2);
    if (o.includes("scoperta") || o.includes("discovery") || o.includes("sorprendimi") || o.includes("surprise")) return icon(Dice5);
    // Path B — momento speciale
    if (o.includes("mangiare") || o.includes("posti locali")) return icon(UtensilsCrossed);
    if (o.includes("quartieri") || o.includes("autentici")) return icon(Building2);
    if (o.includes("iconici") || o.includes("iconic")) return icon(Camera);
    if (o.includes("immerso")) return icon(Leaf);
    if (o.includes("completamente nuovo") || o.includes("completely new")) return icon(Sparkles);
    if (o.includes("fotografare") || o.includes("photograph")) return icon(Camera);
    if (o.includes("non sapevo esistesse")) return icon(Search);
    // Path B — sensazione
    if (o.includes("staccare") || o.includes("disconnect")) return icon(Battery);
    if (o.includes("energia") || o.includes("leggerezza")) return icon(Zap);
    if (o.includes("libero") || o.includes("spontaneo")) return icon(Bird);
    if (o.includes("meravigliarmi") || o.includes("wonder")) return icon(Eye);
    if (o.includes("profondamente") || o.includes("deeply")) return icon(Heart);
    if (o.includes("zona di comfort") || o.includes("comfort zone")) return icon(Sparkles);
    // Drains
    if (o.includes("visite guidate") || o.includes("guided")) return icon(Bus);
    if (o.includes("affollat") || o.includes("crowded")) return icon(Users);
    if (o.includes("musei") || o.includes("museum")) return icon(Landmark);
    if (o.includes("resort")) return icon(Building2);
    if (o.includes("club")) return icon(Zap);
    if (o.includes("turistici") || o.includes("touristy")) return icon(UtensilsCrossed);
    if (o.includes("trasferimenti") || o.includes("transit")) return icon(Bus);
    if (o.includes("sveglie") || o.includes("mornings")) return icon(Clock);
    if (o.includes("rigidi") || o.includes("schedules")) return icon(Clock);
    if (o.includes("sconosciuti") || o.includes("smalltalk")) return icon(MessageCircle);
    if (o.includes("cibo sconosciuto") || o.includes("unfamiliar food")) return icon(UtensilsCrossed);
    if (o.includes("camminare") || o.includes("walking")) return icon(Footprints);
    if (o.includes("isolato") || o.includes("isolated")) return icon(User);
    if (o.includes("spendere") || o.includes("spending")) return icon(PiggyBank);
    if (o.includes("troppo a lungo") || o.includes("too long")) return icon(Timer);
    return null;
  };
   const renderQuestionInput = () => {
    if (!currentQ) return null;

    // ── TEXT ────────────────────────────────────────────────────────────────
    if (currentQ.type === 'text') {
      return (
        <div>
          <textarea
            ref={textareaRef}
            data-testid="input-answer"
            placeholder={currentQ.placeholder}
            value={answers[step] || ''}
            onChange={(e) => setAnswers(prev => ({ ...prev, [step]: e.target.value }))}
            className="w-full min-h-[150px] p-5 md:p-6 text-[15px] leading-[1.85] text-white bg-white/6 border-[1.5px] border-white/10 rounded-[22px] resize-none outline-none transition-all duration-350 focus:border-[#E94560] focus:bg-white/8 focus:shadow-[0_0_0_3px_rgba(233,69,96,0.12)] placeholder:text-white/25 placeholder:font-light"
          />
          <div className="flex justify-between mt-2 text-[12px] text-white/25">
            <span>{(currentQ as TextQuestion).optional ? t('q.optional') : t('q.writeTrue')}</span>
          </div>
        </div>
      );
    }

    // ── CHIPS ────────────────────────────────────────────────────────────────
    if (currentQ.type === 'chips') {
      const q = currentQ as ChipsQuestion;
      const selected = chipSelections[step] || [];
      const isPathAStyle    = selectedPath === 'a' && step === 0;  // 14 chip stile → card grid
      const isPathANeed     = selectedPath === 'a' && step === 1;  // 8 chip bisogno → lista verticale
      const isPathADrains   = selectedPath === 'a' && step === 2;  // 15 chip drains → raggruppate
      const isPathADistance = selectedPath === 'a' && step === 6;  // 4 chip distanza → card grandi
      const isPathBQ1       = selectedPath === 'b' && step === 0;  // geo → card grandi
      const isPathBType     = selectedPath === 'b' && step === 1;  // tipo → card grid
      const isPathBMoment   = selectedPath === 'b' && step === 2;  // momenti → lista
      const isPathBFeeling  = selectedPath === 'b' && step === 5;  // sensazione → lista
      const isPathBAvoid    = selectedPath === 'b' && step === 6;  // avoid → raggruppate subset

      // ── CARD GRID 2 colonne (Path A Q1 stile, Path B Q2 tipo) ──────────────
      if (isPathAStyle || isPathBType) {
        const drainIcons: Record<string, string> = {
          "selvaggio": "🌿", "wild": "🌿",
          "silenzioso": "🤫", "quiet": "🤫",
          "caotico": "⚡", "chaotic": "⚡",
          "intimo": "🕯", "intimate": "🕯",
          "solitario": "🧘", "solitary": "🧘",
          "rigenerante": "🌱", "regenerating": "🌱",
          "autentico": "🏺", "authentic": "🏺",
          "lusso discreto": "✨", "quiet luxury": "✨",
          "spirituale": "🪷", "spiritual": "🪷",
          "festoso": "🎉", "festive": "🎉",
          "avventuroso": "🧗", "adventure": "🧗",
          "romantico": "💑", "romantic": "💑",
          "culturale": "🏛", "cultural": "🏛",
          "esplorativo": "🧭", "explorative": "🧭",
          // path B tipo
          "cultura e storia": "🏛", "culture & history": "🏛",
          "natura e avventura": "🌿", "nature & adventure": "🌿",
          "food e vino": "🍷", "food & wine": "🍷",
          "mare e relax": "🏖", "beach & relax": "🏖",
          "città e vita notturna": "🏙", "city & nightlife": "🏙",
          "fuori dal mondo": "🏕", "off the grid": "🏕",
          "road trip": "🚗",
          "trekking e sport": "⛰", "trekking & sports": "⛰",
          "wellness e spa": "🌸", "wellness & spa": "🌸",
          "scoperta, sorprendimi": "🎲", "discovery, surprise me": "🎲",
        };

        return (
          <>
            <div className="grid grid-cols-2 gap-2.5 max-w-[640px] mx-auto">
              {q.options.map(opt => {
                const isSelected = selected.includes(opt);
                const isDisabled = !isSelected && q.max && selected.length >= q.max;
                const emoji = drainIcons[opt.toLowerCase()] || "✦";
                return (
                  <button
                    key={opt}
                    type="button"
                    data-testid={`chip-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`}
                    onClick={() => !isDisabled && toggleChip(opt)}
                    className={`relative flex flex-col items-center justify-center gap-1.5 sm:gap-2 px-2.5 py-3 sm:p-4 rounded-[16px] sm:rounded-[18px] border-[1.5px] transition-all duration-250 select-none text-center min-h-[88px] ${
                      isSelected
                        ? 'border-[#E94560] bg-[rgba(233,69,96,0.12)]'
                        : isDisabled
                        ? 'border-white/8 bg-white/3 opacity-40 cursor-not-allowed'
                        : 'border-white/12 bg-white/4 hover:border-[rgba(233,69,96,0.4)] hover:bg-[rgba(233,69,96,0.06)] cursor-pointer'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#E94560] flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                    <span className="text-[20px] sm:text-[22px] leading-none">{emoji}</span>
                    <span className={`text-[12px] sm:text-[13px] font-semibold leading-tight ${isSelected ? 'text-[#E94560]' : 'text-white/75'}`}>{opt}</span>
                  </button>
                );
              })}
            </div>
            {q.max && (
              <div className="flex items-center justify-between max-w-[640px] mx-auto mt-4 px-1">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all ${
                  selected.length >= q.max
                    ? 'bg-[#E94560] text-white shadow-[0_4px_16px_rgba(233,69,96,0.35)]'
                    : 'bg-white/10 text-white border border-white/20'
                }`}>
                  <div className="flex gap-1">
                    {Array.from({ length: q.max }).map((_, i) => (
                      <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < selected.length ? 'bg-current scale-110' : 'bg-current opacity-25'}`} />
                    ))}
                  </div>
                  <span>{selected.length}/{q.max} {t('q.selected')}</span>
                </div>
                {selected.length >= q.max && (
                  <span className="text-[11px] text-[#E94560] font-semibold animate-pulse">Massimo raggiunto</span>
                )}
              </div>
            )}
            {/* addendum per Path B tipo */}
            {isPathBType && q.addendum && (
              <textarea
                data-testid="input-addendum"
                placeholder={selected[0] ? getPlaceholderForTravelType(selected[0]) : q.addendum}
                value={answers[`${step}_addendum`] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_addendum`]: e.target.value }))}
                className={`w-full max-w-[640px] mx-auto p-4 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[72px] transition-all duration-500 focus:border-[#E94560] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic ${selected.length > 0 ? 'opacity-100 max-h-[140px] mt-4' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}
              />
            )}
          </>
        );
      }

      // ── LISTA VERTICALE con descrizione (Path A Q2 bisogno, Path B Q3 momenti, Path B Q5 feeling) ──
      if (isPathANeed || isPathBMoment || isPathBFeeling) {
        const needDescriptions: Record<string, string> = {
          // Path A Q2
          "staccare dalla routine": "zero notifiche, zero responsabilità",
          "disconnect from routine": "zero notifications, zero responsibilities",
          "sentirmi vivo di nuovo": "intensità, corpo presente",
          "feel alive again": "intensity, body present",
          "rallentare": "lunghi pranzi, nessun posto dove essere",
          "slow down": "long lunches, nowhere to be",
          "sorprendermi": "qualcosa che non avrei mai cercato",
          "be surprised": "something you'd never have searched for",
          "ricaricare le energie": "tornare più leggero di quando sei partito",
          "recharge my energy": "come back lighter than you left",
          "cambiare qualcosa": "un punto di svolta, non solo una pausa",
          "change something": "a turning point, not just a break",
          "festeggiare": "te lo sei guadagnato",
          "celebrate": "you've earned it",
          "ritrovarmi": "silenzio, spazio, pensieri chiari",
          "find myself": "silence, space, clear thoughts",
          // Path B Q3 momenti
          "mangiare nei posti locali": "solo dove mangia la gente del posto",
          "eating at local spots": "only where locals eat",
          "perdermi nei quartieri autentici": "nessuna meta, solo camminare",
          "getting lost in authentic neighborhoods": "no destination, just walking",
          "vedere luoghi iconici": "il classico, vissuto in modo diverso",
          "seeing iconic landmarks": "the classic, experienced differently",
          "stare immerso nella natura": "una giornata senza asfalto",
          "being immersed in nature": "a day without pavement",
          "vivere qualcosa di completamente nuovo": "mai fatto prima, mai più dimenticherai",
          "living something completely new": "never done before, never forgotten",
          "fotografare qualcosa di straordinario": "luce perfetta, momento perfetto",
          "photographing something extraordinary": "perfect light, perfect moment",
          "trovare un posto che non sapevo esistesse": "la scoperta che vale il viaggio",
          "finding a place i didn't know existed": "the discovery that makes the trip",
          // Path B Q5 feeling
       "staccare davvero dalla routine": "niente orari, niente notifiche",
          "disconnect from routine (b5)": "no schedules, no notifications",
          "ritrovare energia e leggerezza": "tornare a casa diverso",
          "regain energy and lightness": "come back changed",
          "sentirmi libero e spontaneo": "decidere al mattino cosa fare il giorno",
          "feel free and spontaneous": "decide the morning what to do that day",
          "meravigliarmi di nuovo": "stupore, quella sensazione che mancava",
          "be amazed again": "wonder, that feeling you've been missing",
          "sentire profondamente il luogo": "entrare davvero in contatto",
          "feel the place deeply": "genuinely connect with it",
          "uscire dalla mia zona di comfort": "il confine che si sposta",
          "step outside my comfort zone": "push the boundary forward",
        };

        const needIcons: Record<string, string> = {
          "staccare dalla routine": "🔌", "disconnect from routine": "🔌",
          "staccare davvero dalla routine": "🔌",
          "sentirmi vivo di nuovo": "⚡", "feel alive again": "⚡",
          "rallentare": "🐢", "slow down": "🐢",
          "sorprendermi": "🎲", "be surprised": "🎲",
          "ricaricare le energie": "🔋", "recharge my energy": "🔋",
          "cambiare qualcosa": "🔄", "change something": "🔄",
          "festeggiare": "🥂", "celebrate": "🥂",
          "ritrovarmi": "🪞", "find myself": "🪞",
          "mangiare nei posti locali": "🍽", "eating at local spots": "🍽",
          "perdermi nei quartieri autentici": "🏘", "getting lost in authentic neighborhoods": "🏘",
          "vedere luoghi iconici": "📸", "seeing iconic landmarks": "📸",
          "stare immerso nella natura": "🌿", "being immersed in nature": "🌿",
          "vivere qualcosa di completamente nuovo": "✨", "living something completely new": "✨",
          "fotografare qualcosa di straordinario": "🌅", "photographing something extraordinary": "🌅",
          "trovare un posto che non sapevo esistesse": "🔭", "finding a place i didn't know existed": "🔭",
          "ritrovare energia e leggerezza": "🔋", "regain energy and lightness": "🔋",
          "sentirmi libero e spontaneo": "🐦", "feel free and spontaneous": "🐦",
          "meravigliarmi di nuovo": "👁", "be amazed again": "👁",
          "sentire profondamente il luogo": "❤️", "feel the place deeply": "❤️",
          "uscire dalla mia zona di comfort": "🚀", "step outside my comfort zone": "🚀",
        };

        return (
          <>
            <div className="flex flex-col gap-2.5 max-w-[640px] mx-auto">
              {q.options.map(opt => {
                const isSelected = selected.includes(opt);
                const isDisabled = !isSelected && q.max && selected.length >= q.max;
                const icon = needIcons[opt.toLowerCase()] || "✦";
                const desc = needDescriptions[opt.toLowerCase()] || "";
                return (
                  <button
                    key={opt}
                    type="button"
                    data-testid={`chip-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`}
                    onClick={() => !isDisabled && toggleChip(opt)}
                    className={`flex items-center gap-4 p-4 rounded-[16px] border-[1.5px] text-left transition-all duration-200 select-none ${
                      isSelected
                        ? 'border-[#E94560] bg-[rgba(233,69,96,0.09)]'
                        : isDisabled
                        ? 'border-white/8 bg-white/3 opacity-40 cursor-not-allowed'
                        : 'border-white/10 bg-white/3 hover:border-[rgba(233,69,96,0.35)] hover:bg-[rgba(233,69,96,0.05)] cursor-pointer'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-[11px] flex items-center justify-center text-[18px] flex-shrink-0 transition-colors ${isSelected ? 'bg-[rgba(233,69,96,0.18)]' : 'bg-white/6'}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[14px] font-semibold leading-tight mb-0.5 ${isSelected ? 'text-[#E94560]' : 'text-white/85'}`}>{opt}</div>
                      {desc && <div className="text-[11px] text-white/35 leading-tight">{desc}</div>}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-[1.5px] flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? 'border-[#E94560] bg-[#E94560]' : 'border-white/20'}`}>
                      {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* addendum per Path B momenti/feeling */}
            {(isPathBMoment || isPathBFeeling) && q.addendum && (
              <textarea
                data-testid="input-addendum"
                placeholder={
                  isPathBMoment ? getPlaceholderForMoment(selected[0]) :
                  isPathBFeeling ? getPlaceholderForEmotion(selected[0]) :
                  q.addendum
                }
                value={answers[`${step}_addendum`] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_addendum`]: e.target.value }))}
                className={`w-full max-w-[640px] mx-auto p-4 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[72px] transition-all duration-500 focus:border-[#E94560] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic ${selected.length > 0 ? 'opacity-100 max-h-[140px] mt-4' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}
              />
            )}
          </>
        );
      }

      // ── CHIP RAGGRUPPATE per categoria (Path A Q3 drains, Path B Q7 avoid) ──
      if (isPathADrains || isPathBAvoid) {
        const groupsIT = isPathADrains ? [
          { label: "Luoghi e folla", keys: ["luoghi affollati", "ristoranti turistici", "hotel resort"] },
          { label: "Attività e cultura", keys: ["visite guidate", "stanchezza da musei", "vita notturna e club"] },
          { label: "Ritmo e logistica", keys: ["programmi rigidi", "lunghi trasferimenti", "sveglie presto", "stare troppo a lungo nello stesso posto"] },
          { label: "Persone e cibo", keys: ["chiacchiere con sconosciuti", "cibo sconosciuto", "troppo camminare", "troppo isolato", "spendere senza valore chiaro"] },
        ] : [
          { label: "Luoghi e folla", keys: ["luoghi affollati", "ristoranti turistici", "hotel resort"] },
          { label: "Attività e cultura", keys: ["visite guidate", "stanchezza da musei", "vita notturna e club"] },
          { label: "Ritmo e logistica", keys: ["programmi rigidi", "lunghi trasferimenti", "sveglie presto", "chiacchiere con sconosciuti"] },
        ];
        const groupsEN = isPathADrains ? [
          { label: "Crowds & places", keys: ["crowded places", "touristy restaurants", "resort hotels"] },
          { label: "Activities & culture", keys: ["guided tours", "museums fatigue", "nightlife & clubs"] },
          { label: "Rhythm & logistics", keys: ["strict schedules", "long transits", "early mornings", "staying too long in one place"] },
          { label: "People & food", keys: ["small talk with strangers", "unfamiliar food", "too much walking", "too isolated", "spending without clear value"] },
        ] : [
          { label: "Crowds & places", keys: ["crowded places", "touristy restaurants", "resort hotels"] },
          { label: "Activities & culture", keys: ["guided tours", "museums fatigue", "nightlife & clubs"] },
          { label: "Rhythm & logistics", keys: ["strict schedules", "long transits", "early mornings", "small talk with strangers"] },
        ];

        // Detect language from options
        const firstOpt = (q.options[0] || "").toLowerCase();
        const isIT = firstOpt.includes("affoll") || firstOpt.includes("guidat") || firstOpt.includes("program");
        const groups = isIT ? groupsIT : groupsEN;

        // Map option text to group
        const optionToGroup: Record<string, number> = {};
        q.options.forEach(opt => {
          const o = opt.toLowerCase();
          groups.forEach((g, gi) => {
            if (g.keys.some(k => o.includes(k) || k.includes(o.split(" ").slice(0, 2).join(" ")))) {
              optionToGroup[opt] = gi;
            }
          });
        });

        // Group options
        const grouped: { label: string; opts: string[] }[] = groups.map(g => ({ label: g.label, opts: [] as string[] }));
        const ungrouped: string[] = [];
        q.options.forEach(opt => {
          const gi = optionToGroup[opt];
          if (gi !== undefined) grouped[gi].opts.push(opt);
          else ungrouped.push(opt);
        });
        if (ungrouped.length > 0) grouped.push({ label: isIT ? "Altro" : "Other", opts: ungrouped });

        return (
          <>
            <div className="flex flex-col gap-5 max-w-[640px] mx-auto">
              {grouped.filter(g => g.opts.length > 0).map((group) => (
                <div key={group.label}>
                  <div className="text-[9px] font-bold tracking-[2.5px] uppercase text-white/25 mb-2.5 ml-1">{group.label}</div>
                  <div className="flex flex-wrap gap-2">
                    {group.opts.map(opt => {
                      const isSelected = selected.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          data-testid={`chip-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`}
                          onClick={() => toggleChip(opt)}
                          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-[12px] font-medium border transition-all duration-200 select-none cursor-pointer ${
                            isSelected
                              ? 'border-[#E94560] bg-[rgba(233,69,96,0.12)] text-[#E94560]'
                              : 'border-white/12 bg-white/4 text-white/60 hover:border-[rgba(233,69,96,0.3)] hover:text-white/85'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 flex-shrink-0" strokeWidth={3} />}
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            {q.addendum && (
              <textarea
                data-testid="input-addendum"
                placeholder={selected[0] ? getPlaceholderForAvoid(selected[0]) : q.addendum}
                value={answers[`${step}_addendum`] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_addendum`]: e.target.value }))}
                className={`w-full max-w-[640px] mx-auto p-4 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[72px] transition-all duration-500 focus:border-[#E94560] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic ${selected.length > 0 ? 'opacity-100 max-h-[140px] mt-4' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}
              />
            )}
          </>
        );
      }

      // ── CARD GRANDI verticali (Path A Q7 distanza, Path B Q1 geo) ──────────
      if (isPathADistance || isPathBQ1) {
        const distIcons: Record<string, string> = {
          "vicino a casa": "🏠", "close to home": "🏠",
          "stesso continente": "🌍", "same continent": "🌍",
          "lontano": "✈️", "far away": "✈️",
          "ovunque, sorprendimi davvero": "🎲", "anywhere, truly surprise me": "🎲",
          "europa": "🏰", "europe": "🏰",
          "asia": "🏯", 
          "americhe": "🗽", "americas": "🗽",
          "africa e medio oriente": "🌍", "africa & middle east": "🌍",
          "oceania": "🦘",
        };
        const distSubs: Record<string, string> = {
          "vicino a casa": "in macchina o treno, max 4h — nessun volo",
          "close to home": "car or train, max 4h — no flights",
          "stesso continente": "volo corto o medio raggio",
          "same continent": "short or medium haul flight",
          "lontano": "asia, americhe, africa — long haul",
          "far away": "asia, americas, africa — long haul",
          "ovunque, sorprendimi davvero": "massima apertura, zero vincoli",
          "anywhere, truly surprise me": "maximum openness, zero constraints",
          "europa": "volo corto, max 4h da qualsiasi città",
          "europe": "short haul, max 4h from any city",
          "asia": "long haul, 8-12h di volo",
          "americhe": "transcontinentale, 10-14h",
          "americas": "transcontinental, 10-14h",
          "africa e medio oriente": "medio o lungo raggio, 4-10h",
          "africa & middle east": "medium or long haul, 4-10h",
          "oceania": "long haul, 20h+ con scali",
        };

        return (
          <>
            <div className="flex flex-col gap-2.5 max-w-[640px] mx-auto">
              {q.options.map(opt => {
                const isSelected = selected.includes(opt);
                const icon = distIcons[opt.toLowerCase()] || "🌐";
                const sub = distSubs[opt.toLowerCase()] || "";
                return (
                  <button
                    key={opt}
                    type="button"
                    data-testid={`chip-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`}
                    onClick={() => toggleChip(opt)}
                    className={`flex items-center gap-4 p-4 rounded-[16px] border-[1.5px] text-left transition-all duration-200 select-none cursor-pointer ${
                      isSelected
                        ? 'border-[#E94560] bg-[rgba(233,69,96,0.09)]'
                        : 'border-white/10 bg-white/3 hover:border-[rgba(233,69,96,0.35)] hover:bg-[rgba(233,69,96,0.05)]'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-[13px] flex items-center justify-center text-[22px] flex-shrink-0 transition-colors ${isSelected ? 'bg-[rgba(233,69,96,0.18)]' : 'bg-white/6'}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[15px] font-semibold leading-tight mb-1 ${isSelected ? 'text-[#E94560]' : 'text-white/90'}`}>{opt}</div>
                      {sub && <div className="text-[11px] text-white/35 leading-tight">{sub}</div>}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-[1.5px] flex-shrink-0 transition-all ${isSelected ? 'border-[#E94560] bg-[#E94560]' : 'border-white/20'}`}>
                      {isSelected && (
                        <div className="w-full h-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            {/* precise location per Path B Q1 */}
            {isPathBQ1 && selected.length > 0 && (
              <div className="mt-4 p-4 bg-[var(--surface-card)] border border-[var(--border-input)] rounded-[18px] transition-all duration-300 max-w-[640px] mx-auto">
                <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E94560] inline-block" />
                  {t('b.q1.precise')}
                </p>
                <input
                  type="text"
                  data-testid="input-precise-location"
                  placeholder={getPlaceholderForRegion(selected[0])}
                  value={answers[`${step}_precise`] || ''}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_precise`]: e.target.value }))}
                  className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border-input)] rounded-xl text-[14px] text-[var(--text-primary)] outline-none focus:border-[#E94560] placeholder:text-[var(--text-muted)] placeholder:font-light transition-all"
                />
              </div>
            )}
          </>
        );
      }

      // ── FALLBACK: chip standard pill (tutte le altre domande) ───────────────
      let addendumPlaceholder = q.addendum;
      if (q.addendum && selected[0]) {
        if (selectedPath === 'b' && step === 1) addendumPlaceholder = getPlaceholderForTravelType(selected[0]);
        else if (selectedPath === 'b' && step === 2) addendumPlaceholder = getPlaceholderForMoment(selected[0]);
        else if (selectedPath === 'b' && step === 5) addendumPlaceholder = getPlaceholderForEmotion(selected[0]);
        else if (selectedPath === 'b' && step === 6) addendumPlaceholder = getPlaceholderForAvoid(selected[0]);
      }

      return (
        <>
          <div className="flex flex-wrap gap-3 max-w-[640px] mx-auto">
            {q.options.map(opt => (
              <button
                key={opt}
                type="button"
                data-testid={`chip-${opt.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')}`}
                onClick={() => toggleChip(opt)}
                className={`px-5 md:px-6 py-3.5 rounded-full text-[14px] md:text-[15px] border-[1.5px] transition-all duration-300 select-none ${
                  selected.includes(opt)
                    ? 'border-[#E94560] bg-[#E94560] text-white font-medium shadow-[0_4px_20px_rgba(233,69,96,0.15)] scale-[1.02] cursor-pointer'
                    : q.max && selected.length >= q.max
                    ? 'border-white/10 text-white/30 bg-white/5 cursor-not-allowed opacity-50'
                    : 'border-white/25 text-white bg-white/10 hover:border-[#E94560] hover:bg-white/15 hover:-translate-y-0.5 cursor-pointer backdrop-blur-sm'
                }`}
              >
                <span className="inline-flex items-center justify-center gap-1.5">
                  {getChipIcon(opt) ? <span className="opacity-80 flex items-center">{getChipIcon(opt)}</span> : null}
                  <span>{opt}</span>
                </span>
              </button>
            ))}
          </div>
          {q.max && (
            <div className="flex items-center justify-between max-w-[640px] mx-auto mt-4 px-1">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all ${
                selected.length >= q.max
                  ? 'bg-[#E94560] text-white shadow-[0_4px_16px_rgba(233,69,96,0.35)]'
                  : 'bg-white/10 text-white border border-white/20'
              }`}>
                <div className="flex gap-1">
                  {Array.from({ length: q.max }).map((_, i) => (
                    <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < selected.length ? 'bg-current scale-110' : 'bg-current opacity-25'}`} />
                  ))}
                </div>
                <span>{selected.length}/{q.max} {t('q.selected')}</span>
              </div>
              {selected.length >= q.max && (
                <span className="text-[11px] text-[#E94560] font-semibold animate-pulse">Massimo raggiunto</span>
              )}
            </div>
          )}
          {q.addendum && (
            <textarea
              data-testid="input-addendum"
              placeholder={addendumPlaceholder}
              value={answers[`${step}_addendum`] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_addendum`]: e.target.value }))}
              className={`w-full max-w-[640px] mx-auto p-4 md:p-5 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[84px] transition-all duration-500 focus:border-[#E94560] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic ${selected.length > 0 ? 'opacity-100 max-h-[160px] mt-4' : 'opacity-0 max-h-0 overflow-hidden mt-0'}`}
            />
          )}
        </>
      );
    }

    // ── IMAGES ───────────────────────────────────────────────────────────────
    if (currentQ.type === 'images') {
      const isPathBAtmosphere = selectedPath === 'b' && step === 3;
      return (
        <>
          <div className="grid grid-cols-2 gap-3 max-w-[640px] mx-auto">
            {currentQ.options.map(opt => {
              const isSelected = imageSelections.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`image-${opt.value}`}
                  onClick={() => selectImage(opt.value)}
                  className={`relative rounded-[16px] overflow-hidden cursor-pointer border-[2.5px] transition-all duration-300 group text-left ${
                    isSelected
                      ? 'border-[#E94560] shadow-[0_6px_28px_rgba(233,69,96,0.18)]'
                      : 'border-transparent hover:border-[rgba(233,69,96,0.35)] hover:-translate-y-[3px]'
                  }`}
                  style={{ aspectRatio: '4/3' }}
                >
                  <img src={opt.src} alt={opt.label} loading="eager"
                    className={`w-full h-full object-cover block transition-all duration-700 ${isSelected ? 'scale-[1.03]' : 'group-hover:scale-[1.06]'}`}
                  />
                  <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isSelected ? 'bg-gradient-to-b from-[rgba(233,69,96,0.06)] to-[rgba(233,69,96,0.22)]' : 'bg-gradient-to-b from-transparent via-transparent to-[rgba(0,0,0,0.55)]'}`} />
                  <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white z-[2]">
                    <span className="text-[14px] font-semibold leading-tight block">{opt.label}</span>
                    <small className="text-[11px] font-light opacity-80 mt-0.5 leading-[1.4] block">{opt.sub}</small>
                  </div>
                  <div className={`absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-[#E94560] flex items-center justify-center z-[3] transition-all duration-350 ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.3]'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-left mt-3 text-[13px] text-white/45 max-w-[640px] mx-auto" data-testid="text-img-counter">
            {imageSelections.length > 0 ? (
              <><span className="text-[#E94560] font-semibold">{imageSelections.length}</span>/2 {t('q.selected')}</>
            ) : (
              t('q.selectImages')
            )}
          </div>
          {isPathBAtmosphere && imageSelections.length > 0 && (
            <div className="mt-4 max-w-[640px] mx-auto">
              <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E94560] inline-block" />
                {t('b.q4.addendum') || "Cosa ti attira di questa atmosfera? (opzionale)"}
              </p>
              <textarea
                data-testid="input-atmosphere-addendum"
                placeholder={getPlaceholderForAtmosphere(imageSelections[0])}
                value={answers[`${step}_addendum`] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_addendum`]: e.target.value }))}
                className="w-full p-4 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[72px] focus:border-[#E94560] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic"
              />
            </div>
          )}
        </>
      );
    }

    // ── SLIDER ───────────────────────────────────────────────────────────────
    if (currentQ.type === 'slider') {
      const labelIdx = Math.round(sliderValue / 100 * 6);
      return (
        <>
          <div className="bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[22px] p-[32px_24px] md:p-[36px_30px] shadow-[0_2px_16px_rgba(26,26,46,0.03)] max-w-[640px] mx-auto">
            <div className="flex justify-between mb-8">
              <span className="text-[12px] text-[var(--text-secondary)] max-w-[120px] leading-[1.4]">{t('slider.left')}</span>
              <span className="text-[12px] text-[var(--text-secondary)] max-w-[120px] leading-[1.4] text-right">{t('slider.right')}</span>
            </div>
            <SliderTrack value={sliderValue} onChange={setSliderValue} />
            <div className="flex justify-between mt-3 px-1">
              {[0, 1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="w-0.5 h-2 rounded-sm transition-colors duration-300" style={{ background: n <= Math.round(sliderValue / 100 * 6) ? '#E94560' : 'var(--border-input)' }} />
              ))}
            </div>
            <div className="text-center mt-5 font-serif text-[16px] text-[#E94560] italic min-h-[26px]">
              {sliderLabels[labelIdx]}
            </div>
          </div>
          <textarea
            data-testid="input-slider-addendum"
            placeholder={t('slider.addendum')}
            value={answers[`${step}_addendum`] || ''}
            onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_addendum`]: e.target.value }))}
            className="w-full max-w-[640px] mx-auto mt-6 p-4 md:p-5 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[84px] focus:border-[#E94560] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic"
          />
        </>
      );
    }

    return null;
  };

const buildDynamicProfileMessage = (): string | null => {
    const allAnswers = Object.entries(answers)
      .filter(([k]) => !k.includes('_'))
      .map(([, v]) => v.toLowerCase())
      .join(' ');
    
    if (!allAnswers.trim()) return null;

    // Legge segnali chiave dalle risposte
    const isAdventurous = /avventur|wild|selvag|trekking|sport|off.grid|fuori dal mondo/.test(allAnswers);
    const isRelaxed = /relax|silenz|quiet|wellness|spa|mare|beach|rigenerante/.test(allAnswers);
    const isCultural = /cultur|storia|museum|landmark|autent|authentic/.test(allAnswers);
    const isFoodie = /food|vino|wine|mangiare|ristorante|mercato/.test(allAnswers);
    const isRomantic = /romantico|romantic|intimo|intimate|coppia|partner/.test(allAnswers);
    const isSolitary = /solo|solitario|solitary|da solo/.test(allAnswers);
    const isSpiritual = /spiritual|spirituale|quiete|silenzio|profondo/.test(allAnswers);
    const wantsNature = /natura|nature|montagna|mountain|forest|bosco|lago/.test(allAnswers);
    const wantsCity = /città|city|urban|notturna|nightlife|metropoli/.test(allAnswers);
    const wantsUnknown = /sorprendimi|surprise|non sapevo|discovery|scoperta|ovunque/.test(allAnswers);
    const wantsClose = /vicino|close|stesso continente/.test(allAnswers);
    const wantsFar = /lontano|far|asia|americhe|africa|oceania/.test(allAnswers);
    const needsBreak = /staccare|disconnect|routine|burnout|stanco|riposo/.test(allAnswers);
    const needsWonder = /meravigliarmi|wonder|stupire|incredibile|straordinario/.test(allAnswers);

    // Costruisce la frase combinando i segnali più forti
    const traits: string[] = [];

    if (needsBreak) traits.push("hai bisogno di staccare davvero");
    if (needsWonder) traits.push("cerchi qualcosa che ti meravigli");
    if (isAdventurous) traits.push("vuoi sentirti vivo");
    if (isRelaxed) traits.push("cerchi ritmo lento");
    if (isCultural) traits.push("ami immergerti nella storia dei luoghi");
    if (isFoodie) traits.push("il cibo è parte del viaggio");
    if (isRomantic) traits.push("cerchi un'atmosfera intima");
    if (isSolitary) traits.push("preferisci il tuo spazio");
    if (isSpiritual) traits.push("cerchi qualcosa di più profondo");
    if (wantsNature) traits.push("la natura ti ricarica");
    if (wantsCity) traits.push("ti accende l'energia urbana");
    if (wantsUnknown) traits.push("vuoi essere sorpreso");
    if (wantsFar) traits.push("sei pronto a spingerti lontano");
    if (wantsClose) traits.push("preferisci restare vicino");

    if (traits.length === 0) return null;
    if (traits.length === 1) return `Emerge che ${traits[0]}.`;
    if (traits.length === 2) return `Emerge che ${traits[0]} e ${traits[1]}.`;
    return `Emerge che ${traits[0]}, ${traits[1]} e ${traits[2]}.`;
  };
  const renderProfileSoFar = () => {
    if (step === 0) return null;
    const entries: { idx: number; section: string; text: string }[] = [];
    for (let j = 0; j < step; j++) {
      const a = answers[j];
      if (a != null && a !== '') {
        const txt = typeof a === 'string' ? (a.length > 55 ? a.substring(0, 55) + '...' : a) : '' + a;
        entries.push({ idx: j, section: questions[j].section, text: txt });
      }
    }
    if (entries.length === 0) return null;

  const dynamicMessage = buildDynamicProfileMessage();

    return (
      <div className="mt-1">
        {dynamicMessage && (
          <div className="mb-3 px-4 py-3 rounded-[14px] border border-[#E94560]/30 bg-[#E94560]/10 backdrop-blur-sm">
            <p className="text-[12px] text-white leading-[1.6] font-light italic">
              <span className="text-[#E94560] font-bold not-italic">✦ </span>
              {dynamicMessage}
            </p>
          </div>
        )}
        <div className="text-[10px] font-semibold tracking-[2px] uppercase text-white/60 mb-2.5">{t('sidebar.profileSoFar')}</div>
        {entries.map((entry, i) => (
          <div
            key={entry.idx}
           className="px-4 py-3 bg-white/5 rounded-[12px] mb-2 text-[13px] text-white/50 leading-[1.5] font-light border-l-2 border-[#E94560] opacity-75"
            style={{ animation: `sidebarIn 0.3s ease ${i * 0.06}s both` }}
          >
            <b className="font-medium text-white/70 text-[10px] tracking-[0.5px] uppercase block mb-0.5">Q{entry.idx + 1} - {entry.section}</b>
            {entry.text}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden dark" style={{ background: '#07090F' }}>

      {/* ── BACKGROUND SYSTEM ────────────────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Base scuro */}
        <div className="absolute inset-0" style={{ background: '#07090F' }} />

        {/* Foto destination – crossfade al cambio selezione */}
        <AnimatePresence>
          <motion.div
            key={bgImageUrl}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${bgImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(3px)',
              transform: 'scale(1.06)',
            }}
          />
        </AnimatePresence>

        {/* Vignetta scura – lascia respirare il centro */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 110% 85% at 50% 38%, rgba(7,9,15,0.38) 0%, rgba(7,9,15,0.76) 55%, rgba(7,9,15,0.96) 100%)',
        }} />

        {/* Grain texture */}
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          opacity: 0.032,
        }} />

        {/* Rotte decorative – riprende il vocabolario SVG della landing */}
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 160 C 200 100, 420 270, 660 190 S 960 60, 1180 210 S 1380 330, 1460 160"
            fill="none" stroke="#E94560" strokeWidth="1.2" opacity="0.09" strokeDasharray="8 14" />
          <path d="M-20 740 C 230 680, 460 810, 700 730 S 980 610, 1200 750 S 1400 860, 1460 740"
            fill="none" stroke="#E94560" strokeWidth="1" opacity="0.065" strokeDasharray="5 10" />
          {/* Dot di rotta – come i pin della WorldMap */}
          <circle cx="660" cy="190" r="3.5" fill="#E94560" opacity="0.22" />
          <circle cx="1180" cy="210" r="3" fill="#E94560" opacity="0.18" />
          <circle cx="700" cy="730" r="3" fill="#E94560" opacity="0.16" />
        </svg>
      </div>

      <style>{`
        @keyframes sidebarIn { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes dotPulse { 0%, 100% { transform: scale(1); opacity: 0.2; } 50% { transform: scale(1.25); opacity: 0; } }
      `}</style>

      <Nav />
      <TopProgressBar />

      <AnimatePresence>
        {reaction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1.05, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-serif text-[34px] italic text-[#E94560] pointer-events-none z-[200]"
          >
            {reaction}
          </motion.div>
        )}
      </AnimatePresence>
<div className="grid grid-cols-1 lg:grid-cols-[60px_minmax(0,1fr)_360px] min-h-screen gap-0 w-full max-w-[1600px] mx-auto px-2 pt-[96px] md:pt-[120px]">
        <aside className="hidden lg:flex flex-col items-center justify-center gap-0 sticky top-[120px] h-[calc(100vh-120px)] py-10">
          {questions.map((_, i) => (
            <div key={i} className="flex flex-col items-center relative group">
              <button
                onClick={() => goToStep(i)}
                data-testid={`step-${i + 1}`}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-semibold z-[2] relative transition-all duration-450 ${i === step
                  ? 'bg-[#E94560] text-white shadow-[0_10px_26px_rgba(233,69,96,0.22)] scale-[1.18]'
                  : i < step
                    ? 'bg-[#E94560] text-white opacity-65 hover:opacity-90 hover:scale-[1.08]'
                    : 'bg-white/5 text-white/25 border-[1.5px] border-white/10'
                  }`}
              >
                {i + 1}
                {i === step && (
                  <span className="absolute inset-[-6px] rounded-full border-2 border-[#E94560] opacity-20" style={{ animation: 'dotPulse 2s ease-in-out infinite' }} />
                )}
              </button>
              {i < step && answers[i] && (
                <div className="absolute left-[58px] top-1/2 -translate-y-1/2 bg-[#1A1A2E] text-white text-[11px] font-normal px-3 py-1.5 rounded-lg whitespace-nowrap max-w-[180px] overflow-hidden text-ellipsis opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-250 z-10">
                  <span className="absolute left-[-4px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[5px] border-r-[#1A1A2E]" />
                  {typeof answers[i] === 'string' && answers[i].length > 30 ? answers[i].substring(0, 30) + '...' : answers[i]}
                </div>
              )}
              {i < questions.length - 1 && (
                <div className={`w-0.5 h-7 rounded-sm transition-all duration-500 ${i < step ? 'bg-[#E94560] opacity-35' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </aside>
  <main className="relative py-4 md:py-8 px-3 sm:px-4 pb-[112px] md:pb-[120px] w-full flex items-center justify-center">
   
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 28, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(3px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-20 w-full max-w-[820px]"
            >
              {/* ── HEADER EDITORIALE – testo diretto sul background ── */}
              <div className="mb-5 md:mb-6 px-1 md:px-2">
                {/* Kicker */}
                <div className="flex items-center gap-2.5 mb-4 md:mb-5 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[10px] font-bold uppercase tracking-[2.4px] md:tracking-[2.8px] text-[#E94560] border border-[rgba(233,69,96,0.30)]"
                    style={{ background: 'rgba(233,69,96,0.08)', backdropFilter: 'blur(8px)' }}>
                    <Info className="w-2.5 h-2.5" />
                    {t('q.label')} {String(step + 1).padStart(2, '0')}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-[5px] rounded-full text-[10px] font-semibold uppercase tracking-[2px] text-white/50 border border-white/10"
                    style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(8px)' }}>
                    {currentQ.section}
                  </span>
                </div>

                {/* Titolo – grande, serif, leggibile sul dark photo */}
                <h1 className="font-serif text-[clamp(26px,7vw,52px)] leading-[1.1] tracking-tight mb-3 md:mb-4 text-white"
                  style={{ textShadow: '0 2px 24px rgba(0,0,0,0.55)' }}>
                  <span dangerouslySetInnerHTML={{
                    __html: currentQ.text.replace(/<em>/g, '<em class="italic text-[#E94560]" style="font-style:italic">')
                  }} />
                </h1>

                {/* Hint – corsivo, leggero */}
                <p className="text-[14px] sm:text-[15px] md:text-[16px] text-white/55 font-light italic leading-[1.7] md:leading-[1.85] max-w-[52ch]"
                  style={{ textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}>
                  {currentQ.hint}
                </p>
              </div>

              {/* ── SEPARATORE ROTTA ── */}
              <div className="flex items-center gap-3 mb-5 px-2">
                <div className="flex-1 h-px" style={{
                  background: 'repeating-linear-gradient(to right, rgba(233,69,96,0.30) 0px, rgba(233,69,96,0.30) 4px, transparent 4px, transparent 10px)'
                }} />
                <span className="text-[#E94560] opacity-50">✦</span>
                <div className="w-16 h-px" style={{
                  background: 'repeating-linear-gradient(to right, rgba(233,69,96,0.15) 0px, rgba(233,69,96,0.15) 4px, transparent 4px, transparent 10px)'
                }} />
              </div>

              {/* ── AREA INPUT – glass panel premium ── */}
              <div className="rounded-[20px] md:rounded-[24px] p-4 sm:p-5 md:p-6"
                style={{
                  background: 'rgba(7,9,15,0.55)',
                  backdropFilter: 'blur(32px) saturate(1.8)',
                  WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.07)',
                }}>
                {renderQuestionInput()}
              </div>

              {/* ── BOTTONI DESKTOP ── */}
              <div className="hidden md:flex items-center justify-between mt-6 gap-4 flex-wrap px-1">
                <button
                  onClick={goBack}
                  data-testid="button-back"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-white/40 text-[14px] bg-transparent border border-transparent cursor-pointer rounded-full hover:text-white/70 hover:border-white/15 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> {t('q.back')}
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canContinue()}
                  data-testid="button-continue"
                  className="inline-flex items-center gap-2 px-[36px] py-[15px] rounded-full font-semibold text-[15px] border-none cursor-pointer transition-all duration-300 group disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: canContinue() ? 'linear-gradient(135deg, #E94560, #C73050)' : 'rgba(233,69,96,0.25)',
                    color: 'white',
                    boxShadow: canContinue() ? '0 8px 28px rgba(233,69,96,0.45), 0 2px 8px rgba(233,69,96,0.20)' : 'none',
                  }}
                >
                  {t('q.continue')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:enabled:translate-x-1" />
                </button>
              </div>

              {/* Mobile: bottone sticky in basso */}
              <div className="md:hidden fixed bottom-0 left-0 right-0 z-[50] px-4 pt-3" style={{ background: "linear-gradient(to top, rgba(10,8,20,0.98) 70%, transparent)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
                <div className="flex items-center gap-3 max-w-[640px] mx-auto">
                  <button
                    onClick={goBack}
                    data-testid="button-back-mobile"
                    aria-label="Indietro"
                    className="flex items-center justify-center w-12 h-12 rounded-full border border-white/15 text-white/50 bg-white/5 cursor-pointer transition-all hover:border-white/30 hover:text-white/80 flex-shrink-0"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canContinue()}
                    data-testid="button-continue-mobile"
                    className="flex-1 flex items-center justify-center gap-2 py-4 min-h-[52px] rounded-full font-semibold text-[15px] border-none cursor-pointer transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      background: canContinue() ? '#E94560' : 'rgba(233,69,96,0.25)',
                      color: 'white',
                      boxShadow: canContinue() ? '0 8px 26px rgba(233,69,96,0.35)' : 'none',
                    }}
                  >
                    {t('q.continue')}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="lg:hidden mt-6">
                <button
                  onClick={() => setMobileWhyOpen(!mobileWhyOpen)}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-[#E94560] cursor-pointer py-2.5 border-none bg-transparent"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${mobileWhyOpen ? 'rotate-180' : ''}`} />
                  {t('sidebar.whyThis')}
                </button>
                <div className={`overflow-hidden transition-all duration-400 ${mobileWhyOpen ? 'max-h-[200px]' : 'max-h-0'}`}>
                  <div className="p-4 bg-[var(--surface-card)] border border-[var(--border-input)] rounded-xl text-[13px] text-[var(--text-secondary)] leading-[1.7] font-light">
                    {currentQ.why}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {currentQ.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-2.5 py-1 rounded-full bg-[rgba(233,69,96,0.07)] text-[#E94560] font-semibold tracking-[0.2px]">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>

        <aside className="hidden lg:flex flex-col gap-3.5 sticky top-[120px] h-[calc(100vh-120px)] justify-center pr-4 py-12 overflow-y-auto">
         <div className="border border-white/20 rounded-[24px] p-6 hover:shadow-[0_4px_20px_rgba(233,69,96,0.15)] transition-all backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.08)', animation: 'sidebarIn 0.5s ease 0.15s both' }}>
            <div className="flex items-center gap-2 mb-3 text-[13px] font-bold text-white">
              <HelpCircle className="w-4 h-4 text-[#E94560] shrink-0" />
              {t('sidebar.whyThis')}
            </div>
            <p className="text-[13px] text-white/80 leading-[1.8] font-light">{currentQ.why}</p>
          </div>

          <div className="border border-white/20 rounded-[24px] p-6 hover:shadow-[0_4px_20px_rgba(233,69,96,0.15)] transition-all backdrop-blur-md" style={{ background: 'rgba(255,255,255,0.08)', animation: 'sidebarIn 0.5s ease 0.25s both' }}>
            <div className="flex items-center gap-2 mb-3 text-[13px] font-bold text-white">
              <MapPin className="w-4 h-4 text-[#E94560] shrink-0" />
              {t('sidebar.mapping')}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {currentQ.tags.map(tag => (
                <span key={tag} className="text-[11px] px-3 py-1.5 rounded-full border border-[#E94560]/40 bg-[#E94560]/15 text-[#E94560] font-bold tracking-[0.3px]">{tag}</span>
              ))}
            </div>
          </div>
          {renderProfileSoFar()}

          <div className="flex items-start gap-2 p-3.5 rounded-xl text-[11px] text-white/30 leading-[1.5] border border-white/8"
            style={{ animation: 'sidebarIn 0.5s ease 0.35s both', background: 'rgba(255,255,255,0.03)' }}>
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {t('sidebar.privacy')}
          </div>
        </aside>
      </div>

   {/* press enter hint removed */}
    </div>
  );
}










