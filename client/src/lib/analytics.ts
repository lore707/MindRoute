// GA4 funnel events. Single chokepoint: ogni evento passa da qui, niente
// chiamate gtag dirette nei componenti. Lo snippet gtag vive in index.html
// (Measurement ID G-XJC8RN21Z6) — questo file NON lo tocca, lo usa soltanto.

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Invia un evento custom a GA4. No-op silenzioso se gtag non è disponibile
 * (snippet non ancora caricato, ad-blocker, SSR): non deve mai rompere il flusso.
 */
export function track(eventName: string, params?: Record<string, any>): void {
  if (typeof window === "undefined") return;
  const g = window.gtag;
  if (typeof g !== "function") return;
  g("event", eventName, params ?? {});
}

/**
 * Click su link affiliate (Booking/GetYourGuide/Klook/Viator/…). I link aprono
 * in nuova scheda o fanno redirect: un gtag('event') sincrono spesso non parte
 * in tempo prima che il browser cambi contesto, e si perde proprio l'evento che
 * conta di più. transport_type:'beacon' instrada via navigator.sendBeacon, che
 * sopravvive al cambio scheda/pagina. NON tocchiamo href/target: il link si apre
 * normalmente, l'evento parte in parallelo e garantito.
 */
export function trackAffiliate(provider: string, destination: string): void {
  if (typeof window === "undefined") return;
  const g = window.gtag;
  if (typeof g !== "function") return;
  g("event", "affiliate_click", {
    provider,
    destination,
    transport_type: "beacon",
  });
}

/**
 * Normalizza una chiave di link affiliate ("expedia_flights", "getyourguide_afternoon",
 * "tablet_hotels", "klook_1"…) o un provider grezzo del booking v2 nel nome canonico
 * del partner. Usata sia dalla BookTab sia dai CTA per-momento.
 */
export function affiliateProvider(key: string): string {
  const k = (key || "").toLowerCase();
  if (k.startsWith("expedia")) return "expedia";
  if (k.startsWith("hotels")) return "hotels";
  if (k.startsWith("tablet")) return "tablet_hotels";
  if (k.startsWith("getyourguide")) return "getyourguide";
  if (k.startsWith("klook")) return "klook";
  if (k.startsWith("viator")) return "viator";
  if (k.startsWith("civitatis")) return "civitatis";
  if (k.startsWith("musement")) return "musement";
  if (k.startsWith("tripadvisor")) return "tripadvisor";
  if (k.startsWith("thefork")) return "thefork";
  if (k.startsWith("flixbus")) return "flixbus";
  if (k.startsWith("samboat")) return "samboat";
  if (k.startsWith("booking")) return "booking";
  if (k.startsWith("undercovertourist")) return "undercovertourist";
  return k.split("_")[0] || k || "unknown";
}
