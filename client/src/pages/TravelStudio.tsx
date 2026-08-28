import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ReactFlow, ReactFlowProvider, Background, MiniMap,
  SelectionMode, addEdge, useEdgesState, useNodesState,
  type Edge, type Node, type NodeChange, type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft, BoxSelect, Check, ChevronDown, ChevronRight,
  CircleDollarSign, CircleHelp, Compass, FileImage, Hand,
  Image as ImageIcon, Instagram, Layers3, Link2, Map as MapIcon, MapPin, Maximize2,
  MessageCircleQuestion, MousePointer2, MoveRight, PanelRightClose,
  Plane, Plus, Save, Sparkles, StickyNote, Trash2, Undo2, X,
  ZoomIn, ZoomOut,
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
  country?: string;
  heroImageUrl?: string;
  whyYours?: string;
  tripSummary?: string;
  budgetSummary?: string;
  highlights?: string[];
  days?: any[];
  tripMeta?: Record<string, any>;
};

type Lens = "canvas" | "map" | "budget";
type Tool = "select" | "hand";
type ObjectKind =
  | "trip" | "day" | "note" | "question" | "photo" | "booking"
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
        kind: "note", title: it ? "Quello che conta" : "What matters",
        text: trip.whyYours || (it ? "Aggiungi qui desideri, confini e priorità." : "Add wishes, boundaries and priorities here."),
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
  const { lang } = useI18n();
  const { toast } = useToast();
  const it = lang === "it";
  const L = useCallback((italian: string, english: string) => it ? italian : english, [it]);
  const [library, setLibrary] = useState<RawTrip[]>([]);
  const [trip, setTrip] = useState<RawTrip | null>(null);
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<TravelNode>([]);
  const [edges, setEdges, onEdgesChangeBase] = useEdgesState<Edge>([]);
  const [loading, setLoading] = useState(true);
  const [lens, setLens] = useState<Lens>("canvas");
  const [tool, setTool] = useState<Tool>("select");
  const [zoom, setZoom] = useState(1);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Array<{ nodes: TravelNode[]; edges: Edge[] }>>([]);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiActions, setAiActions] = useState<string[]>([]);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [guideOpen, setGuideOpen] = useState(() => typeof window !== "undefined" && localStorage.getItem(STUDIO_GUIDE_KEY) !== "1");
  const flowRef = useRef<ReactFlowInstance<TravelNode, Edge> | null>(null);
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
      requestAnimationFrame(() => flowRef.current?.fitView({ padding: .13, duration: 450 }));
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
    requestAnimationFrame(() => flowRef.current?.fitView({ padding: .13, duration: 450 }));
  };

  const pushHistory = useCallback(() => setHistory(previous => [...previous.slice(-19), { nodes: clone(nodes), edges: clone(edges) }]), [edges, nodes]);
  const markChanged = useCallback(() => setDirty(true), []);
  const onNodesChange = useCallback((changes: NodeChange<TravelNode>[]) => {
    onNodesChangeBase(changes);
    if (changes.some(change => change.type !== "select" && change.type !== "dimensions")) markChanged();
  }, [markChanged, onNodesChangeBase]);
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
    setNodes(snapshot.nodes); setEdges(snapshot.edges); setHistory(previous => previous.slice(0, -1)); setDirty(true);
  };

  const addObject = (kind: Exclude<ObjectKind, "trip" | "day" | "budget" | "map" | "mood" | "proposal" | "group">) => {
    pushHistory();
    const center = flowRef.current?.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }) ?? { x: 500, y: 350 };
    const id = `${kind}-${Date.now().toString(36)}`;
    const defaults: Record<string, TravelNodeData> = {
      note: { kind, title: L("Nuova nota", "New note"), text: L("Scrivi qui un desiderio, un limite o un'intuizione.", "Write a wish, boundary or intuition here."), status: "idea" },
      question: { kind, title: L("Domanda aperta", "Open question"), text: L("Cosa dobbiamo ancora decidere?", "What do we still need to decide?"), status: "idea" },
      photo: { kind, title: L("Ispirazione", "Inspiration"), text: L("Perché questa immagine ti attrae?", "Why does this image pull you in?"), image: "", status: "idea" },
      booking: { kind, title: L("Nuova prenotazione", "New booking"), text: L("Aggiungi orario, riferimento e dettagli.", "Add time, reference and details."), bookingType: "Volo / hotel / attività", status: "idea" },
      maybe: { kind, title: "Maybe", text: L("Un'alternativa da valutare.", "An alternative to consider."), items: [], status: "idea" },
      social: { kind, title: L("Nuova ispirazione", "New inspiration"), text: L("Annota perché vale la pena ricordarla.", "Note why it is worth remembering."), url: "", provider: "Web", embedUrl: "", assignedDay: null, status: "idea" },
    };
    setNodes(previous => [...previous, { id, type: "travel", position: { x: center.x - 120, y: center.y - 80 }, data: defaults[kind] }]);
    setSelectedIds([id]); setInspectorOpen(true); setDirty(true);
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

  const closeGuide = () => {
    localStorage.setItem(STUDIO_GUIDE_KEY, "1");
    setGuideOpen(false);
    requestAnimationFrame(() => flowRef.current?.fitView({ padding: .13, duration: 350 }));
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

  const points = trip ? mapPoints(trip) : [];
  const budget = trip ? budgetData(trip) : { total: 0, target: 0, categories: [] };

  if (loading) return <div className="mr-studio-loading"><span /><p>{L("Apro la tua scrivania di viaggio…", "Opening your travel desk…")}</p></div>;

  return <div className="mr-studio">
    <header className="mr-studio-topbar">
      <div className="mr-studio-brand">
        <button onClick={() => setLocation("/my-account")} aria-label={L("Torna ai viaggi", "Back to trips")}><ArrowLeft size={17} /></button>
        <FlowNavLogo size={25} />
        <span>mindroute</span>
      </div>
      <div className="mr-trip-switcher">
        <span>{L("I miei viaggi", "My trips")}</span><i>/</i>
        <select value={trip?.id ?? ""} onChange={event => { const next = library.find(item => item.id === Number(event.target.value)); if (next) openTrip(next); }}>
          {library.map(item => <option key={item.id} value={item.id}>{item.destinationName ?? L("Viaggio", "Trip")}</option>)}
        </select><ChevronDown size={14} />
      </div>
      <div className="mr-top-actions">
        {trip && <button className="mr-classic-mode" onClick={() => setLocation(`/itinerary/${trip.id}`)}><Compass size={14} /><span>{L("Itinerario", "Itinerary")}</span></button>}
        <button className="share"><Link2 size={14} />{L("Condividi", "Share")}</button>
        <button onClick={undo} disabled={!history.length} aria-label={L("Annulla", "Undo")}><Undo2 size={16} /></button>
        <button className="mr-save-state" onClick={() => saveCanvas()} disabled={!trip || saving}><Save size={15} /><span>{saving ? L("Salvo", "Saving") : dirty ? L("Salva", "Save") : L("Salvato", "Saved")}</span></button>
        <LangDropdown variant="dark" />
      </div>
    </header>

    <main className="mr-studio-main">
      <nav className="mr-object-toolbar" aria-label={L("Strumenti canvas", "Canvas tools")}>
        <button className="new" onClick={() => setLocation("/start")}><Plus size={19} /><span>{L("Nuovo", "New")}</span></button>
        <div className="sep" />
        <button data-label={L("Seleziona", "Select")} className={tool === "select" ? "on" : ""} onClick={() => setTool("select")} title={L("Seleziona", "Select")}><MousePointer2 size={18} /></button>
        <button data-label={L("Sposta", "Pan")} className={tool === "hand" ? "on" : ""} onClick={() => setTool("hand")} title={L("Sposta canvas", "Pan canvas")}><Hand size={18} /></button>
        <div className="sep" />
        <button data-label={L("Nota", "Note")} onClick={() => addObject("note")} title={L("Nota", "Note")}><StickyNote size={18} /></button>
        <button data-label={L("Domanda", "Question")} onClick={() => addObject("question")} title={L("Domanda", "Question")}><MessageCircleQuestion size={18} /></button>
        <button data-label={L("Immagine", "Image")} onClick={() => addObject("photo")} title={L("Immagine", "Image")}><FileImage size={18} /></button>
        <button data-label={L("Prenotazione", "Booking")} onClick={() => addObject("booking")} title={L("Prenotazione", "Booking")}><Plane size={18} /></button>
        <button data-label={L("Ispirazione", "Inspiration")} onClick={() => addObject("social")} title={L("Salva link Instagram, TikTok o web", "Save an Instagram, TikTok or web link")}><Instagram size={18} /></button>
        <button data-label="Maybe" onClick={() => addObject("maybe")} title="Maybe"><Layers3 size={18} /></button>
        <div className="sep" />
        <button data-label={L("Raggruppa", "Group")} onClick={groupSelection} disabled={selectedIds.length < 2} title={L("Raggruppa", "Group")}><BoxSelect size={18} /></button>
        <button data-label={L("Elimina", "Delete")} onClick={deleteSelection} disabled={!selectedIds.length} title={L("Elimina", "Delete")}><Trash2 size={18} /></button>
        <button data-label={L("Come funziona", "How it works")} onClick={() => setGuideOpen(true)} title={L("Come funziona", "How it works")}><CircleHelp size={18} /></button>
      </nav>

      {lens === "canvas" && <div className="mr-flow-wrap">
        {trip ? <ReactFlow<TravelNode, Edge>
          nodes={nodes} edges={edges} nodeTypes={nodeTypes}
          onNodesChange={onNodesChange} onEdgesChange={changes => { onEdgesChangeBase(changes); if (changes.some(change => change.type !== "select")) setDirty(true); }}
          onInit={instance => { flowRef.current = instance; setTimeout(() => instance.fitView({ padding: .13 }), 80); }}
          onMove={(_, viewport) => setZoom(viewport.zoom)}
          onSelectionChange={({ nodes: selected }) => { const ids = selected.map(node => node.id); setSelectedIds(ids); if (ids.length === 1) setInspectorOpen(true); }}
          onNodeDoubleClick={(_, node) => { setSelectedIds([node.id]); setInspectorOpen(true); }}
          onPaneClick={() => { setSelectedIds([]); setInspectorOpen(false); }}
          panOnDrag={tool === "hand" ? true : [1, 2]}
          nodesDraggable={tool === "select"} selectionOnDrag={tool === "select"}
          selectionMode={SelectionMode.Partial} multiSelectionKeyCode={["Shift", "Meta", "Control"]}
          deleteKeyCode={null} minZoom={.18} maxZoom={2.2} fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} color="rgba(30,28,25,.10)" />
          <MiniMap pannable zoomable className="mr-minimap" nodeColor={node => node.data.kind === "day" ? "#E86B52" : node.data.kind === "map" ? "#7FA6B3" : "#C7B9A8"} />
        </ReactFlow> : <div className="mr-empty-desk"><Compass size={34} /><span>MindRoute Studio</span><h1>{L("Prima crea il tuo viaggio.", "Create your trip first.")}</h1><p>{L("Il quiz genera un solo itinerario completo. Da qui potrai poi lavorarci manualmente o con l'AI.", "The quiz generates one complete itinerary. You can then work on it here manually or with AI.")}</p><button onClick={() => setLocation("/start")}><Plus size={15} />{L("Crea il primo viaggio", "Create first trip")}</button></div>}
      </div>}

      {lens === "canvas" && trip && !selectedIds.length && !aiOpen && !guideOpen && <div className="mr-canvas-hint"><MousePointer2 size={14} /><span>{L("Trascina per organizzare. Seleziona una card per modificarla o lavorarci con l'AI.", "Drag to organise. Select a card to edit it or work on it with AI.")}</span></div>}

      {lens === "canvas" && trip && !selectedIds.length && !aiOpen && !inspectorOpen && !guideOpen && <button className="mr-ai-launcher" onClick={() => setAiOpen(true)}><Sparkles size={17} /><span><strong>{L("Chiedi a MindRoute", "Ask MindRoute")}</strong><small>{L("Lavora su tutto il viaggio", "Work on the whole trip")}</small></span><ChevronRight size={15} /></button>}

      {lens === "map" && trip && <section className="mr-lens-view mr-map-lens">
        <div className="mr-lens-intro"><span>Spatial lens</span><h1>{trip.destinationName}</h1><p>{L("Gli stessi luoghi del canvas, ricomposti nello spazio.", "The same canvas places, rearranged in space.")}</p></div>
        <div className="mr-map-stage"><svg viewBox="0 0 1000 600" preserveAspectRatio="none"><path d="M90 430 C250 120 510 520 890 160" />{points.slice(0, 8).map((point, index) => <g key={`${point.lat}-${point.lng}-${index}`}><circle cx={110 + index * (760 / Math.max(points.length - 1, 1))} cy={index % 2 ? 345 : 230} r="13" /><text x={110 + index * (760 / Math.max(points.length - 1, 1))} y={(index % 2 ? 345 : 230) - 24}>{point.label}</text></g>)}</svg>{!points.length && <div className="mr-lens-empty"><MapPin size={25} /><p>{L("Aggiungi luoghi alle tappe: appariranno qui automaticamente.", "Add places to stops and they will appear here automatically.")}</p></div>}</div>
      </section>}

      {lens === "budget" && trip && <section className="mr-lens-view mr-budget-lens">
        <div className="mr-lens-intro"><span>Money lens</span><h1>{L("Dove va il budget", "Where the budget goes")}</h1><p>{L("Ogni costo appartiene allo stesso viaggio, non a un foglio separato.", "Every cost belongs to the same trip, not a separate spreadsheet.")}</p></div>
        <div className="mr-budget-dashboard"><div className="mr-big-ring" style={{ background: `conic-gradient(#E86B52 0 42%,#7FA6B3 42% 70%,#D3A65A 70% 88%,#B8A7C9 88% 100%)` }}><span><strong>€{budget.total}</strong><small>di €{budget.target}</small></span></div><div className="mr-budget-bars">{budget.categories.map(item => <div key={item.label}><p><span>{item.label}</span><strong>€{item.value}</strong></p><i><b style={{ width: `${Math.max(8, item.value / Math.max(budget.total, 1) * 100)}%`, background: item.color }} /></i></div>)}</div></div>
      </section>}

      <nav className="mr-lens-dock">
        {([
          ["canvas", <BoxSelect size={15} />, L("Piano", "Plan")], ["map", <MapIcon size={15} />, L("Mappa", "Map")],
          ["budget", <CircleDollarSign size={15} />, "Budget"],
        ] as [Lens, ReactNode, string][]).map(([id, icon, label]) => <button key={id} className={lens === id ? "on" : ""} onClick={() => setLens(id)}>{icon}<span>{label}</span></button>)}
      </nav>

      {lens === "canvas" && <div className="mr-zoom-tools"><button onClick={() => flowRef.current?.zoomOut()}><ZoomOut size={14} /></button><span>{Math.round(zoom * 100)}%</span><button onClick={() => flowRef.current?.zoomIn()}><ZoomIn size={14} /></button><button onClick={() => flowRef.current?.fitView({ padding: .13, duration: 350 })}><Maximize2 size={14} /></button></div>}

      {selectedIds.length > 0 && lens === "canvas" && <div className="mr-selection-bar"><span>{selectedIds.length} {selectedIds.length === 1 ? L("oggetto", "object") : L("oggetti", "objects")}</span><button onClick={() => setAiOpen(true)}><Sparkles size={14} />{L("Chiedi all'AI", "Ask AI")}</button>{selectedIds.length > 1 && <button onClick={groupSelection}><BoxSelect size={14} />{L("Raggruppa", "Group")}</button>}<button onClick={deleteSelection}><Trash2 size={14} /></button></div>}

      {inspectorOpen && selectedNode && !aiOpen && <aside className="mr-inspector-float">
        <header><div><span>{selectedNode.data.kind}</span><strong>{L("Modifica il viaggio", "Edit the trip")}</strong></div><button onClick={() => setInspectorOpen(false)}><PanelRightClose size={16} /></button></header>
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
        {selectedNode.data.kind === "budget" && <div className="mr-budget-editor">
          <label>{L("Costi prenotabili", "Bookable costs")}<input type="number" min="0" value={trip?.tripMeta?.total_cost_bookable ?? 0} onChange={event => updateSelectedData({ bookable: Number(event.target.value) })} /></label>
          <label>{L("Costi in loco", "On-site costs")}<input type="number" min="0" value={trip?.tripMeta?.total_cost_onsite_estimate ?? 0} onChange={event => updateSelectedData({ onsite: Number(event.target.value) })} /></label>
          <label>{L("Tetto desiderato", "Target budget")}<input type="number" min="0" value={trip?.tripMeta?.studio_budget_target ?? budget.target} onChange={event => updateSelectedData({ target: Number(event.target.value) })} /></label>
        </div>}
        {selectedNode.data.kind === "mood" && <label>{L("Immagini, una URL per riga", "Images, one URL per line")}<textarea value={(selectedNode.data.images ?? []).join("\n")} onChange={event => updateSelectedData({ images: event.target.value.split("\n").map(value => value.trim()).filter(Boolean) })} /></label>}
        {selectedNode.data.kind === "map" && <div className="mr-semantic-notice"><strong>{selectedNode.data.points?.length ?? 0} {L("luoghi riconosciuti", "recognised places")}</strong><p>{L("La mappa si aggiorna dai luoghi precisi inseriti nelle tappe dei giorni.", "The map updates from exact places entered in day stops.")}</p></div>}
        {!['trip','day','map','budget','mood','group'].includes(selectedNode.data.kind) && <div className="mr-status-control"><span>{L("Stato", "Status")}</span>{(["idea", "chosen", "booked"] as ObjectStatus[]).map(status => <button key={status} className={selectedNode.data.status === status ? "on" : ""} onClick={() => updateSelectedData({ status })}>{status === "idea" ? "Idea" : status === "chosen" ? L("Scelto", "Chosen") : L("Prenotato", "Booked")}</button>)}</div>}
        {['trip','day'].includes(selectedNode.data.kind) && <button className="mr-open-itinerary" onClick={() => setLocation(`/itinerary/${trip?.id}`)}>{L("Vedi nell'itinerario operativo", "View in operational itinerary")}<ChevronRight size={14} /></button>}
        <button className="mr-inspector-ai" onClick={() => setAiOpen(true)}><Sparkles size={14} />{L("Lavora su questo con MindRoute", "Work on this with MindRoute")}</button>
      </aside>}

      {guideOpen && trip && <div className="mr-guide-backdrop"><section className="mr-studio-guide">
        <button className="close" onClick={closeGuide}><X size={17} /></button>
        <span>{L("Studio visuale", "Visual Studio")}</span>
        <h2>{L("Lo stesso viaggio, un modo più libero di pensarlo.", "The same trip, a freer way to think about it.")}</h2>
        <p>{L("L'itinerario resta il documento completo. Qui organizzi idee, alternative e decisioni nello spazio, poi chiedi all'AI di intervenire sugli elementi che selezioni.", "The itinerary remains the complete document. Here you organise ideas, alternatives and decisions spatially, then ask AI to act on what you select.")}</p>
        <div className="mr-guide-steps">
          <article><b>01</b><MousePointer2 size={18} /><strong>{L("Organizza", "Organise")}</strong><small>{L("Trascina le card per dare spazio a piano, idee e alternative. La sequenza dei giorni resta automatica.", "Drag cards to make room for the plan, ideas and alternatives. Day sequence stays automatic.")}</small></article>
          <article><b>02</b><BoxSelect size={18} /><strong>{L("Seleziona", "Select")}</strong><small>{L("Una o più card diventano il contesto preciso della richiesta.", "One or more cards become the exact context for your request.")}</small></article>
          <article><b>03</b><Sparkles size={18} /><strong>{L("Chiedi all'AI", "Ask AI")}</strong><small>{L("Confronta scenari o applica modifiche al vero itinerario.", "Compare scenarios or apply changes to the real itinerary.")}</small></article>
        </div>
        <footer><button className="secondary" onClick={() => setLocation(`/itinerary/${trip?.id}`)}>{L("Vai all'itinerario classico", "Open classic itinerary")}</button><button className="primary" onClick={closeGuide}>{L("Inizia a esplorare", "Start exploring")}<ChevronRight size={15} /></button></footer>
      </section></div>}

      {aiOpen && <section className="mr-canvas-ai">
        <header><div><Sparkles size={15} /><span><strong>MindRoute AI</strong><small>{selectedIds.length ? `${selectedIds.length} oggetti nel contesto` : L("Intero viaggio", "Whole trip")}</small></span></div><button onClick={() => setAiOpen(false)}><X size={16} /></button></header>
        {aiReply && <div className="mr-ai-reply"><p>{aiReply}</p>{aiActions.map(action => <span key={action}><Check size={12} />{action}</span>)}{!aiStreaming && <button onClick={applyAiProposal}>{L("Applica modifiche", "Apply changes")}</button>}</div>}
        <form onSubmit={event => { event.preventDefault(); runCanvasAi(); }}><textarea autoFocus value={aiInput} onChange={event => setAiInput(event.target.value)} placeholder={L("Es. Rendimi questa parte più rilassata…", "E.g. Make this part more relaxed…")} /><button disabled={!aiInput.trim() || aiStreaming}>{aiStreaming ? <span className="mr-ai-pulse" /> : <MoveRight size={16} />}</button></form>
        {!aiReply && <div className="mr-ai-quick"><button onClick={() => setAiInput(L("Rendi questa parte più rilassata", "Make this part more relaxed"))}>{L("Più rilassato", "More relaxed")}</button><button onClick={() => setAiInput(L("Mostrami due scenari alternativi", "Show me two alternative scenarios"))}>{L("Due scenari", "Two scenarios")}</button><button onClick={() => setAiInput(L("Ha veramente senso? Valuta tempo, costi e ritmo", "Does this really make sense? Assess time, cost and pace"))}>{L("Ha senso?", "Does it make sense?")}</button></div>}
      </section>}

    </main>
  </div>;
}

export default function TravelStudio() {
  return <ReactFlowProvider><TravelStudioInner /></ReactFlowProvider>;
}
