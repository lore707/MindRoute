import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
// CSS dell'area account, code-split su questa route lazy (vedi nota in index.css).
import "leaflet/dist/leaflet.css";
import "@/styles/account-dashboard.css";
import "@/styles/atlas-journey.css";
import "@/styles/account-cinematic.css";
import "@/styles/account-portrait.css";
import "@/styles/account-atlas.css";
// Dopo account-dashboard.css di proposito: la Home v4 e la barra a due voci
// sovrascrivono (e spengono) pezzi del layout precedente.
import "@/styles/home-v4.css";
import { X, GitCompare } from "lucide-react";
import { type AccountData } from "@/components/AccountCinematic";
import { AccountDashboard } from "@/components/AccountDashboard";
import { GenerationSheet, type PinnedDestination } from "@/components/GenerationSheet";
import { portraitChips } from "@/lib/portrait-chips";
import { useI18n } from "@/lib/i18n";
import { type PortraitData } from "@/components/AccountPortrait";
import { type AtlasData } from "@/components/AccountAtlas";
import { deriveTraitLabels } from "@/lib/trait-labels";
import { getTripStatus } from "@shared/trip-status";
import { getLastOpenedItinerary } from "@/lib/last-opened";
import { fetchMe } from "@/hooks/use-auth";
import { unsplashSized } from "@/lib/img";
import type { TraitVector } from "@shared/traits";

// Fallback hero per utenti senza viaggi (o se l'ultimo aperto non ha
// heroImageUrl). Drop `default-hero.jpg` in client/public/ per personalizzare;
// se l'asset manca, il gradient sopra il background già garantisce una
// visione poetica scura, senza errori di rendering.
const FALLBACK_HERO_IMG = "/default-hero.jpg";

type AxisLabel = { left: string; right: string; it: { left: string; right: string } };
type TraitHistory = {
  snapshots: Array<{ id: number; createdAt: string; source: string; traits: Record<string, number> }>;
  current: Record<string, number>;
  delta: Record<string, number> | null;
  headline: string | null;
  axes: Record<string, AxisLabel>;
  mappingVersion: number;
};

type AccountInsights = {
  stats: {
    destinationsExplored: number;
    daysImagined: number;
    budgetBookableEur: number | null;
    topContinent: { continent: string; label: string; count: number } | null;
    avgTripDays: number | null;
    tripsConfirmed?: number;
  };
  patterns: {
    topContinent: string | null;
    topContinentRatio: number | null;
    avgDays: number | null;
    shortTripBias: boolean;
    longTripBias: boolean;
    tripCount: number;
  };
};

type SavedMoment = {
  id: number;
  itineraryId: number;
  momentId: string;
  createdAt: string;
  momentSnapshot: {
    title: string;
    image_url: string | null;
    location_name: string | null;
    destination_name: string | null;
    day_number: number | null;
    type: string | null;
  } | null;
};

function formatEur(amount: number): string {
  if (amount >= 10000) return `€${Math.round(amount / 1000)}k`;
  return `€${Math.round(amount).toLocaleString("it-IT")}`;
}

// Mappa un nome destinazione/continente alle etichette IT usate dai filtri del
// componente AccountCinematic ("Europa", "Asia", "Africa", "Americhe",
// "Oceania"). Se il dato di continente è già in italiano, è passthrough.
function normalizeContinent(label: string | null | undefined): string {
  if (!label) return "Europa";
  const l = label.toLowerCase();
  if (l.includes("eur")) return "Europa";
  if (l.includes("asia")) return "Asia";
  if (l.includes("afric")) return "Africa";
  if (l.includes("americ") || l.includes("north america") || l.includes("south america")) return "Americhe";
  if (l.includes("ocean")) return "Oceania";
  return label;
}

