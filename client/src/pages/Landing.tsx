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
      <section className="relative min-h-screen overflow-hidden px-6 pt-[118px] pb-14">
        <div className="absolute inset-0" style={{ background: heroBackdrop }} />
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

      <section className="relative overflow-hidden bg-[var(--surface-alt)] px-6 py-28 transition-colors duration-300">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-[linear-gradient(90deg,transparent,rgba(29,25,53,0.09),transparent)]" />
        <div className="absolute right-[8%] top-[16%] hidden h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle,rgba(233,69,96,0.1),transparent_68%)] blur-[14px] md:block" />
        <div className="max-w-[1180px] mx-auto">
          <div className="max-w-[760px] mx-auto text-center mb-16 md:mb-20">
            <p className="text-[11px] font-semibold tracking-[4px] uppercase text-[#E94560] mb-4">{t("landing.how.label")}</p>
            <h2 className="font-serif text-[clamp(38px,5vw,58px)] text-center mb-5 tracking-[-1.6px] leading-[1.02] text-[var(--text-primary)]">{t("landing.how.title")}</h2>
            <p className="text-center text-[var(--text-secondary)] text-[17px] md:text-[19px] font-light max-w-[620px] mx-auto leading-[1.85]">
              {t("landing.how.desc")}
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-8 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="relative overflow-hidden rounded-[34px] border border-[rgba(29,25,53,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.82))] p-8 md:p-10 shadow-[0_28px_80px_rgba(29,25,53,0.06)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(233,69,96,0.1),transparent_40%)]" />
              <div className="relative z-10 flex h-full flex-col justify-between">
                <div>
                  <div className="mb-8 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[3px] text-[rgba(29,25,53,0.36)]">
                      {lang === "it" ? "Un processo più intuitivo" : "A more intuitive process"}
                    </span>
                    <span className="rounded-full bg-[rgba(233,69,96,0.08)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[2px] text-[#E94560]">
                      MindRoute
                    </span>
                  </div>
                  <div className="space-y-5">
                    {[
                      {
                        num: "01",
                        title: t("landing.how.s1.title"),
                        desc: t("landing.how.s1.desc"),
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                            <circle cx="12" cy="10" r="1" fill="#E94560" />
                            <circle cx="8" cy="10" r="1" fill="#E94560" />
                            <circle cx="16" cy="10" r="1" fill="#E94560" />
                          </svg>
                        )
                      },
                      {
                        num: "02",
                        title: t("landing.how.s2.title"),
                        desc: t("landing.how.s2.desc"),
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                            <path d="M12 8l-2 4 4 0-2 4" fill="none" />
                          </svg>
                        )
                      },
                      {
                        num: "03",
                        title: t("landing.how.s3.title"),
                        desc: t("landing.how.s3.desc"),
                        icon: (
                          <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M3 12h4l3-9 4 18 3-9h4" />
                          </svg>
                        )
                      }
                    ].map((step, i) => (
                      <motion.div
                        key={step.num}
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}
                        className="grid grid-cols-[auto_1fr] gap-5 rounded-[28px] border border-[rgba(29,25,53,0.06)] bg-[rgba(255,255,255,0.72)] p-5 md:p-6"
                      >
                        <div className="flex flex-col items-center gap-4">
                          <span className="font-serif text-[34px] leading-none text-[#E94560] opacity-70">{step.num}</span>
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgba(233,69,96,0.08)]">
                            <div className="h-6 w-6">{step.icon}</div>
                          </div>
                        </div>
                        <div className="pt-1">
                          <h3 className="font-serif text-[24px] tracking-[-0.5px] text-[var(--text-primary)] mb-2">{step.title}</h3>
                          <p className="text-[14px] md:text-[15px] leading-[1.8] font-light text-[var(--text-secondary)]">{step.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.72, delay: 0.08 }}
              className="relative overflow-hidden rounded-[34px] border border-[rgba(255,255,255,0.08)] bg-[#111325] p-7 md:p-10 text-white shadow-[0_34px_90px_rgba(29,25,53,0.22)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(242,85,110,0.24),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(73,90,255,0.18),transparent_48%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(8,10,20,0.22))]" />
              <div className="relative z-10 flex h-full flex-col gap-6 md:gap-8">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.16)] bg-[rgba(255,255,255,0.08)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[3px] text-white">
                    {lang === "it" ? "Quello che cambia davvero" : "What truly changes"}
                  </div>
                  <h3 className="font-serif text-[30px] sm:text-[36px] md:text-[42px] leading-[1.02] tracking-[-1px] mb-4 text-white">
                    {lang === "it" ? "Non una ricerca. Una lettura di te." : "Not a search. A reading of you."}
                  </h3>
                  <p className="max-w-[520px] text-[15px] md:text-[16px] leading-[1.8] text-[rgba(255,255,255,0.82)]">
                    {lang === "it"
                      ? "Ogni passaggio toglie rumore, lascia emergere quello che conta e trasforma intuizioni sparse in una direzione chiara."
                      : "Each step removes noise, filters out generic places, and turns personal intuition into a concrete direction."}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {[
                    {
                      valueIt: "7 domande",
                      valueEn: "7 questions",
                      labelIt: "per arrivare al tuo profilo",
                      labelEn: "to reveal your profile"
                    },
                    {
                      valueIt: "3 mete",
                      valueEn: "3 destinations",
                      labelIt: "già in sintonia con il tuo momento",
                      labelEn: "already aligned with your moment"
                    }
                  ].map((item) => (
                    <div key={item.valueIt} className="rounded-[24px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.06)] px-5 py-5 backdrop-blur-[8px]">
                      <div className="font-serif text-[28px] leading-none text-white mb-2">{lang === "it" ? item.valueIt : item.valueEn}</div>
                      <div className="text-[13px] leading-[1.7] text-[rgba(255,255,255,0.72)]">{lang === "it" ? item.labelIt : item.labelEn}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-[28px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] px-5 py-5 backdrop-blur-[10px]">
                  <div className="text-[11px] font-semibold uppercase tracking-[3px] text-[rgba(255,255,255,0.62)] mb-3">
                    {lang === "it" ? "La sensazione finale" : "Final feeling"}
                  </div>
                  <p className="text-[15px] md:text-[16px] leading-[1.8] text-white">
                    {lang === "it"
                      ? '"Meno ricerca a vuoto, più la sensazione di essere davvero capito."'
                      : '"Less manual search, more the feeling of being understood."'}
                  </p>
                </div>

                <div className="grid gap-3">
                  {[
                    lang === "it" ? "Meno possibilità infinite, più chiarezza emotiva." : "Fewer endless options, more emotional clarity.",
                    lang === "it" ? "Un percorso che sembra una conversazione, non un modulo da riempire." : "A flow that feels like conversation, not a cold form.",
                    lang === "it" ? "Una destinazione che arriva già con un senso e con il suo ritmo." : "A destination that already arrives with meaning and rhythm."
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-3 rounded-[22px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] px-4 py-4 backdrop-blur-[6px]">
                      <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full bg-[#E94560]" />
                      <p className="text-[14px] md:text-[15px] leading-[1.7] text-white">{line}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[var(--surface)] transition-colors duration-300">
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

      <section className="py-24 px-6 bg-[var(--surface-alt)] relative transition-colors duration-300">
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

      <section className="relative overflow-hidden bg-[var(--surface)] px-6 py-24 transition-colors duration-300">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(233,69,96,0.08),transparent_30%)]" />
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

      <section className="py-24 px-6 bg-[#1A1A2E] text-center relative overflow-hidden">
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(233,69,96,0.08)_0%,transparent_70%)] rounded-full pointer-events-none" />
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

      <footer className="bg-[#1A1A2E] border-t border-[rgba(255,255,255,0.06)] py-8 px-4 md:px-10 flex flex-col md:flex-row items-center justify-between text-[12px] md:text-[13px] text-[rgba(255,255,255,0.3)] gap-4">
        <div className="flex items-center gap-2">
          <Logo className="w-6 h-6 opacity-50" />
          <span className="font-serif text-[15px] text-[rgba(255,255,255,0.4)]">MindRoute</span>
        </div>
        <div className="flex gap-6">
          <a href="#" className="hover:text-[#E94560] transition-colors" data-testid="link-about">{t("nav.about")}</a>
          <a href="#" className="hover:text-[#E94560] transition-colors" data-testid="link-privacy">{t("nav.privacy")}</a>
          <a href="#" className="hover:text-[#E94560] transition-colors" data-testid="link-contact">{t("nav.contact")}</a>
        </div>
        <div>{t("nav.copyright")}</div>
      </footer>
    </div>
  );
}




















