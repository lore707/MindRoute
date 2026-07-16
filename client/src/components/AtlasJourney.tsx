/**
 * AtlasJourney.tsx — Atlas narrativo (redesign 2026-07, v2 "mappa calma").
 * ───────────────────────────────────────────────────────────────
 * La memoria visiva della vita in viaggio. NON Google Maps, NON logistica.
 *
 * REGOLA CARDINE — la mappa non deve MAI essere rumorosa:
 *   · Stato normale: SOLO marker. Nessuna linea. La mappa respira.
 *   · Le linee compaiono SOLO su hover/click di un viaggio e disegnano SOLO
 *     il percorso interno di QUEL viaggio (le sue tappe reali), animato; al
 *     rilascio la mappa torna pulita. Questo la rende leggibile a 200 viaggi.
 *   · Il marker comunica impatto/emozione via DIMENSIONE, COLORE, GLOW — mai
 *     con linee. Dimensione ∝ impatto; colore = emozione (tag utente) o impatto.
 *
 * La TIMELINE è il vero navigatore temporale: scegli un anno → la mappa mostra
 * SOLO i viaggi di quell'anno e la camera si adatta (zoom intelligente).
 *
 * 3 tab: Geografia (mappa) · Timeline (cronologia) · Evoluzione (crescita).
 * Tutto DERIVATO da dati reali; niente temperatura/momento-migliore/grafico
 * emotivo inventati (regola ferrea).
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Maximize2, Minimize2, Play, Pause, X, ArrowRight, SlidersHorizontal, MapPin } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
import type { AtlasData } from "./AccountAtlas";
import type { AccountData } from "./AccountCinematic";

const CARTO = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR = '&copy; <a href="https://carto.com/attributions">CARTO</a>';

export type Emotion = "life-changing" | "meaningful" | "loved" | "not-for-me" | "revisited";
const EMO_COLOR: Record<Emotion, string> = {
  "life-changing": "#E94560", meaningful: "#9D7EBC", loved: "#6FB4A8", "not-for-me": "#8a5560", revisited: "#D4A853",
};
const EMO_ORDER: Emotion[] = ["life-changing", "meaningful", "loved", "not-for-me", "revisited"];

function impactColor(v: number): string {
  const stops = [[94, 140, 182], [212, 168, 83], [233, 69, 96]];
  const t = Math.max(0, Math.min(1, v));
  const seg = t < 0.5 ? 0 : 1, k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const a = stops[seg], b = stops[seg + 1];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

type Node = {
  id: number; name: string; lat: number; lng: number; days: number; dateMs: number; dateLabel: string; year: number | null;
  hero: string | null; continent: string | null; href: string; emotion?: Emotion; quote?: string;
  budget?: number | null; impact: number; color: string; taken?: boolean; stops: Array<{ lat: number; lng: number }>;
};

type Tab = "geo" | "timeline" | "evo";

type Props = {
  atlas: AtlasData | null;
  trips: AccountData["trips"];
  savedMoments?: AccountData["savedMoments"];
  headline?: string | null;
  onSaveEmotion?: (itineraryId: number, emotion: Emotion | null) => void;
};

export function AtlasJourney({ atlas, trips, savedMoments, headline, onSaveEmotion }: Props) {
  const { t, lang } = useI18n();
  const L2 = (it: string, en: string) => (lang === "it" ? it : en);

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const routeAnim = useRef<number | null>(null);
  const playRef = useRef<number | null>(null);

  const aqp = (k: string): string | null => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };
  const [tab, setTab] = useState<Tab>((aqp("atab") as Tab) || "geo");
  const [selId, setSelId] = useState<number | null>(aqp("asel") ? Number(aqp("asel")) : null);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [focusYear, setFocusYear] = useState<number | null>(aqp("ayear") ? Number(aqp("ayear")) : null);
  const [fullscreen, setFullscreen] = useState(aqp("afs") === "1");
  const [playing, setPlaying] = useState(false);
  const [emoFilter, setEmoFilter] = useState<Set<Emotion>>(new Set());
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [localEmotion, setLocalEmotion] = useState<Record<number, Emotion | null>>({});

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  // ── Nodi: join atlas.places × trips (data/emozione/impatto/tappe) ──
  const nodes = useMemo<Node[]>(() => {
    const places = atlas?.places ?? [];
    const tripByHref = new Map<string, AccountData["trips"][number]>();
    for (const tr of trips) if (tr.href) tripByHref.set(tr.href, tr);
    const heartsByItin = new Map<number, number>();
    for (const m of (savedMoments ?? [])) heartsByItin.set(m.itineraryId, (heartsByItin.get(m.itineraryId) ?? 0) + 1);

    const raw = places.map(p => {
      const idMatch = (p.href || "").match(/\/itinerary\/(\d+)/);
      const id = idMatch ? Number(idMatch[1]) : NaN;
      const tr = tripByHref.get(p.href);
      const dateMs = tr?.rawDate ? new Date(tr.rawDate).getTime() : (p.lastDate ? new Date(p.lastDate).getTime() : NaN);
      const hearts = Number.isFinite(id) ? (heartsByItin.get(id) ?? 0) : 0;
      const impRaw = hearts * 2 + (tr?.taken ? 1 : 0) + (p.days || 0) / 7;
      return {
        id, name: p.name, lat: p.lat, lng: p.lng, days: p.days || 0, dateMs, hero: p.heroImageUrl,
        continent: p.continent, href: p.href, quote: tr?.quote, budget: tr?.budget ?? null, taken: tr?.taken,
        stops: (tr?.stops ?? []) as Array<{ lat: number; lng: number }>,
        emotion: (localEmotion[id] ?? tr?.emotion) as Emotion | undefined, impRaw,
        year: dateMs && !isNaN(dateMs) ? new Date(dateMs).getFullYear() : null,
        dateLabel: dateMs && !isNaN(dateMs) ? new Date(dateMs).toLocaleDateString(lang === "it" ? "it-IT" : "en-US", { month: "short", year: "numeric" }) : "",
      };
    }).filter(n => Number.isFinite(n.lat) && Number.isFinite(n.lng));

    const maxImp = Math.max(1, ...raw.map(n => n.impRaw));
    return raw.map(n => {
      const impact = n.impRaw / maxImp;
      const color = n.emotion ? EMO_COLOR[n.emotion] : impactColor(impact);
      return { ...n, impact, color } as Node;
    }).sort((a, b) => (a.dateMs || 0) - (b.dateMs || 0));
  }, [atlas, trips, savedMoments, localEmotion, lang]);

  const sel = useMemo(() => nodes.find(n => n.id === selId) ?? null, [nodes, selId]);
  const years = useMemo(() => Array.from(new Set(nodes.map(n => n.year).filter((y): y is number => y != null))).sort((a, b) => a - b), [nodes]);

  // Un nodo è "in scena" se rientra nel filtro anno + filtro emozione.
  const inScene = (n: Node) =>
    (focusYear == null || n.year === focusYear) &&
    (emoFilter.size === 0 || (n.emotion != null && emoFilter.has(n.emotion)));

  // ── Leaflet init ──
  useEffect(() => {
    if (!mapEl.current || nodes.length === 0 || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true, worldCopyJump: true, minZoom: 2 });
    map.setView([25, 10], 2); // vista iniziale: Leaflet richiede center+zoom prima di ogni proiezione/fitBounds
    mapRef.current = map;
    L.tileLayer(CARTO, { attribution: CARTO_ATTR, subdomains: "abcd", maxZoom: 10 }).addTo(map);
    L.control.zoom({ position: "bottomleft" }).addTo(map);
    routeRef.current = L.layerGroup().addTo(map);
    fitScene(map, false);
    setTimeout(() => { map.invalidateSize(); }, 60);
    return () => { map.off(); map.remove(); mapRef.current = null; routeRef.current = null; markersRef.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // ── Marker (ricreati su cambio nodi) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();
    for (const n of nodes) {
      const size = Math.round(16 + n.impact * 14); // dimensione ∝ impatto
      const icon = L.divIcon({
        className: "atlas-node-wrap",
        html: `<span class="atlas-node" style="--c:${n.color};width:${size}px;height:${size}px"><span class="an-core"></span></span>`,
        iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      });
      const mk = L.marker([n.lat, n.lng], { icon, riseOnHover: true, keyboard: false })
        .on("click", () => selectNode(n.id))
        .on("mouseover", () => { if (!isMobile) setHoverId(n.id); })
        .on("mouseout", () => { if (!isMobile) setHoverId(null); })
        .addTo(map);
      mk.bindTooltip(`<b>${escapeHtml(n.name)}</b>${n.dateLabel ? ` · ${n.dateLabel}` : ""}`,
        { className: "atlas-tip", direction: "top", offset: [0, -10], opacity: 1 });
      markersRef.current.set(n.id, mk);
    }
    applyStyles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Marker in scena + evidenza (hover/selezione) + percorso del viaggio attivo.
  useEffect(() => {
    applyStyles();
    const activeId = selId ?? hoverId;
    if (activeId != null) drawRoute(activeId, selId != null);
    else clearRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, hoverId, focusYear, emoFilter, nodes]);

  // Cambio anno/filtro → la camera si adatta (zoom intelligente). Non durante
  // una selezione (lì la camera è sul viaggio).
  useEffect(() => {
    const map = mapRef.current;
    if (map && selId == null) fitScene(map, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusYear, emoFilter]);

  // La camera segue la selezione (vale sia per click che per selezione
  // programmatica): vola sulle tappe del viaggio, o torna alla scena.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (selId == null) { fitScene(map, true); return; }
    const n = nodes.find(x => x.id === selId);
    if (!n) return;
    const pts = (n.stops && n.stops.length >= 2) ? n.stops.map(s => [s.lat, s.lng] as [number, number]) : null;
    if (pts) map.flyToBounds(L.latLngBounds(pts), { padding: [90, 90], maxZoom: 12, duration: 0.8 });
    else map.flyTo([n.lat, n.lng], Math.max(map.getZoom(), 5), { duration: 0.7 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId]);

  useEffect(() => {
    const map = mapRef.current;
    if (map) setTimeout(() => { map.invalidateSize(); if (selId == null) fitScene(map, false); }, 220);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen, tab]);

  function fitScene(map: L.Map, animate: boolean) {
    const scene = nodes.filter(inScene);
    if (scene.length === 0) { map.setView([25, 10], 2, { animate }); return; }
    const b = L.latLngBounds(scene.map(n => [n.lat, n.lng] as [number, number]));
    const opts = { padding: [80, 80] as [number, number], maxZoom: scene.length === 1 ? 6 : 5 };
    if (animate) map.flyToBounds(b, { ...opts, duration: 0.8 });
    else map.fitBounds(b, opts);
  }

  function applyStyles() {
    const activeId = selId ?? hoverId;
    for (const n of nodes) {
      const mk = markersRef.current.get(n.id);
      const el = mk && (mk as any)._icon as HTMLElement | undefined;
      if (!el) continue;
      const scene = inScene(n);
      const dim = activeId != null && n.id !== activeId; // desatura gli altri quando uno è attivo
      el.style.transition = "opacity .5s ease, filter .4s ease, transform .3s ease";
      el.style.opacity = !scene ? "0" : dim ? "0.28" : "1";
      el.style.filter = dim ? "grayscale(.7)" : "none";
      el.style.pointerEvents = scene ? "auto" : "none";
      el.classList.toggle("sel", n.id === selId);
    }
  }

  // Percorso INTERNO del viaggio (tappe reali), disegnato solo su hover/select.
  function drawRoute(id: number, animate: boolean) {
    const layer = routeRef.current;
    const n = nodes.find(x => x.id === id);
    if (!layer || !n) return;
    layer.clearLayers();
    if (routeAnim.current) { cancelAnimationFrame(routeAnim.current); routeAnim.current = null; }
    const pts: [number, number][] = (n.stops && n.stops.length >= 2)
      ? n.stops.map(s => [s.lat, s.lng] as [number, number])
      : [[n.lat, n.lng]];
    if (pts.length < 2) return; // un solo punto: nessuna linea (mappa calma)
    // punti densi interpolati (arco morbido) per un draw fluido
    const dense: [number, number][] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const mLat = (a[0] + b[0]) / 2, mLng = (a[1] + b[1]) / 2;
      const dLat = b[0] - a[0], dLng = b[1] - a[1], len = Math.hypot(dLat, dLng) || 1;
      const off = Math.min(0.6, len * 0.14);
      const cLat = mLat + (-dLng / len) * off, cLng = mLng + (dLat / len) * off;
      const steps = 16;
      for (let s = 0; s <= steps; s++) { const tt = s / steps, u = 1 - tt; dense.push([u * u * a[0] + 2 * u * tt * cLat + tt * tt * b[0], u * u * a[1] + 2 * u * tt * cLng + tt * tt * b[1]]); }
    }
    const halo = L.polyline([], { color: n.color, weight: 8, opacity: 0.18, interactive: false, smoothFactor: 1 }).addTo(layer);
    const core = L.polyline([], { color: n.color, weight: 2.4, opacity: 0.95, interactive: false, smoothFactor: 1 }).addTo(layer);
    // marker-punto sulle tappe reali (piccoli), per "leggere" il viaggio
    for (const p of pts) L.circleMarker(p, { radius: 3.2, color: "#fff", weight: 1, fillColor: n.color, fillOpacity: 1, interactive: false }).addTo(layer);
    if (!animate) { halo.setLatLngs(dense); core.setLatLngs(dense); return; }
    const start = performance.now(), dur = 850;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const cut = Math.max(2, Math.floor(dense.length * k));
      const slice = dense.slice(0, cut);
      halo.setLatLngs(slice); core.setLatLngs(slice);
      if (k < 1) routeAnim.current = requestAnimationFrame(tick);
    };
    routeAnim.current = requestAnimationFrame(tick);
  }
  function clearRoute() { routeRef.current?.clearLayers(); if (routeAnim.current) cancelAnimationFrame(routeAnim.current); }

  function selectNode(id: number) { setSelId(id); }
  function deselect() { setSelId(null); } // la camera torna alla scena via effect su [selId]

  // ── Play Journey: scorre gli anni, la mappa mostra un anno alla volta ──
  const togglePlay = () => {
    if (playing) { if (playRef.current) clearTimeout(playRef.current); setPlaying(false); return; }
    if (years.length === 0) return;
    setPlaying(true); setSelId(null);
    let i = 0;
    const step = () => {
      if (i >= years.length) { setPlaying(false); setFocusYear(null); return; }
      setFocusYear(years[i]); i++;
      playRef.current = window.setTimeout(step, 1800);
    };
    step();
  };
  useEffect(() => () => { if (playRef.current) clearTimeout(playRef.current); if (routeAnim.current) cancelAnimationFrame(routeAnim.current); }, []);

  const stats = atlas?.stats;
  const worldPct = stats ? Math.round((stats.continents / 7) * 100) : 0;
  const topPlaces = useMemo(() => [...nodes].sort((a, b) => b.impact - a.impact).slice(0, 3), [nodes]);
  const byYear = useMemo(() => {
    const m = new Map<number, { count: number; conts: Record<string, number>; emos: Record<string, number>; days: number }>();
    for (const n of nodes) {
      if (n.year == null) continue;
      const e = m.get(n.year) ?? { count: 0, conts: {}, emos: {}, days: 0 };
      e.count += 1; e.days += n.days;
      if (n.continent) e.conts[n.continent] = (e.conts[n.continent] ?? 0) + 1;
      if (n.emotion) e.emos[n.emotion] = (e.emos[n.emotion] ?? 0) + 1;
      m.set(n.year, e);
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]).map(([y, e]) => ({
      year: y, count: e.count, days: e.days,
      top: Object.entries(e.conts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      emo: (Object.entries(e.emos).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as Emotion | null,
      conts: Object.keys(e.conts),
    }));
  }, [nodes]);

  const saveEmotion = (emo: Emotion | null) => {
    if (selId == null) return;
    setLocalEmotion(prev => ({ ...prev, [selId]: emo }));
    onSaveEmotion?.(selId, emo);
  };
  const emoLabel = (e: Emotion) => t(`atl.emo.${e}`);
  const toggleEmo = (e: Emotion) => setEmoFilter(prev => { const n = new Set(prev); n.has(e) ? n.delete(e) : n.add(e); return n; });

  if (nodes.length === 0) {
    return <div className="atlas-empty">{L2("La tua mappa si popola appena generi il primo itinerario.", "Your map fills in as soon as you generate your first itinerary.")}</div>;
  }

  const cumulativeContinents = (() => { const set = new Set<string>(); return byYear.map(y => { y.conts.forEach(c => set.add(c)); return { year: y.year, n: set.size }; }); })();

  return (
    <div className={"atlas-journey" + (fullscreen ? " fs" : "")}>
      {/* Chrome: tab + cerca + filtri */}
      <div className="atlas-chrome">
        <div className="atlas-tabs">
          {(["geo", "timeline", "evo"] as Tab[]).map(tb => (
            <button key={tb} className={"atlas-tab" + (tab === tb ? " on" : "")} onClick={() => setTab(tb)}>{t(`atl.tab.${tb}`)}</button>
          ))}
        </div>
        {tab === "geo" && (
          <div className="atlas-chrome-r">
            <button className={"atlas-ctrl" + (filtersOpen ? " on" : "")} onClick={() => setFiltersOpen(v => !v)}><SlidersHorizontal size={14} /> {L2("Filtri", "Filters")}</button>
          </div>
        )}
      </div>

      {tab === "geo" && filtersOpen && (
        <div className="atlas-filterbar">
          <span className="lb">{L2("Mostra solo:", "Show only:")}</span>
          {EMO_ORDER.map(e => (
            <button key={e} className={"atlas-fchip" + (emoFilter.has(e) ? " on" : "")} style={{ ["--c" as any]: EMO_COLOR[e] }} onClick={() => toggleEmo(e)}>{emoLabel(e)}</button>
          ))}
          {(emoFilter.size > 0 || focusYear != null) && <button className="atlas-fclear" onClick={() => { setEmoFilter(new Set()); setFocusYear(null); }}>{L2("Azzera", "Clear")}</button>}
        </div>
      )}

      {/* ── GEOGRAFIA ── */}
      {tab === "geo" && (
        <div className="atlas-grid">
          <div className="atlas-main">
            <div className="atlas-mapcard">
              <div className="atlas-map" ref={mapEl} />
              <div className="atlas-legend">
                {EMO_ORDER.map(e => (<span className="atlas-lg" key={e}><span className="d" style={{ background: EMO_COLOR[e] }} />{emoLabel(e)}</span>))}
              </div>
              <button className="atlas-fs" onClick={() => setFullscreen(v => !v)}>
                {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{fullscreen ? L2("Riduci", "Minimise") : L2("Schermo intero", "Full screen")}</span>
              </button>
              <div className="atlas-heat">
                <div className="k">🔥 {L2("Impatto del viaggio", "Trip impact")}</div>
                <div className="bar"><span style={{ background: `linear-gradient(90deg, ${impactColor(0)}, ${impactColor(0.5)}, ${impactColor(1)})` }} /></div>
                <div className="ends"><span>{L2("basso", "low")}</span><span>{L2("alto", "high")}</span></div>
              </div>
            </div>

            {/* Timeline navigatore */}
            {years.length > 0 && (
              <div className="atlas-tl">
                <div className="atlas-tl-years">
                  <button className={"atlas-yr" + (focusYear == null ? " on" : "")} onClick={() => setFocusYear(null)}>{L2("Tutti", "All")}</button>
                  {years.map(y => {
                    const info = byYear.find(b => b.year === y);
                    return (
                      <button key={y} className={"atlas-yr" + (focusYear === y ? " on" : "")} onClick={() => { setSelId(null); setFocusYear(focusYear === y ? null : y); }}>
                        {y}<span className="cnt">{info?.count ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="atlas-tl-foot">
                  <span>{focusYear == null ? L2("Scegli un anno per vedere solo quei viaggi.", "Pick a year to see only those journeys.") : L2(`Stai vedendo il ${focusYear}.`, `Viewing ${focusYear}.`)}</span>
                  <button className="atlas-play" onClick={togglePlay}>{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? L2("Pausa", "Pause") : L2("Riproduci viaggio", "Play journey")}</button>
                </div>
              </div>
            )}
          </div>

          <aside className="atlas-side">
            {sel ? (
              <div className="atlas-selcard">
                <button className="atlas-sel-x" onClick={deselect}><X size={16} /></button>
                {sel.hero && <div className="atlas-sel-hero" style={{ backgroundImage: `url(${unsplashSized(sel.hero, 520)})` }} />}
                <div className="atlas-sel-body">
                  <h3>{sel.name}</h3>
                  <div className="atlas-sel-meta">{sel.dateLabel}{sel.days ? ` · ${sel.days} ${sel.days === 1 ? L2("giorno", "day") : L2("giorni", "days")}` : ""}</div>
                  {sel.emotion && <span className="atlas-sel-tag" style={{ ["--c" as any]: EMO_COLOR[sel.emotion] }}>★ {emoLabel(sel.emotion)}</span>}
                  {sel.quote && <p className="atlas-sel-quote">{sel.quote}</p>}
                  <div className="atlas-sel-stats">
                    {sel.budget != null && sel.budget > 0 && <div><span className="n">€{Math.round(sel.budget)}</span><span className="l">{L2("budget", "budget")}</span></div>}
                    {sel.days > 0 && <div><span className="n">{sel.days}</span><span className="l">{L2("giorni", "days")}</span></div>}
                    <div><span className="n">{Math.round(sel.impact * 100)}</span><span className="l">{L2("impatto", "impact")}</span></div>
                  </div>
                  <div className="atlas-emo">
                    <div className="k">{L2("Che viaggio è stato?", "What kind of trip was it?")}</div>
                    <div className="atlas-emo-row">
                      {EMO_ORDER.map(e => (
                        <button key={e} className={"atlas-emo-chip" + (sel.emotion === e ? " on" : "")} style={{ ["--c" as any]: EMO_COLOR[e] }} onClick={() => saveEmotion(sel.emotion === e ? null : e)}>{emoLabel(e)}</button>
                      ))}
                    </div>
                  </div>
                  <a className="atlas-sel-cta" href={sel.href}>{L2("Apri il journey", "Open the journey")} <ArrowRight size={15} /></a>
                </div>
              </div>
            ) : (
              <>
                <div className="atlas-panel">
                  <div className="atlas-panel-h">{L2("I tuoi viaggi in numeri", "Your journey in numbers")}</div>
                  <div className="atlas-nums">
                    <div><span className="n">{stats?.trips ?? nodes.length}</span><span className="l">{L2("Viaggi", "Trips")}</span></div>
                    <div><span className="n">{stats?.days ?? 0}</span><span className="l">{L2("Giorni", "Days")}</span></div>
                    <div><span className="n">{stats?.cities ?? nodes.length}</span><span className="l">{L2("Luoghi", "Places")}</span></div>
                    <div><span className="n">{stats?.continents ?? 0}</span><span className="l">{L2("Continenti", "Continents")}</span></div>
                    <div className="wide"><span className="n gold">{worldPct}%</span><span className="l">{L2("del mondo", "of the world")}</span></div>
                  </div>
                </div>
                {topPlaces.length > 0 && (
                  <div className="atlas-panel atlas-top">
                    <div className="atlas-panel-h">{L2("Luoghi che ti hanno segnato", "Places that shaped you")}</div>
                    {topPlaces.map(n => (
                      <button className="atlas-top-row" key={n.id} onClick={() => selectNode(n.id)}>
                        <span className="star" style={{ color: n.color }}>★</span>
                        <span className="nm">{n.name}</span>
                        <span className="imp"><span style={{ width: `${Math.round(n.impact * 100)}%`, background: n.color }} /></span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="atlas-hint"><MapPin size={13} /> {L2("Tocca un luogo per rivederne il viaggio sulla mappa.", "Tap a place to replay its journey on the map.")}</div>
              </>
            )}
          </aside>
        </div>
      )}

      {/* ── TIMELINE (cronologia) ── */}
      {tab === "timeline" && (
        <div className="atlas-timelineview">
          {years.slice().reverse().map(y => (
            <div className="atlas-tv-year" key={y}>
              <div className="atlas-tv-yhead"><span className="yy">{y}</span><span className="yx">{(() => { const c = nodes.filter(n => n.year === y).length; return `${c} ${c === 1 ? L2("viaggio", "trip") : L2("viaggi", "trips")}`; })()}</span></div>
              <div className="atlas-tv-row">
                {nodes.filter(n => n.year === y).map(n => (
                  <button key={n.id} className="atlas-tv-card" onClick={() => { setTab("geo"); selectNode(n.id); }}>
                    {n.hero && <span className="ph" style={{ backgroundImage: `url(${unsplashSized(n.hero, 420)})` }} />}
                    <span className="ov"><span className="nm">{n.name}</span><span className="mt">{n.dateLabel}{n.days ? ` · ${n.days}${L2("g", "d")}` : ""}</span></span>
                    <span className="dot" style={{ background: n.color }} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EVOLUZIONE (crescita per anno) ── */}
      {tab === "evo" && (
        <div className="atlas-evoview">
          {headline && <p className="atlas-evo-lead">{headline}</p>}
          <div className="atlas-evo-track">
            {byYear.map((y, i) => (
              <div className="atlas-evo-step" key={y.year}>
                <span className="dot" style={{ background: y.emo ? EMO_COLOR[y.emo] : "var(--accent)" }} />
                <div className="bd">
                  <div className="yy">{y.year}</div>
                  <div className="mx">{y.count} {y.count === 1 ? L2("viaggio", "trip") : L2("viaggi", "trips")} · {y.days} {L2("giorni", "days")}{y.top ? ` · ${y.top}` : ""}</div>
                  <div className="ct">{L2("Mondo esplorato", "World explored")}: {cumulativeContinents[i]?.n ?? 0} {L2("continenti", "continents")}{y.emo ? ` · ${emoLabel(y.emo)}` : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {fullscreen && <button className="atlas-fs-close" onClick={() => setFullscreen(false)}><X size={18} /></button>}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
