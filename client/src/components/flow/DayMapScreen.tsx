/**
 * 4 · MAPPA DEL GIORNO — lo stesso giorno, nello spazio.
 *
 * Il percorso si legge senza aprire niente: accanto a ogni pin l'orario e il
 * nome del posto. Linea continua dove il percorso è calcolato sulle strade
 * vere, tratteggiata dove è solo un collegamento stimato.
 *
 * Esiste come schermata solo su phone e tablet: da 1024px in su la mappa vive
 * accanto al giorno (lo shell reindirizza), perché lì c'è spazio per entrambi.
 * ─────────────────────────────────────────────────────────────── */
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Bookmark, ChevronLeft, ChevronRight, Clock, Compass, Download, Euro,
  ExternalLink, Footprints, Gauge, Map as MapIcon, MoreHorizontal,
  Navigation, Share2, Sparkles, UserRound, X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import type { RoutePoint } from "@/components/RouteMap";
import { unsplashSized } from "@/lib/img";
import { useFlow } from "./context";

const RouteMap = lazy(() => import("@/components/RouteMap"));

type Lens = "days" | "activities" | "pace" | "transport";
type FilterKey = "sight" | "food" | "lodging" | "custom";

const bg = (url?: string, width = 900) => url
  ? `url(${unsplashSized(url, width, 76)})`
  : "none";

function pointKind(point: RoutePoint): FilterKey {
  const category = String(point.category ?? "").toLowerCase();
  if (category === "food") return "food";
  if (category === "lodging") return "lodging";
  if (category === "custom") return "custom";
  return "sight";
}

