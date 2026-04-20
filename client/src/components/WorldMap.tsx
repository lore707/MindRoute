import { useEffect, useRef } from "react";

export const DESTINATIONS = [
  { name: "Parigi",       nameEn: "Paris",        flag: "🇫🇷", lon: 2.35,    lat: 48.85  },
  { name: "Tokyo",        nameEn: "Tokyo",         flag: "🇯🇵", lon: 139.69,  lat: 35.68  },
  { name: "New York",     nameEn: "New York",      flag: "🇺🇸", lon: -74.00,  lat: 40.71  },
  { name: "Bali",         nameEn: "Bali",          flag: "🇮🇩", lon: 115.19,  lat: -8.41  },
  { name: "Marrakech",    nameEn: "Marrakech",     flag: "🇲🇦", lon: -7.99,   lat: 31.63  },
  { name: "Buenos Aires", nameEn: "Buenos Aires",  flag: "🇦🇷", lon: -58.38,  lat: -34.60 },
  { name: "Sydney",       nameEn: "Sydney",        flag: "🇦🇺", lon: 151.21,  lat: -33.87 },
  { name: "Nairobi",      nameEn: "Nairobi",       flag: "🇰🇪", lon: 36.82,   lat: -1.29  },
  { name: "Reykjavik",    nameEn: "Reykjavik",     flag: "🇮🇸", lon: -21.94,  lat: 64.13  },
];

const ROUTES = [
  [0, 1], // Paris → Tokyo
  [2, 3], // New York → Bali
  [4, 5], // Marrakech → Buenos Aires
  [6, 7], // Sydney → Nairobi
  [8, 0], // Reykjavik → Paris
  [1, 6], // Tokyo → Sydney
  [2, 4], // New York → Marrakech
  [5, 8], // Buenos Aires → Reykjavik
  [3, 7], // Bali → Nairobi
];

