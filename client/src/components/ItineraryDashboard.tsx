/**
 * ItineraryDashboard.tsx
 * ───────────────────────────────────────────────────────────────
 * La sezione itinerario in versione "dashboard" — stessa app-shell della
 * dashboard account (sidebar a icone + topbar + viste a tab), riusa i token e
 * lo shell `.account-dash` (vedi styles/itinerary-dashboard.css).
 *
 * Viste: Panoramica · Giorni · Mappa · Pratica · Prenota(Missioni).
 * Presentational: consuma lo stesso `ItineraryData` di ItineraryRedesign +
 * l'itinerario grezzo (per budget/come-arrivare/bagaglio) + gli affiliateUrls.
 * L'editing (Modalità Cura) è delegato al collaudato ItineraryRedesign tramite
 * `onEdit` → il parent fa lo switch, così zero regressioni sul salvataggio.
 *
 * Bilingue (EN/IT) via useI18n. I testi "voce" generati dall'Aot (manifesto,
 * descrizioni dei momenti) arrivano già nella lingua dell'utente.
 * ─────────────────────────────────────────────────────────────── */

import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Compass, Layers, CalendarDays, Map as MapIcon, Backpack, Ticket,
  ExternalLink, Pencil, Printer, Share2, RotateCcw, Heart, ArrowLeft,
} from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
import type { ItineraryData, Moment } from "./ItineraryCinematic";
import { trackAffiliate, affiliateProvider } from "@/lib/analytics";
import { FlowNavLogo } from "@/components/FlowNav";

const bg = (url: string, w: number, q = 70) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

// Leaflet (~150KB) caricato solo quando si apre il tab Mappa.
const RouteMap = lazy(() => import("@/components/RouteMap"));

type ViewId = "overview" | "days" | "map" | "practical" | "missions";

type Props = {
  data: ItineraryData;
  itinerary: any;
  affiliateUrls: Record<string, string>;
  profilingInput: any;
  onSavePdf?: () => void;
  onStartOver?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  itineraryId?: number;
  savedMomentIds?: Set<string>;
  onToggleSaved?: (momentId: string, moment: Moment) => void;
};

const SEG_COLORS = ["#E94560", "#D4A853", "#6FB4A8", "#9D7EBC", "#5E8CB6", "#C77B5A"];

/* ── checklist (booking missions) persisted in localStorage ── */
type ChecklistItem = { id: string; checked: boolean };
const MISSION_DEFS = [
  { id: "flight", ic: "✈️", nameKey: "itd.mis.flight", metaKey: "itd.mis.flightMeta", urlKeys: ["expedia_flights"], day: 1 },
  { id: "hotel", ic: "🏨", nameKey: "itd.mis.hotel", metaKey: "itd.mis.hotelMeta", urlKeys: ["hotels", "tablet_hotels"], day: 1 },
  { id: "experience", ic: "🎟", nameKey: "itd.mis.experience", metaKey: "itd.mis.experienceMeta", urlKeys: ["civitatis", "musement", "klook", "viator"], day: null },
  { id: "restaurant", ic: "🍽", nameKey: "itd.mis.restaurant", metaKey: "itd.mis.restaurantMeta", urlKeys: ["tripadvisor"], day: 1 },
  { id: "transfer", ic: "🚌", nameKey: "itd.mis.transfer", metaKey: "itd.mis.transferMeta", urlKeys: ["flixbus", "samboat", "expedia_cars"], day: null },
] as const;

