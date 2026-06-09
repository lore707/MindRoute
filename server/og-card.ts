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
  `<path d='M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60' fill='%23E94560'/>` +
  `<path d='M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72' fill='%23E94560' opacity='0.6'/>` +
  `<path d='M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60' fill='%23E94560'/>` +
  `<path d='M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72' fill='%23E94560' opacity='0.6'/>` +
  `<ellipse cx='60' cy='60' rx='5' ry='6' fill='white'/>` +
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
