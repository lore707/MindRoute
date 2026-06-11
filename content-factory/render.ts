/**
 * Slide renderer — satori (VDOM → SVG) + resvg-wasm (SVG → PNG), no browser.
 *
 * Format: 1080×1350 (4:5) — native for IG carousel, accepted by TikTok photo
 * mode. Four layouts:
 *   cover     — full-bleed photo, gradient, kicker + big Playfair hook
 *   place     — full-bleed photo, index chip, place name + area + body + chips
 *   statement — cream or ink typographic slide (no photo), accent word in coral italic
 *   cta       — ink slide with coral glow, butterfly mark, closing line + url pill
 */
import satori from "satori";
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import fs from "fs";
import { BRAND, loadFonts, logoDataUri, resolveNodeModuleFile } from "./brand";

export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

export type SlideSpec =
  | { layout: "cover"; kicker: string; title: string; imageDataUri: string | null; swipeHint?: string }
  | { layout: "place"; index: string; title: string; area: string; body: string; chips: string[]; imageDataUri: string | null }
  | { layout: "statement"; theme: "cream" | "ink"; kicker?: string; text: string; accent?: string }
  | { layout: "cta"; title: string; subtitle: string; url: string };

let wasmReady: Promise<void> | null = null;
function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    const wasmPath = resolveNodeModuleFile("@resvg/resvg-wasm/index_bg.wasm");
    wasmReady = initWasm(fs.readFileSync(wasmPath));
  }
  return wasmReady;
}

// satori accepts a React-like VDOM as plain objects — no JSX in a .ts file.
const el = (type: string, props: Record<string, unknown>) => ({ type, props });

