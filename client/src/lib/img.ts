/**
 * Right-size an Unsplash image URL for the slot it renders in.
 *
 * Unsplash URLs are Imgix-backed, so width/quality/format can be controlled via
 * query params. Stored hero URLs are often `urls.full` (multi-MB) — rendering one
 * in a 200px card wastes megabytes and stalls the page. This caps the width and
 * forces modern formats. Non-Unsplash URLs are returned untouched.
 */
export function unsplashSized(url: string | null | undefined, w: number, q = 80): string {
  if (!url) return "";
  if (!url.includes("images.unsplash.com")) return url;
  const [base, query = ""] = url.split("?");
  const params = new URLSearchParams(query);
  params.set("w", String(w));
  params.set("q", String(q));
  params.set("auto", "format"); // serve webp/avif to browsers that support it
  params.set("fit", "crop");
  params.delete("h");
  return `${base}?${params.toString()}`;
}
