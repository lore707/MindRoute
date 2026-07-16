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
import { AccountDashboard } from "@/components/AccountDashboard";
import type { AccountData } from "@/components/AccountCinematic";

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
  { dest: "Pola, Istria", quote: "Mare senza folla, pietra e vento.", duration: "5 giorni", date: "giu 2026", rawDate: "2026-06-20", id: 12, continent: "Europa", img: P.procida, href: "/itinerary/12" },
  { dest: "Lofoten", quote: "Il silenzio che cercavi.", duration: "7 giorni", date: "feb 2026", rawDate: "2026-03-18", id: 11, continent: "Europa", img: P.lofoten, href: "/itinerary/11" },
  { dest: "Kyoto", quote: "Templi all'alba.", duration: "8 giorni", date: "nov 2025", rawDate: "2025-11-28", id: 10, continent: "Asia", img: P.kyoto, href: "/itinerary/10", taken: true },
  { dest: "Patagonia", quote: "Vento e granito.", duration: "10 giorni", date: "mar 2025", rawDate: "2025-07-18", id: 9, continent: "Americhe", img: P.patagonia, href: "/itinerary/9", taken: true },
  { dest: "Marocco", quote: "Dune e mercati.", duration: "6 giorni", date: "ott 2024", rawDate: "2025-02-12", id: 8, continent: "Africa", img: P.sahara, href: "/itinerary/8" },
  { dest: "Azzorre", quote: "Verde vulcanico.", duration: "6 giorni", date: "mag 2024", rawDate: "2024-10-01", id: 7, continent: "Europa", img: P.azores, href: "/itinerary/7" },
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
      { name: "Pola", fullName: "Pola, Croazia", lat: 44.87, lng: 13.85, trips: 1, days: 5, lastDate: null, continent: "Europa", heroImageUrl: null, href: "/itinerary/12" },
      { name: "Lofoten", fullName: "Lofoten, Norvegia", lat: 68.2, lng: 13.6, trips: 1, days: 7, lastDate: null, continent: "Europa", heroImageUrl: null, href: "/itinerary/11" },
      { name: "Kyoto", fullName: "Kyoto, Giappone", lat: 35.0, lng: 135.77, trips: 1, days: 8, lastDate: null, continent: "Asia", heroImageUrl: null, href: "/itinerary/10" },
      { name: "El Chaltén", fullName: "El Chaltén, Argentina", lat: -49.33, lng: -72.89, trips: 1, days: 10, lastDate: null, continent: "Americhe", heroImageUrl: null, href: "/itinerary/9" },
      { name: "Merzouga", fullName: "Merzouga, Marocco", lat: 31.1, lng: -4.01, trips: 1, days: 6, lastDate: null, continent: "Africa", heroImageUrl: null, href: "/itinerary/8" },
    ],
    unlocated: [],
    stats: { trips: 6, days: 42, cities: 5, continents: 4 },
  },
  settings: [{ label: "Lingua", value: "IT" }],
  onNewItinerary: () => {},
  onSecondaryCta: () => {},
  onChallenge: () => {},
};

export default function DevPreview() {
  return <AccountDashboard data={data} />;
}
