/* SharedItinerary.tsx
 * ─────────────────────────────────────────────────────────────
 * Vista pubblica read-only di un itinerario condiviso (/i/:token).
 * Nessun login, nessun dato personale: legge da GET /api/share/:token
 * (il server rimuove userId e non allega il profilo del quiz). Rende
 * ItineraryRedesign in modalità readOnly — niente Personalizza/checklist
 * personale/salvataggi — ma tiene i link di prenotazione (monetizzazione)
 * e un CTA "Ricomincia" che riporta al sito. */

import { useEffect } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
// CSS dell'itinerario (ItineraryRedesign→ItineraryCinematic), code-split qui.
import "@/styles/itinerary-redesign.css";
import "@/styles/itinerary-cinematic.css";
import { ItineraryRedesign } from "@/components/ItineraryRedesign";
import { mapItineraryToCinematic, buildAffiliateUrls, detectRegion } from "@/pages/Itinerary";

export default function SharedItinerary() {
  const [, params] = useRoute("/i/:token");
  const token = params?.token;
  const { t, lang, setLang } = useI18n();

  const { data: itinerary, isLoading, error } = useQuery<any>({
    queryKey: ["/api/share", token],
    queryFn: async () => {
      const r = await fetch(`/api/share/${token}`);
      if (!r.ok) throw new Error("not found");
      return r.json();
    },
    enabled: !!token,
  });

  // Lingua bloccata sul contenuto (vedi Itinerary.tsx): forza la UI sulla
  // lingua in cui l'itinerario è stato generato, effimero, e ripristina la
  // preferenza all'uscita. Chi apre un link condiviso vede una pagina coerente.
  useEffect(() => {
    const contentLang = itinerary?.lang;
    if (contentLang !== "it" && contentLang !== "en") return;
    const prev = (localStorage.getItem("mindroute-lang") === "it" ? "it" : "en") as "en" | "it";
    if (contentLang !== prev) setLang(contentLang, false);
    return () => { if (contentLang !== prev) setLang(prev, false); };
  }, [itinerary, setLang]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "transparent" }}>
      <div className="w-16 h-16 border-[3px] border-[#E94560] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !itinerary) return (
    <div className="container max-w-lg mx-auto py-32 text-center min-h-screen" style={{ background: "transparent" }}>
      <h2 className="text-3xl font-serif font-bold text-white mb-6">{t("itin.notfound")}</h2>
      <Link href="/" className="btn-primary">MindRoute</Link>
    </div>
  );

  const region = detectRegion(itinerary.destinationName ?? "");
  const affiliateUrls = buildAffiliateUrls(itinerary.destinationName ?? "", null, region, itinerary.topAffiliateLinks ?? {});
  const data = mapItineraryToCinematic(itinerary, t, lang as "en" | "it", affiliateUrls);

  return (
    <div className="min-h-screen" style={{ background: "transparent" }}>
      <ItineraryRedesign
        data={data}
        itinerary={itinerary}
        affiliateUrls={affiliateUrls}
        profilingInput={null}
        readOnly
        onStartOver={() => { window.location.href = "/"; }}
      />
    </div>
  );
}
