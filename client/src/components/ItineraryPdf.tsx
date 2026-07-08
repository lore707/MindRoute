/* ItineraryPdf.tsx
 * ─────────────────────────────────────────────────────────────
 * Il keepsake in PDF VERO (@react-pdf/renderer): scaricato come file,
 * niente dialog di stampa. Palette "carta": fondo crema, inchiostro scuro,
 * corallo/oro come accenti — contrasti pensati per lettura e stampa.
 * Impaginazione nativa: una pagina per giorno, folio automatico, sezioni
 * che degradano con grazia se i dati mancano (honesty-policy).
 *
 * AFFIDABILITÀ (questo PDF non deve MAI fallire):
 *  - font TTF self-hosted in /public/fonts (nessuna dipendenza da gstatic
 *    a runtime); registrazione lazy via registerPdfFonts() prima del render;
 *  - NIENTE emoji nel documento: i TTF non le hanno e una emoji-source CDN
 *    sarebbe un'altra dipendenza di rete — ogni stringa dinamica passa da
 *    tx() (il glifo mancante diventa testo pulito, mai tofu);
 *  - foto pre-risolte in data-URI dal chiamante: una foto irraggiungibile
 *    diventa "nessuna foto", non un errore;
 *  - titoli auto-scalanti: i nomi lunghi ("Lecce & Salento Peninsula…")
 *    scendono di corpo invece di sfondare la pagina.
 *
 * PREVIEW (gate prenotazioni): con preview=true escono solo cover, intro e
 * Giorno 1, con watermark ANTEPRIMA e una pagina finale che spiega come
 * sbloccare il documento completo (volo+alloggio confermati).
 */

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, Font, Svg, Path, Circle, G, Text as SvgText } from "@react-pdf/renderer";
import type { ItineraryData, Moment } from "@/components/ItineraryCinematic";

// ── Font brand self-hosted ─────────────────────────────────────────────────
// base: "" nel browser (fetch relativa all'origin); il test Node passa un
// percorso assoluto al filesystem. Idempotente.
let fontsRegistered = false;
export function registerPdfFonts(base = "") {
  if (fontsRegistered) return;
  fontsRegistered = true;
  Font.register({
    family: "Playfair",
    fonts: [
      { src: `${base}/fonts/playfair-400.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/playfair-600.ttf`, fontWeight: 600 },
      { src: `${base}/fonts/playfair-400i.ttf`, fontWeight: 400, fontStyle: "italic" },
      { src: `${base}/fonts/playfair-600i.ttf`, fontWeight: 600, fontStyle: "italic" },
    ],
  });
  Font.register({
    family: "DMSans",
    fonts: [
      { src: `${base}/fonts/dmsans-400.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/dmsans-500.ttf`, fontWeight: 500 },
      { src: `${base}/fonts/dmsans-700.ttf`, fontWeight: 700 },
    ],
  });
  // Niente sillabazione automatica: su titoli evocativi spezzava male.
  Font.registerHyphenationCallback((w) => [w]);
}

