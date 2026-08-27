import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  DndContext, DragOverlay, PointerSensor, closestCorners,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Bot, Check, ChevronRight, Copy, GripVertical, Layers3,
  Lock, MapPin, Maximize2, MessageCircle, Minus, Plus, Redo2,
  Save, Sparkles, Trash2, Unlock, X, ZoomIn, ZoomOut,
} from "lucide-react";
import { FlowNavLogo } from "@/components/FlowNav";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import "@/styles/travel-studio.css";

type RawTrip = {
  id: number;
  schemaVersion?: number;
  destinationName?: string;
  heroImageUrl?: string;
  whyYours?: string;
  days?: any[];
  tripMeta?: Record<string, any>;
};

type BoardTrip = {
  key: string;
  sourceId: number;
  label: string;
  variant: boolean;
  data: RawTrip;
};

type Selection = { boardKey: string; dayIndex: number; momentIndex: number };
type DragPayload = Selection & { kind: "moment" };
type DropPayload =
  | (Selection & { kind: "moment" })
  | { boardKey: string; dayIndex: number; kind: "day" };

const clone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const dayNumber = (day: any, index: number) => day?.day_number ?? day?.dayNumber ?? index + 1;
const dayTitle = (day: any, index: number) => day?.title_evocative ?? day?.title ?? `Giorno ${dayNumber(day, index)}`;
const momentId = (moment: any, index: number) => String(moment?.id ?? `studio-moment-${index}`);
const momentTitle = (moment: any) => moment?.title_operational ?? moment?.title_evocative ?? moment?.title ?? "Nuova tappa";
const momentDescription = (moment: any) => moment?.description ?? moment?.desc ?? "";
const momentTime = (moment: any) => moment?.start_time ?? moment?.startTime ?? "";
const momentBand = (moment: any) => {
  const value = String(moment?.time_label ?? moment?.band ?? moment?.t ?? "afternoon").toLowerCase();
  if (value.includes("matt") || value.includes("morn")) return "morning";
  if (value.includes("pranz") || value.includes("lunch")) return "lunch";
  if (value.includes("pomer") || value.includes("after")) return "afternoon";
  if (value.includes("sera") || value.includes("even")) return "evening";
  if (value.includes("nott") || value.includes("night")) return "night";
  return "afternoon";
};
const momentLocation = (moment: any) => moment?.location_name ?? moment?.locationName ?? "";
const momentWhy = (moment: any) => moment?.why_this ?? moment?.why ?? "";

function momentsOf(day: any): any[] {
  if (Array.isArray(day?.moments)) return day.moments;
  if (Array.isArray(day?.editedMoments)) return day.editedMoments;
  return [];
}

function setMoments(day: any, moments: any[], v2: boolean) {
  if (v2 || Array.isArray(day?.moments)) day.moments = moments;
  else day.editedMoments = moments;
}

function normalizeTrip(raw: RawTrip): RawTrip {
  const trip = clone(raw);
  const v2 = trip.schemaVersion === 2;
  trip.days = (Array.isArray(trip.days) ? trip.days : []).map((source, dayIndex) => {
    const day = { ...source };
    let moments = momentsOf(day).map((moment, momentIndex) => ({
      ...moment,
      id: moment?.id ?? `studio-${trip.id}-${dayNumber(day, dayIndex)}-${momentIndex}`,
    }));

    if (!moments.length && !v2) {
      const slots = [
        ["morning", "mattina"], ["lunch", "pranzo"],
        ["afternoon", "pomeriggio"], ["evening", "sera"],
      ] as const;
      moments = slots.flatMap(([slot, band], slotIndex) => {
        const text = typeof day?.[slot] === "string" ? day[slot].trim() : "";
        return text ? [{ id: `studio-${trip.id}-${dayIndex}-${slotIndex}`, title: text, desc: "", band }] : [];
      });
    }
    setMoments(day, moments, v2);
    return day;
  });
  return trip;
}

function patchMoment(moment: any, field: string, value: string): any {
  const next = { ...moment };
  const v2 = "title_operational" in next || "description" in next || "time_label" in next;
  if (field === "title") {
    if (v2) { next.title_operational = value; next.title_evocative = value; }
    else next.title = value;
  }
  if (field === "description") v2 ? next.description = value : next.desc = value;
  if (field === "time") v2 ? next.start_time = value : next.startTime = value;
  if (field === "band") v2 ? next.time_label = value : next.band = value;
  if (field === "location") v2 ? next.location_name = value : next.locationName = value;
  if (field === "why") v2 ? next.why_this = value : next.why = value;
  return next;
}

