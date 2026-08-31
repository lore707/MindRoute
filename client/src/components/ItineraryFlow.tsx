/**
 * ItineraryFlow.tsx — l'itinerario come SEQUENZA, non come cruscotto.
 * ───────────────────────────────────────────────────────────────
 * Sostituisce ItineraryDashboard (sidebar + tab) con uno stack di sei
 * schermate, ciascuna con il proprio URL:
 *
 *   /itinerary/:id                    1 · Overview del viaggio
 *   /itinerary/:id/g/:n               2 · Giorno
 *   /itinerary/:id/g/:n/t/:mid        3 · Tappa
 *   /itinerary/:id/g/:n/mappa         4 · Mappa del giorno
 *   /itinerary/:id/logistica          5 · Logistica (trasporti+alloggio+note)
 *   /itinerary/:id/modifica           6 · Modifica itinerario
 *
 * URL veri e non stato locale: il tasto indietro del browser funziona, i link
 * sono condivisibili e ogni schermata è misurabile da sola.
 *
 * ≥1024px Giorno e Mappa smettono di essere due destinazioni e diventano due
 * metà della stessa schermata — è l'unica fusione, la sequenza resta identica.
 *
 * Presentational: consuma lo stesso ItineraryData del vecchio dashboard +
 * l'itinerario grezzo v2 per i numeri reali. Zero dato inventato.
 * ─────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Settings2, MoreVertical, Map as MapIcon, Sparkles, X } from "lucide-react";
import { unsplashSized } from "@/lib/img";
import { useI18n } from "@/lib/i18n";
import type { ItineraryData, Moment } from "@/components/ItineraryCinematic";
import {
  useBookings, buildBookingItems, computeStayAdvantage, bookIdForMoment,
} from "@/lib/itinerary-booking";
import { FlowContext, type FlowCtx } from "@/components/flow/context";
import { MomentScreen } from "@/components/flow/MomentScreen";
import { DayMapScreen } from "@/components/flow/DayMapScreen";
import { LogisticsScreen } from "@/components/flow/LogisticsScreen";
import { EditScreen } from "@/components/flow/EditScreen";
import { JourneyScreen } from "@/components/flow/JourneyScreen";
import "@/styles/flow.css";

const bg = (url: string, w: number, q = 70) => (url ? `url(${unsplashSized(url, w, q)})` : "none");

type Props = {
  data: ItineraryData;
  itinerary: any;
  affiliateUrls: Record<string, string>;
  profilingInput: any;
  onSavePdf?: () => void;
  onStartOver?: () => void;
  onShare?: () => void;
  itineraryId?: number;
  savedMomentIds?: Set<string>;
  onToggleSaved?: (momentId: string, moment: Moment) => void;
  onDatesConfirmed?: () => void;
  onBookingUpdated?: () => void;
  onSaveDays?: (days: any[]) => Promise<void>;
  onOpenStudio?: (day?: number) => void;
  /** Solo DevPreview: pilota lo stack senza toccare l'URL, così gli screenshot
   *  headless possono visitare le sei schermate senza login né DB. */
  previewPath?: string;
};

type Screen =
  | { k: "overview" }
  | { k: "day"; n: number }
  | { k: "moment"; n: number; mid: string }
  | { k: "map"; n: number }
  | { k: "logistics" }
  | { k: "edit"; n: number | null };

/** URL → schermata. Unica fonte di verità sul "dove sono". */
function parseScreen(path: string): Screen {
  const p = path.replace(/\/+$/, "");
  let m = p.match(/^\/itinerary\/\d+\/g\/(\d+)\/t\/(.+)$/);
  if (m) return { k: "moment", n: Number(m[1]), mid: decodeURIComponent(m[2]) };
  m = p.match(/^\/itinerary\/\d+\/g\/(\d+)\/mappa$/);
  if (m) return { k: "map", n: Number(m[1]) };
  m = p.match(/^\/itinerary\/\d+\/g\/(\d+)$/);
  if (m) return { k: "day", n: Number(m[1]) };
  if (/^\/itinerary\/\d+\/logistica$/.test(p)) return { k: "logistics" };
  m = p.match(/^\/itinerary\/\d+\/modifica(?:\/(\d+))?$/);
  if (m) return { k: "edit", n: m[1] ? Number(m[1]) : null };
  return { k: "overview" };
}

