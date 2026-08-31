import { useMemo, type CSSProperties } from "react";
import { useLocation } from "wouter";
import {
  Bookmark, Clock, Compass, Download, Euro, Footprints,
  Gauge, Map as MapIcon, MoreHorizontal, Plus, Share2, Sparkles, UserRound, Utensils,
} from "lucide-react";
import { BrandMark } from "@/components/BrandMark";
import { unsplashSized } from "@/lib/img";
import { buildJourneyStages } from "@/lib/itinerary-stages";
import { useFlow } from "./context";
import { DayMap } from "./DayMap";

const bg = (url: string | undefined, width: number, quality = 72) => url
  ? `url(${unsplashSized(url, width, quality)})`
  : "none";

export function JourneyScreen({ n }: { n: number }) {
  const f = useFlow();
  const [, setLocation] = useLocation();
  const day = f.days.find(item => item.n === n) ?? f.days[0];
  const dayIndex = Math.max(0, f.days.findIndex(item => item.n === day?.n));
  const moments = day ? f.momentsByDay[day.n] ?? [] : [];
  const raw = day ? f.rawDay(day.n) : null;

  const stages = useMemo(() => buildJourneyStages({
    destinationName: f.data.destination,
    country: f.data.country,
    heroImageUrl: f.data.heroImg,
    days: f.days.map(item => ({
      ...f.rawDay(item.n),
      image: item.img,
      hero_image_url: item.img,
      moments: f.momentsByDay[item.n] ?? [],
    })),
  }), [f.data.destination, f.data.country, f.data.heroImg, f.days, f.momentsByDay, f.rawDay]);

  const activeStage = stages.find(stage => stage.dayIndexes.includes(dayIndex));
  const dayBookable = Number(raw?.cost_bookable_total ?? 0) || 0;
  const dayOnsite = Number(raw?.cost_onsite_estimate ?? 0) || 0;
  const dayBudget = Math.round(dayBookable + dayOnsite);
  const moodImages = Array.from(new Set(moments.map(moment => moment.imageUrl).filter(Boolean))).slice(0, 4) as string[];
  const alternatives = moments.filter(moment => moment.planB).slice(0, 3);
  const dayWhy = raw?.why_this ?? raw?.whyThis ?? moments.find(moment => moment.why)?.why ?? f.data.manifesto;
  const paceValue = String(f.profilingInput?.pace ?? "").toLowerCase();
  const paceLabel = /slow|relax|lento/.test(paceValue)
    ? f.L("Ritmo lento", "Slow pace")
    : /fast|dynamic|intens|veloce/.test(paceValue)
      ? f.L("Ritmo dinamico", "Dynamic pace")
      : f.L("Ritmo equilibrato", "Balanced pace");
  const strategy = [
    { icon: <Gauge size={15} />, label: paceLabel },
    { icon: <Compass size={15} />, label: f.data.highlights?.[0]?.name || f.L("Luoghi autentici", "Authentic places") },
    { icon: <Utensils size={15} />, label: f.data.highlights?.[1]?.name || f.L("Esperienze locali", "Local experiences") },
  ];

  const askCompanion = (seed: string) => {
    window.dispatchEvent(new CustomEvent("mindroute:companion-nudge", {
      detail: { itineraryId: f.itineraryId, text: seed, seed },
    }));
    window.dispatchEvent(new Event("mindroute:open-companion"));
  };

  if (!day) return <div className="mrf-empty">{f.t("if.day.empty")}</div>;

  return (
    <div className="mrj">
      <aside className="mrj-side">
        <button className="mrj-brand" onClick={f.goHome}><BrandMark size={34} /><span>MindRoute</span></button>
        <nav>
          <button onClick={() => f.openStudio?.(day.n)}><Sparkles size={19} /><span>Studio</span></button>
          <button className="on" onClick={() => f.goDay(day.n)}><MapIcon size={19} /><span>{f.L("Itinerario", "Itinerary")}</span></button>
          <button onClick={() => setLocation("/my-account?view=portrait")}><UserRound size={19} /><span>Portrait</span></button>
        </nav>
        <button className="mrj-trip" onClick={f.goOverview}>
          <i style={{ backgroundImage: bg(f.data.heroImg, 260) }} />
          <span><strong>{f.data.destination}</strong><small>{f.data.duration}</small></span>
        </button>
      </aside>

      <div className="mrj-main">
        <section className="mrj-hero">
          <div className="mrj-hero-photo" style={{ backgroundImage: bg(f.data.heroImg, 2000, 78) }} />
          <div className="mrj-hero-veil" />
          <div className="mrj-actions">
            <button className="primary" onClick={() => f.openStudio?.(day.n)}><Sparkles size={14} />{f.L("Modifica in Studio", "Edit in Studio")}</button>
            <button onClick={() => f.onShare?.()}><Share2 size={14} />{f.L("Condividi", "Share")}</button>
            <button onClick={() => f.onSavePdf?.()} aria-label={f.L("Esporta PDF", "Export PDF")}><Download size={15} /></button>
            <button onClick={f.goLogistics} aria-label={f.L("Logistica", "Logistics")}><MoreHorizontal size={16} /></button>
          </div>
          <div className="mrj-hero-copy">
            <span>{f.data.country || f.data.destination} <i /> {f.data.duration}</span>
            <h1>{f.data.destination}</h1>
            <p>{f.data.subtitle || f.data.manifesto}</p>
            <div>{strategy.map((item, index) => <b key={index}>{item.icon}{item.label}</b>)}</div>
          </div>

          <div className="mrj-route">
            <div className="mrj-route-stages" style={{ gridTemplateColumns: `repeat(${Math.max(1, f.days.length)}, minmax(0,1fr))` }}>
              {stages.map(stage => <button
                key={stage.key}
                className={stage.dayIndexes.includes(dayIndex) ? "on" : ""}
                style={{ gridColumn: `${stage.startIndex + 1} / ${stage.endIndex + 2}`, backgroundImage: bg(stage.image, 700) }}
                onClick={() => f.goDay(f.days[stage.startIndex]?.n ?? firstDay(f.days))}
              ><span><strong>{stage.name}</strong><small>{stage.dayIndexes.length} {stage.dayIndexes.length === 1 ? f.L("giorno", "day") : f.L("giorni", "days")}</small></span></button>)}
            </div>
            <div className="mrj-route-days" style={{ gridTemplateColumns: `repeat(${Math.max(1, f.days.length)}, minmax(0,1fr))` }}>
              {f.days.map(item => <button key={item.n} className={item.n === day.n ? "on" : ""} onClick={() => f.goDay(item.n)}>{String(item.n).padStart(2, "0")}</button>)}
            </div>
          </div>
        </section>

        <section className="mrj-work">
          <nav className="mrj-days">
            <span>{f.L("Giorni", "Days")}</span>
            {f.days.map(item => <button key={item.n} className={item.n === day.n ? "on" : ""} onClick={() => f.goDay(item.n)}>
              <small>{String(item.n).padStart(2, "0")}</small><strong>{item.title}</strong>
            </button>)}
            <button className="add" onClick={() => f.goEdit(day.n)}><Plus size={14} />{f.L("Aggiungi giorno", "Add day")}</button>
          </nav>

          <main className="mrj-day">
            <header>
              <span>{activeStage?.name || f.data.destination} <i /> {f.L("Giorno", "Day")} {String(day.n).padStart(2, "0")}</span>
              <h2>{day.title}</h2>
              {day.sub && <p>{day.sub}</p>}
            </header>
            <button className="mrj-day-cover" onClick={() => f.goEdit(day.n)} style={{ backgroundImage: bg(day.img || f.data.heroImg, 1400, 78) }}>
              <span>“{day.arc || f.L("Una giornata costruita intorno a te", "A day built around you")}”</span>
              <i><Sparkles size={17} /></i>
            </button>

            <div className="mrj-timeline">
              {moments.map((moment, index) => <button key={moment.id ?? index} onClick={() => moment.id && f.goMoment(day.n, moment.id)} disabled={!moment.id}>
                <time>{moment.startTime || moment.t}</time><i />
                <span className="photo" style={{ backgroundImage: bg(moment.imageUrl || day.img, 220) }} />
                <span className="copy"><strong>{moment.title}</strong><em>{moment.kindLabel || moment.locationName}</em><small>{moment.guide?.whatItIs || moment.desc}</small></span>
                <span className="facts">{moment.durationLabel && <b><Clock size={12} />{moment.durationLabel}</b>}{moment.transport && <b><Footprints size={12} />{moment.transport}</b>}</span>
              </button>)}
              {!moments.length && <div className="mrj-empty">{f.t("if.day.empty")}</div>}
            </div>

            <div className="mrj-day-actions">
              <button onClick={() => f.goEdit(day.n)}><Plus size={14} />{f.L("Aggiungi attività", "Add activity")}</button>
              <button onClick={() => askCompanion(f.L(`Migliora il Giorno ${day.n} mantenendo il carattere del viaggio.`, `Improve Day ${day.n} while preserving the trip character.`))}><Sparkles size={14} />{f.L("Migliora questa giornata", "Improve this day")}</button>
              <button onClick={() => askCompanion(f.L(`Alleggerisci il Giorno ${day.n}.`, `Lighten Day ${day.n}.`))}><Gauge size={14} />{f.L("Alleggerisci", "Lighten")}</button>
            </div>

            {alternatives.length > 0 && <section className="mrj-alternatives"><header><span>{f.L("Alternative per oggi", "Alternatives for today")}</span></header><div>{alternatives.map((moment, index) => <article key={moment.id ?? index} style={{ backgroundImage: bg(moment.imageUrl || day.img, 360) }}><span><strong>{moment.title}</strong><small>{moment.planB}</small></span></article>)}</div></section>}
          </main>

          <aside className="mrj-context">
            <section className="mrj-panel map"><header><strong>{f.L("Mappa del giorno", "Day map")}</strong><button onClick={() => f.goMap(day.n)}><MapIcon size={14} /></button></header><DayMap n={day.n} /></section>
            {dayWhy && <section className="mrj-panel why"><header><Sparkles size={15} /><strong>{f.L("Perché così?", "Why this way?")}</strong></header><p>{dayWhy}</p><div>{strategy.slice(0, 3).map((item, index) => <span key={index}>{item.label}</span>)}</div></section>}
            <section className="mrj-panel budget"><header><strong>{f.L("Budget giornata", "Daily budget")}</strong></header><div className="mrj-budget-total"><i style={{ "--pct": `${Math.min(100, dayBudget ? 72 : 0)}%` } as CSSProperties} /><span><b>{dayBudget > 0 ? `€${dayBudget}` : f.L("Da stimare", "To estimate")}</b>{dayBudget > 0 && <small>{f.L("stima", "estimate")}</small>}</span></div>{dayBudget > 0 && <div className="mrj-budget-lines"><p><Euro size={13} />{f.L("Prenotabile", "Bookable")}<b>€{Math.round(dayBookable)}</b></p><p><Compass size={13} />{f.L("In loco", "On site")}<b>€{Math.round(dayOnsite)}</b></p></div>}</section>
            {moodImages.length > 0 && <section className="mrj-panel mood"><header><strong>Moodboard</strong><MoreHorizontal size={14} /></header><div>{moodImages.map((image, index) => <i key={index} style={{ backgroundImage: bg(image, 280) }} />)}</div></section>}
            {(f.data.closingQuote || f.data.manifesto) && <section className="mrj-panel note"><header><Bookmark size={14} /><strong>{f.L("Nota", "Note")}</strong></header><p>“{f.data.closingQuote || f.data.manifesto}”</p></section>}
          </aside>
        </section>
      </div>
    </div>
  );
}

function firstDay(days: Array<{ n: number }>) {
  return days[0]?.n ?? 1;
}
