/**
 * Portrait image sourcing for slides. The server's unsplash.ts helpers are
 * landscape-biased (hero/day images), so this module searches with
 * orientation=portrait and sizes the raw URL to exactly 1080×1350 — satori
 * gets a full-bleed, pre-cropped JPEG inlined as a data URI (it can't fetch).
 */
import { SLIDE_W, SLIDE_H } from "./render";

export interface SlideImage {
  dataUri: string;
  photographer: string;
  photographerUrl: string;
}

const usedIds = new Set<string>(); // no duplicate photos within one run

async function searchPortrait(query: string): Promise<{ raw: string; photographer: string; photographerUrl: string } | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=5`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
      if (r.ok) {
        const d = await r.json();
        const photo = ((d.results ?? []) as any[]).find(p => p.id && p.urls?.raw && !usedIds.has(p.id));
        if (!photo) return null;
        usedIds.add(photo.id);
        return {
          raw: photo.urls.raw as string,
          photographer: photo.user?.name ?? "Unknown",
          photographerUrl: photo.user?.links?.html ?? "https://unsplash.com",
        };
      }
      if (r.status === 429 || r.status >= 500) {
        await new Promise(res => setTimeout(res, 800 * Math.pow(2, attempt)));
        continue;
      }
      return null;
    } catch {
      await new Promise(res => setTimeout(res, 800 * Math.pow(2, attempt)));
    }
  }
  return null;
}

/**
 * Fetch a slide image for a query, falling back to progressively more generic
 * queries. Returns null only when everything fails (renderer falls back to
 * the ink background, slide stays legible).
 */
export async function fetchSlideImage(queries: string[]): Promise<SlideImage | null> {
  for (const q of queries.map(s => s?.trim()).filter((s): s is string => !!s && s.length > 2)) {
    const hit = await searchPortrait(q);
    if (!hit) continue;
    const sep = hit.raw.includes("?") ? "&" : "?";
    const sized = `${hit.raw}${sep}w=${SLIDE_W}&h=${SLIDE_H}&fit=crop&crop=entropy&q=78&fm=jpg`;
    try {
      const r = await fetch(sized);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      return {
        dataUri: `data:image/jpeg;base64,${buf.toString("base64")}`,
        photographer: hit.photographer,
        photographerUrl: hit.photographerUrl,
      };
    } catch {
      continue;
    }
  }
  return null;
}
