/**
 * DayMap — la mappa di UN giorno, con orari e nomi scritti accanto ai pin.
 * Usata a tutto schermo dalla schermata 4 e come metà destra del Giorno su
 * desktop: stesso componente, stesso stato, nessuna duplicazione.
 * ─────────────────────────────────────────────────────────────── */
import { Suspense, lazy, useMemo } from "react";
import { useFlow } from "./context";

const RouteMap = lazy(() => import("@/components/RouteMap"));

export function DayMap({ n, active = true, onSelect }: {
  n: number;
  active?: boolean;
  onSelect?: (momentId: string | null) => void;
}) {
  const f = useFlow();

  const points = useMemo(() => (f.data.mapPoints ?? [])
    .filter(p => typeof p.lat === "number" && typeof p.lng === "number")
    .map(p => ({
      lat: p.lat!, lng: p.lng!, label: p.label, day: p.day, slot: p.slot, category: p.category,
      momentId: p.momentId, imageUrl: p.imageUrl, durationLabel: p.durationLabel, bestTime: p.bestTime,
      kindLabel: p.kindLabel, desc: p.desc, bookable: p.bookable, ctaUrl: p.ctaUrl, cta: p.cta,
      ctaProvider: p.ctaProvider, ctaPrice: p.ctaPrice, type: p.type,
    })), [f.data.mapPoints]);

  const hasDayPoints = points.some(p => p.day === n);

  if (!hasDayPoints) {
    return <div className="mrf-map"><div className="mrf-map-empty">{f.t("if.map.noPoints")}</div></div>;
  }

  return (
    <div className="mrf-map">
      <Suspense fallback={<div className="mrf-map-empty">{f.t("if.loading")}</div>}>
        {/* Niente `key` per giorno: il remount ricreerebbe la mappa a ogni
            cambio (flash, tile ricaricate, cache dei percorsi persa). */}
        <RouteMap
          points={points}
          center={f.data.mapCenter}
          destination={f.data.destination}
          itineraryId={f.itineraryId}
          t={f.t}
          lang={f.lang}
          initialDay={n}
          active={active}
          hideDayBar
          bare
          timeLabels
          onSelectMoment={(id) => onSelect?.(id)}
          onOpenDay={(dayN, momentId) => { if (momentId) f.goMoment(dayN, momentId); else f.goDay(dayN); }}
          onDayChange={(d) => { if (d != null && d !== n) f.goMap(d); }}
          onBook={(type, dayN) => f.markClicked(type, dayN ?? n)}
        />
      </Suspense>
    </div>
  );
}
