import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  DndContext, DragOverlay, PointerSensor, closestCorners,
  useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, Bot, Check, ChevronRight, CircleGauge, Coffee,
  Copy, Eye, Footprints, GripVertical, Hotel, Layers3, LayoutGrid,
  ListTree, Lock, MapPin, MessageCircle, PanelLeftClose,
  PanelRightClose, Plane, Plus, Redo2, Route, Save, Sparkles, Trash2,
  Unlock, Utensils, X, ZoomIn, ZoomOut,
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
type ViewMode = "flow" | "board";
type LibraryTab = "trips" | "tools";
type MomentTemplate = "transport" | "accommodation" | "food" | "experience" | "walk" | "view" | "rest";
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
const momentType = (moment: any): MomentTemplate => moment?.type ?? "experience";

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
  if (field === "type") next.type = value;
  return next;
}

function createMoment(trip: RawTrip, day: any, it: boolean, template: MomentTemplate = "experience") {
  const id = `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const titles: Record<MomentTemplate, [string, string]> = {
    transport: ["Nuovo spostamento", "New transfer"],
    accommodation: ["Nuovo alloggio", "New stay"],
    food: ["Nuova sosta gastronomica", "New food stop"],
    experience: ["Nuova esperienza", "New experience"],
    walk: ["Nuova esplorazione", "New walk"],
    view: ["Nuovo punto panoramico", "New viewpoint"],
    rest: ["Tempo libero", "Free time"],
  };
  const title = titles[template][it ? 0 : 1];
  if (trip.schemaVersion === 2 || Array.isArray(day?.moments)) {
    return {
      id, type: template, time_label: template === "food" ? "lunch" : "afternoon",
      title_operational: title,
      title_evocative: title,
      image_url: "", image_alt: "", description: "", why_this: "",
    };
  }
  return { id, type: template, title, desc: "", band: template === "food" ? "pranzo" : "pomeriggio", t: it ? "Pomeriggio" : "Afternoon", ic: "" };
}

function tripQuality(trip: RawTrip) {
  const days = trip.days ?? [];
  const moments = days.flatMap(momentsOf);
  if (!moments.length) return { score: 8, gaps: days.length, label: "empty" };
  const checks = moments.flatMap(moment => [
    momentTitle(moment).length > 4,
    momentDescription(moment).length > 20,
    momentLocation(moment).length > 2,
    momentWhy(moment).length > 12,
    Boolean(momentTime(moment)),
  ]);
  const populatedDays = days.filter(day => momentsOf(day).length > 0).length;
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 82 + (populatedDays / Math.max(days.length, 1)) * 18);
  return { score, gaps: checks.filter(value => !value).length + (days.length - populatedDays), label: score >= 80 ? "strong" : score >= 55 ? "growing" : "draft" };
}

function lockKey(selection: Selection, moment: any) {
  return `${selection.boardKey}:${momentId(moment, selection.momentIndex)}`;
}

function MomentIcon({ type, size = 14 }: { type: MomentTemplate; size?: number }) {
  if (type === "transport") return <Plane size={size} />;
  if (type === "accommodation") return <Hotel size={size} />;
  if (type === "food") return <Utensils size={size} />;
  if (type === "walk") return <Footprints size={size} />;
  if (type === "view") return <Eye size={size} />;
  if (type === "rest") return <Coffee size={size} />;
  return <Sparkles size={size} />;
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
      className={`mrs-moment type-${momentType(moment)}${selected ? " selected" : ""}${drag.isDragging ? " dragging" : ""}${drop.isOver ? " over" : ""}`}
      style={{ transform: CSS.Translate.toString(drag.transform) }}
      onClick={onSelect}
    >
      <button className="mrs-grip" aria-label="Trascina tappa" {...drag.listeners} {...drag.attributes} disabled={locked}>
        {locked ? <Lock size={13} /> : <GripVertical size={14} />}
      </button>
      <div className="mrs-moment-copy">
        <div className="mrs-moment-meta"><span className="mrs-kind"><MomentIcon type={momentType(moment)} size={11} />{momentType(moment)}</span><span>{momentTime(moment) || momentBand(moment)}</span></div>
        <h4>{momentTitle(moment)}</h4>
        {momentLocation(moment) && <span className="mrs-place"><MapPin size={10} />{momentLocation(moment)}</span>}
        {momentDescription(moment) && <p>{momentDescription(moment)}</p>}
      </div>
      <ChevronRight size={14} className="mrs-moment-open" />
    </article>
  );
}

function DayColumn({ board, day, dayIndex, selection, locks, onSelect, onAdd, onRemove }: {
  board: BoardTrip;
  day: any;
  dayIndex: number;
  selection: Selection | null;
  locks: Set<string>;
  onSelect: (selection: Selection) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const drop = useDroppable({ id: `day:${board.key}:${dayIndex}`, data: { kind: "day", boardKey: board.key, dayIndex } satisfies DropPayload });
  const moments = momentsOf(day);
  return (
    <section ref={drop.setNodeRef} className={`mrs-day${drop.isOver ? " over" : ""}`}>
      <header className="mrs-day-head">
        <span>{String(dayNumber(day, dayIndex)).padStart(2, "0")}</span>
        <div><h3>{dayTitle(day, dayIndex)}</h3><p>{moments.length} {moments.length === 1 ? "tappa" : "tappe"}</p></div>
        <button onClick={onRemove} aria-label="Rimuovi giorno"><Trash2 size={12} /></button>
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
  const [activeBoardKey, setActiveBoardKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [locks, setLocks] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [activeDrag, setActiveDrag] = useState<any>(null);
  const [command, setCommand] = useState("");
  const [commandNote, setCommandNote] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("flow");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("trips");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [newTrip, setNewTrip] = useState({ destinationName: "", country: "", dayCount: 5, startDate: "" });
  const history = useRef<BoardTrip[][]>([]);
  const commandRef = useRef<HTMLInputElement>(null);
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
  const activeBoard = selected?.board ?? boards.find(board => board.key === activeBoardKey) ?? boards[0] ?? null;
  const activeQuality = activeBoard ? tripQuality(activeBoard.data) : null;

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

  const addMoment = (boardKey: string, dayIndex: number, template: MomentTemplate = "experience") => {
    pushHistory();
    mutateBoard(boardKey, board => {
      const day = board.data.days?.[dayIndex];
      if (!day) return;
      const moments = [...momentsOf(day), createMoment(board.data, day, it, template)];
      setMoments(day, moments, board.data.schemaVersion === 2);
      setSelection({ boardKey, dayIndex, momentIndex: moments.length - 1 });
    });
  };

  const addDay = (boardKey: string) => {
    pushHistory();
    mutateBoard(boardKey, board => {
      const days = board.data.days ?? [];
      const nextNumber = days.length + 1;
      days.push({
        day_number: nextNumber,
        role: "esplorazione",
        arc: "",
        title_evocative: L(`Giorno ${nextNumber}`, `Day ${nextNumber}`),
        subtitle: L("Da costruire", "Ready to shape"),
        hero_image_url: "",
        energy_level: "medium",
        cost_bookable_total: 0,
        cost_onsite_estimate: 0,
        moments: [],
      });
      board.data.days = days;
    });
  };

  const removeDay = (boardKey: string, dayIndex: number) => {
    const board = boards.find(item => item.key === boardKey);
    if (!board || (board.data.days?.length ?? 0) <= 1) return;
    if (!window.confirm(L("Rimuovere questo giorno e tutte le sue tappe?", "Remove this day and all its stops?"))) return;
    pushHistory();
    mutateBoard(boardKey, draft => {
      draft.data.days = (draft.data.days ?? []).filter((_, index) => index !== dayIndex).map((day, index) => ({
        ...day,
        day_number: index + 1,
      }));
    });
    setSelection(null);
  };

  const addTemplate = (template: MomentTemplate) => {
    if (!activeBoard) return;
    const dayIndex = selection?.boardKey === activeBoard.key ? selection.dayIndex : 0;
    addMoment(activeBoard.key, dayIndex, template);
  };

  const useAiRecipe = (italian: string, english: string) => {
    setCommand(L(italian, english));
    setCommandNote(L("Richiesta pronta: puoi personalizzarla prima di inviarla.", "Request ready: you can customize it before sending."));
    requestAnimationFrame(() => commandRef.current?.focus());
  };

  const createBlankTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newTrip.destinationName.trim().length < 2) return;
    setCreatingTrip(true);
    try {
      const response = await fetch("/api/studio/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newTrip, lang }),
      });
      if (!response.ok) throw new Error("create");
      const created = normalizeTrip(await response.json());
      const board = { key: `trip-${created.id}`, sourceId: created.id, label: created.destinationName ?? L("Nuovo viaggio", "New trip"), variant: false, data: clone(created) };
      setLibrary(previous => [created, ...previous]);
      setBoards(previous => [board, ...previous]);
      setActiveBoardKey(board.key);
      setNewTripOpen(false);
      setNewTrip({ destinationName: "", country: "", dayCount: 5, startDate: "" });
      setLibraryTab("tools");
      toast({ title: L("Nuovo itinerario creato", "New itinerary created"), description: L("Ora puoi costruirlo manualmente o con il Companion.", "You can now build it manually or with Companion.") });
    } catch {
      toast({ title: L("Creazione non riuscita", "Creation failed"), variant: "destructive" });
    } finally {
      setCreatingTrip(false);
    }
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
    const key = `trip-${trip.id}`;
    setBoards(previous => [...previous, { key, sourceId: trip.id, label: trip.destinationName ?? "Viaggio", variant: false, data: clone(trip) }]);
    setActiveBoardKey(key);
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
    setActiveBoardKey(next.key);
    markDirty(next.key);
  };

  const removeBoard = (key: string) => {
    setBoards(previous => previous.filter(board => board.key !== key));
    setDirty(previous => { const next = new Set(previous); next.delete(key); return next; });
    if (selection?.boardKey === key) setSelection(null);
    if (activeBoardKey === key) setActiveBoardKey(null);
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

  return (
    <div className="mrs-page">
      <header className="mrs-topbar">
        <div className="mrs-brand">
          <button onClick={() => setLocation("/my-account")} aria-label={L("Torna ai viaggi", "Back to trips")}><ArrowLeft size={17} /></button>
          <FlowNavLogo size={26} />
          <div><strong>MindRoute Studio</strong><span>Travel Canvas · Beta</span></div>
        </div>
        <div className="mrs-top-actions">
          <button className="mrs-new-top" onClick={() => setNewTripOpen(true)}><Plus size={15} />{L("Nuovo itinerario", "New itinerary")}</button>
          <button onClick={undo} disabled={!historySize}><Redo2 size={15} />{L("Annulla", "Undo")}</button>
          <div className="mrs-zoom">
            <button onClick={() => setZoom(value => Math.max(.7, +(value - .1).toFixed(1)))} aria-label="Zoom out"><ZoomOut size={15} /></button>
            <span>{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(value => Math.min(1.2, +(value + .1).toFixed(1)))} aria-label="Zoom in"><ZoomIn size={15} /></button>
          </div>
          <LangDropdown variant="dark" />
        </div>
      </header>

      <div className={`mrs-shell${leftOpen ? "" : " left-closed"}${rightOpen ? "" : " right-closed"}`}>
        {leftOpen && <aside className="mrs-library">
          <button className="mrs-new-project" onClick={() => setNewTripOpen(true)}><Plus size={16} /><span><strong>{L("Crea da zero", "Create from scratch")}</strong><small>{L("Un documento vuoto, già pronto", "A blank, ready document")}</small></span></button>
          <div className="mrs-side-tabs">
            <button className={libraryTab === "trips" ? "on" : ""} onClick={() => setLibraryTab("trips")}><Layers3 size={13} />{L("Viaggi", "Trips")}</button>
            <button className={libraryTab === "tools" ? "on" : ""} onClick={() => setLibraryTab("tools")}><Sparkles size={13} />{L("Strumenti", "Tools")}</button>
          </div>

          {libraryTab === "trips" ? <>
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
              {!library.length && <p className="mrs-library-empty">{L("Non hai ancora viaggi. Creane uno da zero.", "You have no trips yet. Create one from scratch.")}</p>}
            </div>
            <div className="mrs-library-tip"><Sparkles size={15} /><p>{L("Metti due viaggi sul canvas per confrontarli o duplica un frame per creare una variante.", "Place two trips on the canvas to compare them, or duplicate a frame to create a variant.")}</p></div>
          </> : <div className="mrs-tools-panel">
            <section>
              <span className="mrs-tool-label">{L("Struttura", "Structure")}</span>
              <button className="mrs-tool-wide" disabled={!activeBoard} onClick={() => activeBoard && addDay(activeBoard.key)}><Plus size={14} /><span><strong>{L("Aggiungi giorno", "Add day")}</strong><small>{L("Estendi il ritmo del viaggio", "Extend the trip rhythm")}</small></span></button>
            </section>
            <section>
              <span className="mrs-tool-label">{L("Aggiungi una tappa", "Add a stop")}</span>
              <div className="mrs-template-grid">
                {([
                  ["transport", L("Spostamento", "Transfer")], ["accommodation", L("Alloggio", "Stay")],
                  ["food", L("Cibo", "Food")], ["experience", L("Esperienza", "Experience")],
                  ["walk", L("Esplora", "Explore")], ["view", L("Panorama", "View")],
                  ["rest", L("Pausa", "Rest")],
                ] as [MomentTemplate, string][]).map(([type, label]) => (
                  <button key={type} disabled={!activeBoard} onClick={() => addTemplate(type)}><MomentIcon type={type} /><span>{label}</span></button>
                ))}
              </div>
              <p className="mrs-tool-help">{L("La tappa entra nel giorno selezionato, oppure nel primo giorno.", "The stop is added to the selected day, or to day one.")}</p>
            </section>
            <section>
              <span className="mrs-tool-label">{L("Regia AI", "AI direction")}</span>
              <div className="mrs-ai-recipes">
                <button onClick={() => useAiRecipe("Bilancia il ritmo tra giorni intensi e momenti di recupero", "Balance intense days with recovery time")}>{L("Bilancia il ritmo", "Balance rhythm")}</button>
                <button onClick={() => useAiRecipe("Riduci gli spostamenti e raggruppa le tappe per zona", "Reduce transfers and group stops by area")}>{L("Riduci spostamenti", "Reduce transfers")}</button>
                <button onClick={() => useAiRecipe("Rendi ogni tappa più chiara: cosa è, dove si trova e perché vale la pena", "Make every stop clearer: what it is, where it is and why it matters")}>{L("Completa il contesto", "Complete context")}</button>
              </div>
            </section>
            {activeQuality && <section className="mrs-quality-mini">
              <div><CircleGauge size={17} /><span><strong>{activeQuality.score}%</strong><small>{L("completezza", "completeness")}</small></span></div>
              <div className="mrs-quality-track"><span style={{ width: `${activeQuality.score}%` }} /></div>
              <p>{activeQuality.gaps ? L(`${activeQuality.gaps} dettagli ancora da completare.`, `${activeQuality.gaps} details still need work.`) : L("Il piano è completo e leggibile.", "The plan is complete and readable.")}</p>
            </section>}
          </div>}
        </aside>}

        <main className="mrs-canvas-main">
          <div className="mrs-canvas-toolbar">
            <div className="mrs-toolbar-title"><span>{L("Workspace", "Workspace")}</span><strong>{L("Il mio spazio viaggi", "My travel space")}</strong></div>
            <div className="mrs-view-switch">
              <button className={viewMode === "flow" ? "on" : ""} onClick={() => setViewMode("flow")}><ListTree size={14} />{L("Flow", "Flow")}</button>
              <button className={viewMode === "board" ? "on" : ""} onClick={() => setViewMode("board")}><LayoutGrid size={14} />{L("Board", "Board")}</button>
            </div>
            <div className="mrs-panel-switches">
              <button className={leftOpen ? "on" : ""} onClick={() => setLeftOpen(value => !value)} aria-label={L("Mostra strumenti", "Show tools")}><PanelLeftClose size={15} /></button>
              <button className={rightOpen ? "on" : ""} onClick={() => setRightOpen(value => !value)} aria-label={L("Mostra inspector", "Show inspector")}><PanelRightClose size={15} /></button>
            </div>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            <div className="mrs-canvas-scroll">
              <div className="mrs-canvas-stage" style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}>
                {boards.map(board => (
                  <section className={`mrs-trip-frame ${viewMode}${activeBoard?.key === board.key ? " active" : ""}`} key={board.key} onMouseDown={() => setActiveBoardKey(board.key)}>
                    <header className="mrs-frame-head">
                      <div className="mrs-frame-title">
                        <span className={board.variant ? "variant" : ""}>{board.variant ? L("Variante", "Variant") : L("Itinerario", "Itinerary")}</span>
                        <h2>{board.label}</h2>
                        <p>{board.data.whyYours || L("Un viaggio da costruire intorno a te.", "A trip to shape around you.")}</p>
                      </div>
                      <div className="mrs-frame-actions">
                        <span className={`mrs-quality-badge ${tripQuality(board.data).label}`}><CircleGauge size={12} />{tripQuality(board.data).score}%</span>
                        {dirty.has(board.key) && <span className="mrs-unsaved">{L("Bozza modificata", "Draft changed")}</span>}
                        <button onClick={() => addDay(board.key)}><Plus size={14} />{L("Giorno", "Day")}</button>
                        <button onClick={() => duplicateBoard(board)}><Copy size={14} />{L("Duplica", "Duplicate")}</button>
                        <button className="save" onClick={() => saveBoard(board)} disabled={!dirty.has(board.key) || saving === board.key}><Save size={14} />{saving === board.key ? L("Salvo…", "Saving…") : board.variant ? L("Applica variante", "Apply variant") : L("Salva", "Save")}</button>
                        <button className="icon" onClick={() => removeBoard(board.key)} aria-label={L("Rimuovi dal canvas", "Remove from canvas")}><X size={15} /></button>
                      </div>
                    </header>
                    <div className={`mrs-days ${viewMode}`} style={{ minWidth: Math.max(viewMode === "flow" ? 680 : 760, (board.data.days?.length ?? 0) * (viewMode === "flow" ? 320 : 248)) }}>
                      {(board.data.days ?? []).map((day, dayIndex) => (
                        <DayColumn
                          key={`${board.key}-${dayNumber(day, dayIndex)}`}
                          board={board}
                          day={day}
                          dayIndex={dayIndex}
                          selection={selection}
                          locks={locks}
                          onSelect={next => { setSelection(next); setActiveBoardKey(board.key); }}
                          onAdd={() => addMoment(board.key, dayIndex)}
                          onRemove={() => removeDay(board.key, dayIndex)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
                {!boards.length && <div className="mrs-canvas-empty"><Route size={28} /><span>{L("Nuovo workspace", "New workspace")}</span><h2>{L("Inizia da una destinazione, non da un template.", "Start with a destination, not a template.")}</h2><p>{L("Crea un itinerario vuoto oppure apri un viaggio esistente. Poi usa giorni, tappe e Companion per dargli forma.", "Create a blank itinerary or open an existing trip. Then shape it with days, stops and Companion.")}</p><button onClick={() => setNewTripOpen(true)}><Plus size={15} />{L("Crea itinerario", "Create itinerary")}</button></div>}
              </div>
            </div>
            <DragOverlay>{activeDrag ? <div className="mrs-drag-overlay"><GripVertical size={14} /><strong>{momentTitle(activeDrag)}</strong></div> : null}</DragOverlay>
          </DndContext>

          <form className="mrs-command" onSubmit={openCompanion}>
            <Bot size={18} />
            <div><label htmlFor="studio-command">{selected ? L(`Chiedi all'AI su “${momentTitle(selected.moment)}”`, `Ask AI about “${momentTitle(selected.moment)}”`) : L("Chiedi all'AI sul viaggio", "Ask AI about the trip")}</label><input ref={commandRef} id="studio-command" value={command} onChange={event => setCommand(event.target.value)} placeholder={L("Es. Rendilo più lento, conserva la cena e riduci gli spostamenti…", "E.g. Make it slower, keep dinner and reduce transfers…")} /></div>
            <button type="submit" disabled={!command.trim()}><MessageCircle size={16} />{L("Apri Companion", "Open Companion")}</button>
            {commandNote && <p>{commandNote}</p>}
          </form>
        </main>

        {rightOpen && <aside className="mrs-inspector">
          <div className="mrs-panel-title"><MapPin size={16} /><div><strong>{L("Inspector", "Inspector")}</strong><span>{selected ? L("Tappa selezionata", "Selected stop") : L("Nessuna selezione", "No selection")}</span></div></div>
          {selected && selection ? (
            <div className="mrs-inspector-body">
              <div className="mrs-selection-path"><span>{selected.board.label}</span><ChevronRight size={12} /><span>{L("Giorno", "Day")} {dayNumber(selected.day, selection.dayIndex)}</span></div>
              <label>{L("Tipo di tappa", "Stop type")}<select value={momentType(selected.moment)} onChange={event => updateSelected("type", event.target.value)}><option value="transport">{L("Spostamento", "Transfer")}</option><option value="accommodation">{L("Alloggio", "Stay")}</option><option value="food">{L("Cibo", "Food")}</option><option value="experience">{L("Esperienza", "Experience")}</option><option value="walk">{L("Esplorazione", "Explore")}</option><option value="view">{L("Panorama", "View")}</option><option value="rest">{L("Pausa", "Rest")}</option></select></label>
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
            <div className="mrs-inspector-empty"><CircleGauge size={25} /><h3>{activeBoard ? L("Regia del viaggio", "Trip direction") : L("Nessuna selezione", "No selection")}</h3>{activeBoard && activeQuality ? <><div className="mrs-quality-large"><strong>{activeQuality.score}</strong><span>%</span></div><p>{L("Completezza del piano: valuta chiarezza, luogo, orario e motivazione di ogni tappa.", "Plan completeness: it checks clarity, place, time and rationale for every stop.")}</p><div className="mrs-quality-track"><span style={{ width: `${activeQuality.score}%` }} /></div><button onClick={() => setLibraryTab("tools")}>{L("Apri strumenti", "Open tools")}<ChevronRight size={14} /></button></> : <p>{L("Apri o crea un viaggio per iniziare a costruirlo.", "Open or create a trip to start shaping it.")}</p>}</div>
          )}
        </aside>}
      </div>

      {newTripOpen && <div className="mrs-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setNewTripOpen(false); }}>
        <form className="mrs-new-modal" onSubmit={createBlankTrip}>
          <button type="button" className="mrs-modal-close" onClick={() => setNewTripOpen(false)} aria-label={L("Chiudi", "Close")}><X size={17} /></button>
          <span className="mrs-modal-kicker">{L("Nuovo documento", "New document")}</span>
          <h2>{L("Da dove vuoi iniziare?", "Where do you want to begin?")}</h2>
          <p>{L("Creiamo solo la struttura. Destinazione, giorni e date restano completamente modificabili attraverso lo Studio e il Companion.", "We only create the structure. Destination, days and dates remain fully editable through Studio and Companion.")}</p>
          <label>{L("Destinazione", "Destination")}<input autoFocus value={newTrip.destinationName} onChange={event => setNewTrip(previous => ({ ...previous, destinationName: event.target.value }))} placeholder={L("Es. Kyoto, Giappone", "E.g. Kyoto, Japan")} required minLength={2} /></label>
          <div className="mrs-modal-row">
            <label>{L("Paese o area", "Country or area")}<input value={newTrip.country} onChange={event => setNewTrip(previous => ({ ...previous, country: event.target.value }))} placeholder={L("Opzionale", "Optional")} /></label>
            <label>{L("Numero di giorni", "Number of days")}<input type="number" min={1} max={30} value={newTrip.dayCount} onChange={event => setNewTrip(previous => ({ ...previous, dayCount: Math.max(1, Math.min(30, Number(event.target.value) || 1)) }))} /></label>
          </div>
          <label>{L("Data di partenza", "Start date")}<input type="date" value={newTrip.startDate} onChange={event => setNewTrip(previous => ({ ...previous, startDate: event.target.value }))} /></label>
          <div className="mrs-modal-note"><Sparkles size={15} /><span>{L("Nessun costo AI: il documento nasce vuoto. Sarai tu a decidere quando coinvolgere il Companion.", "No AI cost: the document starts blank. You decide when to involve Companion.")}</span></div>
          <button className="mrs-modal-submit" type="submit" disabled={creatingTrip || newTrip.destinationName.trim().length < 2}>{creatingTrip ? L("Creo il workspace…", "Creating workspace…") : L("Crea e apri nel canvas", "Create and open in canvas")}<ChevronRight size={16} /></button>
        </form>
      </div>}
    </div>
  );
}
