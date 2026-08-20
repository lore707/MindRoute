/**
 * Branded OG card generator for shared itineraries.
 *
 * Social crawlers (WhatsApp/Facebook/Twitter) don't run JS and won't accept an
 * SVG `og:image`, so we rasterise a 1200×630 PNG server-side: satori builds the
 * SVG (pure JS) and @resvg/resvg-wasm turns it into a PNG (WASM — no native
 * binaries, portable on Render's build). The card layers the destination hero
 * photo, a legibility gradient, the MindRoute wordmark, the destination title
 * and a "N giorni · …" subline.
 *
 * Result is cached in-memory by token so repeated crawler hits are cheap.
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";

// Works in both ESM (dev via tsx) and the CJS prod bundle, unlike __dirname.
const requireFromCwd = createRequire(path.join(process.cwd(), "noop.js"));

const BRAND_CORAL = "#E94560";
const BRAND_INK = "#1A1A2E";
const WIDTH = 1200;
const HEIGHT = 630;

// Same butterfly/compass mark used as the favicon (client/index.html), so the
// share card matches the site identity.
const LOGO_SVG =
  `<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'>` +
  `<path d='M10.5 28.75C12.38 28.84 16.44 29.21 19.59 30C22.73 30.8 25.93 31.94 29.37 33.5C32.82 35.06 36.3 36.88 40.28 39.37C44.27 41.87 50.56 46.76 53.29 48.46C56.01 50.16 55.73 49.63 56.64 49.58C57.55 49.54 58.18 49.42 58.74 48.18C59.3 46.95 59.53 42.08 60 42.17C60.47 42.26 60.84 47.53 61.54 48.74C62.24 49.95 63.24 49.56 64.2 49.44C65.15 49.33 64.24 50 67.27 48.04C70.3 46.09 77.69 40.45 82.37 37.7C87.06 34.95 91.81 32.96 95.38 31.54C98.95 30.12 101.42 29.63 103.77 29.16C106.12 28.7 108.08 28.63 109.5 28.75C110.93 28.86 111.72 29.26 112.3 29.86C112.88 30.47 113.26 31.22 113 32.38C112.74 33.55 111.88 35.27 110.76 36.86C109.64 38.44 107.97 40.33 106.29 41.89C104.61 43.45 102.56 45.04 100.69 46.23C98.83 47.41 97.22 48.28 95.1 49.02C92.98 49.77 91.91 50.56 87.97 50.7C84.03 50.84 75.2 49.81 71.47 49.86C67.74 49.91 64.78 50.63 65.59 50.98C66.41 51.33 73.12 51.38 76.36 51.96C79.6 52.54 82.61 53.59 85.03 54.48C87.46 55.36 88.62 55.97 90.91 57.27C93.19 58.58 97.73 61.24 98.74 62.31C99.74 63.38 98.04 63.26 96.92 63.71C95.8 64.15 94.12 64.89 92.02 64.96C89.93 65.03 86.57 64.73 84.33 64.13C82.09 63.52 81.49 63.19 78.6 61.33C75.71 59.46 69.53 54.48 66.99 52.94C64.45 51.4 64.22 52.05 63.36 52.1C62.49 52.15 62.14 52.52 61.82 53.22C61.49 53.92 61.17 55.01 61.4 56.29C61.63 57.58 62.89 59.65 63.22 60.91C63.54 62.17 63.89 58.37 63.36 63.85C62.82 69.32 61.14 93.84 60 93.77C58.86 93.7 57.06 68.88 56.5 63.43C55.94 57.97 56.29 62.31 56.64 61.05C56.99 59.79 58.42 57.25 58.6 55.87C58.79 54.5 58.28 53.43 57.76 52.8C57.25 52.17 56.46 52.01 55.53 52.1C54.59 52.19 54.64 51.75 52.17 53.36C49.7 54.97 43.52 59.93 40.7 61.75C37.88 63.57 37.39 63.73 35.25 64.27C33.1 64.8 30.05 65.15 27.84 64.96C25.62 64.78 23.11 63.57 21.96 63.15C20.82 62.73 20.66 62.91 20.98 62.45C21.31 61.98 21.38 61.77 23.92 60.35C26.46 58.93 32.94 55.32 36.23 53.92C39.51 52.52 40.61 52.45 43.64 51.96C46.67 51.47 53.71 51.33 54.41 50.98C55.11 50.63 51.77 49.93 47.83 49.86C43.89 49.79 34.55 50.68 30.77 50.56C27 50.44 26.86 49.74 25.18 49.16C23.5 48.58 22.83 48.46 20.7 47.06C18.58 45.67 14.6 42.82 12.45 40.77C10.31 38.72 8.75 36.11 7.84 34.76C6.93 33.41 7.12 33.36 7 32.66C6.88 31.96 6.93 31.1 7.14 30.56C7.35 30.03 7.7 29.75 8.26 29.44C8.82 29.14 8.61 28.65 10.5 28.75Z' fill='%23E94560'/>` +
  `<path d='M60 21.19C60.51 21.22 60.77 25.95 61.54 27.21C62.31 28.47 63.61 28.42 64.61 28.75C65.62 29.07 68.04 28.77 67.55 29.16C67.06 29.56 62.94 29.77 61.68 31.12C60.42 32.47 60.56 37.28 60 37.28C59.44 37.28 59.58 32.47 58.32 31.12C57.06 29.77 52.87 29.58 52.45 29.16C52.03 28.75 54.8 28.96 55.8 28.61C56.81 28.26 57.76 28.3 58.46 27.07C59.16 25.83 59.49 21.17 60 21.19Z' fill='%23E94560'/>` +
  `<path d='M59.72 95.59C60.21 95.66 61.28 96.27 61.54 96.71C61.79 97.15 61.45 97.9 61.26 98.25C61.07 98.6 60.89 98.88 60.42 98.81C59.95 98.74 58.76 98.25 58.46 97.83C58.16 97.41 58.39 96.66 58.6 96.29C58.81 95.92 59.23 95.52 59.72 95.59Z' fill='%23E94560'/>` +
  `</svg>`;
const LOGO_DATA_URI = `data:image/svg+xml;utf8,${LOGO_SVG}`;

// ── Lazy one-time setup ────────────────────────────────────────────────────
let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    const wasmPath = resolveNodeModuleFile("@resvg/resvg-wasm/index_bg.wasm");
    wasmReady = initWasm(fs.readFileSync(wasmPath));
  }
  return wasmReady;
}

let fontsCache: Array<{ name: string; data: Buffer; weight: 400 | 700; style: "normal" }> | null = null;
function loadFonts() {
  if (!fontsCache) {
    fontsCache = [
      { name: "Playfair Display", weight: 700, style: "normal",
        data: fs.readFileSync(resolveNodeModuleFile("@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff")) },
      { name: "DM Sans", weight: 400, style: "normal",
        data: fs.readFileSync(resolveNodeModuleFile("@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff")) },
      { name: "DM Sans", weight: 700, style: "normal",
        data: fs.readFileSync(resolveNodeModuleFile("@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff")) },
    ];
  }
  return fontsCache;
}

/**
 * Resolve a file inside node_modules. Primary path is cwd/node_modules (both
 * `npm run dev` and `npm start` run from the repo root on Render); the
 * package-resolution fallback covers hoisting / non-root cwd edge cases.
 */
