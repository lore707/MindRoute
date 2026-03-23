import { useState, useEffect } from "react";
import { Link } from "wouter";

export function CookieBanner() {
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
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto rounded-2xl border border-white/10 p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 shadow-2xl"
        style={{ background: "rgba(15,10,16,0.97)", backdropFilter: "blur(20px)" }}>
        <div className="flex-1 text-sm text-white/60 leading-relaxed">
          Usiamo cookie tecnici essenziali per il funzionamento del sito. I link affiliate nei tuoi itinerari possono impostare cookie di terze parti.{" "}
          <Link href="/privacy" className="text-[#E94560] hover:underline">Privacy Policy</Link>
        </div>
        <div className="flex gap-3 shrink-0">
          <button onClick={decline}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white/40 hover:text-white border border-white/10 hover:border-white/20 transition-all">
            Rifiuta
          </button>
          <button onClick={accept}
            className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#E94560] hover:bg-[#d63050] transition-all">
            Accetta
          </button>
        </div>
      </div>
    </div>
  );
}
