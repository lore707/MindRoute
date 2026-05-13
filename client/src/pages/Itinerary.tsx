import { useState, useEffect, useCallback } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useItinerary, useMapPointsPolling } from "@/hooks/use-profiling";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronDown, Share2, Printer,
  ExternalLink, Plane, Hotel, Ticket, Utensils, Star, MapPin,
  Flame, Calendar, Wind, Pencil, GripVertical, RotateCcw, Save, X
} from "lucide-react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useI18n } from "@/lib/i18n";
import { pdf } from "@react-pdf/renderer";
import { ItineraryPDF } from "@/components/ItineraryPDF";
import { ItineraryCinematic, type ItineraryData, type Highlight as CinHighlight, type Day as CinDay, type Moment as CinMoment } from "@/components/ItineraryCinematic";

// ── URL BUILDER ───────────────────────────────────────────────────────────────
function buildAffiliateUrls(destinationName: string, profilingInput: any, region: string, topLinks: Record<string, string>): Record<string, string> {
  const dest = destinationName.split(",")[0].trim();
  const destEncoded = encodeURIComponent(destinationName);
  const destSlug = dest.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const leaveDate = profilingInput?.leaveDate ?? "";
  const days = profilingInput?.days ?? 7;
  const companions = profilingInput?.companions ?? "solo";
  const departure = profilingInput?.departure ?? "";
 const companionsLower = (companions ?? "").toLowerCase();
const adults = companionsLower.includes("couple") || companionsLower.includes("partner") || companionsLower.includes("coppia") ? 2 : companionsLower.includes("friend") || companionsLower.includes("amici") ? 3 : companionsLower.includes("famil") ? 2 : 1;
const children = companionsLower.includes("famil") ? 2 : 0;
  let checkin = "", checkout = "", checkinCompact = "", checkoutCompact = "";
  const exactDateMatch = leaveDate.match(/(\d{4}-\d{2}-\d{2})/);
  const baseDate = exactDateMatch ? new Date(exactDateMatch[1]) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d; })();
  const coDate = new Date(baseDate); coDate.setDate(coDate.getDate() + days);
  const fmt = (dt: Date) => dt.toISOString().split("T")[0];
  checkin = fmt(baseDate); checkout = fmt(coDate);
  checkinCompact = checkin.replace(/-/g, ""); checkoutCompact = checkout.replace(/-/g, "");
  const departureIATA = (() => {
    const d = (departure || "").toLowerCase();
    if (d.includes("milano") || d.includes("milan") || d.includes("mxp")) return "MXP";
    if (d.includes("roma") || d.includes("rome") || d.includes("fco")) return "FCO";
    if (d.includes("napoli")) return "NAP"; if (d.includes("torino")) return "TRN";
    if (d.includes("venezia")) return "VCE"; if (d.includes("bologna")) return "BLQ";
    if (d.includes("firenze")) return "FLR"; if (d.includes("palermo")) return "PMO";
    return "MXP";
  })();
  const result: Record<string, string> = {};
  result.expedia_flights = topLinks.expedia_flights ?? `https://www.tkqlhce.com/click-101710513-10581071?url=https://www.expedia.com/Flights-Search?leg1=from%3A${encodeURIComponent(departure)}%2Cto%3A${destEncoded}%2Cdeparture%3A${checkinCompact}%2F1&leg2=from%3A${destEncoded}%2Cto%3A${encodeURIComponent(departure)}%2Cdeparture%3A${checkoutCompact}%2F1&passengers=adults%3A${adults}&trip=roundtrip&mode=search`;
const childrenParam = children > 0 ? `&q-room-0-children=${children}` : "";
result.hotels = topLinks.hotels ?? topLinks.hotels_hotel ?? `https://www.tkqlhce.com/click-101710513-15734399?url=https://www.hotels.com/search.do?q-destination=${destEncoded}&q-check-in=${checkin}&q-check-out=${checkout}&q-rooms=1&q-room-0-adults=${adults}${childrenParam}`;
  if (["europe", "mediterranean", "latam"].includes(region)) {
    result.civitatis = topLinks.civitatis_1 ?? `https://www.civitatis.com/it/${destSlug}/?aid=112605&cmp=mindroute`;
    if (["europe", "mediterranean"].includes(region)) result.musement = topLinks.musement_1 ?? `https://www.musement.com/it/${destSlug}/?utm_source=affiliate&utm_medium=affiliate&utm_campaign=mindroute-7388`;
  }
 if (["asia", "india"].includes(region)) result.klook = topLinks.klook_1 ?? `https://www.klook.com/search/?q=${destEncoded}&aid=116532${checkin ? `&startDate=${checkin}` : ""}`;
if (["africa", "northamerica", "oceania"].includes(region)) result.viator = topLinks.viator_1 ?? `https://www.viator.com/searchResults/all?text=${destEncoded}&pid=P00293604&mcid=42383&medium=link${checkin ? `&startDate=${checkin}&endDate=${checkout}` : ""}`;
  if (destinationName.toLowerCase().includes("orlando") || destinationName.toLowerCase().includes("los angeles")) result.undercovertourist = topLinks.undercovertourist ?? `https://www.kqzyfj.com/click-101710513-15733832`;
 result.tripadvisor = topLinks.tripadvisor ?? `https://www.tripadvisor.it/Search?q=ristoranti+${destEncoded}`;
result.tablet_hotels = topLinks.tablet_hotels ?? `https://www.kqzyfj.com/click-101710513-15686837?url=https://www.tablethotels.com/find/results?destination=${destEncoded}`;
  if (["europe", "mediterranean"].includes(region)) {
    result.flixbus = topLinks.flixbus ?? `https://www.awin1.com/cread.php?awinmid=110876&awinaffid=2830626&ued=https%3A%2F%2Fwww.flixbus.it`;
  }
  if (["mediterranean", "europe"].includes(region)) {
    result.samboat = topLinks.samboat ?? `https://www.awin1.com/cread.php?awinmid=32681&awinaffid=2830626&ued=https%3A%2F%2Fwww.samboat.it%2F%3FdestinationId%3D${destEncoded}`;
  }
  return result;
}

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

