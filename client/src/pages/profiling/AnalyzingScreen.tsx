import { motion } from "framer-motion";
import { useState, useEffect } from "react";

// Foto di destinazioni bellissime da Unsplash
const PHOTOS = [
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop", // montagne
  "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&h=600&fit=crop", // bali
  "https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&h=600&fit=crop", // santorini
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&h=600&fit=crop", // road trip
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&h=600&fit=crop", // lago
  "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&h=600&fit=crop", // natura verde
  "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&h=600&fit=crop", // tokyo
  "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?w=800&h=600&fit=crop", // venezia
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop", // parigi
  "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=800&h=600&fit=crop", // marocco
  "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&h=600&fit=crop", // italia
  "https://images.unsplash.com/photo-1490077476659-095159692ab5?w=800&h=600&fit=crop", // thailandia
];

interface AnalyzingScreenProps {
  titleHtml: string;
  visibleTraits: string[];
}

export function AnalyzingScreen({ titleHtml, visibleTraits }: AnalyzingScreenProps) {
  const [currentPhoto, setCurrentPhoto] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPhoto(prev => (prev + 1) % PHOTOS.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden">
      {/* Mosaico sfondo — 4 foto affiancate */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
        {[0, 1, 2, 3].map((offset) => (
          <motion.div
            key={`${currentPhoto}-${offset}`}
            className="relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: offset * 0.1 }}
          >
            <img
              src={PHOTOS[(currentPhoto + offset) % PHOTOS.length]}
              alt=""
              className="w-full h-full object-cover scale-110"
              style={{ filter: "blur(8px) brightness(0.45) saturate(1.2)" }}
            />
          </motion.div>
        ))}
      </div>

      {/* Overlay gradiente centrale */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0.7)_100%)]" />

      {/* Contenuto centrale */}
      <div className="relative z-10 text-center max-w-[480px] px-6">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-serif text-[28px] md:text-[34px] leading-[1.3] mb-6 text-white"
        >
          <span dangerouslySetInnerHTML={{ __html: titleHtml }} />
        </motion.h2>

        <div className="flex gap-2 justify-center mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-[#E94560]"
              style={{ animation: `analyzeDot 1.4s ease-in-out infinite ${i * 0.2}s` }}
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
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-[12px] px-3.5 py-1.5 rounded-full font-medium text-white border border-white/20"
              style={{ background: "rgba(233,69,96,0.25)", backdropFilter: "blur(10px)" }}
            >
              {trait}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
