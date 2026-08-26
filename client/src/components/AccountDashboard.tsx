/**
 * AccountDashboard.tsx
 * ───────────────────────────────────────────────────────────────
 * La dashboard principale dell'utente loggato (sostituisce la pagina
 * "magazine" a scorrimento). App-shell cinematica: sidebar a icone fissa +
 * topbar + 5 viste a tab (Home / Riprendi / Ritratto / Viaggi / Atlante),
 * più un drawer impostazioni da destra.
 *
 * Presentational: accetta lo stesso `AccountData` di AccountCinematic /
 * AccountRedesign, così MyAccount.tsx non cambia il wiring dei dati — basta lo
 * swap del componente. Tutto bilingue (EN/IT) via useI18n; gli unici testi
 * "voce" non tradotti sono quelli generati dall'AI lato server (ritratto),
 * che arrivano già nella lingua dell'utente.
 *
 * Stili in styles/account-dashboard.css, scoped sotto `.account-dash`.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "wouter";
import { unsplashSized } from "@/lib/img";
import { FlowNavLogo } from "@/components/FlowNav";
import LangDropdown from "@/components/LangDropdown";
import { useI18n } from "@/lib/i18n";
import { getLastOpenedItinerary } from "@/lib/last-opened";
import type { AccountData } from "./AccountCinematic";
import { PortraitScreen } from "@/components/PortraitScreen";
import { computeConfidence, visibleInsights, type PortraitSignals } from "@shared/portrait-insights";
import { deriveTravelRules } from "@shared/travel-rules";
import { mapTileUrl, readMapStyle } from "@/lib/map-style";
import "@/styles/leaflet-chrome.css";
import { attachAutoSize, fitToPoints, safePoints } from "@/lib/leaflet-utils";

const AccountAtlas = lazy(() => import("./AccountAtlas").then(m => ({ default: m.AccountAtlas })));
const AtlasMap = lazy(() => import("./AtlasMap").then(m => ({ default: m.AtlasMap })));

// background-image helper: ridimensiona le Unsplash per lo slot reale.
const bg = (url: string, w: number, q = 70) => `url(${unsplashSized(url, w, q)})`;
const AMBIENT_MAX = 5;

// Atlas non è più una sezione: è una View Mode dentro "I miei viaggi".
type ViewId = "home" | "resume" | "portrait" | "trips";
type ViewMode = "cards" | "atlas";

// Continenti memorizzati lato server, sempre in italiano (vedi AccountCinematic).
const CONTINENT_VALUES: Record<string, string> = {
  europe: "Europa", asia: "Asia", africa: "Africa", americas: "Americhe", oceania: "Oceania",
};
const CONTINENT_KEY: Record<string, string> = {
  Europa: "europe", Asia: "asia", Africa: "africa", Americhe: "americas", Oceania: "oceania",
};
const REGION_TABS = ["all", "europe", "asia", "africa", "americas", "oceania"] as const;

// Colore emozione (tag utente) — allineato ad AtlasMap; qui a livello modulo
// per non tirare il chunk lazy della mappa dentro il bundle principale.
const ATLAS_EMO_COLOR: Record<string, string> = {
  "life-changing": "#E94560", meaningful: "#9D7EBC", loved: "#6FB4A8", "not-for-me": "#8a5560", revisited: "#D4A853",
};
const atlasEmoColor = (e?: string | null): string => (e && ATLAS_EMO_COLOR[e]) || "#9aa0b4";

/* ──────────────── icone inline (stroked) ──────────────── */
const ICONS: Record<string, string[]> = {
  home: ["M3 10.8 12 3l9 7.8", "M5.4 9.2V20h13.2V9.2", "M9.8 20v-5.4h4.4V20"],
  resume: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "M10 8.4 16 12l-6 3.6z"],
  portrait: ["M12 11.4a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2", "M4.6 20c.6-3.8 3.7-5.6 7.4-5.6s6.8 1.8 7.4 5.6"],
  trips: ["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"],
  atlas: ["M9 3 3.5 5.2v15.3L9 18.3l6 2.2 5.5-2.2V3L15 5.2 9 3z", "M9 3v15.3", "M15 5.2v15.3"],
  gear: ["M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4", "M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-2.87 1.2V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-2.87-1.2l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13.5H4.5a2 2 0 1 1 0-4h.07a1.7 1.7 0 0 0 1.2-2.87l-.06-.06A2 2 0 1 1 8.54 3.74l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 11.6 2.6V2.5a2 2 0 1 1 4 0v.07a1.7 1.7 0 0 0 2.87 1.2l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08a1.7 1.7 0 0 0 1.54 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1z"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16", "M21 21l-4.3-4.3"],
  back: ["M15 18l-6-6 6-6"],
  chat: ["M20.5 11.6c0 4-3.8 7.2-8.5 7.2-1 0-2-.15-2.9-.42L4 20l1.5-3.4C4.3 15.3 3.5 13.55 3.5 11.6c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z"],
};
function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg viewBox="0 0 24 24">{ICONS[name].map((d, i) => <path key={i} d={d} />)}</svg>;
}

// Due parole, non quattro voci.
//
// "Home" non e' piu' una sezione fra le altre: e' la RADICE, e ci si torna dal
// logo. "Riprendi" non e' mai stata una sezione — e' un'azione, e per di piu'
// una che a volte non porta da nessuna parte (nessun viaggio in corso): vive
// nella pillola contestuale della barra e nel CTA della home. Restano le due
// cose che sono davvero luoghi: dove sono i tuoi viaggi, e chi sei.
const NAV: Array<{ id: ViewId; ic: keyof typeof ICONS; key: string }> = [
  { id: "trips", ic: "trips", key: "acd.nav.trips" },
  { id: "portrait", ic: "portrait", key: "acd.nav.portrait" },
];
// Su telefono serve un bersaglio esplicito per la radice: il logo in alto e'
// scomodo col pollice.
const MNAV: Array<{ id: ViewId; ic: keyof typeof ICONS; key: string }> = [
  ...NAV,
];
// La quarta voce del prototipo mobile. Non e' una vista: apre il compagno di
// viaggio, che su telefono e' l'unico modo comodo di raggiungerlo (il FAB
// finisce sotto il pollice, o sotto la barra stessa).
const CHAT_TAB = { ic: "chat" as const, key: "acd.h5.chat" };

// Le 5 "missioni" della checklist prenotazioni (stessi id scritti da
// Itinerary.tsx e ItineraryRedesign.tsx in mindroute_checklist_{id}).
const MISSIONS = ["flight", "hotel", "experience", "restaurant", "transfer"] as const;

// Legge la checklist in ENTRAMBI i formati storici: array di {id,checked}
// (Itinerary.tsx) e array di id già prenotati (ItineraryRedesign, Set
// serializzato). Ritorna gli id fatti, o null se mai toccata.
function readChecklistDone(itineraryId: string | number): Set<string> | null {
  try {
    const raw = localStorage.getItem(`mindroute_checklist_${itineraryId}`);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (Array.isArray(p)) {
      if (p.length === 0) return new Set();
      if (typeof p[0] === "string") return new Set(p as string[]);
      return new Set((p as any[]).filter(x => x?.checked).map(x => String(x.id)));
    }
    if (p && typeof p === "object") return new Set(Object.keys(p).filter(k => !!(p as any)[k]));
    return null;
  } catch { return null; }
}

/* ── Ritratto v3: dimensioni, emozioni, serie evolutiva ─────────────────
   Tutto DERIVATO da dati reali: vettore 5 assi, chip scelte nel quiz,
   snapshot storici. Niente numeri inventati: se manca il dato, il blocco
   non si mostra. */
const P3_DIMS = [
  { axis: "matter",    color: "#7fd4a8", icon: "🌿" },
  { axis: "exposure",  color: "#c9a6e8", icon: "🧭" },
  { axis: "structure", color: "#D4A853", icon: "🪁" },
  { axis: "social",    color: "#E94560", icon: "🫶" },
  { axis: "comfort",   color: "#9ecbff", icon: "✦" },
] as const;

const EMO_ORDER = ["awe", "peace", "joy", "curiosity", "challenge"] as const;
type EmoKey = typeof EMO_ORDER[number];
const EMO_COLORS: Record<EmoKey, string> = {
  awe: "#c9a6e8", peace: "#7fd4a8", joy: "#D4A853", curiosity: "#9ecbff", challenge: "#E94560",
};
const EMO_KEYWORDS: Record<EmoKey, string[]> = {
  awe:       ["sorprend", "meravig", "wonder", "surpris", "straordinar", "amaz"],
  peace:     ["silenz", "stacc", "rallent", "lentezza", "lento", "calma", "rigener", "quiet", "slow", "disconnect", "recharg", "relax", "riposo"],
  joy:       ["festegg", "energia", "vivo", "alive", "festive", "celebrat", "gioia"],
  curiosity: ["cultur", "scopert", "esplor", "autentic", "curios", "discover", "explor", "immers", "local"],
  challenge: ["avventur", "sfida", "comfort zone", "trekking", "adventure", "challeng", "estrem", "extreme"],
};

// Distribuzione emozionale derivata da chip reali (peso 2) + vettore (peso 1).
// Ritorna null se non c'è alcun segnale → la card non si mostra.
function computeEmotions(seek: string[], vec: Record<string, number> | null): Array<{ key: EmoKey; pct: number }> | null {
  const w: Record<EmoKey, number> = { awe: 0, peace: 0, joy: 0, curiosity: 0, challenge: 0 };
  for (const raw of seek) {
    const c = raw.toLowerCase();
    for (const k of EMO_ORDER) if (EMO_KEYWORDS[k].some(kw => c.includes(kw))) w[k] += 2;
  }
  if (vec) {
    w.awe += (vec.exposure ?? 0.5) * 1.2;
    w.peace += (1 - (vec.social ?? 0.5)) + (1 - (vec.structure ?? 0.5)) * 0.5;
    w.joy += (vec.social ?? 0.5);
    w.curiosity += (vec.exposure ?? 0.5) * 0.5 + (1 - (vec.matter ?? 0.5)) * 0.5;
    w.challenge += (vec.comfort ?? 0.5);
  }
  const total = EMO_ORDER.reduce((a, k) => a + w[k], 0);
  if (total <= 0) return null;
  const out = EMO_ORDER
    .map(k => ({ key: k, pct: Math.round((w[k] / total) * 100) }))
    .filter(x => x.pct >= 4)
    .sort((a, b) => b.pct - a.pct);
  // Aggiusta l'arrotondamento perché la somma faccia 100.
  const diff = 100 - out.reduce((a, x) => a + x.pct, 0);
  if (out.length > 0) out[0].pct += diff;
  return out.length >= 2 ? out : null;
}

