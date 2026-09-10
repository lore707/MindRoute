import { useEffect, useState, type CSSProperties } from "react";
import { useLocation } from "wouter";
import {
  Bookmark, CalendarDays, CheckCircle2, Clock, Compass, Download, Euro,
  Footprints, Gauge, Map as MapIcon, MapPin, Plus, Share2, Sparkles,
  UserRound, Utensils, X,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { unsplashSized } from "@/lib/img";
import { useFlow } from "./context";
import { DayMap } from "./DayMap";

const bg = (url: string | undefined, width: number, quality = 72) => url
  ? `url(${unsplashSized(url, width, quality)})`
  : "none";

type InspectorView = "activity" | "map" | "why" | "control";
type ActivityTab = "details" | "why" | "practical";

export function JourneyScreen({ n }: { n: number }) {
  const f = useFlow();
  const [, setLocation] = useLocation();
  const day = f.days.find(item => item.n === n) ?? f.days[0];
  const moments = day ? f.momentsByDay[day.n] ?? [] : [];
  const raw = day ? f.rawDay(day.n) : null;
  const [selectedMomentIndex, setSelectedMomentIndex] = useState<number | null>(null);
  const [inspectorView, setInspectorView] = useState<InspectorView>("map");
  const [activityTab, setActivityTab] = useState<ActivityTab>("details");

  useEffect(() => {
    setSelectedMomentIndex(null);
    setInspectorView("map");
    setActivityTab("details");
  }, [day?.n]);

  const selectedMoment = selectedMomentIndex === null ? null : moments[selectedMomentIndex] ?? null;
  const dayBookable = Number(raw?.cost_bookable_total ?? 0) || 0;
  const dayOnsite = Number(raw?.cost_onsite_estimate ?? 0) || 0;
  const dayBudget = Math.round(dayBookable + dayOnsite);
  const pendingBookings = f.bookingItems.filter(item => !f.checked[item.id]).length;
  const alternatives = moments.filter(moment => moment.planB).slice(0, 3);
  const dayWhy = raw?.why_this ?? raw?.whyThis ?? moments.find(moment => moment.why)?.why ?? f.data.manifesto;
  const paceValue = String(f.profilingInput?.pace ?? "").toLowerCase();
  const paceLabel = /slow|relax|lento/.test(paceValue)
    ? f.L("Ritmo lento", "Slow pace")
    : /fast|dynamic|intens|veloce/.test(paceValue)
      ? f.L("Ritmo dinamico", "Dynamic pace")
      : f.L("Ritmo equilibrato", "Balanced pace");
  const strategy = [
    { icon: <Gauge size={17} />, label: paceLabel, text: f.L("Tempi realistici e spazio per vivere i luoghi.", "Realistic timing and room to experience each place.") },
    { icon: <Compass size={17} />, label: f.data.highlights?.[0]?.name || f.L("Luoghi autentici", "Authentic places"), text: f.data.highlights?.[0]?.desc || f.L("Scelte coerenti con ciò che cerchi davvero.", "Choices aligned with what you genuinely seek.") },
    { icon: <Utensils size={17} />, label: f.data.highlights?.[1]?.name || f.L("Esperienze locali", "Local experiences"), text: f.data.highlights?.[1]?.desc || f.L("Cultura e sapori inseriti nel ritmo del viaggio.", "Culture and food woven into the trip's pace.") },
  ];

  const askCompanion = (seed: string) => {
    window.dispatchEvent(new CustomEvent("mindroute:companion-nudge", {
      detail: { itineraryId: f.itineraryId, text: seed, seed },
    }));
    window.dispatchEvent(new Event("mindroute:open-companion"));
  };

  const selectMoment = (index: number) => {
    setSelectedMomentIndex(index);
    setInspectorView("activity");
    setActivityTab("details");
  };

  if (!day) return <div className="mrf-empty">{f.t("if.day.empty")}</div>;

  return (
    <div className="mrj">
      <aside className="mrj-side">
        <button className="mrj-brand" onClick={f.goHome}><BrandMark size={34} /><span>MindRoute</span></button>
        <nav>
          <button className="on" onClick={() => f.goDay(day.n)}><Sparkles size={20} /><span>{f.L("Piano", "Plan")}</span></button>
          <button onClick={() => f.goMap(day.n)}><MapIcon size={20} /><span>{f.L("Mappa", "Map")}</span></button>
          <button onClick={f.goLogistics}><CheckCircle2 size={20} /><span>{f.L("Controllo", "Check")}</span></button>
          <button onClick={() => setLocation("/my-account?view=portrait")}><UserRound size={20} /><span>Portrait</span></button>
        </nav>
        <button className="mrj-trip" onClick={f.goOverview}>
          <i style={{ backgroundImage: bg(f.data.heroImg, 260) }} />
          <span><strong>{f.data.destination}</strong><small>{f.data.duration}</small></span>
        </button>
      </aside>

      <div className="mrj-main">
        <section className="mrj-hero">
          <div className="mrj-hero-photo" style={{ backgroundImage: bg(f.data.heroImg, 2000, 80) }} />
          <div className="mrj-hero-veil" />
          <div className="mrj-actions">
            <button className="primary" onClick={() => f.goEdit(day.n)}><Sparkles size={15} />{f.L("Modifica piano", "Edit plan")}</button>
            <button onClick={() => f.onShare?.()}><Share2 size={15} />{f.L("Condividi", "Share")}</button>
            <button onClick={() => f.onSavePdf?.()} aria-label={f.L("Esporta PDF", "Export PDF")}><Download size={16} /></button>
          </div>
          <div className="mrj-hero-copy">
            <span>{f.data.country || f.data.destination} <i /> {f.data.duration}</span>
            <h1>{f.data.destination}</h1>
            <p>{f.data.subtitle || f.data.manifesto}</p>
            <div>{strategy.map((item, index) => <b key={index}>{item.icon}{item.label}</b>)}</div>
          </div>
        </section>

        <section className="mrj-work">
          <nav className="mrj-days">
            <header><span>{f.L("Il tuo viaggio", "Your trip")}</span><strong>{f.days.length} {f.L("giorni", "days")}</strong></header>
            {f.days.map(item => {
              const count = (f.momentsByDay[item.n] ?? []).length;
              return <button key={item.n} className={item.n === day.n ? "on" : ""} onClick={() => f.goDay(item.n)}>
                <small>{String(item.n).padStart(2, "0")}</small>
                <span><strong>{item.title}</strong><em>{count} {f.L("attività", "activities")}{item.date ? ` · ${item.date}` : ""}</em></span>
              </button>;
            })}
            <button className="add" onClick={() => f.goEdit(day.n)}><Plus size={15} />{f.L("Modifica il piano", "Edit plan")}</button>
          </nav>

          <main className="mrj-day">
            <header>
              <div><span>{f.data.destination} <i /> {f.L("Giorno", "Day")} {String(day.n).padStart(2, "0")}</span><h2>{day.title}</h2>{day.sub && <p>{day.sub}</p>}</div>
              <button onClick={() => f.goEdit(day.n)}>{f.L("Modifica giorno", "Edit day")}</button>
            </header>
            <div className="mrj-day-cover" style={{ backgroundImage: bg(day.img || f.data.heroImg, 1400, 80) }}>
              <span>“{day.arc || f.L("Una giornata costruita intorno a te", "A day built around you")}”</span>
            </div>

            <section className="mrj-plan-head">
              <div><span>{f.L("Piano della giornata", "Day plan")}</span><strong>{moments.length} {f.L("tappe", "stops")}</strong></div>
              <small>{f.L("Seleziona una tappa per vedere tutti i dettagli.", "Select a stop to see all details.")}</small>
            </section>

            <div className="mrj-timeline">
              {moments.map((moment, index) => <button
                key={moment.id ?? index}
                className={selectedMomentIndex === index ? "on" : ""}
                onClick={() => selectMoment(index)}
                aria-pressed={selectedMomentIndex === index}
              >
                <time>{moment.startTime || moment.t}</time><i />
                <span className="photo" style={{ backgroundImage: bg(moment.imageUrl || day.img, 260) }} />
                <span className="copy">
                  <em>{moment.kindLabel || moment.locationName || f.L("Tappa", "Stop")}</em>
                  <strong>{moment.title}</strong>
                  <small>{previewText(moment.guide?.whatItIs || moment.desc)}</small>
                </span>
                <span className="facts">
                  {moment.durationLabel && <b><Clock size={14} />{moment.durationLabel}</b>}
                  {moment.transport && <b><Footprints size={14} />{moment.transport}</b>}
                  {(moment.costLabel || moment.ctaPrice) && <b><Euro size={14} />{moment.costLabel || moment.ctaPrice}</b>}
                </span>
              </button>)}
              {!moments.length && <div className="mrj-empty">{f.t("if.day.empty")}</div>}
            </div>

            <div className="mrj-day-actions">
              <button onClick={() => f.goEdit(day.n)}><Plus size={15} />{f.L("Aggiungi attività", "Add activity")}</button>
              <button className="primary" onClick={() => askCompanion(f.L(`Migliora il Giorno ${day.n} mantenendo il carattere del viaggio.`, `Improve Day ${day.n} while preserving the trip character.`))}><Sparkles size={15} />{f.L("Migliora con l'AI", "Improve with AI")}</button>
              <button onClick={() => askCompanion(f.L(`Alleggerisci il Giorno ${day.n}.`, `Lighten Day ${day.n}.`))}><Gauge size={15} />{f.L("Alleggerisci", "Lighten")}</button>
            </div>

            {alternatives.length > 0 && <section className="mrj-alternatives"><header><span>{f.L("Alternative per oggi", "Alternatives for today")}</span></header><div>{alternatives.map((moment, index) => <article key={moment.id ?? index} style={{ backgroundImage: bg(moment.imageUrl || day.img, 420) }}><span><strong>{moment.title}</strong><small>{previewText(moment.planB, 90)}</small></span></article>)}</div></section>}
          </main>

          <aside className="mrj-context">
            <section className="mrj-inspector">
              <nav className="mrj-inspector-tabs" aria-label={f.L("Approfondimenti del giorno", "Day insights")}>
                <button className={inspectorView === "map" ? "on" : ""} onClick={() => setInspectorView("map")}><MapIcon size={15} />{f.L("Mappa", "Map")}</button>
                <button className={inspectorView === "why" ? "on" : ""} onClick={() => setInspectorView("why")}><Sparkles size={15} />{f.L("Perché", "Why")}</button>
                <button className={inspectorView === "control" ? "on" : ""} onClick={() => setInspectorView("control")}><CheckCircle2 size={15} />{f.L("Controllo", "Check")}</button>
              </nav>

              {inspectorView === "activity" && selectedMoment && <div className="mrj-activity-detail">
                <header><span>{f.L("Tappa selezionata", "Selected stop")}</span><button onClick={() => setInspectorView("map")} aria-label={f.L("Chiudi dettaglio", "Close details")}><X size={17} /></button></header>
                <div className="mrj-activity-photo" style={{ backgroundImage: bg(selectedMoment.imageUrl || day.img || f.data.heroImg, 760, 80) }} />
                <div className="mrj-activity-title">
                  <small>{selectedMoment.startTime || selectedMoment.t}{selectedMoment.kindLabel ? ` · ${selectedMoment.kindLabel}` : ""}</small>
                  <h3>{selectedMoment.title}</h3>
                  {selectedMoment.locationName && <span><MapPin size={14} />{selectedMoment.locationName}</span>}
                </div>
                <nav className="mrj-activity-tabs">
                  <button className={activityTab === "details" ? "on" : ""} onClick={() => setActivityTab("details")}>{f.L("Dettagli", "Details")}</button>
                  <button className={activityTab === "why" ? "on" : ""} onClick={() => setActivityTab("why")}>{f.L("Perché qui", "Why here")}</button>
                  <button className={activityTab === "practical" ? "on" : ""} onClick={() => setActivityTab("practical")}>{f.L("Info pratiche", "Practical")}</button>
                </nav>
                {activityTab === "details" && <div className="mrj-activity-copy">
                  <p>{selectedMoment.guide?.whatItIs || selectedMoment.desc || f.L("Apri il dettaglio per conoscere meglio questa tappa.", "Open the full detail to learn more about this stop.")}</p>
                  <div className="mrj-activity-facts">
                    {selectedMoment.durationLabel && <span><Clock size={15} /><small>{f.L("Durata", "Duration")}</small><b>{selectedMoment.durationLabel}</b></span>}
                    {(selectedMoment.costLabel || selectedMoment.ctaPrice) && <span><Euro size={15} /><small>{f.L("Costo", "Cost")}</small><b>{selectedMoment.costLabel || selectedMoment.ctaPrice}</b></span>}
                    {selectedMoment.transport && <span><Footprints size={15} /><small>{f.L("Arrivo", "Getting there")}</small><b>{selectedMoment.transport}</b></span>}
                  </div>
                </div>}
                {activityTab === "why" && <div className="mrj-activity-copy"><h4>{f.L("Perché è nel tuo viaggio", "Why it belongs in your trip")}</h4><p>{selectedMoment.why || selectedMoment.guide?.whyVisit || f.L("Questa tappa è coerente con il ritmo e gli interessi scelti per il viaggio.", "This stop matches the pace and interests chosen for the trip.")}</p></div>}
                {activityTab === "practical" && <div className="mrj-activity-copy practical">
                  {(selectedMoment.guide?.practicalTips ?? []).slice(0, 4).map((tip, index) => <p key={index}>{tip}</p>)}
                  {!(selectedMoment.guide?.practicalTips?.length) && <p>{f.L("Orari e disponibilità possono cambiare: verifica prima della visita.", "Opening times and availability can change: check before your visit.")}</p>}
                </div>}
                <footer>
                  <button onClick={() => selectedMoment.id ? f.goMoment(day.n, selectedMoment.id) : f.goEdit(day.n)}>{f.L("Apri dettaglio completo", "Open full details")}</button>
                  <button className="primary" onClick={() => f.goEdit(day.n)}>{f.L("Modifica attività", "Edit activity")}</button>
                </footer>
              </div>}

              {inspectorView === "map" && <div className="mrj-inspector-view map">
                <header><span>{f.L("Mappa del giorno", "Day map")}</span><h3>{day.title}</h3><p>{f.L("Tappe reali e ordine della giornata, nello stesso piano.", "Real stops and day order, in the same plan.")}</p></header>
                <div className="mrj-map-frame"><DayMap n={day.n} /></div>
                <button className="mrj-inspector-action" onClick={() => f.goMap(day.n)}><MapIcon size={15} />{f.L("Apri mappa completa", "Open full map")}</button>
              </div>}

              {inspectorView === "why" && <div className="mrj-inspector-view why">
                <header><span>{f.L("La logica del giorno", "The day's logic")}</span><h3>{f.L("Perché è costruito così", "Why it is built this way")}</h3></header>
                {dayWhy && <p className="mrj-day-why">{previewText(dayWhy, 520)}</p>}
                <div className="mrj-strategy-list">{strategy.map((item, index) => <article key={index}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{previewText(item.text, 130)}</small></span></article>)}</div>
                <button className="mrj-inspector-action" onClick={() => askCompanion(f.L(`Spiegami perché il Giorno ${day.n} è costruito così.`, `Explain why Day ${day.n} is built this way.`))}><Sparkles size={15} />{f.L("Approfondisci con MindRoute", "Ask MindRoute")}</button>
              </div>}

              {inspectorView === "control" && <div className="mrj-inspector-view control">
                <header><span>{f.L("Prontezza del viaggio", "Trip readiness")}</span><h3>{f.L("Prima di partire", "Before you leave")}</h3><p>{f.L("Qui emergono solo le cose che richiedono attenzione.", "Only items requiring attention appear here.")}</p></header>
                <div className="mrj-readiness"><i style={{ "--pct": `${Math.max(4, f.pct)}%` } as CSSProperties} /><span><b>{f.pct}%</b><small>{f.L("pronto", "ready")}</small></span></div>
                <div className="mrj-control-list">
                  <p><span><CalendarDays size={16} />{f.L("Attività oggi", "Activities today")}</span><b>{moments.length}</b></p>
                  <p><span><Bookmark size={16} />{f.L("Prenotazioni mancanti", "Missing bookings")}</span><b>{pendingBookings}</b></p>
                  <p><span><Euro size={16} />{f.L("Budget giornata", "Daily budget")}</span><b>{dayBudget > 0 ? `€${dayBudget}` : f.L("Da stimare", "To estimate")}</b></p>
                </div>
                {dayBudget > 0 && <div className="mrj-budget-split"><span>{f.L("Prenotabile", "Bookable")}<b>€{Math.round(dayBookable)}</b></span><span>{f.L("In loco", "On site")}<b>€{Math.round(dayOnsite)}</b></span></div>}
                <button className="mrj-inspector-action" onClick={f.goLogistics}><CheckCircle2 size={15} />{f.L("Apri controllo completo", "Open full check")}</button>
              </div>}
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}

function previewText(value?: string, max = 170) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
