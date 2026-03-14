import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, HelpCircle, MapPin, Info, ChevronDown, Moon, Sun, HelpCircle as QuestionIcon } from "lucide-react";
import { useSubmitProfiling } from "@/hooks/use-profiling";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { Link, useLocation } from "wouter";
import LangDropdown from "@/components/LangDropdown";
import { useTheme } from "@/components/ThemeProvider";
import { AnalyzingScreen } from "./profiling/AnalyzingScreen";
import { FormChip } from "./profiling/FormChip";
import { createProfilingContent } from "./profiling/questions";
import { SliderTrack } from "./profiling/SliderTrack";
import type { ChipsQuestion, Question, TextQuestion } from "./profiling/types";
import { getQuestionBackground } from './profiling/questionBackgrounds';
const MindRouteLogo = ({ size = 30 }: { size?: number }) => (
  <svg viewBox="0 0 120 120" fill="none" style={{ width: size, height: size }}>
    <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="#E94560" opacity="0.85" />
    <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="#E94560" opacity="0.55" />
    <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="#E94560" opacity="0.85" />
    <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="#E94560" opacity="0.55" />
    <ellipse cx="60" cy="60" rx="5" ry="6" fill="var(--text-primary)" />
    <path d="M58 66L60 108L62 66" fill="#E94560" opacity="0.7" />
    <circle cx="60" cy="48" r="3.5" fill="var(--text-primary)" />
  </svg>
);

