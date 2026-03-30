import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, Compass } from "lucide-react";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";

import { useEffect, useState } from "react";
import { User } from "lucide-react";

function AuthButton() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, []);

if (user) {
    return (
      <a href="/my-account" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        {user.avatar
          ? <img src={user.avatar} className="w-7 h-7 rounded-full border border-[#E94560]/30" />
          : <div className="w-7 h-7 rounded-full bg-[#E94560] flex items-center justify-center text-white text-[11px] font-bold">{user.name?.[0]}</div>
        }
        <span className="hidden sm:inline text-[12px] font-medium text-[var(--text-secondary)] hover:text-primary transition-colors">
          {user.name?.split(" ")[0]}
        </span>
      </a>
    );
  }

const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  return (
    
      href={`/auth/google?returnTo=${encodeURIComponent(currentPath)}`}
      className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-primary transition-colors"
    >
      <User className="w-4 h-4" />
      <span className="hidden sm:inline">Accedi</span>
    </a>
  );
}

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
        <AuthButton />
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
    </div>
  );
}
