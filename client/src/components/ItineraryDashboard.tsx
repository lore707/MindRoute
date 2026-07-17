/**
 * ItineraryDashboard.tsx
 * ───────────────────────────────────────────────────────────────
 * La sezione itinerario in versione "dashboard" — stessa app-shell della
 * dashboard account (sidebar a icone + topbar + viste a tab), riusa i token e
 * lo shell `.account-dash` (vedi styles/itinerary-dashboard.css).
 *
 * Viste: Panoramica · Giorni · Mappa · Pratica · Prenota(Missioni).
 * Presentational: consuma lo stesso `ItineraryData` di ItineraryRedesign +
 * l'itinerario grezzo (per budget/come-arrivare/bagaglio) + gli affiliateUrls.
 * L'editing (Modalità Cura) è delegato al collaudato ItineraryRedesign tramite
 * `onEdit` → il parent fa lo switch, così zero regressioni sul salvataggio.
 *
 * Bilingue (EN/IT) via useI18n. I testi "voce" generati dall'Aot (manifesto,
 * descrizioni dei momenti) arrivano già nella lingua dell'utente.
 * ─────────────────────────────────────────────────────────────── */

import { Suspense, lazy, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import {
  Compass, Layers, CalendarDays, Map as MapIcon, Backpack, Ticket,
  ExternalLink, Pencil, Printer, Share2, RotateCcw, Heart, ArrowLeft, Sparkles,
} from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { apiRequest } from "@/lib/queryClient";
import { shouldAskCheckin } from "@shared/trip-status";
import { computeCoverage } from "@shared/profile-coverage";
import { useI18n } from "@/lib/i18n";
import type { ItineraryData, Moment } from "./ItineraryCinematic";
import { trackAffiliate, affiliateProvider } from "@/lib/analytics";
import { FlowNavLogo } from "@/components/FlowNav";
import { JourneyView } from "@/components/JourneyView";

const bg = (url: string, w: number, q = 70) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

// Leaflet (~150KB) caricato solo quando si apre il tab Mappa.
const RouteMap = lazy(() => import("@/components/RouteMap"));

// Redesign Journey (2026-07): "days"+"map"+"practical" fusi in un unico
// "journey" (per-giorno, 3 modi sincronizzati). "days"/"map" restano come id
// interni SOLO per i deep-link legacy (es. RouteMap onOpenDay), reindirizzati
// a "journey". La nav mostra: Visione · Journey · Prenota.
type ViewId = "overview" | "journey" | "days" | "map" | "practical" | "missions";

type Props = {
  data: ItineraryData;
  itinerary: any;
  affiliateUrls: Record<string, string>;
  profilingInput: any;
  onSavePdf?: () => void;
  onStartOver?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  itineraryId?: number;
  savedMomentIds?: Set<string>;
  onToggleSaved?: (momentId: string, moment: Moment) => void;
  onDatesConfirmed?: () => void;
  onBookingUpdated?: () => void;
};

const SEG_COLORS = ["#E94560", "#D4A853", "#6FB4A8", "#9D7EBC", "#5E8CB6", "#C77B5A"];

/* ── checklist prenotazioni (persistita in localStorage) ── */
// Voce di prenotazione concreta: la scelta già fatta (nome reale, perché, prezzo
// stimato, distanza) + una CTA primaria + alternative. Essenziale vs consigliata.
type BookItem = {
  id: string; tier: "essential" | "recommended"; ic: string;
  title: string; generic: string; facts: string[]; why?: string; day?: number | null;
  url?: string; cta: string; provider?: string; alt: { label: string; url: string }[];
};
const MISSION_DEFS = [
  { id: "flight", ic: "✈️", nameKey: "itd.mis.flight", metaKey: "itd.mis.flightMeta", urlKeys: ["expedia_flights"], day: 1 },
  { id: "hotel", ic: "🏨", nameKey: "itd.mis.hotel", metaKey: "itd.mis.hotelMeta", urlKeys: ["hotels", "tablet_hotels"], day: 1 },
  { id: "experience", ic: "🎟", nameKey: "itd.mis.experience", metaKey: "itd.mis.experienceMeta", urlKeys: ["civitatis", "musement", "klook", "viator"], day: null },
  { id: "restaurant", ic: "🍽", nameKey: "itd.mis.restaurant", metaKey: "itd.mis.restaurantMeta", urlKeys: ["tripadvisor"], day: 1 },
  { id: "transfer", ic: "🚌", nameKey: "itd.mis.transfer", metaKey: "itd.mis.transferMeta", urlKeys: ["flixbus", "samboat", "expedia_cars"], day: null },
] as const;

/* Prenotazioni server-backed (tripMeta.booked / tripMeta.affiliate_clicks).
 * Il flag "confermato" è accettato dal server SOLO se il click sul link di
 * prenotazione di quella voce è stato registrato — niente spunte a caso, e
 * lo stato sopravvive a device diversi (prima viveva in localStorage). */
function useBookings(itineraryId: number | undefined, itinerary: any, onUpdated?: () => void) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [clicked, setClicked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const meta = (itinerary?.tripMeta ?? {}) as Record<string, any>;
    const b = (meta.booked ?? {}) as Record<string, unknown>;
    const c = (meta.affiliate_clicks ?? {}) as Record<string, unknown>;
    setChecked(Object.fromEntries(Object.keys(b).map(k => [k, true])));
    setClicked(Object.fromEntries(Object.keys(c).map(k => [k, true])));
  }, [itineraryId, itinerary?.tripMeta]);

  // Fire-and-forget con keepalive: il click apre il provider in un altro tab,
  // la richiesta deve sopravvivere comunque.
  const logClick = (id: string | null) => {
    if (!itineraryId || !id) return;
    setClicked(prev => (prev[id] ? prev : { ...prev, [id]: true }));
    fetch(`/api/itinerary/${itineraryId}/affiliate-click`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: id }), keepalive: true,
    }).catch(() => { /* best-effort */ });
  };

  const toggle = async (id: string) => {
    if (!itineraryId) return;
    const next = !checked[id];
    setChecked(prev => ({ ...prev, [id]: next })); // ottimistico
    try {
      const r = await fetch(`/api/itinerary/${itineraryId}/booked`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: id, value: next }),
      });
      if (!r.ok) throw new Error("booked failed");
      onUpdated?.();
    } catch {
      setChecked(prev => ({ ...prev, [id]: !next })); // revert
    }
  };

  return { checked, clicked, logClick, toggle };
}

