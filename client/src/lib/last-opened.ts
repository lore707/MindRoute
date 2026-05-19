/**
 * Tracking dell'ultimo itinerario aperto dall'utente.
 *
 * Usato dalla hero della pagina /my-account per scegliere la foto di sfondo:
 * la pagina si "sente viva" perché cambia copertina ogni volta che l'utente
 * esplora un viaggio diverso. localStorage anziché DB perché:
 *   - non vogliamo una migrazione né endpoint dedicato
 *   - il signal è inerentemente per-device (l'utente probabilmente apre
 *     l'itinerario sullo stesso device su cui guarda l'account)
 *   - fallback naturale al "più recente creato" se chiave assente
 *     (gestito dal consumer)
 */
const KEY = "mindroute:last_opened_itinerary_id";

export function setLastOpenedItinerary(id: number | string): void {
  try {
    localStorage.setItem(KEY, String(id));
  } catch {
    // localStorage può fallire in modalità privata / quota piena; ignoriamo
  }
}

export function getLastOpenedItinerary(): number | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
