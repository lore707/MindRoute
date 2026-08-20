/**
 * trace.mjs — dal PNG del logo al tracciato SVG, senza indovinare.
 *
 * Il marchio e' una silhouette piena su fondo scuro: si separa con una soglia
 * di luminanza, si estraggono i contorni (Moore-neighbour tracing), si
 * semplificano (Ramer-Douglas-Peucker) e si trasformano in curve cubiche
 * (Catmull-Rom -> Bezier). Il risultato e' il logo VERO, non una copia a occhio.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const PNG = require("png-js");

const SRC = process.argv[2];
const OUT = process.argv[3] ?? "path.txt";
const THRESH = Number(process.argv[4] ?? 50);     // soglia su R-B (0..255)
const EPS = Number(process.argv[5] ?? 1.6);       // RDP, in pixel sorgente
const MIN_AREA = Number(process.argv[6] ?? 300);  // scarta il pulviscolo
// Quanto il marchio riempie il viewBox 120×120. 106 tiene lo stesso ingombro
// ottico del logo precedente (largo 96, alto 76): cosi' nessuna chiamata
// esistente a <BrandMark size=..> cambia peso nella pagina.
const FILL = Number(process.argv[7] ?? 106);

const png = PNG.load(SRC);
const W = png.width, H = png.height;

const px = await new Promise((res) => PNG.decode(SRC, res));

// ── 1. maschera ────────────────────────────────────────────────────────────
// NON la luminanza: le ali inferiori sono ombreggiate (lum .31) contro quelle
// superiori (lum .47), e qualsiasi soglia passa in mezzo alle due, tagliando
// via meta' marchio. Sul ROSSO invece la separazione e' netta e con un margine
// enorme — inchiostro R-B 131..167, fondo (alone compreso) R-B -2..11.
const redness = new Int16Array(W * H);
for (let i = 0, p = 0; i < px.length; i += 4, p++) {
  redness[p] = px[i] - px[i + 2];
}
const mask = new Uint8Array(W * H);
for (let i = 0; i < mask.length; i++) mask[i] = redness[i] >= THRESH ? 1 : 0;

const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : mask[y * W + x]);

// ── 2. componenti connesse (4-vicini), scartando le briciole ───────────────
const label = new Int32Array(W * H).fill(-1);
const comps = [];
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const idx = y * W + x;
    if (!mask[idx] || label[idx] !== -1) continue;
    const id = comps.length;
    const stack = [idx];
    label[idx] = id;
    let n = 0, minX = x, minY = y, maxX = x, maxY = y, seed = idx;
    while (stack.length) {
      const c = stack.pop();
      const cx = c % W, cy = (c - cx) / W;
      n++;
      if (cx < minX) { minX = cx; seed = c; }
      if (cy < minY) minY = cy;
      if (cx > maxX) maxX = cx;
      if (cy > maxY) maxY = cy;
      const nb = [c - 1, c + 1, c - W, c + W];
      for (let k = 0; k < 4; k++) {
        const m = nb[k];
        if (m < 0 || m >= mask.length) continue;
        // niente wrap orizzontale
        if (k < 2 && Math.floor(m / W) !== cy) continue;
        if (mask[m] && label[m] === -1) { label[m] = id; stack.push(m); }
      }
    }
    comps.push({ id, n, minX, minY, maxX, maxY, seed });
  }
}
const keep = comps.filter(c => c.n >= MIN_AREA).sort((a, b) => b.n - a.n);
console.error(`componenti: ${comps.length} totali, ${keep.length} sopra ${MIN_AREA}px`);
for (const c of keep) console.error(`  #${c.id} ${c.n}px  box ${c.minX},${c.minY} → ${c.maxX},${c.maxY}`);

// ── 3. contorno esterno (Moore) di ogni componente ─────────────────────────
const DIRS = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
/**
 * Moore-neighbour tracing con criterio di arresto di Jacob.
 *
 * La prima versione ripartiva da una direzione fissa e tornava subito al
 * punto di partenza: quattro punti e via. Il backtrack va tenuto esplicito —
 * si riparte SEMPRE dal vicino da cui siamo arrivati, ruotando in senso
 * orario — altrimenti il contorno non cammina.
 */
