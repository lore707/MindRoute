import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { getStoredDestinations } from "@/hooks/use-profiling";
import { type Destination } from "@shared/schema";
import { useI18n } from "@/lib/i18n";
import { useTraitRecognition } from "@/hooks/use-trait-recognition";
import { RecognitionBanner } from "@/components/RecognitionBanner";
import { unsplashSized } from "@/lib/img";
import { pressable } from "@/lib/pressable";
import { getFlow, setPendingGen, getPendingGen, clearPendingGen } from "@/lib/flow-storage";
import { track } from "@/lib/analytics";
import { FlowNav } from "@/components/FlowNav";
import { GenerationRitual } from "@/components/GenerationRitual";

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

  // ── Ripresa dopo ricarica/back durante la generazione ──────────────────────
  // Se troviamo un marker "generazione in corso", mostriamo subito la schermata
  // di attesa e facciamo polling del risultato: il giro LLM lato server è
  // arrivato comunque a salvare su DB (o ci sta arrivando), quindi appena
  // l'itinerario esiste navighiamo. L'utente non perde nulla.
  useEffect(() => {
    const pending = getPendingGen();
    if (!pending) return;
    let alive = true;
    setIsGenerating(true);
    setGenHeroUrl(pending.heroUrl || "");
    setGenDestName(pending.destinationName || "");
    setGenMessage(lang === "it" ? "Riprendo il tuo itinerario…" : "Resuming your itinerary…");

    const startedAt = Date.now();
    const MAX_MS = 360_000; // 6 min: le generazioni reali durano 2-3.5 min — a 2.5 il poller dichiarava "interrotta" itinerari che stavano arrivando
    const tick = async () => {
      if (!alive) return;
      try {
        const r = await fetch(`/api/itinerary/${pending.destinationId}`);
        if (alive && r.ok) {
          const data = await r.json();
          if (data?.id) {
            clearPendingGen();
            setLocation(`/itinerary/${data.id}`);
            return;
          }
        }
      } catch { /* rete instabile: riprova al prossimo tick */ }
      if (!alive) return;
      if (Date.now() - startedAt > MAX_MS) {
        clearPendingGen();
        setIsGenerating(false);
        setGenError(lang === "it" ? "Generazione interrotta. Riprova." : "Generation interrupted. Try again.");
        return;
      }
      timer = window.setTimeout(tick, 3000);
    };
    let timer = window.setTimeout(tick, 1500);
    return () => { alive = false; window.clearTimeout(timer); };
  }, [lang, setLocation]);

  // Click su una card = genera subito l'itinerario per quella meta.
  const handleSelect = (destId: number) => {
    if (isGenerating) return;
    setSelectedId(destId);
    generateItinerary(destId);
  };


