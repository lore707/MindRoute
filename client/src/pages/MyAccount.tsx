import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Heart, GitCompare } from "lucide-react";
import { type AccountData } from "@/components/AccountCinematic";
import { AccountRedesign } from "@/components/AccountRedesign";
import { type PortraitData } from "@/components/AccountPortrait";
import { type AtlasData } from "@/components/AccountAtlas";
import { deriveTraitLabels } from "@/lib/trait-labels";
import { getLastOpenedItinerary } from "@/lib/last-opened";
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
function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${MONTH_IT[d.getMonth()]} ${d.getFullYear()}`;
}

export default function MyAccount() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [traitHistory, setTraitHistory] = useState<TraitHistory | null>(null);
  const [insights, setInsights] = useState<AccountInsights | null>(null);
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);
  const [portrait, setPortrait] = useState<PortraitData | null>(null);
  const [atlas, setAtlas] = useState<AtlasData | null>(null);
  const [atlasLoading, setAtlasLoading] = useState(true);

  // ── "Genera dal profilo" modal (Ondata C, esteso con defaults pre-compilati + textarea override) ──
  const [showFromProfile, setShowFromProfile] = useState(false);
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpDays, setFpDays] = useState(7);
  const [fpCompanions, setFpCompanions] = useState("couple");
  const [fpDeparture, setFpDeparture] = useState("");
  const [fpBudget, setFpBudget] = useState("medio");
  const [fpLeaveDate, setFpLeaveDate] = useState("");
  const [fpContextOverride, setFpContextOverride] = useState("");
  const [fpDefaultsLoaded, setFpDefaultsLoaded] = useState(false);

  const openFromProfileModal = async () => {
    setShowFromProfile(true);
    if (fpDefaultsLoaded) return;
    try {
      const r = await fetch("/api/profiling/defaults");
      if (r.ok) {
        const d = await r.json();
        if (typeof d.days === "number") setFpDays(d.days);
        if (typeof d.companions === "string") setFpCompanions(d.companions);
        if (typeof d.departure === "string") setFpDeparture(d.departure);
        if (typeof d.budget === "string") setFpBudget(d.budget);
        if (typeof d.leaveDate === "string") setFpLeaveDate(d.leaveDate);
      }
    } catch {
      // best-effort: se fallisce restano i default neutri
    } finally {
      setFpDefaultsLoaded(true);
    }
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));

    fetch("/api/my-trips")
      .then(r => r.ok ? r.json() : [])
      .then(data => setTrips(Array.isArray(data) ? data : []))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));

    fetch("/api/me/trait-history")
      .then(r => r.ok ? r.json() : null)
      .then((data: TraitHistory | null) => setTraitHistory(data))
      .catch(() => setTraitHistory(null));

    fetch("/api/me/account-insights")
      .then(r => r.ok ? r.json() : null)
      .then((data: AccountInsights | null) => setInsights(data))
      .catch(() => setInsights(null));

    fetch("/api/me/saved-moments")
      .then(r => r.ok ? r.json() : [])
      .then((rows: SavedMoment[]) => setSavedMoments(Array.isArray(rows) ? rows : []))
      .catch(() => setSavedMoments([]));

    fetch("/api/me/portrait")
      .then(r => r.ok ? r.json() : null)
      .then((d: PortraitData | null) => setPortrait(d))
      .catch(() => setPortrait(null));

    fetch("/api/me/atlas")
      .then(r => r.ok ? r.json() : null)
      .then((d: AtlasData | null) => setAtlas(d))
      .catch(() => setAtlas(null))
      .finally(() => setAtlasLoading(false));
  }, []);

  const removeSavedMoment = async (s: SavedMoment) => {
    setSavedMoments(prev => prev.filter(x => x.id !== s.id));
    try {
      await fetch(`/api/me/saved-moments/${s.itineraryId}/${encodeURIComponent(s.momentId)}`, { method: "DELETE" });
    } catch {
      // best-effort: se fallisce, l'utente ricaricherà la pagina
    }
  };

  const canGenerateFromProfile = !!traitHistory && traitHistory.snapshots.length >= 2;

  const submitFromProfile = async () => {
    setFpLoading(true); setFpError("");
    try {
      const res = await fetch("/api/profiling/from-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days: fpDays,
          leaveDate: fpLeaveDate || new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
          departure: fpDeparture || "Italia",
          budget: fpBudget,
          companions: fpCompanions,
          contextOverride: fpContextOverride.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ message: "Errore" }));
        throw new Error(j.message ?? "Errore");
      }
      setShowFromProfile(false);
      setLocation("/destinations");
    } catch (e: any) {
      setFpError(e?.message ?? "Errore generico");
    } finally {
      setFpLoading(false);
    }
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
      ? "Stai costruendo il tuo profilo di viaggio. Genera più itinerari per scoprire chi sei."
      : "Il tuo profilo viaggiatore prende forma a ogni viaggio.";
  const profileByline = (() => {
    const tripsCount = trips.length;
    const tripsLabel = tripsCount === 1 ? "viaggio" : "viaggi";
    const base = `Distillato dai tuoi <strong>${tripsCount} ${tripsLabel}</strong>`;
    if (!traitHistory?.delta) return base;
    const top = Object.entries(traitHistory.delta)
      .map(([k, v]) => ({ k, abs: Math.abs(v as number), v: v as number }))
      .sort((a, b) => b.abs - a.abs)[0];
    if (!top || top.abs < 0.06) return base;
    const labels = traitHistory.axes[top.k]?.it;
    if (!labels) return base;
    const dir = top.v > 0 ? labels.right : labels.left;
    return `${base} · in evoluzione verso <strong>${dir}</strong>`;
  })();

  // Continue items: la sezione "Da riprendere" (Ondata B, top 3 più vecchi
  // quando ≥6 trips). Featured = primo della lista.
  const continueItems = useMemo(() => {
    if (trips.length < 6) return [];
    const oldest = [...trips]
      .filter(t => t.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 3);
    return oldest.map((t, i) => ({
      title: t.destinationName ?? "Itinerario",
      quote: t.whyYours ?? undefined,
      sub: `${t.days?.length ?? 7} giorni`,
      date: shortDate(t.createdAt),
      img: t.heroImageUrl ?? FALLBACK_HERO_IMG,
      href: `/itinerary/${t.id}`,
      featured: i === 0,
    }));
  }, [trips]);

  // Trips per il mosaic della collezione. Niente filtri client-side qui — il
  // componente AccountCinematic ha la sua UI di filtri integrata.
  const mappedTrips = useMemo(() => trips.map(t => ({
    dest: t.destinationName ?? "Itinerario",
    quote: t.whyYours ?? "",
    duration: `${t.days?.length ?? 7} giorni`,
    date: shortDate(t.createdAt),
    continent: normalizeContinent(t.continentLabel ?? t.continent),
    img: t.heroImageUrl ?? FALLBACK_HERO_IMG,
    href: `/itinerary/${t.id}`,
  })), [trips]);

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
        label: "Viaggi completati",
        sub: firstTrip && lastTrip && firstTrip.id !== lastTrip.id
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
  }, [trips, insights]);

  const statsNarrative = useMemo(() => {
    const totalDays = trips.reduce((acc, t) => acc + (Array.isArray(t.days) ? t.days.length : 0), 0);
    const destinations = new Set(trips.map(t => t.destinationName ?? "").filter(Boolean));
    if (trips.length === 0) {
      return "Il tuo primo viaggio è ancora da scrivere. MindRoute è qui quando vorrai partire.";
    }
    const n = trips.length;
    const cities = destinations.size;
    return `Sei partito ${n} volte. Hai immaginato ${totalDays} giorni altrove, sotto ${cities} cieli diversi. Continua così.`;
  }, [trips]);
  const statsBold = useMemo(() => {
    if (trips.length === 0) return [];
    const totalDays = trips.reduce((acc, t) => acc + (Array.isArray(t.days) ? t.days.length : 0), 0);
    const destinations = new Set(trips.map(t => t.destinationName ?? "").filter(Boolean)).size;
    return [`${trips.length} volte`, `${totalDays} giorni`, `${destinations} cieli diversi`];
  }, [trips]);

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
    continueItems,
    trips: mappedTrips,
    stats: novelStats,
    statsNarrative,
    statsBold,
    atlas,
    atlasLoading,
    settings,
    onNewItinerary: () => setLocation("/profiling"),
    onSecondaryCta: () => {
      if (canGenerateFromProfile) openFromProfileModal();
      else {
        const el = document.getElementById("ac-collection");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }
    },
    secondaryCtaLabel: canGenerateFromProfile ? "✨ Genera dal tuo profilo" : "↓ Continua a esplorare",
    onLogout: () => { window.location.href = "/auth/logout"; },
    onDelete: () => {
      if (confirm("Sei sicuro di voler eliminare l'account? L'azione è irreversibile.")) {
        fetch("/api/auth/delete", { method: "POST" }).then(() => setLocation("/"));
      }
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "transparent" }}>
        <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <AccountRedesign data={accountData} />

      {/* Sezioni custom appendute dopo il design — preservano funzionalità
          non coperte dal componente cinematic (Ondata B saved moments + CTA
          compare). Stili sotto .account-cinematic-extra in account-cinematic.css. */}
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
                      ? <div className="ac-saved-card-img" style={{ backgroundImage: `url(${s.momentSnapshot.image_url})` }} />
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

      {/* Modal "Genera dal profilo" — invariato dalla versione precedente,
          attivato dal CTA ghost della hero quando l'utente ha ≥2 snapshot. */}
      <AnimatePresence>
        {showFromProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(10,8,20,0.78)", backdropFilter: "blur(10px)" }}
            onClick={() => !fpLoading && setShowFromProfile(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-md rounded-[20px] md:rounded-[24px] p-5 md:p-7 max-h-[calc(100vh-32px)] overflow-y-auto"
              style={{ background: "#15101e", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[2px] uppercase text-[#E94560]">
                  <Sparkles className="w-3 h-3" /> Shortcut profilo
                </div>
                <button type="button" onClick={() => !fpLoading && setShowFromProfile(false)} aria-label="Chiudi" className="flex items-center justify-center w-9 h-9 -mr-2 -mt-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <h3 className="font-serif text-xl text-white leading-tight mb-2">Genera dal tuo profilo</h3>
              <p className="text-[12px] text-white/50 leading-relaxed mb-4">
                Salti il quiz: partiamo dal tuo profilo aggregato sui {traitHistory?.snapshots.length ?? 0} viaggi precedenti. Abbiamo già riempito i campi sotto dai tuoi pattern — modifica solo se serve.
              </p>

              {/* Compagnia */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Compagnia</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "solo", l: "Solo/a" },
                    { v: "couple", l: "In coppia" },
                    { v: "friends", l: "Amici" },
                    { v: "family", l: "Famiglia" },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFpCompanions(opt.v)}
                      className="px-3.5 py-2 min-h-[40px] rounded-full text-[12px] font-semibold transition-all"
                      style={{
                        background: fpCompanions === opt.v ? "#E94560" : "rgba(255,255,255,0.04)",
                        color: fpCompanions === opt.v ? "white" : "rgba(255,255,255,0.6)",
                        border: fpCompanions === opt.v ? "1px solid #E94560" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Durata */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Durata · <span className="text-white/70">{fpDays} giorni</span></label>
                <input
                  type="range" min={2} max={14} value={fpDays}
                  onChange={(e) => setFpDays(parseInt(e.target.value, 10))}
                  className="w-full accent-[#E94560]"
                />
              </div>

              {/* Partenza + Data */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Parti da</label>
                  <input
                    type="text" value={fpDeparture} onChange={(e) => setFpDeparture(e.target.value)}
                    placeholder="Milano, Roma…"
                    className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Quando</label>
                  <input
                    type="date" value={fpLeaveDate} onChange={(e) => setFpLeaveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }}
                  />
                </div>
              </div>

              {/* Budget */}
              <div className="mb-5">
                <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Budget</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { v: "basso", l: "Basso" },
                    { v: "medio", l: "Medio" },
                    { v: "alto", l: "Alto" },
                    { v: "unlimited", l: "Senza limite" },
                  ].map(opt => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setFpBudget(opt.v)}
                      className="px-3.5 py-2 min-h-[40px] rounded-full text-[12px] font-semibold transition-all"
                      style={{
                        background: fpBudget === opt.v ? "#E94560" : "rgba(255,255,255,0.04)",
                        color: fpBudget === opt.v ? "white" : "rgba(255,255,255,0.6)",
                        border: fpBudget === opt.v ? "1px solid #E94560" : "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">
                  Cosa cambia questa volta? <span className="text-white/30 normal-case font-normal tracking-normal">(opzionale)</span>
                </label>
                <textarea
                  value={fpContextOverride}
                  onChange={(e) => setFpContextOverride(e.target.value.slice(0, 300))}
                  placeholder="Es. stavolta con amici, weekend lungo, no Europa…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    "stavolta con amici",
                    "budget alto",
                    "no Europa",
                    "weekend lungo",
                    "qualcosa di diverso dal solito",
                  ].map(ex => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setFpContextOverride(ex)}
                      className="px-2.5 py-1 rounded-full text-[10.5px] text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-white/30 mt-1.5 text-right">{fpContextOverride.length}/300</div>
              </div>

              {fpError && <p className="text-[12px] text-[#E94560] mb-3">{fpError}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={submitFromProfile}
                  disabled={fpLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-full font-semibold text-[14px] text-white transition-all disabled:opacity-50"
                  style={{ background: "#E94560", boxShadow: "0 8px 24px rgba(233,69,96,0.25)" }}
                >
                  {fpLoading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generando…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Genera 3 destinazioni
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper retained per backward compat se altri file lo importavano. Non più
// usato qui — la formattazione monetaria del Wrapped è scomparsa.
export { formatEur };