function traceOutline(comp) {
  const inComp = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? false : label[y * W + x] === comp.id);

  let sx = -1, sy = -1;
  outer:
  for (let y = comp.minY; y <= comp.maxY; y++) {
    for (let x = comp.minX; x <= comp.maxX; x++) {
      if (inComp(x, y)) { sx = x; sy = y; break outer; }
    }
  }
  if (sx < 0) return [];

  const pts = [[sx, sy]];
  // Scandendo da sinistra, il pixel precedente sulla riga e' fondo: e' il
  // nostro backtrack di partenza (direzione 4 = ovest).
  let bx = sx - 1, by = sy;
  let cx = sx, cy = sy;
  let firstStep = null;

  const guard = comp.n * 8 + 10000;
  for (let step = 0; step < guard; step++) {
    // indice della direzione del backtrack rispetto al pixel corrente
    let start = 0;
    for (let k = 0; k < 8; k++) {
      if (cx + DIRS[k][0] === bx && cy + DIRS[k][1] === by) { start = k; break; }
    }
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (start + k) % 8;
      const nx = cx + DIRS[d][0], ny = cy + DIRS[d][1];
      if (inComp(nx, ny)) {
        // il vicino precedente (fondo) diventa il nuovo backtrack
        const pd = (start + k - 1 + 8) % 8;
        bx = cx + DIRS[pd][0]; by = cy + DIRS[pd][1];
        cx = nx; cy = ny;
        pts.push([cx, cy]);
        moved = true;
        if (firstStep === null) firstStep = `${cx},${cy}`;
        break;
      }
    }
    if (!moved) break;                       // pixel isolato
    // Jacob: si chiude quando si ritorna sul punto di partenza ripetendo
    // anche il primo passo.
    if (cx === sx && cy === sy && pts.length > 2) { pts.pop(); break; }
  }
  return pts;
}

// ── 4. RDP ─────────────────────────────────────────────────────────────────
function rdpOpen(points, eps) {
  if (points.length < 3) return points;
  let maxD = -1, idx = 0;
  const [ax, ay] = points[0], [bx, by] = points[points.length - 1];
  const dx = bx - ax, dy = by - ay;
  const len = Math.hypot(dx, dy);
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const d = len < 1e-9
      ? Math.hypot(x - ax, y - ay)
      : Math.abs(dy * x - dx * y + bx * ay - by * ax) / len;
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [points[0], points[points.length - 1]];
  return [...rdpOpen(points.slice(0, idx + 1), eps).slice(0, -1), ...rdpOpen(points.slice(idx), eps)];
}

/** Su un anello chiuso: si taglia nel punto piu' lontano dall'inizio e si
 *  semplificano le due meta' separatamente. Senza questo, il segmento
 *  inizio→fine e' lungo zero e RDP restituisce sempre due punti. */
function rdp(ring, eps) {
  if (ring.length < 4) return ring;
  const [ax, ay] = ring[0];
  let far = 0, farD = -1;
  for (let i = 1; i < ring.length; i++) {
    const d = Math.hypot(ring[i][0] - ax, ring[i][1] - ay);
    if (d > farD) { farD = d; far = i; }
  }
  const A = rdpOpen(ring.slice(0, far + 1), eps);
  const B = rdpOpen(ring.slice(far), eps);
  return [...A.slice(0, -1), ...B.slice(0, -1)];
}

// ── 5. Catmull-Rom chiuso → cubiche ────────────────────────────────────────
function toPath(pts, sx, sy, tx, ty, prec = 2) {
  const P = pts.map(([x, y]) => [ (x - sx) * tx, (y - sy) * ty ]);
  const n = P.length;
  const f = (v) => {
    const r = Math.round(v * 10 ** prec) / 10 ** prec;
    return String(r);
  };
  let d = `M${f(P[0][0])} ${f(P[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P[(i - 1 + n) % n], p1 = P[i], p2 = P[(i + 1) % n], p3 = P[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

// ── 6. normalizzazione su viewBox 120×120 ──────────────────────────────────
const bx0 = Math.min(...keep.map(c => c.minX));
const by0 = Math.min(...keep.map(c => c.minY));
const bx1 = Math.max(...keep.map(c => c.maxX));
const by1 = Math.max(...keep.map(c => c.maxY));
const bw = bx1 - bx0, bh = by1 - by0;
// Il marchio è più largo che alto: si adatta alla larghezza e si centra.
const scale = FILL / Math.max(bw, bh);
const offX = (120 - bw * scale) / 2;
const offY = (120 - bh * scale) / 2;
console.error(`bbox sorgente ${bw}×${bh} → scala ${scale.toFixed(4)}, offset ${offX.toFixed(1)},${offY.toFixed(1)}`);

const paths = [];
for (const c of keep) {
  const outline = traceOutline(c);
  const simple = rdp(outline, EPS);
  // il tracciato torna sul punto di partenza: togli il duplicato
  if (simple.length > 2) {
    const a = simple[0], z = simple[simple.length - 1];
    if (a[0] === z[0] && a[1] === z[1]) simple.pop();
  }
  const d = toPath(simple, bx0 - offX / scale, by0 - offY / scale, scale, scale);
  paths.push({ id: c.id, area: c.n, pts: simple.length, d });
  console.error(`  → #${c.id}: ${outline.length} punti → ${simple.length}, d=${d.length} char`);
}

writeFileSync(OUT, JSON.stringify(paths, null, 2));
console.error(`scritto ${OUT} (${paths.length} tracciati, ${paths.reduce((a, p) => a + p.d.length, 0)} char totali)`);
