/**
 * PortraitScreen.tsx — "Il tuo Ritratto", tradotto dal prototipo 2026-08-20.
 * ───────────────────────────────────────────────────────────────
 * Tradotto, non ricopiato (docs/operating-system/16-mockup-translation-protocol).
 *
 *   EMOZIONE   riconoscersi. Non "ecco i tuoi dati": "ecco chi sei, e come
 *              faccio a dirlo".
 *
 *   NARRAZIONE 1 chi sei ora → 2 i principi che restano → 3 le tensioni che
 *              ti muovono → 4 come ci sei arrivato → 5 cosa non sappiamo
 *              ancora. Il discorso finisce ammettendo i propri limiti: è
 *              quello che lo rende credibile.
 *
 *   EROE       la tipografia. Le fotografie qui sono memoria, non desiderio.
 *
 * LA REGOLA CHE GOVERNA TUTTO IL FILE: ogni lettura deve poter mostrare le
 * proprie EVIDENZE — i viaggi veri su cui si regge, con nome e data. Non un
 * numero da accettare per fiducia. Se una lettura non sa indicare su cosa si
 * regge, non si mostra.
 *
 * L'approfondimento è a cascata, come nel prototipo: "Perché?" apre il
 * ragionamento, il ragionamento apre le evidenze, le evidenze aprono la
 * correzione. Ogni passo resta aperto sotto il precedente — il contesto si
 * accumula invece di sostituirsi.
 * ─────────────────────────────────────────────────────────────── */

import { useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Circle, HelpCircle, MessageCircle, RefreshCw, Share2, X } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { EASE } from "@/lib/motion";
import { useI18n } from "@/lib/i18n";
import type { AccountData } from "@/components/AccountCinematic";
import {
  computeConfidence, buildEvolution, visibleInsights, insightEvidence,
  AXIS_POLE_LABELS, type Insight, type PortraitSignals, type EvolutionStep,
} from "@shared/portrait-insights";
import "@/styles/portrait.css";

const bg = (url: string | undefined, w: number, q = 68) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

type Props = {
  data: AccountData;
  onGenerate?: () => void;
  onChallenge?: (challenge: string) => void;
  onShare?: () => void;
  sharing?: boolean;
  picks?: Array<{ name: string; country: string; imageUrl: string; matchPct: number; tags: string[] }> | null;
  picksWhy?: string | null;
  onPickDestination?: (d: { name: string; country?: string; imageUrl?: string; matchPct?: number | null }) => void;
  /** Apre il compagno di viaggio (la correzione conversazionale). */
  onCompanion?: () => void;
};

/** Quale pannello del rail è aperto. Si accumulano: 1 → 1+2 → 1+2+3. */
type Drill = { insight: Insight; evidence: boolean; feedback: boolean } | null;

