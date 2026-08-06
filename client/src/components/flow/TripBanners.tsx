/**
 * TripBanners — le due domande che rendono reale il viaggio, portate nel flusso
 * a schermate (prima vivevano dentro la Panoramica del vecchio dashboard).
 *
 *  · Date reali — il quiz spesso cattura solo il mese, quindi le date generate
 *    sono un segnaposto. Qui l'utente fissa QUANDO parte davvero: è il
 *    prerequisito perché il sistema sappia che il viaggio è passato.
 *  · "Ci sei andato?" — a viaggio finito, la risposta che trasforma il profilo
 *    da sognato a reale (pesa 2.2× nel prior dei tratti).
 *
 * L'opt-in email è GDPR: MAI pre-spuntato, e il consenso è contestuale a
 * questo viaggio.
 * ─────────────────────────────────────────────────────────────── */
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { shouldAskCheckin } from "@shared/trip-status";

export function TravelDatesBanner({ itineraryId, tripMeta, lang, onConfirmed }: {
  itineraryId?: number; tripMeta: any; lang: string; onConfirmed?: () => void;
}) {
  const L = (it: string, en: string) => (lang === "it" ? it : en);
  const confirmed = tripMeta?.travel_dates_confirmed === true;
  const [dismissed, setDismissed] = useState(false);
  const [from, setFrom] = useState<string>(tripMeta?.travel_dates?.start ?? "");
  const [to, setTo] = useState<string>(tripMeta?.travel_dates?.end ?? "");
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (confirmed || dismissed || !itineraryId) return null;

  const valid = !!from && !!to && to >= from;
  const save = async () => {
    if (!valid || saving) return;
    setSaving(true); setErr(null);
    try {
      await apiRequest("PATCH", `/api/itinerary/${itineraryId}/travel-dates`, {
        start: from, end: to, ...(emailOptIn ? { emailOptIn: true } : {}),
      });
      onConfirmed?.();
    } catch {
      setErr(L("Non è stato possibile salvare le date. Riprova.", "Couldn't save the dates. Try again."));
      setSaving(false);
    }
  };

  return (
    <section className="mrf-card mrf-banner">
      <div className="mrf-banner-h">{L("Quando parti davvero?", "When are you actually going?")}</div>
      <p className="mrf-banner-s">
        {L("Fissa le date reali: il tuo compagno di viaggio saprà a che punto sei — e a viaggio finito potrà chiederti com'è andata.",
          "Set your real dates: your travel companion will know where you are — and once the trip is over it can ask how it went.")}
      </p>
      <div className="mrf-banner-form">
        <label className="mrf-date">
          <span>{L("Partenza", "Departure")}</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="mrf-date">
          <span>{L("Rientro", "Return")}</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
      </div>
      <label className="mrf-optin">
        <input type="checkbox" checked={emailOptIn} onChange={(e) => setEmailOptIn(e.target.checked)} />
        <span>
          {L("Avvisami via email quando è il momento di prenotare e per consigli su questo viaggio.",
            "Email me when it's time to book, plus tips for this trip.")}
          {" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
        </span>
      </label>
      <div className="mrf-banner-acts">
        <button className="mrf-pill acc sm" disabled={!valid || saving} onClick={save}>
          {saving ? L("Salvo…", "Saving…") : L("Conferma date", "Confirm dates")}
        </button>
        <button className="mrf-pill sm" onClick={() => setDismissed(true)}>{L("Non ora", "Not now")}</button>
      </div>
      {err && <p className="mrf-hint" style={{ color: "var(--acc)" }}>{err}</p>}
    </section>
  );
}

export function TripCheckinBanner({ itineraryId, itinerary, lang, onAnswered }: {
  itineraryId?: number; itinerary: any; lang: string; onAnswered?: () => void;
}) {
  const L = (it: string, en: string) => (lang === "it" ? it : en);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState<null | "confirmed" | "skipped">(null);
  const [err, setErr] = useState<string | null>(null);

  if (dismissed || !itineraryId || !shouldAskCheckin(itinerary)) return null;

  const answer = async (status: "confirmed" | "skipped") => {
    if (saving) return;
    setSaving(status); setErr(null);
    try {
      await apiRequest("PATCH", `/api/itinerary/${itineraryId}/trip-status`, { status });
      onAnswered?.();
    } catch {
      setErr(L("Non è stato possibile salvare. Riprova.", "Couldn't save. Try again."));
      setSaving(null);
    }
  };

  const dest = itinerary?.destinationName ?? L("questo viaggio", "this trip");
  return (
    <section className="mrf-card mrf-banner">
      <div className="mrf-banner-h">{L(`Ci sei andato/a a ${dest}?`, `Did you make it to ${dest}?`)}</div>
      <p className="mrf-banner-s">
        {L("Dimmelo e il tuo profilo di viaggiatore diventa reale: le prossime proposte impareranno da dove sei stato davvero, non solo da ciò che sognavi.",
          "Tell me and your traveller profile becomes real: your next matches learn from where you actually went, not just what you dreamed.")}
      </p>
      <div className="mrf-banner-acts">
        <button className="mrf-pill acc sm" disabled={!!saving} onClick={() => answer("confirmed")}>
          {saving === "confirmed" ? L("Salvo…", "Saving…") : L("Sì, ci sono stato/a", "Yes, I went")}
        </button>
        <button className="mrf-pill sm" disabled={!!saving} onClick={() => answer("skipped")}>
          {saving === "skipped" ? L("Salvo…", "Saving…") : L("No, saltato", "No, skipped it")}
        </button>
        <button className="mrf-pill sm" onClick={() => setDismissed(true)}>{L("Non ora", "Not now")}</button>
      </div>
      {err && <p className="mrf-hint" style={{ color: "var(--acc)" }}>{err}</p>}
    </section>
  );
}
