import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LogOut, MapPin, Calendar, Plus, ExternalLink, Globe, Clock, Compass, Wallet, Search, Heart, X, RotateCcw, Sparkles, GitCompare } from "lucide-react";

const BADGES = [
  { min: 1, max: 2, label: "Primo passo", emoji: "🌱", desc: "Hai generato il tuo primo itinerario" },
  { min: 3, max: 4, label: "Esploratore", emoji: "🧭", desc: "Tre viaggi all'attivo" },
  { min: 5, max: 9, label: "Esploratore seriale", emoji: "✈️", desc: "Cinque destinazioni esplorate" },
  { min: 10, max: 999, label: "Viaggiatore MindRoute", emoji: "🌍", desc: "Dieci itinerari generati" },
];

function getBadge(count: number) {
  return BADGES.find(b => count >= b.min && count <= b.max) || BADGES[0];
}

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

type DurationBucket = "all" | "short" | "mid" | "long";

const DURATION_LABELS: Record<DurationBucket, string> = {
  all: "Tutte",
  short: "≤ 3 giorni",
  mid: "4–7 giorni",
  long: "8+ giorni",
};

function bucketOf(days: number): DurationBucket {
  if (days <= 3) return "short";
  if (days <= 7) return "mid";
  return "long";
}

// Sintetizza la frase di evoluzione: trova l'asse con delta più forte e la
// racconta in italiano. Pura UI, nessuna chiamata AI — è una narrazione
// deterministica sopra i numeri.
function buildEvolutionNarrative(
  delta: Record<string, number> | null,
  axes: Record<string, AxisLabel>,
): string | null {
  if (!delta) return null;
  const ranked = Object.entries(delta)
    .map(([k, v]) => ({ k, v, abs: Math.abs(v) }))
    .sort((a, b) => b.abs - a.abs);
  const top = ranked[0];
  if (!top || top.abs < 0.06) return null;
  const labels = axes[top.k]?.it;
  if (!labels) return null;
  const direction = top.v > 0 ? labels.right : labels.left;
  return `Stai diventando più ${direction} nel tempo.`;
}

function formatEur(amount: number): string {
  if (amount >= 10000) return `€${Math.round(amount / 1000)}k`;
  return `€${Math.round(amount).toLocaleString("it-IT")}`;
}

// Pick the 1-2 most-pronounced axes (farthest from 0.5) and build a short
// Italian headline. Pure client logic — no LLM. The intent is identity,
// not description: "sei X" not "i tuoi viaggi sono X".
function buildHeadline(current: Record<string, number>, axes: Record<string, AxisLabel>): string {
  const ranked = (Object.keys(current) as Array<keyof typeof current>)
    .map(k => ({ k, v: current[k], dist: Math.abs(current[k] - 0.5) }))
    .sort((a, b) => b.dist - a.dist);
  const pick = (axisKey: string, value: number): string => {
    const labels = axes[axisKey]?.it;
    if (!labels) return "";
    return value < 0.5 ? labels.left : labels.right;
  };
  const top = ranked[0];
  const second = ranked[1];
  // Only include the second axis if it's meaningfully off-center too.
  if (!top || top.dist < 0.08) return "Il tuo profilo è ancora in formazione.";
  const a = pick(top.k as string, top.v);
  if (!second || second.dist < 0.12) return `Sei ${a}.`;
  const b = pick(second.k as string, second.v);
  return `Sei ${a}, ${b}.`;
}