export function PortraitScreen({
  data, onGenerate, onChallenge, onShare, sharing, picks, picksWhy, onPickDestination, onCompanion,
}: Props) {
  const { t, lang } = useI18n();
  const reduce = useReducedMotion();

  const [drill, setDrill] = useState<Drill>(null);
  const [evTab, setEvTab] = useState<"all" | "trips" | "chat">("all");
  const [verdict, setVerdict] = useState<"yes" | "partly" | "no" | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<"ok" | "err" | "sending" | null>(null);
  const [openStep, setOpenStep] = useState<number | null>(null);

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
    () => buildEvolution(
      data.traitSnapshots ?? [],
      trips.map(x => ({ dest: x.dest, img: x.img, href: x.href, rawDate: x.rawDate })),
      lang,
    ),
    [data.traitSnapshots, trips, lang],
  );

  const photos = useMemo(() => trips.map(x => x.img).filter(Boolean), [trips]);
  const photoAt = (i: number) => (photos.length ? photos[i % photos.length] : "");

  /* ── 2 · le tensioni ─────────────────────────────────────────────────────
     Una tensione è una contraddizione REALE, non una figura retorica. Ne
     abbiamo due fonti, entrambe misurate:
       · lo scarto fra quello che DICI di cercare e quello che SCEGLI
         (`portrait.revealed`, già calcolato dal server);
       · un asse che resta al centro pur avendo molte osservazioni: non è
         mancanza di dati, è oscillazione vera.
     Se non ce ne sono, la sezione non compare. Inventarne una sarebbe la
     bugia più facile e più difficile da smascherare. */
  const tensions = useMemo(() => {
    const out: Array<{ id: string; left: string; right: string; body: string }> = [];
    if (p?.revealed?.saidPole && p.revealed.chosePole) {
      out.push({
        id: "revealed",
        left: tx("pt2.ten.said", { pole: p.revealed.saidPole }),
        right: tx("pt2.ten.chose", { pole: p.revealed.chosePole }),
        body: tx("pt2.ten.revealedBody", { theme: p.revealed.theme ?? "" }),
      });
    }
    const v = data.traitVector;
    if (v && (p?.snapshotCount ?? 0) >= 4) {
      for (const ax of Object.keys(v)) {
        const val = v[ax];
        if (val > 0.44 && val < 0.56) {
          const poles = (AXIS_POLE_LABELS[lang] as Record<string, { hi: string; lo: string }>)[ax];
          if (!poles) continue;
          out.push({
            id: `axis-${ax}`,
            left: tx("pt2.ten.want", { pole: poles.lo }),
            right: tx("pt2.ten.andAlso", { pole: poles.hi }),
            body: tx("pt2.ten.axisBody", { n: p?.snapshotCount ?? 0 }),
          });
          if (out.length >= 2) break;
        }
      }
    }
    return out.slice(0, 2);
  }, [p, data.traitVector, lang]);

  /* ── 4 · quello che non sappiamo ancora ──────────────────────────────────
     Il prototipo la mette in fondo, ed è la sezione più onesta della pagina:
     dichiara i limiti della lettura. La magnitudine di ogni asse arriva già
     calcolata dal server (`portrait.axes[].magnitude`). */
  const clarity = useMemo(() => {
    const axes = p?.axes ?? [];
    return {
      clear: axes.filter(a => a.magnitude === "forte"),
      fair: axes.filter(a => a.magnitude === "chiaro" || a.magnitude === "lieve"),
      unknown: axes.filter(a => a.magnitude === "neutro"),
    };
  }, [p]);

  const lastUpdate = useMemo(() => {
    const snaps = data.traitSnapshots ?? [];
    if (snaps.length === 0) return null;
    const last = snaps[snaps.length - 1]?.createdAt;
    const d = last ? new Date(last) : null;
    if (!d || isNaN(d.getTime())) return null;
    const M = lang === "it"
      ? ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"]
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${d.getDate()} ${M[d.getMonth()]} ${d.getFullYear()}`;
  }, [data.traitSnapshots, lang]);

  /* ── il rail: apri il ragionamento di una lettura ── */
  const openWhy = useCallback((ins: Insight) => {
    setDrill({ insight: ins, evidence: false, feedback: false });
    setVerdict(null); setNote(""); setSent(null); setEvTab("all");
    // Su telefono il rail è un foglio: portalo in vista.
    if (typeof window !== "undefined" && window.innerWidth < 1100) {
      window.setTimeout(() => document.getElementById("mrp2-rail")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
    }
  }, []);

  const evidence = useMemo(
    () => (drill ? insightEvidence(drill.insight.id, signals) : []),
    [drill, signals],
  );

  const sendFeedback = async () => {
    if (!drill || !verdict) return;
    setSent("sending");
    try {
      const r = await fetch("/api/me/portrait/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          insightId: drill.insight.id,
          reading: tx(drill.insight.titleKey, drill.insight.vars),
          verdict,
          note: note.trim() || undefined,
        }),
      });
      setSent(r.ok ? "ok" : "err");
    } catch {
      setSent("err");
    }
  };

  const rise = (delay: number) => (reduce
    ? {}
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-60px" }, transition: { duration: .5, ease: EASE, delay } });

  /* ── nessun dato: non si finge un ritratto ── */
  if (!p?.available && trips.length === 0) {
    return (
      <div className="mrp mrp2">
        <div className="mrp2-empty">
          <h2>{t("pt.empty.t")}</h2>
          <p>{t("pt.empty.s")}</p>
          {onGenerate && <button className="mrp2-cta" onClick={onGenerate}>{t("acd.empty.cta")}</button>}
        </div>
      </div>
    );
  }

  const heroPhoto = photoAt(0) || data.heroImg;

  return (
    <div className="mrp mrp2">
      <div className="mrp2-grid">

        {/* ════════ COLONNA PRINCIPALE ════════ */}
        <div className="mrp2-main">

          {/* ── HERO ── */}
          <section className="mrp2-hero">
            <div className="mrp2-hero-ph" style={{ backgroundImage: bg(heroPhoto, 1400, 66) }} />
            <div className="mrp2-hero-veil" />
            <div className="mrp2-hero-in">
              <div className="mrp2-kick">{t("pt2.kick")}</div>
              <h1 className="mrp2-title">
                {t("pt2.title")} <em>{t("pt2.titleEm")}</em>
              </h1>
              {p?.narrative?.portrait && <p className="mrp2-lede">{p.narrative.portrait}</p>}

              <div className="mrp2-stats">
                <div className="mrp2-stat">
                  <span className="n">{confidence}%</span>
                  <span className="l">{t("pt2.confidence")}</span>
                </div>
                <div className="mrp2-stat">
                  <span className="n">{trips.length}</span>
                  <span className="l">{t("pt2.tripsSeen")}</span>
                </div>
                <div className="mrp2-stat">
                  <span className="n">{p?.counts?.continents ?? 0}</span>
                  <span className="l">{t("pt2.continents")}</span>
                </div>
              </div>

              <div className="mrp2-updated">
                {lastUpdate && <span>{tx("pt2.lastUpdate", { date: lastUpdate })}</span>}
                {onGenerate && (
                  <button className="mrp2-ghost" onClick={onGenerate}>
                    <RefreshCw size={13} /> {t("pt2.refresh")}
                  </button>
                )}
                {onShare && (
                  <button className="mrp2-ghost" onClick={onShare} disabled={sharing}>
                    <Share2 size={13} /> {t("pt2.share")}
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* ── la traiettoria: ieri · oggi · verso dove ── */}
          {evolution.length > 0 && (
            <section className="mrp2-arc">
              {(() => {
                const changes = evolution.filter(e => e.kind === "change");
                const now = evolution.find(e => e.kind === "now");
                const poleOf = (e: EvolutionStep, from = false) => {
                  const poles = AXIS_POLE_LABELS[lang]?.[e.axis];
                  if (!poles) return "";
                  return (from ? e.fromHi : e.hi) ? poles.hi : poles.lo;
                };
                const first = changes[0];
                const last = changes[changes.length - 1];
                return (
                  <>
                    <div className="mrp2-arc-c">
                      <div className="mrp2-arc-k">{t("pt2.arc.yesterday")}</div>
                      <div className="mrp2-arc-v">{first ? tx("pt2.arc.was", { pole: poleOf(first, true) }) : "—"}</div>
                    </div>
                    <div className="mrp2-arc-c on">
                      <div className="mrp2-arc-k">{t("pt2.arc.today")}</div>
                      <div className="mrp2-arc-v">{last ? tx("pt2.arc.now", { pole: poleOf(last) }) : "—"}</div>
                    </div>
                    <div className="mrp2-arc-c">
                      <div className="mrp2-arc-k">{t("pt2.arc.toward")}</div>
                      <div className="mrp2-arc-v">{now ? tx("pt2.arc.going", { pole: poleOf(now) }) : "—"}</div>
                    </div>
                    <div className="mrp2-arc-line"><i /><i /><i /></div>
                  </>
                );
              })()}
            </section>
          )}

          {/* ── 1 · IL TUO MODO DI VIAGGIARE ── */}
          {insights.length > 0 && (
            <motion.section className="mrp2-sec" {...rise(0)}>
              <SecHead n="1" k="pt2.s1.k" sub={t("pt2.s1.sub")} />
              <div className="mrp2-princ">
                {insights.map((ins) => {
                  const on = drill?.insight.id === ins.id;
                  const conf = Math.round(ins.strength * 100);
                  return (
                    <article key={ins.id} className={"mrp2-p" + (on ? " on" : "")}>
                      <h3 className="mrp2-p-t">{tx(ins.titleKey, ins.vars)}</h3>
                      <p className="mrp2-p-b">{tx(ins.bodyKey, ins.vars)}</p>
                      <div className="mrp2-p-f">
                        <span className={"mrp2-conf " + confClass(conf)}>{t(confKey(conf))}</span>
                        <span className="dot">·</span>
                        <button className="mrp2-why" onClick={() => openWhy(ins)}>
                          {t("pt2.why")} <ArrowRight size={13} />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ── 2 · LE TENSIONI CHE TI MUOVONO ── */}
          {tensions.length > 0 && (
            <motion.section className="mrp2-sec" {...rise(.05)}>
              <SecHead n="2" k="pt2.s2.k" sub={t("pt2.s2.sub")} />
              <div className="mrp2-tens">
                {tensions.map(tn => (
                  <article key={tn.id} className="mrp2-t">
                    <div className="mrp2-t-top">
                      <span className="a">{tn.left}</span>
                      <span className="ma">{t("pt2.but")}</span>
                      <span className="b">{tn.right}</span>
                    </div>
                    <div className="mrp2-t-wave" aria-hidden="true" />
                    <p className="mrp2-t-b">{tn.body}</p>
                  </article>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── 3 · COME CI SEI ARRIVATO ── */}
          {evolution.filter(e => e.kind === "change").length > 0 && (
            <motion.section className="mrp2-sec" {...rise(.05)}>
              <SecHead n="3" k="pt2.s3.k" sub={t("pt2.s3.sub")} />
              <div className="mrp2-time">
                {evolution.filter(e => e.kind === "change").map((e, i) => {
                  const poles = AXIS_POLE_LABELS[lang]?.[e.axis];
                  const to = poles ? (e.hi ? poles.hi : poles.lo) : "";
                  const from = poles ? (e.fromHi ? poles.hi : poles.lo) : "";
                  const open = openStep === i;
                  return (
                    <article key={i} className={"mrp2-tp" + (open ? " on" : "")}>
                      <div className="mrp2-tp-when">{e.trip?.when ?? tx("pt2.step", { n: e.ordinal })}</div>
                      <h3 className="mrp2-tp-t">{tx("pt2.became", { pole: to })}</h3>
                      {e.trip?.img && <div className="mrp2-tp-ph" style={{ backgroundImage: bg(e.trip.img, 420) }} />}
                      <p className="mrp2-tp-b">
                        {e.fromHi === e.hi
                          ? tx("pt2.deeper", { pole: to })
                          : tx("pt2.fromTo", { from, to })}
                      </p>
                      <button className="mrp2-tp-f" onClick={() => setOpenStep(open ? null : i)} aria-expanded={open}>
                        {e.trip ? tx("pt2.afterTrip", { dest: e.trip.dest }) : tx("pt2.step", { n: e.ordinal })}
                        <ArrowRight size={13} />
                      </button>
                      {open && e.trip && (
                        <div className="mrp2-tp-open">
                          <p>{tx("pt2.stepDetail", { dest: e.trip.dest, when: e.trip.when ?? "" })}</p>
                          {e.trip.href && (
                            <a className="mrp2-why" href={e.trip.href}>{t("acd.open")}</a>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ── 4 · QUELLO CHE NON SAPPIAMO ANCORA ── */}
          {(p?.axes?.length ?? 0) > 0 && (
            <motion.section className="mrp2-sec" {...rise(.05)}>
              <SecHead n="4" k="pt2.s4.k" sub={t("pt2.s4.sub")} />
              <div className="mrp2-clar">
                <div className="mrp2-cl">
                  <div className="mrp2-cl-h">{t("pt2.clear")}</div>
                  {clarity.clear.length === 0 && <div className="mrp2-cl-none">{t("pt2.none")}</div>}
                  {clarity.clear.map(a => (
                    <div key={a.axis} className="mrp2-cl-i ok"><Check size={13} /> {a.pole || a.axis}</div>
                  ))}
                </div>
                <div className="mrp2-cl">
                  <div className="mrp2-cl-h">{t("pt2.fair")}</div>
                  {clarity.fair.length === 0 && <div className="mrp2-cl-none">{t("pt2.none")}</div>}
                  {clarity.fair.map(a => (
                    <div key={a.axis} className="mrp2-cl-i mid"><Circle size={13} /> {a.pole || a.axis}</div>
                  ))}
                </div>
                <div className="mrp2-cl mrp2-cl-ask">
                  <div className="mrp2-cl-h">{t("pt2.helpH")}</div>
                  {clarity.unknown.map(a => (
                    <div key={a.axis} className="mrp2-cl-i q"><HelpCircle size={13} /> {a.poleLeft} ↔ {a.poleRight}</div>
                  ))}
                  <p className="mrp2-cl-p">{t("pt2.helpP")}</p>
                  <button className="mrp2-cta" onClick={() => (onCompanion ? onCompanion() : window.dispatchEvent(new Event("mindroute:open-companion")))}>
                    <MessageCircle size={15} /> {t("pt2.helpCta")}
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {/* ── le tre proposte: la conclusione, invariata ── */}
          {picks && picks.length > 0 && (
            <motion.section className="mrp2-sec" {...rise(.05)}>
              <div className="mrp-kick">{t("pt.picks.k")}</div>
              <h2 className="mrp-picks-t">{t("pt.picks.t")}</h2>
              {picksWhy && <p className="mrp-picks-why">{picksWhy}</p>}
              <div className="mrp-picks">
                {picks.map((x, i) => (
                  <button key={x.name + i} className="mrp-pick"
                          onClick={() => onPickDestination?.({ name: x.name, country: x.country, imageUrl: x.imageUrl, matchPct: x.matchPct })}
                          disabled={!onPickDestination}>
                    <span className="mrp-pick-ph" style={{ backgroundImage: bg(x.imageUrl, 520) }}>
                      <span className="mrp-pick-m">{x.matchPct}%</span>
                    </span>
                    <span className="mrp-pick-b">
                      <span className="mrp-pick-n">{x.name.split(",")[0]}</span>
                      <span className="mrp-pick-c">{x.country}</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mrp-picks-note">{t("pt.picks.week")}</p>
            </motion.section>
          )}

          <div className="mrp2-alive">{t("pt2.alive")}</div>
        </div>

        {/* ════════ RAIL — interazioni e approfondimenti ════════ */}
        <aside className="mrp2-rail" id="mrp2-rail">
          <div className="mrp2-rail-h">{t("pt2.rail.k")}</div>
          <p className="mrp2-rail-p">{t("pt2.rail.p")}</p>

          {!drill && <div className="mrp2-rail-idle">{t("pt2.rail.idle")}</div>}

          {/* ① il ragionamento */}
          {drill && (
            <section className="mrp2-panel">
              <header>
                <span className="mrp2-num">1</span>
                <span className="mrp2-panel-k">{t("pt2.panel.principle")}</span>
                <button className="mrp2-x" onClick={() => setDrill(null)} aria-label={t("gs.close")}><X size={15} /></button>
              </header>
              <h3 className="mrp2-panel-t">{tx(drill.insight.titleKey, drill.insight.vars)}</h3>
              <p className="mrp2-panel-b">{tx(drill.insight.titleKey.replace(/\.t$/, ".d"), drill.insight.vars)}</p>

              <div className="mrp2-obs-k">{t("pt2.observed")}</div>
              <ul className="mrp2-obs">
                <li>{tx(drill.insight.why.key, drill.insight.why.vars)}</li>
                {evidence.length > 0 && <li>{tx("pt2.obsTrips", { n: evidence.length })}</li>}
                <li>{tx("pt2.obsSnaps", { n: signals.snapshotCount })}</li>
              </ul>

              <div className="mrp2-obs-k">{t("pt2.confidence")}</div>
              <div className="mrp2-bar">
                <span className="lab">{t(confKey(Math.round(drill.insight.strength * 100)))}</span>
                <span className="track"><i style={{ width: `${Math.round(drill.insight.strength * 100)}%` }} /></span>
                <span className="pct">{Math.round(drill.insight.strength * 100)}%</span>
              </div>

              <button className="mrp2-step" onClick={() => setDrill(d => d && { ...d, evidence: !d.evidence })} aria-expanded={drill.evidence}>
                {t("pt2.seeEvidence")} <span className="mrp2-badge">{evidence.length}</span>
              </button>
              <button className="mrp2-step" onClick={() => setDrill(d => d && { ...d, feedback: !d.feedback })} aria-expanded={drill.feedback}>
                {t("pt2.recognise")} <MessageCircle size={14} />
              </button>
            </section>
          )}

          {/* ② le evidenze */}
          {drill?.evidence && (
            <section className="mrp2-panel">
              <header>
                <span className="mrp2-num">2</span>
                <span className="mrp2-panel-k">{tx("pt2.evidenceN", { n: evidence.length })}</span>
                <button className="mrp2-x" onClick={() => setDrill(d => d && { ...d, evidence: false })} aria-label={t("gs.close")}><X size={15} /></button>
              </header>

              {evidence.length === 0 ? (
                <p className="mrp2-panel-b">{t("pt2.noEvidence")}</p>
              ) : (
                <div className="mrp2-ev">
                  {evidence.map((e, i) => (
                    <article key={i} className="mrp2-ev-i">
                      <span className="ph" style={{ backgroundImage: bg(photoAt(i), 160) }} />
                      <span className="b">
                        <span className="n">{e.trip.dest}</span>
                        <span className="m">
                          {e.trip.rawDate ? shortWhen(e.trip.rawDate, lang) : ""}
                          <em>{t("pt2.tagTrip")}</em>
                        </span>
                        <span className="d">{tx(e.note.key, e.note.vars)}</span>
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* ③ ti riconosci? */}
          {drill?.feedback && (
            <section className="mrp2-panel">
              <header>
                <span className="mrp2-num">3</span>
                <span className="mrp2-panel-k">{t("pt2.recogniseK")}</span>
                <button className="mrp2-x" onClick={() => setDrill(d => d && { ...d, feedback: false })} aria-label={t("gs.close")}><X size={15} /></button>
              </header>

              {sent === "ok" ? (
                <p className="mrp2-ok">{t("pt2.thanks")}</p>
              ) : (
                <>
                  <p className="mrp2-panel-b">{t("pt2.recogniseQ")}</p>
                  {(["yes", "partly", "no"] as const).map(v => (
                    <button key={v} className={"mrp2-opt" + (verdict === v ? " on" : "")} onClick={() => setVerdict(v)}>
                      <span className={"mrp2-opt-i " + v}>{v === "yes" ? <Check size={13} /> : v === "partly" ? <Circle size={13} /> : <HelpCircle size={13} />}</span>
                      {t(`pt2.v.${v}`)}
                    </button>
                  ))}

                  <div className="mrp2-obs-k">{t("pt2.moreQ")}</div>
                  <textarea className="mrp2-note" rows={3} value={note} maxLength={250}
                            onChange={e => setNote(e.target.value)} placeholder={t("pt2.notePh")} />
                  <div className="mrp2-count">{note.length}/250</div>

                  {sent === "err" && <p className="mrp2-err">{t("pt2.sendErr")}</p>}
                  <button className="mrp2-cta wide" onClick={sendFeedback} disabled={!verdict || sent === "sending"}>
                    {sent === "sending" ? t("gs.working") : t("pt2.send")}
                  </button>
                  <p className="mrp2-fine">{t("pt2.sendFine")}</p>
                </>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );

  function SecHead({ n, k, sub }: { n: string; k: string; sub?: string }) {
    return (
      <div className="mrp2-sh">
        <div className="mrp2-sh-t"><span className="mrp2-num">{n}</span>{t(k)}</div>
        {sub && <p className="mrp2-sh-s">{sub}</p>}
      </div>
    );
  }
}

/* ── piccole funzioni pure ─────────────────────────────────────────────── */

const confKey = (pct: number) => (pct >= 65 ? "pt2.conf.high" : pct >= 40 ? "pt2.conf.mid" : "pt2.conf.low");
const confClass = (pct: number) => (pct >= 65 ? "hi" : pct >= 40 ? "mid" : "lo");

function shortWhen(iso: string, lang: "it" | "en"): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const M = lang === "it"
    ? ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${M[d.getMonth()]} ${d.getFullYear()}`;
}
