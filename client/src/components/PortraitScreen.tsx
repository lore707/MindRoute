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
import { deriveTravelRules } from "@shared/travel-rules";
import "@/styles/portrait.css";

const bg = (url: string | undefined, w: number, q = 68) => (url ? `url(${unsplashSized(url, w, q)})` : "none");
const SHOW_LEGACY_PORTRAIT: boolean = false;

const insightEffect = (id: string, lang: "en" | "it") => {
  const copy: Record<string, { it: string; en: string }> = {
    "continent-loyal": { it: "Partiremo da territori familiari, ma con un angolo meno prevedibile.", en: "We will start from familiar regions, but find a less predictable angle." },
    "continent-gap": { it: "Una delle proposte potra aprire un continente ancora inesplorato.", en: "One proposal may open a continent you have not explored yet." },
    "season-gap": { it: "Valuteremo anche periodi dell'anno che finora non hai scelto.", en: "We will also consider times of year you have not chosen before." },
    "duration-long": { it: "Proteggeremo soggiorni piu lunghi, con meno cambi di base.", en: "We will protect longer stays with fewer base changes." },
    "duration-short": { it: "Concentreremo il valore in pochi giorni, senza riempitivi.", en: "We will concentrate the value into a few days without filler." },
    dreamer: { it: "Daremo priorita a piani piu semplici da trasformare in partenze reali.", en: "We will prioritize plans that are easier to turn into real departures." },
    nature: { it: "La natura avra almeno un momento centrale, non una semplice tappa fotografica.", en: "Nature will have at least one central moment, not just a photo stop." },
    unplanned: { it: "Inseriremo meno orari rigidi e piu tempo realmente aperto.", en: "We will use fewer rigid timings and protect genuinely open time." },
    "comfort-drift": { it: "Le proposte potranno spingersi oltre l'abitudine, senza ignorare i tuoi limiti.", en: "Proposals may stretch beyond habit without ignoring your limits." },
    solo: { it: "Eviteremo esperienze che funzionano solo in gruppo.", en: "We will avoid experiences that only work in a group." },
  };
  return copy[id]?.[lang] ?? (lang === "it" ? "Questa lettura entrera nelle decisioni concrete del prossimo itinerario." : "This reading will shape concrete decisions in your next itinerary.");
};

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
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [openStep, setOpenStep] = useState<number | null>(null);
  // Il prototipo mobile aggiunge un passo che il desktop non ha: quando dici
  // che una lettura non ti rappresenta, ti chiede COSA non ti rappresenta.
  // Un motivo strutturato vale piu di un pollice verso: dice al matcher cosa
  // smettere di pesare.
  const [reasons, setReasons] = useState<string[]>([]);
  // Sezione 4 su telefono: fisarmonica, una fascia alla volta.
  const [openClarity, setOpenClarity] = useState<string | null>("clear");

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
  const insights = useMemo(() => visibleInsights(signals, confidence).filter(insight =>
    p?.insightFeedback?.[insight.id] !== "no" && !dismissed.includes(insight.id)
  ), [signals, confidence, p?.insightFeedback, dismissed]);
  const nextRules = useMemo(() => deriveTravelRules({
    vector: data.traitVector ?? null,
    seek: p?.seek ?? [],
    avoid: p?.avoid ?? [],
  }, 4), [data.traitVector, p]);
  const confirmedTrips = useMemo(() => trips.filter(trip => trip.taken).length, [trips]);
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
    setDrill(current => current?.insight.id === ins.id ? null : { insight: ins, evidence: false, feedback: false });
    setVerdict(null); setNote(""); setSent(null); setEvTab("all"); setReasons([]);
    // Su telefono il rail è un foglio: portalo in vista.
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
          reasons: reasons.length ? reasons : undefined,
          note: note.trim() || undefined,
        }),
      });
      setSent(r.ok ? "ok" : "err");
      if (r.ok && verdict === "no") {
        setDismissed(current => [...current, drill.insight.id]);
        setDrill(null);
      }
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
                {lang === "it" ? "Il tuo modo di viaggiare," : "How you travel,"} <em>{lang === "it" ? "spiegato." : "explained."}</em>
              </h1>
              {p?.narrative?.portrait && <p className="mrp2-lede">{p.narrative.portrait}</p>}

              <div className="mrp2-stats">
                <div className="mrp2-stat">
                  <span className="n">{p?.seek?.length ?? 0}</span>
                  <span className="l">{lang === "it" ? "preferenze dichiarate" : "stated preferences"}</span>
                </div>
                <div className="mrp2-stat">
                  <span className="n">{trips.length}</span>
                  <span className="l">{lang === "it" ? "piani osservati" : "plans observed"}</span>
                </div>
                <div className="mrp2-stat">
                  <span className="n">{confirmedTrips}</span>
                  <span className="l">{lang === "it" ? "viaggi confermati" : "confirmed trips"}</span>
                </div>
              </div>

              <div className="mrp2-updated">
                {lastUpdate && <span>{tx("pt2.lastUpdate", { date: lastUpdate })}</span>}
                {onGenerate && (
                  <button className="mrp2-ghost" onClick={onGenerate}>
                    <RefreshCw size={13} /> {lang === "it" ? "Crea dal ritratto" : "Create from portrait"}
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
          {SHOW_LEGACY_PORTRAIT && evolution.length > 0 && (
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

          {picks?.[0] && (
            <motion.section className="mrp2-weekly" {...rise(0)}>
              <div className="mrp2-weekly-ph" style={{ backgroundImage: bg(picks[0].imageUrl, 1200, 72) }} />
              <div className="mrp2-weekly-veil" />
              <div className="mrp2-weekly-in">
                <div className="mrp2-weekly-top">
                  <span>{lang === "it" ? "LA META DELLA SETTIMANA" : "THIS WEEK'S DESTINATION"}</span>
                  <i>{picks[0].matchPct}% {lang === "it" ? "coerenza" : "fit"}</i>
                </div>
                <div className="mrp2-weekly-copy">
                  <span className="mrp2-weekly-country">{picks[0].country}</span>
                  <h2>{picks[0].name.split(",")[0]}</h2>
                  <p>{picksWhy || (lang === "it" ? "Una proposta scelta a partire dal tuo Ritratto e da come stai viaggiando ora." : "A proposal selected from your Portrait and how you are travelling now.")}</p>
                  <div className="mrp2-weekly-tags">{picks[0].tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>
                  <button onClick={() => onPickDestination?.({ name: picks[0].name, country: picks[0].country, imageUrl: picks[0].imageUrl, matchPct: picks[0].matchPct })}>
                    {lang === "it" ? "Esplora questa meta" : "Explore this destination"} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.section>
          )}

          {(p?.seek?.length || p?.avoid?.length || p?.ownWords) && (
            <motion.section className="mrp2-sec mrp2-declared" {...rise(0)}>
              <div className="mrp2-sec-head">
                <span className="mrp2-sec-n">01</span>
                <div>
                  <div className="mrp2-sec-k">{lang === "it" ? "QUELLO CHE CI HAI DETTO" : "WHAT YOU TOLD US"}</div>
                  <p>{lang === "it" ? "Preferenze e limiti espliciti. Sono la base, non un'interpretazione." : "Explicit preferences and limits. They are the foundation, not an interpretation."}</p>
                </div>
              </div>
              <div className="mrp2-declared-grid">
                <article>
                  <span>{lang === "it" ? "CERCHI" : "YOU SEEK"}</span>
                  <div className="mrp2-declared-chips">
                    {(p?.seek ?? []).map(item => <i key={item}>{item}</i>)}
                    {(p?.seek?.length ?? 0) === 0 && <small>{lang === "it" ? "Da precisare nel prossimo viaggio" : "To refine on your next trip"}</small>}
                  </div>
                </article>
                <article>
                  <span>{lang === "it" ? "VUOI EVITARE" : "YOU AVOID"}</span>
                  <div className="mrp2-declared-chips avoid">
                    {(p?.avoid ?? []).map(item => <i key={item}>{item}</i>)}
                    {(p?.avoid?.length ?? 0) === 0 && <small>{lang === "it" ? "Nessun limite dichiarato" : "No stated limits"}</small>}
                  </div>
                </article>
                {p?.ownWords && (
                  <article className="mrp2-declared-words">
                    <span>{lang === "it" ? "CON LE TUE PAROLE" : "IN YOUR OWN WORDS"}</span>
                    <blockquote>“{p.ownWords}”</blockquote>
                  </article>
                )}
              </div>
            </motion.section>
          )}

          {(p?.axes?.length ?? 0) > 0 && (
            <motion.section className="mrp2-sec mrp2-operating" {...rise(.02)}>
              <div className="mrp2-sec-head">
                <span className="mrp2-sec-n">02</span>
                <div>
                  <div className="mrp2-sec-k">{lang === "it" ? "IL TUO ASSETTO DI VIAGGIO" : "YOUR TRAVEL SETTINGS"}</div>
                  <p>{lang === "it" ? "Cinque inclinazioni che usiamo per decidere ritmo, atmosfera e struttura." : "Five leanings we use to decide pace, atmosphere and structure."}</p>
                </div>
              </div>
              <div className="mrp2-axis-list">
                {p!.axes.map(axis => (
                  <article key={axis.axis}>
                    <div className="mrp2-axis-copy">
                      <span>{axis.poleLeft}</span>
                      <strong>{axis.pole || (lang === "it" ? "equilibrio" : "balanced")}</strong>
                      <span>{axis.poleRight}</span>
                    </div>
                    <div className="mrp2-axis-track"><i style={{ left: `${axis.value}%` }} /></div>
                  </article>
                ))}
              </div>
            </motion.section>
          )}

          {/* ── 1 · IL TUO MODO DI VIAGGIARE ── */}
          {insights.length > 0 && (
            <motion.section className="mrp2-sec" {...rise(0)}>
              <div className="mrp2-sec-head">
                <span className="mrp2-sec-n">03</span>
                <div>
                  <div className="mrp2-sec-k">{lang === "it" ? "QUELLO CHE ABBIAMO IMPARATO" : "WHAT WE HAVE LEARNED"}</div>
                  <p>{lang === "it" ? "Letture ricavate dalle tue scelte. Puoi aprire le prove e correggerle." : "Readings inferred from your choices. You can inspect the evidence and correct them."}</p>
                </div>
              </div>
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
                          {on ? (lang === "it" ? "Chiudi" : "Close") : (lang === "it" ? "Mostrami il perche" : "Show me why")} <ArrowRight size={13} />
                        </button>
                      </div>
                      {on && (
                        <div className="mrp2-inline-why">
                          <div className="mrp2-inline-step">
                            <span>01</span>
                            <div><strong>{lang === "it" ? "Abbiamo osservato" : "We observed"}</strong><p>{tx(ins.why.key, ins.why.vars)}</p></div>
                          </div>
                          <div className="mrp2-inline-step">
                            <span>02</span>
                            <div><strong>{lang === "it" ? "La nostra lettura" : "Our reading"}</strong><p>{tx(ins.bodyKey, ins.vars)}</p></div>
                          </div>
                          <div className="mrp2-inline-step effect">
                            <span>03</span>
                            <div><strong>{lang === "it" ? "Nel prossimo viaggio" : "In your next trip"}</strong><p>{insightEffect(ins.id, lang)}</p></div>
                          </div>
                          {evidence.length > 0 && (
                            <div className="mrp2-inline-evidence">
                              <span>{lang === "it" ? "EVIDENZE" : "EVIDENCE"}</span>
                              {evidence.slice(0, 3).map((item, index) => <i key={index}>{item.trip.dest}</i>)}
                            </div>
                          )}
                          <div className="mrp2-inline-feedback">
                            <strong>{lang === "it" ? "Ti riconosci in questa lettura?" : "Does this reading feel accurate?"}</strong>
                            <div className="mrp2-inline-verdicts">
                              {(["yes", "partly", "no"] as const).map(value => (
                                <button key={value} className={verdict === value ? "on" : ""} onClick={() => setVerdict(value)}>
                                  {value === "yes" ? (lang === "it" ? "Si" : "Yes") : value === "partly" ? (lang === "it" ? "In parte" : "Partly") : "No"}
                                </button>
                              ))}
                            </div>
                            {verdict && verdict !== "yes" && (
                              <textarea value={note} onChange={event => setNote(event.target.value)} maxLength={250} placeholder={lang === "it" ? "Cosa dovremmo correggere?" : "What should we correct?"} />
                            )}
                            {verdict && sent !== "ok" && <button className="mrp2-inline-save" onClick={sendFeedback} disabled={sent === "sending"}>{sent === "sending" ? "..." : (lang === "it" ? "Salva la mia risposta" : "Save my answer")}</button>}
                            {sent === "ok" && <p className="mrp2-inline-ok">{lang === "it" ? "Ricevuto. Questa correzione influenzera il prossimo viaggio." : "Saved. This correction will influence your next trip."}</p>}
                            {sent === "err" && <p className="mrp2-inline-err">{lang === "it" ? "Non siamo riusciti a salvarlo. Riprova." : "We could not save it. Try again."}</p>}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </motion.section>
          )}

          {nextRules.length > 0 && (
            <motion.section className="mrp2-sec mrp2-next" {...rise(.04)}>
              <div className="mrp2-sec-head">
                <span className="mrp2-sec-n">04</span>
                <div>
                  <div className="mrp2-sec-k">{lang === "it" ? "COSA CAMBIERA NEL PROSSIMO VIAGGIO" : "WHAT WILL CHANGE NEXT TIME"}</div>
                  <p>{lang === "it" ? "Non etichette astratte: regole concrete gia applicate alla prossima generazione." : "Not abstract labels: concrete rules already applied to the next generation."}</p>
                </div>
              </div>
              <div className="mrp2-next-grid">
                {nextRules.map((rule, index) => (
                  <article key={rule.id}>
                    <span className="mrp2-next-index">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{lang === "it" ? rule.title.it : rule.title.en}</h3>
                      <p>{lang === "it" ? rule.body.it : rule.body.en}</p>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mrp2-next-cta">
                <p>{lang === "it" ? "Il nuovo viaggio usera queste regole insieme a budget, date e vincoli che inserirai." : "Your new trip will combine these rules with the budget, dates and constraints you provide."}</p>
                {onGenerate && <button className="mrp2-cta" onClick={onGenerate}>{lang === "it" ? "Genera un viaggio da questi insight" : "Generate a trip from these insights"} <ArrowRight size={14} /></button>}
              </div>
            </motion.section>
          )}

          {/* ── 2 · LE TENSIONI CHE TI MUOVONO ── */}
          {SHOW_LEGACY_PORTRAIT && tensions.length > 0 && (
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
          {SHOW_LEGACY_PORTRAIT && evolution.filter(e => e.kind === "change").length > 0 && (
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
          {SHOW_LEGACY_PORTRAIT && (p?.axes?.length ?? 0) > 0 && (
            <motion.section className="mrp2-sec" {...rise(.05)}>
              <SecHead n="4" k="pt2.s4.k" sub={t("pt2.s4.sub")} />
              <div className="mrp2-clar">
                <div className={"mrp2-cl" + (openClarity === "clear" ? " open" : "")}>
                  <button className="mrp2-cl-h" onClick={() => setOpenClarity(v => (v === "clear" ? null : "clear"))} aria-expanded={openClarity === "clear"}>
                    {t("pt2.clear")}
                    <span className="mrp2-cl-sum">{clarity.clear.map(a => a.pole || a.axis).join(" · ")}</span>
                    <span className="mrp2-cl-chev">˅</span>
                  </button>
                  {clarity.clear.length === 0 && <div className="mrp2-cl-none">{t("pt2.none")}</div>}
                  {clarity.clear.map(a => (
                    <div key={a.axis} className="mrp2-cl-i ok"><Check size={13} /> {a.pole || a.axis}</div>
                  ))}
                </div>
                <div className={"mrp2-cl" + (openClarity === "fair" ? " open" : "")}>
                  <button className="mrp2-cl-h" onClick={() => setOpenClarity(v => (v === "fair" ? null : "fair"))} aria-expanded={openClarity === "fair"}>
                    {t("pt2.fair")}
                    <span className="mrp2-cl-sum">{clarity.fair.map(a => a.pole || a.axis).join(" · ")}</span>
                    <span className="mrp2-cl-chev">˅</span>
                  </button>
                  {clarity.fair.length === 0 && <div className="mrp2-cl-none">{t("pt2.none")}</div>}
                  {clarity.fair.map(a => (
                    <div key={a.axis} className="mrp2-cl-i mid"><Circle size={13} /> {a.pole || a.axis}</div>
                  ))}
                </div>
                <div className={"mrp2-cl mrp2-cl-ask" + (openClarity === "ask" ? " open" : "")}>
                  <button className="mrp2-cl-h" onClick={() => setOpenClarity(v => (v === "ask" ? null : "ask"))} aria-expanded={openClarity === "ask"}>
                    {t("pt2.helpH")}
                    <span className="mrp2-cl-sum">{clarity.unknown.map(a => `${a.poleLeft} ↔ ${a.poleRight}`).join(" · ")}</span>
                    <span className="mrp2-cl-chev">˅</span>
                  </button>
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
          {SHOW_LEGACY_PORTRAIT && picks && picks.length > 0 && (
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

          <button className="mrp2-help" onClick={() => (onCompanion ? onCompanion() : window.dispatchEvent(new Event("mindroute:open-companion")))}>
            <MessageCircle size={16} /> {t("pt2.helpMe")}
          </button>

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

                  {verdict && verdict !== "yes" && (
                    <>
                      <div className="mrp2-obs-k">{t("pt2.whatNot")}</div>
                      <p className="mrp2-fineL">{t("pt2.whatNotP")}</p>
                      <div className="mrp2-chips">
                        {(["pace", "changed", "different", "other"] as const).map(r => (
                          <button key={r}
                                  className={"mrp2-chip" + (reasons.includes(r) ? " on" : "")}
                                  aria-pressed={reasons.includes(r)}
                                  onClick={() => setReasons(v => v.includes(r) ? v.filter(x => x !== r) : [...v, r])}>
                            {t(`pt2.r.${r}`)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

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
