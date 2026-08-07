/**
 * PortraitScreen.tsx — "Il tuo ritratto", redesign 2026-08 sul mockup.
 * ───────────────────────────────────────────────────────────────
 * Cinque sezioni, nell'ordine in cui una persona si fa le domande:
 *
 *   1. Chi sono oggi          → frase + confidenza + viaggi analizzati
 *   2. Come sono adesso       → cosa mi accende, cosa mi spegne, cosa provare
 *   3. Come sto cambiando     → la timeline dei cambiamenti VERI
 *   4. Cosa avete scoperto    → max 4 insight, il numero solo su richiesta
 *   5. Cosa faccio adesso     → un insight che diventa un viaggio
 *
 * Tutto viene da dati reali (viaggi, snapshot dei tratti, chip scelti):
 * la logica sta in lib/portrait-insights.ts, pura e verificabile. Qui dentro
 * non si calcola nulla che non venga da lì.
 *
 * Regole di copy della specifica rispettate nel dizionario (i18n-dict/portrait):
 * titoli ≤ 6 parole, spiegazioni ≤ 12, mai punteggi ("esploratore al 73%") né
 * conteggi d'uso ("hai usato l'app 27 volte").
 * ─────────────────────────────────────────────────────────────── */

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Leaf, Users, Compass, Sparkles, TrendingUp, Lightbulb, ArrowRight,
  Share2, Star, Camera, Mountain,
} from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { EASE } from "@/lib/motion";
import { useI18n } from "@/lib/i18n";
import type { AccountData } from "@/components/AccountCinematic";
import {
  computeConfidence, buildEvolution, visibleInsights, nextStepInsight,
  takenTrips, type Insight, type PortraitSignals,
} from "@/lib/portrait-insights";
import "@/styles/portrait.css";

const bg = (url: string | undefined, w: number, q = 68) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

const CONTINENTS = ["Europa", "Asia", "Africa", "Americhe", "Oceania"];

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

type Props = {
  data: AccountData;
  /** Genera un itinerario dal profilo. */
  onGenerate?: () => void;
  /** Genera partendo da una sfida esplicita (pre-compila il modal). */
  onChallenge?: (challenge: string) => void;
  onShare?: () => void;
  sharing?: boolean;
};

