import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";

export function CookieBanner() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("mindroute_cookie_consent");
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("mindroute_cookie_consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("mindroute_cookie_consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] px-3 sm:p-4 md:p-6" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}>
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
