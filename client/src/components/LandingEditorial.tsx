/**
 * LandingEditorial.tsx — redesign landing 2026-07 (mockup approvato da Lorenzo).
 * ───────────────────────────────────────────────────────────────
 * 5 sezioni + footer:
 *   ① Hero full-bleed + card "Il meglio della stagione" + stats band
 *   ② How it works — 4 step card con mini-mockup + fascia CTA
 *   ③ Showcase — dal profilo al viaggio (featured Lofoten) + grid mete
 *   ④ Made for you — feature + anteprima prodotto + fascia email
 *   ⑤ Final CTA + partner strip
 *
 * Scelte esplicite (non riaprire senza ok):
 *  · Social proof = numeri REALI da /api/stats — mai contatori inventati,
 *    niente rating/badge finché non esistono recensioni vere.
 *  · Partner strip = SOLO partner monetizzati (dottrina affiliate de0c7f3:
 *    Booking/GetYourGuide vietati, non gli si regala visibilità).
 *  · La sezione "Welcome back" del mockup è resa come anteprima prodotto
 *    dichiarata (label "Anteprima") con dati demo — su "/" i loggati vedono
 *    la dashboard, quindi qui non c'è mai un utente reale.
 * ─────────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { unsplashSized } from "@/lib/img";
import { track } from "@/lib/analytics";

export type LandingStats = { itineraryCount: number; destinationCount: number };

/* Foto verificate (stesso pool curato della landing precedente — ID già in
   produzione, zero rischio 404). crop=entropy evita inquadrature morte. */