function resolveNodeModuleFile(rel: string): string {
  const direct = path.join(process.cwd(), "node_modules", rel);
  if (fs.existsSync(direct)) return direct;
  const m = rel.match(/^(@[^/]+\/[^/]+|[^/]+)\/(.+)$/);
  if (m) {
    try {
      const pkgDir = path.dirname(requireFromCwd.resolve(`${m[1]}/package.json`));
      const p = path.join(pkgDir, m[2]);
      if (fs.existsSync(p)) return p;
    } catch { /* fall through */ }
  }
  throw new Error(`OG card: cannot locate ${rel} in node_modules`);
}

/** Fetch the hero photo and inline it as a base64 data URI (satori can't fetch). */
async function fetchImageDataUri(url: string): Promise<string | null> {
  try {
    let sized = url;
    if (url.includes("images.unsplash.com")) {
      const [base, query = ""] = url.split("?");
      const p = new URLSearchParams(query);
      p.set("w", "1200"); p.set("q", "70"); p.set("fit", "crop"); p.set("fm", "jpg");
      p.delete("h"); p.delete("auto");
      sized = `${base}?${p.toString()}`;
    }
    const r = await fetch(sized);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await r.arrayBuffer());
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// satori accepts a React-like VDOM as plain objects — no JSX needed in a .ts file.
const el = (type: string, props: any) => ({ type, props });

function buildTree(opts: { title: string; days: number; subline: string; bgDataUri: string | null }) {
  const { title, days, subline, bgDataUri } = opts;
  const daysLabel = days ? `${days} ${days === 1 ? "giorno" : "giorni"}` : "";

  return el("div", {
    style: {
      width: WIDTH, height: HEIGHT, display: "flex", flexDirection: "column",
      position: "relative", fontFamily: "DM Sans", backgroundColor: BRAND_INK,
      ...(bgDataUri ? { backgroundImage: `url("${bgDataUri}")`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
    },
    children: [
      // legibility gradient (dark bottom-left → transparent top-right)
      el("div", {
        style: {
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex",
          backgroundImage:
            "linear-gradient(120deg, rgba(26,26,46,0.92) 0%, rgba(26,26,46,0.55) 42%, rgba(26,26,46,0.05) 78%)",
        },
      }),
      // wordmark — top-left
      el("div", {
        style: { position: "absolute", top: 54, left: 64, display: "flex", alignItems: "center" },
        children: [
          el("img", { src: LOGO_DATA_URI, width: 46, height: 46, style: { marginRight: 14 } }),
          el("div", { style: { color: "white", fontSize: 30, fontWeight: 700, letterSpacing: 1 }, children: "MindRoute" }),
        ],
      }),
      // content block — bottom-left
      el("div", {
        style: {
          position: "absolute", left: 64, right: 80, bottom: 64,
          display: "flex", flexDirection: "column",
        },
        children: [
          el("div", {
            style: {
              color: BRAND_CORAL, fontSize: 22, fontWeight: 700,
              letterSpacing: 3, textTransform: "uppercase", marginBottom: 14,
            },
            children: "Il tuo viaggio su misura",
          }),
          el("div", {
            style: {
              color: "white", fontFamily: "Playfair Display", fontWeight: 700,
              fontSize: title.length > 22 ? 76 : 92, lineHeight: 1.02, letterSpacing: -1,
            },
            children: title,
          }),
          // coral divider
          el("div", { style: { width: 84, height: 5, backgroundColor: BRAND_CORAL, borderRadius: 3, marginTop: 26, marginBottom: 22, display: "flex" } }),
          el("div", {
            style: { color: "rgba(255,255,255,0.9)", fontSize: 32, fontWeight: 400, lineHeight: 1.3, display: "flex" },
            children: [daysLabel, subline].filter(Boolean).join("  ·  "),
          }),
        ],
      }),
    ],
  });
}

// ── Share Card 9:16 — "Ritratto del viaggiatore" (3B) ─────────────────────
// Card verticale (1080×1920) per storie IG/TikTok: wordmark, eyebrow, il
// Ritratto in serif e il Paradosso in oro. Driver di crescita organica.
const PWIDTH = 1080;
const PHEIGHT = 1920;
const BRAND_GOLD = "#D4A853";

function buildPortraitTree(opts: { portrait: string; paradox: string | null; name: string; bgDataUri: string | null }) {
  const { portrait, paradox, name, bgDataUri } = opts;
  const big = portrait.length > 180;
  return el("div", {
    style: {
      width: PWIDTH, height: PHEIGHT, display: "flex", flexDirection: "column",
      position: "relative", fontFamily: "DM Sans", backgroundColor: "#0d070d",
      ...(bgDataUri ? { backgroundImage: `url("${bgDataUri}")`, backgroundSize: "cover", backgroundPosition: "center" } : {}),
    },
    children: [
      // veil scuro per leggibilità
      el("div", {
        style: {
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex",
          backgroundImage: "linear-gradient(180deg, rgba(13,7,13,0.82) 0%, rgba(13,7,13,0.7) 38%, rgba(13,7,13,0.92) 100%)",
        },
      }),
      // wordmark
      el("div", {
        style: { position: "absolute", top: 84, left: 88, display: "flex", alignItems: "center" },
        children: [
          el("img", { src: LOGO_DATA_URI, width: 58, height: 58, style: { marginRight: 18 } }),
          el("div", { style: { color: "white", fontSize: 38, fontWeight: 700, letterSpacing: 1 }, children: "MindRoute" }),
        ],
      }),
      // blocco contenuto centrato verticalmente
      el("div", {
        style: {
          position: "absolute", left: 88, right: 88, top: 320, display: "flex", flexDirection: "column",
        },
        children: [
          el("div", {
            style: { color: BRAND_CORAL, fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", marginBottom: 34, display: "flex" },
            children: "Il mio ritratto di viaggio",
          }),
          el("div", {
            style: {
              color: "white", fontFamily: "Playfair Display", fontWeight: 700,
              fontSize: big ? 60 : 74, lineHeight: 1.18, letterSpacing: -1, display: "flex",
            },
            children: portrait,
          }),
          ...(paradox ? [
            el("div", { style: { width: 92, height: 5, backgroundColor: BRAND_GOLD, borderRadius: 3, marginTop: 56, marginBottom: 34, display: "flex" } }),
            el("div", {
              style: { color: BRAND_GOLD, fontSize: 24, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 18, display: "flex" },
              children: "Il mio paradosso",
            }),
            el("div", {
              style: { color: "rgba(255,255,255,0.86)", fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 40, lineHeight: 1.32, display: "flex" },
              children: paradox,
            }),
          ] : []),
        ],
      }),
      // footer
      el("div", {
        style: { position: "absolute", left: 88, right: 88, bottom: 92, display: "flex", alignItems: "center", justifyContent: "space-between" },
        children: [
          el("div", { style: { color: "rgba(255,255,255,0.92)", fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 34, display: "flex" }, children: name ? `— ${name}` : "" }),
          el("div", { style: { color: BRAND_CORAL, fontSize: 26, fontWeight: 700, letterSpacing: 2, display: "flex" }, children: "scopri il tuo · mindroute" }),
        ],
      }),
    ],
  });
}

/** Render PNG verticale 9:16 del ritratto utente per le storie social. */
export async function renderPortraitSharePng(input: {
  portrait: string; paradox: string | null; name: string; bgImageUrl: string | null;
}): Promise<Buffer> {
  await ensureWasm();
  const fonts = loadFonts();
  const bgDataUri = input.bgImageUrl ? await fetchImageDataUri(input.bgImageUrl) : null;
  const portrait = (input.portrait || "").replace(/\s+/g, " ").trim().slice(0, 320);
  const paradox = input.paradox ? input.paradox.replace(/\s+/g, " ").trim().slice(0, 200) : null;
  const tree = buildPortraitTree({ portrait, paradox, name: input.name, bgDataUri });
  const svg = await satori(tree as any, { width: PWIDTH, height: PHEIGHT, fonts: fonts as any });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: PWIDTH } }).render().asPng();
  return Buffer.from(png);
}

const pngCache = new Map<string, Buffer>();

/**
 * Render (or return cached) branded OG PNG for a shared itinerary.
 * `cacheKey` should change when the visible content changes (token + hero url).
 */
export async function renderItineraryOgPng(input: {
  cacheKey: string;
  destination: string;
  days: number;
  subline: string;
  heroImageUrl: string | null;
}): Promise<Buffer> {
  const cached = pngCache.get(input.cacheKey);
  if (cached) return cached;

  await ensureWasm();
  const fonts = loadFonts();
  const bgDataUri = input.heroImageUrl ? await fetchImageDataUri(input.heroImageUrl) : null;

  const subline = (input.subline || "").replace(/\s+/g, " ").trim().slice(0, 110);
  const tree = buildTree({ title: input.destination || "MindRoute", days: input.days, subline, bgDataUri });

  const svg = await satori(tree as any, { width: WIDTH, height: HEIGHT, fonts: fonts as any });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: WIDTH } }).render().asPng();
  const buf = Buffer.from(png);

  if (pngCache.size > 200) pngCache.clear(); // crude bound; crawlers re-cache anyway
  pngCache.set(input.cacheKey, buf);
  return buf;
}
