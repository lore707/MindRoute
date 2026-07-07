import { useEffect, useState } from "react";
import type { TraitVector, Axis } from "@shared/traits";
import { useI18n } from "@/lib/i18n";

interface TraitHistoryResponse {
  snapshots: any[];
  current: TraitVector;
  delta: TraitVector | null;
  headline: string | null;
  axes: Record<Axis, { left: string; right: string; it: { left: string; right: string } }>;
  mappingVersion: number;
}

interface AccountInsightsResponse {
  stats: {
    destinationsExplored: number;
    daysImagined: number;
    topContinent: { continent: string; label: string; count: number } | null;
    avgTripDays: number | null;
  };
  patterns: {
    topContinent: string | null;
    topContinentRatio: number | null;
    avgDays: number | null;
    shortTripBias: boolean;
    longTripBias: boolean;
    tripCount: number;
  };
}

export interface RecognitionChip {
  /** What this chip describes — used as eyebrow label. */
  kind: "continent" | "duration" | "trait";
  /** Italian short phrase: "60% Europa", "media 5 giorni", "offbeat". */
  label: string;
}

export interface TraitRecognition {
  /** Becomes true only after a fetch completes and N>=3 snapshot are available. */
  canShow: boolean;
  /** Headline AI (one Italian sentence) — null while loading or if model fallback didn't fire. */
  headline: string | null;
  /** Up to 3 short chips summarizing the recognized pattern. */
  chips: RecognitionChip[];
  /** Number of snapshots that contributed. */
  snapshotCount: number;
  /** Whether the underlying fetch has finished (success or failure). */
  ready: boolean;
}

const EMPTY: TraitRecognition = { canShow: false, headline: null, chips: [], snapshotCount: 0, ready: false };

interface BestTrait { axis: Axis; dist: number; pole: string }

function deriveDominantTraitChip(
  current: TraitVector,
  axes: TraitHistoryResponse["axes"],
): RecognitionChip | null {
  // Picks the single most off-center axis (|v - 0.5| max) and labels with its pole.
  // Neutral axes (within ±0.08) are ignored — they're not a signal.
  let best: BestTrait | null = null;
  (Object.keys(current) as Axis[]).forEach(axis => {
    const v = current[axis];
    const dist = Math.abs(v - 0.5);
    if (dist < 0.08) return;
    const labels = axes[axis]?.it;
    if (!labels) return;
    const pole = v < 0.5 ? labels.left : labels.right;
    if (!best || dist > best.dist) best = { axis, dist, pole };
  });
  if (!best) return null;
  return { kind: "trait", label: (best as BestTrait).pole };
}

/**
 * Loads trait-history + account-insights and reduces them to a recognition object
 * suitable for the banner. canShow=true only when there are ≥3 snapshots AND
 * we have at least one chip OR a headline to render — otherwise the banner is
 * not worth showing (would feel like noise).
 */
export function useTraitRecognition(): TraitRecognition {
  const [state, setState] = useState<TraitRecognition>(EMPTY);
  const { lang } = useI18n();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [thRes, aiRes] = await Promise.all([
          fetch("/api/me/trait-history"),
          fetch("/api/me/account-insights"),
        ]);
        if (cancelled) return;
        if (!thRes.ok) {
          setState({ ...EMPTY, ready: true });
          return;
        }
        const th: TraitHistoryResponse = await thRes.json();
        const ai: AccountInsightsResponse | null = aiRes.ok ? await aiRes.json() : null;

        const snapshotCount = Array.isArray(th.snapshots) ? th.snapshots.length : 0;
        const chips: RecognitionChip[] = [];

        if (ai?.patterns.topContinent && ai.patterns.topContinentRatio !== null && ai.patterns.topContinentRatio >= 0.4) {
          const pct = Math.round(ai.patterns.topContinentRatio * 100);
          chips.push({ kind: "continent", label: `${pct}% ${ai.patterns.topContinent}` });
        }
        if (ai?.patterns.avgDays !== null && ai?.patterns.avgDays !== undefined) {
          // Parole intere, mai "7.0g": il chip parlava in sigla ed era criptico.
          const n = Math.round(ai.patterns.avgDays);
          const avg = lang === "it" ? `in media ${n} giorni` : `avg ${n} days`;
          if (ai.patterns.shortTripBias) chips.push({ kind: "duration", label: `${avg} · ${lang === "it" ? "viaggi brevi" : "short trips"}` });
          else if (ai.patterns.longTripBias) chips.push({ kind: "duration", label: `${avg} · ${lang === "it" ? "viaggi lunghi" : "long trips"}` });
          else chips.push({ kind: "duration", label: avg });
        }

        const traitChip = deriveDominantTraitChip(th.current, th.axes);
        if (traitChip) chips.push(traitChip);

        const canShow = snapshotCount >= 3 && (chips.length > 0 || !!th.headline);
        setState({
          canShow,
          headline: th.headline,
          chips: chips.slice(0, 3),
          snapshotCount,
          ready: true,
        });
      } catch {
        if (!cancelled) setState({ ...EMPTY, ready: true });
      }
    })();
    return () => { cancelled = true; };
  }, [lang]);

  return state;
}
