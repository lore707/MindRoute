/**
 * 2 · GIORNO — il capitolo.
 *
 * Non quattro blocchi con l'intestazione della fascia, ma UN filo continuo:
 * il colore del pallino porta l'informazione della fascia, l'orario sta sopra
 * il titolo, la fotografia della tappa a destra. Fra una tappa e l'altra, come
 * ci si sposta. Su desktop il filo tiene compagnia alla mappa, che resta
 * accanto invece di essere una destinazione separata.
 * ─────────────────────────────────────────────────────────────── */
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, ImageIcon } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { EASE } from "@/lib/motion";
import { useFlow, BAND_COLOR, bandOf, type Band } from "./context";
import { DayMap } from "./DayMap";

const bg = (url: string | undefined, w: number, q = 66) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

const BAND_LABEL: Record<Band, { it: string; en: string }> = {
  mattina: { it: "Mattina", en: "Morning" },
  pranzo: { it: "Pranzo", en: "Lunch" },
  pomeriggio: { it: "Pomeriggio", en: "Afternoon" },
  sera: { it: "Sera", en: "Evening" },
};

export function DayScreen({ n }: { n: number }) {
  const f = useFlow();
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<string | null>(null);

  const day = f.days.find(d => d.n === n);
  const moments = f.momentsByDay[n] ?? [];
  const raw = f.rawDay(n);

  // Numeri veri del giorno (dal v2 grezzo, non dal modello a schermo).
  const stats = useMemo(() => {
    const ms: any[] = raw?.moments ?? [];
    let durMin = 0;
    for (const m of ms) {
      if (typeof m.duration_min === "number") durMin += m.duration_min;
      const tn = m.transport_to_next;
      if (tn && typeof tn.duration_min === "number") durMin += tn.duration_min;
    }
    const cost = (typeof raw?.cost_bookable_total === "number" ? raw.cost_bookable_total : 0)
      + (typeof raw?.cost_onsite_estimate === "number" ? raw.cost_onsite_estimate : 0);
    return {
      walkKm: typeof raw?.walking_distance_km === "number" ? raw.walking_distance_km : null,
      durMin,
      cost,
    };
  }, [raw]);

  const fmtDur = (min: number) => {
    if (min <= 0) return null;
    const h = Math.floor(min / 60), m = min % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
  };

  const rise = (delay: number) => (reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: .45, ease: EASE, delay } });

  const Timeline = (
    <div className="mrf-tl">
      {moments.map((m, i) => {
        const band = bandOf(m);
        const isLast = i === moments.length - 1;
        return (
          <div key={m.id ?? i}>
            <motion.button
              className={"mrf-stop" + (selected && m.id === selected ? " on" : "")}
              style={{ ["--bc" as any]: BAND_COLOR[band] }}
              onClick={() => m.id && f.goMoment(n, m.id)}
              disabled={!m.id}
              {...(reduce ? {} : {
                initial: { opacity: 0, y: 12 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: .4, ease: EASE, delay: Math.min(i * .05, .35) },
              })}>
              <span className="mrf-stop-rail"><span className="mrf-stop-dot" /></span>
              <span className="mrf-stop-body">
                <span className="mrf-stop-time">
                  {m.startTime || f.L(BAND_LABEL[band].it, BAND_LABEL[band].en)}
                </span>
                <span className="mrf-stop-title">{m.title}</span>
                {(m.guide?.whatItIs || m.desc) && <span className="mrf-stop-summary">{m.guide?.whatItIs || m.desc}</span>}
                <span className="mrf-stop-meta">
                  {m.kindLabel && <span>{m.kindLabel}</span>}
                  {m.kindLabel && m.durationLabel && <span className="sep">·</span>}
                  {m.durationLabel && <span>{m.durationLabel}</span>}
                  {(m.kindLabel || m.durationLabel) && m.costLabel && <span className="sep">·</span>}
                  {m.costLabel && <span>{m.costLabel}</span>}
                </span>
              </span>
              {m.imageUrl
                ? <span className="mrf-stop-thumb" style={{ backgroundImage: bg(m.imageUrl, 200) }} />
                : <span className="mrf-stop-thumb ph"><ImageIcon size={16} /></span>}
            </motion.button>
            {/* Come si arriva alla prossima: informazione di collegamento,
                non una tappa. Sta nello spazio fra due, non dentro una. */}
            {!isLast && m.transport && (
              <div className="mrf-link"><span className="dash" />{m.transport}</div>
            )}
          </div>
        );
      })}
      {moments.length === 0 && <div className="mrf-empty">{f.t("if.day.empty")}</div>}
      {/* Su desktop il FAB coprirebbe la mappa: l'aggiunta chiude il filo. */}
      {f.isDesktop && (
        <button className="mrf-ed-add" onClick={() => f.goEdit(n)}>
          <Plus size={16} /> {f.t("if.day.add")}
        </button>
      )}
    </div>
  );

  const Head = (
    <>
      <div className="mrf-d-hero">
        {day?.img && <div className="mrf-d-hero-ph" style={{ backgroundImage: bg(day.img, f.isDesktop ? 1400 : 900) }} />}
        <div className="mrf-d-hero-veil" />
        {f.days.length > 1 && (
          <div className="mrf-d-dots">
            {f.days.map(d => (
              <button key={d.n} className={"mrf-d-dot" + (d.n === n ? " on" : "")}
                onClick={() => f.goDay(d.n)} aria-label={f.tx("if.day", { n: d.n })}
                aria-current={d.n === n ? "page" : undefined}>
                {d.n}
              </button>
            ))}
          </div>
        )}
      </div>

      <motion.div className="mrf-d-head" {...rise(0)}>
        {day?.arc && <div className="mrf-d-arc">{day.arc}</div>}
        <h1 className="mrf-d-title">{day?.title || f.tx("if.day", { n })}</h1>
        {day?.sub && <p className="mrf-d-sub">{day.sub}</p>}
        <div className="mrf-d-stats">
          {moments.length > 0 && (
            <span className="mrf-d-stat">
              <b>{moments.length}</b> {moments.length === 1 ? f.t("if.stopOne") : f.t("if.stops")}
            </span>
          )}
          {fmtDur(stats.durMin) && <span className="mrf-d-stat"><b>{fmtDur(stats.durMin)}</b></span>}
          {stats.walkKm != null && <span className="mrf-d-stat"><b>~{stats.walkKm} km</b> {f.t("if.day.walk")}</span>}
          {stats.cost > 0 && <span className="mrf-d-stat"><b>€{Math.round(stats.cost)}</b> {f.t("if.day.spend")}</span>}
        </div>
      </motion.div>
    </>
  );

  /* ── ≥1024px: il giorno e la sua mappa, affiancati ── */
  if (f.isDesktop) {
    return (
      <div className="mrf-split">
        <div className="l">
          {Head}
          <div className="mrf-d-head" style={{ paddingBottom: 40 }}>{Timeline}</div>
        </div>
        <div className="r">
          <DayMap n={n} active onSelect={setSelected} />
        </div>
      </div>
    );
  }

  return (
    <div className="mrf-screen">
      {Head}
      <div className="mrf-d-head">{Timeline}</div>
      <button className="mrf-fab" onClick={() => f.goEdit(n)} aria-label={f.t("if.day.add")}>
        <Plus size={24} />
      </button>
    </div>
  );
}