/* ── safe JSON helpers ── */
function tryParse(s: any): any { try { return JSON.parse(s); } catch { return null; } }
function firstInt(s: string | number | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  const m = String(s).replace(/[.\s]/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

function Html({ html, as = "span", className }: { html: string; as?: any; className?: string }) {
  const Tag = as;
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── grounded "where to stay" advantage ──────────────────────────────────────
 * Ricavato SOLO dai punti già geocodificati (Nominatim, non dal modello): qual è
 * la zona che tiene più tappe a piedi. Non vende "un hotel", vende il vantaggio
 * concreto da mostrare accanto al CTA alloggio — meno trasferimenti = più viaggio.
 * Stessa matematica honest del resto del progetto: haversine × 1.3 a 4.5 km/h. */
const WALK_KM = 1.3; // ~20 min a piedi: soglia oltre cui non è più "a piedi"
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const walkMin = (km: number) => Math.max(1, Math.round(((km * 1.3) / 4.5) * 60));

type StayAdvantage = { area: string; nearestMin: number; walkable: number; total: number };
function computeStayAdvantage(mapPoints: ItineraryData["mapPoints"]): StayAdvantage | null {
  const pts = (mapPoints ?? []).filter(p => p.lat != null && p.lng != null) as
    Array<{ lat: number; lng: number; label: string; category?: string }>;
  const stops = pts.filter(p => p.category !== "lodging" && p.category !== "custom" && p.label);
  if (stops.length < 3) return null; // sotto le 3 tappe il "dove dormire" non è un vantaggio reale

  // Anchor = hotel consigliato se l'itinerario ne geocodifica uno; altrimenti la
  // tappa che tiene più tappe a piedi (medoid pesato): la base ottimale dedotta
  // dalla sola geografia delle tappe.
  const lodging = pts.find(p => p.category === "lodging");
  let anchor: { lat: number; lng: number; label: string };
  if (lodging) {
    anchor = lodging;
  } else {
    let best = stops[0], bestCount = -1, bestSum = Infinity;
    for (const c of stops) {
      let count = 0, sum = 0;
      for (const s of stops) {
        if (s === c) continue;
        const d = haversineKm(c, s); sum += d; if (d <= WALK_KM) count++;
      }
      if (count > bestCount || (count === bestCount && sum < bestSum)) { best = c; bestCount = count; bestSum = sum; }
    }
    anchor = best;
  }

  let nearest = Infinity, walkable = 0;
  for (const s of stops) {
    if (s.lat === anchor.lat && s.lng === anchor.lng) continue;
    const d = haversineKm(anchor, s);
    if (d < nearest) nearest = d;
    if (d <= WALK_KM) walkable++;
  }
  // Mostriamo solo quando c'è un vantaggio onesto da vendere (≥2 tappe a piedi).
  if (walkable < 2 || !isFinite(nearest)) return null;
  return { area: anchor.label, nearestMin: walkMin(nearest), walkable, total: stops.length };
}

/* ── Date reali del viaggio ──
 * Il quiz spesso cattura solo il mese → le date generate sono un placeholder.
 * Qui l'utente consolida QUANDO parte davvero: è il prerequisito perché il
 * sistema sappia quando il viaggio è passato (→ "ci sei andato?"). Si mostra
 * finché non sono confermate; dopo la conferma sparisce.
 */
function TravelDatesBanner({ itineraryId, tripMeta, lang, onConfirmed }: {
  itineraryId?: number; tripMeta: any; lang: string; onConfirmed?: () => void;
}) {
  const L = (it: string, en: string) => (lang === "it" ? it : en);
  const confirmed = tripMeta?.travel_dates_confirmed === true;
  const [dismissed, setDismissed] = useState(false);
  const [from, setFrom] = useState<string>(tripMeta?.travel_dates?.start ?? "");
  const [to, setTo] = useState<string>(tripMeta?.travel_dates?.end ?? "");
  // Opt-in email GDPR: MAI pre-spuntata. Il consenso è contestuale al viaggio.
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (confirmed || dismissed || !itineraryId) return null;

  const valid = !!from && !!to && to >= from;
  const save = async () => {
    if (!valid || saving) return;
    setSaving(true); setErr(null);
    try {
      await apiRequest("PATCH", `/api/itinerary/${itineraryId}/travel-dates`, {
        start: from, end: to, ...(emailOptIn ? { emailOptIn: true } : {}),
      });
      onConfirmed?.();
    } catch {
      setErr(L("Non è stato possibile salvare le date. Riprova.", "Couldn't save the dates. Try again."));
      setSaving(false);
    }
  };

  return (
    <section className="sec it-dates-banner">
      <div className="it-dates-in">
        <div className="it-dates-copy">
          <div className="it-dates-eyebrow">{L("Quando parti davvero?", "When are you actually going?")}</div>
          <p className="it-dates-sub">
            {L("Fissa le date reali: il tuo compagno di viaggio saprà a che punto sei — e a viaggio finito potrà chiederti com'è andata.",
               "Set your real dates: your travel companion will know where you are — and once the trip is over it can ask how it went.")}
          </p>
        </div>
        <div className="it-dates-form">
          <label className="it-dates-field">
            <span>{L("Partenza", "Departure")}</span>
            <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="it-dates-field">
            <span>{L("Rientro", "Return")}</span>
            <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
          </label>
          <button className="it-dates-save" disabled={!valid || saving} onClick={save}>
            {saving ? L("Salvo…", "Saving…") : L("Conferma date", "Confirm dates")}
          </button>
          <button className="it-dates-skip" onClick={() => setDismissed(true)}>
            {L("Non ora", "Not now")}
          </button>
        </div>
      </div>
      <label className="it-dates-optin">
        <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
        <span>
          {L("Avvisami via email quando è il momento di prenotare e per consigli su questo viaggio.",
             "Email me when it's time to book, plus tips for this trip.")}
          {" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">{L("Privacy", "Privacy")}</a>
        </span>
      </label>
      {err && <div className="it-dates-err">{err}</div>}
    </section>
  );
}

/* ── Check-in "ci sei andato?" ──
 * A viaggio finito (date reali confermate + fine passata) e ancora senza
 * risposta, chiediamo se il viaggio è stato fatto. È il segnale che rende reali
 * gli insight sul profilo. Dopo la risposta sparisce (trip_status ≠ planned).
 */
function TripCheckinBanner({ itineraryId, itinerary, lang, onAnswered }: {
  itineraryId?: number; itinerary: any; lang: string; onAnswered?: () => void;
}) {
  const L = (it: string, en: string) => (lang === "it" ? it : en);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState<null | "confirmed" | "skipped">(null);
  const [err, setErr] = useState<string | null>(null);

  if (dismissed || !itineraryId || !shouldAskCheckin(itinerary)) return null;

  const answer = async (status: "confirmed" | "skipped") => {
    if (saving) return;
    setSaving(status); setErr(null);
    try {
      await apiRequest("PATCH", `/api/itinerary/${itineraryId}/trip-status`, { status });
      onAnswered?.();
    } catch {
      setErr(L("Non è stato possibile salvare. Riprova.", "Couldn't save. Try again."));
      setSaving(null);
    }
  };

  const dest = itinerary?.destinationName ?? L("questo viaggio", "this trip");
  return (
    <section className="sec it-checkin-banner">
      <div className="it-dates-in">
        <div className="it-dates-copy">
          <div className="it-dates-eyebrow">{L(`Ci sei andato/a a ${dest}?`, `Did you make it to ${dest}?`)}</div>
          <p className="it-dates-sub">
            {L("Dimmelo e il tuo profilo di viaggiatore diventa reale: le prossime proposte impareranno da dove sei stato davvero, non solo da ciò che sognavi.",
               "Tell me and your traveller profile becomes real: your next matches learn from where you actually went, not just what you dreamed.")}
          </p>
        </div>
        <div className="it-dates-form">
          <button className="it-dates-save" disabled={!!saving} onClick={() => answer("confirmed")}>
            {saving === "confirmed" ? L("Salvo…", "Saving…") : L("Sì, ci sono stato/a", "Yes, I went")}
          </button>
          <button className="it-checkin-no" disabled={!!saving} onClick={() => answer("skipped")}>
            {saving === "skipped" ? L("Salvo…", "Saving…") : L("No, saltato", "No, skipped it")}
          </button>
          <button className="it-dates-skip" onClick={() => setDismissed(true)}>
            {L("Non ora", "Not now")}
          </button>
        </div>
      </div>
      {err && <div className="it-dates-err">{err}</div>}
    </section>
  );
}

export function ItineraryDashboard({
  data, itinerary, affiliateUrls, profilingInput,
  onSavePdf, onStartOver, onEdit, onShare, itineraryId, savedMomentIds, onToggleSaved, onDatesConfirmed, onBookingUpdated,
}: Props) {
  const { t, lang } = useI18n();
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewId>("overview");
  const [stuck, setStuck] = useState(false);

  const days = data.days;
  const dayCount = days.length;
  const [activeDay, setActiveDay] = useState<number>(days[0]?.n ?? 1);
  const [openDay, setOpenDay] = useState<number | null>(days[0]?.n ?? null);
  const [, setActiveMoment] = useState(0);
  // Collegamento Mappa→Giorni: il momento su cui scrollare dopo il salto.
  const [pendingMoment, setPendingMoment] = useState<string | null>(null);
  // "Altre opzioni" aperte per voce di prenotazione (sezione Prenota).
  const [altOpen, setAltOpen] = useState<Set<string>>(new Set());
  const toggleAlt = (id: string) => setAltOpen(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const { checked, clicked, logClick, toggle } = useBookings(itineraryId, itinerary, onBookingUpdated);
  // Il PDF completo si sblocca con gli essenziali veri: volo + alloggio confermati.
  const pdfUnlocked = !!(checked.flight && checked.hotel);

  // Profiling profondo (L2): la card in Panoramica è la CASA permanente del
  // "completa il profilo" — il banner flottante è solo l'invito, riducibile.
  // Coverage reale dal profilo; solo per itinerari v2 (refine disponibile).
  const refineCoverage = useMemo(() => computeCoverage(profilingInput ?? {}), [profilingInput]);
  const refineAvailable = (itinerary as any)?.schemaVersion === 2 && refineCoverage.pct < 100;

  // Un CTA di prenotazione (dai Giorni o dalla card sulla Mappa) registra il
  // CLICK sulla voce corrispondente della sezione Prenota: è il click che
  // sblocca la conferma manuale (e il server lo pretende).
  const bookIdForMoment = (type?: string, day?: number | null): string | null => {
    if (type === "transport") return (day && day > 1) ? "transfer" : "flight";
    if (type === "accommodation") return "hotel";
    if (type === "experience") return "experience";
    if (type === "food") return "food";
    return null;
  };
  const markClicked = (type?: string, day?: number | null) => logClick(bookIdForMoment(type, day));

  const isMobile = useMemo(() => typeof window !== "undefined" && window.innerWidth < 768, []);
  const heroW = isMobile ? 1100 : 1900;
  const cardW = isMobile ? 560 : 800;

  const tx = (key: string, vars: Record<string, string | number>) => {
    let s = t(key);
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  };

  function go(id: ViewId) { setView(id); window.scrollTo({ top: 0, behavior: "auto" }); }

  // Dopo un salto Mappa→Giorni, porta in vista il momento corrispondente.
  useEffect(() => {
    if (view !== "days" || !pendingMoment) return;
    const id = pendingMoment;
    const tmr = setTimeout(() => {
      document.getElementById(`m-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setPendingMoment(null);
    }, 120);
    return () => clearTimeout(tmr);
  }, [view, pendingMoment, activeDay]);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);


  // ── ambient: immagini dei giorni, crossfade sul giorno attivo ──
  const dayImages = useMemo(() => days.map(d => d.img || data.heroImg).filter(Boolean), [days, data.heroImg]);
  const activeImgIdx = Math.max(0, days.findIndex(d => d.n === (openDay ?? activeDay)));

  // ── countdown / facts ──
  const leaveDate = profilingInput?.leaveDate ?? profilingInput?.travelDate ?? null;
  const daysUntil = useMemo(() => {
    if (!leaveDate) return null;
    const m = String(leaveDate).match(/(\d{4}-\d{2}-\d{2})/);
    if (!m) return null;
    const d = new Date(m[1]); if (isNaN(d.getTime())) return null;
    const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
    return diff > 0 ? diff : null;
  }, [leaveDate]);

  const stops = data.mapPoints?.length ?? 0;
  const momentCount = useMemo(
    () => Object.values(data.momentsByDay).reduce((a, ms) => a + ms.length, 0),
    [data.momentsByDay],
  );

  // ── manifesto con emWord evidenziato ──
  const manifestoHtml = useMemo(() => {
    const text = data.manifesto || "";
    if (!text) return "";
    const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (data.emWord) {
      const w = data.emWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return esc.replace(new RegExp(`(${w})`, "i"), "<em>$1</em>");
    }
    return esc;
  }, [data.manifesto, data.emWord]);

  const peakDay = days[Math.floor((dayCount - 1) / 2)]?.n ?? 1;

  // Vantaggio "dove dormire" calcolato dalle tappe geocodificate (grounded, non
  // dal modello): alimenta il copy concreto sul CTA alloggio.
  const stayAdvantage = useMemo(() => computeStayAdvantage(data.mapPoints), [data.mapPoints]);

  // ── voci di prenotazione concrete (fonte unica: anello topbar + sezione Prenota) ──
  const bookingItems = useMemo<BookItem[]>(() => {
    const Lx = (it: string, en: string) => (lang === "it" ? it : en);
    const dest = data.destination;
    const allMoments = Object.values(data.momentsByDay).flat() as any[];
    const ofType = (ty: string) => allMoments.filter((m) => m.type === ty);
    const departure = (profilingInput?.departure ?? "").trim();
    const nights = Math.max(1, dayCount - 1);

    const hotelM: any = ofType("accommodation")[0];
    const expM: any = ofType("experience").find((m) => m.ctaUrl) ?? ofType("experience")[0];
    const foodM: any = ofType("food").find((m) => m.locationName);
    const transferM: any = ofType("transport").find((m) => (m.dayNumber ?? 1) !== 1);

    const opt = (label: string, url?: string) => (url ? [{ label, url }] : []);
    const flightAlt = [...opt("Expedia", affiliateUrls.expedia_flights)];
    const stayAlt = [...opt("Hotels.com", affiliateUrls.hotels), ...opt("Tablet Hotels", affiliateUrls.tablet_hotels)];
    const expAlt = [...opt("Civitatis", affiliateUrls.civitatis), ...opt("Musement", affiliateUrls.musement), ...opt("Klook", affiliateUrls.klook), ...opt("Viator", affiliateUrls.viator)];
    const transferAlt = [...opt("FlixBus", affiliateUrls.flixbus), ...opt("SamBoat", affiliateUrls.samboat), ...opt("Cars", affiliateUrls.expedia_cars)];

    const out: BookItem[] = [];

    // VOLO (essenziale)
    out.push({
      id: "flight", tier: "essential", ic: "✈️",
      title: departure ? `${departure} → ${dest}` : Lx(`Il volo per ${dest}`, `Flight to ${dest}`),
      generic: Lx("Volo", "Flight"),
      facts: [Lx("Andata e ritorno", "Round trip"), Lx("Giorno 1", "Day 1")],
      why: departure ? undefined : Lx("Aggiungi la partenza in L1 per la tratta esatta.", "Add your departure in L1 for the exact route."),
      day: 1, url: affiliateUrls.expedia_flights, cta: Lx("Vedi disponibilità", "See availability"), provider: "expedia",
      alt: flightAlt.filter((a) => a.url !== affiliateUrls.expedia_flights),
    });

    // ALLOGGIO (essenziale)
    {
      const facts = [`${nights} ${Lx(nights === 1 ? "notte" : "notti", nights === 1 ? "night" : "nights")}`];
      if (stayAdvantage) facts.push(Lx(`zona ${stayAdvantage.area}`, `${stayAdvantage.area} area`), Lx(`${stayAdvantage.walkable}/${stayAdvantage.total} tappe a piedi`, `${stayAdvantage.walkable}/${stayAdvantage.total} stops on foot`));
      if (hotelM?.ctaPrice || hotelM?.costLabel) facts.push(`${hotelM.ctaPrice || hotelM.costLabel}`);
      out.push({
        id: "hotel", tier: "essential", ic: "🏨",
        title: hotelM?.locationName || Lx("Il soggiorno", "The stay"),
        generic: Lx("Alloggio", "Stay"), facts,
        why: stayAdvantage ? Lx("Meno trasferimenti, più viaggio.", "Fewer transfers, more trip.") : Lx("Dove dormi dà il tono al viaggio.", "Where you sleep sets the tone."),
        day: 1, url: hotelM?.ctaUrl || affiliateUrls.hotels, cta: Lx("Vedi camere", "See rooms"), provider: hotelM?.ctaProvider || "hotels",
        alt: stayAlt.filter((a) => a.url !== (hotelM?.ctaUrl || affiliateUrls.hotels)),
      });
    }

    // TRASFERIMENTO (essenziale, solo se c'è un trasporto oltre il giorno 1)
    if (transferM && (affiliateUrls.flixbus || affiliateUrls.samboat || affiliateUrls.expedia_cars)) {
      out.push({
        id: "transfer", tier: "essential", ic: "🚌",
        title: transferM.locationName || transferM.title || Lx("Il trasferimento", "The transfer"),
        generic: Lx("Trasferimento", "Transfer"),
        facts: [transferM.kindLabel || Lx("Tra le tappe", "Between stops"), ...(transferM.dayNumber ? [Lx(`Giorno ${transferM.dayNumber}`, `Day ${transferM.dayNumber}`)] : [])],
        day: transferM.dayNumber ?? null,
        url: affiliateUrls.flixbus || affiliateUrls.samboat || affiliateUrls.expedia_cars,
        cta: Lx("Vedi orari", "See schedules"), provider: "transport",
        alt: transferAlt.filter((a) => a.url !== (affiliateUrls.flixbus || affiliateUrls.samboat || affiliateUrls.expedia_cars)),
      });
    }

    // ESPERIENZA PRINCIPALE (consigliata)
    if (expM) {
      const facts: string[] = [];
      const eDay = expM.dayNumber ?? peakDay;
      if (eDay != null) facts.push(Lx(`Giorno ${eDay}`, `Day ${eDay}`));
      if (expM.durationLabel) facts.push(expM.durationLabel);
      if (expM.ctaPrice || expM.costLabel) facts.push(expM.ctaPrice || expM.costLabel);
      const primary = expM.ctaUrl || affiliateUrls.civitatis || affiliateUrls.musement || affiliateUrls.klook || affiliateUrls.viator;
      out.push({
        id: "experience", tier: "recommended", ic: "🎟",
        title: expM.locationName || expM.title || Lx("L'esperienza principale", "The main experience"),
        generic: Lx("Esperienza", "Experience"), facts, why: Lx("Il momento da non perdere.", "The one moment not to miss."),
        day: eDay, url: primary, cta: Lx("Vedi disponibilità", "See availability"), provider: expM.ctaProvider || "experience",
        alt: expAlt.filter((a) => a.url !== primary),
      });
    }

    // A TAVOLA (consigliata) — niente partner ristoranti: recensioni, non "prenota".
    if (foodM && affiliateUrls.tripadvisor) {
      out.push({
        id: "food", tier: "recommended", ic: "🍽",
        title: foodM.locationName, generic: Lx("A tavola", "Food"),
        facts: [...(foodM.dayNumber ? [Lx(`Giorno ${foodM.dayNumber}`, `Day ${foodM.dayNumber}`)] : []), ...(foodM.costLabel ? [foodM.costLabel] : [])],
        day: foodM.dayNumber ?? null, url: affiliateUrls.tripadvisor, cta: Lx("Vedi recensioni", "See reviews"), provider: "tripadvisor", alt: [],
      });
    }
    return out;
  }, [data.momentsByDay, data.destination, affiliateUrls, profilingInput, dayCount, stayAdvantage, peakDay, lang]);

  const doneCount = bookingItems.filter((i) => checked[i.id]).length;
  const missionTotal = bookingItems.length || 1;
  const pct = Math.round((doneCount / missionTotal) * 100);

  // ── Nudge proattivo del companion: il bot "compare" sull'itinerario con UNA
  // riga contestuale (senza aprire la chat). Il dashboard calcola l'osservazione
  // più utile dai dati reali e la passa al CompanionDock via evento window.
  const companionNudge = useMemo<{ text: string; seed: string } | null>(() => {
    const it = lang === "it";
    // 1) Un giorno molto più pieno della media mentre il profilo cerca relax.
    const counts = days.map((d) => ({ n: d.n, c: data.momentsByDay[d.n]?.length ?? 0 }));
    const avg = counts.length ? counts.reduce((a, b) => a + b.c, 0) / counts.length : 0;
    const busiest = counts.slice().sort((a, b) => b.c - a.c)[0];
    const pace = String((profilingInput as any)?.pace ?? "").toLowerCase();
    const sens = String((profilingInput as any)?._l1?.sensation ?? "").toLowerCase();
    const relaxed = pace.includes("relax") || /relax|slow|stacc|disconn|lento|lentezza|quiet|calm|silenz|silence|respiro|breath/.test(sens);
    if (relaxed && busiest && avg > 0 && busiest.c >= Math.ceil(avg * 1.4) && busiest.c >= 4) {
      return {
        text: it ? `Il Giorno ${busiest.n} è il più pieno, ma cercavi relax. Lo alleggerisco?` : `Day ${busiest.n} is the fullest, yet you wanted to slow down. Want me to lighten it?`,
        seed: it ? `Il Giorno ${busiest.n} mi sembra troppo pieno per il ritmo rilassato che voglio. Puoi alleggerirlo?` : `Day ${busiest.n} feels too packed for the relaxed pace I want. Can you lighten it?`,
      };
    }
    // 2) Prenotazioni essenziali ancora aperte.
    const missEss = bookingItems.filter((i) => i.tier === "essential" && !checked[i.id]);
    if (missEss.length > 0) {
      return {
        text: it ? `Ti mancano ${missEss.length} prenotazioni essenziali. Le chiudiamo?` : `${missEss.length} essential bookings still open. Shall we close them?`,
        seed: it ? "Aiutami a completare le prenotazioni essenziali che mancano." : "Help me complete the essential bookings I'm missing.",
      };
    }
    return null;
  }, [days, data.momentsByDay, profilingInput, bookingItems, checked, lang]);

  useEffect(() => {
    if (!companionNudge || typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("mindroute:companion-nudge", { detail: { itineraryId, ...companionNudge } }));
  }, [companionNudge, itineraryId]);

  /* ════════════ sotto-render ════════════ */

  const ViewHead = ({ eyebrow, gold, title, sub, right }: {
    eyebrow: string; gold?: boolean; title: string; sub?: string; right?: ReactNode;
  }) => (
    <div className="view-head">
      <div className="vh-l">
        <button className="back" onClick={() => go("overview")}><ArrowLeft size={15} /> {t("itd.nav.overview")}</button>
        <div className={"vh-eyebrow" + (gold ? " gold" : "")}>{eyebrow}</div>
        <Html as="h1" className="vh-title" html={title} />
        {sub && <p className="vh-sub">{sub}</p>}
      </div>
      {right && <div className="vh-r">{right}</div>}
    </div>
  );

  /* ── OVERVIEW ── */
  const OverviewView = () => {
    // NB: queste funzioni-vista vengono invocate condizionalmente (es.
    // `view === "overview" && OverviewView()`), quindi NON devono chiamare hook
    // (violerebbe le Rules of Hooks → crash al cambio tab). Calcolo diretto.
    return (
      <div className="view">
        <section className="it-hero">
          <div className="it-hero-ph" style={{ backgroundImage: bg(data.heroImg, heroW, 65) }} />
          <div className="it-hero-veil" />
          <div className="it-hero-in">
            <div className="it-kick">
              <span>{t("itd.hero.kick")}</span>
              {/* data.subtitle è "Your MindRoute · July 2026": qui teniamo solo
                  la parte data, altrimenti il kick leggeva "YOUR MINDROUTE —
                  YOUR MINDROUTE · JULY 2026" (doppione). */}
              {data.subtitle.includes("·") && (
                <><span className="sep" /><span className="built">{data.subtitle.split("·").slice(1).join("·").trim()}</span></>
              )}
            </div>
            <h1 className="it-hero-title">{data.destination}</h1>
            {data.country && <div className="it-hero-sub">{data.country}</div>}
            <div className="it-facts">
              <div className="it-fact">
                <span className="n">{dayCount}</span>
                <span className="l">{dayCount === 1 ? t("itd.fact.day") : t("itd.fact.days")}</span>
              </div>
              {stops > 0 && (
                <div className="it-fact">
                  <span className="n">{stops}</span>
                  <span className="l">{stops === 1 ? t("itd.fact.stop") : t("itd.fact.stops")}</span>
                </div>
              )}
              <div className="it-fact">
                <span className="n"><em>{momentCount}</em></span>
                <span className="l">{momentCount === 1 ? t("itd.fact.moment") : t("itd.fact.moments")}</span>
              </div>
            </div>
          </div>
        </section>

        <div className="content">
          <TravelDatesBanner
            itineraryId={itineraryId}
            tripMeta={(itinerary as any)?.tripMeta}
            lang={lang}
            onConfirmed={onDatesConfirmed}
          />
          <TripCheckinBanner
            itineraryId={itineraryId}
            itinerary={itinerary}
            lang={lang}
            onAnswered={onDatesConfirmed}
          />

          {/* Profiling profondo — punto di rientro PERMANENTE (non notifica):
              anche chi chiude il banner flottante ritrova qui il percorso. */}
          {refineAvailable && (
            <button
              className="it-refine"
              data-testid="overview-refine"
              onClick={() => window.dispatchEvent(new Event("mindroute:open-refine"))}
            >
              <span className="ic"><Sparkles size={17} /></span>
              <span className="tx">
                <span className="t">{tx("itd.refine.t", { pct: refineCoverage.pct })}</span>
                <span className="s">{tx("itd.refine.sub", { n: refineCoverage.open.length })}</span>
              </span>
              <span className="bar"><span style={{ width: `${refineCoverage.pct}%` }} /></span>
              <span className="cta">{t("itd.refine.cta")} →</span>
            </button>
          )}

          {data.manifesto && (
            <section className="sec">
              <div className="sec-head">
                <div><div className="sec-eyebrow">{t("itd.why.eyebrow")}</div></div>
              </div>
              <div className="why">
                <Html as="div" className="why-quote" html={manifestoHtml} />
                {data.highlights.length > 0 && (
                  <div className="why-side">
                    <div className="why-side-mark">{t("itd.why.highlightsMark")}</div>
                    {data.highlights.slice(0, 4).map((h, i) => (
                      <div key={i} className="why-chip">
                        <span className="glyph">{h.ic}</span>
                        <span className="t">{h.name}{h.desc && <span>{h.desc}</span>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="sec">
            <div className="kit">
              <button className="kit-btn" onClick={onSavePdf}>
                <span className="ic"><Printer size={18} /></span>
                <span className="t">{pdfUnlocked ? t("itd.kit.pdf") : (lang === "it" ? "Anteprima PDF" : "PDF preview")}</span>
                <span className="s">{pdfUnlocked ? t("itd.kit.pdfSub") : (lang === "it" ? "il completo si sblocca con volo+alloggio" : "full version unlocks with flight+stay")}</span>
              </button>
              {onShare && (
                <button className="kit-btn" onClick={onShare}>
                  <span className="ic"><Share2 size={18} /></span>
                  <span className="t">{t("itd.kit.share")}</span>
                  <span className="s">{t("itd.kit.shareSub")}</span>
                </button>
              )}
              {onEdit && (
                <button className="kit-btn" onClick={onEdit}>
                  <span className="ic"><Pencil size={18} /></span>
                  <span className="t">{t("itd.kit.edit")}</span>
                  <span className="s">{t("itd.kit.editSub")}</span>
                </button>
              )}
              <button className="kit-btn" onClick={onStartOver}>
                <span className="ic"><RotateCcw size={18} /></span>
                <span className="t">{t("itd.kit.restart")}</span>
                <span className="s">{t("itd.kit.restartSub")}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  };

  /* ── DAYS · Agenda (design "Giorno per Giorno") ──
     Solo design: struttura e contenuti restano quelli generati (v2). I momenti
     sono raggruppati nelle 4 fasce fisse (mattina/pranzo/pomeriggio/sera) via il
     campo `band`. Le 8 feature del README (booking-status, transfer, offline…)
     sono lofi/spec → non implementate. Booking CTA e cuore-salva preservati. */
  const DaysView = () => {
    const L = (it: string, en: string) => (lang === "it" ? it : en);
    const sel = days.find(d => d.n === activeDay) ?? days[0];
    const selMoments = sel ? (data.momentsByDay[sel.n] ?? []) : [];
    const tappe = selMoments.length;
    const BANDS = [
      { key: "mattina", label: L("Mattina", "Morning"), c: "var(--ag-gold)" },
      { key: "pranzo", label: L("Pranzo", "Lunch"), c: "var(--ag-teal)" },
      { key: "pomeriggio", label: L("Pomeriggio", "Afternoon"), c: "var(--ag-accent)" },
      { key: "sera", label: L("Sera", "Evening"), c: "var(--ag-peri)" },
    ] as const;
    const bandRange = (arr: typeof selMoments) => {
      const ts = arr.map(m => m.startTime).filter(Boolean) as string[];
      if (!ts.length) return "";
      return ts.length > 1 && ts[0] !== ts[ts.length - 1] ? `${ts[0]} – ${ts[ts.length - 1]}` : ts[0];
    };
    const selDay = (n: number) => { setActiveDay(n); setOpenDay(n); setActiveMoment(0); };

    return (
      <div className="view">
        <div className="mr-agenda">
          {/* masthead */}
          <div className="ag-mast">
            <div>
              <div className="ag-eyebrow">{data.destination}{dayCount ? ` · ${dayCount} ${dayCount === 1 ? L("giorno", "day") : L("giorni", "days")}` : ""}</div>
              <h1 className="ag-h1">{L("Il piano, ", "The plan, ")}<em>{L("ora per ora", "hour by hour")}</em>.</h1>
              <div className="ag-lede">{L(
                "Ogni giornata segue la stessa struttura — Mattina · Pranzo · Pomeriggio · Sera — con tappe, durata e costi a colpo d'occhio.",
                "Every day follows the same structure — Morning · Lunch · Afternoon · Evening — with stops, duration and costs at a glance.",
              )}</div>
            </div>
            {onEdit && (
              <button className="ag-cmd-edit" onClick={onEdit}>
                <Pencil size={14} />{L("Personalizza", "Customise")}
              </button>
            )}
          </div>

          {/* legend */}
          <div className="ag-legend">
            <span className="ag-lg-h">{L("Le 4 fasce fisse", "The 4 fixed bands")}</span>
            {BANDS.map(b => (
              <span className="ag-lg" key={b.key}><span className="ag-ldot" style={{ background: b.c }} />{b.label}</span>
            ))}
          </div>

          {/* day tabs */}
          {dayCount > 1 && (
            <div className="ag-daytabs">
              {days.map(d => (
                <button key={d.n} className={"ag-daytab" + (sel?.n === d.n ? " on" : "")} onClick={() => selDay(d.n)}>
                  {d.arc && <span className="ag-dact">{d.arc}</span>}
                  <div className="ag-dn">{tx("itd.mis.day", { n: d.n })}</div>
                  <div className="ag-dttl">{d.date || d.title}</div>
                </button>
              ))}
            </div>
          )}

          {/* day header */}
          {sel && (
            <div className="ag-dayhead">
              <div className="ag-dayhead-grid">
                <div>
                  <div className="ag-dh-eyebrow">
                    <span>{tx("itd.mis.day", { n: sel.n })}</span>
                    {sel.arc && <span className="ag-dh-badge">{sel.arc}</span>}
                  </div>
                  <h2>{sel.title}</h2>
                  <div className="ag-dh-meta">
                    {sel.date && <span className="ag-dh-chip">{sel.date}</span>}
                    <span className="ag-dh-chip">{tappe} {tappe === 1 ? t("itd.fact.moment") : t("itd.fact.moments")} · {L("4 fasce", "4 bands")}</span>
                    {/* Collegamento Giorni→Mappa: vedi il percorso di QUESTO giorno. */}
                    <button className="ag-dh-chip" style={{ cursor: "pointer", color: "var(--ag-accent)", borderColor: "color-mix(in srgb, var(--ag-accent) 45%, transparent)" }}
                      onClick={() => { setActiveDay(sel.n); go("map"); }} data-testid="day-see-on-map">
                      🗺 {L("Vedi il percorso sulla mappa", "See the route on the map")}
                    </button>
                  </div>
                  {sel.sub && <div className="ag-dh-sub">{sel.sub}</div>}
                </div>
                {sel.img && <div className="ag-dh-hero"><img src={sel.img} alt={sel.title} loading="lazy" /></div>}
              </div>
            </div>
          )}

          {/* agenda body — 4 fasce */}
          <div className="ag-body">
            {BANDS.map(b => {
              const arr = selMoments.filter(m => (m.band ?? "mattina") === b.key);
              if (!arr.length) return null;
              return (
                <div className="ag-part" key={b.key} style={{ ["--pc" as any]: b.c }}>
                  <div className="ag-phead">
                    <span className="ag-node" />
                    <span className="ag-plabel">{b.label}</span>
                    <span className="ag-prange tnum">{bandRange(arr)}</span>
                  </div>
                  <div className="ag-moments">
                    {arr.map((m, i) => (
                      <div className="ag-m" key={i} id={m.id ? `m-${m.id}` : undefined}>
                        <div className="ag-mtop">
                          {m.startTime && <span className="ag-mtime tnum">{m.startTime}</span>}
                          {m.kindLabel && <span className="ag-kind">{m.kindLabel}</span>}
                          {onToggleSaved && itineraryId && m.id && (
                            <button
                              className={"ag-fav" + (savedMomentIds?.has(m.id) ? " on" : "")}
                              style={{ marginLeft: "auto" }}
                              title={t("itd.dd.save")}
                              onClick={() => onToggleSaved(m.id!, m)}
                            >
                              <Heart size={15} fill={savedMomentIds?.has(m.id) ? "currentColor" : "none"} />
                            </button>
                          )}
                        </div>
                        <div className="ag-mtitle">{m.title}</div>
                        {m.desc && <div className="ag-mdetail">{m.desc}</div>}
                        {(m.durationLabel || m.costLabel) && (
                          <div className="ag-chips">
                            {m.durationLabel && <span className="ag-chip"><i>{L("Durata", "Duration")}</i><b>{m.durationLabel}</b></span>}
                            {m.costLabel && <span className="ag-chip"><i>{L("Costo", "Cost")}</i><b>{m.costLabel}</b></span>}
                          </div>
                        )}
                        {m.planB && <div className="ag-note">{L("Piano B", "Plan B")}: {m.planB}</div>}
                        {m.cta && m.ctaUrl && (
                          <div className="ag-acts">
                            <a className="ag-btn-book" href={m.ctaUrl} target="_blank" rel="noopener noreferrer"
                              onClick={() => { trackAffiliate(m.ctaProvider ?? "unknown", data.destination); markClicked(m.type, sel.n); }}>
                              {m.cta}{m.ctaPrice && <span className="ag-price">· {m.ctaPrice}</span>}
                              <ExternalLink size={12} className="ag-ext" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  /* ── MAP ── */
  const MapView = () => {
    const geo = data.geometry;
    const noteKey = geo?.walkable ? "itd.map.compact" : "itd.map.spread";
    const note = geo ? tx(noteKey, { km: Math.max(1, Math.round(geo.spanKm)), min: geo.walkMinutes }) : "";
    // Solo le tappe con coordinate reali finiscono sulla mappa Leaflet. Passiamo
    // anche i campi ricchi (foto/durata/ora/cta) per la card operativa.
    const routePoints = (data.mapPoints ?? [])
      .filter((p) => typeof p.lat === "number" && typeof p.lng === "number")
      .map((p) => ({
        lat: p.lat!, lng: p.lng!, label: p.label, day: p.day, slot: p.slot, category: p.category,
        momentId: p.momentId, imageUrl: p.imageUrl, durationLabel: p.durationLabel, bestTime: p.bestTime,
        kindLabel: p.kindLabel, desc: p.desc, bookable: p.bookable, ctaUrl: p.ctaUrl, cta: p.cta,
        ctaProvider: p.ctaProvider, ctaPrice: p.ctaPrice, type: p.type,
      }));
    // La mappa si renderizza sempre: con tappe → percorso; senza → centro città
    // (RouteMap geocodifica la destinazione come fallback). Mai un vicolo cieco.
    return (
      <div className="view">
        <ViewHead gold eyebrow={t("itd.map.eyebrow")} title={t("itd.map.title")} sub={geo ? note : undefined} />
        <div className="content">
          {data.destination ? (
            <div className="route-overlaywrap">
              <div className="route-meta">
                <div className="live">{t("itd.map.live")}</div>
                <div className="rt">{data.destination}</div>
                {geo && <div className="rd">{note}</div>}
                {stayAdvantage && (
                  <div className="route-stay">📍 {tx("itd.mis.hotelAdv", {
                    area: stayAdvantage.area, walkable: stayAdvantage.walkable,
                    total: stayAdvantage.total, min: stayAdvantage.nearestMin,
                  })}</div>
                )}
              </div>
              <Suspense fallback={<div className="rmap-loading">{t("itd.map.loading")}</div>}>
                <RouteMap
                  points={routePoints} center={data.mapCenter} destination={data.destination}
                  itineraryId={itineraryId} t={t} lang={lang as "it" | "en"}
                  initialDay={activeDay}
                  onDayChange={(d) => { if (d != null) setActiveDay(d); }}
                  onOpenDay={(day, momentId) => { setActiveDay(day); setOpenDay(day); setActiveMoment(0); if (momentId) setPendingMoment(momentId); go("days"); }}
                  onBook={(type, day) => markClicked(type, day)}
                />
              </Suspense>
            </div>
          ) : (
            <div className="c-empty" style={{ border: "1px solid var(--stroke)", borderRadius: "var(--radius)" }}>{t("itd.map.empty")}</div>
          )}
        </div>
      </div>
    );
  };

  /* ── PRACTICAL ── */
  const PracticalView = () => {
    const L = (it: string, en: string) => (lang === "it" ? it : en);
    const budgetParsed = tryParse(itinerary.budgetSummary);
    const budgetItems: Array<{ label: string; total: string }> = Array.isArray(budgetParsed?.items) ? budgetParsed.items : [];
    const totalRow = budgetItems.find(it => /totale|total/i.test(it.label));
    const segItems = budgetItems.filter(it => it !== totalRow);
    const segTotal = segItems.reduce((a, it) => a + firstInt(it.total), 0) || 1;

    // v2: budgetSummary = {total_cost_range}; il dettaglio (prenotabile ora vs
    // stima in loco) vive in tripMeta. Senza la forma a "items" (solo v1) la card
    // restava vuota → fallback v2 così il budget compare sempre.
    const tripMeta = (itinerary as any).tripMeta ?? null;
    const v2Bookable: number | null = typeof tripMeta?.total_cost_bookable === "number" ? tripMeta.total_cost_bookable : null;
    const v2Onsite: number | null = typeof tripMeta?.total_cost_onsite_estimate === "number" ? tripMeta.total_cost_onsite_estimate : null;
    const v2Range: string | null = budgetParsed?.total_cost_range || tripMeta?.total_cost_range || null;
    const v2Total: string | null = v2Range || (v2Bookable != null ? `€${Math.round(v2Bookable + (v2Onsite ?? 0))}` : null);
    const v2Segs = ([
      v2Bookable != null ? { label: L("Prenotabile ora", "Bookable now"), total: v2Bookable } : null,
      v2Onsite != null ? { label: L("In loco (stima)", "On-site (est.)"), total: v2Onsite } : null,
    ].filter(Boolean) as Array<{ label: string; total: number }>);
    const v2SegTotal = v2Segs.reduce((a, s) => a + s.total, 0) || 1;
    const hasV2Budget = budgetItems.length === 0 && !!v2Total;

    const gettingParsed = tryParse(itinerary.gettingThere);
    const steps: any[] = Array.isArray(gettingParsed?.steps) ? gettingParsed.steps : [];
    // Testo libero SOLO se il campo non è JSON: i placeholder "{}" delle righe
    // v2 storiche finivano a schermo grezzi nella card "Come arrivare".
    const gettingFree: string = steps.length === 0 && itinerary.gettingThere && !(gettingParsed && typeof gettingParsed === "object")
      ? String(itinerary.gettingThere) : "";

    const packParsed = tryParse(itinerary.packingList);
    const packItems: any[] = Array.isArray(packParsed?.items)
      ? packParsed.items
      : (packParsed && typeof packParsed === "object")
      ? [] // JSON senza items (placeholder "{}") → niente card, non "{}"
      : (itinerary.packingList ? String(itinerary.packingList).split(/[,;]/).map((s: string) => ({ label: s.trim() })).filter((x: any) => x.label.length > 1) : []);

    // Date ISO "2025-06-15 → 2025-06-22" (righe v2 storiche in bestTime):
    // formatta in modo umano invece di stampare il raw.
    const bestTimeText: string = (() => {
      const raw = String(itinerary.bestTime ?? "");
      const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s*→\s*(\d{4})-(\d{2})-(\d{2})$/);
      if (!m) return raw;
      const fmt = new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
      return `${fmt.format(new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00Z`))} → ${fmt.format(new Date(`${m[4]}-${m[5]}-${m[6]}T12:00:00Z`))}`;
    })();

    const hasAny = budgetItems.length || hasV2Budget || steps.length || gettingFree || itinerary.bestTime || packItems.length;

    return (
      <div className="view">
        <ViewHead eyebrow={t("itd.prat.eyebrow")} title={t("itd.prat.title")} />
        <div className="content">
          {!hasAny && <div className="c-empty" style={{ border: "1px solid var(--stroke)", borderRadius: "var(--radius)" }}>{t("itd.prat.empty")}</div>}
          <div className="prat-grid">
            {/* Budget */}
            {budgetItems.length > 0 && (
              <div className="card">
                <div className="card-head"><span className="ic">💰</span>{t("itd.prat.budget")}</div>
                <div className="budget">
                  {totalRow && (
                    <div className="budget-total">
                      <span className="l">{t("itd.prat.total")}</span>
                      <span className="v"><em>{totalRow.total}</em></span>
                    </div>
                  )}
                  {segItems.length > 0 && (
                    <>
                      <div className="budget-bar">
                        {segItems.map((it, i) => (
                          <div key={i} className="budget-seg" style={{ width: `${(firstInt(it.total) / segTotal) * 100}%`, background: SEG_COLORS[i % SEG_COLORS.length] }} />
                        ))}
                      </div>
                      <div className="budget-legend">
                        {segItems.map((it, i) => (
                          <div key={i} className="budget-row">
                            <span className="sw" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
                            <span className="nm">{it.label}</span>
                            <span className="amt">{it.total}</span>
                            <span className="pct">{Math.round((firstInt(it.total) / segTotal) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Budget v2 (moment-based): range + prenotabile-ora vs stima-in-loco */}
            {hasV2Budget && (
              <div className="card">
                <div className="card-head"><span className="ic">💰</span>{t("itd.prat.budget")}</div>
                <div className="budget">
                  {v2Total && (
                    <div className="budget-total">
                      <span className="l">{t("itd.prat.total")}</span>
                      <span className="v"><em>{v2Total}</em></span>
                    </div>
                  )}
                  {typeof (profilingInput as any)?.budgetTotalPerPerson === "number" && (
                    <div className="det" style={{ fontSize: 12, color: "var(--ink-faint)", margin: "-6px 0 12px", lineHeight: 1.5 }}>
                      {L(`Obiettivo che hai indicato: €${Math.round((profilingInput as any).budgetTotalPerPerson)}/persona — scomposto e verificato qui sopra.`,
                         `Your stated target: €${Math.round((profilingInput as any).budgetTotalPerPerson)}/person — broken down and sanity-checked above.`)}
                    </div>
                  )}
                  {v2Segs.length > 0 ? (
                    <>
                      <div className="budget-bar">
                        {v2Segs.map((s, i) => (
                          <div key={i} className="budget-seg" style={{ width: `${(s.total / v2SegTotal) * 100}%`, background: SEG_COLORS[i % SEG_COLORS.length] }} />
                        ))}
                      </div>
                      <div className="budget-legend">
                        {v2Segs.map((s, i) => (
                          <div key={i} className="budget-row">
                            <span className="sw" style={{ background: SEG_COLORS[i % SEG_COLORS.length] }} />
                            <span className="nm">{s.label}</span>
                            <span className="amt">€{Math.round(s.total)}</span>
                            <span className="pct">{Math.round((s.total / v2SegTotal) * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="det" style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6 }}>
                      {L("Stima complessiva del viaggio, voli esclusi.", "Overall trip estimate, flights excluded.")}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Getting there */}
              {(steps.length > 0 || gettingFree) && (
                <div className="card">
                  <div className="card-head"><span className="ic">✈️</span>{t("itd.prat.arrive")}</div>
                  <div className="arrive">
                    {steps.length > 0 ? steps.map((s, i) => (
                      <div key={i} className="arrive-leg">
                        <div className="pin"><span className="dot" />{i < steps.length - 1 && <span className="ln" />}</div>
                        <div className="body">
                          <div className="route">{s.from} → {s.to}</div>
                          <div className="det">{s.method}{s.duration ? ` · ${s.duration}` : ""}{s.cost ? ` · ${s.cost}` : ""}</div>
                        </div>
                      </div>
                    )) : <div className="det" style={{ fontSize: 13, color: "var(--ink-dim)", lineHeight: 1.6 }}>{gettingFree}</div>}
                  </div>
                </div>
              )}

              {/* Best time */}
              {itinerary.bestTime && (
                <div className="card">
                  <div className="card-head"><span className="ic">📅</span>{t("itd.prat.when")}</div>
                  <div className="when-card">
                    <div className="when-legend">{bestTimeText}</div>
                  </div>
                </div>
              )}

              {/* Packing */}
              {packItems.length > 0 && (
                <div className="card">
                  <div className="card-head"><span className="ic">🎒</span>{t("itd.prat.pack")}</div>
                  <div className="pack">
                    <div className="pack-chips">
                      {packItems.map((it, i) => (
                        <span key={i} className="pack-chip">{it.emoji ? `${it.emoji} ` : ""}{it.label}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── PRENOTA (ex-"Missioni") ──────────────────────────────────────────────
     Riduzione dell'incertezza prima della prenotazione: ogni voce è la SCELTA
     concreta già fatta (nome reale, perché, prezzo stimato, distanza), con UNA
     CTA primaria + "Altre opzioni" a scomparsa. Essenziali vs Consigliate.
     A 100% l'esito è reale: viaggio pronto + PDF + checklist. */
  const MissionsView = () => {
    const L = (it: string, en: string) => (lang === "it" ? it : en);
    const dest = data.destination;
    const allMoments = Object.values(data.momentsByDay).flat();
    const ofType = (ty: string) => allMoments.filter((m: any) => m.type === ty);
    const departure = (profilingInput?.departure ?? "").trim();
    const nights = Math.max(1, dayCount - 1);

    const hotelM: any = ofType("accommodation")[0];
    const expM: any = ofType("experience").find((m: any) => m.ctaUrl) ?? ofType("experience")[0];
    const foodM: any = ofType("food").find((m: any) => m.locationName);
    const transferM: any = ofType("transport").find((m: any) => (m.dayNumber ?? 1) !== 1);

    const opt = (label: string, url?: string) => (url ? [{ label, url }] : []);
    const flightAlt = [...opt("Expedia", affiliateUrls.expedia_flights)];
    const stayAlt = [...opt("Hotels.com", affiliateUrls.hotels), ...opt("Tablet Hotels", affiliateUrls.tablet_hotels)];
    const expAlt = [...opt("Civitatis", affiliateUrls.civitatis), ...opt("Musement", affiliateUrls.musement), ...opt("Klook", affiliateUrls.klook), ...opt("Viator", affiliateUrls.viator)];
    const transferAlt = [...opt("FlixBus", affiliateUrls.flixbus), ...opt("SamBoat", affiliateUrls.samboat), ...opt("Cars", affiliateUrls.expedia_cars)];

    type Item = {
      id: string; tier: "essential" | "recommended"; ic: string;
      title: string; generic: string; facts: string[]; why?: string; day?: number | null;
      url?: string; cta: string; provider?: string; alt: { label: string; url: string }[];
    };
    const items: Item[] = [];

    // VOLO (essenziale)
    items.push({
      id: "flight", tier: "essential", ic: "✈️",
      title: departure ? `${departure} → ${dest}` : L("Il volo per " + dest, "Flight to " + dest),
      generic: L("Volo", "Flight"),
      facts: [L("Andata e ritorno", "Round trip"), L("Giorno 1", "Day 1")],
      why: departure ? undefined : L("Aggiungi la partenza in L1 per la tratta esatta.", "Add your departure in L1 for the exact route."),
      day: 1,
      url: affiliateUrls.expedia_flights, cta: L("Vedi disponibilità", "See availability"), provider: "expedia",
      alt: flightAlt.filter(a => a.url !== affiliateUrls.expedia_flights),
    });

    // ALLOGGIO (essenziale)
    {
      const facts = [`${nights} ${L(nights === 1 ? "notte" : "notti", nights === 1 ? "night" : "nights")}`];
      if (stayAdvantage) facts.push(L(`zona ${stayAdvantage.area}`, `${stayAdvantage.area} area`), L(`${stayAdvantage.walkable}/${stayAdvantage.total} tappe a piedi`, `${stayAdvantage.walkable}/${stayAdvantage.total} stops on foot`));
      if (hotelM?.ctaPrice || hotelM?.costLabel) facts.push(`${hotelM.ctaPrice || hotelM.costLabel}`);
      items.push({
        id: "hotel", tier: "essential", ic: "🏨",
        title: hotelM?.locationName || L("Il soggiorno", "The stay"),
        generic: L("Alloggio", "Stay"),
        facts,
        why: stayAdvantage ? L("Meno trasferimenti, più viaggio.", "Fewer transfers, more trip.") : L("Dove dormi dà il tono al viaggio.", "Where you sleep sets the tone."),
        day: 1,
        url: hotelM?.ctaUrl || affiliateUrls.hotels, cta: L("Vedi camere", "See rooms"), provider: hotelM?.ctaProvider || "hotels",
        alt: stayAlt.filter(a => a.url !== (hotelM?.ctaUrl || affiliateUrls.hotels)),
      });
    }

    // TRASFERIMENTO (essenziale, solo se c'è un trasporto oltre il giorno 1)
    if (transferM && (affiliateUrls.flixbus || affiliateUrls.samboat || affiliateUrls.expedia_cars)) {
      items.push({
        id: "transfer", tier: "essential", ic: "🚌",
        title: transferM.locationName || transferM.title || L("Il trasferimento", "The transfer"),
        generic: L("Trasferimento", "Transfer"),
        facts: [transferM.kindLabel || L("Tra le tappe", "Between stops"), ...(transferM.dayNumber ? [L(`Giorno ${transferM.dayNumber}`, `Day ${transferM.dayNumber}`)] : [])],
        day: transferM.dayNumber ?? null,
        url: affiliateUrls.flixbus || affiliateUrls.samboat || affiliateUrls.expedia_cars,
        cta: L("Vedi orari", "See schedules"), provider: "transport",
        alt: transferAlt.filter(a => a.url !== (affiliateUrls.flixbus || affiliateUrls.samboat || affiliateUrls.expedia_cars)),
      });
    }

    // ESPERIENZA PRINCIPALE (consigliata)
    if (expM) {
      const facts: string[] = [];
      const eDay = expM.dayNumber ?? peakDay;
      if (eDay != null) facts.push(L(`Giorno ${eDay}`, `Day ${eDay}`));
      if (expM.durationLabel) facts.push(expM.durationLabel);
      if (expM.ctaPrice || expM.costLabel) facts.push(expM.ctaPrice || expM.costLabel);
      const primary = expM.ctaUrl || affiliateUrls.civitatis || affiliateUrls.musement || affiliateUrls.klook || affiliateUrls.viator;
      items.push({
        id: "experience", tier: "recommended", ic: "🎟",
        title: expM.locationName || expM.title || L("L'esperienza principale", "The main experience"),
        generic: L("Esperienza", "Experience"),
        facts, why: L("Il momento da non perdere.", "The one moment not to miss."),
        day: eDay,
        url: primary, cta: L("Vedi disponibilità", "See availability"), provider: expM.ctaProvider || "experience",
        alt: expAlt.filter(a => a.url !== primary),
      });
    }

    // A TAVOLA (consigliata) — niente partner ristoranti: recensioni, non "prenota".
    if (foodM && affiliateUrls.tripadvisor) {
      items.push({
        id: "food", tier: "recommended", ic: "🍽",
        title: foodM.locationName,
        generic: L("A tavola", "Food"),
        facts: [...(foodM.dayNumber ? [L(`Giorno ${foodM.dayNumber}`, `Day ${foodM.dayNumber}`)] : []), ...(foodM.costLabel ? [foodM.costLabel] : [])],
        day: foodM.dayNumber ?? null,
        url: affiliateUrls.tripadvisor, cta: L("Vedi recensioni", "See reviews"), provider: "tripadvisor",
        alt: [],
      });
    }

    const essentials = items.filter(i => i.tier === "essential");
    const recommended = items.filter(i => i.tier === "recommended");
    const total = items.length || 1;
    const done = items.filter(i => checked[i.id]).length;
    const pctL = Math.round((done / total) * 100);
    const complete = done === total && total > 0;
    const sayLine = pctL === 0 ? L("Niente di confermato — parti dal volo.", "Nothing confirmed yet — start with the flight.")
      : pctL < 50 ? L("Sei partito. La parte difficile era iniziare.", "Off you go. The hard part is starting.")
      : pctL < 100 ? L("Ci sei quasi. Mancano poche conferme.", "Almost there. A couple of confirmations to go.")
      : L("Tutto confermato.", "All confirmed.");

    const renderItem = (it: Item) => {
      const isDone = !!checked[it.id];
      // La conferma manuale si sblocca solo dopo il click sul link (il server
      // rifiuta comunque le spunte senza click: la UI qui è solo onesta).
      const canConfirm = isDone || !!clicked[it.id];
      return (
        <div key={it.id} className={"book-item" + (isDone ? " done" : "")}>
          <button
            className={"book-check" + (isDone ? " on" : "") + (!canConfirm ? " locked" : "")}
            onClick={() => { if (canConfirm) toggle(it.id); }}
            disabled={!canConfirm}
            title={!canConfirm ? L("Apri prima il link di prenotazione", "Open the booking link first") : undefined}
            aria-label={it.title}
          />
          <div className="book-main">
            <div className="book-gen"><span className="ic">{it.ic}</span>{it.generic}{it.day != null && <span className="book-day">{L(`Giorno ${it.day}`, `Day ${it.day}`)}</span>}</div>
            <div className="book-title">{it.title}</div>
            {it.facts.length > 0 && <div className="book-facts">{it.facts.map((f, i) => <span key={i}>{f}</span>)}</div>}
            {it.why && <div className="book-why">{it.why}</div>}
            {!isDone && (
              <div className="book-gate-hint">
                {clicked[it.id]
                  ? L("L'hai prenotato? Spunta la casella per confermare.", "Booked it? Tick the box to confirm.")
                  : L("Apri il link qui accanto: la conferma si sblocca dopo.", "Open the link on the right — confirming unlocks after that.")}
              </div>
            )}
            {it.alt.length > 0 && (
              <div className="book-alt-wrap">
                <button className="book-alt-toggle" onClick={() => toggleAlt(it.id)}>
                  {altOpen.has(it.id) ? L("Nascondi alternative", "Hide alternatives") : L("Altre opzioni", "Other options")} {altOpen.has(it.id) ? "▲" : "▾"}
                </button>
                {altOpen.has(it.id) && (
                  <div className="book-alt">
                    {it.alt.map((a, i) => (
                      <a key={i} href={a.url} target="_blank" rel="noopener noreferrer" onClick={() => { trackAffiliate(affiliateProvider(a.label), dest); logClick(it.id); }}>
                        {a.label} <ExternalLink size={11} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="book-side">
            {it.url ? (
              <a className="book-cta" href={it.url} target="_blank" rel="noopener noreferrer"
                onClick={() => { trackAffiliate(it.provider ?? "unknown", dest); logClick(it.id); }}>
                {isDone ? L("Riapri", "Reopen") : it.cta} <ExternalLink size={13} />
              </a>
            ) : (
              <button className="book-cta book-cta--soft" onClick={() => logClick(it.id)}>{L("Fatto altrove", "Done elsewhere")}</button>
            )}
          </div>
        </div>
      );
    };

    return (
      <div className="view">
        <ViewHead eyebrow={t("itd.mis.eyebrow")} title={t("itd.mis.title")} sub={t("itd.mis.sub")} />
        <div className="content">
          <div className={"mission-hero" + (complete ? " complete" : "")}>
            <div className="mh-top">
              <div className="mh-pct"><em>{pctL}</em>%</div>
              <div className="mh-say">
                <div className="k">{L("Viaggio pronto", "Trip ready")} · {done}/{total} {L("confermate", "confirmed")}</div>
                <div className="t">{sayLine}</div>
              </div>
            </div>
            <div className="mtrack">
              <div className="mtrack-fill" style={{ width: `${pctL}%` }} />
              {items.map((_, i) => {
                const tickPct = ((i + 1) / total) * 100;
                return <div key={i} className={"mtick" + (pctL >= tickPct - 0.5 ? " reached" : "")} style={{ left: `${tickPct}%` }}><span className="d" /></div>;
              })}
            </div>
            <div className="mtrack-pad" />

            {complete ? (
              <div className="mdone">
                <span className="star">✦</span>
                <div className="tx">
                  <div className="h">{L("Tutto pronto. Non resta che partire.", "All set. Just go.")}</div>
                  <div className="s">{tx("itd.mis.doneS", { dest })}</div>
                  <div className="book-reward-acts">
                    <button className="book-reward-btn" onClick={onSavePdf}>⬇ {L("Scarica il PDF", "Download the PDF")}</button>
                    <button className="book-reward-btn" onClick={() => go("practical")}>🎒 {L("Checklist bagagli", "Packing checklist")}</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="book-prize">
                {pdfUnlocked
                  ? <>{L("PDF definitivo sbloccato", "Final PDF unlocked")} — <b>{L("scaricalo dalla Panoramica", "download it from the Overview")}</b>. {L("Al 100%:", "At 100%:")} <b>{L("viaggio pronto da partire", "a trip ready to go")}</b></>
                  : <>{L("Con", "With")} <b>{L("volo + alloggio confermati", "flight + stay confirmed")}</b> {L("sblocchi il", "you unlock the")} <b>{L("PDF definitivo", "final PDF")}</b> · {L("al 100% il viaggio è pronto da partire", "at 100% the trip is ready to go")}</>}
              </div>
            )}
          </div>

          {essentials.length > 0 && (
            <div className="book-sec">
              <div className="book-sec-h">{L("Essenziali", "Essentials")} <span>{L("da confermare", "to confirm")}</span></div>
              <div className="book-list">{essentials.map(renderItem)}</div>
            </div>
          )}
          {recommended.length > 0 && (
            <div className="book-sec">
              <div className="book-sec-h book-sec-h--rec">{L("Consigliate", "Recommended")} <span>{L("alzano il viaggio", "they elevate the trip")}</span></div>
              <div className="book-list">{recommended.map(renderItem)}</div>
            </div>
          )}

          <div style={{ fontSize: 11, color: "var(--ink-faint)", textAlign: "center", marginTop: 20 }}>{t("itd.affiliateNote")}</div>
        </div>
      </div>
    );
  };

  /* ════════════ SHELL ════════════ */
  // Nav Journey (2026-07): Visione · Journey (Story/Map/Logistics fusi) ·
  // Pratica (essenziali trip-level: bagaglio/budget/come-arrivare, NON per-giorno) ·
  // Prenota. Companion resta il FAB globale.
  const NAV: Array<{ id: ViewId; icon: ReactNode; key: string }> = [
    { id: "overview", icon: <Layers size={23} />, key: "itd.nav.overview" },
    { id: "journey", icon: <Compass size={23} />, key: "itd.nav.journey" },
    { id: "practical", icon: <Backpack size={23} />, key: "itd.nav.practical" },
    { id: "missions", icon: <Ticket size={23} />, key: "itd.nav.missions" },
  ];

  return (
    <div className="account-dash itinerary-dash">
      <div className="iv-bg">
        {dayImages.map((src, i) => (
          <div key={src + i} className={"iv-bg-photo" + (activeImgIdx === i ? " active" : "")} style={{ backgroundImage: bg(src, isMobile ? 900 : 1400, 55) }} />
        ))}
      </div>
      <div className="grain" />

      <aside className="sidebar">
        <button className="sb-logo" onClick={() => setLocation("/")} title="MindRoute"><FlowNavLogo size={26} /></button>
        <nav className="sb-nav">
          {NAV.map(n => (
            <button key={n.id} className={"sb-item" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
              {n.icon}
              <span className="lab">{t(n.key)}</span>
            </button>
          ))}
        </nav>
        <div className="sb-foot">
          <button className="sb-gear" onClick={() => setLocation("/")} title={t("itd.back")}><ArrowLeft size={20} /></button>
        </div>
      </aside>

      <main className="main">
        <div className={"topbar" + (stuck ? " stuck" : "")}>
          <button className="tb-brand" onClick={() => setLocation("/")} title={t("itd.back")}><FlowNavLogo size={20} /></button>
          <div className="it-trip">
            <span className="nm">{data.destination}</span>
            <span className="cd">
              <span className="pulse" />
              {daysUntil != null ? (
                <><span className="n">{daysUntil}</span><span className="l">{lang === "it" ? "alla partenza" : "to departure"}</span></>
              ) : (
                <><span className="n">{dayCount}</span><span className="l">{dayCount === 1 ? t("itd.fact.day") : t("itd.fact.days")}</span></>
              )}
            </span>
          </div>
          <div className="tb-spacer" />
          <div className="it-ring" title={`${pct}%`}>
            <svg width="34" height="34">
              <circle cx="17" cy="17" r="13" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="2.5" />
              <circle cx="17" cy="17" r="13" fill="none" stroke="#E94560" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 13} strokeDashoffset={2 * Math.PI * 13 * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .4s" }} />
            </svg>
            <span className="lbl">{pct}</span>
          </div>
          {/* Nessun toggle lingua: il contenuto è monolingua e fisso alla
              creazione (la pagina forza già la lingua del contenuto). */}
          {onEdit && <button className="cmd-edit" onClick={onEdit}><Pencil className="pen" size={14} /> {t("itd.tb.edit")}</button>}
          <button className="tb-cta" onClick={onSavePdf}><Printer size={15} /> PDF</button>
        </div>

        {view === "overview" && OverviewView()}
        {(view === "journey" || view === "days" || view === "map") && (
          <JourneyView
            data={data} itinerary={itinerary} itineraryId={itineraryId}
            savedMomentIds={savedMomentIds} onToggleSaved={onToggleSaved}
            onBook={(type, day) => markClicked(type, day)}
          />
        )}
        {view === "practical" && PracticalView()}
        {view === "missions" && MissionsView()}
      </main>

      <nav className="mnav">
        {NAV.map(n => (
          <button key={n.id} className={"mnav-i" + (view === n.id ? " on" : "")} onClick={() => go(n.id)}>
            <span className="ic">{n.icon}</span>
            <span className="lab">{t(n.key)}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
