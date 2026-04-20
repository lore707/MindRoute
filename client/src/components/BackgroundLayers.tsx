/**
 * BackgroundLayers.tsx
 * ───────────────────────────────────────────────────────────────
 * Global multi-layer background for MindRoute.
 * Drop-in component used once inside <Layout />, covers every route.
 *
 * Layers (tutti fissi in position:fixed, dietro ogni contenuto):
 *   1. Atmosphere   — radial glows + vignetta (profondità "lontana")
 *   2. Grain        — noise SVG sottile (rompe il piatto digitale)
 *   3. Constellations — stelle parallax a 3 livelli + silk threads
 *   4. Aurora       — blob mesh animati (solo hero / momenti "respiro")
 *
 * Per-page preset: il componente accetta `mode` per modulare l'intensità
 * delle costellazioni e accendere/spegnere l'aurora in base alla rotta.
 * La rotta corrente la prendiamo da wouter (già usato nel tuo Layout).
 *
 * Palette: usa i token CSS già in uso (--primary → corallo), quindi si
 * adatta automaticamente al tema scuro attuale. Zero conflitti con Tailwind.
 *
 * Performance:
 *   - requestAnimationFrame loop parte solo se costellazioni visibili
 *   - parallax usa transform3d (GPU)
 *   - su prefers-reduced-motion: nessuna animazione, sfondo statico
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";

type Mode = "hero" | "map" | "form" | "minimal";

/** Intensità dei layer per rotta */
const ROUTE_MODE: Record<string, Mode> = {
  "/":            "hero",      // Landing: tutto al massimo
  "/destinations":"map",       // Mappa: atmosfera + grana, poche stelle, no aurora
  "/profiling":   "form",      // Quiz: atmosfera + grana + stelle rarefatte
  "/itinerary":   "minimal",   // Itinerario: solo atmosfera + grana
  "/my-account":  "minimal",
  "/privacy":     "minimal",
};

function resolveMode(pathname: string): Mode {
  // match per prefisso così /itinerary/:id e /itinerary/stream/:id ricadono su "itinerary"
  const key = Object.keys(ROUTE_MODE)
    .sort((a, b) => b.length - a.length)
    .find((k) => (k === "/" ? pathname === "/" : pathname.startsWith(k)));
  return (key && ROUTE_MODE[key]) || "minimal";
}

/** Configurazione stelle per ogni layer di profondità */
const STAR_LAYERS = [
  { depth: 0.15, count: 36, sizeRange: [0.8, 1.6], dim: true },
  { depth: 0.35, count: 22, sizeRange: [1.4, 2.4], dim: false },
  { depth: 0.65, count: 8,  sizeRange: [2.2, 3.6], dim: false },
] as const;

/** Quante stelle mostrare in base al mode */
const STAR_DENSITY: Record<Mode, number> = {
  hero: 1.0,
  map: 0.0,      // la mappa ha già pin e rotte
  form: 0.5,
  minimal: 0.0,
};

const SHOW_AURORA: Record<Mode, boolean> = {
  hero: true,
  map: false,
  form: false,
  minimal: false,
};

export function BackgroundLayers() {
  const [location] = useLocation();
  const mode = resolveMode(location);
  const rootRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<HTMLDivElement>(null);

  const density = STAR_DENSITY[mode];
  const showAurora = SHOW_AURORA[mode];

  // rigenera stelle quando cambia il mode (densità diversa)
  const stars = useMemo(() => {
    if (density === 0) return [];
    const all: Array<{
      x: number; y: number; size: number; dim: boolean;
      base: number; dur: number; delay: number; layerIdx: number;
    }> = [];
    STAR_LAYERS.forEach((layer, layerIdx) => {
      const count = Math.round(layer.count * density);
      for (let i = 0; i < count; i++) {
        all.push({
          layerIdx,
          x: Math.random() * 104 - 2,
          y: Math.random() * 104 - 2,
          size: layer.sizeRange[0] + Math.random() * (layer.sizeRange[1] - layer.sizeRange[0]),
          dim: layer.dim,
          base: 0.55 + Math.random() * 0.45,
          dur: 3 + Math.random() * 4,
          delay: Math.random() * 5,
        });
      }
    });
    return all;
  }, [density]);

  // parallax al mouse
  useEffect(() => {
    if (density === 0 || !starsRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let mx = 0, my = 0, tx = 0, ty = 0;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      tx = (e.clientX - cx) / cx;
      ty = (e.clientY - cy) / cy;
    };
    const tick = () => {
      mx += (tx - mx) * 0.06;
      my += (ty - my) * 0.06;
      const layers = starsRef.current?.querySelectorAll<HTMLDivElement>(".mr-star-layer");
      layers?.forEach((l) => {
        const d = parseFloat(l.dataset.depth || "0");
        l.style.transform = `translate3d(${-mx * d * 30}px, ${-my * d * 30}px, 0)`;
      });
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    tick();
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [density]);

  return (
    <div ref={rootRef} className="mr-bg-root" aria-hidden="true">
      {/* LAYER 1 — atmosphere: sempre on */}
      <div className="mr-bg-atmosphere" />

      {/* LAYER 2 — grain: sempre on */}
      <div className="mr-bg-grain" />

      {/* LAYER 3 — constellations: solo se density > 0 */}
      {density > 0 && (
        <div className="mr-bg-constellations" ref={starsRef}>
          <svg className="mr-silk" viewBox="0 0 1600 900" preserveAspectRatio="none">
            <path d="M -50 200 Q 400 120 800 260 T 1650 180" />
            <path d="M -50 620 Q 350 520 780 640 T 1650 560" />
            <path d="M 200 -50 Q 400 300 700 500 T 1000 950" opacity="0.5" />
            <path d="M 1400 -50 Q 1200 300 900 500 T 600 950" opacity="0.5" />
          </svg>
          {STAR_LAYERS.map((layer, idx) => (
            <div
              key={idx}
              className="mr-star-layer"
              data-depth={layer.depth}
            >
              {stars
                .filter((s) => s.layerIdx === idx)
                .map((s, i) => (
                  <span
                    key={i}
                    className={`mr-star${s.dim ? " dim" : ""}`}
                    style={{
                      left: `${s.x}%`,
                      top: `${s.y}%`,
                      width: `${s.size}px`,
                      height: `${s.size}px`,
                      ["--base" as any]: s.base,
                      ["--dur" as any]: `${s.dur}s`,
                      ["--delay" as any]: `${s.delay}s`,
                    }}
                  />
                ))}
            </div>
          ))}
        </div>
      )}

      {/* LAYER 4 — aurora: solo su hero */}
      {showAurora && (
        <div className="mr-bg-aurora">
          <div className="mr-aurora-blob a" />
          <div className="mr-aurora-blob b" />
          <div className="mr-aurora-blob c" />
        </div>
      )}
    </div>
  );
}
