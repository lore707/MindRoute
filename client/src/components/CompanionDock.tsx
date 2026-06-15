import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, X, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { getLastOpenedItinerary } from "@/lib/last-opened";

type Msg = { role: "user" | "assistant" | "tool"; content: string };

// Routes where the companion must NOT appear: the funnel (it competes with the
// conversion task), the public/marketing surfaces, and the generation stream.
function isHiddenRoute(path: string): boolean {
  if (path === "/" || path === "/come-funziona" || path === "/profiling" || path === "/destinations" || path === "/privacy") return true;
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

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(u => setLoggedIn(!!u))
      .catch(() => setLoggedIn(false));
  }, []);

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

  return (
    <>
      {/* Launcher */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={t("companion.open")}
          className="fixed bottom-5 right-5 z-[110] w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#E94560", color: "#fff", boxShadow: "0 8px 28px rgba(233,69,96,0.45)" }}
          data-testid="companion-fab"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          className="fixed z-[120] flex flex-col overflow-hidden border shadow-2xl bottom-0 right-0 w-full h-[80vh] rounded-t-2xl sm:bottom-5 sm:right-5 sm:w-[400px] sm:h-[600px] sm:rounded-2xl"
          style={{ background: "rgba(12,14,20,0.97)", borderColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: "#E94560" }} />
              <span className="text-[14px] font-medium text-white">{t("companion.title")}</span>
            </div>
            <button onClick={() => setOpen(false)} aria-label={t("companion.close")} className="text-white/60 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-[13px] text-white/50 leading-relaxed">{t("companion.greeting")}</p>
            )}
            {messages.map((m, i) => (
              m.role === "tool" ? (
                <div key={i} className="flex justify-start">
                  <div className="flex items-center gap-1.5 text-[11.5px] text-white/45 px-1">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#E94560" }} />
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className="max-w-[85%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed whitespace-pre-wrap"
                    style={m.role === "user"
                      ? { background: "#E94560", color: "#fff", borderBottomRightRadius: 4 }
                      : { background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.92)", borderBottomLeftRadius: 4 }}
                  >
                    {m.content || (streaming && i === messages.length - 1 ? "…" : "")}
                  </div>
                </div>
              )
            ))}
          </div>

          <div className="px-3 py-3 border-t flex items-end gap-2" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
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
              className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-30"
              style={{ background: "#E94560", color: "#fff" }}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
