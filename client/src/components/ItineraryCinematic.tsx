import { useState, useEffect, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { unsplashSized } from "@/lib/img";
import { trackAffiliate } from "@/lib/analytics";

export type Highlight = { ic: string; name: string; desc: string };
export type Day = { n: number; arc: string; title: string; sub: string; img: string; date?: string };
/** Le 4 fasce fisse dell'agenda (design "Giorno per Giorno"). */
export type MomentBand = "mattina" | "pranzo" | "pomeriggio" | "sera";
export type Moment = {
  t: string;
  ic: string;
  title: string;
  desc: string;
  /** Fascia canonica per il raggruppamento agenda (mattina/pranzo/pomeriggio/sera). */
  band?: MomentBand;
  /** Orario d'inizio se il modello l'ha fornito (raro: spesso assente by design). */
  startTime?: string;
  /** Etichetta breve del tipo per la pill ("Tavola", "Esperienza", …). */
  kindLabel?: string;
  /** Stima costo formattata ("€15–20", "~€50"). */
  costLabel?: string;
  /** Stima durata formattata ("~2h", "~45 min"). */
  durationLabel?: string;
  cta?: string;
  ctaUrl?: string;
  /** Optional price string shown inside the booking button ("~€95", "€80–120"). */
  ctaPrice?: string;
  /** Booking urgency — drives the small hint above the button. */
  ctaStatus?: "bookable_now" | "reserve_recommended";
  /** Provider affiliate canonico per l'evento analytics (es. "getyourguide"). */
  ctaProvider?: string;
  // v2 only — usato per il bookmark trasversale (Ondata B). Assente nei v1.
  id?: string;
  type?: string;
  locationName?: string;
  imageUrl?: string;
  dayNumber?: number;
  // v2 only — connettore "come arrivi alla prossima tappa" già formattato
  // (es. "A piedi · ~12 min"). Stima qualitativa, non un orario preciso.
  transport?: string;
  // v2 only — alternativa se la tappa salta, formattata "trigger → alternativa".
  planB?: string;
};

export type ItineraryData = {
  destination: string;
  subtitle: string;
  country: string;
  duration: string;
  heroImg: string;
  manifesto: string;
  emWord?: string;
  highlights: Highlight[];
  days: Day[];
  momentsByDay: Record<number, Moment[]>;
  closingQuote: string;
  // x/y = proiezione 0..400 per il vecchio SVG cinematic. lat/lng/day/slot =
  // dati grezzi per la mappa Leaflet reale (ItineraryDashboard). Restano opzionali
  // così i vecchi consumer SVG continuano a funzionare.
  mapPoints?: Array<{
    x: number; y: number; label: string; lat?: number; lng?: number; day?: number; slot?: string; category?: string;
    // Campi ricchi (join col momento) per la card operativa della mappa-viaggio.
    momentId?: string; imageUrl?: string; durationLabel?: string; bestTime?: string;
    kindLabel?: string; desc?: string;
    bookable?: boolean; ctaUrl?: string; cta?: string; ctaProvider?: string; ctaPrice?: string; type?: string;
  }>;
  // Centro città geocodificato lato server: fallback per centrare la mappa anche
  // quando non ci sono tappe puntuali.
  mapCenter?: { lat: number; lng: number };
  // Grounded spatial read computed from the geocoded points (not model-claimed).
  geometry?: { spanKm: number; walkMinutes: number; walkable: boolean };
};

export type ItineraryCinematicProps = {
  data: ItineraryData;
  /** Chip strip rendered immediately under the hero — typically duration/budget/period. */
  tripGlance?: ReactNode | null;
  /** Dedicated chapter for practical info (budget, packing, best time, getting there). */
  practicalSection?: ReactNode;
  /** Dedicated chapter for the affiliate booking links. */
  bookingSection?: ReactNode;
  onSavePdf?: () => void;
  onStartOver?: () => void;
  onBack?: () => void;
  onEdit?: () => void;
  /** @deprecated Prefer `practicalSection` + `bookingSection`. Kept for callers not yet migrated. */
  extraSections?: ReactNode;
  // Bookmark trasversale (Ondata B). Passare tutti e tre per attivare il cuore
  // sui moment v2; assenti → nessun cuore (modalità v1 / anonimo / read-only).
  itineraryId?: number;
  savedMomentIds?: Set<string>;
  onToggleSaved?: (momentId: string, moment: Moment) => void;
};

type TabId = "itinerary" | "practical" | "booking";

export function ItineraryCinematic({ data, tripGlance, practicalSection, bookingSection, onSavePdf, onStartOver, onBack, onEdit, extraSections, itineraryId, savedMomentIds, onToggleSaved }: ItineraryCinematicProps) {
  const { t, lang } = useI18n();
  const [activeDay, setActiveDay] = useState(data.days[0]?.n ?? 1);
  const [activeMoment, setActiveMoment] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("itinerary");
  const moments = data.momentsByDay[activeDay] ?? [];
  const currentDay = data.days.find(d => d.n === activeDay) ?? data.days[0];
  const currentMoment = moments[activeMoment] ?? moments[0];

  // Sticky tab bar and mobile bottom action appear only after the user has
  // scrolled past the hero. A small threshold (400px) is enough for this
  // single-axis layout — no need for IntersectionObserver setup cost.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabs: Array<{ id: TabId; label: string; show: boolean }> = ([
    { id: "itinerary", label: t("itin.cin.tab.itinerary"), show: data.days.length > 0 },
    { id: "practical", label: t("itin.cin.tab.practical"), show: !!practicalSection },
    { id: "booking", label: t("itin.cin.tab.booking"), show: !!bookingSection },
  ] as Array<{ id: TabId; label: string; show: boolean }>).filter(tab => tab.show);

  const selectTab = (id: TabId) => {
    setActiveTab(id);
    // Scroll back near the tab bar so the new content starts in the viewport
    // instead of leaving the user mid-page after a tab switch.
    if (typeof window !== "undefined") {
      const hero = document.querySelector(".vA .hero") as HTMLElement | null;
      const heroBottom = hero ? hero.offsetTop + hero.offsetHeight - 80 : 0;
      window.scrollTo({ top: heroBottom, behavior: "smooth" });
    }
  };

  const renderManifesto = () => {
    if (!data.emWord || !data.manifesto.includes(data.emWord)) return data.manifesto;
    const [before, ...rest] = data.manifesto.split(data.emWord);
    return <>{before}<em>{data.emWord}</em>{rest.join(data.emWord)}</>;
  };

  return (
    <div className="vA stage itinerary-cinematic">
      {/* HERO */}
      <section className="hero">
        <div className="hero-img" style={{ backgroundImage: `linear-gradient(to top, rgba(10,7,16,1) 0%, rgba(10,7,16,.4) 40%, rgba(10,7,16,.15) 70%, rgba(10,7,16,.5) 100%), url(${unsplashSized(data.heroImg, 1920)})` }} />
        <div className="hero-topbar">
          {onBack ? <button className="hero-back" onClick={onBack}>← {t('itin.back')}</button> : <span />}
          <div className="hero-actions">
            {onEdit && <button className="hero-action" onClick={onEdit}>{t('itin.cin.edit')}</button>}
            {onSavePdf && <button className="hero-action" onClick={onSavePdf}>{t('itin.pdf')}</button>}
          </div>
        </div>
        <div className="hero-content">
          <div className="hero-meta">
            {data.country && <><span>{data.country}</span><span className="sep" /></>}
            <span>{data.duration}</span>
            <span className="sep" />
            <span>{t('itin.cin.crafted')}</span>
          </div>
          <h1>{data.destination}<em>{data.subtitle}</em></h1>
          <button className="hero-scroll" onClick={() => document.querySelector(".manifesto, .trip-glance")?.scrollIntoView({ behavior: "smooth" })}>
            {t('itin.cin.begin')} <span className="arrow">↓</span>
          </button>
        </div>
      </section>

      {/* TRIP AT A GLANCE — chips under hero so the user knows the trip's
          shape (duration, budget, period) without scrolling further. */}
      {tripGlance && <div className="trip-glance">{tripGlance}</div>}

      {/* TAB BAR — three top-level sections (Itinerary / Practical / Booking).
          Inline under the hero on first render; becomes sticky once the user
          scrolls past the hero so it stays available without competing visually
          with the hero photo. */}
      {tabs.length > 0 && (
        <nav className={"ic-tab-bar" + (scrolled ? " sticky" : "")} aria-label="Itinerary sections">
          <div className="ic-tab-bar-inner" role="tablist">
            {tabs.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={"ic-tab" + (activeTab === tab.id ? " active" : "")}
                onClick={() => selectTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* MANIFESTO */}
      {activeTab === "itinerary" && (data.manifesto || data.highlights.length > 0) && (
        <section className="manifesto">
          <div className="ic-container">
            <div className="manifesto-grid">
              <div>
                <div className="eyebrow"><span className="d" />{t('itin.whyYours')}</div>
                {data.manifesto && <p className="manifesto-quote">{renderManifesto()}</p>}
              </div>
              {data.highlights.length > 0 && (
                <div>
                  <div className="eyebrow" style={{ marginBottom: 24 }}><span className="d" />{t('itin.cin.fourChapters')}</div>
                  <div className="highlights">
                    {data.highlights.map((h, i) => (
                      <div key={i} className="hl">
                        <div className="hl-img">{h.ic}</div>
                        <div>
                          <div className="hl-name">{h.name}</div>
                          {h.desc && <div className="hl-desc">{h.desc}</div>}
                        </div>
                        <div className="hl-arr">→</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* TIMELINE / Chapters */}
      {activeTab === "itinerary" && (
      <section id="ic-arc" className="timeline">
        <div className="ic-container">
          <div className="timeline-head">
            <div>
              <div className="eyebrow"><span className="d" />{t('itin.cin.arcEyebrow')}</div>
              <h2 style={{ marginTop: 14 }}>{data.days.length} {t('itin.cin.arcTitleDays')}</h2>
            </div>
            <div style={{ color: "var(--ic-ink-faint)", fontSize: 13 }}>{t('itin.cin.clickHint')}</div>
          </div>
          <div className="timeline-track">
            {data.days.map(d => (
              <div key={d.n} className={"day-card" + (activeDay === d.n ? " active" : "")} onClick={() => { setActiveDay(d.n); setActiveMoment(0); document.querySelector(".detail")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <div className="day-img" style={d.img ? { backgroundImage: `url(${d.img})` } : undefined}>
                  <div className="day-num">{d.n}</div>
                </div>
                <div className="day-body">
                  <div className="day-arc">{t('itin.cin.dayLabel')} {d.n} · {d.arc}</div>
                  <div className="day-title">{d.title}</div>
                  {d.sub && <div className="day-sub">{d.sub}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* DAY DETAIL */}
      {activeTab === "itinerary" && currentDay && (
        <section className="detail">
          <div className="ic-container">
            <div className="detail-grid">
              <aside className="moments-rail">
                <div className="moments-head">{t('itin.cin.dayLabel')} {activeDay} · {currentDay.arc}</div>
                {moments.map((m, i) => (
                  <div key={i} className={"moment" + (activeMoment === i ? " active" : "")} onClick={() => setActiveMoment(i)}>
                    <div>
                      <div className="moment-time">{m.t}</div>
                      <div className="moment-title">{m.title.split(",")[0]}</div>
                    </div>
                  </div>
                ))}
              </aside>
              <div className="detail-body">
                <div className="detail-img" style={currentDay.img ? { backgroundImage: `url(${currentDay.img})` } : undefined}>
                  {currentMoment?.t && <div className="detail-tag">{currentMoment.t}</div>}
                </div>
                {currentMoment && (
                  <>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                      <h3 className="detail-title" style={{ flex: 1 }}>{currentMoment.title}</h3>
                      {/* Cuore bookmark — solo v2 + props passati. Toggle ottimistico:
                          il parent aggiorna savedMomentIds e committa al server. */}
                      {onToggleSaved && itineraryId && currentMoment.id && (() => {
                        const isSaved = savedMomentIds?.has(currentMoment.id) ?? false;
                        return (
                          <button
                            type="button"
                            onClick={() => onToggleSaved(currentMoment.id!, currentMoment)}
                            aria-label={isSaved ? "Rimuovi dai momenti salvati" : "Salva questo momento"}
                            title={isSaved ? "Salvato — clicca per rimuovere" : "Salva questo momento"}
                            style={{
                              flexShrink: 0,
                              width: 40,
                              height: 40,
                              borderRadius: 999,
                              border: "1px solid rgba(255,255,255,0.12)",
                              background: isSaved ? "rgba(233,69,96,0.15)" : "rgba(255,255,255,0.04)",
                              color: isSaved ? "#E94560" : "rgba(245,240,238,0.5)",
                              cursor: "pointer",
                              fontSize: 18,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.18s ease",
                            }}
                          >
                            {isSaved ? "♥" : "♡"}
                          </button>
                        );
                      })()}
                    </div>
                    <p className="detail-desc">{currentMoment.desc}</p>
                    {currentMoment.cta && currentMoment.ctaUrl && (
                      <div className="book-row">
                        {currentMoment.ctaStatus === "reserve_recommended" && (
                          <span className="book-status">{t('itin.cin.book.reserveHint')}</span>
                        )}
                        <a className="book-btn" href={currentMoment.ctaUrl} target="_blank" rel="noopener noreferrer"
                          onClick={() => trackAffiliate(currentMoment.ctaProvider ?? "unknown", data.destination)}>
                          <span className="book-btn-label">{currentMoment.cta}</span>
                          {currentMoment.ctaPrice && <span className="book-btn-price">{currentMoment.ctaPrice}</span>}
                          <span className="book-btn-arrow">→</span>
                        </a>
                      </div>
                    )}
                    {currentMoment.planB && (
                      <div style={{
                        marginTop: 14,
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: "rgba(245,240,238,0.72)",
                      }}>
                        <span style={{
                          display: "inline-block",
                          marginRight: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "rgba(245,240,238,0.45)",
                        }}>{t('itin.cin.planB')}</span>
                        {currentMoment.planB}
                      </div>
                    )}
                    {currentMoment.transport && (
                      <div style={{
                        marginTop: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: "rgba(245,240,238,0.55)",
                      }}>
                        <span aria-hidden style={{ opacity: 0.7 }}>↳</span>
                        <span><span style={{ opacity: 0.7 }}>{t('itin.cin.transportNext')} · </span>{currentMoment.transport}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="day-nav">
              <button className="day-nav-btn" disabled={activeDay === 1} onClick={() => { setActiveDay(Math.max(1, activeDay - 1)); setActiveMoment(0); }}>
                ← {t('itin.cin.dayLabel')} {Math.max(1, activeDay - 1)}
              </button>
              <div className="day-nav-counter">{t('itin.cin.dayLabel')} <strong>{activeDay}</strong> {t('itin.cin.of')} {data.days.length}</div>
              <button className="day-nav-btn" disabled={activeDay === data.days.length} onClick={() => { setActiveDay(Math.min(data.days.length, activeDay + 1)); setActiveMoment(0); }}>
                {t('itin.cin.dayLabel')} {Math.min(data.days.length, activeDay + 1)} →
              </button>
            </div>
          </div>
        </section>
      )}

      {/* MAP CHAPTER */}
      {activeTab === "itinerary" && data.mapPoints && data.mapPoints.length > 0 && (
        <section id="ic-map" className="map-ch">
          <div className="ic-container">
            <div className="map-grid">
              <div>
                <div className="eyebrow"><span className="d" />{t('itin.cin.geographyEyebrow')}</div>
                <h2 className="map-h2" style={{ marginTop: 14 }}>{t('itin.cin.geographyTitlePre')} <em>{t('itin.cin.geographyTitleEm')}</em></h2>
                <p style={{ color: "var(--ic-ink-dim)", fontSize: 15, lineHeight: 1.7, maxWidth: 420 }}>
                  {t('itin.cin.geographyDesc')}
                </p>
                {data.geometry && (() => {
                  const g = data.geometry;
                  const km = g.spanKm < 10
                    ? g.spanKm.toFixed(1).replace(".", lang === "it" ? "," : ".")
                    : String(Math.round(g.spanKm));
                  const line = (g.walkable
                    ? t('itin.cin.geo.compact').replace("{km}", km).replace("{min}", String(g.walkMinutes))
                    : t('itin.cin.geo.spread').replace("{km}", km));
                  return (
                    <p style={{ marginTop: 14, color: "var(--ic-ink-faint)", fontSize: 13, lineHeight: 1.6, maxWidth: 420, display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: "var(--ic-accent, #E94560)", fontWeight: 700, flexShrink: 0 }}>◷</span>
                      <span>{line}</span>
                    </p>
                  );
                })()}
              </div>
              <div className="map-vis">
                <svg viewBox="0 0 400 400">
                  {data.mapPoints.length > 1 && (
                    <path className="map-line" d={data.mapPoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ")} />
                  )}
                  {data.mapPoints.map((p, i) => (
                    <g key={i}>
                      <ellipse cx={p.x} cy={p.y} rx={6} ry={6} className="map-pin" />
                      <text x={p.x + 14} y={p.y + 5} fill="rgba(245,240,238,.6)" fontSize="11" fontFamily="serif" fontStyle="italic">{p.label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* PRACTICAL — own chapter for budget/packing/best-time/getting-there */}
      {activeTab === "practical" && practicalSection && (
        <section id="ic-practical" className="chapter-section">
          <div className="ic-container">
            <div className="chapter-head">
              <div className="eyebrow"><span className="d" />{t('itin.cin.practicalEyebrow')}</div>
              <h2 className="chapter-h2">{t('itin.cin.practicalTitle')}</h2>
            </div>
            <div className="chapter-body">{practicalSection}</div>
          </div>
        </section>
      )}

      {/* BOOKING — own chapter for affiliate links */}
      {activeTab === "booking" && bookingSection && (
        <section id="ic-booking" className="chapter-section">
          <div className="ic-container">
            <div className="chapter-head">
              <div className="eyebrow"><span className="d" />{t('itin.cin.bookingEyebrow')}</div>
              <h2 className="chapter-h2">{t('itin.cin.bookingTitle')}</h2>
            </div>
            <div className="chapter-body">{bookingSection}</div>
          </div>
        </section>
      )}

      {/* Backward compatibility: old extras slot. Skip when new props are used. */}
      {extraSections && !practicalSection && !bookingSection && (
        <section className="extras">
          <div className="ic-container">
            <div className="extras-head">
              <div>
                <div className="eyebrow"><span className="d" />{t('itin.cin.extrasEyebrow')}</div>
                <h2 style={{ marginTop: 14 }}>{t('itin.cin.extrasTitle')}</h2>
              </div>
            </div>
            {extraSections}
          </div>
        </section>
      )}

      {/* CLOSING — narrative end of the Itinerary tab */}
      {activeTab === "itinerary" && (
      <section className="closing">
        <div className="ic-container">
          {data.closingQuote && <p className="closing-quote">"{data.closingQuote}"</p>}
          <div className="closing-actions">
            {onSavePdf && <button className="closing-link primary" onClick={onSavePdf}>{t('itin.pdf')}</button>}
            {onStartOver && <button className="closing-link" onClick={onStartOver}>{t('itin.startover')}</button>}
          </div>
        </div>
      </section>
      )}

      {/* MOBILE STICKY BOTTOM — persistent primary booking CTA + PDF; shown only
          after hero on small screens (display:none above 720px via CSS). */}
      {(onSavePdf || bookingSection) && (
        <div className={"ic-mobile-bottombar" + (scrolled ? " visible" : "")}>
          {bookingSection && activeTab !== "booking" && (
            <button className="ic-mobile-book" onClick={() => selectTab("booking")}>
              {t('itin.cin.book.cta')} <span className="ic-mobile-book-arrow">→</span>
            </button>
          )}
          {onSavePdf && (
            <button className={"ic-mobile-bottombar-btn" + (bookingSection && activeTab !== "booking" ? " secondary" : "")} onClick={onSavePdf}>
              <span className="ic-mobile-bottombar-label">{t('itin.pdf')}</span>
              <span className="ic-mobile-bottombar-counter">
                {t('itin.cin.dayLabel')} {activeDay}/{data.days.length}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
