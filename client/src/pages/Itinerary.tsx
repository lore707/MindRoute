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
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(180deg, #1a0d2e 0%, #221035 40%, #1e0d2a 100%)" }}>
        {/* Top border glow */}
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, transparent, #E94560, #9b59b6, #E94560, transparent)" }} />
        {/* Subtle radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-[0.06]" style={{ background: "radial-gradient(circle, #E94560, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.04]" style={{ background: "radial-gradient(circle, #9b59b6, transparent 70%)" }} />
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
            <div className="lg:col-span-2 rounded-[24px] p-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(233,69,96,0.12), rgba(155,89,182,0.08))", border: "1px solid rgba(233,69,96,0.2)" }}>
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
            <div className="rounded-[24px] p-6 flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
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

          {/* ── ROW 2: Mappa + Packing + Info ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Mappa — occupa 2 colonne */}
            <div className="lg:col-span-2 rounded-[24px] overflow-hidden" style={{ height: "420px", border: "1px solid rgba(255,255,255,0.08)" }}>
              <ItineraryMap days={itinerary.days} destinationName={itinerary.destinationName} />
            </div>

            {/* Colonna destra: packing + periodo + come arrivare */}
            <div className="flex flex-col gap-4">
{/* Packing list — griglia con emoji */}
              <div className="rounded-[24px] p-5 flex-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
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
              <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Sun className="w-4 h-4 text-[#E94560]" />
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">{t('itin.besttime')}</h3>
                </div>
                <p className="text-white/60 text-[12px] leading-relaxed">{itinerary.bestTime}</p>
              </div>

              {/* Come arrivare — step strutturati */}
              <div className="rounded-[24px] p-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Plane className="w-4 h-4 text-[#E94560]" />
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
          </div>

        </div>
        {/* Bottom border */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, rgba(233,69,96,0.3), transparent)" }} />
      </div>
      <div className="max-w-6xl mx-auto px-4 md:px-12 pb-24 pt-4" style={{ background: "linear-gradient(180deg, #0f0a10 0%, #1a0f12 8%, #1a0f12 85%, #0f0a10 100%)" }}>
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

function DayCard({ day, isOpen, onToggle, index, isPeak, t }: {
  day: any; isOpen: boolean; onToggle: () => void; index: number; isPeak: boolean; t: (key: string) => string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <Collapsible.Root open={isOpen} onOpenChange={onToggle} className="group">
        <div className={`rounded-[20px] transition-all duration-300 overflow-hidden ${
          isPeak
            ? isOpen
              ? 'border-2 border-[#E94560] shadow-[0_0_40px_rgba(233,69,96,0.15)]'
              : 'border border-[#E94560]/40 hover:border-[#E94560]/70'
            : isOpen
              ? 'border border-white/20 shadow-xl'
              : 'border border-white/10 hover:border-white/20'
        }`}
          style={{ background: isPeak ? "linear-gradient(135deg, rgba(233,69,96,0.08), rgba(233,69,96,0.03))" : isOpen ? "rgba(35,18,22,0.95)" : "rgba(255,255,255,0.06)" }}
        >
          <Collapsible.Trigger className="w-full flex items-center justify-between p-5 md:p-7 text-left" data-testid={`day-trigger-${index}`}>
            <div className="flex items-center gap-4 md:gap-6">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-bold text-xl font-serif transition-all shrink-0 ${
                isPeak
                  ? 'bg-[#E94560] text-white shadow-[0_4px_20px_rgba(233,69,96,0.4)]'
                  : isOpen
                    ? 'bg-white/10 text-white'
                    : 'bg-white/5 text-white/50 group-hover:bg-white/10 group-hover:text-white'
              }`}>
                {day.dayNumber}
              </div>
              <div className="space-y-1">
                {isPeak && (
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-[#E94560]" />
                    <span className="text-[10px] font-bold text-[#E94560] uppercase tracking-[2px]">Momento clou</span>
                  </div>
                )}
                <h4 className={`font-serif font-bold text-lg md:text-xl leading-tight transition-colors ${
                  isOpen || isPeak ? 'text-white' : 'text-white/70 group-hover:text-white'
                }`}>{day.title}</h4>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 text-white/30 transition-transform duration-300 shrink-0 ml-4 ${isOpen ? 'rotate-180 text-white/60' : ''}`} />
          </Collapsible.Trigger>

          <Collapsible.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <div className="relative px-5 md:px-7 pb-8 pt-0 overflow-hidden">
              {day.dayImage && (
                <>
                  <img src={day.dayImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="absolute inset-0 bg-gradient-to-b from-[#0a0814]/60 via-[#0a0814]/20 to-[#0a0814]/60" />
                </>
              )}
              <div className="relative z-10">
                <div className="w-full h-px bg-white/12 mb-7" />
                <div className="space-y-7">
                  {[
                    {
                      slot: 'morning', icon: <Clock className="w-3.5 h-3.5" />, label: t('itin.morning'), text: day.morning,
                      link: day.affiliateLinks?.getyourguide_morning ?? day.affiliateLinks?.klook_morning ?? day.affiliateLinks?.viator_morning,
                      placeLink: day.affiliateLinks?.getyourguide_place_morning ?? day.affiliateLinks?.klook_place_morning ?? day.affiliateLinks?.viator_place_morning,
                      isActivity: true,
                    },
                    {
                      slot: 'lunch', icon: <Utensils className="w-3.5 h-3.5" />, label: t('itin.lunch'), text: day.lunch,
                      link: day.affiliateLinks?.thefork_lunch ?? day.affiliateLinks?.tripadvisor_lunch,
                      isActivity: false,
                    },
                    {
                      slot: 'afternoon', icon: <Sun className="w-3.5 h-3.5" />, label: t('itin.afternoon'), text: day.afternoon,
                      link: day.affiliateLinks?.getyourguide_afternoon ?? day.affiliateLinks?.klook_afternoon ?? day.affiliateLinks?.viator_afternoon,
                      placeLink: day.affiliateLinks?.getyourguide_place_afternoon ?? day.affiliateLinks?.klook_place_afternoon ?? day.affiliateLinks?.viator_place_afternoon,
                      isActivity: true,
                    },
                    {
                      slot: 'evening', icon: <Clock className="w-3.5 h-3.5" />, label: t('itin.evening'), text: day.evening,
                      link: day.affiliateLinks?.thefork_evening ?? day.affiliateLinks?.tripadvisor_evening ?? day.affiliateLinks?.tripadvisor_evening_fallback,
                      isActivity: false,
                    },
                  ].map(({ slot, icon, label, text, link, placeLink, isActivity }) => (
                    <div key={slot} className="space-y-3">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#E94560] uppercase tracking-[2px]">
                        {icon} {label}
                      </div>
                      <p className="text-white/70 font-sans leading-relaxed text-[14px] md:text-[15px]">{text}</p>
                      <div className="flex flex-wrap gap-2">
                        {link && (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[1px] rounded-xl border transition-all duration-200 ${
                              isActivity
                                ? 'bg-[#E94560]/10 text-[#E94560] border-[#E94560]/20 hover:bg-[#E94560] hover:text-white'
                                : 'bg-orange-500/10 text-orange-400 border-orange-500/20 hover:bg-orange-500 hover:text-white'
                            }`}
                          >
                            {isActivity ? <Ticket className="w-3 h-3" /> : <Utensils className="w-3 h-3" />}
                            {(() => {
                              const linkKey = isActivity
                                ? (slot === 'morning'
                                  ? (day.affiliateLinks?.getyourguide_morning ? 'getyourguide_morning' : day.affiliateLinks?.klook_morning ? 'klook_morning' : 'viator_morning')
                                  : (day.affiliateLinks?.getyourguide_afternoon ? 'getyourguide_afternoon' : day.affiliateLinks?.klook_afternoon ? 'klook_afternoon' : 'viator_afternoon'))
                                : (slot === 'lunch'
                                  ? (day.affiliateLinks?.thefork_lunch ? 'thefork_lunch' : 'tripadvisor_lunch')
                                  : (day.affiliateLinks?.thefork_evening ? 'thefork_evening' : day.affiliateLinks?.tripadvisor_evening ? 'tripadvisor_evening' : 'tripadvisor_evening_fallback'));
                              const label = day.affiliateLabels?.[linkKey];
                              if (label) return label;
                              return isActivity ? "Prenota attività" : (day.affiliateLinks?.thefork_lunch || day.affiliateLinks?.thefork_evening ? "Prenota tavolo" : "Ristoranti");
                            })()}
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                        {placeLink && (
                          <a
                            href={placeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[1px] rounded-xl bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                          >
                            <Ticket className="w-3 h-3" /> {(() => {
                              const placeKey = slot === 'morning'
                                ? (day.affiliateLinks?.getyourguide_place_morning ? 'getyourguide_place_morning' : day.affiliateLinks?.klook_place_morning ? 'klook_place_morning' : 'viator_place_morning')
                                : (day.affiliateLinks?.getyourguide_place_afternoon ? 'getyourguide_place_afternoon' : day.affiliateLinks?.klook_place_afternoon ? 'klook_place_afternoon' : 'viator_place_afternoon');
                              return day.affiliateLabels?.[placeKey] || "Tour del luogo";
                            })()}
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}

                  {day.affiliateLinks && Object.keys(day.affiliateLinks).filter(
                    k => !["getyourguide_morning", "getyourguide_afternoon", "klook_morning", "klook_afternoon", "viator_morning", "viator_afternoon", "getyourguide_place_morning", "getyourguide_place_afternoon", "klook_place_morning", "klook_place_afternoon", "viator_place_morning", "viator_place_afternoon", "thefork_lunch", "thefork_evening", "tripadvisor_lunch", "tripadvisor_evening", "tripadvisor_evening_fallback"].includes(k)
                  ).length > 0 && (
                    <AffiliateLinks links={Object.fromEntries(
                      Object.entries(day.affiliateLinks).filter(([k]) =>
                        !["getyourguide_morning", "getyourguide_afternoon", "klook_morning", "klook_afternoon", "viator_morning", "viator_afternoon", "getyourguide_place_morning", "getyourguide_place_afternoon", "klook_place_morning", "klook_place_afternoon", "viator_place_morning", "viator_place_afternoon", "thefork_lunch", "thefork_evening", "tripadvisor_lunch", "tripadvisor_evening", "tripadvisor_evening_fallback"].includes(k)
                      )
                    )} />
                  )}
                </div>
              </div>
            </div>
          </Collapsible.Content>
        </div>
      </Collapsible.Root>
    </motion.div>
  );
}

function ItineraryMap({ days, destinationName }: { days: any[]; destinationName: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

 const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [allPoints, setAllPoints] = useState<{ label: string; slot: string; lat: number; lng: number; dayNum: number; imageUrl?: string; affiliateUrl?: string }[]>([]);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const searchMarkersRef = useRef<L.Marker[]>([]);

  const slotColors: Record<string, string> = {
    "Mattina": "#E94560",
    "Pranzo": "#FF8C42",
    "Pomeriggio": "#4ECDC4",
    "Sera": "#9B59B6",
    "Hotel": "#1A1A2E",
    "Traghetto": "#0EA5E9",
    "Noleggio": "#10B981",
  };

  const slotLabels: Record<string, string> = {
    "Mattina": "🌅 Mattina",
    "Pranzo": "🍽️ Pranzo",
    "Pomeriggio": "☀️ Pomeriggio",
    "Sera": "🌙 Sera",
    "Hotel": "🏨 Hotel",
    "Traghetto": "⛴️ Traghetto",
    "Noleggio": "🚗 Noleggio",
  };

  const uniqueDays = [...new Set(allPoints.map((p) => p.dayNum))].sort((a, b) => a - b);
  const uniqueSlots = [...new Set(allPoints.map((p) => p.slot))];

  const filteredPoints = allPoints.filter((p) => {
    if (activeDay !== null && p.dayNum !== activeDay) return false;
    if (activeSlot !== null && p.slot !== activeSlot) return false;
    return true;
  });

  const buildPopup = (point: typeof allPoints[0]) => {
    const color = slotColors[point.slot] ?? "#E94560";
    const slotLabel = slotLabels[point.slot] ?? point.slot;
    const imgHtml = point.imageUrl
      ? `<img src="${point.imageUrl}" style="width:100%;height:130px;object-fit:cover;border-radius:8px;margin-bottom:8px;" />`
      : "";
    const btnHtml = point.affiliateUrl
      ? `<a href="${point.affiliateUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:8px;padding:6px 14px;background:${color};color:white;border-radius:20px;font-size:11px;font-weight:bold;text-decoration:none;">Prenota →</a>`
      : "";

    return `<div style="font-family:sans-serif;width:210px;padding:2px;">
      ${imgHtml}
      <div style="display:inline-block;padding:2px 8px;background:${color}20;color:${color};border-radius:20px;font-size:10px;font-weight:bold;margin-bottom:5px;">
        ${slotLabel} · Giorno ${point.dayNum}
      </div>
      <div style="font-size:13px;font-weight:bold;color:#1a1a2e;line-height:1.3;">${point.label}</div>
      ${btnHtml}
    </div>`;
  };

  const clearMapLayers = () => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }
  };

  const invalidateMapSoon = () => {
    setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 250);
  };

  const extractName = (text: string): string | null => {
    if (!text || text.length <= 5) return null;

    const skipWords =
      /volo|aeroporto|airport|trasferimento|transfer|check.?in|check.?out|partenza|ritorno|rientro|colazione|prima colazione|breakfast|merenda|picnic|riposo/i;

    if (skipWords.test(text)) return null;

    const patterns = [
      /(?:a|al|alla|alle|verso|to|at|in|di|del|della)\s+([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s'-]+?)(?:\s*[—,.\-–:]|$)/,
      /^([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s'-]+?)(?:\s*[—,.\-–:])/,
      /:\s*([A-Z][a-zA-ZàèéìòùÀÈÉÌÒÙãõçñ\s'-]+?)(?:\s*[—,.\-–]|$)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const name = match[1].trim();
        if (name.length > 2 && name.length < 60 && !skipWords.test(name)) return name;
      }
    }

    return null;
  };

  useEffect(() => {
    if (!mapRef.current) return;

    setLoading(true);
    setError(false);
    setAllPoints([]);
    clearMapLayers();

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const directPoints: typeof allPoints = [];

    days.forEach((day: any) => {
      if (day.mapPoints && Array.isArray(day.mapPoints)) {
        day.mapPoints.forEach((p: any) => {
          if (p.lat && p.lng && p.lat !== 0 && p.lng !== 0) {
            directPoints.push({
              ...p,
              dayNum: day.dayNumber,
            });
          }
        });
      }
    });

    const initMap = (centerLat: number, centerLng: number) => {
      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      invalidateMapSoon();
      return map;
    };

    const hydrateFromFallback = async () => {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinationName)}&format=json&limit=1&accept-language=en`
        );
        const geoData = await geoRes.json();

        if (!geoData || geoData.length === 0) {
          setError(true);
          setLoading(false);
          return;
        }

        const destLat = parseFloat(geoData[0].lat);
        const destLng = parseFloat(geoData[0].lon);
        const cityName = destinationName.split(",")[0].trim();
        const countryName = destinationName.split(",")[1]?.trim() ?? "";

        initMap(destLat, destLng);

        const fallbackPlaces: { label: string; dayNum: number; slot: string; searchQuery: string }[] = [];

        days.forEach((day: any) => {
          [
            { text: day.morning, slot: "Mattina" },
            { text: day.afternoon, slot: "Pomeriggio" },
            { text: day.lunch, slot: "Pranzo" },
            { text: day.evening, slot: "Sera" },
          ].forEach(({ text, slot }) => {
            const name = extractName(text);
            if (name) {
              const isFood = slot === "Pranzo" || slot === "Sera";
              const query = isFood
                ? `${name} restaurant ${cityName}`
                : `${name} ${cityName} ${countryName}`;
              fallbackPlaces.push({
                label: name,
                dayNum: day.dayNumber,
                slot,
                searchQuery: query,
              });
            }
          });

          if (day.imageQuery) {
            fallbackPlaces.push({
              label: day.imageQuery.split(/\s+/).slice(0, 3).join(" "),
              dayNum: day.dayNumber,
              slot: "Mattina",
              searchQuery: `${day.imageQuery} ${cityName}`,
            });
          }
        });

        const seen = new Set<string>();
        const fallbackPoints: typeof allPoints = [
          {
            label: `Centro di ${cityName}`,
            slot: "Hotel",
            lat: destLat,
            lng: destLng,
            dayNum: 1,
          },
        ];

        for (const place of fallbackPlaces.slice(0, 16)) {
          const key = `${place.label}-${place.slot}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place.searchQuery)}&format=json&limit=1&accept-language=en`
            );
            const data = await res.json();

            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              const dist = Math.sqrt(Math.pow(lat - destLat, 2) + Math.pow(lng - destLng, 2));

              if (dist < 3) {
                fallbackPoints.push({
                  label: place.label,
                  slot: place.slot,
                  lat,
                  lng,
                  dayNum: place.dayNum,
                });
              }
            }

            await new Promise((r) => setTimeout(r, 160));
          } catch {
            // ignore single geocode failure
          }
        }

      setAllPoints(fallbackPoints);
        setLoading(false);
      } catch {
        // Mostra comunque la mappa centrata sulla destinazione
        setError(false);
        setLoading(false);
      }
    };

    if (directPoints.length > 0) {
      const avgLat = directPoints.reduce((s, p) => s + p.lat, 0) / directPoints.length;
      const avgLng = directPoints.reduce((s, p) => s + p.lng, 0) / directPoints.length;
      initMap(avgLat, avgLng);
      setAllPoints(directPoints);
      setLoading(false);
    } else {
      hydrateFromFallback();
    }

    return () => {
      clearMapLayers();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [days, destinationName]);

  useEffect(() => {
    if (!mapInstanceRef.current || loading) return;

    const map = mapInstanceRef.current;
    clearMapLayers();

    const pointsToRender = filteredPoints.length > 0 ? filteredPoints : allPoints;
    const bounds: [number, number][] = [];

    pointsToRender.forEach((point) => {
      const color = slotColors[point.slot] ?? "#E94560";
      bounds.push([point.lat, point.lng]);

      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:11px;font-weight:bold;display:block;text-align:center;line-height:28px;">${point.dayNum}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -34],
      });

      const marker = L.marker([point.lat, point.lng], { icon })
        .addTo(map)
        .bindPopup(buildPopup(point), { maxWidth: 240 });

      markersRef.current.push(marker);
    });

    if (showRoute && pointsToRender.length > 1) {
      const slotOrder: Record<string, number> = {
        "Hotel": 0,
        "Mattina": 1,
        "Pranzo": 2,
        "Pomeriggio": 3,
        "Sera": 4,
        "Traghetto": 5,
        "Noleggio": 6,
      };

      const sortedPoints = [...pointsToRender].sort((a, b) => {
        if (a.dayNum !== b.dayNum) return a.dayNum - b.dayNum;
        return (slotOrder[a.slot] ?? 9) - (slotOrder[b.slot] ?? 9);
      });

      const latlngs = sortedPoints.map((p) => [p.lat, p.lng] as [number, number]);
      routeLayerRef.current = L.polyline(latlngs, {
        color: "#E94560",
        weight: 2,
        opacity: 0.5,
        dashArray: "6, 8",
      }).addTo(map);
    }

    if (bounds.length > 1) {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }

    invalidateMapSoon();
  }, [allPoints, filteredPoints, showRoute, loading]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    invalidateMapSoon();
  }, [expanded]);

  const flyTo = (point: typeof allPoints[0], index?: number) => {
    if (!mapInstanceRef.current) return;

    mapInstanceRef.current.flyTo([point.lat, point.lng], 16, { duration: 0.8 });

    const marker = markersRef.current.find((m) => {
      const ll = m.getLatLng();
      return Math.abs(ll.lat - point.lat) < 0.0001 && Math.abs(ll.lng - point.lng) < 0.0001;
    });

    if (marker) {
      setTimeout(() => marker.openPopup(), 900);
    }

    if (index !== undefined) {
      setActivePointIndex(index);
      setTimeout(() => {
        const listEl = listRef.current;
        if (!listEl) return;
        const item = listEl.querySelector(`[data-index="${index}"]`) as HTMLElement | null;
        if (item) item.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  };

 const handleSearch = async () => {
    if (!searchQuery.trim() || !mapInstanceRef.current) return;
    setSearchLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&accept-language=it`
      );
      const data = await res.json();
      // Rimuovi pin di ricerca precedenti
      searchMarkersRef.current.forEach(m => m.remove());
      searchMarkersRef.current = [];
      if (data && data.length > 0) {
        const results = data.slice(0, 5);
        results.forEach((r: any) => {
          const lat = parseFloat(r.lat);
          const lng = parseFloat(r.lon);
          const icon = L.divIcon({
            className: "",
            html: `<div style="background:#6366f1;color:white;width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:14px;">🔍</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -16],
          });
          const marker = L.marker([lat, lng], { icon })
            .addTo(mapInstanceRef.current!)
            .bindPopup(`<div style="font-family:sans-serif;font-size:12px;font-weight:bold;color:#1a1a2e;max-width:180px;">${r.display_name}</div>`, { maxWidth: 200 });
          searchMarkersRef.current.push(marker);
        });
        mapInstanceRef.current.flyTo([parseFloat(results[0].lat), parseFloat(results[0].lon)], 14, { duration: 1 });
        setTimeout(() => searchMarkersRef.current[0]?.openPopup(), 1100);
      }
    } catch {}
    setSearchLoading(false);
  };

  if (error) {
    return (
      <div className="w-full h-[280px] rounded-[16px] flex items-center justify-center text-white/30 text-sm border border-white/8" style={{ background: "rgba(255,255,255,0.02)" }}>
        Mappa non disponibile
      </div>
    );
  }

  const legendItems: [string, string][] = [
    ["#E94560", "Mattina"],
    ["#FF8C42", "Pranzo"],
    ["#4ECDC4", "Pomeriggio"],
    ["#9B59B6", "Sera"],
    ["#1A1A2E", "Hotel"],
    ["#0EA5E9", "Traghetto"],
    ["#10B981", "Noleggio"],
  ];

  return (
    <>
      {expanded && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setExpanded(false)} />}
      <div
        className="transition-all duration-300"
        style={expanded ? {
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 1100px)",
          height: "80vh",
          zIndex: 9998,
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.7)",
          display: "flex",
        } : {
          position: "relative",
          width: "100%",
          height: "450px",
          borderRadius: "16px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {expanded && (
          <div style={{ width: "280px", flexShrink: 0, background: "#0d0820", overflowY: "auto", display: "flex", flexDirection: "column", zIndex: 10, borderRight: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ padding: "16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ fontFamily: "sans-serif", fontWeight: "bold", fontSize: "13px", color: "white" }}>{allPoints.length} luoghi</div>
                <button
                  onClick={() => setShowRoute((r) => !r)}
                  style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "bold", border: `1px solid #E94560`, background: showRoute ? "#E94560" : "rgba(233,69,96,0.1)", color: showRoute ? "white" : "#E94560", cursor: "pointer" }}
                >
                  {showRoute ? "✕ Percorso" : "↗ Percorso"}
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                <button
                  onClick={() => setActiveDay(null)}
                  style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.15)", background: activeDay === null ? "white" : "transparent", color: activeDay === null ? "#0a0814" : "rgba(255,255,255,0.5)", cursor: "pointer" }}
                >
                  Tutti
                </button>
                {uniqueDays.map((d) => (
                  <button
                    key={d}
                    onClick={() => setActiveDay(activeDay === d ? null : d)}
                    style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid rgba(255,255,255,0.15)", background: activeDay === d ? "white" : "transparent", color: activeDay === d ? "#0a0814" : "rgba(255,255,255,0.5)", cursor: "pointer" }}
                  >
                    G{d}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {uniqueSlots.map((slot) => {
                  const color = slotColors[slot] ?? "#E94560";
                  const active = activeSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(activeSlot === slot ? null : slot)}
                      style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "bold", border: `1px solid ${color}`, background: active ? color : `${color}20`, color: active ? "white" : color, cursor: "pointer" }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

          {/* Search bar */}
            <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                  placeholder="Cerca un luogo..."
                  style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px", color: "white", outline: "none" }}
                />
                <button
                  onClick={handleSearch}
                  disabled={searchLoading}
                  style={{ padding: "6px 12px", borderRadius: "10px", background: "#E94560", color: "white", fontSize: "11px", fontWeight: "bold", border: "none", cursor: "pointer", opacity: searchLoading ? 0.6 : 1 }}
                >
                  {searchLoading ? "..." : "🔍"}
                </button>
              </div>
            </div>

            <div ref={listRef} style={{ flex: 1, overflowY: "auto" }}>
              {filteredPoints.map((point, i) => {
                const color = slotColors[point.slot] ?? "#E94560";
                const globalIndex = allPoints.findIndex((p) => p.lat === point.lat && p.lng === point.lng);
                const isActive = activePointIndex === globalIndex;

                return (
                  <div
                    key={i}
                    data-index={globalIndex}
                    onClick={() => flyTo(point, globalIndex)}
                    style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.05)", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: isActive ? `${color}15` : "transparent", borderLeft: isActive ? `3px solid ${color}` : "3px solid transparent" }}
                  >
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>
                      {point.dayNum}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{point.label}</div>
                      <div style={{ fontSize: "10px", color: color, fontWeight: "bold" }}>{slotLabels[point.slot] ?? point.slot}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: "#0d0820" }}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
              <p className="text-white/30 text-xs">Caricamento mappa...</p>
            </div>
          </div>
        )}

        <div ref={mapRef} style={{ flex: 1, height: "100%" }} />

        <button
          onClick={() => setExpanded((e) => !e)}
          className="absolute top-3 right-3 bg-[#E94560] text-white rounded-full px-4 py-2 flex items-center gap-1.5 shadow-lg hover:bg-[#d63050] transition-all text-[11px] font-bold"
          style={{ zIndex: 9999 }}
        >
          <MapPin className="w-3 h-3" />
          {expanded ? "Chiudi" : "Esplora mappa"}
        </button>

        {!expanded && !loading && allPoints.length > 0 && (
          <div className="absolute top-3 left-3 z-20 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow-md" style={{ background: "rgba(10,8,20,0.8)", border: "1px solid rgba(255,255,255,0.1)" }}>
            {allPoints.length} luoghi
          </div>
        )}

        {!expanded && !loading && (
          <div className="absolute bottom-3 left-3 z-20 rounded-[10px] px-2.5 py-2 shadow-md" style={{ background: "rgba(10,8,20,0.85)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {legendItems.map(([bg, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] font-bold mb-1 last:mb-0 text-white/60">
                <span style={{ background: bg }} className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
