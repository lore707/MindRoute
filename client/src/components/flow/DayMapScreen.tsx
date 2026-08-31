import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  AlertTriangle, Bookmark, CalendarDays, CheckCircle2, ChevronRight, Clock,
  Compass, Download, Euro, ExternalLink, Footprints, Gauge, Heart, HelpCircle,
  Map as MapIcon, MoreHorizontal, Navigation, Plus, Search, Settings, Share2,
  Sparkles, UserRound, X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import type { RoutePoint } from "@/components/RouteMap";
import { unsplashSized } from "@/lib/img";
import { useFlow } from "./context";

const RouteMap = lazy(() => import("@/components/RouteMap"));
const MAP_PADDING = { top: 80, right: 100, bottom: 255, left: 100 };

const bg = (url?: string, width = 900) => url
  ? `url(${unsplashSized(url, width, 76)})`
  : "none";

function isLodging(point: RoutePoint) {
  return String(point.category ?? "").toLowerCase() === "lodging";
}

export function DayMapScreen({ n }: { n: number }) {
  const f = useFlow();
  const [, setLocation] = useLocation();
  const day = f.days.find(item => item.n === n) ?? f.days[0];
  const moments = useMemo(() => f.momentsByDay[n] ?? [], [f.momentsByDay, n]);
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
  const [selectedPoint, setSelectedPoint] = useState<RoutePoint | null>(null);

  useEffect(() => {
    setSelectedPoint(dayPoints.find(point => !isLodging(point)) ?? dayPoints[0] ?? null);
  }, [n, dayPoints]);

  const selectedMoment = selectedPoint
    ? moments.find(moment => moment.id === selectedPoint.momentId)
      ?? moments.find(moment => moment.title === selectedPoint.label)
    : null;
  const selectedIndex = selectedPoint
    ? dayPoints.findIndex(point => point === selectedPoint || point.momentId === selectedPoint.momentId)
    : -1;
  const nextPoint = selectedIndex >= 0 ? dayPoints[selectedIndex + 1] : null;
  const selectedSaved = !!selectedMoment?.id && !!f.savedMomentIds?.has(selectedMoment.id);
  const selectedTime = selectedMoment?.startTime || selectedPoint?.bestTime || "";
  const selectedEnd = selectedMoment?.endTime || "";
  const selectedDescription = selectedMoment?.guide?.whatItIs || selectedMoment?.desc || selectedPoint?.desc;
  const selectedLocation = selectedMoment?.locationName || selectedPoint?.label;
  const mapUrl = selectedPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${selectedPoint.lat},${selectedPoint.lng}`
    : "";

  const rawTrip = f.itinerary ?? {};
  const targetBudget = Number(rawTrip.tripMeta?.studio_budget_target ?? rawTrip.budgetMax ?? 0);
  const currentBudget = Number(rawTrip.tripMeta?.total_cost_bookable ?? 0)
    + Number(rawTrip.tripMeta?.total_cost_onsite_estimate ?? 0);
  const budgetProgress = targetBudget > 0 ? Math.min(100, Math.round(currentBudget / targetBudget * 100)) : 0;
  const pendingBookings = f.bookingItems.filter(item => !f.checked[item.id]).length;
  const dayIsDense = moments.length >= 6;
  const strategy = [
    {
      icon: <Gauge size={15} />,
      title: f.L(dayIsDense ? "Ritmo pieno" : "Ritmo equilibrato", dayIsDense ? "Full pace" : "Balanced pace"),
      text: dayIsDense
        ? f.L("Una giornata ricca, da alleggerire se vuoi più libertà.", "A rich day, ready to lighten if you want more freedom.")
        : f.L("Tempo sufficiente nei luoghi, senza correre.", "Enough time in each place, without rushing."),
    },
    {
      icon: <Compass size={15} />,
      title: f.data.highlights[0]?.name || f.L("Cultura locale", "Local culture"),
      text: f.data.highlights[0]?.desc || f.L("Luoghi collegati alla storia e al carattere della destinazione.", "Places connected to the destination's story and character."),
    },
    {
      icon: <Navigation size={15} />,
      title: f.L("Spostamenti più semplici", "Simpler transfers"),
      text: f.data.geometry?.walkable
        ? f.L("Il percorso resta compatto e leggibile a piedi.", "The route stays compact and walkable.")
        : f.L("La sequenza limita ritorni e cambi inutili.", "The sequence limits backtracking and unnecessary changes."),
    },
  ];

  const askCompanion = (seed: string) => {
    window.dispatchEvent(new CustomEvent("mindroute:companion-nudge", {
      detail: { itineraryId: f.itineraryId, text: seed, seed },
    }));
    window.dispatchEvent(new Event("mindroute:open-companion"));
  };

  if (!day) return <div className="mrf-empty">{f.t("if.day.empty")}</div>;

  return (
    <div className="mrm2">
      <header className="mrm2-topbar">
        <button className="mrm2-brand" onClick={f.goHome}><BrandMark size={25} /><strong>MindRoute</strong></button>
        <button className="mrm2-trip" onClick={f.goOverview}>
          <i style={{ backgroundImage: bg(f.data.heroImg, 120) }} />
          <span><strong>{f.data.destination}</strong><small>{f.data.duration}</small></span>
          <ChevronRight size={14} />
        </button>
        <div className="mrm2-top-actions">
          <button onClick={() => askCompanion(f.L(`Analizza e migliora il Giorno ${n}.`, `Analyse and improve Day ${n}.`))}><Sparkles size={14} /><span>{f.L("Lavora con l'AI", "Work with AI")}</span></button>
          <button onClick={() => f.onShare?.()}><Share2 size={14} /><span>{f.L("Condividi", "Share")}</span></button>
          <button className="travel" onClick={() => f.goDay(n)}><Navigation size={14} /><span>{f.L("Apri modalità viaggio", "Open travel mode")}</span></button>
          <em><CheckCircle2 size={13} />{f.L("Salvato", "Saved")}</em>
          <button className="icon" onClick={f.onSavePdf} aria-label={f.L("Esporta", "Export")}><Download size={15} /></button>
          <button className="avatar" onClick={() => setLocation("/my-account?view=portrait")}>MR</button>
        </div>
      </header>

      <aside className="mrm2-rail">
        <button className="primary" onClick={() => f.openStudio?.(n)}><Plus size={20} /><span>{f.L("Aggiungi", "Add")}</span></button>
        <button onClick={() => f.openStudio?.(n)}><Search size={19} /><span>{f.L("Cerca / Importa", "Search / Import")}</span></button>
        <button onClick={() => f.openStudio?.(n)}><Heart size={19} /><span>{f.L("Forse", "Maybe")}</span></button>
        <button onClick={() => setLocation("/my-account?view=portrait")}><UserRound size={19} /><span>{f.L("Ritratto", "Portrait")}</span></button>
        <div />
        <button onClick={f.goLogistics}><Settings size={18} /><span>{f.L("Impostazioni", "Settings")}</span></button>
        <button onClick={() => askCompanion(f.L("Aiutami a usare la mappa del viaggio.", "Help me use the trip map."))}><HelpCircle size={18} /></button>
      </aside>

      <main className="mrm2-shell">
        <aside className="mrm2-left">
          <section className="mrm2-strategy">
            <header><span>{f.L("Strategia del viaggio", "Trip strategy")}</span><button onClick={() => f.openStudio?.(n)}>{f.L("Modifica", "Edit")}</button></header>
            {strategy.map((item, index) => <article key={index}><i>{item.icon}</i><p><strong>{item.title}</strong><small>{item.text}</small></p></article>)}
          </section>
          <nav className="mrm2-days">
            {f.days.map(item => {
              const itemMoments = f.momentsByDay[item.n] ?? [];
              return <button key={item.n} className={item.n === n ? "on" : ""} onClick={() => f.goMap(item.n)}>
                <i style={{ backgroundImage: bg(item.img || f.data.heroImg, 150) }} />
                <span><small>{f.L("Giorno", "Day")} {item.n}{item.date ? ` · ${item.date}` : ""}</small><strong>{item.title}</strong><em>{itemMoments.length} {f.L("attività", "activities")} · {item.sub || f.data.destination}</em></span>
                <MoreHorizontal size={14} />
              </button>;
            })}
            <button className="add" onClick={() => f.openStudio?.(n)}><Plus size={14} />{f.L("Aggiungi giorno", "Add day")}</button>
          </nav>
        </aside>

        <section className="mrm2-canvas">
          <div className="mrm2-map">
            {points.length > 0 ? <Suspense fallback={<div className="mrm-loading">{f.t("if.loading")}</div>}>
              <RouteMap
                points={points}
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
                showRoute
                showPlaceLabels
                fitPadding={MAP_PADDING}
                selectedMomentId={selectedPoint?.momentId ?? null}
                onSelectPoint={setSelectedPoint}
                onBook={(type, dayN) => f.markClicked(type, dayN ?? n)}
                onOpenDay={(dayN, momentId) => momentId ? f.goMoment(dayN, momentId) : f.goDay(dayN)}
              />
            </Suspense> : <div className="mrm-loading">{f.t("if.map.noPoints")}</div>}
          </div>

          <section className="mrm2-control">
            <header><strong>{f.L("Controllo viaggio", "Trip check")}</strong><ChevronRight size={13} /></header>
            <article><span><Euro size={13} />Budget</span><b>{currentBudget ? `€${currentBudget.toLocaleString("it-IT")}` : "--"}{targetBudget ? ` / €${targetBudget.toLocaleString("it-IT")}` : ""}</b></article>
            {targetBudget > 0 && <i><b style={{ width: `${budgetProgress}%` }} /></i>}
            <article><span><Bookmark size={13} />{f.L("Prenotazioni mancanti", "Missing bookings")}</span><b>{pendingBookings}</b></article>
            <article className={dayIsDense ? "risk" : "ready"}><span>{dayIsDense ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}{f.L("Ritmo", "Pace")}</span><b>{dayIsDense ? f.L("Intenso", "Busy") : f.L("Equilibrato", "Balanced")}</b></article>
            <button onClick={f.goLogistics}>{f.L("Vedi dettagli", "View details")}<ChevronRight size={12} /></button>
          </section>

          <section className="mrm2-timeline">
            <header><span><small>{f.L("Giorno", "Day")} {n}{day.date ? ` · ${day.date}` : ""}</small><strong>{day.title}</strong></span><button onClick={() => askCompanion(f.L(`Ottimizza il Giorno ${n}.`, `Optimise Day ${n}.`))}><Sparkles size={13} />{f.L("Ottimizza con AI", "Optimise with AI")}</button></header>
            <div>
              {dayPoints.filter(point => !isLodging(point)).map((point, index) => {
                const moment = moments.find(item => item.id === point.momentId) ?? moments.find(item => item.title === point.label);
                return <button key={`${point.lat}-${point.lng}`} className={selectedPoint?.momentId === point.momentId ? "on" : ""} onClick={() => setSelectedPoint(point)}>
                  <time>{moment?.startTime || point.bestTime || "--:--"}</time>
                  <span style={{ backgroundImage: bg(point.imageUrl || day.img, 180) }} />
                  <p><strong>{point.label}</strong><small>{moment?.kindLabel || point.kindLabel || point.category || ""}</small></p>
                  <i>{index + 1}</i>
                </button>;
              })}
            </div>
          </section>
        </section>

        <aside className="mrm2-detail">
          {selectedPoint ? <>
            <header><h2>{selectedPoint.label}</h2><button onClick={() => setSelectedPoint(null)}><X size={15} /></button><span><MapIcon size={12} />{f.L("Giorno", "Day")} {n}{selectedTime ? ` · ${selectedTime}${selectedEnd ? `–${selectedEnd}` : ""}` : ""}</span></header>
            <div className="mrm2-detail-image" style={{ backgroundImage: bg(selectedPoint.imageUrl || day.img || f.data.heroImg, 800) }} />
            <div className="mrm2-detail-actions">
              {selectedMoment?.id && f.onToggleSaved && <button className={selectedSaved ? "on" : ""} onClick={() => f.onToggleSaved?.(selectedMoment.id!, selectedMoment)}><Bookmark size={13} />{selectedSaved ? f.L("Salvato", "Saved") : f.L("Salva", "Save")}</button>}
              {mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer"><Navigation size={13} />{f.L("Naviga", "Navigate")}</a>}
              <button onClick={() => f.openStudio?.(n)}><MoreHorizontal size={14} /></button>
            </div>
            <div className="mrm2-detail-body">
              {(selectedMoment?.kindLabel || selectedPoint.kindLabel) && <span className="mrm-kind">{selectedMoment?.kindLabel || selectedPoint.kindLabel}</span>}
              {selectedDescription && <p>{selectedDescription}</p>}
              {selectedMoment?.why && <section className="mrm-why"><Sparkles size={14} /><div><h3>{f.L("Perché è nel tuo viaggio", "Why it is in your trip")}</h3><p>{selectedMoment.why}</p></div></section>}
              <section className="mrm-info">
                <h3>{f.L("Info utili", "Useful info")}</h3>
                {selectedMoment?.durationLabel && <Info icon={<Clock size={13} />} label={f.L("Tempo di visita", "Visit time")} value={selectedMoment.durationLabel} />}
                {selectedMoment?.transport && <Info icon={<Footprints size={13} />} label={f.L("Spostamento precedente", "Previous transfer")} value={selectedMoment.transport} />}
                {selectedMoment?.costLabel && <Info icon={<Euro size={13} />} label={f.L("Budget stimato", "Estimated budget")} value={selectedMoment.costLabel} />}
                {selectedLocation && <Info icon={<MapIcon size={13} />} label={f.L("Luogo", "Location")} value={selectedLocation} />}
              </section>
              {nextPoint && <section className="mrm-next"><h3>{f.L("Dopo questa attività", "After this activity")}</h3><button onClick={() => setSelectedPoint(nextPoint)}><i style={{ backgroundImage: bg(nextPoint.imageUrl || day.img, 180) }} /><span><b>{nextPoint.label}</b><small>{moments.find(moment => moment.id === nextPoint.momentId)?.startTime || nextPoint.bestTime}</small></span><ChevronRight size={14} /></button></section>}
              <button className="mrm-edit" onClick={() => f.openStudio?.(n)}><Sparkles size={14} />{f.L("Modifica attività", "Edit activity")}</button>
              {selectedMoment?.id && <button className="mrm-open" onClick={() => f.goMoment(n, selectedMoment.id!)}>{f.L("Apri tutti i dettagli", "Open all details")}<ExternalLink size={12} /></button>}
            </div>
          </> : <div className="mrm-detail-empty"><MapIcon size={24} /><h2>{f.L("Seleziona una tappa", "Select a stop")}</h2><p>{f.L("Tocca un punto sulla mappa o una card nella timeline.", "Tap a point on the map or a card in the timeline.")}</p></div>}
        </aside>
      </main>
    </div>
  );
}

function Info({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div><span>{icon}{label}</span><b>{value}</b></div>;
}
