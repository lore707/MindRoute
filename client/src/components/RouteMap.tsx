import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, {
  type GeoJSONSource,
  type Map as MapLibreMap,
  type Marker as MapLibreMarker,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/styles/routemap.css";
import { OPEN_VECTOR_STYLE, vectorMapStyleUrl } from "@/lib/map-style";

export type PlaceCategory = "lodging" | "experience" | "food" | "sight" | "beach" | "custom";

export type RoutePoint = {
  lat: number;
  lng: number;
  label: string;
  day?: number;
  slot?: string;
  category?: string;
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

type Props = {
  points: RoutePoint[];
  center?: { lat: number; lng: number };
  destination: string;
  itineraryId?: number;
  t: (k: string) => string;
  lang: "it" | "en";
  initialDay?: number | null;
  onDayChange?: (day: number | null) => void;
  onOpenDay?: (day: number, momentId?: string) => void;
  onBook?: (type?: string, day?: number) => void;
  selectedMomentId?: string | null;
  onSelectMoment?: (momentId: string | null) => void;
  onSelectPoint?: (point: RoutePoint | null) => void;
  active?: boolean;
  hideDayBar?: boolean;
  timeLabels?: boolean;
  showPlaceLabels?: boolean;
  bare?: boolean;
  hideCard?: boolean;
  hideBareControls?: boolean;
  showRoute?: boolean;
};

type DayRoute = {
  profile: "foot" | "car" | null;
  coords: Array<[number, number]> | null;
  legs: Array<{ t: number; m: number; mid: [number, number] }> | null;
};

const CATEGORIES: Record<PlaceCategory, { color: string; glyph: string; it: string; en: string }> = {
  lodging: { color: "#d6a747", glyph: "H", it: "Alloggio", en: "Stay" },
  experience: { color: "#8b72b5", glyph: "E", it: "Esperienze", en: "Experiences" },
  food: { color: "#e49335", glyph: "R", it: "Ristoranti", en: "Food" },
  sight: { color: "#5f9463", glyph: "V", it: "Da vedere", en: "Sights" },
  beach: { color: "#4b9eae", glyph: "M", it: "Spiagge", en: "Beaches" },
  custom: { color: "#ef5d4f", glyph: "+", it: "Salvati", en: "Saved" },
};
const CATEGORY_KEYS = Object.keys(CATEGORIES) as PlaceCategory[];
const ROUTE_COLOR = "#f05b4f";
const SLOT_ORDER: Record<string, number> = {
  morning: 0, mattina: 0, lunch: 1, pranzo: 1,
  afternoon: 2, pomeriggio: 2, evening: 3, sera: 3, night: 4, notte: 4,
};

const normCategory = (category?: string | null): PlaceCategory =>
  category && CATEGORY_KEYS.includes(category as PlaceCategory) ? category as PlaceCategory : "custom";
const slotRank = (slot?: string) => SLOT_ORDER[String(slot ?? "").toLowerCase()] ?? 9;
const pointKey = (point: RoutePoint) => point.momentId || `${point.lat}:${point.lng}:${point.label}`;

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const radius = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return radius * 2 * Math.asin(Math.sqrt(value));
}

function walkingLabel(meters: number, lang: "it" | "en") {
  const minutes = Math.max(1, Math.round(meters / 80));
  if (minutes <= 60) return lang === "it" ? `${minutes} min a piedi` : `${minutes} min walk`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function curvedSegment(a: RoutePoint, b: RoutePoint): Array<[number, number]> {
  const middleLat = (a.lat + b.lat) / 2;
  const middleLng = (a.lng + b.lng) / 2;
  const dLat = b.lat - a.lat;
  const dLng = b.lng - a.lng;
  const controlLat = middleLat - dLng * 0.14;
  const controlLng = middleLng + dLat * 0.14;
  return Array.from({ length: 15 }, (_, index) => {
    const t = index / 14;
    const u = 1 - t;
    const lat = u * u * a.lat + 2 * u * t * controlLat + t * t * b.lat;
    const lng = u * u * a.lng + 2 * u * t * controlLng + t * t * b.lng;
    return [lng, lat];
  });
}

function isWebGlAvailable() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function markerElement(
  point: RoutePoint,
  index: number,
  isLodging: boolean,
  selected: boolean,
  showLabel: boolean,
  showTime: boolean,
) {
  const category = normCategory(point.category);
  const root = document.createElement("button");
  root.type = "button";
  root.className = `mrgl-marker mrgl-${category}${isLodging ? " is-lodging" : ""}${selected ? " is-selected" : ""}`;
  root.setAttribute("aria-label", point.label);
  root.style.setProperty("--marker-color", CATEGORIES[category].color);

  const pin = document.createElement("span");
  pin.className = "mrgl-pin";
  pin.textContent = isLodging ? CATEGORIES.lodging.glyph : String(index);
  root.appendChild(pin);

  if (showLabel || showTime) {
    const label = document.createElement("span");
    label.className = `mrgl-label${index % 2 === 0 ? " is-right" : " is-left"}`;
    if (showTime && point.bestTime) {
      const time = document.createElement("time");
      time.textContent = point.bestTime;
      label.appendChild(time);
    }
    const name = document.createElement("strong");
    name.textContent = point.label;
    label.appendChild(name);
    if (showTime && point.kindLabel) {
      const kind = document.createElement("small");
      kind.textContent = point.kindLabel;
      label.appendChild(kind);
    }
    root.appendChild(label);
  }
  return root;
}

function addRouteLayers(map: MapLibreMap) {
  if (!map.getSource("mindroute-route")) {
    map.addSource("mindroute-route", {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer("mindroute-route-casing")) {
    map.addLayer({
      id: "mindroute-route-casing",
      type: "line",
      source: "mindroute-route",
      paint: {
        "line-color": "rgba(255,255,255,.94)",
        "line-width": ["case", ["==", ["get", "real"], true], 8, 7],
        "line-opacity": 0.95,
      },
      layout: { "line-cap": "round", "line-join": "round" },
    });
  }
  if (!map.getLayer("mindroute-route-real")) {
    map.addLayer({
      id: "mindroute-route-real",
      type: "line",
      source: "mindroute-route",
      filter: ["==", ["get", "real"], true],
      paint: { "line-color": ROUTE_COLOR, "line-width": 3.5, "line-opacity": 0.96 },
      layout: { "line-cap": "round", "line-join": "round" },
    });
  }
  if (!map.getLayer("mindroute-route-estimated")) {
    map.addLayer({
      id: "mindroute-route-estimated",
      type: "line",
      source: "mindroute-route",
      filter: ["!=", ["get", "real"], true],
      paint: {
        "line-color": ROUTE_COLOR,
        "line-width": 3,
        "line-opacity": 0.82,
        "line-dasharray": [1.2, 2.1],
      },
      layout: { "line-cap": "round", "line-join": "round" },
    });
  }
}

export default function RouteMap({
  points, center, destination, itineraryId, t, lang, initialDay = null,
  onDayChange, onOpenDay, onBook, selectedMomentId, onSelectMoment, onSelectPoint,
  active = true, hideDayBar = false, timeLabels = false, showPlaceLabels = false,
  bare = false, hideCard = false, hideBareControls = false, showRoute = true,
}: Props) {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const pointMarkersRef = useRef<MapLibreMarker[]>([]);
  const routeLabelsRef = useRef<MapLibreMarker[]>([]);
  const userMarkerRef = useRef<MapLibreMarker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const routeCacheRef = useRef<Map<string, DayRoute>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [selected, setSelected] = useState<RoutePoint | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<PlaceCategory>>(new Set());
  const [nearLodging, setNearLodging] = useState(false);
  const [rainPlan, setRainPlan] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [dayRoute, setDayRoute] = useState<DayRoute | null>(null);

  const days = useMemo(() => Array.from(new Set(points
    .map(point => point.day)
    .filter((day): day is number => typeof day === "number"))).sort((a, b) => a - b), [points]);
  const [activeDay, setActiveDay] = useState<number | null>(initialDay ?? days[0] ?? null);
  const dayWord = lang === "it" ? "Giorno" : "Day";

  useEffect(() => {
    if (initialDay != null) setActiveDay(initialDay);
  }, [initialDay]);

  const lodgingPoint = useMemo(() => points.find(point =>
    normCategory(point.category) === "lodging" && (activeDay == null || point.day === activeDay))
    ?? points.find(point => normCategory(point.category) === "lodging"), [points, activeDay]);

  const visiblePoints = useMemo(() => points.filter(point => {
    if (activeDay != null && point.day !== activeDay) return false;
    if (activeCategories.size && !activeCategories.has(normCategory(point.category))) return false;
    if (nearLodging && lodgingPoint && distanceMeters(lodgingPoint, point) > 1200) return false;
    if (rainPlan && ["beach", "experience"].includes(normCategory(point.category))) return false;
    return Number.isFinite(point.lat) && Number.isFinite(point.lng);
  }), [points, activeDay, activeCategories, nearLodging, rainPlan, lodgingPoint]);

  const dayStops = useMemo(() => {
    if (activeDay == null) return [];
    const dayPoints = points.filter(point => point.day === activeDay);
    const lodging = dayPoints.find(point => normCategory(point.category) === "lodging") ?? lodgingPoint;
    const stops = dayPoints
      .filter(point => normCategory(point.category) !== "lodging")
      .sort((a, b) => slotRank(a.slot) - slotRank(b.slot));
    return (lodging ? [lodging, ...stops] : stops).slice(0, 16);
  }, [points, activeDay, lodgingPoint]);

  const filtersActive = activeCategories.size > 0 || nearLodging || rainPlan;
  const presentCategories = useMemo(() => CATEGORY_KEYS.filter(category =>
    points.some(point => normCategory(point.category) === category)), [points]);

  useEffect(() => {
    setDayRoute(null);
    if (!itineraryId || activeDay == null || dayStops.length < 2) return;
    const routePoints = dayStops.map(point => ({ lat: point.lat, lng: point.lng }));
    const key = `${activeDay}:${routePoints.map(point => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`).join(";")}`;
    const cached = routeCacheRef.current.get(key);
    if (cached) {
      setDayRoute(cached);
      return;
    }
    let cancelled = false;
    fetch(`/api/itinerary/${itineraryId}/route`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: activeDay, points: routePoints }),
    })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (cancelled) return;
        const route: DayRoute = data?.coords
          ? { profile: data.profile, coords: data.coords, legs: data.legs }
          : { profile: null, coords: null, legs: null };
        routeCacheRef.current.set(key, route);
        setDayRoute(route);
      })
      .catch(() => !cancelled && setDayRoute({ profile: null, coords: null, legs: null }));
    return () => { cancelled = true; };
  }, [activeDay, dayStops, itineraryId]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) return;
    if (!isWebGlAvailable()) {
      setMapError(lang === "it" ? "Il browser non supporta la mappa vettoriale." : "This browser does not support the vector map.");
      return;
    }

    const first = points[0] ?? center;
    const vectorStyle = vectorMapStyleUrl();
    let fallbackApplied = vectorStyle.provider === "openfreemap";
    let consecutiveErrors = 0;
    const map = new maplibregl.Map({
      container: mapNodeRef.current,
      style: vectorStyle.url,
      center: first ? [first.lng, first.lat] : [12.4964, 41.9028],
      zoom: first ? 12.5 : 5,
      minZoom: 2,
      maxZoom: 19,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      fadeDuration: 180,
      cooperativeGestures: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false, visualizePitch: false }), "top-left");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    const markReady = () => {
      consecutiveErrors = 0;
      setMapError(null);
      addRouteLayers(map);
      setMapReady(true);
    };
    map.on("load", markReady);
    map.on("style.load", () => {
      addRouteLayers(map);
      setMapReady(true);
    });
    map.on("click", () => {
      setSelected(null);
      onSelectMoment?.(null);
      onSelectPoint?.(null);
    });
    map.on("error", () => {
      consecutiveErrors += 1;
      if (!fallbackApplied && consecutiveErrors >= 3) {
        fallbackApplied = true;
        setMapReady(false);
        map.setStyle(OPEN_VECTOR_STYLE);
      } else if (fallbackApplied && consecutiveErrors >= 8 && !map.isStyleLoaded()) {
        setMapError(lang === "it" ? "La cartografia non e disponibile. Riprova tra poco." : "Map data is unavailable. Try again shortly.");
      }
    });

    resizeObserverRef.current = new ResizeObserver(() => map.resize());
    resizeObserverRef.current.observe(mapNodeRef.current);
    mapRef.current = map;

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      pointMarkersRef.current.forEach(marker => marker.remove());
      routeLabelsRef.current.forEach(marker => marker.remove());
      userMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
    };
  // The map instance intentionally lives for the lifetime of the component.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !active) return;
    const timer = window.setTimeout(() => map.resize(), 80);
    return () => window.clearTimeout(timer);
  }, [active, fullscreen]);

  useEffect(() => {
    if (selectedMomentId === undefined) return;
    const point = selectedMomentId ? points.find(item => item.momentId === selectedMomentId) ?? null : null;
    setSelected(point);
    if (point && mapRef.current) {
      mapRef.current.easeTo({ center: [point.lng, point.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 650 });
    }
  }, [selectedMomentId, points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !map.isStyleLoaded()) return;
    addRouteLayers(map);
    const source = map.getSource("mindroute-route") as GeoJSONSource | undefined;
    const features: GeoJSON.Feature<GeoJSON.LineString>[] = [];
    if (showRoute && activeDay != null && !filtersActive && dayStops.length > 1) {
      if (dayRoute?.coords?.length) {
        features.push({
          type: "Feature",
          properties: { real: true },
          geometry: { type: "LineString", coordinates: dayRoute.coords.map(([lat, lng]) => [lng, lat]) },
        });
      } else {
        for (let index = 1; index < dayStops.length; index += 1) {
          features.push({
            type: "Feature",
            properties: { real: false },
            geometry: { type: "LineString", coordinates: curvedSegment(dayStops[index - 1], dayStops[index]) },
          });
        }
      }
    }
    source?.setData({ type: "FeatureCollection", features });

    routeLabelsRef.current.forEach(marker => marker.remove());
    routeLabelsRef.current = [];
    if (showRoute && !timeLabels && dayRoute?.legs?.length) {
      routeLabelsRef.current = dayRoute.legs.map(leg => {
        const element = document.createElement("span");
        element.className = "mrgl-leg";
        element.textContent = `${dayRoute.profile === "car" ? "Auto" : "A piedi"} ${Math.max(1, Math.round(leg.t / 60))} min`;
        return new maplibregl.Marker({ element, anchor: "center" }).setLngLat([leg.mid[1], leg.mid[0]]).addTo(map);
      });
    }
  }, [mapReady, activeDay, dayStops, dayRoute, filtersActive, showRoute, timeLabels]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    pointMarkersRef.current.forEach(marker => marker.remove());
    pointMarkersRef.current = [];

    const ordered = activeDay == null
      ? visiblePoints
      : [...visiblePoints].sort((a, b) => {
        if (normCategory(a.category) === "lodging") return -1;
        if (normCategory(b.category) === "lodging") return 1;
        return slotRank(a.slot) - slotRank(b.slot);
      });
    let stopNumber = 0;
    ordered.forEach(point => {
      const lodging = normCategory(point.category) === "lodging";
      if (!lodging) stopNumber += 1;
      const isSelected = !!selected && pointKey(selected) === pointKey(point);
      const element = markerElement(
        point,
        lodging ? 0 : stopNumber,
        lodging,
        isSelected,
        showPlaceLabels && activeDay != null,
        timeLabels && activeDay != null,
      );
      element.addEventListener("click", event => {
        event.stopPropagation();
        setSelected(point);
        onSelectMoment?.(point.momentId ?? null);
        onSelectPoint?.(point);
        map.easeTo({ center: [point.lng, point.lat], zoom: Math.max(map.getZoom(), 15), duration: 620 });
      });
      pointMarkersRef.current.push(new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat([point.lng, point.lat])
        .addTo(map));
    });

    const fitPoints = activeDay != null && dayStops.length ? dayStops : visiblePoints;
    if (selected) {
      map.easeTo({ center: [selected.lng, selected.lat], zoom: Math.max(map.getZoom(), 15), duration: 520 });
    } else if (fitPoints.length === 1) {
      map.easeTo({ center: [fitPoints[0].lng, fitPoints[0].lat], zoom: 15, duration: 560 });
    } else if (fitPoints.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      fitPoints.forEach(point => bounds.extend([point.lng, point.lat]));
      map.fitBounds(bounds, {
        padding: timeLabels || showPlaceLabels
          ? { top: 96, right: 170, bottom: 110, left: 170 }
          : { top: 70, right: 70, bottom: 80, left: 70 },
        maxZoom: 15.5,
        duration: 720,
      });
    } else if (center) {
      map.easeTo({ center: [center.lng, center.lat], zoom: 12, duration: 500 });
    }
  }, [mapReady, visiblePoints, activeDay, dayStops, selected, center, showPlaceLabels, timeLabels, onSelectMoment, onSelectPoint]);

  useEffect(() => {
    if (!fullscreen) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [fullscreen]);

  useEffect(() => {
    if (!selected) return;
    stripRef.current?.querySelector<HTMLElement>(".rmap-stop.on")
      ?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selected]);

  const setDay = (day: number | null) => {
    setActiveDay(day);
    setSelected(null);
    onDayChange?.(day);
    onSelectPoint?.(null);
  };
  const toggleCategory = (category: PlaceCategory) => setActiveCategories(current => {
    const next = new Set(current);
    next.has(category) ? next.delete(category) : next.add(category);
    return next;
  });
  const selectStop = (point: RoutePoint) => {
    setSelected(point);
    onSelectMoment?.(point.momentId ?? null);
    onSelectPoint?.(point);
    mapRef.current?.easeTo({ center: [point.lng, point.lat], zoom: 15.5, duration: 620 });
  };
  const locateUser = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition(position => {
      const location: [number, number] = [position.coords.longitude, position.coords.latitude];
      userMarkerRef.current?.remove();
      const element = document.createElement("span");
      element.className = "mrgl-user";
      userMarkerRef.current = new maplibregl.Marker({ element }).setLngLat(location).addTo(mapRef.current!);
      mapRef.current?.easeTo({ center: location, zoom: 15.5, duration: 700 });
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
  };

  const selectedDistance = selected && lodgingPoint && pointKey(selected) !== pointKey(lodgingPoint)
    ? walkingLabel(distanceMeters(lodgingPoint, selected), lang)
    : null;
  const card = selected && (
    <div className="rmap-card" data-testid="rmap-card">
      <button className="rmap-card-x" onClick={() => setSelected(null)} aria-label={lang === "it" ? "Chiudi" : "Close"}>x</button>
      {selected.imageUrl && <div className="rmap-card-img" style={{ backgroundImage: `url("${selected.imageUrl}")` }} />}
      <div className="rmap-card-body">
        <div className="rmap-card-meta">
          {selected.day != null && <span className="rmap-card-day">{dayWord} {selected.day}</span>}
          {selected.kindLabel && <span className="rmap-card-kind">{selected.kindLabel}</span>}
        </div>
        <div className="rmap-card-t">{selected.label}</div>
        <div className="rmap-card-facts">
          {selected.bestTime && <span>{selected.bestTime}</span>}
          {selected.durationLabel && <span>{selected.durationLabel}</span>}
          {selectedDistance && <span>{selectedDistance}</span>}
        </div>
        {selected.desc && <div className="rmap-card-desc">{selected.desc}</div>}
        <div className="rmap-card-acts">
          {selected.day != null && onOpenDay && <button className="rmap-card-btn rmap-card-btn--p" onClick={() => onOpenDay(selected.day!, selected.momentId)}>{lang === "it" ? "Apri nel giorno" : "Open in day"}</button>}
          {selected.bookable && selected.ctaUrl && <a className="rmap-card-btn rmap-card-btn--book" href={selected.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={() => onBook?.(selected.type, selected.day)}>{selected.cta || (lang === "it" ? "Prenota" : "Book")}</a>}
          <a className="rmap-card-btn" href={`https://www.google.com/maps/dir/?api=1&destination=${selected.lat},${selected.lng}`} target="_blank" rel="noopener noreferrer">Google Maps</a>
        </div>
      </div>
    </div>
  );

  const navigationUrl = dayStops.length
    ? `https://www.google.com/maps/dir/?api=1&destination=${dayStops.at(-1)!.lat},${dayStops.at(-1)!.lng}${dayStops.length > 1 ? `&waypoints=${dayStops.slice(0, -1).map(point => `${point.lat},${point.lng}`).join("|")}` : ""}`
    : "";
  const hasLodgingFirst = dayStops.length > 0 && normCategory(dayStops[0].category) === "lodging";

  return (
    <div ref={wrapRef} className={`rmap-wrap rmap-wrap--vector${fullscreen ? " rmap-wrap--full" : ""}`}>
      {!hideDayBar && days.length > 1 && <div className="rmap-days">
        <button className={`rmap-day${activeDay == null ? " on" : ""}`} onClick={() => setDay(null)}>{lang === "it" ? "Tutti" : "All"}</button>
        {days.map(day => <button key={day} className={`rmap-day${activeDay === day ? " on" : ""}`} onClick={() => setDay(day)}><span className="w">{dayWord}</span><span className="n">{day}</span></button>)}
      </div>}

      {!bare && <div className="rmap-filterrow">
        <button className={`rmap-chip rmap-chip--toggle${filtersOpen ? " on" : ""}`} onClick={() => setFiltersOpen(value => !value)}>{lang === "it" ? "Filtri" : "Filters"}{filtersActive ? " *" : ""}</button>
        {(filtersOpen || filtersActive) && <>
          {lodgingPoint && <button className={`rmap-chip rmap-chip--engine${nearLodging ? " on" : ""}`} onClick={() => setNearLodging(value => !value)}>{lang === "it" ? "Vicino all'alloggio" : "Near your stay"}</button>}
          <button className={`rmap-chip rmap-chip--engine${rainPlan ? " on" : ""}`} onClick={() => setRainPlan(value => !value)}>{lang === "it" ? "Se piove" : "Rain plan"}</button>
          {presentCategories.map(category => <button key={category} className={`rmap-chip rmap-chip--cat${activeCategories.has(category) ? " on" : ""}`} style={activeCategories.has(category) ? { background: CATEGORIES[category].color, borderColor: CATEGORIES[category].color } : { borderColor: CATEGORIES[category].color }} onClick={() => toggleCategory(category)}>{CATEGORIES[category][lang]}</button>)}
        </>}
      </div>}

      <div className="rmap-stage">
        <div ref={mapNodeRef} className="rmap rmap--vector" aria-label={`${lang === "it" ? "Mappa di" : "Map of"} ${destination}`} />
        {!mapReady && !mapError && <div className="rmap-vector-loading"><span />{lang === "it" ? "Preparo la mappa del viaggio" : "Preparing your trip map"}</div>}
        {mapError && <div className="rmap-offline" role="status"><strong>{mapError}</strong><small>{lang === "it" ? "Le tappe e l'itinerario restano disponibili." : "Your stops and itinerary remain available."}</small></div>}

        {!bare && <div className="rmap-toolbar rmap-toolbar--vector">
          <button className="rmap-icbtn" onClick={locateUser} title={lang === "it" ? "La mia posizione" : "My location"}>◎</button>
          <button className="rmap-icbtn" onClick={() => setFullscreen(value => !value)} title={lang === "it" ? "Schermo intero" : "Fullscreen"}>{fullscreen ? "x" : "⛶"}</button>
        </div>}

        {bare && !hideBareControls && <div className="mrf-map-ctrls">
          <button className="mrf-pill" onClick={locateUser}>◎ {t("if.map.center")}</button>
          {navigationUrl && <a className="mrf-map-go" title={t("if.map.navigate")} aria-label={t("if.map.navigate")} href={navigationUrl} target="_blank" rel="noopener noreferrer">➤</a>}
        </div>}
        {bare && !hideBareControls && activeDay != null && dayStops.length > 1 && <div className="mrf-map-legend"><span><i />{t("if.map.realRoute")}</span><span><i className="est" />{t("if.map.estRoute")}</span></div>}
        {!hideCard && card}
      </div>

      {!bare && activeDay != null && dayStops.length > 0 && <div className="rmap-strip" ref={stripRef}>
        {dayStops.map((point, index) => {
          const lodging = index === 0 && hasLodgingFirst;
          const number = hasLodgingFirst ? index : index + 1;
          return <button key={`${pointKey(point)}:${index}`} className={`rmap-stop${selected && pointKey(selected) === pointKey(point) ? " on" : ""}`} onClick={() => selectStop(point)}>
            <span className={`rmap-stop-n${lodging ? " h" : ""}`}>{lodging ? "H" : number}</span>
            {point.imageUrl && <span className="rmap-stop-img" style={{ backgroundImage: `url("${point.imageUrl}")` }} />}
            <span className="rmap-stop-t"><span className="l">{point.label}</span>{(point.bestTime || point.durationLabel) && <span className="m">{point.bestTime ?? point.durationLabel}</span>}</span>
          </button>;
        })}
      </div>}
    </div>
  );
}
