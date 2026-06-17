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

import { useEffect, useMemo, useState, lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Compass } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
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
      const res = await fetch(`/api/me/portrait-card.png?bg=${encodeURIComponent(data.heroImg || "")}`);
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
    <a className="c-card" href={tr.href ?? "#"}>
      <div className="ph" style={{ backgroundImage: bg(tr.img, cardW) }} />
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

  /* ──────────────── HOME ──────────────── */
  const HomeView = () => (
    <div className="view">
      {/* Hero band */}
      <section className="hero">
        {photos.map((p, i) => (
          <div key={p + i} className={"hero-ph" + (heroIdx === i ? " on" : "")} style={{ backgroundImage: bg(p, heroW, 60) }} />
        ))}
        <div className="hero-veil" />
        <div className="hero-in">
          <div className="hero-eyebrow">{t("acd.hero.greeting")}</div>
          <h1 className="hero-title">{data.userName}<span className="dot">.</span></h1>
          <Html as="p" className="hero-sub" html={t("acd.hero.sub")} />
          <div className="hero-row">
            <div className="hero-stats">
              <div className="hero-stat" onClick={() => go("trips")}>
                <span className="n">{counts.trips}</span>
                <span className="l">{plural(counts.trips, "acd.unit.trip", "acd.unit.trips")}</span>
              </div>
              <div className="hero-stat" onClick={() => go("atlas")}>
                <span className="n">{counts.days}</span>
                <span className="l">{plural(counts.days, "acd.unit.day", "acd.unit.days")}</span>
              </div>
              <div className="hero-stat" onClick={() => go("atlas")}>
                <span className="n">{counts.places}</span>
                <span className="l">{plural(counts.places, "acd.unit.place", "acd.unit.places")}</span>
              </div>
              <div className="hero-stat" onClick={() => go("atlas")}>
                <span className="n"><em>{counts.continents}</em></span>
                <span className="l">{plural(counts.continents, "acd.unit.continent", "acd.unit.continents")}</span>
              </div>
            </div>
            <div className="hero-act">
              <button className="btn-p" onClick={data.onNewItinerary}>{t("acd.tb.newItin")}</button>
            </div>
          </div>
        </div>
      </section>

      <div className="home-content">
        {/* Riprendi (teaser) */}
        {featured && (
          <div className="next" onClick={() => go("resume")}>
            <div className="next-thumb" style={{ backgroundImage: bg(featured.img, 280) }} />
            <div className="next-mid">
              <div className="next-k"><span className="p" />{t("acd.next.k")}</div>
              <div className="next-nm">{featured.title}</div>
              <div className="next-prog">
                <span className="lab">{featured.date ? tx("acd.next.meta", { date: featured.date }) : (featured.sub ?? "")}</span>
              </div>
            </div>
            <button className="next-go" onClick={(e) => { e.stopPropagation(); if (featured.href) setLocation(featured.href); }}>
              {t("acd.open")}
            </button>
          </div>
        )}

        <div className="home-grid">
          {/* Daily pick → genera dal profilo */}
          <section>
            <div className="sec-head">
              <div>
                <div className="sec-eyebrow gold">{t("acd.pick.eyebrow")}</div>
                <Html as="h2" className="sec-title" html={t("acd.pick.title")} />
              </div>
            </div>
            <div className="pick">
              <div className="ph" style={{ backgroundImage: bg(data.heroImg, featW) }} />
              <div className="pick-top">
                <div className="pick-tag"><span className="s">✦</span>{t("acd.pick.tag")}</div>
              </div>
              <div className="pick-body">
                <div className="pick-meta">{t("acd.pick.meta")}</div>
                <div className="pick-nm">{t("acd.pick.name")}</div>
                <div className="pick-why">
                  <div className="k">{t("acd.pick.whyK")}</div>
                  <div className="t">{data.portrait?.narrative?.portrait ?? data.profileQuote ?? t("acd.pick.whyFallback")}</div>
                </div>
                <div className="pick-act">
                  <button className="btn-p" onClick={data.onSecondaryCta}>{t("acd.pick.cta")}</button>
                  <button className="btn-g" onClick={data.onNewItinerary}>{t("acd.pick.ctaAlt")}</button>
                </div>
              </div>
            </div>
          </section>

          {/* Colonna laterale: mood + pointer */}
          <div className="home-col">
            <div className="mood">
              <Html as="h4" html={t("acd.mood.title")} />
              <div className="hint">{t("acd.mood.hint")}</div>
              <div className="mood-list">
                {[{ e: "🌙", k: "acd.mood.1" }, { e: "🏔️", k: "acd.mood.2" }, { e: "🎲", k: "acd.mood.3" }].map(m => (
                  <button key={m.k} className="mood-chip" onClick={data.onNewItinerary}>
                    <span className="e">{m.e}</span>
                    <span className="mt">{t(m.k)}</span>
                    <span className="go">→</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pointer" onClick={() => go("portrait")}>
              <div className="pic"><Icon name="portrait" /></div>
              <div className="pm">
                <div className="pk">{t("acd.point.portraitK")}</div>
                <Html as="div" className="pv" html={data.portrait?.narrative?.paradox ?? t("acd.point.portraitFallback")} />
              </div>
              <span className="arrow">→</span>
            </div>
            <div className="pointer" onClick={() => go("atlas")}>
              <div className="pic gold"><Icon name="atlas" /></div>
              <div className="pm">
                <div className="pk">{t("acd.point.atlasK")}</div>
                <Html as="div" className="pv" html={tx("acd.point.atlasV", { m: counts.continents, d: counts.places })} />
              </div>
              <span className="arrow">→</span>
            </div>
          </div>
        </div>

        {homeExtra && <div className="home-extra">{homeExtra}</div>}
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
        sub={tx("acd.coll.sub", { n: data.trips.length, d: counts.days })}
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
        <div className="sb-logo"><Compass color="#E94560" /></div>
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
          <div className="tb-search">
            <Icon name="search" />
            <input placeholder={t("acd.tb.search")} value={q} onChange={e => onTopSearch(e.target.value)} />
          </div>
          <div className="tb-spacer" />
          <button className="tb-pill" onClick={toggleLang}>{lang === "it" ? "🇮🇹 Italiano" : "🇬🇧 English"} ⌄</button>
          <button className="btn-g" onClick={data.onSecondaryCta}>{t("acd.tb.fromProfile")}</button>
          <button className="tb-cta" onClick={data.onNewItinerary}>{t("acd.tb.newItin")}</button>
        </div>

        {view === "home" && HomeView()}
        {view === "resume" && ResumeView()}
        {view === "portrait" && PortraitView()}
        {view === "trips" && CollectionView()}
        {view === "atlas" && AtlasView()}
      </main>

      {Drawer()}
    </div>
  );
}
