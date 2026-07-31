/**
 * LandingEditorial.tsx — redesign landing 2026-07 (mockup approvato da Lorenzo).
 * ───────────────────────────────────────────────────────────────
 * 5 sezioni + footer:
 *   ① Hero full-bleed + card "Il meglio della stagione" + stats band
 *   ② How it works — 4 step card con mini-mockup + fascia CTA
 *   ③ Showcase — dal profilo al viaggio (featured Lofoten) + grid mete
 *   ④ Made for you — feature + anteprima prodotto + fascia email
 *   ⑤ Final CTA + partner strip
 *
 * Scelte esplicite (non riaprire senza ok):
 *  · Social proof = numeri REALI da /api/stats — mai contatori inventati,
 *    niente rating/badge finché non esistono recensioni vere.
 *  · Partner strip = SOLO partner monetizzati (dottrina affiliate de0c7f3:
 *    Booking/GetYourGuide vietati, non gli si regala visibilità).
 *  · La sezione "Welcome back" del mockup è resa come anteprima prodotto
 *    dichiarata (label "Anteprima") con dati demo — su "/" i loggati vedono
 *    la dashboard, quindi qui non c'è mai un utente reale.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { useI18n } from "@/lib/i18n";
import { unsplashSized } from "@/lib/img";
import { track } from "@/lib/analytics";
import { BrandMark } from "@/components/BrandMark";
import { GraphField } from "@/components/GraphField";
import { MotionConfig, Reveal, Stagger, StaggerItem, fade, fadeInRight, scaleIn } from "@/lib/motion";

export type LandingStats = { itineraryCount: number; destinationCount: number };

/* Pool foto — OGNI ID è stato verificato A OCCHIO (audit 2026-07-15: il pool
   ereditato aveva Azzorre=cane, Procida=Venezia, Alentejo=Dubai, Oaxaca=Taj
   Mahal…). Se aggiungi una foto, scaricala e guardala prima di cablarla. */