function createMoment(trip: RawTrip, day: any, index: number, it: boolean) {
  const id = `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  if (trip.schemaVersion === 2 || Array.isArray(day?.moments)) {
    return {
      id, type: "experience", time_label: "afternoon",
      title_operational: it ? "Nuova tappa" : "New stop",
      title_evocative: it ? "Nuova tappa" : "New stop",
      description: "", why_this: "",
    };
  }
  return { id, title: it ? "Nuova tappa" : "New stop", desc: "", band: "pomeriggio", t: it ? "Pomeriggio" : "Afternoon", ic: "📍" };
}

function lockKey(selection: Selection, moment: any) {
  return `${selection.boardKey}:${momentId(moment, selection.momentIndex)}`;
}

function CanvasMoment({ boardKey, dayIndex, momentIndex, moment, selected, locked, onSelect }: {
  boardKey: string;
  dayIndex: number;
  momentIndex: number;
  moment: any;
  selected: boolean;
  locked: boolean;
  onSelect: () => void;
}) {
  const payload: DragPayload = { kind: "moment", boardKey, dayIndex, momentIndex };
  const id = `moment:${boardKey}:${dayIndex}:${momentId(moment, momentIndex)}`;
  const drag = useDraggable({ id, data: payload, disabled: locked });
  const drop = useDroppable({ id: `drop:${id}`, data: payload });
  const setNodeRef = (node: HTMLElement | null) => { drag.setNodeRef(node); drop.setNodeRef(node); };

  return (
    <article
      ref={setNodeRef}
      className={`mrs-moment${selected ? " selected" : ""}${drag.isDragging ? " dragging" : ""}${drop.isOver ? " over" : ""}`}
      style={{ transform: CSS.Translate.toString(drag.transform) }}
      onClick={onSelect}
    >
      <button className="mrs-grip" aria-label="Trascina tappa" {...drag.listeners} {...drag.attributes} disabled={locked}>
        {locked ? <Lock size={13} /> : <GripVertical size={14} />}
      </button>
      <div className="mrs-moment-copy">
        <div className="mrs-moment-meta"><span>{momentTime(moment) || momentBand(moment)}</span>{momentLocation(moment) && <span>{momentLocation(moment)}</span>}</div>
        <h4>{momentTitle(moment)}</h4>
        {momentDescription(moment) && <p>{momentDescription(moment)}</p>}
      </div>
      <ChevronRight size={14} className="mrs-moment-open" />
    </article>
  );
}

function DayColumn({ board, day, dayIndex, selection, locks, onSelect, onAdd }: {
  board: BoardTrip;
  day: any;
  dayIndex: number;
  selection: Selection | null;
  locks: Set<string>;
  onSelect: (selection: Selection) => void;
  onAdd: () => void;
}) {
  const drop = useDroppable({ id: `day:${board.key}:${dayIndex}`, data: { kind: "day", boardKey: board.key, dayIndex } satisfies DropPayload });
  const moments = momentsOf(day);
  return (
    <section ref={drop.setNodeRef} className={`mrs-day${drop.isOver ? " over" : ""}`}>
      <header className="mrs-day-head">
        <span>{String(dayNumber(day, dayIndex)).padStart(2, "0")}</span>
        <div><h3>{dayTitle(day, dayIndex)}</h3><p>{moments.length} {moments.length === 1 ? "tappa" : "tappe"}</p></div>
      </header>
      <div className="mrs-day-line" />
      <div className="mrs-day-moments">
        {moments.map((moment, momentIndex) => {
          const nextSelection = { boardKey: board.key, dayIndex, momentIndex };
          return <CanvasMoment
            key={momentId(moment, momentIndex)}
            boardKey={board.key}
            dayIndex={dayIndex}
            momentIndex={momentIndex}
            moment={moment}
            selected={selection?.boardKey === board.key && selection.dayIndex === dayIndex && selection.momentIndex === momentIndex}
            locked={locks.has(lockKey(nextSelection, moment))}
            onSelect={() => onSelect(nextSelection)}
          />;
        })}
      </div>
      <button className="mrs-add-moment" onClick={onAdd}><Plus size={14} /> Aggiungi tappa</button>
    </section>
  );
}

export default function TravelStudio() {
  const [, setLocation] = useLocation();
  const { lang } = useI18n();
  const { toast } = useToast();
  const it = lang === "it";
  const L = useCallback((italian: string, english: string) => it ? italian : english, [it]);
  const [library, setLibrary] = useState<RawTrip[]>([]);
  const [boards, setBoards] = useState<BoardTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [locks, setLocks] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [activeDrag, setActiveDrag] = useState<any>(null);
  const [command, setCommand] = useState("");
  const [commandNote, setCommandNote] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const history = useRef<BoardTrip[][]>([]);
  const [historySize, setHistorySize] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const loadTrips = useCallback(async () => {
    const response = await fetch(`/api/my-trips?lang=${lang}`);
    if (!response.ok) throw new Error("trips");
    const rows = await response.json();
    const trips = (Array.isArray(rows) ? rows : []).map(normalizeTrip);
    setLibrary(trips);
    setBoards(current => {
      if (!current.length && trips.length) {
        const first = trips[0];
        return [{ key: `trip-${first.id}`, sourceId: first.id, label: first.destinationName ?? "Viaggio", variant: false, data: clone(first) }];
      }
      return current.map(board => {
        if (dirty.has(board.key)) return board;
        const fresh = trips.find((trip: RawTrip) => trip.id === board.sourceId);
        return fresh ? { ...board, data: clone(fresh) } : board;
      });
    });
  }, [lang, dirty]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/my-trips?lang=${lang}`)
      .then(response => response.ok ? response.json() : [])
      .then(rows => {
        if (cancelled) return;
        const trips = (Array.isArray(rows) ? rows : []).map(normalizeTrip);
        setLibrary(trips);
        if (trips.length) {
          const first = trips[0];
          setBoards([{ key: `trip-${first.id}`, sourceId: first.id, label: first.destinationName ?? "Viaggio", variant: false, data: clone(first) }]);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    const onUpdated = (event: Event) => {
      const id = Number((event as CustomEvent).detail?.itineraryId);
      if (!Number.isFinite(id)) return;
      const hasDirty = boards.some(board => board.sourceId === id && dirty.has(board.key));
      if (hasDirty) {
        setCommandNote(L("Il Companion ha aggiornato il viaggio originale. Salva o annulla la bozza prima di ricaricarlo.", "The Companion updated the original trip. Save or undo your draft before reloading it."));
        return;
      }
      loadTrips().catch(() => {});
      setCommandNote(L("Modifica AI applicata e canvas aggiornato.", "AI change applied and canvas refreshed."));
    };
    window.addEventListener("mindroute:itinerary-updated", onUpdated);
    return () => window.removeEventListener("mindroute:itinerary-updated", onUpdated);
  }, [boards, dirty, L, loadTrips]);

  const pushHistory = () => {
    history.current.push(clone(boards));
    if (history.current.length > 20) history.current.shift();
    setHistorySize(history.current.length);
  };

  const markDirty = (key: string) => setDirty(previous => new Set(previous).add(key));

  const selected = useMemo(() => {
    if (!selection) return null;
    const board = boards.find(item => item.key === selection.boardKey);
    const day = board?.data.days?.[selection.dayIndex];
    const moment = day ? momentsOf(day)[selection.momentIndex] : null;
    return board && day && moment ? { board, day, moment } : null;
  }, [boards, selection]);

  const mutateBoard = (boardKey: string, change: (board: BoardTrip) => void) => {
    setBoards(previous => {
      const next = clone(previous);
      const board = next.find(item => item.key === boardKey);
      if (board) change(board);
      return next;
    });
    markDirty(boardKey);
  };

  const updateSelected = (field: string, value: string) => {
    if (!selection) return;
    mutateBoard(selection.boardKey, board => {
      const day = board.data.days?.[selection.dayIndex];
      if (!day) return;
      const moments = [...momentsOf(day)];
      moments[selection.momentIndex] = patchMoment(moments[selection.momentIndex], field, value);
      setMoments(day, moments, board.data.schemaVersion === 2);
    });
  };

  const addMoment = (boardKey: string, dayIndex: number) => {
    pushHistory();
    mutateBoard(boardKey, board => {
      const day = board.data.days?.[dayIndex];
      if (!day) return;
      const moments = [...momentsOf(day), createMoment(board.data, day, momentsOf(day).length, it)];
      setMoments(day, moments, board.data.schemaVersion === 2);
      setSelection({ boardKey, dayIndex, momentIndex: moments.length - 1 });
    });
  };

  const removeSelected = () => {
    if (!selection) return;
    pushHistory();
    mutateBoard(selection.boardKey, board => {
      const day = board.data.days?.[selection.dayIndex];
      if (!day) return;
      const moments = momentsOf(day).filter((_, index) => index !== selection.momentIndex);
      setMoments(day, moments, board.data.schemaVersion === 2);
    });
    setSelection(null);
  };

  const duplicateSelected = () => {
    if (!selection || !selected) return;
    pushHistory();
    mutateBoard(selection.boardKey, board => {
      const day = board.data.days?.[selection.dayIndex];
      if (!day) return;
      const moments = [...momentsOf(day)];
      const duplicate = { ...clone(selected.moment), id: `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}` };
      moments.splice(selection.momentIndex + 1, 0, duplicate);
      setMoments(day, moments, board.data.schemaVersion === 2);
      setSelection({ ...selection, momentIndex: selection.momentIndex + 1 });
    });
  };

  const toggleLock = () => {
    if (!selection || !selected) return;
    const key = lockKey(selection, selected.moment);
    setLocks(previous => {
      const next = new Set(previous);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const onDragStart = (event: DragStartEvent) => {
    const payload = event.active.data.current as DragPayload | undefined;
    if (!payload) return;
    const board = boards.find(item => item.key === payload.boardKey);
    setActiveDrag(board ? momentsOf(board.data.days?.[payload.dayIndex])[payload.momentIndex] : null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const from = event.active.data.current as DragPayload | undefined;
    const over = event.over?.data.current as DropPayload | undefined;
    if (!from || !over || from.boardKey !== over.boardKey) return;
    const toDayIndex = over.dayIndex;
    let toMomentIndex = over.kind === "moment" ? over.momentIndex : Number.MAX_SAFE_INTEGER;
    if (from.dayIndex === toDayIndex && from.momentIndex === toMomentIndex) return;
    pushHistory();
    mutateBoard(from.boardKey, board => {
      const sourceDay = board.data.days?.[from.dayIndex];
      const targetDay = board.data.days?.[toDayIndex];
      if (!sourceDay || !targetDay) return;
      const source = [...momentsOf(sourceDay)];
      const target = sourceDay === targetDay ? source : [...momentsOf(targetDay)];
      const [moved] = source.splice(from.momentIndex, 1);
      if (!moved) return;
      if (sourceDay === targetDay) {
        if (from.momentIndex < toMomentIndex) toMomentIndex -= 1;
        toMomentIndex = Math.max(0, Math.min(toMomentIndex, source.length));
        source.splice(toMomentIndex, 0, moved);
        setMoments(sourceDay, source, board.data.schemaVersion === 2);
      } else {
        toMomentIndex = Math.max(0, Math.min(toMomentIndex, target.length));
        target.splice(toMomentIndex, 0, moved);
        setMoments(sourceDay, source, board.data.schemaVersion === 2);
        setMoments(targetDay, target, board.data.schemaVersion === 2);
      }
      setSelection({ boardKey: from.boardKey, dayIndex: toDayIndex, momentIndex: toMomentIndex });
    });
  };

  const addToBoard = (trip: RawTrip) => {
    if (boards.some(board => board.sourceId === trip.id && !board.variant)) return;
    setBoards(previous => [...previous, { key: `trip-${trip.id}`, sourceId: trip.id, label: trip.destinationName ?? "Viaggio", variant: false, data: clone(trip) }]);
  };

  const duplicateBoard = (board: BoardTrip) => {
    pushHistory();
    const next: BoardTrip = {
      ...clone(board),
      key: `variant-${board.sourceId}-${Date.now().toString(36)}`,
      label: `${board.data.destinationName ?? board.label} · ${L("Variante", "Variant")}`,
      variant: true,
    };
    setBoards(previous => [...previous, next]);
    markDirty(next.key);
  };

  const removeBoard = (key: string) => {
    setBoards(previous => previous.filter(board => board.key !== key));
    setDirty(previous => { const next = new Set(previous); next.delete(key); return next; });
    if (selection?.boardKey === key) setSelection(null);
  };

  const undo = () => {
    const previous = history.current.pop();
    if (!previous) return;
    setBoards(previous);
    setHistorySize(history.current.length);
    setSelection(null);
  };

  const saveBoard = async (board: BoardTrip) => {
    if (board.variant && !window.confirm(L("Questa variante sostituirà l'itinerario originale. Continuare?", "This variant will replace the original itinerary. Continue?"))) return;
    setSaving(board.key);
    try {
      const response = await fetch(`/api/itinerary/${board.sourceId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: board.data.days ?? [] }),
      });
      if (!response.ok) throw new Error("save");
      setDirty(previous => { const next = new Set(previous); next.delete(board.key); return next; });
      setLibrary(previous => previous.map(trip => trip.id === board.sourceId ? clone(board.data) : trip));
      toast({ title: L("Viaggio aggiornato", "Trip updated"), description: board.variant ? L("La variante è ora la versione principale.", "The variant is now the main version.") : L("Le modifiche del canvas sono state salvate.", "Canvas changes have been saved.") });
    } catch {
      toast({ title: L("Salvataggio non riuscito", "Save failed"), variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  const openCompanion = (event: React.FormEvent) => {
    event.preventDefault();
    const board = selected?.board ?? boards[0];
    if (!board || !command.trim()) return;
    if (dirty.has(board.key)) {
      setCommandNote(L("Salva prima la bozza: così il Companion lavora sulla stessa versione che vedi.", "Save the draft first, so the Companion works on the same version you see."));
      return;
    }
    const context = selected
      ? L(`Sto lavorando sulla tappa “${momentTitle(selected.moment)}” del giorno ${dayNumber(selected.day, selection?.dayIndex ?? 0)}.`, `I am working on “${momentTitle(selected.moment)}” on day ${dayNumber(selected.day, selection?.dayIndex ?? 0)}.`)
      : L(`Sto lavorando sull'intero viaggio a ${board.data.destinationName ?? board.label}.`, `I am working on the whole trip to ${board.data.destinationName ?? board.label}.`);
    const lockedMoments = (board.data.days ?? []).flatMap((day, dayIndex) =>
      momentsOf(day).flatMap((moment, momentIndex) =>
        locks.has(lockKey({ boardKey: board.key, dayIndex, momentIndex }, moment)) ? [momentTitle(moment)] : []
      )
    );
    const lockInstruction = lockedMoments.length
      ? L(`Non modificare queste tappe bloccate: ${lockedMoments.join(", ")}.`, `Do not change these locked stops: ${lockedMoments.join(", ")}.`)
      : "";
    const seed = `${context} ${lockInstruction} ${L("Richiesta", "Request")}: ${command.trim()} ${L("Proponi prima la modifica e applicala solo dopo la mia conferma.", "Propose the change first and apply it only after my confirmation.")}`;
    window.dispatchEvent(new CustomEvent("mindroute:open-companion-for-itinerary", { detail: { itineraryId: board.sourceId, seed } }));
    setCommandNote(L("Il Companion ha ricevuto viaggio, selezione e richiesta.", "The Companion received the trip, selection and request."));
    setCommand("");
  };

  if (loading) return <div className="mrs-loading"><span /><p>{L("Preparo il tuo spazio di lavoro…", "Preparing your workspace…")}</p></div>;

  if (!library.length) return (
    <div className="mrs-empty-page">
      <FlowNavLogo size={42} />
      <span>{L("Travel Canvas", "Travel Canvas")}</span>
      <h1>{L("Prima serve un viaggio da aprire.", "You need a trip to open first.")}</h1>
      <p>{L("Crea il tuo primo itinerario: apparirà qui come un progetto completamente modificabile.", "Create your first itinerary: it will appear here as a fully editable project.")}</p>
      <button onClick={() => setLocation("/start")}>{L("Crea il primo viaggio", "Create your first trip")} <ChevronRight size={16} /></button>
    </div>
  );

  return (
    <div className="mrs-page">
      <header className="mrs-topbar">
        <div className="mrs-brand">
          <button onClick={() => setLocation("/my-account")} aria-label={L("Torna ai viaggi", "Back to trips")}><ArrowLeft size={17} /></button>
          <FlowNavLogo size={26} />
          <div><strong>MindRoute Studio</strong><span>Travel Canvas · Beta</span></div>
        </div>
        <div className="mrs-top-actions">
          <button onClick={undo} disabled={!historySize}><Redo2 size={15} />{L("Annulla", "Undo")}</button>
          <div className="mrs-zoom">
            <button onClick={() => setZoom(value => Math.max(.7, +(value - .1).toFixed(1)))} aria-label="Zoom out"><ZoomOut size={15} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(value => Math.min(1.2, +(value + .1).toFixed(1)))} aria-label="Zoom in"><ZoomIn size={15} /></button>
          </div>
          <LangDropdown variant="dark" />
        </div>
      </header>

      <div className="mrs-shell">
        <aside className="mrs-library">
          <div className="mrs-panel-title"><Layers3 size={16} /><div><strong>{L("I tuoi viaggi", "Your trips")}</strong><span>{L("Aggiungi al canvas", "Add to canvas")}</span></div></div>
          <div className="mrs-library-list">
            {library.map(trip => {
              const added = boards.some(board => board.sourceId === trip.id && !board.variant);
              return (
                <button key={trip.id} className={`mrs-library-trip${added ? " added" : ""}`} onClick={() => addToBoard(trip)} disabled={added}>
                  <span className="mrs-library-img" style={{ backgroundImage: trip.heroImageUrl ? `url(${trip.heroImageUrl})` : undefined }} />
                  <span><strong>{trip.destinationName ?? "Viaggio"}</strong><small>{trip.days?.length ?? 0} {L("giorni", "days")}</small></span>
                  {added ? <Check size={14} /> : <Plus size={14} />}
                </button>
              );
            })}
          </div>
          <div className="mrs-library-tip"><Sparkles size={15} /><p>{L("Metti due viaggi sul canvas per confrontarli o duplica un frame per creare una variante.", "Place two trips on the canvas to compare them, or duplicate a frame to create a variant.")}</p></div>
        </aside>

        <main className="mrs-canvas-main">
          <div className="mrs-canvas-toolbar">
            <div><span>{L("Board", "Board")}</span><strong>{L("Il mio spazio viaggi", "My travel space")}</strong></div>
            <p>{L("Trascina le tappe tra i giorni. Selezionane una per modificarla.", "Drag stops between days. Select one to edit it.")}</p>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="mrs-canvas-scroll">
              <div className="mrs-canvas-stage" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
                {boards.map(board => (
                  <section className="mrs-trip-frame" key={board.key}>
                    <header className="mrs-frame-head">
                      <div className="mrs-frame-title">
                        <span className={board.variant ? "variant" : ""}>{board.variant ? L("Variante", "Variant") : L("Itinerario", "Itinerary")}</span>
                        <h2>{board.label}</h2>
                        <p>{board.data.whyYours || L("Un viaggio da costruire intorno a te.", "A trip to shape around you.")}</p>
                      </div>
                      <div className="mrs-frame-actions">
                        {dirty.has(board.key) && <span className="mrs-unsaved">{L("Bozza modificata", "Draft changed")}</span>}
                        <button onClick={() => duplicateBoard(board)}><Copy size={14} />{L("Duplica", "Duplicate")}</button>
                        <button className="save" onClick={() => saveBoard(board)} disabled={!dirty.has(board.key) || saving === board.key}><Save size={14} />{saving === board.key ? L("Salvo…", "Saving…") : board.variant ? L("Applica variante", "Apply variant") : L("Salva", "Save")}</button>
                        <button className="icon" onClick={() => removeBoard(board.key)} aria-label={L("Rimuovi dal canvas", "Remove from canvas")}><X size={15} /></button>
                      </div>
                    </header>
                    <div className="mrs-days" style={{ minWidth: Math.max(760, (board.data.days?.length ?? 0) * 248) }}>
                      {(board.data.days ?? []).map((day, dayIndex) => (
                        <DayColumn
                          key={`${board.key}-${dayNumber(day, dayIndex)}`}
                          board={board}
                          day={day}
                          dayIndex={dayIndex}
                          selection={selection}
                          locks={locks}
                          onSelect={setSelection}
                          onAdd={() => addMoment(board.key, dayIndex)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                {!boards.length && <div className="mrs-canvas-empty"><Maximize2 size={26} /><h2>{L("Il canvas è vuoto", "The canvas is empty")}</h2><p>{L("Aggiungi un viaggio dalla libreria.", "Add a trip from the library.")}</p></div>}
              </div>
            </div>
            <DragOverlay>{activeDrag ? <div className="mrs-drag-overlay"><GripVertical size={14} /><strong>{momentTitle(activeDrag)}</strong></div> : null}</DragOverlay>
          </DndContext>

          <form className="mrs-command" onSubmit={openCompanion}>
            <Bot size={18} />
            <div><label htmlFor="studio-command">{selected ? L(`Chiedi all'AI su “${momentTitle(selected.moment)}”`, `Ask AI about “${momentTitle(selected.moment)}”`) : L("Chiedi all'AI sul viaggio", "Ask AI about the trip")}</label><input id="studio-command" value={command} onChange={event => setCommand(event.target.value)} placeholder={L("Es. Rendilo più lento, conserva la cena e riduci gli spostamenti…", "E.g. Make it slower, keep dinner and reduce transfers…")} /></div>
            <button type="submit" disabled={!command.trim()}><MessageCircle size={16} />{L("Apri Companion", "Open Companion")}</button>
            {commandNote && <p>{commandNote}</p>}
          </form>
        </main>

        <aside className="mrs-inspector">
          <div className="mrs-panel-title"><MapPin size={16} /><div><strong>{L("Inspector", "Inspector")}</strong><span>{selected ? L("Tappa selezionata", "Selected stop") : L("Nessuna selezione", "No selection")}</span></div></div>
          {selected && selection ? (
            <div className="mrs-inspector-body">
              <div className="mrs-selection-path"><span>{selected.board.label}</span><ChevronRight size={12} /><span>{L("Giorno", "Day")} {dayNumber(selected.day, selection.dayIndex)}</span></div>
              <label>{L("Titolo", "Title")}<input value={momentTitle(selected.moment)} onChange={event => updateSelected("title", event.target.value)} /></label>
              <label>{L("Descrizione", "Description")}<textarea value={momentDescription(selected.moment)} onChange={event => updateSelected("description", event.target.value)} /></label>
              <div className="mrs-fields-row">
                <label>{L("Orario", "Time")}<input value={momentTime(selected.moment)} placeholder="09:30" onChange={event => updateSelected("time", event.target.value)} /></label>
                <label>{L("Fascia", "Period")}<select value={momentBand(selected.moment)} onChange={event => updateSelected("band", event.target.value)}><option value="morning">{L("Mattina", "Morning")}</option><option value="lunch">{L("Pranzo", "Lunch")}</option><option value="afternoon">{L("Pomeriggio", "Afternoon")}</option><option value="evening">{L("Sera", "Evening")}</option><option value="night">{L("Notte", "Night")}</option></select></label>
              </div>
              <label>{L("Luogo", "Place")}<input value={momentLocation(selected.moment)} onChange={event => updateSelected("location", event.target.value)} /></label>
              <label>{L("Perché è nel viaggio", "Why it is in the trip")}<textarea value={momentWhy(selected.moment)} onChange={event => updateSelected("why", event.target.value)} /></label>
              <div className="mrs-inspector-actions">
                <button onClick={toggleLock}>{locks.has(lockKey(selection, selected.moment)) ? <><Unlock size={14} />{L("Sblocca", "Unlock")}</> : <><Lock size={14} />{L("Blocca", "Lock")}</>}</button>
                <button onClick={duplicateSelected}><Copy size={14} />{L("Duplica", "Duplicate")}</button>
                <button className="danger" onClick={removeSelected}><Trash2 size={14} />{L("Elimina", "Delete")}</button>
              </div>
              <button className="mrs-open-trip" onClick={() => setLocation(`/itinerary/${selected.board.sourceId}`)}>{L("Apri itinerario completo", "Open full itinerary")}<ChevronRight size={15} /></button>
            </div>
          ) : (
            <div className="mrs-inspector-empty"><Minus size={24} /><h3>{L("Seleziona una tappa", "Select a stop")}</h3><p>{L("Qui potrai modificare contenuto, orario, luogo e motivazione senza lasciare il canvas.", "Here you can edit content, time, place and rationale without leaving the canvas.")}</p></div>
          )}
        </aside>
      </div>
    </div>
  );
}