// Rimuove emoji/simboli dalle stringhe dinamiche (dati LLM): i TTF non hanno
// quei glifi e nel PDF diventerebbero tofu. Le frecce (u2190-u21FF) restano:
// "Milano → Bari" è testo legittimo e i font le hanno.
const RE_ASTRAL = new RegExp("[\\uD800-\\uDBFF][\\uDC00-\\uDFFF]", "g");
const RE_SYMBOLS = new RegExp("[\\u2300-\\u27BF\\u2B00-\\u2BFF\\uFE0F\\u200D\\u20E3]", "g");
function tx(v: unknown): string {
  return String(v ?? "")
    .replace(RE_ASTRAL, "")
    .replace(RE_SYMBOLS, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Palette carta ──────────────────────────────────────────────────────────
const C = {
  paper: "#FBF7F1",
  ink: "#241A20",
  soft: "#5C4F55",
  faint: "#93858B",
  coral: "#C43550",       // corallo brand scurito: regge il contrasto su crema
  coralSoft: "#F4DDE1",
  gold: "#8F6B25",
  teal: "#3E7A6E",
  stroke: "#E6DBD1",
  plum: "#2A1420",        // blocchi scuri (cover fallback, chiusura)
};
const SEG = ["#C43550", "#8F6B25", "#3E7A6E", "#7C5E9E", "#4E7CA6", "#B06A47"];

const s = StyleSheet.create({
  page: { backgroundColor: C.paper, fontFamily: "DMSans", fontSize: 10, color: C.ink, paddingTop: 46, paddingBottom: 52, paddingHorizontal: 48 },
  pagePhoto: { backgroundColor: C.paper, fontFamily: "DMSans", fontSize: 10, color: C.ink, paddingTop: 0, paddingBottom: 52, paddingHorizontal: 0 },

  runHead: { position: "absolute", top: 18, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 5 },
  brandDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.coral },
  brandTxt: { fontSize: 9, fontWeight: 700, letterSpacing: 1, color: C.ink },
  runRight: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: C.faint },
  folio: { position: "absolute", bottom: 20, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 0.5, borderTopColor: C.stroke, paddingTop: 8 },
  folioL: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 9, color: C.faint },
  folioN: { fontSize: 9, color: C.soft },

  kicker: { fontSize: 8, letterSpacing: 2.4, textTransform: "uppercase", color: C.coral, fontWeight: 700, marginBottom: 10 },
  h2: { fontFamily: "Playfair", fontSize: 26, fontWeight: 600, lineHeight: 1.15, marginBottom: 14 },
  em: { fontStyle: "italic", color: C.coral },

  // watermark anteprima
  wm: { position: "absolute", top: 380, left: -60, right: -60, transform: "rotate(-28deg)", opacity: 0.13 },
  wmTxt: { fontFamily: "DMSans", fontSize: 46, fontWeight: 700, letterSpacing: 6, color: C.coral, textAlign: "center" },

  // cover
  coverImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" },
  coverVeil: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "#1A0B12", opacity: 0.42 },
  coverVeilBottom: { position: "absolute", left: 0, right: 0, bottom: 0, height: 320, backgroundColor: "#160910", opacity: 0.5 },
  coverTop: { position: "absolute", top: 26, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between" },
  coverBody: { position: "absolute", left: 40, right: 40, bottom: 44 },
  coverLoc: { fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: "#F2E9E4", marginBottom: 10 },
  coverTitle: { fontFamily: "Playfair", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.02, marginBottom: 8 },
  coverSub: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 14, color: "#F2D9DD", marginBottom: 22 },
  coverFacts: { flexDirection: "row", gap: 26, borderTopWidth: 0.5, borderTopColor: "#FFFFFF55", paddingTop: 14 },
  coverFactN: { fontFamily: "Playfair", fontSize: 18, fontWeight: 600, color: "#FFFFFF" },
  coverFactL: { fontSize: 7.5, letterSpacing: 1.8, textTransform: "uppercase", color: "#E8D8DA", marginTop: 3 },
  previewPill: { position: "absolute", top: 60, left: 40, backgroundColor: C.coral, borderRadius: 10, paddingVertical: 5, paddingHorizontal: 12 },
  previewPillTxt: { fontSize: 8.5, fontWeight: 700, letterSpacing: 2, color: "#FFFFFF", textTransform: "uppercase" },

  // intro
  quote: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 16, lineHeight: 1.45, color: C.ink, marginBottom: 20, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: C.coral },
  cols: { flexDirection: "row", gap: 18 },
  col: { flex: 1 },
  blockH: { fontSize: 8, letterSpacing: 2, textTransform: "uppercase", color: C.faint, fontWeight: 700, marginBottom: 9 },
  sigRow: { flexDirection: "row", gap: 9, marginBottom: 9, alignItems: "flex-start" },
  sigDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.coral, marginTop: 3.5 },
  sigName: { fontFamily: "Playfair", fontSize: 11.5, fontWeight: 600 },
  sigDesc: { fontSize: 9, color: C.soft, marginTop: 1.5, lineHeight: 1.4 },
  factRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: C.stroke },
  factK: { fontSize: 9, color: C.faint },
  factV: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 10.5, color: C.ink },

  // day pages
  dayHeroWrap: { height: 250, position: "relative", marginBottom: 20 },
  dayHeroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, objectFit: "cover" },
  dayHeroVeil: { position: "absolute", left: 0, right: 0, bottom: 0, height: 140, backgroundColor: "#160910", opacity: 0.55 },
  dayHeroPlain: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.plum },
  dayHeroBody: { position: "absolute", left: 40, right: 40, bottom: 20 },
  dayHeroKick: { fontSize: 8, letterSpacing: 2.4, textTransform: "uppercase", color: "#F2D9DD", fontWeight: 700, marginBottom: 6 },
  dayHeroTitle: { fontFamily: "Playfair", fontWeight: 600, color: "#FFFFFF", lineHeight: 1.08 },
  dayBody: { paddingHorizontal: 48 },
  tlRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 7 },
  tlDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.stroke, marginTop: 3.5 },
  tlDotKey: { backgroundColor: C.coral },
  tlWhen: { fontSize: 8, letterSpacing: 1.6, textTransform: "uppercase", color: C.faint, width: 74 },
  tlWhat: { fontFamily: "Playfair", fontSize: 11, flex: 1, lineHeight: 1.3 },
  focusBox: { marginTop: 14, padding: 16, backgroundColor: "#FFFFFF", borderWidth: 0.5, borderColor: C.stroke, borderRadius: 8 },
  focusKick: { fontSize: 7.5, letterSpacing: 2.2, textTransform: "uppercase", color: C.coral, fontWeight: 700, marginBottom: 6 },
  focusName: { fontFamily: "Playfair", fontSize: 16, fontWeight: 600, marginBottom: 6, lineHeight: 1.2 },
  focusDesc: { fontSize: 9.5, lineHeight: 1.55, color: C.soft },
  metaRow: { flexDirection: "row", gap: 18, marginTop: 10 },
  metaK: { fontSize: 7.5, letterSpacing: 1.8, textTransform: "uppercase", color: C.faint },
  metaV: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 10.5, marginTop: 2 },
  whyBox: { marginTop: 12, padding: 12, backgroundColor: C.coralSoft, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: C.coral },
  whyTxt: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 9.5, lineHeight: 1.5, color: "#5A2430" },

  // practical
  budgetCard: { padding: 16, backgroundColor: "#FFFFFF", borderWidth: 0.5, borderColor: C.stroke, borderRadius: 8, marginBottom: 16 },
  budgetTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
  budgetL: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 10, color: C.soft },
  budgetV: { fontFamily: "Playfair", fontSize: 22, fontWeight: 600, color: C.ink },
  bbar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  brow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4.5, borderBottomWidth: 0.5, borderBottomColor: C.stroke },
  bsw: { width: 7, height: 7, borderRadius: 2 },
  bnm: { fontFamily: "Playfair", fontSize: 10, flex: 1 },
  bpc: { fontSize: 8.5, color: C.faint, width: 30, textAlign: "right" },
  bam: { fontSize: 10, fontWeight: 700, width: 52, textAlign: "right" },
  legRow: { flexDirection: "row", gap: 9, marginBottom: 8 },
  legDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.coral, marginTop: 3 },
  legR: { fontFamily: "Playfair", fontSize: 10.5, fontWeight: 600 },
  legDD: { fontSize: 8.5, color: C.soft, marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  chip: { fontSize: 8.5, color: C.soft, borderWidth: 0.5, borderColor: C.stroke, backgroundColor: "#FFFFFF", borderRadius: 9, paddingVertical: 4, paddingHorizontal: 8 },

  // checklist
  checkIntro: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 11, color: C.soft, lineHeight: 1.5, marginBottom: 16 },
  crow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: C.stroke },
  cbox: { width: 13, height: 13, borderWidth: 1.2, borderColor: C.coral, borderRadius: 3 },
  cn: { fontFamily: "Playfair", fontSize: 12, fontWeight: 600 },
  cm: { fontSize: 8.5, color: C.faint, marginTop: 2 },

  // closing / unlock
  closingPage: { backgroundColor: C.plum, fontFamily: "DMSans", color: "#F5EDE7", justifyContent: "center", paddingHorizontal: 64 },
  closingKick: { fontSize: 8.5, letterSpacing: 3, textTransform: "uppercase", color: "#D89AA5", fontWeight: 700, marginBottom: 18, textAlign: "center" },
  closingQuote: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 22, lineHeight: 1.45, textAlign: "center", color: "#FDF8F4" },
  closingSign: { marginTop: 30, textAlign: "center", fontSize: 9, color: "#C9AEB4" },
  unlockList: { marginTop: 26, alignSelf: "center" },
  unlockRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  unlockBox: { width: 12, height: 12, borderWidth: 1.2, borderColor: "#D89AA5", borderRadius: 3 },
  unlockTxt: { fontFamily: "Playfair", fontStyle: "italic", fontSize: 13, color: "#F2D9DD" },
});