const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&fit=crop&crop=entropy&auto=format&q=80`;
const PHOTO = {
  kyoto:     u("1493976040374-85c8e12f0c0e", 2000), // pagoda Yasaka al tramonto (hero)
  tokyo:     u("1540959733332-eab4deabeeaf"),       // strada neon Shibuya
  sahara:    u("1489493585363-d69421e0edd3"),       // carovana tra le dune
  mountains: u("1519681393784-d120267933ba"),       // vetta innevata sotto le stelle
  journal:   u("1455390582262-044cdead277a"),       // penna su diario (step 1)
  worldmap:  u("1524661135-423995f22d0b"),          // mappamondo con puntine (step 2)
  azores:    u("1620998051604-95ff17ccc537"),       // scogliere verdi aeree, Azzorre
  procida:   u("1628522241320-8135caa27dcf"),       // case colorate sul porto, Procida
  lofoten:   u("1663428520845-056989f8a664"),       // rorbu rossi di Hamnøy, Lofoten
  patagonia: u("1637580980556-085dee659c7e"),       // Fitz Roy all'alba
  iceland:   u("1476610182048-b716b8518aae"),       // Seljalandsfoss al tramonto
  faroe:     u("1554610975-1fa324cfb60b"),          // cascata di Gásadalur, Faroe
  alentejo:  u("1647628690577-372e0f0631e3"),       // campagna verde, Alentejo
  oaxaca:    u("1518105779142-d975f22f1b0a"),       // strada coloniale colorata, Messico
  bgDolomiti:u("1677741447337-48aba59a8f61"),       // Dolomiti in alpenglow (sfondo sezione)
  bgCoast:   u("1583844056361-4418a8f2a985"),       // Positano all'ora blu (sfondo sezione)
  bgDesert:  u("1542401886-65d6c61db217"),          // dune morbide al tramonto (sfondo sezione)
  bgAurora:  u("1605286700104-15889419f60b"),       // aurora verde sul fiordo (sfondo sezione)
} as const;

type Bi = { en: string; it: string };
type SeasonPick = { name: string; country: Bi; note: Bi; hl: Bi; img: string };

/* Card "Il meglio della stagione" — curatela onesta per stagione (mete e note
   plausibili per il periodo, non prezzi né promesse). */
const SEASONAL: Record<"winter" | "spring" | "summer" | "autumn", SeasonPick[]> = {
  summer: [
    { name: "Azzorre",   country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Perfect weather", it: "Clima perfetto" },   note: { en: "~24°C avg", it: "~24°C di media" },        img: PHOTO.azores },
    { name: "Lofoten",   country: { en: "Norway", it: "Norvegia" },     hl: { en: "Midnight sun", it: "Sole di mezzanotte" },  note: { en: "Until mid-Aug", it: "Fino a metà agosto" }, img: PHOTO.lofoten },
    { name: "Islanda",   country: { en: "Iceland", it: "Islanda" },     hl: { en: "Endless days", it: "Giornate infinite" },   note: { en: "Great for nature", it: "Ideale per la natura" }, img: PHOTO.iceland },
    { name: "Procida",   country: { en: "Italy", it: "Italia" },        hl: { en: "Beach season", it: "Stagione di mare" },    note: { en: "~28°C avg", it: "~28°C di media" },        img: PHOTO.procida },
    { name: "Kyoto",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Quiet & cultural", it: "Quiete culturale" },note: { en: "Summer calm", it: "Calma d'estate" },      img: PHOTO.kyoto },
  ],
  autumn: [
    { name: "Kyoto",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Autumn foliage", it: "Foliage d'autunno" }, note: { en: "Peak colors", it: "Colori al massimo" },   img: PHOTO.kyoto },
    { name: "Oaxaca",    country: { en: "Mexico", it: "Messico" },      hl: { en: "Vibrant season", it: "Stagione viva" },     note: { en: "Local festivals", it: "Feste locali" },    img: PHOTO.oaxaca },
    { name: "Azzorre",   country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Mild weather", it: "Clima mite" },          note: { en: "~20°C avg", it: "~20°C di media" },        img: PHOTO.azores },
    { name: "Alentejo",  country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Harvest season", it: "Vendemmia" },         note: { en: "Slow & pastoral", it: "Lento e pastorale" },img: PHOTO.alentejo },
    { name: "Marocco",   country: { en: "Morocco", it: "Marocco" },     hl: { en: "Desert weather", it: "Deserto ideale" },    note: { en: "~26°C avg", it: "~26°C di media" },        img: PHOTO.sahara },
  ],
  winter: [
    { name: "Lofoten",   country: { en: "Norway", it: "Norvegia" },     hl: { en: "Northern lights", it: "Aurora boreale" },   note: { en: "Arctic magic", it: "Magia artica" },       img: PHOTO.lofoten },
    { name: "Islanda",   country: { en: "Iceland", it: "Islanda" },     hl: { en: "Wild waterfalls", it: "Cascate selvagge" }, note: { en: "Short wild days", it: "Giorni brevi e selvaggi" }, img: PHOTO.iceland },
    { name: "Patagonia", country: { en: "Argentina", it: "Argentina" }, hl: { en: "Southern summer", it: "Estate australe" },  note: { en: "Best trekking", it: "Trekking al top" },   img: PHOTO.patagonia },
    { name: "Marocco",   country: { en: "Morocco", it: "Marocco" },     hl: { en: "Winter sun", it: "Sole d'inverno" },        note: { en: "~20°C avg", it: "~20°C di media" },        img: PHOTO.sahara },
    { name: "Tokyo",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Crisp clear skies", it: "Cieli tersi" },    note: { en: "Low season deals", it: "Bassa stagione" }, img: PHOTO.tokyo },
  ],
  spring: [
    { name: "Kyoto",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Cherry blossoms", it: "Ciliegi in fiore" }, note: { en: "Late Mar–Apr", it: "Fine marzo–aprile" }, img: PHOTO.kyoto },
    { name: "Procida",   country: { en: "Italy", it: "Italia" },        hl: { en: "Sea without crowds", it: "Mare senza folla" }, note: { en: "~19°C avg", it: "~19°C di media" },     img: PHOTO.procida },
    { name: "Azzorre",   country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Blooming season", it: "Tutto in fiore" },   note: { en: "Great for nature", it: "Ideale per la natura" }, img: PHOTO.azores },
    { name: "Tokyo",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Hanami season", it: "Stagione dei ciliegi" },note: { en: "Late Mar–Apr", it: "Fine marzo–aprile" }, img: PHOTO.tokyo },
    { name: "Alentejo",  country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Fields in bloom", it: "Campi in fiore" },   note: { en: "Slow & pastoral", it: "Lento e pastorale" },img: PHOTO.alentejo },
  ],
};

function seasonOf(m: number): keyof typeof SEASONAL {
  if (m >= 2 && m <= 4) return "spring";   // mar-mag
  if (m >= 5 && m <= 7) return "summer";   // giu-ago
  if (m >= 8 && m <= 10) return "autumn";  // set-nov
  return "winter";
}

/* Anteprima prodotto — dati DEMO dichiarati (label "Anteprima del prodotto"). */
const PREVIEW_CARDS: Array<{ name: string; sub: Bi; badgeKey: string; tags: Bi[]; days: number; travel: Bi; from: string; img: string; primary?: boolean }> = [
  { name: "Azzorre", sub: { en: "Portugal", it: "Portogallo" }, badgeKey: "led.made.bestMatch", tags: [{ en: "Nature", it: "Natura" }, { en: "Relaxation", it: "Relax" }, { en: "Scenic", it: "Scenografico" }], days: 6, travel: { en: "✈ ~5h", it: "✈ ~5h" }, from: "€190", img: PHOTO.azores, primary: true },
  { name: "Procida", sub: { en: "Italy", it: "Italia" }, badgeKey: "led.made.greatFor", tags: [{ en: "Coastal", it: "Mare" }, { en: "Food", it: "Cibo" }, { en: "Slow", it: "Lentezza" }], days: 4, travel: { en: "🚆 + ⛴ ~2h", it: "🚆 + ⛴ ~2h" }, from: "€89", img: PHOTO.procida },
  { name: "Kyoto", sub: { en: "Japan", it: "Giappone" }, badgeKey: "led.made.uniquePick", tags: [{ en: "Culture", it: "Cultura" }, { en: "Temples", it: "Templi" }, { en: "Calm", it: "Calma" }], days: 8, travel: { en: "✈ ~14h", it: "✈ ~14h" }, from: "€650", img: PHOTO.kyoto },
];

/* Partner REALI monetizzati (resolveAffiliateUrl) — mai Booking/GetYourGuide. */
const PARTNERS: Array<{ label: string; serif?: boolean }> = [
  { label: "Tripadvisor" },
  { label: "Viator", serif: true },
  { label: "Klook" },
  { label: "Expedia" },
  { label: "Hotels.com", serif: true },
  { label: "FlixBus" },
];

/* ── piccole icone inline (stroke 1.8, coerenti col mockup) ─── */
const I = {
  spark:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z"/></svg>,
  shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>,
  globe:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>,
  lock:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  user:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>,
  brain:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 3c0 1 .4 1.9 1 2.5A3.5 3.5 0 0 0 7.5 19c.6 0 1.1-.1 1.5-.4V4.6C9.3 4.2 9 4 9 4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 3c0 1-.4 1.9-1 2.5a3.5 3.5 0 0 1-2.5 6.5c-.6 0-1.1-.1-1.5-.4V4.6c-.3-.4 0-.6 0-.6z"/></svg>,
  mapp:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>,
  bag:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>,
  heart:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.4-6 3.5-6 2 0 3.5 1.2 4.5 3 1-1.8 2.5-3 4.5-3 3.1 0 4.7 3.3 3.5 6-2 4.4-9 9-9 9z"/></svg>,
  cal:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  target: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>,
  trend:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>,
  bell:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg>,
  tag:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="8" cy="9" r="1.4" fill="currentColor"/></svg>,
  clock:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>,
  users:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/><path d="M16 5.5a3.5 3.5 0 0 1 0 6.8M18.5 15.8c1.6.7 2.7 2 3 4.2"/></svg>,
  mail:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>,
  ig:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  tiktok: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>,
} as const;

/* ── Atto I · Interludio tipografico ─────────────────────────────────────
   Respiro fra hero e argomentazione: tre "battute" a tutta altezza su nero,
   ciascuna rivelata quando entra nel viewport. Il campo di punti (la firma)
   sta dietro, STICKY a un viewport: la camera tiene mentre il testo scorre —
   e il canvas resta grande quanto lo schermo, non quanto la sezione.

   Perché Reveal e non lo scroll-progress: un'opacità legata al progresso di
   scroll può non agganciarsi (misure/observer) e lasciare una fascia nera
   VUOTA. Reveal è lo stesso meccanismo del resto della pagina, già provato:
   entra e resta. Niente scroll-jacking, niente sticky sul testo. */
function CinematicInterlude() {
  const { t } = useI18n();
  const lines = [t("led.intro.l1"), t("led.intro.l2"), t("led.intro.l3")];
  return (
    <section className="led-intro" aria-label={lines[2]}>
      <div className="led-intro-bg" aria-hidden="true"><GraphField opacity={0.55} /></div>
      {lines.map((line, i) => (
        <div className="led-intro-beat" key={i}>
          <Reveal as="p" className={"led-intro-line" + (i === 2 ? " accent" : "")} amount={0.4}>
            {i === 2 ? <em>{line}</em> : line}
          </Reveal>
        </div>
      ))}
    </section>
  );
}

/* Mete "di tutti" nel pannello rumore — nomi propri, localizzata solo Islanda. */
const NOISE_DESTS = (lang: "en" | "it") =>
  ["Bali", "Santorini", "Tokyo", lang === "it" ? "Islanda" : "Iceland", "Lofoten"];
const NOISE_SOURCES = ["Instagram", "TikTok", "Pinterest", "YouTube"];

export function LandingEditorial({ onStart, stats }: { onStart: () => void; stats: LandingStats | null }) {
  const { t, lang } = useI18n();
  const reduce = useReducedMotion();
  const em = (key: string) => <span dangerouslySetInnerHTML={{ __html: t(key) }} />;
  const b = (x: Bi) => x[lang] ?? x.en;

  const now = useMemo(() => new Date(), []);
  const monthName = useMemo(
    () => now.toLocaleString(lang === "it" ? "it-IT" : "en-US", { month: "long" }),
    [now, lang],
  );

  const nf = (n: number) => n.toLocaleString(lang === "it" ? "it-IT" : "en-US");
  const itinCount = stats && stats.itineraryCount > 0 ? nf(stats.itineraryCount) : null;
  const destCount = stats && stats.destinationCount > 0 ? nf(stats.destinationCount) : null;

  // Hash → scrolla alla sezione una volta montato (es. /come-funziona
  // reindirizza con #how-it-works). Con ?noanim=1 lo scroll è istantaneo:
  // serve alla QA headless, dove lo smooth-scroll non completa mai.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const instant = new URLSearchParams(window.location.search).get("noanim") === "1";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
    });
  }, []);

  // Preload dell'hero (LCP): è un background CSS, quindi <link rel=preload>.
  // w=900/q=70 su mobile DEVE combaciare con l'URL pre-caricato in index.html
  // (pre-hero shell) — stessa stringa → una sola fetch, servita dalla cache.
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const heroImg = unsplashSized(PHOTO.kyoto, isMobile ? 900 : 1600, 70);
  // Le scene di sezione stanno sotto un velo pesante: su phone bastano 800px.
  const sceneW = isMobile ? 800 : 1400;
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload"; link.as = "image"; link.href = heroImg;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => link.remove();
  }, [heroImg]);

  return (
    <MotionConfig reducedMotion="user">
    <div className="led">

      {/* ① HERO */}
      <section className="led-hero">
        <div className="led-hero-bg" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="led-container led-hero-inner">
          <Stagger mount stagger={0.1} delayChildren={0.08}>
            <StaggerItem as="div" className="led-eyebrow"><span className="d" />{t("led.hero.eyebrow")}</StaggerItem>
            <StaggerItem as="h1">{t("led.hero.title1")}<br /><em>{t("led.hero.title2")}</em></StaggerItem>
            <StaggerItem as="p" className="led-hero-sub">{t("led.hero.sub")}</StaggerItem>
            <StaggerItem as="div" className="led-hero-row">
              <button className="led-btn xl" onClick={onStart} data-testid="led-hero-cta">
                {t("led.hero.cta")} <span className="led-arrow">→</span>
              </button>
              {itinCount && (
                <div className="led-hero-counter"><strong>{itinCount}</strong> {t("led.hero.counter")}</div>
              )}
            </StaggerItem>
          </Stagger>
        </div>

      </section>
      {/* La stats band coi numeri reali torna nell'atto Prodotto (Fase 4):
          nell'atto I romperebbe il ritmo manifesto→respiro. */}

      {/* ── ATTO I · Interludio — respiro tipografico ── */}
      <CinematicInterlude />

      {/* ── ATTO I · LA VERITÀ — il rumore dei feed vs il tuo punto di partenza ── */}
      <section className="led-truth" id="truth">
        <div className="led-container">
          <Reveal as="div" className="led-truth-head">
            <div className="led-eyebrow"><span className="d" />{t("led.truth.eyebrow")}</div>
            <h2>{t("led.truth.title1")}<br /><em>{t("led.truth.title2")}</em></h2>
            <p>{t("led.truth.sub")}</p>
          </Reveal>

          <div className="led-truth-panels">
            {/* Il rumore: tutte le fonti puntano alle stesse mete */}
            <Reveal as="div" className="led-truth-panel">
              <div className="lt-label">{t("led.truth.noiseLabel")}</div>
              <div className="lt-sources">
                {NOISE_SOURCES.map(s => <span key={s} className="lt-source">{s}</span>)}
              </div>
              <svg className="lt-lines" viewBox="0 0 300 60" preserveAspectRatio="none" aria-hidden="true">
                {NOISE_SOURCES.map((_, si) =>
                  NOISE_DESTS(lang).map((_, di) => (
                    <line key={`${si}-${di}`}
                      x1={45 + si * 70} y1="0"
                      x2={30 + di * 60} y2="60"
                      stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
                  )),
                )}
              </svg>
              <div className="lt-dests">
                {NOISE_DESTS(lang).map(d => <span key={d} className="lt-dest">{d}</span>)}
              </div>
              <div className="lt-cap">{t("led.truth.noiseCap")}</div>
            </Reveal>

            {/* Il punto di partenza: TU → identità → una meta tua */}
            <Reveal as="div" className="led-truth-panel you">
              <div className="lt-label">{t("led.truth.youLabel")}</div>
              <div className="lt-you-chip">{t("led.truth.you")}</div>
              <div className="lt-flow" aria-hidden="true">↓</div>
              <div className="lt-axes">
                {[
                  { k: t("led.truth.axis1"), v: 82 },
                  { k: t("led.truth.axis2"), v: 74 },
                  { k: t("led.truth.axis3"), v: 66 },
                  { k: t("led.truth.axis4"), v: 14 },
                ].map(a => (
                  <div key={a.k} className="lt-axis">
                    <span className="k">{a.k}</span>
                    {/* La larghezza finale è nello style: se l'animazione non
                        parte (osservatore mancato, reduced-motion) la barra è
                        comunque CORRETTA e piena. Animiamo solo scaleX → GPU. */}
                    <span className="bar"><motion.span className="fill" style={{ width: `${a.v}%` }}
                      initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} /></span>
                  </div>
                ))}
              </div>
              <div className="lt-flow" aria-hidden="true">↓</div>
              <div className="lt-you-dest">Madeira</div>
              <div className="lt-cap">{t("led.truth.youCap")}</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ② HOW IT WORKS — sfondo Dolomiti in alpenglow (percorso visivo) */}
      <section className="led-how" id="how-it-works">
        <div className="led-scene" style={{ backgroundImage: `url(${unsplashSized(PHOTO.bgDolomiti, sceneW, 50)})` }} />
        <div className="led-container">
          <Reveal as="div" className="led-think-head">
            <div className="led-eyebrow"><span className="d" />{t("led.think.eyebrow")}</div>
            <h2>{t("led.think.title1")}<br /><em>{t("led.think.title2")}</em></h2>
            <p>{t("led.think.sub")}</p>
          </Reveal>

          {/* Timeline del ragionamento: la linea è SEMPRE disegnata (traccia),
              il tratto acceso cresce quando lo step entra — se l'animazione non
              parte resta comunque tutto leggibile e connesso. */}
          <div className="led-think">
            {[1, 2, 3, 4].map((n) => (
              <Reveal as="div" className="led-think-step" key={n} amount={0.35}>
                <span className="lt-node" aria-hidden="true"><span className="dot" /></span>
                <div className="lt-body">
                  <span className="lt-num">{String(n).padStart(2, "0")}</span>
                  <h3>{t(`led.think.s${n}.t`)}</h3>
                  <p>{t(`led.think.s${n}.d`)}</p>
                </div>
              </Reveal>
            ))}
            {/* Chiusura del cerchio: il loop torna all'inizio */}
            <Reveal as="div" className="led-think-loop" amount={0.5}>
              <span className="lt-node loop" aria-hidden="true">↻</span>
              <div className="lt-body"><p>{t("led.think.loop")}</p></div>
            </Reveal>
          </div>

          <Reveal as="div" className="led-how-band" variants={scaleIn}>
            <div className="led-how-band-img" style={{ backgroundImage: `url(${unsplashSized(PHOTO.mountains, 900)})` }} />
            <div className="led-how-band-body">
              <div className="led-how-band-title">{em("led.how.bandTitle")}</div>
              <p className="led-how-band-sub">{t("led.how.bandSub")}</p>
              <div className="led-how-band-row">
                <button className="led-btn ghost" onClick={onStart}>{t("led.how.bandCta")} <span className="led-arrow">→</span></button>
                <span className="led-how-band-join">{t("led.how.bandJoin")}</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ③ SHOWCASE — sfondo Positano all'ora blu */}
      <section className="led-show">
        <div className="led-scene" style={{ backgroundImage: `url(${unsplashSized(PHOTO.bgCoast, sceneW, 50)})` }} />
        <div className="led-container">
          <Reveal as="div" className="led-proof-head">
            <div className="led-eyebrow"><span className="d" />{t("led.proof.eyebrow")}</div>
            <h2>{t("led.proof.title1")}<br /><em>{t("led.proof.title2")}</em></h2>
            <p>{t("led.proof.sub")}</p>
          </Reveal>

          {/* Due telefoni affiancati: stessa città, stesso budget, due profili.
              È la discriminazione del Graph resa visibile — quella che il motore
              produce davvero. Dati illustrativi, e lo diciamo. */}
          <div className="led-proof">
            {(["a", "b"] as const).map((k) => (
              <Reveal as="div" className={"led-phone" + (k === "b" ? " alt" : "")} key={k} variants={scaleIn} amount={0.2}>
                <div className="ph-frame">
                  <span className="ph-notch" aria-hidden="true" />
                  <div className="ph-screen">
                    <div className="ph-head">
                      <span className="ph-city">{lang === "it" ? "Lisbona" : "Lisbon"}</span>
                      <span className="ph-who">{t(`led.proof.${k}.name`)}</span>
                      <span className="ph-tags">{t(`led.proof.${k}.tags`)}</span>
                    </div>
                    <div className="ph-row base">
                      <span className="lbl">{t("led.proof.base")}</span>
                      <span className="val">{t(`led.proof.${k}.base`)}</span>
                    </div>
                    <div className="ph-day">
                      {(["m", "a", "e"] as const).map((slot) => (
                        <div className="ph-slot" key={slot}>
                          <span className="tm">{slot === "m" ? "09:00" : slot === "a" ? "15:00" : "20:30"}</span>
                          <span className="txt">{t(`led.proof.${k}.${slot}`)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="ph-row rhythm">
                      <span className="lbl">{t("led.proof.rhythm")}</span>
                      <span className="val">{t(`led.proof.${k}.rhythm`)}</span>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal as="p" className="led-proof-cap">{t("led.proof.disclaimer")}</Reveal>

          <Reveal as="div" className="led-quote">
            <span className="led-quote-mark">"</span>
            <p className="led-quote-text">{t("led.show.quote")}</p>
            <div className="led-quote-stats">
              {itinCount && (
                <div className="led-quote-stat"><div className="n">{itinCount}+</div><div className="l">{t("led.stats.itineraries")}</div></div>
              )}
              {destCount && (
                <div className="led-quote-stat"><div className="n">{destCount}+</div><div className="l">{t("led.stats.destinations")}</div></div>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── ATTO III · DENTRO LA DECISIONE — ogni consiglio ha un motivo ── */}
      <section className="led-why" id="why">
        <div className="led-container">
          <Reveal as="div" className="led-why-head">
            <div className="led-eyebrow"><span className="d" />{t("led.why.eyebrow")}</div>
            <h2>{t("led.why.title1")}<br /><em>{t("led.why.title2")}</em></h2>
            <p>{t("led.why.sub")}</p>
          </Reveal>

          <div className="led-why-grid">
            <Reveal as="div" className="led-why-dest" variants={scaleIn}
              style={{ backgroundImage: `url(${unsplashSized(PHOTO.kyoto, 700)})` }}>
              <div className="wd-body">
                <div className="wd-name">Kyoto</div>
                <div className="wd-country">{lang === "it" ? "Giappone" : "Japan"}</div>
              </div>
            </Reveal>

            {/* Il ragionamento che si scopre: prima cosa combacia, poi cosa è
                stato escluso. Stagger = il sistema che "pensa" a voce alta. */}
            <div className="led-why-lists">
              <Stagger className="wl-block" stagger={0.07} amount={0.2}>
                <StaggerItem as="div" className="wl-h">{t("led.why.for")}</StaggerItem>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <StaggerItem as="div" className="wl-item yes" key={i}>
                    <span className="mk" aria-hidden="true">✓</span>{t(`led.why.y${i}`)}
                  </StaggerItem>
                ))}
              </Stagger>
              <Stagger className="wl-block" stagger={0.07} delayChildren={0.15} amount={0.2}>
                <StaggerItem as="div" className="wl-h">{t("led.why.against")}</StaggerItem>
                {[1, 2, 3].map((i) => (
                  <StaggerItem as="div" className="wl-item no" key={i}>
                    <span className="mk" aria-hidden="true">✕</span>{t(`led.why.n${i}`)}
                  </StaggerItem>
                ))}
              </Stagger>
              <Reveal as="p" className="led-why-cap">{t("led.why.cap")}</Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── ATTO IV · MEMORIA — ogni viaggio entra nel successivo ── */}
      <section className="led-mem" id="memory">
        <div className="led-mem-bg" aria-hidden="true"><GraphField opacity={0.5} /></div>
        <div className="led-container">
          <Reveal as="div" className="led-mem-head">
            <div className="led-eyebrow"><span className="d" />{t("led.mem.eyebrow")}</div>
            <h2>{t("led.mem.title1")}<br /><em>{t("led.mem.title2")}</em></h2>
            <p>{t("led.mem.sub")}</p>
          </Reveal>

          {/* Tre viaggi: ognuno lascia un segno che sposta il profilo, e il
              terzo esiste GRAZIE ai due precedenti. È l'EMA + preferenza
              rivelata raccontata come storia. */}
          <div className="led-mem-track">
            {([
              { k: "t1", axis: t("led.truth.axis2"), delta: "+8", pct: 46 },
              { k: "t2", axis: t("led.truth.axis1"), delta: "+6", pct: 68 },
              { k: "t3", axis: t("led.truth.axis3"), delta: "+5", pct: 82 },
            ] as const).map((s, i) => (
              <Reveal as="div" className={"led-mem-step" + (i === 2 ? " last" : "")} key={s.k} amount={0.3}>
                <div className="mm-when">{t(`led.mem.${s.k}`)}</div>
                <div className="mm-card">
                  <div className="mm-place">{t(`led.mem.${s.k}p`)}</div>
                  <div className="mm-learn">
                    <span className="lbl">{t("led.mem.learn")}</span>
                    <span className="txt">{t(`led.mem.${s.k}l`)}</span>
                  </div>
                  <div className="mm-shift">
                    <span className="ax">{s.axis}</span>
                    <span className="bar"><motion.span className="fill" style={{ width: `${s.pct}%` }}
                      initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0 }}
                      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.1 }} /></span>
                    <span className="dl">{s.delta}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal as="p" className="led-mem-cap">{t("led.mem.cap")}</Reveal>
        </div>
      </section>

      {/* ④ MADE FOR YOU + EMAIL — sfondo dune al tramonto */}
      <section className="led-made">
        <div className="led-scene" style={{ backgroundImage: `url(${unsplashSized(PHOTO.bgDesert, sceneW, 50)})` }} />
        <div className="led-container">
          <div className="led-made-grid">
            <Reveal as="div">
              <div className="led-eyebrow"><span className="d" />{t("led.made.eyebrow")}</div>
              <h2>{em("led.made.title")}</h2>
              <p>{t("led.made.sub")}</p>
              <div className="led-features">
                <div className="led-feature"><span className="ic">{I.heart}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f1.t")}</span><span className="d">{t("led.made.f1.d")}</span></span></div>
                <div className="led-feature"><span className="ic">{I.cal}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f2.t")}</span><span className="d">{t("led.made.f2.d")}</span></span></div>
                <div className="led-feature"><span className="ic">{I.target}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f3.t")}</span><span className="d">{t("led.made.f3.d")}</span></span></div>
                <div className="led-feature"><span className="ic">{I.trend}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f4.t")}</span><span className="d">{t("led.made.f4.d")}</span></span></div>
              </div>
            </Reveal>

            {/* Anteprima prodotto — dati demo dichiarati */}
            <Reveal as="div" className="led-preview" variants={scaleIn}>
              <span className="led-preview-label">{t("led.made.previewLabel")}</span>
              <div className="led-preview-head">
                <div>
                  <div className="a">{t("led.made.welcome")}</div>
                  <div className="b">{t("led.made.welcomeSub").replace("{month}", monthName)}</div>
                </div>
                <span className="led-preview-match">{t("led.made.match")} <strong>95%</strong></span>
              </div>
              <div className="led-preview-cards">
                {PREVIEW_CARDS.map((c, i) => (
                  <div key={i} className="led-pcard">
                    <div className="led-pcard-img" style={{ backgroundImage: `url(${unsplashSized(c.img, 420)})` }}>
                      <span className="badge">{t(c.badgeKey)}</span>
                    </div>
                    <div className="led-pcard-body">
                      <div className="led-pcard-name">{c.name}<em>{b(c.sub)}</em></div>
                      <div className="led-pcard-tags">{c.tags.map((x, j) => <span key={j}>{b(x)}</span>)}</div>
                      <div className="led-pcard-meta">
                        <strong>{c.days} {t("led.made.days")}</strong> · {t("led.made.fromCity")} {b(c.travel)}<br />
                        {t("led.made.from")} <strong>{c.from}</strong>
                      </div>
                      <button className={"led-pcard-cta" + (c.primary ? "" : " ghost")} onClick={onStart}>
                        {t("led.made.view")} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="led-preview-honest">{I.shield} {t("led.made.honest")}</div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ⑤ FINAL CTA + PARTNERS — sfondo aurora sul fiordo (chiusura del viaggio) */}
      <section className="led-final">
        <div className="led-scene" style={{ backgroundImage: `url(${unsplashSized(PHOTO.bgAurora, sceneW, 50)})` }} />
        <div className="led-container">
          <div className="led-final-grid">
            <Reveal as="div" className="led-final-img" variants={scaleIn} style={{ backgroundImage: `url(${unsplashSized(PHOTO.bgCoast, 900)})` }} />
            <Reveal as="div">
              <div className="led-eyebrow"><span className="d" />{t("led.final.eyebrow")}</div>
              <h2>{em("led.final.title")}</h2>
              <p className="led-final-sub">{t("led.final.sub")}</p>
              <div className="led-values">
                <div className="led-value"><span className="ic">{I.spark}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v1.t")}</span><span className="d">{t("led.final.v1.d")}</span></span></div>
                <div className="led-value"><span className="ic">{I.shield}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v2.t")}</span><span className="d">{t("led.final.v2.d")}</span></span></div>
                <div className="led-value"><span className="ic">{I.globe}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v3.t")}</span><span className="d">{t("led.final.v3.d")}</span></span></div>
                <div className="led-value"><span className="ic">{I.lock}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v4.t")}</span><span className="d">{t("led.final.v4.d")}</span></span></div>
              </div>
              <button className="led-btn xl" onClick={onStart} data-testid="led-final-cta">
                {t("led.final.cta")} <span className="led-arrow">→</span>
              </button>
              <div className="led-final-proof">
                <span><span className="ck">✓</span>{t("led.final.p1")}</span>
                <span><span className="ck">✓</span>{t("led.final.p2")}</span>
                <span><span className="ck">✓</span>{t("led.final.p3")}</span>
              </div>
            </Reveal>
          </div>

          <Stagger className="led-partners" stagger={0.06} amount={0.4}>
            <StaggerItem as="span" className="led-partners-head">{t("led.partners.head")}</StaggerItem>
            {PARTNERS.map(p => (
              <StaggerItem key={p.label} as="span" className={"led-partner" + (p.serif ? " serif" : "")}>{p.label}</StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ── ATTO V · CHIUSURA — nero, tipografica, l'ultima convinzione ── */}
      <section className="led-end">
        <div className="led-end-bg" aria-hidden="true"><GraphField opacity={0.45} /></div>
        <div className="led-container led-end-inner">
          <Stagger stagger={0.12} amount={0.3}>
            <StaggerItem as="p" className="led-end-l1">{t("led.end.l1")}</StaggerItem>
            <StaggerItem as="p" className="led-end-l2"><em>{t("led.end.l2")}</em></StaggerItem>
            <StaggerItem as="div" className="led-end-cta">
              <button className="led-btn xl" onClick={onStart} data-testid="led-end-cta">
                {t("led.end.cta")} <span className="led-arrow">→</span>
              </button>
            </StaggerItem>
            {/* I numeri REALI tornano qui, piccoli: prova, non promessa. */}
            {(itinCount || destCount) && (
              <StaggerItem as="div" className="led-end-stats">
                {itinCount && <span><strong>{itinCount}+</strong> {t("led.stats.itineraries")}</span>}
                {destCount && <span><strong>{destCount}+</strong> {t("led.stats.destinations")}</span>}
              </StaggerItem>
            )}
          </Stagger>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="led-footer">
        <div className="led-container">
          <div className="led-footer-grid">
            <div>
              <div className="led-footer-mark"><BrandMark size={26} idPrefix="foot" /> MindRoute</div>
              <p className="led-footer-tagline">{t("footer.tagline")}</p>
              <p className="led-footer-tagline">{t("led.foot.tagline2")}</p>
            </div>
            <div>
              <div className="led-footer-head">{t("led.foot.product")}</div>
              <Link href="/come-funziona" className="led-footer-link">{t("led.foot.how")}</Link>
              <Link href="/start" className="led-footer-link">{t("led.foot.start")}</Link>
            </div>
            <div>
              <div className="led-footer-head">{t("led.foot.company")}</div>
              <Link href="/privacy" className="led-footer-link">{t("led.foot.privacy")}</Link>
              <a href="mailto:mindroutetravel@gmail.com" className="led-footer-link">{t("led.foot.contact")}</a>
            </div>
            <div>
              <div className="led-footer-head">{t("led.foot.follow")}</div>
              <p className="led-footer-tagline">{t("led.foot.followSub")}</p>
              <div className="led-footer-socials">
                <a href="https://instagram.com/mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="Instagram">{I.ig}</a>
                <a href="https://tiktok.com/@mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="TikTok">{I.tiktok}</a>
              </div>
            </div>
          </div>
          <div className="led-footer-base">
            <span>{t("footer.copyright")}</span>
            <span>{t("footer.affiliate")}</span>
            <span>{t("led.foot.made")}</span>
          </div>
        </div>
      </footer>
    </div>
    </MotionConfig>
  );
}
