/**
 * map-style.ts — lo stile delle mappe, in un posto solo.
 *
 * Nel prodotto ci sono QUATTRO mappe Leaflet, nate in momenti diversi e
 * ciascuna col suo fondo cablato a mano:
 *   · RouteMap        — il percorso del giorno (itinerario)
 *   · AtlasMap        — la collezione dei viaggi
 *   · AccountAtlas    — l'atlante nelle shell alternative
 *   · il mini-atlante della home
 * Cambiare il fondo in una sola lasciava le altre nere. Da qui in avanti la
 * scelta è UNA e vale ovunque: se scegli "Colori" sull'itinerario, anche
 * l'atlante diventa colorato.
 *
 * Gli stili vettoriali vengono da OpenFreeMap: nessuna registrazione, chiave
 * API o cookie. MapLibre li renderizza sotto i layer operativi di Leaflet.
 *
 * `urlNoLabels` resta nell'interfaccia per compatibilita' con gli atlanti. I
 * preset pubblici mantengono le etichette, utili anche nella vista globale.
 * ─────────────────────────────────────────────────────────────── */

export type MapStyle = "voyager" | "light" | "dark";

export const MAP_ATTR =
  '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org">OpenMapTiles</a> Data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>';

// Backward-compatible alias while all map consumers migrate to MAP_ATTR.
export const CARTO_ATTR = MAP_ATTR;

const OPEN_FREE_MAP = "https://tiles.openfreemap.org/styles";

export const MAP_STYLES: Record<MapStyle, {
  url: string;
  urlNoLabels: string;
  label: { it: string; en: string };
}> = {
  voyager: {
    url: `${OPEN_FREE_MAP}/liberty`,
    urlNoLabels: `${OPEN_FREE_MAP}/liberty`,
    label: { it: "Mappa", en: "Map" },
  },
  light: {
    url: `${OPEN_FREE_MAP}/positron`,
    urlNoLabels: `${OPEN_FREE_MAP}/positron`,
    label: { it: "Chiara", en: "Light" },
  },
  dark: {
    url: `${OPEN_FREE_MAP}/dark`,
    urlNoLabels: `${OPEN_FREE_MAP}/dark`,
    label: { it: "Notte", en: "Night" },
  },
};

export const MAP_STYLE_KEY = "mr_map_style";

/** La preferenza salvata. Default "voyager": una mappa va letta, non ammirata. */
export function readMapStyle(): MapStyle {
  try {
    const v = localStorage.getItem(MAP_STYLE_KEY);
    if (v === "voyager" || v === "light" || v === "dark") return v;
  } catch { /* private mode */ }
  return "voyager";
}

/* La preferenza vale dal montaggio successivo di ogni mappa. Basta: le quattro
 * mappe non stanno mai sullo schermo insieme (lo switcher vive sull'itinerario,
 * gli atlanti nell'account), quindi un canale di propagazione dal vivo sarebbe
 * codice che non serve a nessuno. */
export function saveMapStyle(s: MapStyle): void {
  try { localStorage.setItem(MAP_STYLE_KEY, s); } catch { /* private mode */ }
}

/** URL dello style JSON MapLibre per lo stile corrente. */
export function mapTileUrl(style: MapStyle, opts: { labels?: boolean } = {}): string {
  const s = MAP_STYLES[style] ?? MAP_STYLES.voyager;
  return opts.labels === false ? s.urlNoLabels : s.url;
}

export const mapStyleUrl = mapTileUrl;
