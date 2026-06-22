import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, X, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { fetchMe } from "@/hooks/use-auth";
import { getLastOpenedItinerary } from "@/lib/last-opened";

type Msg = { role: "user" | "assistant" | "tool"; content: string };

// Posizione del launcher trascinabile, persistita fra sessioni.
const LAUNCH_POS_KEY = "mindroute-companion-pos";
type Pos = { x: number; y: number };

// Routes where the companion must NOT appear: the funnel (it competes with the
// conversion task), the public/marketing surfaces, and the generation stream.
function isHiddenRoute(path: string): boolean {
  // NB: "/" non è più nascosto — per l'utente loggato è la dashboard (e gli
  // anonimi sono già esclusi da `!loggedIn`). Restano nascoste le superfici del
  // funnel/marketing e lo stream di generazione.
  if (path === "/come-funziona" || path === "/profiling" || path === "/destinations" || path === "/privacy") return true;
  if (path.startsWith("/itinerary/stream")) return true;
  if (path.startsWith("/i/")) return true; // public shared view
  return false;
}

// Context resolver: the trip the companion talks about. On an itinerary page
// it's that trip; elsewhere it falls back to the last one the user opened.
function resolveItineraryId(path: string): number | null {
  const m = path.match(/^\/itinerary\/(\d+)$/);
  if (m) return parseInt(m[1], 10);
  return getLastOpenedItinerary();
}

