import { useEffect, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useItinerary } from "@/hooks/use-profiling";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Calendar, MapPin, Wallet, Briefcase, 
  ChevronDown, Share2, Printer, Clock, Compass, Sun,
  ExternalLink, Plane, Hotel, Ticket
} from "lucide-react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { useI18n } from "@/lib/i18n";

// Affiliate link renderer — contextual, not a list
function AffiliateLinks({ links }: { links?: Record<string, string> }) {
  if (!links) return null;
  const entries = Object.entries(links).filter(([, url]) => url && !url.includes("YOUR_"));
  if (entries.length === 0) return null;

  const icons: Record<string, React.ReactNode> = {
    booking: <Hotel className="w-3 h-3" />,
    skyscanner: <Plane className="w-3 h-3" />,
    getyourguide: <Ticket className="w-3 h-3" />,
    viator: <Ticket className="w-3 h-3" />,
    tripadvisor: <MapPin className="w-3 h-3" />,
    airbnb: <Hotel className="w-3 h-3" />,
  };
  const labels: Record<string, string> = {
    booking: "Prenota hotel",
    skyscanner: "Cerca voli",
    getyourguide: "Esperienze",
    viator: "Tour",
    tripadvisor: "Recensioni",
    airbnb: "Alloggi",
  };

  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {entries.slice(0, 3).map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[1.5px] rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 border border-primary/20"
        >
          {icons[key]} {labels[key] || key}
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>
      ))}
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
              <div className="p-6 md:p-10 bg-[var(--surface-card)] rounded-[24px] border border-[var(--border-subtle)] space-y-5">
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-xl text-[var(--text-primary)]">Pronto a partire?</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Le opzioni migliori per il tuo profilo, già filtrate.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {itinerary.topAffiliateLinks?.booking && (
                    <a href={itinerary.topAffiliateLinks.booking} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 bg-primary text-white font-bold rounded-full hover:bg-primary/90 transition-all shadow-md text-sm">
                      <Hotel className="w-4 h-4" /> Hotel su Booking
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </a>
                  )}
                  {itinerary.topAffiliateLinks?.skyscanner && (
                    <a href={itinerary.topAffiliateLinks.skyscanner} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 bg-[var(--surface-alt)] text-[var(--text-primary)] font-bold rounded-full hover:bg-primary/10 border border-[var(--border-subtle)] transition-all text-sm">
                      <Plane className="w-4 h-4" /> Cerca voli
                      <ExternalLink className="w-3 h-3 opacity-50" />
                    </a>
                  )}
                  {itinerary.topAffiliateLinks?.getyourguide && (
                    <a href={itinerary.topAffiliateLinks.getyourguide} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 bg-[var(--surface-alt)] text-[var(--text-primary)] font-bold rounded-full hover:bg-primary/10 border border-[var(--border-subtle)] transition-all text-sm">
                      <Ticket className="w-4 h-4" /> Esperienze
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

function DayCard({ day, isOpen, onToggle, index, t }: { day: any, isOpen: boolean, onToggle: () => void, index: number, t: (key: string) => string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Collapsible.Root open={isOpen} onOpenChange={onToggle} className="group">
        <div className={`
          border rounded-[20px] transition-all duration-300 overflow-hidden
          ${isOpen ? 'bg-[var(--surface-card)] border-primary shadow-xl ring-1 ring-primary/10' : 'bg-[var(--surface-card)] border-[var(--border-subtle)] hover:border-primary/50'}
        `}>
          <Collapsible.Trigger className="w-full flex items-center justify-between p-4 md:p-8 text-left" data-testid={`day-trigger-${index}`}>
            <div className="flex items-center gap-4 md:gap-8">
              <div className={`
                w-10 h-10 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-lg md:text-xl font-serif transition-colors shrink-0
                ${isOpen ? 'bg-primary text-white' : 'bg-[var(--surface-alt)] text-[var(--text-primary)] group-hover:bg-primary/10'}
              `}>
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                   <Clock className="w-3.5 h-3.5" /> {t('itin.morning')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">
                  {day.morning}
                </p>
              </div>

              <div className="w-12 h-px bg-[var(--border-subtle)]" />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                   <Compass className="w-3.5 h-3.5" /> {t('itin.lunch')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">
                  {day.lunch}
                </p>
              </div>

              <div className="w-12 h-px bg-[var(--border-subtle)]" />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                   <Sun className="w-3.5 h-3.5" /> {t('itin.afternoon')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">
                  {day.afternoon}
                </p>
              </div>

              <div className="w-12 h-px bg-[var(--border-subtle)]" />

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[2px]">
                   <Clock className="w-3.5 h-3.5" /> {t('itin.evening')}
                </div>
                <p className="text-[var(--text-secondary)] font-sans leading-relaxed text-[15px]">
                  {day.evening}
                </p>
              </div>

              {/* Contextual affiliate links for this day */}
              {day.affiliateLinks && Object.keys(day.affiliateLinks).length > 0 && (
                <div className="pt-2">
                  <AffiliateLinks links={day.affiliateLinks} />
                </div>
              )}
            </div>
          </Collapsible.Content>
        </div>
      </Collapsible.Root>
    </motion.div>
  );
}
