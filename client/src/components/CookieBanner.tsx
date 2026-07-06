import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

// localStorage può LANCIARE (Safari/in-app browser in modalità privata): senza
// try/catch il click su Accetta crashava in silenzio e il banner riappariva a
// ogni visita ("a volte c'è, a volte no"). Qui non lancia mai.
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* private mode: il consenso vale per la sessione */ }
}

// Google Consent Mode v2: comunica la scelta a GA4. Il default è "denied"
// (impostato in index.html PRIMA di gtag config); qui aggiorniamo alla scelta.
function updateGaConsent(granted: boolean): void {
  try {
    (window as any).gtag?.("consent", "update", {
      analytics_storage: granted ? "granted" : "denied",
    });
  } catch { /* gtag assente (ad-blocker): niente da aggiornare */ }
}

export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!safeGet("mindroute_cookie_consent")) setVisible(true);
  }, []);

  const accept = () => {
    safeSet("mindroute_cookie_consent", "accepted");
    updateGaConsent(true);
    setVisible(false);
  };

  const decline = () => {
    safeSet("mindroute_cookie_consent", "declined");
    updateGaConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    // z-index sopra QUALSIASI cosa dell'app: overlay dashboard (400-4000),
    // mappa fullscreen, e il pre-hero di index.html (z 2147483000). Un banner
    // di consenso che finisce sotto un overlay è un banner che non esiste.
    <div className="fixed bottom-0 left-0 right-0 px-3 sm:p-4 md:p-6" style={{ zIndex: 2147483100, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
      <div className="max-w-4xl mx-auto rounded-2xl border border-white/10 p-4 sm:p-5 md:p-6 flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4 shadow-2xl"
        style={{ background: "rgba(15,10,16,0.97)", backdropFilter: "blur(20px)" }}>
        <div className="flex-1 text-[13px] sm:text-sm text-white/60 leading-relaxed">
          {t('cookie.text')}{" "}
          <Link href="/privacy" className="text-[#E94560] hover:underline">{t('cookie.privacy')}</Link>
        </div>
        <div className="flex gap-2.5 sm:gap-3 shrink-0">
          <button onClick={decline}
            className="flex-1 md:flex-none px-4 py-3 min-h-[44px] rounded-xl text-[13px] sm:text-sm font-bold text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all">
            {t('cookie.decline')}
          </button>
          <button onClick={accept}
            className="flex-1 md:flex-none px-5 py-3 min-h-[44px] rounded-xl text-[13px] sm:text-sm font-bold text-white bg-[#E94560] hover:bg-[#d63050] transition-all">
            {t('cookie.accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
