import { useState, useEffect, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useItinerary } from "@/hooks/use-profiling";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Wallet, Briefcase, 
  ChevronDown, Share2, Printer, Clock, Compass, Sun,
  ExternalLink, Plane, Hotel, Ticket, Utensils, Star, MapPin
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useI18n } from "@/lib/i18n";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type AffiliateCfg = { icon: JSX.Element; label: string; color: string };

// ── Rileva regione da destinationName ─────────────────────────────────────────
function detectRegion(name: string): string {
  const n = name.toLowerCase();
  if (/grecia|greece|creta|crete|cipro|cyprus|malta|croazia|croatia|montenegro|albania|turchia|turkey/.test(n)) return "mediterranean";
  if (/india|mumbai|delhi|bangalore|chennai|kolkata|jaipur|goa/.test(n)) return "india";
  if (/giappone|japan|cina|china|corea|korea|thailand|tailandia|vietnam|indonesia|bali|cambogia|cambodia|laos|myanmar|malesia|malaysia|singapore|filippine|philippines|sri lanka/.test(n)) return "asia";
  if (/messico|mexico|colombia|peru|perù|brasile|brazil|argentina|cile|chile|ecuador|bolivia|venezuela|costa rica|panama|guatemala|cuba|dominicana/.test(n)) return "latam";
  if (/marocco|morocco|egitto|egypt|kenya|tanzania|sudafrica|south africa|ghana|senegal|etiopia|ethiopia|nigeria|tunisia|algeria/.test(n)) return "africa";
  if (/italia|italy|france|francia|spagna|spain|portogallo|portugal|germania|germany|austria|svizzera|switzerland|belgio|belgium|olanda|netherlands|polonia|poland|czech|ceca|ungheria|hungary|romania|bulgaria|svezia|sweden|norvegia|norway|danimarca|denmark|finlandia|finland|irlanda|ireland|scozia|scotland|inghilterra|england|uk|londra|london|parigi|paris|barcellona|barcelona|amsterdam|berlino|berlin|vienna|praga|prague|budapest|lisbona|lisbon|madrid|roma|rome|milano|milan|napoli|naples|firenze|florence|venezia|venice/.test(n)) return "europe";
  return "europe"; // fallback
}

