/**
 * GenerationSheet.tsx — il pannello dei vincoli.
 * ───────────────────────────────────────────────────────────────
 * Una schermata sola fra "ho scelto" e "generami il viaggio". Serve a due
 * cose, e a nient'altro:
 *
 *   1. RACCOGLIERE quello che il sistema non può dedurre — le date. Tutto il
 *      resto arriva già compilato dai pattern reali (`/api/profiling/defaults`).
 *   2. MOSTRARE cosa del Ritratto sta per entrare nella generazione, e
 *      lasciarlo spegnere. I chip non sono una copia decorativa del prompt:
 *      il loro id è quello che il server usa per filtrare il blocco
 *      (vedi lib/portrait-chips.ts e shared/portrait-insights.ts). Spegnerne
 *      uno lo toglie davvero.
 *
 * Due modi, stessa schermata:
 *   · destinazione BLOCCATA (l'utente ha toccato una proposta) → il matcher
 *     non cerca: declina quel posto in 3 personalità di viaggio;
 *   · nessuna destinazione → "genera dal profilo", il matcher cerca.
 *
 * Sostituisce il vecchio modal Genera-dal-profilo, che chiedeva le stesse cose
 * senza mai dire cosa stava usando dell'utente.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
import { setFlow } from "@/lib/flow-storage";
import type { PortraitChip } from "@/lib/portrait-chips";
import "@/styles/generation-sheet.css";

export type PinnedDestination = {
  name: string;
  country?: string;
  imageUrl?: string;
  matchPct?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Destinazione già scelta. Assente = il matcher cerca. */
  destination?: PinnedDestination | null;
  /** I chip del Ritratto di questo utente (lib/portrait-chips). */
  chips: PortraitChip[];
  /** Nota pre-compilata (es. la sfida accettata dalla bussola). */
  initialNote?: string;
};

const COMPANIONS = [
  { v: "solo", k: "fpm.comp.solo" },
  { v: "couple", k: "fpm.comp.couple" },
  { v: "friends", k: "fpm.comp.friends" },
  { v: "family", k: "fpm.comp.family" },
];
const BUDGETS = [
  { v: "basso", k: "fpm.bud.low" },
  { v: "medio", k: "fpm.bud.mid" },
  { v: "alto", k: "fpm.bud.high" },
  { v: "unlimited", k: "fpm.bud.unlimited" },
];

