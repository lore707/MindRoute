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

/* HTML inline (i18n con <em>) */
function Html({ html, as = "span", className }: { html: string; as?: any; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ════════════════════════════════════════════════════════════ */
export function AccountDashboard({ data, homeExtra }: { data: AccountData; homeExtra?: ReactNode }) {
  const { t, lang, setLang } = useI18n();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewId>("home");
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
  const MISSION_TOTAL = 5;
  const bookingNudge = useMemo(() => {
    const out: Array<{ title: string; href: string; img: string; booked: number; total: number }> = [];
    for (const tr of data.trips) {
      const m = (tr.href || "").match(/\/itinerary\/(\d+)/);
      if (!m) continue;
      let booked = 0, has = false;
      try {
        const raw = localStorage.getItem(`mindroute_checklist_${m[1]}`);
        if (raw) {
          has = true;
          const p = JSON.parse(raw);
          booked = Array.isArray(p) ? p.filter((x: any) => x?.checked).length : Object.values(p).filter(Boolean).length;
        }
      } catch { /* ignore */ }
      if (has && booked > 0 && booked < MISSION_TOTAL) out.push({ title: tr.dest, href: tr.href!, img: tr.img, booked, total: MISSION_TOTAL });
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
      ? { title: featured.title, img: featured.img, href: featured.href ?? "#", region: "" }
      : null;
    const base = trip
      ? { title: trip.dest, img: trip.img, href: trip.href ?? "#", region: regionLabel(trip.continent) }
      : fromFeatured;
    if (!base) return null;
    let progress: { n: number; tot: number } | null = null;
    const m = base.href.match(/\/itinerary\/(\d+)/);
    if (m) {
      try {
        const raw = localStorage.getItem(`mindroute_checklist_${m[1]}`);
        if (raw) {
          const p = JSON.parse(raw);
          const n = Array.isArray(p) ? p.filter((x: any) => x?.checked).length : Object.values(p).filter(Boolean).length;
          if (n > 0) progress = { n: Math.min(n, MISSION_TOTAL), tot: MISSION_TOTAL };
        }
      } catch { /* ignore */ }
    }
    return { ...base, progress };
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

  // Mood row — curatela statica (stesse foto verificate del pool landing).
  const MOODS = [
    { e: "🌙", k: "acd.h2.mood.silence",   place: "Lofoten, Norvegia",   img: "https://images.unsplash.com/photo-1502786129293-79981df4e689?w=900&fit=crop&crop=entropy&auto=format&q=80" },
    { e: "🌲", k: "acd.h2.mood.disappear", place: "Isole Faroe",         img: "https://images.unsplash.com/photo-1538333702852-1ce8a4cd6c54?w=900&fit=crop&crop=entropy&auto=format&q=80" },
    { e: "☀️", k: "acd.h2.mood.sun",       place: "Azzorre, Portogallo", img: "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=900&fit=crop&crop=entropy&auto=format&q=80" },
    { e: "🏛️", k: "acd.h2.mood.culture",   place: "Kyoto, Giappone",     img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=900&fit=crop&crop=entropy&auto=format&q=80" },
    { e: "✦",  k: "acd.h2.mood.surprise",  place: lang === "it" ? "Ovunque, per te" : "Anywhere, for you", img: "https://images.unsplash.com/photo-1489493585363-d69421e0edd3?w=900&fit=crop&crop=entropy&auto=format&q=80" },
  ];

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

  const HomeView = () => (
    <div className="view">
      {/* Hero — saluto per ora del giorno + riga stagionale + CTA alle proposte */}
      <section className="hero h2-hero">
        {photos.map((p, i) => (
          <div key={p + i} className={"hero-ph" + (heroIdx === i ? " on" : "")} style={{ backgroundImage: bg(p, heroW, 60) }} />
        ))}
        <div className="hero-veil" />
        <div className="hero-in">
          <div className="hero-eyebrow">{t(greetKey)}</div>
          <h1 className="hero-title">{data.userName}<span className="dot">.</span></h1>
          <p className="hero-sub h2-hero-sub">
            {t(seasonKey)}<br />{isEmpty ? t("acd.h2.heroSubNew") : t("acd.h2.heroSub")}
          </p>
          <div className="hero-act">
            {isEmpty ? (
              <button className="btn-p lg" onClick={data.onNewItinerary}>{t("acd.empty.cta")} →</button>
            ) : (
              <button className="btn-p lg" onClick={scrollToRecs}>{t("acd.h2.heroCta")} →</button>
            )}
          </div>
        </div>
      </section>

      <div className="home-content">
        {isEmpty && (
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
        )}

        {!isEmpty && (
        <div className="h2-grid">
          {/* ── colonna principale ── */}
          <div className="h2-main">
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
                        <div className="h2-rec-why">{picks.why}</div>
                        <span className="h2-rec-go">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── colonna destra ── */}
          <aside className="h2-rail">
            {weather && (
              <div className="h2-card h2-wx">
                <div className="h2-rail-eyebrow">☀ {t("acd.h2.weatherK")}</div>
                {weather.label && <div className="h2-wx-city">{weather.label}</div>}
                <div className="h2-wx-temp">{weather.tempC}°C <span className="cond">{t(wxKey(weather.code))}</span></div>
                {wxGood && <div className="h2-wx-good">{t("acd.h2.weatherGood")}</div>}
                <button className="h2-link" onClick={scrollToRecs}>{t("acd.h2.weatherSee")} →</button>
              </div>
            )}

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
        )}

        {/* Mood row — a tutta larghezza */}
        {!isEmpty && (
        <section className="h2-card h2-moodsec">
          <div className="h2-card-head"><h3>{t("acd.h2.moodK")}</h3></div>
          <div className="h2-moods">
            {MOODS.map((m) => (
              <button key={m.k} className="h2-mood" onClick={data.onNewItinerary} style={{ backgroundImage: bg(m.img, 480, 65) }}>
                <span className="h2-mood-top"><span className="e">{m.e}</span><span><span className="mt">{t(m.k)}</span><span className="mp">{m.place}</span></span></span>
                <span className="h2-mood-go">›</span>
              </button>
            ))}
          </div>
        </section>
        )}

        {/* Fascia finale ONESTA: solo se c'è una checklist vera da completare */}
        {!isEmpty && bookingNudge.length > 0 && (
          <div className="h2-band">
            <span className="h2-band-ico">🧭</span>
            <div className="h2-band-mid">
              <div className="h2-band-k">{t("acd.h2.bandK")}</div>
              <div className="h2-band-sub">{tx("acd.h2.bandSub", { name: bookingNudge[0].title, n: bookingNudge[0].booked, tot: bookingNudge[0].total })}</div>
            </div>
            <button className="btn-g" onClick={() => setLocation(bookingNudge[0].href)}>{t("acd.h2.bandCta")} →</button>
          </div>
        )}

        {!isEmpty && homeExtra && <div className="home-extra">{homeExtra}</div>}
      </div>
    </div>
  );

  /* ──────────────── RIPRENDI ──────────────── */
  const ResumeView = () => (
    <div className="view">
      <ViewHead
        eyebrow={t("acd.resume.eyebrow")}
        title={t("acd.resume.title")}
        sub={t("acd.resume.sub")}
        right={<button className="btn-p" onClick={data.onNewItinerary}>{t("acd.tb.newItin")}</button>}
      />
      <div className="resume-full">
        {featured ? (
          <a className="rf-hero" href={featured.href ?? "#"}>
            <div className="ph" style={{ backgroundImage: bg(featured.img, featW) }} />
            <div className="rf-body">
              <div className="rf-prog">
                {featured.date && <div className="r-badge"><span className="p" />{tx("acd.resume.badge", { date: featured.date })}</div>}
              </div>
              <h2 className="r-name">{featured.title}</h2>
              {featured.quote && <p className="r-quote" style={{ WebkitLineClamp: 4 }}>{featured.quote}</p>}
              <div className="r-act">
                <span className="btn-p">{t("acd.open")}</span>
                <button className="btn-g" onClick={(e) => { e.preventDefault(); data.onNewItinerary?.(); }}>{t("acd.resume.continue")}</button>
              </div>
            </div>
          </a>
        ) : (
          <div className="c-empty" style={{ border: "1px solid var(--stroke)", borderRadius: "var(--radius)" }}>{t("acd.resume.empty")}</div>
        )}

        {resumeRest.length > 0 && (
          <div>
            <div className="sec-head">
              <div>
                <div className="sec-eyebrow">{t("acd.resume.savedEyebrow")}</div>
                <Html as="h2" className="sec-title"
                  html={resumeRest.length === 1 ? t("acd.resume.savedTitleOne") : tx("acd.resume.savedTitleMany", { n: resumeRest.length })} />
              </div>
            </div>
            <div className="coll-grid">
              {resumeRest.map((tr, i) => (
                <a key={i} className="c-card" href={tr.href ?? "#"}>
                  <div className="ph" style={{ backgroundImage: bg(tr.img, cardW) }} />
                  <div className="c-status">✦</div>
                  <div className="c-body">
                    <div className="c-top">
                      <span className="when">{tr.date ?? ""}</span>
                      {tr.sub && <span className="days">{tr.sub}</span>}
                    </div>
                    <div>
                      <div className="c-name">{tr.title}</div>
                      {tr.quote && <div className="c-blurb">{tr.quote}</div>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  /* ──────────────── RITRATTO ──────────────── */
  const PortraitView = () => {
    const p = data.portrait;
    const tripCount = p?.tripCount ?? data.trips.length;
    const titleHtml = tripCount >= 2
      ? tx("acd.portrait.titleMany", { n: tripCount })
      : tripCount === 1 ? t("acd.portrait.titleOne") : t("acd.portrait.titleNone");

    const portraitText = p?.narrative?.portrait ?? data.profileQuote;
    const chips = data.traits.filter(tr => tr.bar > 12).slice(0, 6);
    const sourceLine = !p ? "" :
      p.confidence === "solid" ? tx("acd.portrait.srcSolid", { n: tripCount })
        : p.confidence === "forming" ? t("acd.portrait.srcForming")
          : t("acd.portrait.srcNascent");

    const magnitude = (bar: number) => {
      if (bar >= 80) return lang === "it" ? "dominante" : "dominant";
      if (bar >= 68) return lang === "it" ? "forte" : "strong";
      if (bar >= 45) return lang === "it" ? "medio" : "medium";
      if (bar <= 12) return lang === "it" ? "in formazione" : "forming";
      return lang === "it" ? "presente" : "present";
    };

    return (
      <div className="view">
        <ViewHead
          eyebrow={t("acd.portrait.eyebrow")}
          title={titleHtml}
          sub={t("acd.portrait.sub")}
          right={<>
            <button className="btn-p" onClick={sharePortrait} disabled={sharing}>{sharing ? t("acd.portrait.sharing") : t("acd.portrait.share")}</button>
            <button className="btn-g" onClick={() => setLocation("/profiling")}>{t("acd.portrait.regen")}</button>
          </>}
        />
        <div className="portrait-full">
          <div className="col">
            <div className="pcard">
              <div className="p-eyebrow">
                <span className="s">❋</span> {t("acd.portrait.synK")} · <span className="who">{tx("acd.portrait.synWho", { name: data.userName })}</span>
              </div>
              <p className="p-text">{portraitText}</p>

              {chips.length > 0 && (
                <div className="p-chips">
                  {chips.map((c, i) => (
                    <span key={i} className={"p-chip" + (i % 3 === 1 ? " gold" : "")}><span className="d" />{c.name}</span>
                  ))}
                </div>
              )}

              {p?.narrative?.paradox && (
                <div className="p-paradox">
                  <div className="k">{t("acd.portrait.paradox")}</div>
                  <div className="t">{p.narrative.paradox}</div>
                </div>
              )}

              {sourceLine && (
                <div className="p-foot">
                  <span className="src"><span className="d" />{sourceLine}</span>
                </div>
              )}
            </div>

            {p?.evolution && (
              <div className="evo">
                <div className="k">{t("acd.portrait.evoK")}</div>
                <p className="t">{p.evolution.phrase}</p>
                <div className="evo-line">
                  {p.evolution.points.map((pt, i) => (
                    <span key={i} style={{ display: "contents" }}>
                      {i > 0 && <span className="seg" />}
                      <span className={"leg" + (pt.isNow ? " now" : "")}><span className="d" />{pt.whenLabel}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col">
            <div className="traits">
              <h4>{t("acd.portrait.traitsH")}</h4>
              <div className="hint">{t("acd.portrait.traitsHint")}</div>
              {data.traits.map((tr, i) => (
                <div key={i} className="trait">
                  <div className="trait-top"><span className="nm">{tr.name}</span><span className="vv">{magnitude(tr.bar)}</span></div>
                  <div className="trait-bar"><i className={i % 3 === 1 ? "gold" : ""} style={{ width: `${tr.bar}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
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
