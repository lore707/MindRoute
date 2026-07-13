import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LandingEditorial, type LandingStats } from "@/components/LandingEditorial";
import { track } from "@/lib/analytics";

export default function Landing() {
  const [, navigate] = useLocation();
  // Numeri REALI per hero counter e stats band. Se l'endpoint fallisce i
  // contatori restano nascosti (mai numeri inventati) — la pagina dipinge
  // subito comunque: le foto sono curate lato client.
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stats")
      .then(r => r.ok ? r.json() : null)
      .then((s: LandingStats | null) => {
        if (!cancelled && s) setStats(s);
      })
      .catch(() => { /* contatori nascosti, nessun fallback finto */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <LandingEditorial
      stats={stats}
      // Evento PRE-muro auth: il CTA fa solo navigate(/start), il gate
      // <RequireAuth> scatta DOPO. Il delta con quiz_started (scelta-path,
      // post-muro) misura il drop-off dell'auth gate. /start = onboarding L1.
      onStart={() => { track("quiz_cta_click"); navigate("/start"); }}
    />
  );
}