export default function Profiling() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const splitSceneBackground = theme === "dark"
    ? "radial-gradient(circle at 50% 16%, rgba(233,69,96,0.14), transparent 26%), radial-gradient(circle at 20% 22%, rgba(78,84,200,0.16), transparent 30%), linear-gradient(180deg, #141727 0%, #0d1020 58%, #101427 100%)"
    : "radial-gradient(circle at 50% 16%, rgba(233,69,96,0.10), transparent 24%), radial-gradient(circle at 18% 22%, rgba(233,69,96,0.07), transparent 28%), linear-gradient(180deg, #fbf8f4 0%, #f7f2ec 100%)";
  const splitStroke = theme === "dark" ? "rgba(255,255,255,0.11)" : "rgba(233,69,96,0.18)";
  const splitBadgeBg = theme === "dark" ? "rgba(255,255,255,0.07)" : "rgba(233,69,96,0.07)";
  const splitCardGlow = theme === "dark" ? "0 24px 70px rgba(4, 8, 20, 0.46)" : "0 24px 70px rgba(226, 170, 181, 0.22)";
  const splitTrustBg = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.68)";
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
  const subtlePanelBg = theme === "dark" ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.58)";

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

  const [selectedPath, setSelectedPath] = useState<'a' | 'b' | null>(null);
  const [showSplit, setShowSplit] = useState(true);
  const [splitExiting, setSplitExiting] = useState(false);
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

  useEffect(() => {
    if (!showSplit && textareaRef.current && currentQ?.type === 'text') {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [step, showSplit]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && !showForm && !reaction && !showSplit && !showAnalyzing) {
        e.preventDefault();
        if (canContinue()) handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, answers, chipSelections, imageSelections, sliderValue, showForm, reaction, showSplit, showAnalyzing]);

  useEffect(() => {
    return () => { analyzeTimers.current.forEach(t => clearTimeout(t)); };
  }, []);

  useEffect(() => {
    if (!submitMutation.data) return;

    analyzeTimers.current.forEach(t => clearTimeout(t));
    setShowAnalyzing(false);

    try {
      sessionStorage.setItem("mind_destinations", JSON.stringify(submitMutation.data));
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
          + (precise ? ` â†’ ${precise}` : '')
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

  const startAnalyzing = () => {
    analyzeTimers.current.forEach(t => clearTimeout(t));
    analyzeTimers.current = [];
    setVisibleTraits([]);
    setShowAnalyzing(true);

    submitMutation.reset();
    doFinalSubmit();

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
        setStep(questions.length - 1);
      }
    } else if (step > 0) {
      saveCurrentAnswer();
      setStep(step - 1);
    } else {
      setShowSplit(true);
      setSelectedPath(null);
      setStep(0);
      setAnswers({});
      setChipSelections({});
      setImageSelections([]);
      setSliderValue(50);
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

  const getDateString = () => {
    if (formData.dateMode === "exact") return `${formData.dateFrom} - ${formData.dateTo}`;
    if (formData.dateMode === "flexible-month") return formData.selectedMonths.join(", ");
    return formData.selectedPeriods.join(", ");
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

    // Q3 – momento / must-see (oggi è una text question)
    const q3 = answers[2] || '';

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

    // Obiettivo emotivo (Q6 – text)
    const emotional_goal = answers[5] || '';

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

    const experience_priority = q3 || (answers[`1_addendum`] || "");
    const must_see = q3 ? [q3] : [];

    return {
      region,
      specific_place: precisePlace || undefined,
      travel_type_primary,
      travel_type_secondary: travel_type_secondary.length ? travel_type_secondary : undefined,
      experience_priority: experience_priority || undefined,
      must_see: must_see.length ? must_see : undefined,
      atmosphere: atmosphere || undefined,
      pace,
      emotional_goal: emotional_goal || undefined,
      avoid: avoid.length ? avoid : undefined,
    };
  };

  const doFinalSubmit = () => {
    const baseAnswers = questions.map((_, i) => answers[i] || "");
    const structured = buildStructuredProfileForPathB();
    const quizAnswersArray = [`path_${selectedPath}`, ...baseAnswers];
    if (structured) {
      try {
        quizAnswersArray.push(JSON.stringify(structured));
      } catch {
        // ignore JSON issues, fallback to flat answers only
      }
    }
    const durationMap: Record<string, number> = { "weekend": 4, "week": 7, "10-14": 12, "long": 15 };

    const enrichedConstraints = [
      formData.constraints,
      formData.accommodation ? `accommodation: ${formData.accommodation}` : '',
      formData.food ? `food: ${formData.food}` : '',
      formData.effort ? `effort: ${formData.effort}` : '',
      formData.dietary.length > 0 ? `dietary: ${formData.dietary.join(', ')}` : '',
    ].filter(Boolean).join(' | ');

    submitMutation.mutate({
      answers: quizAnswersArray,
      budget: formData.budget,
      departure: formData.departure,
      days: durationMap[formData.duration] || 7,
      leaveDate: getDateString(),
      companions: formData.companions,
      constraints: enrichedConstraints,
    });
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

  const Nav = () => (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 md:px-8 md:py-4 flex items-center justify-between gap-2 backdrop-blur-xl transition-colors duration-300" style={{ background: 'var(--nav-bg)', borderBottom: '1px solid var(--nav-border)' }}>
      <Link href="/" className="flex items-center gap-2.5 no-underline text-[var(--text-primary)]" data-testid="link-home">
        <MindRouteLogo />
        <span className="font-serif text-[18px]">MindRoute</span>
      </Link>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <LangDropdown />
        <Link href="/" className="hidden sm:inline-flex px-4 py-[7px] border border-[var(--border-input)] text-[var(--text-secondary)] rounded-full text-[13px] no-underline hover:border-[#E94560] hover:text-[#E94560] transition-all bg-transparent cursor-pointer" data-testid="link-exit">
          {t('nav.saveExit')}
        </Link>
        <Link href="/" className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-input)] text-[var(--text-secondary)] no-underline hover:border-[#E94560] hover:text-[#E94560] transition-all" data-testid="link-exit-mobile">
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>
    </nav>
  );

  const TopProgressBar = () => (
    <div className="fixed top-[57px] left-0 right-0 z-[99] pt-10 pb-4 px-4 md:px-8 transition-colors duration-300" style={{ background: 'var(--surface)' }}>
      <div className="relative flex items-center justify-center max-w-[700px] mx-auto">
        <span className="absolute left-0 text-[11px] font-bold tracking-[2px] uppercase text-[#E94560] hidden sm:block" data-testid="text-section-label">
          {currentQ?.section}
        </span>
        <div className="flex items-center gap-[6px] w-full max-w-[320px]">
          {Array.from({ length: 7 }).map((_, i) => (
            <button
              key={i}
              onClick={() => i < step && goToStep(i)}
              data-testid={`progress-step-${i + 1}`}
              className="flex-1 border-none p-0 rounded-full transition-all duration-500"
              style={{
                height: i === step ? 7 : 5,
                background: i <= step ? '#E94560' : 'var(--border-subtle)',
                opacity: i < step ? 0.5 : 1,
                cursor: i < step ? 'pointer' : 'default',
                boxShadow: i === step ? '0 0 10px rgba(233,69,96,0.35)' : 'none'
              }}
            />
          ))}
        </div>
        <span className="absolute right-0 text-[14px] text-[var(--text-secondary)] font-semibold tabular-nums" data-testid="text-step-counter">
          {step + 1}<span className="text-[var(--text-muted)] font-normal">/7</span>
        </span>
      </div>
    </div>
  );

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
          <svg viewBox="0 0 120 120" fill="none" className={`w-[280px] h-[280px] md:w-[500px] md:h-[500px] ${theme === "dark" ? "opacity-[0.09]" : "opacity-[0.04]"}`}>
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
          <div className="h-[320px] w-[320px] rounded-full blur-3xl opacity-80" style={{ background: theme === "dark" ? "radial-gradient(circle, rgba(233,69,96,0.28), transparent 70%)" : "radial-gradient(circle, rgba(233,69,96,0.18), transparent 70%)", animation: "splitPulse 7s ease-in-out infinite" }} />
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center px-4 md:px-8 pt-[88px] pb-10 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-center w-full max-w-[1080px]"
          >
            <span className="inline-flex items-center gap-1.5 px-3.5 py-[5px] rounded-full text-[11px] font-semibold text-[#E94560] uppercase tracking-[2.5px] mb-6 border border-[rgba(233,69,96,0.16)]" style={{ background: splitBadgeBg }}>
              {t('split.label')}
            </span>

            <h1 className="font-serif text-[clamp(34px,5vw,62px)] leading-[1.06] tracking-tight mb-4 text-[var(--text-primary)] max-w-[820px] mx-auto">
              <span dangerouslySetInnerHTML={{ __html: t('split.title') }} />
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
                className="relative overflow-hidden bg-[var(--surface-card)] border border-[var(--border-input)] rounded-[28px] p-7 md:p-9 xl:p-10 text-left cursor-pointer transition-all duration-500 hover:border-[#E94560] hover:-translate-y-2 hover:scale-[1.01] group isolate h-auto"
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
                className="relative overflow-hidden bg-[var(--surface-card)] border border-[var(--border-input)] rounded-[28px] p-7 md:p-9 xl:p-10 text-left cursor-pointer transition-all duration-500 hover:border-[#E94560] hover:-translate-y-2 hover:scale-[1.01] group isolate h-auto"
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

        <footer className="relative z-10 px-4 md:px-8 pb-6 md:pb-8 flex items-center justify-between gap-4 flex-wrap">
          <span className="text-[12px] md:text-[13px] text-[var(--text-muted)] font-light italic max-w-[840px] rounded-full px-4 py-3 border border-[var(--border-input)]" style={{ background: splitQuoteBg }}>
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
        `}</style>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] min-h-screen max-w-[1400px] mx-auto" style={{ paddingTop: 88 }}>

          {/* MAIN FORM */}
          <main className="relative py-10 px-6 sm:px-12 xl:px-16 pb-[120px]">
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
                      className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]"
                      style={{ background: sidePanelBg }}
                      onFocus={() => setFormFocus('budget')}
                    >
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.budget')}</h3>
                      <p className="text-[12px] text-[var(--text-muted)] mb-4">{t('form.budgetSub')}</p>
                      <div className="flex flex-wrap gap-3">
                        {[['low', t('form.budgetLow')], ['medium', t('form.budgetMed')], ['high', t('form.budgetHigh')], ['unlimited', t('form.budgetUnlimited')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.budget === val} onClick={() => setFormData(p => ({ ...p, budget: val }))} testId={`budget-${val}`} />
                        ))}
                      </div>
                    </div>

                    {/* Date + Durata */}
                    <div
                      className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]"
                      style={{ background: sidePanelBg }}
                      onFocus={() => setFormFocus('dates')}
                    >
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.when')}</h3>
                      <p className="text-[12px] text-[var(--text-muted)] mb-4">{t('form.whenSub')}</p>
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
                          <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.duration')}</h3>
                          <div className="flex flex-wrap gap-2.5 mt-3">
                            {[['weekend', t('form.durationWeekend')], ['week', t('form.durationWeek')], ['10-14', t('form.duration1014')], ['long', t('form.durationLong')]].map(([val, label]) => (
                              <FormChip key={val} label={label} selected={formData.duration === val} onClick={() => setFormData(p => ({ ...p, duration: val }))} testId={`duration-${val}`} />
                            ))}
                          </div>
                        </div>
                        <div onFocus={() => setFormFocus('companions')}>
                          <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.companions')}</h3>
                          <div className="flex flex-wrap gap-2.5 mt-3">
                            {[['solo', t('form.solo')], ['couple', t('form.partner')], ['friends', t('form.friends')], ['family', t('form.family')]].map(([val, label]) => (
                              <FormChip key={val} label={label} selected={formData.companions === val} onClick={() => setFormData(p => ({ ...p, companions: val }))} testId={`companions-${val}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Partenza */}
                    <div
                      className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]"
                      style={{ background: sidePanelBg }}
                      onFocus={() => setFormFocus('departure')}
                    >
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.departure')}</h3>
                      <input type="text" data-testid="input-departure" value={formData.departure} onChange={e => setFormData(p => ({ ...p, departure: e.target.value }))} placeholder={t('form.departurePlaceholder')}
                        className="w-full mt-3 px-5 py-4 bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-2xl text-[15px] text-[var(--text-primary)] outline-none focus:border-[#E94560] focus:shadow-[0_4px_20px_rgba(233,69,96,0.06)] placeholder:text-[var(--text-muted)] placeholder:font-light transition-all" />
                    </div>

                  </div>
                )}

                {formStep === 2 && (
                  <div className="space-y-6">

                    <div className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('accommodation')}>
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.accommodation')}</h3>
                      <p className="text-[12px] text-[var(--text-muted)] mb-4">{t('form.accommodationSub')}</p>
                      <div className="flex flex-wrap gap-3">
                        {[['hostel', t('form.accHostel')], ['budget', t('form.accBudget')], ['mid', t('form.accMid')], ['boutique', t('form.accBoutique')], ['luxury', t('form.accLuxury')], ['mix', t('form.accMix')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.accommodation === val} onClick={() => setFormData(p => ({ ...p, accommodation: val }))} testId={`acc-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('food')}>
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.food')}</h3>
                      <p className="text-[12px] text-[var(--text-muted)] mb-4">{t('form.foodSub')}</p>
                      <div className="flex flex-wrap gap-3">
                        {[['street', t('form.foodStreet')], ['budget', t('form.foodBudget')], ['mid', t('form.foodMid')], ['foodie', t('form.foodFoodie')], ['mix', t('form.foodMix')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.food === val} onClick={() => setFormData(p => ({ ...p, food: val }))} testId={`food-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('effort')}>
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.effort')}</h3>
                      <p className="text-[12px] text-[var(--text-muted)] mb-4">{t('form.effortSub')}</p>
                      <div className="flex flex-wrap gap-3">
                        {[['low', t('form.effortLow')], ['normal', t('form.effortNormal')], ['high', t('form.effortHigh')], ['extreme', t('form.effortExtreme')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.effort === val} onClick={() => setFormData(p => ({ ...p, effort: val }))} testId={`effort-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]" style={{ background: sidePanelBg }}>
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.dietary')}</h3>
                      <p className="text-[12px] text-[var(--text-muted)] mb-4">{t('form.dietarySub')}</p>
                      <div className="flex flex-wrap gap-3">
                        {[['none', t('form.dietNone')], ['vegetarian', t('form.dietVegetarian')], ['vegan', t('form.dietVegan')], ['gluten', t('form.dietGluten')], ['lactose', t('form.dietLactose')], ['halal', t('form.dietHalal')], ['kosher', t('form.dietKosher')], ['allergies', t('form.dietAllergies')]].map(([val, label]) => (
                          <FormChip key={val} label={label} selected={formData.dietary.includes(val)} onClick={() => toggleDietary(val)} testId={`diet-${val}`} />
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[20px] border-l-4 border-l-[#E94560] border border-[var(--border-input)] p-6 transition-all hover:shadow-[0_4px_24px_rgba(233,69,96,0.06)]" style={{ background: sidePanelBg }} onFocus={() => setFormFocus('constraints')}>
                      <h3 className="text-[15px] font-semibold mb-1 text-[var(--text-primary)]">{t('form.constraints')}</h3>
                      <p className="text-[12px] text-[var(--text-muted)] mb-4">{t('form.constraintsSub')}</p>
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

                <div className="flex items-center justify-between pt-4">
                  <button type="button" onClick={goBack} data-testid="button-form-back"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[var(--text-secondary)] text-[14px] bg-transparent border border-transparent cursor-pointer rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] hover:border-[var(--border-input)] transition-all">
                    <ArrowLeft className="w-4 h-4" /> {t('q.back')}
                  </button>
                  {formStep === 1 ? (
                    <button type="button" onClick={() => { if (!canProceedFormStep1()) { toast({ title: t('form.fillAll') || "Compila tutti i campi obbligatori", variant: "destructive" }); return; } setFormStep(2); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#E94560] text-white rounded-full font-semibold text-[15px] border-none cursor-pointer shadow-[0_8px_26px_rgba(233,69,96,0.22)] hover:bg-[#D13A52] hover:-translate-y-0.5 transition-all group">
                      {t('q.continue')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ) : (
                    <button type="button" onClick={handleDiscoverClick} data-testid="button-submit"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-[#E94560] text-white rounded-full font-semibold text-[15px] border-none cursor-pointer shadow-[0_8px_26px_rgba(233,69,96,0.22)] hover:bg-[#D13A52] hover:-translate-y-0.5 transition-all group">
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
  const renderQuestionInput = () => {
    if (!currentQ) return null;

    if (currentQ.type === 'text') {
      return (
        <div>
          <textarea
            ref={textareaRef}
            data-testid="input-answer"
            placeholder={currentQ.placeholder}
            value={answers[step] || ''}
            onChange={(e) => setAnswers(prev => ({ ...prev, [step]: e.target.value }))}
            className="w-full min-h-[150px] p-5 md:p-6 text-[15px] leading-[1.85] text-[var(--text-primary)] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[22px] resize-none outline-none transition-all duration-350 shadow-[0_2px_16px_rgba(26,26,46,0.03)] focus:border-[#E94560] focus:shadow-[0_6px_32px_rgba(233,69,96,0.08),0_0_0_4px_rgba(233,69,96,0.04)] placeholder:text-[var(--text-muted)] placeholder:font-light"
          />
          <div className="flex justify-between mt-2 text-[12px] text-[var(--text-muted)]">
            <span>{(currentQ as TextQuestion).optional ? t('q.optional') : t('q.writeTrue')}</span>
          </div>
        </div>
      );
    }

    if (currentQ.type === 'chips') {
      const q = currentQ as ChipsQuestion;
      const selected = chipSelections[step] || [];
      const isPathBQ1 = selectedPath === 'b' && step === 0;
      const isPathBType = selectedPath === 'b' && step === 1;
      const isPathBMoment = selectedPath === 'b' && step === 2;
      const isPathBFeeling = selectedPath === 'b' && step === 5;
      const isPathBAvoid = selectedPath === 'b' && step === 6;

      let addendumPlaceholder = q.addendum;
      if (q.addendum) {
        if (selected[0]) {
          if (isPathBType) {
            addendumPlaceholder = getPlaceholderForTravelType(selected[0]);
          } else if (isPathBMoment) {
            addendumPlaceholder = getPlaceholderForMoment(selected[0]);
          } else if (isPathBFeeling) {
            addendumPlaceholder = getPlaceholderForEmotion(selected[0]);
          } else if (isPathBAvoid) {
            addendumPlaceholder = getPlaceholderForAvoid(selected[0]);
          }
        }
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
                className={`px-5 md:px-6 py-3.5 rounded-full text-[14px] md:text-[15px] border-[1.5px] transition-all duration-300 cursor-pointer select-none ${selected.includes(opt)
                  ? 'border-[#E94560] bg-[#E94560] text-white font-medium shadow-[0_4px_20px_rgba(233,69,96,0.15)] scale-[1.02]'
                  : 'border-[var(--border-input)] text-[var(--text-secondary)] bg-[var(--surface-card)] hover:border-[#E94560] hover:text-[var(--text-primary)] hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(233,69,96,0.08)]'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {q.max && (
            <div className="text-left mt-4 text-[13px] text-[var(--text-muted)] max-w-[640px] mx-auto">
              <span className="text-[#E94560] font-semibold">{selected.length}</span>/{q.max} {t('q.selected')}
            </div>
          )}
          {isPathBQ1 && selected.length > 0 && (
            <div className="mt-5 p-4 md:p-5 bg-[var(--surface-card)] border border-[var(--border-input)] rounded-[22px] transition-all duration-300 max-w-[640px] mx-auto">
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
                className="w-full px-4 py-3 bg-[var(--surface)] border border-[var(--border-input)] rounded-xl text-[14px] text-[var(--text-primary)] outline-none focus:border-[#E94560] focus:shadow-[0_2px_12px_rgba(233,69,96,0.06)] placeholder:text-[var(--text-muted)] placeholder:font-light transition-all"
              />
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

    if (currentQ.type === 'images') {
      const isPathBAtmosphere = selectedPath === 'b' && step === 3;
      return (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[720px] mx-auto">
            {currentQ.options.map(opt => {
              const isSelected = imageSelections.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  data-testid={`image-${opt.value}`}
                  onClick={() => selectImage(opt.value)}
                  className={`relative rounded-[18px] overflow-hidden cursor-pointer border-[3px] transition-all duration-400 shadow-[0_4px_24px_rgba(26,26,46,0.07)] group text-left ${isSelected
                    ? 'border-[#E94560] shadow-[0_8px_40px_rgba(233,69,96,0.15)]'
                    : 'border-transparent hover:border-[rgba(233,69,96,0.35)] hover:shadow-[0_14px_48px_rgba(26,26,46,0.14)] hover:-translate-y-[5px]'
                    }`}
                >
                  <img src={opt.src} alt={opt.label} loading="eager"
                    className={`w-full h-[220px] md:h-[260px] object-cover block transition-all duration-700 ${isSelected ? 'scale-[1.03]' : 'group-hover:scale-[1.08] group-hover:brightness-[1.08] group-hover:saturate-[1.12]'}`}
                  />
                  <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${isSelected ? 'bg-gradient-to-b from-[rgba(233,69,96,0.06)] to-[rgba(233,69,96,0.22)]' : 'bg-gradient-to-b from-transparent via-transparent to-[rgba(0,0,0,0.5)]'}`} />
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white z-[2]">
                    <span className="text-[18px] font-semibold tracking-[0.01em]">{opt.label}</span>
                    <small className="block text-[12px] font-light opacity-85 mt-1 leading-[1.45] max-w-[26ch]">{opt.sub}</small>
                  </div>
                  <div className={`absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#E94560] flex items-center justify-center shadow-[0_4px_16px_rgba(233,69,96,0.35)] z-[3] transition-all duration-400 ${isSelected ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-[0.3] -rotate-45'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                    <Check className="w-[15px] h-[15px] text-white" strokeWidth={3} />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="text-left mt-4 text-[13px] text-[#A09BA8] transition-all max-w-[720px] mx-auto" data-testid="text-img-counter">
            {imageSelections.length > 0 ? (
              <><span className="text-[#E94560] font-semibold">{imageSelections.length}</span>/2 {t('q.selected')}</>
            ) : (
              t('q.selectImages')
            )}
          </div>
          {isPathBAtmosphere && imageSelections.length > 0 && (
            <div className="mt-5 max-w-[720px] mx-auto">
              <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E94560] inline-block" />
                {t('b.q4.addendum') || "Cosa ti attira di questa atmosfera? (opzionale)"}
              </p>
              <textarea
                data-testid="input-atmosphere-addendum"
                placeholder={getPlaceholderForAtmosphere(imageSelections[0])}
                value={answers[`${step}_addendum`] || ''}
                onChange={(e) => setAnswers(prev => ({ ...prev, [`${step}_addendum`]: e.target.value }))}
                className="w-full p-4 md:p-5 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface-card)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[84px] focus:border-[#E94560] focus:shadow-[0_2px_12px_rgba(233,69,96,0.06)] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic"
              />
            </div>
          )}
        </>
      );
    }

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
            className="w-full max-w-[640px] mx-auto mt-6 p-4 md:p-5 text-[14px] leading-[1.7] text-[var(--text-primary)] bg-[var(--surface)] border-[1.5px] border-[var(--border-input)] rounded-[18px] resize-none outline-none min-h-[84px] focus:border-[#E94560] focus:shadow-[0_2px_12px_rgba(233,69,96,0.06)] placeholder:text-[var(--text-muted)] placeholder:font-light placeholder:italic"
          />
        </>
      );
    }

    return null;
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

    return (
      <div className="mt-1">
        <div className="text-[10px] font-semibold tracking-[2px] uppercase text-[#E94560] mb-2.5 opacity-65">{t('sidebar.profileSoFar')}</div>
        {entries.map((entry, i) => (
          <div
            key={entry.idx}
           className="px-4 py-3 bg-[var(--surface)] rounded-[12px] mb-2 text-[13px] text-[var(--text-secondary)] leading-[1.5] font-light border-l-2 border-[#E94560] opacity-55"
            style={{ animation: `sidebarIn 0.3s ease ${i * 0.06}s both` }}
          >
            <b className="font-medium text-[var(--text-primary)] text-[10px] tracking-[0.5px] uppercase block mb-0.5">Q{entry.idx + 1} - {entry.section}</b>
            {entry.text}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen overflow-hidden transition-colors duration-300" style={{ background: 'var(--surface)' }}>
      <div className="fixed inset-x-0 top-[84px] h-[340px] pointer-events-none z-0 opacity-90" style={{ background: profilingStageGlow }} />
      <svg className="fixed inset-0 w-full h-full pointer-events-none z-0" preserveAspectRatio="none" viewBox="0 0 1440 900">
        <path d="M-20 180 C 200 120, 400 280, 620 200 S 900 80, 1100 220 S 1350 340, 1460 180" fill="none" stroke="#E94560" strokeWidth="1" opacity="0.04" />
        <path d="M-20 400 C 180 340, 350 500, 580 420 S 820 300, 1050 440 S 1300 560, 1460 400" fill="none" stroke="#E94560" strokeWidth="1" opacity="0.035" />
        <path d="M-20 650 C 220 590, 440 720, 660 640 S 920 520, 1140 660 S 1380 770, 1460 650" fill="none" stroke="#E94560" strokeWidth="1" opacity="0.03" />
      </svg>

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
<div className="grid grid-cols-1 lg:grid-cols-[60px_minmax(0,1fr)_360px] min-h-screen gap-0 w-full max-w-[1600px] mx-auto px-2" style={{ paddingTop: 120 }}>
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
                    : 'bg-[var(--surface-card)] text-[var(--text-muted)] border-[1.5px] border-[var(--border-input)]'
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
                <div className={`w-0.5 h-7 rounded-sm transition-all duration-500 ${i < step ? 'bg-[#E94560] opacity-35' : 'bg-[#EDEBE8]'}`} />
              )}
            </div>
          ))}
        </aside>
     <main className="relative py-8 px-4 pb-[120px] w-full flex items-center justify-center">
   
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 32, scale: 0.97, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-20 rounded-[30px] border border-[var(--border-input)] p-6 sm:p-8 md:p-9 xl:p-10 w-full max-w-[820px]"
              style={{ background: questionPanelBg, boxShadow: questionPanelShadow }}
            >
              <div className="flex items-start justify-between gap-4 mb-5">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-[6px] bg-[rgba(233,69,96,0.07)] rounded-full text-[11px] font-semibold text-[#E94560] uppercase tracking-[2.5px] mb-4 border border-[rgba(233,69,96,0.14)]">
                    <Info className="w-3 h-3" />
                    {t('q.label')} {String(step + 1).padStart(2, '0')}
                  </span>

                  <h1 className="font-serif text-[clamp(30px,4vw,44px)] leading-[1.12] tracking-tight mb-3 text-[var(--text-primary)] max-w-[12ch]">
                    <span dangerouslySetInnerHTML={{
                      __html: currentQ.text.replace(/<em>/g, '<em class="italic text-[#E94560]" style="font-style:italic">')
                    }} />
                  </h1>

                  <p className="text-[15px] md:text-[17px] text-[var(--text-secondary)] font-light italic leading-[1.8] max-w-[44ch]">
                    {currentQ.hint}
                  </p>
                </div>

                <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--text-muted)] font-medium">{currentQ.section}</span>
                  <span className="rounded-full px-3 py-1.5 text-[12px] text-[var(--text-secondary)] border border-[var(--border-input)]" style={{ background: subtlePanelBg }}>
                    {step + 1} / {questions.length}
                  </span>
                </div>
              </div>

              {/* Background contestuale sfocato */}
{currentQ.type === 'chips' && (
  <div
    className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[30px]"
    style={{
      opacity: (chipSelections[step] || []).length > 0 ? 0.13 : 0,
      transition: 'opacity 1s ease'
    }}
  >
    <img
      src={getQuestionBackground(chipSelections[step] || [])}
      alt=""
      className="h-full w-full object-cover"
      style={{ filter: 'blur(18px)', transform: 'scale(1.1)' }}
    />
  </div>
)}

<div className="rounded-[24px] border border-[var(--border-input)] p-5 md:p-6 max-w-[640px] mx-auto" style={{ background: subtlePanelBg }}>
  {renderQuestionInput()}
</div>

              <div className="flex items-center justify-between mt-7 gap-4 flex-wrap max-w-[640px] mx-auto">
                <button
                  onClick={goBack}
                  data-testid="button-back"
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[var(--text-secondary)] text-[14px] bg-transparent border border-transparent cursor-pointer rounded-full hover:text-[var(--text-primary)] hover:bg-[var(--surface-alt)] hover:border-[var(--border-input)] transition-all"
                >
                  <ArrowLeft className="w-4 h-4" /> {t('q.back')}
                </button>
                <button
                  onClick={handleNext}
                  disabled={!canContinue()}
                  data-testid="button-continue"
                  className="inline-flex items-center gap-2 px-[34px] py-[15px] bg-[#E94560] text-white rounded-full font-semibold text-[15px] border-none cursor-pointer shadow-[0_8px_26px_rgba(233,69,96,0.22)] hover:bg-[#D13A52] hover:-translate-y-0.5 hover:shadow-[0_12px_34px_rgba(233,69,96,0.3)] disabled:bg-[#ccc] disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none transition-all group"
                >
                  {t('q.continue')}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:enabled:translate-x-1" />
                </button>
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
          <div className="border border-[var(--border-input)] rounded-[24px] p-6 hover:shadow-[0_4px_20px_rgba(233,69,96,0.05)] transition-all" style={{ animation: 'sidebarIn 0.5s ease 0.15s both', background: sidePanelBg }}>
            <div className="flex items-center gap-2 mb-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <HelpCircle className="w-4 h-4 text-[#E94560] shrink-0" />
              {t('sidebar.whyThis')}
            </div>
            <p className="text-[14px] text-[var(--text-secondary)] leading-[1.8] font-light">{currentQ.why}</p>
          </div>

          <div className="border border-[var(--border-input)] rounded-[24px] p-6 hover:shadow-[0_4px_20px_rgba(233,69,96,0.05)] transition-all" style={{ animation: 'sidebarIn 0.5s ease 0.25s both', background: sidePanelBg }}>
            <div className="flex items-center gap-2 mb-2 text-[13px] font-semibold text-[var(--text-primary)]">
              <MapPin className="w-4 h-4 text-[#E94560] shrink-0" />
              {t('sidebar.mapping')}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {currentQ.tags.map(tag => (
                <span key={tag} className="text-[10px] px-3 py-1 rounded-full bg-[rgba(233,69,96,0.07)] text-[#E94560] font-semibold tracking-[0.2px]">{tag}</span>
              ))}
            </div>
          </div>

          {renderProfileSoFar()}

          <div className="flex items-start gap-2 p-3.5 rounded-xl text-[11px] text-[var(--text-muted)] leading-[1.5] border border-[var(--border-input)]" style={{ animation: 'sidebarIn 0.5s ease 0.35s both', background: subtlePanelBg }}>
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {t('sidebar.privacy')}
          </div>
        </aside>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 hidden sm:flex items-center gap-2 text-[12px] text-[var(--text-muted)] opacity-40 z-50">
        {t('q.pressEnter')} <span className="inline-flex px-2 py-[3px] bg-[var(--surface-card)] border border-[var(--border-input)] rounded text-[11px] font-semibold text-[var(--text-secondary)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">Enter</span> {t('q.toContinue')}
      </div>
    </div>
  );
}










