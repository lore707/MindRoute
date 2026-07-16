/**
 * AtlasJourney.tsx — Atlas narrativo (redesign 2026-07).
 * ───────────────────────────────────────────────────────────────
 * NON una mappa geografica: la rappresentazione visiva della MEMORIA del
 * viaggiatore. Ogni viaggio è un nodo luminoso; i viaggi sono connessi in
 * ordine CRONOLOGICO da filamenti bezier luminosi (costellazioni, non GPS).
 * Il colore nasce dall'emozione del viaggio (scelta dall'utente) o, in
 * assenza, dall'impatto reale (momenti cuorati + confermato + giorni).
 *
 * 4 aree: mappa (dominante) · timeline narrativa trascinabile (Play Journey) ·
 * sidebar (numeri, insight AI, top places, viaggio selezionato) · full-screen.
 *
 * Tutto DERIVATO da dati reali (regola ferrea): coordinate geocodate, date
 * reali, impatto = momenti col cuore. Budget mostrato solo se reale (v2);
 * temperatura/momento-migliore/emozione-chart OMESSI (dato non disponibile).
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Maximize2, Minimize2, Play, Pause, X, ArrowRight, Share2 } from "lucide-react";
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

// Impatto → colore (default senza emozione): freddo (basso) → caldo (alto).
function impactColor(v: number): string {
  const stops = [[94, 140, 182], [212, 168, 83], [233, 69, 96]]; // blu → oro → rosso
  const t = Math.max(0, Math.min(1, v));
  const seg = t < 0.5 ? 0 : 1, k = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const a = stops[seg], b = stops[seg + 1];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

type Node = {
  id: number; name: string; lat: number; lng: number; days: number; dateMs: number; dateLabel: string;
  hero: string | null; continent: string | null; href: string; emotion?: Emotion; quote?: string;
  budget?: number | null; impact: number; color: string; taken?: boolean;
};

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
  const linesRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Map<number, L.Marker>>(new Map());
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Init da URL SOLO per la preview dev degli screenshot (innocuo altrove).
  const aqp = (k: string): string | null => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };
  const [selId, setSelId] = useState<number | null>(aqp("asel") ? Number(aqp("asel")) : null);
  const [fullscreen, setFullscreen] = useState(aqp("afs") === "1");
  const [playing, setPlaying] = useState(false);
  const [cursorMs, setCursorMs] = useState<number>(Infinity); // timeline playhead
  const [localEmotion, setLocalEmotion] = useState<Record<number, Emotion | null>>({});
  const playRef = useRef<number | null>(null);

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);

  // ── Nodi: join atlas.places (coord) × trips (data/emozione/racconto) + impatto ──
  const nodes = useMemo<Node[]>(() => {
    const places = atlas?.places ?? [];
    const tripByHref = new Map<string, AccountData["trips"][number]>();
    for (const tr of trips) if (tr.href) tripByHref.set(tr.href, tr);
    // impatto grezzo = #momenti cuorati (×2) + confermato + giorni/7
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
        emotion: (localEmotion[id] ?? tr?.emotion) as Emotion | undefined, impRaw,
        dateLabel: dateMs && !isNaN(dateMs) ? new Date(dateMs).toLocaleDateString(lang === "it" ? "it-IT" : "en-US", { month: "short", year: "numeric" }) : "",
      };
    }).filter(n => Number.isFinite(n.lat) && Number.isFinite(n.lng));

    const maxImp = Math.max(1, ...raw.map(n => n.impRaw));
    return raw
      .map(n => {
        const impact = n.impRaw / maxImp;
        const color = n.emotion ? EMO_COLOR[n.emotion] : impactColor(impact);
        return { ...n, impact, color } as Node;
      })
      .sort((a, b) => (a.dateMs || 0) - (b.dateMs || 0));
  }, [atlas, trips, savedMoments, localEmotion, lang]);

  const sel = useMemo(() => nodes.find(n => n.id === selId) ?? null, [nodes, selId]);
  const visibleNodes = useMemo(() => nodes.filter(n => !n.dateMs || n.dateMs <= cursorMs), [nodes, cursorMs]);

  // ── Timeline: anni + posizione cronologica ──
  const timeline = useMemo(() => {
    const dated = nodes.filter(n => n.dateMs && !isNaN(n.dateMs));
    if (dated.length === 0) return null;
    const min = dated[0].dateMs, max = dated[dated.length - 1].dateMs;
    const span = Math.max(1, max - min);
    const y0 = new Date(min).getFullYear(), y1 = new Date(max).getFullYear();
    const years: number[] = [];
    for (let y = y0; y <= y1 + 1; y++) years.push(y);
    const pos = (ms: number) => ((ms - min) / span) * 100;
    return { min, max, span, years, pos };
  }, [nodes]);

  // ── Leaflet init ──
  useEffect(() => {
    if (!mapEl.current || nodes.length === 0 || mapRef.current) return;
    const map = L.map(mapEl.current, { zoomControl: false, attributionControl: true, worldCopyJump: true, minZoom: 2 });
    mapRef.current = map;
    L.tileLayer(CARTO, { attribution: CARTO_ATTR, subdomains: "abcd", maxZoom: 10 }).addTo(map);
    L.control.zoom({ position: "bottomleft" }).addTo(map);

    // Linee costellazione = Leaflet polyline (proiezione/pan/zoom automatici).
    // Layer sotto i marker così i nodi restano cliccabili sopra i filamenti.
    linesRef.current = L.layerGroup().addTo(map);

    const bounds = L.latLngBounds(nodes.map(n => [n.lat, n.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [70, 70], maxZoom: 5 });
    setTimeout(() => { map.invalidateSize(); buildLines(); }, 60);

    return () => { map.off(); map.remove(); mapRef.current = null; linesRef.current = null; markersRef.current.clear(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length]);

  // ── Marker (ricreati quando cambiano nodi/emozioni) ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();
    for (const n of nodes) {
      const icon = L.divIcon({
        className: "atlas-node-wrap",
        html: `<span class="atlas-node" style="--c:${n.color}"><span class="an-core"></span></span>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      });
      const mk = L.marker([n.lat, n.lng], { icon, riseOnHover: true, keyboard: false })
        .on("click", () => selectNode(n.id))
        .addTo(map);
      mk.bindTooltip(`<b>${escapeHtml(n.name)}</b>${n.dateLabel ? ` · ${n.dateLabel}` : ""}${n.days ? ` · ${n.days}${lang === "it" ? "g" : "d"}` : ""}`,
        { className: "atlas-tip", direction: "top", offset: [0, -12], opacity: 1 });
      markersRef.current.set(n.id, mk);
    }
    applyVisibility();
    buildLines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes]);

  // ── Visibilità (timeline) + selezione: opacità marker + linee ──
  useEffect(() => { applyVisibility(); buildLines(); /* eslint-disable-next-line */ }, [cursorMs, selId]);

  function applyVisibility() {
    for (const n of nodes) {
      const mk = markersRef.current.get(n.id);
      if (!mk) continue;
      const vis = !n.dateMs || n.dateMs <= cursorMs;
      const el = (mk as any)._icon as HTMLElement | undefined;
      if (el) {
        el.style.opacity = vis ? "1" : "0";
        el.style.transition = "opacity .6s ease, transform .3s ease";
        el.classList.toggle("sel", n.id === selId);
      }
    }
  }

  // Punti bezier interpolati (arco morbido) in spazio lat/lng: Leaflet li
  // proietta e li mantiene su pan/zoom senza reprojezione manuale.
  function bezierLatLng(a: Node, b: Node, n = 26): [number, number][] {
    const mLat = (a.lat + b.lat) / 2, mLng = (a.lng + b.lng) / 2;
    const dLat = b.lat - a.lat, dLng = b.lng - a.lng, len = Math.hypot(dLat, dLng) || 1;
    const off = Math.min(14, len * 0.16);
    const cLat = mLat + (-dLng / len) * off, cLng = mLng + (dLat / len) * off;
    const out: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * a.lat + 2 * u * t * cLat + t * t * b.lat, u * u * a.lng + 2 * u * t * cLng + t * t * b.lng]);
    }
    return out;
  }

  // Filamenti luminosi: due polyline per segmento (alone largo tenue + core),
  // colore del viaggio di destinazione. Selezione → segmenti adiacenti più vivi.
  function buildLines() {
    const layer = linesRef.current;
    if (!layer) return;
    layer.clearLayers();
    for (let i = 0; i < nodes.length - 1; i++) {
      const na = nodes[i], nb = nodes[i + 1];
      const visA = !na.dateMs || na.dateMs <= cursorMs, visB = !nb.dateMs || nb.dateMs <= cursorMs;
      if (!(visA && visB)) continue;
      const active = selId != null && (na.id === selId || nb.id === selId);
      const pts = bezierLatLng(na, nb);
      L.polyline(pts, { color: nb.color, weight: active ? 9 : 7, opacity: active ? 0.22 : 0.12, className: "atlas-line-halo", interactive: false, smoothFactor: 1 }).addTo(layer);
      L.polyline(pts, { color: nb.color, weight: active ? 2.6 : 1.8, opacity: active ? 0.95 : 0.5, className: "atlas-line-core", interactive: false, smoothFactor: 1 }).addTo(layer);
    }
  }

  function selectNode(id: number) {
    setSelId(id);
    const n = nodes.find(x => x.id === id);
    const map = mapRef.current;
    if (n && map) map.flyTo([n.lat, n.lng], Math.max(map.getZoom(), 4), { duration: 0.7 });
  }

  // ── Play Journey: cursore da min a max, camera + sidebar seguono ──
  const togglePlay = () => {
    if (playing) { if (playRef.current) cancelAnimationFrame(playRef.current); setPlaying(false); return; }
    if (!timeline) return;
    setPlaying(true);
    setCursorMs(timeline.min);
    const dur = 9000, start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / dur);
      const ms = timeline.min + timeline.span * k;
      setCursorMs(ms);
      // seleziona l'ultimo nodo comparso
      const appeared = nodes.filter(x => x.dateMs && x.dateMs <= ms);
      const last = appeared[appeared.length - 1];
      if (last && last.id !== selId) selectNode(last.id);
      if (k < 1) playRef.current = requestAnimationFrame(step);
      else { setPlaying(false); setCursorMs(Infinity); }
    };
    playRef.current = requestAnimationFrame(step);
  };
  useEffect(() => () => { if (playRef.current) cancelAnimationFrame(playRef.current); }, []);

  // Full-screen → invalida la mappa dopo il resize del container.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const id = setTimeout(() => { map.invalidateSize(); buildLines(); }, 220);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullscreen]);

  // Drag timeline
  const tlRef = useRef<HTMLDivElement | null>(null);
  const onTlDrag = (clientX: number) => {
    const el = tlRef.current; if (!el || !timeline) return;
    const r = el.getBoundingClientRect();
    const k = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    setCursorMs(timeline.min + timeline.span * k);
  };

  const stats = atlas?.stats;
  const worldPct = stats ? Math.round((stats.continents / 7) * 100) : 0;
  const topPlaces = useMemo(() => [...nodes].sort((a, b) => b.impact - a.impact).slice(0, 3), [nodes]);

  // Insight per anno (reale): anno → #viaggi + continente top.
  const byYear = useMemo(() => {
    const m = new Map<number, { count: number; conts: Record<string, number> }>();
    for (const n of nodes) {
      if (!n.dateMs) continue;
      const y = new Date(n.dateMs).getFullYear();
      const e = m.get(y) ?? { count: 0, conts: {} };
      e.count += 1; if (n.continent) e.conts[n.continent] = (e.conts[n.continent] ?? 0) + 1;
      m.set(y, e);
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]).map(([y, e]) => ({
      year: y, count: e.count, top: Object.entries(e.conts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    }));
  }, [nodes]);

  const saveEmotion = (emo: Emotion | null) => {
    if (selId == null) return;
    setLocalEmotion(prev => ({ ...prev, [selId]: emo }));
    onSaveEmotion?.(selId, emo);
  };

  if (nodes.length === 0) {
    return <div className="atlas-empty">{L2("La tua mappa si popola appena generi il primo itinerario.", "Your map fills in as soon as you generate your first itinerary.")}</div>;
  }

  const emoLabel = (e: Emotion) => t(`atl.emo.${e}`);

  return (
    <div className={"atlas-journey" + (fullscreen ? " fs" : "")} ref={rootRef}>
      <div className="atlas-grid">
        {/* MAPPA + timeline */}
        <div className="atlas-main">
          <div className="atlas-mapcard">
            <div className="atlas-map" ref={mapEl} />
            <div className="atlas-legend">
              {EMO_ORDER.map(e => (
                <span className="atlas-lg" key={e}><span className="d" style={{ background: EMO_COLOR[e] }} />{emoLabel(e)}</span>
              ))}
            </div>
            <button className="atlas-fs" onClick={() => setFullscreen(v => !v)} title={fullscreen ? L2("Riduci", "Minimise") : L2("Schermo intero", "Full screen")}>
              {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              <span>{fullscreen ? L2("Riduci", "Minimise") : L2("Schermo intero", "Full screen")}</span>
            </button>
            <div className="atlas-heat">
              <div className="k">🔥 {L2("Impatto del viaggio", "Trip impact")}</div>
              <div className="bar"><span style={{ background: `linear-gradient(90deg, ${impactColor(0)}, ${impactColor(0.5)}, ${impactColor(1)})` }} /></div>
              <div className="ends"><span>{L2("basso", "low")}</span><span>{L2("alto", "high")}</span></div>
            </div>
          </div>

          {/* Timeline narrativa */}
          {timeline && (
            <div className="atlas-tl">
              <div className="atlas-tl-track" ref={tlRef}
                onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); onTlDrag(e.clientX); }}
                onPointerMove={(e) => { if (e.buttons === 1) onTlDrag(e.clientX); }}>
                <div className="atlas-tl-line" />
                {timeline.years.map(y => (
                  <span className="atlas-tl-year" key={y} style={{ left: `${timeline.pos(new Date(y, 0, 1).getTime())}%` }}>{y}</span>
                ))}
                {nodes.filter(n => n.dateMs).map(n => (
                  <button key={n.id} className={"atlas-tl-dot" + (n.id === selId ? " sel" : "")}
                    style={{ left: `${timeline.pos(n.dateMs)}%`, background: n.color }}
                    onClick={(e) => { e.stopPropagation(); selectNode(n.id); }} title={`${n.name} · ${n.dateLabel}`} />
                ))}
                {cursorMs !== Infinity && (
                  <div className="atlas-tl-head" style={{ left: `${timeline.pos(Math.min(cursorMs, timeline.max))}%` }} />
                )}
              </div>
              <div className="atlas-tl-foot">
                <span>{L2("Trascina per esplorare i tuoi viaggi nel tempo.", "Drag to explore your journeys over time.")}</span>
                <button className="atlas-play" onClick={togglePlay}>
                  {playing ? <Pause size={14} /> : <Play size={14} />}{playing ? L2("Pausa", "Pause") : L2("Riproduci viaggio", "Play journey")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <aside className="atlas-side">
          {sel ? (
            <div className="atlas-selcard">
              <button className="atlas-sel-x" onClick={() => setSelId(null)}><X size={16} /></button>
              {sel.hero && <div className="atlas-sel-hero" style={{ backgroundImage: `url(${unsplashSized(sel.hero, 520)})` }} />}
              <div className="atlas-sel-body">
                <h3>{sel.name}</h3>
                <div className="atlas-sel-meta">{sel.dateLabel}{sel.days ? ` · ${sel.days} ${sel.days === 1 ? L2("giorno", "day") : L2("giorni", "days")}` : ""}</div>
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
                      <button key={e} className={"atlas-emo-chip" + (sel.emotion === e ? " on" : "")}
                        style={{ ["--c" as any]: EMO_COLOR[e] }} onClick={() => saveEmotion(sel.emotion === e ? null : e)}>
                        {emoLabel(e)}
                      </button>
                    ))}
                  </div>
                </div>
                <a className="atlas-sel-cta" href={sel.href}>{L2("Apri questo viaggio", "Open this journey")} <ArrowRight size={15} /></a>
              </div>
            </div>
          ) : (
            <>
              <div className="atlas-panel atlas-numbers">
                <div className="atlas-panel-h">{L2("I tuoi viaggi in numeri", "Your journey in numbers")}</div>
                <div className="atlas-nums">
                  <div><span className="n">{stats?.trips ?? nodes.length}</span><span className="l">{L2("Viaggi", "Trips")}</span></div>
                  <div><span className="n">{stats?.days ?? 0}</span><span className="l">{L2("Giorni in viaggio", "Days on the road")}</span></div>
                  <div><span className="n">{stats?.cities ?? nodes.length}</span><span className="l">{L2("Luoghi", "Places")}</span></div>
                  <div><span className="n">{stats?.continents ?? 0}</span><span className="l">{L2("Continenti", "Continents")}</span></div>
                  <div className="wide"><span className="n gold">{worldPct}%</span><span className="l">{L2("del mondo", "of the world")}</span></div>
                </div>
              </div>

              {(headline || byYear.length > 0) && (
                <div className="atlas-panel atlas-insight">
                  <div className="atlas-panel-h accent">✦ {L2("Insight AI", "AI insight")}</div>
                  <div className="atlas-insight-t">{L2("La tua evoluzione, in movimento", "Your evolution in motion")}</div>
                  {headline && <p className="atlas-insight-x">{headline}</p>}
                  <div className="atlas-years">
                    {byYear.map(y => (
                      <div className="atlas-year" key={y.year}>
                        <span className="yy">{y.year}</span>
                        <span className="yx">{y.count} {y.count === 1 ? L2("viaggio", "trip") : L2("viaggi", "trips")}{y.top ? ` · ${y.top}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
            </>
          )}
        </aside>
      </div>

      {fullscreen && <button className="atlas-fs-close" onClick={() => setFullscreen(false)}><X size={18} /></button>}
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