const AXES5 = ["exposure", "comfort", "social", "matter", "structure"] as const;

// Delta RECENTE: quanto è cambiato ogni asse tra il penultimo e l'ultimo
// snapshot → alimenta "nuovo tratto rilevato +N%" dell'header vivo.
function computeRecentDelta(snaps: Array<{ createdAt: string; traits: Record<string, number> }>) {
  const valid = snaps
    .filter(s => s.traits && s.createdAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (valid.length < 2) return null;
  const prev = valid[valid.length - 2].traits, cur = valid[valid.length - 1].traits;
  let axis = "", delta = 0;
  for (const a of AXES5) {
    const d = (cur[a] ?? 0.5) - (prev[a] ?? 0.5);
    if (Math.abs(d) > Math.abs(delta)) { delta = d; axis = a; }
  }
  if (!axis || Math.abs(delta) < 0.04) return null;
  return { axis, delta, hi: (cur[axis] ?? 0.5) >= 0.5 };
}

// Turning point: i pochi viaggi che hanno DAVVERO spostato il profilo.
// Per ogni passo tra snapshot consecutivi trova l'asse che si è mosso di più,
// lo aggancia al viaggio più vicino nel tempo (i "pick" snapshot nascono alla
// generazione di un itinerario) e tiene solo i 6-7 movimenti più forti. È il
// pensiero dell'AI reso trasparente: quale tratto è cambiato, in quale viaggio.
type TripLite = { dest: string; img: string; href?: string; rawDate?: string };
function buildTurningPoints(
  snaps: Array<{ createdAt: string; traits: Record<string, number> }>,
  trips: TripLite[],
): Array<{ at: number; axis: string; delta: number; hi: boolean; trip: TripLite | null }> {
  const valid = snaps.filter(s => s.traits && s.createdAt).sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  if (valid.length < 2) return [];
  const tarr = trips.filter(t => t.rawDate).map(t => ({ t, at: +new Date(t.rawDate!) }));
  const pts: Array<{ at: number; axis: string; delta: number; hi: boolean; trip: TripLite | null }> = [];
  for (let i = 1; i < valid.length; i++) {
    const prev = valid[i - 1].traits, cur = valid[i].traits;
    let axis = "", delta = 0;
    for (const a of AXES5) {
      const d = (cur[a] ?? 0.5) - (prev[a] ?? 0.5);
      if (Math.abs(d) > Math.abs(delta)) { delta = d; axis = a; }
    }
    if (!axis || Math.abs(delta) < 0.05) continue;
    const at = +new Date(valid[i].createdAt);
    let trip: TripLite | null = null, best = Infinity;
    for (const x of tarr) { const dd = Math.abs(x.at - at); if (dd < best) { best = dd; trip = x.t; } }
    pts.push({ at, axis, delta, hi: delta > 0, trip });
  }
  return pts.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 7).sort((a, b) => b.at - a.at);
}

