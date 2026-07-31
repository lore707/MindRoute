/**
 * GraphField — la FIRMA visiva di MindRoute.
 * ───────────────────────────────────────────────────────────────
 * Un campo di punti e linee (il Travel Identity Graph reso linguaggio):
 * nodi che vagano lentamente e si collegano quando vicini, come le linee
 * del Graph che si scompongono e ricompongono — il volo della libellula.
 *
 * Regole non negoziabili:
 *  · canvas 2D fatto in casa, zero librerie;
 *  · gira SOLO quando è nel viewport (IntersectionObserver) — mai cicli
 *    RAF fuori schermo;
 *  · prefers-reduced-motion → UN frame statico, nessun loop;
 *  · densità proporzionale all'area con tetto (max ~90 nodi → O(n²) ~4k
 *    coppie/frame: trascurabile);
 *  · pointer-events none, aria-hidden: è atmosfera, non contenuto.
 */
import { useEffect, useRef } from "react";

interface Props {
  className?: string;
  /** opacità complessiva del layer (default 1) */
  opacity?: number;
}

type Pt = { x: number; y: number; vx: number; vy: number; a: boolean };

export function GraphField({ className, opacity = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let w = 0, h = 0;
    let pts: Pt[] = [];
    let raf = 0;
    let running = false;

    const LINK = 110; // distanza massima di collegamento (px)

    const draw = (animate: boolean) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < LINK * LINK) {
            const alpha = (1 - Math.sqrt(d2) / LINK) * 0.15;
            ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }
      for (const p of pts) {
        ctx.fillStyle = p.a ? "rgba(240,67,90,0.7)" : "rgba(255,255,255,0.45)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.a ? 1.9 : 1.3, 0, Math.PI * 2);
        ctx.fill();
        if (animate) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < -12) p.x = w + 12; else if (p.x > w + 12) p.x = -12;
          if (p.y < -12) p.y = h + 12; else if (p.y > h + 12) p.y = -12;
        }
      }
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const target = Math.min(90, Math.max(28, Math.round((w * h) / 22000)));
      pts = Array.from({ length: target }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        a: Math.random() < 0.14, // nodo "accent" (rosso brand)
      }));
      draw(false);
    };

    const loop = () => { draw(true); raf = requestAnimationFrame(loop); };
    const start = () => { if (!running && !reduce) { running = true; raf = requestAnimationFrame(loop); } };
    const stop = () => { if (running) { running = false; cancelAnimationFrame(raf); } };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { rootMargin: "120px" },
    );
    io.observe(canvas);

    return () => { stop(); ro.disconnect(); io.disconnect(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity, pointerEvents: "none" }}
    />
  );
}
