import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ReactFlow, ReactFlowProvider, Background, MiniMap,
  SelectionMode, addEdge, useEdgesState, useNodesState,
  type Edge, type Node, type NodeChange, type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle, BoxSelect, Check, CheckCircle2, ChevronDown, ChevronRight,
  CalendarDays, CircleHelp, ClipboardList, Compass, Copy, Euro, FileCheck2, Gauge, GripVertical, Hand,
  Image as ImageIcon, Instagram, Layers3, Link2, Maximize2,
  Map as MapIcon, MessageCircleQuestion, MoreHorizontal, MousePointer2, MoveRight, PanelRightClose,
  Plane, Plus, Redo2, Save, Share2, Sparkles, StickyNote, Trash2, Undo2, UserRound, X,
  ZoomIn, ZoomOut,
} from "lucide-react";
import { FlowNavLogo } from "@/components/FlowNav";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import "@/styles/travel-studio.css";

const RouteMap = lazy(() => import("@/components/RouteMap"));

type RawTrip = {
  id: number;
  schemaVersion?: number;
  destinationName?: string;
  country?: string;
  heroImageUrl?: string;
  whyYours?: string;
  tripSummary?: string;
  budgetSummary?: string;
  highlights?: string[];
  days?: any[];
  tripMeta?: Record<string, any>;
};

type StudioView = "plan" | "map" | "control";
type StartMode = "menu" | "destination" | "blank" | "import";
type ObjectKind =
  | "trip" | "day" | "place" | "note" | "question" | "photo" | "booking"
  | "budget" | "map" | "mood" | "maybe" | "social" | "proposal" | "group";
type ObjectStatus = "idea" | "chosen" | "booked";
type TravelNodeData = Record<string, any> & {
  kind: ObjectKind;
  title: string;
  text?: string;
  status?: ObjectStatus;
  image?: string;
  dayIndex?: number;
};
type TravelNode = Node<TravelNodeData>;
type CanvasDoc = { version: number; nodes: TravelNode[]; edges: Edge[]; updatedAt?: string };
const STUDIO_GUIDE_KEY = "mindroute-studio-guide-seen-v1";

const clone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const dayNumber = (day: any, index: number) => day?.day_number ?? day?.dayNumber ?? index + 1;
const dayTitle = (day: any, index: number) => day?.title_evocative ?? day?.title ?? `Giorno ${dayNumber(day, index)}`;
const momentsOf = (day: any): any[] => Array.isArray(day?.moments) ? day.moments : Array.isArray(day?.editedMoments) ? day.editedMoments : [];
const momentTitle = (moment: any) => moment?.title_operational ?? moment?.title_evocative ?? moment?.title ?? "Tappa";
const momentTime = (moment: any) => moment?.start_time ?? moment?.startTime ?? moment?.time_label ?? moment?.band ?? "";
const momentPlace = (moment: any) => moment?.location_name ?? moment?.locationName ?? "";
const momentImage = (moment: any) => moment?.image_url ?? moment?.imageUrl ?? "";
const momentDescription = (moment: any) => moment?.description_short ?? moment?.description ?? moment?.desc ?? "";
const momentCost = (moment: any) => Number(moment?.cost_max ?? moment?.cost_min ?? moment?.cost ?? 0) || 0;

function budgetData(trip: RawTrip) {
  const bookable = Number(trip.tripMeta?.total_cost_bookable ?? 0) || 0;
  const onsite = Number(trip.tripMeta?.total_cost_onsite_estimate ?? 0) || 0;
  const moments = (trip.days ?? []).flatMap(momentsOf);
  const fallback = moments.reduce((sum, moment) => sum + momentCost(moment), 0);
  const total = Math.round(bookable + onsite || fallback);
  const categories = [
    { label: "Prenotabile", value: Math.round(bookable), color: "#E86B52" },
    { label: "In loco", value: Math.round(onsite), color: "#73A39A" },
    { label: "Da definire", value: Math.max(0, Math.round(fallback - bookable - onsite)), color: "#D3A65A" },
  ].filter(item => item.value > 0);
  const suggestedTarget = Math.ceil(Math.max(total * 1.12, total + 200) / 100) * 100;
  return { total, target: Number(trip.tripMeta?.studio_budget_target ?? suggestedTarget) || suggestedTarget, categories };
}

function mapPoints(trip: RawTrip) {
  const metaPoints = Array.isArray(trip.tripMeta?.map_points) ? trip.tripMeta!.map_points : [];
  const momentPoints = (trip.days ?? []).flatMap((day, dayIndex) => momentsOf(day).flatMap(moment => {
    const lat = Number(moment?.location_lat ?? moment?.lat);
    const lng = Number(moment?.location_lng ?? moment?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng)
      ? [{ day: dayIndex + 1, lat, lng, label: momentPlace(moment) || momentTitle(moment) }]
      : [];
  }));
  const all = [...metaPoints, ...momentPoints];
  return all.filter((point, index) => all.findIndex(other => Math.abs(Number(other.lat) - Number(point.lat)) < .0001 && Math.abs(Number(other.lng) - Number(point.lng)) < .0001) === index);
}

function routePoints(trip: RawTrip) {
  return mapPoints(trip).map((point: any, index) => ({
    ...point,
    label: point.label || `Tappa ${index + 1}`,
    day: Number(point.day ?? 1),
    category: point.category ?? "custom",
  }));
}

function rhythmData(trip: RawTrip) {
  return (trip.days ?? []).map((day, index) => {
    const moments = momentsOf(day);
    const transfers = moments.filter(moment => /transport|transfer|train|flight|ferry|bus/i.test(String(moment?.type ?? ""))).length;
    const intensity = Math.min(100, moments.length * 17 + transfers * 12);
    return { index, title: dayTitle(day, index), count: moments.length, transfers, intensity };
  });
}

function ambientImages(trip: RawTrip) {
  const images = [
    ...(Array.isArray(trip.tripMeta?.ambient) ? trip.tripMeta!.ambient : []),
    trip.heroImageUrl,
    ...(trip.days ?? []).flatMap(day => [day?.hero_image_url, ...momentsOf(day).map(momentImage)]),
  ].filter((value): value is string => typeof value === "string" && value.length > 4);
  return Array.from(new Set(images)).slice(0, 6);
}

function inspirationMeta(url: string) {
  const clean = url.trim();
  const instagram = clean.match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/i);
  if (instagram) return { provider: "Instagram", embedUrl: `https://www.instagram.com/${instagram[1]}/${instagram[2]}/embed/captioned/` };
  const tiktok = clean.match(/tiktok\.com\/.*\/video\/(\d+)/i);
  if (tiktok) return { provider: "TikTok", embedUrl: `https://www.tiktok.com/player/v1/${tiktok[1]}?description=1` };
  try { return { provider: new URL(clean).hostname.replace(/^www\./, ""), embedUrl: "" }; }
  catch { return { provider: "Web", embedUrl: "" }; }
}

function updateMomentFields(moment: any, patch: Record<string, any>) {
  return {
    ...moment,
    ...(patch.title !== undefined ? { title: patch.title, title_operational: patch.title } : {}),
    ...(patch.time !== undefined ? { start_time: patch.time, t: patch.time } : {}),
    ...(patch.place !== undefined ? { location_name: patch.place } : {}),
    ...(patch.image !== undefined ? { image_url: patch.image } : {}),
    ...(patch.description !== undefined ? { description_short: patch.description, desc: patch.description } : {}),
  };
}

function dayNodeData(trip: RawTrip, day: any, index: number): TravelNodeData {
  const moments = momentsOf(day);
  return {
    kind: "day",
    title: dayTitle(day, index),
    eyebrow: `Giorno ${dayNumber(day, index)}`,
    dayIndex: index,
    subtitle: day?.subtitle ?? day?.energy_note ?? "",
    image: day?.hero_image_url || moments.map(momentImage).find(Boolean) || trip.heroImageUrl || "",
    moments: moments.map(moment => ({
      ...moment,
      title: momentTitle(moment), time: momentTime(moment), place: momentPlace(moment),
      image: momentImage(moment), description: momentDescription(moment), type: moment?.type ?? "experience",
    })),
    status: "chosen",
  };
}

function buildDefaultCanvas(trip: RawTrip, it: boolean): CanvasDoc {
  const days = trip.days ?? [];
  const images = ambientImages(trip);
  const points = mapPoints(trip);
  const budget = budgetData(trip);
  const dayStartX = 440;
  const nodes: TravelNode[] = [
    {
      id: "trip-overview", type: "travel", position: { x: 420, y: 40 },
      data: {
        kind: "trip", title: trip.destinationName ?? (it ? "Nuovo viaggio" : "New trip"),
        text: trip.whyYours ?? "", summary: trip.tripSummary ?? "", image: trip.heroImageUrl ?? images[0] ?? "",
        days: days.length, country: trip.country ?? "", status: "chosen",
      },
    },
    {
      id: "intent-note", type: "travel", position: { x: 80, y: 90 },
      data: {
        kind: "note",
        title: trip.tripMeta?.studio_import_source ? (it ? "Materiale importato" : "Imported material") : (it ? "Quello che conta" : "What matters"),
        text: trip.whyYours || trip.tripMeta?.studio_import_source || (it ? "Aggiungi qui desideri, confini e priorità." : "Add wishes, boundaries and priorities here."),
        status: "idea",
      },
    },
    {
      id: "moodboard", type: "travel", position: { x: 70, y: 310 },
      data: { kind: "mood", title: "Moodboard", images, status: "idea" },
    },
    {
      id: "trip-map", type: "travel", position: { x: 70, y: 660 },
      data: { kind: "map", title: it ? "Mappa del viaggio" : "Trip map", points, status: "chosen" },
    },
    {
      id: "trip-budget", type: "travel", position: { x: dayStartX + Math.min(days.length, 4) * 280 + 80, y: 610 },
      data: { kind: "budget", title: "Budget", ...budget, status: "idea" },
    },
    {
      id: "maybe-zone", type: "travel", position: { x: 440, y: 850 },
      data: { kind: "maybe", title: "Maybe", text: it ? "Idee e alternative che non entrano ancora nel piano." : "Ideas and alternatives not yet in the plan.", items: [], status: "idea" },
    },
  ];

  days.forEach((day, index) => {
    nodes.push({
      id: `day-${index}`, type: "travel", position: { x: dayStartX + index * 282, y: 330 },
      data: dayNodeData(trip, day, index),
    });
  });

  const edges: Edge[] = days.slice(1).map((_, index) => ({
    id: `route-${index}-${index + 1}`, source: `day-${index}`, target: `day-${index + 1}`,
    type: "smoothstep", animated: false, style: { stroke: "#2B2927", strokeWidth: 1.5 },
  }));
  return { version: 1, nodes, edges };
}

