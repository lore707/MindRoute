import { Link } from "wouter";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

const Logo = ({ className = "w-9 h-9" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
    <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
    <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
    <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
    <ellipse cx="60" cy="60" rx="5" ry="6" fill="var(--text-primary)"/>
    <path d="M58 66L60 108L62 66" fill="#E94560" opacity="0.7"/>
    <circle cx="60" cy="48" r="3.5" fill="var(--text-primary)"/>
    <circle cx="42" cy="50" r="4" fill="white" opacity="0.2"/>
    <circle cx="78" cy="50" r="4" fill="white" opacity="0.2"/>
    <circle cx="44" cy="82" r="3" fill="white" opacity="0.15"/>
    <circle cx="76" cy="82" r="3" fill="white" opacity="0.15"/>
  </svg>
);

export default function Landing() {
  const { t, lang } = useI18n();
  const { theme } = useTheme();

  const heroTitleHtml = t("landing.hero.title")
    .replace(/who you are/, '<em class="italic text-[#E94560] font-normal">$&</em>')
    .replace(/chi sei/, '<em class="italic text-[#E94560] font-normal">$&</em>');

  const heroBackdrop = theme === "dark"
    ? "radial-gradient(circle at top, rgba(233,69,96,0.16), transparent 28%), radial-gradient(circle at 50% 40%, rgba(71,98,255,0.14), transparent 34%), linear-gradient(180deg, rgba(14,16,29,0.98), rgba(17,19,32,0.98))"
    : "radial-gradient(circle at top, rgba(233,69,96,0.11), transparent 34%), linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,247,244,0.98))";

  const heroLineColor = theme === "dark" ? "rgba(255,255,255,0.10)" : "rgba(29,25,53,0.12)";
  const heroSecondaryColor = theme === "dark" ? "rgba(255,255,255,0.48)" : "rgba(29,25,53,0.35)";
  const heroReactionCard = theme === "dark"
    ? "border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.06)] shadow-[0_18px_45px_rgba(0,0,0,0.2)] backdrop-blur-[12px]"
    : "border border-[rgba(29,25,53,0.08)] bg-[rgba(255,255,255,0.68)] shadow-[0_10px_30px_rgba(29,25,53,0.05)] backdrop-blur-[8px]";
  const heroPill = theme === "dark"
    ? "border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
    : "border border-[rgba(233,69,96,0.14)] bg-[rgba(255,255,255,0.72)] shadow-[0_10px_30px_rgba(233,69,96,0.08)]";

  const heroTags = lang === "it"
    ? ["Intuizione", "Ritmo", "Respiro", "Meraviglia"]
    : ["Intuition", "Rhythm", "Light", "Breathing room"];

  return (
    <div className="bg-[var(--surface)] text-[var(--text-primary)] font-sans selection:bg-[#E94560]/20 overflow-x-hidden transition-colors duration-300">
      <style>{`
        @keyframes landingDrift { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(4deg); } }
        @keyframes landingDriftSlow { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-12px) rotate(-3deg); } }
        @keyframes landingPulse { 0%,100% { opacity: 0.06; } 50% { opacity: 0.16; } }
        @keyframes landingRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes landingFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
      `}</style>
  <section className="relative min-h-screen overflow-hidden px-6 pt-[118px] pb-14">
        <div className="absolute inset-0" style={{ background: heroBackdrop }} />
        {/* Blob decorativi hero */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 18%, rgba(232,74,106,0.18), transparent 30%), radial-gradient(circle at 20% 25%, rgba(78,84,200,0.14), transparent 32%), radial-gradient(circle at 80% 70%, rgba(232,74,106,0.08), transparent 28%)" }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-100" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 180 C 220 120, 440 280, 660 200 S 940 80, 1160 220 S 1380 320, 1460 180" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.05" />
          <path d="M-20 650 C 200 590, 420 710, 640 630 S 900 510, 1120 650 S 1360 750, 1460 650" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.04" />
          <circle cx="720" cy="200" r="5" fill="#E84A6A" opacity="0.12" />
          <circle cx="300" cy="600" r="3" fill="#E84A6A" opacity="0.08" />
          <circle cx="1100" cy="400" r="4" fill="#E84A6A" opacity="0.08" />
        </svg>
        <svg className="absolute top-[10%] left-[4%] w-[130px] h-[130px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.7" style={{ opacity: 0.08, animation: "landingDrift 9s ease-in-out infinite" }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <svg className="absolute bottom-[12%] right-[5%] w-[100px] h-[100px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.9" style={{ opacity: 0.07, animation: "landingDriftSlow 12s ease-in-out infinite 1s" }}>
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        <div className="absolute inset-x-[8%] top-[16%] h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${heroLineColor}, transparent)` }} />
        <div className="absolute inset-x-[12%] bottom-[18%] h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(29,25,53,0.08)"}, transparent)` }} />
        <div className="absolute -left-24 top-28 h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(233,69,96,0.14),transparent_68%)] blur-[28px] animate-drift" />
        <div className="absolute -right-20 bottom-20 h-[300px] w-[300px] rounded-full bg-[radial-gradient(circle,rgba(73,90,255,0.16),transparent_70%)] blur-[36px] animate-drift-reverse" />

        <div className="relative max-w-[980px] mx-auto min-h-[calc(100vh-132px)] flex items-center justify-center">
          <div className="w-full text-center">
        
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: -14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="relative mb-8 inline-flex"
            >
              <div className="absolute inset-[-26px] rounded-full bg-[radial-gradient(circle,rgba(233,69,96,0.18),transparent_70%)] blur-[18px]" />
              <Logo className="relative w-[92px] h-[92px] drop-shadow-[0_16px_36px_rgba(233,69,96,0.18)] animate-float" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.7 }}
              className="mb-8 flex flex-wrap items-center justify-center gap-3"
            >
              <span className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-[11px] font-semibold uppercase tracking-[4px] text-[#E94560] ${heroPill}`}>
                <span className="h-2 w-2 rounded-full bg-[#E94560]" />
                {t("landing.hero.label")}
              </span>
              <span className="hidden sm:inline-block text-[11px] uppercase tracking-[3px]" style={{ color: heroSecondaryColor }}>
                {lang === "it" ? "Ascolto emotivo, non semplice ricerca" : "Emotional listening, not just search"}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.85 }}
              className="font-serif text-[clamp(46px,8vw,96px)] leading-[0.94] tracking-[-2px] md:tracking-[-3px] mb-6 max-w-[900px] mx-auto text-[var(--text-primary)]"
            >
              <span dangerouslySetInnerHTML={{ __html: heroTitleHtml }} />
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.82 }}
              className="text-[18px] md:text-[22px] text-[var(--text-secondary)] max-w-[700px] mx-auto mb-11 font-light leading-[1.75]"
            >
              {t("landing.hero.desc")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <motion.div whileHover={{ y: -3, scale: 1.015 }} whileTap={{ scale: 0.985 }}>
                <Link href="/profiling" className="inline-flex items-center gap-[10px] bg-[linear-gradient(135deg,#F2556E,#E94560)] text-white text-[16px] font-semibold px-8 py-4 md:px-11 md:py-[19px] rounded-full transition-all shadow-[0_14px_38px_rgba(233,69,96,0.28)] hover:shadow-[0_18px_46px_rgba(233,69,96,0.32)]" data-testid="link-begin">
                  {t("landing.hero.cta")}
                  <motion.svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}>
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </motion.svg>
                </Link>
              </motion.div>
              <motion.div whileHover={{ y: -2 }} className={`inline-flex items-center gap-3 rounded-full px-4 py-3 text-left border-none ${heroReactionCard}`}>
                <div className="flex -space-x-2">
                  {["S", "M", "A"].map((initial) => (
                    <span key={initial} className="flex h-9 w-9 items-center justify-center rounded-full border border-white bg-[linear-gradient(135deg,#F48B9A,#E94560)] text-[12px] font-semibold text-white">
                      {initial}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[2px]" style={{ color: heroSecondaryColor }}>
                    {lang === "it" ? "Prime impressioni" : "First impressions"}
                  </div>
                  <div className="text-[14px] text-[var(--text-primary)]">
                    {lang === "it" ? "\"Sembra un viaggio scritto per me.\"" : "\"It feels written for me.\""}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 1.1, duration: 1 }}
         className="relative mt-10 flex flex-col items-center gap-2 text-[10px] sm:text-[11px] tracking-[2px] uppercase pointer-events-none" style={{ color: theme === "dark" ? "rgba(255,255,255,0.34)" : "rgba(29,25,53,0.42)" }}
        >
          {t("landing.hero.scroll")}
          <svg className="w-4 h-4 animate-bounce" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </motion.div>
      </section>

<section className="relative overflow-hidden px-6 py-24 transition-colors duration-300" style={{ background: "linear-gradient(180deg, #0d0a14 0%, #1a0810 50%, #2d0a1a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none"style={{ background: "radial-gradient(circle at 80% 20%, rgba(232,74,106,0.40), transparent 40%), radial-gradient(circle at 10% 80%, rgba(78,84,200,0.15), transparent 30%)" }} />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(232,74,106,0.25),transparent)]" />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 150 C 200 90, 420 230, 640 150 S 920 30, 1140 170 S 1360 270, 1460 150" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.05" />
          <path d="M-20 750 C 180 690, 380 810, 600 730 S 860 610, 1080 750 S 1320 850, 1460 750" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.04" />
        </svg>
        <svg className="absolute top-[6%] right-[3%] w-[160px] h-[160px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.6" style={{ opacity: 0.07, animation: "landingRotate 45s linear infinite" }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <div className="max-w-[1180px] mx-auto">
          <div className="max-w-[640px] mx-auto text-center mb-16">
            <p className="text-[11px] font-semibold tracking-[4px] uppercase text-[#E94560] mb-4">{t("landing.how.label")}</p>
            <h2 className="font-serif text-[clamp(34px,5vw,52px)] text-center mb-4 tracking-[-1.4px] leading-[1.04] text-[var(--text-primary)]">{t("landing.how.title")}</h2>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-8 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-[34px] p-8 md:p-10"
           style={{ background: "linear-gradient(135deg, rgba(20,17,36,0.95), rgba(15,12,28,0.98))", border: "1px solid rgba(232,74,106,0.45)", boxShadow: "0 0 40px rgba(232,74,106,0.12), 0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(233,69,96,0.08),transparent_50%)]" />
              <div className="relative z-10 space-y-6">
                {[
                  {
                    num: "01",
                    titleIt: "Dicci chi sei",
                    titleEn: "Tell us who you are",
                    descIt: "7 domande sul tuo modo di sentire, non sulle tue preferenze.",
                    descEn: "7 questions about how you feel, not what you prefer.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                  },
                  {
                    num: "02",
                    titleIt: "Scopri il tuo posto",
                    titleEn: "Discover your place",
                    descIt: "3 destinazioni costruite sul tuo profilo emotivo.",
                    descEn: "3 destinations built around your emotional profile.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 8l-2 4 4 0-2 4" /></svg>
                  },
                  {
                    num: "03",
                    titleIt: "Ottieni il tuo piano",
                    titleEn: "Get your custom plan",
                    descIt: "Un itinerario completo, calibrato sul tuo ritmo.",
                    descEn: "A full itinerary, tuned to your pace and energy.",
                    icon: <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round"><path d="M3 12h4l3-9 4 18 3-9h4" /></svg>
                  }
                ].map((step, i) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-5 p-5 rounded-[20px] hover:bg-white/5 transition-all"
                    style={{ background: "rgba(233,69,96,0.05)", border: "1px solid rgba(233,69,96,0.15)" }}
                  >
                    <div className="flex flex-col items-center gap-3 shrink-0">
                      <span className="font-serif text-[28px] leading-none text-[#E94560] opacity-60">{step.num}</span>
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgba(233,69,96,0.1)]">
                        <div className="h-5 w-5">{step.icon}</div>
                      </div>
                    </div>
                    <div className="pt-1">
                      <h3 className="font-serif text-[20px] tracking-[-0.3px] text-white mb-1">{lang === "it" ? step.titleIt : step.titleEn}</h3>
                    <p className="text-[13px] leading-[1.7] text-white/75">{lang === "it" ? step.descIt : step.descEn}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.72, delay: 0.08 }}
       className="relative overflow-hidden rounded-[34px] bg-[#111325] p-8 md:p-10 text-white"
              style={{ border: "1px solid rgba(232,74,106,0.45)", boxShadow: "0 0 40px rgba(232,74,106,0.12), 0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)" }} }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(242,85,110,0.2),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(73,90,255,0.14),transparent_50%)]" />
              <div className="relative z-10 flex h-full flex-col gap-8">
                <div>
                  <h3 className="font-serif text-[32px] sm:text-[38px] md:text-[44px] leading-[1.02] tracking-[-1px] mb-3 text-white">
                    {lang === "it" ? "Non una ricerca. Una lettura di te." : "Not a search. A reading of you."}
                  </h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { valueIt: "7 domande", valueEn: "7 questions", labelIt: "per il tuo profilo", labelEn: "to reveal your profile" },
                    { valueIt: "3 mete", valueEn: "3 destinations", labelIt: "già in sintonia", labelEn: "already aligned" }
                  ].map((item) => (
                  <div key={item.valueIt} className="rounded-[20px] px-5 py-5" style={{ background: "rgba(233,69,96,0.07)", border: "1px solid rgba(233,69,96,0.2)" }}>
                      <div className="font-serif text-[26px] leading-none text-white mb-1">{lang === "it" ? item.valueIt : item.valueEn}</div>
                      <div className="text-[12px] text-white/50">{lang === "it" ? item.labelIt : item.labelEn}</div>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 mt-auto">
                  {[
                    { it: "Meno scelte infinite, più chiarezza emotiva.", en: "Fewer endless options, more emotional clarity." },
                    { it: "Una conversazione, non un modulo.", en: "A conversation, not a cold form." },
                    { it: "Una destinazione che ti somiglia davvero.", en: "A destination that actually feels like you." }
                  ].map((line) => (
               <div key={line.en} className="flex items-start gap-3 rounded-[16px] px-4 py-3.5" style={{ background: "rgba(233,69,96,0.05)", border: "1px solid rgba(233,69,96,0.15)" }}>
                      <span className="mt-[6px] h-2 w-2 shrink-0 rounded-full bg-[#E94560]" />
                   <p className="text-[13px] leading-[1.6] text-white/85">{lang === "it" ? line.it : line.en}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

 <section className="py-24 px-6 relative transition-colors duration-300" style={{ background: "linear-gradient(180deg, #2d0a1a 0%, #120810 50%, #0a0814 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 15% 50%, rgba(232,74,106,0.35), transparent 40%), radial-gradient(circle at 85% 30%, rgba(78,84,200,0.12), transparent 30%)" }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 400 C 220 340, 440 460, 660 380 S 940 260, 1160 400 S 1380 500, 1460 400" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.04" />
        </svg>
        <svg className="absolute bottom-[8%] right-[4%] w-[120px] h-[120px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.8" style={{ opacity: 0.06, animation: "landingDrift 14s ease-in-out infinite" }}>
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        <div className="max-w-[1120px] mx-auto">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 items-start">
            <div className="text-left max-w-[560px]">
              <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#E94560] mb-4">
                {lang === "it" ? "La differenza" : "The difference"}
              </p>
              <h2 className="font-serif text-[clamp(30px,4.5vw,52px)] mb-6 tracking-[-1px] leading-[1.06] text-[var(--text-primary)]">
                <span dangerouslySetInnerHTML={{ __html: lang === "it"
                  ? 'Gli altri pianificatori chiedono<br /><em class="italic text-[#E94560]">dove.</em> Noi chiediamo <em class="italic text-[#E94560]">perché.</em>'
                  : 'Other planners ask<br /><em class="italic text-[#E94560]">where.</em> We ask <em class="italic text-[#E94560]">why.</em>'
                }} />
              </h2>
              <p className="text-[var(--text-secondary)] text-[15px] md:text-[16px] leading-[1.9] mb-5 font-light">
                {lang === "it"
                  ? 'Molti travel planner partono dalla meta. MindRoute parte da te, da quel momento in cui senti che hai bisogno di cambiare aria anche se non sai ancora dove andare.'
                  : 'Most travel planners start from the same question: "Where do you want to go?" MindRoute starts from you, what you are missing right now, and the kind of experience that could realign you.'}
              </p>
              <p className="text-[var(--text-secondary)] text-[15px] md:text-[16px] leading-[1.9] mb-5 font-light">
                {lang === "it"
                  ? 'Per questo la destinazione non arriva come una lista qualsiasi. Arriva come una risposta, con un perché, un tono e una direzione emotiva più chiara.'
                  : 'That is why the destination does not arrive like a list of options. It arrives as an answer with a reason, a rhythm, and a clearer emotional direction.'}
              </p>
              <p className="text-[#E94560] font-medium italic text-[16px] md:text-[18px]">
                {lang === "it" ? 'La destinazione è la risposta. Tu sei la domanda.' : 'The destination is the answer. You are the question.'}
              </p>
            </div>

            <div className="relative overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[0_18px_55px_rgba(29,25,53,0.08)]">
              <div className="grid grid-cols-2 bg-[var(--surface-alt)]">
                <div className="p-4 md:p-5 text-[11px] md:text-[12px] font-semibold tracking-[2px] uppercase text-[var(--text-secondary)] border-r border-[var(--border-subtle)]">
                  {lang === "it" ? 'Altri pianificatori' : 'Other planners'}
                </div>
                <div className="p-4 md:p-5 text-[11px] md:text-[12px] font-semibold tracking-[2px] uppercase text-[#E94560]">
                  MindRoute
                </div>
              </div>
              {[
                {
                  leftIt: '"Dove vuoi andare?"',
                  leftEn: '"Where do you want to go?"',
                  rightIt: '"Che cosa ti è mancato davvero, ultimamente?"',
                  rightEn: '"What made you feel most alive?"'
                },
                {
                  leftIt: 'Filtra per budget, date, stelle',
                  leftEn: 'Filters by budget, dates, stars',
                  rightIt: 'Legge il tuo modo di viaggiare',
                  rightEn: 'Profiles your traveler identity'
                },
                {
                  leftIt: 'Ti mostra destinazioni popolari',
                  leftEn: 'Shows popular destinations',
                  rightIt: 'Trova luoghi che ti calzano addosso',
                  rightEn: 'Finds the place that fits you'
                },
                {
                  leftIt: 'Modello di itinerario generico',
                  leftEn: 'Generic itinerary model',
                  rightIt: 'Piano calibrato sul tuo ritmo',
                  rightEn: 'Plan tuned to your pace'
                },
                {
                  leftIt: 'Ottimizza la logistica',
                  leftEn: 'Optimizes logistics',
                  rightIt: 'Ottimizza il modo in cui vuoi stare',
                  rightEn: 'Optimizes transformation'
                }
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 border-t border-[var(--border-subtle)]">
                  <div className="p-4 md:p-5 text-[14px] leading-[1.7] text-[var(--text-secondary)] sm:border-r sm:border-[var(--border-subtle)]">
                    {lang === "it" ? row.leftIt : row.leftEn}
                  </div>
                  <div className="p-4 md:p-5 text-[14px] leading-[1.7] text-[var(--text-primary)] font-medium bg-[rgba(233,69,96,0.04)]">
                    {lang === "it" ? row.rightIt : row.rightEn}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

<section className="py-24 px-6 relative transition-colors duration-300" style={{ background: "linear-gradient(180deg, #0a0814 0%, #1a0810 40%, #2d0a1a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 40%, rgba(232,74,106,0.38), transparent 45%), radial-gradient(circle at 85% 80%, rgba(78,84,200,0.12), transparent 28%)" }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 300 C 200 240, 400 360, 620 280 S 900 160, 1120 300 S 1360 400, 1460 300" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.05" />
          <path d="M-20 600 C 180 540, 380 660, 600 580 S 860 460, 1080 600 S 1320 700, 1460 600" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.04" />
        </svg>
        <svg className="absolute top-[8%] left-[3%] w-[140px] h-[140px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.7" style={{ opacity: 0.07, animation: "landingRotate 50s linear infinite reverse" }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <svg className="absolute bottom-[6%] right-[4%] w-[100px] h-[100px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.9" style={{ opacity: 0.06, animation: "landingDriftSlow 11s ease-in-out infinite" }}>
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        <div className="max-w-[1080px] mx-auto">
          <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#E94560] text-center mb-4">{t("landing.test.label")}</p>
          <h2 className="font-serif text-[clamp(32px,5vw,44px)] text-center mb-3 tracking-[-1px]">{t("landing.test.title")}</h2>
          <p className="text-center text-[var(--text-secondary)] text-[16px] font-light mb-16 max-w-[500px] mx-auto">
            {t("landing.test.desc")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { text: t("landing.test.t1"), nameDetail: t("landing.test.t1.name") },
              { text: t("landing.test.t2"), nameDetail: t("landing.test.t2.name") },
              { text: t("landing.test.t3"), nameDetail: t("landing.test.t3.name") }
            ].map((test, i) => {
              const parts = test.nameDetail.split(",");
              const author = parts[0].trim();
              const detail = parts.slice(1).join(",").trim();
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-[var(--surface-card)] rounded-[20px] p-9 border border-[var(--border-subtle)] transition-all hover:translate-y-[-3px] hover:shadow-[0_8px_32px_rgba(233,69,96,0.08)] flex flex-col gap-5"
                >
                  <span className="font-serif text-[48px] leading-none text-[#E94560] opacity-30">"</span>
                  <p className="text-[15px] leading-[1.75] text-[var(--text-primary)] font-light italic flex-grow">{test.text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#E94560] to-[#f093a0] flex items-center justify-center text-white font-semibold text-[14px]">
                      {author[0]}
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-[14px] text-[var(--text-primary)]">{author}</div>
                      <div className="text-[12px] text-[var(--text-secondary)]">{detail}</div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

   <section className="relative overflow-hidden px-6 py-24 transition-colors duration-300" style={{ background: "linear-gradient(180deg, #2d0a1a 0%, #120810 40%, #0a0814 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 90% 15%, rgba(232,74,106,0.38), transparent 38%), radial-gradient(circle at 5% 85%, rgba(78,84,200,0.12), transparent 28%)" }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 250 C 200 190, 440 310, 660 230 S 940 110, 1160 250 S 1380 350, 1460 250" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.05" />
          <path d="M-20 700 C 180 640, 380 760, 600 680 S 860 560, 1080 700 S 1320 800, 1460 700" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.04" />
        </svg>
        <svg className="absolute top-[5%] left-[3%] w-[150px] h-[150px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.7" style={{ opacity: 0.07, animation: "landingDrift 10s ease-in-out infinite" }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <div className="max-w-[1180px] mx-auto relative z-10">
          <div className="max-w-[760px] mb-14 md:mb-16">
            <p className="text-[11px] font-semibold tracking-[4px] uppercase text-[#E94560] mb-4">
              {lang === "it" ? "Luoghi da sentire prima ancora di partire" : "Places you can almost feel before you leave"}
            </p>
            <h2 className="font-serif text-[clamp(34px,5vw,54px)] tracking-[-1.4px] leading-[1.04] text-[var(--text-primary)] mb-5">
              {lang === "it" ? "Immagini che iniziano già a spostarti dentro" : "Images that already begin to move something inside you"}
            </h2>
            <p className="max-w-[620px] text-[16px] md:text-[18px] leading-[1.85] text-[var(--text-secondary)] font-light">
              {lang === "it"
                ? "MindRoute non ti mostra solo mete possibili. Ti avvicina ad atmosfere, luci e paesaggi che potrebbero somigliarti più di quanto immagini."
                : "MindRoute does not just show options. It guides you toward atmospheres, light, rhythm, and landscapes that can feel like you."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75 }}
              className="group relative overflow-hidden rounded-[34px] min-h-[360px] sm:min-h-[420px] lg:min-h-[560px]"
            >
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80"
                alt={lang === "it" ? "Scogliera sul mare al tramonto" : "Seaside cliff at sunset"}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.08]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.12),rgba(10,12,24,0.78))]" />
              <div className="absolute left-4 right-4 bottom-4 rounded-[28px] bg-[rgba(8,10,22,0.52)] p-5 text-white backdrop-blur-[12px] border border-[rgba(255,255,255,0.16)] transition-all duration-500 group-hover:bg-[rgba(8,10,22,0.66)] group-hover:translate-y-[-4px] sm:left-6 sm:right-6 sm:bottom-6 md:left-8 md:right-8 md:bottom-8 md:p-6">
                <div className="text-[11px] font-semibold uppercase tracking-[3px] text-white/78 mb-3">
                  {lang === "it" ? "Per chi ha bisogno di aria" : "For those who need room to breathe"}
                </div>
                <h3 className="font-serif text-[26px] sm:text-[30px] md:text-[40px] leading-[1.02] tracking-[-1px] mb-3 text-white">
                  {lang === "it" ? "Costa, vento, orizzonte aperto" : "Coast, wind, an open horizon"}
                </h3>
                <p className="max-w-[520px] text-[14px] md:text-[15px] leading-[1.75] text-white/82">
                  {lang === "it" ? "Mare aperto, luce calda, la sensazione precisa di allontanarti finalmente dal rumore." : "Open sea, warm light, and that exact feeling of finally stepping away from the noise."}
                </p>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {[
                {
                  src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
                  altIt: "Mare tropicale e spiaggia luminosa",
                  altEn: "Tropical sea and bright beach",
                  eyebrowIt: "Energia e luce",
                  eyebrowEn: "Energy and light",
                  titleIt: "Acqua chiara, mente leggera",
                  titleEn: "Clear water, lighter mind"
                },
                {
                  src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80",
                  altIt: "Montagne spettacolari viste dall'alto",
                  altEn: "Dramatic mountains seen from above",
                  eyebrowIt: "Profondità e silenzio",
                  eyebrowEn: "Depth and silence",
                  titleIt: "Altezze che rimettono in asse",
                  titleEn: "Heights that realign you"
                }
              ].map((image, index) => (
                <motion.div
                  key={image.src}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: index * 0.08 }}
                  className="group relative overflow-hidden rounded-[30px] min-h-[240px] sm:min-h-[268px]"
                >
                  <img
                    src={image.src}
                    alt={lang === "it" ? image.altIt : image.altEn}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.09]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.14),rgba(10,12,24,0.8))]" />
                  <div className="absolute inset-x-4 bottom-4 rounded-[24px] bg-[rgba(8,10,22,0.56)] px-4 py-4 text-white backdrop-blur-[10px] border border-[rgba(255,255,255,0.14)] transition-all duration-500 group-hover:bg-[rgba(8,10,22,0.68)] group-hover:translate-y-[-3px] sm:inset-x-5 sm:bottom-5 sm:px-5">
                    <div className="text-[10px] font-semibold uppercase tracking-[3px] text-white/72 mb-2">
                      {lang === "it" ? image.eyebrowIt : image.eyebrowEn}
                    </div>
                    <h3 className="font-serif text-[22px] sm:text-[24px] leading-[1.08] tracking-[-0.6px] text-white">
                      {lang === "it" ? image.titleIt : image.titleEn}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              {
                src: "https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80",
                altIt: "Strada panoramica tra palme e oceano",
                altEn: "Scenic road with palms and ocean",
                labelIt: "Un viaggio più dentro",
                labelEn: "Inner road trip"
              },
              {
                src: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
                altIt: "Villaggio costiero mediterraneo",
                altEn: "Mediterranean seaside village",
                labelIt: "Luce mediterranea",
                labelEn: "Mediterranean beauty"
              },
              {
                src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80",
                altIt: "Lago alpino tra montagne e cielo",
                altEn: "Alpine lake between mountains and sky",
                labelIt: "Aria sottile",
                labelEn: "Thin mountain air"
              }
            ].map((image, index) => (
              <motion.div
                key={image.src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: index * 0.06 }}
                className="group relative overflow-hidden rounded-[28px] min-h-[220px] sm:min-h-[240px]"
              >
                <img
                  src={image.src}
                  alt={lang === "it" ? image.altIt : image.altEn}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-[1.09]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,12,24,0.1),rgba(10,12,24,0.72))]" />
                <div className="absolute left-4 bottom-4 rounded-full bg-[rgba(8,10,22,0.5)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[3px] text-white backdrop-blur-[10px] border border-[rgba(255,255,255,0.16)] transition-all duration-500 group-hover:bg-[rgba(8,10,22,0.7)] group-hover:translate-y-[-2px] sm:left-5 sm:bottom-5">
                  {lang === "it" ? image.labelIt : image.labelEn}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

   <section className="py-24 px-6 text-center relative overflow-hidden" style={{ background: "linear-gradient(180deg, #0a0814 0%, #1a0810 30%, #3d0e20 70%, #2d0a1a 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 50% 50%, rgba(232,74,106,0.45), transparent 55%), radial-gradient(circle at 20% 20%, rgba(78,84,200,0.15), transparent 30%), radial-gradient(circle at 80% 80%, rgba(232,74,106,0.25), transparent 32%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(232,74,106,0.10), transparent 70%)", animation: "landingPulse 6s ease-in-out infinite" }} />
        <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 1440 900">
          <path d="M-20 200 C 220 140, 440 260, 660 180 S 940 60, 1160 200 S 1380 300, 1460 200" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.07" />
          <path d="M-20 700 C 200 640, 420 760, 640 680 S 920 560, 1140 700 S 1380 800, 1460 700" fill="none" stroke="#E84A6A" strokeWidth="1" opacity="0.06" />
          <circle cx="720" cy="450" r="4" fill="#E84A6A" opacity="0.15" />
          <circle cx="240" cy="200" r="3" fill="#E84A6A" opacity="0.10" />
          <circle cx="1200" cy="700" r="3" fill="#E84A6A" opacity="0.10" />
        </svg>
        <svg className="absolute top-[8%] left-[4%] w-[150px] h-[150px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.7" style={{ opacity: 0.08, animation: "landingRotate 40s linear infinite" }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
        <svg className="absolute bottom-[8%] right-[4%] w-[110px] h-[110px] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="#E84A6A" strokeWidth="0.9" style={{ opacity: 0.08, animation: "landingDriftSlow 10s ease-in-out infinite" }}>
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        <div className="max-w-[1080px] mx-auto relative z-10">
          <Logo className="w-[60px] h-[60px] mx-auto mb-7 opacity-90" />
          <h2 className="font-serif text-[clamp(28px,5vw,42px)] text-white mb-4 tracking-[-0.5px]">{t("landing.cta.title")}</h2>
          <p className="text-[rgba(255,255,255,0.5)] text-[16px] font-light mb-10 max-w-[420px] mx-auto">
            {t("landing.cta.desc")}
          </p>
          <Link href="/profiling" className="inline-flex items-center gap-[10px] bg-[#E94560] text-white text-[16px] font-semibold px-7 py-4 md:px-10 md:py-[18px] rounded-full transition-all hover:bg-[#D13A52] hover:translate-y-[-2px] shadow-[0_4px_24px_rgba(233,69,96,0.25)]" data-testid="link-start-profiling">
            {t("landing.cta.btn")}
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

 <footer className="bg-[#1A1A2E] border-t border-[rgba(255,255,255,0.08)] px-6 md:px-12 pt-14 pb-8">
        <div className="max-w-7xl mx-auto">

          {/* Colonne principali */}
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_1fr] gap-10 mb-12">

            {/* Logo + tagline */}
            <div className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2.5 no-underline">
                <Logo className="w-8 h-8" />
                <span className="font-serif text-[18px] text-white">MindRoute</span>
              </Link>
              <p className="text-[13px] text-white/40 leading-relaxed max-w-[220px]">
                {lang === "it" ? "Viaggi costruiti sul tuo carattere, non sulle tue preferenze." : "Trips built around who you are, not what you filter for."}
              </p>
            </div>

            {/* Prodotto */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-white/25 mb-1">{lang === "it" ? "Prodotto" : "Product"}</p>
              <Link href="/profiling" className="text-white/50 hover:text-[#E94560] text-[13px] transition-colors no-underline">{lang === "it" ? "Inizia il viaggio" : "Start your journey"}</Link>
              <a href="#how" className="text-white/50 hover:text-[#E94560] text-[13px] transition-colors no-underline">{lang === "it" ? "Come funziona" : "How it works"}</a>
              <Link href="/privacy" className="text-white/50 hover:text-[#E94560] text-[13px] transition-colors no-underline">Privacy Policy</Link>
            </div>

            {/* Contatti */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-white/25 mb-1">{lang === "it" ? "Contatti" : "Contact"}</p>
              <a href="mailto:mindroutetravel@gmail.com" className="text-white/50 hover:text-[#E94560] text-[13px] transition-colors">mindroutetravel@gmail.com</a>
            </div>

            {/* Social */}
            <div className="flex flex-col gap-3">
              <p className="text-[10px] font-bold uppercase tracking-[2.5px] text-white/25 mb-1">Social</p>
              <a href="#" className="text-white/50 hover:text-[#E94560] text-[13px] transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                Instagram
              </a>
              <a href="#" className="text-white/50 hover:text-[#E94560] text-[13px] transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.56V6.82a4.85 4.85 0 01-1.07-.13z"/></svg>
                TikTok
              </a>
            </div>
          </div>

          {/* Barra inferiore */}
          <div className="pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/20 text-[11px]">{t('footer.copyright')}</p>
            <p className="text-white/15 text-[11px]">{t('footer.affiliate')}</p>
          </div>

        </div>
      </footer>
    </div>
  );
}




















