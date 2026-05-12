import { Document, Page, Text, View, Image, StyleSheet, Font, Svg, Path, Circle, Link } from "@react-pdf/renderer";

// Bundle fonts as static assets via Vite ?url to eliminate the CDN race that
// caused glyph fallback / layout shifts when PDF rendering started before the
// remote font finished downloading. The `latin` subset of fontsource includes
// Latin-1 Supplement (è à ò ù ì) and General Punctuation (— " " …) so Italian
// typography renders correctly without falling back to Helvetica.
import playfair400 from "@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff?url";
import playfair400i from "@fontsource/playfair-display/files/playfair-display-latin-400-italic.woff?url";
import playfair700 from "@fontsource/playfair-display/files/playfair-display-latin-700-normal.woff?url";
import playfair700i from "@fontsource/playfair-display/files/playfair-display-latin-700-italic.woff?url";
import dmSans400 from "@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff?url";
import dmSans500 from "@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff?url";
import dmSans700 from "@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff?url";

Font.register({
  family: "Playfair Display",
  fonts: [
    { src: playfair400, fontWeight: 400 },
    { src: playfair400i, fontWeight: 400, fontStyle: "italic" },
    { src: playfair700, fontWeight: 700 },
    { src: playfair700i, fontWeight: 700, fontStyle: "italic" },
  ],
});
Font.register({
  family: "DM Sans",
  fonts: [
    { src: dmSans400, fontWeight: 400 },
    { src: dmSans500, fontWeight: 500 },
    { src: dmSans700, fontWeight: 700 },
  ],
});

Font.registerHyphenationCallback((word) => [word]);

const C = {
  bg: "#FAF6F1",
  ink: "#1A0A14",
  inkDim: "#5C4B52",
  inkFaint: "#9C8B92",
  accent: "#E94560",
  accentSoft: "#FAD7DD",
  hairline: "#E5DDD8",
  cardBg: "#F2EAE2",
};

