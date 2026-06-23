/**
 * RouteMap.tsx
 * ───────────────────────────────────────────────────────────────
 * Mappa reale (Leaflet + tile OSM/CARTO dark) per la sezione itinerario.
 * Sostituisce il vecchio SVG astratto: pin numerati delle tappe, linea del
 * percorso, popup con tappa/giorno/slot + "Apri in Google Maps", filtro per
 * giorno e auto-fit dei bordi. Costo €0 (tile CARTO, attribution OSM).
 *
 * È caricato in lazy da ItineraryDashboard così `leaflet` (~150KB) entra nel
 * bundle solo quando l'utente apre il tab Mappa.
 * ─────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type RoutePoint = {
  lat: number;
  lng: number;
  label: string;
  day?: number;
  slot?: string;
};

type Props = {
  points: RoutePoint[];
  center?: { lat: number; lng: number };
  destination: string;
  t: (k: string) => string;
  lang: "it" | "en";
};

const ACCENT = "#E94560";
const GOLD = "#D4A853";

// divIcon numerato e brandizzato (niente immagine marker default di Leaflet).
function pinIcon(n: number, active: boolean) {
  return L.divIcon({
    className: "rmap-pin-wrap",
    html: `<div class="rmap-pin${active ? " on" : ""}"><span>${n}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

export default function RouteMap({ points, center, destination, t, lang }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  // Giorni disponibili (ordinati) per il filtro — solo se i punti portano il giorno.
  const days = useMemo(() => {
    const s = new Set<number>();
    points.forEach((p) => { if (typeof p.day === "number") s.add(p.day); });
    return Array.from(s).sort((a, b) => a - b);
  }, [points]);

  const visible = useMemo(
    () => (activeDay == null ? points : points.filter((p) => p.day === activeDay)),
    [points, activeDay],
  );

  // init mappa una volta
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const first = points[0] ?? (center ? { lat: center.lat, lng: center.lng } : null);
    const map = L.map(elRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // niente zoom rubato allo scroll della pagina
    }).setView(first ? [first.lat, first.lng] : [41.9, 12.5], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    // il container è appena montato/visibile: assicura il render corretto.
    setTimeout(() => map.invalidateSize(), 80);

    // Nessuna tappa geolocalizzata né centro: come ultima risorsa geocodifica la
    // città lato client, così la mappa mostra comunque la destinazione (mai vuota).
    if (!first && destination) {
      let cancelled = false;
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`, {
        headers: { Accept: "application/json" },
      })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !Array.isArray(d) || !d[0]) return;
          const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) map.setView([lat, lng], 12, { animate: true });
        })
        .catch(() => { /* resta sulla vista di default */ });
      return () => { cancelled = true; map.remove(); mapRef.current = null; layerRef.current = null; };
    }

    return () => { map.remove(); mapRef.current = null; layerRef.current = null; };
  }, []);

  // ridisegna pin + percorso ad ogni cambio di filtro/punti
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const dirLabel = lang === "it" ? "Apri in Google Maps" : "Open in Google Maps";
    const dayWord = lang === "it" ? "Giorno" : "Day";

    const latlngs: L.LatLngExpression[] = [];
    visible.forEach((p, i) => {
      latlngs.push([p.lat, p.lng]);
      const meta = [p.day != null ? `${dayWord} ${p.day}` : "", p.slot ?? ""].filter(Boolean).join(" · ");
      const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
      const html =
        `<div class="rmap-pop">` +
        `<div class="rmap-pop-t">${escapeHtml(p.label || destination)}</div>` +
        (meta ? `<div class="rmap-pop-m">${escapeHtml(meta)}</div>` : "") +
        `<a class="rmap-pop-a" href="${gmaps}" target="_blank" rel="noopener noreferrer">${dirLabel} ↗</a>` +
        `</div>`;
      L.marker([p.lat, p.lng], { icon: pinIcon(i + 1, false), keyboard: false })
        .bindPopup(html, { closeButton: true, className: "rmap-popup" })
        .addTo(layer);
    });

    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: ACCENT, weight: 2, opacity: 0.7, dashArray: "4 6" }).addTo(layer);
    }

    if (latlngs.length === 1) {
      map.setView(latlngs[0], 15, { animate: true });
    } else if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs as L.LatLngTuple[]), { padding: [48, 48], maxZoom: 16 });
    } else if (center) {
      map.setView([center.lat, center.lng], 12);
    }
  }, [visible, center, destination, lang]);

  return (
    <div className="rmap-wrap">
      {days.length > 1 && (
        <div className="rmap-filter">
          <button className={"rmap-chip" + (activeDay == null ? " on" : "")} onClick={() => setActiveDay(null)}>
            {lang === "it" ? "Tutti" : "All"}
          </button>
          {days.map((d) => (
            <button key={d} className={"rmap-chip" + (activeDay === d ? " on" : "")} onClick={() => setActiveDay(d)}>
              {(lang === "it" ? "G" : "D") + d}
            </button>
          ))}
        </div>
      )}
      <div ref={elRef} className="rmap" />
      <div className="rmap-legend">
        <span className="rmap-sw" style={{ background: ACCENT }} /> {t("itd.map.legendStops")}
        <span className="rmap-sw rmap-line" style={{ background: GOLD }} /> {t("itd.map.live")}
      </div>
    </div>
  );
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
