import { useState, useEffect, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useItinerary, useMapPointsPolling } from "@/hooks/use-profiling";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Wallet, Briefcase,
  ChevronDown, Share2, Printer, Clock, Compass, Sun,
  ExternalLink, Plane, Hotel, Ticket, Utensils, Star, MapPin,
  Flame, Calendar, Wind
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useI18n } from "@/lib/i18n";
import html2pdf from "html2pdf.js";

type AffiliateCfg = { icon: JSX.Element; label: string; color: string };

function detectRegion(name: string): string {
  const n = name.toLowerCase();
  if (/grecia|greece|creta|crete|cipro|cyprus|malta|croazia|croatia|montenegro|albania|turchia|turkey/.test(n)) return "mediterranean";
  if (/india|mumbai|delhi|bangalore|chennai|kolkata|jaipur|goa/.test(n)) return "india";
  if (/giappone|japan|cina|china|corea|korea|thailand|tailandia|vietnam|indonesia|bali|cambogia|cambodia|laos|myanmar|malesia|malaysia|singapore|filippine|philippines|sri lanka/.test(n)) return "asia";
  if (/messico|mexico|colombia|peru|perù|brasile|brazil|argentina|cile|chile|ecuador|bolivia|venezuela|costa rica|panama|guatemala|cuba|dominicana/.test(n)) return "latam";
  if (/marocco|morocco|egitto|egypt|kenya|tanzania|sudafrica|south africa|ghana|senegal|etiopia|ethiopia|nigeria|tunisia|algeria/.test(n)) return "africa";
  if (/italia|italy|france|francia|spagna|spain|portogallo|portugal|germania|germany|austria|svizzera|switzerland|belgio|belgium|olanda|netherlands|polonia|poland|czech|ceca|ungheria|hungary|romania|bulgaria|svezia|sweden|norvegia|norway|danimarca|denmark|finlandia|finland|irlanda|ireland|scozia|scotland|inghilterra|england|uk|londra|london|parigi|paris|barcellona|barcelona|amsterdam|berlino|berlin|vienna|praga|prague|budapest|lisbona|lisbon|madrid|roma|rome|milano|milan|napoli|naples|firenze|florence|venezia|venice/.test(n)) return "europe";
  if (/stati uniti|usa|canada|new york|los angeles|chicago|san francisco|miami|las vegas|toronto|vancouver|montreal|north america/.test(n)) return "northamerica";
  if (/australia|nuova zelanda|new zealand|fiji|sydney|melbourne|auckland|oceania/.test(n)) return "oceania";
  return "europe";
}

function getRegionLinks(region: string, links: Record<string, string>): { key: string; url: string; icon: JSX.Element; label: string; style: string }[] {
  const pill = (icon: JSX.Element, label: string, style: string, key: string) => {
    const url = links[key];
    if (!url) return null;
    return { key, url, icon, label, style };
  };

  const primary = "flex items-center gap-2 px-6 py-3.5 font-bold rounded-2xl shadow-lg text-sm text-white transition-all hover:scale-[1.02] hover:shadow-xl";
  const secondary = "flex items-center gap-2 px-5 py-3 font-bold rounded-2xl border text-sm transition-all hover:scale-[1.02]";
  const secondaryStyle = "bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20";

  const skyscanner = pill(<Plane className="w-4 h-4" />, "Cerca voli", `${primary} bg-sky-500 hover:bg-sky-400`, "skyscanner");

  const hotelName = (() => {
    const url = links["booking_hotel"] || "";
    const match = url.match(/[?&]ss=([^&]+)/);
    if (match) {
      const name = decodeURIComponent(match[1].replace(/\+/g, " "));
      return name.length > 28 ? name.substring(0, 26) + "…" : name;
    }
    return "Hotel consigliato";
  })();

  const bookingHotel = pill(<Hotel className="w-4 h-4" />, hotelName, `${primary} bg-[#E94560] hover:bg-[#d63050]`, "booking_hotel");
  const bookingSearch = pill(<Hotel className="w-4 h-4" />, "Hotel su Booking", `${primary} bg-[#E94560] hover:bg-[#d63050]`, "booking_search");
  const hotelLink = bookingHotel ?? bookingSearch;
  const gyg1 = pill(<Ticket className="w-4 h-4" />, "Prenota esperienza", `${secondary} ${secondaryStyle}`, "getyourguide_1");
  const gyg2 = pill(<Ticket className="w-4 h-4" />, "Seconda esperienza", `${secondary} ${secondaryStyle}`, "getyourguide_2");
  const tripadvisor = pill(<Star className="w-4 h-4" />, "TripAdvisor", `${secondary} ${secondaryStyle}`, "tripadvisor");
  const thefork = pill(<Utensils className="w-4 h-4" />, "Prenota ristorante", `${secondary} ${secondaryStyle}`, "thefork");
  const agoda = pill(<Hotel className="w-4 h-4" />, "Agoda", `${secondary} ${secondaryStyle}`, "agoda");
  const klook = pill(<Ticket className="w-4 h-4" />, "Klook", `${secondary} ${secondaryStyle}`, "klook");
  const viator = pill(<Ticket className="w-4 h-4" />, "Viator", `${secondary} ${secondaryStyle}`, "viator");
  const civitatis = pill(<Ticket className="w-4 h-4" />, "Civitatis", `${secondary} ${secondaryStyle}`, "civitatis");
  const hostelworld = pill(<Hotel className="w-4 h-4" />, "Hostelworld", `${secondary} ${secondaryStyle}`, "hostelworld");
  const ferryhopper = pill(<Plane className="w-4 h-4" />, "Traghetti", `${secondary} ${secondaryStyle}`, "ferryhopper");
  const rentalcars = pill(<Plane className="w-4 h-4" />, "Noleggio auto", `${secondary} ${secondaryStyle}`, "rentalcars");
  const go12 = pill(<Plane className="w-4 h-4" />, "Trasporti locali", `${secondary} ${secondaryStyle}`, "12go");
  const bookaway = pill(<Plane className="w-4 h-4" />, "Bus locali", `${secondary} ${secondaryStyle}`, "bookaway");

  const sets: Record<string, (typeof skyscanner)[]> = {
    europe: [skyscanner, hotelLink, gyg1, thefork, tripadvisor],
    mediterranean: [skyscanner, hotelLink, gyg1, ferryhopper, tripadvisor],
    northamerica: [skyscanner, hotelLink ?? bookingSearch, viator, tripadvisor, rentalcars],
    oceania: [skyscanner, hotelLink ?? bookingSearch, viator, tripadvisor, rentalcars],
    asia: [skyscanner, hotelLink ?? agoda, klook ?? gyg1, go12, tripadvisor],
    india: [skyscanner, hotelLink ?? agoda, klook ?? gyg1, viator ?? tripadvisor, tripadvisor],
    africa: [skyscanner, hotelLink, viator, tripadvisor, rentalcars],
    latam: [skyscanner, hotelLink ?? hostelworld, viator ?? civitatis, tripadvisor, bookaway],
  };

  return (sets[region] ?? sets.europe).filter(Boolean) as { key: string; url: string; icon: JSX.Element; label: string; style: string }[];
}

