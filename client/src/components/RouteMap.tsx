/**
 * RouteMap.tsx — mappa-viaggio (non "GIS")
 * ───────────────────────────────────────────────────────────────
 * La mappa RACCONTA il viaggio, non mostra solo punti:
 *   · default su UN giorno alla volta → 🏨 alloggio come partenza, tappe
 *     NUMERATE 1→2→3 in sequenza, linea direzionale del percorso;
 *   · click su una tappa → CARD operativa (foto, durata, ora migliore,
 *     distanza dall'alloggio, [Apri nel giorno] [Google Maps] [Prenota]);
 *   · filtri-motore: per giorno, "vicino all'alloggio" (~15 min a piedi),
 *     "se piove" (al chiuso); + ricerca/salva, vicino-a-me, full-screen.
 *   · collegamento alle altre sezioni: "Apri nel giorno" porta al Giorno
 *     corrispondente (onOpenDay) → stesso viaggio, prospettive diverse.
 *
 * Costo €0 (tile CARTO, geocoding Nominatim, OSM). Lazy da ItineraryDashboard.
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
  // Campi ricchi (join col momento) per la card operativa.
  momentId?: string;
  imageUrl?: string;
  durationLabel?: string;
  bestTime?: string;
  kindLabel?: string;
  desc?: string;
  bookable?: boolean;
  ctaUrl?: string;
  cta?: string;
  ctaProvider?: string;
  ctaPrice?: string;
  type?: string;
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
  /** Giorno iniziale (collegamento dalla sezione Giorni). null = tutti. */
  initialDay?: number | null;
  /** Sync del giorno attivo verso il dashboard. */
  onDayChange?: (day: number | null) => void;
  /** "Apri nel giorno": porta alla sezione Giorni su quel giorno/momento. */
  onOpenDay?: (day: number, momentId?: string) => void;
  /** "Prenota" dalla card → aggiorna il progresso nella sezione Prenota. */
  onBook?: (type?: string, day?: number) => void;
  /** Journey (redesign 2026-07): selezione CONTROLLATA dall'esterno. Quando
   *  presente, la mappa evidenzia il punto col momentId corrispondente
   *  (sync Story→Map) e notifica i click sui marker (sync Map→Story). */
  selectedMomentId?: string | null;
  onSelectMoment?: (momentId: string | null) => void;
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
const ROUTE_COLOR = "#E94560";

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

// Ordine delle fasce per numerare le tappe in sequenza nel giorno.
const SLOT_ORDER: Record<string, number> = { morning: 0, mattina: 0, lunch: 1, pranzo: 1, afternoon: 2, pomeriggio: 2, evening: 3, sera: 3, night: 4, notte: 4 };
const slotRank = (s?: string) => (s != null && SLOT_ORDER[s.toLowerCase()] != null ? SLOT_ORDER[s.toLowerCase()] : 9);

// distanza in metri (haversine).
function distMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
function walkLabel(m: number, lang: "it" | "en"): string {
  const min = Math.max(1, Math.round(m / 80)); // ~80 m/min a piedi
  if (min <= 60) return lang === "it" ? `${min} min a piedi` : `${min} min walk`;
  return `${(m / 1000).toFixed(1)} km`;
}

