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
  { dest: "Pola, Istria", quote: "Mare senza folla, pietra e vento.", duration: "5 giorni", date: "giu 2026", continent: "Europa", img: P.procida, href: "/itinerary/12" },
  { dest: "Lofoten", quote: "Il silenzio che cercavi.", duration: "7 giorni", date: "feb 2026", continent: "Europa", img: P.lofoten, href: "/itinerary/11" },
  { dest: "Kyoto", quote: "Templi all'alba.", duration: "8 giorni", date: "nov 2025", continent: "Asia", img: P.kyoto, href: "/itinerary/10", taken: true },
  { dest: "Patagonia", quote: "Vento e granito.", duration: "10 giorni", date: "mar 2025", continent: "Americhe", img: P.patagonia, href: "/itinerary/9", taken: true },
  { dest: "Marocco", quote: "Dune e mercati.", duration: "6 giorni", date: "ott 2024", continent: "Africa", img: P.sahara, href: "/itinerary/8" },
  { dest: "Azzorre", quote: "Verde vulcanico.", duration: "6 giorni", date: "mag 2024", continent: "Europa", img: P.azores, href: "/itinerary/7" },
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
  portrait: null,
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
