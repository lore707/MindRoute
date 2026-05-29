/**
 * AccountAtlas.tsx
 * ───────────────────────────────────────────────────────────────
 * Capitolo V — "Il tuo atlante". Mappa-mondo VERA (Leaflet, tile CARTO dark)
 * che plotta ogni luogo per cui l'utente ha generato un itinerario. Dati reali
 * da GET /api/me/atlas (coordinate geocodificate lato server).
 *
 * Leaflet è usato con l'API raw (niente react-leaflet nel progetto): init in
 * useEffect su un ref, marker custom via divIcon (così li possiamo far brillare
 * con la CSS), fitBounds su tutti i pin. Stili in styles/account-atlas.css.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
// Leaflet's base CSS is imported once globally from client/src/index.css
// (project convention: all CSS via index.css), so it isn't imported here.

export interface AtlasPlace {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  trips: number;
  days: number;
  lastDate: string | null;
  continent: string | null;
  heroImageUrl: string | null;
  href: string;
}

export interface AtlasData {
  places: AtlasPlace[];
  unlocated: string[];
  stats: { trips: number; days: number; cities: number; continents: number };
}

const CARTO_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function popupHtml(p: AtlasPlace): string {
  const meta = [`${p.trips} ${p.trips === 1 ? "viaggio" : "viaggi"}`, `${p.days} ${p.days === 1 ? "giorno" : "giorni"}`]
    .join(" · ");
  return `
    <div class="ac-atlas-pop">
      <div class="ac-atlas-pop-name">${escapeHtml(p.name)}</div>
      <div class="ac-atlas-pop-meta">${escapeHtml(meta)}${p.lastDate ? ` · ${escapeHtml(p.lastDate)}` : ""}</div>
      <a class="ac-atlas-pop-link" href="${escapeHtml(p.href)}">Apri l'itinerario →</a>
    </div>`;
}

export function AccountAtlas({
  data,
  loading,
  narrative,
  narrativeBold,
}: {
  data: AtlasData | null;
  loading?: boolean;
  narrative?: string;
  narrativeBold?: string[];
}) {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  const places = data?.places ?? [];

  useEffect(() => {
    if (!mapEl.current || places.length === 0) return;

    // (Re)create the map. Leaflet keeps DOM state on the element, so tear down
    // any previous instance before re-init.
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapEl.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      worldCopyJump: true,
      minZoom: 1,
    });
    mapRef.current = map;

    L.tileLayer(CARTO_DARK, { attribution: CARTO_ATTR, subdomains: "abcd", maxZoom: 18 }).addTo(map);

    const latlngs: L.LatLngExpression[] = [];
    for (const p of places) {
      const size = p.trips > 1 ? 18 : 14;
      const icon = L.divIcon({
        className: "ac-atlas-pin-wrap",
        html: `<span class="ac-atlas-pin${p.trips > 1 ? " multi" : ""}" style="width:${size}px;height:${size}px"></span>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
      const marker = L.marker([p.lat, p.lng], { icon, title: p.name }).addTo(map);
      marker.bindPopup(popupHtml(p), { closeButton: false, className: "ac-atlas-popup", offset: [0, -6] });
      marker.on("mouseover", () => marker.openPopup());
      latlngs.push([p.lat, p.lng]);
    }

    if (latlngs.length === 1) {
      map.setView(latlngs[0], 4);
    } else {
      map.fitBounds(L.latLngBounds(latlngs).pad(0.25), { maxZoom: 6 });
    }

    // Container may mount at 0px during transitions; nudge Leaflet to recompute.
    const t = setTimeout(() => map.invalidateSize(), 200);

    return () => {
      clearTimeout(t);
      map.remove();
      mapRef.current = null;
    };
  }, [places]);

  const narrativeNode = useMemo(() => {
    if (!narrative) return null;
    if (!narrativeBold || narrativeBold.length === 0) return narrative;
    let parts: Array<string | JSX.Element> = [narrative];
    narrativeBold.forEach((bold, bi) => {
      const next: typeof parts = [];
      parts.forEach(part => {
        if (typeof part !== "string") { next.push(part); return; }
        const split = part.split(bold);
        split.forEach((s, j) => {
          next.push(s);
          if (j < split.length - 1) next.push(<em key={`${bi}-${j}`}>{bold}</em>);
        });
      });
      parts = next;
    });
    return parts;
  }, [narrative, narrativeBold]);

  const s = data?.stats ?? { trips: 0, days: 0, cities: 0, continents: 0 };

  return (
    <section className="ac-atlas-sec" id="ac-atlas">
      <div className="ac-container">
        <div className="ac-atlas-head">
          <div>
            <div className="ac-eyebrow gold"><span className="d" />Capitolo V · il tuo atlante</div>
            <h2 className="ac-atlas-title"><em>{s.days}</em> giorni<br />passati altrove.</h2>
          </div>
          <p className="ac-atlas-sub">Ogni meta che hai immaginato, su una sola mappa. Una storia raccontata dai luoghi che hai aperto.</p>
        </div>

        <div className="ac-atlas-map-shell">
          {loading && (
            <div className="ac-atlas-state"><span className="ac-atlas-spin" />Disegniamo la tua mappa…</div>
          )}
          {!loading && places.length === 0 && (
            <div className="ac-atlas-state">La tua mappa si popolerà appena genererai il primo itinerario.</div>
          )}
          {places.length > 0 && <div ref={mapEl} className="ac-atlas-map" />}

          {places.length > 0 && (
            <div className="ac-atlas-stats">
              <div className="ac-atlas-stat"><span className="n">{s.trips}</span><span className="l">Viaggi</span></div>
              <div className="ac-atlas-stat"><span className="n">{s.days}</span><span className="l">Giorni</span></div>
              <div className="ac-atlas-stat"><span className="n">{s.cities}</span><span className="l">{s.cities === 1 ? "Meta" : "Mete"}</span></div>
              <div className="ac-atlas-stat"><span className="n"><em>{s.continents}</em></span><span className="l">{s.continents === 1 ? "Continente" : "Continenti"}</span></div>
            </div>
          )}
        </div>

        {data && data.unlocated.length > 0 && (
          <div className="ac-atlas-note">
            {data.unlocated.length} {data.unlocated.length === 1 ? "meta non posizionata" : "mete non posizionate"} sulla mappa: {data.unlocated.join(", ")}.
          </div>
        )}

        {narrativeNode && (
          <div className="ac-atlas-quote"><p>"{narrativeNode}"</p></div>
        )}
      </div>
    </section>
  );
}
