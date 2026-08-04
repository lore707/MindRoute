/**
 * LandingEditorial.tsx — landing a 7 scene (riscrittura 2026-07-31 sul mockup).
 * ───────────────────────────────────────────────────────────────
 * Tradotta col Mockup Translation Protocol (docs/operating-system/16). Le scene
 * seguono lo storyboard del doc 13:
 *   01 La domanda · 02 La verità · 03 Chi viaggia · 04 La prova
 *   05 La memoria · 06 Il prodotto · 07 L'inizio
 *
 * Scelte esplicite prese sul mockup (NON riaprire senza ok):
 *  · L'eyebrow "AI-POWERED TRAVEL INTELLIGENCE" del mockup è stato sostituito:
 *    il doc 01 ha un capitolo "We never sell AI" e il doc 05 usa proprio quella
 *    frase come esempio di hero SBAGLIATO.
 *  · Niente form newsletter (rimosso da Lorenzo il 2026-07-30, commit 313e9ec)
 *    e niente "no credit card required" / "Pricing": cliché vietati dal doc 06,
 *    e non esiste una pagina prezzi.
 *  · I link del footer puntano SOLO a rotte esistenti (/come-funziona, /start,
 *    /privacy, mailto). Niente Journal/Careers/Help center: sarebbero morti.
 *  · Social proof = numeri REALI da /api/stats, nascosti finché non esistono.
 *  · Gli esempi (Lisbona, la memoria, la dashboard) sono ETICHETTATI come
 *    illustrativi: nessun dato inventato spacciato per reale.
 *
 * Il filo verticale a sinistra è il Travel Graph reso fisico (ricetta A12):
 * la linea è sempre disegnata, cambia solo il nodo acceso.
 * ─────────────────────────────────────────────────────────────── */

import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { unsplashSized } from "@/lib/img";
import { BrandMark } from "@/components/BrandMark";
import { GraphField } from "@/components/GraphField";
import { MotionConfig, Reveal, Stagger, StaggerItem } from "@/lib/motion";

export type LandingStats = { itineraryCount: number; destinationCount: number };

/* Pool foto — ogni ID verificato a occhio (audit 2026-07-15). Se ne aggiungi
   una, scaricala e GUARDALA prima di cablarla: il pool ereditato aveva
   Azzorre=cane e Alentejo=Dubai. */
