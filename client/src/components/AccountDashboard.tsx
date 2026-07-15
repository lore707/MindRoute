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

const AccountAtlas = lazy(() => import("./AccountAtlas").then(m => ({ default: m.AccountAtlas })));

// background-image helper: ridimensiona le Unsplash per lo slot reale.
const bg = (url: string, w: number, q = 70) => `url(${unsplashSized(url, w, q)})`;
const AMBIENT_MAX = 5;

type ViewId = "home" | "resume" | "portrait" | "trips" | "atlas";

// Continenti memorizzati lato server, sempre in italiano (vedi AccountCinematic).
const CONTINENT_VALUES: Record<string, string> = {
  europe: "Europa", asia: "Asia", africa: "Africa", americas: "Americhe", oceania: "Oceania",
};
const CONTINENT_KEY: Record<string, string> = {
  Europa: "europe", Asia: "asia", Africa: "africa", Americhe: "americas", Oceania: "oceania",
};
const REGION_TABS = ["all", "europe", "asia", "africa", "americas", "oceania"] as const;

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
};
function Icon({ name }: { name: keyof typeof ICONS }) {
  return <svg viewBox="0 0 24 24">{ICONS[name].map((d, i) => <path key={i} d={d} />)}</svg>;
}

const NAV: Array<{ id: ViewId; ic: keyof typeof ICONS; key: string }> = [
  { id: "home", ic: "home", key: "acd.nav.home" },
  { id: "resume", ic: "resume", key: "acd.nav.resume" },
  { id: "portrait", ic: "portrait", key: "acd.nav.portrait" },
  { id: "trips", ic: "trips", key: "acd.nav.trips" },
  { id: "atlas", ic: "atlas", key: "acd.nav.atlas" },
];

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

// Serie evolutiva: l'asse che si è mosso di più attraverso gli snapshot.
function computeEvoSeries(snaps: Array<{ createdAt: string; traits: Record<string, number> }>) {
  const valid = snaps
    .filter(s => s.traits && s.createdAt)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (valid.length < 3) return null;
  const first = valid[0].traits, last = valid[valid.length - 1].traits;
  let axis = "exposure", best = -1;
  for (const a of ["exposure", "comfort", "social", "matter", "structure"]) {
    const d = Math.abs((last[a] ?? 0.5) - (first[a] ?? 0.5));
    if (d > best) { best = d; axis = a; }
  }
  return {
    axis,
    values: valid.map(s => s.traits[axis] ?? 0.5),
    dates: valid.map(s => new Date(s.createdAt)),
  };
}

