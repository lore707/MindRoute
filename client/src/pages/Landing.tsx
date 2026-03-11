import { Link } from "wouter";
import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

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

  const heroTitleHtml = t("landing.hero.title")
    .replace(/who you are/, '<em class="italic text-[#E94560] font-normal">$&</em>')
    .replace(/chi sei/, '<em class="italic text-[#E94560] font-normal">$&</em>');

  return (
    <div className="bg-[var(--surface)] text-[var(--text-primary)] font-sans selection:bg-[#E94560]/20 overflow-x-hidden transition-colors duration-300">
      <section className="relative min-h-screen overflow-hidden px-6 pt-[118px] pb-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(233,69,96,0.11),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(250,247,244,0.98))]" />
        <div className="absolute inset-x-[8%] top-[16%] h-[1px] bg-[linear-gradient(90deg,transparent,rgba(29,25,53,0.12),transparent)]" />
        <div className="absolute inset-x-[12%] bottom-[18%] h-[1px] bg-[linear-gradient(90deg,transparent,rgba(29,25,53,0.08),transparent)]" />

        <div className="hidden lg:block absolute right-[7%] bottom-[18%] w-[250px] rounded-[32px] border border-[rgba(29,25,53,0.08)] bg-[rgba(255,255,255,0.72)] p-6 shadow-[0_24px_60px_rgba(29,25,53,0.06)] backdrop-blur-[10px]">
          <div className="text-[10px] font-semibold tracking-[3px] uppercase text-[#E94560] mb-4">{lang === "it" ? "Nota di viaggio" : "Travel note"}</div>
          <p className="font-serif text-[22px] leading-[1.2] text-[#1D1935] mb-3">
            {lang === "it" ? "Non scegliere una meta. Lascia emergere una direzione." : "Do not choose a destination. Let a direction emerge."}
          </p>
          <p className="text-[13px] leading-[1.7] text-[var(--text-secondary)]">
            {lang === "it" ? "Un viaggio che inizia da una domanda interiore ha un sapore diverso." : "A trip that starts from an inner question feels different."}
          </p>
        </div>

        <div className="relative max-w-[1220px] mx-auto min-h-[calc(100vh-132px)] grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,760px)_1fr] items-center">
          <div className="hidden lg:block" />
          <div className="text-center">
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
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(233,69,96,0.14)] bg-[rgba(255,255,255,0.72)] px-5 py-2 text-[11px] font-semibold uppercase tracking-[4px] text-[#E94560] shadow-[0_10px_30px_rgba(233,69,96,0.08)]">
                <span className="h-2 w-2 rounded-full bg-[#E94560]" />
                {t("landing.hero.label")}
              </span>
              <span className="hidden sm:inline-block text-[11px] uppercase tracking-[3px] text-[rgba(29,25,53,0.35)]">
                {lang === "it" ? "Profilazione emotiva, non ricerca tradizionale" : "Emotional profiling, not traditional search"}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.85 }}
              className="font-serif text-[clamp(46px,8vw,96px)] leading-[0.94] tracking-[-2px] md:tracking-[-3px] mb-6 max-w-[900px] mx-auto text-[#1D1935]"
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
              <Link href="/profiling" className="inline-flex items-center gap-[10px] bg-[linear-gradient(135deg,#F2556E,#E94560)] text-white text-[16px] font-semibold px-8 py-4 md:px-11 md:py-[19px] rounded-full transition-all hover:translate-y-[-2px] shadow-[0_14px_38px_rgba(233,69,96,0.28)] hover:shadow-[0_18px_46px_rgba(233,69,96,0.32)]" data-testid="link-begin">
                {t("landing.hero.cta")}
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="inline-flex items-center gap-3 rounded-full border border-[rgba(29,25,53,0.08)] bg-[rgba(255,255,255,0.68)] px-4 py-3 text-left shadow-[0_10px_30px_rgba(29,25,53,0.05)] backdrop-blur-[8px]">
                <div className="flex -space-x-2">
                  {["S", "M", "A"].map((initial) => (
                    <span key={initial} className="flex h-9 w-9 items-center justify-center rounded-full border border-white bg-[linear-gradient(135deg,#F48B9A,#E94560)] text-[12px] font-semibold text-white">
                      {initial}
                    </span>
                  ))}
                </div>
                <div>
                  <div className="text-[12px] font-semibold uppercase tracking-[2px] text-[rgba(29,25,53,0.36)]">
                    {lang === "it" ? "Prime reazioni" : "Early reactions"}
                  </div>
                  <div className="text-[14px] text-[#1D1935]">
                    {lang === "it" ? "\"Sembra un viaggio scritto per me.\"" : "\"It feels written for me.\""}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
          <div className="hidden lg:block" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 1.1, duration: 1 }}
          className="absolute bottom-7 left-0 right-0 flex flex-col items-center gap-2 text-[10px] sm:text-[11px] tracking-[2px] uppercase text-[rgba(29,25,53,0.42)] pointer-events-none"
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
            <h2 className="font-serif text-[clamp(38px,5vw,58px)] text-center mb-5 tracking-[-1.6px] leading-[1.02] text-[#1D1935]">{t("landing.how.title")}</h2>
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
                          <h3 className="font-serif text-[24px] tracking-[-0.5px] text-[#1D1935] mb-2">{step.title}</h3>
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
              className="relative overflow-hidden rounded-[34px] border border-[rgba(29,25,53,0.08)] bg-[#1A1A2E] p-8 md:p-10 text-white shadow-[0_34px_90px_rgba(29,25,53,0.18)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(242,85,110,0.22),transparent_38%),radial-gradient(circle_at_bottom,rgba(73,90,255,0.18),transparent_45%)]" />
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.08)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[3px] text-white">
                    {lang === "it" ? "Cosa cambia davvero" : "What truly changes"}
                  </div>
                  <h3 className="font-serif text-[32px] md:text-[42px] leading-[1.04] tracking-[-1px] mb-4 text-white">
                    {lang === "it" ? "Non una ricerca. Una lettura di te." : "Not a search. A reading of you."}
                  </h3>
                  <p className="max-w-[460px] text-[15px] md:text-[16px] leading-[1.8] text-[rgba(255,255,255,0.72)]">
                    {lang === "it"
                      ? "Ogni passaggio riduce rumore, filtra luoghi generici e trasforma intuizioni personali in una direzione concreta."
                      : "Each step removes noise, filters out generic places, and turns personal intuition into a concrete direction."}
                  </p>
                </div>

                <div className="mt-10 grid gap-4">
                  {[
                    lang === "it" ? "Meno opzioni infinite, più chiarezza emotiva." : "Fewer endless options, more emotional clarity.",
                    lang === "it" ? "Un percorso che sembra conversazione, non form." : "A flow that feels like conversation, not a form.",
                    lang === "it" ? "Una destinazione che arriva già con senso e ritmo." : "A destination that arrives with meaning and rhythm."
                  ].map((line) => (
                    <div key={line} className="flex items-start gap-3 rounded-[22px] border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] px-4 py-4">
                      <span className="mt-[2px] h-2.5 w-2.5 rounded-full bg-[#E94560]" />
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
        <div className="max-w-[1080px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#E94560] mb-4">{t("landing.diff.label")}</p>
              <h2 className="font-serif text-[clamp(28px,4vw,38px)] mb-5 tracking-[-0.5px] leading-[1.2]">
                <span dangerouslySetInnerHTML={{ __html: lang === "it"
                  ? 'Gli altri pianificatori chiedono<br /><em class="italic text-[#E94560]">dove.</em> Noi chiediamo <em class="italic text-[#E94560]">perché.</em>'
                  : 'Other planners ask<br /><em class="italic text-[#E94560]">where.</em> We ask <em class="italic text-[#E94560]">why.</em>'
                }} />
              </h2>
              <p className="text-[var(--text-secondary)] text-[15px] leading-[1.8] mb-4 font-light">{t("landing.diff.p1")}</p>
              <p className="text-[var(--text-secondary)] text-[15px] leading-[1.8] mb-4 font-light">{t("landing.diff.p2")}</p>
              <p className="text-[#E94560] font-medium italic">{t("landing.diff.p3")}</p>
            </div>
            <div className="relative">
              <div className="bg-[var(--surface-card)] rounded-[20px] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                <div className="grid grid-cols-2">
                  <div className="p-3 md:p-5 bg-[var(--surface-alt)] font-semibold text-[12px] tracking-[1.5px] uppercase text-[var(--text-secondary)] border-r border-[var(--border-subtle)]">{t("landing.diff.others")}</div>
                  <div className="p-3 md:p-5 bg-[var(--surface-alt)] font-semibold text-[12px] tracking-[1.5px] uppercase text-[#E94560]">{t("landing.diff.us")}</div>
                </div>
                {[
                  { left: t("landing.diff.t1a"), right: t("landing.diff.t1b") },
                  { left: t("landing.diff.t2a"), right: t("landing.diff.t2b") },
                  { left: t("landing.diff.t3a"), right: t("landing.diff.t3b") },
                  { left: t("landing.diff.t4a"), right: t("landing.diff.t4b") },
                  { left: t("landing.diff.t5a"), right: t("landing.diff.t5b") }
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-2 border-t border-[var(--border-subtle)]">
                    <div className="p-3 md:p-5 text-[14px] border-r border-[var(--border-subtle)] text-[var(--text-secondary)]">{row.left}</div>
                    <div className="p-3 md:p-5 text-[14px] text-[var(--text-primary)] font-medium bg-[rgba(233,69,96,0.04)]">{row.right}</div>
                  </div>
                ))}
              </div>
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
              {lang === "it" ? "Destinazioni da sognare" : "Places to dream about"}
            </p>
            <h2 className="font-serif text-[clamp(34px,5vw,54px)] tracking-[-1.4px] leading-[1.04] text-[#1D1935] mb-5">
              {lang === "it" ? "Luoghi che fanno venire voglia di partire davvero" : "Places that make you want to leave for real"}
            </h2>
            <p className="max-w-[620px] text-[16px] md:text-[18px] leading-[1.85] text-[var(--text-secondary)] font-light">
              {lang === "it"
                ? "MindRoute non ti mostra solo opzioni. Ti accompagna verso atmosfere, luce, ritmo e paesaggi che possono somigliarti."
                : "MindRoute does not just show options. It guides you toward atmospheres, light, rhythm, and landscapes that can feel like you."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_0.9fr]">
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.75 }}
              className="group relative overflow-hidden rounded-[34px] min-h-[420px] lg:min-h-[560px]"
            >
              <img
                src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80"
                alt={lang === "it" ? "Scogliera sul mare al tramonto" : "Seaside cliff at sunset"}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,14,30,0.04),rgba(15,14,30,0.62))]" />
              <div className="absolute left-6 right-6 bottom-6 md:left-8 md:right-8 md:bottom-8 rounded-[28px] bg-[rgba(255,255,255,0.12)] p-6 text-white backdrop-blur-[10px] border border-[rgba(255,255,255,0.18)]">
                <div className="text-[11px] font-semibold uppercase tracking-[3px] text-white/78 mb-3">
                  {lang === "it" ? "Per chi cerca respiro" : "For those seeking space"}
                </div>
                <h3 className="font-serif text-[30px] md:text-[40px] leading-[1.02] tracking-[-1px] mb-3">
                  {lang === "it" ? "Costa, vento, orizzonte" : "Coast, wind, horizon"}
                </h3>
                <p className="max-w-[520px] text-[14px] md:text-[15px] leading-[1.75] text-white/82">
                  {lang === "it" ? "Mare aperto, luce calda, una sensazione di allontanamento dal rumore." : "Open sea, warm light, and the feeling of stepping away from noise."}
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
                  eyebrowIt: "Profondita e silenzio",
                  eyebrowEn: "Depth and silence",
                  titleIt: "Altezze che riallineano",
                  titleEn: "Heights that realign you"
                }
              ].map((image, index) => (
                <motion.div
                  key={image.src}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: index * 0.08 }}
                  className="group relative overflow-hidden rounded-[30px] min-h-[268px]"
                >
                  <img
                    src={image.src}
                    alt={lang === "it" ? image.altIt : image.altEn}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,14,30,0.08),rgba(15,14,30,0.64))]" />
                  <div className="absolute inset-x-5 bottom-5 rounded-[24px] bg-[rgba(16,16,33,0.28)] px-5 py-4 text-white backdrop-blur-[8px] border border-[rgba(255,255,255,0.14)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[3px] text-white/72 mb-2">
                      {lang === "it" ? image.eyebrowIt : image.eyebrowEn}
                    </div>
                    <h3 className="font-serif text-[24px] leading-[1.08] tracking-[-0.6px]">
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
                labelIt: "Road trip interiore",
                labelEn: "Inner road trip"
              },
              {
                src: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
                altIt: "Villaggio costiero mediterraneo",
                altEn: "Mediterranean seaside village",
                labelIt: "Bellezza mediterranea",
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
                className="group relative overflow-hidden rounded-[28px] min-h-[240px]"
              >
                <img
                  src={image.src}
                  alt={lang === "it" ? image.altIt : image.altEn}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,14,30,0.02),rgba(15,14,30,0.55))]" />
                <div className="absolute left-5 bottom-5 rounded-full bg-[rgba(255,255,255,0.16)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[3px] text-white backdrop-blur-[8px] border border-[rgba(255,255,255,0.16)]">
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



