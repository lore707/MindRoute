import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, LogOut, MapPin, Calendar, Clock } from "lucide-react";

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
      .then(data => setTrips(data))
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 md:px-12" style={{ background: "#0a0814" }}>
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white text-sm transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        </div>

        {/* Profilo */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-5 mb-12 p-6 rounded-[24px]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {user.avatar
              ? <img src={user.avatar} className="w-16 h-16 rounded-full border-2 border-[#E94560]/30" />
              : <div className="w-16 h-16 rounded-full bg-[#E94560] flex items-center justify-center text-white text-2xl font-bold">{user.name?.[0]}</div>
            }
            <div className="flex-1">
              <h1 className="text-xl font-serif font-bold text-white">{user.name}</h1>
              <p className="text-white/40 text-sm">{user.email}</p>
            </div>
            
              href="/auth/logout"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all"
            >
              <LogOut className="w-4 h-4" /> Esci
            </a>
          </motion.div>
        )}

        {/* I miei viaggi */}
        <div>
          <h2 className="text-2xl font-serif font-bold text-white mb-6">I miei viaggi</h2>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && trips.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/30 text-lg mb-6">Non hai ancora generato nessun itinerario.</p>
              <Link
                href="/profiling"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#E94560] text-white font-bold hover:bg-[#d63050] transition-all"
              >
                Inizia il tuo viaggio
              </Link>
            </div>
          )}

          {!loading && trips.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {trips.map((trip: any) => (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-[20px] overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-300"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <Link href={`/itinerary/${trip.id}`}>
                    {/* Hero image */}
                    <div className="relative h-40 overflow-hidden">
                      {trip.heroImageUrl
                        ? <img src={trip.heroImageUrl} alt={trip.destinationName} className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500" />
                        : <div className="w-full h-full" style={{ background: "linear-gradient(135deg, #1a0814, #2d0a1a)" }} />
                      }
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(10,8,20,0.8), transparent)" }} />
                    </div>

                    {/* Info */}
                    <div className="p-5" style={{ background: "rgba(255,255,255,0.04)" }}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="font-serif font-bold text-white text-lg leading-tight">{trip.destinationName}</h3>
                        <span className="shrink-0 px-2 py-1 rounded-full text-[10px] font-bold text-[#E94560]" style={{ background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.2)" }}>
                          {trip.days?.length || 7} giorni
                        </span>
                      </div>
                      {trip.whyYours && (
                        <p className="text-white/40 text-[12px] italic leading-relaxed line-clamp-2 mb-3">"{trip.whyYours}"</p>
                      )}
                      <div className="flex items-center gap-3 text-white/30 text-[11px]">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {trip.createdAt ? new Date(trip.createdAt).toLocaleDateString("it-IT") : "—"}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {trip.destinationName}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
