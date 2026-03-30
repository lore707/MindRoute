import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { getStoredDestinations } from "@/hooks/use-profiling";
import { type Destination } from "@shared/schema";
import { useI18n } from "@/lib/i18n";

export default function Destinations() {
  const { t } = useI18n();
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

      const messages = [
        "Analizzo il tuo profilo psicologico...",
        "Scelgo la destinazione perfetta per te...",
        "Costruisco il Giorno 1 e 2...",
        "Costruisco il Giorno 3 e 4...",
        "Costruisco il Giorno 5 e 6...",
        "Aggiungo il Giorno 7 e i dettagli pratici...",
        "Aggiungo i link di prenotazione...",
        "Cerco le immagini perfette...",
        "Quasi pronto...",
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
    <div className="container max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-20">
      <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-serif font-bold"
          data-testid="text-dest-title"
        >
          {t("dest.title")}
        </motion.h2>
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
            className={`
              group relative flex flex-col h-full bg-[var(--surface-card)] rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer
              ${selectedId === dest.id ? "border-primary ring-1 ring-primary" : "border-[var(--border-subtle)] shadow-sm hover:shadow-xl hover:-translate-y-1"}
            `}
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
                <h4 className="text-[10px] font-sans font-bold text-primary uppercase tracking-[2px]">
                  {t("dest.why")}
                </h4>
                <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                  {dest.whyYours}
                </p>
              </div>

              <div className="p-5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                <h4 className="text-[10px] font-sans font-bold text-foreground uppercase tracking-[2px] mb-2">
                  {t("dest.experience")}
                </h4>
                <p className="text-foreground/80 font-serif italic text-[15px] leading-relaxed">
                  "{dest.experiencePreview}"
                </p>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[10px] font-sans font-bold text-foreground uppercase tracking-[2px] mb-2">
                  {t("dest.practical")}
                </h4>
                <p className="text-muted-foreground font-sans text-xs leading-relaxed">
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
              className="btn-primary group px-8 py-4 text-base md:px-12 md:py-5 md:text-lg shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {streamMessage || "Creo il tuo itinerario..."}
                </>
              ) : (
                <>
                  {t("dest.choose")} {selectedName?.split(",")[0]}{" "}
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