export function ItineraryFlow({
  data, itinerary, affiliateUrls, profilingInput,
  onSavePdf, onShare, itineraryId, savedMomentIds, onToggleSaved,
  onDatesConfirmed, onBookingUpdated, onSaveDays, onOpenStudio, previewPath,
}: Props) {
  const { t, lang } = useI18n();
  const [routerLoc, routerNav] = useLocation();
  // In preview lo stack vive in memoria: stesso componente, stesse schermate,
  // ma senza uscire dalla rotta di anteprima.
  const [previewLoc, setPreviewLoc] = useState(previewPath ?? "");
  const inPreview = previewPath !== undefined;
  const location = inPreview ? previewLoc : routerLoc;
  const setLocation = inPreview ? setPreviewLoc : routerNav;
  const L = useCallback((it: string, en: string) => (lang === "it" ? it : en), [lang]);
  const tx = useCallback((key: string, vars: Record<string, string | number>) => {
    let s = t(key);
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
    return s;
  }, [t]);

  const base = `/itinerary/${itineraryId ?? ""}`;
  const screen = useMemo(() => parseScreen(location), [location]);

  /* ── responsive reattivo (non una tantum: ruotare il tablet deve contare) ── */
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width:1024px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width:1024px)");
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Ogni cambio di schermata riparte dall'alto: uno stack che conserva lo
  // scroll della schermata precedente sembra un tab, non un percorso.
  useEffect(() => { window.scrollTo({ top: 0, behavior: "auto" }); }, [location]);

  const days = data.days ?? [];
  const dayCount = days.length;
  const firstDay = days[0]?.n ?? 1;

  const rawDay = useCallback(
    (n: number) => (itinerary?.days ?? []).find((d: any) => d?.day_number === n) ?? null,
    [itinerary],
  );

  /* ── prenotazioni: stessa logica server-backed di prima, invariata ── */
  const { checked, clicked, logClick, toggle } = useBookings(itineraryId, itinerary, onBookingUpdated);
  const pdfUnlocked = !!(checked.flight && checked.hotel);
  const stayAdvantage = useMemo(() => computeStayAdvantage(data.mapPoints), [data.mapPoints]);
  const peakDay = days[Math.floor((dayCount - 1) / 2)]?.n ?? 1;
  const bookingItems = useMemo(
    () => buildBookingItems({ data, affiliateUrls, profilingInput, dayCount, peakDay, stayAdvantage, lang }),
    [data, affiliateUrls, profilingInput, dayCount, peakDay, stayAdvantage, lang],
  );
  const doneCount = bookingItems.filter(i => checked[i.id]).length;
  const pct = Math.round((doneCount / (bookingItems.length || 1)) * 100);
  const markClicked = useCallback(
    (type?: string, day?: number | null) => logClick(bookIdForMoment(type, day)),
    // logClick è stabile nel comportamento (fire-and-forget) ma non nella
    // identità: la dipendenza va dichiarata comunque.
    [logClick],
  );

  /* ── navigazione ── */
  const nav = useMemo(() => ({
    goOverview: () => setLocation(base),
    goDay: (n: number) => setLocation(`${base}/g/${n}`),
    goMoment: (n: number, mid: string) => setLocation(`${base}/g/${n}/t/${encodeURIComponent(mid)}`),
    goMap: (n: number) => setLocation(`${base}/g/${n}/mappa`),
    goLogistics: () => setLocation(`${base}/logistica`),
    goEdit: (n?: number) => setLocation(n ? `${base}/modifica/${n}` : `${base}/modifica`),
    goHome: () => setLocation("/"),
  }), [base, setLocation]);

  // "Indietro" risale lo stack in modo prevedibile: non usa history.back(),
  // che dopo un deep-link o un refresh porterebbe fuori dal prodotto.
  const back = useCallback(() => {
    switch (screen.k) {
      case "moment": nav.goDay(screen.n); break;
      case "map": nav.goDay(screen.n); break;
      case "edit": screen.n ? nav.goDay(screen.n) : nav.goOverview(); break;
      case "day": nav.goOverview(); break;
      default: nav.goHome(); break;
    }
  }, [screen, nav]);

  /* ── Nudge proattivo del compagno: UNA riga contestuale calcolata dai dati
     reali e passata al CompanionDock via evento window (la chat non si apre). ── */
  const companionNudge = useMemo<{ text: string; seed: string } | null>(() => {
    const it = lang === "it";
    const counts = days.map(d => ({ n: d.n, c: data.momentsByDay[d.n]?.length ?? 0 }));
    const avg = counts.length ? counts.reduce((a, b) => a + b.c, 0) / counts.length : 0;
    const busiest = counts.slice().sort((a, b) => b.c - a.c)[0];
    const pace = String((profilingInput as any)?.pace ?? "").toLowerCase();
    const sens = String((profilingInput as any)?._l1?.sensation ?? "").toLowerCase();
    const relaxed = pace.includes("relax") || /relax|slow|stacc|disconn|lento|lentezza|quiet|calm|silenz|silence|respiro|breath/.test(sens);
    if (relaxed && busiest && avg > 0 && busiest.c >= Math.ceil(avg * 1.4) && busiest.c >= 4) {
      return {
        text: it ? `Il Giorno ${busiest.n} è il più pieno, ma cercavi relax. Lo alleggerisco?` : `Day ${busiest.n} is the fullest, yet you wanted to slow down. Want me to lighten it?`,
        seed: it ? `Il Giorno ${busiest.n} mi sembra troppo pieno per il ritmo rilassato che voglio. Puoi alleggerirlo?` : `Day ${busiest.n} feels too packed for the relaxed pace I want. Can you lighten it?`,
      };
    }
    const missEss = bookingItems.filter(i => i.tier === "essential" && !checked[i.id]);
    if (missEss.length > 0) {
      return {
        text: it ? `Ti mancano ${missEss.length} prenotazioni essenziali. Le chiudiamo?` : `${missEss.length} essential bookings still open. Shall we close them?`,
        seed: it ? "Aiutami a completare le prenotazioni essenziali che mancano." : "Help me complete the essential bookings I'm missing.",
      };
    }
    return null;
  }, [days, data.momentsByDay, profilingInput, bookingItems, checked, lang]);

  useEffect(() => {
    if (!companionNudge || typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("mindroute:companion-nudge", { detail: { itineraryId, ...companionNudge } }));
  }, [companionNudge, itineraryId]);

  /* ── ambiente: la foto del giorno in cui ci si trova ── */
  const currentDayN = "n" in screen && typeof screen.n === "number" ? screen.n : null;

  /* Gli sfondi sono i PAESAGGI del viaggio (tripMeta.ambient): foto larghe
   * della destinazione, diverse da quelle delle tappe — quelle raccontano un
   * posto preciso, queste dicono soltanto "sei lì".
   * Sugli itinerari generati prima che esistessero, si ricade sulle foto dei
   * giorni: meglio la fotografia di ieri che un fondo nero. */
  const ambient = useMemo<string[]>(() => {
    const fromMeta = (itinerary as any)?.tripMeta?.ambient;
    if (Array.isArray(fromMeta) && fromMeta.length > 0) {
      return fromMeta.filter((u: unknown): u is string => typeof u === "string" && !!u);
    }
    return days.map(d => d.img || data.heroImg).filter(Boolean);
  }, [itinerary, days, data.heroImg]);

  // Il paesaggio cambia con il giorno in cui ci si trova: attraversare il
  // viaggio si deve sentire anche dietro al contenuto.
  const activeImgIdx = ambient.length === 0
    ? 0
    : (Math.max(0, (currentDayN ?? firstDay) - 1)) % ambient.length;

  const ctx: FlowCtx = {
    data, itinerary, itineraryId, affiliateUrls, profilingInput,
    lang: lang as "it" | "en", t, L, tx,
    days, momentsByDay: data.momentsByDay, rawDay,
    savedMomentIds, onToggleSaved,
    checked, clicked, logClick, toggleBooked: toggle, bookingItems, pct, pdfUnlocked, markClicked,
    ...nav, back,
    // Un solo "ricarica": date confermate e prenotazioni aggiornate rileggono
    // entrambe l'itinerario dal server (il parent passa lo stesso refetch).
    onSavePdf, onShare, openStudio: onOpenStudio, refetch: () => { onDatesConfirmed?.(); onBookingUpdated?.(); },
    isDesktop,
  };

  /* ── header contestuale ── */
  const day = currentDayN != null ? days.find(d => d.n === currentDayN) : undefined;
  const momentTitle = (() => {
    if (screen.k !== "moment") return "";
    const ms = data.momentsByDay[screen.n] ?? [];
    const idx = ms.findIndex(m => m.id === screen.mid);
    return idx >= 0 ? tx("if.day", { n: screen.n }) + ` · ${L("Tappa", "Stop")} ${idx + 1}` : tx("if.day", { n: screen.n });
  })();

  const head: { title: string; sub?: string; right?: "settings" | "kebab" | "map" | "close" } = (() => {
    switch (screen.k) {
      case "day":
        return { title: `${tx("if.day", { n: screen.n })}${day?.arc ? ` · ${day.arc}` : ""}`, sub: day?.date || undefined, right: "kebab" };
      case "moment":
        return { title: momentTitle, sub: day?.date || undefined, right: "map" };
      case "map":
        return { title: `${tx("if.day", { n: screen.n })} · ${t("if.map.title")}`, sub: day?.date || undefined, right: "map" };
      case "logistics":
        return { title: t("if.log.title"), sub: data.destination, right: undefined };
      case "edit":
        return { title: t("if.ed.title"), sub: data.destination, right: "close" };
      default:
        return { title: data.destination, sub: data.country || undefined, right: "settings" };
    }
  })();

  const rightAction = () => {
    switch (head.right) {
      case "settings":
        return <button className="mrf-hbtn" onClick={nav.goLogistics} aria-label={t("if.log.title")}><Settings2 size={19} /></button>;
      case "kebab":
        return <button className="mrf-hbtn" onClick={() => nav.goEdit(currentDayN ?? undefined)} aria-label={t("if.ed.title")}><MoreVertical size={19} /></button>;
      case "map":
        return (
          <button className="mrf-hbtn"
            onClick={() => (screen.k === "map" ? nav.goDay(screen.n) : currentDayN && nav.goMap(currentDayN))}
            aria-label={t("if.map.title")}>
            <MapIcon size={19} />
          </button>
        );
      case "close":
        return <button className="mrf-hbtn" onClick={back} aria-label={t("if.close")}><X size={19} /></button>;
      default:
        return <span />;
    }
  };

  /* ── giorno inesistente nell'URL → riporta al primo, senza schermata nera ── */
  useEffect(() => {
    if (currentDayN == null || days.length === 0) return;
    if (!days.some(d => d.n === currentDayN)) nav.goDay(firstDay);
  }, [currentDayN, days, firstDay, nav]);

  /* ── ≥1024px: la Mappa vive dentro il Giorno, non come destinazione a sé ── */
  useEffect(() => {
    if (isDesktop && screen.k === "map") nav.goDay(screen.n);
  }, [isDesktop, screen, nav]);

  const body = (() => {
    switch (screen.k) {
      case "day": return <JourneyScreen n={screen.n} />;
      case "moment": return <MomentScreen n={screen.n} momentId={screen.mid} />;
      case "map": return <DayMapScreen n={screen.n} />;
      case "logistics": return <LogisticsScreen />;
      case "edit": return <EditScreen initialDay={screen.n ?? firstDay} onSaveDays={onSaveDays} />;
      default: return <JourneyScreen n={firstDay} />;
    }
  })();

  return (
    <FlowContext.Provider value={ctx}>
      <div className="mrf">
        <div className="mrf-bg" aria-hidden="true">
          {ambient.map((src, i) => (
            <div key={src + i}
              className={"mrf-bg-ph" + (activeImgIdx === i ? " on" : "")}
              style={{ backgroundImage: bg(src, isDesktop ? 1800 : 1100, 62) }} />
          ))}
        </div>
        <div className="mrf-grain" aria-hidden="true" />

        {screen.k !== "overview" && screen.k !== "day" && <header className={"mrf-head" + (stuck ? " stuck" : "")}>
          <button className="mrf-hbtn" onClick={back} aria-label={t("if.back")}><ArrowLeft size={20} /></button>
          <div className="mrf-htitle">
            <span className="t">{head.title}</span>
            {head.sub && <span className="s">{head.sub}</span>}
          </div>
          <div className="mrf-hactions">
            {onOpenStudio && screen.k !== "edit" && (
              <button className="mrf-studio-link" onClick={() => onOpenStudio(currentDayN ?? undefined)}>
                <Sparkles size={15} />
                <span>{L("Modifica in Studio", "Edit in Studio")}</span>
              </button>
            )}
            {rightAction()}
          </div>
        </header>}

        {body}
      </div>
    </FlowContext.Provider>
  );
}
