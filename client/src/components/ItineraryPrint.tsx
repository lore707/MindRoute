/* ItineraryPrint.tsx
 * ─────────────────────────────────────────────────────────────
 * Itinerario stampabile "keepsake" stile rivista (A4), alimentato dai DATI
 * REALI dell'itinerario (ItineraryData già calcolato + campi grezzi per la
 * pratica/checklist). Reso via renderToStaticMarkup in una finestra isolata
 * e stampato dal browser (Cmd/Ctrl+P → Salva come PDF). Per questo NON usa
 * useI18n (nessun provider in quel contesto): la lingua arriva come prop.
 *
 * Honesty-policy: niente fatti inventati. Orari al minuto, numeri di telefono,
 * "perché-per-te" per giorno NON esistono nei dati → vengono omessi, le
 * sezioni degradano con grazia. */

import { unsplashSized } from "@/lib/img";
import type { ItineraryData, Moment } from "@/components/ItineraryCinematic";

type Props = {
  data: ItineraryData;
  itinerary: any;
  affiliateUrls: Record<string, string>;
  profilingInput: any;
  lang: "it" | "en";
};

const SEG = ["#E94560", "#A9802F", "#3E7A6E", "#9D7EBC", "#5E8CB6", "#C77B5A"];

function firstInt(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const m = String(s).replace(/[.\s]/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function Logo() {
  return (<div className="logo"><span className="dot" />MindRoute</div>);
}

export function ItineraryPrint({ data, itinerary, affiliateUrls, profilingInput, lang }: Props) {
  const it = lang === "it";
  const days = data.days;
  const dayCount = days.length;
  const dest = data.destination;

  // ── dati derivati ──────────────────────────────────────────────
  const dateRange = (() => {
    const a = profilingInput?.leaveDate ?? profilingInput?.travelDate;
    const b = profilingInput?.returnDate;
    const f = (raw: any) => { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; };
    const da = a ? f(a) : null; const db = b ? f(b) : null;
    if (!da) return null;
    const fmt = new Intl.DateTimeFormat(it ? "it-IT" : "en-US", { day: "numeric", month: "long" });
    return db ? `${fmt.format(da)} → ${fmt.format(db)}` : fmt.format(da);
  })();

  const peopleLabel = (() => {
    const c = (profilingInput?.companions ?? "").toLowerCase();
    if (!c) return null;
    if (c.includes("couple") || c.includes("coppia") || c.includes("partner")) return it ? "2 persone" : "2 people";
    if (c.includes("friend") || c.includes("amici")) return it ? "amici" : "friends";
    if (c.includes("famil")) return it ? "famiglia" : "family";
    return it ? "solo" : "solo";
  })();

  const budget = (() => {
    const raw = itinerary?.budgetSummary;
    if (!raw) return null;
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (p?.items?.length) {
        const rows = p.items
          .filter((i: any) => !/totale|total/i.test(i.label))
          .map((i: any, idx: number) => ({ nm: i.label, amt: firstInt(i.total ?? i.perPerson), c: SEG[idx % SEG.length] }))
          .filter((r: any) => r.amt > 0);
        const totalRow = p.items.find((i: any) => /totale|total/i.test(i.label));
        const total = totalRow ? (totalRow.total ?? totalRow.perPerson) : `€${rows.reduce((s: number, r: any) => s + r.amt, 0)}`;
        if (rows.length) {
          const sum = rows.reduce((s: number, r: any) => s + r.amt, 0) || 1;
          return { rows: rows.map((r: any) => ({ ...r, pc: Math.max(1, Math.round((r.amt / sum) * 100)) })), total: String(total) };
        }
      }
    } catch { /* free-form */ }
    return { text: String(raw) };
  })();

  const arrive = (() => {
    const raw = itinerary?.gettingThere;
    if (!raw) return null;
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (p?.steps?.length) {
        return { legs: p.steps.map((s: any) => ({ r: `${s.from} → ${s.to}`, dd: [s.method, s.duration, s.cost].filter(Boolean).join(" · ") })) };
      }
    } catch { /* free-form */ }
    return { text: String(raw) };
  })();

  const packing = (() => {
    const raw = itinerary?.packingList;
    if (!raw) return [];
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (p?.items?.length) return p.items.map((i: any) => `${i.emoji ?? ""} ${i.label ?? i}`.trim());
    } catch { /* free-form */ }
    return String(raw).split(/[,;]/).map(s => s.trim()).filter(s => s.length > 1);
  })();

  const checklist = [
    { cn: it ? "Volo a/r" : "Round-trip flight", cm: dest, url: affiliateUrls.expedia_flights },
    { cn: it ? `Alloggio · ${dayCount} notti` : `Stay · ${dayCount} nights`, cm: dest, url: affiliateUrls.hotels },
    { cn: it ? "Esperienza principale" : "Main experience", cm: dest, url: affiliateUrls.civitatis || affiliateUrls.musement || affiliateUrls.klook || affiliateUrls.viator },
    { cn: it ? "Tavolo · primo giorno" : "Table · day one", cm: dest, url: affiliateUrls.tripadvisor },
    { cn: it ? "Transfer / traghetto" : "Transfer / ferry", cm: dest, url: affiliateUrls.flixbus || affiliateUrls.samboat },
  ].filter(c => c.url);

  const coverFacts = [
    { n: `${dayCount}`, l: dayCount === 1 ? (it ? "giorno" : "day") : (it ? "giorni" : "days") },
    ...(budget && "total" in budget ? [{ n: budget.total, l: it ? "a persona" : "per person" }] : []),
    ...(peopleLabel ? [{ n: peopleLabel, l: it ? "viaggiatori" : "travellers" }] : []),
  ];

  const introFacts = [
    { k: it ? "Durata" : "Duration", v: `${dayCount} ${dayCount === 1 ? (it ? "giorno" : "day") : (it ? "giorni" : "days")}` },
    ...(dateRange ? [{ k: it ? "Periodo" : "Period", v: dateRange }] : []),
    ...(peopleLabel ? [{ k: it ? "Viaggiatori" : "Travellers", v: peopleLabel }] : []),
    ...(budget && "total" in budget ? [{ k: "Budget", v: `${budget.total} ${it ? "/pp" : "/pp"}` }] : []),
  ];

  // momento "chiave" del giorno: il primo da prenotare, altrimenti il primo.
  const keyMoment = (ms: Moment[]): number => {
    const i = ms.findIndex(m => m.ctaStatus === "reserve_recommended" || m.ctaStatus === "bookable_now");
    return i >= 0 ? i : 0;
  };

  let folio = 2;
  const hasPractical = !!(budget || arrive || itinerary?.bestTime || packing.length);

  return (
    <div className="viewport">
      {/* ══ COVER ══ */}
      <section className="page cover">
        <div className="cover-img" style={{ backgroundImage: data.heroImg ? `url('${unsplashSized(data.heroImg, 1600)}')` : undefined }} />
        <div className="cover-top">
          <div className="brand"><span className="dot" />MindRoute</div>
          <div className="built">{it ? "Costruito su di te" : "Built around you"}</div>
        </div>
        <div className="cover-body">
          <div className="cover-loc">
            {data.country && <><span>{data.country}</span><span className="sep" /></>}
            <span>{data.duration}</span>
          </div>
          <div className="cover-title">{dest}</div>
          <div className="cover-sub">{it ? "Il tuo viaggio" : "Your journey"}{dateRange ? ` · ${dateRange}` : ""}</div>
          <div className="cover-meta">
            {coverFacts.map((f, i) => (
              <div className="cover-fact" key={i}><div className="n">{f.n}</div><div className="l">{f.l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ INTRO ══ */}
      <section className="page">
        <div className="run-head"><Logo /><div>{dest} · 2026</div></div>
        <div className="pad">
          <div className="kicker coral">{it ? "Perché questo posto ti somiglia" : "Why this place is yours"}</div>
          {data.manifesto && (
            <p className="intro-quote"><span className="mark">{"“"}</span>{data.manifesto}</p>
          )}
          <div className="intro-grid">
            {data.highlights.length > 0 && (
              <div className="signals">
                <div className="h">{it ? "I tuoi capitoli" : "Your chapters"}</div>
                {data.highlights.map((s, i) => (
                  <div className="sig" key={i}>
                    <span className="g">{s.ic}</span>
                    <span className="t">{s.name}{s.desc && <span>{s.desc}</span>}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="facts">
              <div className="h">{it ? "Il viaggio in breve" : "The trip at a glance"}</div>
              {introFacts.map((f, i) => (
                <div className="fact" key={i}><span className="k">{f.k}</span><span className="v">{f.v}</span></div>
              ))}
            </div>
          </div>

          {data.mapPoints && data.mapPoints.length > 0 && (
            <div className="map-wrap">
              <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style={{ maxHeight: "120mm" }}>
                {data.mapPoints.length > 1 && (
                  <path d={data.mapPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
                    stroke="#3E7A6E" strokeWidth="1.5" fill="none" strokeDasharray="4 5" />
                )}
                {data.mapPoints.map((p, i) => (
                  <g key={i} fontFamily="Playfair Display" fontStyle="italic">
                    <circle cx={p.x} cy={p.y} r="11" fill="#E94560" />
                    <text x={p.x} y={p.y + 4} fill="#fff" fontSize="11" fontWeight="600" textAnchor="middle">{i + 1}</text>
                    {p.label && <text x={p.x + 16} y={p.y + 4} fill="rgba(42,32,36,.5)" fontSize="11">{p.label}</text>}
                  </g>
                ))}
              </svg>
              <div className="map-cap">
                <span className="serif" style={{ color: "var(--ink)" }}>{it ? "La rotta —" : "The route —"}</span>
                <span className="lg"><span className="sw" style={{ background: "var(--coral)" }} />{it ? "Le tue tappe" : "Your stops"}</span>
                {data.geometry && (
                  <span className="lg"><span className="sw" style={{ background: "var(--teal)" }} />
                    {data.geometry.walkable
                      ? (it ? `~${Math.round(data.geometry.spanKm)} km · a piedi` : `~${Math.round(data.geometry.spanKm)} km · walkable`)
                      : (it ? `~${Math.round(data.geometry.spanKm)} km tra le tappe` : `~${Math.round(data.geometry.spanKm)} km across`)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="folio"><span>{it ? "L'itinerario" : "The itinerary"}</span><span className="n">{folio}</span></div>
      </section>

      {/* ══ GIORNI ══ */}
      {days.map((day) => {
        folio += 1;
        const ms = data.momentsByDay[day.n] ?? [];
        const ki = keyMoment(ms);
        const f = ms[ki];
        return (
          <section className="page page-photo" key={day.n}>
            <div className="day-hero" style={{ backgroundImage: day.img ? `url('${unsplashSized(day.img, 1400)}')` : undefined }}>
              <div className="day-hero-top"><span>{dest}</span><span>{day.arc}</span></div>
              <div className="day-hero-num">
                <div className="label">{it ? "Giorno" : "Day"} {day.n} · {day.arc}</div>
                <div className="name">{day.title}</div>
              </div>
              <div className="day-hero-bignum">{day.n}</div>
            </div>
            <div className="day-lower">
              <div className="tl">
                <div className="h">{it ? "La giornata" : "The day"}</div>
                {ms.map((m, i) => (
                  <div className={"tl-slot" + (i === ki ? " key" : "")} key={i}>
                    <span className="dot" />
                    <div className="w">{m.t}</div>
                    <div className="x">{m.title.split(",")[0]}</div>
                  </div>
                ))}
              </div>
              {f && (
                <div className="day-focus">
                  <div className="fh">{it ? "Il momento del giorno" : "The moment of the day"}</div>
                  <div className="fname">{f.title}</div>
                  {f.desc && <p className="fdesc">{f.desc}</p>}
                  {(f.ctaPrice || f.locationName) && (
                    <div className="day-meta">
                      {f.ctaPrice && <div className="m"><div className="k">{it ? "Costo" : "Cost"}</div><div className="v">{f.ctaPrice}</div></div>}
                      {f.locationName && <div className="m"><div className="k">{it ? "Dove" : "Where"}</div><div className="v">{f.locationName}</div></div>}
                    </div>
                  )}
                  {day.sub && (
                    <div className="note why"><span className="t"><strong>{it ? "Perché per te" : "Why it's yours"}</strong> — {day.sub}</span></div>
                  )}
                </div>
              )}
            </div>
            <div className="folio"><span>{dest}</span><span className="n">{folio}</span></div>
          </section>
        );
      })}

      {/* ══ PRATICA ══ */}
      {hasPractical && (() => { folio += 1; return (
        <section className="page">
          <div className="run-head"><Logo /><div>{dest} · 2026</div></div>
          <div className="pad">
            <div className="sec-kick">{it ? "La pratica" : "Practical"}</div>
            <h2 className="sec-h">{it ? <>Cosa serve, <em>senza sorprese</em>.</> : <>What you need, <em>no surprises</em>.</>}</h2>

            {budget && "rows" in budget && (
              <div className="budget-card">
                <div className="budget-top">
                  <span className="l">{it ? "Budget stimato · a persona" : "Estimated budget · per person"}</span>
                  <span className="v">{budget.total}</span>
                </div>
                <div className="budget-bar">
                  {budget.rows.map((b: any, i: number) => <i key={i} style={{ width: `${b.pc}%`, background: b.c }} />)}
                </div>
                {budget.rows.map((b: any, i: number) => (
                  <div className="brow" key={i}>
                    <span className="sw" style={{ background: b.c }} />
                    <span className="nm">{b.nm}</span>
                    <span className="pc">{b.pc}%</span>
                    <span className="am">€{b.amt}</span>
                  </div>
                ))}
              </div>
            )}
            {budget && "text" in budget && (
              <div className="budget-card"><p className="fdesc">{budget.text}</p></div>
            )}

            <div className="two">
              {arrive && (
                <div className="block">
                  <div className="bh">✈ {it ? "Come arrivare" : "Getting there"}</div>
                  {"legs" in arrive ? arrive.legs.map((a: any, i: number) => (
                    <div className="leg" key={i}>
                      <div className="pin"><div className="d" />{i < arrive.legs.length - 1 && <div className="l" />}</div>
                      <div><div className="r">{a.r}</div>{a.dd && <div className="dd">{a.dd}</div>}</div>
                    </div>
                  )) : <p className="dd">{arrive.text}</p>}
                </div>
              )}
              {itinerary?.bestTime && (
                <div className="block">
                  <div className="bh">📅 {it ? "Periodo migliore" : "Best time"}</div>
                  <div className="when-leg">{itinerary.bestTime}</div>
                </div>
              )}
            </div>

            {packing.length > 0 && (
              <div className="pack">
                <div className="bh" style={{ fontSize: "8pt", letterSpacing: ".24em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 500 }}>
                  🎒 {it ? "Da portare" : "Packing"}
                </div>
                <div className="pack-cols">
                  <div className="pgroup">
                    {packing.map((p: string, i: number) => <span className="pchip" key={i}>{p}</span>)}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="folio"><span>{it ? "La pratica" : "Practical"}</span><span className="n">{folio}</span></div>
        </section>
      ); })()}

      {/* ══ CHECKLIST ══ */}
      {checklist.length > 0 && (() => { folio += 1; return (
        <section className="page">
          <div className="run-head"><Logo /><div>{dest} · 2026</div></div>
          <div className="pad">
            <div className="sec-kick">{it ? "Prima di partire" : "Before you go"}</div>
            <h2 className="sec-h">{it ? <>La tua <em>checklist</em>.</> : <>Your <em>checklist</em>.</>}</h2>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "11pt", color: "var(--ink-soft)", marginTop: "4mm" }}>
              {it ? "Spunta man mano. Prenota nell'ordine: prima volo e alloggio, poi le esperienze con anticipo." : "Tick as you go. Book in order: flight and stay first, then experiences ahead of time."}
            </p>
            <div className="check">
              {checklist.map((c, i) => (
                <div className="crow" key={i}>
                  <span className="cbox" />
                  <div className="cbody"><div className="cn">{c.cn}</div><div className="cm">{c.cm}</div></div>
                  <span className="cday">{dest}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="folio"><span>{it ? "Prima di partire" : "Before you go"}</span><span className="n">{folio}</span></div>
        </section>
      ); })()}

      {/* ══ CHIUSURA ══ */}
      <section className="page closing">
        <div className="closing-img" style={{ backgroundImage: data.heroImg ? `url('${unsplashSized(data.heroImg, 1600)}')` : undefined }} />
        <div className="closing-body">
          <div className="closing-kick">{it ? "Cosa ti porterai a casa" : "What you'll bring home"}</div>
          {data.closingQuote && <div className="closing-quote">{data.closingQuote}</div>}
          <div className="closing-sign"><span className="dot" />MindRoute · {it ? "costruito su di te" : "built around you"}</div>
        </div>
      </section>
    </div>
  );
}

export default ItineraryPrint;