const s = StyleSheet.create({
  page: { backgroundColor: C.bg, paddingTop: 56, paddingBottom: 56, paddingHorizontal: 56, fontFamily: "DM Sans", fontSize: 10, color: C.ink, lineHeight: 1.55 },
  pageNoMargin: { backgroundColor: C.bg },
  serif: { fontFamily: "Playfair Display" },
  eyebrow: { fontSize: 8, letterSpacing: 2.2, textTransform: "uppercase", color: C.accent, fontWeight: 500, marginBottom: 12 },
  hairline: { height: 0.5, backgroundColor: C.hairline, marginVertical: 14 },
  footer: { position: "absolute", bottom: 28, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", fontSize: 7, color: C.inkFaint, letterSpacing: 1.4, textTransform: "uppercase" },

  coverImage: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" },
  coverGradient: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", backgroundColor: C.ink, opacity: 0.55 },
  coverTopGradient: { position: "absolute", left: 0, right: 0, top: 0, height: "25%", backgroundColor: C.ink, opacity: 0.18 },
  coverContent: { position: "absolute", bottom: 56, left: 56, right: 56, color: "#FFFFFF" },
  coverMeta: { fontSize: 9, letterSpacing: 2.2, textTransform: "uppercase", color: "rgba(255,255,255,0.85)", marginBottom: 14, flexDirection: "row", gap: 12 },
  coverDot: { color: C.accent, marginHorizontal: 6 },
  coverTitle: { fontFamily: "Playfair Display", fontSize: 72, fontWeight: 400, color: "#FFFFFF", lineHeight: 0.92, letterSpacing: -1.2, marginBottom: 10 },
  coverSubtitle: { fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 18, color: C.accent, marginBottom: 6 },
  coverBrand: { position: "absolute", top: 40, left: 56, fontSize: 9, letterSpacing: 3.2, textTransform: "uppercase", color: "rgba(255,255,255,0.75)" },

  manifestoEyebrow: { fontSize: 9, letterSpacing: 2.2, textTransform: "uppercase", color: C.accent, marginBottom: 24 },
  quote: { fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 22, lineHeight: 1.45, color: C.ink, marginBottom: 36 },
  quoteMark: { fontFamily: "Playfair Display", fontSize: 96, color: C.accent, opacity: 0.4, lineHeight: 0.5, marginBottom: 16 },
  highlightRow: { flexDirection: "row", paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: C.hairline, alignItems: "center" },
  highlightText: { fontFamily: "Playfair Display", fontSize: 13, color: C.ink, flex: 1 },

  sectionTitle: { fontFamily: "Playfair Display", fontSize: 32, fontWeight: 400, marginBottom: 8, letterSpacing: -0.4 },
  sectionLead: { fontSize: 11, color: C.inkDim, marginBottom: 28, maxWidth: "75%", lineHeight: 1.5 },

  arcDay: { flexDirection: "row", paddingVertical: 16, borderBottomWidth: 0.5, borderBottomColor: C.hairline },
  arcDayNum: { fontFamily: "Playfair Display", fontSize: 28, color: C.accent, width: 56 },
  arcDayBody: { flex: 1 },
  arcDayArc: { fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: C.inkFaint, marginBottom: 4 },
  arcDayTitle: { fontFamily: "Playfair Display", fontSize: 14, color: C.ink, marginBottom: 3 },
  arcDaySub: { fontSize: 9, color: C.inkDim, lineHeight: 1.5 },

  dayImage: { width: "100%", height: 220, marginBottom: 24, objectFit: "cover" },
  dayHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 },
  dayHeaderArc: { fontSize: 9, letterSpacing: 2.2, textTransform: "uppercase", color: C.accent },
  dayHeaderNum: { fontSize: 9, letterSpacing: 1.8, color: C.inkFaint },
  dayTitle: { fontFamily: "Playfair Display", fontSize: 26, color: C.ink, marginBottom: 20, lineHeight: 1.18, letterSpacing: -0.3 },
  moment: { flexDirection: "row", marginBottom: 14, paddingBottom: 14, borderBottomWidth: 0.5, borderBottomColor: C.hairline },
  momentLabel: { width: 78, fontSize: 8, letterSpacing: 1.8, textTransform: "uppercase", color: C.accent, paddingTop: 2 },
  momentText: { flex: 1, fontSize: 10, color: C.ink, lineHeight: 1.55 },

  mapWrapper: { width: "100%", height: 380, marginTop: 18, marginBottom: 18, backgroundColor: C.cardBg, padding: 24 },
  mapPin: { fill: C.accent },
  mapLine: { stroke: C.accent, strokeWidth: 1, fill: "none", strokeDasharray: "3 3", opacity: 0.7 },
  mapLabel: { fontSize: 8, fill: C.ink },

  practicalGrid: { marginTop: 12 },
  practicalRow: { flexDirection: "row", paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: C.hairline },
  practicalLabel: { fontSize: 10, color: C.inkDim, flex: 1.3 },
  practicalValue: { fontSize: 10, color: C.ink, fontWeight: 500, textAlign: "right", flex: 1 },
  practicalTotal: { borderTopWidth: 1, borderTopColor: C.ink, marginTop: 4, paddingTop: 12 },
  practicalTotalLabel: { fontSize: 11, color: C.ink, fontWeight: 700, flex: 1.3 },
  practicalTotalValue: { fontSize: 13, color: C.accent, fontWeight: 700, fontFamily: "Playfair Display", textAlign: "right", flex: 1 },
  packingChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  packingChip: { fontSize: 9, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: C.cardBg, borderRadius: 14, color: C.ink, marginRight: 6, marginBottom: 6 },
  gettingStep: { flexDirection: "row", marginBottom: 10, alignItems: "flex-start" },
  gettingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 5, marginRight: 10 },
  gettingStepBody: { flex: 1 },
  gettingStepRoute: { fontSize: 10, fontWeight: 500, color: C.ink, marginBottom: 2 },
  gettingStepMeta: { fontSize: 9, color: C.inkDim },

  closingQuote: { fontFamily: "Playfair Display", fontStyle: "italic", fontSize: 28, lineHeight: 1.35, color: C.ink, textAlign: "center", marginTop: 80, marginBottom: 60, paddingHorizontal: 20 },
  closingDivider: { width: 40, height: 1, backgroundColor: C.accent, alignSelf: "center", marginVertical: 36 },
  closingCtas: { marginTop: 40 },
  closingCtaRow: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: C.hairline, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  closingCtaLabel: { fontSize: 10, color: C.ink },
  closingCtaArrow: { fontSize: 11, color: C.accent },
  closingBrand: { textAlign: "center", marginTop: 60, fontSize: 9, letterSpacing: 3, textTransform: "uppercase", color: C.inkFaint },
});

