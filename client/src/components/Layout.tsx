import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Compass } from "lucide-react";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--text-primary)] overflow-x-hidden selection:bg-primary/20 selection:text-primary-foreground font-sans transition-colors duration-300">
      <nav className="fixed top-0 left-0 right-0 z-[100] px-4 py-3 md:px-10 md:py-5 flex items-center justify-between gap-2 bg-[var(--nav-bg)] backdrop-blur-xl border-b border-[var(--nav-border)] transition-all duration-300">
        <Link href="/" className="flex items-center gap-2.5 text-[var(--text-primary)] no-underline">
          <svg className="w-9 h-9" viewBox="0 0 120 120" fill="none">
            <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
            <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
            <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
            <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
            <ellipse cx="60" cy="60" rx="5" ry="6" fill="currentColor"/>
            <path d="M58 66L60 108L62 66" fill="#E94560" opacity="0.7"/>
            <circle cx="60" cy="48" r="3.5" fill="currentColor"/>
          </svg>
          <span className="font-serif text-[16px] md:text-[20px] tracking-[-0.3px]">
            MindRoute
          </span>
        </Link>
        
        <div className="flex items-center gap-3">
          {location !== "/" && (
             <div className="hidden md:flex gap-2 mr-3">
               <div className="h-1 w-8 rounded-full bg-primary/20 data-[active=true]:bg-primary transition-colors" data-active={location === "/profiling"} />
               <div className="h-1 w-8 rounded-full bg-primary/20 data-[active=true]:bg-primary transition-colors" data-active={location === "/destinations"} />
               <div className="h-1 w-8 rounded-full bg-primary/20 data-[active=true]:bg-primary transition-colors" data-active={location.startsWith("/itinerary")} />
             </div>
          )}
          <button
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
            className="flex items-center justify-center w-8 h-8 rounded-full border border-[var(--border-input)] text-[var(--text-secondary)] hover:border-[#E94560] hover:text-[#E94560] transition-all bg-transparent cursor-pointer"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="w-[15px] h-[15px]" /> : <Sun className="w-[15px] h-[15px]" />}
          </button>
          <LangDropdown />
          <Link href="/profiling" className="text-[13px] font-medium text-primary no-underline px-5 py-2 border-[1.5px] border-primary rounded-full hover:bg-primary hover:text-white transition-all flex items-center gap-1.5" data-testid="link-nav-start">
            <Compass className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">{t('nav.start')}</span>
          </Link>
        </div>
      </nav>

    <AnimatePresence mode="wait">
        <motion.main
          key={location}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="min-h-screen"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <footer className="border-t border-white/5 bg-[#0a0814] px-6 md:px-12 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            
            {/* Logo + tagline */}
            <div className="flex flex-col gap-2">
              <Link href="/" className="flex items-center gap-2.5 text-white no-underline">
                <svg className="w-7 h-7" viewBox="0 0 120 120" fill="none">
                  <path d="M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
                  <path d="M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
                  <path d="M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60" fill="#E94560" opacity="0.85"/>
                  <path d="M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72" fill="#E94560" opacity="0.55"/>
                  <ellipse cx="60" cy="60" rx="5" ry="6" fill="currentColor"/>
                  <path d="M58 66L60 108L62 66" fill="#E94560" opacity="0.7"/>
                  <circle cx="60" cy="48" r="3.5" fill="currentColor"/>
                </svg>
                <span className="font-serif text-[16px] tracking-[-0.3px]">MindRoute</span>
              </Link>
              <p className="text-white/30 text-[12px] max-w-[220px] leading-relaxed">
                Viaggi costruiti sul tuo carattere, non sulle tue preferenze.
              </p>
            </div>

            {/* Link colonne */}
            <div className="flex flex-wrap gap-10 md:gap-16">
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/30">Prodotto</p>
                <Link href="/profiling" className="text-white/50 hover:text-white text-sm transition-colors no-underline">Inizia il viaggio</Link>
                <Link href="/privacy" className="text-white/50 hover:text-white text-sm transition-colors no-underline">Privacy Policy</Link>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[2px] text-white/30">Contatti</p>
                <a href="mailto:mindroutetravel@gmail.com" className="text-white/50 hover:text-white text-sm transition-colors no-underline">mindroutetravel@gmail.com</a>
              </div>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="mt-10 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-white/20 text-[11px]">© 2026 MindRoute. Creato per viaggiatori che pensano diversamente.</p>
            <p className="text-white/15 text-[11px]">I link presenti negli itinerari possono essere link di affiliazione.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