function mergeCanvasWithTrip(trip: RawTrip, stored: CanvasDoc | null, it: boolean): CanvasDoc {
  const fresh = buildDefaultCanvas(trip, it);
  if (!stored?.nodes?.length) return fresh;
  const freshById = new Map(fresh.nodes.map(node => [node.id, node]));
  const persistedIds = new Set(stored.nodes.map(node => node.id));
  const nodes = stored.nodes.map(node => {
    const semantic = freshById.get(node.id);
    return semantic ? { ...semantic, position: node.position, parentId: node.parentId, extent: node.extent, style: node.style } : node;
  });
  fresh.nodes.forEach(node => { if (!persistedIds.has(node.id)) nodes.push(node); });
  return { version: 1, nodes, edges: stored.edges?.length ? stored.edges : fresh.edges };
}

function NodeShell({ data, selected, children }: { data: TravelNodeData; selected: boolean; children: ReactNode }) {
  const status = data.status ?? "idea";
  return (
    <article className={`mr-cnode kind-${data.kind} status-${status}${selected ? " is-selected" : ""}`}>
      <span className="mr-card-hover-actions"><b>Apri</b><i><MoreHorizontal size={13} /></i><em><GripVertical size={13} /></em></span>
      {children}
    </article>
  );
}

function TravelCanvasNode({ data, selected }: NodeProps<TravelNode>) {
  if (data.kind === "group") return <div className={`mr-group-node${selected ? " is-selected" : ""}`}><span>{data.title}</span></div>;

  if (data.kind === "trip") return <NodeShell data={data} selected={selected}>
    <div className="mr-trip-hero" style={data.image ? { backgroundImage: `url(${data.image})` } : undefined} />
    <div className="mr-trip-copy"><span>{data.country || "MindRoute canvas"}</span><h1>{data.title}</h1><p>{data.days} giorni · {data.text || "Un viaggio ancora da costruire"}</p></div>
  </NodeShell>;

  if (data.kind === "day") return <NodeShell data={data} selected={selected}>
    <header className="mr-day-cover" style={data.image ? { backgroundImage: `url(${data.image})` } : undefined}>
      <span>{data.eyebrow}</span><h3>{data.title}</h3><p>{data.subtitle}</p>
    </header>
    <div className="mr-day-moments">
      {(data.moments ?? []).slice(0, 8).map((moment: any, index: number) => <div key={`${moment.title}-${index}`} className="mr-day-moment">
        {moment.image && <span style={{ backgroundImage: `url(${moment.image})` }} />}
        <div><small>{moment.time || moment.type}</small><strong>{moment.title}</strong>{moment.place && <em>{moment.place}</em>}</div>
      </div>)}
      {!data.moments?.length && <p className="mr-node-empty">Aggiungi le prime tappe</p>}
    </div>
  </NodeShell>;

  if (data.kind === "note") return <NodeShell data={data} selected={selected}><span className="mr-paper-pin" /><small>Nota</small><h3>{data.title}</h3><p>{data.text}</p></NodeShell>;
  if (data.kind === "question") return <NodeShell data={data} selected={selected}><CircleHelp size={20} /><small>Domanda aperta</small><h3>{data.title}</h3><p>{data.text}</p></NodeShell>;
  if (data.kind === "photo") return <NodeShell data={data} selected={selected}><div className="mr-photo-img" style={data.image ? { backgroundImage: `url(${data.image})` } : undefined}><ImageIcon size={22} /></div><h3>{data.title}</h3><p>{data.text}</p></NodeShell>;
  if (data.kind === "booking") return <NodeShell data={data} selected={selected}><div className="mr-booking-icon"><Plane size={20} /></div><small>{data.bookingType || "Prenotazione"}</small><h3>{data.title}</h3><p>{data.text}</p><span className="mr-status-chip">{data.status === "booked" ? "Confermato" : data.status === "chosen" ? "Scelto" : "Idea"}</span></NodeShell>;
  if (data.kind === "place") return <NodeShell data={data} selected={selected}><div className="mr-booking-icon"><MapIcon size={20} /></div><small>Luogo</small><h3>{data.title}</h3><p>{data.text}</p>{data.place && <span className="mr-place-chip">{data.place}</span>}</NodeShell>;

  if (data.kind === "budget") {
    const percentage = Math.min(100, Math.round((Number(data.total) / Math.max(Number(data.target), 1)) * 100));
    return <NodeShell data={data} selected={selected}><small>Budget</small><div className="mr-budget-body"><div className="mr-budget-ring" style={{ background: `conic-gradient(#E86B52 0 ${percentage}%,#E8E2D9 ${percentage}% 100%)` }}><span>€{data.total || 0}</span></div><div><h3>€{data.total || 0} / €{data.target || 0}</h3>{(data.categories ?? []).map((item: any) => <p key={item.label}><i style={{ background: item.color }} />{item.label}<strong>€{item.value}</strong></p>)}</div></div></NodeShell>;
  }

  if (data.kind === "map") return <NodeShell data={data} selected={selected}><small>Mappa del viaggio</small><div className="mr-mini-map"><svg viewBox="0 0 320 170" preserveAspectRatio="none"><path d="M28 124 C92 42 152 154 286 48" /><circle cx="72" cy="91" r="7" /><circle cx="160" cy="102" r="7" /><circle cx="259" cy="61" r="7" /></svg><span>{data.points?.length || 0} luoghi collegati</span></div></NodeShell>;
  if (data.kind === "mood") return <NodeShell data={data} selected={selected}><small>Moodboard</small><h3>{data.title}</h3><div className="mr-mood-grid">{(data.images ?? []).slice(0, 6).map((image: string, index: number) => <span key={`${image}-${index}`} style={{ backgroundImage: `url(${image})` }} />)}{!data.images?.length && <p>Aggiungi immagini che raccontano l'atmosfera.</p>}</div></NodeShell>;
  if (data.kind === "maybe") return <NodeShell data={data} selected={selected}><small>Maybe · idee / alternative</small><h3>{data.title}</h3><p>{data.text}</p><div className="mr-maybe-list">{(data.items ?? []).map((item: string, index: number) => <span key={`${item}-${index}`}>{item}</span>)}<span className="add">+ Aggiungi idea</span></div></NodeShell>;
  if (data.kind === "social") return <NodeShell data={data} selected={selected}>
    <div className="mr-social-source"><Instagram size={15} /><span>{data.provider || "Web"}</span><i>{data.assignedDay != null ? `Giorno ${Number(data.assignedDay) + 1}` : "Inbox"}</i></div>
    {data.embedUrl ? <iframe src={data.embedUrl} title={data.title} loading="lazy" allow="encrypted-media; picture-in-picture" /> : <div className="mr-social-placeholder"><Link2 size={20} /><span>Incolla il link nell'editor</span></div>}
    <h3>{data.title}</h3><p>{data.text}</p>
  </NodeShell>;
  if (data.kind === "proposal") return <NodeShell data={data} selected={selected}><Sparkles size={18} /><small>Proposta AI</small><h3>{data.title}</h3><p>{data.text}</p>{data.actions?.length ? <ul>{data.actions.map((action: string) => <li key={action}>{action}</li>)}</ul> : null}</NodeShell>;
  return <NodeShell data={data} selected={selected}><small>{data.kind}</small><h3>{data.title}</h3><p>{data.text}</p></NodeShell>;
}

const nodeTypes = { travel: TravelCanvasNode };

function parseStreamingEvent(buffer: string, onEvent: (event: string, data: any) => void) {
  const packets = buffer.split("\n\n");
  const rest = packets.pop() ?? "";
  packets.forEach(packet => {
    let event = "";
    let data = "";
    packet.split("\n").forEach(line => {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      if (line.startsWith("data: ")) data += line.slice(6);
    });
    if (event && data) { try { onEvent(event, JSON.parse(data)); } catch { /* ignore malformed packet */ } }
  });
  return rest;
}

function TravelStudioInner() {
  const [, setLocation] = useLocation();
  const [, routeParams] = useRoute("/studio/:id");
  const preferredTripId = routeParams?.id ? Number(routeParams.id) : undefined;
  const { lang, t } = useI18n();
  const { toast } = useToast();
  const it = lang === "it";
  const L = useCallback((italian: string, english: string) => it ? italian : english, [it]);
  const [library, setLibrary] = useState<RawTrip[]>([]);
  const [trip, setTrip] = useState<RawTrip | null>(null);
  const [nodes, setNodes] = useNodesState<TravelNode>([]);
  const [edges, setEdges] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<StudioView>("plan");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ nodes: TravelNode[]; edges: Edge[] }>>([]);
  const [futureHistory, setFutureHistory] = useState<Array<{ nodes: TravelNode[]; edges: Edge[] }>>([]);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [tripMenuOpen, setTripMenuOpen] = useState(false);
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [startMode, setStartMode] = useState<StartMode>("menu");
  const [blankTripForm, setBlankTripForm] = useState({ destinationName: "", country: "", days: 5 });
  const [importText, setImportText] = useState("");
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiActions, setAiActions] = useState<string[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem(STUDIO_GUIDE_KEY) !== "1");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadLibrary = useCallback(async (preferredId?: number) => {
    const response = await fetch(`/api/my-trips?lang=${lang}`);
    if (!response.ok) throw new Error("trips");
    const rows = await response.json() as RawTrip[];
    setLibrary(rows);
    const next = rows.find(item => item.id === preferredId) ?? rows[0] ?? null;
    if (next) {
      const doc = mergeCanvasWithTrip(next, next.tripMeta?.studio_canvas ?? null, it);
      setTrip(next); setNodes(doc.nodes); setEdges(doc.edges); setDirty(false); setSelectedIds([]);
    } else {
      setTrip(null); setNodes([]); setEdges([]);
    }
    return rows;
  }, [it, lang, setEdges, setNodes]);

  useEffect(() => {
    let cancelled = false;
    loadLibrary(preferredTripId).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadLibrary, preferredTripId]);

  const openTrip = (next: RawTrip) => {
    if (dirty && !window.confirm(L("Aprire un altro viaggio senza salvare le modifiche?", "Open another trip without saving changes?"))) return;
    const doc = mergeCanvasWithTrip(next, next.tripMeta?.studio_canvas ?? null, it);
    setTrip(next); setNodes(doc.nodes); setEdges(doc.edges); setDirty(false); setSelectedIds([]);
    setLocation(`/studio/${next.id}`);
  };

  const pushHistory = useCallback(() => {
    setHistory(previous => [...previous.slice(-19), { nodes: clone(nodes), edges: clone(edges) }]);
    setFutureHistory([]);
  }, [edges, nodes]);
  const canvasPayload = useCallback((): CanvasDoc => ({
    version: 1,
    nodes: nodes.map(node => ({
      id: node.id, type: node.type, position: node.position, data: node.data,
      ...(node.parentId ? { parentId: node.parentId, extent: node.extent } : {}),
      ...(node.style ? { style: node.style } : {}),
    })),
    edges: edges.map(edge => ({ id: edge.id, source: edge.source, target: edge.target, type: edge.type, label: typeof edge.label === "string" ? edge.label : undefined })),
  }), [edges, nodes]);

  const saveCanvas = useCallback(async (quiet = false) => {
    if (!trip || saving) return;
    setSaving(true);
    try {
      const payload = canvasPayload();
      const response = await fetch(`/api/studio/itineraries/${trip.id}/content`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationName: trip.destinationName, country: trip.country ?? null,
          heroImageUrl: trip.heroImageUrl ?? null, whyYours: trip.whyYours ?? "",
          tripSummary: trip.tripSummary ?? "", days: trip.days ?? [],
          tripMetaPatch: {
            total_cost_bookable: trip.tripMeta?.total_cost_bookable ?? 0,
            total_cost_onsite_estimate: trip.tripMeta?.total_cost_onsite_estimate ?? 0,
            studio_budget_target: trip.tripMeta?.studio_budget_target,
            studio_control: trip.tripMeta?.studio_control ?? {},
            studio_canvas: { ...payload, updatedAt: new Date().toISOString() },
          },
        }),
      });
      if (!response.ok) throw new Error("save");
      setDirty(false);
      setTrip(previous => previous ? { ...previous, tripMeta: { ...(previous.tripMeta ?? {}), studio_canvas: payload } } : previous);
      setLibrary(previous => previous.map(item => item.id === trip.id ? { ...item, tripMeta: { ...(item.tripMeta ?? {}), studio_canvas: payload } } : item));
      if (!quiet) toast({ title: L("Scrivania salvata", "Desk saved") });
    } catch {
      if (!quiet) toast({ title: L("Salvataggio non riuscito", "Save failed"), variant: "destructive" });
    } finally { setSaving(false); }
  }, [L, canvasPayload, saving, toast, trip]);

  useEffect(() => {
    if (!dirty || !trip) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveCanvas(true), 1800);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [dirty, saveCanvas, trip]);

  const undo = () => {
    const snapshot = history[history.length - 1];
    if (!snapshot) return;
    setFutureHistory(previous => [...previous.slice(-19), { nodes: clone(nodes), edges: clone(edges) }]);
    setNodes(snapshot.nodes); setEdges(snapshot.edges); setHistory(previous => previous.slice(0, -1)); setDirty(true);
  };

  const redo = () => {
    const snapshot = futureHistory[futureHistory.length - 1];
    if (!snapshot) return;
    setHistory(previous => [...previous.slice(-19), { nodes: clone(nodes), edges: clone(edges) }]);
    setNodes(snapshot.nodes); setEdges(snapshot.edges); setFutureHistory(previous => previous.slice(0, -1)); setDirty(true);
  };

  const addObject = (kind: Exclude<ObjectKind, "trip" | "day" | "budget" | "map" | "mood" | "proposal" | "group">) => {
    const existing = kind === "note"
      ? nodes.find(node => node.id === "intent-note")
      : kind === "maybe" ? nodes.find(node => node.data.kind === "maybe") : undefined;
    if (existing) {
      setView("plan"); setAddMenuOpen(false); setSelectedIds([existing.id]); setInspectorOpen(true);
      return;
    }
    pushHistory();
    setView("plan");
    setAddMenuOpen(false);
    const objectIndex = nodes.filter(node => node.data.kind === kind).length;
    const id = `${kind}-${Date.now().toString(36)}`;
    const defaults: Record<string, TravelNodeData> = {
      note: { kind, title: L("Nuova nota", "New note"), text: L("Scrivi qui un desiderio, un limite o un'intuizione.", "Write a wish, boundary or intuition here."), status: "idea" },
      place: { kind, title: L("Nuovo luogo", "New place"), text: L("Spiega perché vuoi inserirlo nel viaggio.", "Explain why you want it in the trip."), place: "", assignedDay: null, status: "idea" },
      question: { kind, title: L("Domanda aperta", "Open question"), text: L("Cosa dobbiamo ancora decidere?", "What do we still need to decide?"), status: "idea" },
      photo: { kind, title: L("Ispirazione", "Inspiration"), text: L("Perché questa immagine ti attrae?", "Why does this image pull you in?"), image: "", status: "idea" },
      booking: { kind, title: L("Nuova prenotazione", "New booking"), text: L("Aggiungi orario, riferimento e dettagli.", "Add time, reference and details."), bookingType: "Volo / hotel / attività", status: "idea" },
      maybe: { kind, title: "Maybe", text: L("Un'alternativa da valutare.", "An alternative to consider."), items: [], status: "idea" },
      social: { kind, title: L("Nuova ispirazione", "New inspiration"), text: L("Annota perché vale la pena ricordarla.", "Note why it is worth remembering."), url: "", provider: "Web", embedUrl: "", assignedDay: null, status: "idea" },
    };
    setNodes(previous => [...previous, { id, type: "travel", position: { x: 80 + objectIndex * 24, y: 80 + objectIndex * 24 }, data: defaults[kind] }]);
    setSelectedIds([id]); setInspectorOpen(true); setDirty(true);
  };

  const addDay = () => {
    if (!trip) return;
    pushHistory();
    const index = trip.days?.length ?? 0;
    const day = { day_number: index + 1, title: L(`Giorno ${index + 1}`, `Day ${index + 1}`), title_evocative: L(`Giorno ${index + 1}`, `Day ${index + 1}`), subtitle: "", moments: [] };
    const data = dayNodeData(trip, day, index);
    setTrip(previous => previous ? { ...previous, days: [...(previous.days ?? []), day] } : previous);
    setNodes(previous => [...previous, { id: `day-${index}`, type: "travel", position: { x: 440 + index * 282, y: 330 }, data }]);
    if (index > 0) setEdges(previous => [...previous, { id: `route-${index - 1}-${index}`, source: `day-${index - 1}`, target: `day-${index}`, type: "smoothstep", style: { stroke: "#2B2927", strokeWidth: 1.5 } }]);
    setView("plan"); setAddMenuOpen(false); setSelectedIds([`day-${index}`]); setInspectorOpen(true); setDirty(true);
  };

  const removeDay = (index: number) => {
    if (!trip || (trip.days?.length ?? 0) <= 1) return;
    if (!window.confirm(L(`Eliminare il giorno ${index + 1}?`, `Delete day ${index + 1}?`))) return;
    pushHistory();
    const nextDays = (trip.days ?? []).filter((_, dayIndex) => dayIndex !== index).map((day, dayIndex) => ({
      ...day,
      day_number: dayIndex + 1,
      dayNumber: dayIndex + 1,
    }));
    const nextTrip = { ...trip, days: nextDays };
    setTrip(nextTrip);
    setNodes(previous => [
      ...previous.filter(node => node.data.kind !== "day").map(node => node.data.kind === "trip" ? { ...node, data: { ...node.data, days: nextDays.length } } : node),
      ...nextDays.map((day, dayIndex) => ({ id: `day-${dayIndex}`, type: "travel", position: { x: 440 + dayIndex * 282, y: 330 }, data: dayNodeData(nextTrip, day, dayIndex) } as TravelNode)),
    ]);
    setEdges(nextDays.slice(1).map((_, dayIndex) => ({ id: `route-${dayIndex}-${dayIndex + 1}`, source: `day-${dayIndex}`, target: `day-${dayIndex + 1}`, type: "smoothstep" })));
    setSelectedIds([]); setInspectorOpen(false); setDirty(true);
  };

  const duplicateSelection = () => {
    if (!selectedNode || ["trip", "day", "map", "budget", "mood"].includes(selectedNode.data.kind)) return;
    pushHistory();
    const id = `${selectedNode.data.kind}-${Date.now().toString(36)}`;
    setNodes(previous => [...previous, { ...clone(selectedNode), id, selected: false, position: { x: selectedNode.position.x + 34, y: selectedNode.position.y + 34 } }]);
    setSelectedIds([id]); setContextMenu(null); setDirty(true);
  };

  const createStudioTrip = async () => {
    if (creatingTrip) return;
    const destinationName = blankTripForm.destinationName.trim()
      || (startMode === "blank" ? L("Viaggio senza titolo", "Untitled trip") : "");
    if (!destinationName || (startMode === "import" && !importText.trim())) return;
    setCreatingTrip(true);
    try {
      const response = await fetch("/api/studio/itineraries", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...blankTripForm,
          destinationName,
          days: startMode === "blank" ? Math.max(1, blankTripForm.days) : blankTripForm.days,
          startingMode: startMode === "menu" ? "destination" : startMode,
          ...(startMode === "import" ? { importText } : {}),
          lang,
        }),
      });
      if (!response.ok) throw new Error("create");
      const created = await response.json() as RawTrip;
      setNewTripOpen(false);
      setStartMode("menu");
      setBlankTripForm({ destinationName: "", country: "", days: 5 });
      setImportText("");
      await loadLibrary(created.id);
      setLocation(`/studio/${created.id}`);
      toast({ title: L("Viaggio creato. Ora costruiamolo insieme.", "Trip created. Now let's build it together.") });
    } catch {
      toast({ title: L("Creazione non riuscita", "Creation failed"), variant: "destructive" });
    } finally { setCreatingTrip(false); }
  };

  const updateControlFlag = (key: "documents_confirmed" | "risks_reviewed") => {
    setTrip(previous => previous ? {
      ...previous,
      tripMeta: {
        ...(previous.tripMeta ?? {}),
        studio_control: {
          ...(previous.tripMeta?.studio_control ?? {}),
          [key]: !previous.tripMeta?.studio_control?.[key],
        },
      },
    } : previous);
    setDirty(true);
  };

  const shareTrip = async () => {
    if (!trip) return;
    try {
      if (dirty) await saveCanvas(true);
      const response = await fetch(`/api/itinerary/${trip.id}/share`, { method: "POST" });
      if (!response.ok) throw new Error("share");
      const data = await response.json();
      if (navigator.share) await navigator.share({ title: trip.destinationName, url: data.url });
      else { await navigator.clipboard.writeText(data.url); toast({ title: L("Link copiato", "Link copied") }); }
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") toast({ title: L("Condivisione non riuscita", "Share failed"), variant: "destructive" });
    }
  };

  const deleteSelection = () => {
    const removable = selectedIds.filter(id => !id.startsWith("day-") && id !== "trip-overview");
    if (!removable.length) return;
    pushHistory();
    setNodes(previous => previous.filter(node => !removable.includes(node.id)));
    setEdges(previous => previous.filter(edge => !removable.includes(edge.source) && !removable.includes(edge.target)));
    setSelectedIds([]); setInspectorOpen(false); setDirty(true);
  };

  const groupSelection = () => {
    const selected = nodes.filter(node => selectedIds.includes(node.id) && !node.parentId);
    if (selected.length < 2) return;
    pushHistory();
    const minX = Math.min(...selected.map(node => node.position.x));
    const minY = Math.min(...selected.map(node => node.position.y));
    const maxX = Math.max(...selected.map(node => node.position.x + (node.measured?.width ?? 260)));
    const maxY = Math.max(...selected.map(node => node.position.y + (node.measured?.height ?? 200)));
    const groupId = `group-${Date.now().toString(36)}`;
    const group: TravelNode = {
      id: groupId, type: "travel", position: { x: minX - 28, y: minY - 45 },
      data: { kind: "group", title: L("Nuovo gruppo", "New group") },
      style: { width: maxX - minX + 56, height: maxY - minY + 73 }, zIndex: -1,
    };
    setNodes(previous => [group, ...previous.map(node => selectedIds.includes(node.id) ? {
      ...node, parentId: groupId, extent: "parent" as const,
      position: { x: node.position.x - minX + 28, y: node.position.y - minY + 45 },
    } : node)]);
    setSelectedIds([groupId]); setDirty(true);
  };

  const updateSelectedData = (patch: Partial<TravelNodeData>) => {
    setNodes(previous => previous.map(node => selectedIds.includes(node.id) ? { ...node, data: { ...node.data, ...patch } } : node));
    if (selectedNode?.data.kind === "trip") {
      setTrip(previous => previous ? {
        ...previous,
        ...(patch.title !== undefined ? { destinationName: patch.title } : {}),
        ...(patch.country !== undefined ? { country: patch.country } : {}),
        ...(patch.image !== undefined ? { heroImageUrl: patch.image } : {}),
        ...(patch.text !== undefined ? { whyYours: patch.text } : {}),
        ...(patch.summary !== undefined ? { tripSummary: patch.summary } : {}),
      } : previous);
    }
    if (selectedNode?.data.kind === "day" && selectedNode.data.dayIndex != null) {
      const index = Number(selectedNode.data.dayIndex);
      const nextData = { ...selectedNode.data, ...patch };
      setTrip(previous => previous ? { ...previous, days: (previous.days ?? []).map((day, dayIndex) => dayIndex === index ? {
        ...day,
        title: nextData.title,
        title_evocative: nextData.title,
        subtitle: nextData.subtitle ?? "",
        hero_image_url: nextData.image ?? "",
        ...(Array.isArray(day?.moments) ? { moments: nextData.moments ?? [] } : { editedMoments: nextData.moments ?? [] }),
      } : day) } : previous);
    }
    if (selectedNode?.data.kind === "budget") {
      setTrip(previous => previous ? { ...previous, tripMeta: {
        ...(previous.tripMeta ?? {}),
        ...(patch.bookable !== undefined ? { total_cost_bookable: Number(patch.bookable) || 0 } : {}),
        ...(patch.onsite !== undefined ? { total_cost_onsite_estimate: Number(patch.onsite) || 0 } : {}),
        ...(patch.target !== undefined ? { studio_budget_target: Number(patch.target) || 0 } : {}),
      } } : previous);
    }
    if (selectedNode?.data.kind === "mood" && patch.images !== undefined) {
      setTrip(previous => previous ? { ...previous, tripMeta: { ...(previous.tripMeta ?? {}), ambient: patch.images } } : previous);
    }
    setDirty(true);
  };

  const updateBudgetValue = (field: "bookable" | "onsite" | "target", value: number) => {
    const key = field === "bookable" ? "total_cost_bookable" : field === "onsite" ? "total_cost_onsite_estimate" : "studio_budget_target";
    setTrip(previous => {
      if (!previous) return previous;
      const next = { ...previous, tripMeta: { ...(previous.tripMeta ?? {}), [key]: Math.max(0, value || 0) } };
      const nextBudget = budgetData(next);
      setNodes(current => current.map(node => node.data.kind === "budget" ? { ...node, data: { ...node.data, ...nextBudget } } : node));
      return next;
    });
    setDirty(true);
  };

  const selectedNodes = useMemo(() => nodes.filter(node => selectedIds.includes(node.id)), [nodes, selectedIds]);
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const updateDayMoment = (momentIndex: number, patch: Record<string, any>) => {
    if (!selectedNode || selectedNode.data.kind !== "day") return;
    const moments = (selectedNode.data.moments ?? []).map((moment: any, index: number) => index === momentIndex ? updateMomentFields(moment, patch) : moment);
    updateSelectedData({ moments });
  };

  const addDayMoment = () => {
    if (!selectedNode || selectedNode.data.kind !== "day") return;
    const moments = [...(selectedNode.data.moments ?? []), updateMomentFields({ id: `manual-${Date.now()}`, type: "experience" }, { title: L("Nuova tappa", "New stop"), time: "", place: "" })];
    updateSelectedData({ moments });
  };

  const insertInspirationIntoDay = () => {
    if (!selectedNode || selectedNode.data.kind !== "social" || selectedNode.data.assignedDay == null || !trip) return;
    const dayIndex = Number(selectedNode.data.assignedDay);
    const day = trip.days?.[dayIndex];
    if (!day) return;
    const moment = updateMomentFields({
      id: `inspiration-${Date.now()}`, type: "experience", description_short: selectedNode.data.text ?? "",
      cta_url: selectedNode.data.url ?? "",
    }, { title: selectedNode.data.title, time: "Pomeriggio", place: "" });
    const updatedMoments = [...momentsOf(day), moment];
    setTrip(previous => previous ? { ...previous, days: (previous.days ?? []).map((item, index) => index === dayIndex ? {
      ...item, ...(Array.isArray(item?.moments) ? { moments: updatedMoments } : { editedMoments: updatedMoments }),
    } : item) } : previous);
    setNodes(previous => previous.map(node => node.id === `day-${dayIndex}` ? { ...node, data: { ...node.data, moments: updatedMoments, status: "chosen" } } : node));
    updateSelectedData({ status: "chosen" });
    toast({ title: L(`Ispirazione inserita nel giorno ${dayIndex + 1}`, `Inspiration added to day ${dayIndex + 1}`) });
  };

  const insertNodeIntoDay = (source: TravelNode, dayIndex: number) => {
    if (!trip || source.data.kind === "day") return;
    const day = trip.days?.[dayIndex];
    if (!day) return;
    const moment = updateMomentFields({
      id: `studio-${Date.now()}`, type: source.data.kind === "booking" ? "transport" : "experience",
      description_short: source.data.text ?? "", cta_url: source.data.url ?? "",
    }, { title: source.data.title, time: "", place: source.data.place ?? "", image: source.data.image ?? "" });
    const updatedMoments = [...momentsOf(day), moment];
    setTrip(previous => previous ? { ...previous, days: (previous.days ?? []).map((item, index) => index === dayIndex ? {
      ...item, ...(Array.isArray(item?.moments) ? { moments: updatedMoments } : { editedMoments: updatedMoments }),
    } : item) } : previous);
    setNodes(previous => previous.map(node => node.id === `day-${dayIndex}`
      ? { ...node, data: { ...node.data, moments: updatedMoments, status: "chosen" } }
      : node.id === source.id ? { ...node, data: { ...node.data, assignedDay: dayIndex, status: "chosen" } } : node));
    setDirty(true);
    toast({ title: L(`Aggiunto al giorno ${dayIndex + 1}`, `Added to day ${dayIndex + 1}`) });
  };

  const moveSelectedToMaybe = () => {
    if (!selectedNode) return;
    const maybe = nodes.find(node => node.data.kind === "maybe");
    if (!maybe) return;
    pushHistory();
    setNodes(previous => previous.map(node => node.id === maybe.id
      ? { ...node, data: { ...node.data, items: [...(node.data.items ?? []), selectedNode.data.title] } }
      : node.id === selectedNode.id ? { ...node, data: { ...node.data, status: "idea" } } : node));
    setContextMenu(null); setDirty(true);
    toast({ title: L("Salvato in Maybe", "Saved to Maybe") });
  };

  const closeGuide = () => {
    localStorage.setItem(STUDIO_GUIDE_KEY, "1");
    setGuideOpen(false);
  };

  const createProposalNode = (text: string, actions: string[]) => {
    const selected = selectedNodes;
    const x = selected.length ? Math.max(...selected.map(node => node.position.x)) + 310 : 760;
    const y = selected.length ? Math.min(...selected.map(node => node.position.y)) : 170;
    const id = `proposal-${Date.now().toString(36)}`;
    setNodes(previous => [...previous, { id, type: "travel", position: { x, y }, data: { kind: "proposal", title: L("Proposta MindRoute", "MindRoute proposal"), text: text.slice(0, 900), actions, status: "idea" } }]);
    if (selected[0]) setEdges(previous => addEdge({ id: `proposal-link-${id}`, source: selected[0].id, target: id, type: "smoothstep", animated: true, style: { stroke: "#E86B52" } }, previous));
    setSelectedIds([id]); setDirty(true);
  };

  const runCanvasAi = async (message?: string) => {
    if (!trip || aiStreaming) return;
    const request = (message ?? aiInput).trim();
    if (!request) return;
    const isApplying = message?.startsWith("Confermo") || message?.startsWith("I confirm");
    if (isApplying && dirty) await saveCanvas();
    const context = selectedNodes.map(node => JSON.stringify({
      kind: node.data.kind, title: node.data.title, note: node.data.text,
      url: node.data.url, assignedDay: node.data.assignedDay,
      dayIndex: node.data.dayIndex, moments: node.data.kind === "day" ? node.data.moments : undefined,
    })).join("; ");
    const prompt = `${L("Oggetti selezionati sul canvas", "Selected canvas objects")}: ${context || L("intero viaggio", "whole trip")}. ${L("Richiesta", "Request")}: ${request}. ${L("Rispondi in modo breve con una proposta concreta. Non applicare cambiamenti finché non confermo.", "Reply briefly with a concrete proposal. Do not apply changes until I confirm.")}`;
    setAiInput(""); setAiReply(""); setAiActions([]); setAiStreaming(true); setAiOpen(true);
    let full = "";
    const actions: string[] = [];
    try {
      const response = await fetch(`/api/itinerary/${trip.id}/chat`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt, lang }),
      });
      if (!response.ok || !response.body) throw new Error("ai");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = parseStreamingEvent(buffer, (event, data) => {
          if (event === "chunk") { full += data.text ?? ""; setAiReply(full); }
          if (event === "tool" && data.label) { actions.push(data.label); setAiActions([...actions]); }
        });
      }
      if (full && !isApplying) createProposalNode(full, actions);
      if (actions.length && isApplying) await loadLibrary(trip.id);
    } catch {
      setAiReply(L("Non sono riuscito a preparare la proposta. Riprova tra poco.", "I couldn't prepare the proposal. Try again shortly."));
    } finally { setAiStreaming(false); }
  };

  const applyAiProposal = () => runCanvasAi(L("Confermo. Applica ora le modifiche proposte agli oggetti selezionati.", "I confirm. Apply the proposed changes to the selected objects now."));

  const budget = trip ? budgetData(trip) : { total: 0, target: 0, categories: [] };
  const points = trip ? routePoints(trip) : [];
  const rhythm = trip ? rhythmData(trip) : [];
  const logistics = trip ? (trip.days ?? []).flatMap((day, dayIndex) => momentsOf(day)
    .filter(moment => /transport|accommodation|flight|train|bus|ferry|hotel|transfer/i.test(String(moment?.type ?? "")))
    .map(moment => ({ ...moment, dayIndex, title: momentTitle(moment), time: momentTime(moment), place: momentPlace(moment) }))) : [];
  const allMoments = trip ? (trip.days ?? []).flatMap(momentsOf) : [];
  const emptyDays = rhythm.filter(day => day.count === 0);
  const denseDays = rhythm.filter(day => day.intensity >= 75);
  const missingPlaces = allMoments.filter(moment => !momentPlace(moment).trim()).length;
  const openQuestions = nodes.filter(node => node.data.kind === "question" && node.data.status !== "chosen").length;
  const pendingBookings = nodes.filter(node => node.data.kind === "booking" && node.data.status !== "booked").length;
  const controlFlags = trip?.tripMeta?.studio_control ?? {};
  const controlChecks = [
    {
      key: "plan",
      label: L("Piano giorno per giorno", "Day-by-day plan"),
      detail: emptyDays.length ? L(`${emptyDays.length} giorni da completare`, `${emptyDays.length} days to complete`) : L("Tutti i giorni hanno una struttura", "Every day has a structure"),
      ready: rhythm.length > 0 && emptyDays.length === 0,
    },
    {
      key: "decisions",
      label: L("Decisioni aperte", "Open decisions"),
      detail: openQuestions ? L(`${openQuestions} richiedono una scelta`, `${openQuestions} need a decision`) : L("Nessuna decisione bloccante", "No blocking decisions"),
      ready: openQuestions === 0,
    },
    {
      key: "budget",
      label: "Budget",
      detail: budget.total ? `€${budget.total.toLocaleString(lang === "it" ? "it-IT" : "en-US")} / €${budget.target.toLocaleString(lang === "it" ? "it-IT" : "en-US")}` : L("Stima da completare", "Estimate to complete"),
      ready: budget.total > 0 && budget.target > 0 && budget.total <= budget.target,
    },
    {
      key: "places",
      label: L("Luoghi e mappa", "Places and map"),
      detail: missingPlaces ? L(`${missingPlaces} luoghi da precisare`, `${missingPlaces} places to specify`) : L("Luoghi riconosciuti", "Places recognised"),
      ready: allMoments.length > 0 && missingPlaces === 0,
    },
    {
      key: "documents",
      label: L("Documenti", "Documents"),
      detail: controlFlags.documents_confirmed ? L("Verificati da te", "Verified by you") : L("Da verificare prima di partire", "Verify before departure"),
      ready: Boolean(controlFlags.documents_confirmed),
      toggle: "documents_confirmed" as const,
    },
    {
      key: "risks",
      label: L("Rischi e avvisi", "Risks and notices"),
      detail: controlFlags.risks_reviewed ? L("Controllati da te", "Reviewed by you") : L("Controlla requisiti e condizioni", "Review requirements and conditions"),
      ready: Boolean(controlFlags.risks_reviewed),
      toggle: "risks_reviewed" as const,
    },
  ];
  const readiness = Math.round(controlChecks.filter(item => item.ready).length / controlChecks.length * 100);
  const overviewNode = nodes.find(node => node.data.kind === "trip");
  const noteNode = nodes.find(node => node.id === "intent-note") ?? nodes.find(node => node.data.kind === "note");
  const moodNode = nodes.find(node => node.data.kind === "mood");
  const maybeNode = nodes.find(node => node.data.kind === "maybe");
  const planImages = (moodNode?.data.images ?? ambientImages(trip ?? ({ id: 0 } as RawTrip))).slice(0, 6);
  const openNode = (node?: TravelNode) => {
    if (!node) return;
    setView("plan"); setSelectedIds([node.id]); setInspectorOpen(true); setContextMenu(null);
  };
  const contextualPrompts = selectedNode?.data.kind === "day"
    ? [L("Alleggerisci questo giorno", "Lighten this day"), L("Ottimizza gli spostamenti", "Optimise transfers"), L("Rendilo più locale", "Make it more local"), L("Riduci il costo", "Reduce cost")]
    : selectedNode?.data.kind === "place"
      ? [L("Trova un'alternativa", "Find an alternative"), L("Valuta se vale la deviazione", "Assess whether it is worth the detour"), L("Inseriscilo nel giorno migliore", "Place it on the best day")]
      : selectedIds.length > 1
        ? [L(`Riorganizza questi ${selectedIds.length} elementi`, `Reorganise these ${selectedIds.length} items`), L("Confronta due scenari", "Compare two scenarios")]
        : [L("Analizza il viaggio", "Analyse the trip"), L("Controlla ritmo e spostamenti", "Check pace and transfers"), L("Trova incoerenze", "Find inconsistencies")];

  const openDay = (index: number) => {
    const id = `day-${index}`;
    setView("plan"); setSelectedIds([id]); setInspectorOpen(true);
  };

  if (loading) return <div className="mr-studio-loading"><span /><p>{L("Apro la tua scrivania di viaggio…", "Opening your travel desk…")}</p></div>;

  return <div className="mr-studio">
    <header className="mr-studio-topbar">
      <div className="mr-studio-brand">
        <FlowNavLogo size={25} />
        <span>mindroute</span>
      </div>
      <nav className="mr-product-nav"><button className="on">Studio</button><button onClick={() => setLocation("/my-account?view=portrait")}>{L("Profilo", "Profile")}</button></nav>
      <div className="mr-trip-switcher">
        <button onClick={() => setTripMenuOpen(value => !value)}><span>{L("Viaggio attivo", "Active trip")}</span><strong>{trip?.destinationName ?? L("Nessun viaggio", "No trip")}</strong><ChevronDown size={14} /></button>
        {tripMenuOpen && <div className="mr-trip-library-popover">
          <header><span>{L("I tuoi viaggi", "Your trips")}</span><small>{library.length}</small></header>
          <div>{library.map(item => <button key={item.id} className={item.id === trip?.id ? "on" : ""} onClick={() => { openTrip(item); setTripMenuOpen(false); }}><span style={item.heroImageUrl ? { backgroundImage: `url(${item.heroImageUrl})` } : undefined} /><p><strong>{item.destinationName ?? L("Viaggio", "Trip")}</strong><small>{item.days?.length ?? 0} {L("giorni", "days")}</small></p>{item.id === trip?.id && <Check size={14} />}</button>)}</div>
          <footer><button onClick={() => { setTripMenuOpen(false); setNewTripOpen(true); }}><Plus size={14} />{L("Nuovo viaggio", "New trip")}</button></footer>
        </div>}
      </div>
      <div className="mr-top-actions">
        <button className="mr-global-ai" onClick={() => setAiOpen(true)}><Sparkles size={14} /><span>{L("Lavora con l'AI", "Work with AI")}</span></button>
        <button className="share" onClick={shareTrip} disabled={!trip}><Share2 size={14} />{L("Condividi", "Share")}</button>
        {trip && <button className="mr-classic-mode" onClick={() => setLocation(`/itinerary/${trip.id}`)}><ClipboardList size={14} /><span>{L("Apri itinerario", "Open itinerary")}</span></button>}
        <button onClick={undo} disabled={!history.length} aria-label={L("Annulla", "Undo")}><Undo2 size={16} /></button>
        <button onClick={redo} disabled={!futureHistory.length} aria-label={L("Ripristina", "Redo")}><Redo2 size={16} /></button>
        <button className="mr-save-state" onClick={() => saveCanvas()} disabled={!trip || saving}><Save size={15} /><span>{saving ? L("Salvo", "Saving") : dirty ? L("Salva", "Save") : L("Salvato", "Saved")}</span></button>
        <LangDropdown variant="dark" />
      </div>
    </header>

    <main className="mr-studio-main">
      <nav className="mr-object-toolbar" aria-label={L("Strumenti del piano", "Plan tools")}>
        <button className="new" onClick={() => setAddMenuOpen(value => !value)}><Plus size={19} /><span>{L("Aggiungi", "Add")}</span></button>
        {addMenuOpen && <div className="mr-add-menu">
          <button onClick={addDay}><CalendarDays size={15} /><span><strong>{L("Giorno", "Day")}</strong><small>{L("Estendi il piano", "Extend the plan")}</small></span></button>
          <button onClick={() => addObject("place")}><MapIcon size={15} /><span><strong>{L("Luogo", "Place")}</strong><small>{L("Una tappa da valutare", "A stop to consider")}</small></span></button>
          <button onClick={() => addObject("maybe")}><Layers3 size={15} /><span><strong>{L("Idea / Maybe", "Idea / Maybe")}</strong><small>{L("Non entra ancora nel piano", "Not in the plan yet")}</small></span></button>
          <button onClick={() => addObject("note")}><StickyNote size={15} /><span><strong>{L("Nota", "Note")}</strong><small>{L("Desiderio o vincolo", "Wish or constraint")}</small></span></button>
          <button onClick={() => addObject("booking")}><Plane size={15} /><span><strong>{L("Logistica", "Logistics")}</strong><small>{L("Volo, hotel o trasporto", "Flight, hotel or transport")}</small></span></button>
          <button onClick={() => addObject("social")}><Instagram size={15} /><span><strong>{L("Ispirazione", "Inspiration")}</strong><small>Instagram, TikTok, web</small></span></button>
        </div>}
        <div className="sep" />
        <button data-label="Maybe" onClick={() => openNode(maybeNode)} title="Maybe"><Layers3 size={18} /></button>
        <button data-label={L("Come funziona", "How it works")} onClick={() => setGuideOpen(true)} title={L("Come funziona", "How it works")}><CircleHelp size={18} /></button>
        <button data-label={L("Profilo", "Profile")} onClick={() => setLocation("/my-account?view=portrait")} title={L("Profilo", "Profile")}><UserRound size={18} /></button>
      </nav>

      {view === "plan" && <div className="mr-structured-plan" onClick={() => setAddMenuOpen(false)}>
        {trip ? <div className="mr-plan-board">
          <button className={`mr-plan-overview${selectedIds.includes("trip-overview") ? " selected" : ""}`} onClick={() => openNode(overviewNode)}>
            <span className="mr-plan-cover" style={trip.heroImageUrl ? { backgroundImage: `url(${trip.heroImageUrl})` } : undefined}>{!trip.heroImageUrl && <Compass size={26} />}</span>
            <span className="mr-plan-overview-copy"><small>{trip.country || L("Profilo del viaggio", "Trip profile")}</small><strong>{trip.destinationName}</strong><p>{trip.tripSummary || trip.whyYours || L("Aggiungi una breve descrizione del viaggio.", "Add a short trip description.")}</p><em><CalendarDays size={13} />{trip.days?.length ?? 0} {L("giorni", "days")}<UserRound size={13} />{trip.tripMeta?.companions_label || L("Viaggiatori da definire", "Travellers TBD")}</em></span>
            <i><ChevronRight size={16} /></i>
          </button>

          <section className="mr-plan-days">
            <header><div><span>{L("Il piano", "The plan")}</span><strong>{L("Giorno per giorno", "Day by day")}</strong></div><button onClick={addDay}><Plus size={13} />{L("Aggiungi giorno", "Add day")}</button></header>
            <div>{(trip.days ?? []).map((day, index) => {
              const moments = momentsOf(day);
              const dayId = `day-${index}`;
              return <button key={dayId} className={`mr-plan-day${selectedIds.includes(dayId) ? " selected" : ""}`} onClick={() => openDay(index)}><small>{L("Giorno", "Day")} {index + 1}</small><strong>{dayTitle(day, index)}</strong><ul>{moments.slice(0, 3).map((moment, momentIndex) => <li key={moment.id ?? momentIndex}>{momentTitle(moment)}</li>)}{!moments.length && <li>{L("Aggiungi la prima tappa", "Add the first stop")}</li>}</ul><em>{moments.length} {L("tappe", "stops")}<ChevronRight size={13} /></em></button>;
            })}</div>
          </section>

          <div className="mr-plan-modules">
            <button className="mr-plan-module note" onClick={() => openNode(noteNode)}><header><span>{L("Note", "Notes")}</span><ChevronRight size={14} /></header><p>{noteNode?.data.text || L("Aggiungi desideri, vincoli o cose da ricordare.", "Add wishes, constraints or reminders.")}</p><small>{L("Modifica nota", "Edit note")}</small></button>
            <button className="mr-plan-module mood" onClick={() => openNode(moodNode)}><header><span>Moodboard</span><Plus size={14} /></header><div>{planImages.map((image: string, index: number) => <i key={`${image}-${index}`} style={{ backgroundImage: `url(${image})` }} />)}{!planImages.length && <p>{L("Aggiungi immagini e riferimenti visivi.", "Add images and visual references.")}</p>}</div></button>
            <article className="mr-plan-module map" role="button" tabIndex={0} onClick={() => setView("map")} onKeyDown={event => { if (event.key === "Enter") setView("map"); }}><header><span>{L("Mappa del viaggio", "Trip map")}</span><ChevronRight size={14} /></header>{points.length ? <div className="mr-plan-map-preview"><Suspense fallback={<div className="mr-view-loading" />}><RouteMap points={points as any} destination={trip.destinationName ?? ""} itineraryId={trip.id} t={t} lang={lang} bare hideDayBar /></Suspense></div> : <div className="mr-plan-map-empty"><MapIcon size={23} /><p>{L("I luoghi compariranno qui quando li aggiungi alle tappe.", "Places appear here when added to stops.")}</p></div>}</article>
            <button className="mr-plan-module maybe" onClick={() => openNode(maybeNode)}><header><span>{L("Maybe / Alternative", "Maybe / Alternatives")}</span><Plus size={14} /></header><div>{(maybeNode?.data.items ?? []).slice(0, 4).map((item: string, index: number) => <p key={`${item}-${index}`}><span>{item}</span><ChevronRight size={12} /></p>)}{!(maybeNode?.data.items ?? []).length && <small>{L("Parcheggia qui ciò che non hai ancora deciso.", "Keep undecided ideas here.")}</small>}</div></button>
          </div>
        </div> : <div className="mr-empty-desk"><Compass size={34} /><span>MindRoute Studio</span><h1>{L("Crea il tuo prossimo viaggio", "Create your next trip")}</h1><p>{L("Scegli come iniziare. Qualunque strada porta allo stesso spazio di lavoro e allo stesso itinerario.", "Choose how to begin. Every path leads to the same workspace and itinerary.")}</p><div><button onClick={() => { setStartMode("menu"); setNewTripOpen(true); }}><Plus size={15} />{L("Nuovo viaggio", "New trip")}</button></div></div>}
      </div>}

      {view === "map" && trip && <section className="mr-work-view mr-map-workspace">
        <header><span>{L("Vista geografica", "Geographic view")}</span><h1>{L("Dove accade il viaggio", "Where the trip happens")}</h1><p>{L("Luoghi reali, ordine dei giorni e distanze nello stesso piano.", "Real places, day order and distances in the same plan.")}</p></header>
        {points.length ? <div className="mr-real-map"><Suspense fallback={<div className="mr-view-loading" />}><RouteMap points={points as any} destination={trip.destinationName ?? ""} itineraryId={trip.id} t={t} lang={lang} onOpenDay={(day: number) => openDay(Math.max(0, day - 1))} /></Suspense></div>
          : <div className="mr-view-empty"><MapIcon size={25} /><h2>{L("Mancano luoghi precisi", "Exact places are missing")}</h2><p>{L("Apri un giorno e inserisci il luogo nelle sue tappe. La mappa si costruirà automaticamente.", "Open a day and add exact places to its stops. The map will build automatically.")}</p><button onClick={() => setView("plan")}>{L("Torna al Piano", "Back to Plan")}</button></div>}
      </section>}

      {view === "control" && trip && <section className="mr-work-view mr-control-workspace">
        <header><span>{L("Prontezza del viaggio", "Trip readiness")}</span><h1>{L("Prima di partire, guarda solo ciò che conta", "Before leaving, see only what matters")}</h1><p>{L("Ritmo, costi, logistica e verifiche leggono lo stesso viaggio. Qui emergono soltanto le cose da sistemare.", "Pace, costs, logistics and checks read the same trip. Only what needs attention appears here.")}</p></header>

        <div className="mr-control-hero">
          <div className="mr-readiness-ring" style={{ background: `conic-gradient(#63a58f 0 ${readiness}%,#e5ded4 ${readiness}% 100%)` }}><span><strong>{readiness}%</strong><small>{L("pronto", "ready")}</small></span></div>
          <div><span>{readiness >= 80 ? L("Quasi pronto a partire", "Almost ready to go") : L("Il viaggio sta prendendo forma", "The trip is taking shape")}</span><h2>{readiness >= 80 ? L("Restano pochi dettagli da confermare.", "Only a few details remain.") : L("Risolvi prima le decisioni che hanno più impatto.", "Resolve the highest-impact decisions first.")}</h2><p>{denseDays.length ? L(`${denseDays.length} giornate hanno un ritmo intenso.`, `${denseDays.length} days have an intense pace.`) : L("Il ritmo non presenta criticità evidenti.", "The pace has no obvious issues.")}</p></div>
          <button onClick={() => { setAiInput(L("Aiutami a risolvere le priorità aperte prima della partenza", "Help me resolve the open priorities before departure")); setAiOpen(true); }}><Sparkles size={15} />{L("Risolvi con l'AI", "Resolve with AI")}</button>
        </div>

        <div className="mr-control-checks">{controlChecks.map(item => <button key={item.key} className={item.ready ? "ready" : "attention"} onClick={() => { if (item.toggle) updateControlFlag(item.toggle); else if (!item.ready) { setAiInput(L(`Aiutami a risolvere: ${item.label}. ${item.detail}`, `Help me resolve: ${item.label}. ${item.detail}`)); setAiOpen(true); } }}>
          <span>{item.ready ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}</span><p><strong>{item.label}</strong><small>{item.detail}</small></p>{item.toggle && <em>{item.ready ? L("Segna da rivedere", "Mark for review") : L("Segna verificato", "Mark verified")}</em>}
        </button>)}</div>

        <div className="mr-control-detail-grid">
          <section className="mr-control-card mr-control-rhythm"><header><span><Gauge size={15} />{L("Ritmo", "Pace")}</span><small>{denseDays.length ? L(`${denseDays.length} da rivedere`, `${denseDays.length} to review`) : L("Equilibrato", "Balanced")}</small></header><div className="mr-rhythm-list">{rhythm.map(day => <button key={day.index} onClick={() => openDay(day.index)}><span><small>{L("Giorno", "Day")} {day.index + 1}</small><strong>{day.title}</strong></span><div><i><b style={{ width: `${Math.max(6, day.intensity)}%` }} /></i><em>{day.intensity >= 75 ? L("Intenso", "Intense") : day.intensity >= 45 ? L("Equilibrato", "Balanced") : L("Lento", "Slow")}</em></div><ChevronRight size={15} /></button>)}</div></section>
          <section className="mr-control-card mr-control-budget"><header><span><Euro size={15} />Budget</span><small>{budget.total > budget.target ? L("Oltre il tetto", "Over target") : L("Sotto controllo", "Under control")}</small></header><div className="mr-budget-total"><span>{L("Stima attuale", "Current estimate")}</span><strong>€{budget.total.toLocaleString(lang === "it" ? "it-IT" : "en-US")}</strong><small>€{budget.target.toLocaleString(lang === "it" ? "it-IT" : "en-US")} {L("disponibili", "available")}</small><i><b style={{ width: `${Math.min(100, budget.total / Math.max(budget.target, 1) * 100)}%` }} /></i></div><div className="mr-budget-fields"><label>{L("Prenotabile", "Bookable")}<span>€<input type="number" min="0" value={trip.tripMeta?.total_cost_bookable ?? 0} onChange={event => updateBudgetValue("bookable", Number(event.target.value))} /></span></label><label>{L("In loco", "On site")}<span>€<input type="number" min="0" value={trip.tripMeta?.total_cost_onsite_estimate ?? 0} onChange={event => updateBudgetValue("onsite", Number(event.target.value))} /></span></label><label>{L("Tetto", "Target")}<span>€<input type="number" min="0" value={trip.tripMeta?.studio_budget_target ?? 0} onChange={event => updateBudgetValue("target", Number(event.target.value))} /></span></label></div></section>
        </div>

        <section className="mr-control-card mr-control-logistics"><header><span><Plane size={15} />{L("Logistica e prenotazioni", "Logistics and bookings")}</span><small>{pendingBookings ? L(`${pendingBookings} da completare`, `${pendingBookings} to complete`) : L("Vista operativa", "Operational view")}</small></header><div className="mr-logistics-grid">{logistics.map((item: any, index: number) => <button key={item.id ?? index} onClick={() => openDay(item.dayIndex)}><span><Plane size={16} /></span><p><small>{L("Giorno", "Day")} {item.dayIndex + 1} · {item.time || L("Orario da definire", "Time TBD")}</small><strong>{item.title}</strong><em>{item.place || L("Luogo da definire", "Place TBD")}</em></p><ChevronRight size={15} /></button>)}{nodes.filter(node => node.data.kind === "booking").map(node => <button key={node.id} onClick={() => { setView("plan"); setSelectedIds([node.id]); setInspectorOpen(true); }}><span><ClipboardList size={16} /></span><p><small>{L("Prenotazione", "Booking")}</small><strong>{node.data.title}</strong><em>{node.data.status === "booked" ? L("Confermata", "Confirmed") : L("Da completare", "To complete")}</em></p><ChevronRight size={15} /></button>)}{!logistics.length && !nodes.some(node => node.data.kind === "booking") && <div className="mr-view-empty"><Plane size={24} /><h2>{L("Nessuna logistica ancora", "No logistics yet")}</h2><p>{L("Aggiungi un volo, un hotel o un trasferimento dal pulsante Aggiungi.", "Add a flight, hotel or transfer from the Add button.")}</p></div>}</div></section>
      </section>}

      <nav className="mr-lens-dock" aria-label={L("Viste del viaggio", "Trip views")}>
        {([ ["plan", <BoxSelect size={15} />, L("Piano", "Plan")], ["map", <MapIcon size={15} />, L("Mappa", "Map")], ["control", <FileCheck2 size={15} />, L("Controllo", "Control")] ] as [StudioView, ReactNode, string][]).map(([id, icon, label]) => <button key={id} className={view === id ? "on" : ""} onClick={() => { setView(id); setInspectorOpen(false); setContextMenu(null); }}>{icon}<span>{label}</span></button>)}
      </nav>

      {view === "plan" && trip && !selectedIds.length && !aiOpen && !guideOpen && <div className="mr-canvas-hint"><MousePointer2 size={14} /><span>{L("Seleziona un contenitore per aggiungere, modificare o rimuovere i suoi contenuti.", "Select a container to add, edit or remove its content.")}</span></div>}

      {inspectorOpen && selectedNode && !aiOpen && <aside className="mr-inspector-float">
        <header><div><span>{selectedNode.data.kind}</span><strong>{selectedNode.data.kind === "day" ? L("Modifica giorno", "Edit day") : selectedNode.data.kind === "trip" ? L("Modifica viaggio", "Edit trip") : selectedNode.data.kind === "mood" ? L("Modifica moodboard", "Edit moodboard") : selectedNode.data.kind === "maybe" ? L("Modifica alternative", "Edit alternatives") : L("Modifica contenuto", "Edit content")}</strong></div><button onClick={() => { setInspectorOpen(false); setSelectedIds([]); }}><PanelRightClose size={16} /></button></header>
        {!['map','budget','mood','group'].includes(selectedNode.data.kind) && <label>{L("Titolo", "Title")}<input value={selectedNode.data.title ?? ""} onChange={event => updateSelectedData({ title: event.target.value })} /></label>}
        {selectedNode.data.kind === "trip" && <>
          <label>{L("Paese o area", "Country or area")}<input value={selectedNode.data.country ?? ""} onChange={event => updateSelectedData({ country: event.target.value })} /></label>
          <label>{L("Perché questo viaggio", "Why this trip")}<textarea value={selectedNode.data.text ?? ""} onChange={event => updateSelectedData({ text: event.target.value })} /></label>
          <label>{L("Descrizione generale", "Trip overview")}<textarea value={selectedNode.data.summary ?? ""} onChange={event => updateSelectedData({ summary: event.target.value })} /></label>
          <label>{L("Immagine di copertina", "Cover image")}<input value={selectedNode.data.image ?? ""} onChange={event => updateSelectedData({ image: event.target.value })} placeholder="https://…" /></label>
        </>}
        {selectedNode.data.kind === "day" && <>
          <label>{L("Sottotitolo del giorno", "Day subtitle")}<input value={selectedNode.data.subtitle ?? ""} onChange={event => updateSelectedData({ subtitle: event.target.value })} /></label>
          <label>{L("Immagine del giorno", "Day image")}<input value={selectedNode.data.image ?? ""} onChange={event => updateSelectedData({ image: event.target.value })} placeholder="https://…" /></label>
          <div className="mr-moment-editor"><span>{L("Tappe operative", "Operational stops")}</span>{(selectedNode.data.moments ?? []).map((moment: any, index: number) => <article key={moment.id ?? index}>
            <div><input value={moment.time ?? ""} onChange={event => updateDayMoment(index, { time: event.target.value })} placeholder={L("Orario", "Time")} /><button onClick={() => updateSelectedData({ moments: selectedNode.data.moments.filter((_: any, i: number) => i !== index) })}><Trash2 size={12} /></button></div>
            <input value={moment.title ?? ""} onChange={event => updateDayMoment(index, { title: event.target.value })} placeholder={L("Cosa fare", "What to do")} />
            <input value={moment.place ?? ""} onChange={event => updateDayMoment(index, { place: event.target.value })} placeholder={L("Luogo preciso", "Exact place")} />
            <textarea value={moment.description ?? ""} onChange={event => updateDayMoment(index, { description: event.target.value })} placeholder={L("Spiega cosa è, perché vale la pena e come viverla", "Explain what it is, why it matters and how to experience it")} />
          </article>)}<button onClick={addDayMoment}><Plus size={13} />{L("Aggiungi tappa", "Add stop")}</button></div>
        </>}
        {!['trip','day','map','budget','mood','group','social'].includes(selectedNode.data.kind) && <label>{L("Contenuto", "Content")}<textarea value={selectedNode.data.text ?? ""} onChange={event => updateSelectedData({ text: event.target.value })} /></label>}
        {selectedNode.data.kind === "photo" && <label>URL immagine<input value={selectedNode.data.image ?? ""} onChange={event => updateSelectedData({ image: event.target.value })} placeholder="https://…" /></label>}
        {selectedNode.data.kind === "maybe" && <label>{L("Idee, una per riga", "Ideas, one per line")}<textarea value={(selectedNode.data.items ?? []).join("\n")} onChange={event => updateSelectedData({ items: event.target.value.split("\n").filter(Boolean) })} /></label>}
        {selectedNode.data.kind === "social" && <>
          <div className="mr-semantic-notice"><strong>{L("Inbox Ispirazioni", "Inspiration Inbox")}</strong><p>{L("Salva un link pubblico. Il contenuto resta alla fonte; qui conservi il perché e decidi se trasformarlo in una tappa.", "Save a public link. Content remains at its source; here you keep the reason and decide whether to turn it into a stop.")}</p></div>
          <label>URL Instagram, TikTok o web<input value={selectedNode.data.url ?? ""} onChange={event => { const url = event.target.value; updateSelectedData({ url, ...inspirationMeta(url) }); }} placeholder="https://…" /></label>
          <label>{L("Perché ti interessa", "Why it matters")}<textarea value={selectedNode.data.text ?? ""} onChange={event => updateSelectedData({ text: event.target.value })} /></label>
          <label>{L("Inserisci nel giorno", "Add to day")}<select value={selectedNode.data.assignedDay ?? ""} onChange={event => updateSelectedData({ assignedDay: event.target.value === "" ? null : Number(event.target.value) })}><option value="">{L("Resta nell'Inbox", "Keep in Inbox")}</option>{(trip?.days ?? []).map((day, index) => <option key={index} value={index}>{L("Giorno", "Day")} {index + 1} · {dayTitle(day, index)}</option>)}</select></label>
          <button className="mr-open-itinerary" disabled={selectedNode.data.assignedDay == null} onClick={insertInspirationIntoDay}>{L("Trasforma in tappa", "Turn into a stop")}<ChevronRight size={14} /></button>
        </>}
        {selectedNode.data.kind === "place" && <>
          <label>{L("Luogo preciso", "Exact place")}<input value={selectedNode.data.place ?? ""} onChange={event => updateSelectedData({ place: event.target.value })} placeholder={L("Nome, quartiere o indirizzo", "Name, neighbourhood or address")} /></label>
          <label>{L("Inserisci nel giorno", "Add to day")}<select value={selectedNode.data.assignedDay ?? ""} onChange={event => updateSelectedData({ assignedDay: event.target.value === "" ? null : Number(event.target.value) })}><option value="">Maybe</option>{(trip?.days ?? []).map((day, index) => <option key={index} value={index}>{L("Giorno", "Day")} {index + 1} · {dayTitle(day, index)}</option>)}</select></label>
          <button className="mr-open-itinerary" disabled={selectedNode.data.assignedDay == null} onClick={() => insertNodeIntoDay(selectedNode, Number(selectedNode.data.assignedDay))}>{L("Aggiungi al piano", "Add to plan")}<ChevronRight size={14} /></button>
        </>}
        {selectedNode.data.kind === "budget" && <div className="mr-budget-editor">
          <label>{L("Costi prenotabili", "Bookable costs")}<input type="number" min="0" value={trip?.tripMeta?.total_cost_bookable ?? 0} onChange={event => updateSelectedData({ bookable: Number(event.target.value) })} /></label>
          <label>{L("Costi in loco", "On-site costs")}<input type="number" min="0" value={trip?.tripMeta?.total_cost_onsite_estimate ?? 0} onChange={event => updateSelectedData({ onsite: Number(event.target.value) })} /></label>
          <label>{L("Tetto desiderato", "Target budget")}<input type="number" min="0" value={trip?.tripMeta?.studio_budget_target ?? budget.target} onChange={event => updateSelectedData({ target: Number(event.target.value) })} /></label>
        </div>}
        {selectedNode.data.kind === "mood" && <label>{L("Immagini, una URL per riga", "Images, one URL per line")}<textarea value={(selectedNode.data.images ?? []).join("\n")} onChange={event => updateSelectedData({ images: event.target.value.split("\n").map(value => value.trim()).filter(Boolean) })} /></label>}
        {selectedNode.data.kind === "map" && <div className="mr-semantic-notice"><strong>{selectedNode.data.points?.length ?? 0} {L("luoghi riconosciuti", "recognised places")}</strong><p>{L("La mappa si aggiorna dai luoghi precisi inseriti nelle tappe dei giorni.", "The map updates from exact places entered in day stops.")}</p></div>}
        {!['trip','day','map','budget','mood','group'].includes(selectedNode.data.kind) && <div className="mr-status-control"><span>{L("Stato", "Status")}</span>{(["idea", "chosen", "booked"] as ObjectStatus[]).map(status => <button key={status} className={selectedNode.data.status === status ? "on" : ""} onClick={() => updateSelectedData({ status })}>{status === "idea" ? "Idea" : status === "chosen" ? L("Scelto", "Chosen") : L("Prenotato", "Booked")}</button>)}</div>}
        <div className="mr-context-actions"><span>{L("Azioni intelligenti", "Smart actions")}</span>{contextualPrompts.slice(0, 4).map(prompt => <button key={prompt} onClick={() => { setAiInput(prompt); setAiOpen(true); }}><Sparkles size={12} />{prompt}</button>)}</div>
        {['trip','day'].includes(selectedNode.data.kind) && <button className="mr-open-itinerary" onClick={() => setLocation(`/itinerary/${trip?.id}`)}>{L("Vedi nell'itinerario operativo", "View in operational itinerary")}<ChevronRight size={14} /></button>}
        <button className="mr-inspector-ai" onClick={() => setAiOpen(true)}><Sparkles size={14} />{L("Lavora su questo con MindRoute", "Work on this with MindRoute")}</button>
        {selectedNode.data.kind === "day" && (trip?.days?.length ?? 0) > 1 && <button className="mr-inspector-delete" onClick={() => removeDay(Number(selectedNode.data.dayIndex))}><Trash2 size={13} />{L("Elimina questo giorno", "Delete this day")}</button>}
        {!['trip','day','map','budget','mood','maybe','group'].includes(selectedNode.data.kind) && <button className="mr-inspector-delete" onClick={deleteSelection}><Trash2 size={13} />{L("Elimina contenuto", "Delete content")}</button>}
        <footer className="mr-inspector-footer"><button onClick={() => { setInspectorOpen(false); setSelectedIds([]); }}>{L("Indietro", "Back")}</button><button onClick={async () => { await saveCanvas(); setInspectorOpen(false); setSelectedIds([]); }} disabled={saving}>{saving ? L("Salvo…", "Saving…") : L("Salva modifiche", "Save changes")}</button></footer>
      </aside>}

      {contextMenu && <div className="mr-context-menu" style={{ left: Math.min(contextMenu.x, window.innerWidth - 210), top: Math.min(contextMenu.y - 62, window.innerHeight - 250) }}>
        <button onClick={() => { setInspectorOpen(true); setContextMenu(null); }}><ChevronRight size={13} />{L("Apri", "Open")}</button>
        <button onClick={duplicateSelection} disabled={selectedNode?.data.kind === "day" || selectedNode?.data.kind === "trip"}><Copy size={13} />{L("Duplica", "Duplicate")}</button>
        {selectedNode && ["place", "social", "photo", "note"].includes(selectedNode.data.kind) && <button onClick={moveSelectedToMaybe}><Layers3 size={13} />{L("Salva in Maybe", "Save to Maybe")}</button>}
        {selectedNode?.data.kind === "place" && <button onClick={() => { setView("map"); setContextMenu(null); }}><MapIcon size={13} />{L("Vedi sulla mappa", "View on map")}</button>}
        <button onClick={() => { setAiOpen(true); setContextMenu(null); }}><Sparkles size={13} />{L("Chiedi a MindRoute", "Ask MindRoute")}</button>
        <button className="danger" onClick={() => { deleteSelection(); setContextMenu(null); }}><Trash2 size={13} />{L("Elimina", "Delete")}</button>
      </div>}

      {newTripOpen && <div className="mr-new-trip-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) { setNewTripOpen(false); setStartMode("menu"); } }}><section className="mr-new-trip-modal">
        <button className="close" onClick={() => { setNewTripOpen(false); setStartMode("menu"); }}><X size={17} /></button><span>{L("Nuovo viaggio", "New trip")}</span><h2>{startMode === "menu" ? L("Da dove vuoi iniziare?", "Where do you want to begin?") : startMode === "destination" ? L("Parti da una destinazione", "Start from a destination") : startMode === "blank" ? L("Costruisci da zero", "Build from scratch") : L("Importa ciò che hai già", "Import what you already have")}</h2><p>{L("Un solo viaggio, qualunque sia il punto di partenza.", "One trip, whatever your starting point.")}</p>
        {startMode === "menu" ? <div className="mr-new-trip-options">
          <button onClick={() => setLocation("/start")}><Sparkles size={19} /><strong>{L("Quiz rapido", "Quick quiz")}</strong><small>{L("Poche domande, tre destinazioni spiegate.", "A few questions, three explained destinations.")}</small><em>{L("Consigliato", "Recommended")}</em></button>
          <button onClick={() => setStartMode("destination")}><MapIcon size={19} /><strong>{L("Ho una destinazione", "I have a destination")}</strong><small>{L("Imposta luogo e durata, poi costruisci.", "Set place and duration, then build.")}</small></button>
          <button onClick={() => { setBlankTripForm(value => ({ ...value, destinationName: "", days: 1 })); setStartMode("blank"); }}><StickyNote size={19} /><strong>{L("Inizia da zero", "Start from scratch")}</strong><small>{L("Un piano vuoto, completamente libero.", "A blank, completely flexible plan.")}</small></button>
          <button onClick={() => setStartMode("import")}><Link2 size={19} /><strong>{L("Importa idee", "Import ideas")}</strong><small>{L("Testo, link, note o una bozza esistente.", "Text, links, notes or an existing draft.")}</small></button>
        </div> : <div className="mr-new-trip-form">
          <button className="back" onClick={() => setStartMode("menu")}><ChevronRight size={14} />{L("Cambia modalità", "Change mode")}</button>
          <label>{startMode === "blank" ? L("Nome del viaggio (opzionale)", "Trip name (optional)") : L("Destinazione o nome del viaggio", "Destination or trip name")}<input autoFocus value={blankTripForm.destinationName} onChange={event => setBlankTripForm(value => ({ ...value, destinationName: event.target.value }))} placeholder={startMode === "blank" ? L("Viaggio senza titolo", "Untitled trip") : L("Es. Giappone", "E.g. Japan")} /></label>
          {startMode === "import" && <label>{L("Incolla qui idee, link o una bozza", "Paste ideas, links or a draft here")}<textarea value={importText} onChange={event => setImportText(event.target.value)} placeholder={L("Tokyo, massimo 1.500€, ritmi lenti…", "Tokyo, max €1,500, slow pace…")} /></label>}
          <div><label>{L("Paese / area", "Country / area")}<input value={blankTripForm.country} onChange={event => setBlankTripForm(value => ({ ...value, country: event.target.value }))} /></label><label>{L("Giorni iniziali", "Starting days")}<input type="number" min="1" max="30" value={blankTripForm.days} onChange={event => setBlankTripForm(value => ({ ...value, days: Number(event.target.value) }))} /></label></div>
          <button className="submit" disabled={creatingTrip || (startMode !== "blank" && !blankTripForm.destinationName.trim()) || (startMode === "import" && !importText.trim())} onClick={createStudioTrip}>{creatingTrip ? L("Creo…", "Creating…") : L("Apri nello Studio", "Open in Studio")}<ChevronRight size={14} /></button>
        </div>}
      </section></div>}

      {guideOpen && trip && <div className="mr-guide-backdrop"><section className="mr-studio-guide">
        <button className="close" onClick={closeGuide}><X size={17} /></button>
        <span>MindRoute Studio</span>
        <h2>{L("Un solo viaggio. Tutto sotto controllo.", "One trip. Everything under control.")}</h2>
        <p>{L("Qui costruisci e modifichi. L'itinerario operativo resta la versione completa da leggere e usare durante il viaggio. Ogni modifica è condivisa tra le due modalità.", "Build and edit here. The operational itinerary remains the complete version to read and use while travelling. Every change is shared between both modes.")}</p>
        <div className="mr-guide-steps">
          <article><b>01</b><MousePointer2 size={18} /><strong>{L("Apri e modifica", "Open and edit")}</strong><small>{L("Ogni card apre contenuti e strumenti pertinenti, senza riempire lo schermo di comandi.", "Every card opens relevant content and tools without filling the screen with controls.")}</small></article>
          <article><b>02</b><BoxSelect size={18} /><strong>{L("Tre viste, un solo viaggio", "Three views, one trip")}</strong><small>{L("Piano per costruire, Mappa per capire lo spazio, Controllo per preparare la partenza.", "Plan to build, Map to understand space, Control to prepare departure.")}</small></article>
          <article><b>03</b><Sparkles size={18} /><strong>{L("Lavora con l'AI", "Work with AI")}</strong><small>{L("Seleziona il contesto e MindRoute propone modifiche verificabili prima di applicarle.", "Select the context and MindRoute proposes reviewable changes before applying them.")}</small></article>
        </div>
        <footer><button className="secondary" onClick={() => setLocation(`/itinerary/${trip?.id}`)}>{L("Apri l'itinerario", "Open itinerary")}</button><button className="primary" onClick={closeGuide}>{L("Inizia a costruire", "Start building")}<ChevronRight size={15} /></button></footer>
      </section></div>}

      {aiOpen && <section className="mr-canvas-ai">
        <header><div><Sparkles size={15} /><span><strong>MindRoute AI</strong><small>{selectedIds.length ? `${selectedIds.length} oggetti nel contesto` : L("Intero viaggio", "Whole trip")}</small></span></div><button onClick={() => setAiOpen(false)}><X size={16} /></button></header>
        {aiReply && <div className="mr-ai-reply"><p>{aiReply}</p>{aiActions.map(action => <span key={action}><Check size={12} />{action}</span>)}{!aiStreaming && <button onClick={applyAiProposal}>{L("Applica modifiche", "Apply changes")}</button>}</div>}
        <form onSubmit={event => { event.preventDefault(); runCanvasAi(); }}><textarea autoFocus value={aiInput} onChange={event => setAiInput(event.target.value)} placeholder={L("Es. Rendimi questa parte più rilassata…", "E.g. Make this part more relaxed…")} /><button disabled={!aiInput.trim() || aiStreaming}>{aiStreaming ? <span className="mr-ai-pulse" /> : <MoveRight size={16} />}</button></form>
        {!aiReply && <div className="mr-ai-quick">{contextualPrompts.map(prompt => <button key={prompt} onClick={() => setAiInput(prompt)}>{prompt}</button>)}</div>}
      </section>}

    </main>
  </div>;
}

export default function TravelStudio() {
  return <ReactFlowProvider><TravelStudioInner /></ReactFlowProvider>;
}