// ── Link per regione (max 5 nel conversion block) ─────────────────────────────
function getRegionLinks(region: string, links: Record<string, string>): { key: string; url: string; icon: JSX.Element; label: string; style: string }[] {
  const pill = (icon: JSX.Element, label: string, style: string, key: string) => {
    const url = links[key];
    if (!url) return null;
    return { key, url, icon, label, style };
  };

  const primary = "flex items-center gap-2 px-5 py-3 font-bold rounded-full shadow-md text-sm text-white transition-all";
  const secondary = "flex items-center gap-2 px-4 py-2.5 font-bold rounded-full border text-sm transition-all bg-[var(--surface-alt)] text-[var(--text-primary)] border-[var(--border-subtle)]";

  const skyscanner = pill(<Plane className="w-4 h-4" />, "Cerca voli", `${primary} bg-sky-500 hover:bg-sky-600`, "skyscanner");
  const bookingHotel = pill(<Hotel className="w-4 h-4" />, "Hotel consigliato", `${primary} bg-primary hover:bg-primary/90`, "booking_hotel");
  const bookingSearch = pill(<Hotel className="w-4 h-4" />, "Hotel su Booking", `${primary} bg-primary hover:bg-primary/90`, "booking_search");
  const hotelLink = bookingHotel ?? bookingSearch;

  const gyg1 = pill(<Ticket className="w-4 h-4 text-primary" />, "Esperienza 1", `${secondary} hover:bg-primary/10`, "getyourguide_1");
  const gyg2 = pill(<Ticket className="w-4 h-4 text-primary" />, "Esperienza 2", `${secondary} hover:bg-primary/10`, "getyourguide_2");
  const tripadvisor = pill(<Star className="w-4 h-4 text-green-600" />, "TripAdvisor", `${secondary} hover:bg-green-500/10 hover:border-green-500/30`, "tripadvisor");
  const thefork = pill(<Utensils className="w-4 h-4 text-orange-500" />, "Ristorante", `${secondary} hover:bg-orange-500/10 hover:border-orange-500/30`, "thefork");
  const agoda = pill(<Hotel className="w-4 h-4 text-blue-400" />, "Agoda", `${secondary} hover:bg-blue-500/10`, "agoda");
  const klook = pill(<Ticket className="w-4 h-4 text-red-500" />, "Klook", `${secondary} hover:bg-red-500/10`, "klook");
  const viator = pill(<Ticket className="w-4 h-4 text-primary" />, "Viator", `${secondary} hover:bg-primary/10`, "viator");
  const civitatis = pill(<Ticket className="w-4 h-4 text-yellow-600" />, "Civitatis", `${secondary} hover:bg-yellow-500/10`, "civitatis");
  const hostelworld = pill(<Hotel className="w-4 h-4 text-purple-500" />, "Hostelworld", `${secondary} hover:bg-purple-500/10`, "hostelworld");
  const ferryhopper = pill(<Plane className="w-4 h-4 text-blue-500" />, "Traghetti", `${secondary} hover:bg-blue-500/10`, "ferryhopper");
  const rentalcars = pill(<Plane className="w-4 h-4 text-gray-500" />, "Noleggio auto", `${secondary}`, "rentalcars");
  const go12 = pill(<Plane className="w-4 h-4 text-teal-500" />, "Trasporti locali", `${secondary} hover:bg-teal-500/10`, "12go");
  const bookaway = pill(<Plane className="w-4 h-4 text-indigo-500" />, "Bus locali", `${secondary} hover:bg-indigo-500/10`, "bookaway");

  const sets: Record<string, (typeof skyscanner)[]> = {
    europe: [skyscanner, hotelLink, gyg1, thefork, tripadvisor],
    mediterranean: [skyscanner, hotelLink, gyg1, ferryhopper, tripadvisor],
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
    booking_hotel: { icon: <Hotel className="w-3 h-3" />, label: "Hotel", color: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500 hover:text-white" },
    booking_search: { icon: <Hotel className="w-3 h-3" />, label: "Alloggi", color: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500 hover:text-white" },
    skyscanner: { icon: <Plane className="w-3 h-3" />, label: "Voli", color: "bg-sky-500/10 text-sky-600 border-sky-500/20 hover:bg-sky-500 hover:text-white" },
    getyourguide_1: { icon: <Ticket className="w-3 h-3" />, label: "Esperienza 1", color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white" },
    getyourguide_2: { icon: <Ticket className="w-3 h-3" />, label: "Esperienza 2", color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white" },
    thefork: { icon: <Utensils className="w-3 h-3" />, label: "Ristorante", color: "bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500 hover:text-white" },
    tripadvisor: { icon: <Star className="w-3 h-3" />, label: "Recensioni", color: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500 hover:text-white" },
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {entries.map(([key, url]) => {
        const c: AffiliateCfg = cfg[key] ?? { icon: <ExternalLink className="w-3 h-3" />, label: key, color: "bg-primary/10 text-primary border-primary/20 hover:bg-primary hover:text-white" };
        return (
          <a key={key} href={url} target="_blank" rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full border transition-all duration-200 ${c.color}`}>
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
  const { data: itinerary, isLoading, error } = useItinerary(id);
  const [openDay, setOpenDay] = useState<number | null>(0);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface)]">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-secondary)] font-serif italic text-xl animate-pulse" data-testid="text-loading">{t('itin.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !itinerary) {
    return (
      <div className="container max-w-lg mx-auto py-32 text-center bg-[var(--surface)] min-h-screen">
        <h2 className="text-3xl font-serif font-bold mb-6" data-testid="text-notfound">{t('itin.notfound')}</h2>
        <Link href="/destinations" className="btn-primary" data-testid="link-return">
          {t('itin.return')}
        </Link>
      </div>
    );
  }

 const links = itinerary.topAffiliateLinks ?? {};
  const region = detectRegion(itinerary.destinationName ?? "");
  const regionLinks = getRegionLinks(region, links);

  return (
    <div className="bg-[var(--surface)] min-h-screen pt-32 pb-24 transition-colors duration-300">
      <div className="container max-w-6xl mx-auto px-4 md:px-6">
        <Link href="/destinations" className="inline-flex items-center text-sm font-semibold text-[var(--text-secondary)] hover:text-primary mb-6 md:mb-12 transition-colors group" data-testid="link-back-dest">
          <ArrowLeft className="w-4 h-4 mr-2 transition-transform group-hover:-translate-x-1" /> {t('itin.back')}
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 md:gap-16 items-start">
          <div className="space-y-16">
            <header>
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[3px] rounded-full">
                  {t('itin.label')}
                </span>
                <h1 className="text-3xl md:text-5xl lg:text-7xl font-serif font-bold text-[var(--text-primary)] tracking-tight" data-testid="text-itin-title">
                  {t('itin.trip')} {itinerary.destinationName || ''}
                </h1>
                <p className="text-xl text-[var(--text-secondary)] font-sans font-light max-w-2xl leading-relaxed">
                  {itinerary.days?.length || 7}{t('itin.experience')}
                </p>
              </motion.div>
            </header>

            <section>
              <div className="flex items-center justify-between mb-10 pb-4 border-b border-[var(--border-subtle)]">
                <h2 className="text-3xl font-serif font-bold">{t('itin.daybyday')}</h2>
                <div className="flex gap-4">
                   <button className="p-2.5 text-[var(--text-secondary)] hover:text-primary transition-colors bg-[var(--surface-card)] rounded-full border border-[var(--border-subtle)] shadow-sm" title={t('itin.print')} data-testid="button-print">
                     <Printer className="w-5 h-5" />
                   </button>
                   <button className="p-2.5 text-[var(--text-secondary)] hover:text-primary transition-colors bg-[var(--surface-card)] rounded-full border border-[var(--border-subtle)] shadow-sm" title={t('itin.share')} data-testid="button-share">
                     <Share2 className="w-5 h-5" />
                   </button>
                </div>
              </div>

              <div className="space-y-4 md:space-y-6">
                {itinerary.days.map((day: any, index: number) => (
                  <DayCard 
                    key={index} 
                    day={day} 
                    isOpen={openDay === index}
                    onToggle={() => setOpenDay(openDay === index ? null : index)}
                    index={index}
                    t={t}
                  />
                ))}
              </div>
            </section>

      {/* MAPPA A TUTTA LARGHEZZA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-3 text-primary">
                <MapPin className="w-5 h-5" />
                <h2 className="text-2xl font-serif font-bold text-[var(--text-primary)]">Mappa del viaggio</h2>
              </div>
              <ItineraryMap days={itinerary.days} destinationName={itinerary.destinationName} />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="space-y-6"
            >
             {/* CONVERSION BLOCK */}
              <div className="p-6 md:p-10 bg-[var(--surface-card)] rounded-[24px] border border-[var(--border-subtle)] space-y-6">
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-xl text-[var(--text-primary)]">Pronto a partire?</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Le opzioni migliori per il tuo profilo, già filtrate.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {regionLinks.map(({ key, url, icon, label, style }) => (
                    <a key={key} href={url} target="_blank" rel="noopener noreferrer" className={style}>
                      {icon} {label}
                      <ExternalLink className="w-3 h-3 opacity-60 ml-1" />
                    </a>
                  ))}
                  {/* gyg2 separato se disponibile */}
                  {links.getyourguide_2 && region !== "asia" && (
                    <a href={links.getyourguide_2} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 font-bold rounded-full border text-sm transition-all bg-[var(--surface-alt)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-primary/10">
                      <Ticket className="w-4 h-4 text-primary" /> Esperienza 2
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  )}
                </div>
              </div>

              {/* CLOSING MESSAGE */}
              <div className="p-8 md:p-16 bg-[#1A1A2E] text-white rounded-[32px] text-center space-y-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(233,69,96,0.1)_0%,transparent_70%)] pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <p className="text-white/80 font-serif italic text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed">
                    "{itinerary.closingMessage}"
                  </p>
                  <p className="text-white/40 text-sm font-sans tracking-wide">{t('itin.different')} <Link href="/destinations" className="text-primary hover:underline underline-offset-4" data-testid="link-choose-another">{t('itin.goback')}</Link></p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 justify-center relative z-10">
                  <button className="px-6 py-4 text-base md:px-10 md:py-5 md:text-lg rounded-full border-2 border-white text-white font-bold hover:bg-white/10 transition-all" data-testid="button-pdf">
                    {t('itin.pdf')}
                  </button>
                  <button
                    onClick={() => setLocation("/")}
                    data-testid="button-startover"
                    className="px-6 py-4 text-base md:px-10 md:py-5 md:text-lg rounded-full bg-white text-[#1A1A2E] font-bold hover:bg-white/90 transition-all"
                  >
                    {t('itin.startover')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <aside className="space-y-8 lg:sticky lg:top-32">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-[var(--surface-card)] p-5 md:p-8 rounded-[24px] border border-[var(--border-subtle)] shadow-sm space-y-10"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <Wallet className="w-5 h-5" />
                  <h3 className="font-bold font-serif text-lg text-[var(--text-primary)]">{t('itin.budget')}</h3>
                </div>
                <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed">
                  {itinerary.budgetSummary}
                </p>
              </div>

              <div className="w-full h-px bg-[var(--border-subtle)]" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <Briefcase className="w-5 h-5" />
                  <h3 className="font-bold font-serif text-lg text-[var(--text-primary)]">{t('itin.packing')}</h3>
                </div>
                <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                  {itinerary.packingList}
                </p>
              </div>

              <div className="w-full h-px bg-[var(--border-subtle)]" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <Sun className="w-5 h-5" />
                  <h3 className="font-bold font-serif text-lg text-[var(--text-primary)]">{t('itin.besttime')}</h3>
                </div>
                <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed">
                  {itinerary.bestTime}
                </p>
              </div>

              <div className="w-full h-px bg-[var(--border-subtle)]" />

              <div className="space-y-4">
                <div className="flex items-center gap-3 text-primary">
                  <Compass className="w-5 h-5" />
                  <h3 className="font-bold font-serif text-lg text-[var(--text-primary)]">{t('itin.getting')}</h3>
                </div>
      <p className="text-sm font-sans text-[var(--text-secondary)] leading-relaxed">
                  {itinerary.gettingThere}
                </p>
              </div>
            </motion.div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DayCard({ day, isOpen, onToggle, index, t }: { day: any; isOpen: boolean; onToggle: () => void; index: number; t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Collapsible.Root open={isOpen} onOpenChange={onToggle} className="group">
        <div className={`border rounded-[20px] transition-all duration-300 overflow-hidden ${isOpen ? 'bg-[var(--surface-card)] border-primary shadow-xl ring-1 ring-primary/10' : 'bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-primary/50'}`}>
          <Collapsible.Trigger className="w-full flex items-center justify-between p-4 md:p-8 text-left" data-testid={`day-trigger-${index}`}>
            <div className="flex items-center gap-4 md:gap-8">
              <div className={`w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-lg md:text-xl font-serif transition-colors shrink-0 ${isOpen ? 'bg-primary text-white' : 'bg-[var(--surface-alt)] text-[var(--text-primary)] group-hover:bg-primary/10'}`}>
                {day.dayNumber}
              </div>
              <div>
                <h4 className="font-serif font-bold text-lg md:text-2xl text-[var(--text-primary)] leading-tight">{day.title}</h4>
              </div>
            </div>
            <ChevronDown className={`w-6 h-6 text-[var(--text-secondary)] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </Collapsible.Trigger>

          <Collapsible.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
            <div className="px-4 md:px-8 pb-10 pt-2 ml-12 md:ml-[88px] border-l-2 border-dashed border-[var(--border-subtle)] pl-5 md:pl-10 space-y-8 md:space-y-10">

              {/* MATTINA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                  <Clock className="w-3.5 h-3.5" /> {t('itin.morning')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">{day.morning}</p>
           {(day.affiliateLinks?.getyourguide_morning || day.affiliateLinks?.klook_morning || day.affiliateLinks?.viator_morning) && (
                  <a href={day.affiliateLinks.getyourguide_morning ?? day.affiliateLinks.klook_morning ?? day.affiliateLinks.viator_morning} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all duration-200">
                    <Ticket className="w-3 h-3" /> Prenota attività
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
                {(day.affiliateLinks?.getyourguide_place_morning || day.affiliateLinks?.klook_place_morning || day.affiliateLinks?.viator_place_morning) && (
                  <a href={day.affiliateLinks.getyourguide_place_morning ?? day.affiliateLinks.klook_place_morning ?? day.affiliateLinks.viator_place_morning} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all duration-200">
                    <Ticket className="w-3 h-3" /> Tour del luogo
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
              </div>

              <div className="w-12 h-px bg-[var(--border-subtle)]" />

              {/* PRANZO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                  <Utensils className="w-3.5 h-3.5" /> {t('itin.lunch')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">{day.lunch}</p>
          {(day.affiliateLinks?.thefork_lunch || day.affiliateLinks?.tripadvisor_lunch) && (
                  <a href={day.affiliateLinks.thefork_lunch ?? day.affiliateLinks.tripadvisor_lunch} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all duration-200">
                    <Utensils className="w-3 h-3" />
                    {day.affiliateLinks?.thefork_lunch ? "Prenota tavolo" : "Vedi su TripAdvisor"}
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
              </div>

              <div className="w-12 h-px bg-[var(--border-subtle)]" />

              {/* POMERIGGIO */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                  <Sun className="w-3.5 h-3.5" /> {t('itin.afternoon')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">{day.afternoon}</p>
       {(day.affiliateLinks?.getyourguide_afternoon || day.affiliateLinks?.klook_afternoon || day.affiliateLinks?.viator_afternoon) && (
                  <a href={day.affiliateLinks.getyourguide_afternoon ?? day.affiliateLinks.klook_afternoon ?? day.affiliateLinks.viator_afternoon} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all duration-200">
                    <Ticket className="w-3 h-3" /> Prenota attività
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
                {(day.affiliateLinks?.getyourguide_place_afternoon || day.affiliateLinks?.klook_place_afternoon || day.affiliateLinks?.viator_place_afternoon) && (
                  <a href={day.affiliateLinks.getyourguide_place_afternoon ?? day.affiliateLinks.klook_place_afternoon ?? day.affiliateLinks.viator_place_afternoon} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all duration-200">
                    <Ticket className="w-3 h-3" /> Tour del luogo
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
              </div>

              <div className="w-12 h-px bg-[var(--border-subtle)]" />

              {/* SERA */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                  <Clock className="w-3.5 h-3.5" /> {t('itin.evening')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">{day.evening}</p>
          {(day.affiliateLinks?.thefork_evening || day.affiliateLinks?.tripadvisor_evening || day.affiliateLinks?.tripadvisor_evening_fallback) && (
                  <a href={day.affiliateLinks.thefork_evening ?? day.affiliateLinks.tripadvisor_evening ?? day.affiliateLinks.tripadvisor_evening_fallback} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full bg-orange-500/10 text-orange-600 border border-orange-500/20 hover:bg-orange-500 hover:text-white transition-all duration-200">
                    <Utensils className="w-3 h-3" />
                    {day.affiliateLinks?.thefork_evening ? "Prenota tavolo" : "Ristoranti consigliati"}
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                )}
              </div>

              {/* Link generici rimanenti del giorno */}
              {day.affiliateLinks && Object.keys(day.affiliateLinks).filter(
             k => !["getyourguide_morning", "getyourguide_afternoon", "klook_morning", "klook_afternoon", "viator_morning", "viator_afternoon", "getyourguide_place_morning", "getyourguide_place_afternoon", "klook_place_morning", "klook_place_afternoon", "viator_place_morning", "viator_place_afternoon", "thefork_lunch", "thefork_evening", "tripadvisor_lunch", "tripadvisor_evening", "tripadvisor_evening_fallback"].includes(k)
              ).length > 0 && (
                <div className="pt-2">
                  <AffiliateLinks links={Object.fromEntries(
                    Object.entries(day.affiliateLinks).filter(
               k => !["getyourguide_morning", "getyourguide_afternoon", "klook_morning", "klook_afternoon", "viator_morning", "viator_afternoon", "getyourguide_place_morning", "getyourguide_place_afternoon", "klook_place_morning", "klook_place_afternoon", "viator_place_morning", "viator_place_afternoon", "thefork_lunch", "thefork_evening", "tripadvisor_lunch", "tripadvisor_evening", "tripadvisor_evening_fallback"].includes(k)
                    )
                  )} />
                </div>
              )}

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);
const [allPoints, setAllPoints] = useState<{ label: string; slot: string; lat: number; lng: number; dayNum: number; imageUrl?: string; affiliateUrl?: string }[]>([]);
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const slotColors: Record<string, string> = {
    "Mattina": "#E94560", "Pranzo": "#FF8C42", "Pomeriggio": "#4ECDC4",
    "Sera": "#9B59B6", "Hotel": "#1A1A2E", "Traghetto": "#0EA5E9", "Noleggio": "#10B981",
  };
  const slotLabels: Record<string, string> = {
    "Mattina": "🌅 Mattina", "Pranzo": "🍽️ Pranzo", "Pomeriggio": "☀️ Pomeriggio",
    "Sera": "🌙 Sera", "Hotel": "🏨 Hotel", "Traghetto": "⛴️ Traghetto", "Noleggio": "🚗 Noleggio",
  };

  const uniqueDays = [...new Set(allPoints.map(p => p.dayNum))].sort((a, b) => a - b);
  const uniqueSlots = [...new Set(allPoints.map(p => p.slot))];

  const filteredPoints = allPoints.filter(p => {
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
      <div style="display:inline-block;padding:2px 8px;background:${color}20;color:${color};border-radius:20px;font-size:10px;font-weight:bold;margin-bottom:5px;">${slotLabel} · Giorno ${point.dayNum}</div>
      <div style="font-size:13px;font-weight:bold;color:#1a1a2e;line-height:1.3;">${point.label}</div>
      ${btnHtml}
    </div>`;
  };

  // Aggiorna marker visibili quando cambiano i filtri
  useEffect(() => {
    if (!mapInstanceRef.current || allPoints.length === 0) return;
    const map = mapInstanceRef.current;

    // Rimuovi tutti i marker esistenti
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const bounds: [number, number][] = [];
    filteredPoints.forEach((point) => {
      const color = slotColors[point.slot] ?? "#E94560";
      bounds.push([point.lat, point.lng]);
      const icon = L.divIcon({
        className: "",
        html: `<div style="background:${color};color:white;width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="transform:rotate(45deg);font-size:11px;font-weight:bold;display:block;text-align:center;line-height:28px;">${point.dayNum}</span></div>`,
        iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -34],
      });
      const marker = L.marker([point.lat, point.lng], { icon }).addTo(map).bindPopup(buildPopup(point), { maxWidth: 240 });
      markersRef.current.push(marker);
    });

    if (bounds.length > 1) map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
    else if (bounds.length === 1) map.setView(bounds[0], 15);
  }, [activeDay, activeSlot, allPoints]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const points: typeof allPoints = [];
    days.forEach((day: any) => {
      if (day.mapPoints && Array.isArray(day.mapPoints)) {
        day.mapPoints.forEach((p: any) => {
          if (p.lat && p.lng && p.lat !== 0 && p.lng !== 0) {
            points.push({ ...p, dayNum: day.dayNumber });
          }
        });
      }
    });

    const avgLat = points.length > 0 ? points.reduce((s, p) => s + p.lat, 0) / points.length : 0;
    const avgLng = points.length > 0 ? points.reduce((s, p) => s + p.lng, 0) / points.length : 0;

    const initMap = (centerLat: number, centerLon: number) => {
      const map = L.map(mapRef.current!, {
        center: [centerLat, centerLon],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });
      mapInstanceRef.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);
      return map;
    };

    if (points.length > 0) {
      initMap(avgLat, avgLng);
      setAllPoints(points);
      setLoading(false);
    } else {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(destinationName)}&format=json&limit=1&accept-language=en`)
        .then(r => r.json())
        .then(async (results) => {
          if (!results || results.length === 0) { setError(true); setLoading(false); return; }
          const map = initMap(parseFloat(results[0].lat), parseFloat(results[0].lon));
          const cityName = destinationName.split(",")[0].trim();
          const countryName = destinationName.split(",")[1]?.trim() ?? "";
          const fallbackPlaces: { label: string; dayNum: number; slot: string; searchQuery: string }[] = [];
          days.forEach((day: any) => {
            [{ text: day.morning, slot: "Mattina" }, { text: day.lunch, slot: "Pranzo" },
             { text: day.afternoon, slot: "Pomeriggio" }, { text: day.evening, slot: "Sera" }]
              .forEach(({ text, slot }) => {
                if (!text || text.length <= 3) return;
                const lower = text.toLowerCase();
                if (lower.includes("volo") || lower.includes("aeroporto") || lower.includes("trasferimento")) return;
                const name = text.split(/—|,|\.|–/)[0].trim();
                if (name.length > 3) fallbackPlaces.push({ label: name, dayNum: day.dayNumber, slot, searchQuery: `${name} ${cityName} ${countryName}` });
              });
          });
          const seen = new Set<string>();
          const fallbackPoints: typeof allPoints = [];
          for (const place of fallbackPlaces.slice(0, 8)) {
            if (seen.has(place.label)) continue;
            seen.add(place.label);
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place.searchQuery)}&format=json&limit=1&accept-language=en`);
              const data = await res.json();
              if (data && data.length > 0) {
                fallbackPoints.push({ label: place.label, slot: place.slot, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), dayNum: place.dayNum });
              }
              await new Promise(r => setTimeout(r, 250));
            } catch { /* skip */ }
          }
          setAllPoints(fallbackPoints);
          setLoading(false);
        })
        .catch(() => { setError(true); setLoading(false); });
    }

    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
      if (mapInstanceRef.current && allPoints.length > 1) {
        mapInstanceRef.current.fitBounds(allPoints.map(p => [p.lat, p.lng]) as L.LatLngBoundsExpression, { padding: [40, 40] });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [expanded]);

const flyTo = (point: typeof allPoints[0], index?: number) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([point.lat, point.lng], 16, { duration: 0.8 });
      const marker = markersRef.current.find(m => {
        const ll = m.getLatLng();
        return Math.abs(ll.lat - point.lat) < 0.0001 && Math.abs(ll.lng - point.lng) < 0.0001;
      });
      if (marker) setTimeout(() => marker.openPopup(), 900);
      if (index !== undefined) {
        setActivePointIndex(index);
        // Scroll automatico nella lista
        setTimeout(() => {
          const listEl = listRef.current;
          if (listEl) {
            const item = listEl.querySelector(`[data-index="${index}"]`) as HTMLElement;
            if (item) item.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
    }
  };

  // Aggiorna/rimuovi linea percorso
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (routeLayerRef.current) { routeLayerRef.current.remove(); routeLayerRef.current = null; }
    if (!showRoute || filteredPoints.length < 2) return;
const slotOrder: Record<string, number> = { "Hotel": 0, "Mattina": 1, "Pranzo": 2, "Pomeriggio": 3, "Sera": 4, "Traghetto": 5, "Noleggio": 6 };
    const sortedPoints = [...filteredPoints].sort((a, b) => {
      if (a.dayNum !== b.dayNum) return a.dayNum - b.dayNum;
      return (slotOrder[a.slot] ?? 9) - (slotOrder[b.slot] ?? 9);
    });
    const latlngs = sortedPoints.map(p => [p.lat, p.lng] as [number, number]);
    routeLayerRef.current = L.polyline(latlngs, {
      color: "#E94560",
      weight: 2,
      opacity: 0.5,
      dashArray: "6, 8",
    }).addTo(mapInstanceRef.current);
  }, [showRoute, filteredPoints, allPoints]);

  if (error) return (
    <div className="w-full h-[280px] rounded-[16px] bg-[var(--surface-alt)] flex items-center justify-center text-[var(--text-secondary)] text-sm border border-[var(--border-subtle)]">
      Mappa non disponibile
    </div>
  );

  const legendItems: [string, string][] = [
    ["#E94560", "Mattina"], ["#FF8C42", "Pranzo"], ["#4ECDC4", "Pomeriggio"],
    ["#9B59B6", "Sera"], ["#1A1A2E", "Hotel"], ["#0EA5E9", "Traghetto"], ["#10B981", "Noleggio"],
  ];

  return (
    <>
      {expanded && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setExpanded(false)} />
      )}

      <div
        className="transition-all duration-300"
        style={expanded ? {
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(92vw, 1100px)", height: "85vh",
          zIndex: 50, borderRadius: "20px", overflow: "hidden",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          display: "flex",
        } : {
      position: "relative", width: "100%", height: "450px",
          borderRadius: "16px", overflow: "hidden",
          border: "1px solid var(--border-subtle)",
        }}
      >
        {/* Pannello lista — solo quando expanded */}
        {expanded && (
          <div style={{ width: "280px", flexShrink: 0, background: "white", overflowY: "auto", display: "flex", flexDirection: "column", zIndex: 10 }}>
      {/* Header pannello */}
            <div style={{ padding: "16px", borderBottom: "1px solid #f0f0f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <div style={{ fontFamily: "sans-serif", fontWeight: "bold", fontSize: "14px", color: "#1a1a2e" }}>
                  {allPoints.length} luoghi mappati
                </div>
                <button
                  onClick={() => setShowRoute(r => !r)}
                  style={{ padding: "4px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "bold", border: `1px solid #E94560`, background: showRoute ? "#E94560" : "#E9456015", color: showRoute ? "white" : "#E94560", cursor: "pointer" }}
                >
                  {showRoute ? "✕ Percorso" : "↗ Percorso"}
                </button>
              </div>

              {/* Filtro per giorno */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                <button
                  onClick={() => setActiveDay(null)}
                  style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid #ddd", background: activeDay === null ? "#1a1a2e" : "white", color: activeDay === null ? "white" : "#666", cursor: "pointer" }}
                >
                  Tutti
                </button>
                {uniqueDays.map(d => (
                  <button
                    key={d}
                    onClick={() => setActiveDay(activeDay === d ? null : d)}
                    style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: "bold", border: "1px solid #ddd", background: activeDay === d ? "#1a1a2e" : "white", color: activeDay === d ? "white" : "#666", cursor: "pointer" }}
                  >
                    G{d}
                  </button>
                ))}
              </div>

              {/* Filtro per slot */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {uniqueSlots.map(slot => {
                  const color = slotColors[slot] ?? "#E94560";
                  const active = activeSlot === slot;
                  return (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(activeSlot === slot ? null : slot)}
                      style={{ padding: "3px 8px", borderRadius: "20px", fontSize: "10px", fontWeight: "bold", border: `1px solid ${color}`, background: active ? color : `${color}15`, color: active ? "white" : color, cursor: "pointer" }}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

       {/* Lista luoghi */}
            <div ref={listRef} style={{ flex: 1, overflowY: "auto" }}>
              {filteredPoints.map((point, i) => {
                const color = slotColors[point.slot] ?? "#E94560";
                const globalIndex = allPoints.findIndex(p => p.lat === point.lat && p.lng === point.lng);
                const isActive = activePointIndex === globalIndex;
                return (
                  <div
                    key={i}
                    data-index={globalIndex}
                    onClick={() => flyTo(point, globalIndex)}
                    style={{ padding: "10px 14px", borderBottom: "1px solid #f5f5f5", cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", transition: "background 0.15s", background: isActive ? `${color}12` : "white", borderLeft: isActive ? `3px solid ${color}` : "3px solid transparent" }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f9f9f9"; }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "white"; }}
                  >
                    <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: color, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>
                      {point.dayNum}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1a1a2e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {point.label}
                      </div>
                      <div style={{ fontSize: "10px", color: color, fontWeight: "bold" }}>
                        {slotLabels[point.slot] ?? point.slot}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-[var(--surface-alt)] flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-[var(--text-secondary)] text-xs">Caricamento mappa...</p>
            </div>
          </div>
        )}

        <div ref={mapRef} style={{ flex: 1, height: "100%" }} />

        {/* Bottone espandi/chiudi */}
  <button
          onClick={() => setExpanded(e => !e)}
          className="absolute bottom-3 right-3 z-20 bg-primary text-white rounded-full px-4 py-2 flex items-center gap-1.5 shadow-lg hover:bg-primary/90 transition-all text-[11px] font-bold"
        >
          <MapPin className="w-3 h-3" />
          {expanded ? "Chiudi" : "Esplora mappa"}
        </button>

        {/* Contatore pin — solo mappa piccola */}
        {!expanded && !loading && allPoints.length > 0 && (
          <div className="absolute top-3 left-3 z-20 bg-white/95 rounded-full px-2.5 py-1 text-[10px] font-bold text-gray-700 shadow-md border border-gray-100">
            {allPoints.length} luoghi
          </div>
        )}

        {/* Legenda — solo mappa piccola */}
        {!expanded && !loading && (
          <div className="absolute bottom-3 left-3 z-20 bg-white/95 rounded-[10px] px-2.5 py-2 shadow-md border border-gray-100">
            {legendItems.map(([bg, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-[10px] font-bold mb-1 last:mb-0">
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
