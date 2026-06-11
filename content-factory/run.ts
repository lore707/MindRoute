/**
 * Content factory orchestrator — one run = one ready-to-post draft.
 *
 *   npx tsx content-factory/run.ts                        # pillar+dest auto (rotazione)
 *   npx tsx content-factory/run.ts --pillar deep-dive     # forza il pilastro
 *   npx tsx content-factory/run.ts --dest "Kyoto, Japan"  # forza la destinazione
 *   npx tsx content-factory/run.ts --dry                  # niente Claude/Unsplash, copy fissa di test
 *
 * Output: content-factory/out/<YYYY-MM-DD>-<slug>/
 *   slide-01.png … slide-NN.png   (1080×1350)
 *   caption.txt                   (caption + hashtag, pronta da incollare)
 *   meta.json                     (piano, crediti foto, copy completa)
 */
import fs from "fs";
import path from "path";
import { plan as makePlan, loadState, saveState, PILLARS, type Pillar } from "./planner";
import { writeCopy, type CopyResult } from "./copywriter";
import { fetchSlideImage, type SlideImage } from "./images";
import { renderSlide, type SlideSpec } from "./render";

// Node 20.12+: load repo-root .env if present (no dotenv dependency).
try { process.loadEnvFile(path.join(process.cwd(), ".env")); } catch { /* fine: env già impostato */ }

const CONFIG = JSON.parse(fs.readFileSync(path.join(process.cwd(), "content-factory", "config.json"), "utf-8")) as {
  siteUrl: string; ctaTitleDefault: string; ctaSubtitleDefault: string;
};

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}
const DRY = process.argv.includes("--dry");

function dryCopy(): CopyResult {
  return {
    slug: "test-visivo",
    cover: { kicker: "Kyoto in 5 luoghi veri", title: "La Kyoto che vedi quando gli altri dormono", imageQuery: "Kyoto temple sunrise" },
    slides: [
      { kind: "place", index: "01", title: "Fushimi Inari", area: "Fushimi · Kyoto", body: "Mille torii vermigli su per la montagna. Alle 7 sei solo tu e il suono dei tuoi passi.", chips: ["gratis", "all'alba"], imageQuery: "Fushimi Inari torii gates" },
      { kind: "place", index: "02", title: "Philosopher's Path", area: "Higashiyama", body: "Un canale, i templi, nessuna fretta. La camminata che ti rimette in ordine i pensieri.", chips: ["gratis", "pomeriggio"], imageQuery: "Philosopher's Path Kyoto canal" },
      { kind: "statement", theme: "cream", kicker: "TIPO 01", text: "Se in viaggio cerchi il silenzio, non stai scappando. Stai tornando.", accent: "il silenzio" },
    ],
    cta: { title: CONFIG.ctaTitleDefault, subtitle: CONFIG.ctaSubtitleDefault },
    caption: "La Kyoto che vedi quando gli altri dormono.\n\nCinque luoghi veri, zero filtri turistici.\n\nIl quiz è nel link in bio.",
    hashtags: ["#kyoto", "#giappone", "#viaggi", "#travelitaly", "#japantravel"],
  };
}

async function main() {
  const state = loadState();
  const forcedPillar = arg("pillar") as Pillar | undefined;
  if (forcedPillar && !PILLARS.includes(forcedPillar)) {
    throw new Error(`Pilastro sconosciuto "${forcedPillar}". Validi: ${PILLARS.join(", ")}`);
  }
  const plan = makePlan(state, { pillar: forcedPillar, dest: arg("dest") });
  console.log(`[factory] pilastro: ${plan.pillar} · soggetto: ${plan.subject}${plan.persona ? ` · persona: ${plan.persona}` : ""}`);

  if (!DRY && !process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY mancante (mettila in .env nella root o nell'ambiente).");
  }
  if (!DRY && !process.env.UNSPLASH_ACCESS_KEY) {
    console.warn("[factory] UNSPLASH_ACCESS_KEY mancante — slide senza foto (sfondo ink).");
  }

  const copy = DRY ? dryCopy() : await writeCopy(plan);
  console.log(`[factory] copy pronta: "${copy.cover.title}" · ${copy.slides.length + 2} slide totali`);

  // ── Images (sequential: stays politely under Unsplash burst limits) ────────
  const credits: Array<{ slide: number; photographer: string; photographerUrl: string }> = [];
  const cityHint = plan.bank?.city ?? "";

  const coverImg = DRY ? null : await fetchSlideImage([
    copy.cover.imageQuery,
    cityHint ? `${cityHint.split(",")[0]} travel` : "",
    "travel landscape cinematic",
  ]);
  if (coverImg) credits.push({ slide: 1, ...coverImg });

  const slideImgs: Array<SlideImage | null> = [];
  for (const s of copy.slides) {
    if (s.kind !== "place" || DRY) { slideImgs.push(null); continue; }
    const img = await fetchSlideImage([
      s.imageQuery,
      cityHint ? `${cityHint.split(",")[0]} ${s.title}` : s.title,
      cityHint ? `${cityHint.split(",")[0]} travel` : "",
    ]);
    slideImgs.push(img);
    if (img) credits.push({ slide: slideImgs.length + 1, ...img });
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const specs: SlideSpec[] = [
    { layout: "cover", kicker: copy.cover.kicker, title: copy.cover.title, imageDataUri: coverImg?.dataUri ?? null },
    ...copy.slides.map((s, i): SlideSpec =>
      s.kind === "place"
        ? { layout: "place", index: s.index, title: s.title, area: s.area, body: s.body, chips: s.chips ?? [], imageDataUri: slideImgs[i]?.dataUri ?? null }
        : { layout: "statement", theme: s.theme, kicker: s.kicker, text: s.text, accent: s.accent }),
    { layout: "cta", title: copy.cta?.title || CONFIG.ctaTitleDefault, subtitle: copy.cta?.subtitle || CONFIG.ctaSubtitleDefault, url: CONFIG.siteUrl },
  ];

  const date = new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), "content-factory", "out", `${date}-${copy.slug}`);
  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < specs.length; i++) {
    const png = await renderSlide(specs[i]);
    const file = path.join(outDir, `slide-${String(i + 1).padStart(2, "0")}.png`);
    fs.writeFileSync(file, png);
    console.log(`[factory] ✓ ${path.basename(file)} (${specs[i].layout})`);
  }

  const captionText = `${copy.caption}\n\n${copy.hashtags.join(" ")}\n`;
  fs.writeFileSync(path.join(outDir, "caption.txt"), captionText, "utf-8");
  fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify({
    date, pillar: plan.pillar, persona: plan.persona, subject: plan.subject,
    copy, photoCredits: credits,
  }, null, 2), "utf-8");

  if (!DRY) {
    state.history.push({ date, pillar: plan.pillar, subject: plan.subject, slug: copy.slug });
    saveState(state);
  }

  console.log(`\n[factory] Draft pronto → ${outDir}`);
  console.log(`[factory] ${specs.length} slide + caption.txt — incolla e posta.`);
}

main().catch(err => {
  console.error("[factory] ERRORE:", err instanceof Error ? err.message : err);
  process.exit(1);
});