type DayLike = {
  dayNumber?: number;
  title?: string;
  morning?: string;
  lunch?: string;
  afternoon?: string;
  evening?: string;
  dayImageUrl?: string;
  mapPoints?: Array<{ lat?: number; lng?: number; label?: string }>;
};

type Props = {
  data: {
    destinationName?: string | null;
    whyYours?: string | null;
    tripSummary?: string | null;
    closingMessage?: string | null;
    days?: DayLike[] | null;
    highlights?: string[] | null;
    budgetSummary?: string | null;
    packingList?: string | null;
    bestTime?: string | null;
    gettingThere?: string | null;
    heroImageUrl?: string | null;
    imageUrl?: string | null;
    topAffiliateLinks?: Record<string, string> | null;
  };
  lang?: "it" | "en";
  monthYear?: string;
};

function tryParse<T = any>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

function dayArc(i: number, total: number, L: typeof labelsEn): string {
  if (total <= 1) return L.peak;
  if (i === 0) return L.arrival;
  if (i === total - 1) return L.departure;
  const peak = Math.floor((total - 1) / 2);
  if (i === peak) return L.peak;
  if (i < peak) return L.discovery;
  return L.descent;
}

const labelsEn = {
  yourMindroute: "Your MindRoute",
  days: "days", day: "day",
  manifesto: "Why this place is yours",
  highlights: "The chapters",
  arcEyebrow: "The arc",
  arcTitle: "days, one story.",
  arcLead: "Each day a different breath. Pace shifts, light shifts, what stays is you.",
  geographyEyebrow: "Geography",
  geographyTitle: "Where you'll walk",
  geographyLead: "Small enough that nothing feels far, big enough that every corner has a different mood.",
  practicalEyebrow: "Practical",
  practicalTitle: "What it takes",
  budget: "Budget", packing: "Packing", bestTime: "Best time", getting: "Getting there",
  total: "Total",
  morning: "Morning", lunch: "Lunch", afternoon: "Afternoon", evening: "Evening",
  arrival: "Arrival", discovery: "Discovery", peak: "Peak", descent: "Slowing down", departure: "Departure",
  closingBrand: "Crafted by MindRoute",
  bookFlights: "Book flights", bookHotel: "Book hotel", findRestaurants: "Find restaurants", findActivities: "Find activities",
  craftedFor: "Crafted for you",
  page: "page", of: "of",
};
const labelsIt: typeof labelsEn = {
  yourMindroute: "Il tuo MindRoute",
  days: "giorni", day: "giorno",
  manifesto: "Perché questo posto ti somiglia",
  highlights: "I capitoli",
  arcEyebrow: "L'arco",
  arcTitle: "giorni, una storia.",
  arcLead: "Ogni giorno un respiro diverso. Il ritmo cambia, la luce cambia, quello che resta sei tu.",
  geographyEyebrow: "Geografia",
  geographyTitle: "Dove camminerai",
  geographyLead: "Abbastanza raccolto perché niente sembri lontano, abbastanza vario perché ogni angolo abbia un'atmosfera diversa.",
  practicalEyebrow: "Pratica",
  practicalTitle: "Cosa serve",
  budget: "Budget", packing: "Bagaglio", bestTime: "Periodo migliore", getting: "Come arrivare",
  total: "Totale",
  morning: "Mattina", lunch: "Pranzo", afternoon: "Pomeriggio", evening: "Sera",
  arrival: "Arrivo", discovery: "Scoperta", peak: "Apice", descent: "Decantazione", departure: "Partenza",
  closingBrand: "Costruito da MindRoute",
  bookFlights: "Prenota voli", bookHotel: "Prenota hotel", findRestaurants: "Trova ristoranti", findActivities: "Trova esperienze",
  craftedFor: "Costruito su di te",
  page: "pagina", of: "di",
};

