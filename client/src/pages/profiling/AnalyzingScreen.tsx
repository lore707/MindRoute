import { motion } from "framer-motion";

interface AnalyzingScreenProps {
  titleHtml: string;
  visibleTraits: string[];
}

export function AnalyzingScreen({ titleHtml, visibleTraits }: AnalyzingScreenProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center transition-colors duration-300" style={{ background: "var(--surface)" }}>
      <div className="text-center max-w-[440px] px-6">
        <h2 className="font-serif text-[28px] leading-[1.3] mb-5 text-[var(--text-primary)]">
          <span dangerouslySetInnerHTML={{ __html: titleHtml }} />
        </h2>
        <div className="flex gap-2 justify-center mb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-[#E94560]"
              style={{ animation: `analyzeDot 1.4s ease-in-out infinite ${i * 0.2}s` }}
            />
          ))}
        </div>
        <style>{`@keyframes analyzeDot { 0%,80%,100% { opacity:.2; transform:scale(.8); } 40% { opacity:1; transform:scale(1.2); } }`}</style>
        <div className="flex flex-wrap gap-2 justify-center mt-5">
          {visibleTraits.map((trait) => (
            <motion.span
              key={trait}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-[12px] px-3.5 py-1.5 rounded-full bg-[rgba(233,69,96,0.07)] text-[#E94560] font-medium"
            >
              {trait}
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}
