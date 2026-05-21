import { useEffect, useMemo, useState } from "react";
import { Link, useSearch, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, GitCompare, ChevronDown, MapPin, Calendar, Clock, Zap } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────
// Compare — side-by-side di due itinerari dell'utente (Ondata C punto 6).
// URL: /compare?a=ID1&b=ID2. Se solo a è presente, mostra picker per b.
// Tutto client-side: fetcha /api/my-trips per la lista, poi i due itinerari
// per intero da /api/itinerary/:id.
// ─────────────────────────────────────────────────────────────────────────

type Trip = {
  id: number;
  destinationName?: string;
  days?: any[];
  heroImageUrl?: string;
  continentLabel?: string | null;
  createdAt?: string;
  whyYours?: string;
  highlights?: string[];
  budgetSummary?: string;
  schemaVersion?: number;
  tripMeta?: { total_cost_bookable?: number; total_cost_onsite_estimate?: number; highlights_v2?: Array<{ name: string; description: string }> } | null;
};

function parseSearchParam(search: string, key: string): string | null {
  const params = new URLSearchParams(search);
  return params.get(key);
}

function fmtEur(n: number): string {
  return `€${Math.round(n).toLocaleString("it-IT")}`;
}

// Estrae un costo numerico totale: v2 ha tripMeta.total_cost_bookable, v1 no.
function totalCost(trip: Trip | null): { value: number; label: string } | null {
  if (!trip) return null;
  const meta = trip.tripMeta;
  if (meta && typeof meta.total_cost_bookable === "number") {
    const total = meta.total_cost_bookable + (meta.total_cost_onsite_estimate ?? 0);
    return { value: total, label: fmtEur(total) };
  }
  return null;
}

// Energia "stimata" sommando energy_level dei moments v2 (1/2/3). Per v1 → null.
function energyScore(trip: Trip | null): number | null {
  if (!trip || !Array.isArray(trip.days)) return null;
  if (trip.schemaVersion !== 2) return null;
  const weights: Record<string, number> = { low: 1, medium: 2, high: 3 };
  let sum = 0, count = 0;
  for (const d of trip.days as any[]) {
    if (typeof d?.energy_level === "string" && weights[d.energy_level]) {
      sum += weights[d.energy_level];
      count++;
    }
  }
  if (count === 0) return null;
  return Math.round((sum / count) * 10) / 10;
}

function dayTitles(trip: Trip | null): Array<{ n: number; title: string; arc?: string }> {
  if (!trip || !Array.isArray(trip.days)) return [];
  return (trip.days as any[]).map((d, i) => ({
    n: d?.day_number ?? d?.dayNumber ?? i + 1,
    title: d?.title_evocative ?? d?.title ?? `Giorno ${i + 1}`,
    arc: d?.arc,
  }));
}

function highlightList(trip: Trip | null): string[] {
  if (!trip) return [];
  if (trip.schemaVersion === 2 && Array.isArray(trip.tripMeta?.highlights_v2)) {
    return trip.tripMeta!.highlights_v2!.map(h => h.name).slice(0, 6);
  }
  if (Array.isArray(trip.highlights)) return trip.highlights.slice(0, 6);
  return [];
}

