import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getStoredDestinations } from "@/hooks/use-profiling";
import { type Destination } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

export default function Destinations() {
  const { t, lang } = useI18n();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
const [isGenerating, setIsGenerating] = useState(false);
  const [genMessage, setGenMessage] = useState("");
  const [genHeroUrl, setGenHeroUrl] = useState("");
  const [genDestName, setGenDestName] = useState("");
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = getStoredDestinations();
    if (!stored || stored.length === 0) {
      setLocation("/profiling");
      return;
    }
    setDestinations(stored);
  }, [setLocation]);

  const handleSelect = (destId: number) => {
    setSelectedId(destId);
  };


const handleContinue = async () => {
    if (!selectedId) return;
    const selectedDest = destinations.find((d) => d.id === selectedId);
    if (!selectedDest) return;

    try {
      const storedInput = sessionStorage.getItem("mind_profiling_input");
      if (!storedInput) throw new Error("Profiling input non trovato");

      const profilingInput = JSON.parse(storedInput);
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
    }
  };
  const selectedName = destinations.find((d) => d.id === selectedId)?.name;

if (destinations.length === 0) return null;

  if (isGenerating) {
    return (
      <div className="min-h-screen" style={{ background: "#0a0814" }}>
        <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
          {genHeroUrl && (
            <img src={genHeroUrl} alt={genDestName} className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0814] via-[#0a0814]/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[3px] rounded-full bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/30 mb-4">
                ✦ Costruendo il tuo itinerario
              </span>
              <h1 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-tight leading-[1.05]">
                {genDestName}
              </h1>
            </motion.div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col items-center gap-8">
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
            <p className="text-white/70 font-serif italic text-lg">{genMessage}</p>
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
    <div style={{ background: "#0a0814", color: "white", minHeight: "100vh" }}>
    <div className="container max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-20">
      <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
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
          style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", fontFamily: "system-ui, sans-serif", fontWeight: 300, lineHeight: 1.7 }}
        >
          {lang === "it"
            ? "Una sicura, una inaspettata, una nel mezzo — costruite su di te."
            : "One safe, one unexpected, one in between — built around you."}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
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
            <div className="relative h-48 md:h-64 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
              <img
                src={dest.imageUrl || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80"}
                alt={dest.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute bottom-6 left-6 z-20 text-white">
                <h3 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">{dest.name}</h3>
              </div>
            </div>

            <div className="flex-1 p-5 md:p-8 flex flex-col gap-6">
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
            className="mt-16 flex justify-center"
          >
            <button
              onClick={handleContinue}
              disabled={isGenerating}
              data-testid="button-continue-dest"
              style={{
                display: "inline-flex", alignItems: "center", gap: 9,
                background: isGenerating ? "rgba(233,69,96,0.5)" : "#E94560",
                color: "white", fontSize: 15, fontWeight: 600,
                padding: "15px 36px", borderRadius: 50,
                boxShadow: "0 12px 36px rgba(233,69,96,0.28)",
                border: "none", cursor: isGenerating ? "not-allowed" : "pointer",
                fontFamily: "system-ui, sans-serif", letterSpacing: "-0.2px",
                transition: "all 0.25s ease",
              }}
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {lang === "it" ? "Creo il tuo itinerario..." : "Building your itinerary..."}
                </>
              ) : (
                <>
                  {t("dest.choose")} {selectedName?.split(",")[0]}{" "}
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
}
