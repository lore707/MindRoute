/**
 * DevPreview — SOLO sviluppo (montata in App.tsx dietro import.meta.env.DEV).
 * Renderizza AccountDashboard con dati mock e stub delle fetch /api/me/* e
 * /api/weather, così il layout della dashboard si può verificare con gli
 * screenshot headless ai 3 viewport SENZA login né DB locale
 * (regola: ogni modifica UI esce già ottimizzata pc/tablet/phone).
 * Non è linkata da nessuna parte e non finisce nel bundle di produzione
 * (route dev-only → tree-shake del ramo).
 */
import "leaflet/dist/leaflet.css";
import "@/styles/account-dashboard.css";
import "@/styles/atlas-journey.css";
import "@/styles/itinerary-dashboard.css";
import "@/styles/journey.css";
import { AccountDashboard } from "@/components/AccountDashboard";
import { JourneyView } from "@/components/JourneyView";
import { ItineraryDashboard } from "@/components/ItineraryDashboard";
import { RefinePanel } from "@/components/RefinePanel";
import QuizFast from "@/pages/QuizFast";
import type { AccountData } from "@/components/AccountCinematic";
import type { ItineraryData } from "@/components/ItineraryCinematic";

const img = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&fit=crop&crop=entropy&auto=format&q=70`;

// Pool verificato a occhio (stesso dell'audit landing 2026-07-15).
const P = {
  lofoten: img("1663428520845-056989f8a664"),
  procida: img("1628522241320-8135caa27dcf"),
  kyoto: img("1493976040374-85c8e12f0c0e"),
  patagonia: img("1637580980556-085dee659c7e"),
  azores: img("1620998051604-95ff17ccc537"),
  sahara: img("1489493585363-d69421e0edd3"),
  faroe: img("1554610975-1fa324cfb60b"),
  iceland: img("1476610182048-b716b8518aae"),
};

// Stub fetch: intercetta SOLO gli endpoint della home; il resto passa.
const realFetch = window.fetch.bind(window);
const mockJson = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } }));
window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith("/api/weather")) {
    return mockJson({ label: "Milano", tempC: 24, code: 1, isDay: true });
  }
  if (url.startsWith("/api/me/daily-picks")) {
    return mockJson({
      why: "Coerente con come viaggi: fuori rotta, lentezza, natura.",
      picks: [
        { name: "Azzorre, Portogallo", country: "Portogallo", imageUrl: P.azores, matchPct: 93, tags: ["nature", "ocean", "calm"] },
        { name: "Isole Faroe", country: "Danimarca", imageUrl: P.faroe, matchPct: 88, tags: ["cliffs", "silence"] },
        { name: "Islanda", country: "Islanda", imageUrl: P.iceland, matchPct: 84, tags: ["waterfalls", "wild"] },
      ],
    });
  }
  if (url.startsWith("/api/me/compass/answer")) return mockJson({ ok: true });
  if (url.startsWith("/api/me/moment-reflection")) {
    return new Promise((res) => setTimeout(() => res(new Response(
      JSON.stringify({ reflection: "Sembra che tu ricordi meno il posto e più come ti ha lasciato: forse è quello che cerchi davvero, ogni volta." }),
      { status: 200, headers: { "Content-Type": "application/json" } })), 900));
  }
  if (url.startsWith("/api/me/compass")) {
    return mockJson({ cards: [
      { id: "weather-grey", type: "reflection", icon: "🌧", title: "In fuga dal grigio?", sub: "Su Milano piove. Cosa ti manca oggi?", question: "Cosa ti manca oggi?", options: ["Silenzio", "Orizzonte", "Nuotare", "Calore"] },
      { id: "monotony-Europa", type: "growth", icon: "🧭", title: "Quasi ogni viaggio: Europa.", sub: "Ultimamente scegli il comfort. Sfidiamo la routine?", challenge: "Un continente mai toccato, niente mete famose." },
      { id: "unexplored-asia", type: "discovery", icon: "📖", title: "Un capitolo mancante: Asia.", sub: "Guarda e basta. Senza impegno.", destination: { name: "Luang Prabang, Laos", country: "Laos", imageUrl: P.kyoto, matchPct: 81 } },
      { id: "memory-12", type: "memory", icon: "🕰", title: "12 mesi fa: Procida.", sub: "Com'è cambiato il tuo modo di viaggiare, da allora?", href: "/itinerary/12" },
      { id: "season-journey", type: "journey", icon: "🗺", title: "Questa stagione merita un capitolo nuovo.", sub: "Solo se lo senti: generalo." },
    ]});
  }
  return realFetch(input as any, init);
}) as typeof window.fetch;

const trips = [
  { dest: "Pola, Istria", quote: "Mare senza folla, pietra e vento.", duration: "5 giorni", date: "giu 2026", rawDate: "2026-06-20", id: 12, continent: "Europa", img: P.procida, href: "/itinerary/12", emotion: "meaningful", budget: 640 },
  { dest: "Lofoten", quote: "Il silenzio che cercavi.", duration: "7 giorni", date: "feb 2026", rawDate: "2026-03-18", id: 11, continent: "Europa", img: P.lofoten, href: "/itinerary/11", emotion: "life-changing", budget: 1480, stops: [{ lat: 68.11, lng: 13.63 }, { lat: 68.2, lng: 13.6 }, { lat: 68.09, lng: 13.35 }, { lat: 67.88, lng: 13.19 }] },
  { dest: "Kyoto", quote: "Templi all'alba, un ritorno a un posto che sa di casa.", duration: "8 giorni", date: "nov 2025", rawDate: "2025-11-28", id: 10, continent: "Asia", img: P.kyoto, href: "/itinerary/10", taken: true, emotion: "revisited", budget: 2100, stops: [{ lat: 35.0, lng: 135.77 }, { lat: 34.99, lng: 135.67 }, { lat: 34.95, lng: 135.79 }, { lat: 35.03, lng: 135.72 }] },
  { dest: "Patagonia", quote: "Il posto dove hai scoperto il silenzio e la prospettiva.", duration: "10 giorni", date: "mar 2025", rawDate: "2025-07-18", id: 9, continent: "Americhe", img: P.patagonia, href: "/itinerary/9", taken: true, emotion: "life-changing", budget: 1240, stops: [{ lat: -49.33, lng: -72.89 }, { lat: -49.27, lng: -72.98 }, { lat: -50.49, lng: -73.14 }, { lat: -50.94, lng: -73.4 }] },
  { dest: "Marocco", quote: "Un ritorno alla semplicità e alla bellezza nei piccoli dettagli.", duration: "6 giorni", date: "ott 2024", rawDate: "2025-02-12", id: 8, continent: "Africa", img: P.sahara, href: "/itinerary/8", emotion: "loved", budget: 720, stops: [{ lat: 31.63, lng: -7.99 }, { lat: 31.51, lng: -5.11 }, { lat: 31.1, lng: -4.01 }] },
  { dest: "Azzorre", quote: "Verde vulcanico, dove il tuo amore per la natura selvaggia è iniziato.", duration: "6 giorni", date: "mag 2024", rawDate: "2024-10-01", id: 7, continent: "Europa", img: P.azores, href: "/itinerary/7", budget: 190 },
];

const data: AccountData = {
  userName: "Lorenzo",
  email: "preview@mindroute.dev",
  heroImg: P.procida,
  heroStats: [],
  profileQuote: "Viaggi per ritrovare il silenzio, non per riempire l'agenda.",
  profileByline: "Distillato dai tuoi 6 viaggi",
  traits: [
    { pct: "88%", name: "The Explorer", desc: "Cerchi l'autentico, fuori rotta", bar: 88 },
    { pct: "76%", name: "Slow travel", desc: "Bassa intensità · ritmo lento", bar: 76 },
    { pct: "71%", name: "Nature lover", desc: "Mare & natura prima della metropoli", bar: 71 },
    { pct: "64%", name: "Solo spirit", desc: "Silenzio e introspezione", bar: 64 },
  ],
  portrait: {
    available: true,
    confidence: "solid",
    tripCount: 6,
    snapshotCount: 7,
    seek: ["silenzio", "meraviglia", "natura", "staccare", "scoperta", "avventura"],
    avoid: ["luoghi affollati", "programmi rigidi"],
    ownWords: "Viaggiare è il modo in cui capisco chi sono.",
    axes: [],
    chosen: [{ name: "Kyoto, Giappone", date: null }, { name: "Lofoten, Norvegia", date: null }, { name: "Patagonia", date: null }],
    counts: { destinations: 6, days: 42, continents: 4 },
    revealed: { saidPole: "comfort", chosePole: "avventura", theme: "comfort ↔ avventura" },
    evolution: { phrase: "Un anno fa cercavi comfort, oggi cerchi posti remoti.", points: [{ whenLabel: "2024", isNow: false }, { whenLabel: "oggi", isNow: true }] },
    narrative: { portrait: "Viaggi per ritrovare il silenzio: scegli posti remoti, li vivi lentamente e torni ogni volta un po' più a nord.", paradox: "Cerchi la solitudine, ma i tuoi momenti migliori hanno sempre un volto dentro." },
  } as any,
  traitVector: { exposure: 0.78, comfort: 0.62, social: 0.34, matter: 0.86, structure: 0.71 },
  traitSnapshots: [
    { createdAt: "2024-06-10", traits: { exposure: 0.56, comfort: 0.50, social: 0.55, matter: 0.60, structure: 0.52 }, source: "quiz" },
    { createdAt: "2024-10-01", traits: { exposure: 0.58, comfort: 0.52, social: 0.40, matter: 0.63, structure: 0.54 }, source: "pick" }, // social ↓ → Solo spirit (Azzorre)
    { createdAt: "2025-02-12", traits: { exposure: 0.60, comfort: 0.54, social: 0.38, matter: 0.78, structure: 0.56 }, source: "pick" }, // matter ↑ → Nature seeker (Marocco)
    { createdAt: "2025-07-18", traits: { exposure: 0.73, comfort: 0.56, social: 0.37, matter: 0.80, structure: 0.58 }, source: "pick" }, // exposure ↑ → Deep explorer (Patagonia)
    { createdAt: "2025-11-28", traits: { exposure: 0.74, comfort: 0.57, social: 0.36, matter: 0.82, structure: 0.70 }, source: "pick" }, // structure ↑ → Freedom lover (Kyoto)
    { createdAt: "2026-03-18", traits: { exposure: 0.76, comfort: 0.68, social: 0.35, matter: 0.84, structure: 0.70 }, source: "pick" }, // comfort ↑ → Adventure seeker (Lofoten)
    { createdAt: "2026-06-20", traits: { exposure: 0.78, comfort: 0.62, social: 0.34, matter: 0.86, structure: 0.71 }, source: "pick" }, // comfort ↓ → Comfort lover (Pola)
  ],
  traitHeadline: "Stai esplorando posti sempre più remoti e restando più a lungo: il tuo bisogno di solitudine e autenticità sta crescendo.",
  patterns: { topContinentLabel: "Europa", avgDays: 7, shortTripBias: false, longTripBias: false, tripCount: 6 },
  savedMoments: [
    { id: 41, createdAt: "2026-06-14", itineraryId: 12, momentSnapshot: { title: "Il silenzio lassù colpisce diverso.", image_url: P.lofoten, location_name: "Reine, Lofoten" } },
    { id: 33, createdAt: "2026-03-10", itineraryId: 10, momentSnapshot: { title: "Tramonto senza telefono. Presente al 100%.", image_url: P.procida, location_name: "Cinque Terre, Italia" } },
    { id: 27, createdAt: "2025-11-02", itineraryId: 9, momentSnapshot: { title: "Muri blu e mattine lente.", image_url: P.sahara, location_name: "Chefchaouen, Marocco" } },
    { id: 18, createdAt: "2025-05-21", itineraryId: 8, momentSnapshot: { title: "Natura selvaggia e oceano-terapia.", image_url: P.azores, location_name: "Madeira, Portogallo" } },
  ],
  continueItems: [],
  trips,
  stats: [],
  statsNarrative: "",
  atlas: {
    places: [
      { name: "Pola", fullName: "Pola, Croazia", lat: 44.87, lng: 13.85, trips: 1, days: 5, lastDate: null, continent: "Europa", heroImageUrl: P.procida, href: "/itinerary/12" },
      { name: "Lofoten", fullName: "Lofoten, Norvegia", lat: 68.2, lng: 13.6, trips: 1, days: 7, lastDate: null, continent: "Europa", heroImageUrl: P.lofoten, href: "/itinerary/11" },
      { name: "Kyoto", fullName: "Kyoto, Giappone", lat: 35.0, lng: 135.77, trips: 1, days: 8, lastDate: null, continent: "Asia", heroImageUrl: P.kyoto, href: "/itinerary/10" },
      { name: "El Chaltén", fullName: "El Chaltén, Argentina", lat: -49.33, lng: -72.89, trips: 1, days: 10, lastDate: null, continent: "Americhe", heroImageUrl: P.patagonia, href: "/itinerary/9" },
      { name: "Merzouga", fullName: "Merzouga, Marocco", lat: 31.1, lng: -4.01, trips: 1, days: 6, lastDate: null, continent: "Africa", heroImageUrl: P.sahara, href: "/itinerary/8" },
      { name: "Azzorre", fullName: "Azzorre, Portogallo", lat: 38.66, lng: -27.22, trips: 1, days: 6, lastDate: null, continent: "Europa", heroImageUrl: P.azores, href: "/itinerary/7" },
    ],
    unlocated: [],
    stats: { trips: 6, days: 42, cities: 5, continents: 4 },
  },
  settings: [{ label: "Lingua", value: "IT" }],
  onNewItinerary: () => {},
  onSecondaryCta: () => {},
  onChallenge: () => {},
};

/* ── Mock Journey (workspace viaggio) — Salonicco, Giorno 2 ── */
const S = { lat: 40.6335, lng: 22.9445 };
// Foto mock verificate dal pool (i veri momenti hanno le loro Unsplash geo-grounded).
const M = {
  market: P.sahara,
  cafe: P.kyoto,
  seafront: P.azores,
  tower: P.faroe,
  sunset: P.iceland,
};
const jrMoments = [
  { id: "m1", t: "Mattina", ic: "🍽", band: "mattina" as const, startTime: "09:30", endTime: "11:00", kindLabel: "Mercato", durationLabel: "~1.5h", type: "food",
    title: "Mercato Modiano", locationName: "Mercato Modiano", imageUrl: M.market, transport: "A piedi · ~10 min", lat: S.lat + 0.001, lng: S.lng + 0.001,
    desc: "Arrivate quando i banchi stanno ancora sistemando la merce — olive di venti tipi, formaggi che non si trovano fuori dalla regione, il rumore delle voci e del mercato vero.",
    why: "È il mercato più autentico di Salonicco, meno turistico, perfetto per iniziare la giornata e in linea con il tuo amore per i mercati.",
    planB: "Se è chiuso → Mercato Kapani, ~1.5km, 20 min a piedi",
    cta: "Prenota un tavolo · Taverna Aktaion", ctaUrl: "https://example.com", ctaProvider: "tripadvisor", ctaStatus: "reserve_recommended" as const, dayNumber: 2 },
  { id: "m2", t: "Pranzo", ic: "☕", band: "pranzo" as const, startTime: "11:15", kindLabel: "Caffè", durationLabel: "45 min", type: "food",
    title: "Caffè Coloniale", locationName: "Caffè Coloniale", imageUrl: M.cafe, transport: "A piedi · ~8 min", lat: S.lat + 0.003, lng: S.lng + 0.004,
    desc: "Perfetto per una pausa come piace a te: soffitti alti, marmo, un caffè greco lento mentre fuori la città accelera.",
    why: "Un angolo fuori dal tempo, tranquillo, dove rallentare tra due tappe.", dayNumber: 2 },
  { id: "m3", t: "Pomeriggio", ic: "🌊", band: "pomeriggio" as const, startTime: "12:30", kindLabel: "Passeggiata", durationLabel: "1.5h", type: "walk",
    title: "Passeggiata sul lungomare", locationName: "Nea Paralia", imageUrl: M.seafront, transport: "A piedi · ~5 min", lat: S.lat - 0.002, lng: S.lng + 0.006,
    desc: "La luce qui, a quest'ora, è semplicemente perfetta. Vista sul golfo, sculture contemporanee, il ritmo lento del mare.",
    why: "La tua giornata compatta merita un respiro lungo: mare, luce, niente da prenotare.", dayNumber: 2 },
  { id: "m4", t: "Pomeriggio", ic: "🗼", band: "pomeriggio" as const, startTime: "15:30", kindLabel: "Esperienza", durationLabel: "1h", costLabel: "€6", type: "experience",
    title: "Torre Bianca", locationName: "Torre Bianca", imageUrl: M.tower, transport: "A piedi · ~12 min", lat: S.lat - 0.004, lng: S.lng + 0.008,
    desc: "Simbolo della città e punto foto imperdibile. Sali in cima: la vista sul golfo ripaga ogni gradino.",
    why: "L'icona di Salonicco, e da lassù capisci la geografia di tutto quello che hai camminato.",
    cta: "Prenota il biglietto", ctaUrl: "https://example.com", ctaProvider: "getyourguide", ctaPrice: "€6", ctaStatus: "bookable_now" as const, dayNumber: 2 },
  { id: "m5", t: "Sera", ic: "🌇", band: "sera" as const, startTime: "20:00", kindLabel: "Tramonto", durationLabel: "1h", type: "view",
    title: "Cena vista tramonto a Ano Poli", locationName: "Ano Poli", imageUrl: M.sunset, lat: S.lat + 0.006, lng: S.lng + 0.002,
    desc: "La città alta, i vicoli ottomani, e una taverna dove il tramonto cade dritto sul golfo. Chiusura perfetta.",
    why: "Il quartiere più autentico per l'ultima sera: lento, panoramico, lontano dalla folla.", dayNumber: 2 },
];
const MOCK_ITIN: ItineraryData = {
  destination: "Salonicco, Grecia", subtitle: "Esperienza", country: "Grecia", duration: "5 giorni",
  heroImg: M.seafront, manifesto: "", highlights: [],
  days: [
    { n: 1, arc: "Arrivo", title: "Arrivo e prima passeggiata", sub: "Dal volo alla città vecchia.", img: M.tower, date: "13 SET" },
    { n: 2, arc: "Esperienza", title: "Il cuore di Salonicco", sub: "Mercati, mare e la torre simbolo.", img: M.market, date: "14 SET" },
    { n: 3, arc: "Decantazione", title: "Ritmi lenti", sub: "Caffè, quartieri, ultimo sguardo.", img: M.cafe, date: "15 SET" },
  ],
  momentsByDay: { 1: [], 2: jrMoments as any, 3: [] },
  closingQuote: "",
  mapPoints: jrMoments.map((m, i) => ({
    x: 0, y: 0, label: m.title, lat: m.lat, lng: m.lng, day: 2, momentId: m.id, imageUrl: m.imageUrl,
    durationLabel: m.durationLabel, kindLabel: m.kindLabel, desc: m.desc, type: m.type, category: (m.type === "food" ? "food" : m.type === "experience" ? "experience" : "sight"),
    bookable: !!m.cta, ctaUrl: m.ctaUrl, cta: m.cta, ctaProvider: m.ctaProvider, ctaPrice: m.ctaPrice, slot: `${i}`,
  })) as any,
  mapCenter: S, geometry: { spanKm: 8.2, walkMinutes: 112, walkable: true },
};
const MOCK_RAW = {
  schemaVersion: 2, destinationName: "Salonicco, Grecia", days: [
    { day_number: 1, moments: [] }, { day_number: 3, moments: [] },
    {
      day_number: 2, date: "14 SET", walking_distance_km: 6.5, cost_bookable_total: 6, cost_onsite_estimate: 36,
      energy_note: "Hai scelto una giornata compatta. Tutti gli spostamenti sono fattibili a piedi: goditi il ritmo lento.",
      moments: [
        { type: "food", title_operational: "Mercato Modiano", location_name: "Mercato Modiano", duration_min: 90, transport_to_next: { mode: "A piedi", duration_min: 10 }, booking: { affiliate_url: "https://x", status: "reserve_recommended", display_label: "Taverna Aktaion" } },
        { type: "food", title_operational: "Caffè Coloniale", location_name: "Caffè Coloniale", duration_min: 45, transport_to_next: { mode: "A piedi", duration_min: 8 } },
        { type: "walk", title_operational: "Lungomare", location_name: "Nea Paralia", duration_min: 90, transport_to_next: { mode: "A piedi", duration_min: 5 } },
        { type: "experience", title_operational: "Torre Bianca", location_name: "Torre Bianca", duration_min: 60, transport_to_next: { mode: "Bus / Taxi", duration_min: 12 }, booking: { affiliate_url: "https://x", status: "bookable_now", display_label: "Torre Bianca · biglietto" } },
        { type: "view", title_operational: "Ano Poli", location_name: "Ano Poli", duration_min: 60 },
      ],
    },
  ],
};

export default function DevPreview() {
  const view = (() => { try { return new URLSearchParams(window.location.search).get("view"); } catch { return null; } })();
  const debug = (() => { try { return new URLSearchParams(window.location.search).get("debug") === "1"; } catch { return false; } })();
  if (debug) {
    setTimeout(() => {
      const vw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const culprits: string[] = [`vw=${vw} sw=${sw}`];
      if (sw > vw + 1) {
        for (const el of Array.from(document.querySelectorAll("*"))) {
          const r = el.getBoundingClientRect();
          if (r.width > vw + 1 || r.right > vw + 8) {
            culprits.push(`${el.tagName.toLowerCase()}.${String((el as HTMLElement).className || "").slice(0, 44)} w=${Math.round(r.width)} r=${Math.round(r.right)}`);
            if (culprits.length >= 14) break;
          }
        }
      }
      let box = document.getElementById("ovf-debug");
      if (!box) {
        box = document.createElement("div");
        box.id = "ovf-debug";
        box.style.cssText = "position:fixed;top:0;left:0;z-index:99999;background:#000;color:#0f0;font:10px monospace;padding:6px;max-width:96vw;white-space:pre;";
        document.body.appendChild(box);
      }
      box.textContent = culprits.join("\n");
    }, 2500);
  }
  // Skeleton della dashboard (stato loading di MyAccount): ?view=skel
  if (view === "skel") {
    return (
      <div className="mr-skel" aria-busy="true">
        <div className="sk-side" />
        <div className="sk-main">
          <div className="sk-topbar" />
          <div className="sk-hero" />
          <div className="sk-row"><div className="sk-card" /><div className="sk-card" /></div>
          <div className="sk-row three"><div className="sk-card sm" /><div className="sk-card sm" /><div className="sk-card sm" /></div>
        </div>
      </div>
    );
  }
  // Itinerario completo (Panoramica + banner L2): ?view=itinerary (&rmin=1 = badge mini)
  if (view === "itinerary") {
    const mockProfile = { days: 5, budget: "medium", departure: "Milano", _l1: { mode: "meta", city: "Salonicco" } };
    return (
      <div className="account-dash itinerary-dash" style={{ minHeight: "100vh" }}>
        <ItineraryDashboard
          data={MOCK_ITIN} itinerary={MOCK_RAW} affiliateUrls={{}} profilingInput={mockProfile}
          itineraryId={2} savedMomentIds={new Set()} onToggleSaved={() => {}}
        />
        <RefinePanel itineraryId={2} profilingInput={mockProfile} schemaVersion={2} lang="it" onRefined={() => {}} />
      </div>
    );
  }
  // Quiz L1 senza auth-gate (il gate vive in App.tsx): ?view=quiz&mode=…&gen=1
  // Lo <style> forza visibile il contenuto animato da framer-motion: sotto
  // virtual-time headless l'animazione resta a opacity:0 e lo screenshot
  // uscirebbe vuoto (solo in preview, la prod anima normalmente).
  if (view === "quiz") return (
    <>
      <style>{`.quiz-cinematic .qc-container > div { opacity: 1 !important; transform: none !important; }`}</style>
      <QuizFast />
    </>
  );
  if (view === "journey") {
    return (
      <div className="account-dash itinerary-dash">
        <main className="main">
          <JourneyView data={MOCK_ITIN} itinerary={MOCK_RAW} itineraryId={2}
            savedMomentIds={new Set(["m3"])} onToggleSaved={() => {}} onBook={() => {}} />
        </main>
      </div>
    );
  }
  return <AccountDashboard data={data} />;
}
