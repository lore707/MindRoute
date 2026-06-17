import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useLocation } from "wouter";
import { setFlow } from "@/lib/flow-storage";

interface FromProfileModalProps {
  open: boolean;
  onClose: () => void;
  snapshotCount: number;
}

const COMPANIONS: Array<{ v: string; l: string }> = [
  { v: "solo", l: "Solo/a" },
  { v: "couple", l: "In coppia" },
  { v: "friends", l: "Amici" },
  { v: "family", l: "Famiglia" },
];

const BUDGETS: Array<{ v: string; l: string }> = [
  { v: "basso", l: "Basso" },
  { v: "medio", l: "Medio" },
  { v: "alto", l: "Alto" },
  { v: "unlimited", l: "Senza limite" },
];

const OVERRIDE_EXAMPLES = [
  "stavolta con amici",
  "budget alto",
  "no Europa",
  "weekend lungo",
  "qualcosa di diverso dal solito",
];

export function FromProfileModal({ open, onClose, snapshotCount }: FromProfileModalProps) {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);
  const [companions, setCompanions] = useState("couple");
  const [departure, setDeparture] = useState("");
  const [budget, setBudget] = useState("medio");
  const [leaveDate, setLeaveDate] = useState("");
  const [contextOverride, setContextOverride] = useState("");
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  useEffect(() => {
    if (!open || defaultsLoaded) return;
    (async () => {
      try {
        const r = await fetch("/api/profiling/defaults");
        if (r.ok) {
          const d = await r.json();
          if (typeof d.days === "number") setDays(d.days);
          if (typeof d.companions === "string") setCompanions(d.companions);
          if (typeof d.departure === "string") setDeparture(d.departure);
          if (typeof d.budget === "string") setBudget(d.budget);
          if (typeof d.leaveDate === "string") setLeaveDate(d.leaveDate);
        }
      } catch {
        // best-effort
      } finally {
        setDefaultsLoaded(true);
      }
    })();
  }, [open, defaultsLoaded]);

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/profiling/from-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          days,
          leaveDate: leaveDate || new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10),
          departure: departure || "Italia",
          budget,
          companions,
          contextOverride: contextOverride.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({ message: "Errore" }));
        throw new Error(j.message ?? "Errore");
      }
      // Seed sessionStorage with the fresh destinations + input, exactly like the
      // quiz flow — otherwise Destinations reads stale/empty data and generation
      // fails or targets the wrong destination.
      const data = await res.json();
      if (Array.isArray(data?.destinations)) {
        setFlow("mind_destinations", JSON.stringify(data.destinations));
      }
      if (data?.input) {
        setFlow("mind_profiling_input", JSON.stringify(data.input));
      }
      onClose();
      setLocation("/destinations");
    } catch (e: any) {
      setError(e?.message ?? "Errore generico");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(10,8,20,0.78)", backdropFilter: "blur(10px)" }}
          onClick={() => !loading && onClose()}
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
              <button type="button" onClick={() => !loading && onClose()} aria-label="Chiudi" className="flex items-center justify-center w-9 h-9 -mr-2 -mt-2 rounded-full text-white/40 hover:text-white hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-serif text-xl text-white leading-tight mb-2">Genera dal tuo profilo</h3>
            <p className="text-[12px] text-white/50 leading-relaxed mb-4">
              Salti il quiz: partiamo dal tuo profilo aggregato sui {snapshotCount} viaggi precedenti. Abbiamo già riempito i campi sotto dai tuoi pattern — modifica solo se serve.
            </p>

            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Compagnia</label>
              <div className="flex flex-wrap gap-2">
                {COMPANIONS.map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setCompanions(opt.v)}
                    className="px-3.5 py-2 min-h-[40px] rounded-full text-[12px] font-semibold transition-all"
                    style={{
                      background: companions === opt.v ? "#E94560" : "rgba(255,255,255,0.04)",
                      color: companions === opt.v ? "white" : "rgba(255,255,255,0.6)",
                      border: companions === opt.v ? "1px solid #E94560" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">
                Durata · <span className="text-white/70">{days} giorni</span>
              </label>
              <input
                type="range" min={2} max={14} value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="w-full accent-[#E94560]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Parti da</label>
                <input
                  type="text" value={departure} onChange={(e) => setDeparture(e.target.value)}
                  placeholder="Milano, Roma…"
                  className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/30 outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Quando</label>
                <input
                  type="date" value={leaveDate} onChange={(e) => setLeaveDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", colorScheme: "dark" }}
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-bold tracking-[1.5px] uppercase text-white/40 mb-2">Budget</label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setBudget(opt.v)}
                    className="px-3.5 py-2 min-h-[40px] rounded-full text-[12px] font-semibold transition-all"
                    style={{
                      background: budget === opt.v ? "#E94560" : "rgba(255,255,255,0.04)",
                      color: budget === opt.v ? "white" : "rgba(255,255,255,0.6)",
                      border: budget === opt.v ? "1px solid #E94560" : "1px solid rgba(255,255,255,0.1)",
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
                value={contextOverride}
                onChange={(e) => setContextOverride(e.target.value.slice(0, 300))}
                placeholder="Es. stavolta con amici, weekend lungo, no Europa…"
                rows={2}
                className="w-full px-3 py-2 rounded-xl text-sm text-white placeholder-white/30 outline-none resize-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {OVERRIDE_EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setContextOverride(ex)}
                    className="px-2.5 py-1 rounded-full text-[10.5px] text-white/55 hover:text-white hover:bg-white/[0.06] transition-colors"
                    style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <div className="text-[10px] text-white/30 mt-1.5 text-right">{contextOverride.length}/300</div>
            </div>

            {error && <p className="text-[12px] text-[#E94560] mb-3">{error}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-full font-semibold text-[14px] text-white transition-all disabled:opacity-50"
                style={{ background: "#E94560", boxShadow: "0 8px 24px rgba(233,69,96,0.25)" }}
              >
                {loading ? (
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
  );
}