const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&fit=crop&crop=entropy&auto=format&q=80`;
const PHOTO = {
  kyoto:     u("1493976040374-85c8e12f0c0e", 2000), // pagoda Yasaka al tramonto (hero)
  tokyo:     u("1540959733332-eab4deabeeaf"),       // Shibuya al neon
  sahara:    u("1489493585363-d69421e0edd3"),       // carovana tra le dune
  mountains: u("1519681393784-d120267933ba"),       // vetta innevata sotto le stelle
  azores:    u("1620998051604-95ff17ccc537"),       // scogliere delle Azzorre
  procida:   u("1628522241320-8135caa27dcf"),       // case sul porto di Procida
  lofoten:   u("1663428520845-056989f8a664"),       // rorbu di Hamnøy
  patagonia: u("1637580980556-085dee659c7e"),       // Fitz Roy all'alba
  iceland:   u("1476610182048-b716b8518aae"),       // Seljalandsfoss
  faroe:     u("1554610975-1fa324cfb60b"),          // cascata di Gásadalur
  alentejo:  u("1647628690577-372e0f0631e3"),       // campagna dell'Alentejo
  oaxaca:    u("1518105779142-d975f22f1b0a"),       // strada coloniale, Messico
  bgCoast:   u("1583844056361-4418a8f2a985"),       // Positano all'ora blu
  bgDesert:  u("1542401886-65d6c61db217"),          // dune al tramonto
  bgAurora:  u("1605286700104-15889419f60b"),       // aurora sul fiordo
  bgDolomiti:u("1677741447337-48aba59a8f61"),       // Dolomiti in alpenglow
} as const;

type Bi = { en: string; it: string };

/* Le mete "di tutti". Il punto NON e' che siano cinque: e' che sono sempre
   la stessa manciata, in qualunque feed. Per questo i chip ruotano dentro un
   pool piu' largo invece di restare fissi. */
const NOISE_POOL = (lang: "en" | "it") => [
  "Bali", "Santorini", lang === "it" ? "Islanda" : "Iceland", "Tokyo",
  lang === "it" ? "Parigi" : "Paris", "Dubai", lang === "it" ? "Maldive" : "Maldives",
  "Amsterdam", "Barcelona", "New York", "Marrakech", lang === "it" ? "Roma" : "Rome",
  "Lisboa", lang === "it" ? "Praga" : "Prague",
];

/* Scena 04 — due profili sintetici, stessa città. ETICHETTATO come esempio.
   Struttura presa 1:1 dal prodotto (itinerary-agenda.css): quattro fasce
   fisse Mattina · Pranzo · Pomeriggio · Sera, ognuna col suo colore, e i
   momenti con orario + titolo serif + dettaglio. Un giorno solo per card:
   la divergenza si legge meglio ora per ora (07:30 contro 10:00) che
   giorno per giorno. */
const BANDS: Array<{ k: string; l: Bi; c: string }> = [
  { k: "m", l: { en: "Morning", it: "Mattina" }, c: "#D4A853" },
  { k: "p", l: { en: "Lunch", it: "Pranzo" }, c: "#6FB4A8" },
  { k: "a", l: { en: "Afternoon", it: "Pomeriggio" }, c: "#E94560" },
  { k: "s", l: { en: "Evening", it: "Sera" }, c: "#9B8CE0" },
];

const TRIPS: Array<{ who: Bi; slots: Array<{ time: string; t: Bi; d: Bi }> }> = [
  {
    who: { en: "For the Explorer", it: "Per chi esplora" },
    slots: [
      { time: "07:30", t: { en: "Alfama at first light", it: "Alfama alle prime luci" }, d: { en: "Before the buses", it: "Prima dei bus" } },
      { time: "13:00", t: { en: "A neighbourhood tasca", it: "Tasca di quartiere" }, d: { en: "Where the locals eat", it: "Dove mangiano i vicini" } },
      { time: "15:30", t: { en: "Sintra, on foot", it: "Sintra, a piedi" }, d: { en: "Two stops, no rush", it: "Due tappe, senza fretta" } },
      { time: "21:00", t: { en: "Fado in a small room", it: "Fado in una sala piccola" }, d: { en: "Late, no booking", it: "Tardi, senza prenotare" } },
    ],
  },
  {
    who: { en: "For the Dreamer", it: "Per chi sogna" },
    slots: [
      { time: "10:00", t: { en: "Tiles and quiet rooms", it: "Azulejos e stanze silenziose" }, d: { en: "Coffee, notebook", it: "Caffè e taccuino" } },
      { time: "13:30", t: { en: "A long lunch on the terrace", it: "Pranzo lento sul terrazzo" }, d: { en: "Nothing after", it: "Nessuna tappa dopo" } },
      { time: "17:00", t: { en: "A ceramics workshop", it: "Laboratorio di ceramica" }, d: { en: "Two hours, with your hands", it: "Due ore, con le mani" } },
      { time: "20:30", t: { en: "Sunset sailing", it: "Vela al tramonto" }, d: { en: "Walk back along the river", it: "Rientro a piedi sul fiume" } },
    ],
  },
];

/* Scena 05 — come un profilo si sposta viaggio dopo viaggio. Illustrativo. */
const MEMORY: Array<{ y: string; n: Bi; img: string; next?: boolean }> = [
  { y: "2023", n: { en: "Iceland", it: "Islanda" }, img: PHOTO.iceland },
  { y: "2024", n: { en: "Japan", it: "Giappone" }, img: PHOTO.kyoto },
  { y: "2024", n: { en: "Portugal", it: "Portogallo" }, img: PHOTO.alentejo },
  { y: "2025", n: { en: "Norway", it: "Norvegia" }, img: PHOTO.lofoten },
  { y: "—", n: { en: "Chile?", it: "Cile?" }, img: PHOTO.patagonia, next: true },
];

/* Scena 06 — gli strumenti fra cui si salta oggi per organizzare UN viaggio.
   Nomi generici, mai marchi: non regaliamo visibilita' a terzi e non ci
   esponiamo. Ruotati e sbiaditi: dispersione. */
const TOOLS: Bi[] = [
  { en: "Flights", it: "Voli" },
  { en: "Stays", it: "Alloggio" },
  { en: "Maps", it: "Mappe" },
  { en: "Reviews", it: "Recensioni" },
  { en: "Blogs & forums", it: "Blog e forum" },
  { en: "Notes", it: "Note sparse" },
];
const TOOL_TILT = [-3, 2, -2, 3, -3, 1];

/* Scena 06 — anteprima prodotto, dati demo dichiarati.
   Formato preso dal prodotto (account-dashboard.css .pick): UNA card grande
   con tag oro, nome serif e il riquadro "Perche' e' per te" col filetto oro.
   Non tre cartoline con "% affinita'": quelle non esistono nella dashboard. */
const PICK = {
  img: PHOTO.kyoto,
  name: "Kyoto",
  country: { en: "Japan", it: "Giappone" } as Bi,
  meta: { en: "6 days · late autumn", it: "6 giorni · fine autunno" } as Bi,
  why: {
    en: "You keep choosing slow mornings and walkable places — and you came back from Portugal wanting quiet, not more cities.",
    it: "Continui a scegliere mattine lente e posti che si girano a piedi — e dal Portogallo sei tornato cercando quiete, non altre citta\u0300.",
  } as Bi,
};

/* ── icone (stroke 1.6, mai colorate se non per segnalare) ─── */
const I = {
  pin:   <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>,
  user:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5"/></svg>,
  heart: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.4-6 3.5-6 2 0 3.5 1.2 4.5 3 1-1.8 2.5-3 4.5-3 3.1 0 4.7 3.3 3.5 6-2 4.4-9 9-9 9z"/></svg>,
  wave:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 9c2.5-2.5 4.5-2.5 7 0s4.5 2.5 7 0 4.5-2.5 6 0"/><path d="M2 15c2.5-2.5 4.5-2.5 7 0s4.5 2.5 7 0 4.5-2.5 6 0"/></svg>,
  star:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3.5l2.5 5.6 6 .7-4.5 4.1 1.3 5.9L12 16.8 6.7 19.8 8 13.9 3.5 9.8l6-.7L12 3.5z"/></svg>,
  place: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>,
  route: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/></svg>,
  home:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8z"/></svg>,
  book:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M8 8h7M8 12h7"/></svg>,
  mapi:  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>,
  ig:    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  tiktok:<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>,
} as const;

/* ── Filo dell'identità (A12) ───────────────────────────────────
   La linea è SEMPRE disegnata: cambia solo il nodo acceso. Non è una barra di
   avanzamento — è il Graph che attraversa la pagina. Un solo
   IntersectionObserver per tutte le scene: niente listener di scroll. */
function IdentityThread({ ids }: { ids: string[] }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        // la scena più visibile vince
        let best: { i: number; r: number } | null = null;
        for (const e of entries) {
          const i = els.indexOf(e.target as HTMLElement);
          if (i < 0 || !e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.r) best = { i, r: e.intersectionRatio };
        }
        if (best) setActive(best.i);
      },
      { threshold: [0.15, 0.4, 0.7] },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids]);

  return (
    <div className="led-thread" aria-hidden="true">
      {ids.map((id, i) => (
        <span key={id} className={"led-thread-node" + (i === active ? " on" : "")}>
          <span className="led-thread-num">{String(i + 1).padStart(2, "0")}</span>
        </span>
      ))}
    </div>
  );
}

/* I chip delle mete ruotano: uno alla volta, ogni 2.4s, dentro un pool piu'
   largo. Serve a dire che non sono CINQUE mete — e' sempre la stessa manciata,
   chiunque tu sia. Con "riduci movimento" restano fermi sui primi cinque. */
function useRotatingDestinations(pool: string[], slots = 5) {
  const [idx, setIdx] = useState<number[]>(() => [0, 1, 2, 3, 4].slice(0, slots));
  useEffect(() => {
    const reduce = typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || pool.length <= slots) return;
    let slot = 0;
    const id = window.setInterval(() => {
      setIdx((prev) => {
        const next = [...prev];
        // prende il primo indice del pool non gia' a schermo
        let cand = (Math.max(...prev) + 1) % pool.length;
        let guard = 0;
        while (prev.includes(cand) && guard++ < pool.length) cand = (cand + 1) % pool.length;
        next[slot] = cand;
        slot = (slot + 1) % slots;
        return next;
      });
    }, 2400);
    return () => window.clearInterval(id);
  }, [pool, slots]);
  return idx.map((i) => pool[i]);
}

const SCENES = ["s-hero", "s-truth", "s-who", "s-proof", "s-memory", "s-app", "s-end"];

export function LandingEditorial({ onStart, stats }: { onStart: () => void; stats: LandingStats | null }) {
  const { t, lang } = useI18n();
  const b = (x: Bi) => x[lang] ?? x.en;

  const nf = (n: number) => n.toLocaleString(lang === "it" ? "it-IT" : "en-US");
  const itinCount = stats && stats.itineraryCount > 0 ? nf(stats.itineraryCount) : null;
  const destCount = stats && stats.destinationCount > 0 ? nf(stats.destinationCount) : null;

  // Hash → scrolla alla sezione (es. /come-funziona reindirizza con #s-who).
  // Con ?noanim=1 lo scroll è istantaneo: serve alla QA headless.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id) return;
    const instant = new URLSearchParams(window.location.search).get("noanim") === "1";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "start" });
    });
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const heroImg = unsplashSized(PHOTO.kyoto, isMobile ? 900 : 1600, 70);
  const sceneW = isMobile ? 800 : 1400;
  const sized = (src: string, w = sceneW, q = 70) => unsplashSized(src, w, q);

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload"; link.as = "image"; link.href = heroImg;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => link.remove();
  }, [heroImg]);

  // Muro di feed: posizioni fisse (mai random → nessun salto fra i render).
  // Le stesse QUATTRO foto si ripetono: è il punto della scena — i feed di
  // tutti mostrano gli stessi posti. Sovrapposte, desaturate, indistinguibili.
  /* Scena 02 — L'IMBUTO. La grafica DEVE dire quello che dice la frase:
     tante persone diverse, tutte incanalate, verso le stesse cinque mete.
     Posizioni fisse (mai random): niente salti fra un render e l'altro.
     Coordinate in % → l'SVG usa preserveAspectRatio="none", i punti sono
     span HTML (un cerchio scalato non deformato). */
  const noisePool = useMemo(() => NOISE_POOL(lang), [lang]);
  const shownDests = useRotatingDestinations(noisePool);

  const crowd = useMemo(
    () => [
      [2, 10], [10, 5], [17, 13], [25, 8], [6, 22], [14, 26], [21, 20], [29, 25],
      [1, 36], [9, 40], [16, 33], [24, 42], [31, 36], [4, 52], [12, 55], [19, 48],
      [27, 56], [34, 50], [0, 67], [8, 70], [15, 62], [23, 72], [30, 66], [5, 83],
      [13, 87], [20, 79], [28, 89], [35, 77],
    ] as Array<[number, number]>,
    [],
  );

  const chain: Array<{ ic: JSX.Element; k: string }> = [
    { ic: I.user,  k: "led.who.c1" },
    { ic: I.heart, k: "led.who.c2" },
    { ic: I.wave,  k: "led.who.c3" },
    { ic: I.star,  k: "led.who.c4" },
    { ic: I.place, k: "led.who.c5" },
    { ic: I.route, k: "led.who.c6" },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <div className="led">
        <IdentityThread ids={SCENES} />

        {/* Nessuna nav qui: la nav globale è già montata dall'app shell.
            Duplicarla darebbe due barre sovrapposte. */}

        {/* ── 01 · LA DOMANDA ── */}
        <section className="led-hero" id="s-hero">
          <div className="led-hero-photo" style={{ backgroundImage: `url(${heroImg})` }} aria-hidden="true" />
          <div className="led-hero-veil" aria-hidden="true" />
          <div className="led-container"><div className="led-hero-inner">
            <Stagger mount stagger={0.09} delayChildren={0.06}>
              <StaggerItem as="div" className="led-eyebrow"><span className="d" />{t("led.hero.eyebrow")}</StaggerItem>
              <StaggerItem as="h1">{t("led.hero.t1")} <em>{t("led.hero.t2")}</em></StaggerItem>
              <StaggerItem as="p" className="led-narr">{t("led.hero.sub")}</StaggerItem>
              <StaggerItem as="div" className="led-hero-row">
                <button className="led-btn" onClick={onStart} data-testid="led-hero-cta">
                  {t("led.hero.cta")} <span className="ar">→</span>
                </button>
                <p className="led-hero-note">
                  <strong>{t("led.hero.noteT")}</strong>{t("led.hero.noteS")}
                </p>
              </StaggerItem>
            </Stagger>
          </div></div>
          <div className="led-scroll" aria-hidden="true">
            {t("led.hero.scroll")}<span className="ch">⌄</span>
          </div>
        </section>

        {/* ── 02 · LA VERITÀ — i feed convergono sulle stesse mete ── */}
        <section className="led-scene led-truth" id="s-truth">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.faroe)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-truth-grid">
            <Reveal as="div">
              <div className="led-eyebrow"><span className="d" />{t("led.truth.eyebrow")}</div>
              <h2 style={{ margin: "var(--gap-3) 0" }}>{t("led.truth.t1")}<br />{t("led.truth.t2")}</h2>
              <p className="led-truth-note">{t("led.truth.note")}</p>
            </Reveal>

            {/* L'imbuto: persone diverse → un solo canale → le stesse mete. */}
            <Reveal as="div" className="led-conv-wrap" role="img" aria-label={t("led.truth.figureAlt")}>
              <svg className="led-conv" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {/* due strati: il tracciato FISSO (la forma dell'imbuto si legge
                    sempre, anche da fermo) e i segnali che vi scorrono sopra */}
                {crowd.map(([x, y], i) => (
                  <path key={`p${i}`} className="in" d={`M ${x} ${y} C ${x + 14} ${y}, 34 ${50 + (y - 50) * 0.2}, 44 50`} />
                ))}
                {crowd.map(([x, y], i) => (
                  <path key={`s${i}`} className="sig" d={`M ${x} ${y} C ${x + 14} ${y}, 34 ${50 + (y - 50) * 0.2}, 44 50`} />
                ))}
                {[10, 30, 50, 70, 90].map((y, i) => (
                  <path key={i} className="out" d={`M 44 50 C 56 50, 58 ${y}, 70 ${y}`} />
                ))}
              </svg>
              {crowd.map(([x, y], i) => (
                <span key={i} className="led-person" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden="true" />
              ))}
              <span className="led-funnel" aria-hidden="true" />
              <span className="led-funnel-cap" aria-hidden="true">{t("led.truth.funnel")}</span>
              <span className="led-conv-cap left">{t("led.truth.capLeft")}</span>
              <span className="led-conv-cap right">{t("led.truth.capRight")}</span>
              <Stagger className="led-dests" stagger={0.08}>
                {shownDests.map((d, i) => (
                  <StaggerItem as="span" className="led-dest" key={i}>
                    <span className="pin">{I.pin}</span>
                    <span className="nm" key={d}>{d}</span>
                  </StaggerItem>
                ))}
              </Stagger>
            </Reveal>
          </div>
        </section>

        {/* ── 03 · CHI VIAGGIA — la riflessione + la trasformazione ── */}
        <section className="led-scene led-who" id="s-who">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.bgDesert)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-refl-grid">
            <Reveal as="div">
              <h2>{t("led.who.t1")} <em>{t("led.who.t2")}</em> {t("led.who.t3")}</h2>
            </Reveal>
            <Reveal as="div">
              <div className="led-chain">
                {chain.map((c, i) => (
                  <Fragment key={c.k}>
                    <span className="led-chain-step">
                      <span className="led-chain-ring">{c.ic}</span>
                      <span className="led-chain-label">{t(c.k)}</span>
                    </span>
                    {i < chain.length - 1 && <span className="led-chain-link" aria-hidden="true">→</span>}
                  </Fragment>
                ))}
              </div>
              <p className="led-refl-note"><em>{t("led.who.n1")}</em><br />{t("led.who.n2")}</p>
            </Reveal>
          </div>
        </section>

        {/* ── 04 · LA PROVA — stessa città, due viaggi ── */}
        <section className="led-scene led-proof" id="s-proof">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.alentejo)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container">
            <Reveal as="div" className="led-proof-head">
              <div className="led-eyebrow"><span className="d" />{t("led.proof.eyebrow")}</div>
              <h2 style={{ margin: "var(--gap-3) 0" }}>{t("led.proof.t1")}<br /><em>{t("led.proof.t2")}</em></h2>
              <p className="led-narr">{t("led.proof.sub")}</p>
            </Reveal>

            <div className="led-proof-pair">
              {TRIPS.map((trip, ti) => (
                <Reveal as="div" className="led-tripcard" key={ti}>
                  <h3>{lang === "it" ? "Lisbona" : "Lisbon"}, {lang === "it" ? "Portogallo" : "Portugal"}</h3>
                  <p className="who">{b(trip.who)} &middot; {t("led.proof.day")} 2</p>
                  <Stagger stagger={0.09}>
                    {trip.slots.map((sl, di) => (
                      <StaggerItem as="div" className="led-band" key={di} style={{ ["--pc" as any]: BANDS[di].c }}>
                        <span className="led-band-head">
                          <span className="led-band-dot" aria-hidden="true" />
                          <span className="led-band-l">{b(BANDS[di].l)}</span>
                          <span className="led-band-t">{sl.time}</span>
                        </span>
                        <span className="led-moment">
                          <span className="led-moment-t">{b(sl.t)}</span>
                          <span className="led-moment-d">{b(sl.d)}</span>
                        </span>
                      </StaggerItem>
                    ))}
                  </Stagger>
                </Reveal>
              ))}
              <span className="led-swap" aria-hidden="true">⟷</span>
            </div>
            <p className="led-preview-label" style={{ marginTop: "var(--gap-3)" }}>{t("led.proof.disclaimer")}</p>
          </div>
        </section>

        {/* ── 05 · LA MEMORIA — ogni viaggio cambia il prossimo ── */}
        <section className="led-scene led-mem" id="s-memory">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.bgAurora)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-mem-grid">
            <Reveal as="div">
              <p className="led-truth-line">{t("led.mem.truth")}</p>
              <h2>{t("led.mem.t1")} <em>{t("led.mem.t2")}</em></h2>
              <p className="led-narr" style={{ marginTop: "var(--gap-3)" }}>{t("led.mem.sub")}</p>
            </Reveal>

            <Reveal as="div">
              {/* La cornice e' quella dell'Atlante vero (.atlas-mapcard): card
                  scura, angoli 20px, legenda in alto a sinistra. La rotta
                  disegnata e' lo stato "viaggio selezionato" del prodotto. */}
              <div className="led-atlas">
                <span className="led-atlas-legend">{t("led.mem.legend")}</span>
                <GraphField opacity={0.4} />
                <svg className="led-route" viewBox="0 0 620 200" role="img" aria-label={t("led.mem.routeAlt")}>
                  <path className="rt" d="M62 104 L186 132 L310 78 L434 116 L558 54" />
                  {[[62, 104], [186, 132], [310, 78], [434, 116], [558, 54]].map(([x, y], i) => (
                    <circle key={i} className="pin" cx={x} cy={y} r={i === 4 ? 5 : 3.4} />
                  ))}
                </svg>
              </div>

              <Stagger className="led-track" stagger={0.09}>
                  {MEMORY.map((m, i) => (
                    <StaggerItem as="div" className={"led-stop" + (m.next ? " next" : "")} key={i}>
                      <span className="led-stop-img" style={{ backgroundImage: `url(${sized(m.img, 320, 55)})` }} aria-hidden="true" />
                      <span className="led-stop-y">{m.y}</span>
                      <span className="led-stop-n">{b(m.n)}</span>
                    </StaggerItem>
                  ))}
              </Stagger>
              <p className="led-preview-label" style={{ marginTop: "var(--gap-3)" }}>{t("led.mem.disclaimer")}</p>
            </Reveal>
          </div>
        </section>

        {/* ── 06 · IL PRODOTTO — solo adesso ── */}
        <section className="led-scene led-app" id="s-app">
          <div className="led-scene-photo" style={{ backgroundImage: `url(${sized(PHOTO.bgDolomiti)})` }} aria-hidden="true" />
          <div className="led-scene-veil" aria-hidden="true" />
          <div className="led-container led-app-grid">
            <Reveal as="div">
              <p className="led-truth-line">{t("led.app.truth")}</p>
              {/* la dispersione, resa visibile: sei etichette storte e sbiadite */}
              <div className="led-tools" aria-hidden="true">
                {TOOLS.map((tool, i) => (
                  <span className="led-tool" key={i} style={{ transform: `rotate(${TOOL_TILT[i]}deg)` }}>
                    {b(tool)}
                  </span>
                ))}
              </div>
              <h2 style={{ marginTop: "var(--gap-4)" }}>{t("led.app.t1")}<br /><em>{t("led.app.t2")}</em></h2>
              <p className="led-narr" style={{ margin: "var(--gap-3) 0 var(--gap-4)" }}>{t("led.app.sub")}</p>
              <button className="led-tcta" onClick={onStart} data-testid="led-app-cta">
                {t("led.app.cta")} <span aria-hidden="true">→</span>
              </button>
            </Reveal>

            <Reveal as="div">
              <p className="led-preview-label">{t("led.app.previewLabel")}</p>
              <div className="led-shell">
                <div className="led-shell-side">
                  <div className="led-shell-brand"><BrandMark size={18} idPrefix="shell" /> MindRoute</div>
                  {[
                    { ic: I.home, k: "led.app.navHome", on: true },
                    { ic: I.route, k: "led.app.navResume" },
                    { ic: I.user, k: "led.app.navPortrait" },
                    { ic: I.mapi, k: "led.app.navTrips" },
                    { ic: I.book, k: "led.app.navAtlas" },
                  ].map((n) => (
                    <div className={"led-shell-nav" + (n.on ? " on" : "")} key={n.k}>
                      <span className="ic">{n.ic}</span>{t(n.k)}
                    </div>
                  ))}
                </div>
                <div className="led-shell-main">
                  <div className="led-pick" style={{ backgroundImage: `url(${sized(PICK.img, 900, 60)})` }}>
                    <span className="led-pick-tag">{t("led.app.pickTag")}</span>
                    <span className="led-pick-body">
                      <span className="led-pick-meta">{b(PICK.meta)}</span>
                      <span className="led-pick-nm">{PICK.name}, {b(PICK.country)}</span>
                      <span className="led-pick-why">
                        <span className="k">{t("led.app.whyK")}</span>
                        <span className="w">{b(PICK.why)}</span>
                      </span>
                    </span>
                  </div>
                  <div className="led-shell-h">{t("led.app.journalHead")}</div>
                  <div className="led-journal">
                    {[PHOTO.iceland, PHOTO.kyoto, PHOTO.alentejo, PHOTO.lofoten, PHOTO.faroe].map((img, i) => (
                      <span className="led-journal-i" key={i} style={{ backgroundImage: `url(${sized(img, 240, 50)})` }} aria-hidden="true" />
                    ))}
                  </div>
                  {/* Il compagno non e' una quarta funzione: e' la stessa promessa
                      ("un posto solo") estesa al viaggio vero. */}
                  <div className="led-shell-h">{t("led.app.chatHead")}</div>
                  <div className="led-chat">
                    <span className="led-msg me">{t("led.app.chatQ")}</span>
                    <span className="led-msg">{t("led.app.chatA")}</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── 07 · L'INIZIO ── */}
        <section className="led-end" id="s-end">
          <div className="led-end-photo" style={{ backgroundImage: `url(${sized(PHOTO.mountains)})` }} aria-hidden="true" />
          <div className="led-end-veil" aria-hidden="true" />
          <div className="led-container">
            <Stagger stagger={0.11} amount={0.25}>
              <StaggerItem as="div" className="led-eyebrow"><span className="d" />{t("led.end.eyebrow")}</StaggerItem>
              <StaggerItem as="h1">{t("led.end.t1")} <em>{t("led.end.t2")}</em></StaggerItem>
              <StaggerItem as="div">
                <button className="led-btn" onClick={onStart} data-testid="led-end-cta">
                  {t("led.end.cta")} <span className="ar">→</span>
                </button>
              </StaggerItem>
              {(itinCount || destCount) && (
                <StaggerItem as="div" className="led-end-stats">
                  {itinCount && <span><strong>{itinCount}</strong> {t("led.stats.itineraries")}</span>}
                  {destCount && <span><strong>{destCount}</strong> {t("led.stats.destinations")}</span>}
                </StaggerItem>
              )}
            </Stagger>
          </div>
        </section>

        {/* ── FOOTER — solo rotte che esistono ── */}
        <footer className="led-footer">
          <div className="led-container">
            <div className="led-footer-grid">
              <div>
                <div className="led-footer-mark"><BrandMark size={26} idPrefix="foot" /> MindRoute</div>
                <p className="led-footer-tag">{t("footer.tagline")}</p>
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
                <div className="led-footer-socials">
                  <a href="https://instagram.com/mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="Instagram">{I.ig}</a>
                  <a href="https://tiktok.com/@mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="TikTok">{I.tiktok}</a>
                </div>
              </div>
            </div>
            <div className="led-footer-base">
              <span>{t("footer.copyright")}</span>
              <span>{t("footer.affiliate")}</span>
            </div>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}
