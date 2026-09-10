import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen, CalendarCheck, ChevronLeft, ChevronRight,
  Clock, Compass, Euro, ExternalLink, Heart, Info, Lightbulb, MapPin,
  MessageCircle, Navigation, Route, Share2, ShieldCheck, Sparkles, StickyNote,
  Wallet,
} from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { EASE } from "@/lib/motion";
import { trackAffiliate } from "@/lib/analytics";
import { useFlow } from "./context";

const bg = (url: string | undefined, w: number, q = 76) => url
  ? `url(${unsplashSized(url, w, q)})`
  : "none";

type DetailTab = "overview" | "logistics" | "personal";

export function MomentScreen({ n, momentId }: { n: number; momentId: string }) {
  const f = useFlow();
  const reduce = useReducedMotion();
  const [activeTab, setActiveTab] = useState<DetailTab>("overview");
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  const day = f.days.find(item => item.n === n);
  const moments = f.momentsByDay[n] ?? [];
  const idx = moments.findIndex(moment => moment.id === momentId);
  const m = idx >= 0 ? moments[idx] : null;
  const prev = idx > 0 ? moments[idx - 1] : null;
  const next = idx >= 0 && idx < moments.length - 1 ? moments[idx + 1] : null;
  const noteKey = `mr_note_${f.itineraryId ?? 0}_${momentId}`;

  useEffect(() => {
    try { setNote(localStorage.getItem(noteKey) ?? ""); } catch { /* private mode */ }
  }, [noteKey]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const saveNote = (value: string) => {
    setNote(value);
    try {
      value.trim() ? localStorage.setItem(noteKey, value) : localStorage.removeItem(noteKey);
    } catch { /* private mode */ }
  };

  const gmapsUrl = useMemo(() => {
    if (!m) return "";
    return m.lat != null && m.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.locationName ?? m.title}, ${f.data.destination}`)}`;
  }, [m, f.data.destination]);

  const referenceUrls = useMemo(() => {
    if (!m) return null;
    const encoded = encodeURIComponent(`${m.locationName ?? m.title}, ${f.data.destination}`);
    const wikiLang = f.lang === "it" ? "it" : "en";
    return {
      wikipedia: `https://${wikiLang}.wikipedia.org/w/index.php?search=${encoded}`,
      wikivoyage: `https://${wikiLang}.wikivoyage.org/w/index.php?search=${encoded}`,
    };
  }, [m, f.data.destination, f.lang]);

  if (!m) {
    return <div className="mrf-screen"><div className="mrf-empty">{f.t("if.mo.notFound")}<div style={{ marginTop:18 }}><button className="mrf-pill" onClick={() => f.goDay(n)}>{f.tx("if.day", { n })}</button></div></div></div>;
  }

  const guide = m.guide;
  const saved = !!(m.id && f.savedMomentIds?.has(m.id));
  const canSave = !!(f.onToggleSaved && f.itineraryId && m.id);
  const timeWindow = m.startTime ? (m.endTime ? `${m.startTime}–${m.endTime}` : m.startTime) : m.t;
  const heroImage = m.imageUrl || day?.img || f.data.heroImg;
  const overview = guide?.whatItIs || m.desc;
  const bookingLabel = m.ctaStatus === "reserve_recommended"
    ? f.L("Consigliata", "Recommended")
    : m.cta
      ? f.L("Disponibile", "Available")
      : f.L("Non necessaria", "Not required");
  const bestMoment = timeWindow || bandLabel(m.band, f.L);

  const askCompanion = (seed?: string) => {
    const prompt = seed || f.L(
      `Spiegami meglio la tappa “${m.title}” e aiutami a valutarla o sostituirla.`,
      `Explain “${m.title}” more clearly and help me evaluate or replace it.`,
    );
    window.dispatchEvent(new CustomEvent("mindroute:companion-nudge", {
      detail: { itineraryId:f.itineraryId, text:prompt, seed:prompt },
    }));
    window.dispatchEvent(new Event("mindroute:open-companion"));
  };

  const rise = (delay:number) => reduce ? {} : {
    initial:{ opacity:0, y:14 },
    animate:{ opacity:1, y:0 },
    transition:{ duration:.42, ease:EASE, delay },
  };

  return (
    <div className="mrf-screen">
      <main className="mrd">
        <motion.section className="mrd-hero" style={{ backgroundImage:bg(heroImage, 1500, 82) }} {...rise(0)}>
          <div className="mrd-hero-veil" />
          <div className="mrd-hero-top">
            <span>{idx + 1} / {moments.length}</span>
            <div>
              <button className={saved ? "on" : ""} onClick={() => canSave && f.onToggleSaved?.(m.id!, m)} disabled={!canSave} aria-label={f.t("if.save")}><Heart size={18} fill={saved ? "currentColor" : "none"} /></button>
              <button onClick={() => f.onShare?.()} disabled={!f.onShare} aria-label={f.t("if.share")}><Share2 size={18} /></button>
            </div>
          </div>
          {prev?.id && <button className="mrd-slide prev" onClick={() => f.goMoment(n, prev.id!)} aria-label={prev.title}><ChevronLeft size={20} /></button>}
          {next?.id && <button className="mrd-slide next" onClick={() => f.goMoment(n, next.id!)} aria-label={next.title}><ChevronRight size={20} /></button>}
          <div className="mrd-hero-copy">
            <span>{m.locationName || f.data.destination}</span>
            <h1>{m.title}</h1>
            {overview && <p>{summaryText(overview, 150)}</p>}
          </div>
        </motion.section>

        <motion.section className="mrd-facts" {...rise(.05)}>
          <Fact icon={<Compass size={18} />} label={f.L("Perché è qui", "Why it is here")} value={m.kindLabel || f.L("Coerente con te", "Made for you")} />
          <Fact icon={<Clock size={18} />} label={f.L("Durata", "Duration")} value={m.durationLabel || f.L("Da definire", "To be defined")} />
          <Fact icon={<Wallet size={18} />} label={f.L("Costo", "Cost")} value={m.costLabel || m.ctaPrice || f.L("Gratuito", "Free")} />
          <Fact icon={<Navigation size={18} />} label={f.L("Come arrivi", "Getting there")} value={m.transport || f.L("Nel percorso", "In your route")} />
          <Fact icon={<CalendarCheck size={18} />} label={f.L("Prenotazione", "Booking")} value={bookingLabel} />
          <Fact icon={<Sparkles size={18} />} label={f.L("Momento migliore", "Best time")} value={bestMoment} />
        </motion.section>

        <motion.nav className="mrd-tabs" aria-label={f.L("Dettagli della tappa", "Stop details")} {...rise(.08)}>
          <button className={activeTab === "overview" ? "on" : ""} onClick={() => setActiveTab("overview")}>{f.L("Panoramica", "Overview")}</button>
          <button className={activeTab === "logistics" ? "on" : ""} onClick={() => setActiveTab("logistics")}>{f.L("Logistica", "Logistics")}</button>
          <button className={activeTab === "personal" ? "on" : ""} onClick={() => setActiveTab("personal")}>{f.L("Perché per te", "Why for you")}</button>
        </motion.nav>

        <motion.section className="mrd-content" {...rise(.1)}>
          {activeTab === "overview" && <>
            <div className="mrd-intro">
              <div><span>{f.L("Panoramica", "Overview")}</span><p>{summaryText(overview, 360)}</p></div>
              {(m.why || guide?.whyVisit) && <blockquote>“{summaryText(m.why || guide?.whyVisit, 150)}”</blockquote>}
            </div>
            <div className="mrd-disclosures">
              {(m.desc || (guide?.steps?.length ?? 0) > 0) && <Disclosure icon={<Info size={17} />} title={f.L("Cosa vedrai", "What you will see")}>
                {m.desc && <p>{m.desc}</p>}
                {(guide?.steps?.length ?? 0) > 0 && <div className="mrd-steps">{guide!.steps!.map((step, index) => <article key={`${step.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{step.title}</strong><p>{step.detail}</p></div></article>)}</div>}
              </Disclosure>}
              {(guide?.practicalTips?.length ?? 0) > 0 && <Disclosure icon={<ShieldCheck size={17} />} title={f.L("Consigli pratici", "Practical tips")}><ul>{guide!.practicalTips!.map((tip, index) => <li key={index}>{tip}</li>)}</ul></Disclosure>}
              {guide?.historyCulture && <Disclosure icon={<BookOpen size={17} />} title={f.L("Storia e cultura", "History and culture")}><p>{guide.historyCulture}</p></Disclosure>}
              {referenceUrls && <Disclosure icon={<ExternalLink size={17} />} title={f.L("Fonti e riferimenti", "Sources and references")}>
                <p>{f.L("Approfondisci il contesto e verifica le informazioni aggiornate prima della visita.", "Explore the context and verify current information before your visit.")}</p>
                <div className="mrd-links"><a href={referenceUrls.wikipedia} target="_blank" rel="noopener noreferrer">Wikipedia <ExternalLink size={13} /></a><a href={referenceUrls.wikivoyage} target="_blank" rel="noopener noreferrer">Wikivoyage <ExternalLink size={13} /></a></div>
              </Disclosure>}
              {m.planB && <Disclosure icon={<Route size={17} />} title={f.L("Alternativa se cambia il piano", "Alternative if plans change")}><p>{m.planB}</p></Disclosure>}
            </div>
          </>}

          {activeTab === "logistics" && <div className="mrd-tab-panel">
            <header><span>{f.L("Informazioni operative", "Practical information")}</span><h2>{f.L("Tutto ciò che serve per arrivare preparati.", "Everything you need to arrive prepared.")}</h2></header>
            <div className="mrd-logistics-grid">
              <article><MapPin size={19} /><span><small>{f.L("Dove si trova", "Where it is")}</small><strong>{m.locationName || f.data.destination}</strong><p>{m.locationAddress || guide?.whereItIs}</p></span></article>
              <article><Clock size={19} /><span><small>{f.L("Tempo", "Time")}</small><strong>{timeWindow || f.L("Orario flessibile", "Flexible time")}</strong><p>{m.durationLabel}</p></span></article>
              <article><Navigation size={19} /><span><small>{f.L("Spostamento", "Transfer")}</small><strong>{m.transport || f.L("Integrato nel percorso", "Part of your route")}</strong></span></article>
              <article><Euro size={19} /><span><small>{f.L("Costo e prenotazione", "Cost and booking")}</small><strong>{m.costLabel || m.ctaPrice || f.L("Gratuito", "Free")}</strong><p>{bookingLabel}</p></span></article>
            </div>
            <div className="mrd-log-actions">
              <a href={gmapsUrl} target="_blank" rel="noopener noreferrer"><MapPin size={15} />Google Maps</a>
              <button onClick={() => f.goMap(n)}><Navigation size={15} />{f.L("Apri mappa del giorno", "Open day map")}</button>
              {m.cta && m.ctaUrl && <a className="primary" href={m.ctaUrl} target="_blank" rel="noopener noreferrer" onClick={() => { trackAffiliate(m.ctaProvider ?? "unknown", f.data.destination); f.markClicked(m.type, n); }}>{m.cta}{m.ctaPrice ? ` · ${m.ctaPrice}` : ""}<ExternalLink size={14} /></a>}
            </div>
            <div className="mrd-trust"><ShieldCheck size={17} /><p>{f.L("Orari, costi e disponibilità sono indicativi. Verifica le informazioni aggiornate prima della visita.", "Times, costs and availability are indicative. Verify current information before your visit.")}</p></div>
          </div>}

          {activeTab === "personal" && <div className="mrd-tab-panel personal">
            <header><span>{f.L("La scelta MindRoute", "The MindRoute choice")}</span><h2>{f.L("Perché questa tappa ha senso per te.", "Why this stop makes sense for you.")}</h2></header>
            <div className="mrd-personal-card"><Lightbulb size={20} /><div><strong>{f.L("Nel tuo viaggio", "In your trip")}</strong><p>{m.why || guide?.whyVisit || f.L("Questa tappa è coerente con il ritmo e gli interessi scelti per il viaggio.", "This stop matches the pace and interests chosen for your trip.")}</p></div></div>
            {guide?.whyVisit && m.why && guide.whyVisit.trim() !== m.why.trim() && <div className="mrd-personal-card secondary"><Compass size={20} /><div><strong>{f.L("Perché vale il tuo tempo", "Why it is worth your time")}</strong><p>{guide.whyVisit}</p></div></div>}
            <button className="mrd-companion" onClick={() => askCompanion()}><MessageCircle size={18} /><span><strong>{f.L("Vuoi valutarla meglio?", "Want to evaluate it?")}</strong><small>{f.L("Chiedi più contesto oppure trova un'alternativa più adatta.", "Ask for more context or find a better alternative.")}</small></span><ChevronRight size={17} /></button>
          </div>}
        </motion.section>

        {noteOpen && <section className="mrd-note"><header><span>{f.L("Nota personale", "Personal note")}</span><button onClick={() => setNoteOpen(false)}>{f.L("Chiudi", "Close")}</button></header><textarea value={note} onChange={event => saveNote(event.target.value)} placeholder={f.t("if.mo.noteHint")} /></section>}

        {toast && <div className="mrd-toast">{toast}</div>}

        <footer className="mrd-actions">
          <button className={saved ? "on" : ""} onClick={() => { if (canSave) { f.onToggleSaved?.(m.id!, m); setToast(saved ? "" : f.t("if.saved")); } }} disabled={!canSave}><Heart size={17} fill={saved ? "currentColor" : "none"} />{saved ? f.t("if.saved") : f.t("if.save")}</button>
          <button onClick={() => askCompanion(f.L(`Trova un'alternativa a “${m.title}” coerente con il viaggio.`, `Find an alternative to “${m.title}” that fits the trip.`))}><Route size={17} />{f.L("Sostituisci", "Replace")}</button>
          <button className={noteOpen ? "on" : ""} onClick={() => setNoteOpen(value => !value)}><StickyNote size={17} />{f.L("Aggiungi nota", "Add note")}</button>
          <button className="primary" onClick={() => f.goEdit(n)}><Sparkles size={17} />{f.L("Modifica nel piano", "Edit in plan")}</button>
        </footer>
      </main>
    </div>
  );
}

function Fact({ icon, label, value }: { icon:ReactNode; label:string; value:string }) {
  return <article><i>{icon}</i><span><small>{label}</small><strong>{summaryText(value, 42)}</strong></span></article>;
}

function Disclosure({ icon, title, children }: { icon:ReactNode; title:string; children:ReactNode }) {
  return <details><summary><span>{icon}{title}</span><ChevronRight size={17} /></summary><div>{children}</div></details>;
}

function summaryText(value?:string, max=180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function bandLabel(band:string | undefined, L:(it:string,en:string)=>string) {
  if (band === "mattina") return L("Mattina", "Morning");
  if (band === "pranzo") return L("Pranzo", "Lunch");
  if (band === "pomeriggio") return L("Pomeriggio", "Afternoon");
  if (band === "sera") return L("Sera", "Evening");
  return L("Flessibile", "Flexible");
}
