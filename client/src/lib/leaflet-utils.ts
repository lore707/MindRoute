/**
 * leaflet-utils.ts — quello che rende una mappa Leaflet difficile da rompere.
 *
 * Tutte e quattro le mappe del prodotto avevano gli stessi tre buchi, ognuna
 * scoperta a modo suo:
 *
 *  1. NESSUNA osservava il ridimensionamento del contenitore. Leaflet calcola
 *     le dimensioni UNA volta, al montaggio: se il contenitore cambia taglia
 *     dopo — sidebar che si apre, rotazione del telefono, pannello che si
 *     allarga, font che finisce di caricare — restano fasce grigie dove le
 *     tile non sono mai state chieste. C'erano solo `setTimeout(invalidateSize)`
 *     sparsi: indovinare un istante non è osservare.
 *
 *  2. Nessuna diceva niente se le tile non arrivavano. Offline o CDN giù =
 *     rettangolo vuoto, e l'utente pensa che il viaggio non ci sia.
 *
 *  3. Coordinate non finite passate a fitBounds fanno LANCIARE Leaflet, e
 *     un'eccezione dentro un effect porta giù la schermata: schermo nero al
 *     posto della mappa.
 *
 * Qui c'è un solo posto dove queste tre cose sono risolte bene.
 * ─────────────────────────────────────────────────────────────── */
import type L from "leaflet";

type AnyMap = {
  invalidateSize: (opts?: any) => void;
  setView: (c: any, z: number, o?: any) => void;
  fitBounds: (b: any, o?: any) => void;
  getContainer: () => HTMLElement;
  on: (ev: string, fn: (e?: any) => void) => void;
  off: (ev: string, fn?: (e?: any) => void) => void;
};

/**
 * Tiene la mappa della taglia giusta, per sempre.
 *
 * ResizeObserver sul contenitore (copre pannelli, sidebar, split desktop),
 * più orientamento e ritorno di visibilità della pagina — un telefono ruotato
 * mentre l'app è in background non emette resize finché non torni.
 *
 * L'invalidate è "debounced" su requestAnimationFrame: durante un drag di
 * ridimensionamento arrivano decine di eventi e ricalcolare a ogni pixel fa
 * scattare la mappa invece di farla scorrere.
 *
 * Restituisce la funzione di distacco: chiamarla nel cleanup dell'effect.
 */
export function attachAutoSize(map: AnyMap, el: HTMLElement | null): () => void {
  if (!el || typeof window === "undefined") return () => { /* niente da staccare */ };

  let raf = 0;
  let lastW = 0, lastH = 0;
  const refresh = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      const r = el.getBoundingClientRect();
      // Contenitore ancora collassato (dentro un display:none, o non ancora
      // impaginato): invalidare qui non serve, e fitBounds su 0×0 sballa.
      if (r.width < 2 || r.height < 2) return;
      if (Math.abs(r.width - lastW) < 1 && Math.abs(r.height - lastH) < 1) return;
      lastW = r.width; lastH = r.height;
      try { map.invalidateSize({ animate: false }); } catch { /* mappa già smontata */ }
    });
  };

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(refresh) : null;
  ro?.observe(el);
  window.addEventListener("orientationchange", refresh);
  document.addEventListener("visibilitychange", refresh);
  // Senza ResizeObserver (browser vecchi) resta almeno il resize di finestra.
  if (!ro) window.addEventListener("resize", refresh);
  // Una prima misura appena il layout si è posato.
  refresh();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener("orientationchange", refresh);
    document.removeEventListener("visibilitychange", refresh);
    if (!ro) window.removeEventListener("resize", refresh);
  };
}

/**
 * Coordinate utilizzabili. Un NaN, un undefined o un lat fuori scala fanno
 * LANCIARE fitBounds — e l'eccezione porta giù tutta la schermata.
 */
export function safePoints<T extends { lat?: number | null; lng?: number | null }>(pts: readonly T[]): T[] {
  return pts.filter(p =>
    typeof p.lat === "number" && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
    typeof p.lng === "number" && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180);
}

export type FitOpts = {
  padding?: [number, number];
  maxZoom?: number;
  /** Zoom per il caso "un solo punto", dove fitBounds non ha senso. */
  singleZoom?: number;
  animate?: boolean;
  /** Dove guardare quando non c'è nemmeno un punto. */
  fallback?: { lat: number; lng: number; zoom?: number };
};

/**
 * Inquadra i punti senza mai lanciare: zero punti → il fallback, un punto →
 * setView, molti → fitBounds. Ogni ramo protetto.
 */
export function fitToPoints(
  Leaflet: typeof L,
  map: AnyMap,
  pts: ReadonlyArray<{ lat: number; lng: number }>,
  opts: FitOpts = {},
): void {
  const { padding = [50, 50], maxZoom = 16, singleZoom = 14, animate = true, fallback } = opts;
  const good = safePoints(pts) as Array<{ lat: number; lng: number }>;
  try {
    if (good.length === 0) {
      if (fallback) map.setView([fallback.lat, fallback.lng], fallback.zoom ?? 11, { animate });
      return;
    }
    if (good.length === 1) {
      map.setView([good[0].lat, good[0].lng], singleZoom, { animate });
      return;
    }
    const b = Leaflet.latLngBounds(good.map(p => [p.lat, p.lng] as [number, number]));
    if (!b.isValid()) return;
    map.fitBounds(b, { padding, maxZoom, animate });
  } catch {
    // Meglio una mappa ferma dove sta che una schermata bianca.
  }
}

/**
 * Avvisa quando le tile non arrivano davvero.
 *
 * Un errore isolato è normale (una tile ai bordi, un 404 di zoom): si allarma
 * solo dopo alcuni errori ravvicinati, e si azzera al primo caricamento
 * riuscito, così una connessione che torna spegne l'avviso da sola.
 */
export function attachTileHealth(
  layer: { on: (ev: string, fn: () => void) => void; off: (ev: string, fn?: () => void) => void },
  onChange: (healthy: boolean) => void,
  threshold = 6,
): () => void {
  let errors = 0;
  let unhealthy = false;
  const fail = () => {
    errors++;
    if (!unhealthy && errors >= threshold) { unhealthy = true; onChange(false); }
  };
  const ok = () => {
    errors = 0;
    if (unhealthy) { unhealthy = false; onChange(true); }
  };
  layer.on("tileerror", fail);
  layer.on("tileload", ok);
  return () => { layer.off("tileerror", fail); layer.off("tileload", ok); };
}

/** Rispetta prefers-reduced-motion: senza, ogni flyTo è un capogiro. */
export function prefersReducedMotion(): boolean {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/** Durata di volo che si annulla per chi ha chiesto meno movimento. */
export const flyDuration = (base: number): number => (prefersReducedMotion() ? 0 : base);