export function GenerationSheet({ open, onClose, destination, chips, initialNote }: Props) {
  const { t, lang } = useI18n();
  const [, setLocation] = useLocation();
  const reduce = useReducedMotion();

  const [days, setDays] = useState(7);
  const [leaveDate, setLeaveDate] = useState("");
  const [departure, setDeparture] = useState("");
  const [budget, setBudget] = useState("medio");
  const [companions, setCompanions] = useState("couple");
  const [note, setNote] = useState(initialNote ?? "");
  const [off, setOff] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadedDefaults, setLoadedDefaults] = useState(false);

  const pinned = destination?.name?.trim() || "";
  const shortName = pinned.split(",")[0].trim();

  useEffect(() => { if (open && initialNote) setNote(initialNote); }, [open, initialNote]);

  // I default veri: mediana della durata, città di partenza, compagnia
  // tipica. Non sono invenzioni — vengono dai viaggi che ha già fatto.
  useEffect(() => {
    if (!open || loadedDefaults) return;
    let cancelled = false;
    fetch("/api/profiling/defaults")
      .then(r => (r.ok ? r.json() : null))
      .then((d: any) => {
        if (cancelled || !d) return;
        if (typeof d.days === "number") setDays(d.days);
        if (typeof d.companions === "string") setCompanions(d.companions);
        if (typeof d.departure === "string") setDeparture(d.departure);
        if (typeof d.budget === "string") setBudget(d.budget);
        // La data NON si precompila: è l'unica cosa che non possiamo sapere,
        // e una data inventata diventa un volo sbagliato.
      })
      .catch(() => { /* restano i default neutri */ })
      .finally(() => { if (!cancelled) setLoadedDefaults(true); });
    return () => { cancelled = true; };
  }, [open, loadedDefaults]);

  // Esc chiude, e il fondo non scorre sotto il pannello.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, loading, onClose]);

  const keep = useMemo(() => chips.filter(c => !off.has(c.id)).map(c => c.id), [chips, off]);

  const toggle = (id: string) =>
    setOff(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(pinned ? "/api/profiling/for-destination" : "/api/profiling/from-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          // Il server vuole una data; se l'utente non la dà, ne passiamo una
          // di comodo ma NON la mostriamo mai come sua (dottrina: mai date
          // inventate a schermo).
          leaveDate: leaveDate || new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
          departure: departure || (lang === "it" ? "Italia" : "Italy"),
          budget,
          companions,
          lang,
          contextOverride: note.trim() || undefined,
          keepInsights: chips.length > 0 ? keep : undefined,
          destination: pinned || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || t("fpm.errorGeneric"));
      }
      const data = await res.json();
      if (Array.isArray(data?.destinations)) setFlow("mind_destinations", JSON.stringify(data.destinations));
      if (data?.input) setFlow("mind_profiling_input", JSON.stringify(data.input));
      onClose();
      setLocation("/destinations");
    } catch (e: any) {
      setError(e?.message ?? t("fpm.errorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const fade = reduce ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };
  const rise = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 16 },
        transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="gs-scrim" {...fade} onClick={() => !loading && onClose()}>
          <motion.div className="gs-sheet" {...rise} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            {/* La fotografia del posto scelto, molto lontana: ricorda di cosa
                stiamo parlando senza mettersi davanti alla decisione. */}
            {destination?.imageUrl && (
              <div className="gs-ph" style={{ backgroundImage: `url(${unsplashSized(destination.imageUrl, 900, 55)})` }} />
            )}

            <button className="gs-x" onClick={() => !loading && onClose()} aria-label={t("gs.close")}>×</button>

            <div className="gs-in">
              <div className="gs-eyebrow">{t(pinned ? "gs.eyebrow.pinned" : "gs.eyebrow.profile")}</div>
              <h2 className="gs-title">{pinned ? shortName : t("gs.title.profile")}</h2>
              {pinned && destination?.country && <div className="gs-where">{destination.country}</div>}
              <p className="gs-sub">{t(pinned ? "gs.sub.pinned" : "gs.sub.profile")}</p>

              {/* ── i paletti ── */}
              <div className="gs-sec">
                <div className="gs-sec-k">{t("gs.sec.when")}</div>

                <label className="gs-row">
                  <span className="gs-row-l">{t("gs.lbl.date")}</span>
                  <input className="gs-date" type="date" value={leaveDate}
                         onChange={e => setLeaveDate(e.target.value)} />
                </label>
                <div className="gs-hint">{t("gs.dateHint")}</div>

                <div className="gs-row">
                  <span className="gs-row-l">{t("gs.lbl.days")}</span>
                  <div className="gs-step">
                    <button onClick={() => setDays(d => Math.max(2, d - 1))} aria-label="-">−</button>
                    <span className="gs-step-v">{days}</span>
                    <button onClick={() => setDays(d => Math.min(21, d + 1))} aria-label="+">+</button>
                  </div>
                </div>

                <label className="gs-row">
                  <span className="gs-row-l">{t("gs.lbl.from")}</span>
                  <input className="gs-txt" type="text" value={departure}
                         onChange={e => setDeparture(e.target.value)}
                         placeholder={t("fpm.placeholderDepart")} />
                </label>

                <div className="gs-row wrap">
                  <span className="gs-row-l">{t("gs.lbl.who")}</span>
                  <div className="gs-opts">
                    {COMPANIONS.map(o => (
                      <button key={o.v} className={"gs-opt" + (companions === o.v ? " on" : "")}
                              onClick={() => setCompanions(o.v)}>{t(o.k)}</button>
                    ))}
                  </div>
                </div>

                <div className="gs-row wrap">
                  <span className="gs-row-l">{t("gs.lbl.budget")}</span>
                  <div className="gs-opts">
                    {BUDGETS.map(o => (
                      <button key={o.v} className={"gs-opt" + (budget === o.v ? " on" : "")}
                              onClick={() => setBudget(o.v)}>{t(o.k)}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── cosa userò di te ── */}
              <div className="gs-sec">
                <div className="gs-sec-k">{t("gs.sec.you")}</div>
                {chips.length === 0 ? (
                  <div className="gs-hint">{t("gs.chipsNone")}</div>
                ) : (
                  <>
                    <div className="gs-chips">
                      {chips.map(c => (
                        <button key={c.id}
                                className={"gs-chip gs-" + c.kind + (off.has(c.id) ? " off" : "")}
                                onClick={() => toggle(c.id)}
                                aria-pressed={!off.has(c.id)}>
                          <span className="gs-chip-t">{c.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="gs-hint">{keep.length === 0 ? t("gs.chipsAllOff") : t("gs.chipsHint")}</div>
                  </>
                )}
              </div>

              {/* ── la nota ── */}
              <div className="gs-sec">
                <div className="gs-sec-k">{t("gs.sec.note")}</div>
                <textarea className="gs-note" rows={2} value={note}
                          onChange={e => setNote(e.target.value.slice(0, 300))}
                          placeholder={t("fpm.placeholderOverride")} />
                <div className="gs-hint">{t("gs.noteHint")}</div>
              </div>

              {error && <div className="gs-err">{error}</div>}

              <button className="gs-go" onClick={submit} disabled={loading}>
                {loading ? t("gs.working") : <>{t(pinned ? "gs.cta.pinned" : "gs.cta.profile")} <span>→</span></>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
