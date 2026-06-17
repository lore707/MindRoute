/**
 * flow-storage.ts — persistenza del flusso di generazione (profilo + 3
 * destinazioni proposte). Usa localStorage così i dati sopravvivono a un
 * refresh o a una chiusura accidentale del tab (sessionStorage si perdeva alla
 * chiusura), con fallback in LETTURA da sessionStorage per non rompere sessioni
 * già avviate prima di questo cambio. (1B audit)
 *
 * NB: `mind_streaming` (handoff verso lo stream di generazione) resta volontari-
 * amente in sessionStorage altrove — è effimero e specifico del tab.
 */
export const FLOW_KEYS = ["mind_profiling_input", "mind_destinations"] as const;

export function setFlow(key: string, value: string): void {
  try { localStorage.setItem(key, value); return; } catch { /* quota/private mode */ }
  try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
}

export function getFlow(key: string): string | null {
  try { const v = localStorage.getItem(key); if (v != null) return v; } catch { /* ignore */ }
  try { return sessionStorage.getItem(key); } catch { return null; }
}

export function clearFlow(key?: string): void {
  const keys = key ? [key] : FLOW_KEYS;
  for (const k of keys) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
    try { sessionStorage.removeItem(k); } catch { /* ignore */ }
  }
}
