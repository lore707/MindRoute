/* ItineraryRedesign.tsx
 * ─────────────────────────────────────────────────────────────
 * Stessa STRUTTURA + DESIGN del mockup cinematografico v2, ma
 * alimentato dai DATI REALI (ItineraryData già calcolato dal mapper
 * di Itinerary.tsx + i campi grezzi dell'itinerario per pratica/
 * prenota). Niente hardcoded: il numero di giorni, i momenti, la
 * mappa (lat/lng reali proiettati), budget/valigia/come-arrivare
 * sono dinamici. I campi che non abbiamo (meteo del giorno, orari
 * esatti) NON vengono inventati: le sezioni degradano con grazia.
 *
 * Drop-in per ItineraryCinematic: stesso contratto dati + props. */

import { useState, useEffect, useMemo } from "react";
import { useI18n } from "@/lib/i18n";
import { unsplashSized } from "@/lib/img";
import type { ItineraryData, Moment } from "@/components/ItineraryCinematic";
import "@/styles/itinerary-redesign.css";

type Props = {
  data: ItineraryData;
  itinerary: any;
  affiliateUrls: Record<string, string>;
  profilingInput: any;
  onSavePdf?: () => void;
  onStartOver?: () => void;
  onBack?: () => void;
  itineraryId?: number;
  savedMomentIds?: Set<string>;
  onToggleSaved?: (momentId: string, moment: Moment) => void;
  /** Persiste gli edit della Modalità Cura nel DB (PATCH days) e fa refetch.
   *  Riceve l'array `days` già serializzato (slot v1 raggruppati + editedMoments). */
  onSaveDays?: (days: any[]) => Promise<void> | void;
};

const SEG_COLORS = ["#E94560", "#D4A853", "#6FB4A8", "#9D7EBC", "#5E8CB6", "#C77B5A"];

/* Parse "€1.234", "1234", "~€55–70" → primo numero intero trovato. */
function firstInt(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const m = String(s).replace(/[.\s]/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 12, c = 2 * Math.PI * r, off = c * (1 - pct);
  return (
    <div className="ring">
      <svg width="30" height="30">
        <circle cx="15" cy="15" r={r} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2.5" />
        <circle cx="15" cy="15" r={r} fill="none" stroke="#E94560" strokeWidth="2.5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset .4s" }} />
      </svg>
    </div>
  );
}

