import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation, useRoute } from "wouter";
import {
  ReactFlow, ReactFlowProvider, Background, MiniMap,
  SelectionMode, useEdgesState, useNodesState,
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
import { toEditedMoment } from "@shared/edited-moment";
import { buildJourneyStages } from "@/lib/itinerary-stages";
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

type StudioPortrait = {
  available: boolean;
  confidence: "nascent" | "forming" | "solid";
  tripCount: number;
  seek: string[];
  avoid: string[];
  ownWords: string | null;
  narrative: { portrait: string; paradox: string | null } | null;
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
const STUDIO_GUIDE_KEY = "mindroute-studio-guide-seen-v2";

const clone = <T,>(value: T): T => {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const dayNumber = (day: any, index: number) => day?.day_number ?? day?.dayNumber ?? index + 1;
const dayTitle = (day: any, index: number) => day?.title_evocative ?? day?.title ?? `Giorno ${dayNumber(day, index)}`;
const momentsOf = (day: any): any[] => Array.isArray(day?.editedMoments) ? day.editedMoments : Array.isArray(day?.moments) ? day.moments : [];
const momentTitle = (moment: any) => moment?.title_operational ?? moment?.title_evocative ?? moment?.title ?? "Tappa";
const momentTime = (moment: any) => moment?.start_time ?? moment?.startTime ?? moment?.time_label ?? moment?.t ?? moment?.band ?? "";
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
  const moments = (trip.days ?? []).flatMap((day, dayIndex) => momentsOf(day).map(moment => ({ moment, day: dayIndex + 1 })));
  const categoryOf = (moment: any, fallback?: string) => {
    if (fallback && fallback !== "custom") return fallback;
    const type = String(moment?.type ?? "").toLowerCase();
    if (/hotel|stay|accommodation|alloggio/.test(type)) return "lodging";
    if (/food|restaurant|lunch|dinner|cafe|cibo|pranzo|cena/.test(type)) return "food";
    if (/beach|mare|spiaggia/.test(type)) return "beach";
    if (/sight|museum|landmark|culture|visit|museo|visita/.test(type)) return "sight";
    if (/experience|activity|tour|esperienza|attivita/.test(type)) return "experience";
    return "custom";
  };

  return mapPoints(trip).map((point: any, index) => {
    const day = Number(point.day ?? 1);
    const match = moments.find(entry => {
      if (entry.day !== day) return false;
      const lat = Number(entry.moment?.location_lat ?? entry.moment?.lat);
      const lng = Number(entry.moment?.location_lng ?? entry.moment?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng)
        && Math.abs(lat - Number(point.lat)) < .0002
        && Math.abs(lng - Number(point.lng)) < .0002;
    })?.moment;
    const booking = match?.booking ?? {};
    const duration = Number(match?.duration_min ?? 0);
    return {
      ...point,
      label: point.label || (match ? momentPlace(match) || momentTitle(match) : `Tappa ${index + 1}`),
      day,
      category: categoryOf(match, point.category),
      momentId: match?.id ?? point.momentId,
      imageUrl: point.imageUrl ?? momentImage(match),
      durationLabel: point.durationLabel ?? (duration ? `${duration} min` : undefined),
      bestTime: point.bestTime ?? momentTime(match),
      kindLabel: point.kindLabel ?? String(match?.type ?? "").replace(/_/g, " "),
      desc: point.desc ?? momentDescription(match) ?? match?.guide?.what_it_is,
      bookable: point.bookable ?? Boolean(booking.affiliate_url),
      ctaUrl: point.ctaUrl ?? point.affiliateUrl ?? booking.affiliate_url,
      cta: point.cta ?? booking.display_label,
      ctaProvider: point.ctaProvider ?? booking.provider,
      type: point.type ?? match?.type,
    };
  });
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
    ...(patch.time !== undefined ? { start_time: patch.time, startTime: patch.time, t: patch.time } : {}),
    ...(patch.place !== undefined ? { location_name: patch.place, locationName: patch.place } : {}),
    ...(patch.image !== undefined ? { image_url: patch.image, imageUrl: patch.image } : {}),
    ...(patch.description !== undefined ? { description_short: patch.description, description: patch.description, desc: patch.description } : {}),
  };
}

function serializeEditedMoments(moments: any[]) {
  return moments.map(moment => toEditedMoment({
    ...moment,
    title: momentTitle(moment),
    startTime: momentTime(moment),
    locationName: momentPlace(moment),
    imageUrl: momentImage(moment),
    desc: momentDescription(moment),
  }));
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
  const [portrait, setPortrait] = useState<StudioPortrait | null>(null);
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
  const [aiProposalReady, setAiProposalReady] = useState(false);
  const [aiProposalContextIds, setAiProposalContextIds] = useState<string[]>([]);
  const [arrivalOpen, setArrivalOpen] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("created") === "1");
  const [guideOpen, setGuideOpen] = useState(() => typeof window !== "undefined"
    && localStorage.getItem(STUDIO_GUIDE_KEY) !== "1"
    && new URLSearchParams(window.location.search).get("created") !== "1");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editRevision = useRef(0);
  const deepLinkHandled = useRef(false);
  const markDirty = useCallback(() => {
    editRevision.current += 1;
    setDirty(true);
  }, []);

  const loadLibrary = useCallback(async (preferredId?: number) => {
    const response = await fetch(`/api/my-trips?lang=${lang}`);
    if (!response.ok) throw new Error("trips");
    const rows = await response.json() as RawTrip[];
    setLibrary(rows);
    const next = rows.find(item => item.id === preferredId) ?? rows[0] ?? null;
    if (next) {
      const doc = mergeCanvasWithTrip(next, next.tripMeta?.studio_canvas ?? null, it);
      editRevision.current = 0;
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

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      fetch(`/api/me/portrait?lang=${lang}`)
        .then(response => response.ok ? response.json() : null)
        .then((data: StudioPortrait | null) => { if (!cancelled) setPortrait(data?.available ? data : null); })
        .catch(() => { if (!cancelled) setPortrait(null); });
    }, 80);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [lang]);

  const openTrip = (next: RawTrip) => {
    if (dirty && !window.confirm(L("Aprire un altro viaggio senza salvare le modifiche?", "Open another trip without saving changes?"))) return;
    const doc = mergeCanvasWithTrip(next, next.tripMeta?.studio_canvas ?? null, it);
    editRevision.current = 0;
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

  const saveCanvas = useCallback(async (quiet = false): Promise<boolean> => {
    if (!trip || saving) return false;
    const revision = editRevision.current;
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
      const savedTrip = { ...trip, tripMeta: { ...(trip.tripMeta ?? {}), studio_canvas: payload } };
      setDirty(editRevision.current !== revision);
      setTrip(previous => previous ? { ...previous, tripMeta: { ...(previous.tripMeta ?? {}), studio_canvas: payload } } : previous);
      setLibrary(previous => previous.map(item => item.id === trip.id ? savedTrip : item));
      if (!quiet) toast({ title: L("Scrivania salvata", "Desk saved") });
      return true;
    } catch {
      if (!quiet) toast({ title: L("Salvataggio non riuscito", "Save failed"), variant: "destructive" });
      return false;
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
    setNodes(snapshot.nodes); setEdges(snapshot.edges); setHistory(previous => previous.slice(0, -1)); markDirty();
  };

  const redo = () => {
    const snapshot = futureHistory[futureHistory.length - 1];
    if (!snapshot) return;
    setHistory(previous => [...previous.slice(-19), { nodes: clone(nodes), edges: clone(edges) }]);
    setNodes(snapshot.nodes); setEdges(snapshot.edges); setFutureHistory(previous => previous.slice(0, -1)); markDirty();
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
    setSelectedIds([id]); setInspectorOpen(true); markDirty();
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
    setView("plan"); setAddMenuOpen(false); setSelectedIds([`day-${index}`]); setInspectorOpen(true); markDirty();
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
    setSelectedIds([]); setInspectorOpen(false); markDirty();
  };

  const duplicateSelection = () => {
    if (!selectedNode || ["trip", "day", "map", "budget", "mood"].includes(selectedNode.data.kind)) return;
    pushHistory();
    const id = `${selectedNode.data.kind}-${Date.now().toString(36)}`;
    setNodes(previous => [...previous, { ...clone(selectedNode), id, selected: false, position: { x: selectedNode.position.x + 34, y: selectedNode.position.y + 34 } }]);
    setSelectedIds([id]); setContextMenu(null); markDirty();
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
    markDirty();
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
    setSelectedIds([]); setInspectorOpen(false); markDirty();
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
    setSelectedIds([groupId]); markDirty();
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
      const editedMoments = serializeEditedMoments(nextData.moments ?? []);
      setTrip(previous => previous ? { ...previous, days: (previous.days ?? []).map((day, dayIndex) => dayIndex === index ? {
        ...day,
        title: nextData.title,
        title_evocative: nextData.title,
        subtitle: nextData.subtitle ?? "",
        hero_image_url: nextData.image ?? "",
        editedMoments,
        ...(Array.isArray(day?.moments) ? { moments: nextData.moments ?? [] } : {}),
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
    markDirty();
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
    markDirty();
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

  const addMomentToDay = (dayIndex: number) => {
    if (!trip?.days?.[dayIndex]) return;
    const dayNode = nodes.find(node => node.id === `day-${dayIndex}`);
    const currentMoments = dayNode?.data.moments ?? dayNodeData(trip, trip.days[dayIndex], dayIndex).moments ?? [];
    const moments = [...currentMoments, updateMomentFields({ id: `manual-${Date.now()}`, type: "experience" }, { title: L("Nuova tappa", "New stop"), time: "", place: "" })];
    setTrip(previous => previous ? { ...previous, days: (previous.days ?? []).map((day, index) => index === dayIndex ? {
      ...day,
      editedMoments: serializeEditedMoments(moments),
      ...(Array.isArray(day?.moments) ? { moments } : {}),
    } : day) } : previous);
    setNodes(previous => previous.map(node => node.id === `day-${dayIndex}` ? { ...node, data: { ...node.data, moments } } : node));
    setSelectedIds([`day-${dayIndex}`]);
    setInspectorOpen(true);
    markDirty();
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
      ...item, editedMoments: serializeEditedMoments(updatedMoments), ...(Array.isArray(item?.moments) ? { moments: updatedMoments } : {}),
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
      ...item, editedMoments: serializeEditedMoments(updatedMoments), ...(Array.isArray(item?.moments) ? { moments: updatedMoments } : {}),
    } : item) } : previous);
    setNodes(previous => previous.map(node => node.id === `day-${dayIndex}`
      ? { ...node, data: { ...node.data, moments: updatedMoments, status: "chosen" } }
      : node.id === source.id ? { ...node, data: { ...node.data, assignedDay: dayIndex, status: "chosen" } } : node));
    markDirty();
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
    setContextMenu(null); markDirty();
    toast({ title: L("Salvato in Maybe", "Saved to Maybe") });
  };

  const closeGuide = () => {
    localStorage.setItem(STUDIO_GUIDE_KEY, "1");
    setGuideOpen(false);
  };

  const runCanvasAi = async (message?: string) => {
    if (!trip || aiStreaming) return;
    const request = (message ?? aiInput).trim();
    if (!request) return;
    const isApplying = message?.startsWith("Confermo") || message?.startsWith("I confirm");
    if (isApplying && dirty) await saveCanvas();
    const contextIds = isApplying ? aiProposalContextIds : selectedIds;
    const contextNodes = nodes.filter(node => contextIds.includes(node.id));
    if (!isApplying) setAiProposalContextIds([...selectedIds]);
    const context = contextNodes.map(node => JSON.stringify({
      kind: node.data.kind, title: node.data.title, note: node.data.text,
      url: node.data.url, assignedDay: node.data.assignedDay,
      dayIndex: node.data.dayIndex, moments: node.data.kind === "day" ? node.data.moments : undefined,
    })).join("; ");
    const prompt = `${L("Contesto selezionato nel viaggio", "Selected trip context")}: ${context || L("intero viaggio", "whole trip")}. ${L("Richiesta", "Request")}: ${request}. ${L("Rispondi in modo breve con una proposta concreta. Non applicare cambiamenti finché non confermo.", "Reply briefly with a concrete proposal. Do not apply changes until I confirm.")}`;
    setAiInput(""); setAiReply(""); setAiActions([]); setAiProposalReady(false); setAiStreaming(true); setAiOpen(true);
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
      if (full && !isApplying) setAiProposalReady(true);
      if (isApplying) {
        await loadLibrary(trip.id);
        setAiProposalContextIds([]);
        toast({ title: L("Modifiche applicate al viaggio", "Changes applied to the trip") });
      }
    } catch {
      setAiReply(L("Non sono riuscito a preparare la proposta. Riprova tra poco.", "I couldn't prepare the proposal. Try again shortly."));
    } finally { setAiStreaming(false); }
  };

  const applyAiProposal = () => runCanvasAi(L("Confermo. Applica ora le modifiche proposte agli oggetti selezionati.", "I confirm. Apply the proposed changes to the selected objects now."));

  const discardAiProposal = () => {
    setAiReply("");
    setAiActions([]);
    setAiProposalReady(false);
    setAiProposalContextIds([]);
  };

  const budget = trip ? budgetData(trip) : { total: 0, target: 0, categories: [] };
  const points = trip ? routePoints(trip) : [];
  const rhythm = trip ? rhythmData(trip) : [];
  const logistics = trip ? (trip.days ?? []).flatMap((day, dayIndex) => momentsOf(day)
    .filter(moment => /transport|accommodation|flight|train|bus|ferry|hotel|transfer/i.test(String(moment?.type ?? "")))
    .map(moment => ({ ...moment, dayIndex, title: momentTitle(moment), time: momentTime(moment), place: momentPlace(moment) }))) : [];
  const allMoments = trip ? (trip.days ?? []).flatMap(momentsOf) : [];
  const mappedMomentCount = allMoments.filter(moment => {
    const lat = Number(moment?.location_lat ?? moment?.lat);
    const lng = Number(moment?.location_lng ?? moment?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng);
  }).length;
  const unmappedMomentCount = Math.max(0, allMoments.length - mappedMomentCount);
  const mappedDayCount = new Set(points.map(point => point.day)).size;
  const firstUnmappedDay = trip ? (trip.days ?? []).findIndex(day => momentsOf(day).some(moment => {
    const lat = Number(moment?.location_lat ?? moment?.lat);
    const lng = Number(moment?.location_lng ?? moment?.lng);
    return !Number.isFinite(lat) || !Number.isFinite(lng);
  })) : -1;
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
  const strategySignals = Array.from(new Set([
    ...(portrait?.seek ?? []),
    ...(trip?.highlights ?? []),
  ].map(value => String(value).trim()).filter(Boolean))).slice(0, 4);
  const avoidSignals = Array.from(new Set((portrait?.avoid ?? []).map(value => String(value).trim()).filter(Boolean))).slice(0, 3);
  const portraitConfidence = portrait?.confidence === "solid"
    ? L("Profilo consolidato", "Established profile")
    : portrait?.confidence === "forming"
      ? L("Profilo in formazione", "Developing profile")
      : L("Prime indicazioni", "Early signals");
  const overviewNode = nodes.find(node => node.data.kind === "trip");
  const noteNode = nodes.find(node => node.id === "intent-note") ?? nodes.find(node => node.data.kind === "note");
  const moodNode = nodes.find(node => node.data.kind === "mood");
  const maybeNode = nodes.find(node => node.data.kind === "maybe");
  const budgetNode = nodes.find(node => node.data.kind === "budget");
  const planImages = (moodNode?.data.images ?? ambientImages(trip ?? ({ id: 0 } as RawTrip))).slice(0, 6);
  const activePlanDayIndex = selectedNode?.data.kind === "day"
    ? Math.max(0, Number(selectedNode.data.dayIndex ?? 0))
    : 0;
  const activePlanDay = trip?.days?.[activePlanDayIndex];
  const activePlanMoments = activePlanDay ? momentsOf(activePlanDay) : [];
  const activePlanImage = activePlanDay?.hero_image_url
    || activePlanMoments.map(momentImage).find(Boolean)
    || trip?.heroImageUrl
    || "";
  const planStages = useMemo(() => trip ? buildJourneyStages(trip) : [], [trip]);
  const strategyCards = [
    {
      icon: <Gauge size={18} />,
      title: strategySignals[0] || L("Ritmo coerente", "A fitting pace"),
      detail: L("Giornate costruite per lasciare spazio all'esperienza, non solo alle tappe.", "Days built to leave room for the experience, not just the stops."),
    },
    {
      icon: <Compass size={18} />,
      title: strategySignals[1] || L("Luoghi che hanno senso", "Places that make sense"),
      detail: L("Ogni scelta è collegata a ciò che cerchi davvero nel viaggio.", "Every choice connects to what you genuinely seek from the trip."),
    },
    {
      icon: <MoveRight size={18} />,
      title: strategySignals[2] || L("Spostamenti più semplici", "Simpler transfers"),
      detail: L("Il percorso limita attriti e cambi inutili per mantenere il viaggio fluido.", "The route limits friction and unnecessary changes to keep the trip fluid."),
    },
  ];
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

  const selectDay = (index: number) => {
    const id = `day-${index}`;
    setView("plan"); setSelectedIds([id]); setInspectorOpen(false); setAiOpen(false);
  };

  const editDay = (index: number) => {
    const id = `day-${index}`;
    setView("plan"); setSelectedIds([id]); setInspectorOpen(true); setAiOpen(false);
  };

  useEffect(() => {
    if (!trip || !nodes.length || deepLinkHandled.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const day = Number(params.get("day"));
    if (Number.isInteger(day) && day > 0 && day <= (trip.days?.length ?? 0)) {
      setView("plan");
      setSelectedIds([`day-${day - 1}`]);
      setInspectorOpen(true);
    } else if (params.get("view") === "control") {
      setView("control");
    }
    if (params.get("ai") === "1") setAiOpen(true);
    if (params.get("created") === "1") setArrivalOpen(true);
    deepLinkHandled.current = true;
    if (window.location.search) window.history.replaceState({}, "", window.location.pathname);
  }, [nodes.length, trip]);

  const resolveControlCheck = (item: typeof controlChecks[number]) => {
    if (item.toggle) {
      updateControlFlag(item.toggle);
      return;
    }
    if (item.key === "plan") {
      editDay(emptyDays[0]?.index ?? 0);
      return;
    }
    if (item.key === "decisions") {
      const question = nodes.find(node => node.data.kind === "question" && node.data.status !== "chosen");
      if (question) openNode(question);
      else openNode(maybeNode);
      return;
    }
    if (item.key === "budget") {
      openNode(budgetNode);
      return;
    }
    if (item.key === "places") {
      const dayIndex = (trip?.days ?? []).findIndex(day => momentsOf(day).some(moment => !momentPlace(moment).trim()));
      editDay(Math.max(0, dayIndex));
      return;
    }
    setAiInput(L(`Aiutami a risolvere: ${item.label}. ${item.detail}`, `Help me resolve: ${item.label}. ${item.detail}`));
    setAiOpen(true);
  };

  const aiContextIds = aiProposalReady ? aiProposalContextIds : selectedIds;
  const aiContextNodes = nodes.filter(node => aiContextIds.includes(node.id));
  const aiContextLabel = aiContextNodes.length === 1 && aiContextNodes[0].data.kind === "day"
    ? L(`Giorno ${(aiContextNodes[0].data.dayIndex ?? 0) + 1}`, `Day ${(aiContextNodes[0].data.dayIndex ?? 0) + 1}`)
    : aiContextNodes.length === 1
      ? aiContextNodes[0].data.title
      : aiContextNodes.length > 1
        ? L(`${aiContextNodes.length} elementi selezionati`, `${aiContextNodes.length} selected items`)
        : L("Intero viaggio", "Whole trip");

  const dayReason = (day: any, index: number) => day?.why_this
    ?? day?.whyThis
    ?? day?.intent
    ?? day?.subtitle
    ?? L(
      index === 0 ? "Introduce gradualmente il luogo senza sovraccaricare l'arrivo." : "Mantiene il ritmo del viaggio coerente con le tue priorità.",
      index === 0 ? "Introduces the place gradually without overloading arrival." : "Keeps the trip pace aligned with your priorities.",
    );

  if (loading) return <div className="mr-studio-loading"><span /><p>{L("Apro la tua scrivania di viaggio…", "Opening your travel desk…")}</p></div>;

  return <div className={`mr-studio mr-studio-${view}`}>
    <header className="mr-studio-topbar">
      <div className="mr-studio-brand">
        <FlowNavLogo size={25} />
        <span>Mindroute</span>
      </div>
      <nav className="mr-product-nav"><button className="on"><Sparkles size={15} />Studio</button>{trip && <button onClick={() => setLocation(`/itinerary/${trip.id}`)}><ClipboardList size={15} />{L("Itinerario", "Itinerary")}</button>}<button onClick={() => setLocation("/my-account?view=portrait")}><UserRound size={15} />Portrait</button></nav>
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
        <button className="mr-history-action" onClick={undo} disabled={!history.length} aria-label={L("Annulla", "Undo")}><Undo2 size={16} /></button>
        <button className="mr-history-action" onClick={redo} disabled={!futureHistory.length} aria-label={L("Ripristina", "Redo")}><Redo2 size={16} /></button>
        <button className={`mr-save-state ${saving ? "saving" : dirty ? "dirty" : "saved"}`} onClick={() => saveCanvas()} disabled={!trip || saving} aria-live="polite"><Save size={15} /><span>{saving ? L("Salvo…", "Saving…") : dirty ? L("Modifiche in corso", "Changes pending") : L("Salvato", "Saved")}</span></button>
        <LangDropdown variant="dark" />
      </div>
    </header>

    <main className="mr-studio-main">
      {view !== "plan" && <nav className="mr-object-toolbar" aria-label={L("Strumenti del piano", "Plan tools")}>
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
      </nav>}

      {view === "plan" && <div className="mr-structured-plan">
        {trip ? <div className="mr-plan-workspace">
          <aside className="mr-plan-outline">
            <div className="mr-plan-add-wrap">
              <button className="mr-plan-add" onClick={() => setAddMenuOpen(value => !value)}><Plus size={17} />{L("Aggiungi", "Add")}<ChevronDown size={13} /></button>
              {addMenuOpen && <div className="mr-plan-add-menu">
                <button onClick={addDay}><CalendarDays size={14} />{L("Giorno", "Day")}</button>
                <button onClick={() => addObject("place")}><MapIcon size={14} />{L("Luogo", "Place")}</button>
                <button onClick={() => addObject("maybe")}><Layers3 size={14} />Maybe</button>
                <button onClick={() => addObject("note")}><StickyNote size={14} />{L("Nota", "Note")}</button>
                <button onClick={() => addObject("booking")}><Plane size={14} />{L("Logistica", "Logistics")}</button>
                <button onClick={() => addObject("social")}><Instagram size={14} />{L("Ispirazione", "Inspiration")}</button>
              </div>}
            </div>
            <nav>
              <button className={selectedIds.includes("trip-overview") ? "on" : ""} onClick={() => openNode(overviewNode)}><Compass size={14} /><span>{L("Panoramica", "Overview")}</span></button>
              <div className="mr-outline-label">{L("Itinerario", "Itinerary")}</div>
              {(trip.days ?? []).map((day, index) => <button key={index} className={selectedIds.includes(`day-${index}`) ? "on" : ""} onClick={() => selectDay(index)}><span className="mr-outline-day">{index + 1}</span><span><strong>{dayTitle(day, index)}</strong><small>{momentsOf(day).length} {L("tappe", "stops")}</small></span></button>)}
              <div className="mr-outline-label">{L("Strumenti", "Tools")}</div>
              <button onClick={() => setView("map")}><MapIcon size={14} /><span>{L("Mappa", "Map")}</span></button>
              <button onClick={() => setView("control")}><FileCheck2 size={14} /><span>{L("Controllo", "Control")}</span>{readiness < 100 && <em>{100 - readiness}%</em>}</button>
              <button onClick={() => openNode(maybeNode)}><Layers3 size={14} /><span>Maybe</span><em>{maybeNode?.data.items?.length ?? 0}</em></button>
            </nav>
            <button className="mr-outline-portrait" onClick={() => setLocation("/my-account?view=portrait")}><UserRound size={14} /><span><strong>{L("Il tuo Portrait", "Your Portrait")}</strong><small>{portraitConfidence}</small></span><ChevronRight size={13} /></button>
          </aside>

          <div className="mr-plan-scroll">
            <main className="mr-plan-editor">
              {arrivalOpen && <section className="mr-studio-arrival">
                <button className="close" onClick={() => setArrivalOpen(false)} aria-label={L("Chiudi", "Close")}><X size={14} /></button>
                <span><Sparkles size={14} />{L("Il tuo piano è pronto", "Your plan is ready")}</span>
                <h2>{L("Non è un risultato finale: è una base già ragionata da rendere tua.", "This is not a final result: it is a considered starting point to make your own.")}</h2>
                <p>{trip.whyYours || L("Abbiamo organizzato giorni, luoghi e ritmo intorno alle risposte del quiz. Ora puoi controllare il perché, modificare ogni dettaglio o aprire la versione da usare in viaggio.", "We organised days, places and pace around your quiz answers. Now review the reasoning, edit any detail or open the version to use while travelling.")}</p>
                <div><button onClick={() => { setArrivalOpen(false); selectDay(0); }}>{L("Inizia dal Giorno 1", "Start with Day 1")}<ChevronRight size={13} /></button><button onClick={() => { setArrivalOpen(false); setView("control"); }}>{L("Controlla il viaggio", "Check the trip")}<FileCheck2 size={13} /></button><button onClick={() => setLocation(`/itinerary/${trip.id}`)}>{L("Apri modalità viaggio", "Open trip mode")}<ClipboardList size={13} /></button></div>
              </section>}
              <button className={`mr-plan-hero${selectedIds.includes("trip-overview") ? " selected" : ""}`} onClick={() => openNode(overviewNode)}>
                <span className="mr-plan-hero-image" style={trip.heroImageUrl ? { backgroundImage: `url(${trip.heroImageUrl})` } : undefined}>{!trip.heroImageUrl && <Compass size={28} />}</span>
                <span className="mr-plan-hero-shade" />
                <span className="mr-plan-hero-copy"><small>{L("Il tuo viaggio", "Your trip")}</small><strong>{trip.destinationName}</strong><p>{trip.tripSummary || trip.whyYours || L("Un viaggio costruito intorno a ciò che conta per te.", "A trip built around what matters to you.")}</p><em><span><CalendarDays size={13} />{trip.days?.length ?? 0} {L("giorni", "days")}</span><span><UserRound size={13} />{trip.tripMeta?.companions_label || L("Viaggiatori da definire", "Travellers TBD")}</span><span><Euro size={13} />€{budget.total.toLocaleString(lang === "it" ? "it-IT" : "en-US")}</span><span><Gauge size={13} />{L("Ritmo personale", "Personal pace")}</span></em></span>
                <i>{L("Modifica viaggio", "Edit trip")}<ChevronRight size={14} /></i>
              </button>

              <section className="mr-plan-strategy">
                <header><span>{L("La tua strategia", "Your strategy")}</span><button onClick={() => setLocation("/my-account?view=portrait")}>{L("Perché queste scelte?", "Why these choices?")}<ChevronRight size={13} /></button></header>
                <div className="mr-plan-strategy-grid">{strategyCards.map((card, index) => <article key={`${card.title}-${index}`}><i>{card.icon}</i><span><strong>{card.title}</strong><small>{card.detail}</small></span></article>)}</div>
              </section>

              <section className="mr-plan-day-list">
                <header><div><span>{L("Il tuo itinerario", "Your itinerary")}</span><h2>{L("Esplora il viaggio giorno per giorno", "Explore the trip day by day")}</h2></div><button onClick={addDay}><Plus size={13} />{L("Aggiungi giorno", "Add day")}</button></header>
                <div className="mr-plan-route-scroll">
                  <div className="mr-plan-route-grid" style={{ minWidth: `${Math.max(100, (trip.days?.length ?? 1) * 54)}px` }}>
                    <div className="mr-plan-stage-row" style={{ gridTemplateColumns: `repeat(${Math.max(1, trip.days?.length ?? 1)}, minmax(0, 1fr))` }}>
                      {planStages.map(stage => <button
                        key={stage.key}
                        className={`mr-plan-stage${stage.dayIndexes.includes(activePlanDayIndex) ? " selected" : ""}`}
                        style={{ gridColumn: `${stage.startIndex + 1} / ${stage.endIndex + 2}` }}
                        onClick={() => selectDay(stage.startIndex)}
                      >
                        <i style={stage.image ? { backgroundImage: `url(${stage.image})` } : undefined} />
                        <span><strong>{stage.name}</strong><em>{stage.dayIndexes.length} {stage.dayIndexes.length === 1 ? L("giorno", "day") : L("giorni", "days")}</em></span>
                      </button>)}
                    </div>
                    <div className="mr-plan-day-tabs" style={{ gridTemplateColumns: `repeat(${Math.max(1, trip.days?.length ?? 1)}, minmax(0, 1fr))` }}>
                      {(trip.days ?? []).map((day, index) => <button key={index} className={activePlanDayIndex === index ? "on" : ""} onClick={() => selectDay(index)} aria-label={`${L("Giorno", "Day")} ${index + 1}`}>{String(index + 1).padStart(2, "0")}</button>)}
                    </div>
                  </div>
                </div>
              </section>

              <div className="mr-plan-support-grid">
                <button className="mr-plan-support note" onClick={() => openNode(noteNode)}><header><span>{L("Note e vincoli", "Notes and constraints")}</span><ChevronRight size={13} /></header><p>{noteNode?.data.text || L("Aggiungi ciò che non dobbiamo dimenticare.", "Add what we must not forget.")}</p></button>
                <button className="mr-plan-support mood" onClick={() => openNode(moodNode)}><header><span>Moodboard</span><Plus size={13} /></header><div>{planImages.slice(0, 4).map((image: string, index: number) => <i key={`${image}-${index}`} style={{ backgroundImage: `url(${image})` }} />)}{!planImages.length && <small>{L("Aggiungi riferimenti visivi", "Add visual references")}</small>}</div></button>
                <button className="mr-plan-support maybe" onClick={() => openNode(maybeNode)}><header><span>{L("Maybe / Alternative", "Maybe / Alternatives")}</span><Plus size={13} /></header>{(maybeNode?.data.items ?? []).slice(0, 3).map((item: string, index: number) => <p key={`${item}-${index}`}>{item}<ChevronRight size={11} /></p>)}{!(maybeNode?.data.items ?? []).length && <small>{L("Idee ancora fuori dal piano", "Ideas still outside the plan")}</small>}</button>
                <button className="mr-plan-support open" onClick={() => setView("control")}><header><span>{L("Aperti", "Open")}</span><em>{controlChecks.filter(item => !item.ready).length}</em></header>{controlChecks.filter(item => !item.ready).slice(0, 3).map(item => <p key={item.key}><span>{item.label}</span><small>{item.detail}</small></p>)}{controlChecks.every(item => item.ready) && <small>{L("Tutto è pronto per partire", "Everything is ready to go")}</small>}</button>
              </div>
            </main>
          </div>

          <aside className={`mr-plan-context-rail${inspectorOpen || aiOpen ? " is-covered" : ""}`}>
            <section className="mr-plan-day-detail">
              <header><div><span>{L("Giorno", "Day")} {String(activePlanDayIndex + 1).padStart(2, "0")}</span><small>{activePlanMoments.length} {L("tappe", "stops")}</small></div><button onClick={() => editDay(activePlanDayIndex)} aria-label={L("Modifica giorno", "Edit day")}><MoreHorizontal size={16} /></button></header>
              <h2>{activePlanDay ? dayTitle(activePlanDay, activePlanDayIndex) : L("Giornata da costruire", "A day to build")}</h2>
              <p>{activePlanDay?.subtitle || dayReason(activePlanDay, activePlanDayIndex)}</p>
              <button className="mr-plan-day-photo" onClick={() => editDay(activePlanDayIndex)} style={activePlanImage ? { backgroundImage: `url(${activePlanImage})` } : undefined} aria-label={L("Modifica giorno", "Edit day")}><Maximize2 size={16} /></button>
              <div className="mr-plan-timeline">{activePlanMoments.map((moment, index) => <button key={moment.id ?? index} onClick={() => editDay(activePlanDayIndex)}><time>{momentTime(moment) || "--:--"}</time><i /><span style={momentImage(moment) ? { backgroundImage: `url(${momentImage(moment)})` } : undefined}>{!momentImage(moment) && <MapIcon size={13} />}</span><p><strong>{momentTitle(moment)}</strong><small>{momentPlace(moment) || momentDescription(moment) || L("Dettagli da completare", "Details to complete")}</small></p><MoreHorizontal size={14} /></button>)}{!activePlanMoments.length && <div className="mr-plan-empty-day"><CalendarDays size={20} /><span>{L("Questa giornata è ancora vuota.", "This day is still empty.")}</span></div>}</div>
              <button className="mr-plan-add-activity" onClick={() => addMomentToDay(activePlanDayIndex)}><Plus size={14} />{L("Aggiungi attività", "Add activity")}</button>
              <div className="mr-plan-detail-map">{points.some(point => point.day === activePlanDayIndex + 1) ? <Suspense fallback={<div className="mr-view-loading" />}><RouteMap points={points.filter(point => point.day === activePlanDayIndex + 1) as any} destination={trip.destinationName ?? ""} itineraryId={trip.id} t={t} lang={lang} bare hideDayBar /></Suspense> : <button onClick={() => editDay(activePlanDayIndex)}><MapIcon size={18} /><span>{L("Aggiungi i luoghi per vedere il percorso", "Add places to see the route")}</span></button>}</div>
            </section>
          </aside>
        </div> : <div className="mr-empty-desk"><Compass size={34} /><span>MindRoute Studio</span><h1>{L("Crea il tuo prossimo viaggio", "Create your next trip")}</h1><p>{L("Scegli come iniziare. Qualunque strada porta allo stesso spazio di lavoro e allo stesso itinerario.", "Choose how to begin. Every path leads to the same workspace and itinerary.")}</p><div><button onClick={() => { setStartMode("menu"); setNewTripOpen(true); }}><Plus size={15} />{L("Nuovo viaggio", "New trip")}</button></div></div>}
      </div>}

      {view === "map" && trip && <section className="mr-work-view mr-map-workspace">
        <header><span>{L("Vista geografica", "Geographic view")}</span><h1>{L("Dove accade il viaggio", "Where the trip happens")}</h1><p>{L("Luoghi reali, ordine dei giorni e distanze nello stesso piano.", "Real places, day order and distances in the same plan.")}</p></header>
        <div className="mr-map-summary">
          <div><strong>{points.length}</strong><span>{L("luoghi sulla mappa", "places on the map")}</span></div>
          <div><strong>{mappedDayCount}/{trip.days?.length ?? 0}</strong><span>{L("giorni geolocalizzati", "mapped days")}</span></div>
          <div><strong>{unmappedMomentCount}</strong><span>{L("tappe da precisare", "stops to locate")}</span></div>
          {firstUnmappedDay >= 0
            ? <button onClick={() => editDay(firstUnmappedDay)}><MapIcon size={14} />{L("Completa la prossima tappa", "Complete the next stop")}</button>
            : <button onClick={() => setAiOpen(true)}><Sparkles size={14} />{L("Ottimizza gli spostamenti", "Optimise transfers")}</button>}
        </div>
        {points.length ? <div className="mr-real-map"><Suspense fallback={<div className="mr-view-loading" />}><RouteMap points={points as any} destination={trip.destinationName ?? ""} itineraryId={trip.id} t={t} lang={lang} showPlaceLabels onOpenDay={(day: number) => selectDay(Math.max(0, day - 1))} /></Suspense></div>
          : <div className="mr-view-empty"><MapIcon size={25} /><h2>{L("Mancano luoghi precisi", "Exact places are missing")}</h2><p>{L("Apri un giorno e inserisci il luogo nelle sue tappe. La mappa si costruirà automaticamente.", "Open a day and add exact places to its stops. The map will build automatically.")}</p><button onClick={() => setView("plan")}>{L("Torna al Piano", "Back to Plan")}</button></div>}
      </section>}

      {view === "control" && trip && <section className="mr-work-view mr-control-workspace">
        <header><span>{L("Prontezza del viaggio", "Trip readiness")}</span><h1>{L("Prima di partire, guarda solo ciò che conta", "Before leaving, see only what matters")}</h1><p>{L("Ritmo, costi, logistica e verifiche leggono lo stesso viaggio. Qui emergono soltanto le cose da sistemare.", "Pace, costs, logistics and checks read the same trip. Only what needs attention appears here.")}</p></header>

        <div className="mr-control-hero">
          <div className="mr-readiness-ring" style={{ background: `conic-gradient(#63a58f 0 ${readiness}%,#e5ded4 ${readiness}% 100%)` }}><span><strong>{readiness}%</strong><small>{L("pronto", "ready")}</small></span></div>
          <div><span>{readiness >= 80 ? L("Quasi pronto a partire", "Almost ready to go") : L("Il viaggio sta prendendo forma", "The trip is taking shape")}</span><h2>{readiness >= 80 ? L("Restano pochi dettagli da confermare.", "Only a few details remain.") : L("Risolvi prima le decisioni che hanno più impatto.", "Resolve the highest-impact decisions first.")}</h2><p>{denseDays.length ? L(`${denseDays.length} giornate hanno un ritmo intenso.`, `${denseDays.length} days have an intense pace.`) : L("Il ritmo non presenta criticità evidenti.", "The pace has no obvious issues.")}</p></div>
          <button onClick={() => { setAiInput(L("Aiutami a risolvere le priorità aperte prima della partenza", "Help me resolve the open priorities before departure")); setAiOpen(true); }}><Sparkles size={15} />{L("Risolvi con l'AI", "Resolve with AI")}</button>
        </div>

        <div className="mr-control-checks">{controlChecks.map(item => <button key={item.key} className={item.ready ? "ready" : "attention"} onClick={() => resolveControlCheck(item)}>
          <span>{item.ready ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}</span><p><strong>{item.label}</strong><small>{item.detail}</small></p><em>{item.toggle ? (item.ready ? L("Rivedi", "Review") : L("Conferma", "Confirm")) : item.ready ? L("Apri", "Open") : L("Sistema", "Fix")}</em>
        </button>)}</div>

        <div className="mr-control-detail-grid">
          <section className="mr-control-card mr-control-rhythm"><header><span><Gauge size={15} />{L("Ritmo", "Pace")}</span><small>{denseDays.length ? L(`${denseDays.length} da rivedere`, `${denseDays.length} to review`) : L("Equilibrato", "Balanced")}</small></header><div className="mr-rhythm-list">{rhythm.map(day => <button key={day.index} onClick={() => editDay(day.index)}><span><small>{L("Giorno", "Day")} {day.index + 1}</small><strong>{day.title}</strong></span><div><i><b style={{ width: `${Math.max(6, day.intensity)}%` }} /></i><em>{day.intensity >= 75 ? L("Intenso", "Intense") : day.intensity >= 45 ? L("Equilibrato", "Balanced") : L("Lento", "Slow")}</em></div><ChevronRight size={15} /></button>)}</div></section>
          <section className="mr-control-card mr-control-budget"><header><span><Euro size={15} />Budget</span><small>{budget.total > budget.target ? L("Oltre il tetto", "Over target") : L("Sotto controllo", "Under control")}</small></header><div className="mr-budget-total"><span>{L("Stima attuale", "Current estimate")}</span><strong>€{budget.total.toLocaleString(lang === "it" ? "it-IT" : "en-US")}</strong><small>€{budget.target.toLocaleString(lang === "it" ? "it-IT" : "en-US")} {L("disponibili", "available")}</small><i><b style={{ width: `${Math.min(100, budget.total / Math.max(budget.target, 1) * 100)}%` }} /></i></div><div className="mr-budget-fields"><label>{L("Prenotabile", "Bookable")}<span>€<input type="number" min="0" value={trip.tripMeta?.total_cost_bookable ?? 0} onChange={event => updateBudgetValue("bookable", Number(event.target.value))} /></span></label><label>{L("In loco", "On site")}<span>€<input type="number" min="0" value={trip.tripMeta?.total_cost_onsite_estimate ?? 0} onChange={event => updateBudgetValue("onsite", Number(event.target.value))} /></span></label><label>{L("Tetto", "Target")}<span>€<input type="number" min="0" value={trip.tripMeta?.studio_budget_target ?? 0} onChange={event => updateBudgetValue("target", Number(event.target.value))} /></span></label></div></section>
        </div>

        <section className="mr-control-card mr-control-logistics"><header><span><Plane size={15} />{L("Logistica e prenotazioni", "Logistics and bookings")}</span><small>{pendingBookings ? L(`${pendingBookings} da completare`, `${pendingBookings} to complete`) : L("Vista operativa", "Operational view")}</small></header><div className="mr-logistics-grid">{logistics.map((item: any, index: number) => <button key={item.id ?? index} onClick={() => editDay(item.dayIndex)}><span><Plane size={16} /></span><p><small>{L("Giorno", "Day")} {item.dayIndex + 1} · {item.time || L("Orario da definire", "Time TBD")}</small><strong>{item.title}</strong><em>{item.place || L("Luogo da definire", "Place TBD")}</em></p><ChevronRight size={15} /></button>)}{nodes.filter(node => node.data.kind === "booking").map(node => <button key={node.id} onClick={() => { setView("plan"); setSelectedIds([node.id]); setInspectorOpen(true); }}><span><ClipboardList size={16} /></span><p><small>{L("Prenotazione", "Booking")}</small><strong>{node.data.title}</strong><em>{node.data.status === "booked" ? L("Confermata", "Confirmed") : L("Da completare", "To complete")}</em></p><ChevronRight size={15} /></button>)}{!logistics.length && !nodes.some(node => node.data.kind === "booking") && <div className="mr-view-empty"><Plane size={24} /><h2>{L("Nessuna logistica ancora", "No logistics yet")}</h2><p>{L("Aggiungi un volo, un hotel o un trasferimento dal pulsante Aggiungi.", "Add a flight, hotel or transfer from the Add button.")}</p></div>}</div></section>
      </section>}

      <nav className="mr-lens-dock" aria-label={L("Viste del viaggio", "Trip views")}>
        {([ ["plan", <BoxSelect size={15} />, L("Piano", "Plan")], ["map", <MapIcon size={15} />, L("Mappa", "Map")], ["control", <FileCheck2 size={15} />, L("Controllo", "Control")] ] as [StudioView, ReactNode, string][]).map(([id, icon, label]) => <button key={id} className={view === id ? "on" : ""} onClick={() => { setView(id); setInspectorOpen(false); setContextMenu(null); }}>{icon}<span>{label}</span></button>)}
      </nav>

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
        {['trip','day'].includes(selectedNode.data.kind) && <button className="mr-open-itinerary" onClick={() => setLocation(selectedNode.data.kind === "day" ? `/itinerary/${trip?.id}/g/${(selectedNode.data.dayIndex ?? 0) + 1}` : `/itinerary/${trip?.id}`)}>{L("Vedi nell'itinerario operativo", "View in operational itinerary")}<ChevronRight size={14} /></button>}
        <button className="mr-inspector-ai" onClick={() => setAiOpen(true)}><Sparkles size={14} />{L("Lavora su questo con MindRoute", "Work on this with MindRoute")}</button>
        {selectedNode.data.kind === "day" && (trip?.days?.length ?? 0) > 1 && <button className="mr-inspector-delete" onClick={() => removeDay(Number(selectedNode.data.dayIndex))}><Trash2 size={13} />{L("Elimina questo giorno", "Delete this day")}</button>}
        {!['trip','day','map','budget','mood','maybe','group'].includes(selectedNode.data.kind) && <button className="mr-inspector-delete" onClick={deleteSelection}><Trash2 size={13} />{L("Elimina contenuto", "Delete content")}</button>}
        <footer className="mr-inspector-footer"><button onClick={() => { setInspectorOpen(false); setSelectedIds([]); }}>{L("Indietro", "Back")}</button><button onClick={async () => { if (await saveCanvas()) { setInspectorOpen(false); setSelectedIds([]); } }} disabled={saving}>{saving ? L("Salvo…", "Saving…") : L("Salva modifiche", "Save changes")}</button></footer>
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
        <h2>{L("Costruisci qui. Vivi il viaggio nell'itinerario.", "Build here. Live the trip in the itinerary.")}</h2>
        <p>{L("Studio e itinerario sono due viste dello stesso viaggio: qui prendi decisioni, nell'itinerario leggi e usi il piano. Ogni modifica è condivisa automaticamente.", "Studio and itinerary are two views of the same trip: make decisions here, then read and use the plan in the itinerary. Every change is shared automatically.")}</p>
        <div className="mr-guide-steps">
          <article><b>01</b><MousePointer2 size={18} /><strong>{L("Scegli un giorno", "Choose a day")}</strong><small>{L("Aprilo per cambiare titolo, tappe, orari, luoghi e motivazioni.", "Open it to change title, stops, times, places and reasoning.")}</small></article>
          <article><b>02</b><BoxSelect size={18} /><strong>{L("Controlla ciò che conta", "Check what matters")}</strong><small>{L("Mappa e Controllo ti riportano direttamente al dettaglio da sistemare.", "Map and Control take you straight to the detail that needs fixing.")}</small></article>
          <article><b>03</b><Sparkles size={18} /><strong>{L("Approva l'AI", "Approve the AI")}</strong><small>{L("MindRoute prepara una proposta nel contesto selezionato. Tu decidi se applicarla.", "MindRoute prepares a proposal in the selected context. You decide whether to apply it.")}</small></article>
        </div>
        <footer><button className="secondary" onClick={() => setLocation(`/itinerary/${trip?.id}`)}>{L("Apri l'itinerario", "Open itinerary")}</button><button className="primary" onClick={closeGuide}>{L("Inizia a costruire", "Start building")}<ChevronRight size={15} /></button></footer>
      </section></div>}

      {aiOpen && <section className="mr-canvas-ai">
        <header><div><Sparkles size={15} /><span><strong>MindRoute AI</strong><small>{aiContextLabel}</small></span></div><button onClick={() => setAiOpen(false)}><X size={16} /></button></header>
        {aiReply && <div className="mr-ai-reply"><div className="mr-ai-proposal-label"><span>{aiProposalReady ? L("Proposta · non ancora applicata", "Proposal · not applied yet") : L("Risultato", "Result")}</span></div><p>{aiReply}</p>{aiActions.map(action => <span key={action}><Check size={12} />{action}</span>)}{!aiStreaming && aiProposalReady && <div className="mr-ai-decision"><button className="secondary" onClick={discardAiProposal}>{L("Scarta", "Discard")}</button><button className="primary" onClick={applyAiProposal}>{L("Applica al viaggio", "Apply to trip")}</button></div>}</div>}
        <form onSubmit={event => { event.preventDefault(); runCanvasAi(); }}><textarea autoFocus value={aiInput} onChange={event => setAiInput(event.target.value)} placeholder={L("Es. Rendimi questa parte più rilassata…", "E.g. Make this part more relaxed…")} /><button disabled={!aiInput.trim() || aiStreaming}>{aiStreaming ? <span className="mr-ai-pulse" /> : <MoveRight size={16} />}</button></form>
        {!aiReply && <div className="mr-ai-quick">{contextualPrompts.map(prompt => <button key={prompt} onClick={() => setAiInput(prompt)}>{prompt}</button>)}</div>}
      </section>}

    </main>
  </div>;
}

export default function TravelStudio() {
  return <ReactFlowProvider><TravelStudioInner /></ReactFlowProvider>;
}