const u = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&fit=crop&crop=entropy&auto=format&q=80`;
const PHOTO = {
  kyoto:     u("1493976040374-85c8e12f0c0e", 2000), // pagoda + Fuji al tramonto (hero)
  lofoten:   u("1502786129293-79981df4e689"),
  patagonia: u("1531168556467-80aace0d0144"),
  patagonia2:u("1505765050516-f72dcac9c60a"),
  procida:   u("1523906834658-6e24ef2386f9"),
  tokyo:     u("1540959733332-eab4deabeeaf"),
  azores:    u("1586671267731-da2cf3ceeb80"),
  samarkand: u("1605649461784-edc01e2b2f4d"),
  iceland:   u("1500530855697-b586d89ba3ee"),
  iceland2:  u("1518710843675-2540dd79065c"),
  alentejo:  u("1518684079-3c830dcef090"),
  oaxaca:    u("1564507592333-c60657eea523"),
  mountains: u("1519681393784-d120267933ba"),
  sahara:    u("1489493585363-d69421e0edd3"),
  faroe:     u("1538333702852-1ce8a4cd6c54"),
  sea:       u("1602941525421-8f8b81d3edbb"),
} as const;

type Bi = { en: string; it: string };
type SeasonPick = { name: string; country: Bi; note: Bi; hl: Bi; img: string };

/* Card "Il meglio della stagione" — curatela onesta per stagione (mete e note
   plausibili per il periodo, non prezzi né promesse). */
const SEASONAL: Record<"winter" | "spring" | "summer" | "autumn", SeasonPick[]> = {
  summer: [
    { name: "Azzorre",   country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Perfect weather", it: "Clima perfetto" },   note: { en: "~24°C avg", it: "~24°C di media" },        img: PHOTO.azores },
    { name: "Lofoten",   country: { en: "Norway", it: "Norvegia" },     hl: { en: "Midnight sun", it: "Sole di mezzanotte" },  note: { en: "Until mid-Aug", it: "Fino a metà agosto" }, img: PHOTO.lofoten },
    { name: "Islanda",   country: { en: "Iceland", it: "Islanda" },     hl: { en: "Endless days", it: "Giornate infinite" },   note: { en: "Great for nature", it: "Ideale per la natura" }, img: PHOTO.iceland },
    { name: "Procida",   country: { en: "Italy", it: "Italia" },        hl: { en: "Beach season", it: "Stagione di mare" },    note: { en: "~28°C avg", it: "~28°C di media" },        img: PHOTO.procida },
    { name: "Kyoto",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Quiet & cultural", it: "Quiete culturale" },note: { en: "Summer calm", it: "Calma d'estate" },      img: PHOTO.kyoto },
  ],
  autumn: [
    { name: "Kyoto",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Autumn foliage", it: "Foliage d'autunno" }, note: { en: "Peak colors", it: "Colori al massimo" },   img: PHOTO.kyoto },
    { name: "Oaxaca",    country: { en: "Mexico", it: "Messico" },      hl: { en: "Vibrant season", it: "Stagione viva" },     note: { en: "Local festivals", it: "Feste locali" },    img: PHOTO.oaxaca },
    { name: "Samarcanda",country: { en: "Uzbekistan", it: "Uzbekistan" },hl: { en: "Mild weather", it: "Clima mite" },         note: { en: "~22°C avg", it: "~22°C di media" },        img: PHOTO.samarkand },
    { name: "Alentejo",  country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Harvest season", it: "Vendemmia" },         note: { en: "Slow & pastoral", it: "Lento e pastorale" },img: PHOTO.alentejo },
    { name: "Marocco",   country: { en: "Morocco", it: "Marocco" },     hl: { en: "Desert weather", it: "Deserto ideale" },    note: { en: "~26°C avg", it: "~26°C di media" },        img: PHOTO.sahara },
  ],
  winter: [
    { name: "Lofoten",   country: { en: "Norway", it: "Norvegia" },     hl: { en: "Northern lights", it: "Aurora boreale" },   note: { en: "Arctic magic", it: "Magia artica" },       img: PHOTO.lofoten },
    { name: "Islanda",   country: { en: "Iceland", it: "Islanda" },     hl: { en: "Ice & auroras", it: "Ghiaccio e aurore" },  note: { en: "Short wild days", it: "Giorni brevi e selvaggi" }, img: PHOTO.iceland2 },
    { name: "Patagonia", country: { en: "Argentina", it: "Argentina" }, hl: { en: "Southern summer", it: "Estate australe" },  note: { en: "Best trekking", it: "Trekking al top" },   img: PHOTO.patagonia },
    { name: "Marocco",   country: { en: "Morocco", it: "Marocco" },     hl: { en: "Winter sun", it: "Sole d'inverno" },        note: { en: "~20°C avg", it: "~20°C di media" },        img: PHOTO.sahara },
    { name: "Tokyo",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Crisp clear skies", it: "Cieli tersi" },    note: { en: "Low season deals", it: "Bassa stagione" }, img: PHOTO.tokyo },
  ],
  spring: [
    { name: "Kyoto",     country: { en: "Japan", it: "Giappone" },      hl: { en: "Cherry blossoms", it: "Ciliegi in fiore" }, note: { en: "Late Mar–Apr", it: "Fine marzo–aprile" }, img: PHOTO.kyoto },
    { name: "Procida",   country: { en: "Italy", it: "Italia" },        hl: { en: "Sea without crowds", it: "Mare senza folla" }, note: { en: "~19°C avg", it: "~19°C di media" },     img: PHOTO.procida },
    { name: "Azzorre",   country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Blooming season", it: "Tutto in fiore" },   note: { en: "Great for nature", it: "Ideale per la natura" }, img: PHOTO.azores },
    { name: "Samarcanda",country: { en: "Uzbekistan", it: "Uzbekistan" },hl: { en: "Mild weather", it: "Clima mite" },         note: { en: "~20°C avg", it: "~20°C di media" },        img: PHOTO.samarkand },
    { name: "Alentejo",  country: { en: "Portugal", it: "Portogallo" }, hl: { en: "Fields in bloom", it: "Campi in fiore" },   note: { en: "Slow & pastoral", it: "Lento e pastorale" },img: PHOTO.alentejo },
  ],
};

function seasonOf(m: number): keyof typeof SEASONAL {
  if (m >= 2 && m <= 4) return "spring";   // mar-mag
  if (m >= 5 && m <= 7) return "summer";   // giu-ago
  if (m >= 8 && m <= 10) return "autumn";  // set-nov
  return "winter";
}

/* Grid "posti veri, per ogni umore" — archetipi curati, senza contatori o
   rating inventati. */
const MOOD_CARDS: Array<{ name: string; country: Bi; badge: Bi; meta: Bi; desc: Bi; img: string }> = [
  { name: "Kyoto",     country: { en: "Japan", it: "Giappone" },     badge: { en: "Cultural escape", it: "Fuga culturale" },  meta: { en: "6 days · Spring", it: "6 giorni · Primavera" }, desc: { en: "Temples, rituals and timeless beauty at every corner.", it: "Templi, riti e bellezza senza tempo a ogni angolo." }, img: PHOTO.kyoto },
  { name: "Patagonia", country: { en: "Argentina", it: "Argentina" },badge: { en: "Adventure escape", it: "Fuga d'avventura" },meta: { en: "7 days · Nov–Mar", it: "7 giorni · Nov–Mar" },  desc: { en: "Granite peaks, glaciers and wind that resets you.", it: "Cime di granito, ghiacciai e un vento che ti azzera." }, img: PHOTO.patagonia },
  { name: "Procida",   country: { en: "Italy", it: "Italia" },       badge: { en: "Coastal escape", it: "Fuga sul mare" },    meta: { en: "4 days · Spring", it: "4 giorni · Primavera" }, desc: { en: "Pastel villages, sea views and la dolce vita.", it: "Borghi pastello, viste sul mare e dolce vita." }, img: PHOTO.procida },
  { name: "Marocco",   country: { en: "Morocco", it: "Marocco" },    badge: { en: "Desert escape", it: "Fuga nel deserto" },  meta: { en: "7 days · Autumn", it: "7 giorni · Autunno" },   desc: { en: "Dunes, markets and a culture that vibrates.", it: "Dune, mercati e una cultura che vibra." }, img: PHOTO.sahara },
  { name: "Isole Faroe",country:{ en: "Denmark", it: "Danimarca" },  badge: { en: "Nature escape", it: "Fuga nella natura" }, meta: { en: "5 days · Summer", it: "5 giorni · Estate" },    desc: { en: "Cliffs, silence and weather with a personality.", it: "Scogliere, silenzio e un meteo con carattere." }, img: PHOTO.faroe },
];

/* Anteprima prodotto — dati DEMO dichiarati (label "Anteprima del prodotto"). */
const PREVIEW_CARDS: Array<{ name: string; sub: Bi; badgeKey: string; tags: Bi[]; days: number; travel: Bi; from: string; img: string; primary?: boolean }> = [
  { name: "Azzorre", sub: { en: "Portugal", it: "Portogallo" }, badgeKey: "led.made.bestMatch", tags: [{ en: "Nature", it: "Natura" }, { en: "Relaxation", it: "Relax" }, { en: "Scenic", it: "Scenografico" }], days: 6, travel: { en: "✈ ~5h", it: "✈ ~5h" }, from: "€190", img: PHOTO.azores, primary: true },
  { name: "Procida", sub: { en: "Italy", it: "Italia" }, badgeKey: "led.made.greatFor", tags: [{ en: "Coastal", it: "Mare" }, { en: "Food", it: "Cibo" }, { en: "Slow", it: "Lentezza" }], days: 4, travel: { en: "🚆 + ⛴ ~2h", it: "🚆 + ⛴ ~2h" }, from: "€89", img: PHOTO.procida },
  { name: "Kyoto", sub: { en: "Japan", it: "Giappone" }, badgeKey: "led.made.uniquePick", tags: [{ en: "Culture", it: "Cultura" }, { en: "Temples", it: "Templi" }, { en: "Calm", it: "Calma" }], days: 8, travel: { en: "✈ ~14h", it: "✈ ~14h" }, from: "€650", img: PHOTO.kyoto },
];

/* Featured itinerary (showcase) — tappe Lofoten reali, come nel mockup. */
const FEAT_DAYS: Array<{ label: Bi; img: string }> = [
  { label: { en: "Arrival in Svolvær", it: "Arrivo a Svolvær" }, img: PHOTO.lofoten },
  { label: { en: "Hike to Ryten", it: "Trekking al Ryten" }, img: PHOTO.iceland2 },
  { label: { en: "Hamnøy & Reinebringen", it: "Hamnøy e Reinebringen" }, img: PHOTO.faroe },
  { label: { en: "Kvalvika Beach", it: "Spiaggia di Kvalvika" }, img: PHOTO.mountains },
];

/* Partner REALI monetizzati (resolveAffiliateUrl) — mai Booking/GetYourGuide. */
const PARTNERS: Array<{ label: string; serif?: boolean }> = [
  { label: "Tripadvisor" },
  { label: "Viator", serif: true },
  { label: "Klook" },
  { label: "Expedia" },
  { label: "Hotels.com", serif: true },
  { label: "FlixBus" },
];

/* ── piccole icone inline (stroke 1.8, coerenti col mockup) ─── */
const I = {
  spark:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4L12 3z"/></svg>,
  shield: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"/><path d="M9 12l2 2 4-4"/></svg>,
  globe:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/></svg>,
  lock:   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  user:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5"/></svg>,
  brain:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 3c0 1 .4 1.9 1 2.5A3.5 3.5 0 0 0 7.5 19c.6 0 1.1-.1 1.5-.4V4.6C9.3 4.2 9 4 9 4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 3c0 1-.4 1.9-1 2.5a3.5 3.5 0 0 1-2.5 6.5c-.6 0-1.1-.1-1.5-.4V4.6c-.3-.4 0-.6 0-.6z"/></svg>,
  mapp:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 4L4 6v14l5-2 6 2 5-2V4l-5 2-6-2z"/><path d="M9 4v14M15 6v14"/></svg>,
  bag:    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg>,
  heart:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.6-9-9c-1.2-2.7.4-6 3.5-6 2 0 3.5 1.2 4.5 3 1-1.8 2.5-3 4.5-3 3.1 0 4.7 3.3 3.5 6-2 4.4-9 9-9 9z"/></svg>,
  cal:    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  target: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/></svg>,
  trend:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>,
  bell:   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 1 0-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/></svg>,
  tag:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="8" cy="9" r="1.4" fill="currentColor"/></svg>,
  clock:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg>,
  users:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20c1.2-3 3.7-4.5 6.5-4.5s5.3 1.5 6.5 4.5"/><path d="M16 5.5a3.5 3.5 0 0 1 0 6.8M18.5 15.8c1.6.7 2.7 2 3 4.2"/></svg>,
  mail:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>,
  ig:     <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>,
  tiktok: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>,
} as const;

/* Newsletter — POST /api/newsletter, esito inline. Usato dalla fascia email
   e dal footer (source diverso per capire quale converte). */
function useNewsletter(source: "landing" | "footer") {
  const { lang, t } = useI18n();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "ok" | "err" | "invalid">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) { setState("invalid"); return; }
    setState("busy");
    try {
      const r = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, lang, source }),
      });
      if (!r.ok) throw new Error(String(r.status));
      setState("ok");
      track("newsletter_signup");
    } catch {
      setState("err");
    }
  };

  const note = state === "ok" ? { cls: "ok", text: t("led.mail.success") }
    : state === "err" ? { cls: "err", text: t("led.mail.error") }
    : state === "invalid" ? { cls: "err", text: t("led.mail.invalid") }
    : null;

  return { email, setEmail, submit, state, note };
}

export function LandingEditorial({ onStart, stats }: { onStart: () => void; stats: LandingStats | null }) {
  const { t, lang } = useI18n();
  const em = (key: string) => <span dangerouslySetInnerHTML={{ __html: t(key) }} />;
  const b = (x: Bi) => x[lang] ?? x.en;

  const now = useMemo(() => new Date(), []);
  const monthName = useMemo(
    () => now.toLocaleString(lang === "it" ? "it-IT" : "en-US", { month: "long" }),
    [now, lang],
  );
  const picks = SEASONAL[seasonOf(now.getMonth())];

  const nf = (n: number) => n.toLocaleString(lang === "it" ? "it-IT" : "en-US");
  const itinCount = stats && stats.itineraryCount > 0 ? nf(stats.itineraryCount) : null;
  const destCount = stats && stats.destinationCount > 0 ? nf(stats.destinationCount) : null;

  const mailBand = useNewsletter("landing");
  const mailFoot = useNewsletter("footer");

  // /come-funziona reindirizza qui con hash — scrolla alla sezione una volta
  // montato (id="how-it-works").
  useEffect(() => {
    if (window.location.hash === "#how-it-works") {
      requestAnimationFrame(() => {
        document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, []);

  // Preload dell'hero (LCP): è un background CSS, quindi <link rel=preload>.
  // w=900/q=70 su mobile DEVE combaciare con l'URL pre-caricato in index.html
  // (pre-hero shell) — stessa stringa → una sola fetch, servita dalla cache.
  const heroImg = unsplashSized(PHOTO.kyoto, typeof window !== "undefined" && window.innerWidth < 768 ? 900 : 1600, 70);
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "preload"; link.as = "image"; link.href = heroImg;
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);
    return () => link.remove();
  }, [heroImg]);

  return (
    <div className="led">

      {/* ① HERO */}
      <section className="led-hero">
        <div className="led-hero-bg" style={{ backgroundImage: `url(${heroImg})` }} />
        <div className="led-container led-hero-inner">
          <div>
            <div className="led-eyebrow"><span className="d" />{t("led.hero.eyebrow")}</div>
            <h1>{t("led.hero.title1")}<br /><em>{t("led.hero.title2")}</em></h1>
            <p className="led-hero-sub">{t("led.hero.sub")}</p>
            <div className="led-hero-row">
              <button className="led-btn xl" onClick={onStart} data-testid="led-hero-cta">
                {t("led.hero.cta")} <span className="led-arrow">→</span>
              </button>
              {itinCount && (
                <div className="led-hero-counter"><strong>{itinCount}</strong> {t("led.hero.counter")}</div>
              )}
            </div>
          </div>

          <aside className="led-season" aria-label={t("led.season.head")}>
            <div className="led-season-head">
              <span className="t">{I.spark} {t("led.season.head")}</span>
              <span className="m">{monthName}</span>
            </div>
            {picks.map((p, i) => (
              <button key={i} className="led-season-item" onClick={onStart}>
                <span className="led-season-thumb" style={{ backgroundImage: `url(${unsplashSized(p.img, 140)})` }} />
                <span>
                  <span className="led-season-name">{p.name}</span>
                  <span className="led-season-country" style={{ display: "block" }}>{b(p.country)}</span>
                </span>
                <span className="led-season-note"><span className="hl">{b(p.hl)}</span>{b(p.note)}</span>
                <span className="led-season-chev">›</span>
              </button>
            ))}
          </aside>
        </div>

        {/* Stats band — numeri REALI (o nascosti finché non ci sono) */}
        <div className="led-container">
          <div className="led-stats">
            <div className="led-stat">
              <span className="led-stat-ico">{I.users}</span>
              <span><span className="led-stat-n">{itinCount ? `${itinCount}+` : "—"}</span><span className="led-stat-l" style={{ display: "block" }}>{t("led.stats.itineraries")}</span></span>
            </div>
            <div className="led-stat">
              <span className="led-stat-ico">{I.clock}</span>
              <span><span className="led-stat-n">{t("led.stats.timeValue")}</span><span className="led-stat-l" style={{ display: "block" }}>{t("led.stats.time")}</span></span>
            </div>
            <div className="led-stat">
              <span className="led-stat-ico">{I.globe}</span>
              <span><span className="led-stat-n">{destCount ? `${destCount}+` : "—"}</span><span className="led-stat-l" style={{ display: "block" }}>{t("led.stats.destinations")}</span></span>
            </div>
            <div className="led-stat">
              <span className="led-stat-ico">{I.heart}</span>
              <span><span className="led-stat-n">{t("led.stats.freeValue")}</span><span className="led-stat-l" style={{ display: "block" }}>{t("led.stats.free")}</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* ② HOW IT WORKS */}
      <section className="led-how" id="how-it-works">
        <div className="led-container">
          <div className="led-how-head">
            <div>
              <div className="led-eyebrow"><span className="d" />{t("led.how.eyebrow")}</div>
              <h2>{em("led.how.title")}</h2>
            </div>
            <p>{t("led.how.sub")}</p>
          </div>

          <div className="led-steps">
            <div className="led-step">
              <span className="led-step-badge">01</span>
              <span className="led-step-ico">{I.user}</span>
              <div className="led-step-title">{t("led.how.s1.title")}</div>
              <div className="led-step-desc">{t("led.how.s1.desc")}</div>
              <div className="led-mini">
                <div className="led-mini-q">{t("led.how.v1.q")}</div>
                <div className="led-mini-hint">{t("led.how.v1.hint")}</div>
                <div className="led-mini-opt on">⛰ {t("led.how.v1.o1")}</div>
                <div className="led-mini-opt off">🌴 {t("led.how.v1.o2")}</div>
              </div>
            </div>

            <div className="led-step">
              <span className="led-step-badge">02</span>
              <span className="led-step-ico">{I.brain}</span>
              <div className="led-step-title">{t("led.how.s2.title")}</div>
              <div className="led-step-desc">{t("led.how.s2.desc")}</div>
              <div className="led-mini">
                <div className="led-mini-map">
                  <span className="pin" style={{ top: "22%", left: "18%" }} />
                  <span className="pin" style={{ top: "40%", left: "62%" }} />
                  <span className="pin" style={{ top: "64%", left: "34%" }} />
                  <span className="pin" style={{ top: "28%", left: "82%" }} />
                  <div className="led-mini-chip">
                    <div className="a">{t("led.how.v2.tag")}</div>
                    <div className="b">{t("led.how.v2.place")}</div>
                    <div className="c">{t("led.how.v2.pct")}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="led-step">
              <span className="led-step-badge">03</span>
              <span className="led-step-ico">{I.mapp}</span>
              <div className="led-step-title">{t("led.how.s3.title")}</div>
              <div className="led-step-desc">{t("led.how.s3.desc")}</div>
              <div className="led-mini">
                <div className="led-mini-day">{t("led.how.v3.day")}</div>
                <div className="led-mini-place">{t("led.how.v3.place")}</div>
                <div className="led-mini-row"><span className="dot" />{t("led.how.v3.r1")}<span className="tm">8:00</span></div>
                <div className="led-mini-row"><span className="dot" />{t("led.how.v3.r2")}<span className="tm">13:00</span></div>
                <div className="led-mini-row"><span className="dot" />{t("led.how.v3.r3")}<span className="tm">19:30</span></div>
              </div>
            </div>

            <div className="led-step">
              <span className="led-step-badge">04</span>
              <span className="led-step-ico">{I.bag}</span>
              <div className="led-step-title">{t("led.how.s4.title")}</div>
              <div className="led-step-desc">{t("led.how.s4.desc")}</div>
              <div className="led-mini led-mini-book">
                <div className="led-mini-book-img" style={{ backgroundImage: `url(${unsplashSized(PHOTO.patagonia, 420)})` }} />
                <div className="led-mini-book-body">
                  <div className="a">{t("led.how.v4.tag")}</div>
                  <div className="b">{t("led.how.v4.sub")}</div>
                  <span className="led-mini-cta">{t("led.how.v4.cta")} →</span>
                </div>
              </div>
            </div>
          </div>

          <div className="led-how-band">
            <div className="led-how-band-img" style={{ backgroundImage: `url(${unsplashSized(PHOTO.mountains, 900)})` }} />
            <div className="led-how-band-body">
              <div className="led-how-band-title">{em("led.how.bandTitle")}</div>
              <p className="led-how-band-sub">{t("led.how.bandSub")}</p>
              <div className="led-how-band-row">
                <button className="led-btn ghost" onClick={onStart}>{t("led.how.bandCta")} <span className="led-arrow">→</span></button>
                <span className="led-how-band-join">{t("led.how.bandJoin")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ③ SHOWCASE */}
      <section className="led-show">
        <div className="led-container">
          <div className="led-show-top">
            <div>
              <div className="led-eyebrow"><span className="d" />{t("led.show.eyebrow")}</div>
              <h2>{em("led.show.title")}</h2>
              <p>{t("led.show.sub")}</p>
              <div className="led-show-steps">
                <div className="led-show-step">
                  <span className="ic">{I.user}</span>
                  <div className="t">{t("led.show.s1.t")}</div>
                  <div className="d">{t("led.show.s1.d")}</div>
                </div>
                <div className="led-show-step">
                  <span className="ic">{I.target}</span>
                  <div className="t">{t("led.show.s2.t")}</div>
                  <div className="d">{t("led.show.s2.d")}</div>
                </div>
                <div className="led-show-step hot">
                  <span className="ic">{I.mapp}</span>
                  <div className="t">{t("led.show.s3.t")}</div>
                  <div className="d">{t("led.show.s3.d")}</div>
                </div>
              </div>
            </div>

            <div className="led-feat" style={{ backgroundImage: `url(${unsplashSized(PHOTO.lofoten, 1100)})` }}>
              <div className="led-feat-top">
                <span className="led-feat-tag">✦ {t("led.show.cardTag")}</span>
              </div>
              <div className="led-feat-body">
                <div className="led-feat-name">Lofoten</div>
                <div className="led-feat-country">{lang === "it" ? "Norvegia" : "Norway"}</div>
                <div className="led-feat-meta">{I.cal} 7 {t("led.made.days")} · {lang === "it" ? "Inverno" : "Winter"}</div>
                <p className="led-feat-desc">{t("led.show.cardDesc")}</p>
                <div className="led-feat-tags">
                  {(lang === "it" ? ["Natura", "Fotografia", "Avventura", "Relax"] : ["Nature", "Photography", "Adventure", "Relaxation"]).map(x => <span key={x}>{x}</span>)}
                </div>
                <div className="led-feat-days">
                  {FEAT_DAYS.map((d, i) => (
                    <div key={i} className="led-feat-day">
                      <span className="led-feat-day-img" style={{ backgroundImage: `url(${unsplashSized(d.img, 120)})` }} />
                      <span><span className="a">{t("led.show.dayLabel")} {i + 1}</span><span className="b" style={{ display: "block" }}>{b(d.label)}</span></span>
                    </div>
                  ))}
                  <div className="led-feat-day more">+3 {t("led.show.moreDays")} ›</div>
                </div>
              </div>
            </div>
          </div>

          <div className="led-show-gridhead">
            <div className="led-eyebrow"><span className="d" />{t("led.show.gridEyebrow")}</div>
            <button className="led-show-explore" onClick={onStart}>{t("led.show.explore")} →</button>
          </div>
          <div className="led-cards">
            {MOOD_CARDS.map((c, i) => (
              <div key={i} className="led-card" style={{ backgroundImage: `url(${unsplashSized(c.img, 520)})` }}>
                <span className="led-card-badge">{b(c.badge)}</span>
                <div className="led-card-body">
                  <div className="led-card-name">{c.name}</div>
                  <div className="led-card-country">{b(c.country)}</div>
                  <div className="led-card-meta">{b(c.meta)}</div>
                  <div className="led-card-desc">{b(c.desc)}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="led-quote">
            <span className="led-quote-mark">"</span>
            <p className="led-quote-text">{t("led.show.quote")}</p>
            <div className="led-quote-stats">
              {itinCount && (
                <div className="led-quote-stat"><div className="n">{itinCount}+</div><div className="l">{t("led.stats.itineraries")}</div></div>
              )}
              {destCount && (
                <div className="led-quote-stat"><div className="n">{destCount}+</div><div className="l">{t("led.stats.destinations")}</div></div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ④ MADE FOR YOU + EMAIL */}
      <section className="led-made">
        <div className="led-container">
          <div className="led-made-grid">
            <div>
              <div className="led-eyebrow"><span className="d" />{t("led.made.eyebrow")}</div>
              <h2>{em("led.made.title")}</h2>
              <p>{t("led.made.sub")}</p>
              <div className="led-features">
                <div className="led-feature"><span className="ic">{I.heart}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f1.t")}</span><span className="d">{t("led.made.f1.d")}</span></span></div>
                <div className="led-feature"><span className="ic">{I.cal}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f2.t")}</span><span className="d">{t("led.made.f2.d")}</span></span></div>
                <div className="led-feature"><span className="ic">{I.target}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f3.t")}</span><span className="d">{t("led.made.f3.d")}</span></span></div>
                <div className="led-feature"><span className="ic">{I.trend}</span><span><span className="t" style={{ display: "block" }}>{t("led.made.f4.t")}</span><span className="d">{t("led.made.f4.d")}</span></span></div>
              </div>
            </div>

            {/* Anteprima prodotto — dati demo dichiarati */}
            <div className="led-preview">
              <span className="led-preview-label">{t("led.made.previewLabel")}</span>
              <div className="led-preview-head">
                <div>
                  <div className="a">{t("led.made.welcome")}</div>
                  <div className="b">{t("led.made.welcomeSub").replace("{month}", monthName)}</div>
                </div>
                <span className="led-preview-match">{t("led.made.match")} <strong>95%</strong></span>
              </div>
              <div className="led-preview-cards">
                {PREVIEW_CARDS.map((c, i) => (
                  <div key={i} className="led-pcard">
                    <div className="led-pcard-img" style={{ backgroundImage: `url(${unsplashSized(c.img, 420)})` }}>
                      <span className="badge">{t(c.badgeKey)}</span>
                    </div>
                    <div className="led-pcard-body">
                      <div className="led-pcard-name">{c.name}<em>{b(c.sub)}</em></div>
                      <div className="led-pcard-tags">{c.tags.map((x, j) => <span key={j}>{b(x)}</span>)}</div>
                      <div className="led-pcard-meta">
                        <strong>{c.days} {t("led.made.days")}</strong> · {t("led.made.fromCity")} {b(c.travel)}<br />
                        {t("led.made.from")} <strong>{c.from}</strong>
                      </div>
                      <button className={"led-pcard-cta" + (c.primary ? "" : " ghost")} onClick={onStart}>
                        {t("led.made.view")} →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="led-preview-honest">{I.shield} {t("led.made.honest")}</div>
            </div>
          </div>

          {/* Email band */}
          <div className="led-mail">
            <div className="led-mail-img" style={{ backgroundImage: `url(${unsplashSized(PHOTO.mountains, 700)})` }}>
              <span className="env">{I.mail}</span>
            </div>
            <div className="led-mail-body">
              <div className="led-mail-title">{em("led.mail.title")}</div>
              <p className="led-mail-sub">{t("led.mail.sub")}</p>
              {mailBand.state === "ok" ? (
                <div className="led-mail-note ok">{mailBand.note?.text}</div>
              ) : (
                <>
                  <form className="led-mail-form" onSubmit={mailBand.submit}>
                    <input
                      className="led-mail-input" type="email" inputMode="email" autoComplete="email"
                      placeholder={t("led.mail.placeholder")}
                      value={mailBand.email}
                      onChange={e => mailBand.setEmail(e.target.value)}
                      aria-label={t("led.mail.placeholder")}
                    />
                    <button className="led-btn" type="submit" disabled={mailBand.state === "busy"}>{t("led.mail.cta")}</button>
                  </form>
                  <div className={"led-mail-note" + (mailBand.note ? ` ${mailBand.note.cls}` : "")}>
                    {mailBand.note ? mailBand.note.text : t("led.mail.privacy")}
                  </div>
                </>
              )}
            </div>
            <div className="led-mail-feats">
              <div className="led-mail-feat"><span className="ic">{I.bell}</span><span><span className="t" style={{ display: "block" }}>{t("led.mail.b1.t")}</span><span className="d">{t("led.mail.b1.d")}</span></span></div>
              <div className="led-mail-feat"><span className="ic">{I.tag}</span><span><span className="t" style={{ display: "block" }}>{t("led.mail.b2.t")}</span><span className="d">{t("led.mail.b2.d")}</span></span></div>
              <div className="led-mail-feat"><span className="ic">{I.spark}</span><span><span className="t" style={{ display: "block" }}>{t("led.mail.b3.t")}</span><span className="d">{t("led.mail.b3.d")}</span></span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ⑤ FINAL CTA + PARTNERS */}
      <section className="led-final">
        <div className="led-container">
          <div className="led-final-grid">
            <div className="led-final-img" style={{ backgroundImage: `url(${unsplashSized(PHOTO.patagonia2, 900)})` }} />
            <div>
              <div className="led-eyebrow"><span className="d" />{t("led.final.eyebrow")}</div>
              <h2>{em("led.final.title")}</h2>
              <p className="led-final-sub">{t("led.final.sub")}</p>
              <div className="led-values">
                <div className="led-value"><span className="ic">{I.spark}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v1.t")}</span><span className="d">{t("led.final.v1.d")}</span></span></div>
                <div className="led-value"><span className="ic">{I.shield}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v2.t")}</span><span className="d">{t("led.final.v2.d")}</span></span></div>
                <div className="led-value"><span className="ic">{I.globe}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v3.t")}</span><span className="d">{t("led.final.v3.d")}</span></span></div>
                <div className="led-value"><span className="ic">{I.lock}</span><span><span className="t" style={{ display: "block" }}>{t("led.final.v4.t")}</span><span className="d">{t("led.final.v4.d")}</span></span></div>
              </div>
              <button className="led-btn xl" onClick={onStart} data-testid="led-final-cta">
                {t("led.final.cta")} <span className="led-arrow">→</span>
              </button>
              <div className="led-final-proof">
                <span><span className="ck">✓</span>{t("led.final.p1")}</span>
                <span><span className="ck">✓</span>{t("led.final.p2")}</span>
                <span><span className="ck">✓</span>{t("led.final.p3")}</span>
              </div>
            </div>
          </div>

          <div className="led-partners">
            <span className="led-partners-head">{t("led.partners.head")}</span>
            {PARTNERS.map(p => (
              <span key={p.label} className={"led-partner" + (p.serif ? " serif" : "")}>{p.label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="led-footer">
        <div className="led-container">
          <div className="led-footer-grid">
            <div>
              <div className="led-footer-mark">🦋 MindRoute</div>
              <p className="led-footer-tagline">{t("footer.tagline")}</p>
              <p className="led-footer-tagline">{t("led.foot.tagline2")}</p>
            </div>
            <div>
              <div className="led-footer-head">{t("led.foot.product")}</div>
              <Link href="/come-funziona" className="led-footer-link">{t("led.foot.how")}</Link>
              <Link href="/start" className="led-footer-link">{t("led.foot.start")}</Link>
            </div>
            <div>
              <div className="led-footer-head">{t("led.foot.company")}</div>
              <Link href="/privacy" className="led-footer-link">{t("led.foot.privacy")}</Link>
              <a href="mailto:mindroutetravel@gmail.com" className="led-footer-link">{t("led.foot.contact")}</a>
            </div>
            <div>
              <div className="led-footer-head">{t("led.foot.inspired")}</div>
              <p className="led-footer-tagline">{t("led.foot.inspiredSub")}</p>
              {mailFoot.state === "ok" ? (
                <div className="led-mail-note ok" style={{ marginTop: 14 }}>{mailFoot.note?.text}</div>
              ) : (
                <>
                  <form className="led-footer-form" onSubmit={mailFoot.submit}>
                    <input
                      className="led-footer-input" type="email" inputMode="email" autoComplete="email"
                      placeholder={t("led.mail.placeholder")}
                      value={mailFoot.email}
                      onChange={e => mailFoot.setEmail(e.target.value)}
                      aria-label={t("led.mail.placeholder")}
                    />
                    <button className="led-footer-send" type="submit" disabled={mailFoot.state === "busy"} aria-label={t("led.mail.cta")}>→</button>
                  </form>
                  {mailFoot.note && <div className={`led-mail-note ${mailFoot.note.cls}`}>{mailFoot.note.text}</div>}
                </>
              )}
              <div className="led-footer-socials">
                <a href="https://instagram.com/mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="Instagram">{I.ig}</a>
                <a href="https://tiktok.com/@mindroute.travel" target="_blank" rel="noopener noreferrer" className="led-footer-social" aria-label="TikTok">{I.tiktok}</a>
              </div>
            </div>
          </div>
          <div className="led-footer-base">
            <span>{t("footer.copyright")}</span>
            <span>{t("footer.affiliate")}</span>
            <span>{t("led.foot.made")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
