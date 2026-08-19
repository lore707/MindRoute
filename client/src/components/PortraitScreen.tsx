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

import { useCallback, useMemo, useState } from "react";
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
} from "@shared/portrait-insights";
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
  /** Le proposte della settimana: qui sono la CONCLUSIONE dell'analisi. */
  picks?: Array<{ name: string; country: string; imageUrl: string; matchPct: number; tags: string[] }> | null;
  /** La riga templata che dice su quali assi si reggono. */
  picksWhy?: string | null;
  /** Toccarne una apre il pannello dei vincoli con la meta bloccata. */
  onPickDestination?: (d: { name: string; country?: string; imageUrl?: string; matchPct?: number | null }) => void;
};

export function PortraitScreen({ data, onGenerate, onChallenge, onShare, sharing, picks, picksWhy, onPickDestination }: Props) {
  const { t, lang } = useI18n();
  const reduce = useReducedMotion();
  const [openInsight, setOpenInsight] = useState<string | null>(null);
  const [openStep, setOpenStep] = useState<string | null>(null);
  /* Letture personalizzate, per indice di tappa.
   *   undefined = non ancora chiesta · null = non disponibile (resta il testo
   *   curato) · stringa = la lettura scritta sui dati veri di questa persona.
   * Si chiedono SOLO quando la tappa si apre: la maggior parte non viene mai
   * aperta, e generarle tutte sarebbe lavoro (e spesa) buttato. */
  const [readings, setReadings] = useState<Record<number, string | null>>({});
  const [loadingRead, setLoadingRead] = useState<number | null>(null);

  const askReading = useCallback((idx: number) => {
    if (idx in readings || loadingRead === idx) return;
    setLoadingRead(idx);
    fetch(`/api/me/portrait/reading?step=${idx}`)
      // 204 = nessuna lettura garantibile. Non e' un errore: il testo curato
      // e' gia' a schermo e resta li'.
      .then(r => (r.status === 204 ? null : r.ok ? r.json() : null))
      .then((d: { text?: string } | null) => setReadings(p => ({ ...p, [idx]: d?.text ?? null })))
      .catch(() => setReadings(p => ({ ...p, [idx]: null })))
      .finally(() => setLoadingRead(null));
  }, [readings, loadingRead]);

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
  const evolution = useMemo(
    // I viaggi servono per ancorare ogni cambiamento a DOVE si e' visto.
    () => buildEvolution(
      data.traitSnapshots ?? [],
      trips.map(x => ({ dest: x.dest, img: x.img, href: x.href, rawDate: x.rawDate })),
      lang,
    ),
    [data.traitSnapshots, trips, lang],
  );
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
          {/* Due righe esplicite: l'accento deve restare sulla stessa riga della
              parola che lo precede ("you are today.", "sei oggi."), non cadere
              da solo in fondo. */}
          <h1 className="mrp-hero-t">
            <span className="ln">{t("pt.hero.l1")}</span>
            <span className="ln">{t("pt.hero.l2")} <em>{t("pt.hero.today")}</em></span>
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
          <>
            <div className="mrp-evo">
              {evolution.map((s, i) => {
                const now = s.kind === "now";
                const pole = s.hi ? "hi" : "lo";
                const key = `${s.axis}-${s.kind}-${i}`;
                const img = now ? "" : (s.trip?.img || photoAt(i));
                // L'ancora e' il VIAGGIO. L'anno da solo non spiega niente:
                // su un profilo nuovo tutti i viaggi hanno lo stesso anno.
                const anchor = now
                  ? t("pt.evo.nowK")
                  : s.trip
                    ? tx("pt.evo.after", { dest: s.trip.dest })
                    : tx("pt.evo.nth", { n: s.ordinal });
                return (
                  <button className={"mrp-step" + (now ? " now" : "") + (openStep === key ? " on" : "")}
                    key={key}
                    onClick={() => {
                      const next = openStep === key ? null : key;
                      setOpenStep(next);
                      if (next && !now) askReading(i);
                    }}
                    aria-expanded={openStep === key}>
                    <span className="mrp-medal" style={img ? { backgroundImage: bg(img, 200) } : undefined}>
                      {now ? <Compass size={20} /> : (img ? null : stepIcon(i))}
                    </span>
                    <span className="mrp-step-y">{anchor}</span>
                    <span className="mrp-step-t">
                      {now ? t("pt.evo.nowT") : t(`pt.evo.${s.axis}.${pole}.t`)}
                    </span>
                    <span className="mrp-step-p">
                      {now
                        ? t(`pt.evo.dirShort.${s.axis}.${pole}`)
                        : t(`pt.evo.${s.axis}.${pole}.p`)}
                    </span>
                    <span className="mrp-step-more">{t("pt.evo.open")} →</span>
                  </button>
                );
              })}
            </div>

            {/* Il pannello: sotto il filo, non sopra. Cosi' il confronto fra
                le tappe resta visibile mentre se ne legge una. */}
            {(() => {
              const idx = evolution.findIndex((s, i) => `${s.axis}-${s.kind}-${i}` === openStep);
              if (idx < 0) return null;
              const s = evolution[idx];
              const pole = s.hi ? "hi" : "lo";
              const fromPole = s.fromHi ? "hi" : "lo";
              const isNow = s.kind === "now";
              return (
                <div className="mrp-detail" role="region">
                  <button className="mrp-detail-x" onClick={() => setOpenStep(null)} aria-label={t("if.close")}>×</button>
                  <div className="mrp-detail-k">{isNow ? t("pt.evo.nowTryK") : t("pt.evo.detailK")}</div>
                  <p className={"mrp-detail-t" + (loadingRead === idx ? " loading" : "")}>
                    {isNow
                      ? t(`pt.evo.dir.${s.axis}.${pole}`)
                      /* La lettura scritta sui tuoi viaggi quando c'e'; il testo
                         curato mentre arriva, o se non e' garantibile vera. */
                      : (readings[idx] || t(`pt.evo.${s.axis}.${pole}.why`))}
                  </p>
                  {!isNow && readings[idx] && (
                    <div className="mrp-detail-src">{t("pt.evo.personal")}</div>
                  )}
                  {!isNow && (
                    <>
                      <div className="mrp-detail-k sub">{t("pt.evo.evidenceK")}</div>
                      <p className="mrp-detail-e">
                        {tx("pt.evo.evidence", {
                          from: t(`pt.evo.${s.axis}.${fromPole}.t`),
                          to: t(`pt.evo.${s.axis}.${pole}.t`),
                        })}
                        {s.trip && " " + tx("pt.evo.evidenceTrip", {
                          dest: s.trip.dest, when: s.trip.when ? ` (${s.trip.when})` : "",
                        })}
                      </p>
                    </>
                  )}
                  {isNow && next && (
                    <button className="mrp-btn acc sm" onClick={() => {
                      if (next.challengeKey && onChallenge) onChallenge(tx(next.challengeKey, next.vars));
                      else onGenerate?.();
                    }}>
                      {t("pt.next.cta")} <ArrowRight size={15} />
                    </button>
                  )}
                </div>
              );
            })()}
          </>
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
                onToggle={() => setOpenInsight(openInsight === ins.id ? null : ins.id)}
                onUse={ins.challengeKey && onChallenge
                  ? () => onChallenge(tx(ins.challengeKey!, ins.vars))
                  : onGenerate} />
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

      {/* ═══ 6 · LE TRE PROPOSTE — la conclusione, non un catalogo ═══
          Qui, e non in home, l'elenco ha senso: l'utente ha appena letto chi è
          e come sta cambiando, e queste sono la RISPOSTA a quella lettura. In
          home ne compare una sola, con una riga di motivo; qui ci sono tutte e
          tre, e c'è lo spazio per dire perché. Stessa terna, stessa cadenza
          settimanale — cambia cosa se ne può dire. */}
      {picks && picks.length > 0 && (
        <motion.section className="mrp-sec" {...rise(.1)}>
          <div className="mrp-kick"><Compass size={13} /> {t("pt.picks.k")}</div>
          <h2 className="mrp-picks-t">{t("pt.picks.t")}</h2>
          {picksWhy && <p className="mrp-picks-why">{picksWhy}</p>}
          <div className="mrp-picks">
            {picks.map((p, i) => (
              <button key={p.name + i} className="mrp-pick"
                      onClick={() => onPickDestination?.({ name: p.name, country: p.country, imageUrl: p.imageUrl, matchPct: p.matchPct })}
                      disabled={!onPickDestination}>
                <span className="mrp-pick-ph" style={{ backgroundImage: bg(p.imageUrl, 520) }}>
                  <span className="mrp-pick-m">{p.matchPct}%</span>
                </span>
                <span className="mrp-pick-b">
                  <span className="mrp-pick-n">{p.name.split(",")[0]}</span>
                  <span className="mrp-pick-c">{p.country}</span>
                  {p.tags.length > 0 && <span className="mrp-pick-tg">{p.tags.slice(0, 3).join(" · ")}</span>}
                </span>
              </button>
            ))}
          </div>
          <p className="mrp-picks-note">{t("pt.picks.week")}</p>
        </motion.section>
      )}
    </div>
  );
}