/* HTML inline (i18n con <em>) */
function Html({ html, as = "span", className }: { html: string; as?: any; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ════════════════════════════════════════════════════════════ */
export function AccountDashboard({ data }: { data: AccountData }) {
  const { t, lang, setLang } = useI18n();
  const [, setLocation] = useLocation();
  // Vista iniziale anche da ?view= (usato dalla preview dev per gli
  // screenshot responsive delle singole viste; innocuo altrove).
  const [view, setView] = useState<ViewId>(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("view");
      if (v === "atlas") return "trips"; // vecchi link Atlas → collezione (View Mode gestita sotto)
      if (v === "home" || v === "resume") return "trips";
      if (v && ["portrait", "trips"].includes(v)) return v as ViewId;
    } catch { /* SSR/no window */ }
    return "trips";
  });
  // View Mode della collezione "I miei viaggi": griglia di card ↔ mappa Atlas.
  // Non è una route né una sezione: è un cambio di prospettiva sugli STESSI dati.
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      if (p.get("view") === "atlas" || p.get("vm") === "atlas") return "atlas";
    } catch { /* SSR */ }
    return "cards";
  });
  type SortMode = "recent" | "impact" | "alpha";
  const [sort, setSort] = useState<SortMode>("recent");
  const [sortOpen, setSortOpen] = useState(false);
  // Filtro temporale condiviso (la timeline): vale per griglia, mappa e stat.
  const [focusYear, setFocusYear] = useState<number | null>(() => {
    try { const y = new URLSearchParams(window.location.search).get("ayear"); return y ? Number(y) : null; } catch { return null; }
  });
  // Tab del Ritratto v4 — una tab = una domanda (riorg. 2026-07-15):
  // Panoramica (chi sei) · Evoluzione (come sei cambiato) · Pattern (come
  // viaggi davvero) · Diario (cosa hai vissuto) · Guida (dove crescere).
  type PTab = "overview" | "evolution" | "pattern" | "journal" | "guide";
  const [pTab, setPTab] = useState<PTab>(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("ptab");
      if (v && ["overview", "evolution", "pattern", "journal", "guide"].includes(v)) return v as PTab;
    } catch { /* SSR */ }
    return "overview";
  });
  const [stuck, setStuck] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [region, setRegion] = useState<(typeof REGION_TABS)[number]>("all");
  const [q, setQ] = useState("");
  const [tripStatus, setTripStatus] = useState<"all" | "planned" | "confirmed" | "skipped">("all");
  const [ambientIdx, setAmbientIdx] = useState(0);
  const [heroIdx, setHeroIdx] = useState(0);
  const [sharing, setSharing] = useState(false);
  // Home v2: 3 proposte del giorno (catalogo+vettori, zero AI) + meteo reale.
  const [picks, setPicks] = useState<{ picks: Array<{ name: string; country: string; imageUrl: string; matchPct: number; tags: string[] }>; why: string } | null>(null);
  const [weather, setWeather] = useState<{ label: string; tempC: number; code: number; isDay: boolean } | null>(null);
  // Daily Compass: card-osservazione da segnali reali (5 tipi, comportamenti
  // diversi al click). Stabile per la giornata, si rimescola sugli eventi.
  type CompassCard = {
    id: string; type: "reflection" | "discovery" | "growth" | "memory" | "journey";
    icon: string; title: string; sub?: string;
    question?: string; options?: string[];
    destination?: { name: string; country: string; imageUrl: string; matchPct: number | null };
    challenge?: string; href?: string;
  };
  const [compass, setCompass] = useState<CompassCard[] | null>(null);
  const [cpOpen, setCpOpen] = useState<string | null>(null);
  const [cpDone, setCpDone] = useState<Record<string, "ok" | "err">>({});
  // Ritratto: diario (reflection AI lazy), "perché lo pensiamo" (trasparenza).
  // La confidenza del ritratto, come NUMERO. `data.portrait.confidence` è
  // un'etichetta ("solid"), non una percentuale: usarla in un "%" scriverebbe
  // "solid%". Si ricalcola con la stessa funzione pura che usa il Ritratto,
  // così i due schermi non possono dire numeri diversi.
  const portraitConfidence = useMemo(() => {
    const p = data.portrait;
    const n = computeConfidence({
      trips: data.trips.map(x => ({ dest: x.dest, continent: x.continent, rawDate: x.rawDate, taken: x.taken, duration: x.duration })),
      seek: p?.seek ?? [],
      avoid: p?.avoid ?? [],
      vector: data.traitVector ?? null,
      snapshotCount: p?.snapshotCount ?? (data.traitSnapshots?.length ?? 0),
      ownWords: p?.ownWords ?? null,
    });
    return n > 0 ? n : null;
  }, [data.portrait, data.trips, data.traitVector, data.traitSnapshots]);

  const portraitSignals = useMemo<PortraitSignals>(() => ({
    trips: data.trips.map(x => ({ dest: x.dest, continent: x.continent, rawDate: x.rawDate, taken: x.taken, duration: x.duration })),
    seek: data.portrait?.seek ?? [],
    avoid: data.portrait?.avoid ?? [],
    vector: data.traitVector ?? null,
    snapshotCount: data.portrait?.snapshotCount ?? (data.traitSnapshots?.length ?? 0),
    ownWords: data.portrait?.ownWords ?? null,
  }), [data.trips, data.portrait, data.traitVector, data.traitSnapshots]);

  const learnedInsights = useMemo(
    () => visibleInsights(portraitSignals, portraitConfidence ?? 0, 3),
    [portraitSignals, portraitConfidence],
  );
  const nextTravelRules = useMemo(
    () => deriveTravelRules({
      vector: data.traitVector ?? null,
      seek: data.portrait?.seek ?? [],
      avoid: data.portrait?.avoid ?? [],
    }, 3),
    [data.traitVector, data.portrait],
  );

  /* 05 · le fotografie del tuo mondo: i momenti che hai tenuto, poi i viaggi.
   *
   * Sta QUI e non dentro HomeView per un motivo che è costato due bug: le
   * viste sono funzioni chiamate condizionalmente (`view === "home" &&
   * HomeView()`), quindi i loro hook sono hook DI QUESTO componente. Un
   * useMemo dentro una di esse spariva al primo cambio di vista, React
   * andava in "rendered fewer hooks than expected" e l'albero moriva: la
   * sezione viaggi non si apriva e nessun link di navigazione rispondeva.
   * Nessun hook dentro le *View. Lo verifica script/verify-hooks.ts. */
  const worldPhotos = useMemo(() => {
    const out: string[] = [];
    for (const m of data.savedMoments ?? []) {
      const u = m.momentSnapshot?.image_url;
      if (u && !out.includes(u)) out.push(u);
    }
    for (const tr of data.trips) if (tr.img && !out.includes(tr.img)) out.push(tr.img);
    return out;
  }, [data.savedMoments, data.trips]);

  // I momenti salvati mostrati in home: i piu' recenti, non tutti. La
  // collezione completa vive dentro "I miei viaggi".
  const savedShown = useMemo(
    () => (data.savedMoments ?? []).filter(m => m.momentSnapshot).slice(0, 4),
    [data.savedMoments],
  );

  // Home v4: la proposta e' UNA. Le altre due esistono, ma solo su richiesta —
  // e' la differenza fra "ti propongo questo" e "ecco un catalogo".
  const [moreIdeas, setMoreIdeas] = useState(false);
  // Ritratto: diario (reflection AI lazy), "perché lo pensiamo" (trasparenza).
  const [jOpen, setJOpen] = useState<number | null>(null);
  const [jRefl, setJRefl] = useState<Record<number, string | "loading" | "none">>({});
  const [whyOpen, setWhyOpen] = useState(false);
  // "Perché questa meta?": risponde SUL POSTO. Mandare l'utente in un'altra
  // sezione, per lui, è indistinguibile da un bottone che non fa nulla.
  const [propWhy, setPropWhy] = useState(false);

  // Interpolatore: t() non supporta placeholder, li sostituiamo qui.
  const tx = (key: string, vars: Record<string, string | number>) => {
    let s = t(key);
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);
  const heroW = isMobile ? 1100 : 1900;
  const featW = isMobile ? 800 : 1400;
  const cardW = isMobile ? 560 : 800;

  function go(id: ViewId) {
    setView(id);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  // topbar stuck on scroll
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Immagini reali per crossfade ambient (sfondo) + carosello hero.
  const photos = useMemo(() => {
    const imgs = data.trips.map(t => t.img).filter(Boolean);
    const uniq = Array.from(new Set(imgs)).slice(0, AMBIENT_MAX);
    return uniq.length > 0 ? uniq : [data.heroImg];
  }, [data.trips, data.heroImg]);

  const ambient = useMemo(
    () => photos.map(src => unsplashSized(src, isMobile ? 820 : 1280, 55)),
    [photos, isMobile],
  );

  useEffect(() => {
    if (ambient.length <= 1) return;
    const id = setInterval(() => setAmbientIdx(i => (i + 1) % ambient.length), 9000);
    return () => clearInterval(id);
  }, [ambient.length]);

  useEffect(() => {
    if (photos.length <= 1) return;
    const id = setInterval(() => setHeroIdx(i => (i + 1) % photos.length), 7000);
    return () => clearInterval(id);
  }, [photos.length]);

  // ── Aggregati (preferisci l'atlante reale geocodato; fallback su trips) ──
  const counts = useMemo(() => {
    const s = data.atlas?.stats;
    if (s && s.trips > 0) return { trips: s.trips, days: s.days, places: s.cities, continents: s.continents };
    const trips = data.trips.length;
    const days = data.trips.reduce((a, tr) => a + (parseInt(tr.duration) || 0), 0);
    const places = new Set(data.trips.map(tr => tr.dest).filter(Boolean)).size;
    const continents = new Set(data.trips.map(tr => tr.continent).filter(Boolean)).size || (trips ? 1 : 0);
    return { trips, days, places, continents };
  }, [data.trips, data.atlas]);

  // Proposte del giorno (catalogo + coerenza-vettori, server-side, zero AI).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/daily-picks?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setPicks(d && Array.isArray(d.picks) && d.picks.length > 0 ? d : null); })
      .catch(() => { /* best-effort */ });
    return () => { cancelled = true; };
  }, [lang]);

  // Daily Compass — se l'endpoint fallisce la sezione non appare.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/me/compass?lang=${lang}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled) setCompass(d && Array.isArray(d.cards) && d.cards.length > 0 ? d.cards : null); })
      .catch(() => { /* sezione nascosta */ });
    return () => { cancelled = true; };
  }, [lang]);

  // Risposta a una reflection: micro-segnale persistito. La card mostra
  // l'esito reale (ok / errore), mai un finto "salvato".
  const answerCompass = async (card: CompassCard, answer: string) => {
    try {
      const r = await fetch("/api/me/compass/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, question: card.question ?? card.title, answer }),
      });
      setCpDone(prev => ({ ...prev, [card.id]: r.ok ? "ok" : "err" }));
    } catch {
      setCpDone(prev => ({ ...prev, [card.id]: "err" }));
    }
  };

  // Click su una card compass — ogni tipo fa una cosa diversa (è il punto).
  const onCompassCard = (card: CompassCard) => {
    if (card.type === "memory" && card.href) { setLocation(card.href); return; }
    if (card.type === "journey") { data.onSecondaryCta?.(); return; }
    // reflection / discovery / growth si aprono in place
    setCpOpen(prev => (prev === card.id ? null : card.id));
  };

  // Meteo "adesso vicino a te": geolocalizzazione browser (prompt una tantum),
  // fallback server-side sulla città di partenza dell'ultimo profiling se
  // negata/assente. Se non c'è nulla, la card semplicemente non appare.
  useEffect(() => {
    let cancelled = false;
    const load = (qs: string) =>
      fetch(`/api/weather${qs}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((w) => { if (!cancelled && w && typeof w.tempC === "number") setWeather(w); })
        .catch(() => { /* card nascosta */ });
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(`?lat=${pos.coords.latitude.toFixed(3)}&lon=${pos.coords.longitude.toFixed(3)}`),
        () => load(""),
        { timeout: 5000, maximumAge: 30 * 60_000 },
      );
    } else {
      load("");
    }
    return () => { cancelled = true; };
  }, []);

  // "Completa le prenotazioni": viaggi con checklist (localStorage) avviata ma
  // incompleta — nudge onesto e azionabile (non mostra mai i viaggi mai aperti).
  const MISSION_TOTAL = MISSIONS.length;
  const bookingNudge = useMemo(() => {
    const out: Array<{ title: string; href: string; img: string; booked: number; total: number }> = [];
    for (const tr of data.trips) {
      const m = (tr.href || "").match(/\/itinerary\/(\d+)/);
      if (!m) continue;
      const done = readChecklistDone(m[1]);
      const booked = done ? done.size : 0;
      if (done && booked > 0 && booked < MISSION_TOTAL) out.push({ title: tr.dest, href: tr.href!, img: tr.img, booked, total: MISSION_TOTAL });
      if (out.length >= 3) break;
    }
    return out;
  }, [data.trips]);

  const isEmpty = data.trips.length === 0 && data.continueItems.length === 0;

  const plural = (n: number, oneKey: string, manyKey: string) => t(n === 1 ? oneKey : manyKey);
  const daysOf = (durationStr: string) => parseInt(durationStr) || 0;
  const regionLabel = (stored: string) => {
    const key = CONTINENT_KEY[stored];
    return key ? t("acd.region." + key) : stored;
  };

  // Anno del viaggio (da rawDate) — chiave della timeline temporale.
  const tripYear = (tr: AccountData["trips"][number]): number | null =>
    tr.rawDate ? new Date(tr.rawDate).getFullYear() : null;

  // Cuori per itinerario → proxy di impatto (stesso criterio della mappa),
  // usato per l'ordinamento "più intensi".
  const heartsByItin = useMemo(() => {
    const m = new Map<number, number>();
    for (const mo of (data.savedMoments ?? [])) m.set(mo.itineraryId, (m.get(mo.itineraryId) ?? 0) + 1);
    return m;
  }, [data.savedMoments]);
  const tripImpact = (tr: AccountData["trips"][number]): number => {
    const id = Number((tr.href || "").match(/\/itinerary\/(\d+)/)?.[1]);
    const hearts = Number.isFinite(id) ? (heartsByItin.get(id) ?? 0) : 0;
    return hearts * 2 + (tr.taken ? 1 : 0) + daysOf(tr.duration) / 7;
  };

  // Filtro collezione CONDIVISO (region + ricerca + anno) → vale per griglia
  // E mappa E statistiche. Poi ordinamento.
  const filteredTrips = useMemo(() => {
    const out = data.trips.filter(tr => {
      if (tripStatus !== "all" && (tr.status ?? (tr.taken ? "confirmed" : "planned")) !== tripStatus) return false;
      if (region !== "all" && tr.continent !== CONTINENT_VALUES[region]) return false;
      if (q && !tr.dest.toLowerCase().includes(q.toLowerCase())) return false;
      if (focusYear != null && tripYear(tr) !== focusYear) return false;
      return true;
    });
    const by = {
      recent: (a: typeof out[number], b: typeof out[number]) => (b.rawDate ? +new Date(b.rawDate) : 0) - (a.rawDate ? +new Date(a.rawDate) : 0),
      impact: (a: typeof out[number], b: typeof out[number]) => tripImpact(b) - tripImpact(a),
      alpha: (a: typeof out[number], b: typeof out[number]) => a.dest.localeCompare(b.dest),
    }[sort];
    return [...out].sort(by);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.trips, tripStatus, region, q, focusYear, sort, heartsByItin]);

  // Statistiche della collezione — riflettono il FILTRO attivo (si aggiornano
  // con timeline/regione/ricerca). Derivate dai dati reali.
  const collStats = useMemo(() => {
    const itineraries = filteredTrips.length;
    const days = filteredTrips.reduce((a, tr) => a + daysOf(tr.duration), 0);
    const destinations = new Set(filteredTrips.map(tr => tr.dest).filter(Boolean)).size;
    const continents = new Set(filteredTrips.map(tr => tr.continent).filter(Boolean)).size;
    const confirmed = filteredTrips.filter(tr => tr.status === "confirmed" || tr.taken).length;
    const planned = filteredTrips.filter(tr => (tr.status ?? "planned") === "planned").length;
    return { itineraries, days, destinations, continents, confirmed, planned };
  }, [filteredTrips]);

  // Anni presenti nella collezione (per la timeline), con conteggio per anno
  // sull'insieme NON filtrato per anno (region+ricerca sì) così i pallini restano.
  const yearData = useMemo(() => {
    const base = data.trips.filter(tr => {
      if (region !== "all" && tr.continent !== CONTINENT_VALUES[region]) return false;
      if (q && !tr.dest.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
    const m = new Map<number, Array<{ id: number; color: string }>>();
    for (const tr of base) {
      const y = tripYear(tr); if (y == null) continue;
      const id = Number((tr.href || "").match(/\/itinerary\/(\d+)/)?.[1]) || 0;
      const arr = m.get(y) ?? []; arr.push({ id, color: atlasEmoColor(tr.emotion) }); m.set(y, arr);
    }
    return Array.from(m.entries()).sort((a, b) => a[0] - b[0]).map(([year, dots]) => ({ year, dots }));
  }, [data.trips, region, q]);

  const featured = data.continueItems[0];
  const resumeRest = data.continueItems.slice(1);

  // Ricerca dalla topbar: digitando si salta automaticamente alla collezione.
  const onTopSearch = (val: string) => {
    setQ(val);
    if (val && view !== "trips") setView("trips");
  };

  const toggleLang = () => setLang(lang === "it" ? "en" : "it");

  // Share Card 9:16 (3B): scarica la PNG del ritratto e la passa allo share
  // sheet nativo (IG/TikTok storie) quando supportato, altrimenti la scarica.
  const sharePortrait = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const res = await fetch(`/api/me/portrait-card.png?bg=${encodeURIComponent(data.heroImg || "")}&lang=${lang}`);
      if (!res.ok) throw new Error("card");
      const blob = await res.blob();
      const file = new File([blob], "mindroute-ritratto.png", { type: "image/png" });
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: t("acd.point.portraitK") });
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "mindroute-ritratto.png";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }
    } catch { /* best-effort */ }
    finally { setSharing(false); }
  };

  /* ──────────────── sotto-componenti ──────────────── */

  const ViewHead = ({ eyebrow, gold, title, sub, right }: {
    eyebrow: string; gold?: boolean; title: string; sub?: string; right?: ReactNode;
  }) => (
    <div className="view-head">
      <div className="vh-l">
        <button className="back" onClick={() => go("home")}><Icon name="back" /> {t("acd.back")}</button>
        <div className={"vh-eyebrow" + (gold ? " gold" : "")}>{eyebrow}</div>
        <Html as="h1" className="vh-title" html={title} />
        {sub && <p className="vh-sub">{sub}</p>}
      </div>
      {right && <div className="vh-r">{right}</div>}
    </div>
  );

  const TripCard = ({ tr }: { tr: AccountData["trips"][number] }) => (
    <a className={"c-card status-" + (tr.status ?? (tr.taken ? "confirmed" : "planned"))} href={tr.href ?? "#"}>
      <div className="ph" style={{ backgroundImage: bg(tr.img, cardW) }} />
      <span className="c-taken">
        {(tr.status ?? (tr.taken ? "confirmed" : "planned")) === "confirmed"
          ? (lang === "it" ? "Fatto" : "Taken")
          : (tr.status ?? "planned") === "skipped"
            ? (lang === "it" ? "Non realizzato" : "Not taken")
            : (lang === "it" ? "In programma" : "Planned")}
      </span>
      <div className="c-body">
        <div className="c-top">
          <span className="when">{tr.date}<span className="region">{regionLabel(tr.continent)}</span></span>
          <span className="days">{daysOf(tr.duration)} {plural(daysOf(tr.duration), "acd.unit.day", "acd.unit.days")}</span>
        </div>
        <div>
          <div className="c-name">{tr.dest}</div>
          {tr.quote && <div className="c-blurb">{tr.quote}</div>}
        </div>
      </div>
    </a>
  );

  /* ──────────────── HOME (redesign 2026-07 dal mockup) ──────────────── */

  // Saluto per fascia oraria + riga stagionale (onesta: nessun claim meteo qui,
  // il meteo vero sta nella card della colonna destra).
  const hour = new Date().getHours();
  const greetKey = hour < 12 ? "acd.h2.morning" : hour < 18 ? "acd.h2.afternoon" : "acd.h2.evening";
  const seasonKey = (() => {
    const m = new Date().getMonth();
    if (m >= 2 && m <= 4) return "acd.h2.season.spring";
    if (m >= 5 && m <= 7) return "acd.h2.season.summer";
    if (m >= 8 && m <= 10) return "acd.h2.season.autumn";
    return "acd.h2.season.winter";
  })();

  // Card "Continua il tuo viaggio": ultimo itinerario aperto (localStorage) →
  // featured "da riprendere" → viaggio più recente. Progresso REALE dalla
  // checklist prenotazioni (mai percentuali inventate).
  const continueCard = useMemo(() => {
    const lastId = getLastOpenedItinerary();
    const byId = (id: number) => data.trips.find(tr => tr.href?.includes(`/itinerary/${id}`));
    const trip = (lastId ? byId(lastId) : undefined)
      ?? data.trips.find(item => (item.status ?? "planned") === "planned")
      ?? data.trips[0];
    const fromFeatured = !trip && featured
      ? { title: featured.title, img: featured.img, href: featured.href ?? "#", region: "", date: featured.date ?? "", quote: featured.quote ?? "" }
      : null;
    const base = trip
      ? { title: trip.dest, img: trip.img, href: trip.href ?? "#", region: regionLabel(trip.continent), date: trip.date ?? "", quote: trip.quote ?? "" }
      : fromFeatured;
    if (!base) return null;
    const m = base.href.match(/\/itinerary\/(\d+)/);
    const itineraryId = m ? Number(m[1]) : null;
    const done = itineraryId != null ? readChecklistDone(itineraryId) : null;
    const progress = done && done.size > 0 ? { n: Math.min(done.size, MISSION_TOTAL), tot: MISSION_TOTAL } : null;
    return { ...base, itineraryId, done, progress };
  }, [data.trips, featured]);

  // Meteo: mappa weather_code (WMO) → chiave i18n + riga "perfetto per partire".
  const wxKey = (code: number) =>
    code === 0 ? "acd.h2.wx.clear"
    : code <= 2 ? "acd.h2.wx.partly"
    : code === 3 ? "acd.h2.wx.cloudy"
    : code <= 48 ? "acd.h2.wx.fog"
    : code <= 57 ? "acd.h2.wx.drizzle"
    : code <= 67 ? "acd.h2.wx.rain"
    : code <= 77 ? "acd.h2.wx.snow"
    : code <= 82 ? "acd.h2.wx.rain"
    : code <= 86 ? "acd.h2.wx.snow"
    : "acd.h2.wx.storm";
  const wxGood = weather ? weather.tempC >= 16 && weather.tempC <= 28 && weather.code <= 2 : false;

  // (La vecchia mood row è stata sostituita dal Daily Compass: card-osservazione
  // da segnali reali invece di 5 scorciatoie fisse verso lo stesso quiz.)

  // (Il mini-atlante della vecchia home e' stato rimosso con la Home v4: la
  //  mappa vive dentro "I miei viaggi" come View Mode, dove e' interattiva e
  //  serve a qualcosa. In home era un widget decorativo in competizione con
  //  tutto il resto.)
  const scrollToRecs = () => document.getElementById("h2-recs")?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Card meteo (rail) — condivisa tra Home e Riprendi. Nascosta se il meteo
  // non è disponibile (mai dati inventati).
  const WeatherCard = () => weather ? (
    <div className="h2-card h2-wx">
      <div className="h2-rail-eyebrow">☀ {t("acd.h2.weatherK")}</div>
      {weather.label && <div className="h2-wx-city">{weather.label}</div>}
      <div className="h2-wx-temp">{weather.tempC}°C <span className="cond">{t(wxKey(weather.code))}</span></div>
      {wxGood && <div className="h2-wx-good">{t("acd.h2.weatherGood")}</div>}
      {/* Da Riprendi porta alle proposte in Home; il timeout lascia montare la vista. */}
      <button className="h2-link" onClick={() => { go("home"); window.setTimeout(scrollToRecs, 80); }}>{t("acd.h2.weatherSee")} →</button>
    </div>
  ) : null;

  // Il Daily Compass — la home osserva, non chiede. Ogni tipo di card ha un
  // comportamento diverso al click (reflection inline, discovery mostra,
  // growth sfida, memory riapre, journey genera).
  // Il corpo aperto di una card compass. Estratto perché serve in DUE posti:
  // la sezione completa (nel Ritratto, dove l'elenco ha senso) e la singola
  // osservazione della home (dove l'elenco non ha senso). Stessa interazione,
  // due contesti — non due copie che divergeranno.
  const CompassBody = ({ card }: { card: CompassCard }) => {
    const done = cpDone[card.id];
    return (
      <>
              {card.type === "reflection" && (
                <div className="cp-body">
                  {done === "ok" ? (
                    <div className="cp-ok">{t("acd.cp.answered")}</div>
                  ) : (
                    <>
                      <div className="cp-q">{card.question}</div>
                      <div className="cp-opts">
                        {(card.options ?? []).map((o) => (
                          <button key={o} className="cp-opt" onClick={() => answerCompass(card, o)}>{o}</button>
                        ))}
                      </div>
                      {done === "err" && <div className="cp-err">{t("acd.cp.answerErr")}</div>}
                      <button className="cp-skip" onClick={() => setCpOpen(null)}>{t("acd.cp.skip")}</button>
                    </>
                  )}
                </div>
              )}

              {card.type === "discovery" && card.destination && (
                <div className="cp-body">
                  <div className="cp-dest" style={{ backgroundImage: bg(card.destination.imageUrl, 480, 65) }}>
                    {card.destination.matchPct != null && <span className="cp-match">{card.destination.matchPct}% {t("acd.cp.match")}</span>}
                    <span className="cp-dest-nm">{card.destination.name.split(",")[0]}<em>{card.destination.country}</em></span>
                  </div>
                  <div className="cp-note">{t("acd.cp.discoveryNote")}</div>
                </div>
              )}

              {card.type === "growth" && card.challenge && (
                <div className="cp-body">
                  <div className="cp-q">“{card.challenge}”</div>
                  <button className="cp-opt on" onClick={() => data.onChallenge?.(card.challenge!)}>{t("acd.cp.growthCta")} →</button>
                  <button className="cp-skip" onClick={() => setCpOpen(null)}>{t("acd.cp.skip")}</button>
                </div>
              )}
      </>
    );
  };

  // La sezione completa: l'ELENCO delle osservazioni. Vive nel Ritratto, dove
  // un elenco e' esattamente cio' che si cerca. In home ne compare UNA sola.
  const CompassSection = () => compass && (
    <section className="h2-card cp-sec">
      <div className="h2-card-head">
        <h3>{t("acd.cp.k")}</h3>
        <span className="cp-hint">{t("acd.cp.hint")}</span>
      </div>
      <div className="cp-row">
        {compass.map((card) => {
          const open = cpOpen === card.id;
          return (
            <div key={card.id} className={`cp-card cp-${card.type}${open ? " open" : ""}`}>
              <button className="cp-face" onClick={() => onCompassCard(card)}>
                <span className="cp-top">
                  <span className="cp-ico">{card.icon}</span>
                  <span className="cp-type">{t(`acd.cp.t.${card.type}`)}</span>
                </span>
                <span className="cp-title">{card.title}</span>
                {card.sub && <span className="cp-sub">{card.sub}</span>}
                <span className="cp-go">{card.type === "memory" || card.type === "journey" ? "→" : open ? "×" : "›"}</span>
              </button>
              {open && <CompassBody card={card} />}
            </div>
          );
        })}
      </div>
    </section>
  );

  /* ──────────────── IL FONDO DEL SITO ────────────────
     Stessi contatti e stesse rotte del footer della landing: se un domani
     cambia un indirizzo, non deve esserci una seconda verita' qui dentro.
     Solo link che esistono davvero. */
  const SiteFooter = () => (
    <footer className="h4-site-foot">
      <div className="h4-sf-in">
        <div className="h4-sf-brand">
          <FlowNavLogo size={26} />
          <div>
            <div className="h4-sf-name">MindRoute</div>
            <div className="h4-sf-tag">{t("footer.tagline")}</div>
          </div>
        </div>

        <div className="h4-sf-cols">
          <div className="h4-sf-col">
            <div className="h4-sf-h">{t("led.foot.product")}</div>
            <button className="h4-sf-l" onClick={() => setLocation("/come-funziona")}>{t("led.foot.how")}</button>
            <button className="h4-sf-l" onClick={data.onNewItinerary}>{t("led.foot.start")}</button>
          </div>
          <div className="h4-sf-col">
            <div className="h4-sf-h">{t("led.foot.company")}</div>
            <button className="h4-sf-l" onClick={() => setLocation("/privacy")}>{t("led.foot.privacy")}</button>
            <a className="h4-sf-l" href="mailto:mindroutetravel@gmail.com">{t("led.foot.contact")}</a>
          </div>
          <div className="h4-sf-col">
            <div className="h4-sf-h">{t("led.foot.follow")}</div>
            <a className="h4-sf-l" href="https://instagram.com/mindroute.travel" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a className="h4-sf-l" href="https://tiktok.com/@mindroute.travel" target="_blank" rel="noopener noreferrer">TikTok</a>
          </div>
          <div className="h4-sf-col">
            <div className="h4-sf-h">{t("acd.dr.account")}</div>
            <button className="h4-sf-l" onClick={() => setDrawer(true)}>{t("acd.settings")}</button>
            <button className="h4-sf-l" onClick={data.onLogout}>{t("acd.dr.logout")}</button>
          </div>
        </div>
      </div>

      <div className="h4-sf-base">
        <span>{t("footer.copyright")}</span>
        <span>{t("footer.affiliate")}</span>
      </div>
    </footer>
  );

  /* ──────────────── HOME v5 — dal prototipo, tradotta ────────────────
     Tradotta, non ricopiata (docs/operating-system/16-mockup-translation-protocol).

     EMOZIONE: introspezione che diventa invito. La pagina ti dice chi sei, e
     solo dopo ti propone qualcosa.

     NARRAZIONE, una idea per scena:
       01 chi sei oggi      → lo specchio
       02 dove sei          → il filo lasciato in sospeso
       03 dove ti porterei  → l'invito
       04 altre due direz.  → l'invito ha delle sfumature
       05 il tuo mondo      → quanto hai gia' costruito

     EROE per scena: 01 tipografia sopra fotografia · 02 e 03 fotografia ·
     04 tipografia (i due ruoli) · 05 i numeri.

     Le scene sono NUMERATE a schermo: la numerazione e' il filo narrativo,
     non decorazione — dice al lettore che sta attraversando un discorso.  */

  /** L'etichetta di scena: "02 · DOVE SEI". */
  const SceneK = ({ n, k }: { n: string; k: string }) => (
    <div className="h5-k"><span className="h5-k-n">{n}</span><span className="h5-k-t">{t(k)}</span></div>
  );

  const HomeView = () => {
    const claim = data.portrait?.narrative?.paradox ?? data.traits[0]?.desc ?? null;
    const lead = picks?.picks[0] ?? null;
    const others = picks?.picks.slice(1, 3) ?? [];
    // I due ruoli delle alternative: la seconda si scosta, la terza contrasta.
    // Non e' copy inventato — e' la posizione nella classifica di coerenza.
    const roleKey = (i: number) => (i === 0 ? "acd.h5.roleDeviation" : "acd.h5.roleContrast");

    const strip = worldPhotos.slice(0, 4);
    const more = Math.max(0, worldPhotos.length - strip.length);

    return (
    <div className="view h5">
      {/* Atmosfera: una fotografia sola, molto lontana, che toglie al fondo il
          nero piatto. Non e' il vecchio crossfade — quello cambiava immagine
          dietro ogni blocco e faceva rumore. Qui e' ferma, ed e' colore. */}
      <div className="h5-air" style={{ backgroundImage: bg(photos[0] ?? data.heroImg, 1200, 45) }} />
      <div className="h5-air-veil" />

      {/* ══ 01 · CHI SEI OGGI ══════════════════════════════════════════════
          Eroe: la frase. La fotografia e' atmosfera, non soggetto. */}
      <section className="h5-who">
        <div className="h5-who-ph" style={{ backgroundImage: bg(photos[heroIdx] ?? data.heroImg, heroW, 62) }} />
        <div className="h5-who-veil" />
        <div className="h5-in h5-who-in">
          <div className="h5-eyebrow">{t(greetKey)} {data.userName}</div>
          {isEmpty || !claim ? (
            <>
              <h1 className="h5-claim">{t("acd.h4.claimNew")}</h1>
              <p className="h5-lede">{t("acd.h4.subNew")}</p>
              <button className="h5-cta" onClick={data.onNewItinerary}>{t("acd.h4.startCta")} <span>→</span></button>
            </>
          ) : (
            <>
              <Html as="h1" className="h5-claim" html={claim} />
              <div className="h5-stats">
                {portraitConfidence != null && (
                  <div className="h5-stat"><span className="n">{portraitConfidence}<em>%</em></span><span className="l">{t("acd.h4.confidence")}</span></div>
                )}
                <div className="h5-stat"><span className="n">{counts.trips}</span><span className="l">{t("acd.h5.trips")}</span></div>
                <div className="h5-stat"><span className="n">{counts.continents}</span><span className="l">{t("acd.h5.continents")}</span></div>
              </div>
              <button className="h5-link" onClick={() => go("portrait")}>{t("acd.h4.readMore")} <span>→</span></button>
            </>
          )}
        </div>
      </section>

      {/* ══ 02 · DOVE SEI ══ */}
      {continueCard && !isEmpty && (
        <section className="h5-band">
          <SceneK n="02" k="acd.h5.k2" />
          <article className="h5-card h5-last">
            <div className="h5-card-ph" style={{ backgroundImage: bg(continueCard.img, cardW) }} />
            <div className="h5-card-b">
              <div className="h5-micro">{continueCard.progress ? t("acd.h4.onTheRoad") : t("acd.h5.lastTrip")}</div>
              <h2 className="h5-card-t">{continueCard.title}</h2>
              <div className="h5-meta">
                {continueCard.region && <span>{continueCard.region}</span>}
                {continueCard.region && continueCard.date && <span className="sep">·</span>}
                {continueCard.date && <span>{continueCard.date}</span>}
              </div>
              {continueCard.quote && <p className="h5-quote">“{continueCard.quote}”</p>}
              {continueCard.progress && (
                <div className="h5-prog">
                  <span className="bar"><i style={{ width: `${Math.round((continueCard.progress.n / continueCard.progress.tot) * 100)}%` }} /></span>
                  <span className="v">{tx("acd.h4.pill", { n: continueCard.progress.n, tot: continueCard.progress.tot })}</span>
                </div>
              )}
              <div className="h5-acts">
                <button className="h5-cta sm" onClick={() => setLocation(continueCard.href)}>{t("acd.h2.resumeCta")} <span>→</span></button>
                <button className="h5-link" onClick={() => { setViewMode("cards"); go("trips"); }}>{t("acd.h5.allTrips")} <span>→</span></button>
              </div>
            </div>
          </article>
        </section>
      )}

      {/* ══ 03 · DOVE TI PORTEREI ADESSO ══ */}
      {lead && !isEmpty && (
        <section className="h5-band h5-band-lit" id="h2-recs">
          {/* La fotografia della meta esce dalla colonna e colora la fascia:
              e' l'unico punto della pagina dove il desiderio deve alzare la
              voce. */}
          <div className="h5-bleed" style={{ backgroundImage: bg(lead.imageUrl, 1400, 55) }} />
          <div className="h5-bleed-veil" />
          <SceneK n="03" k="acd.h5.k3" />
          <article className="h5-card h5-prop">
            <div className="h5-card-ph" style={{ backgroundImage: bg(lead.imageUrl, featW) }}>
              <span className="h5-badge">{lead.matchPct}% <em>{t("acd.h5.affinity")}</em></span>
            </div>
            <div className="h5-card-b">
              <div className="h5-micro">{t("acd.h5.mainPick")}</div>
              <h2 className="h5-card-t">{lead.name.split(",")[0]}{lead.country ? `, ${lead.country}` : ""}</h2>
              <p className="h5-lead-line">{t("acd.h5.thisWeek")}</p>
              {picks?.why && <p className="h5-body">{picks.why}</p>}
              <div className="h5-acts">
                <button className="h5-cta sm" onClick={() => data.onPickDestination?.({ name: lead.name, country: lead.country, imageUrl: lead.imageUrl, matchPct: lead.matchPct })}>
                  {t("acd.h5.build")} <span>→</span>
                </button>
                <button className="h5-link" onClick={() => setPropWhy(v => !v)} aria-expanded={propWhy}>
                  {tx("acd.h5.whyThis", { name: lead.name.split(",")[0] })} <span>{propWhy ? "×" : "→"}</span>
                </button>
              </div>

              {/* La risposta. Solo dati veri: il punteggio è la coerenza fra il
                  tuo vettore a 5 assi e quello della meta — una misura, non
                  un'opinione, e senza AI di mezzo (server/daily-pick.ts). */}
              {propWhy && (
                <div className="h5-why">
                  <div className="h5-why-cols">
                    <div>
                      <div className="h5-why-h">{t("acd.h5.whyYou")}</div>
                      {data.traits.slice(0, 3).map((tr, i) => <div key={i} className="h5-why-i">{tr.name}</div>)}
                    </div>
                    <div className="h5-why-arrow">↔</div>
                    <div>
                      <div className="h5-why-h">{t("acd.h5.whyThere")}</div>
                      {lead.tags.slice(0, 3).map((x, i) => <div key={i} className="h5-why-i">{x}</div>)}
                    </div>
                  </div>
                  <p className="h5-why-note">{tx("acd.h5.whyHow", { pct: lead.matchPct })}</p>
                  <button className="h5-link" onClick={() => go("portrait")}>{t("acd.h4.readMore")} <span>→</span></button>
                </div>
              )}
            </div>
          </article>
        </section>
      )}

      {/* ══ 04 · ALTRE DUE DIREZIONI ══ */}
      {others.length > 0 && !isEmpty && (
        <section className="h5-band">
          <SceneK n="04" k="acd.h5.k4" />
          <div className="h5-two">
            {others.map((p, i) => (
              <article key={p.name + i} className="h5-card h5-alt">
                <div className="h5-card-ph" style={{ backgroundImage: bg(p.imageUrl, 520) }}>
                  <span className="h5-badge">{p.matchPct}% <em>{t("acd.h5.affinity")}</em></span>
                </div>
                <div className="h5-card-b">
                  <h3 className="h5-alt-t">{p.name.split(",")[0]}{p.country ? `, ${p.country}` : ""}</h3>
                  <div className="h5-role">{t(roleKey(i))}</div>
                  {p.tags.length > 0 && <p className="h5-body sm">{p.tags.slice(0, 3).join(" · ")}</p>}
                  <button className="h5-go" aria-label={t("acd.h5.build")}
                          onClick={() => data.onPickDestination?.({ name: p.name, country: p.country, imageUrl: p.imageUrl, matchPct: p.matchPct })}>→</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ══ 05 · IL TUO MONDO ══ */}
      {!isEmpty && (
        <section className="h5-band h5-last-band">
          <SceneK n="05" k="acd.h5.k5" />
          <div className="h5-world">
            <div className="h5-world-l">
              <div className="h5-world-nums">
                <div className="h5-stat"><span className="n">{counts.trips}</span><span className="l">{t("acd.h5.trips")}</span></div>
                <div className="h5-stat"><span className="n">{counts.places}</span><span className="l">{t("acd.h5.places")}</span></div>
                <div className="h5-stat"><span className="n">{counts.continents}</span><span className="l">{t("acd.h5.continents")}</span></div>
              </div>
              <button className="h5-link" onClick={() => { setViewMode("atlas"); go("trips"); }}>{t("acd.h5.exploreAtlas")} <span>→</span></button>
            </div>

            {strip.length > 0 && (
              <div className="h5-strip">
                {strip.map((src, i) => (
                  <button key={src + i} className="h5-tile" style={{ backgroundImage: bg(src, 320) }}
                          aria-label={t("acd.h5.exploreAtlas")}
                          onClick={() => { setViewMode("atlas"); go("trips"); }} />
                ))}
                {more > 0 && (
                  <button className="h5-tile more" onClick={() => { setViewMode("cards"); go("trips"); }}>+{more}</button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {SiteFooter()}
    </div>
    );
  };

  /* ──────────────── RIPRENDI (redesign 2026-07 dal mockup) ──────────────── */
  const ResumeView = () => {
    const fc = continueCard;
    const allSaved = data.savedMoments ?? [];
    const fcMoments = fc?.itineraryId != null
      ? allSaved.filter(m => m.itineraryId === fc.itineraryId && m.momentSnapshot).slice(0, 3)
      : [];
    const fcSavedTotal = fc?.itineraryId != null
      ? allSaved.filter(m => m.itineraryId === fc.itineraryId).length
      : 0;
    // "Altri N aperti": i "da riprendere" (Ondata B) quando esistono, altrimenti
    // i viaggi più recenti diversi dal featured. Mai match% qui: non lo abbiamo.
    const others = resumeRest.length > 0
      ? resumeRest.map(r => ({ title: r.title, img: r.img, href: r.href ?? "#", date: r.date ?? "", quote: r.quote ?? "", days: 0 }))
      : data.trips
          .filter(tr => tr.href && tr.href !== fc?.href)
          .slice(0, 2)
          .map(tr => ({ title: tr.dest, img: tr.img, href: tr.href!, date: tr.date ?? "", quote: tr.quote ?? "", days: daysOf(tr.duration) }));
    const pct = fc?.progress ? Math.round((fc.progress.n / fc.progress.tot) * 100) : 0;
    const also = picks?.picks[0];

    return (
      <div className="view">
        <div className="r2-head">
          <div>
            <div className="r2-crumbs">
              <button onClick={() => go("home")}>✦ {t("acd.r2.crumbHome")}</button>
              <span>/</span>
              <span className="on">{t("acd.r2.crumb")}</span>
            </div>
            <Html as="h1" className="r2-title" html={pct > 0 ? t("acd.r2.title") : t("acd.r2.titleFresh")} />
            <p className="r2-sub">{t("acd.r2.sub")}</p>
          </div>
          <button className="btn-p" onClick={data.onNewItinerary}>+ {t("acd.tb.newItin")}</button>
        </div>

        <div className="h2-grid">
          {/* ── colonna principale ── */}
          <div className="h2-main">
            {fc ? (
              <section className="r2-feat">
                <div className="r2-feat-bg" style={{ backgroundImage: bg(fc.img, featW, 62) }} />
                <div className="r2-feat-veil" />
                <div className="r2-feat-in">
                  <div className="r2-feat-copy">
                    <div className="r2-badge">◆ {t("acd.r2.lastOpened")}{fc.date ? ` · ${fc.date}` : ""}</div>
                    <h2 className="r2-feat-name">{fc.title}</h2>
                    {fc.quote && <p className="r2-feat-quote">{fc.quote}</p>}

                    <div className="r2-prog">
                      <div className="r2-prog-k">{t("acd.r2.yourProgress")}</div>
                      <div className="r2-prog-row">
                        <div className="r2-prog-pct">
                          <span className="n">{pct}%</span>
                          <span className="l">{tx("acd.r2.bookingsOf", { n: fc.progress?.n ?? 0, tot: MISSION_TOTAL })}</span>
                        </div>
                        <div className="r2-steps">
                          {MISSIONS.map((mid) => {
                            const on = !!fc.done?.has(mid);
                            return (
                              <span key={mid} className={"r2-step" + (on ? " on" : "")}>
                                <span className="dot">{on ? "✓" : ""}</span>
                                <span className="sl">{t(`acd.r2.m.${mid}`)}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="r2-meta">
                      {fc.date && <span className="r2-meta-cell"><span className="k">{t("acd.r2.lastOpened")}</span><span className="v">{fc.date}</span></span>}
                      {weather && <span className="r2-meta-cell"><span className="k">{t("acd.r2.metaWeather")}</span><span className="v">{weather.tempC}°C {t(wxKey(weather.code))}</span></span>}
                      {fcSavedTotal > 0 && <span className="r2-meta-cell"><span className="k">{t("acd.r2.metaSaved")}</span><span className="v">{fcSavedTotal}</span></span>}
                    </div>

                    <div className="r2-acts">
                      <button className="btn-p" onClick={() => setLocation(fc.href)}>{t("acd.r2.resume")} →</button>
                      <button className="btn-g" onClick={() => setLocation(fc.href)}>{t("acd.r2.viewFull")}</button>
                    </div>
                  </div>

                  {fcMoments.length > 0 && (
                    <div className="r2-dontmiss">
                      <div className="r2-dm-k">{t("acd.r2.beforeK")}</div>
                      <div className="r2-dm-t">{t("acd.r2.beforeT")}</div>
                      {fcMoments.map((m, i) => (
                        <button key={i} className="r2-dm-item" onClick={() => setLocation(fc.href)}>
                          {m.momentSnapshot?.image_url
                            ? <span className="ph" style={{ backgroundImage: bg(m.momentSnapshot.image_url, 120) }} />
                            : <span className="ph fallback">✦</span>}
                          <span className="tx">
                            <span className="a">{m.momentSnapshot?.title}</span>
                            {m.momentSnapshot?.location_name && <span className="b">{m.momentSnapshot.location_name}</span>}
                          </span>
                        </button>
                      ))}
                      <button className="h2-link" onClick={() => setLocation(fc.href)}>{tx("acd.r2.seeSaved", { n: fcSavedTotal })} →</button>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <div className="c-empty" style={{ border: "1px solid var(--stroke)", borderRadius: "var(--radius)", padding: 24 }}>{t("acd.resume.empty")}</div>
            )}

            {(others.length > 0 || also) && (
              <section>
                <div className="r2-saved-head">
                  <div>
                    <div className="sec-eyebrow">{t("acd.r2.savedK")}</div>
                    <Html as="h2" className="sec-title"
                      html={others.length === 1 ? t("acd.r2.anotherOne") : tx("acd.r2.anotherMany", { n: others.length })} />
                  </div>
                  <button className="h2-link" onClick={() => go("trips")}>{t("acd.h2.viewAll")} →</button>
                </div>
                <div className="r2-saved-grid">
                  {others.map((o, i) => (
                    <button key={i} className="r2-saved" style={{ backgroundImage: bg(o.img, cardW, 62) }} onClick={() => setLocation(o.href)}>
                      <span className="r2-saved-top">
                        {o.date && <span className="when">{o.date}</span>}
                        <span className="plus">＋</span>
                      </span>
                      <span className="r2-saved-body">
                        <span className="nm">{o.title}</span>
                        {o.quote && <span className="qt"><em>{t("acd.r2.youSaid")}</em> {o.quote}</span>}
                        {o.days > 0 && <span className="dd">{o.days} {plural(o.days, "acd.unit.day", "acd.unit.days")}</span>}
                      </span>
                    </button>
                  ))}
                  {also && (
                    <div className="r2-also">
                      <div className="r2-dm-k">{t("acd.r2.alsoK")}</div>
                      <div className="r2-also-t">{t("acd.r2.alsoT")}</div>
                      {/* Toccare una proposta significa "ho scelto": apre il
                          pannello dei vincoli con la destinazione bloccata,
                          non rilancia il matcher (che restituirebbe altro). */}
                      <button className="r2-also-card" onClick={() => data.onPickDestination?.({ name: also.name, country: also.country, imageUrl: also.imageUrl, matchPct: also.matchPct })}>
                        <span className="ph" style={{ backgroundImage: bg(also.imageUrl, 520) }}>
                          <span className="match">{also.matchPct}% {t("acd.h2.match")}</span>
                        </span>
                        <span className="nm">{also.name.split(",")[0]}</span>
                        {also.tags.length > 0 && <span className="tg">{also.tags.join(" · ")}</span>}
                      </button>
                      <button className="h2-link" onClick={data.onSecondaryCta}>{t("acd.r2.explore")} →</button>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* ── colonna destra ── */}
          <aside className="h2-rail">
            {WeatherCard()}

            <div className="h2-card r2-comp">
              <div className="h2-card-head">
                <h3>{t("acd.r2.compK")}</h3>
                <span className="r2-beta">BETA</span>
              </div>
              <div className="r2-comp-ico">
                <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.3 8.9 8.9 0 0 1-3.2-.6L4 20.5l1.3-4.1a8 8 0 0 1-1.3-4.9A8.4 8.4 0 0 1 12.5 3.2 8.4 8.4 0 0 1 21 11.5z"/>
                  <path d="M8.8 11.5h.01M12.5 11.5h.01M16.2 11.5h.01"/>
                </svg>
              </div>
              <div className="r2-comp-t">{t("acd.r2.compT")}</div>
              <div className="r2-comp-sub">{t("acd.r2.compSub")}</div>
              <button className="btn-p r2-comp-cta" onClick={() => window.dispatchEvent(new Event("mindroute:open-companion"))}>
                {t("acd.r2.compCta")} →
              </button>
            </div>

            {fc && (
              <div className="h2-card r2-status">
                <div className="h2-card-head">
                  <h3>{t("acd.r2.statusK")}</h3>
                  <span className="r2-status-pct">{tx("acd.r2.statusPct", { pct })}</span>
                </div>
                <div className="r2-status-list">
                  {MISSIONS.map((mid) => {
                    const on = !!fc.done?.has(mid);
                    return (
                      <div key={mid} className={"r2-status-row" + (on ? " on" : "")}>
                        <span className="nm">{t(`acd.r2.m.${mid}`)}</span>
                        <span className="st">{on ? `✓ ${t("acd.r2.done")}` : `○ ${t("acd.r2.todo")}`}</span>
                      </div>
                    );
                  })}
                </div>
                <button className="h2-link" onClick={() => setLocation(fc.href)}>{t("acd.r2.manage")} →</button>
              </div>
            )}
          </aside>
        </div>
      </div>
    );
  };

  /* ──────────────── RITRATTO ──────────────── */
  /* ──────────────── RITRATTO v3 (redesign 2026-07 dal mockup) ──────────────── */
  /* ──────────────── IL TUO RITRATTO ────────────────────────────────────
     Riscritto sul mockup (2026-08): cinque sezioni nell'ordine in cui una
     persona si fa le domande — chi sono oggi, come sono adesso, come sto
     cambiando, cosa avete scoperto, cosa faccio adesso.
     La logica (confidenza, evoluzione, insight) vive in lib/portrait-insights,
     pura e verificabile; qui si passa solo il dato. */
  const PortraitView = () => (
    <div className="view">
      <PortraitScreen
        data={data}
        onGenerate={data.onSecondaryCta ?? data.onNewItinerary}
        onChallenge={data.onChallenge}
        onShare={sharePortrait}
        sharing={sharing}
        onPickDestination={data.onPickDestination}
        onCompanion={() => window.dispatchEvent(new Event("mindroute:open-companion"))}
        picks={picks?.picks ?? null}
        picksWhy={picks?.why ?? null}
      />
      {/* Le osservazioni della bussola, per intero. Qui un ELENCO è quello che
          si cerca; in home ne compare una sola (regola singolari/elenchi). */}
    </div>
  );

  /* ──────────────── I MIEI VIAGGI — collezione unica, due prospettive ────
     Una sola sezione. "Cards" e "Atlas" sono View Mode degli STESSI dati:
     header, statistiche, filtri, ricerca e timeline sono CONDIVISI; cambia
     solo la rappresentazione del corpo (griglia ↔ mappa). Atlas non è più
     una pagina a sé. */

  // Salva l'emozione del viaggio (tag utente) in tripMeta via endpoint.
  const saveTripEmotion = (itineraryId: number, emotion: string | null) => {
    fetch(`/api/itinerary/${itineraryId}/emotion`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emotion }),
    }).catch(() => { /* best-effort: lo stato locale è già aggiornato */ });
  };

  const SORTS: SortMode[] = ["recent", "impact", "alpha"];

  const CollectionView = () => (
    // `is-atlas` serve al CSS: su telefono la mappa deve venire PRIMA delle
    // statistiche, altrimenti per vederla si scorrono 700px di numeri.
    <div className={"view coll2" + (viewMode === "atlas" ? " is-atlas" : "")}>
      <section className="coll2-command">
        <div className="coll2-command-main">
          {continueCard && <div className="coll2-command-photo" style={{ backgroundImage: bg(continueCard.img, 1100, 70) }} />}
          <div className="coll2-command-veil" />
          <div className="coll2-command-copy">
            <div className="coll2-command-k">{lang === "it" ? "IL TUO PROSSIMO PASSO" : "YOUR NEXT STEP"}</div>
            <h1>{continueCard
              ? (lang === "it" ? `Riprendi ${continueCard.title}` : `Continue ${continueCard.title}`)
              : (lang === "it" ? "Il prossimo viaggio parte da qui." : "Your next journey starts here.")}</h1>
            <p>{continueCard?.quote
              || (lang === "it"
                ? "Crea un itinerario nuovo oppure riapri uno dei piani che hai gia costruito."
                : "Create a new itinerary or reopen one of the plans you have already built.")}</p>
            <div className="coll2-command-actions">
              {continueCard && <a className="coll2-command-primary" href={continueCard.href}>{lang === "it" ? "Apri itinerario" : "Open itinerary"} <span>→</span></a>}
              <button className={continueCard ? "coll2-command-secondary" : "coll2-command-primary"} onClick={data.onNewItinerary}>
                {lang === "it" ? "Crea un nuovo viaggio" : "Create a new trip"} <span>→</span>
              </button>
            </div>
          </div>
        </div>

        <aside className="coll2-learning">
          <div className="coll2-learning-top">
            <span className="coll2-learning-dot" />
            <span>{lang === "it" ? "COSA MINDROUTE STA IMPARANDO" : "WHAT MINDROUTE IS LEARNING"}</span>
          </div>
          {learnedInsights[0] ? (
            <>
              <div className="coll2-learning-copy">
                <h2>{tx(learnedInsights[0].titleKey, learnedInsights[0].vars)}</h2>
                <p>{tx(learnedInsights[0].bodyKey, learnedInsights[0].vars)}</p>
              </div>
              {nextTravelRules[0] && (
                <div className="coll2-learning-effect">
                  <span>{lang === "it" ? "NEL PROSSIMO VIAGGIO" : "IN YOUR NEXT TRIP"}</span>
                  <strong>{nextTravelRules[0].title[lang]}</strong>
                </div>
              )}
              <button onClick={() => go("portrait")}>{lang === "it" ? "Apri il Ritratto" : "Open your Portrait"} <span>→</span></button>
            </>
          ) : (
            <>
              <div className="coll2-learning-copy">
                <h2>{lang === "it" ? "Il tuo Ritratto sta prendendo forma." : "Your Portrait is taking shape."}</h2>
                <p>{lang === "it" ? "Ogni scelta e ogni viaggio confermato renderanno piu preciso il prossimo itinerario." : "Every choice and confirmed trip will make the next itinerary more precise."}</p>
              </div>
              <button onClick={() => go("portrait")}>{lang === "it" ? "Scopri cosa sappiamo" : "See what we know"} <span>→</span></button>
            </>
          )}
        </aside>
      </section>
      {/* ── Header: titolo + View Switcher + azione ── */}
      <div className="coll2-top">
        <div className="coll2-head">
          <div className="coll2-crumbs"><span className="hm">✦ {t("acd.r2.crumbHome")}</span><span>—</span><span className="on">{t("acd.coll.eyebrow")}</span></div>
          <Html as="h1" className="coll2-title" html={t("acd.coll.title")} />
          <p className="coll2-sub">{t("acd.coll.tagline")}</p>
        </div>
        <div className="coll2-top-r">
          <div className="coll2-switch" role="tablist" aria-label={t("acd.coll.viewLabel")}>
            <button role="tab" aria-selected={viewMode === "cards"} className={"vsw" + (viewMode === "cards" ? " on" : "")} onClick={() => setViewMode("cards")}>
              <svg viewBox="0 0 24 24">{["M4 4h7v7H4z", "M13 4h7v7h-7z", "M4 13h7v7H4z", "M13 13h7v7h-7z"].map((d, i) => <path key={i} d={d} />)}</svg>
              {t("acd.coll.viewCards")}
            </button>
            <button role="tab" aria-selected={viewMode === "atlas"} className={"vsw" + (viewMode === "atlas" ? " on" : "")} onClick={() => setViewMode("atlas")}>
              <svg viewBox="0 0 24 24">{["M9 3 3.5 5.2v15.3L9 18.3l6 2.2 5.5-2.2V3L15 5.2 9 3z", "M9 3v15.3", "M15 5.2v15.3"].map((d, i) => <path key={i} d={d} />)}</svg>
              {t("acd.coll.viewAtlas")}
            </button>
          </div>
          <button className="btn-p coll2-new" onClick={data.onNewItinerary}>{t("acd.tb.newItin")}</button>
        </div>
      </div>

      {/* ── Statistiche (riflettono il filtro attivo) ── */}
      <div className="coll2-stats">
        <div className="cs"><span className="n">{collStats.itineraries}</span><span className="l">{lang === "it" ? "Piani creati" : "Plans created"}</span></div>
        <div className="cs"><span className="n">{collStats.confirmed}</span><span className="l">{lang === "it" ? "Viaggi fatti" : "Trips taken"}</span></div>
        <div className="cs"><span className="n">{collStats.days}</span><span className="l">{lang === "it" ? "Giorni pianificati" : "Planned days"}</span></div>
        <div className="cs"><span className="n">{collStats.destinations}</span><span className="l">{t("acd.coll.stat.destinations")}</span></div>
        <div className="cs"><span className="n">{collStats.continents}</span><span className="l">{t("acd.coll.stat.continents")}</span></div>
      </div>

      {/* ── Filtri condivisi: ricerca + continenti + ordinamento ── */}
      <div className="coll2-filters">
        <div className="coll-status" aria-label={lang === "it" ? "Stato del viaggio" : "Trip status"}>
          {(["all", "planned", "confirmed", "skipped"] as const).map(status => (
            <button key={status} className={tripStatus === status ? "on" : ""} onClick={() => setTripStatus(status)}>
              {status === "all" ? (lang === "it" ? "Tutti" : "All")
                : status === "planned" ? (lang === "it" ? "In programma" : "Planned")
                  : status === "confirmed" ? (lang === "it" ? "Fatti" : "Taken")
                    : (lang === "it" ? "Non realizzati" : "Not taken")}
            </button>
          ))}
        </div>
        <div className="coll-search">
          <Icon name="search" />
          <input placeholder={t("acd.coll.search")} value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="coll-tabs">
          {REGION_TABS.map(r => (
            <button key={r} className={"coll-tab" + (region === r ? " on" : "")} onClick={() => setRegion(r)}>{t("acd.region." + r)}</button>
          ))}
        </div>
        <div className="coll2-sort">
          <button className="coll2-sort-btn" onClick={() => setSortOpen(v => !v)}>
            {t("acd.coll.sort." + sort)} <span className="ca">▾</span>
          </button>
          {sortOpen && (
            <div className="coll2-sort-menu" onMouseLeave={() => setSortOpen(false)}>
              {SORTS.map(s => (
                <button key={s} className={s === sort ? "on" : ""} onClick={() => { setSort(s); setSortOpen(false); }}>{t("acd.coll.sort." + s)}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Corpo: griglia ↔ mappa (crossfade) ── */}
      <div className="coll2-body" key={viewMode}>
        {viewMode === "cards" ? (
          <div className="coll-grid">
            {filteredTrips.length === 0 && <div className="c-empty">{t("acd.coll.empty")}</div>}
            {filteredTrips.map((tr, i) => <TripCard key={tr.href ?? i} tr={tr} />)}
          </div>
        ) : (
          <Suspense fallback={<div className="coll2-maploading" />}>
            <AtlasMap
              atlas={data.atlas ?? null}
              trips={filteredTrips}
              savedMoments={data.savedMoments}
              onSaveEmotion={saveTripEmotion}
              initialSelId={(() => { try { const s = new URLSearchParams(window.location.search).get("asel"); return s ? Number(s) : null; } catch { return null; } })()}
              initialFullscreen={(() => { try { return new URLSearchParams(window.location.search).get("afs") === "1"; } catch { return false; } })()}
            />
          </Suspense>
        )}
      </div>

      {/* ── Timeline condivisa: filtro temporale per griglia + mappa + stat ── */}
      {yearData.length > 0 && (
        <div className="coll2-timeline">
          <div className="ct-track">
            <button className={"ct-all" + (focusYear == null ? " on" : "")} onClick={() => setFocusYear(null)}>{t("acd.region.all")}</button>
            {yearData.map(({ year, dots }) => (
              <button key={year} className={"ct-year" + (focusYear === year ? " on" : "")} onClick={() => setFocusYear(focusYear === year ? null : year)}>
                <span className="ct-dots">{dots.slice(0, 10).map((d, i) => <span key={i} className="ct-dot" style={{ background: d.color }} />)}</span>
                <span className="ct-y">{year}</span>
                <span className="ct-n">{dots.length}</span>
              </button>
            ))}
          </div>
          <div className="ct-hint">
            {focusYear == null
              ? t("acd.coll.tlHint")
              : tx("acd.coll.tlViewing", { y: focusYear, n: collStats.itineraries, nu: t(collStats.itineraries === 1 ? "acd.unit.trip" : "acd.unit.trips") })}
          </div>
        </div>
      )}
    </div>
  );

  /* ──────────────── DRAWER ──────────────── */
  const Drawer = () => (
    <>
      <div className={"ovl" + (drawer ? " open" : "")} onClick={() => setDrawer(false)} />
      <aside className={"drawer" + (drawer ? " open" : "")}>
        <div className="dr-head">
          <div>
            <div className="l">{t("acd.dr.account")}</div>
            <div className="v">{t("acd.dr.settings")}</div>
          </div>
          <button className="dr-close" onClick={() => setDrawer(false)} aria-label="×">×</button>
        </div>
        <div className="dr-body">
          <div className="dr-profile">
            <div className="av">{data.avatarInitial ?? data.userName[0]}</div>
            <div>
              <div className="nm">{data.userName}</div>
              {data.email && <div className="em">{data.email}</div>}
            </div>
          </div>

          <div className="dr-group">
            <div className="gh">{t("acd.dr.prefs")}</div>
            <button className="dr-row" onClick={toggleLang}>
              <span className="lbl">{t("acd.dr.lang")}</span><span className="val">{lang === "it" ? "Italiano" : "English"}</span>
            </button>
            {data.trips.length >= 2 && (
              <button className="dr-row" onClick={() => setLocation("/compare")}>
                <span className="lbl">{t("acd.dr.compare")}</span><span className="val">{t("acd.dr.compareVal")}</span>
              </button>
            )}
          </div>

          <div className="dr-group">
            <div className="gh">{t("acd.dr.profileGroup")}</div>
            <button className="dr-row" onClick={() => setLocation("/profiling")}>
              <span className="lbl">{t("acd.dr.retakeQuiz")}</span><span className="val">{t("acd.dr.retakeVal")}</span>
            </button>
            <button className="dr-row" onClick={() => { setDrawer(false); data.onSecondaryCta?.(); }}>
              <span className="lbl">{t("acd.dr.fromProfile")}</span><span className="val">{t("acd.dr.fromProfileVal")}</span>
            </button>
            <button className="dr-row" onClick={() => setLocation("/come-funziona")}>
              <span className="lbl">{t("acd.dr.how")}</span><span className="val">{t("acd.dr.howVal")}</span>
            </button>
          </div>

          <div className="dr-group">
            <div className="gh">{t("acd.dr.account")}</div>
            <div className="dr-danger">
              <button className="dr-out" onClick={data.onLogout}>{t("acd.dr.logout")}</button>
              <button className="dr-del" onClick={data.onDelete}>{t("acd.dr.delete")}</button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );

  /* ──────────────── SHELL ──────────────── */
  return (
    // `is-home`: la Home v4 porta le proprie fotografie e ha un fondo pieno.
    // Lo sfondo ambient in crossfade serve alle viste fatte di card traslucide;
    // sotto la home riaffiorava solo nelle zone non coperte (la coda sopra la
    // barra del telefono), e lì sembrava una macchia.
    <div className={"account-dash" + (view === "home" ? " is-home" : "") + (view === "portrait" ? " is-portrait" : "")}>
      <div className="field" />
      <div className="ax-stage">
        {ambient.map((src, i) => (
          <div key={src + i} className={"ax-photo" + (ambientIdx === i ? " on" : "")} style={{ backgroundImage: `url(${src})` }} />
        ))}
      </div>
      <div className="grain" />

      {/* ── La barra ──────────────────────────────────────────────────────
          Via la sidebar: con due sole sezioni erano 240px di cornice attorno
          al nulla. Il logo torna alla home (che non e' piu' una voce di menu
          ma la radice), e mentre un viaggio e' in corso compare una pillola
          contestuale — una scorciatoia, non una sezione: sparisce quando il
          viaggio finisce. */}
      <main className="main">
        <div className={"topbar h4-bar" + (stuck ? " stuck" : "")}>
          <button className="tb-brand" onClick={() => go("trips")} title="MindRoute"><FlowNavLogo size={22} /></button>

          <nav className="h4-nav">
            {NAV.map(n => (
              <button key={n.id} className={"h4-nav-i" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
                {t(n.key)}
              </button>
            ))}
          </nav>

          {continueCard?.progress && (
            <button className="h4-pill" onClick={() => setLocation(continueCard.href)}>
              <span className="h4-pill-d" />
              <span className="h4-pill-n">{continueCard.title}</span>
              <span className="h4-pill-p">{tx("acd.h4.pill", { n: continueCard.progress.n, tot: continueCard.progress.tot })}</span>
            </button>
          )}

          <div className="tb-spacer" />
          <div className="tb-search">
            <Icon name="search" />
            <input placeholder={t("acd.tb.search")} value={q} onChange={e => onTopSearch(e.target.value)} />
          </div>
          <LangDropdown variant="dark" />
          <button className="tb-cta" onClick={data.onNewItinerary}>{t("acd.tb.newItin")}</button>
          {/* Impostazioni e account. Stavano nel piede della sidebar; tolta
              quella, su desktop non c'era PIÙ NESSUN modo di aprire il drawer
              — quindi niente lingua, niente logout, niente cancella account. */}
          <button className="h4-gear" onClick={() => setDrawer(true)} title={t("acd.settings")} aria-label={t("acd.settings")}>
            <Icon name="gear" />
          </button>
          <button className="h4-av" onClick={() => setDrawer(true)} title={data.userName} aria-label={data.userName}>
            {data.avatarInitial ?? data.userName[0]}
          </button>
        </div>

        {view === "portrait" && PortraitView()}
        {view === "trips" && CollectionView()}
      </main>

      {/* Su telefono la barra in basso porta anche "Oggi": li' il logo non e'
          un bersaglio comodo. Tre voci, le stesse tre idee. */}
      <nav className="mnav">
        {MNAV.map(n => (
          <button key={n.id} className={"mnav-i" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
            <Icon name={n.ic} />
            <span className="lab">{t(n.key)}</span>
          </button>
        ))}
        <button className="mnav-i" onClick={() => window.dispatchEvent(new Event("mindroute:open-companion"))}>
          <Icon name={CHAT_TAB.ic} />
          <span className="lab">{t(CHAT_TAB.key)}</span>
        </button>
      </nav>

      {Drawer()}
    </div>
  );
}
