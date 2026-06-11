/**
 * MindRoute brand kit for the content factory.
 *
 * Single source of the visual identity used by the slide renderer: palette,
 * butterfly mark (same SVG as favicon / OG card), and the satori font set
 * loaded from @fontsource woff files already in node_modules (satori does not
 * read woff2).
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

// Works in both ESM (tsx) and a CJS bundle, unlike __dirname.
const requireFromCwd = createRequire(path.join(process.cwd(), "noop.js"));

export const BRAND = {
  coral: "#E94560",
  coralSoft: "rgba(233,69,96,0.14)",
  ink: "#1A1A2E",
  cream: "#FDFAF7",
  white: "#FFFFFF",
  siteName: "MindRoute",
} as const;

// Same butterfly/compass mark used as favicon and OG card.
const LOGO_PATHS = (fill: string) =>
  `<path d='M60 52C60 52 42 32 28 36C14 40 12 56 24 62C36 68 60 60 60 60' fill='${fill}'/>` +
  `<path d='M60 60C60 60 38 72 30 82C22 92 30 100 40 96C50 92 60 72 60 72' fill='${fill}' opacity='0.6'/>` +
  `<path d='M60 52C60 52 78 32 92 36C106 40 108 56 96 62C84 68 60 60 60 60' fill='${fill}'/>` +
  `<path d='M60 60C60 60 82 72 90 82C98 92 90 100 80 96C70 92 60 72 60 72' fill='${fill}' opacity='0.6'/>` +
  `<ellipse cx='60' cy='60' rx='5' ry='6' fill='white'/>`;

export function logoDataUri(fill = BRAND.coral): string {
  const svg =
    `<svg viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'>` +
    LOGO_PATHS(fill) +
    `</svg>`;
  // `#` is not valid raw inside a data URI — percent-encode it.
  return `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}`;
}

export interface SatoriFont {
  name: string;
  data: Buffer;
  weight: 400 | 500 | 700 | 900;
  style: "normal" | "italic";
}

let fontsCache: SatoriFont[] | null = null;

/** Load the brand font set (Playfair Display + DM Sans) for satori. */
export function loadFonts(): SatoriFont[] {
  if (!fontsCache) {
    const f = (rel: string) => fs.readFileSync(resolveNodeModuleFile(rel));
    fontsCache = [
      { name: "Playfair Display", weight: 700, style: "normal", data: f("@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff") },
      { name: "Playfair Display", weight: 700, style: "italic", data: f("@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff") },
      { name: "Playfair Display", weight: 900, style: "normal", data: f("@fontsource/playfair-display/files/playfair-display-latin-900-normal.woff") },
      { name: "DM Sans", weight: 400, style: "normal", data: f("@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff") },
      { name: "DM Sans", weight: 500, style: "normal", data: f("@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff") },
      { name: "DM Sans", weight: 700, style: "normal", data: f("@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff") },
    ];
  }
  return fontsCache;
}

/** Resolve a file inside node_modules (cwd first, package resolution as fallback). */
export function resolveNodeModuleFile(rel: string): string {
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
  throw new Error(`content-factory: cannot locate ${rel} in node_modules`);
}
