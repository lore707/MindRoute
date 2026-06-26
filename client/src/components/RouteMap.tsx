/**
 * RouteMap.tsx
 * ───────────────────────────────────────────────────────────────
 * Mappa reale (Leaflet + tile CARTO dark) della sezione itinerario. Mostra TUTTO
 * ciò che il viaggio nomina — alloggio, esperienze, food, monumenti/musei, spiagge
 * — con pin categorizzati (icona + colore) invece di una linea-percorso astratta
 * (rimossa: non è un tragitto reale). Sopra ai pin del piano l'utente può:
 *   · filtrare per giorno e per categoria
 *   · cercare QUALSIASI luogo (Nominatim) e salvarlo "per dopo" (DB, per viaggio)
 *   · espandere la mappa a tutto schermo
 *   · centrare sulla propria posizione ("vicino a me")
 *
 * Costo €0 (tile CARTO, geocoding Nominatim, attribution OSM). Caricato in lazy da
 * ItineraryDashboard così `leaflet` (~150KB) entra nel bundle solo all'apertura.
 * ─────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type PlaceCategory = "lodging" | "experience" | "food" | "sight" | "beach" | "custom";

export type RoutePoint = {
  lat: number;
  lng: number;
  label: string;
  day?: number;
  slot?: string;
  category?: string;
};

type SavedPlace = {
  id: number;
  label: string;
  lat: number;
  lng: number;
  category?: PlaceCategory | null;
  address?: string | null;
  note?: string | null;
};

type Props = {
  points: RoutePoint[];
  center?: { lat: number; lng: number };
  destination: string;
  itineraryId?: number;
  t: (k: string) => string;
  lang: "it" | "en";
};

// Categoria → colore + glifo. Coerenti con i token editoriali del dashboard.
const CAT: Record<PlaceCategory, { color: string; glyph: string }> = {
  lodging:    { color: "#D4A853", glyph: "⌂" },
  experience: { color: "#9D7EBC", glyph: "◆" },
  food:       { color: "#C77B5A", glyph: "✦" },
  sight:      { color: "#5E8CB6", glyph: "❖" },
  beach:      { color: "#6FB4A8", glyph: "≈" },
  custom:     { color: "#E94560", glyph: "•" },
};
const ALL_CATS: PlaceCategory[] = ["lodging", "experience", "food", "sight", "beach", "custom"];

function normCat(c?: string | null): PlaceCategory {
  return (c && (ALL_CATS as string[]).includes(c)) ? (c as PlaceCategory) : "custom";
}

const catLabel = (c: PlaceCategory, lang: "it" | "en") => {
  const it: Record<PlaceCategory, string> = {
    lodging: "Alloggio", experience: "Esperienze", food: "Food", sight: "Da vedere", beach: "Spiagge", custom: "Salvati",
  };
  const en: Record<PlaceCategory, string> = {
    lodging: "Stay", experience: "Experiences", food: "Food", sight: "Sights", beach: "Beaches", custom: "Saved",
  };
  return (lang === "it" ? it : en)[c];
};

// Pin categorizzato (divIcon brandizzato, niente marker default di Leaflet).
function catIcon(cat: PlaceCategory) {
  const { color, glyph } = CAT[cat];
  return L.divIcon({
    className: "rmap-pin-wrap",
    html: `<div class="rmap-pin" style="background:${color}"><span>${glyph}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

// Pin "salvato dall'utente": stella oro, forma a cerchio per distinguerlo dai
// pin del piano.
function savedIcon() {
  return L.divIcon({
    className: "rmap-pin-wrap",
    html: `<div class="rmap-pin rmap-pin--saved"><span>★</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function meIcon() {
  return L.divIcon({ className: "rmap-me-wrap", html: `<div class="rmap-me"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export default function RouteMap({ points, center, destination, itineraryId, lang }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const planLayer = useRef<L.LayerGroup | null>(null);
  const savedLayer = useRef<L.LayerGroup | null>(null);
  const searchLayer = useRef<L.LayerGroup | null>(null);
  const meLayer = useRef<L.LayerGroup | null>(null);

  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeCats, setActiveCats] = useState<Set<PlaceCategory>>(new Set());
  const [fullscreen, setFullscreen] = useState(false);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ label: string; address: string; lat: number; lng: number }>>([]);
  const [searching, setSearching] = useState(false);

  // refs per accedere allo stato aggiornato dentro gli handler dei popup Leaflet.
  const savedRef = useRef(saved);
  savedRef.current = saved;

  const dayWord = lang === "it" ? "Giorno" : "Day";

  // Giorni e categorie presenti (per i filtri).
  const days = useMemo(() => {
    const s = new Set<number>();
    points.forEach((p) => { if (typeof p.day === "number") s.add(p.day); });
    return Array.from(s).sort((a, b) => a - b);
  }, [points]);

  const presentCats = useMemo(() => {
    const s = new Set<PlaceCategory>();
    points.forEach((p) => s.add(normCat(p.category)));
    return ALL_CATS.filter((c) => s.has(c));
  }, [points]);

  const visible = useMemo(() => points.filter((p) => {
    if (activeDay != null && p.day !== activeDay) return false;
    if (activeCats.size > 0 && !activeCats.has(normCat(p.category))) return false;
    return true;
  }), [points, activeDay, activeCats]);

  // ── load saved places ──
  useEffect(() => {
    if (!itineraryId) return;
    let cancelled = false;
    fetch(`/api/itinerary/${itineraryId}/saved-places`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled && Array.isArray(d)) setSaved(d); })
      .catch(() => { /* mappa funziona comunque senza salvati */ });
    return () => { cancelled = true; };
  }, [itineraryId]);

  async function savePlace(p: { label: string; lat: number; lng: number; category: PlaceCategory; address?: string }) {
    if (!itineraryId) return;
    try {
      const r = await fetch(`/api/itinerary/${itineraryId}/saved-places`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!r.ok) return;
      const row: SavedPlace = await r.json();
      setSaved((prev) => (prev.find((s) => s.id === row.id) ? prev : [row, ...prev]));
      mapRef.current?.closePopup();
      searchLayer.current?.clearLayers();
      setResults([]);
    } catch { /* ignore */ }
  }

  async function removeSaved(id: number) {
    if (!itineraryId) return;
    try {
      const r = await fetch(`/api/itinerary/${itineraryId}/saved-places/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) return;
      setSaved((prev) => prev.filter((s) => s.id !== id));
      mapRef.current?.closePopup();
    } catch { /* ignore */ }
  }

  // ── init mappa ──
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const first = points[0] ?? (center ? { lat: center.lat, lng: center.lng } : null);
    const map = L.map(elRef.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false,
    }).setView(first ? [first.lat, first.lng] : [41.9, 12.5], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd",
      maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    planLayer.current = L.layerGroup().addTo(map);
    savedLayer.current = L.layerGroup().addTo(map);
    searchLayer.current = L.layerGroup().addTo(map);
    meLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 80);

    // Wiring dei bottoni dentro i popup (delegato via evento popupopen): salva,
    // salva-con-categoria, rimuovi.
    map.on("popupopen", (e: any) => {
      const root: HTMLElement = e.popup.getElement();
      if (!root) return;
      root.querySelectorAll<HTMLElement>(".rmap-cat").forEach((btn) => {
        btn.onclick = () => {
          const row = btn.closest<HTMLElement>(".rmap-save-row");
          if (!row) return;
          savePlace({
            label: row.dataset.label || "",
            lat: parseFloat(row.dataset.lat || "0"),
            lng: parseFloat(row.dataset.lng || "0"),
            category: (btn.dataset.cat as PlaceCategory) || "custom",
            address: row.dataset.address || undefined,
          });
        };
      });
      const del = root.querySelector<HTMLElement>(".rmap-del");
      if (del) del.onclick = () => removeSaved(parseInt(del.dataset.id || "0", 10));
    });

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
        .catch(() => { /* default view */ });
      return () => { cancelled = true; map.remove(); mapRef.current = null; };
    }

    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── redraw pin del piano al cambio filtri ──
  useEffect(() => {
    const map = mapRef.current, layer = planLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const dirLabel = lang === "it" ? "Apri in Google Maps" : "Open in Google Maps";
    const saveLabel = lang === "it" ? "Salva" : "Save";
    const latlngs: L.LatLngTuple[] = [];

    visible.forEach((p) => {
      latlngs.push([p.lat, p.lng]);
      const cat = normCat(p.category);
      const meta = [p.day != null ? `${dayWord} ${p.day}` : "", p.slot ?? ""].filter(Boolean).join(" · ");
      const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
      const saveRow = itineraryId
        ? `<div class="rmap-save-row" data-lat="${p.lat}" data-lng="${p.lng}" data-label="${escapeHtml(p.label)}">` +
          `<button class="rmap-cat rmap-cat--wide" data-cat="${cat}" title="${saveLabel}">☆ ${saveLabel}</button></div>`
        : "";
      const html =
        `<div class="rmap-pop">` +
        `<div class="rmap-pop-t">${escapeHtml(p.label || destination)}</div>` +
        (meta ? `<div class="rmap-pop-m">${escapeHtml(meta)}</div>` : "") +
        `<a class="rmap-pop-a" href="${gmaps}" target="_blank" rel="noopener noreferrer">${dirLabel} ↗</a>` +
        saveRow +
        `</div>`;
      L.marker([p.lat, p.lng], { icon: catIcon(cat), keyboard: false })
        .bindPopup(html, { closeButton: true, className: "rmap-popup" })
        .addTo(layer);
    });

    // Linea del percorso: collega le tappe nell'ordine dell'itinerario (giorno →
    // fascia). I tracciati vettoriali stanno nell'overlayPane → restano sotto i
    // pin (markerPane). Alone scuro + linea accent così la costruzione del
    // viaggio si legge a colpo d'occhio.
    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: "#000", weight: 7, opacity: 0.28, lineCap: "round", lineJoin: "round" }).addTo(layer);
      L.polyline(latlngs, { color: "#E94560", weight: 3, opacity: 0.92, dashArray: "1 9", lineCap: "round", lineJoin: "round" }).addTo(layer);
    }

    // Auto-fit solo quando cambiano i punti visibili (non sui salvati).
    if (latlngs.length === 1) map.setView(latlngs[0], 15, { animate: true });
    else if (latlngs.length > 1) map.fitBounds(L.latLngBounds(latlngs), { padding: [48, 48], maxZoom: 16 });
    else if (center) map.setView([center.lat, center.lng], 12);
  }, [visible, center, destination, lang, itineraryId, dayWord]);

  // ── redraw pin salvati ──
  useEffect(() => {
    const layer = savedLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const removeLabel = lang === "it" ? "Rimuovi" : "Remove";
    const gmapsLabel = lang === "it" ? "Apri in Google Maps" : "Open in Google Maps";
    saved.forEach((s) => {
      const gmaps = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
      const html =
        `<div class="rmap-pop">` +
        `<div class="rmap-pop-t">★ ${escapeHtml(s.label)}</div>` +
        (s.address ? `<div class="rmap-pop-m">${escapeHtml(s.address)}</div>` : "") +
        `<a class="rmap-pop-a" href="${gmaps}" target="_blank" rel="noopener noreferrer">${gmapsLabel} ↗</a>` +
        `<button class="rmap-del" data-id="${s.id}">✕ ${removeLabel}</button>` +
        `</div>`;
      L.marker([s.lat, s.lng], { icon: savedIcon(), keyboard: false })
        .bindPopup(html, { closeButton: true, className: "rmap-popup" })
        .addTo(layer);
    });
  }, [saved, lang]);

  // ── search (Nominatim), biased verso la destinazione ──
  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const bias = center ? `&lat=${center.lat}&lon=${center.lng}` : "";
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(q)}${bias}`,
        { headers: { Accept: "application/json" } },
      );
      const d = await r.json();
      const list = (Array.isArray(d) ? d : []).map((it: any) => ({
        label: (it.name || it.display_name || "").split(",")[0],
        address: it.display_name || "",
        lat: parseFloat(it.lat),
        lng: parseFloat(it.lon),
      })).filter((x: any) => !isNaN(x.lat) && !isNaN(x.lng));
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function pickResult(res: { label: string; address: string; lat: number; lng: number }) {
    const map = mapRef.current, layer = searchLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const saveLabel = lang === "it" ? "Salva come" : "Save as";
    const chips = ALL_CATS.map((c) =>
      `<button class="rmap-cat" data-cat="${c}" title="${escapeHtml(catLabel(c, lang))}">${CAT[c].glyph}</button>`).join("");
    const saveRow = itineraryId
      ? `<div class="rmap-save-row" data-lat="${res.lat}" data-lng="${res.lng}" data-label="${escapeHtml(res.label)}" data-address="${escapeHtml(res.address)}">` +
        `<span class="rmap-save-lbl">${saveLabel}</span>${chips}</div>`
      : "";
    const html =
      `<div class="rmap-pop">` +
      `<div class="rmap-pop-t">${escapeHtml(res.label)}</div>` +
      (res.address ? `<div class="rmap-pop-m">${escapeHtml(res.address)}</div>` : "") +
      saveRow +
      `</div>`;
    const m = L.marker([res.lat, res.lng], { icon: catIcon("custom"), keyboard: false })
      .bindPopup(html, { closeButton: true, className: "rmap-popup" })
      .addTo(layer);
    map.flyTo([res.lat, res.lng], 16, { duration: 0.6 });
    m.openPopup();
    setResults([]);
  }

  function locateMe() {
    const map = mapRef.current, layer = meLayer.current;
    if (!map || !layer || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        layer.clearLayers();
        L.marker([latitude, longitude], { icon: meIcon(), keyboard: false }).addTo(layer);
        map.flyTo([latitude, longitude], 15, { duration: 0.6 });
      },
      () => { /* permesso negato: nessun marker */ },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  // ── fullscreen: re-misura la mappa al toggle + chiusura con Esc ──
  useEffect(() => {
    const map = mapRef.current;
    if (map) setTimeout(() => map.invalidateSize(), 60);
    if (!fullscreen) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  function toggleCat(c: PlaceCategory) {
    setActiveCats((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }

  return (
    <div ref={wrapRef} className={"rmap-wrap" + (fullscreen ? " rmap-wrap--full" : "")}>
      {/* toolbar: ricerca + posizione + fullscreen */}
      <div className="rmap-toolbar">
        <form className="rmap-search" onSubmit={runSearch}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "it" ? "Cerca un posto…" : "Search a place…"}
            aria-label={lang === "it" ? "Cerca un posto" : "Search a place"}
          />
          <button type="submit" className="rmap-icbtn" title={lang === "it" ? "Cerca" : "Search"}>
            {searching ? "…" : "⌕"}
          </button>
        </form>
        <button className="rmap-icbtn" onClick={locateMe} title={lang === "it" ? "Vicino a me" : "Near me"}>◎</button>
        <button className="rmap-icbtn" onClick={() => setFullscreen((v) => !v)} title={lang === "it" ? "Schermo intero" : "Fullscreen"}>
          {fullscreen ? "✕" : "⤢"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="rmap-results">
          {results.map((r, i) => (
            <li key={i}>
              <button onClick={() => pickResult(r)}>
                <span className="rr-t">{r.label}</span>
                <span className="rr-a">{r.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* filtri giorno + categoria */}
      {(days.length > 1 || presentCats.length > 1) && (
        <div className="rmap-filter">
          {days.length > 1 && (
            <>
              <button className={"rmap-chip" + (activeDay == null ? " on" : "")} onClick={() => setActiveDay(null)}>
                {lang === "it" ? "Tutti" : "All"}
              </button>
              {days.map((d) => (
                <button key={d} className={"rmap-chip" + (activeDay === d ? " on" : "")} onClick={() => setActiveDay(d)}>
                  {(lang === "it" ? "G" : "D") + d}
                </button>
              ))}
            </>
          )}
          {presentCats.length > 1 && presentCats.map((c) => (
            <button
              key={c}
              className={"rmap-chip rmap-chip--cat" + (activeCats.has(c) ? " on" : "")}
              style={activeCats.has(c) ? { background: CAT[c].color, borderColor: CAT[c].color } : { borderColor: CAT[c].color }}
              onClick={() => toggleCat(c)}
              title={catLabel(c, lang)}
            >
              {CAT[c].glyph} {catLabel(c, lang)}
            </button>
          ))}
        </div>
      )}

      <div ref={elRef} className="rmap" />
    </div>
  );
}