export function ItineraryRedesign({
  data, itinerary, affiliateUrls, profilingInput,
  onSavePdf, onStartOver, onBack, itineraryId, savedMomentIds, onToggleSaved, onSaveDays,
}: Props) {
  const { t, lang } = useI18n();
  const days = data.days;
  const dayCount = days.length;

  const [activeDay, setActiveDay] = useState(days[0]?.n ?? 1);
  const [openDay, setOpenDay] = useState<number | null>(days[Math.min(2, dayCount - 1)]?.n ?? days[0]?.n ?? null);
  const [activeMoment, setActiveMoment] = useState(0);
  const [activeJump, setActiveJump] = useState("arc");
  const [booked, setBooked] = useState<Set<string>>(new Set());

  // ── Modalità Cura: editing dei momenti del giorno ──────────────────────────
  // Le "voci" editabili sono i Moment dentro momentsByDay. Niente orario al
  // minuto inventato: la fascia (t) si sceglie da una lista, titolo/descrizione
  // sono testo libero. Alla chiusura ("Fine"/"Ho finito") gli edit si salvano
  // nel DB via onSaveDays (PATCH days) → refetch → riflessi anche nel PDF.
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [momentsByDay, setMomentsByDay] = useState<Record<number, Moment[]>>(data.momentsByDay);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);

  // Re-sincronizza dal server dopo un refetch (l'itinerario cambia identità solo
  // su (re)fetch; durante l'editing non cambia, quindi non sovrascrive gli edit).
  useEffect(() => { setMomentsByDay(data.momentsByDay); /* eslint-disable-next-line */ }, [itinerary]);

  const slotLabels = useMemo(() => [t("itin.morning"), t("itin.lunch"), t("itin.afternoon"), t("itin.evening")], [t]);

  const patchDayMoments = (dayN: number, fn: (ms: Moment[]) => Moment[]) =>
    setMomentsByDay(prev => ({ ...prev, [dayN]: fn(prev[dayN] ?? []) }));
  const updateMoment = (dayN: number, i: number, patch: Partial<Moment>) =>
    patchDayMoments(dayN, ms => ms.map((m, j) => j === i ? { ...m, ...patch } : m));
  const removeMoment = (dayN: number, i: number) =>
    patchDayMoments(dayN, ms => ms.filter((_, j) => j !== i));
  const addMoment = (dayN: number) =>
    patchDayMoments(dayN, ms => [...ms, { t: slotLabels[2], ic: "📍", title: lang === "it" ? "Nuova tappa" : "New stop", desc: "" }]);
  const moveMoment = (dayN: number, from: number, to: number) =>
    patchDayMoments(dayN, ms => { const a = [...ms]; const [m] = a.splice(from, 1); a.splice(to, 0, m); return a; });
  const resetDay = (dayN: number) =>
    setMomentsByDay(prev => ({ ...prev, [dayN]: JSON.parse(JSON.stringify(data.momentsByDay[dayN] ?? [])) }));

  const commitDrag = () => {
    if (dragIdx != null && overIdx != null && dragIdx !== overIdx && openDay != null) moveMoment(openDay, dragIdx, overIdx);
    setDragIdx(null); setOverIdx(null);
  };

  // Serializza gli edit nel formato `days` del DB: per i giorni toccati scrive
  // sia i 4 slot v1 raggruppati per fascia (fallback per PDF/mapper/AI-regen)
  // sia editedMoments (fedeltà piena). I giorni non toccati passano invariati.
  const serializeDays = (): any[] => {
    const labelToKey: Record<string, string> = {
      [t("itin.morning")]: "morning", [t("itin.lunch")]: "lunch",
      [t("itin.afternoon")]: "afternoon", [t("itin.evening")]: "evening",
    };
    return (itinerary?.days ?? []).map((day: any, i: number) => {
      const dayN = day.dayNumber ?? i + 1;
      const edited = momentsByDay[dayN];
      const baseline = data.momentsByDay[dayN];
      if (!edited || JSON.stringify(edited) === JSON.stringify(baseline)) return day;
      const next: any = { ...day, morning: "", lunch: "", afternoon: "", evening: "" };
      next.editedMoments = edited.map(m => ({
        t: m.t, ic: m.ic, title: m.title, desc: m.desc,
        cta: m.cta, ctaUrl: m.ctaUrl, ctaPrice: m.ctaPrice, ctaStatus: m.ctaStatus,
        locationName: m.locationName, imageUrl: m.imageUrl, id: m.id, type: m.type,
      }));
      for (const m of edited) {
        const key = labelToKey[m.t] ?? "afternoon";
        const text = [m.title, m.desc].filter(Boolean).join(m.title && m.desc ? ". " : "");
        next[key] = next[key] ? `${next[key]} ${text}` : text;
      }
      return next;
    });
  };

  const finishEditing = async () => {
    if (onSaveDays) {
      setSaving(true);
      try { await onSaveDays(serializeDays()); } catch { /* il parent gestisce l'errore */ }
      setSaving(false);
    }
    setEditing(false);
  };

  const moments = momentsByDay[activeDay] ?? [];
  const focus = moments[activeMoment] ?? moments[0];
  const ambientIdx = Math.max(0, days.findIndex(d => d.n === activeDay));

  // ── countdown (solo se conosciamo una data futura) ──
  const daysToGo = useMemo(() => {
    const raw = profilingInput?.leaveDate ?? profilingInput?.travelDate;
    if (!raw) return null;
    const dep = new Date(raw);
    if (isNaN(dep.getTime())) return null;
    const d = Math.ceil((dep.getTime() - Date.now()) / 86_400_000);
    return d > 0 ? d : null;
  }, [profilingInput]);

  const peopleLabel = useMemo(() => {
    const c = (profilingInput?.companions ?? "").toLowerCase();
    if (!c) return null;
    if (c.includes("couple") || c.includes("coppia") || c.includes("partner")) return lang === "it" ? "2 persone" : "2 people";
    if (c.includes("friend") || c.includes("amici")) return lang === "it" ? "amici" : "friends";
    if (c.includes("famil")) return lang === "it" ? "famiglia" : "family";
    return lang === "it" ? "solo" : "solo";
  }, [profilingInput, lang]);

  // ── budget (parse) ──
  const budget = useMemo(() => {
    const raw = itinerary?.budgetSummary;
    if (!raw) return null;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed?.items?.length) {
        const rows = parsed.items
          .filter((it: any) => !/totale|total/i.test(it.label))
          .map((it: any, i: number) => ({ nm: it.label, amt: firstInt(it.total ?? it.perPerson), c: SEG_COLORS[i % SEG_COLORS.length] }))
          .filter((r: any) => r.amt > 0);
        const totalRow = parsed.items.find((it: any) => /totale|total/i.test(it.label));
        const total = totalRow ? (totalRow.total ?? totalRow.perPerson) : `€${rows.reduce((s: number, r: any) => s + r.amt, 0)}`;
        if (rows.length) return { rows, total: String(total) };
      }
    } catch { /* free-form */ }
    return { text: String(raw) };
  }, [itinerary?.budgetSummary]);

  // ── come arrivare (parse) ──
  const arrive = useMemo(() => {
    const raw = itinerary?.gettingThere;
    if (!raw) return null;
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed?.steps?.length) {
        return { legs: parsed.steps.map((s: any) => ({ route: `${s.from} → ${s.to}`, det: [s.method, s.duration, s.cost].filter(Boolean).join(" · ") })) };
      }
    } catch { /* free-form */ }
    return { text: String(raw) };
  }, [itinerary?.gettingThere]);

  // ── valigia (parse) ──
  const packing = useMemo(() => {
    const raw = itinerary?.packingList;
    if (!raw) return [];
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (parsed?.items?.length) return parsed.items.map((it: any) => `${it.emoji ?? ""} ${it.label ?? it}`.trim());
    } catch { /* free-form */ }
    return String(raw).split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1);
  }, [itinerary?.packingList]);

  // ── checklist (localStorage) ──
  const checklist = useMemo(() => ([
    { id: "flight", nm: lang === "it" ? "Volo a/r" : "Round-trip flight", meta: data.destination, url: affiliateUrls.expedia_flights },
    { id: "hotel", nm: lang === "it" ? `Alloggio · ${dayCount} notti` : `Stay · ${dayCount} nights`, meta: data.destination, url: affiliateUrls.hotels },
    { id: "experience", nm: lang === "it" ? "Esperienza principale" : "Main experience", meta: data.destination, url: affiliateUrls.civitatis || affiliateUrls.musement || affiliateUrls.klook || affiliateUrls.viator },
    { id: "restaurant", nm: lang === "it" ? "Tavolo · primo giorno" : "Table · day one", meta: data.destination, url: affiliateUrls.tripadvisor },
    { id: "transfer", nm: lang === "it" ? "Transfer / traghetto" : "Transfer / ferry", meta: data.destination, url: affiliateUrls.flixbus || affiliateUrls.samboat },
  ].filter(i => i.url)), [affiliateUrls, dayCount, data.destination, lang]);

  useEffect(() => {
    if (!itineraryId) return;
    try {
      const saved = localStorage.getItem(`mindroute_checklist_${itineraryId}`);
      if (saved) setBooked(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, [itineraryId]);

  const toggleBook = (id: string) => setBooked(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id);
    if (itineraryId) { try { localStorage.setItem(`mindroute_checklist_${itineraryId}`, JSON.stringify(Array.from(s))); } catch { /* ignore */ } }
    return s;
  });

  // ── providers (dai link affiliate reali) ──
  const providers = useMemo(() => {
    const dest = data.destination;
    const g = (label: string, url?: string) => url ? { label, url } : null;
    const groups = [
      { h: lang === "it" ? "✈ Volo & hotel" : "✈ Flight & hotel", links: [g(lang === "it" ? `Prenota il volo · ${dest}` : `Book flight · ${dest}`, affiliateUrls.expedia_flights), g(lang === "it" ? `Prenota l'hotel · ${dest}` : `Book hotel · ${dest}`, affiliateUrls.hotels), g(lang === "it" ? "Boutique hotel" : "Boutique hotel", affiliateUrls.tablet_hotels)] },
      { h: lang === "it" ? "🎟 Esperienze" : "🎟 Experiences", links: [g(lang === "it" ? "Tour ed esperienze" : "Tours & experiences", affiliateUrls.civitatis || affiliateUrls.klook || affiliateUrls.viator), g(lang === "it" ? "Altre esperienze" : "More experiences", affiliateUrls.musement), g(lang === "it" ? "Noleggia una barca" : "Rent a boat", affiliateUrls.samboat)] },
      { h: lang === "it" ? "🍽 Tavola & terra" : "🍽 Table & land", links: [g(lang === "it" ? "Prenota un tavolo" : "Reserve a table", affiliateUrls.tripadvisor), g(lang === "it" ? "Bus e treni" : "Bus & trains", affiliateUrls.flixbus)] },
    ];
    return groups.map(gr => ({ h: gr.h, links: gr.links.filter(Boolean) as { label: string; url: string }[] })).filter(gr => gr.links.length);
  }, [affiliateUrls, data.destination, lang]);

  // ── scrollspy ──
  useEffect(() => {
    const ids = ["rotta", "arc", "pratica", "prenota"];
    const onScroll = () => {
      let best = "arc";
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.5) best = id;
      });
      setActiveJump(best);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.offsetTop - 70, behavior: "smooth" });
  };

  const toggleEdit = () => setEditing(e => {
    const nv = !e;
    if (nv) {
      const target = openDay ?? activeDay ?? days[0]?.n ?? 1;
      setActiveDay(target); setOpenDay(target); setActiveMoment(0);
      setTimeout(() => scrollTo("arc"), 60);
    }
    return nv;
  });

  const gotoDay = (n: number) => {
    if (n < 1 || n > dayCount) return;
    setActiveDay(n); setOpenDay(n); setActiveMoment(0);
    setDragIdx(null); setOverIdx(null);
  };
  const toggleDay = (n: number) => {
    setActiveDay(n); setActiveMoment(0);
    setOpenDay(o => o === n ? null : n);
  };

  const openDayObj = openDay ? days.find(d => d.n === openDay) : null;
  const railCols = `repeat(auto-fit, minmax(${dayCount <= 4 ? "200px" : "180px"}, 1fr))`;

  // emotional arc: punti dinamici (arrivo basso → apice → partenza basso)
  const arcPts = days.map((_, i) => {
    const x = dayCount === 1 ? 50 : (i / (dayCount - 1)) * 80 + 10;
    const peak = (dayCount - 1) / 2;
    const dist = Math.abs(i - peak) / (peak || 1);
    const y = 14 + dist * 30; // 14 (apice in alto) → 44 (estremi in basso)
    return { x, y, n: days[i].n };
  });
  const arcPath = arcPts.length > 1
    ? arcPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x * 10},${p.y}`).join(" ")
    : "";

  return (
    <div className="ivr">
      {/* Ambient */}
      <div className="ivr-bg">
        {days.map((d, i) => (
          <div key={d.n} className={"ivr-bg-photo" + (ambientIdx === i ? " active" : "")}
            style={{ backgroundImage: d.img ? `url(${unsplashSized(d.img, 1600)})` : undefined }} />
        ))}
      </div>
      <div className="ivr-grain" />

      {/* HERO */}
      <section className="hero">
        <div className="hero-photo" style={{ backgroundImage: data.heroImg ? `url(${unsplashSized(data.heroImg, 1920)})` : undefined }} />
        <div className="hero-inner">
          <div className="hero-kick">
            {data.country && <><span>{data.country}</span><span className="sep" /></>}
            <span>{data.duration}</span><span className="sep" />
            <span className="built">{t("itin.cin.crafted")}</span>
          </div>
          {daysToGo != null && (
            <div className="hero-countdown">
              <span className="pulse" />
              <span className="n">{daysToGo}</span>
              <span className="l">{lang === "it" ? "giorni alla partenza" : "days to departure"}</span>
            </div>
          )}
          <h1 className="hero-title">{data.destination}</h1>
          <div className="hero-sub">{data.subtitle}</div>
          <div className="hero-meta">
            <div className="hero-fact"><span className="n">{dayCount}</span><span className="l">{dayCount === 1 ? t("itin.cin.duration.day") : t("itin.cin.duration.days")}</span></div>
            {budget?.total && <div className="hero-fact"><span className="n">{budget.total}</span><span className="l">{lang === "it" ? "stimato" : "estimated"}</span></div>}
            {peopleLabel && <div className="hero-fact"><span className="n">{peopleLabel}</span></div>}
          </div>
        </div>
      </section>

      {/* COMMAND BAR */}
      <div className="cmd">
        <div className="cmd-l">
          <span className="cmd-trip">{data.destination}</span>
          <div className="cmd-jump">
            {data.mapPoints && data.mapPoints.length > 0 && <a href="#rotta" className={activeJump === "rotta" ? "on" : ""} onClick={(e) => { e.preventDefault(); scrollTo("rotta"); }}>{lang === "it" ? "Rotta" : "Route"}</a>}
            <a href="#arc" className={activeJump === "arc" ? "on" : ""} onClick={(e) => { e.preventDefault(); scrollTo("arc"); }}>{lang === "it" ? "Itinerario" : "Itinerary"}</a>
            <a href="#pratica" className={activeJump === "pratica" ? "on" : ""} onClick={(e) => { e.preventDefault(); scrollTo("pratica"); }}>{lang === "it" ? "Pratica" : "Practical"}</a>
            <a href="#prenota" className={activeJump === "prenota" ? "on" : ""} onClick={(e) => { e.preventDefault(); scrollTo("prenota"); }}>{lang === "it" ? "Prenota" : "Book"}</a>
          </div>
        </div>
        <div className="cmd-r">
          <button className={"cmd-edit" + (editing ? " on" : "")} onClick={editing ? finishEditing : toggleEdit} disabled={saving}>
            <span className="pen">✎</span>{saving ? (lang === "it" ? "Salvo…" : "Saving…") : editing ? (lang === "it" ? "Fine" : "Done") : (lang === "it" ? "Personalizza" : "Customize")}
          </button>
          {checklist.length > 0 && (
            <div className="cmd-progress">
              <ProgressRing pct={booked.size / checklist.length} />
              <span>{booked.size} / {checklist.length}</span>
            </div>
          )}
          <button className="btn-book" onClick={() => scrollTo("prenota")}>{lang === "it" ? "Prenota tutto →" : "Book everything →"}</button>
        </div>
      </div>

      {editing && (
        <div className="edit-ribbon">
          <span className="dot" />
          <span>
            {lang === "it"
              ? <>Stai <strong>personalizzando</strong> il tuo itinerario — apri un giorno, modifica le tappe, trascina per riordinare, aggiungi o togli. Tutto si salva da solo.</>
              : <>You're <strong>customizing</strong> your itinerary — open a day, edit stops, drag to reorder, add or remove. Everything saves itself.</>}
          </span>
          <button onClick={finishEditing} disabled={saving}>{saving ? (lang === "it" ? "Salvo…" : "Saving…") : (lang === "it" ? "Ho finito" : "I'm done")}</button>
        </div>
      )}

      <div className="ivr-stage">
        {/* WHY */}
        {(data.manifesto || data.highlights.length > 0) && (
          <section className="section" id="why">
            <div className="sec-eyebrow">{t("itin.whyYours")}</div>
            <div className="why">
              <blockquote className="why-quote">{data.manifesto}</blockquote>
              {data.highlights.length > 0 && (
                <div className="why-side">
                  <div className="why-side-mark">{t("itin.cin.fourChapters")}</div>
                  {data.highlights.map((h, i) => (
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

        {/* LA ROTTA — mappa reale */}
        {data.mapPoints && data.mapPoints.length > 0 && (
          <section className="section" id="rotta">
            <div className="sec-eyebrow">{t("itin.cin.geographyEyebrow")}</div>
            <h2 className="sec-title" style={{ marginBottom: 34 }}>{t("itin.cin.geographyTitlePre")} <em>{t("itin.cin.geographyTitleEm")}</em></h2>
            <div className="route-wrap">
              <svg className="route-svg" viewBox="0 0 400 400">
                {data.mapPoints.length > 1 && (
                  <path className="route-pin-line" d={data.mapPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")} />
                )}
                {data.mapPoints.map((p, i) => (
                  <g key={i}>
                    <circle className="route-pin-dot" cx={p.x} cy={p.y} r={6} />
                    <text className="route-pin-cap" x={p.x + 12} y={p.y + 4}>{p.label}</text>
                  </g>
                ))}
              </svg>
              <div className="route-overlay">
                <div className="live">{t("itin.cin.geographyEyebrow")}</div>
                {data.geometry && (
                  <div className="rd">
                    {data.geometry.walkable
                      ? t("itin.cin.geo.compact").replace("{km}", data.geometry.spanKm < 10 ? data.geometry.spanKm.toFixed(1).replace(".", lang === "it" ? "," : ".") : String(Math.round(data.geometry.spanKm))).replace("{min}", String(data.geometry.walkMinutes))
                      : t("itin.cin.geo.spread").replace("{km}", data.geometry.spanKm < 10 ? data.geometry.spanKm.toFixed(1).replace(".", lang === "it" ? "," : ".") : String(Math.round(data.geometry.spanKm)))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ARC */}
        <section className="section" id="arc">
          <div className="arc-head">
            <div>
              <div className="sec-eyebrow">{t("itin.cin.arcEyebrow")}</div>
              <h2 className="sec-title">{dayCount} {t("itin.cin.arcTitleDays")}</h2>
            </div>
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 14, color: "var(--ink-faint)" }}>{t("itin.cin.clickHint")}</span>
          </div>

          {/* emotional curve */}
          {dayCount > 1 && (
            <div className="emo-arc">
              <svg viewBox="0 0 1000 60" preserveAspectRatio="none" style={{ position: "absolute", inset: 0 }}>
                <path d={arcPath} fill="none" stroke="rgba(233,69,96,.5)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              {days.map((d, i) => (
                <div key={d.n} className="emo-label" style={{ left: `${arcPts[i].x}%` }}>{d.arc}</div>
              ))}
              <svg viewBox="0 0 1000 60" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                {arcPts.map((p, i) => (
                  <circle key={i} cx={p.x * 10} cy={p.y} r={openDay === p.n ? 6 : 4}
                    fill={openDay === p.n ? "#fff" : "#E94560"} stroke="#E94560" strokeWidth={openDay === p.n ? 3 : 0}
                    vectorEffect="non-scaling-stroke" />
                ))}
              </svg>
            </div>
          )}

          <div className="arc-rail" style={{ gridTemplateColumns: railCols }}>
            {days.map(d => (
              <div key={d.n} className={"day" + (openDay === d.n ? " open" : "")} onClick={() => toggleDay(d.n)}>
                <div className="day-num">{d.n}</div>
                <div className="day-act">{d.arc}</div>
                <div className="day-photo" style={{ backgroundImage: d.img ? `url(${unsplashSized(d.img, 800)})` : undefined }} />
                <div className="day-body">
                  <div className="day-kick">{t("itin.cin.dayLabel")} {d.n}</div>
                  <div className="day-name">{d.title}</div>
                  {d.sub && <div className="day-sub">{d.sub}</div>}
                  <div className="day-foot">
                    <span className="expand">{openDay === d.n ? (lang === "it" ? "chiudi ▲" : "close ▲") : (lang === "it" ? "apri ▾" : "open ▾")}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {openDayObj && (() => {
            const dMoments = momentsByDay[openDayObj.n] ?? [];
            const f = dMoments[activeMoment] ?? dMoments[0];
            return (
              <div className="day-detail">
                <div className="dd-top">
                  <div className={"dd-timeline" + (editing ? " editing" : "")}>
                    <div className="dd-tl-kick">{t("itin.cin.dayLabel")} {openDayObj.n} · {openDayObj.arc}</div>
                    {dMoments.map((m, i) => (
                      <div
                        key={i}
                        className={"dd-slot"
                          + (!editing && activeMoment === i ? " on" : "")
                          + (dragIdx === i ? " dragging" : "")
                          + (overIdx === i && dragIdx !== i ? " drop-target" : "")}
                        draggable={editing}
                        onDragStart={editing ? () => setDragIdx(i) : undefined}
                        onDragOver={editing ? (e) => { e.preventDefault(); setOverIdx(i); } : undefined}
                        onDragEnd={editing ? commitDrag : undefined}
                        onClick={editing ? undefined : () => setActiveMoment(i)}
                      >
                        {editing && <div className="drag" title={lang === "it" ? "Trascina per riordinare" : "Drag to reorder"}>⠿</div>}
                        <div className="dot" />
                        {editing ? (
                          <div className="slot-edit">
                            <select className="se-when" value={m.t} onChange={(e) => updateMoment(openDayObj.n, i, { t: e.target.value })}>
                              {(slotLabels.includes(m.t) ? slotLabels : [m.t, ...slotLabels]).map(w => <option key={w} value={w}>{w}</option>)}
                            </select>
                            <input className="se-what" value={m.title} onChange={(e) => updateMoment(openDayObj.n, i, { title: e.target.value })} placeholder={lang === "it" ? "Cosa fai…" : "What you do…"} />
                            <textarea className="se-desc" value={m.desc} onChange={(e) => updateMoment(openDayObj.n, i, { desc: e.target.value })} placeholder={lang === "it" ? "Dettagli (facoltativo)" : "Details (optional)"} rows={2} />
                            <div className="slot-tools">
                              <button className="del" onClick={() => removeMoment(openDayObj.n, i)}>× {lang === "it" ? "Togli" : "Remove"}</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="when">{m.t}</div>
                            <div className="what">{m.title.split(",")[0]}</div>
                          </>
                        )}
                      </div>
                    ))}
                    {editing && (
                      <>
                        <button className="slot-add" onClick={() => addMoment(openDayObj.n)}>+ {lang === "it" ? "Aggiungi una tappa" : "Add a stop"}</button>
                        <div className="tl-foot">
                          <span className="cnt">{dMoments.length} {lang === "it" ? "tappe" : "stops"}</span>
                          <button className="reset" onClick={() => resetDay(openDayObj.n)}>↺ {lang === "it" ? "Ripristina giorno" : "Reset day"}</button>
                        </div>
                      </>
                    )}
                  </div>

                  {f && (
                    <div className="dd-focus">
                      <div className="dd-focus-photo" style={{ backgroundImage: `url(${unsplashSized(f.imageUrl || openDayObj.img, 1400)})` }}>
                        <div className="dd-focus-tag">{f.t}</div>
                      </div>
                      <div className="dd-focus-body">
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                          <div className="dd-focus-name" style={{ flex: 1 }}>{f.title}</div>
                          {onToggleSaved && itineraryId && f.id && (
                            <button className={"dd-fav" + (savedMomentIds?.has(f.id) ? " on" : "")} onClick={() => onToggleSaved(f.id!, f)}
                              aria-label={savedMomentIds?.has(f.id) ? "Rimuovi" : "Salva"}>
                              {savedMomentIds?.has(f.id) ? "♥" : "♡"}
                            </button>
                          )}
                        </div>
                        {f.desc && <p className="dd-focus-desc">{f.desc}</p>}

                        <div className="dd-meta-row">
                          {f.ctaPrice && <div className="dd-meta"><span className="k">{lang === "it" ? "Costo" : "Cost"}</span><span className="v">{f.ctaPrice}</span></div>}
                          {f.locationName && <div className="dd-meta"><span className="k">{lang === "it" ? "Dove" : "Where"}</span><span className="v">{f.locationName}</span></div>}
                        </div>

                        {data.manifesto && activeMoment === 0 && (
                          <div className="dd-why">
                            <span className="ic">✦</span>
                            <span className="t"><strong>{t("itin.whyYours")}</strong> — {data.manifesto}</span>
                          </div>
                        )}

                        {f.cta && f.ctaUrl && (
                          <div className="dd-actions">
                            {f.ctaStatus === "reserve_recommended" && <span className="dd-status">{t("itin.cin.book.reserveHint")}</span>}
                            <a className="btn-book btn-book-exp" href={f.ctaUrl} target="_blank" rel="noopener noreferrer">
                              {f.cta}{f.ctaPrice && <span className="price"> · {f.ctaPrice}</span>} →
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="dd-nav">
                  <button disabled={openDayObj.n <= 1} onClick={() => gotoDay(openDayObj.n - 1)}>← {t("itin.cin.dayLabel")} {openDayObj.n - 1}</button>
                  <span className="ctr">{t("itin.cin.dayLabel")} <em>{openDayObj.n}</em> {t("itin.cin.of")} {dayCount}</span>
                  <button disabled={openDayObj.n >= dayCount} onClick={() => gotoDay(openDayObj.n + 1)}>{t("itin.cin.dayLabel")} {openDayObj.n + 1} →</button>
                </div>
              </div>
            );
          })()}
        </section>

        {/* PRATICA */}
        {(budget || arrive || itinerary?.bestTime || packing.length > 0) && (
          <section className="section" id="pratica">
            <div className="sec-eyebrow">{t("itin.cin.practicalEyebrow")}</div>
            <h2 className="sec-title" style={{ marginBottom: 40 }}>{t("itin.cin.practicalTitle")}</h2>

            <div className="prat-grid">
              {budget && (
                <div className="card">
                  <div className="card-head"><span className="ic">💰</span>{lang === "it" ? "Budget stimato" : "Estimated budget"}</div>
                  {"rows" in budget ? (
                    <div className="budget">
                      <div className="budget-total">
                        <span className="l">{lang === "it" ? "Totale" : "Total"}</span>
                        <span className="v">{budget.total}</span>
                      </div>
                      <div className="budget-bar">
                        {budget.rows.map((b: any, i: number) => {
                          const sum = budget.rows.reduce((s: number, r: any) => s + r.amt, 0) || 1;
                          return <div key={i} className="budget-seg" style={{ width: `${(b.amt / sum) * 100}%`, background: b.c }} />;
                        })}
                      </div>
                      <div className="budget-legend">
                        {budget.rows.map((b: any, i: number) => (
                          <div key={i} className="budget-row">
                            <span className="sw" style={{ background: b.c }} />
                            <span className="nm">{b.nm}</span>
                            <span className="amt">€{b.amt}</span>
                          </div>
                        ))}
                      </div>
                      <div className="budget-note">◷ {lang === "it" ? "Stima ballpark · i voli oscillano se prenoti tardi" : "Ballpark estimate · flights vary if booked late"}</div>
                    </div>
                  ) : (
                    <div className="pc-text">{budget.text}</div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {itinerary?.bestTime && (
                  <div className="card">
                    <div className="card-head"><span className="ic">📅</span>{lang === "it" ? "Periodo migliore" : "Best time"}</div>
                    <div className="pc-text">{itinerary.bestTime}</div>
                  </div>
                )}
                {arrive && (
                  <div className="card">
                    <div className="card-head"><span className="ic">✈</span>{lang === "it" ? "Come arrivare" : "Getting there"}</div>
                    {"legs" in arrive ? (
                      <div className="arrive">
                        {arrive.legs.map((a: any, i: number) => (
                          <div key={i} className="arrive-leg">
                            <div className="pin"><div className="dot" />{i < arrive.legs.length - 1 && <div className="ln" />}</div>
                            <div className="body"><div className="route">{a.route}</div>{a.det && <div className="det">{a.det}</div>}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="pc-text">{arrive.text}</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {packing.length > 0 && (
              <div className="card" style={{ marginTop: 18 }}>
                <div className="card-head"><span className="ic">🎒</span>{lang === "it" ? "Da portare" : "Packing"}</div>
                <div className="pack">
                  <div className="pack-chips">
                    {packing.map((p: string, i: number) => <span key={i} className="pack-chip">{p}</span>)}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PRENOTA */}
        {(checklist.length > 0 || providers.length > 0) && (
          <section className="section" id="prenota">
            <div className="sec-eyebrow">{t("itin.cin.bookingEyebrow")}</div>
            <div className="book-intro">
              <h2 className="sec-title">{t("itin.cin.bookingTitle")}</h2>
              <div className="book-when">{lang === "it" ? "Già impostato per" : "Set up for"} <strong>{data.destination}</strong>{peopleLabel && ` · ${peopleLabel}`}</div>
            </div>

            {checklist.length > 0 && (
              <div className="book-checklist">
                <div className="bc-head">
                  <span className="t">{lang === "it" ? "La tua checklist" : "Your checklist"}</span>
                  <div className="prog">
                    <div className="track"><div className="fill" style={{ width: `${(booked.size / checklist.length) * 100}%` }} /></div>
                    <span className="cnt">{booked.size}/{checklist.length}</span>
                  </div>
                </div>
                {checklist.map(item => {
                  const done = booked.has(item.id);
                  return (
                    <div key={item.id} className={"bc-item" + (done ? " done" : "")}>
                      <div className={"bc-check" + (done ? " on" : "")} onClick={() => toggleBook(item.id)} />
                      <div className="bc-body">
                        <div className="bc-name">{item.nm}</div>
                        <div className="bc-meta">{item.meta}</div>
                      </div>
                      {!done && <a className="bc-go" href={item.url} target="_blank" rel="noopener noreferrer" onClick={() => toggleBook(item.id)}>{lang === "it" ? "Prenota →" : "Book →"}</a>}
                      {done && <button className="bc-go" style={{ background: "transparent", border: "1px solid var(--stroke-strong)", color: "var(--ink-faint)", boxShadow: "none" }} onClick={() => toggleBook(item.id)}>{lang === "it" ? "Fatto ✓" : "Done ✓"}</button>}
                    </div>
                  );
                })}
              </div>
            )}

            {providers.length > 0 && (
              <div className="book-providers">
                {providers.map((p, i) => (
                  <div key={i} className="prov-group">
                    <div className="prov-h">{p.h}</div>
                    {p.links.map((l, j) => (
                      <a key={j} className="prov-link" href={l.url} target="_blank" rel="noopener noreferrer">{l.label}<span className="ext">↗</span></a>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* CLOSING */}
      <section className="closing">
        <div className="closing-kick">{lang === "it" ? "Cosa ti porterai a casa" : "What you'll bring home"}</div>
        {data.closingQuote && <div className="closing-quote">{data.closingQuote}</div>}
        <div className="kit" style={{ gridTemplateColumns: "repeat(3, 1fr)", maxWidth: 620 }}>
          {onSavePdf && (
            <button className="kit-btn" onClick={onSavePdf}>
              <span className="ic">⎓</span><span className="t">{lang === "it" ? "Salva PDF" : "Save PDF"}</span><span className="s">{lang === "it" ? "offline, in tasca" : "offline, in pocket"}</span>
            </button>
          )}
          <button className="kit-btn" onClick={() => { if (navigator.share) navigator.share({ title: data.destination, url: window.location.href }).catch(() => {}); else navigator.clipboard?.writeText(window.location.href); }}>
            <span className="ic">↗</span><span className="t">{lang === "it" ? "Condividi" : "Share"}</span><span className="s">{lang === "it" ? "con chi viene" : "with who's coming"}</span>
          </button>
          {onStartOver && (
            <button className="kit-btn" onClick={onStartOver}>
              <span className="ic">↻</span><span className="t">{lang === "it" ? "Ricomincia" : "Start over"}</span><span className="s">{lang === "it" ? "un'altra rotta" : "another route"}</span>
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
