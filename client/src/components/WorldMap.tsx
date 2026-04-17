import { useEffect, useRef } from "react";

export default function WorldMap() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [d3, topojson] = await Promise.all([
          import("https://cdn.jsdelivr.net/npm/d3@7/+esm" as any),
          import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm" as any),
        ]);
        if (cancelled || !svgRef.current) return;

        const svg = d3.select(svgRef.current);
        const w = svgRef.current.clientWidth || window.innerWidth;
        const h = svgRef.current.clientHeight || window.innerHeight;

        const projection = d3.geoNaturalEarth1()
          .scale(w / 6.2)
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
          .attr("fill", "rgba(233,69,96,0.10)")
          .attr("stroke", "rgba(233,69,96,0.35)")
          .attr("stroke-width", "0.6");

        const destinations = [
          { name: "Parigi", lon: 2.35, lat: 48.85 },
          { name: "Tokyo", lon: 139.69, lat: 35.68 },
          { name: "New York", lon: -74.00, lat: 40.71 },
          { name: "Bali", lon: 115.19, lat: -8.41 },
          { name: "Marrakech", lon: -7.99, lat: 31.63 },
          { name: "Buenos Aires", lon: -58.38, lat: -34.60 },
          { name: "Sydney", lon: 151.21, lat: -33.87 },
          { name: "Nairobi", lon: 36.82, lat: -1.29 },
          { name: "Reykjavik", lon: -21.94, lat: 64.13 },
        ];

        const pinsG = svg.append("g");

        destinations.forEach((dest, i) => {
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
            .attr("opacity", 0.6);

          ring.append("animate")
            .attr("attributeName", "r")
            .attr("values", "4;16")
            .attr("dur", `${2.2 + i * 0.12}s`)
            .attr("repeatCount", "indefinite")
            .attr("begin", `${i * 0.35}s`);

          ring.append("animate")
            .attr("attributeName", "opacity")
            .attr("values", "0.6;0")
            .attr("dur", `${2.2 + i * 0.12}s`)
            .attr("repeatCount", "indefinite")
            .attr("begin", `${i * 0.35}s`);

          g.append("circle")
            .attr("cx", x).attr("cy", y)
            .attr("r", 3.5)
            .attr("fill", "#E94560")
            .attr("opacity", 0.95);

          const labelX = x > w * 0.75 ? x - 8 : x + 8;
          const anchor = x > w * 0.75 ? "end" : "start";

          g.append("text")
            .attr("x", labelX).attr("y", y - 7)
            .attr("font-size", "11")
            .attr("fill", "rgba(255,255,255,0.7)")
            .attr("font-family", "system-ui")
            .attr("text-anchor", anchor)
            .attr("font-weight", "500")
            .text(dest.name);
        });

      } catch (e) {
        console.error("WorldMap error:", e);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <svg
      ref={svgRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
