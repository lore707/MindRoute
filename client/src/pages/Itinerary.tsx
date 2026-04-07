import { useState, useEffect, useRef } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useItinerary, useMapPointsPolling } from "@/hooks/use-profiling";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Wallet, Briefcase,
  ChevronDown, Share2, Printer, Clock, Compass, Sun,
  ExternalLink, Plane, Hotel, Ticket, Utensils, Star, MapPin,
  Flame, Calendar, Wind, CheckSquare, Square, Package
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import html2pdf from "html2pdf.js";

// ── URL BUILDER ──────────────────────────────────────────────────────────────
function buildAffiliateUrls(
  destinationName: string,
  profilingInput: any,
  region: string,
  topLinks: Record<string, string>
): Record<string, string> {
  const dest = destinationName.split(",")[0].trim();
  const destEncoded = encodeURIComponent(destinationName);
  const destShort = encodeURIComponent(dest);

  // Parse dates
  const leaveDate = profilingInput?.leaveDate ?? "";
  const days = profilingInput?.days ?? 7;
  const companions = profilingInput?.companions ?? "solo";
  const departure = profilingInput?.departure ?? "";

  // Adults count
  const adults = companions === "couple" ? 2 : companions === "friends" ? 3 : companions === "family" ? 4 : 1;

  // Date parsing — leaveDate può essere "Giugno, Luglio" o "2025-06-14" o "Spring"
  let checkinParam = "";
  let checkoutParam = "";
  let skyscannerDate = "";

  const exactDateMatch = leaveDate.match(/(\d{4}-\d{2}-\d{2})/);
  if (exactDateMatch) {
    const checkin = new Date(exactDateMatch[1]);
    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + days);
    checkinParam = checkin.toISOString().split("T")[0];
    checkoutParam = checkout.toISOString().split("T")[0];
    skyscannerDate = checkin.toISOString().split("T")[0].replace(/-/g, "");
  }

  const departureIATA = (() => {
    const d = (departure || "").toLowerCase();
    if (d.includes("milano") || d.includes("milan") || d.includes("mxp") || d.includes("linate")) return "MXP";
    if (d.includes("roma") || d.includes("rome") || d.includes("fco")) return "FCO";
    if (d.includes("napoli") || d.includes("naples")) return "NAP";
    if (d.includes("torino") || d.includes("turin")) return "TRN";
    if (d.includes("venezia") || d.includes("venice")) return "VCE";
    if (d.includes("bologna")) return "BLQ";
    if (d.includes("firenze") || d.includes("florence")) return "FLR";
    if (d.includes("palermo")) return "PMO";
    if (d.includes("catania")) return "CTA";
    return "MXP";
  })();

  const result: Record<string, string> = {};

  // Skyscanner con date precompilate
  const skyBase = skyscannerDate
    ? `https://www.skyscanner.it/trasporto/voli/${departureIATA}/${destShort}/${skyscannerDate}/?adults=${adults}&currency=EUR`
    : `https://www.skyscanner.it/trasporto/voli/${departureIATA}/${destShort}/?adults=${adults}&currency=EUR`;
  result.skyscanner = topLinks.skyscanner ?? skyBase;

  // Booking con date
  const bookingBase = checkinParam
    ? `https://www.booking.com/searchresults.it.html?ss=${destEncoded}&checkin=${checkinParam}&checkout=${checkoutParam}&no_rooms=1&group_adults=${adults}&aid=304142`
    : `https://www.booking.com/searchresults.it.html?ss=${destEncoded}&no_rooms=1&group_adults=${adults}&aid=304142`;
  result.booking = topLinks.booking_hotel ?? topLinks.booking_search ?? bookingBase;

  // GetYourGuide
  result.getyourguide = topLinks.getyourguide_1
    ?? `https://www.getyourguide.it/s/?q=${destEncoded}&partner_id=0BCSNBX8`;

  // TheFork
  result.thefork = topLinks.thefork
    ?? `https://www.thefork.it/cerca/?cityName=${destEncoded}`;

  // TripAdvisor
  result.tripadvisor = topLinks.tripadvisor
    ?? `https://www.tripadvisor.it/Search?q=${destEncoded}`;

  // Region-specific
  if (region === "mediterranean") {
    result.ferry = topLinks.ferryhopper
      ?? `https://www.ferryhopper.com/it#/?departure=${departureIATA}&arrival=${destShort}`;
  }
  if (["asia", "india"].includes(region)) {
    result.klook = topLinks.klook ?? `https://www.klook.com/activity/list/?destination=${destEncoded}`;
    result.agoda = topLinks.agoda ?? `https://www.agoda.com/search?city=${destEncoded}&adults=${adults}`;
  }
  if (["latam", "africa", "northamerica", "oceania"].includes(region)) {
    result.viator = topLinks.viator ?? `https://www.viator.com/search/${destEncoded}`;
    result.rentalcars = topLinks.rentalcars ?? `https://www.rentalcars.com/?city=${destEncoded}`;
  }

  return result;
}