// Pin categorizzato (overview / vista "Tutti").
function catIcon(cat: PlaceCategory, bookable?: boolean) {
  const { color, glyph } = CAT[cat];
  return L.divIcon({
    className: "rmap-pin-wrap",
    html: `<div class="rmap-pin${bookable ? " rmap-pin--book" : ""}" style="background:${color}"><span>${glyph}</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
  });
}
// Tappa numerata del percorso del giorno.
function numIcon(n: number, bookable?: boolean) {
  return L.divIcon({
    className: "rmap-pin-wrap",
    html: `<div class="rmap-pin rmap-pin--num${bookable ? " rmap-pin--book" : ""}" style="background:${ROUTE_COLOR}"><span>${n}</span></div>`,
    iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -18],
  });
}
// Ancora: l'alloggio = da dove parte ogni giornata.
function hotelIcon() {
  return L.divIcon({
    className: "rmap-pin-wrap",
    html: `<div class="rmap-pin rmap-pin--hotel" style="background:${CAT.lodging.color}"><span>⌂</span></div>`,
    iconSize: [38, 38], iconAnchor: [19, 19], popupAnchor: [0, -20],
  });
}
function savedIcon() {
  return L.divIcon({
    className: "rmap-pin-wrap",
    html: `<div class="rmap-pin rmap-pin--saved"><span>★</span></div>`,
    iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -16],
  });
}
function meIcon() {
  return L.divIcon({ className: "rmap-me-wrap", html: `<div class="rmap-me"></div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
}
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Geometria del percorso ──────────────────────────────────────────────
// Il server risolve strade VERE (Valhalla/OSRM, cache in tripMeta). Se non
// risponde, si disegna una curva morbida tra le tappe: mai la retta secca.
type DayRoute = {
  profile: "foot" | "car" | null;
  coords: Array<[number, number]> | null;
  legs: Array<{ t: number; m: number; mid: [number, number] }> | null;
};

// Arco quadratico tra due punti (fallback): ~14 punti con offset
// perpendicolare proporzionale alla distanza — leggibile, dichiaratamente
// "a volo d'uccello" ma senza tagliare la mappa con una riga dritta.
function curvedArc(a: L.LatLngTuple, b: L.LatLngTuple): L.LatLngTuple[] {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const bend = 0.18;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const out: L.LatLngTuple[] = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14, u = 1 - t;
    out.push([u * u * a[0] + 2 * u * t * cx + t * t * b[0], u * u * a[1] + 2 * u * t * cy + t * t * b[1]]);
  }
  return out;
}

// Etichetta-tratta sulla linea: "12 min" (a piedi/auto). È la risposta alla
// domanda vera della mappa: quanto ci metto dalla tappa prima?
function legLabelIcon(minutes: number, profile: "foot" | "car"): L.DivIcon {
  const glyph = profile === "car" ? "🚗" : "🚶";
  return L.divIcon({
    className: "rmap-leg-wrap",
    html: `<span class="rmap-leg">${glyph} ${minutes} min</span>`,
    iconSize: [0, 0], iconAnchor: [0, 0],
  });
}

export default function RouteMap({ points, center, destination, itineraryId, lang, initialDay = null, onDayChange, onOpenDay, onBook, selectedMomentId, onSelectMoment }: Props) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const planLayer = useRef<L.LayerGroup | null>(null);
  const savedLayer = useRef<L.LayerGroup | null>(null);
  const searchLayer = useRef<L.LayerGroup | null>(null);
  const meLayer = useRef<L.LayerGroup | null>(null);

  const days = useMemo(() => {
    const s = new Set<number>();
    points.forEach((p) => { if (typeof p.day === "number") s.add(p.day); });
    return Array.from(s).sort((a, b) => a - b);
  }, [points]);

  // Default: il primo giorno (racconta un percorso), non "Tutti" (vista GIS).
  const [activeDay, setActiveDay] = useState<number | null>(initialDay ?? days[0] ?? null);
  const [activeCats, setActiveCats] = useState<Set<PlaceCategory>>(new Set());
  const [nearLodging, setNearLodging] = useState(false);
  const [rainPlan, setRainPlan] = useState(false);
  const [selected, setSelected] = useState<RoutePoint | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ label: string; address: string; lat: number; lng: number }>>([]);
  const [searching, setSearching] = useState(false);

  const savedRef = useRef(saved);
  savedRef.current = saved;
  const dayWord = lang === "it" ? "Giorno" : "Day";
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Percorso su strada del giorno attivo (server, cache tripMeta) + cache di sessione.
  const [dayRoute, setDayRoute] = useState<DayRoute | null>(null);
  const routeCache = useRef<Map<string, DayRoute>>(new Map());

  const setDay = (d: number | null) => { setActiveDay(d); setSelected(null); onDayChange?.(d); };

  // Sync CONTROLLATO (Journey): selectedMomentId dall'esterno → evidenzia il
  // punto e vola su di esso. undefined = modalità non controllata (nessun sync).
  useEffect(() => {
    if (selectedMomentId === undefined) return;
    const p = selectedMomentId ? points.find(x => x.momentId === selectedMomentId) ?? null : null;
    setSelected(p);
    if (p && mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lng], Math.max(mapRef.current.getZoom(), 15), { duration: 0.4 });
    }
  }, [selectedMomentId, points]);

  // Alloggio (ancora): il pin lodging del giorno attivo, altrimenti globale.
  const lodgingPt = useMemo(() => {
    return points.find((p) => normCat(p.category) === "lodging" && (activeDay == null || p.day === activeDay))
      ?? points.find((p) => normCat(p.category) === "lodging");
  }, [points, activeDay]);

  const presentCats = useMemo(() => {
    const s = new Set<PlaceCategory>();
    points.forEach((p) => s.add(normCat(p.category)));
    return ALL_CATS.filter((c) => s.has(c));
  }, [points]);

  const visible = useMemo(() => points.filter((p) => {
    if (activeDay != null && p.day !== activeDay) return false;
    if (activeCats.size > 0 && !activeCats.has(normCat(p.category))) return false;
    if (nearLodging && lodgingPt && distMeters(lodgingPt, p) > 1200) return false; // ~15 min a piedi
    if (rainPlan) { const c = normCat(p.category); if (c === "beach" || c === "experience") return false; } // euristica "al chiuso"
    return true;
  }), [points, activeDay, activeCats, nearLodging, rainPlan, lodgingPt]);

  const filtersActive = activeCats.size > 0 || nearLodging || rainPlan;

  // Punti ORDINATI del giorno intero (NON filtrati): il percorso rappresenta
  // il piano del giorno; i filtri servono solo a esplorare i pin.
  const dayStops = useMemo(() => {
    if (activeDay == null) return [] as RoutePoint[];
    const inDay = points.filter(p => p.day === activeDay);
    const lodging = inDay.find(p => normCat(p.category) === "lodging")
      ?? points.find(p => normCat(p.category) === "lodging");
    const stops = inDay.filter(p => normCat(p.category) !== "lodging")
      .sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
    return (lodging ? [lodging, ...stops] : stops).slice(0, 14);
  }, [points, activeDay]);

  // Geometria su strada dal server (cache tripMeta) + cache di sessione.
  useEffect(() => {
    setDayRoute(null);
    if (activeDay == null || dayStops.length < 2 || !itineraryId) return;
    const pts = dayStops.map(p => ({ lat: p.lat, lng: p.lng }));
    const key = `${activeDay}:` + pts.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join(";");
    const hit = routeCache.current.get(key);
    if (hit) { setDayRoute(hit); return; }
    let cancelled = false;
    fetch(`/api/itinerary/${itineraryId}/route`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: activeDay, points: pts }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return;
        const route: DayRoute = d && d.coords
          ? { profile: d.profile, coords: d.coords, legs: d.legs }
          : { profile: null, coords: null, legs: null };
        routeCache.current.set(key, route);
        setDayRoute(route);
      })
      .catch(() => { if (!cancelled) setDayRoute({ profile: null, coords: null, legs: null }); });
    return () => { cancelled = true; };
  }, [activeDay, dayStops, itineraryId]);

  // ── load saved places ──
  useEffect(() => {
    if (!itineraryId) return;
    let cancelled = false;
    fetch(`/api/itinerary/${itineraryId}/saved-places`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (!cancelled && Array.isArray(d)) setSaved(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [itineraryId]);

  async function savePlace(p: { label: string; lat: number; lng: number; category: PlaceCategory; address?: string }) {
    if (!itineraryId) return;
    try {
      const r = await fetch(`/api/itinerary/${itineraryId}/saved-places`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (!r.ok) return;
      const row: SavedPlace = await r.json();
      setSaved((prev) => (prev.find((s) => s.id === row.id) ? prev : [row, ...prev]));
      mapRef.current?.closePopup();
      searchLayer.current?.clearLayers();
      setResults([]);
    } catch {}
  }

  async function removeSaved(id: number) {
    if (!itineraryId) return;
    try {
      const r = await fetch(`/api/itinerary/${itineraryId}/saved-places/${id}`, { method: "DELETE", credentials: "include" });
      if (!r.ok) return;
      setSaved((prev) => prev.filter((s) => s.id !== id));
      mapRef.current?.closePopup();
    } catch {}
  }

  // ── init mappa ──
  useEffect(() => {
    if (!elRef.current || mapRef.current) return;
    const first = points[0] ?? (center ? { lat: center.lat, lng: center.lng } : null);
    const map = L.map(elRef.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      .setView(first ? [first.lat, first.lng] : [41.9, 12.5], 13);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      subdomains: "abcd", maxZoom: 20,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    planLayer.current = L.layerGroup().addTo(map);
    savedLayer.current = L.layerGroup().addTo(map);
    searchLayer.current = L.layerGroup().addTo(map);
    meLayer.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 80);

    map.on("popupopen", (e: any) => {
      const root: HTMLElement = e.popup.getElement();
      if (!root) return;
      root.querySelectorAll<HTMLElement>(".rmap-cat").forEach((btn) => {
        btn.onclick = () => {
          const row = btn.closest<HTMLElement>(".rmap-save-row");
          if (!row) return;
          savePlace({
            label: row.dataset.label || "", lat: parseFloat(row.dataset.lat || "0"), lng: parseFloat(row.dataset.lng || "0"),
            category: (btn.dataset.cat as PlaceCategory) || "custom", address: row.dataset.address || undefined,
          });
        };
      });
      const del = root.querySelector<HTMLElement>(".rmap-del");
      if (del) del.onclick = () => removeSaved(parseInt(del.dataset.id || "0", 10));
    });

    if (!first && destination) {
      let cancelled = false;
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(destination)}`, { headers: { Accept: "application/json" } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !Array.isArray(d) || !d[0]) return;
          const lat = parseFloat(d[0].lat), lng = parseFloat(d[0].lon);
          if (!isNaN(lat) && !isNaN(lng)) map.setView([lat, lng], 12, { animate: true });
        })
        .catch(() => {});
      return () => { cancelled = true; map.remove(); mapRef.current = null; };
    }
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── redraw pin del piano: percorso numerato del giorno + ancora alloggio ──
  useEffect(() => {
    const map = mapRef.current, layer = planLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const singleDay = activeDay != null;
    const lodging = visible.find((p) => normCat(p.category) === "lodging");
    const stops = visible.filter((p) => normCat(p.category) !== "lodging");
    const ordered = singleDay ? [...stops].sort((a, b) => slotRank(a.slot) - slotRank(b.slot)) : stops;

    const latlngs: L.LatLngTuple[] = [];
    if (lodging) latlngs.push([lodging.lat, lodging.lng]);
    ordered.forEach((p) => latlngs.push([p.lat, p.lng]));

    // Linea del percorso: SOLO nella vista giorno e senza filtri attivi (coi
    // filtri i pin sono un sottoinsieme e la linea mentirebbe). Nella vista
    // "Tutti" niente linee: la ragnatela tra giorni diversi non racconta nulla.
    if (singleDay && !filtersActive && dayStops.length > 1) {
      const anchors: L.LatLngTuple[] = dayStops.map(p => [p.lat, p.lng]);
      const draw = (path: L.LatLngTuple[], real: boolean) => {
        L.polyline(path, { color: "#000", weight: real ? 9 : 8, opacity: 0.35, lineCap: "round", lineJoin: "round" }).addTo(layer);
        L.polyline(path, { color: ROUTE_COLOR, weight: real ? 4 : 3, opacity: real ? 0.95 : 0.8, lineCap: "round", lineJoin: "round" }).addTo(layer);
      };
      if (dayRoute?.coords && dayRoute.coords.length > 1) {
        // Strade vere (Valhalla/OSRM via server, cacheate in tripMeta).
        draw(dayRoute.coords as L.LatLngTuple[], true);
        const profile = dayRoute.profile === "car" ? "car" : "foot";
        (dayRoute.legs ?? []).forEach((leg) => {
          const min = Math.max(1, Math.round(leg.t / 60));
          // zIndex negativo: l'etichetta sta sopra la linea ma SOTTO i pin
          // (tappe vicine → il pin numerato resta leggibile).
          L.marker(leg.mid as L.LatLngTuple, { icon: legLabelIcon(min, profile), keyboard: false, interactive: false, zIndexOffset: -400 }).addTo(layer);
        });
      } else {
        // Fallback (o geometria in arrivo): archi morbidi + stima a piedi.
        for (let i = 1; i < anchors.length; i++) {
          const arc = curvedArc(anchors[i - 1], anchors[i]);
          draw(arc, false);
          if (dayRoute && !dayRoute.coords) {
            const m = distMeters(
              { lat: anchors[i - 1][0], lng: anchors[i - 1][1] },
              { lat: anchors[i][0], lng: anchors[i][1] },
            );
            const min = Math.max(1, Math.round(m / 80));
            if (min <= 90) {
              L.marker(arc[7], { icon: legLabelIcon(min, "foot"), keyboard: false, interactive: false, zIndexOffset: -400 }).addTo(layer);
            }
          }
        }
      }
    }

    const openCard = (p: RoutePoint) => {
      setSelected(p);
      onSelectMoment?.(p.momentId ?? null); // sync Map→Story (Journey)
      map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
    };

    // Ancora alloggio.
    if (lodging) {
      L.marker([lodging.lat, lodging.lng], { icon: hotelIcon(), keyboard: false, zIndexOffset: 1200 })
        .on("click", () => openCard(lodging)).addTo(layer);
    }
    // Tappe: numerate (giorno singolo) o categorizzate (vista "Tutti").
    ordered.forEach((p, i) => {
      const icon = singleDay ? numIcon(i + 1, p.bookable) : catIcon(normCat(p.category), p.bookable);
      L.marker([p.lat, p.lng], { icon, keyboard: false }).on("click", () => openCard(p)).addTo(layer);
    });

    if (latlngs.length === 1) map.setView(latlngs[0], 15, { animate: true });
    else if (latlngs.length > 1) map.fitBounds(L.latLngBounds(latlngs), { padding: [60, 60], maxZoom: 16 });
    else if (center) map.setView([center.lat, center.lng], 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activeDay, center, dayRoute, filtersActive, dayStops]);

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
      L.marker([s.lat, s.lng], { icon: savedIcon(), keyboard: false }).bindPopup(html, { closeButton: true, className: "rmap-popup" }).addTo(layer);
    });
  }, [saved, lang]);

  // ── search (Nominatim) ──
  async function runSearch(e?: FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    try {
      const bias = center ? `&lat=${center.lat}&lon=${center.lng}` : "";
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&addressdetails=1&q=${encodeURIComponent(q)}${bias}`, { headers: { Accept: "application/json" } });
      const d = await r.json();
      const list = (Array.isArray(d) ? d : []).map((it: any) => ({
        label: (it.name || it.display_name || "").split(",")[0],
        address: it.display_name || "", lat: parseFloat(it.lat), lng: parseFloat(it.lon),
      })).filter((x: any) => !isNaN(x.lat) && !isNaN(x.lng));
      setResults(list);
    } catch { setResults([]); } finally { setSearching(false); }
  }

  function pickResult(res: { label: string; address: string; lat: number; lng: number }) {
    const map = mapRef.current, layer = searchLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const saveLabel = lang === "it" ? "Salva come" : "Save as";
    const chips = ALL_CATS.map((c) => `<button class="rmap-cat" data-cat="${c}" title="${escapeHtml(catLabel(c, lang))}">${CAT[c].glyph}</button>`).join("");
    const saveRow = itineraryId
      ? `<div class="rmap-save-row" data-lat="${res.lat}" data-lng="${res.lng}" data-label="${escapeHtml(res.label)}" data-address="${escapeHtml(res.address)}">` +
        `<span class="rmap-save-lbl">${saveLabel}</span>${chips}</div>`
      : "";
    const html =
      `<div class="rmap-pop">` +
      `<div class="rmap-pop-t">${escapeHtml(res.label)}</div>` +
      (res.address ? `<div class="rmap-pop-m">${escapeHtml(res.address)}</div>` : "") + saveRow + `</div>`;
    const m = L.marker([res.lat, res.lng], { icon: catIcon("custom"), keyboard: false }).bindPopup(html, { closeButton: true, className: "rmap-popup" }).addTo(layer);
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
      () => {}, { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  useEffect(() => {
    const map = mapRef.current;
    if (map) setTimeout(() => map.invalidateSize(), 60);
    if (!fullscreen) return;
    const onKey = (ev: KeyboardEvent) => { if (ev.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  function toggleCat(c: PlaceCategory) {
    setActiveCats((prev) => { const next = new Set(prev); next.has(c) ? next.delete(c) : next.add(c); return next; });
  }

  // ── card operativa per la tappa selezionata ──
  const selDist = selected && lodgingPt && selected !== lodgingPt ? walkLabel(distMeters(lodgingPt, selected), lang) : null;
  const card = selected && (
    <div className="rmap-card" data-testid="rmap-card">
      <button className="rmap-card-x" onClick={() => setSelected(null)} aria-label={lang === "it" ? "Chiudi" : "Close"}>✕</button>
      {selected.imageUrl && <div className="rmap-card-img" style={{ backgroundImage: `url("${selected.imageUrl}")` }} />}
      <div className="rmap-card-body">
        <div className="rmap-card-meta">
          {typeof selected.day === "number" && <span className="rmap-card-day">{dayWord} {selected.day}</span>}
          {selected.kindLabel && <span className="rmap-card-kind">{selected.kindLabel}</span>}
        </div>
        <div className="rmap-card-t">{selected.label}</div>
        <div className="rmap-card-facts">
          {selected.bestTime && <span>🕒 {selected.bestTime}</span>}
          {selected.durationLabel && <span>⏱ {selected.durationLabel}</span>}
          {selDist && <span>🏨 {selDist}</span>}
        </div>
        {selected.desc && <div className="rmap-card-desc">{selected.desc}</div>}
        <div className="rmap-card-acts">
          {typeof selected.day === "number" && onOpenDay && (
            <button className="rmap-card-btn rmap-card-btn--p" onClick={() => onOpenDay(selected.day!, selected.momentId)}>
              {lang === "it" ? "Apri nel giorno" : "Open in the day"} →
            </button>
          )}
          {selected.bookable && selected.ctaUrl && (
            <a className="rmap-card-btn rmap-card-btn--book" href={selected.ctaUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => onBook?.(selected.type, selected.day)}>
              {selected.cta || (lang === "it" ? "Prenota" : "Book")}{selected.ctaPrice ? ` · ${selected.ctaPrice}` : ""}
            </a>
          )}
          <a className="rmap-card-btn" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noopener noreferrer">
            {lang === "it" ? "Google Maps" : "Google Maps"} ↗
          </a>
          {itineraryId && (
            <button className="rmap-card-btn" onClick={() => savePlace({ label: selected.label, lat: selected.lat, lng: selected.lng, category: normCat(selected.category) })}>
              ☆ {lang === "it" ? "Salva" : "Save"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const flyToStop = (p: RoutePoint) => {
    const map = mapRef.current;
    if (!map) return;
    setSelected(p);
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 15), { duration: 0.5 });
  };

  // Pin toccato sulla mappa → la striscia scorre fino alla tappa attiva
  // (su phone se ne vedono 1-2: senza questo il sync mappa→striscia è invisibile).
  useEffect(() => {
    if (!selected) return;
    const el = stripRef.current?.querySelector<HTMLElement>(".rmap-stop.on");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  const hasLodgingFirst = dayStops.length > 0 && normCat(dayStops[0].category) === "lodging";

  return (
    <div ref={wrapRef} className={"rmap-wrap" + (fullscreen ? " rmap-wrap--full" : "")}>
      {/* Barra giorni — IN FLUSSO sopra la mappa (mai flottante: su phone i
          chip si sovrapponevano a toolbar e risultati di ricerca). */}
      {days.length > 1 && (
        <div className="rmap-days">
          <button className={"rmap-day" + (activeDay == null ? " on" : "")} onClick={() => setDay(null)}>
            {lang === "it" ? "Tutti" : "All"}
          </button>
          {days.map((d) => (
            <button key={d} className={"rmap-day" + (activeDay === d ? " on" : "")} onClick={() => setDay(d)}>
              <span className="w">{dayWord}</span><span className="n">{d}</span>
            </button>
          ))}
        </div>
      )}

      {/* Filtri motore + categorie: riga richiudibile, sempre in flusso. */}
      <div className="rmap-filterrow">
        <button className={"rmap-chip rmap-chip--toggle" + (filtersOpen ? " on" : "")} onClick={() => setFiltersOpen(v => !v)}>
          {lang === "it" ? "Filtri" : "Filters"}{filtersActive ? " •" : ""} {filtersOpen ? "▴" : "▾"}
        </button>
        {(filtersOpen || filtersActive) && (
          <>
            {lodgingPt && (
              <button className={"rmap-chip rmap-chip--engine" + (nearLodging ? " on" : "")} onClick={() => setNearLodging((v) => !v)} title={lang === "it" ? "Entro ~15 min a piedi dall'alloggio" : "Within ~15 min walk of your stay"}>
                🏨 {lang === "it" ? "Vicino all'alloggio" : "Near your stay"}
              </button>
            )}
            <button className={"rmap-chip rmap-chip--engine" + (rainPlan ? " on" : "")} onClick={() => setRainPlan((v) => !v)} title={lang === "it" ? "Mostra le tappe al coperto" : "Show indoor stops"}>
              🌧 {lang === "it" ? "Se piove" : "Rain plan"}
            </button>
            {presentCats.length > 1 && presentCats.map((c) => (
              <button key={c} className={"rmap-chip rmap-chip--cat" + (activeCats.has(c) ? " on" : "")}
                style={activeCats.has(c) ? { background: CAT[c].color, borderColor: CAT[c].color } : { borderColor: CAT[c].color }}
                onClick={() => toggleCat(c)} title={catLabel(c, lang)}>
                {CAT[c].glyph} {catLabel(c, lang)}
              </button>
            ))}
          </>
        )}
      </div>

      {/* Stage: mappa + soli controlli flottanti essenziali (⌕ ◎ ⤢) + card. */}
      <div className="rmap-stage">
        <div className="rmap-toolbar">
          <form className="rmap-search" onSubmit={runSearch}>
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={lang === "it" ? "Cerca un posto…" : "Search a place…"}
              aria-label={lang === "it" ? "Cerca un posto" : "Search a place"} />
            <button type="submit" className="rmap-icbtn" title={lang === "it" ? "Cerca" : "Search"}>{searching ? "…" : "⌕"}</button>
          </form>
          <button className="rmap-icbtn" onClick={locateMe} title={lang === "it" ? "Vicino a me" : "Near me"}>◎</button>
          <button className="rmap-icbtn" onClick={() => setFullscreen((v) => !v)} title={lang === "it" ? "Schermo intero" : "Fullscreen"}>{fullscreen ? "✕" : "⤢"}</button>
        </div>

        {results.length > 0 && (
          <ul className="rmap-results">
            {results.map((r, i) => (
              <li key={i}><button onClick={() => pickResult(r)}><span className="rr-t">{r.label}</span><span className="rr-a">{r.address}</span></button></li>
            ))}
          </ul>
        )}

        <div ref={elRef} className="rmap" />
        {card}
      </div>

      {/* Striscia-tappe del giorno: il ponte narrativo mappa↔giorni. Tap →
          la mappa vola sulla tappa e apre la card operativa. */}
      {activeDay != null && dayStops.length > 0 && (
        <div className="rmap-strip" ref={stripRef}>
          {dayStops.map((p, i) => {
            const isLodging = i === 0 && hasLodgingFirst;
            const num = hasLodgingFirst ? i : i + 1;
            return (
              <button key={`${p.lat}-${p.lng}-${i}`} className={"rmap-stop" + (selected === p ? " on" : "")} onClick={() => flyToStop(p)}>
                <span className={"rmap-stop-n" + (isLodging ? " h" : "")}>{isLodging ? "⌂" : num}</span>
                {p.imageUrl && <span className="rmap-stop-img" style={{ backgroundImage: `url("${p.imageUrl}")` }} />}
                <span className="rmap-stop-t">
                  <span className="l">{p.label}</span>
                  {(p.bestTime || p.durationLabel) && <span className="m">{p.bestTime ?? p.durationLabel}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
