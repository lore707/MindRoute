/**
 * 6 · MODIFICA ITINERARIO — l'editor nel flusso, non un'altra applicazione.
 *
 * Stessa grafica delle altre schermate, stessa persistenza collaudata della
 * "Modalità Cura": ogni giorno toccato viene riscritto sia come editedMoments
 * (fedeltà piena) sia come i 4 slot v1 raggruppati per fascia, che restano il
 * fallback per PDF e rigenerazione. I giorni non toccati passano invariati.
 * Nessuna migrazione di schema.
 * ─────────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from "react";
import { Plus, GripVertical, Trash2, ChevronUp, ChevronDown, Pencil, Check } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import type { Moment } from "@/components/ItineraryCinematic";
import { useFlow, BAND_COLOR, bandOf, type Band } from "./context";

const bg = (url: string | undefined, w: number, q = 62) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

const BANDS: Array<{ key: Band; it: string; en: string; slot: string }> = [
  { key: "mattina", it: "Mattina", en: "Morning", slot: "morning" },
  { key: "pranzo", it: "Pranzo", en: "Lunch", slot: "lunch" },
  { key: "pomeriggio", it: "Pomeriggio", en: "Afternoon", slot: "afternoon" },
  { key: "sera", it: "Sera", en: "Evening", slot: "evening" },
];

export function EditScreen({ initialDay, onSaveDays }: {
  initialDay: number;
  onSaveDays?: (days: any[]) => Promise<void>;
}) {
  const f = useFlow();
  const [dayN, setDayN] = useState(initialDay);
  const [byDay, setByDay] = useState<Record<number, Moment[]>>(() => f.momentsByDay);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  // Il server è la verità: dopo un refetch ripartiamo da lì. Durante l'editing
  // l'identità dell'itinerario non cambia, quindi gli edit non si perdono.
  useEffect(() => { setByDay(f.momentsByDay); /* eslint-disable-next-line */ }, [f.itinerary]);

  const moments = byDay[dayN] ?? [];
  const baseline = f.momentsByDay;
  const dirty = useMemo(
    () => f.days.some(d => JSON.stringify(byDay[d.n] ?? []) !== JSON.stringify(baseline[d.n] ?? [])),
    [byDay, baseline, f.days],
  );

  const patch = (fn: (ms: Moment[]) => Moment[]) =>
    setByDay(prev => ({ ...prev, [dayN]: fn(prev[dayN] ?? []) }));
  const update = (i: number, p: Partial<Moment>) => patch(ms => ms.map((m, j) => (j === i ? { ...m, ...p } : m)));
  const remove = (i: number) => { patch(ms => ms.filter((_, j) => j !== i)); setEditIdx(null); };
  const move = (from: number, to: number) => patch(ms => {
    if (to < 0 || to >= ms.length) return ms;
    const a = [...ms]; const [x] = a.splice(from, 1); a.splice(to, 0, x); return a;
  });
  const add = () => {
    const band = BANDS[2];
    patch(ms => [...ms, {
      t: f.L(band.it, band.en), ic: "📍", band: band.key,
      title: f.t("if.ed.newTitle"), desc: "",
    } as Moment]);
    setEditIdx(moments.length);
  };

  const commitDrag = () => {
    if (dragIdx != null && overIdx != null && dragIdx !== overIdx) move(dragIdx, overIdx);
    setDragIdx(null); setOverIdx(null);
  };

  /* ── serializzazione: identica a quella della Modalità Cura, più i campi
     che prima l'editing buttava via (orari, costi, insight, coordinate). ── */
  const serializeDays = (): any[] => {
    const bandToSlot: Record<string, string> = {
      mattina: "morning", pranzo: "lunch", pomeriggio: "afternoon", sera: "evening",
    };
    return (f.itinerary?.days ?? []).map((day: any, i: number) => {
      const n = day.dayNumber ?? day.day_number ?? i + 1;
      const edited = byDay[n];
      const base = baseline[n];
      if (!edited || JSON.stringify(edited) === JSON.stringify(base)) return day;
      const next: any = { ...day, morning: "", lunch: "", afternoon: "", evening: "" };
      next.editedMoments = edited.map(m => ({
        t: m.t, ic: m.ic, title: m.title, desc: m.desc, band: bandOf(m),
        cta: m.cta, ctaUrl: m.ctaUrl, ctaPrice: m.ctaPrice, ctaStatus: m.ctaStatus, ctaProvider: m.ctaProvider,
        locationName: m.locationName, imageUrl: m.imageUrl, id: m.id, type: m.type, kindLabel: m.kindLabel,
        startTime: m.startTime, endTime: m.endTime,
        durationLabel: m.durationLabel, costLabel: m.costLabel,
        transport: m.transport, planB: m.planB, why: m.why,
        lat: m.lat, lng: m.lng,
      }));
      for (const m of edited) {
        const key = bandToSlot[bandOf(m)] ?? "afternoon";
        const text = [m.title, m.desc].filter(Boolean).join(m.title && m.desc ? ". " : "");
        if (!text) continue;
        next[key] = next[key] ? `${next[key]} ${text}` : text;
      }
      return next;
    });
  };

  const save = async () => {
    if (!onSaveDays) return;
    setSaving(true); setMsg(null);
    try {
      await onSaveDays(serializeDays());
      setMsg({ text: f.t("if.ed.savedOk") });
      setEditIdx(null);
    } catch {
      setMsg({ text: f.t("if.ed.saveErr"), err: true });
    }
    setSaving(false);
  };

  return (
    <div className="mrf-screen">
      <div className="mrf-ed">
        <div className="mrf-ed-tabs">
          {f.days.map(d => (
            <button key={d.n} className={"mrf-ed-tab" + (d.n === dayN ? " on" : "")}
              onClick={() => { setDayN(d.n); setEditIdx(null); }}>
              {f.tx("if.day", { n: d.n })}
            </button>
          ))}
        </div>

        {moments.map((m, i) => {
          const band = bandOf(m);
          const open = editIdx === i;
          return (
            <div key={m.id ?? `${i}-${m.title}`}>
              <div className={"mrf-ed-row" + (dragIdx === i ? " drag" : "")}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => { e.preventDefault(); setOverIdx(i); }}
                onDragEnd={commitDrag}
                onDrop={commitDrag}>
                <span className="mrf-ed-time" style={{ ["--bc" as any]: BAND_COLOR[band] }}>
                  <span className="dot" />
                  {m.startTime || f.L(BANDS.find(b => b.key === band)!.it, BANDS.find(b => b.key === band)!.en).slice(0, 3)}
                </span>
                <button className="mrf-ed-t" style={{ background: "none", border: "none", color: "inherit", textAlign: "left", font: "inherit", cursor: "pointer" }}
                  onClick={() => setEditIdx(open ? null : i)}>
                  {m.title}
                </button>
                {m.imageUrl
                  ? <span className="mrf-ed-th" style={{ backgroundImage: bg(m.imageUrl, 120) }} />
                  : <span className="mrf-ed-th" />}
                <button className="mrf-ed-h" aria-label={f.t("if.ed.moveUp")} title={f.t("if.ed.moveUp")}>
                  <GripVertical size={16} />
                </button>
              </div>

              {open && (
                <div className="mrf-ed-panel">
                  <div className="mrf-ed-field">
                    <label htmlFor={`t-${i}`}>{f.t("if.ed.titleField")}</label>
                    <input id={`t-${i}`} value={m.title} onChange={(e) => update(i, { title: e.target.value })} />
                  </div>
                  <div className="mrf-ed-field">
                    <label htmlFor={`d-${i}`}>{f.t("if.ed.descField")}</label>
                    <textarea id={`d-${i}`} value={m.desc} onChange={(e) => update(i, { desc: e.target.value })}
                      placeholder={f.t("if.ed.newDesc")} />
                  </div>
                  <div className="mrf-ed-field">
                    <label htmlFor={`h-${i}`}>{f.t("if.ed.timeField")}</label>
                    <input id={`h-${i}`} value={m.startTime ?? ""} placeholder="09:30"
                      onChange={(e) => update(i, { startTime: e.target.value })} />
                  </div>
                  <div className="mrf-ed-field">
                    <label>{f.L("Fascia", "Time of day")}</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {BANDS.map(b => (
                        <button key={b.key}
                          className={"mrf-ed-tab" + (band === b.key ? " on" : "")}
                          onClick={() => update(i, { band: b.key, t: f.L(b.it, b.en) })}>
                          {f.L(b.it, b.en)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                    <button className="mrf-pill sm" onClick={() => move(i, i - 1)} disabled={i === 0}>
                      <ChevronUp size={13} /> {f.t("if.ed.moveUp")}
                    </button>
                    <button className="mrf-pill sm" onClick={() => move(i, i + 1)} disabled={i === moments.length - 1}>
                      <ChevronDown size={13} /> {f.t("if.ed.moveDown")}
                    </button>
                    <button className="mrf-pill sm" onClick={() => remove(i)}>
                      <Trash2 size={13} /> {f.t("if.ed.remove")}
                    </button>
                    <button className="mrf-pill sm" onClick={() => setEditIdx(null)}>
                      <Check size={13} /> {f.t("if.close")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {moments.length === 0 && <div className="mrf-empty">{f.t("if.day.empty")}</div>}

        <button className="mrf-ed-add" onClick={add}><Plus size={16} /> {f.t("if.ed.add")}</button>

        <div className="mrf-ed-foot">
          {msg && <div className={"mrf-ed-msg" + (msg.err ? " err" : "")}>{msg.text}</div>}
          {!msg && dirty && <div className="mrf-ed-msg">{f.t("if.ed.dirty")}</div>}
          <button className="mrf-pill acc wide" onClick={save} disabled={saving || !dirty || !onSaveDays}>
            {saving ? f.t("if.ed.saving") : f.t("if.ed.saveChanges")}
          </button>
        </div>
      </div>
    </div>
  );
}
