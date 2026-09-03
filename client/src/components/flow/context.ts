/**
 * flow/context.ts — il contesto condiviso dalle sei schermate dell'itinerario.
 *
 * Lo stack non è una tab-bar travestita: ogni schermata ha il suo URL e il suo
 * ritorno. Ma i dati (giorni, momenti, prenotazioni, progresso) sono UNO SOLO,
 * caricati una volta dalla shell e letti da qui — così passare da Overview a
 * Tappa non rifà una fetch né perde il contesto.
 * ─────────────────────────────────────────────────────────────── */
import { createContext, useContext } from "react";
import type { ItineraryData, Moment } from "@/components/ItineraryCinematic";
import type { BookItem } from "@/lib/itinerary-booking";

export type Band = "mattina" | "pranzo" | "pomeriggio" | "sera";

export const BAND_COLOR: Record<Band, string> = {
  mattina: "#D4A853",
  pranzo: "#E08A4B",
  pomeriggio: "#6FB4A8",
  sera: "#9D7EBC",
};

export type FlowCtx = {
  data: ItineraryData;
  itinerary: any;
  itineraryId?: number;
  affiliateUrls: Record<string, string>;
  profilingInput: any;

  lang: "it" | "en";
  t: (k: string) => string;
  /** Scelta rapida fra due letterali già scritti (IT, EN). */
  L: (it: string, en: string) => string;
  /** t() con interpolazione {n}. */
  tx: (k: string, vars: Record<string, string | number>) => string;

  days: ItineraryData["days"];
  momentsByDay: Record<number, Moment[]>;
  /** Giorno grezzo v2 (numeri veri: durate, costi, km, trasferimenti). */
  rawDay: (n: number) => any | null;

  savedMomentIds?: Set<string>;
  onToggleSaved?: (momentId: string, moment: Moment) => void;

  /* prenotazioni */
  checked: Record<string, boolean>;
  clicked: Record<string, boolean>;
  logClick: (id: string | null) => void;
  toggleBooked: (id: string) => void;
  bookingItems: BookItem[];
  pct: number;
  pdfUnlocked: boolean;
  /** Registra il click affiliate partendo da un momento (tipo + giorno). */
  markClicked: (type?: string, day?: number | null) => void;

  /* navigazione */
  goOverview: () => void;
  goDay: (n: number) => void;
  goMoment: (n: number, momentId: string) => void;
  goMap: (n: number) => void;
  goLogistics: () => void;
  goEdit: (n?: number) => void;
  goHome: () => void;
  back: () => void;

  onSavePdf?: () => void;
  onShare?: () => void;
  onSaveDays?: (days: any[]) => Promise<void>;
  openStudio?: (day?: number) => void;
  refetch?: () => void;

  isDesktop: boolean;
};

export const FlowContext = createContext<FlowCtx | null>(null);

export function useFlow(): FlowCtx {
  const c = useContext(FlowContext);
  if (!c) throw new Error("useFlow deve stare dentro <FlowContext.Provider>");
  return c;
}

/** Etichetta oraria → fascia canonica. Stessa tabella di pages/Itinerary.tsx. */
export function bandOf(m: { band?: string; startTime?: string }): Band {
  const b = (m.band ?? "").toLowerCase();
  if (b === "pranzo" || b === "pomeriggio" || b === "sera" || b === "mattina") return b as Band;
  return "mattina";
}

/** "12:30" → minuti dall'inizio del giorno; null se non è un orario. */
export function minutesOf(hhmm?: string): number | null {
  if (!hhmm) return null;
  const m = String(hhmm).match(/^(\d{1,2})[:.](\d{2})/);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}
