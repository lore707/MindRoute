import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getStoredDestinations } from "@/hooks/use-profiling";
import { type Destination } from "@shared/schema";
import { useI18n } from "@/lib/i18n";
import { useTraitRecognition } from "@/hooks/use-trait-recognition";
import { RecognitionBanner } from "@/components/RecognitionBanner";
import { unsplashSized } from "@/lib/img";
import { getFlow } from "@/lib/flow-storage";

export default function Destinations() {
  const { t, lang } = useI18n();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [genMessage, setGenMessage] = useState("");
  const [genHeroUrl, setGenHeroUrl] = useState("");
  const [genDestName, setGenDestName] = useState("");
  const [, setLocation] = useLocation();
  const recognition = useTraitRecognition();
  // v2 è il default. Si può forzare il legacy con ?legacy=1 per debug/rollback;
  // se v2 fallisce in produzione, eseguiamo comunque un fallback transparent
  // verso /api/itinerary/generate-stream più in basso.
  const forceLegacy = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("legacy") === "1";

  useEffect(() => {
    const stored = getStoredDestinations();
    if (!stored || stored.length === 0) {
      setLocation("/profiling");
      return;
    }
    // Order by slotRole: direct → lateral → surprise. Destinazioni senza ruolo
    // (legacy/fallback) restano in fondo nell'ordine originale.
    const ROLE_ORDER: Record<string, number> = { direct: 0, lateral: 1, surprise: 2 };
    const sorted = [...stored].sort((a, b) => {
      const ra = a.slotRole ? ROLE_ORDER[a.slotRole] ?? 3 : 3;
      const rb = b.slotRole ? ROLE_ORDER[b.slotRole] ?? 3 : 3;
      return ra - rb;
    });
    setDestinations(sorted);
  }, [setLocation]);

  const handleSelect = (destId: number) => {
    setSelectedId(destId);
  };


const handleContinue = async () => {
    if (!selectedId) return;
    const selectedDest = destinations.find((d) => d.id === selectedId);
    if (!selectedDest) return;

    setGenError("");
    try {
      // sessionStorage is the fast path; if it's missing (e.g. arrived via
      // "genera dal profilo" in a fresh tab), fall back to the server, which is
      // the source of truth for the saved profiling input.
      let profilingInput: any = null;
      const storedInput = getFlow("mind_profiling_input");
      if (storedInput) {
        profilingInput = JSON.parse(storedInput);
      } else {
        const r = await fetch("/api/profiling/input");
        if (r.ok) profilingInput = await r.json();
      }
      if (!profilingInput) throw new Error(lang === "it" ? "Profilo non trovato. Rifai il quiz." : "Profile not found. Retake the quiz.");

      const currentLang = localStorage.getItem("mindroute-lang") || "en";
      const inputWithLang = { ...profilingInput, lang: currentLang };

      setIsGenerating(true);
      setGenMessage("Analizzo il tuo profilo psicologico...");
      setGenHeroUrl(selectedDest.imageUrl || "");
      setGenDestName(selectedDest.name || "");

      const messages = lang === "it" ? [
        "Analizzo il tuo profilo psicologico...",
        "Scelgo la destinazione perfetta per te...",
        "Costruisco il Giorno 1 e 2...",
        "Costruisco il Giorno 3 e 4...",
        "Costruisco il Giorno 5 e 6...",
        "Aggiungo il Giorno 7 e i dettagli pratici...",
        "Aggiungo i link di prenotazione...",
        "Cerco le immagini perfette...",
        "Quasi pronto...",
      ] : [
        "Analyzing your psychological profile...",
        "Choosing the perfect destination for you...",
        "Building Day 1 and 2...",
        "Building Day 3 and 4...",
        "Building Day 5 and 6...",
        "Adding Day 7 and practical details...",
        "Adding booking links...",
        "Finding the perfect images...",
        "Almost ready...",
      ];
      let msgIdx = 0;
      const msgInterval = setInterval(() => {
        msgIdx = Math.min(msgIdx + 1, messages.length - 1);
        setGenMessage(messages[msgIdx]);
      }, 12000);

      // Path v2 di default: endpoint non-streaming che ritorna itinerario
      // moment-based. Se fallisce (o ?legacy=1 in URL), fallback transparent al
      // legacy generate-stream più sotto. Il loading message scorre comunque
      // sull'interval — l'utente non si accorge del cambio di path.
      if (!forceLegacy) {
        try {
          const v2Res = await fetch("/api/itinerary/generate-v2", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: inputWithLang,
              destinationName: selectedDest.name,
              destinationId: selectedId,
            }),
          });
          if (v2Res.ok) {
            const v2Data = await v2Res.json();
            clearInterval(msgInterval);
            setLocation(`/itinerary/${v2Data.id ?? selectedId}`);
            return;
          }
          console.warn("[v2] endpoint returned non-2xx, falling back to legacy stream");
        } catch (err) {
          console.warn("[v2] endpoint threw, falling back to legacy stream:", err);
        }
      }

      const res = await fetch("/api/itinerary/generate-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: inputWithLang,
          destinationName: selectedDest.name,
          destinationId: selectedId,
          whyYours: selectedDest.whyYours,
        }),
      });

      if (!res.ok) throw new Error("Errore generazione");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("Streaming non disponibile");

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "progress") {
                setGenMessage(data.message);
              } else if (currentEvent === "done") {
                clearInterval(msgInterval);
                setLocation(`/itinerary/${data.itineraryId ?? selectedId}`);
                return;
              } else if (currentEvent === "error") {
                throw new Error(data.message);
              }
            } catch (e) {
              if (e instanceof Error && e.message !== "Errore generazione") {
                console.warn("Parse error", e);
              }
            }
          }
        }
      }

      clearInterval(msgInterval);
      setLocation(`/itinerary/${selectedId}`);
    } catch (err) {
      console.error(err);
      setIsGenerating(false);
      setGenError(err instanceof Error && err.message ? err.message : (lang === "it" ? "Errore nella generazione. Riprova." : "Generation failed. Try again."));
    }
  };
  const selectedName = destinations.find((d) => d.id === selectedId)?.name;

