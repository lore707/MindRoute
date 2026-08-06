/**
 * itinerary-booking.ts — la logica di prenotazione dell'itinerario, estratta
 * dalla vecchia dashboard così che il flusso a schermate (ItineraryFlow) la usi
 * IDENTICA. È il pezzo che non si può riscrivere a mano senza rompere due cose
 * silenziose:
 *
 *   · `logClick` registra il click affiliate lato server — è il click che il
 *     server PRETENDE prima di accettare la conferma di una prenotazione;
 *   · `checked.flight && checked.hotel` sblocca il PDF definitivo (gate 409).
 *
 * Qui dentro non c'è nulla di inventato: le voci nascono dai momenti reali
 * dell'itinerario e dagli affiliateUrls già riscritti lato server.
 * ─────────────────────────────────────────────────────────────── */
import { useEffect, useState } from "react";
import type { ItineraryData } from "@/components/ItineraryCinematic";

/** Voce di prenotazione concreta: la scelta già fatta + una CTA primaria + alternative. */
export type BookItem = {
  id: string;
  tier: "essential" | "recommended";
  ic: string;
  title: string;
  generic: string;
  facts: string[];
  why?: string;
  day?: number | null;
  url?: string;
  cta: string;
  provider?: string;
  alt: { label: string; url: string }[];
};

/* ── stato prenotazioni server-backed (tripMeta.booked / tripMeta.affiliate_clicks) ── */
export function useBookings(itineraryId: number | undefined, itinerary: any, onUpdated?: () => void) {
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

/** Da un momento (tipo + giorno) alla voce di prenotazione corrispondente. */
export function bookIdForMoment(type?: string, day?: number | null): string | null {
  if (type === "transport") return (day && day > 1) ? "transfer" : "flight";
  if (type === "accommodation") return "hotel";
  if (type === "experience") return "experience";
  if (type === "food") return "food";
  return null;
}

/* ── vantaggio "dove dormire", grounded sui punti geocodificati ── */
const WALK_KM = 1.3; // ~20 min a piedi: soglia oltre cui non è più "a piedi"
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180, la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const walkMin = (km: number) => Math.max(1, Math.round(((km * 1.3) / 4.5) * 60));

export type StayAdvantage = { area: string; nearestMin: number; walkable: number; total: number };

export function computeStayAdvantage(mapPoints: ItineraryData["mapPoints"]): StayAdvantage | null {
  const pts = (mapPoints ?? []).filter(p => p.lat != null && p.lng != null) as
    Array<{ lat: number; lng: number; label: string; category?: string }>;
  const stops = pts.filter(p => p.category !== "lodging" && p.category !== "custom" && p.label);
  if (stops.length < 3) return null; // sotto le 3 tappe il "dove dormire" non è un vantaggio reale

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
  if (walkable < 2 || !isFinite(nearest)) return null;
  return { area: anchor.label, nearestMin: walkMin(nearest), walkable, total: stops.length };
}

/* ── le voci di prenotazione, dai momenti reali ── */
export function buildBookingItems(args: {
  data: ItineraryData;
  affiliateUrls: Record<string, string>;
  profilingInput: any;
  dayCount: number;
  peakDay: number;
  stayAdvantage: StayAdvantage | null;
  lang: string;
}): BookItem[] {
  const { data, affiliateUrls, profilingInput, dayCount, peakDay, stayAdvantage, lang } = args;
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

  // ALLOGGIO (essenziale) — criteri di ricerca, MAI una property nominata.
  {
    const stay = hotelM?.stay;
    const facts = [`${nights} ${Lx(nights === 1 ? "notte" : "notti", nights === 1 ? "night" : "nights")}`];
    if (stay?.style) facts.push(stay.style);
    if (stay?.budgetRange) facts.push(stay.budgetRange);
    if (stayAdvantage) facts.push(Lx(`${stayAdvantage.walkable}/${stayAdvantage.total} tappe a piedi`, `${stayAdvantage.walkable}/${stayAdvantage.total} stops on foot`));
    else if (!stay && (hotelM?.ctaPrice || hotelM?.costLabel)) facts.push(`${hotelM.ctaPrice || hotelM.costLabel}`);
    out.push({
      id: "hotel", tier: "essential", ic: "🏨",
      title: stay?.district
        ? Lx(`Zona ${stay.district}`, `${stay.district} area`)
        : (hotelM?.locationName || Lx("Il soggiorno", "The stay")),
      generic: Lx("Alloggio", "Stay"), facts,
      why: stay?.why
        || (stayAdvantage ? Lx("Meno trasferimenti, più viaggio.", "Fewer transfers, more trip.") : Lx("Dove dormi dà il tono al viaggio.", "Where you sleep sets the tone.")),
      day: 1, url: hotelM?.ctaUrl || affiliateUrls.hotels,
      cta: stay?.district
        ? Lx(`Vedi hotel disponibili a ${stay.district}`, `See available hotels in ${stay.district}`)
        : Lx("Vedi camere", "See rooms"),
      provider: hotelM?.ctaProvider || "hotels",
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

  // ESPERIENZA PRINCIPALE (consigliata) — categoria + perché, mai un prodotto.
  if (expM) {
    const exp = expM.exp;
    const city = dest.split(",")[0].trim();
    const facts: string[] = [];
    const eDay = expM.dayNumber ?? peakDay;
    if (eDay != null) facts.push(Lx(`Giorno ${eDay}`, `Day ${eDay}`));
    if (expM.durationLabel) facts.push(expM.durationLabel);
    if (expM.ctaPrice || expM.costLabel) facts.push(expM.ctaPrice || expM.costLabel);
    const primary = expM.ctaUrl || affiliateUrls.civitatis || affiliateUrls.musement || affiliateUrls.klook || affiliateUrls.viator;
    out.push({
      id: "experience", tier: "recommended", ic: "🎟",
      title: exp?.label || expM.locationName || expM.title || Lx("L'esperienza principale", "The main experience"),
      generic: Lx("Esperienza", "Experience"), facts,
      why: exp?.why || Lx("Il momento da non perdere.", "The one moment not to miss."),
      day: eDay, url: primary,
      cta: exp ? Lx(`Vedi esperienze a ${city}`, `See experiences in ${city}`) : Lx("Vedi disponibilità", "See availability"),
      provider: expM.ctaProvider || "experience",
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
}
