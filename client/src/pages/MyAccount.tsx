import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, MapPin, Calendar, Plus, ExternalLink } from "lucide-react";

const BADGES = [
  { min: 1, max: 2, label: "Primo passo", emoji: "🌱", desc: "Hai generato il tuo primo itinerario" },
  { min: 3, max: 4, label: "Esploratore", emoji: "🧭", desc: "Tre viaggi all'attivo" },
  { min: 5, max: 9, label: "Esploratore seriale", emoji: "✈️", desc: "Cinque destinazioni esplorate" },
  { min: 10, max: 999, label: "Viaggiatore MindRoute", emoji: "🌍", desc: "Dieci itinerari generati" },
];

function getBadge(count: number) {
  return BADGES.find(b => count >= b.min && count <= b.max) || BADGES[0];
}

function extractTraits(trips: any[]): string[] {
  if (!trips.length) return [];
  const traits: string[] = [];
  const names = trips.map(t => (t.destinationName || "").toLowerCase()).join(" ");
  const whys = trips.map(t => (t.whyYours || "").toLowerCase()).join(" ");
  const all = names + " " + whys;

  if (/silenz|quiet|isola|isolat/.test(all)) traits.push("Silenzioso");
  if (/autentic|local|genuine/.test(all)) traits.push("Autentico");
  if (/avventur|trekking|wild|selvag/.test(all)) traits.push("Avventuroso");
  if (/cultur|storia|museo|storico/.test(all)) traits.push("Culturale");
  if (/romantico|coppia|intimo/.test(all)) traits.push("Romantico");
  if (/natura|montagna|forest|lago/.test(all)) traits.push("Natura");
  if (/food|cibo|gastronomia|mercato/.test(all)) traits.push("Foodie");
  if (/lento|rallentare|pace|respiro/.test(all)) traits.push("Ritmo lento");

  const regions: string[] = [];
  if (/grecia|italia|portogallo|spagna|francia|europa|albania/.test(all)) regions.push("Europa");
  if (/asia|giappone|thailandia|bali|india/.test(all)) regions.push("Asia");
  if (/america|messico|patagonia/.test(all)) regions.push("Americhe");
  if (regions.length) traits.push(...regions);

  return traits.slice(0, 5);
}

export default function MyAccount() {
  const [user, setUser] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  const badge = getBadge(trips.length);
  const traits = extractTraits(trips);

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
              <div>
                <p className="text-[10px] font-bold tracking-[2px] uppercase text-[#E94560] mb-3">Il tuo profilo viaggiatore</p>
                {traits.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {traits.map(trait => (
                      <span key={trait} className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-white/80" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        {trait}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-white/30 text-sm mb-4">Genera più itinerari per costruire il tuo profilo.</p>
                )}
                <p className="text-white/30 text-[12px]">
                  {trips.length === 1 ? "1 itinerario generato" : `${trips.length} itinerari generati`}
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

        {/* CTA nuovo viaggio */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-8"
        >
          <Link href="/profiling" className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full font-semibold text-[14px] text-white transition-all hover:-translate-y-0.5"
            style={{ background: "#E94560", boxShadow: "0 8px 24px rgba(233,69,96,0.25)" }}>
            <Plus className="w-4 h-4" />
            {trips.length === 0 ? "Inizia il tuo primo viaggio" : "Nuovo itinerario"}
          </Link>
        </motion.div>

        {/* I miei viaggi */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">I miei viaggi</h2>

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

          {!loading && trips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {trips.map((trip: any, i: number) => (
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
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {(trip.destinationName || "").split(",")[1]?.trim() || trip.destinationName}</span>
                      </div>
                      <Link href={`/itinerary/${trip.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] font-semibold text-white transition-all hover:-translate-y-0.5"
                        style={{ background: "rgba(233,69,96,0.15)", border: "1px solid rgba(233,69,96,0.3)" }}>
                        Riapri <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
