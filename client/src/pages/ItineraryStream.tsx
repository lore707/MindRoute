import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";

interface StreamedDay {
  dayNumber: number;
  title: string;
  morning: string;
  lunch: string;
  afternoon: string;
  evening: string;
}

function parseSection(text: string, marker: string): string {
  const regex = new RegExp(`\\[${marker}\\]\\s*([\\s\\S]*?)(?=\\[|$)`);
  const match = text.match(regex);
  return match ? match[1].trim() : "";
}

function parseDays(text: string): StreamedDay[] {
  const days: StreamedDay[] = [];
  const dayRegex = /\[DAY_(\d+)\]([\s\S]*?)(?=\[DAY_\d+\]|\[CLOSING\]|$)/g;
  let match;
  while ((match = dayRegex.exec(text)) !== null) {
    const dayNum = parseInt(match[1]);
    const content = match[2];
    const getField = (field: string) => {
      const r = new RegExp(`${field}:\\s*(.+?)(?=\\n[A-Z][a-z]+:|$)`, "s");
      const m = content.match(r);
      return m ? m[1].trim() : "";
    };
    days.push({
      dayNumber: dayNum,
      title: getField("Title"),
      morning: getField("Morning"),
      lunch: getField("Lunch"),
      afternoon: getField("Afternoon"),
      evening: getField("Evening"),
    });
  }
  return days;
}