// ── REGION DETECT ────────────────────────────────────────────────────────────
function detectRegion(name: string): string {
  const n = name.toLowerCase();
  if (/grecia|greece|creta|crete|cipro|cyprus|malta|croazia|croatia|montenegro|albania|turchia|turkey/.test(n)) return "mediterranean";
  if (/india|mumbai|delhi|bangalore|chennai|kolkata|jaipur|goa/.test(n)) return "india";
  if (/giappone|japan|cina|china|corea|korea|thailand|tailandia|vietnam|indonesia|bali|cambogia|cambodia|laos|myanmar|malesia|malaysia|singapore|filippine|philippines|sri lanka/.test(n)) return "asia";
  if (/messico|mexico|colombia|peru|perù|brasile|brazil|argentina|cile|chile|ecuador|bolivia|venezuela|costa rica|panama|guatemala|cuba|dominicana/.test(n)) return "latam";
  if (/marocco|morocco|egitto|egypt|kenya|tanzania|sudafrica|south africa|ghana|senegal|etiopia|ethiopia|nigeria|tunisia|algeria/.test(n)) return "africa";
  if (/stati uniti|usa|canada|new york|los angeles|chicago|san francisco|miami|las vegas|toronto|vancouver|montreal|north america/.test(n)) return "northamerica";
  if (/australia|nuova zelanda|new zealand|fiji|sydney|melbourne|auckland|oceania/.test(n)) return "oceania";
  return "europe";
}

// ── CHECKLIST ────────────────────────────────────────────────────────────────
type ChecklistItem = { id: string; label: string; checked: boolean };

