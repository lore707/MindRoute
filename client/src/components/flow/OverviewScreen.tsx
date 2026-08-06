/**
 * 1 · OVERVIEW — la prima schermata dello stack.
 *
 * Non è un cruscotto: è la copertina. Il titolo del viaggio, i giorni come
 * capitoli da scegliere, il tema che dice perché questo viaggio è questo, e in
 * fondo l'unico numero che conta davvero (quanto manca a essere pronti).
 * ─────────────────────────────────────────────────────────────── */
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { EASE } from "@/lib/motion";
import { useFlow } from "./context";
import { TravelDatesBanner, TripCheckinBanner } from "./TripBanners";

const bg = (url: string | undefined, w: number, q = 66) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

export function OverviewScreen() {
  const f = useFlow();
  const reduce = useReducedMotion();
  const [themeOpen, setThemeOpen] = useState(false);

  const { data, days, momentsByDay } = f;
  const dayCount = days.length;
  const stopCount = Object.values(momentsByDay).reduce((a, ms) => a + ms.length, 0);

  // Il tema del viaggio: prima frase del manifesto come titolo, il resto come
  // corpo espandibile. Nessun testo inventato — solo tagliato dove respira.
  const manifesto = (data.manifesto || "").trim();
  const cut = manifesto.search(/(?<=[.!?])\s/);
  const themeTitle = cut > 20 ? manifesto.slice(0, cut + 1) : manifesto;
  const themeRest = cut > 20 ? manifesto.slice(cut + 1).trim() : "";

  const rise = (delay: number) => (reduce
    ? {}
    : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: .5, ease: EASE, delay } });

  return (
    <div className="mrf-screen">
      <motion.div className="mrf-ov-hero" {...rise(0)}>
        <div className="mrf-kick">{data.destination}</div>
        <h1 className="mrf-ov-title">{f.t("if.ov.title")}<span className="dot">.</span></h1>
        <p className="mrf-ov-lede">{f.t("if.ov.lede")}</p>
      </motion.div>

      {/* I giorni come capitoli: l'arco narrativo prima del numero. */}
      <motion.div className="mrf-ov-days" {...rise(.06)}>
        {days.map((d) => {
          const n = (momentsByDay[d.n] ?? []).length;
          return (
            <button key={d.n} className={"mrf-daychip" + (n > 0 ? " counted" : "")} onClick={() => f.goDay(d.n)}
              aria-label={f.tx("if.day", { n: d.n })}>
              {d.arc && <span className="arc">{d.arc}</span>}
              {n > 0 && <span className="badge">{n}</span>}
              <span className="n">{f.tx("if.day", { n: d.n })}</span>
              {(d.date || d.title) && <span className="dt">{d.date || d.title}</span>}
            </button>
          );
        })}
      </motion.div>

      <div className="mrf-wrap">
        {/* Le due domande che rendono reale il viaggio: quando parti davvero,
            e — a viaggio finito — se ci sei andato. */}
        <TravelDatesBanner
          itineraryId={f.itineraryId}
          tripMeta={(f.itinerary as any)?.tripMeta}
          lang={f.lang}
          onConfirmed={f.refetch}
        />
        <TripCheckinBanner
          itineraryId={f.itineraryId}
          itinerary={f.itinerary}
          lang={f.lang}
          onAnswered={f.refetch}
        />

        {themeTitle && (
          <motion.section className="mrf-theme" {...rise(.12)}>
            {data.heroImg && <div className="mrf-theme-ph" style={{ backgroundImage: bg(data.heroImg, f.isDesktop ? 1400 : 800) }} />}
            <div className="mrf-theme-veil" />
            <div className="mrf-theme-in">
              <div className="mrf-theme-k">{f.t("if.ov.themeKick")}</div>
              <h2 className="mrf-theme-t">{themeTitle}</h2>
              {themeOpen && themeRest && <p className="mrf-theme-full">{themeRest}</p>}
              {themeRest && !themeOpen && (
                <button className="mrf-pill sm" onClick={() => setThemeOpen(true)}>
                  {f.t("if.ov.themeMore")} <ArrowRight size={14} />
                </button>
              )}
            </div>
          </motion.section>
        )}

        {data.highlights?.length > 0 && (
          <motion.section {...rise(.16)}>
            <h3 className="mrf-sec-h" style={{ marginTop: 30 }}>{f.t("if.ov.highlights")}</h3>
            <div className="mrf-hl">
              {data.highlights.map((h, i) => (
                <div className="mrf-hl-i" key={i}>
                  <span className="ic">{h.ic}</span>
                  <div>
                    <div className="nm">{h.name}</div>
                    {h.desc && <div className="ds">{h.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {data.closingQuote && (
          <motion.p className="mrf-closing" {...rise(.2)}>{data.closingQuote}</motion.p>
        )}

        {/* Il progresso reale: quante prenotazioni essenziali sono chiuse. */}
        <motion.div className="mrf-ov-foot" {...rise(.24)}>
          <div className="mrf-ov-facts">
            {dayCount} {dayCount === 1 ? f.t("if.dayOne") : f.t("if.days")}
            {stopCount > 0 && <> · {stopCount} {stopCount === 1 ? f.t("if.stopOne") : f.t("if.stops")}</>}
          </div>
          <div className="mrf-bar"><i style={{ width: `${f.pct}%` }} /></div>
          <div className="mrf-ov-pct">{f.pct}% {f.t("if.ov.progress")}</div>
        </motion.div>
      </div>
    </div>
  );
}
