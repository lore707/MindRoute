/**
 * JourneyView.tsx — redesign "Journey" del workspace viaggio (2026-07).
 * ───────────────────────────────────────────────────────────────
 * Un solo giorno, TRE prospettive sincronizzate sullo stesso oggetto:
 *   · Story     — la timeline narrativa (mattina/pranzo/pomeriggio/sera)
 *   · Map       — lo stesso giorno nello spazio (RouteMap, strade reali)
 *   · Logistics — il pannello organizzativo (panoramica, trasferimenti,
 *                 prenotazioni, tip AI)
 *
 * Stato CONDIVISO: esiste sempre UNA sola tappa selezionata (selectedId).
 * Cambiare modalità NON cambia il contesto — resti sulla stessa tappa.
 * Il dettaglio non apre una pagina: bottom sheet (mobile) / drawer laterale
 * (desktop), la mappa/timeline resta percepibile sotto.
 *
 * Responsive (senior): desktop ≥1024 mostra Story + Map affiancate sempre
 * visibili ("sembrano la stessa entità"), il segmented control governa solo
 * il pannello destro (Map ↔ Logistics). Mobile/tablet: segmented a 3 che
 * commuta l'intera vista.
 *
 * Presentational: consuma lo stesso ItineraryData del dashboard (card già
 * formattate: label, CTA affiliate, cuore) + l'itinerario grezzo v2 per i
 * NUMERI reali della Logistics (durate, costi, km, mezzi). Zero dato inventato.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState, Suspense, lazy } from "react";
import { Heart, ExternalLink, X, MapPin, Navigation, ChevronRight, Sparkles } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
import { trackAffiliate } from "@/lib/analytics";
import type { ItineraryData, Moment } from "./ItineraryCinematic";

const RouteMap = lazy(() => import("@/components/RouteMap"));
const bgi = (url: string | undefined, w: number, q = 68) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

type Mode = "story" | "map" | "logistics";
type Band = "mattina" | "pranzo" | "pomeriggio" | "sera";

type Props = {
  data: ItineraryData;
  itinerary: any;
  itineraryId?: number;
  savedMomentIds?: Set<string>;
  onToggleSaved?: (momentId: string, moment: Moment) => void;
  onBook?: (type: string | undefined, day: number) => void;
};

export function JourneyView({ data, itinerary, itineraryId, savedMomentIds, onToggleSaved, onBook }: Props) {
  const { t, lang } = useI18n();
  const L = (it: string, en: string) => (lang === "it" ? it : en);
  const tx = (key: string, vars: Record<string, string | number>) => {
    let s = t(key);
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };

  const isDesktop = useMemo(() => typeof window !== "undefined" && window.matchMedia("(min-width:1024px)").matches, []);

  const days = data.days ?? [];
  // Override URL SOLO per la preview dev degli screenshot (innocuo altrove).
  const qp = (k: string): string | null => { try { return new URLSearchParams(window.location.search).get(k); } catch { return null; } };
  const initialDayN = days.find(d => (data.momentsByDay[d.n] ?? []).length > 0)?.n ?? days[0]?.n ?? 1;
  const [activeDay, setActiveDay] = useState<number>(Number(qp("jday")) || initialDayN);
  // Su desktop Story è sempre a sinistra: il segmented governa la destra
  // (Map/Logistica), quindi si parte su "map". Su mobile si parte su "story".
  const [mode, setMode] = useState<Mode>((qp("jmode") as Mode) || (isDesktop ? "map" : "story"));
  const [selectedId, setSelectedId] = useState<string | null>(null); // tappa evidenziata (condivisa)
  const [detailId, setDetailId] = useState<string | null>(qp("jdetail"));     // tappa aperta nel dettaglio
  const storyRef = useRef<HTMLDivElement | null>(null);

  const day = days.find(d => d.n === activeDay) ?? days[0];
  const moments = useMemo(() => data.momentsByDay[activeDay] ?? [], [data.momentsByDay, activeDay]);
  // Giorno grezzo v2 → numeri reali per la Logistics (il client Moment ha solo label).
  const rawDay = useMemo(() => (itinerary?.days ?? []).find((d: any) => d?.day_number === activeDay) ?? null, [itinerary, activeDay]);

  const BANDS: Array<{ key: Band; label: string; c: string }> = [
    { key: "mattina", label: L("Mattina", "Morning"), c: "#D4A853" },
    { key: "pranzo", label: L("Pranzo", "Lunch"), c: "#E08A4B" },
    { key: "pomeriggio", label: L("Pomeriggio", "Afternoon"), c: "#6FB4A8" },
    { key: "sera", label: L("Sera", "Evening"), c: "#9D7EBC" },
  ];

  // Cambiare giorno azzera selezione/dettaglio (nuovo contesto).
  const selectDay = (n: number) => { setActiveDay(n); setSelectedId(null); setDetailId(null); };

  const detailMoment = useMemo(() => moments.find(m => m.id === detailId) ?? null, [moments, detailId]);

  // "Apri nel giorno": chiudi dettaglio, evidenzia, porta su Story e scorri alla card.
  const openInDay = (id: string) => {
    setDetailId(null);
    setSelectedId(id);
    if (!isDesktop) setMode("story");
    requestAnimationFrame(() => {
      const el = document.getElementById(`jr-m-${id}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  // Punti mappa del giorno attivo (RouteMap gestisce il proprio giorno; qui
  // passiamo tutti i punti + initialDay così parte sul giorno giusto).
  const routePoints = useMemo(() => (data.mapPoints ?? [])
    .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
    .map(p => ({
      lat: p.lat!, lng: p.lng!, label: p.label, day: p.day, slot: p.slot, category: p.category,
      momentId: p.momentId, imageUrl: p.imageUrl, durationLabel: p.durationLabel, bestTime: p.bestTime,
      kindLabel: p.kindLabel, desc: p.desc, bookable: p.bookable, ctaUrl: p.ctaUrl, cta: p.cta,
      ctaProvider: p.ctaProvider, ctaPrice: p.ctaPrice, type: p.type,
    })), [data.mapPoints]);

  // ── Aggregati Logistics dal giorno grezzo v2 (numeri veri) ──────────────
  const logistics = useMemo(() => {
    const ms: any[] = rawDay?.moments ?? [];
    // Durata totale = somma durate momenti + durate trasferimenti.
    let durMin = 0;
    const modeAgg = new Map<string, { min: number; count: number }>();
    const bookings: Array<{ label: string; status: string; type: string; date?: string }> = [];
    for (const m of ms) {
      if (typeof m.duration_min === "number") durMin += m.duration_min;
      const tn = m.transport_to_next;
      if (tn && typeof tn.mode === "string" && tn.mode.trim()) {
        const key = tn.mode.trim();
        const cur = modeAgg.get(key) ?? { min: 0, count: 0 };
        cur.min += typeof tn.duration_min === "number" ? tn.duration_min : 0;
        cur.count += 1;
        modeAgg.set(key, cur);
        if (typeof tn.duration_min === "number") durMin += tn.duration_min;
      }
      const b = m.booking;
      if (b && b.affiliate_url && b.status && b.status !== "walk_in") {
        bookings.push({ label: (b.display_label || m.location_name || m.title_operational || "").trim(), status: b.status, type: m.type, date: rawDay?.date });
      }
    }
    const costBookable = typeof rawDay?.cost_bookable_total === "number" ? rawDay.cost_bookable_total : 0;
    const costOnsite = typeof rawDay?.cost_onsite_estimate === "number" ? rawDay.cost_onsite_estimate : 0;
    const walkKm = typeof rawDay?.walking_distance_km === "number" ? rawDay.walking_distance_km : null;
    return {
      durMin,
      walkKm,
      costTotal: costBookable + costOnsite,
      transfers: Array.from(modeAgg.entries()).map(([m, v]) => ({ mode: m, min: v.min, count: v.count })),
      bookings,
      tip: (typeof rawDay?.energy_note === "string" && rawDay.energy_note.trim()) ? rawDay.energy_note.trim() : "",
    };
  }, [rawDay]);

  const fmtDur = (min: number) => {
    if (min <= 0) return "—";
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  };
  const statusLabel = (s: string) =>
    s === "bookable_now" ? L("Prenotabile", "Bookable")
      : s === "reserve_recommended" ? L("Da confermare", "To confirm")
        : L("Info", "Info");
  const statusTone = (s: string) => (s === "bookable_now" ? "ok" : s === "reserve_recommended" ? "warn" : "");

  const modeIcon = (m: string) => {
    const s = m.toLowerCase();
    if (/pied|walk|a piedi/.test(s)) return "🚶";
    if (/bus|flix|pullman/.test(s)) return "🚌";
    if (/tax|car|auto|drive|noleg/.test(s)) return "🚕";
    if (/train|treno|rail/.test(s)) return "🚆";
    if (/ferry|tragh|boat|barca|aliscafo/.test(s)) return "⛴";
    if (/metro|subway|tube/.test(s)) return "🚇";
    if (/vol|flight|aereo|plane/.test(s)) return "✈️";
    return "→";
  };

  // Segmented (mobile: 3 modi vista intera · desktop: pannello destro Map/Logistics)
  const SEGS: Array<{ id: Mode; label: string }> = [
    { id: "story", label: L("Story", "Story") },
    { id: "map", label: L("Mappa", "Map") },
    { id: "logistics", label: L("Logistica", "Logistics") },
  ];

  /* ──────────────── STORY ──────────────── */
  const StoryTimeline = () => (
    <div className="jr-story" ref={storyRef}>
      {BANDS.map(b => {
        const arr = moments.filter(m => (m.band ?? "mattina") === b.key);
        if (!arr.length) return null;
        return (
          <div className="jr-band" key={b.key} style={{ ["--bc" as any]: b.c }}>
            <div className="jr-band-head"><span className="dot" /><span className="lab">{b.label}</span></div>
            <div className="jr-moments">
              {arr.map((m, i) => {
                const idx = moments.indexOf(m) + 1;
                const on = m.id && selectedId === m.id;
                return (
                  <div key={m.id ?? i} id={m.id ? `jr-m-${m.id}` : undefined}
                    className={"jr-card" + (on ? " on" : "")}
                    onClick={() => { if (m.id) { setSelectedId(m.id); setDetailId(m.id); } }}>
                    <span className="jr-idx">{idx}</span>
                    {m.imageUrl && <span className="jr-thumb" style={{ backgroundImage: bgi(m.imageUrl, 200) }} />}
                    <div className="jr-body">
                      <div className="jr-top">
                        {m.startTime && <span className="jr-time tnum">{m.startTime}</span>}
                        {m.kindLabel && <span className="jr-kind">{m.kindLabel}</span>}
                        {onToggleSaved && itineraryId && m.id && (
                          <button className={"jr-fav" + (savedMomentIds?.has(m.id) ? " on" : "")} title={t("jr.save")}
                            onClick={(e) => { e.stopPropagation(); onToggleSaved(m.id!, m); }}>
                            <Heart size={15} fill={savedMomentIds?.has(m.id) ? "currentColor" : "none"} />
                          </button>
                        )}
                      </div>
                      <div className="jr-title">{m.title}</div>
                      <div className="jr-meta">
                        {m.durationLabel && <span>{m.durationLabel}</span>}
                        {m.transport && <span className="sep">·</span>}
                        {m.transport && <span className="jr-transport">{m.transport}</span>}
                      </div>
                      {m.desc && <div className="jr-desc">{m.desc}</div>}
                    </div>
                    <ChevronRight size={16} className="jr-chev" />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      {moments.length === 0 && <div className="jr-empty">{L("Nessuna tappa per questo giorno.", "No stops for this day.")}</div>}
    </div>
  );

  /* ──────────────── MAP ──────────────── */
  const MapPanel = () => (
    <div className="jr-mapwrap">
      <Suspense fallback={<div className="jr-map-loading">{t("jr.mapLoading")}</div>}>
        <RouteMap
          key={`jr-rm-${activeDay}`}
          points={routePoints} center={data.mapCenter} destination={data.destination}
          itineraryId={itineraryId} t={t} lang={lang as "it" | "en"}
          initialDay={activeDay}
          selectedMomentId={selectedId}
          onSelectMoment={(id) => { setSelectedId(id); if (id && isDesktop) setDetailId(id); }}
          onDayChange={(d) => { if (d != null && d !== activeDay) selectDay(d); }}
          onOpenDay={(dayN, momentId) => { setActiveDay(dayN); if (momentId) { setSelectedId(momentId); setDetailId(momentId); } }}
          onBook={(type, dayN) => onBook?.(type, dayN ?? activeDay)}
        />
      </Suspense>
    </div>
  );

  /* ──────────────── LOGISTICS ──────────────── */
  const LogisticsPanel = () => (
    <div className="jr-log">
      <div className="jr-log-sec">
        <div className="jr-log-h">{L("Panoramica", "Overview")}</div>
        <div className="jr-panorama">
          <div className="jr-pan"><span className="n">{logistics.walkKm != null ? `~${logistics.walkKm}` : "—"}</span><span className="l">{L("km a piedi", "km on foot")}</span></div>
          <div className="jr-pan"><span className="n">{fmtDur(logistics.durMin)}</span><span className="l">{L("durata", "duration")}</span></div>
          <div className="jr-pan"><span className="n">{logistics.costTotal > 0 ? `€${Math.round(logistics.costTotal)}` : "—"}</span><span className="l">{L("spesa st.", "est. spend")}</span></div>
          <div className="jr-pan"><span className="n">{logistics.transfers.length || (logistics.walkKm ? 1 : 0)}</span><span className="l">{L("mezzi", "modes")}</span></div>
        </div>
      </div>

      {logistics.transfers.length > 0 && (
        <div className="jr-log-sec">
          <div className="jr-log-h">{L("Trasferimenti", "Transfers")}</div>
          <div className="jr-transfers">
            {logistics.transfers.map((tr, i) => (
              <div className="jr-tr" key={i}>
                <span className="ic">{modeIcon(tr.mode)}</span>
                <span className="md">{tr.mode}</span>
                <span className="du tnum">{tr.min > 0 ? fmtDur(tr.min) : `${tr.count}×`}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {logistics.bookings.length > 0 && (
        <div className="jr-log-sec">
          <div className="jr-log-h">{L("Prenotazioni", "Bookings")}</div>
          <div className="jr-books">
            {logistics.bookings.map((bk, i) => (
              <div className="jr-book" key={i}>
                <div className="tx"><span className="nm">{bk.label}</span>{bk.date && <span className="dt">{bk.date}</span>}</div>
                <span className={"jr-status " + statusTone(bk.status)}>{statusLabel(bk.status)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {logistics.tip && (
        <div className="jr-tip">
          <div className="jr-tip-h"><Sparkles size={14} /> {L("Il consiglio AI", "AI tip")}</div>
          <p>{logistics.tip}</p>
        </div>
      )}
    </div>
  );

  /* ──────────────── DETTAGLIO (bottom sheet / drawer) ──────────────── */
  const Detail = () => {
    const m = detailMoment;
    if (!m) return null;
    const gmapsUrl = (m.lat != null && m.lng != null)
      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.locationName ?? m.title}, ${data.destination}`)}`;
    const timeWindow = m.startTime ? (m.endTime ? `${m.startTime}–${m.endTime}` : m.startTime) : "";
    return (
      <>
        <div className="jr-scrim" onClick={() => setDetailId(null)} />
        <div className="jr-sheet" role="dialog" aria-modal="true">
          <div className="jr-sheet-grab" />
          <button className="jr-sheet-x" onClick={() => setDetailId(null)} aria-label={t("jr.close")}><X size={18} /></button>
          <div className="jr-sheet-scroll">
            {m.imageUrl && <div className="jr-sheet-hero" style={{ backgroundImage: bgi(m.imageUrl, 900) }} />}
            <div className="jr-sheet-body">
              <div className="jr-sheet-top">
                <div>
                  {m.kindLabel && <span className="jr-sheet-kind">{m.kindLabel}</span>}
                  <h3 className="jr-sheet-title">{m.title}</h3>
                </div>
                {onToggleSaved && itineraryId && m.id && (
                  <button className={"jr-fav lg" + (savedMomentIds?.has(m.id) ? " on" : "")} title={t("jr.save")}
                    onClick={() => onToggleSaved(m.id!, m)}>
                    <Heart size={18} fill={savedMomentIds?.has(m.id) ? "currentColor" : "none"} />
                  </button>
                )}
              </div>
              <div className="jr-sheet-facts">
                {m.durationLabel && <span>◷ {m.durationLabel}</span>}
                {m.transport && <span>{m.transport}</span>}
              </div>

              {m.desc && <p className="jr-sheet-desc">{m.desc}</p>}

              {m.why && (
                <div className="jr-sheet-sec">
                  <div className="jr-sheet-sh">{L("Perché l'ho scelto", "Why I chose it")}</div>
                  <p className="jr-sheet-why">{m.why}</p>
                </div>
              )}

              {timeWindow && (
                <div className="jr-sheet-sec">
                  <div className="jr-sheet-sh">{L("Momento ideale", "Best time")}</div>
                  <p className="jr-sheet-time">{timeWindow}</p>
                </div>
              )}

              {m.planB && (
                <div className="jr-sheet-sec">
                  <div className="jr-sheet-sh">{L("Alternativa vicina", "Nearby alternative")}</div>
                  <p className="jr-sheet-alt">{m.planB}</p>
                </div>
              )}

              <div className="jr-sheet-cta">
                {m.cta && m.ctaUrl && (
                  <a className="jr-cta-primary" href={m.ctaUrl} target="_blank" rel="noopener noreferrer"
                    onClick={() => { trackAffiliate(m.ctaProvider ?? "unknown", data.destination); onBook?.(m.type, activeDay); }}>
                    {m.cta}{m.ctaPrice && <span className="pr">· {m.ctaPrice}</span>}<ExternalLink size={13} />
                  </a>
                )}
                <div className="jr-cta-row">
                  <button className="jr-cta-ghost" onClick={() => m.id && openInDay(m.id)}>
                    <Navigation size={14} /> {L("Apri nel giorno", "Open in day")}
                  </button>
                  <a className="jr-cta-ghost" href={gmapsUrl} target="_blank" rel="noopener noreferrer">
                    <MapPin size={14} /> Google Maps
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="view jr">
      {/* Header: intro + day switcher + segmented */}
      <div className="jr-head">
        <div className="jr-intro">
          <div className="jr-eyebrow">{data.destination}</div>
          <h1 className="jr-h1">Journey<span className="dot">.</span></h1>
          <p className="jr-lede">{L("Stesso giorno, tre modi di viverlo. Timeline, mappa e logistica sempre sincronizzate.",
            "Same day, three ways to live it. Timeline, map and logistics always in sync.")}</p>
        </div>
      </div>

      {days.length > 1 && (
        <div className="jr-daytabs">
          {days.map(d => (
            <button key={d.n} className={"jr-daytab" + (activeDay === d.n ? " on" : "")} onClick={() => selectDay(d.n)}>
              {d.arc && <span className="ar">{d.arc}</span>}
              <span className="dn">{tx("jr.day", { n: d.n })}</span>
              <span className="dt">{d.date || d.title}</span>
            </button>
          ))}
        </div>
      )}

      {day && (
        <div className="jr-dayhead">
          <div>
            <div className="jr-dh-eyebrow"><span>{tx("jr.day", { n: day.n })}</span>{day.arc && <span className="badge">{day.arc}</span>}</div>
            <h2 className="jr-dh-title">{day.title}</h2>
            {day.sub && <p className="jr-dh-sub">{day.sub}</p>}
          </div>
          {day.img && <div className="jr-dh-hero" style={{ backgroundImage: bgi(day.img, 400) }} />}
        </div>
      )}

      {/* Segmented control */}
      <div className="jr-seg" role="tablist">
        {SEGS.map(s => (
          <button key={s.id} role="tab" aria-selected={mode === s.id}
            className={"jr-seg-btn" + (mode === s.id ? " on" : "")} onClick={() => setMode(s.id)}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Corpo: desktop split (Story sempre + destra Map/Logistics) · mobile una vista */}
      <div className="jr-stage">
        {/* Story: sempre su desktop, oppure su mobile quando mode=story */}
        <div className={"jr-col-story" + (mode === "story" ? " show" : "")}>
          {StoryTimeline()}
        </div>
        {/* Pannello destro: Map (default) o Logistics. Su desktop Story resta a
            sinistra e "map" copre sia il seg Story che Map; Logistics è il terzo. */}
        <div className={"jr-col-right" + (mode !== "story" ? " show" : "")}>
          <div className={"jr-panel jr-panel-map" + (mode !== "logistics" ? " show" : "")}>{MapPanel()}</div>
          <div className={"jr-panel jr-panel-log" + (mode === "logistics" ? " show" : "")}>{LogisticsPanel()}</div>
        </div>
      </div>

      {detailId && Detail()}
    </div>
  );
}
