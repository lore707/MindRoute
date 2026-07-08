import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LandingCinematic, DEFAULT_LANDING_DATA, type LandingData, type MarqueeItem } from "@/components/LandingCinematic";
import { track } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";

export default function Landing() {
  const [, navigate] = useLocation();
  const { lang } = useI18n();
  // Start with the curated fallback set so the page paints immediately; swap
  // in the server's deduplicated Unsplash set when /api/landing-images
  // resolves. If the endpoint fails we just keep the fallback — no spinner,
  // no jank, never a black landing.
  const [data, setData] = useState<LandingData>(DEFAULT_LANDING_DATA);

  useEffect(() => {
    let cancelled = false;
    // (1) Photos. /api/landing-images still ships a legacy `marquee: string[]`
    // which would clobber our typed MarqueeItem[]; strip it before merging so
    // the destinations-feed fetch below stays authoritative for the strip.
    fetch("/api/landing-images")
      .then(r => r.ok ? r.json() : null)
      .then((set: Partial<LandingData> & { marquee?: unknown } | null) => {
        if (cancelled || !set) return;
        const { marquee: _ignoredLegacyMarquee, ...rest } = set;
        setData(prev => ({ ...prev, ...rest }));
      })
      .catch(() => { /* fallback already in state */ });

    // (2) Proof-point strip. Real recent generations mixed with curated. If
    // the endpoint fails or returns nothing, the curated default already in
    // state stays — silent fallback, never an empty strip.
    fetch(`/api/destinations-feed?lang=${lang}`)
      .then(r => r.ok ? r.json() : null)
      .then((items: MarqueeItem[] | null) => {
        if (cancelled || !Array.isArray(items) || items.length === 0) return;
        setData(prev => ({ ...prev, marquee: items }));
      })
      .catch(() => { /* curated default stays */ });

    return () => { cancelled = true; };
  }, [lang]);

  return (
    <LandingCinematic
      data={{
        ...data,
        // Evento PRE-muro auth: il CTA fa solo navigate(/start), il gate
        // <RequireAuth> scatta DOPO. Il delta con quiz_started (scelta-path, post-muro)
        // misura il drop-off dell'auth gate. /start = onboarding L1 veloce.
        onStart: () => { track("quiz_cta_click"); navigate("/start"); },
      }}
    />
  );
}