function useMissions(itineraryId: number | undefined) {
  const key = `mindroute_checklist_${itineraryId ?? 0}`;
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!itineraryId) return;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        // migrate from old array shape [{id,checked}] → record
        if (Array.isArray(parsed)) {
          const rec: Record<string, boolean> = {};
          parsed.forEach((i: ChecklistItem) => { rec[i.id] = !!i.checked; });
          setChecked(rec);
        } else setChecked(parsed ?? {});
      }
    } catch { /* ignore */ }
  }, [itineraryId]);
  const toggle = (id: string) => setChecked(prev => {
    const next = { ...prev, [id]: !prev[id] };
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  return { checked, toggle };
}

/* ── safe JSON helpers ── */
function tryParse(s: any): any { try { return JSON.parse(s); } catch { return null; } }
function firstInt(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const m = String(s).replace(/[.\s]/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function Html({ html, as = "span", className }: { html: string; as?: any; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── grounded "where to stay" advantage ──────────────────────────────────────
 * Ricavato SOLO dai punti già geocodificati (Nominatim, non dal modello): qual è
 * la zona che tiene più tappe a piedi. Non vende "un hotel", vende il vantaggio
 * concreto da mostrare accanto al CTA alloggio — meno trasferimenti = più viaggio.
 * Stessa matematica honest del resto del progetto: haversine × 1.3 a 4.5 km/h. */
const WALK_KM = 1.3; // ~20 min a piedi: soglia oltre cui non è più "a piedi"
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const walkMin = (km: number) => Math.max(1, Math.round(((km * 1.3) / 4.5) * 60));

type StayAdvantage = { area: string; nearestMin: number; walkable: number; total: number };
function computeStayAdvantage(mapPoints: ItineraryData["mapPoints"]): StayAdvantage | null {
  const pts = (mapPoints ?? []).filter(p => p.lat != null && p.lng != null) as
    Array<{ lat: number; lng: number; label: string; category?: string }>;
  const stops = pts.filter(p => p.category !== "lodging" && p.category !== "custom" && p.label);
  if (stops.length < 3) return null; // sotto le 3 tappe il "dove dormire" non è un vantaggio reale

  // Anchor = hotel consigliato se l'itinerario ne geocodifica uno; altrimenti la
  // tappa che tiene più tappe a piedi (medoid pesato): la base ottimale dedotta
  // dalla sola geografia delle tappe.
  const lodging = pts.find(p => p.category === "lodging");
  let anchor: { lat: number; lng: number; label: string };
  if (lodging) {
    anchor = lodging;
  } else {
    let best = stops[0], bestCount = -1, bestSum = Infinity;
    for (const c of stops) {
      let count = 0, sum = 0;
      for (const s of stops) {
        if (s === c) continue;
        const d = haversineKm(c, s); sum += d; if (d <= WALK_KM) count++;
      }
      if (count > bestCount || (count === bestCount && sum < bestSum)) { best = c; bestCount = count; bestSum = sum; }
    }
    anchor = best;
  }

  let nearest = Infinity, walkable = 0;
  for (const s of stops) {
    if (s.lat === anchor.lat && s.lng === anchor.lng) continue;
    const d = haversineKm(anchor, s);
    if (d < nearest) nearest = d;
    if (d <= WALK_KM) walkable++;
  }
  // Mostriamo solo quando c'è un vantaggio onesto da vendere (≥2 tappe a piedi).
  if (walkable < 2 || !isFinite(nearest)) return null;
  return { area: anchor.label, nearestMin: walkMin(nearest), walkable, total: stops.length };
}

export function ItineraryDashboard({
  data, itinerary, affiliateUrls, profilingInput,
  onSavePdf, onStartOver, onEdit, onShare, itineraryId, savedMomentIds, onToggleSaved,
}: Props) {
  const { t, lang } = useI18n();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewId>("overview");
  const [stuck, setStuck] = useState(false);

  const days = data.days;
  const dayCount = days.length;
  const [activeDay, setActiveDay] = useState<number>(days[0]?.n ?? 1);
  const [openDay, setOpenDay] = useState<number | null>(days[0]?.n ?? null);
  const [, setActiveMoment] = useState(0);

  const { checked, toggle } = useMissions(itineraryId);

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);
  const heroW = isMobile ? 1100 : 1900;
  const cardW = isMobile ? 560 : 800;

  const tx = (key: string, vars: Record<string, string | number>) => {
    let s = t(key);
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };

  function go(id: ViewId) { setView(id); window.scrollTo({ top: 0, behavior: "auto" }); }

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  // ── ambient: immagini dei giorni, crossfade sul giorno attivo ──
  const dayImages = useMemo(() => days.map(d => d.img || data.heroImg).filter(Boolean), [days, data.heroImg]);
  const activeImgIdx = Math.max(0, days.findIndex(d => d.n === (openDay ?? activeDay)));

  // ── countdown / facts ──
  const leaveDate = profilingInput?.leaveDate ?? profilingInput?.travelDate ?? null;
  const daysUntil = useMemo(() => {
    if (!leaveDate) return null;
    const m = String(leaveDate).match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) return null;
    const d = new Date(m[1]); if (isNaN(d.getTime())) return null;
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    return diff > 0 ? diff : null;
  }, [leaveDate]);

  const stops = data.mapPoints?.length ?? 0;
  const momentCount = useMemo(
    () => Object.values(data.momentsByDay).reduce((a, ms) => a + ms.length, 0),
    [data.momentsByDay],
  );

  // ── manifesto con emWord evidenziato ──
  const manifestoHtml = useMemo(() => {
    const text = data.manifesto || "";
    if (!text) return "";
    const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (data.emWord) {
      const w = data.emWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return esc.replace(new RegExp(`(${w})`, "i"), "<em>$1</em>");
    }
    return esc;
  }, [data.manifesto, data.emWord]);

  // ── missions ──
  // Risolve URL + provider canonico dalla PRIMA chiave affiliate disponibile,
  // così l'evento affiliate_click riporta il partner reale (non l'id missione).
  const missionUrlAndProvider = (urlKeys: readonly string[]): { url?: string; provider?: string } => {
    for (const k of urlKeys) if (affiliateUrls[k]) return { url: affiliateUrls[k], provider: affiliateProvider(k) };
    return {};
  };
  const missions = useMemo(() => MISSION_DEFS
    .map(m => ({ ...m, ...missionUrlAndProvider(m.urlKeys) }))
    .filter(m => !!m.url), [affiliateUrls]);
  const doneCount = missions.filter(m => checked[m.id]).length;
  const missionTotal = missions.length || 1;
  const pct = Math.round((doneCount / missionTotal) * 100);
  const peakDay = days[Math.floor((dayCount - 1) / 2)]?.n ?? 1;

  // Vantaggio "dove dormire" calcolato dalle tappe geocodificate (grounded, non
  // dal modello): alimenta il copy concreto sul CTA alloggio.
  const stayAdvantage = useMemo(() => computeStayAdvantage(data.mapPoints), [data.mapPoints]);

  /* ════════════ sotto-render ════════════ */

  const ViewHead = ({ eyebrow, gold, title, sub, right }: {
    eyebrow: string; gold?: boolean; title: string; sub?: string; right?: ReactNode;
  }) => (
    <div className="view-head">
      <div className="vh-l">
        <button className="back" onClick={() => go("overview")}><ArrowLeft size={15} /> {t("itd.nav.overview")}</button>
        <div className={"vh-eyebrow" + (gold ? " gold" : "")}>{eyebrow}</div>
        <Html as="h1" className="vh-title" html={title} />
        {sub && <p className="vh-sub">{sub}</p>}
      </div>
      {right && <div className="vh-r">{right}</div>}
    </div>
  );

  /* ── OVERVIEW ── */
  const OverviewView = () => {
    // NB: queste funzioni-vista vengono invocate condizionalmente (es.
    // `view === "overview" && OverviewView()`), quindi NON devono chiamare hook
    // (violerebbe le Rules of Hooks → crash al cambio tab). Calcolo diretto.
    return (
      <div className="view">
        <section className="it-hero">
          <div className="it-hero-ph" style={{ backgroundImage: bg(data.heroImg, heroW, 65) }} />
          <div className="it-hero-veil" />
          <div className="it-hero-in">
            <div className="it-kick">
              <span>{t("itd.hero.kick")}</span>
              <span className="sep" />
              <span className="built">{data.subtitle}</span>
            </div>
            <h1 className="it-hero-title">{data.destination}</h1>
            {data.country && <div className="it-hero-sub">{data.country}</div>}
            <div className="it-facts">
              <div className="it-fact">
                <span className="n">{dayCount}</span>
                <span className="l">{dayCount === 1 ? t("itd.fact.day") : t("itd.fact.days")}</span>
              </div>
              {stops > 0 && (
                <div className="it-fact">
                  <span className="n">{stops}</span>
                  <span className="l">{stops === 1 ? t("itd.fact.stop") : t("itd.fact.stops")}</span>
                </div>
              )}
              <div className="it-fact">
                <span className="n"><em>{momentCount}</em></span>
                <span className="l">{momentCount === 1 ? t("itd.fact.moment") : t("itd.fact.moments")}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="content">
          {data.manifesto && (
            <section className="sec">
              <div className="sec-head">
                <div><div className="sec-eyebrow">{t("itd.why.eyebrow")}</div></div>
              </div>
              <div className="why">
                <Html as="div" className="why-quote" html={manifestoHtml} />
                {data.highlights.length > 0 && (
                  <div className="why-side">
                    <div className="why-side-mark">{t("itd.why.highlightsMark")}</div>
                    {data.highlights.slice(0, 4).map((h, i) => (
                      <div key={i} className="why-chip">
                        <span className="glyph">{h.ic}</span>
                        <span className="t">{h.name}{h.desc && <span>{h.desc}</span>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="sec">
            <div className="kit">
              <button className="kit-btn" onClick={onSavePdf}>
                <span className="ic"><Printer size={18} /></span>
                <span className="t">{t("itd.kit.pdf")}</span>
                <span className="s">{t("itd.kit.pdfSub")}</span>
              </button>
              {onShare && (
                <button className="kit-btn" onClick={onShare}>
                  <span className="ic"><Share2 size={18} /></span>
                  <span className="t">{t("itd.kit.share")}</span>
                  <span className="s">{t("itd.kit.shareSub")}</span>
                </button>
              )}
              {onEdit && (
                <button className="kit-btn" onClick={onEdit}>
                  <span className="ic"><Pencil size={18} /></span>
                  <span className="t">{t("itd.kit.edit")}</span>
                  <span className="s">{t("itd.kit.editSub")}</span>
                </button>
              )}
              <button className="kit-btn" onClick={onStartOver}>
                <span className="ic"><RotateCcw size={18} /></span>
                <span className="t">{t("itd.kit.restart")}</span>
                <span className="s">{t("itd.kit.restartSub")}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  };

  /* ── DAYS · Agenda (design "Giorno per Giorno") ──
     Solo design: struttura e contenuti restano quelli generati (v2). I momenti
     sono raggruppati nelle 4 fasce fisse (mattina/pranzo/pomeriggio/sera) via il
     campo `band`. Le 8 feature del README (booking-status, transfer, offline…)
     sono lofi/spec → non implementate. Booking CTA e cuore-salva preservati. */
  const DaysView = () => {
    const L = (it: string, en: string) => (lang === "it" ? it : en);
    const sel = days.find(d => d.n === activeDay) ?? days[0];
    const selMoments = sel ? (data.momentsByDay[sel.n] ?? []) : [];
    const tappe = selMoments.length;
    const BANDS = [
      { key: "mattina", label: L("Mattina", "Morning"), c: "var(--ag-gold)" },
      { key: "pranzo", label: L("Pranzo", "Lunch"), c: "var(--ag-teal)" },
      { key: "pomeriggio", label: L("Pomeriggio", "Afternoon"), c: "var(--ag-accent)" },
      { key: "sera", label: L("Sera", "Evening"), c: "var(--ag-peri)" },
    ] as const;
    const bandRange = (arr: typeof selMoments) => {
      const ts = arr.map(m => m.startTime).filter(Boolean) as string[];
      if (!ts.length) return "";
      return ts.length > 1 && ts[0] !== ts[ts.length - 1] ? `${ts[0]} – ${ts[ts.length - 1]}` : ts[0];
    };
    const selDay = (n: number) => { setActiveDay(n); setOpenDay(n); setActiveMoment(0); };

    return (
      <div className="view">
        <div className="mr-agenda">
          {/* masthead */}
          <div className="ag-mast">
            <div>
              <div className="ag-eyebrow">{data.destination}{dayCount ? ` · ${dayCount} ${dayCount === 1 ? L("giorno", "day") : L("giorni", "days")}` : ""}</div>
              <h1 className="ag-h1">{L("Il piano, ", "The plan, ")}<em>{L("ora per ora", "hour by hour")}</em>.</h1>
              <div className="ag-lede">{L(
                "Ogni giornata segue la stessa struttura — Mattina · Pranzo · Pomeriggio · Sera — con tappe, durata e costi a colpo d'occhio.",
                "Every day follows the same structure — Morning · Lunch · Afternoon · Evening — with stops, duration and costs at a glance.",
              )}</div>
            </div>
            {onEdit && (
              <button className="ag-cmd-edit" onClick={onEdit}>
                <Pencil size={14} />{L("Personalizza", "Customize")}
              </button>
            )}
          </div>

          {/* legend */}
          <div className="ag-legend">
            <span className="ag-lg-h">{L("Le 4 fasce fisse", "The 4 fixed bands")}</span>
            {BANDS.map(b => (
              <span className="ag-lg" key={b.key}><span className="ag-ldot" style={{ background: b.c }} />{b.label}</span>
            ))}
          </div>

          {/* day tabs */}
          {dayCount > 1 && (
            <div className="ag-daytabs">
              {days.map(d => (
                <button key={d.n} className={"ag-daytab" + (sel?.n === d.n ? " on" : "")} onClick={() => selDay(d.n)}>
                  {d.arc && <span className="ag-dact">{d.arc}</span>}
                  <div className="ag-dn">{tx("itd.mis.day", { n: d.n })}</div>
                  <div className="ag-dttl">{d.date || d.title}</div>
                </button>
              ))}
            </div>
          )}

          {/* day header */}
          {sel && (
            <div className="ag-dayhead">
              <div className="ag-dayhead-grid">
                <div>
                  <div className="ag-dh-eyebrow">
                    <span>{tx("itd.mis.day", { n: sel.n })}</span>
                    {sel.arc && <span className="ag-dh-badge">{sel.arc}</span>}
                  </div>
                  <h2>{sel.title}</h2>
                  <div className="ag-dh-meta">
                    {sel.date && <span className="ag-dh-chip">{sel.date}</span>}
                    <span className="ag-dh-chip">{tappe} {tappe === 1 ? t("itd.fact.moment") : t("itd.fact.moments")} · {L("4 fasce", "4 bands")}</span>
                  </div>
                  {sel.sub && <div className="ag-dh-sub">{sel.sub}</div>}
                </div>
                {sel.img && <div className="ag-dh-hero"><img src={sel.img} alt={sel.title} loading="lazy" /></div>}
              </div>
            </div>
          )}

          {/* agenda body — 4 fasce */}
          <div className="ag-body">
            {BANDS.map(b => {
              const arr = selMoments.filter(m => (m.band ?? "mattina") === b.key);
              if (!arr.length) return null;
              return (
                <div className="ag-part" key={b.key} style={{ ["--pc" as any]: b.c }}>
                  <div className="ag-phead">
                    <span className="ag-node" />
                    <span className="ag-plabel">{b.label}</span>
                    <span className="ag-prange tnum">{bandRange(arr)}</span>
                  </div>
                  <div className="ag-moments">
                    {arr.map((m, i) => (
                      <div className="ag-m" key={i}>
                        <div className="ag-mtop">
                          {m.startTime && <span className="ag-mtime tnum">{m.startTime}</span>}
                          {m.kindLabel && <span className="ag-kind">{m.kindLabel}</span>}
                          {onToggleSaved && itineraryId && m.id && (
                            <button
                              className={"ag-fav" + (savedMomentIds?.has(m.id) ? " on" : "")}
                              style={{ marginLeft: "auto" }}
                              title={t("itd.dd.save")}
                              onClick={() => onToggleSaved(m.id!, m)}
                            >
                              <Heart size={15} fill={savedMomentIds?.has(m.id) ? "currentColor" : "none"} />
                            </button>
                          )}
                        </div>
                        <div className="ag-mtitle">{m.title}</div>
                        {m.desc && <div className="ag-mdetail">{m.desc}</div>}
                        {(m.durationLabel || m.costLabel) && (
                          <div className="ag-chips">
                            {m.durationLabel && <span className="ag-chip"><i>{L("Durata", "Duration")}</i><b>{m.durationLabel}</b></span>}
                            {m.costLabel && <span className="ag-chip"><i>{L("Costo", "Cost")}</i><b>{m.costLabel}</b></span>}
                          </div>
                        )}
                        {m.planB && <div className="ag-note">{L("Piano B", "Plan B")}: {m.planB}</div>}
                        {m.cta && m.ctaUrl && (
                          <div className="ag-acts">
                            <a className="ag-btn-book" href={m.ctaUrl} target="_blank" rel="noopener noreferrer"
                              onClick={() => trackAffiliate(m.ctaProvider ?? "unknown", data.destination)}>
                              {m.cta}{m.ctaPrice && <span className="ag-price">· {m.ctaPrice}</span>}
                              <ExternalLink size={12} className="ag-ext" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ── MAP ── */
  const MapView = () => {
    const geo = data.geometry;
    const noteKey = geo?.walkable ? "itd.map.compact" : "itd.map.spread";
    const note = geo ? tx(noteKey, { km: Math.max(1, Math.round(geo.spanKm)), min: geo.walkMinutes }) : "";
    // Solo le tappe con coordinate reali finiscono sulla mappa Leaflet.
    const routePoints = (data.mapPoints ?? [])
      .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
      .map((p) => ({ lat: p.lat!, lng: p.lng!, label: p.label, day: p.day, slot: p.slot, category: p.category }));
    // La mappa si renderizza sempre: con tappe → percorso; senza → centro città
    // (RouteMap geocodifica la destinazione come fallback). Mai un vicolo cieco.
    return (
      <div className="view">
        <ViewHead gold eyebrow={t("itd.map.eyebrow")} title={t("itd.map.title")} sub={geo ? note : undefined} />
        <div className="content">
          {data.destination ? (
            <div className="route-overlaywrap">
              <div className="route-meta">
                <div className="live">{t("itd.map.live")}</div>
                <div className="rt">{data.destination}</div>
                {geo && <div className="rd">{note}</div>}
                {stayAdvantage && (
                  <div className="route-stay">📍 {tx("itd.mis.hotelAdv", {
                    area: stayAdvantage.area, walkable: stayAdvantage.walkable,
                    total: stayAdvantage.total, min: stayAdvantage.nearestMin,
                  })}</div>
                )}
              </div>
              <Suspense fallback={<div className="rmap-loading">{t("itd.map.loading")}</div>}>
                <RouteMap points={routePoints} center={data.mapCenter} destination={data.destination} itineraryId={itineraryId} t={t} lang={lang as "it" | "en"} />
              </Suspense>
            </div>
          ) : (
            <div className="c-empty" style={{ border: "1px solid var(--stroke)", borderRadius: "var(--radius)" }}>{t("itd.map.empty")}</div>
          )}
        </div>
      </div>
    );
  };

  /* ── PRACTICAL ── */
  const PracticalView = () => {
    const budgetParsed = tryParse(itinerary.budgetSummary);
    const budgetItems: Array<{ label: string; total: string }> = Array.isArray(budgetParsed?.items) ? budgetParsed.items : [];
    const totalRow = budgetItems.find(it => /totale|total/i.test(it.label));
    const segItems = budgetItems.filter(it => it !== totalRow);
    const segTotal = segItems.reduce((a, it) => a + firstInt(it.total), 0) || 1;

    const gettingParsed = tryParse(itinerary.gettingThere);
    const steps: any[] = Array.isArray(gettingParsed?.steps) ? gettingParsed.steps : [];

    const packParsed = tryParse(itinerary.packingList);
    const packItems: any[] = Array.isArray(packParsed?.items)
      ? packParsed.items
      : (itinerary.packingList ? String(itinerary.packingList).split(/[,;]/).map((s: string) => ({ label: s.trim() })).filter((x: any) => x.label.length > 1) : []);

    const hasAny = budgetItems.length || itinerary.gettingThere || itinerary.bestTime || packItems.length;

    return (
      <div className="view">
        <ViewHead eyebrow={t("itd.prat.eyebrow")} title={t("itd.prat.title")} />
        <div className="content">
          {!hasAny && <div className="c-empty" style={{ border: "1px solid var(--stroke)", borderRadius: "var(--radius)" }}>{t("itd.prat.empty")}</div>}
          <div className="prat-grid">
            {/* Budget */}
            {budgetItems.length > 0 && (
              <div className="card">
                <div className="card-head"><span className="ic">💰</span>{t("itd.prat.budget")}</div>
                <div className="budget">
                  {totalRow && (
                    <div className="budget-total">
                      <span className="l">{t("itd.prat.total")}</span>
                      <span className="v"><em>{totalRow.total}</em></span>
                    </div>
                  )}
                  {segItems.length > 0 && (
                    <>
                      <div className="budget-bar">
                        {segItems.map((it, i) => (
                          <div key={i} className="budget-seg" style={{ width: `${(firstInt(it.total) / segTotal) * 100}%`, background: SEG_COLORS[i % SEG_COLORS.length] }} />
                        ))}
                      </div>
                      <div className="budget-legend">
                        {segItems.map((it, i) => (
                          <div key={i} className="budget-row">
                            <span className="sw" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
                            <span className="nm">{it.label}</span>
                            <span className="amt">{it.total}</span>
                            <span className="pct">{Math.round((firstInt(it.total) / segTotal) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Getting there */}
              {(steps.length > 0 || itinerary.gettingThere) && (
                <div className="card">
                  <div className="card-head"><span className="ic">✈️</span>{t("itd.prat.arrive")}</div>
                  <div className="arrive">
                    {steps.length > 0 ? steps.map((s, i) => (
                      <div key={i} className="arrive-leg">
                        <div className="pin"><span className="dot" />{i < steps.length - 1 && <span className="ln" />}</div>
                        <div className="body">
                          <div className="route">{s.from} → {s.to}</div>
                          <div className="det">{s.method}{s.duration ? ` · ${s.duration}` : ""}{s.cost ? ` · ${s.cost}` : ""}</div>
                        </div>
                      </div>
                    )) : <div className="det" style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6 }}>{itinerary.gettingThere}</div>}
                  </div>
                </div>
              )}

              {/* Best time */}
              {itinerary.bestTime && (
                <div className="card">
                  <div className="card-head"><span className="ic">📅</span>{t("itd.prat.when")}</div>
                  <div className="when-card">
                    <div className="when-legend">{itinerary.bestTime}</div>
                  </div>
                </div>
              )}

              {/* Packing */}
              {packItems.length > 0 && (
                <div className="card">
                  <div className="card-head"><span className="ic">🎒</span>{t("itd.prat.pack")}</div>
                  <div className="pack">
                    <div className="pack-chips">
                      {packItems.map((it, i) => (
                        <span key={i} className="pack-chip">{it.emoji ? `${it.emoji} ` : ""}{it.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── MISSIONS / BOOK ── */
  const MissionsView = () => {
    const complete = doneCount === missionTotal && missionTotal > 0;
    const sayKey = pct === 0 ? "itd.mis.say0" : pct < 50 ? "itd.mis.say1" : pct < 90 ? "itd.mis.say2" : "itd.mis.say3";
    const dest = data.destination;

    const providerGroups: Array<{ head: string; links: Array<{ label: string; url: string }> }> = [
      { head: t("itd.prov.flights"), links: [affiliateUrls.expedia_flights && { label: "Expedia", url: affiliateUrls.expedia_flights }].filter(Boolean) as any },
      { head: t("itd.prov.stays"), links: [affiliateUrls.hotels && { label: "Hotels.com", url: affiliateUrls.hotels }, affiliateUrls.tablet_hotels && { label: "Tablet Hotels", url: affiliateUrls.tablet_hotels }].filter(Boolean) as any },
      { head: t("itd.prov.experiences"), links: [affiliateUrls.civitatis && { label: "Civitatis", url: affiliateUrls.civitatis }, affiliateUrls.musement && { label: "Musement", url: affiliateUrls.musement }, affiliateUrls.klook && { label: "Klook", url: affiliateUrls.klook }, affiliateUrls.viator && { label: "Viator", url: affiliateUrls.viator }].filter(Boolean) as any },
      { head: t("itd.prov.food"), links: [affiliateUrls.tripadvisor && { label: "Tripadvisor", url: affiliateUrls.tripadvisor }].filter(Boolean) as any },
      { head: t("itd.prov.transport"), links: [affiliateUrls.flixbus && { label: "FlixBus", url: affiliateUrls.flixbus }, affiliateUrls.samboat && { label: "SamBoat", url: affiliateUrls.samboat }].filter(Boolean) as any },
    ].filter(g => g.links.length > 0);

    return (
      <div className="view">
        <ViewHead eyebrow={t("itd.mis.eyebrow")} title={t("itd.mis.title")} sub={t("itd.mis.sub")} />
        <div className="content">
          <div className={"mission-hero" + (complete ? " complete" : "")}>
            <div className="mh-top">
              <div className="mh-pct"><em>{pct}</em>%</div>
              <div className="mh-say">
                <div className="k">{t("itd.mis.sayK")} · {doneCount}/{missionTotal} {t("itd.mis.complete")}</div>
                <div className="t">{t(sayKey)}</div>
              </div>
            </div>
            <div className="mtrack">
              <div className="mtrack-fill" style={{ width: `${pct}%` }} />
              {missions.map((_, i) => {
                const tickPct = ((i + 1) / missionTotal) * 100;
                return (
                  <div key={i} className={"mtick" + (pct >= tickPct - 0.5 ? " reached" : "")} style={{ left: `${tickPct}%` }}>
                    <span className="d" />
                  </div>
                );
              })}
            </div>
            <div className="mtrack-pad" />

            {complete && (
              <div className="mdone">
                <span className="star">✦</span>
                <div className="tx">
                  <div className="h">{t("itd.mis.doneH")}</div>
                  <div className="s">{tx("itd.mis.doneS", { dest })}</div>
                </div>
              </div>
            )}
          </div>

          <div className="mission-list">
            {missions.map(mn => {
              const done = !!checked[mn.id];
              const isNext = !done && missions.find(x => !checked[x.id])?.id === mn.id;
              const dayN = mn.id === "experience" ? peakDay : mn.day;
              return (
                <div key={mn.id} className={"mcard" + (done ? " done" : isNext ? " next" : "")}>
                  <button className={"mcheck" + (done ? " on" : "")} onClick={() => toggle(mn.id)} aria-label={t(mn.nameKey)} />
                  <div className="mbody">
                    <div className="mname"><span className="ic">{mn.ic}</span>{t(mn.nameKey)}</div>
                    {mn.id === "hotel" && stayAdvantage ? (
                      <div className="mmeta mmeta-adv">📍 {tx("itd.mis.hotelAdv", {
                        area: stayAdvantage.area, walkable: stayAdvantage.walkable,
                        total: stayAdvantage.total, min: stayAdvantage.nearestMin,
                      })}</div>
                    ) : (
                      <div className="mmeta">{t(mn.metaKey)}</div>
                    )}
                    <div className={"mreward" + (done ? " got" : "")}>★ {done ? t("itd.mis.rewardGot") : t("itd.mis.reward")}</div>
                  </div>
                  <div className="mright">
                    {dayN != null && <div className="mday">{tx("itd.mis.day", { n: dayN })}</div>}
                    <a className="mbtn" href={mn.url} target="_blank" rel="noopener noreferrer" onClick={() => { trackAffiliate(mn.provider ?? "unknown", data.destination); if (!done) toggle(mn.id); }}>
                      {done ? t("itd.mis.done") : t("itd.mis.book")} <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {providerGroups.length > 0 && (
            <>
              <div className="book-providers">
                {providerGroups.map((g, i) => (
                  <div key={i} className="prov-group">
                    <div className="prov-h">{g.head}</div>
                    {g.links.map((l, j) => (
                      <a key={j} className="prov-link" href={l.url} target="_blank" rel="noopener noreferrer"
                        onClick={() => trackAffiliate(affiliateProvider(l.label), data.destination)}>
                        {l.label} <span className="ext"><ExternalLink size={12} /></span>
                      </a>
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "var(--ink-faint)", textAlign: "center", marginTop: 18 }}>{t("itd.affiliateNote")}</div>
            </>
          )}
        </div>
      </div>
    );
  };

  /* ════════════ SHELL ════════════ */
  const NAV: Array<{ id: ViewId; icon: ReactNode; key: string }> = [
    { id: "overview", icon: <Layers size={23} />, key: "itd.nav.overview" },
    { id: "days", icon: <CalendarDays size={23} />, key: "itd.nav.days" },
    { id: "map", icon: <MapIcon size={23} />, key: "itd.nav.map" },
    { id: "practical", icon: <Backpack size={23} />, key: "itd.nav.practical" },
    { id: "missions", icon: <Ticket size={23} />, key: "itd.nav.missions" },
  ];

  return (
    <div className="account-dash itinerary-dash">
      <div className="iv-bg">
        {dayImages.map((src, i) => (
          <div key={src + i} className={"iv-bg-photo" + (activeImgIdx === i ? " active" : "")} style={{ backgroundImage: bg(src, isMobile ? 900 : 1400, 55) }} />
        ))}
      </div>
      <div className="grain" />

      <aside className="sidebar">
        <button className="sb-logo" onClick={() => setLocation("/")} title="MindRoute"><FlowNavLogo size={26} /></button>
        <nav className="sb-nav">
          {NAV.map(n => (
            <button key={n.id} className={"sb-item" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
              {n.icon}
              <span className="lab">{t(n.key)}</span>
            </button>
          ))}
        </nav>
        <div className="sb-foot">
          <button className="sb-gear" onClick={() => setLocation("/")} title={t("itd.back")}><ArrowLeft size={20} /></button>
        </div>
      </aside>

      <main className="main">
        <div className={"topbar" + (stuck ? " stuck" : "")}>
          <button className="tb-brand" onClick={() => setLocation("/")} title={t("itd.back")}><FlowNavLogo size={20} /></button>
          <div className="it-trip">
            <span className="nm">{data.destination}</span>
            <span className="cd">
              <span className="pulse" />
              {daysUntil != null ? (
                <><span className="n">{daysUntil}</span><span className="l">{lang === "it" ? "alla partenza" : "to departure"}</span></>
              ) : (
                <><span className="n">{dayCount}</span><span className="l">{dayCount === 1 ? t("itd.fact.day") : t("itd.fact.days")}</span></>
              )}
            </span>
          </div>
          <div className="tb-spacer" />
          <div className="it-ring" title={`${pct}%`}>
            <svg width="34" height="34">
              <circle cx="17" cy="17" r="13" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2.5" />
              <circle cx="17" cy="17" r="13" fill="none" stroke="#E94560" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 13} strokeDashoffset={2 * Math.PI * 13 * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .4s" }} />
            </svg>
            <span className="lbl">{pct}</span>
          </div>
          {/* Nessun toggle lingua: il contenuto è monolingua e fisso alla
              creazione (la pagina forza già la lingua del contenuto). */}
          {onEdit && <button className="cmd-edit" onClick={onEdit}><Pencil className="pen" size={14} /> {t("itd.tb.edit")}</button>}
          <button className="tb-cta" onClick={onSavePdf}><Printer size={15} /> PDF</button>
        </div>

        {view === "overview" && OverviewView()}
        {view === "days" && DaysView()}
        {view === "map" && MapView()}
        {view === "practical" && PracticalView()}
        {view === "missions" && MissionsView()}
      </main>

      <nav className="mnav">
        {NAV.map(n => (
          <button key={n.id} className={"mnav-i" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
            <span className="ic">{n.icon}</span>
            <span className="lab">{t(n.key)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