if (destinations.length === 0) return null;

  if (isGenerating) {
    return (
      <div className="min-h-screen" style={{ background: "transparent" }}>
        <div className="relative h-[50vh] min-h-[340px] md:h-[60vh] md:min-h-[400px] overflow-hidden">
          {genHeroUrl && (
            <img src={genHeroUrl} alt={genDestName} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0814] via-[#0a0814]/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6 md:p-12 z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[2.5px] md:tracking-[3px] rounded-full bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/30 mb-3 md:mb-4">
                ✦ Costruendo il tuo itinerario
              </span>
              <h1 className="text-[34px] sm:text-4xl md:text-6xl font-serif font-bold text-white tracking-tight leading-[1.05]">
                {genDestName}
              </h1>
            </motion.div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-8 md:py-12 flex flex-col items-center gap-6 md:gap-8">
          <motion.div
            key={genMessage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[#E94560]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <p className="text-white/70 font-serif italic text-[15px] sm:text-lg text-center">{genMessage}</p>
          </motion.div>
          <div className="w-full max-w-md">
            <div className="w-full h-1 rounded-full" style={{ background: "rgba(255,255,255,0.08)" }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: "linear-gradient(90deg, #E94560, #9b59b6)" }}
                initial={{ width: "5%" }}
                animate={{ width: "92%" }}
                transition={{ duration: 90, ease: "linear" }}
              />
            </div>
          </div>
          <p className="text-white/25 text-xs text-center">
            Gli itinerari personalizzati richiedono circa 90 secondi
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "transparent", color: "white", minHeight: "100vh" }}>
    <div className="container max-w-7xl mx-auto px-4 md:px-6 pt-20 md:pt-24 pb-16 md:pb-20">
      <div className="text-center max-w-3xl mx-auto mb-8 md:mb-16">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", color: "#E94560", fontFamily: "system-ui, sans-serif", marginBottom: 14 }}
        >
          {lang === "it" ? "Le tue 3 mete" : "Your 3 matches"}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="font-serif"
          style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 400, letterSpacing: "-1.5px", lineHeight: 1.05, color: "white", marginBottom: 12 }}
          data-testid="text-dest-title"
        >
          {t("dest.title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.16 }}
          className="text-[14px] sm:text-[15px]"
          style={{ color: "rgba(255,255,255,0.55)", fontFamily: "system-ui, sans-serif", fontWeight: 300, lineHeight: 1.65 }}
        >
          {lang === "it"
            ? "Tre risposte diverse a chi sei. La diretta, l'angolo laterale, la sorpresa autentica."
            : "Three different answers to who you are. The direct match, the lateral angle, the genuine surprise."}
        </motion.p>
      </div>

      <RecognitionBanner recognition={recognition} variant="compact" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 items-stretch">
        {destinations.map((dest, index) => (
          <motion.div
            key={dest.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{
              opacity: selectedId && selectedId !== dest.id ? 0.6 : 1,
              y: 0,
              scale: selectedId === dest.id ? 1.02 : 1,
            }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(dest.id)}
            data-testid={`card-dest-${dest.id}`}
            className="group relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${selectedId === dest.id ? "#E94560" : "rgba(255,255,255,0.10)"}`,
              boxShadow: selectedId === dest.id ? "0 0 0 1px rgba(233,69,96,0.3), 0 20px 50px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.35)",
            }}
          >
            <div className="relative h-52 sm:h-56 md:h-64 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
              <img
                src={unsplashSized(dest.imageUrl, 800) || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80"}
                alt={dest.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute bottom-5 left-5 md:bottom-6 md:left-6 z-20 text-white pr-5">
                {dest.slotRole && (
                  <span
                    className="inline-block mb-1.5 text-[10px] font-sans font-bold uppercase tracking-[2.5px] md:tracking-[3px]"
                    style={{
                      color: dest.slotRole === "surprise" ? "#E94560" : "rgba(255,255,255,0.75)",
                    }}
                    data-testid={`slot-role-${dest.slotRole}`}
                  >
                    {dest.slotRole === "direct"   && t("dest.slot.direct")}
                    {dest.slotRole === "lateral"  && t("dest.slot.lateral")}
                    {dest.slotRole === "surprise" && t("dest.slot.surprise")}
                  </span>
                )}
                <h3 className="text-[22px] sm:text-2xl md:text-3xl font-serif font-bold tracking-tight leading-tight">{dest.name}</h3>
              </div>
            </div>

            <div className="flex-1 p-5 md:p-8 flex flex-col gap-5 md:gap-6">
              <div className="space-y-1">
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-[2px]" style={{ color: "#E94560" }}>
                  {t("dest.why")}
                </h4>
                <p className="font-sans text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {dest.whyYours}
                </p>
              </div>

              <div className="mt-auto pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <h4 className="text-[10px] font-sans font-bold uppercase tracking-[2px] mb-2" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {t("dest.practical")}
                </h4>
                <p className="font-sans text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {dest.practicalInfo}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mt-10 md:mt-16 flex justify-center"
          >
            <button
              onClick={handleContinue}
              disabled={isGenerating}
              data-testid="button-continue-dest"
              className="inline-flex items-center justify-center gap-2 w-full sm:w-auto max-w-[420px] min-h-[52px] px-6 sm:px-9 py-3.5 sm:py-4 rounded-full font-semibold text-[14px] sm:text-[15px] tracking-tight transition-all"
              style={{
                background: isGenerating ? "rgba(233,69,96,0.5)" : "#E94560",
                color: "white",
                boxShadow: "0 12px 36px rgba(233,69,96,0.28)",
                border: "none",
                cursor: isGenerating ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="truncate">{lang === "it" ? "Creo il tuo itinerario..." : "Building your itinerary..."}</span>
                </>
              ) : (
                <>
                  <span className="truncate">{t("dest.choose")} {selectedName?.split(",")[0]}</span>
                  <ArrowRight className="w-5 h-5 shrink-0 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {genError && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-center text-[13px]"
          style={{ color: "#E94560" }}
          data-testid="text-gen-error"
        >
          {genError}
        </motion.p>
      )}
    </div>
    </div>
  );
}