function Footer({ destination, pageLabel, pageNum, total }: { destination: string; pageLabel: string; pageNum: number; total: number }) {
  return (
    <View style={s.footer} fixed>
      <Text>MindRoute · {destination}</Text>
      <Text>{pageLabel} {pageNum}/{total}</Text>
    </View>
  );
}

export function ItineraryPDF({ data, lang = "en", monthYear }: Props) {
  const L = lang === "it" ? labelsIt : labelsEn;
  const days = (data.days ?? []) as DayLike[];
  const dayCount = days.length;
  const dest = data.destinationName ?? "";
  const [city, ...countryParts] = dest.split(",").map((p) => p.trim());
  const country = countryParts.join(", ");
  const heroImg = data.heroImageUrl || data.imageUrl || "";

  const budget = tryParse<{ items: Array<{ label: string; perPerson?: string; total?: string }> }>(data.budgetSummary);
  const packing = tryParse<{ items: Array<{ emoji?: string; label: string }> }>(data.packingList);
  const getting = tryParse<{ steps: Array<{ from: string; to: string; method: string; duration: string; cost?: string; notes?: string }> }>(data.gettingThere);

  const allMapPoints: Array<{ lat: number; lng: number; label: string }> = [];
  const seen = new Set<string>();
  for (const d of days) {
    for (const p of d.mapPoints ?? []) {
      if (typeof p.lat !== "number" || typeof p.lng !== "number") continue;
      const k = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      allMapPoints.push({ lat: p.lat, lng: p.lng, label: p.label ?? "" });
    }
  }

  const pages: React.ReactNode[] = [];
  let pageIdx = 0;
  const totalEst =
    1 +
    (data.whyYours || (data.highlights && data.highlights.length) ? 1 : 0) +
    (dayCount > 1 ? 1 : 0) +
    dayCount +
    (allMapPoints.length > 0 ? 1 : 0) +
    1 +
    (data.closingMessage ? 1 : 0);

  pages.push(
    <Page key="cover" size="A4" style={s.pageNoMargin}>
      {heroImg ? <Image src={heroImg} style={s.coverImage} /> : <View style={[s.coverImage, { backgroundColor: C.ink }]} />}
      <View style={s.coverTopGradient} />
      <View style={s.coverGradient} />
      <Text style={s.coverBrand}>MindRoute</Text>
      <View style={s.coverContent}>
        <View style={{ flexDirection: "row", marginBottom: 14 }}>
          {country ? (
            <>
              <Text style={s.coverMeta}>{country.toUpperCase()}</Text>
              <Text style={s.coverDot}>·</Text>
            </>
          ) : null}
          <Text style={s.coverMeta}>{dayCount} {dayCount === 1 ? L.day.toUpperCase() : L.days.toUpperCase()}</Text>
          <Text style={s.coverDot}>·</Text>
          <Text style={s.coverMeta}>{L.craftedFor.toUpperCase()}</Text>
        </View>
        <Text style={s.coverTitle}>{city || dest}</Text>
        <Text style={s.coverSubtitle}>{L.yourMindroute}{monthYear ? ` · ${monthYear}` : ""}</Text>
      </View>
    </Page>
  );
  pageIdx++;

  if (data.whyYours || (data.highlights && data.highlights.length)) {
    pageIdx++;
    pages.push(
      <Page key="manifesto" size="A4" style={s.page}>
        <Text style={s.eyebrow}>● {L.manifesto.toUpperCase()}</Text>
        {data.whyYours ? (
          <>
            <Text style={s.quoteMark}>"</Text>
            <Text style={s.quote}>{data.whyYours}</Text>
          </>
        ) : null}
        {data.highlights && data.highlights.length > 0 ? (
          <>
            <Text style={[s.eyebrow, { marginTop: 24, marginBottom: 12 }]}>● {L.highlights.toUpperCase()}</Text>
            {data.highlights.slice(0, 6).map((h, i) => (
              <View key={i} style={s.highlightRow}>
                <Text style={s.highlightText}>{h}</Text>
              </View>
            ))}
          </>
        ) : null}
        <Footer destination={city || dest} pageLabel={L.page} pageNum={pageIdx} total={totalEst} />
      </Page>
    );
  }

  if (dayCount > 1) {
    pageIdx++;
    pages.push(
      <Page key="arc" size="A4" style={s.page}>
        <Text style={s.eyebrow}>● {L.arcEyebrow.toUpperCase()}</Text>
        <Text style={s.sectionTitle}>{dayCount} {L.arcTitle}</Text>
        <Text style={s.sectionLead}>{L.arcLead}</Text>
        <View style={s.hairline} />
        {days.map((d, i) => (
          <View key={i} style={s.arcDay}>
            <Text style={s.arcDayNum}>{String(d.dayNumber ?? i + 1).padStart(2, "0")}</Text>
            <View style={s.arcDayBody}>
              <Text style={s.arcDayArc}>{dayArc(i, dayCount, L)}</Text>
              <Text style={s.arcDayTitle}>{d.title ?? `${L.day} ${i + 1}`}</Text>
              {d.morning ? <Text style={s.arcDaySub}>{(d.morning ?? "").split(/(?<=[.!?])\s+/)[0]}</Text> : null}
            </View>
          </View>
        ))}
        <Footer destination={city || dest} pageLabel={L.page} pageNum={pageIdx} total={totalEst} />
      </Page>
    );
  }

  days.forEach((d, i) => {
    pageIdx++;
    const slots: Array<[string, string | undefined]> = [
      [L.morning, d.morning],
      [L.lunch, d.lunch],
      [L.afternoon, d.afternoon],
      [L.evening, d.evening],
    ];
    pages.push(
      <Page key={`day-${i}`} size="A4" style={s.page}>
        {d.dayImageUrl ? <Image src={d.dayImageUrl} style={s.dayImage} /> : null}
        <View style={s.dayHeader}>
          <Text style={s.dayHeaderArc}>{dayArc(i, dayCount, L)}</Text>
          <Text style={s.dayHeaderNum}>{L.day.toUpperCase()} {d.dayNumber ?? i + 1} / {dayCount}</Text>
        </View>
        <Text style={s.dayTitle}>{d.title ?? `${L.day} ${i + 1}`}</Text>
        {slots.filter(([, text]) => !!text && text.trim().length > 2).map(([label, text], j) => (
          <View key={j} style={s.moment}>
            <Text style={s.momentLabel}>{label}</Text>
            <Text style={s.momentText}>{text}</Text>
          </View>
        ))}
        <Footer destination={city || dest} pageLabel={L.page} pageNum={pageIdx} total={totalEst} />
      </Page>
    );
  });

  if (allMapPoints.length > 0) {
    pageIdx++;
    const lats = allMapPoints.map((p) => p.lat);
    const lngs = allMapPoints.map((p) => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;
    const proj = (p: { lat: number; lng: number }) => ({
      x: 40 + ((p.lng - minLng) / lngRange) * 360,
      y: 40 + (1 - (p.lat - minLat) / latRange) * 320,
    });
    const pts = allMapPoints.map(proj);
    const pathD = pts.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

    pages.push(
      <Page key="map" size="A4" style={s.page}>
        <Text style={s.eyebrow}>● {L.geographyEyebrow.toUpperCase()}</Text>
        <Text style={s.sectionTitle}>{L.geographyTitle}</Text>
        <Text style={s.sectionLead}>{L.geographyLead}</Text>
        <View style={s.mapWrapper}>
          <Svg viewBox="0 0 440 400" style={{ width: "100%", height: "100%" }}>
            {pts.length > 1 ? <Path d={pathD} style={s.mapLine} /> : null}
            {pts.map((p, idx) => (
              <Circle key={idx} cx={p.x} cy={p.y} r={4} style={s.mapPin} />
            ))}
          </Svg>
        </View>
        <Footer destination={city || dest} pageLabel={L.page} pageNum={pageIdx} total={totalEst} />
      </Page>
    );
  }

  pageIdx++;
  pages.push(
    <Page key="practical" size="A4" style={s.page}>
      <Text style={s.eyebrow}>● {L.practicalEyebrow.toUpperCase()}</Text>
      <Text style={s.sectionTitle}>{L.practicalTitle}</Text>
      <View style={s.hairline} />

      {budget?.items && budget.items.length > 0 ? (
        <>
          <Text style={[s.eyebrow, { marginTop: 8 }]}>● {L.budget.toUpperCase()}</Text>
          <View style={s.practicalGrid}>
            {budget.items.filter((it) => !/totale|total/i.test(it.label)).map((it, i) => (
              <View key={i} style={s.practicalRow}>
                <Text style={s.practicalLabel}>{it.label}</Text>
                <Text style={s.practicalValue}>{it.perPerson || it.total || ""}</Text>
              </View>
            ))}
            {budget.items.filter((it) => /totale|total/i.test(it.label)).slice(0, 1).map((it, i) => (
              <View key={`t-${i}`} style={[s.practicalRow, s.practicalTotal]}>
                <Text style={s.practicalTotalLabel}>{L.total.toUpperCase()}</Text>
                <Text style={s.practicalTotalValue}>{it.perPerson || it.total || ""}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {data.bestTime ? (
        <>
          <Text style={[s.eyebrow, { marginTop: 24 }]}>● {L.bestTime.toUpperCase()}</Text>
          <Text style={{ fontSize: 12, color: C.ink, fontFamily: "Playfair Display" }}>{data.bestTime}</Text>
        </>
      ) : null}

      {getting?.steps && getting.steps.length > 0 ? (
        <>
          <Text style={[s.eyebrow, { marginTop: 24 }]}>● {L.getting.toUpperCase()}</Text>
          {getting.steps.map((step, i) => (
            <View key={i} style={s.gettingStep}>
              <View style={s.gettingDot} />
              <View style={s.gettingStepBody}>
                <Text style={s.gettingStepRoute}>{step.from} → {step.to}</Text>
                <Text style={s.gettingStepMeta}>{step.method} · {step.duration}{step.cost ? ` · ${step.cost}` : ""}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}

      {packing?.items && packing.items.length > 0 ? (
        <>
          <Text style={[s.eyebrow, { marginTop: 24 }]}>● {L.packing.toUpperCase()}</Text>
          <View style={s.packingChips}>
            {packing.items.map((it, i) => (
              <Text key={i} style={s.packingChip}>{it.emoji ? `${it.emoji} ` : ""}{it.label}</Text>
            ))}
          </View>
        </>
      ) : null}

      <Footer destination={city || dest} pageLabel={L.page} pageNum={pageIdx} total={totalEst} />
    </Page>
  );

  if (data.closingMessage) {
    pageIdx++;
    const aff = data.topAffiliateLinks ?? {};
    const ctas: Array<[string, string | undefined]> = [
      [L.bookFlights, aff.expedia_flights],
      [L.bookHotel, aff.hotels],
      [L.findRestaurants, aff.tripadvisor],
      [L.findActivities, aff.civitatis_1 || aff.viator_1 || aff.klook_1 || aff.musement_1],
    ];
    pages.push(
      <Page key="closing" size="A4" style={s.page}>
        <Text style={s.closingQuote}>"{data.closingMessage}"</Text>
        <View style={s.closingDivider} />
        <View style={s.closingCtas}>
          {ctas.filter(([, url]) => !!url).map(([label, url], i) => (
            <Link key={i} src={url!} style={{ textDecoration: "none" }}>
              <View style={s.closingCtaRow}>
                <Text style={s.closingCtaLabel}>{label}</Text>
                <Text style={s.closingCtaArrow}>→</Text>
              </View>
            </Link>
          ))}
        </View>
        <Text style={s.closingBrand}>{L.closingBrand}</Text>
      </Page>
    );
  }

  return <Document title={`MindRoute · ${city || dest}`} author="MindRoute">{pages}</Document>;
}