export function CompanionDock() {
  const [location] = useLocation();
  const { t, lang } = useI18n();
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [itineraryId, setItineraryId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [hydrated, setHydrated] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // Launcher trascinabile: pos=null → resta nell'angolo di default (CSS).
  // Appena trascinato passa a coordinate assolute (left/top) clampate al viewport.
  const [pos, setPos] = useState<Pos | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; moved: boolean } | null>(null);

  useEffect(() => {
    fetchMe().then(u => setLoggedIn(!!u));
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAUNCH_POS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (typeof p?.x === "number" && typeof p?.y === "number") setPos(p);
      }
    } catch { /* ignore */ }
  }, []);

  function clampPos(x: number, y: number): Pos {
    const el = launcherRef.current;
    const w = el?.offsetWidth ?? 56;
    const h = el?.offsetHeight ?? 56;
    const maxX = window.innerWidth - w - 8;
    const maxY = window.innerHeight - h - 8;
    return { x: Math.max(8, Math.min(x, maxX)), y: Math.max(8, Math.min(y, maxY)) };
  }

  function onLauncherPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: rect.left, baseY: rect.top, moved: false };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }
  function onLauncherPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 5) return; // soglia: distingue tap da drag
    d.moved = true;
    setPos(clampPos(d.baseX + dx, d.baseY + dy));
  }
  function onLauncherPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    const d = dragRef.current;
    dragRef.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    if (!d) return;
    if (d.moved) {
      // persisti l'ultima posizione clampata
      setPos(prev => {
        if (prev) { try { localStorage.setItem(LAUNCH_POS_KEY, JSON.stringify(prev)); } catch { /* ignore */ } }
        return prev;
      });
    } else {
      setOpen(true); // tap senza trascinamento = apri
    }
  }

  // Re-resolve the trip whenever the route changes.
  useEffect(() => {
    setItineraryId(resolveItineraryId(location));
  }, [location]);

  // Hydrate the thread the first time we open it for a given trip.
  useEffect(() => {
    if (!open || itineraryId == null || hydrated === itineraryId) return;
    fetch(`/api/itinerary/${itineraryId}/chat`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.messages) setMessages(data.messages);
        setHydrated(itineraryId);
      })
      .catch(() => setHydrated(itineraryId));
  }, [open, itineraryId, hydrated]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  // Best-effort live position so the companion can ground "near me" suggestions.
  // Requested only when the panel opens; silent on denial — find_nearby just
  // returns nothing and the model falls back to the itinerary.
  useEffect(() => {
    if (!open || coordsRef.current || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { coordsRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || streaming || itineraryId == null) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, lang, coords: coordsRef.current }),
      });
      const reader = res.body?.getReader();
      if (!reader) { setStreaming(false); return; }
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (line.startsWith("event: ")) currentEvent = line.slice(7).trim();
          else if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (currentEvent === "chunk") {
                setMessages(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: next[next.length - 1].content + data.text };
                  return next;
                });
              } else if (currentEvent === "tool" && data.label) {
                // Insert a small status line just before the trailing assistant bubble.
                setMessages(prev => {
                  const next = [...prev];
                  next.splice(next.length - 1, 0, { role: "tool", content: data.label });
                  return next;
                });
              }
            } catch {}
          }
        }
      }
    } catch {
      // surface a soft failure in the last bubble
      setMessages(prev => {
        const next = [...prev];
        if (next.length && next[next.length - 1].role === "assistant" && !next[next.length - 1].content) {
          next[next.length - 1] = { role: "assistant", content: t("companion.error") };
        }
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (!loggedIn || itineraryId == null || isHiddenRoute(location)) return null;

  const SERIF = "'Playfair Display', Georgia, serif";

  return (
    <>
      {/* Launcher — pill con glow accento; etichetta su desktop, icona su mobile */}
      {!open && (
        <button
          ref={launcherRef}
          onPointerDown={onLauncherPointerDown}
          onPointerMove={onLauncherPointerMove}
          onPointerUp={onLauncherPointerUp}
          aria-label={t("companion.open")}
          className="group fixed bottom-5 right-5 z-[110] flex items-center gap-2.5 rounded-full transition-[transform,box-shadow] hover:-translate-y-0.5 active:scale-95 h-14 w-14 sm:w-auto sm:pl-4 sm:pr-5 justify-center cursor-grab active:cursor-grabbing touch-none select-none"
          style={{
            background: "radial-gradient(circle at 35% 30%, #ff5d76, #E94560 48%, #b42a40)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: "0 14px 38px -8px rgba(233,69,96,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
            touchAction: "none",
            ...(pos ? { left: pos.x, top: pos.y, right: "auto", bottom: "auto" } : {}),
          }}
          data-testid="companion-fab"
        >
          <span className="relative flex items-center justify-center w-7 h-7 shrink-0">
            <span className="absolute inset-0 rounded-full opacity-60 animate-ping" style={{ background: "rgba(255,255,255,0.35)" }} />
            <MessageCircle className="relative w-[22px] h-[22px]" />
          </span>
          <span className="hidden sm:block text-[14px] font-medium pr-0.5" style={{ fontFamily: SERIF, fontStyle: "italic" }}>
            {t("companion.title")}
          </span>
        </button>
      )}

      {/* Panel — palette cinematica vinaccia/oro, allineata alla dashboard */}
      {open && (
        <div
          className="fixed z-[120] flex flex-col overflow-hidden shadow-2xl bottom-0 right-0 w-full h-[82vh] rounded-t-[22px] sm:bottom-5 sm:right-5 sm:w-[404px] sm:h-[600px] sm:rounded-[22px]"
          style={{
            background: "linear-gradient(180deg, rgba(26,14,26,0.98), rgba(13,7,13,0.99))",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(22px)",
            boxShadow: "0 40px 90px -30px rgba(0,0,0,0.7)",
          }}
        >
          {/* hairline accento in cima */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(to right, transparent, #E94560, transparent)" }} />

          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2.5">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping" style={{ background: "#E94560" }} />
                <span className="relative inline-flex rounded-full w-2.5 h-2.5" style={{ background: "#E94560", boxShadow: "0 0 10px #E94560" }} />
              </span>
              <span className="text-[17px] text-white" style={{ fontFamily: SERIF, fontStyle: "italic" }}>{t("companion.title")}</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("companion.close")} className="flex items-center justify-center w-8 h-8 rounded-full text-white/55 hover:text-white transition-colors" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-[14px] text-white/60 leading-relaxed px-1" style={{ fontFamily: SERIF, fontStyle: "italic" }}>{t("companion.greeting")}</p>
            )}
            {messages.map((m, i) => (
              m.role === "tool" ? (
                <div key={i} className="flex justify-start">
                  <div className="flex items-center gap-1.5 text-[11.5px] px-1" style={{ color: "rgba(212,168,83,0.85)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#D4A853", boxShadow: "0 0 7px #D4A853" }} />
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap"
                    style={m.role === "user"
                      ? { background: "linear-gradient(135deg, #E94560, #c4324c)", color: "#fff", borderBottomRightRadius: 5, boxShadow: "0 8px 22px -10px rgba(233,69,96,0.7)" }
                      : { background: "rgba(255,255,255,0.055)", color: "rgba(251,245,240,0.92)", border: "1px solid rgba(255,255,255,0.07)", borderBottomLeftRadius: 5 }}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                  </div>
                </div>
              )
            ))}
          </div>

          <div className="px-3.5 py-3.5 border-t" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="flex items-end gap-2 rounded-2xl px-2 py-1.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={t("companion.placeholder")}
                rows={1}
                className="flex-1 resize-none bg-transparent text-white text-[14px] placeholder:text-white/35 outline-none max-h-28 px-2 py-2"
              />
              <button
                onClick={send}
                disabled={streaming || !input.trim()}
                aria-label={t("companion.send")}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30 hover:brightness-110 shrink-0"
                style={{ background: "#E94560", color: "#fff", boxShadow: "0 6px 18px -6px rgba(233,69,96,0.7)" }}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
