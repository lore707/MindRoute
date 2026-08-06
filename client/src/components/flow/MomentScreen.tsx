/**
 * 3 · TAPPA — un articolo, non una scheda.
 *
 * Il titolo prima di tutto, poi i fatti essenziali, poi la fotografia, poi il
 * racconto. E in fondo l'unica cosa che nessun altro strumento sa dire: perché
 * proprio questa, proprio qui, proprio ora.
 *
 * Ha un URL suo: si condivide, si torna indietro col browser, si misura.
 * ─────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Heart, StickyNote, Share2, ExternalLink, MapPin, Clock, Wallet,
  ChevronLeft, ChevronRight, Navigation,
} from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { EASE } from "@/lib/motion";
import { trackAffiliate } from "@/lib/analytics";
import { useFlow } from "./context";

const bg = (url: string | undefined, w: number, q = 70) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

export function MomentScreen({ n, momentId }: { n: number; momentId: string }) {
  const f = useFlow();
  const reduce = useReducedMotion();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState("");

  const moments = f.momentsByDay[n] ?? [];
  const idx = moments.findIndex(m => m.id === momentId);
  const m = idx >= 0 ? moments[idx] : null;
  const prev = idx > 0 ? moments[idx - 1] : null;
  const next = idx >= 0 && idx < moments.length - 1 ? moments[idx + 1] : null;

  // La nota resta sul dispositivo: è un appunto personale, non un dato del
  // viaggio. Nessuna promessa di sincronizzazione che non possiamo mantenere.
  const noteKey = `mr_note_${f.itineraryId ?? 0}_${momentId}`;
  useEffect(() => {
    try { setNote(localStorage.getItem(noteKey) ?? ""); } catch { /* private mode */ }
  }, [noteKey]);
  const saveNote = (v: string) => {
    setNote(v);
    try { v.trim() ? localStorage.setItem(noteKey, v) : localStorage.removeItem(noteKey); } catch { /* noop */ }
  };

  useEffect(() => {
    if (!toast) return;
    const tm = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(tm);
  }, [toast]);

  const gmapsUrl = useMemo(() => {
    if (!m) return "";
    return (m.lat != null && m.lng != null)
      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${m.locationName ?? m.title}, ${f.data.destination}`)}`;
  }, [m, f.data.destination]);

  if (!m) {
    return (
      <div className="mrf-screen">
        <div className="mrf-empty">
          {f.t("if.mo.notFound")}
          <div style={{ marginTop: 18 }}>
            <button className="mrf-pill" onClick={() => f.goDay(n)}>{f.tx("if.day", { n })}</button>
          </div>
        </div>
      </div>
    );
  }

  const saved = !!(m.id && f.savedMomentIds?.has(m.id));
  const canSave = !!(f.onToggleSaved && f.itineraryId && m.id);
  const timeWindow = m.startTime ? (m.endTime ? `${m.startTime}–${m.endTime}` : m.startTime) : "";

  const rise = (delay: number) => (reduce
    ? {}
    : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: .48, ease: EASE, delay } });

  return (
    <div className="mrf-screen">
      <div className="mrf-m">
        <motion.div {...rise(0)}>
          {m.kindLabel && <div className="mrf-kick">{m.kindLabel}</div>}
          <h1 className="mrf-m-title">{m.title}</h1>
          <div className="mrf-m-facts">
            {timeWindow && <span><Clock size={13} />{timeWindow}</span>}
            {m.durationLabel && <span><Clock size={13} />{m.durationLabel}</span>}
            {m.transport && <span><Navigation size={13} />{m.transport}</span>}
            {(m.costLabel || m.ctaPrice) && <span><Wallet size={13} />{m.costLabel || m.ctaPrice}</span>}
            {m.locationName && <span><MapPin size={13} />{m.locationName}</span>}
          </div>
        </motion.div>

        {m.imageUrl && (
          <motion.div className="mrf-m-ph" style={{ backgroundImage: bg(m.imageUrl, f.isDesktop ? 1200 : 800) }}
            role="img" aria-label={m.title} {...rise(.06)} />
        )}

        {m.desc && <motion.p className="mrf-m-desc" {...rise(.1)}>{m.desc}</motion.p>}

        {/* L'insight. Non un paragrafo fra gli altri: l'unica cosa che nessun
            altro strumento sa dire di questa tappa. */}
        {m.why && (
          <motion.aside className="mrf-m-why" {...rise(.14)}>
            <div className="mrf-m-why-h"><MapPin size={14} /> {f.t("if.mo.why")}</div>
            <p className="mrf-m-why-t">{m.why}</p>
          </motion.aside>
        )}

        {m.planB && (
          <div className="mrf-m-sec">
            <div className="mrf-m-sec-h">{f.t("if.mo.planB")}</div>
            <p>{m.planB}</p>
          </div>
        )}

        {noteOpen && (
          <div className="mrf-m-sec">
            <div className="mrf-m-sec-h">{f.t("if.mo.noteHint")}</div>
            <textarea className="mrf-m-note" value={note} onChange={(e) => saveNote(e.target.value)}
              placeholder={f.t("if.mo.noteHint")} />
          </div>
        )}

        {/* Prenotazione: resta qui, dove la tappa la giustifica. Il click viene
            registrato lato server — è quello che sblocca la conferma. */}
        <div className="mrf-m-cta">
          {m.cta && m.ctaUrl && (
            <a className="mrf-pill acc wide" href={m.ctaUrl} target="_blank" rel="noopener noreferrer"
              onClick={() => { trackAffiliate(m.ctaProvider ?? "unknown", f.data.destination); f.markClicked(m.type, n); }}>
              {m.cta}{m.ctaPrice && <span>· {m.ctaPrice}</span>}<ExternalLink size={14} />
            </a>
          )}
          <div className="mrf-m-nav" style={{ marginTop: m.cta && m.ctaUrl ? 10 : 0 }}>
            <a className="mrf-pill" href={gmapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin size={14} /> <span>Google Maps</span>
            </a>
            <button className="mrf-pill" onClick={() => f.goMap(n)}>
              <Navigation size={14} /> <span>{f.t("if.map.title")}</span>
            </button>
          </div>
        </div>

        {/* Tappa precedente / successiva: il giorno resta un filo, anche da qui. */}
        {(prev || next) && (
          <div className="mrf-m-nav">
            {prev?.id
              ? <button className="mrf-pill" onClick={() => f.goMoment(n, prev.id!)}><ChevronLeft size={15} /><span>{prev.title}</span></button>
              : <span />}
            {next?.id
              ? <button className="mrf-pill" onClick={() => f.goMoment(n, next.id!)}><span>{next.title}</span><ChevronRight size={15} /></button>
              : <span />}
          </div>
        )}

        {toast && <div className="mrf-hint" style={{ textAlign: "center" }}>{toast}</div>}

        <div className="mrf-m-bar">
          <button className={"mrf-m-act" + (saved ? " on" : "")}
            onClick={() => { if (canSave) { f.onToggleSaved!(m.id!, m); setToast(saved ? "" : f.t("if.saved")); } }}
            disabled={!canSave}>
            <Heart size={19} fill={saved ? "currentColor" : "none"} />
            <span>{saved ? f.t("if.saved") : f.t("if.save")}</span>
          </button>
          <button className={"mrf-m-act" + (noteOpen ? " on" : "")} onClick={() => setNoteOpen(v => !v)}>
            <StickyNote size={19} />
            <span>{f.t("if.notes")}</span>
          </button>
          <button className="mrf-m-act" onClick={() => f.onShare?.()} disabled={!f.onShare}>
            <Share2 size={19} />
            <span>{f.t("if.share")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
