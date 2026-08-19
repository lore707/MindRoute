/**
 * portrait-chips.ts — le righe del Ritratto, in forma di chip spegnibile.
 * ───────────────────────────────────────────────────────────────
 * Il pannello dei vincoli mostra all'utente cosa il sistema sta per usare di
 * lui. Perché non sia teatro devono valere due cose, e valgono entrambe qui:
 *
 *   1. i chip sono LE STESSE righe che ha letto nel Ritratto — stessa
 *      funzione pura (`visibleInsights`, `buildEvolution`), stesse chiavi i18n;
 *   2. il loro id è quello che il server usa per filtrare il prompt
 *      (`portraitChipId`), quindi spegnerne uno lo toglie DAVVERO dalla
 *      generazione — non lo nasconde soltanto.
 *
 * Se un giorno le due cose divergessero, il pannello mentirebbe. Per questo
 * l'id sta in shared/ e non qui.
 * ─────────────────────────────────────────────────────────────── */

import {
  visibleInsights, buildEvolution, computeConfidence, portraitChipId,
  AXIS_POLE_LABELS, type PortraitSignals,
} from "@shared/portrait-insights";
import type { AccountData } from "@/components/AccountCinematic";

export type PortraitChip = {
  id: string;
  label: string;
  /** Da dove viene: cambia solo il colore dell'etichetta nel pannello. */
  kind: "discovery" | "change" | "direction";
};

type Tx = (key: string, vars?: Record<string, string | number>) => string;

/** I chip di questo utente, nell'ordine in cui li legge nel Ritratto. */
export function portraitChips(data: AccountData, tx: Tx, lang: "it" | "en"): PortraitChip[] {
  const p = data.portrait;
  const trips = data.trips ?? [];

  const signals: PortraitSignals = {
    trips: trips.map(x => ({
      dest: x.dest, continent: x.continent, rawDate: x.rawDate, taken: x.taken, duration: x.duration,
    })),
    seek: p?.seek ?? [],
    avoid: p?.avoid ?? [],
    vector: data.traitVector ?? null,
    snapshotCount: p?.snapshotCount ?? (data.traitSnapshots?.length ?? 0),
    ownWords: p?.ownWords ?? null,
  };

  const confidence = computeConfidence(signals);
  const out: PortraitChip[] = [];

  // 1. Le scoperte — la sezione "cosa abbiamo scoperto" del Ritratto.
  for (const i of visibleInsights(signals, confidence)) {
    out.push({ id: portraitChipId.insight(i.id), label: tx(i.titleKey, i.vars), kind: "discovery" });
  }

  // 2. I cambiamenti + la direzione — la sezione "come stai cambiando".
  const evolution = buildEvolution(
    data.traitSnapshots ?? [],
    trips.map(x => ({ dest: x.dest, img: x.img, href: x.href, rawDate: x.rawDate })),
    lang,
  );
  for (const e of evolution) {
    const poles = AXIS_POLE_LABELS[lang]?.[e.axis];
    if (!poles) continue;
    const to = e.hi ? poles.hi : poles.lo;
    if (e.kind === "change") {
      // Un cambiamento può muoversi DENTRO lo stesso polo (da .56 a .78 resta
      // "alto"): lì "da X a X" sarebbe una frase rotta. Si dice che è andato
      // più a fondo nella stessa direzione, che è quello che è successo.
      const from = e.fromHi ? poles.hi : poles.lo;
      out.push({
        id: portraitChipId.change(e.axis),
        label: e.fromHi === e.hi
          ? (lang === "it" ? `Sempre più ${to}` : `More and more ${to}`)
          : (lang === "it" ? `Da ${from} a ${to}` : `From ${from} to ${to}`),
        kind: "change",
      });
    } else if (e.kind === "now") {
      out.push({
        id: portraitChipId.now,
        label: lang === "it" ? `Stai andando verso ${to}` : `You're heading toward ${to}`,
        kind: "direction",
      });
    }
  }

  return out;
}
