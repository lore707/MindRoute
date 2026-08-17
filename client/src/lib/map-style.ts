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
 * Tutti gli stili vengono da CARTO — lo stesso fornitore già in uso: nessuna
 * chiave, nessun termine di licenza nuovo, stessa attribuzione, costo zero.
 *
 * `noLabels` esiste perché le mappe decorative (mini-atlante, atlante mondo)
 * mostrano DOVE sei stato, non come arrivarci: i nomi delle città a quella
 * scala sono rumore.
 * ─────────────────────────────────────────────────────────────── */

export type MapStyle = "voyager" | "light" | "dark";

export const CARTO_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

export const MAP_STYLES: Record<MapStyle, {
  url: string;
  urlNoLabels: string;
  label: { it: string; en: string };
}> = {
  voyager: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    urlNoLabels: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    label: { it: "Colori", en: "Colour" },
  },
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    urlNoLabels: "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png",
    label: { it: "Chiara", en: "Light" },
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    urlNoLabels: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
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

/** URL del fondo per lo stile corrente. */
export function mapTileUrl(style: MapStyle, opts: { labels?: boolean } = {}): string {
  const s = MAP_STYLES[style] ?? MAP_STYLES.voyager;
  return opts.labels === false ? s.urlNoLabels : s.url;
}
