import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

const PHOTOS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1490077476659-095159692ab5?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1552733407-5d5c46c3bb3b?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1499678329028-101435549a4e?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1520645521318-f03a712f0e67?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1542308270-f5e8e98a5f78?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1560969184-10fe8719e047?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1543158181-e6f9f6712055?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=500&h=350&fit=crop",
  "https://images.unsplash.com/photo-1504214208698-ea1916a2195a?w=500&h=350&fit=crop",
];

const GRID_SIZE = 12; // 4x3

interface AnalyzingScreenProps {
  titleHtml: string;
  visibleTraits: string[];
}

export function AnalyzingScreen({ titleHtml, visibleTraits }: AnalyzingScreenProps) {
  const [offsets, setOffsets] = useState<number[]>(
    Array.from({ length: GRID_SIZE }, (_, i) => i % PHOTOS.length)
  );

  // Ogni cella cambia foto in modo indipendente e asincrono
  useEffect(() => {
    const intervals = Array.from({ length: GRID_SIZE }, (_, cellIndex) => {
      const delay = cellIndex * 300 + Math.random() * 600;
      const interval = 1500 + Math.random() * 1500;
      let timer: ReturnType<typeof setTimeout>;

      const startCycle = () => {
        timer = setTimeout(() => {
          setOffsets(prev => {
            const next = [...prev];
            next[cellIndex] = (next[cellIndex] + 1) % PHOTOS.length;
            return next;
          });
          startCycle();
        }, interval);
      };

      const delayTimer = setTimeout(startCycle, delay);
      return () => { clearTimeout(delayTimer); clearTimeout(timer); };
    });

    return () => intervals.forEach(cleanup => cleanup());
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden">
      {/* Griglia 4x3 di foto */}
      <div className="absolute inset-0 grid gap-0.5" style={{ gridTemplateColumns: "repeat(4, 1fr)", gridTemplateRows: "repeat(3, 1fr)" }}>
        {Array.from({ length: GRID_SIZE }, (_, i) => (
          <div key={i} className="relative overflow-hidden">
            <AnimatePresence mode="crossfade">
              <motion.img
                key={offsets[i]}
                src={PHOTOS[offsets[i]]}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: "blur(3px) brightness(0.55) saturate(1.3)" }}
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{ opacity: 1, scale: 1.04 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9 }}
              />
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Overlay vignette centrale */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_center,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0.65)_100%)]" />

      {/* Contenuto centrale */}
      <div className="relative z-10 text-center max-w-[500px] px-6">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-serif text-[30px] md:text-[38px] leading-[1.25] mb-6 text-white drop-shadow-lg"
        >
          <span dangerouslySetInnerHTML={{ __html: titleHtml }} />
        </motion.h2>

        <div className="flex gap-2.5 justify-center mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-[#E94560]"
              style={{ animation: `analyzeDot 1.4s ease-in-out infinite ${i * 0.2}s`, boxShadow: "0 0 8px rgba(233,69,96,0.6)" }}
            />
          ))}
        </div>

        <style>{`
          @keyframes analyzeDot {
            0%,80%,100% { opacity:.2; transform:scale(.8); }
            40% { opacity:1; transform:scale(1.2); }
          }
        `}</style>

        <div className="flex flex-wrap gap-2 justify-center">
          {visibleTraits.map((trait) => (
            <motion.span
              key={trait}
              initial={{ opacity: 0, y: 10, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-[12px] px-4 py-1.5 rounded-full font-semibold text-white border border-white/25 shadow-md"
              style={{ background: "rgba(233,69,96,0.30)", backdropFilter: "blur(12px)" }}
            >
              {trait}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
