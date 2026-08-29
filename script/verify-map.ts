/**
 * verify-map.ts — le mappe non devono poter portare giù la schermata.
 *
 * I tre modi in cui una mappa Leaflet rompe l'applicazione, e che qui si
 * verificano su logica pura (niente browser, niente DOM):
 *
 *   · una coordinata non finita passata a fitBounds → eccezione dentro un
 *     effect → schermata nera al posto della mappa;
 *   · zero punti o un punto solo → fitBounds su bounds non validi;
 *   · tile che non arrivano → nessun segnale, l'utente pensa che il viaggio
 *     non ci sia.
 *
 * Uso:  npx tsx script/verify-map.ts
 */
import {
  safePoints, fitToPoints, attachTileHealth, attachAutoSize,
} from "../client/src/lib/leaflet-utils";
import { MAP_STYLES, mapTileUrl, readMapStyle, type MapStyle } from "../client/src/lib/map-style";

let fail = 0;
const check = (name: string, ok: boolean, got?: unknown) => {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${name}${ok ? "" : `  → ${JSON.stringify(got)}`}`);
  if (!ok) fail++;
};

/* ── finto Leaflet e finta mappa: registrano cosa è stato chiesto ── */
const fakeLeaflet = {
  latLngBounds: (arr: Array<[number, number]>) => ({
    isValid: () => arr.length > 0,
    __n: arr.length,
  }),
} as any;

function fakeMap() {
  const calls: string[] = [];
  return {
    calls,
    invalidateSize() { calls.push("invalidateSize"); },
    setView(c: any, z: number) { calls.push(`setView(${JSON.stringify(c)},${z})`); },
    fitBounds(_b: any) { calls.push("fitBounds"); },
    getContainer() { return null as any; },
    on() { /* noop */ }, off() { /* noop */ },
  };
}

/* ── 1. coordinate spazzatura ── */
console.log("\n1. coordinate: passa solo ciò che è utilizzabile\n");
{
  const sporche = [
    { lat: 41.9, lng: 12.5 },              // buona
    { lat: NaN, lng: 12.5 },
    { lat: 41.9, lng: undefined as any },
    { lat: null as any, lng: 3 },
    { lat: 91, lng: 0 },                   // fuori scala
    { lat: 0, lng: 181 },
    { lat: "41.9" as any, lng: 12.5 },     // stringa
    { lat: 0, lng: 0 },                    // valida: Golfo di Guinea esiste
  ];
  const buone = safePoints(sporche);
  check("8 punti sporchi → restano i 2 validi", buone.length === 2, buone);
  check("NaN scartato", !buone.some(p => Number.isNaN(p.lat)), buone);
  check("lat 91 scartata", !buone.some(p => p.lat === 91), buone);
  check("(0,0) CONSERVATA: e' un posto vero", buone.some(p => p.lat === 0 && p.lng === 0), buone);
}

/* ── 2. fitToPoints non lancia mai ── */
console.log("\n2. inquadratura: nessun ramo può lanciare\n");
{
  const m = fakeMap();
  fitToPoints(fakeLeaflet, m, [], { fallback: { lat: 41.9, lng: 12.5, zoom: 11 } });
  check("zero punti → setView sul fallback", m.calls.some(c => c.startsWith("setView")), m.calls);
}
{
  const m = fakeMap();
  fitToPoints(fakeLeaflet, m, []);
  check("zero punti e nessun fallback → non tocca la mappa", m.calls.length === 0, m.calls);
}
{
  const m = fakeMap();
  fitToPoints(fakeLeaflet, m, [{ lat: 41.9, lng: 12.5 }], { singleZoom: 15 });
  check("un punto → setView, mai fitBounds", m.calls.some(c => c.includes("setView")) && !m.calls.includes("fitBounds"), m.calls);
}
{
  const m = fakeMap();
  fitToPoints(fakeLeaflet, m, [{ lat: 41.9, lng: 12.5 }, { lat: 45.4, lng: 9.2 }]);
  check("due punti → fitBounds", m.calls.includes("fitBounds"), m.calls);
}
{
  // Solo spazzatura: si comporta come "nessun punto", NON lancia.
  const m = fakeMap();
  let threw = false;
  try {
    fitToPoints(fakeLeaflet, m, [{ lat: NaN, lng: NaN }, { lat: 999, lng: 999 }] as any);
  } catch { threw = true; }
  check("solo coordinate rotte → nessuna eccezione", !threw, threw);
  check("...e non inquadra niente", !m.calls.includes("fitBounds"), m.calls);
}
{
  // Perfino se Leaflet stesso esplode, la schermata resta in piedi.
  const esplosivo = { latLngBounds: () => { throw new Error("boom"); } } as any;
  let threw = false;
  try {
    fitToPoints(esplosivo, fakeMap(), [{ lat: 1, lng: 2 }, { lat: 3, lng: 4 }]);
  } catch { threw = true; }
  check("Leaflet che lancia → l'eccezione NON esce", !threw, threw);
}

/* ── 3. salute delle tile ── */
console.log("\n3. tile: allarme solo quando è vero\n");
{
  const handlers: Record<string, () => void> = {};
  const layer = {
    on: (ev: string, fn: () => void) => { handlers[ev] = fn; },
    off: () => { /* noop */ },
  };
  const seen: boolean[] = [];
  const detach = attachTileHealth(layer, h => seen.push(h), 6);

  for (let i = 0; i < 5; i++) handlers.tileerror();
  check("5 errori (sotto soglia) → nessun allarme", seen.length === 0, seen);

  handlers.tileerror();
  check("al sesto → allarme", seen.length === 1 && seen[0] === false, seen);

  handlers.tileerror(); handlers.tileerror();
  check("non ripete l'allarme mentre resta giu'", seen.length === 1, seen);

  handlers.tileload();
  check("una tile che arriva → rientro", seen.length === 2 && seen[1] === true, seen);

  for (let i = 0; i < 6; i++) handlers.tileerror();
  check("il contatore si era azzerato: riallarma solo dopo altri 6", seen.length === 3 && seen[2] === false, seen);
  detach();
}

/* ── 4. attachAutoSize è sicuro fuori dal browser ── */
console.log("\n4. auto-size\n");
{
  let threw = false;
  let detach: (() => void) | null = null;
  try { detach = attachAutoSize(fakeMap(), null); detach(); } catch { threw = true; }
  check("contenitore assente → non lancia e restituisce un detach", !threw && typeof detach === "function", threw);
}

/* ── 5. stili: nessun fondo nero di default, tutti e tre completi ── */
console.log("\n5. stili della mappa\n");
{
  check("il default NON e' la notte", readMapStyle() !== "dark", readMapStyle());
  for (const k of Object.keys(MAP_STYLES) as MapStyle[]) {
    const s = MAP_STYLES[k];
    check(`"${k}": url, variante senza etichette, etichetta IT+EN`,
      !!s.url && !!s.urlNoLabels && !!s.label.it && !!s.label.en, s);
    check(`"${k}": usa HTTPS e non richiede una chiave API`,
      s.url.startsWith("https://") && !/api[_-]?key|access[_-]?token/i.test(s.url), s.url);
  }
  check("labels:false → variante senza etichette",
    mapTileUrl("voyager", { labels: false }) === MAP_STYLES.voyager.urlNoLabels, mapTileUrl("voyager", { labels: false }));
  check("stile ignoto → si degrada a voyager, non a schermo nero",
    mapTileUrl("qualsiasi" as MapStyle) === MAP_STYLES.voyager.url, mapTileUrl("qualsiasi" as MapStyle));
}

console.log(fail === 0 ? "\nTutto verde.\n" : `\n${fail} controlli falliti.\n`);
process.exit(fail === 0 ? 0 : 1);