export default function WorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    let animTimeout: ReturnType<typeof setTimeout>;
    let rafId: number;

    async function load() {
      try {
        const [d3, topojson] = await Promise.all([
          import("https://cdn.jsdelivr.net/npm/d3@7/+esm" as any),
          import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm" as any),
        ]);
        if (cancelled || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const rect = svgRef.current.getBoundingClientRect();
        const w = rect.width  || window.innerWidth;
        const h = rect.height || window.innerHeight;

        const isMobile = w < 768;
        // Scala adattiva: la mappa riempie il contenitore sia in larghezza
        // che in altezza (NaturalEarth ha aspect ratio ~2:1)
        const scaleW = w / 6.0;
        const scaleH = h / 3.0;
        const scale  = Math.max(scaleW, scaleH) * (isMobile ? 1.1 : 1.0);

        const projection = d3.geoNaturalEarth1()
          .scale(scale)
          .translate([w / 2, h / 2]);

        const path = d3.geoPath().projection(projection);

        const world = await d3.json(
          "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"
        );
        if (cancelled) return;

        const countries = topojson.feature(world, world.objects.countries);

        svg.append("g")
          .selectAll("path")
          .data((countries as any).features)
          .join("path")
          .attr("d", path as any)
          .attr("fill", "rgba(233,69,96,0.08)")
          .attr("stroke", "rgba(233,69,96,0.28)")
          .attr("stroke-width", "0.5");

        // Defs per filtro glow
        const defs = svg.append("defs");
        const filter = defs.append("filter").attr("id", "dot-glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
        filter.append("feGaussianBlur").attr("stdDeviation", "2.5").attr("result", "blur");
        const feMerge = filter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "blur");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        // Gruppo flight paths (sotto i pin)
        const flightG = svg.append("g").attr("class", "flight-g");

        // Pin destinazioni
        const pinsG = svg.append("g");

        DESTINATIONS.forEach((dest, i) => {
          const coords = projection([dest.lon, dest.lat]);
          if (!coords) return;
          const [x, y] = coords;
          const g = pinsG.append("g");

          const ring = g.append("circle")
            .attr("cx", x).attr("cy", y)
            .attr("r", 4)
            .attr("fill", "none")
            .attr("stroke", "#E94560")
            .attr("stroke-width", "1")
            .attr("opacity", 0.5);

          ring.append("animate")
            .attr("attributeName", "r")
            .attr("values", "4;18")
            .attr("dur", `${2.4 + i * 0.11}s`)
            .attr("repeatCount", "indefinite")
            .attr("begin", `${i * 0.3}s`);

          ring.append("animate")
            .attr("attributeName", "opacity")
            .attr("values", "0.5;0")
            .attr("dur", `${2.4 + i * 0.11}s`)
            .attr("repeatCount", "indefinite")
            .attr("begin", `${i * 0.3}s`);

          g.append("circle")
            .attr("cx", x).attr("cy", y)
            .attr("r", 3.5)
            .attr("fill", "#E94560")
            .attr("filter", "url(#dot-glow)")
            .attr("opacity", 0.95);

          const labelX = x > w * 0.75 ? x - 8 : x + 8;
          const anchor = x > w * 0.75 ? "end" : "start";

       if (w >= 360) {
            g.append("text")
              .attr("x", labelX).attr("y", y - 8)
              .attr("font-size", isMobile ? "11" : "10.5")
              .attr("fill", "rgba(255,255,255,0.65)")
              .attr("font-family", "system-ui, sans-serif")
              .attr("text-anchor", anchor)
              .attr("font-weight", "500")
              .attr("letter-spacing", "0.3")
              .text(dest.name);
          }
        });

        // ── Flight path animation ──────────────────────────
        let routeIdx = 0;

        const animateRoute = () => {
          if (cancelled) return;

          const [fromIdx, toIdx] = ROUTES[routeIdx % ROUTES.length];
          routeIdx++;

          const from = DESTINATIONS[fromIdx];
          const to   = DESTINATIONS[toIdx];

          const interp = (d3 as any).geoInterpolate(
            [from.lon, from.lat],
            [to.lon, to.lat]
          );
          const lineCoords = Array.from({ length: 80 }, (_: unknown, i: number) => interp(i / 79));

          const geoLine = {
            type: "Feature",
            geometry: { type: "LineString", coordinates: lineCoords },
            properties: {},
          };

          // Arco
          const arcEl = flightG.append("path")
            .datum(geoLine)
            .attr("d", (d: any) => path(d) || "")
            .attr("fill", "none")
            .attr("stroke", "rgba(233,69,96,0.45)")
            .attr("stroke-width", "1.2")
            .attr("stroke-linecap", "round")
            .attr("opacity", 0);

          const arcNode = arcEl.node() as SVGPathElement;
          let totalLen = 0;
          try { totalLen = arcNode.getTotalLength(); } catch { return; }
          if (totalLen < 10) { animTimeout = setTimeout(animateRoute, 500); return; }

          arcEl
            .attr("stroke-dasharray", totalLen)
            .attr("stroke-dashoffset", totalLen)
            .attr("opacity", 1)
            .transition()
            .duration(2400)
            .ease((d3 as any).easeQuadInOut)
            .attr("stroke-dashoffset", 0);

          // Dot mobile
          const dotOuter = flightG.append("circle")
            .attr("r", 6)
            .attr("fill", "rgba(233,69,96,0.22)");

          const dotInner = flightG.append("circle")
            .attr("r", 3)
            .attr("fill", "#FF6B8A")
            .attr("filter", "url(#dot-glow)");

          const ANIM_DUR = 2400;
          const startTime = performance.now();

          function moveDot(now: number) {
            if (cancelled) return;
            const elapsed = now - startTime;
            const t = Math.min(elapsed / ANIM_DUR, 1);
            const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            try {
              const pt = arcNode.getPointAtLength(eased * totalLen);
              dotOuter.attr("cx", pt.x).attr("cy", pt.y);
              dotInner.attr("cx", pt.x).attr("cy", pt.y);
            } catch {}

            if (t < 1) {
              rafId = requestAnimationFrame(moveDot);
            } else {
              // Fade out
              arcEl.transition().delay(900).duration(900).attr("opacity", 0).remove();
              dotOuter.transition().delay(900).duration(600).attr("opacity", 0).remove();
              dotInner.transition().delay(900).duration(600).attr("opacity", 0).remove();
              animTimeout = setTimeout(animateRoute, 1800);
            }
          }

          rafId = requestAnimationFrame(moveDot);
        }

        animTimeout = setTimeout(animateRoute, 1200);

      } catch (e) {
        console.error("WorldMap error:", e);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(animTimeout);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
