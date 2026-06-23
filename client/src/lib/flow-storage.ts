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

/* ──────────────────────────────────────────────────────────────────────────
 * Marker "generazione itinerario in corso". Se l'utente ricarica o torna
 * indietro mentre l'itinerario sta generando, al rientro su /destinations lo
 * usiamo per riprendere (poll del risultato) invece di perdere tutto. Il giro
 * LLM lato server arriva comunque a salvare su DB, quindi il poll lo ritrova.
 * ────────────────────────────────────────────────────────────────────────── */
const PENDING_GEN_KEY = "mind_pending_gen";
export type PendingGen = { destinationId: number; destinationName: string; heroUrl: string; ts: number };

export function setPendingGen(v: Omit<PendingGen, "ts">): void {
  setFlow(PENDING_GEN_KEY, JSON.stringify({ ...v, ts: Date.now() }));
}

export function getPendingGen(maxAgeMs = 5 * 60 * 1000): PendingGen | null {
  const raw = getFlow(PENDING_GEN_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as PendingGen;
    if (!p || typeof p.destinationId !== "number" || Date.now() - p.ts > maxAgeMs) {
      clearFlow(PENDING_GEN_KEY);
      return null;
    }
    return p;
  } catch {
    clearFlow(PENDING_GEN_KEY);
    return null;
  }
}

export function clearPendingGen(): void {
  clearFlow(PENDING_GEN_KEY);
}

/* ──────────────────────────────────────────────────────────────────────────
 * Progresso del quiz. Snapshot completo e consistente dello stato del quiz,
 * salvato ad ogni cambiamento. Se l'utente ricarica o torna indietro durante
 * il quiz, al rientro su /profiling riprende esattamente da dove era — non
 * perde le risposte già date. Si pulisce a quiz completato.
 * ────────────────────────────────────────────────────────────────────────── */
const QUIZ_KEY = "mind_quiz_progress";

export function saveQuizProgress(snapshot: Record<string, unknown>): void {
  setFlow(QUIZ_KEY, JSON.stringify({ ...snapshot, ts: Date.now() }));
}

export function loadQuizProgress<T = any>(maxAgeMs = 6 * 60 * 60 * 1000): T | null {
  const raw = getFlow(QUIZ_KEY);
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { ts?: number } & T;
    if (!p || typeof p.ts !== "number" || Date.now() - p.ts > maxAgeMs) {
      clearFlow(QUIZ_KEY);
      return null;
    }
    return p as T;
  } catch {
    clearFlow(QUIZ_KEY);
    return null;
  }
}

export function clearQuizProgress(): void {
  clearFlow(QUIZ_KEY);
}
