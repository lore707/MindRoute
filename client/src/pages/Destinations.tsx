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
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = getStoredDestinations();
    if (!stored || stored.length === 0) {
      setLocation("/profiling");
    } else {
      setDestinations(stored);
    }
  }, [setLocation]);

  if (destinations.length === 0) return null;

  const handleSelect = (destId: number) => {
    setSelectedId(destId);
  };

  const handleContinue = () => {
    if (selectedId) {
      setLocation(`/itinerary/${selectedId}`);
    }
  };

  const selectedName = destinations.find(d => d.id === selectedId)?.name;

  return (
    <div className="container max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-20">
      <div className="text-center max-w-3xl mx-auto mb-10 md:mb-16">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-serif font-bold"
          data-testid="text-dest-title"
        >
          {t('dest.title')}
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
              scale: selectedId === dest.id ? 1.02 : 1
            }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handleSelect(dest.id)}
            data-testid={`card-dest-${dest.id}`}
            className={`
              group relative flex flex-col h-full bg-[var(--surface-card)] rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer
              ${selectedId === dest.id ? 'border-primary ring-1 ring-primary' : 'border-[var(--border-subtle)] shadow-sm hover:shadow-xl hover:-translate-y-1'}
            `}
          >
            <div className="relative h-48 md:h-64 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10" />
              <img 
                src={dest.imageUrl || `https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80`}
                alt={dest.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute bottom-6 left-6 z-20 text-white">
                <h3 className="text-2xl md:text-3xl font-serif font-bold tracking-tight">{dest.name}</h3>
              </div>
            </div>

            <div className="flex-1 p-5 md:p-8 flex flex-col gap-6">
              <div className="space-y-1">
                <h4 className="text-[10px] font-sans font-bold text-primary uppercase tracking-[2px]">{t('dest.why')}</h4>
                <p className="text-muted-foreground font-sans text-sm leading-relaxed">
                  {dest.whyYours}
                </p>
              </div>
              
              <div className="p-5 bg-[var(--surface-alt)] rounded-xl border border-[var(--border-subtle)]">
                <h4 className="text-[10px] font-sans font-bold text-foreground uppercase tracking-[2px] mb-2">{t('dest.experience')}</h4>
                <p className="text-foreground/80 font-serif italic text-[15px] leading-relaxed">
                  "{dest.experiencePreview}"
                </p>
              </div>

              <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
                <h4 className="text-[10px] font-sans font-bold text-foreground uppercase tracking-[2px] mb-2">{t('dest.practical')}</h4>
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
              data-testid="button-continue-dest"
              className="btn-primary group px-8 py-4 text-base md:px-12 md:py-5 md:text-lg shadow-2xl"
            >
              {t('dest.choose')} {selectedName?.split(',')[0]} <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