export default function MyAccount() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [traitHistory, setTraitHistory] = useState<TraitHistory | null>(null);
  const [insights, setInsights] = useState<AccountInsights | null>(null);
  const [savedMoments, setSavedMoments] = useState<SavedMoment[]>([]);

  // ── Filtri lista viaggi (Ondata B punto 4) — puro client-side
  const [searchQ, setSearchQ] = useState("");
  const [durationFilter, setDurationFilter] = useState<DurationBucket>("all");
  const [continentFilter, setContinentFilter] = useState<string | null>(null);

  // ── "Genera dal profilo" modal (Ondata C punto 3, esteso con defaults
  // pre-compilati dai past trips + textarea libera per override "stavolta…")
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

  // Fetch defaults pre-compilati la prima volta che l'utente apre il modal.
  // Una sola chiamata per sessione: l'utente vede subito chip già riempite
  // basate sui suoi pattern reali invece di valori arbitrari.
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
  }, []);

  // Lista filtrata + lista dei continenti effettivamente presenti (per le pill).
  const filteredTrips = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    return trips.filter(t => {
      if (q && !(t.destinationName ?? "").toLowerCase().includes(q)) return false;
      if (durationFilter !== "all") {
        const days = Array.isArray(t.days) ? t.days.length : 0;
        if (bucketOf(days) !== durationFilter) return false;
      }
      if (continentFilter && t.continent !== continentFilter) return false;
      return true;
    });
  }, [trips, searchQ, durationFilter, continentFilter]);

  const availableContinents = useMemo(() => {
    const obj: Record<string, string> = {};
    for (const t of trips) {
      if (t.continent && t.continentLabel) obj[t.continent] = t.continentLabel;
    }
    return Object.entries(obj).map(([continent, label]) => ({ continent, label }));
  }, [trips]);

  // "Da riprendere" (Ondata B punto 5): heuristica senza tracking — i 3 trip
  // più vecchi quando ce ne sono almeno 6, perché il signal è solo significativo
  // a volume. createdAt arriva come stringa ISO; ordine ascendente = più vecchio prima.
  const toResume = useMemo(() => {
    if (trips.length < 6) return [];
    return [...trips]
      .filter(t => t.createdAt)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 3);
  }, [trips]);

  const hasActiveFilters = searchQ.length > 0 || durationFilter !== "all" || continentFilter !== null;
  const resetFilters = () => { setSearchQ(""); setDurationFilter("all"); setContinentFilter(null); };

  const removeSavedMoment = async (s: SavedMoment) => {
    setSavedMoments(prev => prev.filter(x => x.id !== s.id));
    try {
      await fetch(`/api/me/saved-moments/${s.itineraryId}/${encodeURIComponent(s.momentId)}`, { method: "DELETE" });
    } catch {
      // best-effort: se fallisce, l'utente ricaricherà la pagina
    }
  };

  // Soglia per mostrare il bottone "Genera dal profilo": almeno 2 snapshot
  // del trait history, perché sotto il signal è ancora rumore.
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

  const badge = getBadge(trips.length);
  const hasTraits = traitHistory && traitHistory.snapshots.length > 0;
  // Prefer the Haiku headline when present (richer, contextual). Fallback to the
  // pure-client one ("Sei offbeat, intimo.") so the UI is never empty.
  const headline = hasTraits
    ? (traitHistory.headline || buildHeadline(traitHistory.current, traitHistory.axes))
    : "";
  const axisKeys: Array<keyof TraitHistory["current"]> = hasTraits
    ? (Object.keys(traitHistory.current) as Array<keyof TraitHistory["current"]>)
    : [];
  const firstSnapshot = hasTraits && traitHistory.snapshots.length >= 3
    ? (traitHistory.snapshots[0].traits as Record<string, number>)
    : null;
  const evolutionNarrative = hasTraits
    ? buildEvolutionNarrative(traitHistory.delta, traitHistory.axes)
    : null;
  const showInsights = !loading && trips.length > 0 && insights !== null;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-12" style={{ background: "#0a0814" }}>
      <div className="max-w-4xl mx-auto">

        {/* Back */}
        <div className="flex items-center gap-4 mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>

        {/* Profilo + badge */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-[24px]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="flex items-center gap-5">
              {user.avatar
                ? <img src={user.avatar} className="w-14 h-14 rounded-full border-2 border-[#E94560]/30" alt={user.name} />
                : <div className="w-14 h-14 rounded-full bg-[#E94560] flex items-center justify-center text-white text-xl font-bold shrink-0">{user.name?.[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-serif font-bold text-white">{user.name}</h1>
                <p className="text-white/40 text-sm truncate">{user.email}</p>
              </div>
              <a href="/auth/logout" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all shrink-0">
                <LogOut className="w-4 h-4" /> Esci
              </a>
            </div>
          </motion.div>
        )}

        {/* Fascia Wrapped — destinazioni esplorate, giorni immaginati, € pianificati,
            continente più chiamato. Le card si autoadattano: budget appare solo
            quando almeno un viaggio v2 ha numeri reali; continente solo con
            almeno 1 match country→continente. */}
        {showInsights && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6"
          >
            <p className="text-[10px] font-bold tracking-[2px] uppercase text-white/40 mb-3 px-1">Il tuo viaggio su MindRoute</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<Compass className="w-4 h-4" />}
                value={String(insights.stats.destinationsExplored)}
                label={insights.stats.destinationsExplored === 1 ? "destinazione esplorata" : "destinazioni esplorate"}
              />
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                value={String(insights.stats.daysImagined)}
                label={insights.stats.daysImagined === 1 ? "giorno immaginato" : "giorni immaginati"}
              />
              {insights.stats.budgetBookableEur !== null && insights.stats.budgetBookableEur > 0 ? (
                <StatCard
                  icon={<Wallet className="w-4 h-4" />}
                  value={formatEur(insights.stats.budgetBookableEur)}
                  label="pianificati in esperienze"
                />
              ) : insights.stats.avgTripDays !== null ? (
                <StatCard
                  icon={<Wallet className="w-4 h-4" />}
                  value={`${insights.stats.avgTripDays}`}
                  label="giorni medi per viaggio"
                />
              ) : null}
              {insights.stats.topContinent ? (
                <StatCard
                  icon={<Globe className="w-4 h-4" />}
                  value={insights.stats.topContinent.label}
                  label={`${insights.stats.topContinent.count} ${insights.stats.topContinent.count === 1 ? "viaggio" : "viaggi"}`}
                />
              ) : null}
            </div>
          </motion.div>
        )}

        {/* Profilo viaggiatore + gamification */}
        {!loading && trips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 p-6 rounded-[24px]"
            style={{ background: "rgba(233,69,96,0.05)", border: "1px solid rgba(233,69,96,0.15)" }}
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-[2px] uppercase text-[#E94560] mb-3">Il tuo profilo viaggiatore</p>

                {hasTraits ? (
                  <>
                    <p className="text-white/90 font-serif italic text-lg leading-snug mb-2">{headline}</p>
                    {evolutionNarrative && (
                      <p className="text-[12px] text-[#E94560]/80 mb-5 tracking-wide">{evolutionNarrative}</p>
                    )}
                    {!evolutionNarrative && <div className="mb-3" />}
                    <div className="space-y-3 mb-4">
                      {axisKeys.map((axisKey) => {
                        const value = traitHistory.current[axisKey];
                        const labels = traitHistory.axes[axisKey as string]?.it;
                        const delta = traitHistory.delta?.[axisKey];
                        const prior = firstSnapshot ? firstSnapshot[axisKey] : null;
                        if (!labels) return null;
                        return (
                          <div key={axisKey}>
                            <div className="flex items-center justify-between text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-1">
                              <span>{labels.left}</span>
                              <span>{labels.right}</span>
                            </div>
                            <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                              {/* Pallino "prima" (semitrasparente, più piccolo) */}
                              {prior !== null && Math.abs(prior - value) >= 0.04 && (
                                <div
                                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full"
                                  style={{
                                    left: `calc(${prior * 100}% - 4px)`,
                                    background: "rgba(255,255,255,0.25)",
                                    transition: "left 0.6s ease",
                                  }}
                                  title="Primo viaggio"
                                />
                              )}
                              {/* Pallino "ora" */}
                              <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2"
                                style={{
                                  left: `calc(${value * 100}% - 6px)`,
                                  background: "#E94560",
                                  borderColor: "rgba(10,8,20,1)",
                                  transition: "left 0.6s ease",
                                }}
                                title="Ora"
                              />
                            </div>
                            {delta !== undefined && delta !== null && Math.abs(delta) >= 0.04 && (
                              <p className="text-[10px] mt-1" style={{ color: delta > 0 ? "rgba(140,220,160,0.7)" : "rgba(220,160,140,0.7)" }}>
                                {delta > 0 ? "→" : "←"} {Math.abs(delta * 100).toFixed(0)}% verso {delta > 0 ? labels.right : labels.left} dal primo viaggio
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {firstSnapshot && (
                      <div className="flex items-center gap-3 text-[10px] text-white/30 mb-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.25)" }} />
                          Primo viaggio
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full border" style={{ background: "#E94560", borderColor: "rgba(10,8,20,1)" }} />
                          Oggi
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-white/30 text-sm mb-4">Genera più itinerari per costruire il tuo profilo.</p>
                )}

                <p className="text-white/30 text-[12px]">
                  {trips.length === 1 ? "1 itinerario generato" : `${trips.length} itinerari generati`}
                  {hasTraits && traitHistory.snapshots.length < 3 && " · Servono almeno 3 viaggi per vedere l'evoluzione"}
                </p>
              </div>

              {/* Badge */}
              <div className="flex flex-col items-center gap-1 shrink-0 p-4 rounded-[16px] text-center min-w-[100px]" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 28 }}>{badge.emoji}</span>
                <span className="text-[11px] font-bold text-white/80 mt-1">{badge.label}</span>
                <span className="text-[10px] text-white/30 leading-tight max-w-[100px]">{badge.desc}</span>
              </div>
            </div>

            {/* Prossimo badge */}
            {trips.length < 10 && (() => {
              const next = BADGES.find(b => b.min > trips.length);
              if (!next) return null;
              const remaining = next.min - trips.length;
              return (
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                    <div className="h-full rounded-full" style={{ background: "#E94560", width: `${(trips.length / next.min) * 100}%`, transition: "width 1s ease" }} />
                  </div>
                  <span className="text-[11px] text-white/30 shrink-0">
                    {remaining} {remaining === 1 ? "viaggio" : "viaggi"} al badge <span className="text-white/50 font-medium">{next.emoji} {next.label}</span>
                  </span>
                </div>
              );
            })()}
          </motion.div>
        )}

        {/* CTA nuovo viaggio + (se profilo abbastanza maturo) "Genera dal profilo" */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8 flex flex-wrap items-center gap-3"
        >
          <Link href="/profiling" className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-semibold text-[14px] text-white transition-all hover:-translate-y-0.5"
            style={{ background: "#E94560", boxShadow: "0 8px 24px rgba(233,69,96,0.25)" }}>
            <Plus className="w-4 h-4" />
            {trips.length === 0 ? "Inizia il tuo primo viaggio" : "Nuovo itinerario"}
          </Link>
          {canGenerateFromProfile && (
            <button
              type="button"
              onClick={openFromProfileModal}
              className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-full font-semibold text-[14px] text-white/90 transition-all hover:-translate-y-0.5 hover:text-white"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Sparkles className="w-4 h-4 text-[#E94560]" />
              Genera dal tuo profilo
            </button>
          )}
        </motion.div>

        {/* Momenti salvati (Ondata B punto 7) — collezione orizzontale che
            taglia attraverso gli itinerari. Compare solo se l'utente ha
            salvato almeno un moment v2. */}
        {savedMoments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mb-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-serif font-bold text-white inline-flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#E94560]" fill="currentColor" />
                Momenti che ti hanno chiamato
              </h2>
              <span className="text-[11px] text-white/30">{savedMoments.length} salvat{savedMoments.length === 1 ? "o" : "i"}</span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x" style={{ scrollbarWidth: "thin" }}>
              {savedMoments.map((s) => (
                <Link
                  key={s.id}
                  href={`/itinerary/${s.itineraryId}`}
                  className="group relative shrink-0 w-[220px] rounded-[16px] overflow-hidden snap-start"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="h-28 relative overflow-hidden">
                    {s.momentSnapshot?.image_url
                      ? <img src={s.momentSnapshot.image_url} alt={s.momentSnapshot.title} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500" />
                      : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1a0814,#2d0a1a)" }} />
                    }
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeSavedMoment(s); }}
                      aria-label="Rimuovi"
                      title="Rimuovi"
                      className="absolute top-2 right-2 w-7 h-7 inline-flex items-center justify-center rounded-full text-white/80 hover:text-white"
                      style={{ background: "rgba(10,8,20,0.55)", backdropFilter: "blur(6px)" }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="p-3">
                    <div className="text-white text-[13px] font-serif leading-tight line-clamp-2">{s.momentSnapshot?.title ?? "Momento"}</div>
                    <div className="text-[10px] text-white/40 mt-1 truncate">
                      {s.momentSnapshot?.destination_name ?? "—"}
                      {s.momentSnapshot?.day_number ? ` · giorno ${s.momentSnapshot.day_number}` : ""}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Da riprendere (Ondata B punto 5) — euristica: trip più vecchi quando
            la lista è già consistente (≥6 viaggi). Frase con call emotivo. */}
        {toResume.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-10"
          >
            <h2 className="text-xl font-serif font-bold text-white mb-1 inline-flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-white/60" />
              Da riprendere
            </h2>
            <p className="text-[12px] text-white/40 mb-4">
              {toResume[0]?.destinationName?.split(",")[0] ?? "Una destinazione"} ti aveva chiamato. Vuoi tornare a guardarla?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {toResume.map((trip: any) => (
                <Link
                  key={`resume-${trip.id}`}
                  href={`/itinerary/${trip.id}`}
                  className="group flex items-center gap-3 p-3 rounded-[14px] transition-all hover:-translate-y-0.5"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                >
                  <div className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0">
                    {trip.heroImageUrl
                      ? <img src={trip.heroImageUrl} alt={trip.destinationName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1a0814,#2d0a1a)" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[13px] font-serif leading-tight line-clamp-1">{trip.destinationName}</div>
                    <div className="text-[10px] text-white/30 mt-1">
                      {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("it-IT", { month: "short", year: "numeric" }) : "—"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* I miei viaggi */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-4">I miei viaggi</h2>

          {/* Filtri (Ondata B punto 4) — appaiono solo da 4+ viaggi, sotto non
              c'è abbastanza da filtrare per giustificarli. */}
          {!loading && trips.length >= 4 && (
            <div className="mb-6 space-y-3">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Cerca destinazione…"
                  className="w-full pl-10 pr-3 py-2.5 rounded-full text-sm text-white placeholder-white/30 outline-none focus:border-white/30"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
              {/* Pill durata */}
              <div className="flex flex-wrap gap-2">
                {(["all", "short", "mid", "long"] as DurationBucket[]).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setDurationFilter(b)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                    style={{
                      background: durationFilter === b ? "#E94560" : "rgba(255,255,255,0.04)",
                      color: durationFilter === b ? "white" : "rgba(255,255,255,0.5)",
                      border: durationFilter === b ? "1px solid #E94560" : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {DURATION_LABELS[b]}
                  </button>
                ))}
              </div>
              {/* Pill continenti */}
              {availableContinents.length > 1 && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setContinentFilter(null)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                    style={{
                      background: continentFilter === null ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                      color: continentFilter === null ? "white" : "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    Tutti i continenti
                  </button>
                  {availableContinents.map(({ continent, label }) => (
                    <button
                      key={continent}
                      type="button"
                      onClick={() => setContinentFilter(continent)}
                      className="px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                      style={{
                        background: continentFilter === continent ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                        color: continentFilter === continent ? "white" : "rgba(255,255,255,0.5)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {/* Contatore + reset */}
              <div className="flex items-center gap-3 text-[11px] text-white/40">
                <span>{filteredTrips.length === trips.length
                  ? `${trips.length} ${trips.length === 1 ? "viaggio" : "viaggi"}`
                  : `${filteredTrips.length} di ${trips.length}`}</span>
                {hasActiveFilters && (
                  <button type="button" onClick={resetFilters} className="text-white/60 hover:text-white underline underline-offset-2">
                    azzera filtri
                  </button>
                )}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && trips.length === 0 && (
            <div className="text-center py-12 rounded-[20px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-white/30 text-base mb-2">Nessun itinerario ancora.</p>
              <p className="text-white/20 text-sm">Rispondi a 7 domande e scopri la tua prossima destinazione.</p>
            </div>
          )}

          {!loading && trips.length > 0 && filteredTrips.length === 0 && (
            <div className="text-center py-12 rounded-[20px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-white/30 text-base mb-3">Nessun viaggio corrisponde ai filtri.</p>
              <button type="button" onClick={resetFilters} className="text-[#E94560] text-sm hover:underline">Azzera filtri</button>
            </div>
          )}

          {!loading && filteredTrips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredTrips.map((trip: any, i: number) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="group rounded-[20px] overflow-hidden"
                  style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}
                >
                  {/* Hero image — cliccabile */}
                  <Link href={`/itinerary/${trip.id}`} className="block relative h-44 overflow-hidden">
                    {trip.heroImageUrl
                      ? <img src={trip.heroImageUrl} alt={trip.destinationName} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500" />
                      : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1a0814,#2d0a1a)" }} />
                    }
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(10,8,20,0.75),transparent)" }} />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[10px] font-bold text-white" style={{ background: "rgba(233,69,96,0.8)" }}>
                      <ExternalLink className="w-3 h-3" /> Apri
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-serif font-bold text-white text-[16px] leading-tight">{trip.destinationName}</h3>
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold text-[#E94560]" style={{ background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.2)" }}>
                        {trip.days?.length || 7} giorni
                      </span>
                    </div>

                    {trip.whyYours && (
                      <p className="text-white/35 text-[12px] italic leading-relaxed line-clamp-2 mb-4">"{trip.whyYours}"</p>
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 text-white/25 text-[11px]">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("it-IT") : "—"}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.continentLabel ?? (trip.destinationName || "").split(",")[1]?.trim() ?? trip.destinationName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {trips.length >= 2 && (
                          <Link href={`/compare?a=${trip.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold text-white/70 transition-all hover:-translate-y-0.5 hover:text-white"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                            title="Confronta con un altro viaggio"
                          >
                            <GitCompare className="w-3 h-3" />
                          </Link>
                        )}
                        <Link href={`/itinerary/${trip.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold text-white transition-all hover:-translate-y-0.5"
                          style={{ background: "rgba(233,69,96,0.15)", border: "1px solid rgba(233,69,96,0.3)" }}>
                          Riapri <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal "Genera dal profilo" (Ondata C punto 3) — 3 micro-domande:
          compagnia, durata, partenza/periodo. Il vector psicologico parte
          dall'aggregato senza far rifare il quiz. */}
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
              className="w-full max-w-md rounded-[24px] p-6 md:p-7"
              style={{ background: "#15101e", border: "1px solid rgba(255,255,255,0.08)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[2px] uppercase text-[#E94560]">
                  <Sparkles className="w-3 h-3" /> Shortcut profilo
                </div>
                <button type="button" onClick={() => !fpLoading && setShowFromProfile(false)} className="text-white/40 hover:text-white">
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
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
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
                      className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
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

              {/* Override testuale libero — gestisce le eccezioni ("stavolta
                   con amici, non famiglia") che i 4 campi sopra non possono
                   esprimere. Passato verbatim al matching engine. */}
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
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-[14px] text-white transition-all disabled:opacity-50"
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
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-[16px]"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div className="flex items-center gap-2 text-white/40 mb-1.5">{icon}</div>
      <div className="text-white text-xl font-serif font-bold leading-tight">{value}</div>
      <div className="text-[10px] text-white/40 uppercase tracking-wider mt-1 leading-tight">{label}</div>
    </motion.div>
  );
}