function arrowDataUri(color: string): string {
  const svg =
    `<svg viewBox='0 0 34 24' xmlns='http://www.w3.org/2000/svg'>` +
    `<path d='M2 12H30M30 12L20 3M30 12L20 21' stroke='${color}' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round' fill='none'/>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${svg.replace(/#/g, "%23")}`;
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function wordmark(color: string, opts?: { size?: number }) {
  const size = opts?.size ?? 44;
  return el("div", {
    style: { display: "flex", alignItems: "center" },
    children: [
      el("img", { src: logoDataUri(BRAND.coral), width: size, height: size, style: { marginRight: 12 } }),
      el("div", {
        style: { color, fontSize: size * 0.62, fontWeight: 700, letterSpacing: 1.5, fontFamily: "DM Sans" },
        children: BRAND.siteName,
      }),
    ],
  });
}

function fullBleedPhoto(imageDataUri: string | null, gradient: string) {
  return [
    // photo (or ink fallback) under everything
    el("div", {
      style: {
        position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, display: "flex",
        backgroundColor: BRAND.ink,
        ...(imageDataUri ? { backgroundImage: `url("${imageDataUri}")`, backgroundSize: `${SLIDE_W}px ${SLIDE_H}px` } : {}),
      },
    }),
    el("div", {
      style: { position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, display: "flex", backgroundImage: gradient },
    }),
  ];
}

function coralDivider(marginTop: number, marginBottom: number) {
  return el("div", {
    style: { width: 88, height: 6, backgroundColor: BRAND.coral, borderRadius: 3, marginTop, marginBottom, display: "flex" },
  });
}

// ── Layouts ──────────────────────────────────────────────────────────────────

function coverTree(s: Extract<SlideSpec, { layout: "cover" }>) {
  const titleSize = s.title.length > 60 ? 72 : s.title.length > 38 ? 84 : 96;
  return el("div", {
    style: { width: SLIDE_W, height: SLIDE_H, display: "flex", position: "relative", fontFamily: "DM Sans" },
    children: [
      ...fullBleedPhoto(s.imageDataUri,
        "linear-gradient(180deg, rgba(26,26,46,0.50) 0%, rgba(26,26,46,0.10) 30%, rgba(26,26,46,0.18) 55%, rgba(26,26,46,0.93) 100%)"),
      el("div", { style: { position: "absolute", top: 64, left: 72, display: "flex" }, children: [wordmark(BRAND.white)] }),
      el("div", {
        style: { position: "absolute", left: 72, right: 72, bottom: 96, display: "flex", flexDirection: "column" },
        children: [
          el("div", {
            style: { color: BRAND.coral, fontSize: 27, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase", marginBottom: 22 },
            children: s.kicker,
          }),
          el("div", {
            style: { color: BRAND.white, fontFamily: "Playfair Display", fontWeight: 900, fontSize: titleSize, lineHeight: 1.04, letterSpacing: -1 },
            children: s.title,
          }),
          coralDivider(34, 0),
        ],
      }),
      el("div", {
        style: {
          position: "absolute", right: 72, bottom: 40, display: "flex", alignItems: "center",
          color: "rgba(255,255,255,0.85)", fontSize: 24, fontWeight: 500, letterSpacing: 2,
        },
        children: [
          el("div", { style: { display: "flex", marginRight: 14 }, children: s.swipeHint ?? "SCORRI" }),
          // freccia come SVG inline: il woff di DM Sans non ha il glifo "→"
          el("img", { src: arrowDataUri("rgba(255,255,255,0.85)"), width: 34, height: 24 }),
        ],
      }),
    ],
  });
}

function placeTree(s: Extract<SlideSpec, { layout: "place" }>) {
  const titleSize = s.title.length > 26 ? 58 : 68;
  return el("div", {
    style: { width: SLIDE_W, height: SLIDE_H, display: "flex", position: "relative", fontFamily: "DM Sans" },
    children: [
      ...fullBleedPhoto(s.imageDataUri,
        "linear-gradient(180deg, rgba(26,26,46,0.42) 0%, rgba(26,26,46,0.02) 26%, rgba(26,26,46,0.30) 58%, rgba(26,26,46,0.96) 100%)"),
      // wordmark small, top-right, keeps the photo clean
      el("div", { style: { position: "absolute", top: 56, right: 72, display: "flex" }, children: [wordmark("rgba(255,255,255,0.92)", { size: 36 })] }),
      // index chip top-left
      el("div", {
        style: {
          position: "absolute", top: 56, left: 72, display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: BRAND.coral, color: BRAND.white, borderRadius: 999,
          paddingLeft: 26, paddingRight: 26, paddingTop: 10, paddingBottom: 12,
          fontSize: 28, fontWeight: 700, letterSpacing: 2,
        },
        children: s.index,
      }),
      el("div", {
        style: { position: "absolute", left: 72, right: 72, bottom: 84, display: "flex", flexDirection: "column" },
        children: [
          el("div", {
            style: { color: BRAND.coral, fontSize: 25, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", marginBottom: 14 },
            children: s.area,
          }),
          el("div", {
            style: { color: BRAND.white, fontFamily: "Playfair Display", fontWeight: 700, fontSize: titleSize, lineHeight: 1.06, letterSpacing: -0.5, marginBottom: 22 },
            children: s.title,
          }),
          el("div", {
            style: { color: "rgba(255,255,255,0.92)", fontSize: 31, fontWeight: 400, lineHeight: 1.42, marginBottom: s.chips.length ? 26 : 0 },
            children: s.body,
          }),
          ...(s.chips.length
            ? [el("div", {
                style: { display: "flex", flexDirection: "row" },
                children: s.chips.slice(0, 3).map(chip =>
                  el("div", {
                    style: {
                      display: "flex", color: BRAND.white, fontSize: 23, fontWeight: 500,
                      border: "2px solid rgba(255,255,255,0.55)", borderRadius: 999,
                      paddingLeft: 22, paddingRight: 22, paddingTop: 8, paddingBottom: 10, marginRight: 16,
                      backgroundColor: "rgba(26,26,46,0.35)",
                    },
                    children: chip,
                  })),
              })]
            : []),
        ],
      }),
    ],
  });
}

function statementTree(s: Extract<SlideSpec, { layout: "statement" }>) {
  const dark = s.theme === "ink";
  const bg = dark ? BRAND.ink : BRAND.cream;
  const fg = dark ? BRAND.white : BRAND.ink;
  // Fallback difensivi: una copy malformata non deve mai far crashare il render.
  const text = s.text ?? "";
  const rawAccent = s.accent ?? null;
  const textSize = text.length > 130 ? 56 : text.length > 80 ? 64 : 76;

  // satori non supporta span inline multipli dentro un blocco di testo: si
  // renderizza parola-per-parola in un flex row con wrap, colorando di corallo
  // corsivo le parole che cadono dentro la sottostringa accent.
  const accent = rawAccent && text.includes(rawAccent) ? rawAccent : null;
  const accentStart = accent ? text.indexOf(accent) : -1;
  const accentEnd = accent ? accentStart + accent.length : -1;
  const wordGap = Math.round(textSize * 0.26);

  let cursor = 0;
  const textChildren = text.split(/\s+/).filter(Boolean).map(word => {
    const start = text.indexOf(word, cursor);
    cursor = start + word.length;
    // Test di sovrapposizione, non di contenimento: "silenzio," deve colorarsi
    // anche se la virgola sfora la fine dell'accent.
    const inAccent = accent !== null && start < accentEnd && start + word.length > accentStart;
    return el("div", {
      style: {
        display: "flex", marginRight: wordGap,
        color: inAccent ? BRAND.coral : fg,
        ...(inAccent ? { fontStyle: "italic" } : {}),
      },
      children: word,
    });
  });

  return el("div", {
    style: {
      width: SLIDE_W, height: SLIDE_H, display: "flex", flexDirection: "column", position: "relative",
      backgroundColor: bg, fontFamily: "DM Sans",
    },
    children: [
      // soft coral radial glow, top-right
      el("div", {
        style: {
          position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, display: "flex",
          backgroundImage: `radial-gradient(circle at 82% 12%, ${BRAND.coralSoft} 0%, rgba(233,69,96,0) 52%)`,
        },
      }),
      // big faint butterfly watermark bottom-right
      el("img", {
        src: logoDataUri(BRAND.coral), width: 380, height: 380,
        style: { position: "absolute", right: -70, bottom: -70, opacity: 0.08 },
      }),
      el("div", { style: { position: "absolute", top: 64, left: 72, display: "flex" }, children: [wordmark(fg)] }),
      el("div", {
        style: {
          position: "absolute", left: 72, right: 72, top: 0, bottom: 0,
          display: "flex", flexDirection: "column", justifyContent: "center",
        },
        children: [
          ...(s.kicker
            ? [el("div", {
                style: { color: BRAND.coral, fontSize: 27, fontWeight: 700, letterSpacing: 5, textTransform: "uppercase", marginBottom: 30 },
                children: s.kicker,
              })]
            : []),
          el("div", {
            style: {
              display: "flex", flexDirection: "row", flexWrap: "wrap",
              fontFamily: "Playfair Display", fontWeight: 700,
              fontSize: textSize, lineHeight: 1.22, letterSpacing: -0.5,
            },
            children: textChildren,
          }),
          coralDivider(44, 0),
        ],
      }),
    ],
  });
}

function ctaTree(s: Extract<SlideSpec, { layout: "cta" }>) {
  return el("div", {
    style: {
      width: SLIDE_W, height: SLIDE_H, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", position: "relative",
      backgroundColor: BRAND.ink, fontFamily: "DM Sans",
    },
    children: [
      el("div", {
        style: {
          position: "absolute", top: 0, left: 0, width: SLIDE_W, height: SLIDE_H, display: "flex",
          backgroundImage:
            `radial-gradient(circle at 50% 30%, rgba(233,69,96,0.22) 0%, rgba(233,69,96,0) 55%), ` +
            `radial-gradient(circle at 18% 88%, rgba(233,69,96,0.10) 0%, rgba(233,69,96,0) 40%)`,
        },
      }),
      el("img", { src: logoDataUri(BRAND.coral), width: 150, height: 150, style: { marginBottom: 38 } }),
      el("div", {
        style: { color: BRAND.white, fontSize: 34, fontWeight: 700, letterSpacing: 3, marginBottom: 56, display: "flex" },
        children: BRAND.siteName,
      }),
      el("div", {
        style: {
          color: BRAND.white, fontFamily: "Playfair Display", fontWeight: 700, fontSize: 62,
          lineHeight: 1.16, textAlign: "center", maxWidth: 880, marginBottom: 28, display: "flex", justifyContent: "center",
        },
        children: s.title,
      }),
      el("div", {
        style: {
          color: "rgba(255,255,255,0.82)", fontSize: 30, lineHeight: 1.45, textAlign: "center",
          maxWidth: 780, marginBottom: 64, display: "flex", justifyContent: "center",
        },
        children: s.subtitle,
      }),
      el("div", {
        style: {
          display: "flex", backgroundColor: BRAND.coral, color: BRAND.white, borderRadius: 999,
          paddingLeft: 46, paddingRight: 46, paddingTop: 20, paddingBottom: 24,
          fontSize: 32, fontWeight: 700, letterSpacing: 1,
        },
        children: s.url,
      }),
      el("div", {
        style: { color: "rgba(255,255,255,0.55)", fontSize: 24, marginTop: 26, letterSpacing: 2, display: "flex" },
        children: "LINK IN BIO",
      }),
    ],
  });
}

// ── Entry point ──────────────────────────────────────────────────────────────

export async function renderSlide(spec: SlideSpec): Promise<Buffer> {
  await ensureWasm();
  const fonts = loadFonts();
  const tree =
    spec.layout === "cover" ? coverTree(spec) :
    spec.layout === "place" ? placeTree(spec) :
    spec.layout === "statement" ? statementTree(spec) :
    ctaTree(spec);

  const svg = await satori(tree as any, { width: SLIDE_W, height: SLIDE_H, fonts: fonts as any });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: SLIDE_W } }).render().asPng();
  return Buffer.from(png);
}