export default function Compare() {
  const search = useSearch();
  const [, setLocation] = useLocation();
  const initialA = parseSearchParam(search, "a");
  const initialB = parseSearchParam(search, "b");

  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [aId, setAId] = useState<number | null>(initialA ? parseInt(initialA, 10) : null);
  const [bId, setBId] = useState<number | null>(initialB ? parseInt(initialB, 10) : null);
  const [aTrip, setATrip] = useState<Trip | null>(null);
  const [bTrip, setBTrip] = useState<Trip | null>(null);

  useEffect(() => {
    fetch("/api/my-trips")
      .then(r => r.ok ? r.json() : [])
      .then((rows: Trip[]) => setTrips(Array.isArray(rows) ? rows : []))
      .catch(() => setTrips([]))
      .finally(() => setTripsLoading(false));
  }, []);

  // Sync degli ID nella URL così il refresh mantiene lo stato.
  useEffect(() => {
    const p = new URLSearchParams();
    if (aId) p.set("a", String(aId));
    if (bId) p.set("b", String(bId));
    const qs = p.toString();
    const newPath = qs ? `/compare?${qs}` : "/compare";
    if (window.location.pathname + window.location.search !== newPath) {
      window.history.replaceState(null, "", newPath);
    }
  }, [aId, bId]);

  // Fetch dettaglio per A e B.
  useEffect(() => {
    if (!aId) { setATrip(null); return; }
    fetch(`/api/itinerary/${aId}`).then(r => r.ok ? r.json() : null).then(setATrip).catch(() => setATrip(null));
  }, [aId]);
  useEffect(() => {
    if (!bId) { setBTrip(null); return; }
    fetch(`/api/itinerary/${bId}`).then(r => r.ok ? r.json() : null).then(setBTrip).catch(() => setBTrip(null));
  }, [bId]);

  const eligibleB = useMemo(() => trips.filter(t => t.id !== aId), [trips, aId]);
  const eligibleA = useMemo(() => trips.filter(t => t.id !== bId), [trips, bId]);

  return (
    <div className="min-h-screen pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-12" style={{ background: "#0a0814" }}>
      <div className="max-w-6xl mx-auto">
        {/* Back */}
        <div className="flex items-center gap-4 mb-6 md:mb-8">
          <Link href="/my-account" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors min-h-[44px]">
            <ArrowLeft className="w-4 h-4" /> Account
          </Link>
        </div>

        <div className="mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-[2px] uppercase text-[#E94560] mb-2">
            <GitCompare className="w-3 h-3" /> Confronta
          </div>
          <h1 className="text-[22px] sm:text-2xl md:text-3xl font-serif font-bold text-white leading-tight">Due viaggi fianco a fianco</h1>
          <p className="text-white/40 text-[13px] sm:text-sm mt-1.5 leading-relaxed">Costi, durata, energia, momenti chiave — per decidere senza pensarci troppo.</p>
        </div>

        {tripsLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!tripsLoading && trips.length < 2 && (
          <div className="text-center py-12 rounded-[20px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-white/40 mb-2">Servono almeno 2 viaggi per confrontare.</p>
            <Link href="/profiling" className="text-[#E94560] text-sm hover:underline">Generane uno nuovo</Link>
          </div>
        )}

        {!tripsLoading && trips.length >= 2 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <CompareColumn
              side="A"
              trip={aTrip}
              tripId={aId}
              options={eligibleA}
              onChange={setAId}
            />
            <CompareColumn
              side="B"
              trip={bTrip}
              tripId={bId}
              options={eligibleB}
              onChange={setBId}
            />
          </div>
        )}

        {/* Footer CTA — apri entrambi */}
        {aTrip && bTrip && (
          <div className="mt-8 md:mt-10 flex items-center justify-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => { setAId(bId); setBId(aId); }}
              className="px-4 py-2.5 min-h-[44px] rounded-full text-[12px] font-semibold text-white/70 hover:text-white transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              ⇄ Inverti
            </button>
            <button
              type="button"
              onClick={() => setLocation("/my-account")}
              className="px-4 py-2.5 min-h-[44px] rounded-full text-[12px] font-semibold text-white/70 hover:text-white transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Torna all'account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CompareColumn({
  side, trip, tripId, options, onChange,
}: {
  side: "A" | "B";
  trip: Trip | null;
  tripId: number | null;
  options: Trip[];
  onChange: (id: number | null) => void;
}) {
  const cost = totalCost(trip);
  const energy = energyScore(trip);
  const days = dayTitles(trip);
  const highlights = highlightList(trip);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[20px] overflow-hidden"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Picker */}
      <div className="p-3 sm:p-4 border-b border-white/5 flex items-center gap-3">
        <span className="w-8 h-8 inline-flex items-center justify-center rounded-full text-[11px] font-bold text-white shrink-0" style={{ background: "#E94560" }}>{side}</span>
        <div className="relative flex-1 min-w-0">
          <select
            value={tripId ?? ""}
            onChange={(e) => onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="w-full appearance-none pl-3 pr-9 py-2.5 min-h-[44px] rounded-xl text-sm text-white outline-none cursor-pointer truncate"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }}
          >
            <option value="">Scegli un viaggio…</option>
            {options.map(t => (
              <option key={t.id} value={t.id}>{t.destinationName}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
        </div>
      </div>

      {!trip && (
        <div className="p-8 text-center text-white/30 text-sm">Seleziona un viaggio per il lato {side}.</div>
      )}

      {trip && (
        <>
          {/* Hero */}
          <Link href={`/itinerary/${trip.id}`} className="block relative h-40 overflow-hidden">
            {trip.heroImageUrl
              ? <img src={trip.heroImageUrl} alt={trip.destinationName} className="w-full h-full object-cover" />
              : <div className="w-full h-full" style={{ background: "linear-gradient(135deg,#1a0814,#2d0a1a)" }} />
            }
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top,rgba(10,8,20,0.85),transparent 60%)" }} />
            <div className="absolute bottom-3 left-4 right-4">
              <h3 className="text-white font-serif font-bold text-lg leading-tight line-clamp-1">{trip.destinationName}</h3>
              {trip.continentLabel && <p className="text-[11px] text-white/60 mt-0.5">{trip.continentLabel}</p>}
            </div>
          </Link>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
            <StatTile icon={<Calendar className="w-3 h-3" />} value={String(trip.days?.length ?? 0)} label="giorni" />
            <StatTile icon={<Clock className="w-3 h-3" />} value={cost ? cost.label : "—"} label="costo" muted={!cost} />
            <StatTile icon={<Zap className="w-3 h-3" />} value={energy !== null ? `${energy}/3` : "—"} label="energia" muted={energy === null} />
          </div>

          {/* whyYours / manifesto */}
          {trip.whyYours && (
            <div className="p-4 border-b border-white/5">
              <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-1.5">Perché era per te</p>
              <p className="text-white/80 font-serif italic text-[13px] leading-snug line-clamp-3">"{trip.whyYours}"</p>
            </div>
          )}

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="p-4 border-b border-white/5">
              <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Highlights</p>
              <ul className="space-y-1.5">
                {highlights.map((h, i) => (
                  <li key={i} className="text-white/80 text-[13px] leading-snug flex gap-2">
                    <span className="text-[#E94560] shrink-0">·</span>
                    <span className="line-clamp-1">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Day arc */}
          {days.length > 0 && (
            <div className="p-4">
              <p className="text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Arco giornaliero</p>
              <ul className="space-y-1.5">
                {days.map(d => (
                  <li key={d.n} className="flex gap-2 items-baseline">
                    <span className="text-[10px] font-bold text-white/40 w-6 shrink-0">G{d.n}</span>
                    <span className="text-white/70 text-[12px] leading-snug line-clamp-1">{d.title}</span>
                  </li>
                ))}
              </ul>
              <Link href={`/itinerary/${trip.id}`} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2.5 min-h-[44px] rounded-full text-[#E94560] text-[12px] font-semibold border border-[#E94560]/30 hover:bg-[#E94560]/10 transition-all">
                Apri itinerario <MapPin className="w-3 h-3" />
              </Link>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

function StatTile({ icon, value, label, muted }: { icon: React.ReactNode; value: string; label: string; muted?: boolean }) {
  return (
    <div className="p-2.5 sm:p-3 text-center min-w-0">
      <div className={"inline-flex items-center justify-center mb-1 " + (muted ? "text-white/20" : "text-white/40")}>{icon}</div>
      <div className={"text-sm sm:text-base font-serif font-bold leading-tight truncate " + (muted ? "text-white/30" : "text-white")}>{value}</div>
      <div className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5 truncate">{label}</div>
    </div>
  );
}
