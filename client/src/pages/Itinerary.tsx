import { useState } from "react";
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
