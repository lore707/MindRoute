/**
 * 5 · LOGISTICA — tutto ciò che rende il viaggio possibile, in un posto solo.
 *
 * Assorbe le due vecchie sezioni separate (Pratica e Prenota): trasporti,
 * alloggio, esperienze, note utili, budget, esportazione.
 *
 * Quello che NON c'è, e non ci sarà finché non sarà vero:
 *   · nessun numero di posto, nessun QR, nessun "biglietto confermato" —
 *     non vendiamo biglietti, offriamo link a chi li vende;
 *   · nessun hotel con nome e indirizzo — l'alloggio è una ZONA e dei criteri,
 *     la struttura la sceglie l'utente sul sito del partner.
 * ─────────────────────────────────────────────────────────────── */
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ExternalLink, Check, Clock, Coins, Languages, PhoneCall, Printer, Lock,
} from "lucide-react";
import { EASE } from "@/lib/motion";
import { trackAffiliate } from "@/lib/analytics";
import { countryFacts, tzDeltaHours, timeAt } from "@/lib/country-facts";
import { useFlow } from "./context";
import type { BookItem } from "@/lib/itinerary-booking";

function tryParse(s: any): any { try { return JSON.parse(s); } catch { return null; } }
function firstInt(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const m = String(s).replace(/[.\s]/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

export function LogisticsScreen() {
  const f = useFlow();
  const reduce = useReducedMotion();
  const [altOpen, setAltOpen] = useState<Set<string>>(new Set());
  const toggleAlt = (id: string) => setAltOpen(p => {
    const nx = new Set(p); nx.has(id) ? nx.delete(id) : nx.add(id); return nx;
  });

  const transportItems = f.bookingItems.filter(i => i.id === "flight" || i.id === "transfer");
  const stayItems = f.bookingItems.filter(i => i.id === "hotel");
  const otherItems = f.bookingItems.filter(i => !["flight", "transfer", "hotel"].includes(i.id));

  /* ── note utili: solo dati derivabili, mai inventati ── */
  const facts = useMemo(() => countryFacts(f.data.country), [f.data.country]);
  const tzDelta = useMemo(() => (facts ? tzDeltaHours(facts.tz) : null), [facts]);
  const localNow = useMemo(() => (facts ? timeAt(facts.tz, f.lang) : null), [facts, f.lang]);

  /* ── budget: v1 (items) o v2 (tripMeta) ── */
  const budget = useMemo(() => {
    const parsed = tryParse(f.itinerary?.budgetSummary);
    const items: Array<{ label: string; total: string }> = Array.isArray(parsed?.items) ? parsed.items : [];
    const meta = (f.itinerary as any)?.tripMeta ?? null;
    const bookable: number | null = typeof meta?.total_cost_bookable === "number" ? meta.total_cost_bookable : null;
    const onsite: number | null = typeof meta?.total_cost_onsite_estimate === "number" ? meta.total_cost_onsite_estimate : null;
    const range: string | null = parsed?.total_cost_range || meta?.total_cost_range || null;
    const total = range || (bookable != null ? `€${Math.round(bookable + (onsite ?? 0))}` : null);
    const rows = items.length > 0
      ? items.map(i => ({ label: i.label, value: i.total }))
      : ([
        bookable != null ? { label: f.L("Prenotabile ora", "Bookable now"), value: `€${Math.round(bookable)}` } : null,
        onsite != null ? { label: f.L("In loco (stima)", "On-site (est.)"), value: `€${Math.round(onsite)}` } : null,
      ].filter(Boolean) as Array<{ label: string; value: string }>);
    return { total, rows };
  }, [f.itinerary, f.L]);

  const rise = (delay: number) => (reduce
    ? {}
    : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: .45, ease: EASE, delay } });

  const Card = ({ it }: { it: BookItem }) => {
    const isChecked = !!f.checked[it.id];
    const wasClicked = !!f.clicked[it.id];
    const open = altOpen.has(it.id);
    return (
      <div className="mrf-card">
        <div className="mrf-card-h">
          <span className="mrf-card-ic">{it.ic}</span>
          <span className="mrf-card-t">{it.title}</span>
          <span className={"mrf-card-tag" + (isChecked ? " ok" : it.tier === "essential" ? " ess" : "")}>
            {isChecked ? f.t("if.log.booked") : it.tier === "essential" ? f.t("if.log.essential") : f.t("if.log.recommended")}
          </span>
        </div>
        {it.facts.length > 0 && (
          <div className="mrf-facts">{it.facts.map((x, i) => <span className="mrf-fact" key={i}>{x}</span>)}</div>
        )}
        {it.why && <p className="mrf-why">{it.why}</p>}
        <div className="mrf-card-acts">
          {it.url && (
            <a className="mrf-pill acc sm" href={it.url} target="_blank" rel="noopener noreferrer"
              onClick={() => { trackAffiliate(it.provider ?? "unknown", f.data.destination); f.logClick(it.id); }}>
              {it.cta} <ExternalLink size={13} />
            </a>
          )}
          {/* La conferma è accettata dal server SOLO dopo il click sul link:
              niente spunte a caso, e lo stato vale su qualsiasi dispositivo. */}
          <button className={"mrf-pill sm" + (isChecked ? " acc" : "")}
            onClick={() => f.toggleBooked(it.id)} disabled={!wasClicked && !isChecked}>
            {isChecked ? <Check size={13} /> : null} {isChecked ? f.t("if.log.booked") : f.t("if.log.bookedMark")}
          </button>
          {it.alt.length > 0 && (
            <button className="mrf-pill sm" onClick={() => toggleAlt(it.id)}>
              {f.t("if.log.otherOptions")} {open ? "▴" : "▾"}
            </button>
          )}
        </div>
        {!wasClicked && !isChecked && <p className="mrf-hint">{f.t("if.log.clickFirst")}</p>}
        {open && it.alt.length > 0 && (
          <div className="mrf-alt">
            {it.alt.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                onClick={() => { trackAffiliate(it.provider ?? "unknown", f.data.destination); f.logClick(it.id); }}>
                {a.label} ↗
              </a>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mrf-screen">
      <div className="mrf-lg">
        {transportItems.length > 0 && (
          <motion.section className="mrf-lg-sec" {...rise(0)}>
            <h2 className="mrf-sec-h">{f.t("if.log.transport")}</h2>
            {transportItems.map(it => <Card key={it.id} it={it} />)}
          </motion.section>
        )}

        {stayItems.length > 0 && (
          <motion.section className="mrf-lg-sec" {...rise(.05)}>
            <h2 className="mrf-sec-h">{f.t("if.log.stay")}</h2>
            {stayItems.map(it => <Card key={it.id} it={it} />)}
            <p className="mrf-hint">{f.t("if.log.stayIsArea")}</p>
          </motion.section>
        )}

        {otherItems.length > 0 && (
          <motion.section className="mrf-lg-sec" {...rise(.1)}>
            <h2 className="mrf-sec-h">{f.L("Esperienze e tavola", "Experiences & food")}</h2>
            {otherItems.map(it => <Card key={it.id} it={it} />)}
          </motion.section>
        )}

        {facts && (
          <motion.section className="mrf-lg-sec" {...rise(.14)}>
            <h2 className="mrf-sec-h">{f.t("if.log.notes")}</h2>
            <div className="mrf-notes">
              <div className="mrf-note">
                <Clock size={15} className="ic" />
                <div>
                  <div className="k">{f.t("if.log.tz")}</div>
                  <div className="v">
                    {tzDelta == null ? "—"
                      : tzDelta === 0 ? f.t("if.log.tzSame")
                        : tzDelta > 0 ? f.tx("if.log.tzAhead", { n: tzDelta })
                          : f.tx("if.log.tzBehind", { n: Math.abs(tzDelta) })}
                  </div>
                  {localNow && <div className="k" style={{ marginTop: 4 }}>{f.t("if.log.localTime")} {localNow}</div>}
                </div>
              </div>
              <div className="mrf-note">
                <Coins size={15} className="ic" />
                <div>
                  <div className="k">{f.t("if.log.currency")}</div>
                  <div className="v">{facts.currency}</div>
                </div>
              </div>
              <div className="mrf-note">
                <Languages size={15} className="ic" />
                <div>
                  <div className="k">{f.t("if.log.language")}</div>
                  <div className="v">{f.lang === "it" ? facts.langIt : facts.langEn}</div>
                </div>
              </div>
              <div className="mrf-note">
                <PhoneCall size={15} className="ic" />
                <div>
                  <div className="k">{f.t("if.log.emergency")}</div>
                  <div className="v">{facts.emergency}</div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {budget.total && (
          <motion.section className="mrf-lg-sec" {...rise(.18)}>
            <h2 className="mrf-sec-h">{f.t("if.log.budget")}</h2>
            <div className="mrf-card">
              <div className="mrf-budget-total">{budget.total}</div>
              {budget.rows.length > 0 && (
                <div className="mrf-budget-rows">
                  {budget.rows.map((r, i) => (
                    <div className="mrf-budget-row" key={i}><span>{r.label}</span><b>{r.value}</b></div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        )}

        <motion.section className="mrf-lg-sec" {...rise(.22)}>
          <button className="mrf-pill wide" onClick={() => f.onSavePdf?.()} disabled={!f.onSavePdf}>
            {f.pdfUnlocked ? <Printer size={15} /> : <Lock size={15} />} {f.t("if.log.export")}
          </button>
          {!f.pdfUnlocked && <p className="mrf-hint">{f.t("if.log.pdfLocked")}</p>}
        </motion.section>
      </div>
    </div>
  );
}