/* ── Una scoperta.
 * Chiusa e' una pillola: titolo + una riga. Aperta dice cosa vuol dire
 * davvero, su quali numeri si regge, e — soprattutto — diventa un'azione:
 * quella scoperta puo' guidare il prossimo viaggio.
 * ─────────────────────────────────────────────────────────────── */
function InsightCard({ ins, photo, open, onToggle, onUse, tx, t }: {
  ins: Insight; photo: string; open: boolean; onToggle: () => void;
  onUse?: () => void;
  tx: (k: string, v?: Record<string, string | number>) => string;
  t: (k: string) => string;
}) {
  return (
    <div className={"mrp-insight" + (open ? " open" : "")}>
      <button className="mrp-insight-hit" onClick={onToggle} aria-expanded={open}>
        <span className="mrp-insight-b">
          <span className="mrp-insight-t">{tx(ins.titleKey, ins.vars)}</span>
          <span className="mrp-insight-p">{tx(ins.bodyKey, ins.vars)}</span>
        </span>
        {photo && <span className="mrp-insight-ph" style={{ backgroundImage: bg(photo, 260) }} />}
      </button>

      {open && (
        <div className="mrp-insight-open">
          <div className="mrp-detail-k">{t("pt.ins.detailK")}</div>
          <p className="mrp-detail-t">{tx(ins.titleKey.replace(/\.t$/, ".d"), ins.vars)}</p>

          <div className="mrp-detail-k sub">{t("pt.ins.why")}</div>
          <p className="mrp-detail-e">{tx(ins.why.key, ins.why.vars)}</p>

          {ins.challengeKey && onUse && (
            <button className="mrp-btn acc sm" onClick={onUse}>
              {t("pt.ins.useK")} <ArrowRight size={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
