/**
 * 4 · MAPPA DEL GIORNO — lo stesso giorno, nello spazio.
 *
 * Il percorso si legge senza aprire niente: accanto a ogni pin l'orario e il
 * nome del posto. Linea continua dove il percorso è calcolato sulle strade
 * vere, tratteggiata dove è solo un collegamento stimato.
 *
 * Esiste come schermata solo su phone e tablet: da 1024px in su la mappa vive
 * accanto al giorno (lo shell reindirizza), perché lì c'è spazio per entrambi.
 * ─────────────────────────────────────────────────────────────── */
import { useFlow } from "./context";
import { DayMap } from "./DayMap";

export function DayMapScreen({ n }: { n: number }) {
  const f = useFlow();
  return <DayMap n={n} active onSelect={(id) => { if (id) f.goMoment(n, id); }} />;
}