export default function ItineraryStream() {
  const [, params] = useRoute("/itinerary/stream/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : 0;

  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const [itineraryId, setItineraryId] = useState<number | null>(null);
  const [heroImageUrl, setHeroImageUrl] = useState<string>("");
  const [destinationName, setDestinationName] = useState<string>("");
  const streamRef = useRef("");

  useEffect(() => {
    const raw = sessionStorage.getItem("mind_streaming");
    if (!raw) { setLocation("/destinations"); return; }

    const payload = JSON.parse(raw);
    setHeroImageUrl(payload.heroImageUrl || "");
    setDestinationName(payload.destinationName || "");

    fetch("/api/itinerary/stream-narrative", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      if (!res.ok) { setIsStreaming(false); return; }
      const reader = res.body?.getReader();
      if (!reader) { setIsStreaming(false); return; }

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
              if (currentEvent === "chunk") {
                streamRef.current += data.text;
                setStreamText(streamRef.current);
              } else if (currentEvent === "done") {
                setItineraryId(data.itineraryId);
                setIsStreaming(false);
                sessionStorage.removeItem("mind_streaming");
              } else if (currentEvent === "error") {
                setIsStreaming(false);
              }
            } catch {}
          }
        }
      }
      setIsStreaming(false);
    }).catch(() => setIsStreaming(false));
  }, [id]);

  const whyYours = parseSection(streamText, "WHY_YOURS");
  const tripSummary = parseSection(streamText, "TRIP_SUMMARY");
  const highlights = parseSection(streamText, "HIGHLIGHTS");
  const closing = parseSection(streamText, "CLOSING");
  const budget = parseSection(streamText, "BUDGET");
  const packing = parseSection(streamText, "PACKING");
  const days = parseDays(streamText);

  const highlightChips = highlights
    .split(",")
    .map(h => h.trim())
    .filter(Boolean);

  return (
    <div className="min-h-screen" style={{ background: "#0a0814" }}>
      {/* Hero */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {heroImageUrl && (
          <img src={heroImageUrl} alt={destinationName} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0814] via-[#0a0814]/40 to-transparent" />
        <div className="absolute top-8 left-6 md:left-12 z-20">
          <button
            onClick={() => setLocation("/destinations")}
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
          >
            <ArrowLeft className="w-4 h-4" /> Indietro
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[3px] rounded-full bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/30 mb-4">
              {isStreaming ? "✦ Costruendo il tuo itinerario..." : "Il tuo itinerario"}
            </span>
            <h1 className="text-4xl md:text-6xl font-serif font-bold text-white tracking-tight leading-[1.05]">
              {destinationName}
            </h1>
            {tripSummary && (
              <p className="text-white/60 font-serif italic text-lg mt-3 max-w-2xl">{tripSummary}</p>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-12 pb-24 pt-8">

        {/* Streaming indicator */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 mb-8 px-4 py-3 rounded-xl"
            style={{ background: "rgba(233,69,96,0.08)", border: "1px solid rgba(233,69,96,0.2)" }}
          >
            <div className="flex gap-1">
              {[0,1,2].map(i => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#E94560]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
            <span className="text-[#E94560] text-sm font-medium">MindRoute sta scrivendo il tuo viaggio...</span>
          </motion.div>
        )}

        {/* WhyYours */}
        <AnimatePresence>
          {whyYours && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-10 p-6 md:p-8 rounded-[24px] relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, rgba(233,69,96,0.08), rgba(233,69,96,0.03))", border: "1px solid rgba(233,69,96,0.2)" }}
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#E94560] rounded-l-[24px]" />
              <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#E94560] mb-3">Perché è il tuo viaggio</p>
              <p className="font-serif italic text-xl text-white leading-relaxed">"{whyYours}"</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Highlights */}
        <AnimatePresence>
          {highlightChips.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-wrap gap-2 mb-10"
            >
              {highlightChips.map((chip, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="px-4 py-2 rounded-full text-sm font-bold text-[#E94560]"
                  style={{ background: "rgba(233,69,96,0.08)", border: "1px solid rgba(233,69,96,0.2)" }}
                >
                  {chip}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Days */}
        <div className="space-y-6 mb-12">
          {days.map((day, i) => (
            <motion.div
              key={day.dayNumber}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-[24px] overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="flex items-stretch">
                <div
                  className="flex flex-col items-center justify-center px-5 py-5 shrink-0"
                  style={{ width: "72px", background: "linear-gradient(180deg, #E94560, #c73550)" }}
                >
                  <span className="font-serif font-bold text-white text-[28px] leading-none">{day.dayNumber}</span>
                  <span className="text-[9px] uppercase tracking-[1.5px] mt-1 font-bold text-white/70">giorno</span>
                </div>
                <div className="flex-1 p-5">
                  <h3 className="font-serif font-bold text-white text-lg mb-4">{day.title}</h3>
                  <div className="space-y-3">
                    {[
                      { icon: "🌅", label: "Mattina", text: day.morning },
                      { icon: "🍽️", label: "Pranzo", text: day.lunch },
                      { icon: "☀️", label: "Pomeriggio", text: day.afternoon },
                      { icon: "🌙", label: "Sera", text: day.evening },
                    ].filter(s => s.text).map(slot => (
                      <div key={slot.label} className="flex gap-3">
                        <span className="text-lg shrink-0">{slot.icon}</span>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-white/40 mr-2">{slot.label}</span>
                          <span className="text-white/80 text-sm leading-relaxed">{slot.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Skeleton del prossimo giorno durante streaming */}
          {isStreaming && days.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="rounded-[24px] overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-4 p-5">
                <div className="w-[72px] h-16 rounded-xl" style={{ background: "rgba(233,69,96,0.15)" }} />
                <div className="flex-1 space-y-2">
                  <div className="h-4 rounded" style={{ background: "rgba(255,255,255,0.08)", width: "40%" }} />
                  <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "70%" }} />
                  <div className="h-3 rounded" style={{ background: "rgba(255,255,255,0.05)", width: "55%" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Budget e Packing — appaiono alla fine */}
        <AnimatePresence>
          {budget && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-6 rounded-[24px]"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#E94560] mb-3">💰 Budget stimato</p>
              <p className="text-white/70 text-sm leading-relaxed">{budget}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {packing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8 p-6 rounded-[24px]"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#E94560] mb-3">🎒 Cosa portare</p>
              <div className="flex flex-wrap gap-2">
                {packing.split(",").map((item, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-[12px] text-white/70" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                    {item.trim()}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Closing message + CTA */}
        <AnimatePresence>
          {closing && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <p className="font-serif italic text-xl md:text-2xl text-white/80 mb-8 max-w-2xl mx-auto">
                "{closing}"
              </p>
              {itineraryId && (
                <button
                  onClick={() => setLocation(`/itinerary/${itineraryId}`)}
                  className="px-8 py-4 rounded-2xl bg-[#E94560] text-white font-bold hover:bg-[#d63050] transition-all shadow-[0_4px_24px_rgba(233,69,96,0.25)]"
                >
                  Vedi itinerario completo con prenotazioni →
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