function AffiliateLinks({ links }: { links?: Record<string, string> }) {
  if (!links) return null;
  const entries = Object.entries(links).filter(
    ([, url]) => url && !url.includes("YOUR_") && !url.includes("SPECIFIC") && !url.includes("CITY")
  );
  if (entries.length === 0) return null;

  const cfg: Record<string, AffiliateCfg> = {
    booking_hotel: { icon: <Hotel className="w-3 h-3" />, label: "Hotel", color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white" },
    booking_search: { icon: <Hotel className="w-3 h-3" />, label: "Alloggi", color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500 hover:text-white" },
    skyscanner: { icon: <Plane className="w-3 h-3" />, label: "Voli", color: "bg-sky-500/10 text-sky-400 border-sky-500/20 hover:bg-sky-500 hover:text-white" },
    getyourguide_1: { icon: <Ticket className="w-3 h-3" />, label: "Esperienza 1", color: "bg-[#E94560]/10 text-[#E94560] border-[#E94560]/20 hover:bg-[#E94560] hover:text-white" },
    getyourguide_2: { icon: <Ticket className="w-3 h-3" />, label: "Esperienza 2", color: "bg-[#E94560]/10 text-[#E94560] border-[#E94560]/20 hover:bg-[#E94560] hover:text-white" },
    thefork: { icon: <Utensils className="w-3 h-3" />, label: "Ristorante", color: "bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500 hover:text-white" },
    tripadvisor: { icon: <Star className="w-3 h-3" />, label: "Recensioni", color: "bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500 hover:text-white" },
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {entries.map(([key, url]) => {
        const c: AffiliateCfg = cfg[key] ?? { icon: <ExternalLink className="w-3 h-3" />, label: key, color: "bg-[#E94560]/10 text-[#E94560] border-[#E94560]/20 hover:bg-[#E94560] hover:text-white" };
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full border transition-all duration-200 ${c.color}`}
          >
            {c.icon}{c.label}
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        );
      })}
    </div>
  );
}

export default function Itinerary() {
  const { t } = useI18n();
  const [, params] = useRoute("/itinerary/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : 0;
 const { data: itinerary, isLoading, error, refetch } = useItinerary(id);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([0]));

  // Polling mapPoints finché non arrivano dal background geocoding
  const hasMapPoints = itinerary?.days?.some((d: any) => d.mapPoints?.length > 0);
  const { data: mapData } = useMapPointsPolling(id, !hasMapPoints && !isLoading && !!itinerary);

  useEffect(() => {
    if (mapData?.ready) {
      refetch(); // ricarica l'itinerario con i mapPoints aggiornati
    }
  }, [mapData?.ready]);

  const peakDayIndex = itinerary?.days?.findIndex((_: any, i: number) => i === 3 || i === 4) ?? 3;

  useEffect(() => {
    if (!itinerary?.days) return;
    const defaults = new Set([0]);
    if (peakDayIndex >= 0) defaults.add(peakDayIndex);
    if (peakDayIndex + 1 < (itinerary.days?.length ?? 0)) defaults.add(peakDayIndex + 1);
    setOpenDays(defaults);
  }, [itinerary]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0814" }}>
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-[3px] border-[#E94560] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 font-serif italic text-xl animate-pulse">{t('itin.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="container max-w-lg mx-auto py-32 text-center min-h-screen" style={{ background: "#0f0a10" }}>
        <h2 className="text-3xl font-serif font-bold text-white mb-6">{t('itin.notfound')}</h2>
        <Link href="/destinations" className="btn-primary">{t('itin.return')}</Link>
      </div>
    );
  }

  const handleSavePdf = () => {
    const element = document.getElementById("itinerary-pdf-content");
    if (!element) return;

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `MindRoute-${itinerary.destinationName?.replace(/[^a-zA-Z0-9]/g, "-") ?? "itinerario"}.pdf`,
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0a0814" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css"] },
    };

    html2pdf().set(opt).from(element).save();
  };

  const links = itinerary.topAffiliateLinks ?? {};
  const region = detectRegion(itinerary.destinationName ?? "");
  const regionLinks = getRegionLinks(region, links);

  return (
    <div className="min-h-screen" style={{ background: "#0a0814" }} id="itinerary-pdf-content">
      {/* ── HERO A TUTTO SCHERMO ─────────────────────────────── */}
      <div className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {(itinerary.heroImageUrl || itinerary.imageUrl) ? (
          <img
            src={itinerary.heroImageUrl || itinerary.imageUrl}
            alt={itinerary.destinationName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a14] to-[#0a0814]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0814] via-[#0a0814]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0814]/60 via-transparent to-transparent" />

        <div className="absolute top-8 left-6 md:left-12 z-20">
          <Link
            href="/destinations"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
            data-testid="link-back-dest"
          >
            <ArrowLeft className="w-4 h-4" /> {t('itin.back')}
          </Link>
        </div>

        <div className="absolute top-8 right-6 md:right-12 z-20 flex gap-2">
          <button
            className="p-2.5 text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm rounded-full border border-white/10"
            title={t('itin.print')}
            data-testid="button-print"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            className="p-2.5 text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm rounded-full border border-white/10"
            title={t('itin.share')}
            data-testid="button-share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 z-10">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[3px] rounded-full bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/30 mb-4">
              {t('itin.label')}
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif font-bold text-white tracking-tight leading-[1.05] mb-4 max-w-4xl" data-testid="text-itin-title">
              {t('itin.trip')}<br />{itinerary.destinationName}
            </h1>
            <div className="flex items-center gap-4 text-white/50 text-sm mb-6">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {itinerary.days?.length || 7} {t('itin.experienceDays')}</span>
            </div>
            {itinerary.heroPhotographer && (
              <p className="text-white/30 text-[10px]">
                Photo by{" "}
                <a href={`${itinerary.heroPhotographerUrl}?utm_source=mindroute&utm_medium=referral`} target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">
                  {itinerary.heroPhotographer}
                </a>
                {" "}on{" "}
                <a href="https://unsplash.com?utm_source=mindroute&utm_medium=referral" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/50">
                  Unsplash
                </a>
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {itinerary.whyYours && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="relative mx-4 md:mx-12 -mt-1 mb-12 z-10"
        >
          <div
            className="max-w-4xl mx-auto p-6 md:p-10 rounded-[24px] border border-[#E94560]/20 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(233,69,96,0.08), rgba(233,69,96,0.03))" }}
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E94560] rounded-l-[24px]" />
            <p className="text-[11px] font-bold uppercase tracking-[3px] text-[#E94560] mb-3">{t('itin.whyYours')}</p>
            <p className="font-serif italic text-xl md:text-2xl text-white leading-relaxed">
              "{itinerary.whyYours}"
            </p>
          </div>
        </motion.div>
      )}

 {/* ── PANORAMICA REDESIGN ─────────────────────────────── */}
    <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0a1628 0%, #0d1e3a 30%, #0f2240 60%, #0a1628 100%)" }}>
        {/* Top border glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #E94560, #9b59b6, #E94560, transparent)" }} />
        {/* Subtle radial glow */}
     <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[700px] h-[700px] opacity-[0.06]" style={{ background: "radial-gradient(circle, #4a9eff, transparent 65%)" }} />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] opacity-[0.04]" style={{ background: "radial-gradient(circle, #2060b0, transparent 65%)" }} />
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 md:px-12 py-14">

          {/* ── HEADER ── */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(233,69,96,0.15)", border: "1px solid rgba(233,69,96,0.3)" }}>
                <Compass className="w-4 h-4 text-[#E94560]" />
              </div>
              <h2 className="text-2xl font-serif font-bold text-white">Panoramica del viaggio</h2>
              <div className="ml-auto flex items-center gap-2 px-3 py-1 rounded-full text-xs text-white/40" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <Calendar className="w-3 h-3" />
                {itinerary.days?.length} giorni
              </div>
            </div>
            {itinerary.tripSummary && (
              <p className="text-white/60 font-serif italic text-lg leading-relaxed max-w-3xl ml-12">{itinerary.tripSummary}</p>
            )}
            {itinerary.highlights && itinerary.highlights.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4 ml-12">
                {itinerary.highlights.map((h: string, i: number) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold text-[#E94560]" style={{ background: "rgba(233,69,96,0.08)", border: "1px solid rgba(233,69,96,0.2)" }}>{h}</span>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 1: Budget totale + CTA ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

            {/* Budget totale — hero number */}
         <div className="lg:col-span-2 rounded-[24px] p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(233,69,96,0.15), rgba(155,89,182,0.10))", border: "1px solid rgba(233,69,96,0.30)" }}>
              <div className="absolute top-0 right-0 w-40 h-40 opacity-[0.06]" style={{ background: "radial-gradient(circle, #E94560, transparent)" }} />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <Wallet className="w-4 h-4 text-[#E94560]" />
                  <span className="text-xs font-bold text-white/50 uppercase tracking-[2px]">{t('itin.budget')}</span>
                </div>
           {(() => {
                  try {
                    const parsed = JSON.parse(itinerary.budgetSummary);
                    if (parsed?.items) {
                      return (
                        <div className="space-y-0 overflow-hidden rounded-[14px]" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                          {parsed.items.map((item: any, i: number) => {
                            const isTotal = /totale/i.test(item.label);
                            return (
                              <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5" style={{
                                background: isTotal ? "rgba(233,69,96,0.08)" : i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                                borderLeft: isTotal ? "3px solid #E94560" : "3px solid transparent",
                              }}>
                                <div>
                                  <span className={`text-[12px] font-bold ${isTotal ? "text-[#E94560]" : "text-white/80"}`}>{item.label}</span>
                                  {item.detail && <span className="text-[11px] text-white/35 ml-2">{item.detail}</span>}
                                </div>
                                <span className="text-[11px] text-white/40 text-right">{item.perPerson}/pp</span>
                                <span className={`text-[12px] font-bold text-right ${isTotal ? "text-[#E94560]" : "text-white/70"}`}>{item.total}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }
                  } catch {}
                  const lines = itinerary.budgetSummary?.split(/[|·\n]/).filter((s: string) => s.trim().length > 3) ?? [];
                  const totalLine = lines.find((l: string) => /totale|total|TOTALE/i.test(l));
                  const otherLines = lines.filter((l: string) => !/totale|total|TOTALE/i.test(l));
                  return (
                    <>
                      {totalLine && (
                        <div className="mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <p className="text-[#E94560] font-bold text-lg leading-tight">{totalLine.trim()}</p>
                        </div>
                      )}
                      <div className="space-y-2">
                        {otherLines.slice(0, 6).map((item: string, i: number) => {
                          const parts = item.trim().split(/[:—–]/);
                          const label = parts[0]?.trim();
                          const value = parts.slice(1).join("—").trim();
                          return (
                            <div key={i} className="flex items-center justify-between gap-4 py-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <span className="text-white/50 text-[12px] leading-tight flex-1">{label}</span>
                              {value && <span className="text-white/80 text-[12px] font-bold text-right shrink-0">{value}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* CTA prenotazione */}
            <div className="rounded-[24px] p-6 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-4 h-4 text-[#E94560]" />
                <h3 className="font-serif font-bold text-white text-base">Pronto a partire?</h3>
              </div>
              <div className="flex flex-col gap-2.5 flex-1">
                {regionLinks.slice(0, 2).map(({ key, url, icon, label }) => (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between w-full px-4 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-[1.02] hover:brightness-110"
                    style={{ background: key === 'skyscanner' ? 'rgba(14,165,233,0.18)' : 'rgba(233,69,96,0.18)', border: `1px solid ${key === 'skyscanner' ? 'rgba(14,165,233,0.35)' : 'rgba(233,69,96,0.35)'}` }}>
                    <span className="flex items-center gap-2">{icon} {label}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </a>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                {regionLinks.slice(2).map(({ key, url, icon, label }) => (
                  <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white/50 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
                    {icon} {label}
                  </a>
                ))}
              </div>
            </div>
          </div>

       {/* ── ROW 2: Mappa full width ── */}
          <div className="rounded-[24px] overflow-hidden mb-5" style={{ height: "420px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <ItineraryMap days={itinerary.days} destinationName={itinerary.destinationName} />
          </div>

          {/* ── ROW 3: Packing + Periodo + Trasporti ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Packing list — griglia con emoji */}
            <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-[#E94560]" />
                <h3 className="font-bold text-sm text-white">{t('itin.packing')}</h3>
              </div>
              {(() => {
                try {
                  const parsed = JSON.parse(itinerary.packingList);
                  if (parsed?.items) {
                    return (
                      <div className="grid grid-cols-1 gap-1.5">
                        {parsed.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-[10px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-base leading-none">{item.emoji}</span>
                            <span className="text-[12px] text-white/70 font-medium">{item.label}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                } catch {}
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {itinerary.packingList?.split(/[,;]/).filter((s: string) => s.trim().length > 1).map((item: string, i: number) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium text-white/70" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>{item.trim()}</span>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Periodo migliore */}
            <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-4 h-4 text-[#E94560]" />
                <h3 className="font-bold text-xs text-white uppercase tracking-wider">{t('itin.besttime')}</h3>
              </div>
              <p className="text-white/60 text-[12px] leading-relaxed mb-5">{itinerary.bestTime}</p>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} className="pt-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="w-3.5 h-3.5 text-[#E94560]" />
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">{t('itin.getting')}</h3>
                </div>
                {(() => {
                  try {
                    const parsed = JSON.parse(itinerary.gettingThere);
                    if (parsed?.steps) {
                      return (
                        <div className="space-y-2.5">
                          {parsed.steps.map((step: any, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#E94560] mt-1.5 shrink-0" />
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[11px] font-bold text-white/80">{step.from} → {step.to}</span>
                                  <span className="text-[10px] text-white/40 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>{step.method}</span>
                                  <span className="text-[10px] text-white/40">{step.duration}</span>
                                  {step.cost && <span className="text-[10px] text-[#E94560]/70 font-bold">{step.cost}</span>}
                                </div>
                                {step.notes && <p className="text-[10px] text-white/30 mt-0.5">{step.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch {}
                  return <p className="text-white/60 text-[12px] leading-relaxed">{itinerary.gettingThere}</p>;
                })()}
              </div>
            </div>

            {/* Note di viaggio — slot libero per info extra */}
            <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-[#E94560]" />
                <h3 className="font-bold text-xs text-white uppercase tracking-wider">Da sapere</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { emoji: "💳", text: "Controlla se serve il visto per la destinazione" },
                  { emoji: "📱", text: "Attiva il roaming o compra una SIM locale" },
                  { emoji: "🏥", text: "Verifica la copertura della tua assicurazione viaggio" },
                  { emoji: "💊", text: "Porta farmaci di base e prescrizioni in inglese" },
                  { emoji: "🔌", text: "Verifica il tipo di presa elettrica locale" },
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-[10px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="text-sm leading-none mt-0.5">{tip.emoji}</span>
                    <span className="text-[11px] text-white/50 leading-relaxed">{tip.text}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
        {/* Bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.3), transparent)" }} />
      </div>
<div className="max-w-6xl mx-auto px-4 md:px-12 pb-24 pt-4" style={{ background: "linear-gradient(180deg, #0a0505 0%, #1a0a0a 8%, #1a0a0a 85%, #0a0505 100%)" }}>
        <div className="space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">{t('itin.daybyday')}</h2>
            <span className="text-white/30 text-sm">{itinerary.days?.length} giorni</span>
          </div>

      {itinerary.days.map((day: any, index: number) => (
            <DayCard
              key={index}
              day={day}
              isOpen={openDays.has(index)}
              onToggle={() => setOpenDays(prev => {
                const next = new Set(prev);
                if (next.has(index)) next.delete(index);
                else next.add(index);
                return next;
              })}
              index={index}
              isPeak={index === peakDayIndex || index === peakDayIndex + 1}
              t={t}
              itineraryId={id}
              onDayRegenerated={(dayIndex, newDay) => {
                itinerary.days[dayIndex] = newDay;
                refetch();
              }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative rounded-[32px] overflow-hidden mt-8"
            style={{ background: "linear-gradient(135deg, #2a1018, #1a0d14)" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(233,69,96,0.12),transparent_60%)]" />
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#E94560]/30 to-transparent" />
            <div className="relative z-10 p-8 md:p-16 text-center space-y-8">
              <Wind className="w-8 h-8 text-[#E94560]/40 mx-auto" />
              <p className="text-white/80 font-serif italic text-xl md:text-3xl max-w-2xl mx-auto leading-relaxed">
                "{itinerary.closingMessage}"
              </p>
              <p className="text-white/30 text-sm">
                {t('itin.different')} <Link href="/destinations" className="text-[#E94560] hover:underline">{t('itin.goback')}</Link>
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <button
                  onClick={handleSavePdf}
                  className="px-8 py-4 rounded-2xl border border-white/20 text-white font-bold hover:bg-white/5 transition-all"
                  data-testid="button-pdf"
                >
                  {t('itin.pdf')}
                </button>
                <button
                  onClick={() => setLocation("/")}
                  data-testid="button-startover"
                  className="px-8 py-4 rounded-2xl bg-white text-[#0a0814] font-bold hover:bg-white/90 transition-all"
                >
                  {t('itin.startover')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, isOpen, onToggle, index, isPeak, t, itineraryId, onDayRegenerated }: {
  day: any; isOpen: boolean; onToggle: () => void; index: number; isPeak: boolean; t: (key: string) => string; itineraryId: number; onDayRegenerated: (dayIndex: number, newDay: any) => void;
}) {
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const storageKey = `regen_count_${itineraryId}`;
  const getRegenCount = () => parseInt(localStorage.getItem(storageKey) || "0");
  const MAX_REGENS = 3;

  const handleRegen = async () => {
    if (getRegenCount() >= MAX_REGENS) {
      alert("Hai raggiunto il limite di 3 rigenerazioni per questo itinerario.");
      return;
    }
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/regenerate-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex: index, feedback: regenPrompt }),
      });
      if (!res.ok) throw new Error("Errore rigenerazione");
      const data = await res.json();
      localStorage.setItem(storageKey, String(getRegenCount() + 1));
      onDayRegenerated(index, data.day);
      setShowRegenModal(false);
      setRegenPrompt("");
    } catch (err) {
      alert("Errore durante la rigenerazione. Riprova.");
    }
    setIsRegenerating(false);
  };
  const slots = [
    {
      key: "morning", icon: "🌅", label: t("itin.morning"), text: day.morning,
      link: day.affiliateLinks?.getyourguide_morning ?? day.affiliateLinks?.klook_morning ?? day.affiliateLinks?.viator_morning ?? day.affiliateLinks?.skyscanner,
      placeLink: day.affiliateLinks?.getyourguide_place_morning ?? day.affiliateLinks?.klook_place_morning ?? day.affiliateLinks?.viator_place_morning,
      isActivity: true, color: "#E94560",
    },
    {
      key: "lunch", icon: "🍽️", label: t("itin.lunch"), text: day.lunch,
      link: day.affiliateLinks?.thefork_lunch ?? day.affiliateLinks?.tripadvisor_lunch,
      isActivity: false, color: "#FF8C42",
    },
    {
      key: "afternoon", icon: "☀️", label: t("itin.afternoon"), text: day.afternoon,
      link: day.affiliateLinks?.getyourguide_afternoon ?? day.affiliateLinks?.klook_afternoon ?? day.affiliateLinks?.viator_afternoon ?? day.affiliateLinks?.booking_hotel,
      placeLink: day.affiliateLinks?.getyourguide_place_afternoon ?? day.affiliateLinks?.klook_place_afternoon ?? day.affiliateLinks?.viator_place_afternoon,
      isActivity: true, color: "#4ECDC4",
    },
    {
      key: "evening", icon: "🌙", label: t("itin.evening"), text: day.evening,
      link: day.affiliateLinks?.thefork_evening ?? day.affiliateLinks?.tripadvisor_evening ?? day.affiliateLinks?.tripadvisor_evening_fallback,
      isActivity: false, color: "#9B59B6",
    },
  ];

  const hasAnyLink = slots.some(s => s.link || (s as any).placeLink);
  const filledSlots = slots.filter(s => s.text && s.text.length > 3).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className="group"
    >
      <div
        className="rounded-[24px] overflow-hidden transition-all duration-300"
        style={{
         background: isPeak
            ? "linear-gradient(135deg, rgba(233,69,96,0.10), rgba(233,69,96,0.04), rgba(155,89,182,0.06))"
            : isOpen
              ? "rgba(255,255,255,0.06)"
              : "rgba(255,255,255,0.05)",
          border: isPeak
            ? isOpen ? "1.5px solid rgba(233,69,96,0.4)" : "1px solid rgba(233,69,96,0.3)"
            : isOpen
              ? "1px solid rgba(255,255,255,0.15)"
              : "1px solid rgba(255,255,255,0.10)",
          boxShadow: isPeak && isOpen ? "0 0 40px rgba(233,69,96,0.08)" : "none",
        }}
      >
        {/* ── HEADER ROW ── */}
        <button
          onClick={onToggle}
          className="w-full text-left"
          data-testid={`day-trigger-${index}`}
        >
          <div className="flex items-stretch gap-0">

      {/* Day number column */}
            <div
              className="flex flex-col items-center justify-center px-5 py-5 shrink-0 relative overflow-hidden"
              style={{
                width: "72px",
                background: isPeak
                  ? "linear-gradient(180deg, #E94560, #c73550)"
                  : "rgba(255,255,255,0.04)",
                borderRight: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {isPeak && (
                <div className="absolute top-1 left-1/2 -translate-x-1/2">
                  <Flame className="w-3 h-3 text-yellow-300/80" />
                </div>
              )}
              <span
                className="font-serif font-bold leading-none"
                style={{
                  fontSize: "28px",
                  color: isPeak ? "white" : "rgba(255,255,255,0.5)",
                }}
              >
                {day.dayNumber}
              </span>
              <span
                className="text-[9px] uppercase tracking-[1.5px] mt-1 font-bold"
                style={{ color: isPeak ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.25)" }}
              >
                giorno
              </span>
              {/* Progress indicator */}
              <div
                className="absolute bottom-0 left-0 right-0"
                style={{ height: "3px", background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${(index / 6) * 100}%`,
                    background: isPeak ? "rgba(255,255,255,0.5)" : "#E94560",
                    borderRadius: "0 2px 2px 0",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 px-5 py-4 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {isPeak && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[9px] font-bold text-[#E94560] uppercase tracking-[2.5px]">Momento clou</span>
                    </div>
                  )}
                  <h4
                    className="font-serif font-bold leading-tight transition-colors"
                    style={{
                      fontSize: "16px",
                      color: isOpen || isPeak ? "white" : "rgba(255,255,255,0.65)",
                    }}
                  >
                    {day.title}
                  </h4>

                {/* Slot preview — keyword estratta dal testo */}
                  {!isOpen && (
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      {slots.map(slot => {
                        if (!slot.text || slot.text.length < 3) return null;
                        // Estrai keyword: prima parte prima di — o , o .
                        const keyword = slot.text
                          .split(/[—–,.(]/)[0]
                          .replace(/^(volo|transfer|taxi|pranzo a bordo|check.?in|partenza|arrivo)\s+/i, '')
                          .trim()
                          .split(' ')
                          .slice(0, 4)
                          .join(' ');
                        if (!keyword || keyword.length < 2) return null;
                        return (
                          <span
                            key={slot.key}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all"
                            style={{
                              background: `${slot.color}18`,
                              color: slot.link ? slot.color : `${slot.color}99`,
                              border: `1px solid ${slot.color}30`,
                              cursor: slot.link ? 'pointer' : 'default',
                            }}
                            onClick={slot.link ? (e) => {
                              e.stopPropagation();
                              window.open(slot.link!, '_blank', 'noopener,noreferrer');
                            } : undefined}
                          >
                            <span className="text-[11px]">{slot.icon}</span>
                            <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {keyword}
                            </span>
                            {slot.link && <ExternalLink className="w-2 h-2 opacity-50 shrink-0" />}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right side: link count + chevron */}
                <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
                  {hasAnyLink && !isOpen && (
                    <span
                      className="text-[10px] font-bold px-2 py-1 rounded-full"
                      style={{ background: "rgba(233,69,96,0.1)", color: "#E94560", border: "1px solid rgba(233,69,96,0.2)" }}
                    >
                      {slots.filter(s => s.link).length} link
                    </span>
                  )}
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: isOpen ? "rgba(233,69,96,0.15)" : "rgba(255,255,255,0.05)",
                      border: isOpen ? "1px solid rgba(233,69,96,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <ChevronDown
                      className="w-3.5 h-3.5 transition-transform duration-300"
                      style={{
                        color: isOpen ? "#E94560" : "rgba(255,255,255,0.3)",
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* ── EXPANDED CONTENT ── */}
        {isOpen && (
          <div className="relative">
            {/* Day image background */}
            {day.dayImage && (
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <img
                  src={day.dayImage}
                  alt=""
                  className="w-full h-full object-cover opacity-[0.07]"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(10,8,20,0.3), rgba(10,8,20,0.8))" }} />
              </div>
            )}

            <div className="relative z-10 px-5 pb-6 pt-1">
              {/* Divider */}
              <div className="w-full h-px mb-5" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

              {/* Slots grid */}
              <div className="space-y-0 rounded-[16px] overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                {slots.map((slot, si) => {
                  if (!slot.text || slot.text.length < 3) return null;
                  const linkKey = slot.key === "morning"
                    ? (day.affiliateLinks?.getyourguide_morning ? "getyourguide_morning" : day.affiliateLinks?.klook_morning ? "klook_morning" : day.affiliateLinks?.viator_morning ? "viator_morning" : "skyscanner")
                    : slot.key === "lunch"
                      ? (day.affiliateLinks?.thefork_lunch ? "thefork_lunch" : "tripadvisor_lunch")
                      : slot.key === "afternoon"
                        ? (day.affiliateLinks?.getyourguide_afternoon ? "getyourguide_afternoon" : day.affiliateLinks?.klook_afternoon ? "klook_afternoon" : day.affiliateLinks?.viator_afternoon ? "viator_afternoon" : "booking_hotel")
                        : (day.affiliateLinks?.thefork_evening ? "thefork_evening" : day.affiliateLinks?.tripadvisor_evening ? "tripadvisor_evening" : "tripadvisor_evening_fallback");

                  const placeKey = slot.key === "morning"
                    ? (day.affiliateLinks?.getyourguide_place_morning ? "getyourguide_place_morning" : day.affiliateLinks?.klook_place_morning ? "klook_place_morning" : "viator_place_morning")
                    : (day.affiliateLinks?.getyourguide_place_afternoon ? "getyourguide_place_afternoon" : day.affiliateLinks?.klook_place_afternoon ? "klook_place_afternoon" : "viator_place_afternoon");

                  const linkLabel = day.affiliateLabels?.[linkKey];
                  const placeLinkLabel = day.affiliateLabels?.[placeKey];

                  return (
                    <div
                      key={slot.key}
                      className="flex gap-0"
                      style={{
                        borderTop: si > 0 ? "1px solid rgba(255,255,255,0.05)" : "none",
                        background: si % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent",
                      }}
                    >
                    {/* Slot indicator — linea colorata + icona + label */}
                      <div
                        className="flex flex-col items-center pt-5 pb-4 shrink-0 relative"
                        style={{
                          width: "56px",
                          borderRight: "1px solid rgba(255,255,255,0.05)",
                          background: `${slot.color}06`,
                        }}
                      >
                        {/* Linea colorata sinistra */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-[3px]"
                          style={{ background: `linear-gradient(180deg, ${slot.color}, ${slot.color}40)` }}
                        />
                        <span className="text-xl leading-none mb-2">{slot.icon}</span>
                        <span
                          className="text-[8px] font-bold uppercase tracking-[1px] text-center leading-tight"
                          style={{ color: `${slot.color}90` }}
                        >
                          {slot.label}
                        </span>
                      </div>

                      {/* Slot content */}
                      <div className="flex-1 px-5 py-4 min-w-0">
                        {/* Testo principale */}
                        {(() => {
                          const sentences = slot.text.split(/(?<=[.!?—])\s+/);
                          const main = sentences[0] ?? slot.text;
                          const details = sentences.slice(1).join(' ');
                          return (
                            <>
                              <p
                                className="font-medium mb-1"
                                style={{ fontSize: "15px", color: "rgba(255,255,255,0.88)", lineHeight: "1.65" }}
                              >
                                {main}
                              </p>
                              {details && (
                                <p
                                  className="mb-3"
                                  style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: "1.6" }}
                                >
                                  {details}
                                </p>
                              )}
                            </>
                          );
                        })()}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-3">
                          {slot.link && (
                            <a
                              href={slot.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 transition-all hover:scale-[1.02] hover:brightness-110"
                              style={{
                                padding: "8px 14px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: "700",
                                background: `${slot.color}18`,
                                color: slot.color,
                                border: `1px solid ${slot.color}35`,
                                textDecoration: "none",
                              }}
                            >
                              {slot.isActivity ? <Ticket className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                              {linkLabel || (slot.isActivity ? "Prenota attività" : "Prenota tavolo")}
                              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                            </a>
                          )}
                          {(slot as any).placeLink && (
                            <a
                              href={(slot as any).placeLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 transition-all hover:scale-[1.02]"
                              style={{
                                padding: "8px 14px",
                                borderRadius: "10px",
                                fontSize: "12px",
                                fontWeight: "700",
                                background: "rgba(255,255,255,0.05)",
                                color: "rgba(255,255,255,0.50)",
                                border: "1px solid rgba(255,255,255,0.10)",
                                textDecoration: "none",
                              }}
                            >
                              <MapPin className="w-3 h-3" />
                              {placeLinkLabel || "Tour del luogo"}
                              <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Extra affiliate links */}
              {day.affiliateLinks && (() => {
                const usedKeys = ["getyourguide_morning","getyourguide_afternoon","klook_morning","klook_afternoon","viator_morning","viator_afternoon","getyourguide_place_morning","getyourguide_place_afternoon","klook_place_morning","klook_place_afternoon","viator_place_morning","viator_place_afternoon","thefork_lunch","thefork_evening","tripadvisor_lunch","tripadvisor_evening","tripadvisor_evening_fallback","skyscanner","booking_hotel"];
                const extras = Object.entries(day.affiliateLinks).filter(([k]) => !usedKeys.includes(k));
                if (extras.length === 0) return null;
                return (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    {extras.map(([key, url]) => (
                      <a
                        key={key}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 transition-all hover:scale-[1.02]"
                        style={{
                          padding: "4px 10px",
                          borderRadius: "8px",
                          fontSize: "10px",
                          fontWeight: "700",
                          background: "rgba(233,69,96,0.08)",
                          color: "#E94560",
                          border: "1px solid rgba(233,69,96,0.15)",
                          textDecoration: "none",
                        }}
                      >
                        <ExternalLink className="w-2 h-2" />
                        {day.affiliateLabels?.[key] || key}
                      </a>
                    ))}
                  </div>
                );
              })()}
          </div>

              {/* Rigenera giorno */}
              <div className="mt-4 pt-3 flex items-center justify-between" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <span className="text-[10px] text-white/20">
                  {MAX_REGENS - getRegenCount()} rigenerazioni rimaste
                </span>
                <button
                  onClick={() => setShowRegenModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:brightness-110"
                  style={{ background: "rgba(233,69,96,0.08)", color: "#E94560", border: "1px solid rgba(233,69,96,0.2)" }}
                >
                  ↺ Rigenera questo giorno
                </button>
              </div>

              {/* Modal rigenerazione */}
              {showRegenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
                  <div className="w-full max-w-md rounded-[24px] p-6 space-y-4" style={{ background: "#1a0a14", border: "1px solid rgba(233,69,96,0.3)" }}>
                    <h3 className="font-serif text-lg text-white font-bold">Rigenera il Giorno {day.dayNumber}</h3>
                    <p className="text-white/50 text-sm">Dicci come vuoi cambiarlo — o lascia vuoto per una variazione casuale.</p>
                    <textarea
                      value={regenPrompt}
                      onChange={e => setRegenPrompt(e.target.value)}
                      placeholder="Es: voglio qualcosa di più rilassato, togli le attività sportive..."
                      rows={3}
                      className="w-full text-white text-sm outline-none resize-none rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => { setShowRegenModal(false); setRegenPrompt(""); }}
                        className="flex-1 py-3 rounded-xl text-white/50 font-bold text-sm transition-all hover:text-white"
                        style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                      >
                        Annulla
                      </button>
                      <button
                        onClick={handleRegen}
                        disabled={isRegenerating}
                        className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110"
                        style={{ background: isRegenerating ? "rgba(233,69,96,0.4)" : "#E94560" }}
                      >
                        {isRegenerating ? "Rigenerando..." : "Rigenera"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ItineraryMap({ days, destinationName }: { days: any[]; destinationName: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [savedPins, setSavedPins] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searchResults, setSearchResults] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
 const [zoom, setZoom] = useState(12);
  const totalDays = 7; // per progress indicator

 // Carica mappa subito con coordinate di default, poi aggiorna con geocoding
  useEffect(() => {
    // Mostra subito la mappa centrata genericamente
    setMapCenter({ lat: 41.9028, lng: 12.4964 }); // Roma come fallback visivo

    const cityName = destinationName?.split(",")[0]?.trim() || destinationName;
    if (!cityName) return;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityName)}&format=json&limit=1`, {
      signal: controller.signal,
      headers: { "Accept-Language": "en" }
    })
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) {
          setMapCenter({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        }
      })
      .catch(() => {})
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, [destinationName]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + " " + destinationName)}&format=json&limit=4`
      );
      const data = await res.json();
      if (data?.length > 0) {
        setSearchResults(data.map((r: any) => ({
          label: r.display_name.split(",").slice(0, 2).join(","),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })));
      } else {
        setSearchResults([]);
      }
    } catch {}
    setSearching(false);
  };

  const savePin = (pin: { label: string; lat: number; lng: number }) => {
    setSavedPins(prev => {
      if (prev.find(p => p.lat === pin.lat && p.lng === pin.lng)) return prev;
      return [...prev, pin];
    });
    setMapCenter({ lat: pin.lat, lng: pin.lng });
    setZoom(15);
    setSearchResults([]);
    setSearchQuery("");
  };

  const removePin = (index: number) => {
    setSavedPins(prev => prev.filter((_, i) => i !== index));
  };

  // Costruisce URL iframe con tutti i pin salvati
  const buildMapUrl = () => {
    if (!mapCenter) return null;
    const base = `https://www.openstreetmap.org/export/embed.html?bbox=${mapCenter.lng - 0.05},${mapCenter.lat - 0.04},${mapCenter.lng + 0.05},${mapCenter.lat + 0.04}&layer=mapnik`;
    const markers = savedPins.map(p => `&marker=${p.lat},${p.lng}`).join("");
    return base + markers;
  };

  const mapUrl = buildMapUrl();

  return (
    <div className="w-full h-full flex flex-col" style={{ background: "#0d0820" }}>

      {/* Search bar */}
      <div className="px-3 py-2.5 flex gap-2 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSearch()}
          placeholder={`Cerca un luogo a ${destinationName?.split(",")[0] ?? "destinazione"}...`}
          className="flex-1 text-white text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "8px",
            padding: "7px 12px",
          }}
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-3 py-1.5 rounded-lg text-white text-sm font-bold transition-all hover:brightness-110"
          style={{ background: "#E94560", opacity: searching ? 0.6 : 1, minWidth: "40px" }}
        >
          {searching ? "..." : "🔍"}
        </button>
      </div>

      {/* Search results dropdown */}
      {searchResults.length > 0 && (
        <div className="shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {searchResults.map((r, i) => (
            <div
              key={i}
              onClick={() => savePin(r)}
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5 transition-all"
            >
              <MapPin className="w-3.5 h-3.5 text-[#E94560] shrink-0" />
              <span className="text-xs text-white/70 truncate">{r.label}</span>
              <span className="text-[10px] text-[#E94560] font-bold ml-auto shrink-0">+ Salva</span>
            </div>
          ))}
          <div
            onClick={() => setSearchResults([])}
            className="px-3 py-1.5 text-[10px] text-white/30 cursor-pointer hover:text-white/50 text-center"
          >
            Chiudi
          </div>
        </div>
      )}

      {/* Saved pins */}
      {savedPins.length > 0 && (
        <div className="flex gap-1.5 px-3 py-2 flex-wrap shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          {savedPins.map((pin, i) => (
            <span
              key={i}
              onClick={() => { setMapCenter({ lat: pin.lat, lng: pin.lng }); setZoom(15); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-all hover:brightness-110"
              style={{ background: "rgba(233,69,96,0.15)", color: "#E94560", border: "1px solid rgba(233,69,96,0.3)" }}
            >
              📍 {pin.label}
              <span
                onClick={e => { e.stopPropagation(); removePin(i); }}
                className="opacity-50 hover:opacity-100 ml-0.5"
              >×</span>
            </span>
          ))}
        </div>
      )}

      {/* Mappa iframe */}
      <div className="flex-1 relative min-h-0">
    {mapUrl && (
          <iframe
            key={`${mapCenter?.lat}-${mapCenter?.lng}-${zoom}`}
            src={mapUrl}
            className="w-full h-full"
            style={{ border: "none", minHeight: "300px" }}
            title="Mappa destinazione"
          />
        )}
        {!mapUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/30 text-xs">Caricamento mappa...</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
 
