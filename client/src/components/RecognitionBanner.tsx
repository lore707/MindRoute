import { motion } from "framer-motion";
import { ArrowRight, RefreshCcw, Sparkles } from "lucide-react";
import type { TraitRecognition } from "@/hooks/use-trait-recognition";
import { useI18n } from "@/lib/i18n";

interface RecognitionBannerProps {
  recognition: TraitRecognition;
  variant: "full" | "compact";
  /** "Confermo, generami 3 viaggi" — only used in variant="full". */
  onUseProfile?: () => void;
  /** "Voglio cambiare qualcosa" / "Rifai il quiz" — only used in variant="full". */
  onChangeProfile?: () => void;
}

/**
 * Reusable recognition banner shown to returning users (N>=3 snapshot).
 * - "full"    = pre-quiz screen with 2 CTAs (use profile / change something)
 * - "compact" = thin pill above destination cards, no CTAs
 *
 * Renders nothing when recognition.canShow is false — caller doesn't need to
 * gate, but skipping the wrapper avoids empty animation containers.
 */
export function RecognitionBanner({ recognition, variant, onUseProfile, onChangeProfile }: RecognitionBannerProps) {
  const { t } = useI18n();
  if (!recognition.canShow) return null;

  if (variant === "compact") {
    return (
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mx-auto mb-8 md:mb-10 max-w-3xl rounded-2xl px-5 py-4 md:px-6 md:py-5"
        style={{
          background: "rgba(233,69,96,0.06)",
          border: "1px solid rgba(233,69,96,0.18)",
        }}
        data-testid="recognition-banner-compact"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="w-3 h-3 text-[#E94560]" />
          <span className="text-[10px] font-bold uppercase tracking-[3px] text-[#E94560]">
            {t("rec.eyebrow")}
          </span>
        </div>
        {recognition.headline && (
          <p className="font-serif text-base md:text-lg text-white leading-snug mb-2">
            {recognition.headline}
          </p>
        )}
        {recognition.chips.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/55 font-sans">
            {recognition.chips.map((c, i) => (
              <span key={`${c.kind}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-white/25">·</span>}
                {c.label}
              </span>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-xl px-6 py-10 md:py-14 text-center"
      data-testid="recognition-banner-full"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="inline-flex items-center gap-2 mb-5"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#E94560]" />
        <span className="text-[10px] font-bold uppercase tracking-[3.5px] text-[#E94560]">
          {t("rec.eyebrow")}
        </span>
      </motion.div>

      {recognition.headline ? (
        <h2 className="font-serif text-[26px] md:text-[34px] text-white leading-[1.15] mb-4 tracking-[-0.5px]">
          {recognition.headline}
        </h2>
      ) : (
        <h2 className="font-serif text-[24px] md:text-[30px] text-white leading-tight mb-4">
          {t("rec.fallbackHeadline")}
        </h2>
      )}

      {recognition.chips.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mb-8 text-[12.5px] text-white/60 font-sans">
          {recognition.chips.map((c, i) => (
            <span key={`${c.kind}-${i}`} className="inline-flex items-center gap-2">
              {i > 0 && <span className="text-white/25">·</span>}
              {c.label}
            </span>
          ))}
        </div>
      )}

      <p className="text-[13px] text-white/45 font-sans mb-7 max-w-md mx-auto leading-relaxed">
        {t("rec.desc").replace("{n}", String(recognition.snapshotCount))}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <button
          type="button"
          onClick={onUseProfile}
          data-testid="btn-recognition-use-profile"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full font-semibold text-[14px] text-white transition-all"
          style={{ background: "#E94560", boxShadow: "0 12px 32px rgba(233,69,96,0.28)" }}
        >
          <Sparkles className="w-4 h-4" />
          <span>{t("rec.cta.use")}</span>
        </button>
        <button
          type="button"
          onClick={onChangeProfile}
          data-testid="btn-recognition-change"
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-full font-semibold text-[13px] text-white/70 hover:text-white transition-all"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          {t("rec.cta.change")}
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