/* HTML inline (i18n con <em>) */
function Html({ html, as = "span", className }: { html: string; as?: any; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ════════════════════════════════════════════════════════════ */
export function AccountDashboard({ data, homeExtra }: { data: AccountData; homeExtra?: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [, setLocation] = useLocation();
  // Vista iniziale anche da ?view= (usato dalla preview dev per gli
  // screenshot responsive delle singole viste; innocuo altrove).
  const [view, setView] = useState<ViewId>(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("view");
      if (v && ["home", "resume", "portrait", "trips", "atlas"].includes(v)) return v as ViewId;
    } catch { /* SSR/no window */ }
    return "home";
  });
  // Tab del Ritratto v3 (stato qui: le view sono funzioni chiamate
  // condizionalmente, gli hook dentro violerebbero le rules-of-hooks).
  type PTab = "overview" | "emotions" | "patterns" | "growth" | "journal" | "guidance";
  const [pTab, setPTab] = useState<PTab>("overview");
  const [stuck, setStuck] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [region, setRegion] = useState<(typeof REGION_TABS)[number]>("all");
  const [q, setQ] = useState("");
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

  // Filtro collezione (region + ricerca)
  const filteredTrips = useMemo(() => data.trips.filter(tr => {
    if (region !== "all" && tr.continent !== CONTINENT_VALUES[region]) return false;
    if (q && !tr.dest.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [data.trips, region, q]);

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
    <a className={"c-card" + (tr.taken ? " taken" : "")} href={tr.href ?? "#"}>
      <div className="ph" style={{ backgroundImage: bg(tr.img, cardW) }} />
      {tr.taken && <span className="c-taken">{lang === "it" ? "Fatto" : "Been there"}</span>}
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
    const trip = (lastId ? byId(lastId) : undefined) ?? data.trips[0];
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

  // Mini-atlante (colonna destra): mappa Leaflet non interattiva con i pin
  // reali. Leaflet è già nel bundle della route account (AccountAtlas), il
  // dynamic import qui riusa lo stesso chunk. Init solo quando la home è
  // visibile e ci sono luoghi; distrutta al cambio vista.
  const miniMapEl = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const places = data.atlas?.places ?? [];
    if (view !== "home" || places.length === 0 || !miniMapEl.current) return;
    let map: any = null;
    let disposed = false;
    import("leaflet").then((mod) => {
      const L = (mod as any).default ?? mod; // interop UMD/ESM (come fa Vite per l'import statico)
      if (disposed || !miniMapEl.current) return;
      map = L.map(miniMapEl.current, {
        zoomControl: false, dragging: false, scrollWheelZoom: false,
        doubleClickZoom: false, boxZoom: false, keyboard: false,
        touchZoom: false, attributionControl: false,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png").addTo(map);
      const pts = places.map((p) => [p.lat, p.lng] as [number, number]);
      pts.forEach((ll) => {
        L.marker(ll, { icon: L.divIcon({ className: "h2-atlas-dot", iconSize: [8, 8] }), interactive: false }).addTo(map);
      });
      map.fitBounds(L.latLngBounds(pts), { padding: [18, 18], maxZoom: 5 });
    }).catch(() => { /* la card mostra solo le stat */ });
    return () => { disposed = true; if (map) map.remove(); };
  }, [view, data.atlas]);

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
  const CompassSection = () => compass && (
    <section className="h2-card cp-sec">
      <div className="h2-card-head">
        <h3>🧭 {t("acd.cp.k")}</h3>
        <span className="cp-hint">{t("acd.cp.hint")}</span>
      </div>
      <div className="cp-row">
        {compass.map((card) => {
          const open = cpOpen === card.id;
          const done = cpDone[card.id];
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

              {open && card.type === "reflection" && (
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

              {open && card.type === "discovery" && card.destination && (
                <div className="cp-body">
                  <div className="cp-dest" style={{ backgroundImage: bg(card.destination.imageUrl, 480, 65) }}>
                    {card.destination.matchPct != null && <span className="cp-match">{card.destination.matchPct}% {t("acd.cp.match")}</span>}
                    <span className="cp-dest-nm">{card.destination.name.split(",")[0]}<em>{card.destination.country}</em></span>
                  </div>
                  <div className="cp-note">{t("acd.cp.discoveryNote")}</div>
                </div>
              )}

              {open && card.type === "growth" && card.challenge && (
                <div className="cp-body">
                  <div className="cp-q">“{card.challenge}”</div>
                  <button className="cp-opt on" onClick={() => data.onChallenge?.(card.challenge!)}>{t("acd.cp.growthCta")} →</button>
                  <button className="cp-skip" onClick={() => setCpOpen(null)}>{t("acd.cp.skip")}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );

  const HomeView = () => (
    <div className="view">
      {/* Stato vuoto: hero pieno + onboarding, come prima del redesign */}
      {isEmpty && (<>
        <section className="hero h2-hero">
          {photos.map((p, i) => (
            <div key={p + i} className={"hero-ph" + (heroIdx === i ? " on" : "")} style={{ backgroundImage: bg(p, heroW, 60) }} />
          ))}
          <div className="hero-veil" />
          <div className="hero-in">
            <div className="hero-eyebrow">{t(greetKey)}</div>
            <h1 className="hero-title">{data.userName}<span className="dot">.</span></h1>
            <p className="hero-sub h2-hero-sub">{t(seasonKey)}<br />{t("acd.h2.heroSubNew")}</p>
            <div className="hero-act">
              <button className="btn-p lg" onClick={data.onNewItinerary}>{t("acd.empty.cta")} →</button>
            </div>
          </div>
        </section>
        <div className="home-content">
          <section className="onboard">
            <div className="onboard-eyebrow">{t("acd.empty.eyebrow")}</div>
            <Html as="h2" className="onboard-title" html={t("acd.empty.title")} />
            <p className="onboard-sub">{t("acd.empty.sub")}</p>
            <div className="onboard-steps">
              {["acd.empty.step1", "acd.empty.step2", "acd.empty.step3"].map((k, i) => (
                <div key={k} className="onboard-step"><span className="n">{i + 1}</span><span className="lbl">{t(k)}</span></div>
              ))}
            </div>
            <button className="btn-p" onClick={data.onNewItinerary}>{t("acd.empty.cta")}</button>
          </section>
        </div>
      </>)}

      {/* Layout dal mockup: rail a destra dall'alto, hero DENTRO la colonna
          principale, "continua"+"scelte" affiancati, compass, fascia. */}
      {!isEmpty && (
      <div className="home-content h2c">
        <div className="h2-grid">
          {/* ── colonna principale ── */}
          <div className="h2-main">
            <section className="hero h2-heroc">
              {photos.map((p, i) => (
                <div key={p + i} className={"hero-ph" + (heroIdx === i ? " on" : "")} style={{ backgroundImage: bg(p, heroW, 60) }} />
              ))}
              <div className="hero-veil" />
              <div className="hero-in">
                <div className="hero-eyebrow">{t(greetKey)}</div>
                <h1 className="hero-title">{data.userName}<span className="dot">.</span></h1>
                <p className="hero-sub h2-hero-sub">{t(seasonKey)}<br />{t("acd.h2.heroSub")}</p>
                <div className="hero-act">
                  <button className="btn-p" onClick={scrollToRecs}>{t("acd.h2.heroCta")} →</button>
                </div>
              </div>
            </section>

            <div className="h2-midrow">
              {/* Continua il tuo viaggio */}
              {continueCard && (
                <section className="h2-card">
                  <div className="h2-card-head">
                    <h3>{t("acd.h2.continueK")}</h3>
                    <button className="h2-link" onClick={() => go(data.continueItems.length > 0 ? "resume" : "trips")}>{t("acd.h2.viewAll")} →</button>
                  </div>
                  <div className="h2-cont">
                    <div className="h2-cont-img" style={{ backgroundImage: bg(continueCard.img, 520) }} />
                    <div className="h2-cont-body">
                      {continueCard.region && <div className="h2-cont-region">◆ {continueCard.region}</div>}
                      <div className="h2-cont-name">{continueCard.title}</div>
                      <div className="h2-cont-rule" />
                      <div className="h2-cont-prog">
                        {continueCard.progress
                          ? tx("acd.h2.progress", { n: continueCard.progress.n, tot: continueCard.progress.tot })
                          : t("acd.h2.justOpened")}
                      </div>
                      {continueCard.progress && (
                        <div className="h2-bar"><span style={{ width: `${Math.round((continueCard.progress.n / continueCard.progress.tot) * 100)}%` }} /></div>
                      )}
                      <button className="btn-p" onClick={() => setLocation(continueCard.href)}>{t("acd.h2.resumeCta")} →</button>
                    </div>
                  </div>
                </section>
              )}

              {/* Scelte per te oggi — matchPct reale dai vettori, niente prezzi */}
              {picks && (
                <section className="h2-card" id="h2-recs">
                  <div className="h2-card-head">
                    <h3>{t("acd.h2.recK")}</h3>
                    <button className="h2-link" onClick={() => go("portrait")} title={picks.why}>{t("acd.h2.whyThese")} →</button>
                  </div>
                  <div className="h2-recs">
                    {picks.picks.map((p, i) => (
                      <button key={p.name + i} className="h2-rec" onClick={data.onSecondaryCta}>
                        <div className="h2-rec-img" style={{ backgroundImage: bg(p.imageUrl, 520) }}>
                          <span className="h2-rec-match">{p.matchPct}% {t("acd.h2.match")}</span>
                        </div>
                        <div className="h2-rec-body">
                          <div className="h2-rec-name">{p.name.split(",")[0]}</div>
                          {p.tags.length > 0 && (
                            <div className="h2-rec-tags">{p.tags.map((x, j) => <span key={j}>{x}</span>)}</div>
                          )}
                          <span className="h2-rec-go">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {CompassSection()}

            {/* Fascia finale ONESTA: solo se c'è una checklist vera da completare */}
            {bookingNudge.length > 0 && (
              <div className="h2-band">
                <span className="h2-band-ico">🧭</span>
                <div className="h2-band-mid">
                  <div className="h2-band-k">{t("acd.h2.bandK")}</div>
                  <div className="h2-band-sub">{tx("acd.h2.bandSub", { name: bookingNudge[0].title, n: bookingNudge[0].booked, tot: bookingNudge[0].total })}</div>
                </div>
                <button className="btn-g" onClick={() => setLocation(bookingNudge[0].href)}>{t("acd.h2.bandCta")} →</button>
              </div>
            )}

            {homeExtra && <div className="home-extra">{homeExtra}</div>}
          </div>

          {/* ── colonna destra (dall'alto, come nel mockup) ── */}
          <aside className="h2-rail">
            {WeatherCard()}

            <div className="h2-card h2-portrait">
              <div className="h2-card-head">
                <h3>{t("acd.h2.portraitK")}</h3>
                <button className="h2-link" onClick={() => go("portrait")}>✎ {t("acd.h2.portraitUpdate")}</button>
              </div>
              <div className="h2-portrait-img" style={{ backgroundImage: bg(data.heroImg, 420) }} />
              <div className="h2-portrait-name">{data.traits[0]?.name ?? t("acd.point.portraitK")}</div>
              <Html as="p" className="h2-portrait-sub" html={data.portrait?.narrative?.paradox ?? data.traits[0]?.desc ?? t("acd.point.portraitFallback")} />
              <div className="h2-portrait-chips">
                {data.traits.filter(tr => tr.bar > 12).slice(0, 3).map((tr, i) => <span key={i}>{tr.name}</span>)}
              </div>
            </div>

            <div className="h2-card h2-atlas">
              <div className="h2-card-head">
                <h3>{t("acd.h2.atlasK")}</h3>
                <button className="h2-link" onClick={() => go("atlas")}>{t("acd.h2.viewAll")} →</button>
              </div>
              {(data.atlas?.places?.length ?? 0) > 0 && <div className="h2-atlas-map" ref={miniMapEl} />}
              <div className="h2-atlas-stats">
                <div><span className="n">{counts.continents}</span><span className="l">{plural(counts.continents, "acd.unit.continent", "acd.unit.continents")}</span></div>
                <div><span className="n">{counts.places}</span><span className="l">{plural(counts.places, "acd.unit.place", "acd.unit.places")}</span></div>
                <div><span className="n">{counts.days}</span><span className="l">{plural(counts.days, "acd.unit.day", "acd.unit.days")}</span></div>
                <div><span className="n">{counts.trips}</span><span className="l">{plural(counts.trips, "acd.unit.trip", "acd.unit.trips")}</span></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
      )}
    </div>
  );

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
                      <button className="r2-also-card" onClick={data.onSecondaryCta}>
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
  const PortraitView = () => {
    const p = data.portrait;
    const vec = data.traitVector ?? null;
    const tripCount = p?.tripCount ?? data.trips.length;

    // 5 dimensioni orientate al polo dominante (pct ∈ [50,100], reale).
    const dims = P3_DIMS.map(d => {
      const v = vec?.[d.axis];
      const known = typeof v === "number";
      const hi = known ? v! >= 0.5 : true;
      const pct = known ? Math.round((hi ? v! : 1 - v!) * 100) : 0;
      return {
        ...d,
        known,
        pct,
        name: t(`acd.p3.dim.${d.axis}.${hi ? "hi" : "lo"}`),
        desc: t(`acd.p3.dim.${d.axis}.${hi ? "hiD" : "loD"}`),
        radar: known ? (hi ? v! : 1 - v!) : 0.5,
      };
    });
    const hasVec = dims.some(d => d.known);

    const emotions = computeEmotions(p?.seek ?? [], vec);
    const evo = computeEvoSeries(data.traitSnapshots ?? []);
    const moments = (data.savedMoments ?? []).filter(m => m.momentSnapshot?.title);
    const journal = [...moments].reverse(); // dal più recente (l'array arriva asc)
    const guidance = (compass ?? []).filter(c => c.type === "growth" || c.type === "discovery" || c.type === "journey").slice(0, 3);
    const tip = (compass ?? []).find(c => c.type === "growth");
    const reco = picks?.picks[0];

    const quote = p?.ownWords ?? data.profileQuote;
    const lastSnapAt = (data.traitSnapshots ?? []).map(s => new Date(s.createdAt)).sort((a, b) => b.getTime() - a.getTime())[0];
    const quoteWhen = lastSnapAt && !isNaN(lastSnapAt.getTime())
      ? lastSnapAt.toLocaleString(lang === "it" ? "it-IT" : "en-US", { month: "long", year: "numeric" })
      : "";

    const monthLabel = (d: Date) =>
      d.toLocaleString(lang === "it" ? "it-IT" : "en-US", { month: "short", year: "2-digit" }).replace(".", "");

    // Radar SVG (pentagono) — puro SVG, nessuna libreria.
    const Radar = () => {
      const cx = 110, cy = 110, R = 86;
      const pt = (i: number, r: number) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
      };
      const poly = (r: number) => Array.from({ length: 5 }, (_, i) => pt(i, r).join(",")).join(" ");
      const shape = dims.map((d, i) => pt(i, Math.max(0.15, d.radar) * R).join(",")).join(" ");
      return (
        <svg viewBox="0 0 220 220" className="p3-radar" aria-hidden="true">
          {[0.25, 0.5, 0.75, 1].map(f => (
            <polygon key={f} points={poly(R * f)} fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="1" />
          ))}
          {dims.map((_, i) => {
            const [x, y] = pt(i, R);
            return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.07)" strokeWidth="1" />;
          })}
          <polygon points={shape} fill="rgba(233,69,96,.16)" stroke="rgba(233,69,96,.75)" strokeWidth="1.5" />
          {dims.map((d, i) => {
            const [x, y] = pt(i, Math.max(0.15, d.radar) * R);
            return <circle key={i} cx={x} cy={y} r="4" fill={d.color} stroke="#0d070d" strokeWidth="1.5" />;
          })}
          {dims.map((d, i) => {
            const [x, y] = pt(i, R + 15);
            return (
              <g key={"ic" + i}>
                <circle cx={x} cy={y} r="11" fill="rgba(13,7,13,.75)" stroke={d.color} strokeWidth="1" />
                <text x={x} y={y + 3.5} textAnchor="middle" fontSize="10">{d.icon}</text>
              </g>
            );
          })}
        </svg>
      );
    };

    // Donut SVG delle emozioni.
    const Donut = ({ size = 132 }: { size?: number }) => {
      if (!emotions) return null;
      const r = 44, C = 2 * Math.PI * r;
      let acc = 0;
      return (
        <svg viewBox="0 0 120 120" style={{ width: size, height: size }} className="p3-donut" aria-hidden="true">
          {emotions.map(e => {
            const frac = e.pct / 100;
            const el = (
              <circle key={e.key} cx="60" cy="60" r={r} fill="none"
                stroke={EMO_COLORS[e.key]} strokeWidth="14"
                strokeDasharray={`${Math.max(0, frac * C - 2)} ${C}`}
                strokeDashoffset={-acc * C}
                transform="rotate(-90 60 60)" strokeLinecap="butt" />
            );
            acc += frac;
            return el;
          })}
          <text x="60" y="66" textAnchor="middle" fontSize="18" fill="rgba(233,69,96,.9)">♥</text>
        </svg>
      );
    };

    // Timeline evolutiva (linea multicolore + thumb dei viaggi).
    const Timeline = () => {
      const thumbs = [...data.trips].slice(0, 5).reverse();
      return (
        <>
          {thumbs.length > 0 && (
            <div className="p3-tl-thumbs">
              {thumbs.map((tr, i) => (
                <button key={i} className="p3-tl-thumb" title={tr.dest} onClick={() => tr.href && setLocation(tr.href)}>
                  <span className="ph" style={{ backgroundImage: bg(tr.img, 160) }} />
                </button>
              ))}
            </div>
          )}
          {evo ? (
            <svg viewBox="0 0 320 78" className="p3-tl-chart" aria-hidden="true">
              <defs>
                <linearGradient id="p3line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#D4A853" /><stop offset="50%" stopColor="#c9a6e8" /><stop offset="100%" stopColor="#7fd4a8" />
                </linearGradient>
              </defs>
              <polyline
                fill="none" stroke="url(#p3line)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                points={evo.values.map((v, i) => `${12 + (i * 296) / Math.max(1, evo.values.length - 1)},${64 - v * 50}`).join(" ")}
              />
              {evo.values.map((v, i) => (
                <circle key={i} cx={12 + (i * 296) / Math.max(1, evo.values.length - 1)} cy={64 - v * 50} r="3.4"
                  fill={i === evo.values.length - 1 ? "#7fd4a8" : "#0d070d"} stroke="#c9a6e8" strokeWidth="1.6" />
              ))}
            </svg>
          ) : (
            <div className="p3-tl-empty">{t("acd.p3.timelineEmpty")}</div>
          )}
          {evo && (
            <div className="p3-tl-months">
              <span>{monthLabel(evo.dates[0])}</span>
              {evo.dates.length > 2 && <span>{monthLabel(evo.dates[Math.floor(evo.dates.length / 2)])}</span>}
              <span>{monthLabel(evo.dates[evo.dates.length - 1])}</span>
            </div>
          )}
          <div className="p3-stats">
            <div><span className="n">{counts.trips}</span><span className="l">{plural(counts.trips, "acd.unit.trip", "acd.unit.trips")}</span></div>
            <div><span className="n">{counts.days}</span><span className="l">{t("acd.p3.daysRoad")}</span></div>
            <div><span className="n">{counts.places}</span><span className="l">{plural(counts.places, "acd.unit.place", "acd.unit.places")}</span></div>
            <div><span className="n">{counts.continents}</span><span className="l">{plural(counts.continents, "acd.unit.continent", "acd.unit.continents")}</span></div>
          </div>
        </>
      );
    };

    const EssenceCard = ({ full }: { full?: boolean }) => (
      <section className={"h2-card p3-essence" + (full ? " full" : "")}>
        <div className="h2-card-head"><div><h3>{t("acd.p3.essenceK")}</h3><div className="p3-cardsub">{t("acd.p3.essenceSub")}</div></div></div>
        {hasVec ? (
          <div className="p3-ess-grid">
            <div className="p3-dims">
              {dims.filter(d => d.known).map(d => (
                <div key={d.axis} className="p3-dim">
                  <span className="ic" style={{ borderColor: d.color, color: d.color }}>{d.icon}</span>
                  <span className="tx">
                    <span className="nm">{d.name}</span>
                    <span className="ds">{d.desc}</span>
                  </span>
                  <span className="bar"><i style={{ width: `${d.pct}%`, background: d.color }} /></span>
                  <span className="pc" style={{ color: d.color }}>{d.pct}%</span>
                </div>
              ))}
            </div>
            <Radar />
          </div>
        ) : (
          <div className="p3-tl-empty">{t("acd.p3.forming")}</div>
        )}
      </section>
    );

    const TimelineCard = () => (
      <section className="h2-card p3-timeline">
        <div className="h2-card-head">
          <div><h3>{t("acd.p3.timelineK")}</h3><div className="p3-cardsub">{t("acd.p3.timelineSub")}</div></div>
          <button className="h2-link" onClick={() => go("trips")}>{t("acd.p3.viewAll")} →</button>
        </div>
        <Timeline />
      </section>
    );

    const JournalCard = ({ full }: { full?: boolean }) => (
      <section className={"h2-card p3-journal" + (full ? " full" : "")}>
        <div className="h2-card-head">
          <div><h3>{t("acd.p3.journalK")}</h3>{full && <div className="p3-cardsub">{t("acd.p3.journalSub")}</div>}</div>
          {!full && <button className="h2-link" onClick={() => setPTab("journal")}>{t("acd.p3.viewAll")} →</button>}
        </div>
        {journal.length === 0 ? (
          <div className="p3-tl-empty">{t("acd.p3.journalEmpty")}</div>
        ) : full ? (
          <div className="p3-journal-grid">
            {journal.map((m, i) => (
              <div key={i} className="p3-j-cell">
                {m.momentSnapshot!.image_url && <span className="ph" style={{ backgroundImage: bg(m.momentSnapshot!.image_url, 420) }} />}
                <span className="tt">{m.momentSnapshot!.title}</span>
                {m.momentSnapshot!.location_name && <span className="lc">{m.momentSnapshot!.location_name}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="p3-j-list">
            {journal[0]?.momentSnapshot?.image_url && (
              <div className="p3-j-feat" style={{ backgroundImage: bg(journal[0].momentSnapshot!.image_url!, 520) }}>
                <span className="nm">{journal[0].momentSnapshot!.location_name ?? journal[0].momentSnapshot!.title}</span>
                <span className="qt">{journal[0].momentSnapshot!.title}</span>
              </div>
            )}
            {journal.slice(1, 4).map((m, i) => (
              <div key={i} className="p3-j-row">
                {m.momentSnapshot!.image_url
                  ? <span className="ph" style={{ backgroundImage: bg(m.momentSnapshot!.image_url!, 120) }} />
                  : <span className="ph fb">✦</span>}
                <span className="tx">
                  <span className="tt">{m.momentSnapshot!.title}</span>
                  {m.momentSnapshot!.location_name && <span className="lc">{m.momentSnapshot!.location_name}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    );

    const EmotionsCard = ({ full }: { full?: boolean }) => emotions && (
      <section className={"h2-card p3-emotions" + (full ? " full" : "")}>
        <div className="h2-card-head"><div><h3>{t("acd.p3.emotionsK")}</h3>{full && <div className="p3-cardsub">{t("acd.p3.emotionsSub")}</div>}</div></div>
        <div className="p3-emo-grid">
          <Donut size={full ? 190 : 132} />
          <div className="p3-emo-legend">
            {emotions.map(e => (
              <div key={e.key} className="p3-emo-row">
                <span className="d" style={{ background: EMO_COLORS[e.key] }} />
                <span className="nm">{t(`acd.p3.emo.${e.key}`)}</span>
                <span className="pc">{e.pct}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p3-cardnote">{t("acd.p3.emotionsSub")}</div>
        {full && p?.seek && p.seek.length > 0 && (
          <div className="p3-chips">{p.seek.map((c, i) => <span key={i}>{c}</span>)}</div>
        )}
      </section>
    );

    const GuidanceCard = ({ full }: { full?: boolean }) => guidance.length > 0 && (
      <section className={"h2-card p3-guidance" + (full ? " full" : "")}>
        <div className="h2-card-head"><div><h3>{t("acd.p3.guidanceK")}</h3>{full && <div className="p3-cardsub">{t("acd.p3.guidanceSub")}</div>}</div></div>
        <div className="p3-guid-list">
          {guidance.map(g => (
            <button key={g.id} className="p3-guid-row"
              onClick={() => g.type === "growth" && g.challenge ? data.onChallenge?.(g.challenge) : data.onSecondaryCta?.()}>
              <span className="ic">{g.icon}</span>
              <span className="tx"><span className="tt">{g.title}</span>{g.sub && <span className="ds">{g.sub}</span>}</span>
              <span className="go">›</span>
            </button>
          ))}
        </div>
      </section>
    );

    const InsightRail = () => (
      <aside className="p3-rail">
        <div className="h2-card p3-insight">
          <div className="h2-rail-eyebrow">✦ {t("acd.p3.insightK")}</div>
          <div className="p3-insight-t">{evo || p?.evolution ? t("acd.p3.insightEvolving") : t("acd.p3.insightWho")}</div>
          <p className="p3-insight-x">{data.traitHeadline ?? p?.evolution?.phrase ?? p?.narrative?.portrait ?? data.profileQuote}</p>
          <div className="p3-insight-keep">{t("acd.p3.insightKeep")}</div>
          <button className="h2-link" onClick={() => setPTab("growth")}>{t("acd.p3.insightLink")} →</button>
        </div>

        {(tip || reco) && (
          <div className="h2-card p3-tip">
            <div className="h2-card-head"><h3>{t("acd.p3.tipK")}</h3></div>
            {tip && <p className="p3-tip-x">{tip.sub ?? tip.title}</p>}
            {reco && (<>
              <div className="p3-cardnote">{t("acd.p3.tipReco")}</div>
              <button className="p3-tip-reco" onClick={data.onSecondaryCta}>
                <span className="ph" style={{ backgroundImage: bg(reco.imageUrl, 200) }} />
                <span className="tx">
                  <span className="nm">{reco.name.split(",")[0]}</span>
                  {reco.tags.length > 0 && <span className="tg">{reco.tags.slice(0, 2).join(" · ")}</span>}
                </span>
              </button>
              <button className="h2-link" title={picks?.why} onClick={data.onSecondaryCta}>{t("acd.p3.tipWhy")} →</button>
            </>)}
          </div>
        )}
      </aside>
    );

    const PTABS: PTab[] = ["overview", "emotions", "patterns", "growth", "journal", "guidance"];

    return (
      <div className="view p3">
        {/* Header con hero velato + quote card */}
        <div className="p3-head">
          <div className="p3-head-bg" style={{ backgroundImage: bg(data.heroImg, heroW, 55) }} />
          <div className="p3-head-veil" />
          <div className="p3-head-in">
            <div className="p3-head-l">
              <div className="r2-crumbs">
                <button onClick={() => go("home")}>‹ {t("acd.r2.crumbHome")}</button>
                <span>—</span>
                <span className="on">{t("acd.p3.crumb")}</span>
              </div>
              <Html as="h1" className="p3-title"
                html={tripCount >= 3 ? tx("acd.p3.titleMany", { n: tripCount }) : t("acd.p3.titleFew")} />
              <p className="p3-sub">{t("acd.p3.sub")}</p>
            </div>
            <div className="p3-head-r">
              {quote && (
                <div className="p3-quote">
                  <span className="qm">“</span>
                  <p>{quote}</p>
                  <div className="who">{data.userName}{quoteWhen ? `, ${quoteWhen}` : ""}</div>
                </div>
              )}
              <div className="p3-head-acts">
                <button className="btn-g" onClick={() => setLocation("/profiling")}>{t("acd.p3.edit")}</button>
                <button className="btn-g" onClick={sharePortrait} disabled={sharing}>{sharing ? t("acd.portrait.sharing") : t("acd.p3.share")}</button>
              </div>
            </div>
          </div>
          {/* Tab bar */}
          <div className="p3-tabs">
            {PTABS.map(tb => (
              <button key={tb} className={"p3-tab" + (pTab === tb ? " on" : "")} onClick={() => setPTab(tb)}>
                {t(`acd.p3.tab.${tb}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="p3-body">
          {pTab === "overview" && (
            <div className="p3-grid">
              <div className="p3-mainc">
                <div className="p3-row1">
                  <EssenceCard />
                  <TimelineCard />
                </div>
                <div className="p3-row2">
                  <JournalCard />
                  <EmotionsCard />
                  <GuidanceCard />
                </div>
              </div>
              <InsightRail />
            </div>
          )}

          {pTab === "emotions" && (
            <div className="p3-focus">
              <EmotionsCard full />
              {!emotions && <div className="h2-card p3-tl-empty">{t("acd.p3.forming")}</div>}
            </div>
          )}

          {pTab === "patterns" && (
            <div className="p3-focus">
              <section className="h2-card full">
                <div className="h2-card-head"><h3>{t("acd.p3.patternsK")}</h3></div>
                <div className="p3-pat-list">
                  {data.patterns?.topContinentLabel && (
                    <div className="p3-pat"><span className="k">{t("acd.p3.pat.continent")}</span><span className="v">{data.patterns.topContinentLabel}</span></div>
                  )}
                  {data.patterns?.avgDays != null && (
                    <div className="p3-pat"><span className="k">{t("acd.p3.pat.avgDays")}</span><span className="v">{data.patterns.avgDays} {t("acd.unit.days")}</span></div>
                  )}
                  {data.patterns?.shortTripBias && <div className="p3-pat solo">{t("acd.p3.pat.shortBias")}</div>}
                  {data.patterns?.longTripBias && <div className="p3-pat solo">{t("acd.p3.pat.longBias")}</div>}
                </div>
                {p?.chosen && p.chosen.length > 0 && (<>
                  <div className="p3-cardnote">{t("acd.p3.pat.chosen")}</div>
                  <div className="p3-chips">{p.chosen.map((c, i) => <span key={i}>{c.name.split(",")[0]}</span>)}</div>
                </>)}
              </section>
              <EssenceCard full />
            </div>
          )}

          {pTab === "growth" && (
            <div className="p3-focus">
              <section className="h2-card full">
                <div className="h2-card-head"><h3>{t("acd.p3.timelineK")}</h3></div>
                {(p?.evolution || evo) && <p className="p3-insight-x">{p?.evolution?.phrase ?? data.traitHeadline ?? ""}</p>}
                <Timeline />
              </section>
              {p?.revealed && (
                <section className="h2-card full">
                  <div className="h2-card-head"><h3>{t("acd.p3.revealedK")}</h3></div>
                  <p className="p3-insight-x">
                    {t("acin.pt.revealedPre")}<em>{p.revealed.saidPole}</em>{t("acin.pt.revealedMid")}<strong>{p.revealed.chosePole}</strong>.
                  </p>
                </section>
              )}
              <GuidanceCard full />
            </div>
          )}

          {pTab === "journal" && (
            <div className="p3-focus"><JournalCard full /></div>
          )}

          {pTab === "guidance" && (
            <div className="p3-focus">
              <section className="h2-card full">
                <div className="h2-card-head"><h3>{t("acd.p3.insightK")}</h3></div>
                <p className="p3-insight-x">{p?.narrative?.portrait ?? data.profileQuote}</p>
                {p?.narrative?.paradox && (<>
                  <div className="p3-cardnote">{t("acd.p3.paradoxK")}</div>
                  <p className="p3-insight-x em">{p.narrative.paradox}</p>
                </>)}
                {p?.ownWords && (<>
                  <div className="p3-cardnote">{t("acd.p3.ownWordsK")}</div>
                  <p className="p3-insight-x">“{p.ownWords}”</p>
                </>)}
              </section>
              <GuidanceCard full />
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ──────────────── VIAGGI ──────────────── */
  const CollectionView = () => (
    <div className="view">
      <ViewHead
        gold
        eyebrow={t("acd.coll.eyebrow")}
        title={t("acd.coll.title")}
        sub={tx("acd.coll.sub", {
          n: data.trips.length,
          nu: t(data.trips.length === 1 ? "acd.unit.itinerary" : "acd.unit.itineraries"),
          d: counts.days,
          dw: t(counts.days === 1 ? "acd.unit.day" : "acd.unit.days"),
        })}
        right={<button className="btn-p" onClick={data.onNewItinerary}>{t("acd.tb.newItin")}</button>}
      />
      <div className="content">
        <section>
          <div className="coll-bar">
            <div className="coll-search">
              <Icon name="search" />
              <input placeholder={t("acd.coll.search")} value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="coll-tabs">
              {REGION_TABS.map(r => (
                <button key={r} className={"coll-tab" + (region === r ? " on" : "")} onClick={() => setRegion(r)}>
                  {t("acd.region." + r)}
                </button>
              ))}
            </div>
          </div>
          <div className="coll-grid">
            {filteredTrips.length === 0 && <div className="c-empty">{t("acd.coll.empty")}</div>}
            {filteredTrips.map((tr, i) => <TripCard key={i} tr={tr} />)}
          </div>
        </section>
      </div>
    </div>
  );

  /* ──────────────── ATLANTE ──────────────── */
  const places = data.atlas?.places ?? [];
  const AtlasView = () => (
    <div className="view">
      <ViewHead
        gold
        eyebrow={t("acd.atlas.eyebrow")}
        title={tx("acd.atlas.title", { d: counts.days })}
        sub={t("acd.atlas.sub")}
      />
      <div className="content">
        {/* AccountAtlas porta i propri stili scoped sotto .account-cinematic */}
        <div className="account-cinematic">
          <Suspense fallback={<div style={{ minHeight: 320 }} />}>
            <AccountAtlas
              data={data.atlas ?? null}
              loading={data.atlasLoading}
              narrative={data.statsNarrative}
              narrativeBold={data.statsBold}
              hideHead
            />
          </Suspense>
        </div>

        {places.length > 0 && (
          <section>
            <div className="sec-head">
              <div>
                <div className="sec-eyebrow gold">{t("acd.atlas.placesEyebrow")}</div>
                <Html as="h2" className="sec-title" html={t("acd.atlas.placesTitle")} />
              </div>
            </div>
            <div className="place-list">
              {places.map((pl, i) => (
                <a key={i} className="place" href={pl.href}>
                  <span className={"dot" + (pl.trips > 1 ? " gold" : "")} />
                  <span className="nm">{pl.name}</span>
                  <span className="meta">
                    {pl.continent ?? ""}{pl.lastDate ? ` · ${pl.lastDate}` : ""}
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
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
    <div className="account-dash">
      <div className="field" />
      <div className="ax-stage">
        {ambient.map((src, i) => (
          <div key={src + i} className={"ax-photo" + (ambientIdx === i ? " on" : "")} style={{ backgroundImage: `url(${src})` }} />
        ))}
      </div>
      <div className="grain" />

      {/* Sidebar */}
      <aside className="sidebar">
        <button className="sb-logo" onClick={() => go("home")} title="MindRoute"><FlowNavLogo size={26} /></button>
        <nav className="sb-nav">
          {NAV.map(n => (
            <button key={n.id} className={"sb-item" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
              <Icon name={n.ic} />
              <span className="lab">{t(n.key)}</span>
            </button>
          ))}
        </nav>
        <div className="sb-foot">
          <button className="sb-gear" onClick={() => setDrawer(true)} title={t("acd.settings")}><Icon name="gear" /></button>
          <button className="sb-av" onClick={() => setDrawer(true)} title={data.userName}>{data.avatarInitial ?? data.userName[0]}</button>
        </div>
      </aside>

      <main className="main">
        {/* Topbar */}
        <div className={"topbar" + (stuck ? " stuck" : "")}>
          <button className="tb-brand" onClick={() => go("home")} title="MindRoute"><FlowNavLogo size={20} /></button>
          <div className="tb-search">
            <Icon name="search" />
            <input placeholder={t("acd.tb.search")} value={q} onChange={e => onTopSearch(e.target.value)} />
          </div>
          <div className="tb-spacer" />
          <LangDropdown variant="dark" />
          <button className="btn-g" onClick={data.onSecondaryCta}>{t("acd.tb.fromProfile")}</button>
          <button className="tb-cta" onClick={data.onNewItinerary}>{t("acd.tb.newItin")}</button>
          <button className="tb-av-m" onClick={() => setDrawer(true)} title={data.userName}>{data.avatarInitial ?? data.userName[0]}</button>
        </div>

        {view === "home" && HomeView()}
        {view === "resume" && ResumeView()}
        {view === "portrait" && PortraitView()}
        {view === "trips" && CollectionView()}
        {view === "atlas" && AtlasView()}
      </main>

      <nav className="mnav">
        {NAV.map(n => (
          <button key={n.id} className={"mnav-i" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
            <Icon name={n.ic} />
            <span className="lab">{t(n.key)}</span>
          </button>
        ))}
      </nav>

      {Drawer()}
    </div>
  );
}