function firstInt(v: string | number | undefined): number {
  if (typeof v === "number") return v;
  if (!v) return 0;
  const m = String(v).replace(/[.\s]/g, "").match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// Corpo del titolo in funzione della lunghezza: i nomi-destinazione lunghi
// scendono di misura invece di esplodere su tre righe.
function fitSize(text: string, base: number, min: number, comfy: number): number {
  const len = text.length;
  if (len <= comfy) return base;
  const scaled = Math.round(base * (comfy / len) * 10) / 10;
  return Math.max(min, scaled);
}

export interface PdfImages { hero?: string; days: Record<number, string | undefined> }

type Props = {
  data: ItineraryData;
  itinerary: any;
  affiliateUrls: Record<string, string>;
  profilingInput: any;
  lang: "it" | "en";
  images: PdfImages;
  preview?: boolean;
};

function RunHead({ right }: { right: string }) {
  return (
    <View style={s.runHead} fixed>
      <View style={s.brand}><View style={s.brandDot} /><Text style={s.brandTxt}>MindRoute</Text></View>
      <Text style={s.runRight}>{right}</Text>
    </View>
  );
}

function Folio({ label }: { label: string }) {
  return (
    <View style={s.folio} fixed>
      <Text style={s.folioL}>{label}</Text>
      <Text style={s.folioN} render={({ pageNumber }) => String(pageNumber)} />
    </View>
  );
}

function Watermark({ it }: { it: boolean }) {
  return (
    <View style={s.wm} fixed>
      <Text style={s.wmTxt}>{it ? "ANTEPRIMA" : "PREVIEW"}</Text>
    </View>
  );
}

export function ItineraryPdfDoc({ data, itinerary, affiliateUrls, profilingInput, lang, images, preview = false }: Props) {
  const it = lang === "it";
  const dest = tx(data.destination) || "MindRoute";
  const allDays = Array.isArray(data.days) ? data.days : [];
  const days = preview ? allDays.slice(0, 1) : allDays;
  const dayCount = allDays.length;

  const dateRange = (() => {
    const a = profilingInput?.leaveDate ?? profilingInput?.travelDate;
    const b = profilingInput?.returnDate;
    const f = (raw: any) => { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; };
    const da = a ? f(a) : null; const db = b ? f(b) : null;
    if (!da) return null;
    const fmt = new Intl.DateTimeFormat(it ? "it-IT" : "en-US", { day: "numeric", month: "long" });
    return db ? `${fmt.format(da)} → ${fmt.format(db)}` : fmt.format(da);
  })();

  const peopleLabel = (() => {
    const c = (profilingInput?.companions ?? "").toLowerCase();
    if (!c) return null;
    if (c.includes("couple") || c.includes("coppia") || c.includes("partner")) return it ? "2 persone" : "2 people";
    if (c.includes("friend") || c.includes("amici")) return it ? "amici" : "friends";
    if (c.includes("famil")) return it ? "famiglia" : "family";
    return it ? "solo" : "solo";
  })();

  const budget = (() => {
    const raw = itinerary?.budgetSummary;
    if (!raw) return null;
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (p?.items?.length) {
        const rows = p.items
          .filter((i: any) => !/totale|total/i.test(i.label))
          .map((i: any, idx: number) => ({ nm: tx(i.label), amt: firstInt(i.total ?? i.perPerson), c: SEG[idx % SEG.length] }))
          .filter((r: any) => r.amt > 0);
        const totalRow = p.items.find((i: any) => /totale|total/i.test(i.label));
        const total = totalRow ? (totalRow.total ?? totalRow.perPerson) : `€${rows.reduce((sum: number, r: any) => sum + r.amt, 0)}`;
        if (rows.length) {
          const sum = rows.reduce((acc: number, r: any) => acc + r.amt, 0) || 1;
          return { rows: rows.map((r: any) => ({ ...r, pc: Math.max(1, Math.round((r.amt / sum) * 100)) })), total: tx(total) };
        }
      }
      if (p && typeof p === "object") return p.total_cost_range ? { text: tx(p.total_cost_range) } : null;
    } catch { /* free-form */ }
    return { text: tx(raw) };
  })();

  const arrive = (() => {
    const raw = itinerary?.gettingThere;
    if (!raw) return null;
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (p?.steps?.length) return { legs: p.steps.map((st: any) => ({ r: tx(`${st.from} → ${st.to}`), dd: tx([st.method, st.duration, st.cost].filter(Boolean).join(" · ")) })) };
      if (p && typeof p === "object") return null;
    } catch { /* free-form */ }
    return { text: tx(raw) };
  })();

  const packing: string[] = (() => {
    const raw = itinerary?.packingList;
    if (!raw) return [];
    try {
      const p = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (p?.items?.length) return p.items.map((i: any) => tx(i.label ?? i)).filter(Boolean);
      if (p && typeof p === "object") return [];
    } catch { /* free-form */ }
    return tx(raw).split(/[,;]/).map(x => x.trim()).filter(x => x.length > 1);
  })();

  const checklist = [
    { cn: it ? "Volo a/r" : "Round-trip flight", url: affiliateUrls.expedia_flights },
    { cn: it ? `Alloggio · ${dayCount} notti` : `Stay · ${dayCount} nights`, url: affiliateUrls.hotels },
    { cn: it ? "Esperienza principale" : "Main experience", url: affiliateUrls.civitatis || affiliateUrls.musement || affiliateUrls.klook || affiliateUrls.viator },
    { cn: it ? "Tavolo · primo giorno" : "Table · day one", url: affiliateUrls.tripadvisor },
    { cn: it ? "Transfer / traghetto" : "Transfer / ferry", url: affiliateUrls.flixbus || affiliateUrls.samboat },
  ].filter(c => c.url);

  const coverFacts = [
    { n: `${dayCount}`, l: dayCount === 1 ? (it ? "giorno" : "day") : (it ? "giorni" : "days") },
    ...(budget && "total" in budget ? [{ n: budget.total, l: it ? "a persona" : "per person" }] : []),
    ...(peopleLabel ? [{ n: peopleLabel, l: it ? "viaggiatori" : "travellers" }] : []),
  ];
  const introFacts = [
    { k: it ? "Durata" : "Duration", v: `${dayCount} ${dayCount === 1 ? (it ? "giorno" : "day") : (it ? "giorni" : "days")}` },
    ...(dateRange ? [{ k: it ? "Periodo" : "Period", v: dateRange }] : []),
    ...(peopleLabel ? [{ k: it ? "Viaggiatori" : "Travellers", v: peopleLabel }] : []),
    ...(budget && "total" in budget ? [{ k: "Budget", v: `${budget.total} /pp` }] : []),
  ];

  const keyMoment = (ms: Moment[]): number => {
    const i = ms.findIndex(m => m.ctaStatus === "reserve_recommended" || m.ctaStatus === "bookable_now");
    return i >= 0 ? i : 0;
  };

  const runRight = dest.toUpperCase();
  const hasPractical = !preview && !!(budget || arrive || itinerary?.bestTime || packing.length > 0);

  return (
    <Document title={`MindRoute · ${dest}${preview ? (it ? " (anteprima)" : " (preview)") : ""}`} author="MindRoute" language={lang}>
      {/* ══ COVER ══ */}
      <Page size="A4" style={s.pagePhoto}>
        {images.hero
          ? <Image src={images.hero} style={s.coverImg} />
          : <View style={[s.coverImg, { backgroundColor: C.plum }]} />}
        <View style={s.coverVeil} />
        <View style={s.coverVeilBottom} />
        <View style={s.coverTop}>
          <View style={s.brand}><View style={[s.brandDot, { backgroundColor: "#FF8AA0" }]} /><Text style={[s.brandTxt, { color: "#FFFFFF" }]}>MindRoute</Text></View>
          <Text style={[s.runRight, { color: "#F2D9DD" }]}>{it ? "COSTRUITO SU DI TE" : "BUILT AROUND YOU"}</Text>
        </View>
        {preview && (
          <View style={s.previewPill}><Text style={s.previewPillTxt}>{it ? "Anteprima" : "Preview"}</Text></View>
        )}
        <View style={s.coverBody}>
          <Text style={s.coverLoc}>{[tx(data.country), tx(data.duration)].filter(Boolean).join("  ·  ")}</Text>
          <Text style={[s.coverTitle, { fontSize: fitSize(dest, 52, 28, 16) }]}>{dest}</Text>
          <Text style={s.coverSub}>{it ? "Il tuo viaggio" : "Your journey"}{dateRange ? ` · ${dateRange}` : ""}</Text>
          <View style={s.coverFacts}>
            {coverFacts.map((f, i) => (
              <View key={i}><Text style={s.coverFactN}>{f.n}</Text><Text style={s.coverFactL}>{f.l}</Text></View>
            ))}
          </View>
        </View>
      </Page>

      {/* ══ INTRO ══ */}
      <Page size="A4" style={s.page}>
        <RunHead right={runRight} />
        {preview && <Watermark it={it} />}
        <Text style={s.kicker}>{it ? "Perché questo posto ti somiglia" : "Why this place is yours"}</Text>
        {tx(data.manifesto) ? <Text style={s.quote}>“{tx(data.manifesto)}”</Text> : null}
        <View style={s.cols}>
          {(data.highlights ?? []).length > 0 && (
            <View style={s.col}>
              <Text style={s.blockH}>{it ? "I tuoi capitoli" : "Your chapters"}</Text>
              {(data.highlights ?? []).map((h, i) => (
                <View style={s.sigRow} key={i}>
                  <View style={s.sigDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.sigName}>{tx(h.name)}</Text>
                    {tx(h.desc) ? <Text style={s.sigDesc}>{tx(h.desc)}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={s.col}>
            <Text style={s.blockH}>{it ? "Il viaggio in breve" : "At a glance"}</Text>
            {introFacts.map((f, i) => (
              <View style={s.factRow} key={i}><Text style={s.factK}>{f.k}</Text><Text style={s.factV}>{f.v}</Text></View>
            ))}
          </View>
        </View>

        {!preview && data.mapPoints && data.mapPoints.length > 0 && (
          <View style={{ marginTop: 22 }}>
            <Text style={s.blockH}>{it ? "La rotta" : "The route"}</Text>
            <Svg viewBox="0 0 400 400" style={{ width: 300, height: 300, alignSelf: "center" }}>
              {data.mapPoints.length > 1 && (
                <Path
                  d={data.mapPoints.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ")}
                  stroke={C.teal} strokeWidth={1.5} fill="none" strokeDasharray="4 5"
                />
              )}
              {data.mapPoints.map((p, i) => (
                <G key={i}>
                  <Circle cx={p.x} cy={p.y} r={11} fill={C.coral} />
                  <SvgText x={p.x} y={p.y + 4} fill="#FFFFFF" style={{ fontSize: 11, fontWeight: 700 }} textAnchor="middle">{String(i + 1)}</SvgText>
                  {tx(p.label) ? <SvgText x={p.x + 16} y={p.y + 4} fill={C.soft} style={{ fontSize: 10 }}>{tx(p.label)}</SvgText> : null}
                </G>
              ))}
            </Svg>
            {data.geometry ? (
              <Text style={{ fontSize: 8.5, color: C.faint, textAlign: "center", marginTop: 4 }}>
                {data.geometry.walkable
                  ? (it ? `~${Math.round(data.geometry.spanKm)} km · a piedi` : `~${Math.round(data.geometry.spanKm)} km · walkable`)
                  : (it ? `~${Math.round(data.geometry.spanKm)} km tra le tappe` : `~${Math.round(data.geometry.spanKm)} km across stops`)}
              </Text>
            ) : null}
          </View>
        )}
        <Folio label={it ? "L'itinerario" : "The itinerary"} />
      </Page>

      {/* ══ GIORNI — una pagina per giorno (solo Giorno 1 in anteprima) ══ */}
      {days.map((day) => {
        const ms = data.momentsByDay?.[day.n] ?? [];
        const ki = keyMoment(ms);
        const f = ms[ki];
        const img = images.days[day.n];
        const dTitle = tx(day.title) || `${it ? "Giorno" : "Day"} ${day.n}`;
        return (
          <Page size="A4" style={s.pagePhoto} key={day.n}>
            {preview && <Watermark it={it} />}
            <View style={s.dayHeroWrap}>
              {img ? <Image src={img} style={s.dayHeroImg} /> : <View style={s.dayHeroPlain} />}
              <View style={s.dayHeroVeil} />
              <View style={s.dayHeroBody}>
                <Text style={s.dayHeroKick}>{it ? "Giorno" : "Day"} {day.n}{tx(day.arc) ? ` · ${tx(day.arc)}` : ""}</Text>
                <Text style={[s.dayHeroTitle, { fontSize: fitSize(dTitle, 24, 15, 34) }]}>{dTitle}</Text>
              </View>
            </View>
            <View style={s.dayBody}>
              {ms.length > 0 && (
                <View>
                  <Text style={s.blockH}>{it ? "La giornata" : "The day"}</Text>
                  {ms.map((m, i) => (
                    <View style={s.tlRow} key={i} wrap={false}>
                      <View style={[s.tlDot, ...(i === ki ? [s.tlDotKey] : [])]} />
                      <Text style={s.tlWhen}>{tx(m.t)}</Text>
                      <Text style={s.tlWhat}>{tx(m.title).split(",")[0]}</Text>
                    </View>
                  ))}
                </View>
              )}
              {f && (
                <View style={s.focusBox} wrap={false}>
                  <Text style={s.focusKick}>{it ? "Il momento del giorno" : "The moment of the day"}</Text>
                  <Text style={s.focusName}>{tx(f.title)}</Text>
                  {tx(f.desc) ? <Text style={s.focusDesc}>{tx(f.desc)}</Text> : null}
                  {(f.ctaPrice || f.locationName) && (
                    <View style={s.metaRow}>
                      {f.ctaPrice ? <View><Text style={s.metaK}>{it ? "Costo" : "Cost"}</Text><Text style={s.metaV}>{tx(f.ctaPrice)}</Text></View> : null}
                      {f.locationName ? <View><Text style={s.metaK}>{it ? "Dove" : "Where"}</Text><Text style={s.metaV}>{tx(f.locationName)}</Text></View> : null}
                    </View>
                  )}
                </View>
              )}
              {tx(day.sub) ? (
                <View style={s.whyBox} wrap={false}>
                  <Text style={s.whyTxt}>{it ? "Perché per te" : "Why it's yours"} — {tx(day.sub)}</Text>
                </View>
              ) : null}
            </View>
            <Folio label={dest} />
          </Page>
        );
      })}

      {/* ══ PRATICA (solo documento completo) ══ */}
      {hasPractical && (
        <Page size="A4" style={s.page}>
          <RunHead right={runRight} />
          <Text style={s.kicker}>{it ? "La pratica" : "Practical"}</Text>
          <Text style={s.h2}>{it ? "Cosa serve, " : "What you need, "}<Text style={s.em}>{it ? "senza sorprese" : "no surprises"}</Text>.</Text>

          {budget && "rows" in budget && (
            <View style={s.budgetCard} wrap={false}>
              <View style={s.budgetTop}>
                <Text style={s.budgetL}>{it ? "Budget stimato · a persona" : "Estimated budget · per person"}</Text>
                <Text style={s.budgetV}>{budget.total}</Text>
              </View>
              <View style={s.bbar}>
                {budget.rows.map((b: any, i: number) => <View key={i} style={{ width: `${b.pc}%`, backgroundColor: b.c }} />)}
              </View>
              {budget.rows.map((b: any, i: number) => (
                <View style={s.brow} key={i}>
                  <View style={[s.bsw, { backgroundColor: b.c }]} />
                  <Text style={s.bnm}>{b.nm}</Text>
                  <Text style={s.bpc}>{b.pc}%</Text>
                  <Text style={s.bam}>€{b.amt}</Text>
                </View>
              ))}
            </View>
          )}
          {budget && "text" in budget && (
            <View style={s.budgetCard} wrap={false}><Text style={s.focusDesc}>{budget.text}</Text></View>
          )}

          <View style={s.cols}>
            {arrive && (
              <View style={s.col}>
                <Text style={s.blockH}>{it ? "Come arrivare" : "Getting there"}</Text>
                {"legs" in arrive
                  ? arrive.legs.map((a: any, i: number) => (
                      <View style={s.legRow} key={i} wrap={false}>
                        <View style={s.legDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={s.legR}>{a.r}</Text>
                          {a.dd ? <Text style={s.legDD}>{a.dd}</Text> : null}
                        </View>
                      </View>
                    ))
                  : <Text style={s.legDD}>{arrive.text}</Text>}
              </View>
            )}
            {tx(itinerary?.bestTime) ? (
              <View style={s.col}>
                <Text style={s.blockH}>{it ? "Periodo migliore" : "Best time"}</Text>
                <Text style={{ fontFamily: "Playfair", fontStyle: "italic", fontSize: 10.5, lineHeight: 1.5, color: C.soft }}>{tx(itinerary.bestTime)}</Text>
              </View>
            ) : null}
          </View>

          {packing.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <Text style={s.blockH}>{it ? "Da portare" : "Packing"}</Text>
              <View style={s.chips}>
                {packing.map((p, i) => <Text style={s.chip} key={i}>{p}</Text>)}
              </View>
            </View>
          )}
          <Folio label={it ? "La pratica" : "Practical"} />
        </Page>
      )}

      {/* ══ CHECKLIST (solo documento completo) ══ */}
      {!preview && checklist.length > 0 && (
        <Page size="A4" style={s.page}>
          <RunHead right={runRight} />
          <Text style={s.kicker}>{it ? "Prima di partire" : "Before you go"}</Text>
          <Text style={s.h2}>{it ? "La tua " : "Your "}<Text style={s.em}>checklist</Text>.</Text>
          <Text style={s.checkIntro}>
            {it
              ? "Spunta man mano. Prenota nell'ordine: prima volo e alloggio, poi le esperienze con anticipo."
              : "Tick as you go. Book in order: flight and stay first, then experiences ahead of time."}
          </Text>
          {checklist.map((c, i) => (
            <View style={s.crow} key={i} wrap={false}>
              <View style={s.cbox} />
              <View style={{ flex: 1 }}>
                <Text style={s.cn}>{c.cn}</Text>
                <Text style={s.cm}>{dest}</Text>
              </View>
            </View>
          ))}
          <Folio label={it ? "Prima di partire" : "Before you go"} />
        </Page>
      )}

      {/* ══ CHIUSURA / SBLOCCO ══ */}
      <Page size="A4" style={[s.pagePhoto, s.closingPage]}>
        {preview ? (
          <>
            <Text style={s.closingKick}>{it ? "Questo è solo l'inizio" : "This is just the beginning"}</Text>
            <Text style={s.closingQuote}>
              {it
                ? `Il documento completo — tutti i ${dayCount} giorni, la rotta, il budget e la checklist — si sblocca quando confermi volo e alloggio su MindRoute.`
                : `The full document — all ${dayCount} days, the route, the budget and the checklist — unlocks once you confirm your flight and stay on MindRoute.`}
            </Text>
            <View style={s.unlockList}>
              <View style={s.unlockRow}><View style={s.unlockBox} /><Text style={s.unlockTxt}>{it ? "Prenota il volo dalla sezione Prenota" : "Book your flight from the Book tab"}</Text></View>
              <View style={s.unlockRow}><View style={s.unlockBox} /><Text style={s.unlockTxt}>{it ? "Prenota l'alloggio e conferma le voci" : "Book your stay and confirm the items"}</Text></View>
              <View style={s.unlockRow}><View style={[s.unlockBox, { backgroundColor: C.coral, borderColor: C.coral }]} /><Text style={s.unlockTxt}>{it ? "Scarica il PDF definitivo" : "Download the final PDF"}</Text></View>
            </View>
            <Text style={s.closingSign}>MindRoute · {it ? "costruito su di te" : "built around you"}</Text>
          </>
        ) : (
          <>
            <Text style={s.closingKick}>{it ? "Cosa ti porterai a casa" : "What you'll bring home"}</Text>
            <Text style={s.closingQuote}>{tx(data.closingQuote) || dest}</Text>
            <Text style={s.closingSign}>MindRoute · {it ? "costruito su di te" : "built around you"}</Text>
          </>
        )}
      </Page>
    </Document>
  );
}