function useChecklist(itineraryId: number) {
  const storageKey = `mindroute_checklist_${itineraryId}`;
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setItems(JSON.parse(saved)); return; } catch {}
    }
    setItems([
      { id: "flight", label: "Volo prenotato", checked: false },
      { id: "hotel", label: "Hotel prenotato", checked: false },
      { id: "experience", label: "Esperienza principale prenotata", checked: false },
      { id: "restaurant", label: "Ristorante primo giorno prenotato", checked: false },
      { id: "transfer", label: "Transfer/traghetto prenotato", checked: false },
    ]);
  }, [itineraryId]);

  const toggle = (id: string) => {
    setItems(prev => {
      const next = prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  };

  const checkedCount = items.filter(i => i.checked).length;
  return { items, toggle, checkedCount, total: items.length };
}

// ── BOOK TAB ─────────────────────────────────────────────────────────────────
function BookTab({
  urls, region, destinationName, profilingInput, itineraryId
}: {
  urls: Record<string, string>;
  region: string;
  destinationName: string;
  profilingInput: any;
  itineraryId: number;
}) {
  const { items, toggle, checkedCount, total } = useChecklist(itineraryId);
  const dest = destinationName.split(",")[0].trim();
  const companions = profilingInput?.companions ?? "solo";
  const leaveDate = profilingInput?.leaveDate ?? "";
  const days = profilingInput?.days ?? 7;

  const hasDate = !!(profilingInput?.leaveDate?.match(/\d{4}-\d{2}-\d{2}/));

  const sections = [
    {
      label: "Voli",
      emoji: "✈️",
      links: [
        { key: "skyscanner", label: `Cerca voli → ${dest}${hasDate ? " · date preimpostate" : ""}`, url: urls.skyscanner, color: "rgba(14,165,233,0.15)", border: "rgba(14,165,233,0.35)", text: "#38bdf8" },
      ]
    },
    {
      label: "Hotel",
      emoji: "🏨",
      links: [
        { key: "booking", label: `Booking.com · ${dest}${hasDate ? ` · ${days} notti` : ""}`, url: urls.booking, color: "rgba(233,69,96,0.12)", border: "rgba(233,69,96,0.35)", text: "#E94560" },
        ...(urls.agoda ? [{ key: "agoda", label: `Agoda · ${dest}`, url: urls.agoda, color: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.3)", text: "#fb923c" }] : []),
      ]
    },
    {
      label: "Esperienze",
      emoji: "🎟",
      links: [
        { key: "gyg", label: `GetYourGuide · ${dest}`, url: urls.getyourguide, color: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.3)", text: "#fb923c" },
        ...(urls.klook ? [{ key: "klook", label: `Klook · ${dest}`, url: urls.klook, color: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#a78bfa" }] : []),
        ...(urls.viator ? [{ key: "viator", label: `Viator · ${dest}`, url: urls.viator, color: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", text: "#818cf8" }] : []),
        { key: "tripadvisor", label: `TripAdvisor · ${dest}`, url: urls.tripadvisor, color: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", text: "#4ade80" },
      ]
    },
    {
      label: "Ristoranti",
      emoji: "🍽",
      links: [
        { key: "thefork", label: `TheFork · ristoranti a ${dest}`, url: urls.thefork, color: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", text: "#4ade80" },
      ]
    },
    ...(urls.ferry ? [{
      label: "Traghetti",
      emoji: "⛴",
      links: [
        { key: "ferry", label: `Ferryhopper · traghetti Egeo`, url: urls.ferry, color: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.3)", text: "#22d3ee" },
      ]
    }] : []),
    ...(urls.rentalcars ? [{
      label: "Noleggio auto",
      emoji: "🚗",
      links: [
        { key: "rentalcars", label: `Rentalcars · ${dest}`, url: urls.rentalcars, color: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", text: "rgba(255,255,255,0.6)" },
      ]
    }] : []),
  ];

  return (
    <div style={{ padding: "16px 14px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "white", fontFamily: "Georgia, serif", marginBottom: 4 }}>
          Organizza il viaggio
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
          Tutti i link in un posto solo — già impostati per {dest}
          {companions !== "solo" && `, ${companions === "couple" ? "2 persone" : companions === "friends" ? "3 persone" : "4 persone"}`}
          {leaveDate && ` · ${leaveDate}`}.
        </div>
      </div>

      {/* Link sections */}
      {sections.map(section => (
        <div key={section.label} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>
            {section.emoji} {section.label}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {section.links.map(link => (
              <a key={link.key} href={link.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", borderRadius: 10, background: link.color, border: `1px solid ${link.border}`, color: link.text, fontSize: 13, fontWeight: 600, textDecoration: "none", transition: "all 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
                onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}>
                <span>{link.label}</span>
                <ExternalLink style={{ width: 13, height: 13, opacity: 0.6, flexShrink: 0 }} />
              </a>
            ))}
          </div>
        </div>
      ))}

      {/* Divider */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "20px 0" }} />

      {/* Checklist */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>
            Cosa hai già prenotato?
          </div>
          <div style={{ fontSize: 11, color: checkedCount === total ? "#4ade80" : "rgba(255,255,255,0.3)", fontWeight: 700 }}>
            {checkedCount}/{total}
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
          <div style={{ height: "100%", background: checkedCount === total ? "#4ade80" : "#E94560", width: `${(checkedCount / total) * 100}%`, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {items.map(item => (
            <button key={item.id} onClick={() => toggle(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: item.checked ? "rgba(74,222,128,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${item.checked ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.07)"}`, cursor: "pointer", transition: "all 0.2s", textAlign: "left" }}>
              <div style={{ width: 18, height: 18, borderRadius: 4, border: `1.5px solid ${item.checked ? "#4ade80" : "rgba(255,255,255,0.2)"}`, background: item.checked ? "#4ade80" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.2s" }}>
                {item.checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0a0814" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <span style={{ fontSize: 13, color: item.checked ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.7)", textDecoration: item.checked ? "line-through" : "none", transition: "all 0.2s" }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {checkedCount === total && total > 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", fontSize: 12, color: "#4ade80", fontWeight: 600, textAlign: "center" }}>
            🎉 Tutto prenotato! Buon viaggio a {dest}.
          </div>
        )}
      </div>

      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 20 }}>
        I link potrebbero includere commissioni affiliate.
      </div>
    </div>
  );
}

// ── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ itinerary }: { itinerary: any }) {
  const { t } = useI18n();

  return (
    <div style={{ padding: "16px 14px 24px" }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: "white", fontFamily: "Georgia, serif", marginBottom: 16 }}>
        Panoramica
      </div>

      {/* Budget */}
      {itinerary.budgetSummary && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            💰 Budget stimato
          </div>
          {(() => {
            try {
              const parsed = JSON.parse(itinerary.budgetSummary);
              if (parsed?.items) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {parsed.items.map((item: any, i: number) => {
                      const isTotal = /totale/i.test(item.label);
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < parsed.items.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                          <span style={{ fontSize: 12, color: isTotal ? "#E94560" : "rgba(255,255,255,0.4)", fontWeight: isTotal ? 700 : 400 }}>{item.label}</span>
                          <span style={{ fontSize: isTotal ? 14 : 12, color: isTotal ? "#E94560" : "rgba(255,255,255,0.75)", fontWeight: 700 }}>{item.total}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }
            } catch {}
            const lines = itinerary.budgetSummary?.split(/[|·\n]/).filter((s: string) => s.trim().length > 3) ?? [];
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {lines.slice(0, 6).map((line: string, i: number) => {
                  const parts = line.trim().split(/[:—–]/);
                  const isTotal = /totale|total/i.test(parts[0]);
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <span style={{ fontSize: 12, color: isTotal ? "#E94560" : "rgba(255,255,255,0.4)", fontWeight: isTotal ? 700 : 400 }}>{parts[0]?.trim()}</span>
                      <span style={{ fontSize: 12, color: isTotal ? "#E94560" : "rgba(255,255,255,0.75)", fontWeight: 700 }}>{parts.slice(1).join("—").trim()}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Best time */}
      {itinerary.bestTime && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
            📅 Periodo migliore
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{itinerary.bestTime}</div>
        </div>
      )}

      {/* Getting there */}
      {itinerary.gettingThere && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
            ✈️ Come arrivare
          </div>
          {(() => {
            try {
              const parsed = JSON.parse(itinerary.gettingThere);
              if (parsed?.steps) {
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {parsed.steps.map((step: any, i: number) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#E94560", marginTop: 5, flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{step.from} → {step.to}</div>
                          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{step.method} · {step.duration}{step.cost ? ` · ${step.cost}` : ""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }
            } catch {}
            return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{itinerary.gettingThere}</div>;
          })()}
        </div>
      )}

      {/* Packing */}
      {itinerary.packingList && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
            🎒 Da portare
          </div>
          {(() => {
            try {
              const parsed = JSON.parse(itinerary.packingList);
              if (parsed?.items) {
                return (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {parsed.items.map((item: any, i: number) => (
                      <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                        {item.emoji} {item.label}
                      </span>
                    ))}
                  </div>
                );
              }
            } catch {}
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {itinerary.packingList?.split(/[,;]/).filter((s: string) => s.trim().length > 1).map((item: string, i: number) => (
                  <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    {item.trim()}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tips */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
          💡 Da sapere
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { emoji: "💳", text: "Controlla se serve il visto" },
            { emoji: "📱", text: "Attiva il roaming o compra una SIM locale" },
            { emoji: "🏥", text: "Verifica la tua assicurazione viaggio" },
            { emoji: "🔌", text: "Controlla il tipo di presa elettrica" },
          ].map((tip, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: "rgba(255,255,255,0.02)" }}>
              <span style={{ fontSize: 13 }}>{tip.emoji}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>{tip.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function Itinerary() {
  const { t } = useI18n();
  const [, params] = useRoute("/itinerary/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : 0;
  const { data: itinerary, isLoading, error, refetch } = useItinerary(id);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([0]));
  const [activeTab, setActiveTab] = useState<"itin" | "book" | "overview">("itin");

  const hasMapPoints = itinerary?.days?.some((d: any) => d.mapPoints?.length > 0);
  const { data: mapData } = useMapPointsPolling(id, !hasMapPoints && !isLoading && !!itinerary);

  useEffect(() => {
    if (mapData?.ready) refetch();
  }, [mapData?.ready]);

  const peakDayIndex = itinerary?.days?.findIndex((_: any, i: number) => i === 3 || i === 4) ?? 3;

  useEffect(() => {
    if (!itinerary?.days) return;
    const defaults = new Set([0]);
    if (peakDayIndex >= 0) defaults.add(peakDayIndex);
    setOpenDays(defaults);
  }, [itinerary]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0814" }}>
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-[3px] border-[#E94560] border-t-transparent rounded-full animate-spin" />
          <p className="text-white/50 font-serif italic text-xl animate-pulse">{t('itin.loading')}</p>
        </div>
      </div>
    );
  }

  if (!isLoading && (error || !itinerary)) {
    return (
      <div className="container max-w-lg mx-auto py-32 text-center min-h-screen" style={{ background: "#0f0a10" }}>
        <h2 className="text-3xl font-serif font-bold text-white mb-6">{t('itin.notfound')}</h2>
        <Link href="/destinations" className="btn-primary">{t('itin.return')}</Link>
      </div>
    );
  }

  const handleSavePdf = () => {
    const element = document.getElementById("itinerary-pdf-content");
    if (!element) return;
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `MindRoute-${itinerary.destinationName?.replace(/[^a-zA-Z0-9]/g, "-") ?? "itinerario"}.pdf`,
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#0a0814" },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css"] },
    };
    html2pdf().set(opt).from(element).save();
  };

  const region = detectRegion(itinerary.destinationName ?? "");
  const topLinks = itinerary.topAffiliateLinks ?? {};
  const profilingInput = (itinerary as any).profilingInput ?? null;
  const affiliateUrls = buildAffiliateUrls(itinerary.destinationName ?? "", profilingInput, region, topLinks);

  return (
    <div className="min-h-screen" style={{ background: "#0a0814" }} id="itinerary-pdf-content">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden" style={{ height: "65vh", minHeight: 420 }}>
        {(itinerary?.heroImageUrl || itinerary?.imageUrl) ? (
          <img src={itinerary?.heroImageUrl || itinerary?.imageUrl} alt={itinerary?.destinationName}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a14] to-[#0a0814]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0814] via-[#0a0814]/30 to-transparent" />

        <div className="absolute top-6 left-4 md:left-10 z-20">
          <Link href="/destinations"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <ArrowLeft className="w-4 h-4" /> {t('itin.back')}
          </Link>
        </div>

        <div className="absolute top-6 right-4 md:right-10 z-20 flex gap-2">
          <button onClick={handleSavePdf}
            className="p-2.5 text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm rounded-full border border-white/10">
            <Printer className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm rounded-full border border-white/10">
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[3px] rounded-full bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/30 mb-3">
              {t('itin.label')}
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight mb-3 max-w-3xl">
              {itinerary?.destinationName}
            </h1>
            <div className="flex items-center gap-4 text-white/45 text-sm">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {itinerary?.days?.length || 7} {t('itin.experienceDays')}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── WHYYOURS compatta ─────────────────────────────────── */}
      {itinerary?.whyYours && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mx-4 md:mx-10 -mt-1 mb-6 z-10 relative">
          <div className="max-w-3xl mx-auto p-5 md:p-7 rounded-[20px] border border-[#E94560]/20 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, rgba(233,69,96,0.07), rgba(233,69,96,0.02))" }}>
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E94560] rounded-l-[20px]" />
            <p className="text-[10px] font-bold uppercase tracking-[3px] text-[#E94560] mb-2">{t('itin.whyYours')}</p>
            <p className="font-serif italic text-lg md:text-xl text-white/85 leading-relaxed">
              "{itinerary.whyYours}"
            </p>
          </div>
        </motion.div>
      )}

      {/* ── HIGHLIGHTS ────────────────────────────────────────── */}
      {itinerary.highlights && itinerary.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 md:px-10 mb-5 max-w-3xl mx-auto">
          {itinerary.highlights.map((h: string, i: number) => (
            <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold text-[#E94560]"
              style={{ background: "rgba(233,69,96,0.08)", border: "1px solid rgba(233,69,96,0.2)" }}>{h}</span>
          ))}
        </div>
      )}

      {/* ── TAB BAR ───────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 px-4 md:px-10 mb-0" style={{ background: "rgba(10,8,20,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-3xl mx-auto flex gap-0">
          {([
            { id: "itin", label: "Itinerario", emoji: "📍" },
            { id: "book", label: "Prenota", emoji: "🎟" },
            { id: "overview", label: "Panoramica", emoji: "🗺" },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: "14px 8px", fontSize: 12, fontWeight: 700, color: activeTab === tab.id ? "#E94560" : "rgba(255,255,255,0.35)", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "#E94560" : "transparent"}`, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <span style={{ fontSize: 14 }}>{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ───────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto">

        {/* ITINERARIO TAB */}
        {activeTab === "itin" && (
          <div className="px-4 md:px-10 pt-6 pb-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl md:text-2xl font-serif font-bold text-white">{t('itin.daybyday')}</h2>
              <span className="text-white/25 text-sm">{itinerary?.days?.length} giorni</span>
            </div>

            <div className="space-y-4">
              {(itinerary?.days ?? []).map((day: any, index: number) => (
                <motion.div key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <DayCard
                    day={day} isOpen={openDays.has(index)}
                    onToggle={() => setOpenDays(prev => {
                      const next = new Set(prev);
                      if (next.has(index)) next.delete(index); else next.add(index);
                      return next;
                    })}
                    index={index} isPeak={index === peakDayIndex || index === peakDayIndex + 1}
                    t={t} itineraryId={itinerary?.id ?? 0}
                    onDayRegenerated={(dayIndex, newDay) => {
                      if (itinerary) { itinerary.days[dayIndex] = newDay; refetch(); }
                    }}
                  />
                </motion.div>
              ))}
            </div>

            {/* Closing */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
              className="relative rounded-[28px] overflow-hidden mt-8"
              style={{ background: "linear-gradient(135deg, #2a1018, #1a0d14)" }}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(233,69,96,0.10),transparent_60%)]" />
              <div className="relative z-10 p-8 md:p-12 text-center space-y-6">
                <Wind className="w-7 h-7 text-[#E94560]/40 mx-auto" />
                <p className="text-white/75 font-serif italic text-lg md:text-2xl max-w-xl mx-auto leading-relaxed">
                  "{itinerary.closingMessage}"
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button onClick={handleSavePdf}
                    className="px-6 py-3 rounded-2xl border border-white/15 text-white font-bold text-sm hover:bg-white/5 transition-all">
                    {t('itin.pdf')}
                  </button>
                  <button onClick={() => setLocation("/")}
                    className="px-6 py-3 rounded-2xl bg-white text-[#0a0814] font-bold text-sm hover:bg-white/90 transition-all">
                    {t('itin.startover')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* PRENOTA TAB */}
        {activeTab === "book" && (
          <BookTab
            urls={affiliateUrls}
            region={region}
            destinationName={itinerary.destinationName ?? ""}
            profilingInput={profilingInput}
            itineraryId={itinerary.id}
          />
        )}

        {/* PANORAMICA TAB */}
        {activeTab === "overview" && (
          <OverviewTab itinerary={itinerary} />
        )}
      </div>
    </div>
  );
}

// ── DAY CARD ─────────────────────────────────────────────────────────────────
function DayCard({ day, isOpen, onToggle, index, isPeak, t, itineraryId, onDayRegenerated }: {
  day: any; isOpen: boolean; onToggle: () => void; index: number; isPeak: boolean;
  t: (key: string) => string; itineraryId: number; onDayRegenerated: (dayIndex: number, newDay: any) => void;
}) {
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const storageKey = `regen_count_${itineraryId}`;
  const getRegenCount = () => parseInt(localStorage.getItem(storageKey) || "0");
  const MAX_REGENS = 3;

  const handleRegen = async () => {
    if (getRegenCount() >= MAX_REGENS) { alert("Hai raggiunto il limite di 3 rigenerazioni."); return; }
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/itinerary/${itineraryId}/regenerate-day`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayIndex: index, feedback: regenPrompt }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem(storageKey, String(getRegenCount() + 1));
      onDayRegenerated(index, data.day);
      setShowRegenModal(false); setRegenPrompt("");
    } catch { alert("Errore durante la rigenerazione."); }
    setIsRegenerating(false);
  };

  const slots = [
    { key: "morning", icon: "🌅", label: t("itin.morning"), text: day.morning, color: "#E94560",
      link: day.affiliateLinks?.getyourguide_morning ?? day.affiliateLinks?.klook_morning ?? day.affiliateLinks?.viator_morning ?? day.affiliateLinks?.skyscanner,
      placeLink: day.affiliateLinks?.getyourguide_place_morning ?? day.affiliateLinks?.klook_place_morning ?? day.affiliateLinks?.viator_place_morning,
      isActivity: true },
    { key: "lunch", icon: "🍽️", label: t("itin.lunch"), text: day.lunch, color: "#FF8C42",
      link: day.affiliateLinks?.thefork_lunch ?? day.affiliateLinks?.tripadvisor_lunch,
      isActivity: false },
    { key: "afternoon", icon: "☀️", label: t("itin.afternoon"), text: day.afternoon, color: "#4ECDC4",
      link: day.affiliateLinks?.getyourguide_afternoon ?? day.affiliateLinks?.klook_afternoon ?? day.affiliateLinks?.viator_afternoon ?? day.affiliateLinks?.booking_hotel,
      placeLink: day.affiliateLinks?.getyourguide_place_afternoon ?? day.affiliateLinks?.klook_place_afternoon ?? day.affiliateLinks?.viator_place_afternoon,
      isActivity: true },
    { key: "evening", icon: "🌙", label: t("itin.evening"), text: day.evening, color: "#9B59B6",
      link: day.affiliateLinks?.thefork_evening ?? day.affiliateLinks?.tripadvisor_evening,
      isActivity: false },
  ];

  return (
    <div className="rounded-[20px] overflow-hidden transition-all duration-300"
      style={{
        background: isPeak ? "rgba(233,69,96,0.06)" : isOpen ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.03)",
        border: isPeak ? (isOpen ? "1.5px solid rgba(233,69,96,0.4)" : "1px solid rgba(233,69,96,0.25)") : (isOpen ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.07)"),
      }}>
      <button onClick={onToggle} className="w-full text-left">
        <div className="flex items-stretch gap-0">
          <div className="flex flex-col items-center justify-center shrink-0 relative overflow-hidden"
            style={{ width: 60, background: isPeak ? "#E94560" : "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
            {isPeak && <div className="absolute top-1.5 left-1/2 -translate-x-1/2"><Flame className="w-3 h-3 text-yellow-300/80" /></div>}
            <span className="font-serif font-bold" style={{ fontSize: 22, color: isPeak ? "white" : "rgba(255,255,255,0.45)", lineHeight: 1.2, paddingTop: isPeak ? 18 : 0 }}>
              {day.dayNumber}
            </span>
            <span className="text-[8px] uppercase tracking-[1px] font-bold" style={{ color: isPeak ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)" }}>
              giorno
            </span>
          </div>
          <div className="flex-1 px-4 py-3.5 min-w-0">
            {isPeak && <div className="text-[9px] font-bold text-[#E94560] uppercase tracking-[2px] mb-1">Momento clou</div>}
            <h4 className="font-serif font-bold leading-snug mb-2" style={{ fontSize: 14, color: isOpen || isPeak ? "white" : "rgba(255,255,255,0.65)" }}>
              {day.title}
            </h4>
            {!isOpen && (
              <div className="flex flex-wrap gap-1.5">
                {slots.map(slot => {
                  if (!slot.text || slot.text.length < 3) return null;
                  const keyword = slot.text.split(/[—–,.(]/)[0].trim().split(' ').slice(0, 3).join(' ');
                  if (!keyword || keyword.length < 2) return null;
                  return (
                    <span key={slot.key} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${slot.color}15`, color: `${slot.color}99`, border: `1px solid ${slot.color}25` }}>
                      {slot.icon} <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{keyword}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex items-center pr-3">
            <ChevronDown className="w-4 h-4 transition-transform duration-300"
              style={{ color: isOpen ? "#E94560" : "rgba(255,255,255,0.25)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </div>
        </div>
      </button>

      {isOpen && (
        <div>
          <div className="w-full h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }} />
          <div className="rounded-[14px] overflow-hidden mx-3 my-3" style={{ border: "1px solid rgba(255,255,255,0.05)" }}>
            {slots.map((slot, si) => {
              if (!slot.text || slot.text.length < 3) return null;
              const sentences = slot.text.split(/(?<=[.!?—])\s+/);
              const main = sentences[0] ?? slot.text;
              const details = sentences.slice(1).join(' ');

              const isFlightSlot = slot.key === "morning" && /volo|flight|aereo/i.test(slot.text);
              const isHotelSlot = slot.key === "afternoon" && /hotel|check.?in/i.test(slot.text);
              const ctaText = isFlightSlot ? "✈️ Cerca voli" : isHotelSlot ? "🏨 Prenota hotel" : slot.isActivity ? `🎟 Prenota` : `🍽 Prenota`;
              const linkKey = slot.key === "morning"
                ? (day.affiliateLinks?.getyourguide_morning ? "getyourguide_morning" : "klook_morning")
                : slot.key === "lunch" ? "thefork_lunch"
                : slot.key === "afternoon" ? (day.affiliateLinks?.getyourguide_afternoon ? "getyourguide_afternoon" : "booking_hotel")
                : "thefork_evening";
              const linkLabel = day.affiliateLabels?.[linkKey];

              return (
                <div key={slot.key} style={{ display: "flex", borderTop: si > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", background: si % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <div className="flex flex-col items-center pt-4 pb-3 shrink-0 relative"
                    style={{ width: 50, borderRight: "1px solid rgba(255,255,255,0.04)", background: `${slot.color}05` }}>
                    <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: `linear-gradient(180deg, ${slot.color}, ${slot.color}30)` }} />
                    <span className="text-lg leading-none mb-1.5">{slot.icon}</span>
                    <span className="text-[8px] font-bold uppercase tracking-[1px] text-center"
                      style={{ color: `${slot.color}80` }}>{slot.label}</span>
                  </div>
                  <div className="flex-1 px-4 py-3.5 min-w-0">
                    <p className="font-medium mb-1" style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{main}</p>
                    {details && <p className="mb-3 text-[12px] text-white/40 leading-relaxed">{details}</p>}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {slot.link && (
                        <a href={slot.link} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: isFlightSlot || isHotelSlot ? slot.color : `${slot.color}20`, color: "white", border: `1px solid ${isFlightSlot || isHotelSlot ? slot.color : `${slot.color}50`}`, textDecoration: "none", boxShadow: isFlightSlot || isHotelSlot ? `0 3px 12px ${slot.color}35` : "none", transition: "all 0.2s" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"; (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = "brightness(1)"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}>
                          {linkLabel ? `🎯 ${linkLabel}` : ctaText}
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      )}
                      {(slot as any).placeLink && (
                        <a href={(slot as any).placeLink} target="_blank" rel="noopener noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", transition: "all 0.2s" }}>
                          <MapPin className="w-3 h-3" />
                          {day.affiliateLabels?.[(slot.key === "morning" ? "getyourguide_place_morning" : "getyourguide_place_afternoon")] || "Esplora"}
                          <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mx-3 mb-3 flex items-center justify-between">
            <span className="text-[10px] text-white/20">{MAX_REGENS - getRegenCount()} rigenerazioni rimaste</span>
            <button onClick={() => setShowRegenModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:brightness-110"
              style={{ background: "rgba(233,69,96,0.07)", color: "#E94560", border: "1px solid rgba(233,69,96,0.18)" }}>
              ↺ Rigenera
            </button>
          </div>

          {showRegenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
              <div className="w-full max-w-md rounded-[24px] p-6 space-y-4" style={{ background: "#1a0a14", border: "1px solid rgba(233,69,96,0.3)" }}>
                <h3 className="font-serif text-lg text-white font-bold">Rigenera il Giorno {day.dayNumber}</h3>
                <p className="text-white/50 text-sm">Dicci come vuoi cambiarlo — o lascia vuoto per una variazione casuale.</p>
                <textarea value={regenPrompt} onChange={e => setRegenPrompt(e.target.value)}
                  placeholder="Es: voglio qualcosa di più rilassato..."
                  rows={3} className="w-full text-white text-sm outline-none resize-none rounded-xl p-3"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
                <div className="flex gap-3">
                  <button onClick={() => { setShowRegenModal(false); setRegenPrompt(""); }}
                    className="flex-1 py-3 rounded-xl text-white/50 font-bold text-sm hover:text-white transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}>Annulla</button>
                  <button onClick={handleRegen} disabled={isRegenerating}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110"
                    style={{ background: isRegenerating ? "rgba(233,69,96,0.4)" : "#E94560" }}>
                    {isRegenerating ? "Rigenerando..." : "Rigenera"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ItineraryMap({ days, destinationName }: { days: any[]; destinationName: string }) {
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(destinationName)}&output=embed&hl=it&z=12`;
  return (
    <div className="w-full h-full relative" style={{ background: "#0d0820" }}>
      <iframe src={mapUrl} className="w-full h-full" style={{ border: "none", minHeight: "300px" }}
        title={`Mappa di ${destinationName}`} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
  );
}
