import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LandingCinematic, DEFAULT_LANDING_DATA, type LandingData, type MarqueeItem } from "@/components/LandingCinematic";
import { useI18n } from "@/lib/i18n";

/**
 * /come-funziona — the editorial story (how it works, manifesto, destinations,
 * preview, method, closing CTA) that used to live on the landing page. The
 * landing is now a slim app-entry; everything explanatory moved here, reachable
 * from the persistent nav. Same data source and component as Landing, rendered
 * with mode="how".
 */
export default function HowItWorks() {
  const [, navigate] = useLocation();
  const { lang } = useI18n();
  const [data, setData] = useState<LandingData>(DEFAULT_LANDING_DATA);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/landing-images")
      .then(r => r.ok ? r.json() : null)
      .then((set: Partial<LandingData> & { marquee?: unknown } | null) => {
        if (cancelled || !set) return;
        const { marquee: _ignoredLegacyMarquee, ...rest } = set;
        setData(prev => ({ ...prev, ...rest }));
      })
      .catch(() => { /* fallback already in state */ });

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
      mode="how"
      data={{
        ...data,
        onStart: () => navigate("/start"),
      }}
    />
  );
}
