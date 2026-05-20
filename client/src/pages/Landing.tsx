import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { LandingCinematic, DEFAULT_LANDING_DATA, type LandingData } from "@/components/LandingCinematic";

export default function Landing() {
  const [, navigate] = useLocation();
  // Start with the curated fallback set so the page paints immediately; swap
  // in the server's deduplicated Unsplash set when /api/landing-images
  // resolves. If the endpoint fails we just keep the fallback — no spinner,
  // no jank, never a black landing.
  const [data, setData] = useState<LandingData>(DEFAULT_LANDING_DATA);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/landing-images")
      .then(r => r.ok ? r.json() : null)
      .then((set: Partial<LandingData> | null) => {
        if (cancelled || !set) return;
        // Defensive merge: any missing key keeps the fallback value.
        setData({ ...DEFAULT_LANDING_DATA, ...set });
      })
      .catch(() => { /* fallback already in state */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <LandingCinematic
      data={{
        ...data,
        onStart: () => navigate("/profiling"),
      }}
    />
  );
}