const generateItinerary = async (destId: number) => {
    const selectedDest = destinations.find((d) => d.id === destId);
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

      // generate_itinerary_started — al clic di generazione, prima del fetch.
      track("generate_itinerary_started", {
        destination: selectedDest.name,
        days: profilingInput.days,
        budget: profilingInput.budget,
        travel_style: profilingInput.travelStyle,
      });

      setIsGenerating(true);
      // Il racconto dell'attesa lo fa GenerationRitual (checklist di stadi
      // reali); genMessage resta solo per i progress del legacy stream.
      setGenMessage("");
      setGenHeroUrl(selectedDest.imageUrl || "");
      setGenDestName(selectedDest.name || "");
      // Marker di ripresa: se l'utente ricarica/torna indietro ora, al rientro
      // riprendiamo da qui invece di perdere la generazione.
      setPendingGen({ destinationId: destId, destinationName: selectedDest.name, heroUrl: selectedDest.imageUrl || "" });

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
              destinationId: destId,
              // Angolo del viaggio (caso "città precisa") → modella l'itinerario.
              tagline: selectedDest.tagline ?? undefined,
              whyYours: selectedDest.whyYours,
              // Tripletta proposta (nome + descrittore neutro): il server la usa
              // per il contrasto revealed-preference (scelta vs scartate). Non è
              // UX: dato che viaggia nel payload, non persistito lato destinations.
              proposed: destinations.map((d) => ({ name: d.name, neutralDescriptor: (d as any).neutralDescriptor ?? null })),
            }),
          });
          if (v2Res.ok) {
            const v2Data = await v2Res.json();
            // itinerary_generated — 1 volta per creazione riuscita (non a ogni revisita).
            track("itinerary_generated", { destination: selectedDest.name, days: profilingInput.days, schema: "v2" });
            /* checklist: nessun timer di messaggi da fermare */
            clearPendingGen();
            setLocation(`/itinerary/${v2Data.id ?? destId}?l2=1`);
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
          destinationId: destId,
          whyYours: selectedDest.whyYours,
        }),
      });

      if (!res.ok) throw new Error(lang === "it" ? "Errore nella generazione" : "Generation error");

      const reader = res.body?.getReader();
      if (!reader) throw new Error(lang === "it" ? "Streaming non disponibile" : "Streaming unavailable");

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
                // itinerary_generated — fallback v1: a stream completato.
                track("itinerary_generated", { destination: selectedDest.name, days: profilingInput.days, schema: "v1" });
                /* checklist: nessun timer di messaggi da fermare */
                clearPendingGen();
                setLocation(`/itinerary/${data.itineraryId ?? destId}?l2=1`);
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

      /* checklist: nessun timer di messaggi da fermare */
      clearPendingGen();
      setLocation(`/itinerary/${destId}?l2=1`);
    } catch (err) {
      console.error(err);
      clearPendingGen();
      setIsGenerating(false);
      setGenError(err instanceof Error && err.message ? err.message : (lang === "it" ? "Errore nella generazione. Riprova." : "Generation failed. Try again."));
    }
  };

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
                ✦ {lang === "it" ? "Costruendo il tuo itinerario" : "Building your itinerary"}
              </span>
              <h1 className="text-[34px] sm:text-4xl md:text-6xl font-serif font-bold text-white tracking-tight leading-[1.05]">
                {genDestName}
              </h1>
            </motion.div>
          </div>
        </div>
        <div className="max-w-2xl mx-auto px-5 sm:px-6 py-8 md:py-12 flex flex-col items-center gap-6 md:gap-8">
          {/* Attesa narrativa: stadi REALI della pipeline v2 (profilo →
              grounding → giornate in parallelo → prenotazioni → immagini).
              L'ultimo passo si completa solo navigando al risultato vero. */}
          <GenerationRitual
            lede={lang === "it" ? "Abbiamo capito abbastanza." : "We've understood enough."}
            sub={lang === "it" ? "Ora lasciaci costruire il viaggio che ti somiglia." : "Now let us build the trip that feels like you."}
            stepMs={18000}
            steps={lang === "it"
              ? ["Rileggo il tuo profilo", "Ancoro il piano a luoghi reali", "Costruisco le giornate in parallelo", "Collego le prenotazioni giuste", "Cerco le immagini di ogni giorno", "Rifinisco il ritmo"]
              : ["Re-reading your profile", "Anchoring the plan to real places", "Building your days in parallel", "Linking the right bookings", "Finding images for every day", "Polishing the rhythm"]}
          />
          {/* Progress del legacy stream / ripresa: messaggi REALI dal server. */}
          {genMessage && (
            <motion.p key={genMessage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-white/60 font-serif italic text-[14px] sm:text-base text-center">
              {genMessage}
            </motion.p>
          )}
          <p className="text-white/25 text-xs text-center">
            {lang === "it" ? "Gli itinerari personalizzati richiedono un paio di minuti — i posti veri chiedono tempo" : "Personalised itineraries take a couple of minutes — real places take time"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: "transparent", color: "white", minHeight: "100vh" }}>
    <FlowNav hideLang />
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
            {...pressable}
            data-testid={`card-dest-${dest.id}`}
            className="group relative flex flex-col h-full rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E94560] focus-visible:outline-offset-4"
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
                    className="inline-block mb-1.5 text-[10px] font-sans font-bold uppercase tracking-[2.5px] md:tracking-[3px] rounded-full px-2.5 py-1"
                    style={{
                      /* pill scura dietro il testo: sui cieli chiari delle foto
                         il badge nudo (soprattutto il corallo) era illeggibile */
                      color: dest.slotRole === "surprise" ? "#F2899A" : "rgba(255,255,255,0.9)",
                      background: "rgba(20,10,16,0.55)",
                      backdropFilter: "blur(4px)",
                    }}
                    data-testid={`slot-role-${dest.slotRole}`}
                  >
                    {dest.slotRole === "direct"   && t("dest.slot.direct")}
                    {dest.slotRole === "lateral"  && t("dest.slot.lateral")}
                    {dest.slotRole === "surprise" && t("dest.slot.surprise")}
                  </span>
                )}
                <h3 className="text-[22px] sm:text-2xl md:text-3xl font-serif font-bold tracking-tight leading-tight">{dest.name}</h3>
                {/* Angolo del viaggio — solo nel caso "città precisa" (3 modi di
                    vivere la stessa città). Differenzia le 3 card a parità di nome. */}
                {dest.tagline && (
                  <span className="mt-1 inline-block text-[12px] md:text-[13px] font-sans font-medium tracking-wide text-[#E94560]" data-testid="dest-tagline">
                    {dest.tagline}
                  </span>
                )}
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

              {/* CTA esplicita: la card era cliccabile ma non lo DICEVA — il
                  click più importante del funnel restava senza affordance.
                  Div, non button: l'azione è il click sulla card (evita
                  interactive annidato). */}
              <div
                className="mt-4 flex items-center justify-center gap-2 rounded-full py-3 text-[13px] font-semibold transition-all duration-300 group-hover:bg-[#E94560] group-hover:text-white"
                style={{ border: "1px solid rgba(233,69,96,0.55)", color: "#F2899A" }}
              >
                {t("dest.cta")} <span aria-hidden>→</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

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