// ── CHECKLIST ─────────────────────────────────────────────────────────────────
type ChecklistItem = { id: string; label: string; checked: boolean };
function useChecklist(itineraryId: number) {
  const storageKey = `mindroute_checklist_${itineraryId}`;
  const [items, setItems] = useState<ChecklistItem[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) { try { setItems(JSON.parse(saved)); return; } catch {} }
    setItems([
      { id: "flight", label: "Volo prenotato", checked: false },
      { id: "hotel", label: "Hotel prenotato", checked: false },
      { id: "experience", label: "Esperienza principale prenotata", checked: false },
      { id: "restaurant", label: "Ristorante primo giorno prenotato", checked: false },
      { id: "transfer", label: "Transfer/traghetto prenotato", checked: false },
    ]);
  }, [itineraryId]);
  const toggle = (id: string) => setItems(prev => {
    const next = prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i);
    localStorage.setItem(storageKey, JSON.stringify(next)); return next;
  });
  const checkedCount = items.filter(i => i.checked).length;
  return { items, toggle, checkedCount, total: items.length };
}

// ── BOOK TAB ──────────────────────────────────────────────────────────────────
function BookTab({ urls, region, destinationName, profilingInput, itineraryId }: { urls: Record<string, string>; region: string; destinationName: string; profilingInput: any; itineraryId: number }) {
  const { items, toggle, checkedCount, total } = useChecklist(itineraryId);
  const dest = destinationName.split(",")[0].trim();
  const companions = profilingInput?.companions ?? "solo";
  const leaveDate = profilingInput?.leaveDate ?? "";
  const days = profilingInput?.days ?? 7;
  const hasDate = !!(profilingInput?.leaveDate?.match(/\d{4}-\d{2}-\d{2}/));
  const companionsLower = companions.toLowerCase();
  const exactDateMatch = leaveDate.match(/(\d{4}-\d{2}-\d{2})/);
  const baseDate = exactDateMatch ? new Date(exactDateMatch[1]) : (() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d; })();
  const coDate = new Date(baseDate); coDate.setDate(coDate.getDate() + days);
  const fmt = (dt: Date) => dt.toISOString().split("T")[0];
  const checkin = hasDate ? fmt(baseDate) : "";
  const checkout = hasDate ? fmt(coDate) : "";
  const sections = [
    { label: "Voli", emoji: "✈️", links: [{ key: "expedia_flights", label: `Expedia Voli → ${dest}${hasDate ? " · date preimpostate" : ""}`, url: urls.expedia_flights, color: "rgba(14,165,233,0.15)", border: "rgba(14,165,233,0.35)", text: "#38bdf8" }] },
 { label: "Hotel", emoji: "🏨", links: [{ key: "hotels", label: `Hotels.com · ${dest}${hasDate ? ` · ${days} notti` : ""}`, url: urls.hotels, color: "rgba(233,69,96,0.12)", border: "rgba(233,69,96,0.35)", text: "#E94560" }, { key: "tablet_hotels", label: `Tablet Hotels · boutique a ${dest}`, url: urls.tablet_hotels, color: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#a78bfa" }, { key: "expedia_packages", label: `Expedia Pacchetti · volo + hotel`, url: urls.expedia_packages, color: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.3)", text: "#fb923c" }] },
    ...(urls.civitatis ? [{ label: "Esperienze", emoji: "🎟", links: [{ key: "civitatis", label: `Civitatis · tour e attività a ${dest}`, url: urls.civitatis, color: "rgba(251,146,60,0.12)", border: "rgba(251,146,60,0.3)", text: "#fb923c" }, ...(urls.musement ? [{ key: "musement", label: `Musement · esperienze a ${dest}`, url: urls.musement, color: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#a78bfa" }] : [])] }] : []),
    ...(urls.klook ? [{ label: "Esperienze", emoji: "🎟", links: [{ key: "klook", label: `Klook · attività a ${dest}`, url: urls.klook, color: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#a78bfa" }] }] : []),
    ...(urls.viator ? [{ label: "Tour e attrazioni", emoji: "🗺", links: [{ key: "viator", label: `Viator · tour a ${dest}`, url: urls.viator, color: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.3)", text: "#818cf8" }] }] : []),
  { label: "Ristoranti", emoji: "🍽", links: [{ key: "tripadvisor", label: `TripAdvisor · ristoranti a ${dest}`, url: urls.tripadvisor, color: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.25)", text: "#4ade80" }] },
    ...(urls.flixbus ? [{ label: "Bus & Treni", emoji: "🚌", links: [{ key: "flixbus", label: `FlixBus · tratte da e per ${dest}`, url: urls.flixbus, color: "rgba(50,205,50,0.10)", border: "rgba(50,205,50,0.25)", text: "#32cd32" }] }] : []),
    ...(urls.samboat ? [{ label: "Barche & Yacht", emoji: "⛵", links: [{ key: "samboat", label: `SamBoat · noleggio barche a ${dest}`, url: urls.samboat, color: "rgba(14,165,233,0.10)", border: "rgba(14,165,233,0.25)", text: "#0ea5e9" }] }] : []),
    ...(urls.undercovertourist ? [{ label: "Attrazioni", emoji: "🎡", links: [{ key: "undercovertourist", label: `Undercover Tourist · biglietti`, url: urls.undercovertourist, color: "rgba(255,200,50,0.12)", border: "rgba(255,200,50,0.3)", text: "#fbbf24" }] }] : []),
  ];
  return (
    <div style={{ padding: "16px 14px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "white", fontFamily: "Georgia, serif", marginBottom: 4 }}>Organizza il viaggio</div>
  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>
  Già impostati per <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{dest}</span>
  {companions && companions !== "solo" && <span> · <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{companionsLower.includes("couple") || companionsLower.includes("coppia") || companionsLower.includes("partner") ? "2 persone" : companionsLower.includes("friend") || companionsLower.includes("amici") ? "3 persone" : "famiglia"}</span></span>}
  {hasDate && <span> · <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>{checkin} → {checkout}</span></span>}
</div>
      </div>
      {sections.map(section => (
        <div key={section.label} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.25)", marginBottom: 8 }}>{section.emoji} {section.label}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {section.links.map((link: any) => (
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
      <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "20px 0" }} />
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "white" }}>Cosa hai già prenotato?</div>
          <div style={{ fontSize: 11, color: checkedCount === total ? "#4ade80" : "rgba(255,255,255,0.3)", fontWeight: 700 }}>{checkedCount}/{total}</div>
        </div>
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
              <span style={{ fontSize: 13, color: item.checked ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.7)", textDecoration: item.checked ? "line-through" : "none", transition: "all 0.2s" }}>{item.label}</span>
            </button>
          ))}
        </div>
        {checkedCount === total && total > 0 && (
          <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 10, background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", fontSize: 12, color: "#4ade80", fontWeight: 600, textAlign: "center" }}>
            🎉 Tutto prenotato! Buon viaggio a {dest}.
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", textAlign: "center", marginTop: 20 }}>I link potrebbero includere commissioni affiliate.</div>
    </div>
  );
}

// ── OVERVIEW TAB ──────────────────────────────────────────────────────────────
function OverviewTab({ itinerary }: { itinerary: any }) {
  return (
    <div style={{ padding: "16px 14px 24px" }}>
      {itinerary.budgetSummary && (
        <div style={{ background: "rgba(233,69,96,0.06)", border: "1px solid rgba(233,69,96,0.15)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>💰 Budget stimato</div>
          {(() => {
            try {
              const parsed = JSON.parse(itinerary.budgetSummary);
              if (parsed?.items) return (
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
      {itinerary.bestTime && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>📅 Periodo migliore</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{itinerary.bestTime}</div>
        </div>
      )}
      {itinerary.gettingThere && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>✈️ Come arrivare</div>
          {(() => {
            try {
              const parsed = JSON.parse(itinerary.gettingThere);
              if (parsed?.steps) return (
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
            } catch {}
            return <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{itinerary.gettingThere}</div>;
          })()}
        </div>
      )}
      {itinerary.packingList && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px", marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>🎒 Da portare</div>
          {(() => {
            try {
              const parsed = JSON.parse(itinerary.packingList);
              if (parsed?.items) return (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {parsed.items.map((item: any, i: number) => (
                    <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>{item.emoji} {item.label}</span>
                  ))}
                </div>
              );
            } catch {}
            return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {itinerary.packingList?.split(/[,;]/).filter((s: string) => s.trim().length > 1).map((item: string, i: number) => (
                  <span key={i} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>{item.trim()}</span>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── SORTABLE DAY WRAPPER (drag and drop) ──────────────────────────────────────
function SortableDayCard({ day, index, isOpen, onToggle, isPeak, t, itineraryId, onDayRegenerated, editMode, onDayChange }: {
  day: any; index: number; isOpen: boolean; onToggle: () => void; isPeak: boolean;
  t: (k: string) => string; itineraryId: number; onDayRegenerated: (i: number, d: any) => void;
  editMode: boolean; onDayChange: (index: number, updated: any) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.dayNumber });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <DayCard
        day={day} isOpen={isOpen} onToggle={onToggle} index={index} isPeak={isPeak}
        t={t} itineraryId={itineraryId} onDayRegenerated={onDayRegenerated}
        editMode={editMode} onDayChange={onDayChange}
        dragHandleProps={editMode ? { ...attributes, ...listeners } : undefined}
      />
    </div>
  );
}

// ── CINEMATIC ADAPTER ─────────────────────────────────────────────────────────
const HIGHLIGHT_ICONS = ["✦", "◆", "●", "▲", "✺", "❉", "✧", "◈"];

function dayArc(i: number, total: number, t: (k: string) => string): string {
  if (total <= 1) return t('itin.cin.arc.peak');
  if (i === 0) return t('itin.cin.arc.arrival');
  if (i === total - 1) return t('itin.cin.arc.departure');
  const peakIdx = Math.floor((total - 1) / 2);
  if (i === peakIdx) return t('itin.cin.arc.peak');
  if (i < peakIdx) return t('itin.cin.arc.discovery');
  return t('itin.cin.arc.descent');
}

function firstSentence(s: string, maxWords = 14): string {
  if (!s) return "";
  const sentences = s.split(/(?<=[.!?—])\s+/);
  let title = sentences[0] ?? s;
  const words = title.split(/\s+/);
  if (words.length > maxWords) title = words.slice(0, maxWords).join(" ") + "…";
  return title.trim().replace(/[.!?—]+$/, "");
}

function buildMoments(day: any, t: (k: string) => string): CinMoment[] {
  const slots = [
    { key: "morning", label: t('itin.morning'), ic: "🌅" },
    { key: "lunch", label: t('itin.lunch'), ic: "🍽" },
    { key: "afternoon", label: t('itin.afternoon'), ic: "☀️" },
    { key: "evening", label: t('itin.evening'), ic: "🌙" },
  ];
  const moments: CinMoment[] = [];
  for (const s of slots) {
    const text = day?.[s.key];
    if (!text || text.length < 3) continue;
    const title = firstSentence(text);
    const remainder = text.slice(title.length).replace(/^[\s.!?—]+/, "").trim();
    const desc = remainder || text;
    const links = day.affiliateLinks ?? {};
    const linkKey = Object.keys(links).find(k => k.endsWith(`_${s.key}`) && !k.includes("_place_"));
    const ctaUrl = linkKey ? links[linkKey] : undefined;
    moments.push({ t: s.label, ic: s.ic, title, desc, cta: ctaUrl ? t('itin.cin.book') : undefined, ctaUrl });
  }
  return moments;
}

function mapItineraryToCinematic(itinerary: any, t: (k: string) => string, lang: "en" | "it"): ItineraryData {
  const destinationFull = itinerary?.destinationName ?? "";
  const parts = destinationFull.split(",").map((s: string) => s.trim()).filter(Boolean);
  const destinationCity = parts[0] ?? destinationFull;
  const country = parts.slice(1).join(", ");

  const days = (itinerary?.days ?? []) as any[];
  const dayCount = days.length;

  const dateStr = itinerary?.createdAt ? new Date(itinerary.createdAt) : new Date();
  const monthYear = isNaN(dateStr.getTime())
    ? ""
    : new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-US", { month: "long", year: "numeric" }).format(dateStr);
  const subtitle = monthYear ? `${t('itin.cin.subtitlePrefix')} · ${monthYear}` : t('itin.cin.subtitlePrefix');

  const duration = `${dayCount} ${dayCount === 1 ? t('itin.cin.duration.day') : t('itin.cin.duration.days')}`;

  const rawHighlights = (itinerary?.highlights ?? []) as string[];
  const highlights: CinHighlight[] = rawHighlights.slice(0, 6).map((h, i) => ({
    ic: HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length],
    name: h,
    desc: "",
  }));

  const cinDays: CinDay[] = days.map((d, i) => ({
    n: d.dayNumber ?? i + 1,
    arc: dayArc(i, dayCount, t),
    title: d.title ?? "",
    sub: firstSentence(d.morning ?? "", 12),
    img: d.dayImageUrl ?? "",
  }));

  const momentsByDay: Record<number, CinMoment[]> = {};
  for (let i = 0; i < days.length; i++) {
    const d = days[i];
    momentsByDay[d.dayNumber ?? i + 1] = buildMoments(d, t);
  }

  let mapPoints: ItineraryData["mapPoints"];
  const allPoints: { lat: number; lng: number; label: string }[] = [];
  const seen = new Set<string>();
  for (const d of days) {
    for (const p of (d.mapPoints ?? []) as any[]) {
      if (p?.lat == null || p?.lng == null) continue;
      const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      if (seen.has(k)) continue;
      seen.add(k);
      allPoints.push({ lat: p.lat, lng: p.lng, label: p.label ?? "" });
    }
  }
  if (allPoints.length > 0) {
    const lats = allPoints.map(p => p.lat);
    const lngs = allPoints.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const latRange = (maxLat - minLat) || 0.001;
    const lngRange = (maxLng - minLng) || 0.001;
    mapPoints = allPoints.map(p => ({
      x: 60 + ((p.lng - minLng) / lngRange) * 280,
      y: 60 + (1 - (p.lat - minLat) / latRange) * 280,
      label: p.label,
    }));
  }

  return {
    destination: destinationCity,
    subtitle,
    country,
    duration,
    heroImg: itinerary?.heroImageUrl || itinerary?.imageUrl || "",
    manifesto: itinerary?.whyYours ?? "",
    highlights,
    days: cinDays,
    momentsByDay,
    closingQuote: itinerary?.closingMessage ?? "",
    mapPoints,
  };
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function Itinerary() {
  const { t, lang } = useI18n();
  const [, params] = useRoute("/itinerary/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : 0;
  const { data: itinerary, isLoading, error, refetch } = useItinerary(id);
  const [openDays, setOpenDays] = useState<Set<number>>(new Set([0]));
  const [activeTab, setActiveTab] = useState<"itin" | "book" | "overview">("itin");

  // ── EDIT MODE STATE ──
  const [editMode, setEditMode] = useState(false);
  const [editedDays, setEditedDays] = useState<any[]>([]);
  const [originalDays, setOriginalDays] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const hasMapPoints = itinerary?.days?.some((d: any) => d.mapPoints?.length > 0);
  const { data: mapData } = useMapPointsPolling(id, !hasMapPoints && !isLoading && !!itinerary);
  useEffect(() => { if (mapData?.ready) refetch(); }, [mapData?.ready]);

  const peakDayIndex = itinerary?.days?.findIndex((_: any, i: number) => i === 3 || i === 4) ?? 3;
  useEffect(() => {
    if (!itinerary?.days) return;
    const defaults = new Set([0]);
    if (peakDayIndex >= 0) defaults.add(peakDayIndex);
    setOpenDays(defaults);
  }, [itinerary]);

  // Enter edit mode — snapshot original
  const enterEditMode = () => {
    const days = itinerary?.days ?? [];
    setOriginalDays(JSON.parse(JSON.stringify(days)));
    setEditedDays(JSON.parse(JSON.stringify(days)));
    setEditMode(true);
    // Open all days in edit mode
    setOpenDays(new Set(days.map((_: any, i: number) => i)));
  };

  const cancelEdit = () => {
    setEditedDays([]);
    setEditMode(false);
    setSaveError("");
  };

  const restoreOriginal = () => {
    setEditedDays(JSON.parse(JSON.stringify(originalDays)));
  };

  const handleDayChange = useCallback((index: number, updated: any) => {
    setEditedDays(prev => prev.map((d, i) => i === index ? { ...d, ...updated } : d));
  }, []);

  const handleSaveEdit = async () => {
    setIsSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/itinerary/${id}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: editedDays }),
      });
      if (!res.ok) throw new Error();
      await refetch();
      setEditMode(false);
      setEditedDays([]);
    } catch {
      setSaveError("Errore nel salvataggio. Riprova.");
    }
    setIsSaving(false);
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setEditedDays(days => {
      const oldIndex = days.findIndex(d => d.dayNumber === active.id);
      const newIndex = days.findIndex(d => d.dayNumber === over.id);
      const reordered = arrayMove(days, oldIndex, newIndex);
      // Update dayNumber to reflect new order
      return reordered.map((d, i) => ({ ...d, dayNumber: i + 1 }));
    });
  };

  if (isLoading) return (
<div className="min-h-screen flex items-center justify-center" style={{ background: "transparent" }}>
      <div className="flex flex-col items-center gap-6">
        <div className="w-16 h-16 border-[3px] border-[#E94560] border-t-transparent rounded-full animate-spin" />
        <p className="text-white/50 font-serif italic text-xl animate-pulse">{t('itin.loading')}</p>
      </div>
    </div>
  );

  if (!isLoading && (error || !itinerary)) return (
    <div className="container max-w-lg mx-auto py-32 text-center min-h-screen" style={{ background: "transparent" }}>
      <h2 className="text-3xl font-serif font-bold text-white mb-6">{t('itin.notfound')}</h2>
      <Link href="/destinations" className="btn-primary">{t('itin.return')}</Link>
    </div>
  );

 const handleSavePdf = async () => {
    if (!itinerary) return;
    const dest = itinerary.destinationName ?? "Destination";
    const safeName = dest.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "");
    const createdAt = (itinerary as any).createdAt ? new Date((itinerary as any).createdAt) : new Date();
    const monthYear = isNaN(createdAt.getTime())
      ? undefined
      : new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-US", { month: "long", year: "numeric" }).format(createdAt);
    try {
      const blob = await pdf(<ItineraryPDF data={itinerary as any} lang={lang as "it" | "en"} monthYear={monthYear} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MindRoute-${safeName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.alert(lang === "it" ? "Errore nella generazione del PDF" : "PDF generation failed");
    }
  };

  const region = detectRegion(itinerary.destinationName ?? "");
  const topLinks = itinerary.topAffiliateLinks ?? {};
  const profilingInput = (itinerary as any).profilingInput ?? null;
  const affiliateUrls = buildAffiliateUrls(itinerary.destinationName ?? "", profilingInput, region, topLinks);
  const displayDays = editMode ? editedDays : (itinerary?.days ?? []);

  if (!editMode) {
    const cinematicData = mapItineraryToCinematic(itinerary, t, lang);

    // Trip-at-a-glance chip strip — duration, budget total (if parseable),
    // and travel period (if profiling gave us a leaveDate). Each chip is
    // optional; the strip collapses gracefully when data is missing.
    let budgetTotal: string | null = null;
    if (itinerary.budgetSummary) {
      try {
        const parsed = JSON.parse(itinerary.budgetSummary);
        const totalRow = parsed?.items?.find((it: any) => /totale|total/i.test(it.label));
        budgetTotal = totalRow?.total ?? totalRow?.perPerson ?? null;
      } catch { /* free-form budget — skip */ }
    }
    const leaveDate = profilingInput?.leaveDate ?? profilingInput?.travelDate ?? null;
    const periodLabel = leaveDate
      ? (() => {
          try {
            return new Intl.DateTimeFormat(lang === "it" ? "it-IT" : "en-US", { month: "short", day: "numeric" }).format(new Date(leaveDate));
          } catch { return null; }
        })()
      : null;

    const tripGlance = (
      <>
        <div className="glance-chip">
          <span className="glance-ic">◐</span>
          <strong>{cinematicData.duration}</strong>
        </div>
        {budgetTotal && (
          <div className="glance-chip">
            <span className="glance-ic">€</span>
            <strong>{budgetTotal}</strong>
          </div>
        )}
        {periodLabel && (
          <div className="glance-chip">
            <span className="glance-ic">◇</span>
            <strong>{periodLabel}</strong>
          </div>
        )}
        {cinematicData.country && (
          <div className="glance-chip">
            <span className="glance-ic">◯</span>
            <strong>{cinematicData.country}</strong>
          </div>
        )}
      </>
    );

    return (
      <div className="min-h-screen" style={{ background: "transparent" }} id="itinerary-pdf-content">
        <ItineraryCinematic
          data={cinematicData}
          tripGlance={tripGlance}
          practicalSection={<OverviewTab itinerary={itinerary} />}
          bookingSection={<BookTab urls={affiliateUrls} region={region} destinationName={itinerary.destinationName ?? ""} profilingInput={profilingInput} itineraryId={itinerary.id} />}
          onSavePdf={handleSavePdf}
          onStartOver={() => setLocation("/")}
          onBack={() => setLocation("/destinations")}
          onEdit={enterEditMode}
        />
      </div>
    );
  }

  return (
 <div className="min-h-screen" style={{ background: "transparent" }} id="itinerary-pdf-content">
      {/* HERO */}
      <div className="relative overflow-hidden" style={{ height: "65vh", minHeight: 420 }}>
        {(itinerary?.heroImageUrl || itinerary?.imageUrl) ? (
          <img src={itinerary?.heroImageUrl || itinerary?.imageUrl} alt={itinerary?.destinationName} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : <div className="absolute inset-0 bg-gradient-to-br from-[#1a0a14] to-[#0a0814]" />}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0814] via-[#0a0814]/30 to-transparent" />
        <div className="absolute top-6 left-4 md:left-10 z-20">
          <Link href="/destinations" className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-medium transition-colors bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
            <ArrowLeft className="w-4 h-4" /> {t('itin.back')}
          </Link>
        </div>
        <div className="absolute top-6 right-4 md:right-10 z-20 flex gap-2">
          <button onClick={handleSavePdf} className="p-2.5 text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm rounded-full border border-white/10"><Printer className="w-4 h-4" /></button>
          <button className="p-2.5 text-white/60 hover:text-white transition-colors bg-black/30 backdrop-blur-sm rounded-full border border-white/10"><Share2 className="w-4 h-4" /></button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[3px] rounded-full bg-[#E94560]/20 text-[#E94560] border border-[#E94560]/30 mb-3">{t('itin.label')}</span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-white tracking-tight leading-tight mb-3 max-w-3xl">{itinerary?.destinationName}</h1>
            <div className="flex items-center gap-4 text-white/45 text-sm">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {itinerary?.days?.length || 7} {t('itin.experienceDays')}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* WHYYOURS */}
      {itinerary?.whyYours && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mx-4 md:mx-10 -mt-1 mb-6 z-10 relative">
          <div className="max-w-3xl mx-auto p-5 md:p-7 rounded-[20px] border border-[#E94560]/20 relative overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(233,69,96,0.07), rgba(233,69,96,0.02))" }}>
            <div className="absolute top-0 left-0 w-1 h-full bg-[#E94560] rounded-l-[20px]" />
            <p className="text-[10px] font-bold uppercase tracking-[3px] text-[#E94560] mb-2">{t('itin.whyYours')}</p>
            <p className="font-serif italic text-lg md:text-xl text-white/85 leading-relaxed">"{itinerary.whyYours}"</p>
          </div>
        </motion.div>
      )}

      {/* HIGHLIGHTS */}
      {itinerary.highlights && itinerary.highlights.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 md:px-10 mb-5 max-w-3xl mx-auto">
          {itinerary.highlights.map((h: string, i: number) => (
            <span key={i} className="px-3 py-1.5 rounded-full text-xs font-bold text-[#E94560]" style={{ background: "rgba(233,69,96,0.08)", border: "1px solid rgba(233,69,96,0.2)" }}>{h}</span>
          ))}
        </div>
      )}

      {/* TAB BAR */}
      <div className="sticky top-0 z-40 px-4 md:px-10 mb-0" style={{ background: "rgba(10,8,20,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="max-w-4xl mx-auto flex gap-0">
          {([
            {
              id: "itin",
              label: lang === "it" ? "Itinerario" : "Itinerary",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
            },
            {
              id: "book",
              label: lang === "it" ? "Prenota" : "Book",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
            },
            {
              id: "overview",
              label: lang === "it" ? "Panoramica" : "Overview",
              icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
            },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ flex: 1, padding: "14px 8px", fontSize: 12, fontWeight: 700, color: activeTab === tab.id ? "#E94560" : "rgba(255,255,255,0.35)", background: "transparent", border: "none", borderBottom: `2px solid ${activeTab === tab.id ? "#E94560" : "transparent"}`, cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="max-w-4xl mx-auto">

        {/* ITINERARIO TAB */}
        {activeTab === "itin" && (
          <div className="px-4 md:px-8 pt-6 pb-24">
            {/* Header con bottone modifica */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-white">{t('itin.daybyday')}</h2>
                {editMode && <p className="text-xs text-[#E94560] mt-1">Modalità modifica — trascina i giorni per riordinarli</p>}
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button onClick={enterEditMode}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}>
                    <Pencil style={{ width: 13, height: 13 }} /> Modifica
                  </button>
                ) : (
                  <>
                    <button onClick={restoreOriginal} title="Ripristina originale"
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                      <RotateCcw style={{ width: 12, height: 12 }} /> Ripristina
                    </button>
                    <button onClick={cancelEdit}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 10, fontSize: 12, fontWeight: 700, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)", cursor: "pointer" }}>
                      <X style={{ width: 12, height: 12 }} /> Annulla
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Days list — with or without DnD */}
            {editMode ? (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={editedDays.map(d => d.dayNumber)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {editedDays.map((day, index) => (
                      <SortableDayCard
                        key={day.dayNumber} day={day} index={index}
                        isOpen={openDays.has(index)}
                        onToggle={() => setOpenDays(prev => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; })}
                        isPeak={index === peakDayIndex || index === peakDayIndex + 1}
                        t={t} itineraryId={itinerary?.id ?? 0}
                        onDayRegenerated={(dayIndex, newDay) => { if (itinerary) { itinerary.days[dayIndex] = newDay; refetch(); } }}
                        editMode={editMode} onDayChange={handleDayChange}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-4">
                {(itinerary?.days ?? []).map((day: any, index: number) => (
                  <motion.div key={index} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <DayCard
                      day={day} isOpen={openDays.has(index)}
                      onToggle={() => setOpenDays(prev => { const next = new Set(prev); if (next.has(index)) next.delete(index); else next.add(index); return next; })}
                      index={index} isPeak={index === peakDayIndex || index === peakDayIndex + 1}
                      t={t} itineraryId={itinerary?.id ?? 0}
                      onDayRegenerated={(dayIndex, newDay) => { if (itinerary) { itinerary.days[dayIndex] = newDay; refetch(); } }}
                      editMode={false} onDayChange={() => {}}
                    />
                  </motion.div>
                ))}
              </div>
            )}

            {/* Save bar — sticky bottom in edit mode */}
            {editMode && (
              <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-3 px-4 py-3"
                style={{ background: "rgba(10,8,20,0.97)", borderTop: "1px solid rgba(233,69,96,0.25)", backdropFilter: "blur(20px)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  {saveError ? <span style={{ color: "#E94560" }}>{saveError}</span> : "Le modifiche vengono salvate sul server"}
                </div>
                <button onClick={handleSaveEdit} disabled={isSaving}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, background: isSaving ? "rgba(233,69,96,0.4)" : "#E94560", color: "white", border: "none", cursor: isSaving ? "not-allowed" : "pointer", transition: "all 0.2s" }}>
                  <Save style={{ width: 14, height: 14 }} />
                  {isSaving ? "Salvataggio..." : "Salva modifiche"}
                </button>
              </div>
            )}

            {/* Closing */}
            {!editMode && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                className="relative rounded-[28px] overflow-hidden mt-8" style={{ background: "linear-gradient(135deg, #2a1018, #1a0d14)" }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(233,69,96,0.10),transparent_60%)]" />
                <div className="relative z-10 p-8 md:p-12 text-center space-y-6">
                  <Wind className="w-7 h-7 text-[#E94560]/40 mx-auto" />
                  <p className="text-white/75 font-serif italic text-lg md:text-2xl max-w-xl mx-auto leading-relaxed">"{itinerary.closingMessage}"</p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button onClick={handleSavePdf} className="px-6 py-3 rounded-2xl border border-white/15 text-white font-bold text-sm hover:bg-white/5 transition-all">{t('itin.pdf')}</button>
                    <button onClick={() => setLocation("/")} className="px-6 py-3 rounded-2xl bg-white text-[#0a0814] font-bold text-sm hover:bg-white/90 transition-all">{t('itin.startover')}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === "book" && <BookTab urls={affiliateUrls} region={region} destinationName={itinerary.destinationName ?? ""} profilingInput={profilingInput} itineraryId={itinerary.id} />}
        {activeTab === "overview" && <OverviewTab itinerary={itinerary} />}
      </div>
    </div>
  );
}

// ── DAY CARD ──────────────────────────────────────────────────────────────────
function DayCard({ day, isOpen, onToggle, index, isPeak, t, itineraryId, onDayRegenerated, editMode, onDayChange, dragHandleProps }: {
  day: any; isOpen: boolean; onToggle: () => void; index: number; isPeak: boolean;
  t: (key: string) => string; itineraryId: number; onDayRegenerated: (dayIndex: number, newDay: any) => void;
  editMode: boolean; onDayChange: (index: number, updated: any) => void; dragHandleProps?: any;
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
      const res = await fetch(`/api/itinerary/${itineraryId}/regenerate-day`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dayIndex: index, feedback: regenPrompt }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      localStorage.setItem(storageKey, String(getRegenCount() + 1));
      onDayRegenerated(index, data.day);
      setShowRegenModal(false); setRegenPrompt("");
    } catch { alert("Errore durante la rigenerazione."); }
    setIsRegenerating(false);
  };

  const slots = [
  { key: "morning", icon: "🌅", label: t("itin.morning"), text: day.morning, color: "#E94560", link: day.affiliateLinks?.civitatis_morning ?? day.affiliateLinks?.musement_morning ?? day.affiliateLinks?.klook_morning ?? day.affiliateLinks?.viator_morning ?? day.affiliateLinks?.expedia_flights, placeLink: day.affiliateLinks?.civitatis_place_morning ?? day.affiliateLinks?.musement_place_morning ?? day.affiliateLinks?.klook_place_morning ?? day.affiliateLinks?.viator_place_morning, isActivity: true },
    { key: "lunch", icon: "🍽️", label: t("itin.lunch"), text: day.lunch, color: "#FF8C42", link: day.affiliateLinks?.thefork_lunch ?? day.affiliateLinks?.tripadvisor_lunch, isActivity: false },
    { key: "afternoon", icon: "☀️", label: t("itin.afternoon"), text: day.afternoon, color: "#4ECDC4", link: day.affiliateLinks?.civitatis_afternoon ?? day.affiliateLinks?.musement_afternoon ?? day.affiliateLinks?.klook_afternoon ?? day.affiliateLinks?.viator_afternoon ?? day.affiliateLinks?.hotels_hotel, placeLink: day.affiliateLinks?.civitatis_place_afternoon ?? day.affiliateLinks?.musement_place_afternoon ?? day.affiliateLinks?.klook_place_afternoon ?? day.affiliateLinks?.viator_place_afternoon, isActivity: true },
    { key: "lunch", icon: "🍽️", label: t("itin.lunch"), text: day.lunch, color: "#FF8C42", link: day.affiliateLinks?.thefork_lunch ?? day.affiliateLinks?.tripadvisor_lunch, isActivity: false },
    { key: "afternoon", icon: "☀️", label: t("itin.afternoon"), text: day.afternoon, color: "#4ECDC4", link: day.affiliateLinks?.getyourguide_afternoon ?? day.affiliateLinks?.klook_afternoon ?? day.affiliateLinks?.viator_afternoon ?? day.affiliateLinks?.hotels_hotel, placeLink: day.affiliateLinks?.getyourguide_place_afternoon ?? day.affiliateLinks?.klook_place_afternoon ?? day.affiliateLinks?.viator_place_afternoon, isActivity: true },
    { key: "evening", icon: "🌙", label: t("itin.evening"), text: day.evening, color: "#9B59B6", link: day.affiliateLinks?.thefork_evening ?? day.affiliateLinks?.tripadvisor_evening, isActivity: false },
  ];

  return (
    <div className="rounded-[20px] overflow-hidden transition-all duration-300"
  style={{ background: editMode ? "rgba(233,69,96,0.08)" : (isPeak ? "rgba(233,69,96,0.10)" : isOpen ? "rgba(233,69,96,0.06)" : "rgba(233,69,96,0.04)"), border: editMode ? "1px solid rgba(233,69,96,0.25)" : (isPeak ? (isOpen ? "1.5px solid rgba(233,69,96,0.45)" : "1px solid rgba(233,69,96,0.30)") : (isOpen ? "1px solid rgba(233,69,96,0.20)" : "1px solid rgba(233,69,96,0.12)")) }}>
      <div className="flex items-stretch gap-0">
        {/* Drag handle — solo in edit mode */}
        {editMode && (
          <div {...dragHandleProps} style={{ width: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "grab", background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, touchAction: "none" }}>
            <GripVertical style={{ width: 16, height: 16, color: "rgba(255,255,255,0.2)" }} />
          </div>
        )}

        <button onClick={onToggle} className="flex-1 text-left min-w-0">
          <div className="flex items-stretch gap-0">
            <div className="flex flex-col items-center justify-center shrink-0 relative overflow-hidden"
              style={{ width: 56, background: isPeak && !editMode ? "#E94560" : "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
              {isPeak && !editMode && <div className="absolute top-1.5 left-1/2 -translate-x-1/2"><Flame className="w-3 h-3 text-yellow-300/80" /></div>}
              <span className="font-serif font-bold" style={{ fontSize: 20, color: isPeak && !editMode ? "white" : "rgba(255,255,255,0.45)", lineHeight: 1.2, paddingTop: isPeak && !editMode ? 16 : 0 }}>{day.dayNumber}</span>
              <span className="text-[8px] uppercase tracking-[1px] font-bold" style={{ color: isPeak && !editMode ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)" }}>giorno</span>
            </div>
            <div className="flex-1 px-4 py-3.5 min-w-0">
              {isPeak && !editMode && <div className="text-[9px] font-bold text-[#E94560] uppercase tracking-[2px] mb-1">Momento clou</div>}
              {editMode ? (
                <input
                  value={day.title}
                  onChange={e => onDayChange(index, { title: e.target.value })}
                  onClick={e => e.stopPropagation()}
                  style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "6px 10px", fontSize: 13, fontWeight: 600, color: "white", outline: "none", fontFamily: "Georgia, serif" }}
                  placeholder="Titolo del giorno..."
                />
              ) : (
                <h4 className="font-serif font-bold leading-snug mb-2" style={{ fontSize: 14, color: isOpen || isPeak ? "white" : "rgba(255,255,255,0.65)" }}>{day.title}</h4>
              )}
              {!isOpen && !editMode && (
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {slots.map(slot => {
                    if (!slot.text || slot.text.length < 3) return null;
                    const keyword = slot.text.split(/[—–,.(]/)[0].trim().split(' ').slice(0, 3).join(' ');
                    if (!keyword || keyword.length < 2) return null;
                    return (
                      <span key={slot.key} className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${slot.color}15`, color: `${slot.color}99`, border: `1px solid ${slot.color}25` }}>
                        {slot.icon} <span style={{ maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{keyword}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="flex items-center pr-3">
              <ChevronDown className="w-4 h-4 transition-transform duration-300" style={{ color: isOpen ? "#E94560" : "rgba(255,255,255,0.25)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
            </div>
          </div>
        </button>
      </div>

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
              const linkKey = slot.key === "morning" ? (day.affiliateLinks?.getyourguide_morning ? "getyourguide_morning" : "klook_morning") : slot.key === "lunch" ? "thefork_lunch" : slot.key === "afternoon" ? (day.affiliateLinks?.getyourguide_afternoon ? "getyourguide_afternoon" : "hotels_hotel") : "thefork_evening";
              const linkLabel = day.affiliateLabels?.[linkKey];
              return (
                <div key={slot.key} style={{ display: "flex", borderTop: si > 0 ? "1px solid rgba(255,255,255,0.04)" : "none", background: si % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                  <div className="flex flex-col items-center pt-4 pb-3 shrink-0 relative" style={{ width: 50, borderRight: "1px solid rgba(255,255,255,0.04)", background: `${slot.color}05` }}>
                    <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: `linear-gradient(180deg, ${slot.color}, ${slot.color}30)` }} />
                    <span className="text-lg leading-none mb-1.5">{slot.icon}</span>
                    <span className="text-[8px] font-bold uppercase tracking-[1px] text-center" style={{ color: `${slot.color}80` }}>{slot.label}</span>
                  </div>
                  <div className="flex-1 px-4 py-3.5 min-w-0">
                    {editMode ? (
                      <textarea
                        value={slot.text}
                        onChange={e => onDayChange(index, { [slot.key]: e.target.value })}
                        rows={3}
                        style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 8, padding: "8px 10px", fontSize: 13, color: "rgba(255,255,255,0.85)", outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }}
                      />
                    ) : (
                      <>
                        <p className="font-medium mb-1" style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.6 }}>{main}</p>
                        {details && <p className="mb-3 text-[12px] text-white/40 leading-relaxed">{details}</p>}
                      </>
                    )}
                    {!editMode && (
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota libera */}
          {editMode && (
            <div className="mx-3 mb-3">
              <textarea
                value={day._note ?? ""}
                onChange={e => onDayChange(index, { _note: e.target.value })}
                placeholder="📝 Nota personale per questo giorno..."
                rows={2}
                style={{ width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "rgba(255,255,255,0.6)", outline: "none", resize: "none", fontFamily: "inherit" }}
              />
            </div>
          )}

          {/* Nota esistente in view mode */}
          {!editMode && day._note && (
            <div className="mx-3 mb-3 px-3 py-2 rounded-[10px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>📝 {day._note}</span>
            </div>
          )}

          {!editMode && (
            <div className="mx-3 mb-3 flex items-center justify-between">
              <span className="text-[10px] text-white/20">{MAX_REGENS - getRegenCount()} rigenerazioni rimaste</span>
              <button onClick={() => setShowRegenModal(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all hover:brightness-110" style={{ background: "rgba(233,69,96,0.07)", color: "#E94560", border: "1px solid rgba(233,69,96,0.18)" }}>
                ↺ Rigenera
              </button>
            </div>
          )}

          {showRegenModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
              <div className="w-full max-w-md rounded-[24px] p-6 space-y-4" style={{ background: "#1a0a14", border: "1px solid rgba(233,69,96,0.3)" }}>
                <h3 className="font-serif text-lg text-white font-bold">Rigenera il Giorno {day.dayNumber}</h3>
                <p className="text-white/50 text-sm">Dicci come vuoi cambiarlo — o lascia vuoto per una variazione casuale.</p>
                <textarea value={regenPrompt} onChange={e => setRegenPrompt(e.target.value)} placeholder="Es: voglio qualcosa di più rilassato..." rows={3} className="w-full text-white text-sm outline-none resize-none rounded-xl p-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }} />
                <div className="flex gap-3">
                  <button onClick={() => { setShowRegenModal(false); setRegenPrompt(""); }} className="flex-1 py-3 rounded-xl text-white/50 font-bold text-sm hover:text-white transition-all" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>Annulla</button>
                  <button onClick={handleRegen} disabled={isRegenerating} className="flex-1 py-3 rounded-xl font-bold text-sm text-white transition-all hover:brightness-110" style={{ background: isRegenerating ? "rgba(233,69,96,0.4)" : "#E94560" }}>{isRegenerating ? "Rigenerando..." : "Rigenera"}</button>
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
      <iframe src={mapUrl} className="w-full h-full" style={{ border: "none", minHeight: "300px" }} title={`Mappa di ${destinationName}`} allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </div>
  );
}