const MONTH_IT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];
const MONTH_EN = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function shortDate(iso: string | null | undefined, lang: "en" | "it" = "it"): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const months = lang === "en" ? MONTH_EN : MONTH_IT;
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function MyAccount() {
  const [, setLocation] = useLocation();
  const { lang, t } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [traitHistory, setTraitHistory] = useState<TraitHistory | null>(null);
  const [insights, setInsights] = useState<AccountInsights | null>(null);
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [portrait, setPortrait] = useState<PortraitData | null>(null);
  const [atlas, setAtlas] = useState<AtlasData | null>(null);
  const [atlasLoading, setAtlasLoading] = useState(true);

  // ── Pannello dei vincoli (GenerationSheet, 2026-08) ──────────────────────
  // Una schermata sola fra "ho scelto" e "generami il viaggio". Con
  // `sheetDest` valorizzata la destinazione è bloccata (l'utente ha toccato
  // una proposta); senza, il matcher cerca ("genera dal profilo").
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetDest, setSheetDest] = useState<PinnedDestination | null>(null);
  const [sheetNote, setSheetNote] = useState("");

  useEffect(() => {
    // ── Percorso critico: auth + viaggi. Sbloccano subito il render (hero +
    // collezione). Tutto il resto è sotto la piega e viene idratato dopo, così
    // non compete col primo paint per rete e pool DB.
    fetchMe().then(data => setUser(data));

    let cancelled = false;
    fetch(`/api/my-trips?lang=${lang}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (!cancelled) setTrips(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setTrips([]); })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);

        // ── Secondari: lanciati dopo il primo paint. I più lenti (ritratto e
        // headline via Haiku, atlante geocodato) non bloccano la pagina.
        const loadSecondary = () => {
          if (cancelled) return;

          fetch(`/api/me/account-insights?lang=${lang}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: AccountInsights | null) => setInsights(d))
            .catch(() => setInsights(null));

          fetch("/api/me/saved-moments")
            .then(r => r.ok ? r.json() : [])
            .then((rows: SavedMoment[]) => setSavedMoments(Array.isArray(rows) ? rows : []))
            .catch(() => setSavedMoments([]));

          fetch(`/api/me/atlas?lang=${lang}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: AtlasData | null) => setAtlas(d))
            .catch(() => setAtlas(null))
            .finally(() => setAtlasLoading(false));

          fetch(`/api/me/trait-history?lang=${lang}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: TraitHistory | null) => setTraitHistory(d))
            .catch(() => setTraitHistory(null));

          fetch(`/api/me/portrait?lang=${lang}`)
            .then(r => r.ok ? r.json() : null)
            .then((d: PortraitData | null) => setPortrait(d))
            .catch(() => setPortrait(null));
        };

        // requestIdleCallback quando disponibile, altrimenti microtimeout: in
        // entrambi i casi dopo che il browser ha dipinto hero + collezione.
        const ric = (window as any).requestIdleCallback as
          | ((cb: () => void, opts?: { timeout: number }) => number)
          | undefined;
        if (ric) ric(loadSecondary, { timeout: 800 });
        else setTimeout(loadSecondary, 50);
      });

    return () => { cancelled = true; };
    // lang nelle deps: i dati localizzati dal server (ritratto, atlante,
    // insights) vanno rifetchati quando l'utente cambia lingua.
  }, [lang]);

  const removeSavedMoment = async (s: SavedMoment) => {
    setSavedMoments(prev => prev.filter(x => x.id !== s.id));
    try {
      await fetch(`/api/me/saved-moments/${s.itineraryId}/${encodeURIComponent(s.momentId)}`, { method: "DELETE" });
    } catch {
      // best-effort: se fallisce, l'utente ricaricherà la pagina
    }
  };

  const canGenerateFromProfile = !!traitHistory && traitHistory.snapshots.length >= 2;

  const openSheet = (dest: PinnedDestination | null, note = "") => {
    setSheetDest(dest);
    setSheetNote(note);
    setSheetOpen(true);
  };

  // ── Derivazioni per AccountData ───────────────────────────────────────
  // L'hero usa l'ultimo itinerario aperto (localStorage); se non c'è, il più
  // recente creato; se non c'è nulla, il fallback statico.
  const heroImg = useMemo(() => {
    const lastId = getLastOpenedItinerary();
    if (lastId) {
      const lastTrip = trips.find(t => t.id === lastId);
      if (lastTrip?.heroImageUrl) return lastTrip.heroImageUrl;
    }
    return trips[0]?.heroImageUrl ?? FALLBACK_HERO_IMG;
  }, [trips]);

  // Viaggi EFFETTIVAMENTE fatti (trip_status="confirmed"): il numero "reale"
  // dietro tutti gli altri. Client-side dai tripMeta già presenti nei trips.
  const tripsConfirmed = useMemo(
    () => trips.filter(t => getTripStatus(t) === "confirmed").length,
    [trips],
  );

  const heroStats = useMemo(() => {
    const destinations = new Set(trips.map(t => t.destinationName ?? "").filter(Boolean));
    const continents = new Set(trips.map(t => t.continent).filter(Boolean));
    const totalDays = trips.reduce((acc, t) => acc + (Array.isArray(t.days) ? t.days.length : 0), 0);
    return [
      { value: String(trips.length), label: trips.length === 1 ? "viaggio" : "viaggi" },
      { value: String(totalDays), label: totalDays === 1 ? "giorno" : "giorni" },
      { value: String(destinations.size), label: destinations.size === 1 ? "destinazione" : "destinazioni" },
      { value: String(continents.size || 1), label: (continents.size || 1) === 1 ? "continente" : "continenti" },
    ];
  }, [trips]);

  const traitLabels = useMemo(() => {
    if (!traitHistory) return deriveTraitLabels(null);
    return deriveTraitLabels(traitHistory.current as TraitVector);
  }, [traitHistory]);

  // Profile quote: preferisce headline AI (Haiku) se presente, altrimenti
  // testo fallback. La byline conta i viaggi e include il delta evolutivo
  // quando significativo.
  const profileQuote = traitHistory?.headline
    ? traitHistory.headline
    : trips.length === 0
      ? (lang === "en"
          ? "You're building your travel profile. Generate more itineraries to discover who you are."
          : "Stai costruendo il tuo profilo di viaggio. Genera più itinerari per scoprire chi sei.")
      : (lang === "en"
          ? "Your traveller profile takes shape with every trip."
          : "Il tuo profilo viaggiatore prende forma a ogni viaggio.");
  const profileByline = (() => {
    const tripsCount = trips.length;
    const tripsLabel = lang === "en"
      ? (tripsCount === 1 ? "trip" : "trips")
      : (tripsCount === 1 ? "viaggio" : "viaggi");
    const confirmedClause = tripsConfirmed > 0
      ? (lang === "en"
          ? ` · <strong>${tripsConfirmed} actually ${tripsConfirmed === 1 ? "taken" : "taken"}</strong>`
          : ` · <strong>${tripsConfirmed} realmente ${tripsConfirmed === 1 ? "fatto" : "fatti"}</strong>`)
      : "";
    const base = lang === "en"
      ? `Distilled from your <strong>${tripsCount} ${tripsLabel}</strong>${confirmedClause}`
      : `Distillato dai tuoi <strong>${tripsCount} ${tripsLabel}</strong>${confirmedClause}`;
    if (!traitHistory?.delta) return base;
    const top = Object.entries(traitHistory.delta)
      .map(([k, v]) => ({ k, abs: Math.abs(v as number), v: v as number }))
      .sort((a, b) => b.abs - a.abs)[0];
    if (!top || top.abs < 0.06) return base;
    const names = traitHistory.axes[top.k];
    const labels = lang === "it" ? names?.it : names;
    if (!labels) return base;
    const dir = top.v > 0 ? labels.right : labels.left;
    return lang === "en"
      ? `${base} · evolving toward <strong>${dir}</strong>`
      : `${base} · in evoluzione verso <strong>${dir}</strong>`;
  })();

  // Continue items: la sezione "Da riprendere" (Ondata B, top 3 più vecchi
  // quando ≥6 trips). Featured = primo della lista.
  const continueItems = useMemo(() => {
    if (trips.length < 6) return [];
    const oldest = [...trips]
      .filter(t => t.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 3);
    const daysWord = (n: number) => lang === "en" ? (n === 1 ? "day" : "days") : (n === 1 ? "giorno" : "giorni");
    return oldest.map((t, i) => {
      const n = t.days?.length ?? 7;
      return {
        title: t.destinationName ?? "Itinerario",
        quote: t.whyYours ?? undefined,
        sub: `${n} ${daysWord(n)}`,
        date: shortDate(t.createdAt, lang),
        img: t.heroImageUrl ?? FALLBACK_HERO_IMG,
        href: `/itinerary/${t.id}`,
        featured: i === 0,
      };
    });
  }, [trips, lang]);

  // Trips per il mosaic della collezione. Niente filtri client-side qui — il
  // componente AccountCinematic ha la sua UI di filtri integrata.
  const mappedTrips = useMemo(() => trips.map(t => ({
    dest: t.destinationName ?? "Itinerario",
    quote: t.whyYours ?? "",
    duration: `${t.days?.length ?? 7} ${lang === "en" ? "days" : "giorni"}`,
    date: shortDate(t.createdAt, lang),
    rawDate: t.createdAt ?? undefined,
    id: t.id,
    continent: normalizeContinent(t.continentLabel ?? t.continent),
    img: t.heroImageUrl ?? FALLBACK_HERO_IMG,
    href: `/itinerary/${t.id}`,
    taken: getTripStatus(t) === "confirmed",
    emotion: t.tripMeta?.emotion,
    budget: typeof t.tripMeta?.total_cost_bookable === "number" ? t.tripMeta.total_cost_bookable : null,
    stops: Array.isArray(t.tripMeta?.map_points)
      ? [...t.tripMeta.map_points]
          .filter((p: any) => typeof p?.lat === "number" && typeof p?.lng === "number")
          .sort((a: any, b: any) => (a.day ?? 0) - (b.day ?? 0))
          .map((p: any) => ({ lat: p.lat, lng: p.lng }))
      : [],
  })), [trips, lang]);

  // Stats novelistic — 4 numeri grandi. Costruite da trips + insights.
  const novelStats = useMemo(() => {
    const totalDays = trips.reduce((acc, t) => acc + (Array.isArray(t.days) ? t.days.length : 0), 0);
    const destinations = new Set(trips.map(t => t.destinationName ?? "").filter(Boolean));
    const continents = new Set(trips.map(t => t.continent).filter(Boolean));
    const firstTrip = trips[trips.length - 1];
    const lastTrip = trips[0];
    const continentTop = insights?.stats.topContinent;
    return [
      {
        value: String(trips.length),
        label: lang === "en" ? "Trips planned" : "Viaggi immaginati",
        sub: tripsConfirmed > 0
          ? (lang === "en"
              ? `${tripsConfirmed} actually taken`
              : `${tripsConfirmed} ${tripsConfirmed === 1 ? "realmente fatto" : "realmente fatti"}`)
          : firstTrip && lastTrip && firstTrip.id !== lastTrip.id
            ? `Da ${(firstTrip.destinationName ?? "").split(",")[0]} a ${(lastTrip.destinationName ?? "").split(",")[0]}`
            : undefined,
      },
      {
        value: String(totalDays),
        label: "Giorni altrove",
        sub: insights?.stats.avgTripDays ? `Media ${insights.stats.avgTripDays} per viaggio` : undefined,
      },
      {
        value: String(destinations.size),
        label: destinations.size === 1 ? "Anima di città" : "Anime di città",
        sub: "Da rivivere",
      },
      {
        value: String(continents.size || 1),
        label: (continents.size || 1) === 1 ? "Continente" : "Continenti",
        sub: continentTop ? `${continentTop.label} è il più amato` : undefined,
        goldNum: true,
      },
    ];
  }, [trips, insights, tripsConfirmed, lang]);

  const statsNarrative = useMemo(() => {
    const totalDays = trips.reduce((acc, t) => acc + (Array.isArray(t.days) ? t.days.length : 0), 0);
    const destinations = new Set(trips.map(t => t.destinationName ?? "").filter(Boolean));
    if (trips.length === 0) {
      return lang === "en"
        ? "Your first trip is still to be written. MindRoute is here whenever you want to leave."
        : "Il tuo primo viaggio è ancora da scrivere. MindRoute è qui quando vorrai partire.";
    }
    const n = trips.length;
    const cities = destinations.size;
    // Plurali a mano (niente ICU, vedi DECISIONS #8): "1 times"/"1 cieli" leggeva rotto.
    const times = lang === "en" ? (n === 1 ? "once" : `${n} times`) : (n === 1 ? "una volta" : `${n} volte`);
    const skies = lang === "en"
      ? (cities === 1 ? "a single sky" : `${cities} different skies`)
      : (cities === 1 ? "un solo cielo" : `${cities} cieli diversi`);
    const daysW = lang === "en" ? (totalDays === 1 ? "day" : "days") : (totalDays === 1 ? "giorno" : "giorni");
    return lang === "en"
      ? `You set off ${times}. You imagined ${totalDays} ${daysW} elsewhere, under ${skies}. Keep going.`
      : `Sei partito ${times}. Hai immaginato ${totalDays} ${daysW} altrove, sotto ${skies}. Continua così.`;
  }, [trips, lang]);
  const statsBold = useMemo(() => {
    if (trips.length === 0) return [];
    const totalDays = trips.reduce((acc, t) => acc + (Array.isArray(t.days) ? t.days.length : 0), 0);
    const destinations = new Set(trips.map(t => t.destinationName ?? "").filter(Boolean)).size;
    const n = trips.length;
    return lang === "en"
      ? [n === 1 ? "once" : `${n} times`, `${totalDays} ${totalDays === 1 ? "day" : "days"}`, destinations === 1 ? "a single sky" : `${destinations} different skies`]
      : [n === 1 ? "una volta" : `${n} volte`, `${totalDays} ${totalDays === 1 ? "giorno" : "giorni"}`, destinations === 1 ? "un solo cielo" : `${destinations} cieli diversi`];
  }, [trips, lang]);

  // Settings: rapida lista neutrale. Email è auto-aggiunto dal componente
  // dalla AccountData.email. La maggior parte sono placeholder "href #" finché
  // non esistono le pagine relative; teniamo solo quelle che hanno destinazioni
  // reali nel router.
  const settings = useMemo(() => {
    const out: Array<{ label: string; value: string; href?: string }> = [];
    out.push({ label: "Lingua", value: "Italiano" });
    if (trips.length >= 2) out.push({ label: "Confronta viaggi", value: "Apri /compare", href: "/compare" });
    out.push({ label: "Account", value: user?.email ? "Google" : "—" });
    return out;
  }, [trips, user]);

  // ── AccountData per il componente ─────────────────────────────────────
  const accountData: AccountData = {
    userName: (user?.name ?? "Viaggiatore").split(" ")[0],
    greeting: "Bentornato,",
    email: user?.email ?? "",
    avatarInitial: user?.name?.[0] ?? "?",
    heroImg,
    heroStats,
    profileQuote,
    profileByline,
    traits: traitLabels,
    portrait,
    traitVector: traitHistory?.current ?? null,
    traitSnapshots: traitHistory?.snapshots?.map(s => ({ createdAt: s.createdAt, traits: s.traits, source: s.source })) ?? [],
    traitHeadline: traitHistory?.headline ?? null,
    patterns: insights?.patterns
      ? {
          topContinentLabel: insights.patterns.topContinent,
          avgDays: insights.patterns.avgDays,
          shortTripBias: insights.patterns.shortTripBias,
          longTripBias: insights.patterns.longTripBias,
          tripCount: insights.patterns.tripCount,
        }
      : null,
    continueItems,
    trips: mappedTrips,
    stats: novelStats,
    statsNarrative,
    statsBold,
    atlas,
    atlasLoading,
    savedMoments,
    settings,
    onNewItinerary: () => setLocation("/start"),
    onSecondaryCta: () => {
      // "Genera dal profilo": apre il pannello dei vincoli se abbiamo
      // abbastanza segnale (≥2 snapshot). Altrimenti avvia il quiz — il
      // pulsante fa sempre qualcosa di utile.
      if (canGenerateFromProfile) openSheet(null);
      else setLocation("/profiling");
    },
    secondaryCtaLabel: canGenerateFromProfile ? "✨ Genera dal tuo profilo" : "↓ Continua a esplorare",
    // Card "growth" del Daily Compass: la sfida accettata diventa la nota
    // libera del pannello, già scritta.
    onChallenge: (challenge: string) => {
      if (canGenerateFromProfile) openSheet(null, challenge);
      else setLocation("/start");
    },
    // Ha toccato una proposta: la destinazione è decisa, mancano i paletti.
    onPickDestination: (d) => openSheet(d),
    onLogout: () => { window.location.href = "/auth/logout"; },
    onDelete: () => {
      if (confirm("Sei sicuro di voler eliminare l'account? L'azione è irreversibile.")) {
        fetch("/api/auth/delete", { method: "POST" }).then(() => setLocation("/"));
      }
    },
  };

  // I chip che il pannello dei vincoli mostra: sono LE STESSE righe che
  // l'utente legge nel Ritratto, calcolate dalla stessa funzione pura, e i
  // loro id sono quelli con cui il server filtra il prompt. Spegnerne uno lo
  // toglie davvero dalla generazione.
  const genChips = useMemo(
    () => portraitChips(accountData, (k, v) => {
      let s = t(k);
      for (const key in (v ?? {})) s = s.split(`{${key}}`).join(String(v![key]));
      return s;
    }, lang),
    [accountData, t, lang],
  );

  if (loading) {
    // Skeleton del layout (non uno spinner): anticipa la struttura della
    // dashboard con uno shimmer discreto — l'attesa sembra parte del design.
    return (
      <div className="mr-skel" aria-busy="true" aria-label="Loading">
        <div className="sk-side" />
        <div className="sk-main">
          <div className="sk-topbar" />
          <div className="sk-hero" />
          <div className="sk-row">
            <div className="sk-card" />
            <div className="sk-card" />
          </div>
          <div className="sk-row three">
            <div className="sk-card sm" />
            <div className="sk-card sm" />
            <div className="sk-card sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sezioni custom (Ondata B saved moments + CTA compare) iniettate DENTRO
          la Home della dashboard via prop homeExtra, così restano nello shell
          (offset sidebar) invece di galleggiare a tutta larghezza sotto di esso. */}
      <AccountDashboard data={accountData} homeExtra={
        (savedMoments.length > 0 || trips.length >= 2) ? (
      <div className="account-cinematic-extra">
        {savedMoments.length > 0 && (
          <section>
            <div className="ac-container">
              <div className="ac-eyebrow"><span className="d" />Bookmark trasversale</div>
              <h2><em>Momenti</em> che ti hanno chiamato.</h2>
              <p style={{ color: "rgba(245,240,238,.55)", marginTop: 12, marginBottom: 8 }}>
                {savedMoments.length} salvat{savedMoments.length === 1 ? "o" : "i"} attraverso i tuoi viaggi.
              </p>
              <div className="ac-saved-grid">
                {savedMoments.map(s => (
                  <a key={s.id} href={`/itinerary/${s.itineraryId}`} className="ac-saved-card">
                    {s.momentSnapshot?.image_url
                      ? <div className="ac-saved-card-img" style={{ backgroundImage: `url(${unsplashSized(s.momentSnapshot.image_url, 480)})` }} />
                      : <div className="ac-saved-card-img" style={{ background: "linear-gradient(135deg,#1a0814,#2d0a1a)" }} />
                    }
                    <button
                      type="button"
                      className="ac-saved-card-remove"
                      title="Rimuovi"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeSavedMoment(s); }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="ac-saved-card-body">
                      <div className="ac-saved-card-title">{s.momentSnapshot?.title ?? "Momento"}</div>
                      <div className="ac-saved-card-meta">
                        {s.momentSnapshot?.destination_name ?? "—"}
                        {s.momentSnapshot?.day_number ? ` · giorno ${s.momentSnapshot.day_number}` : ""}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

        {trips.length >= 2 && (
          <section>
            <div className="ac-container">
              <div className="ac-compare-cta">
                <div className="ac-compare-cta-text">
                  Vuoi vedere <strong>due viaggi</strong> uno accanto all'altro?
                </div>
                <Link href="/compare">
                  <GitCompare className="w-4 h-4" /> Confronta side-by-side
                </Link>
              </div>
            </div>
          </section>
        )}
      </div>
        ) : null
      } />

      {/* Il pannello dei vincoli. Una schermata sola: raccoglie le date (che
          non possiamo dedurre) e MOSTRA quali righe del Ritratto stanno per
          entrare nella generazione, lasciandole spegnere. */}
      <GenerationSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        destination={sheetDest}
        chips={genChips}
        initialNote={sheetNote}
      />
    </>
  );
}

// Helper retained per backward compat se altri file lo importavano. Non più
// usato qui — la formattazione monetaria del Wrapped è scomparsa.
export { formatEur };