export function PortraitScreen({ data, onGenerate, onChallenge, onShare, sharing }: Props) {
  const { t, lang } = useI18n();
  const reduce = useReducedMotion();
  const [openInsight, setOpenInsight] = useState<string | null>(null);

  const tx = (key: string, vars: Record<string, string | number> = {}) => {
    let s = t(key);
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };

  const p = data.portrait;
  const trips = data.trips ?? [];

  const signals: PortraitSignals = useMemo(() => ({
    trips: trips.map(x => ({
      dest: x.dest, continent: x.continent, rawDate: x.rawDate, taken: x.taken, duration: x.duration,
    })),
    seek: p?.seek ?? [],
    avoid: p?.avoid ?? [],
    vector: data.traitVector ?? null,
    snapshotCount: p?.snapshotCount ?? (data.traitSnapshots?.length ?? 0),
    ownWords: p?.ownWords ?? null,
  }), [trips, p, data.traitVector, data.traitSnapshots]);

  const confidence = useMemo(() => computeConfidence(signals), [signals]);
  const insights = useMemo(() => visibleInsights(signals, confidence), [signals, confidence]);
  const evolution = useMemo(() => buildEvolution(data.traitSnapshots ?? []), [data.traitSnapshots]);
  const next = useMemo(() => nextStepInsight(insights), [insights]);

  const doneCount = takenTrips(signals.trips).length;
  const analysed = doneCount > 0 ? doneCount : trips.length;

  // Il continente mai toccato: alimenta la terza card dello snapshot.
  const missingContinent = useMemo(() => {
    const seen = new Set(trips.map(x => (x.continent ?? "").trim()).filter(Boolean));
    if (seen.size === 0) return null;
    return CONTINENTS.find(c => !seen.has(c)) ?? null;
  }, [trips]);

  // Fotografie per medaglioni e insight: sono i viaggi REALI dell'utente.
  const photos = useMemo(() => trips.map(x => x.img).filter(Boolean), [trips]);
  const photoAt = (i: number) => (photos.length ? photos[i % photos.length] : "");

  const rise = (delay: number) => (reduce
    ? {}
    : { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: .5, ease: EASE, delay } });

  /* ── nessun dato: non si finge un ritratto ── */
  if (!p?.available && trips.length === 0) {
    return (
      <div className="mrp">
        <div className="mrp-empty">
          <h2>{t("pt.empty.t")}</h2>
          <p>{t("pt.empty.s")}</p>
          {onGenerate && <button className="mrp-btn acc" onClick={onGenerate}>{t("pt.next.cta")} <ArrowRight size={16} /></button>}
        </div>
      </div>
    );
  }

  /* ── 1 · HERO ── */
  const headline = data.traitHeadline || p?.narrative?.paradox || p?.narrative?.portrait || data.profileQuote;

  /* ── 2 · SNAPSHOT ── */
  const energize = (p?.seek ?? [])[0];
  const drain = (p?.avoid ?? [])[0];
  const snapCards = [
    energize ? {
      key: "energy", tone: "var(--tone-good)", icon: <Leaf size={14} />,
      head: t("pt.snap.energy"), value: cap(energize), bar: 100, imp: t("pt.snap.impactHigh"),
    } : null,
    drain ? {
      key: "drain", tone: "var(--tone-warn)", icon: <Users size={14} />,
      head: t("pt.snap.drain"), value: cap(drain), bar: 34, imp: t("pt.snap.impactLow"),
    } : null,
    {
      key: "reco", tone: "var(--tone-new)", icon: <Compass size={14} />,
      head: t("pt.snap.reco"),
      value: missingContinent ? tx("pt.snap.recoContinent", { continent: missingContinent }) : t("pt.snap.recoUnfamiliar"),
      bar: 62, imp: t("pt.snap.impactNew"),
    },
  ].filter(Boolean) as Array<{ key: string; tone: string; icon: JSX.Element; head: string; value: string; bar: number; imp: string }>;

  const stepIcon = (i: number) => (i === 0 ? <Mountain size={20} /> : i === 1 ? <Camera size={20} /> : <Leaf size={20} />);

  return (
    <div className="mrp">
      {/* ═══ 1 · CHI SEI OGGI ═══ */}
      <motion.section className="mrp-hero" {...rise(0)}>
        {data.heroImg && <div className="mrp-hero-ph" style={{ backgroundImage: bg(data.heroImg, 1600, 66) }} />}
        <div className="mrp-hero-veil" />
        <div className="mrp-hero-in">
          <div className="mrp-kick"><Sparkles size={13} /> {t("pt.hero.kick")}</div>
          <h1 className="mrp-hero-t">
            {t("pt.hero.t1")}{t("pt.hero.t2") ? <> {t("pt.hero.t2")}</> : null} <em>{t("pt.hero.today")}</em>
          </h1>
          {headline && <p className="mrp-hero-lede">{headline}</p>}
        </div>
        <div className="mrp-hero-stats">
          <div className="mrp-stat" title={t("pt.hero.confWhy")}>
            <span className="k">{t("pt.hero.confidence")}</span>
            <span className="v">{confidence}%</span>
          </div>
          <div className="mrp-stat">
            <span className="k">{t("pt.hero.basedOn")}</span>
            <span className="v sm">
              {analysed} {doneCount > 0 ? t("pt.hero.taken") : t("pt.hero.planned")}
            </span>
          </div>
          {onShare && (
            <button className="mrp-stat act" onClick={onShare} disabled={sharing}>
              <span className="k">{t("acd.p3.share")}</span>
              <span className="v sm"><Share2 size={15} /></span>
            </button>
          )}
        </div>
      </motion.section>

      {/* ═══ 2 · COME SEI ADESSO ═══ */}
      <motion.section className="mrp-sec" {...rise(.04)}>
        <div className="mrp-kick"><Sparkles size={13} /> {t("pt.snap.title")}</div>
        {snapCards.length > 1 ? (
          <div className="mrp-snap">
            {snapCards.map(c => (
              <div className="mrp-card" key={c.key} style={{ ["--tone" as any]: c.tone }}>
                <div className="mrp-card-h"><span className="mrp-card-ic">{c.icon}</span>{c.head}</div>
                <div className="mrp-card-v">{c.value}</div>
                <div>
                  <div className="mrp-card-bar"><i style={{ width: `${c.bar}%` }} /></div>
                  <div className="mrp-card-imp" style={{ marginTop: 7 }}>{c.imp}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mrp-locked">{t("pt.snap.empty")}</div>
        )}
      </motion.section>

      {/* ═══ 3 · COME STAI CAMBIANDO ═══ */}
      <motion.section className="mrp-sec" {...rise(.06)}>
        <div className="mrp-kick"><TrendingUp size={13} /> {t("pt.evo.title")}</div>
        {evolution.length >= 2 ? (
          <div className="mrp-evo">
            {evolution.map((s, i) => (
              <div className={"mrp-step" + (s.isNow ? " now" : "")} key={`${s.axis}-${i}`}>
                <div className="mrp-medal"
                  style={!s.isNow && photoAt(i) ? { backgroundImage: bg(photoAt(i), 200) } : undefined}>
                  {s.isNow ? <Star size={20} fill="currentColor" /> : (photoAt(i) ? null : stepIcon(i))}
                </div>
                <div className="mrp-step-y">{s.isNow ? t("pt.evo.now") : s.year}</div>
                <div className="mrp-step-t">{t(`pt.evo.${s.axis}.${s.hi ? "hi" : "lo"}.t`)}</div>
                <div className="mrp-step-p">{t(`pt.evo.${s.axis}.${s.hi ? "hi" : "lo"}.p`)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mrp-locked">{t("pt.evo.empty")}</div>
        )}
      </motion.section>

      {/* ═══ 4 · COSA ABBIAMO SCOPERTO ═══ */}
      <motion.section className="mrp-sec" {...rise(.08)}>
        <div className="mrp-kick"><Lightbulb size={13} /> {t("pt.ins.title")}</div>
        {insights.length > 0 ? (
          <div className="mrp-ins">
            {insights.map((ins, i) => (
              <InsightCard key={ins.id} ins={ins} photo={photoAt(i + 1)} tx={tx} t={t}
                open={openInsight === ins.id}
                onToggle={() => setOpenInsight(openInsight === ins.id ? null : ins.id)} />
            ))}
          </div>
        ) : (
          <div className="mrp-locked">{t("pt.ins.locked")}</div>
        )}
      </motion.section>

      {/* ═══ 5 · IL PROSSIMO PASSO ═══ */}
      <motion.section className="mrp-sec" {...rise(.1)}>
        <div className="mrp-next">
          <div className="mrp-next-h">
            <span className="mrp-next-ic"><Lightbulb size={19} /></span>
            <div>
              <h2 className="mrp-next-t">
                {next ? tx(next.titleKey, next.vars) : t("pt.next.fallbackT")}
              </h2>
              <p className="mrp-next-s">{next ? t("pt.next.sub") : t("pt.next.fallbackS")}</p>
            </div>
          </div>
          <div className="mrp-next-acts">
            <button className="mrp-btn acc"
              onClick={() => {
                if (next?.challengeKey && onChallenge) onChallenge(tx(next.challengeKey, next.vars));
                else onGenerate?.();
              }}
              disabled={!onGenerate && !onChallenge}>
              {t("pt.next.cta")} <ArrowRight size={16} />
            </button>
            {next && (
              <button className="mrp-btn icon" title={t("pt.next.seeWhy")} aria-label={t("pt.next.seeWhy")}
                onClick={() => setOpenInsight(next.id)}>
                <Sparkles size={17} />
              </button>
            )}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

/* ── una scoperta. Il numero che la regge esce solo se lo chiedi. ── */
function InsightCard({ ins, photo, open, onToggle, tx, t }: {
  ins: Insight; photo: string; open: boolean; onToggle: () => void;
  tx: (k: string, v?: Record<string, string | number>) => string;
  t: (k: string) => string;
}) {
  return (
    <button className={"mrp-insight" + (open ? " open" : "")} onClick={onToggle} aria-expanded={open}>
      <div className="mrp-insight-b">
        <div className="mrp-insight-h">
          <div className="mrp-insight-t">{tx(ins.titleKey, ins.vars)}</div>
        </div>
        <p className="mrp-insight-p">{tx(ins.bodyKey, ins.vars)}</p>
        {open && (
          <div className="mrp-insight-w">
            <span className="k">{t("pt.ins.why")}</span>
            <span>{tx(ins.why.key, ins.why.vars)}</span>
          </div>
        )}
      </div>
      {photo && <span className="mrp-insight-ph" style={{ backgroundImage: bg(photo, 260) }} />}
    </button>
  );
}