export function DayMapScreen({ n }: { n: number }) {
  const f = useFlow();
  const [, setLocation] = useLocation();
  const day = f.days.find(item => item.n === n) ?? f.days[0];
  const moments = useMemo(() => f.momentsByDay[n] ?? [], [f.momentsByDay, n]);
  const [lens, setLens] = useState<Lens>("activities");
  const [showRoute, setShowRoute] = useState(true);
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    sight: true, food: true, lodging: true, custom: true,
  });

  const points = useMemo<RoutePoint[]>(() => (f.data.mapPoints ?? [])
    .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lng))
    .map(point => ({
      lat: point.lat!, lng: point.lng!, label: point.label, day: point.day,
      slot: point.slot, category: point.category, momentId: point.momentId,
      imageUrl: point.imageUrl, durationLabel: point.durationLabel,
      bestTime: point.bestTime, kindLabel: point.kindLabel, desc: point.desc,
      bookable: point.bookable, ctaUrl: point.ctaUrl, cta: point.cta,
      ctaProvider: point.ctaProvider, ctaPrice: point.ctaPrice, type: point.type,
    })), [f.data.mapPoints]);

  const momentOrder = useMemo(() => new Map(moments.map((moment, index) => [moment.id, index])), [moments]);
  const dayPoints = useMemo(() => points
    .filter(point => point.day === n)
    .sort((a, b) => (momentOrder.get(a.momentId) ?? 99) - (momentOrder.get(b.momentId) ?? 99)),
  [points, n, momentOrder]);
  const visiblePoints = useMemo(() => points.filter(point => filters[pointKind(point)]), [points, filters]);
  const [selectedPoint, setSelectedPoint] = useState<RoutePoint | null>(null);

  useEffect(() => {
    setSelectedPoint(dayPoints.find(point => pointKind(point) !== "lodging") ?? dayPoints[0] ?? null);
  }, [n, dayPoints]);

  useEffect(() => {
    if (selectedPoint && !filters[pointKind(selectedPoint)]) {
      setSelectedPoint(dayPoints.find(point => filters[pointKind(point)]) ?? null);
    }
  }, [filters, selectedPoint, dayPoints]);

  const selectedMoment = selectedPoint
    ? moments.find(moment => moment.id === selectedPoint.momentId)
      ?? moments.find(moment => moment.title === selectedPoint.label)
    : null;
  const selectedIndex = selectedPoint ? dayPoints.findIndex(point => point === selectedPoint || point.momentId === selectedPoint.momentId) : -1;
  const nextPoint = selectedIndex >= 0 ? dayPoints[selectedIndex + 1] : null;
  const selectedSaved = !!selectedMoment?.id && !!f.savedMomentIds?.has(selectedMoment.id);
  const selectedTime = selectedMoment?.startTime || selectedPoint?.bestTime || "";
  const selectedEnd = selectedMoment?.endTime || "";
  const selectedDescription = selectedMoment?.guide?.whatItIs || selectedMoment?.desc || selectedPoint?.desc;
  const selectedLocation = selectedMoment?.locationName || selectedPoint?.label;
  const mapUrl = selectedPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.lat},${selectedPoint.lng}`
    : "";

  const toggleFilter = (key: FilterKey) => setFilters(current => ({ ...current, [key]: !current[key] }));
  const askCompanion = (seed: string) => {
    window.dispatchEvent(new CustomEvent("mindroute:companion-nudge", {
      detail: { itineraryId: f.itineraryId, text: seed, seed },
    }));
    window.dispatchEvent(new Event("mindroute:open-companion"));
  };

  if (!day) return <div className="mrf-empty">{f.t("if.day.empty")}</div>;

  return (
    <div className="mrm">
      <aside className="mrj-side mrm-side">
        <button className="mrj-brand" onClick={f.goHome}><BrandMark size={34} /><span>MindRoute</span></button>
        <nav>
          <button className="on" onClick={() => f.openStudio?.(n)}><Sparkles size={19} /><span>Studio</span></button>
          <button onClick={() => f.goDay(n)}><Compass size={19} /><span>{f.L("Itinerario", "Itinerary")}</span></button>
          <button onClick={() => setLocation("/my-account?view=portrait")}><UserRound size={19} /><span>Portrait</span></button>
        </nav>
      </aside>

      <main className="mrm-main">
        <header className="mrm-topbar">
          <button className="mrm-trip" onClick={f.goOverview}>
            <i style={{ backgroundImage: bg(f.data.heroImg, 160) }} />
            <span><strong>{f.data.destination}</strong><small>{f.data.duration}</small></span>
            <ChevronRight size={14} />
          </button>
          <nav className="mrm-views">
            <button onClick={() => f.openStudio?.(n)}><Compass size={15} />{f.L("Piano", "Plan")}</button>
            <button className="on"><MapIcon size={16} />{f.L("Mappa", "Map")}</button>
            <button onClick={f.goLogistics}><Gauge size={15} />{f.L("Controllo", "Check")}</button>
          </nav>
          <div className="mrm-actions">
            <button className="ai" onClick={() => askCompanion(f.L(`Analizza il percorso del Giorno ${n}.`, `Analyse the route for Day ${n}.`))}><Sparkles size={15} /><span>AI Assistant</span></button>
            <button onClick={() => f.onShare?.()}><Share2 size={15} /><span>{f.L("Condividi", "Share")}</span></button>
            <button onClick={() => f.onSavePdf?.()}><Download size={15} /><span>{f.L("Esporta", "Export")}</span></button>
            <button onClick={f.goLogistics} aria-label={f.L("Altre opzioni", "More options")}><MoreHorizontal size={17} /></button>
          </div>
        </header>

        <div className="mrm-workspace">
          <section className="mrm-map-area">
            <div className="mrm-lenses">
              {(["days", "activities", "pace", "transport"] as Lens[]).map(item => <button key={item} className={lens === item ? "on" : ""} onClick={() => setLens(item)}>{({ days: f.L("Giorni", "Days"), activities: f.L("Attività", "Activities"), pace: f.L("Ritmo", "Pace"), transport: f.L("Trasporti", "Transport") } as Record<Lens, string>)[item]}</button>)}
            </div>

            <aside className="mrm-filter-card">
              {lens === "days" && <>
                <h3>{f.L("Scegli il giorno", "Choose the day")}</h3>
                <div className="mrm-day-filter">{f.days.map(item => <button key={item.n} className={item.n === n ? "on" : ""} onClick={() => f.goMap(item.n)}><b>{String(item.n).padStart(2, "0")}</b><span>{item.title}</span></button>)}</div>
              </>}
              {lens === "activities" && <>
                <h3>{f.L("Filtri mappa", "Map filters")}</h3>
                <FilterToggle label={f.L("Attrazioni ed esperienze", "Sights and experiences")} active={filters.sight} onClick={() => toggleFilter("sight")} />
                <FilterToggle label={f.L("Ristoranti", "Restaurants")} active={filters.food} onClick={() => toggleFilter("food")} />
                <FilterToggle label={f.L("Hotel", "Hotels")} active={filters.lodging} onClick={() => toggleFilter("lodging")} />
                <FilterToggle label={f.L("Note personali", "Personal notes")} active={filters.custom} onClick={() => toggleFilter("custom")} />
                <div className="mrm-legend"><b>{f.L("Legenda", "Legend")}</b><span><i className="current" />{f.L(`Giorno ${n}`, `Day ${n}`)}</span><span><i className="other" />{f.L("Altri giorni", "Other days")}</span><span><i className="route" />{f.L("Percorso", "Route")}</span></div>
              </>}
              {lens === "pace" && <>
                <h3>{f.L("Ritmo del giorno", "Day pace")}</h3>
                <div className="mrm-metric"><b>{moments.length}</b><span>{f.L("tappe pianificate", "planned stops")}</span></div>
                <p>{day.arc || f.L("Il ritmo segue l'ordine reale delle tappe.", "The pace follows the real stop order.")}</p>
                <button className="mrm-smart" onClick={() => askCompanion(f.L(`Alleggerisci il Giorno ${n}.`, `Lighten Day ${n}.`))}><Sparkles size={13} />{f.L("Alleggerisci con l'AI", "Lighten with AI")}</button>
              </>}
              {lens === "transport" && <>
                <h3>{f.L("Spostamenti", "Transport")}</h3>
                <FilterToggle label={f.L("Mostra percorso", "Show route")} active={showRoute} onClick={() => setShowRoute(value => !value)} />
                <div className="mrm-transfers">{moments.filter(moment => moment.transport).map(moment => <span key={moment.id || moment.title}><Footprints size={12} /><b>{moment.title}</b><small>{moment.transport}</small></span>)}</div>
              </>}
            </aside>

            <div className="mrm-map">
              {visiblePoints.length > 0 ? <Suspense fallback={<div className="mrm-loading">{f.t("if.loading")}</div>}>
                <RouteMap
                  points={visiblePoints}
                  center={f.data.mapCenter}
                  destination={f.data.destination}
                  itineraryId={f.itineraryId}
                  t={f.t}
                  lang={f.lang}
                  initialDay={n}
                  active
                  bare
                  hideDayBar
                  hideCard
                  hideBareControls
                  showRoute={showRoute}
                  showPlaceLabels
                  selectedMomentId={selectedPoint?.momentId ?? null}
                  onSelectPoint={setSelectedPoint}
                  onBook={(type, dayN) => f.markClicked(type, dayN ?? n)}
                  onOpenDay={(dayN, momentId) => momentId ? f.goMoment(dayN, momentId) : f.goDay(dayN)}
                />
              </Suspense> : <div className="mrm-loading">{f.t("if.map.noPoints")}</div>}
            </div>

            <section className="mrm-timeline">
              <header><strong>{f.L("Giorno", "Day")} {n}</strong><span>{day.title}</span><button className="full" onClick={() => f.goDay(n)}>{f.L("Vedi piano completo", "View full plan")}</button></header>
              <div>
                {dayPoints.filter(point => pointKind(point) !== "lodging").map((point, index) => {
                  const moment = moments.find(item => item.id === point.momentId) ?? moments.find(item => item.title === point.label);
                  return <button key={`${point.lat}-${point.lng}`} className={selectedPoint?.momentId === point.momentId ? "on" : ""} onClick={() => setSelectedPoint(point)}>
                    <span className="meta"><i>{index + 1}</i><time>{moment?.startTime || point.bestTime || ""}</time></span>
                    <strong>{point.label}</strong><small>{moment?.kindLabel || point.kindLabel || point.category || ""}</small>
                    <span className="image" style={{ backgroundImage: bg(point.imageUrl || day.img, 300) }} />
                    <em>{moment?.durationLabel || point.durationLabel || ""}</em>
                  </button>;
                })}
              </div>
            </section>

            <nav className="mrm-daybar">
              <button onClick={() => f.goMap(f.days[Math.max(0, f.days.findIndex(item => item.n === n) - 1)]?.n ?? n)}><ChevronLeft size={15} /></button>
              {f.days.map(item => <button key={item.n} className={item.n === n ? "on" : ""} onClick={() => f.goMap(item.n)}><span>{f.L("Giorno", "Day")} {item.n}</span><b>{item.title}</b></button>)}
              <button onClick={() => f.goMap(f.days[Math.min(f.days.length - 1, f.days.findIndex(item => item.n === n) + 1)]?.n ?? n)}><ChevronRight size={15} /></button>
            </nav>
          </section>

          <aside className="mrm-detail">
            {selectedPoint ? <>
              <div className="mrm-detail-image" style={{ backgroundImage: bg(selectedPoint.imageUrl || day.img || f.data.heroImg, 800) }}>
                <div><b>{f.L("Giorno", "Day")} {n}</b>{selectedTime && <span>{selectedTime}{selectedEnd ? ` – ${selectedEnd}` : ""}</span>}</div>
                <button onClick={() => setSelectedPoint(null)} aria-label={f.L("Chiudi", "Close")}><X size={15} /></button>
              </div>
              <div className="mrm-detail-body">
                <h2>{selectedPoint.label}</h2>
                {(selectedMoment?.kindLabel || selectedPoint.kindLabel) && <span className="mrm-kind">{selectedMoment?.kindLabel || selectedPoint.kindLabel}</span>}
                {selectedDescription && <p>{selectedDescription}</p>}
                <div className="mrm-detail-actions">
                  {selectedMoment?.id && f.onToggleSaved && <button className={selectedSaved ? "on" : ""} onClick={() => f.onToggleSaved?.(selectedMoment.id!, selectedMoment)}><Bookmark size={14} />{selectedSaved ? f.L("Salvato", "Saved") : f.L("Salva", "Save")}</button>}
                  {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer"><Navigation size={14} />Google Maps</a>}
                </div>

                <section className="mrm-info">
                  <h3>{f.L("Info utili", "Useful info")}</h3>
                  {selectedMoment?.durationLabel && <Info icon={<Clock size={14} />} label={f.L("Durata consigliata", "Suggested duration")} value={selectedMoment.durationLabel} />}
                  {selectedMoment?.transport && <Info icon={<Footprints size={14} />} label={f.L("Come arrivare", "How to get there")} value={selectedMoment.transport} />}
                  {selectedMoment?.costLabel && <Info icon={<Euro size={14} />} label={f.L("Costo indicativo", "Estimated cost")} value={selectedMoment.costLabel} />}
                  {selectedLocation && <Info icon={<MapIcon size={14} />} label={f.L("Luogo", "Location")} value={selectedLocation} />}
                </section>

                {selectedMoment?.why && <section className="mrm-why"><Sparkles size={15} /><div><h3>{f.L("Perché è nel tuo viaggio", "Why it is in your trip")}</h3><p>{selectedMoment.why}</p></div></section>}
                {nextPoint && <section className="mrm-next"><h3>{f.L("Dopo questa attività", "After this activity")}</h3><button onClick={() => setSelectedPoint(nextPoint)}><i style={{ backgroundImage: bg(nextPoint.imageUrl || day.img, 180) }} /><span><b>{nextPoint.label}</b><small>{moments.find(moment => moment.id === nextPoint.momentId)?.startTime || nextPoint.bestTime}</small></span><ChevronRight size={14} /></button></section>}
                <button className="mrm-edit" onClick={() => f.openStudio?.(n)}><Sparkles size={15} />{f.L("Modifica nel piano", "Edit in the plan")}</button>
                {selectedMoment?.id && <button className="mrm-open" onClick={() => f.goMoment(n, selectedMoment.id!)}>{f.L("Apri tutti i dettagli", "Open all details")}<ExternalLink size={13} /></button>}
              </div>
            </> : <div className="mrm-detail-empty"><MapIcon size={24} /><h2>{f.L("Seleziona una tappa", "Select a stop")}</h2><p>{f.L("Tocca un punto sulla mappa o una card nella timeline.", "Tap a point on the map or a card in the timeline.")}</p></div>}
          </aside>
        </div>
      </main>
    </div>
  );
}

function FilterToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return <button className="mrm-toggle" onClick={onClick}><span>{label}</span><i className={active ? "on" : ""} /></button>;
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div><span>{icon}{label}</span><b>{value}</b></div>;
}
