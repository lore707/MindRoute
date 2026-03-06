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

  return (
    <div className="bg-[var(--surface)] text-[var(--text-primary)] font-sans selection:bg-[#E94560]/20 overflow-x-hidden transition-colors duration-300">
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-[120px] pb-20 overflow-hidden">
        <div className="hidden md:block absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(233,69,96,0.06)_0%,transparent_70%)] rounded-full pointer-events-none" />
        <div className="hidden md:block absolute bottom-[10%] left-[-8%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(233,69,96,0.04)_0%,transparent_70%)] rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Logo className="w-[90px] h-[90px] mb-8 drop-shadow-[0_8px_32px_rgba(233,69,96,0.15)] animate-float" />
        </motion.div>

        <motion.span 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="inline-block text-[11px] font-semibold tracking-[3px] uppercase text-[#E94560] mb-6 px-4 py-1.5 bg-[rgba(233,69,96,0.08)] rounded-full"
        >
          {t('landing.hero.label')}
        </motion.span>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="font-serif text-[clamp(32px,8vw,82px)] leading-[1.05] tracking-[-1px] md:tracking-[-2px] mb-6 max-w-[700px]"
        >
          <span dangerouslySetInnerHTML={{ __html: t('landing.hero.title').replace(/who you are/, '<em class="italic text-[#E94560]">$&</em>').replace(/chi sei/, '<em class="italic text-[#E94560]">$&</em>') }} />
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-[18px] text-[var(--text-secondary)] max-w-[480px] mb-11 font-light leading-[1.7]"
        >
          {t('landing.hero.desc')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Link href="/profiling" className="inline-flex items-center gap-[10px] bg-[#E94560] text-white text-[16px] font-semibold px-7 py-4 md:px-10 md:py-[18px] rounded-full transition-all hover:bg-[#D13A52] hover:translate-y-[-2px] shadow-[0_4px_24px_rgba(233,69,96,0.25)] hover:shadow-[0_8px_32px_rgba(233,69,96,0.35)]" data-testid="link-begin">
            {t('landing.hero.cta')}
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1.5 text-[var(--text-secondary)] text-[11px] tracking-[1.5px] uppercase animate-bounce pointer-events-none"
        >
          {t('landing.hero.scroll')}
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </motion.div>
      </section>

      <section className="py-24 px-6 bg-[var(--surface-alt)] relative transition-colors duration-300">
        <div className="max-w-[1080px] mx-auto">
          <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#E94560] text-center mb-4">{t('landing.how.label')}</p>
          <h2 className="font-serif text-[clamp(32px,5vw,44px)] text-center mb-3 tracking-[-1px]">{t('landing.how.title')}</h2>
          <p className="text-center text-[var(--text-secondary)] text-[16px] font-light mb-16 max-w-[500px] mx-auto">
            {t('landing.how.desc')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {[
              {
                num: "1",
                title: t('landing.how.s1.title'),
                desc: t('landing.how.s1.desc'),
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
                num: "2",
                title: t('landing.how.s2.title'),
                desc: t('landing.how.s2.desc'),
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
                    <path d="M12 8l-2 4 4 0-2 4" fill="none" />
                  </svg>
                )
              },
              {
                num: "3",
                title: t('landing.how.s3.title'),
                desc: t('landing.how.s3.desc'),
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#E94560" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 12h4l3-9 4 18 3-9h4" />
                  </svg>
                )
              }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[var(--surface-card)] rounded-[20px] p-10 border border-[var(--border-subtle)] transition-all hover:translate-y-[-4px] hover:shadow-[0_12px_40px_rgba(233,69,96,0.08)] hover:border-[rgba(233,69,96,0.2)] relative group"
              >
                <span className="absolute top-5 left-6 font-serif text-[48px] text-[#E94560] opacity-10 leading-none">{step.num}</span>
                <div className="w-14 h-14 mx-auto mb-6 bg-[rgba(233,69,96,0.08)] rounded-2xl flex items-center justify-center">
                  <div className="w-7 h-7">{step.icon}</div>
                </div>
                <h3 className="font-serif text-[22px] mb-3 tracking-[-0.3px]">{step.title}</h3>
                <p className="text-[var(--text-secondary)] text-[14px] leading-[1.7] font-light">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-[var(--surface)] transition-colors duration-300">
        <div className="max-w-[1080px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-left">
              <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#E94560] mb-4">{t('landing.diff.label')}</p>
              <h2 className="font-serif text-[clamp(28px,4vw,38px)] mb-5 tracking-[-0.5px] leading-[1.2]">
                <span dangerouslySetInnerHTML={{ __html: lang === 'it' 
                  ? 'Gli altri pianificatori chiedono<br /><em class="italic text-[#E94560]">dove.</em> Noi chiediamo <em class="italic text-[#E94560]">perché.</em>'
                  : 'Other planners ask<br /><em class="italic text-[#E94560]">where.</em> We ask <em class="italic text-[#E94560]">why.</em>'
                }} />
              </h2>
              <p className="text-[var(--text-secondary)] text-[15px] leading-[1.8] mb-4 font-light">{t('landing.diff.p1')}</p>
              <p className="text-[var(--text-secondary)] text-[15px] leading-[1.8] mb-4 font-light">{t('landing.diff.p2')}</p>
              <p className="text-[#E94560] font-medium italic">{t('landing.diff.p3')}</p>
            </div>
            <div className="relative">
              <div className="bg-[var(--surface-card)] rounded-[20px] border border-[var(--border-subtle)] overflow-hidden shadow-sm">
                <div className="grid grid-cols-2">
                  <div className="p-3 md:p-5 bg-[var(--surface-alt)] font-semibold text-[12px] tracking-[1.5px] uppercase text-[var(--text-secondary)] border-r border-[var(--border-subtle)]">{t('landing.diff.others')}</div>
                  <div className="p-3 md:p-5 bg-[var(--surface-alt)] font-semibold text-[12px] tracking-[1.5px] uppercase text-[#E94560]">{t('landing.diff.us')}</div>
                </div>
                {[
                  { left: t('landing.diff.t1a'), right: t('landing.diff.t1b') },
                  { left: t('landing.diff.t2a'), right: t('landing.diff.t2b') },
                  { left: t('landing.diff.t3a'), right: t('landing.diff.t3b') },
                  { left: t('landing.diff.t4a'), right: t('landing.diff.t4b') },
                  { left: t('landing.diff.t5a'), right: t('landing.diff.t5b') }
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
          <p className="text-[11px] font-semibold tracking-[3px] uppercase text-[#E94560] text-center mb-4">{t('landing.test.label')}</p>
          <h2 className="font-serif text-[clamp(32px,5vw,44px)] text-center mb-3 tracking-[-1px]">{t('landing.test.title')}</h2>
          <p className="text-center text-[var(--text-secondary)] text-[16px] font-light mb-16 max-w-[500px] mx-auto">
            {t('landing.test.desc')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { text: t('landing.test.t1'), nameDetail: t('landing.test.t1.name') },
              { text: t('landing.test.t2'), nameDetail: t('landing.test.t2.name') },
              { text: t('landing.test.t3'), nameDetail: t('landing.test.t3.name') }
            ].map((test, i) => {
              const parts = test.nameDetail.split(',');
              const author = parts[0].trim();
              const detail = parts.slice(1).join(',').trim();
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

      <section className="py-24 px-6 bg-[#1A1A2E] text-center relative overflow-hidden">
        <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(233,69,96,0.08)_0%,transparent_70%)] rounded-full pointer-events-none" />
        <div className="max-w-[1080px] mx-auto relative z-10">
          <Logo className="w-[60px] h-[60px] mx-auto mb-7 opacity-90" />
          <h2 className="font-serif text-[clamp(28px,5vw,42px)] text-white mb-4 tracking-[-0.5px]">{t('landing.cta.title')}</h2>
          <p className="text-[rgba(255,255,255,0.5)] text-[16px] font-light mb-10 max-w-[420px] mx-auto">
            {t('landing.cta.desc')}
          </p>
          <Link href="/profiling" className="inline-flex items-center gap-[10px] bg-[#E94560] text-white text-[16px] font-semibold px-7 py-4 md:px-10 md:py-[18px] rounded-full transition-all hover:bg-[#D13A52] hover:translate-y-[-2px] shadow-[0_4px_24px_rgba(233,69,96,0.25)]" data-testid="link-start-profiling">
            {t('landing.cta.btn')}
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
          <a href="#" className="hover:text-[#E94560] transition-colors" data-testid="link-about">{t('nav.about')}</a>
          <a href="#" className="hover:text-[#E94560] transition-colors" data-testid="link-privacy">{t('nav.privacy')}</a>
          <a href="#" className="hover:text-[#E94560] transition-colors" data-testid="link-contact">{t('nav.contact')}</a>
        </div>
        <div>{t('nav.copyright')}</div>
      </footer>
    </div>
  );
}
