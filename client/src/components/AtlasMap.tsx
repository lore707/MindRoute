/**
 * AtlasMap.tsx — la mappa della collezione (redesign 2026-07-18).
 * ───────────────────────────────────────────────────────────────
 * Mappa CONTROLLATA e riutilizzabile: NON possiede header, tab, filtri o
 * timeline. Riceve `trips` GIÀ FILTRATI dal contenitore (CollectionView) e
 * mostra un marker per itinerario. È una delle due prospettive della stessa
 * collezione — l'altra è la griglia di card.
 *
 * REGOLA CARDINE — la mappa non è MAI rumorosa:
 *   · Stato normale: SOLO marker. Nessuna linea. La mappa respira.
 *   · Le linee compaiono SOLO su hover/click di un viaggio e disegnano SOLO
 *     il percorso interno di QUEL viaggio (le sue tappe reali), animato; al
 *     rilascio la mappa torna pulita.
 *   · Il marker comunica impatto/emozione via DIMENSIONE, COLORE, GLOW.
 *
 * Stesso linguaggio grafico del Journey: tile CARTO dark, glow controllati,
 * pannello di dettaglio glass. Tutto DERIVATO da dati reali.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Maximize2, Minimize2, X, ArrowRight, MapPin } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
import type { AtlasData } from "./AccountAtlas";
import type { AccountData } from "./AccountCinematic";

const CARTO = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_ATTR = '&copy; <a href="https://carto.com/attributions">CARTO</a>';

export type Emotion = "life-changing" | "meaningful" | "loved" | "not-for-me" | "revisited";
export const EMO_COLOR: Record<Emotion, string> = {
  "life-changing": "#E94560", meaningful: "#9D7EBC", loved: "#6FB4A8", "not-for-me": "#8a5560", revisited: "#D4A853",
};
const EMO_ORDER: Emotion[] = ["life-changing", "meaningful", "loved", "not-for-me", "revisited"];

export function impactColor(v: number): string {
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

type Props = {
  atlas: AtlasData | null;
  trips: AccountData["trips"];        // GIÀ filtrati dal contenitore
  savedMoments?: AccountData["savedMoments"];
  onSaveEmotion?: (itineraryId: number, emotion: Emotion | null) => void;
  initialSelId?: number | null;       // solo per la preview dev
  initialFullscreen?: boolean;
};

export function AtlasMap({ atlas, trips, savedMoments, onSaveEmotion, initialSelId = null, initialFullscreen = false }: Props) {
  const { t, lang } = useI18n();
  const L2 = (it: string, en: string) => (lang === "it" ? it : en);

  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const routeRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const routeAnim = useRef<number | null>(null);

  const [selId, setSelId] = useState<number | null>(initialSelId);
  const [hoverId, setHoverId] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(initialFullscreen);
  const [localEmotion, setLocalEmotion] = useState<Record<number, Emotion | null>>({});

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  // ── Nodi: join atlas.places × trips filtrati (1 marker per itinerario) ──
  const nodes = useMemo<Node[]>(() => {
    const places = atlas?.places ?? [];
    const tripByHref = new Map<string, AccountData["trips"][number]>();
    for (const tr of trips) if (tr.href) tripByHref.set(tr.href, tr);
    const heartsByItin = new Map<number, number>();
    for (const m of (savedMoments ?? [])) heartsByItin.set(m.itineraryId, (heartsByItin.get(m.itineraryId) ?? 0) + 1);

    const raw = places
      .filter(p => tripByHref.has(p.href)) // solo i luoghi il cui viaggio è nel set filtrato
      .map(p => {
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

  // Se il filtro esterno rimuove il viaggio selezionato, deseleziona.
  useEffect(() => {
    if (selId != null && !nodes.some(n => n.id === selId)) setSelId(null);
  }, [nodes, selId]);

  // ── Leaflet init ──
  useEffect(() => {
    if (!mapEl.current || nodes.length === 0 || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true, worldCopyJump: true, minZoom: 2 });
    map.setView([25, 10], 2); // Leaflet richiede center+zoom prima di ogni proiezione/fitBounds
    mapRef.current = map;
    L.tileLayer(CARTO, { attribution: CARTO_ATTR, subdomains: "abcd", maxZoom: 10 }).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    routeRef.current = L.layerGroup().addTo(map);
    fitScene(map, false);
    setTimeout(() => { map.invalidateSize(); }, 60);
    return () => { map.off(); map.remove(); mapRef.current = null; routeRef.current = null; markersRef.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // ── Marker (ricreati su cambio nodi) + refit se nessuna selezione ──
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
        .on("click", () => setSelId(n.id))
        .on("mouseover", () => { if (!isMobile) setHoverId(n.id); })
        .on("mouseout", () => { if (!isMobile) setHoverId(null); })
        .addTo(map);
      mk.bindTooltip(`<b>${escapeHtml(n.name)}</b>${n.dateLabel ? ` · ${n.dateLabel}` : ""}`,
        { className: "atlas-tip", direction: "top", offset: [0, -10], opacity: 1 });
      markersRef.current.set(n.id, mk);
    }
    applyStyles();
    if (selId == null) fitScene(map, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // Evidenza (hover/selezione) + percorso del viaggio attivo.
  useEffect(() => {
    applyStyles();
    const activeId = selId ?? hoverId;
    if (activeId != null) drawRoute(activeId, selId != null);
    else clearRoute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, hoverId, nodes]);

  // La camera segue la selezione (click o programmatica): vola sulle tappe.
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
  }, [fullscreen]);

  function fitScene(map: L.Map, animate: boolean) {
    if (nodes.length === 0) { map.setView([25, 10], 2, { animate }); return; }
    const b = L.latLngBounds(nodes.map(n => [n.lat, n.lng] as [number, number]));
    const opts = { padding: [70, 70] as [number, number], maxZoom: nodes.length === 1 ? 6 : 5 };
    if (animate) map.flyToBounds(b, { ...opts, duration: 0.8 });
    else map.fitBounds(b, opts);
  }

  function applyStyles() {
    const activeId = selId ?? hoverId;
    for (const n of nodes) {
      const mk = markersRef.current.get(n.id);
      const el = mk && (mk as any)._icon as HTMLElement | undefined;
      if (!el) continue;
      const dim = activeId != null && n.id !== activeId; // desatura gli altri quando uno è attivo
      el.style.transition = "opacity .5s ease, filter .4s ease, transform .3s ease";
      el.style.opacity = dim ? "0.28" : "1";
      el.style.filter = dim ? "grayscale(.7)" : "none";
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

  useEffect(() => () => { if (routeAnim.current) cancelAnimationFrame(routeAnim.current); }, []);

  const saveEmotion = (emo: Emotion | null) => {
    if (selId == null) return;
    setLocalEmotion(prev => ({ ...prev, [selId]: emo }));
    onSaveEmotion?.(selId, emo);
  };
  const emoLabel = (e: Emotion) => t(`atl.emo.${e}`);

  if (nodes.length === 0) {
    return <div className="atlas-empty">{L2("Nessun viaggio da mostrare sulla mappa con questi filtri.", "No trips to show on the map with these filters.")}</div>;
  }

  return (
    <div className={"atlasmap" + (fullscreen ? " fs" : "")}>
      <div className="atlas-mapcard">
        <div className="atlas-map" ref={mapEl} />

        <div className="atlas-legend">
          {EMO_ORDER.map(e => (<span className="atlas-lg" key={e}><span className="d" style={{ background: EMO_COLOR[e] }} />{emoLabel(e)}</span>))}
        </div>

        <button className="atlas-fs" onClick={() => setFullscreen(v => !v)}>
          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span>{fullscreen ? L2("Riduci", "Minimise") : L2("Schermo intero", "Full screen")}</span>
        </button>

        <div className="atlas-heat">
          <div className="k">{L2("Impatto dei viaggi", "Trip impact")}</div>
          <div className="bar"><span style={{ background: `linear-gradient(90deg, ${impactColor(0)}, ${impactColor(0.5)}, ${impactColor(1)})` }} /></div>
          <div className="ends"><span>{L2("basso", "low")}</span><span>{L2("alto", "high")}</span></div>
        </div>

        {!sel && <div className="atlas-maphint"><MapPin size={13} /> {L2("Tocca un marker per aprire il viaggio.", "Tap a marker to open the trip.")}</div>}

        {/* Pannello di dettaglio — appare solo su selezione (glass, slide-in) */}
        {sel && (
          <aside className="atlas-detail">
            <button className="atlas-sel-x" onClick={() => setSelId(null)} aria-label="×"><X size={16} /></button>
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
              <a className="atlas-sel-cta" href={sel.href}>{L2("Apri itinerario", "Open itinerary")} <ArrowRight size={15} /></a>
            </div>
          </aside>
        )}
      </div>

      {fullscreen && <button className="atlas-fs-close" onClick={() => setFullscreen(false)}><X size={18} /></button>}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
