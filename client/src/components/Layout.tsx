import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Compass } from "lucide-react";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/components/ThemeProvider";
import { BackgroundLayers } from "@/components/BackgroundLayers";
import { CompanionDock } from "@/components/CompanionDock";
import { SectionProvider } from "@/lib/sectionContext";
import { useAuth, fetchMe } from "@/hooks/use-auth";
import { useEffect, useState } from "react";
import { User } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const { t } = useI18n();

  useEffect(() => {
    fetchMe().then(data => setUser(data));
  }, []);

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  if (user) {
    return (
      <a href="/my-account" aria-label={user.name || t("res.layout.account")} className="flex items-center justify-center gap-2 min-h-[44px] min-w-[44px] hover:opacity-80 transition-opacity">
        {user.avatar
          ? <img src={user.avatar} alt="" aria-hidden="true" className="w-7 h-7 rounded-full border border-[#E94560]/30" />
          : <div aria-hidden="true" className="w-7 h-7 rounded-full bg-[#E94560] flex items-center justify-center text-white text-[11px] font-bold">{user.name?.[0]}</div>
        }
        <span className="hidden sm:inline text-[12px] font-medium transition-colors" style={{ color: "#E94560" }}>
          {user.name?.split(" ")[0]}
        </span>
      </a>
    );
  }

  return (
    <a
      href={`/auth/google?returnTo=${encodeURIComponent(currentPath)}`}
      aria-label={t("res.layout.signIn")}
      className="flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-1.5 text-[12px] font-medium transition-colors"
      style={{ color: "#E94560" }}
    >
      <User className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
      <span className="hidden sm:inline">{t("res.layout.signIn")}</span>
    </a>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { t } = useI18n();
  const { theme } = useTheme();
  const { user } = useAuth();

  // Pagine che portano la PROPRIA barra → niente nav globale (sennò due barre
  // fisse sovrapposte):
  //  · le dashboard (utente loggato su "/" o "/my-account", itinerario) hanno
  //    la loro app-shell sidebar+topbar;
  //  · il FLUSSO immersivo (quiz /profiling + scelta mete /destinations) porta la
  //    sua barra minima condivisa (FlowNav: logo→indietro, lingua, "Salva ed esci").
  //    Uguale per loggati e anonimi — nessuna nav marketing durante quiz e scelta.
  const isItinerary = location.startsWith("/itinerary/") && !location.startsWith("/itinerary/stream");
  const isFlow = location === "/start" || location === "/profiling" || location === "/destinations";
  const isDashboard = location === "/my-account" || location.startsWith("/studio") || isItinerary || isFlow || (location === "/" && !!user)
    || location.startsWith("/__preview"); // preview dev della dashboard: porta la sua shell

  return (
    <SectionProvider>
<div className="min-h-screen text-[var(--text-primary)] overflow-x-hidden selection:bg-primary/20 selection:text-primary-foreground font-sans transition-colors duration-300">
      <BackgroundLayers />

      {!isDashboard && (
      <nav className="fixed top-0 left-0 right-0 z-[100] px-3 py-2.5 md:px-10 md:py-5 flex items-center justify-between gap-2 backdrop-blur-xl border-b transition-all duration-300" style={{ background: "rgba(7,9,15,0.65)", borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" className="flex items-center gap-2 md:gap-2.5 text-[var(--text-primary)] no-underline min-h-[44px]">
          <BrandMark size={36} idPrefix="nav" className="w-8 h-8 md:w-9 md:h-9" />
          <span className="font-serif text-[15px] md:text-[20px] tracking-[-0.3px]">
            MindRoute
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-3">
          {location !== "/" && (
            <div className="hidden md:flex gap-2 mr-3">
              <div className="h-1 w-8 rounded-full bg-primary/20 data-[active=true]:bg-primary transition-colors" data-active={location === "/profiling"} />
              <div className="h-1 w-8 rounded-full bg-primary/20 data-[active=true]:bg-primary transition-colors" data-active={location === "/destinations"} />
              <div className="h-1 w-8 rounded-full bg-primary/20 data-[active=true]:bg-primary transition-colors" data-active={location.startsWith("/itinerary")} />
            </div>
          )}
          <Link
            href="/come-funziona"
            className="text-[12px] md:text-[13px] font-medium no-underline transition-colors hover:opacity-80 px-2 min-h-[44px] flex items-center whitespace-nowrap"
            style={{ color: "var(--text-primary)", opacity: location === "/come-funziona" ? 1 : 0.72 }}
            data-testid="link-nav-how"
          >
            {t("nav.howItWorks")}
          </Link>
          <LangDropdown />
          <AuthButton />
          <Link href="/start" className="text-[13px] font-medium no-underline px-3.5 sm:px-5 py-2 border-[1.5px] rounded-full transition-all flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px]" style={{ color: "#E94560", borderColor: "rgba(233,69,96,0.5)", background: "rgba(233,69,96,0.08)" }} data-testid="link-nav-start">
            <Compass className="w-4 h-4 sm:hidden" />
            <span className="hidden sm:inline">{t('nav.start')}</span>
          </Link>
        </div>
      </nav>
      )}

      <AnimatePresence mode="wait">
        <motion.main
          key={location}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="min-h-screen relative z-10"
        >
          {children}
        </motion.main>
      </AnimatePresence>

      <CompanionDock />
    </div>
    </SectionProvider>
  );
}
