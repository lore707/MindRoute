/**
 * GenerationRitual — la firma dell'attesa MindRoute (2026-07-18).
 * ───────────────────────────────────────────────────────────────
 * "Abbiamo capito abbastanza. Ora lasciaci trovare il viaggio che ti
 * somiglia." + checklist che si spunta passo dopo passo: trasforma il tempo
 * di generazione in narrazione invece che in una barra di caricamento.
 *
 * ONESTÀ (regola ferrea): i passi descrivono gli stadi REALI della pipeline
 * (matching → grounding → giornate in parallelo → prenotazioni → immagini).
 * L'avanzamento è temporizzato sul ritmo tipico, ma l'ULTIMO passo non si
 * spunta mai da timer: si completa solo quando la generazione finisce davvero
 * (= il componente viene smontato per navigare al risultato).
 */
import { useEffect, useState } from "react";
import "@/styles/generation-ritual.css";

type Props = {
  lede: string;          // riga grande serif ("Abbiamo capito abbastanza.")
  sub?: string;          // riga sotto ("Ora lasciaci trovare…")
  steps: string[];       // stadi reali, in ordine
  stepMs?: number;       // ritmo di avanzamento (default 12s)
};

export function GenerationRitual({ lede, sub, steps, stepMs = 12000 }: Props) {
  const [done, setDone] = useState(0); // quanti passi risultano completati
  useEffect(() => {
    const iv = window.setInterval(
      () => setDone((d) => Math.min(d + 1, Math.max(0, steps.length - 1))),
      stepMs,
    );
    return () => window.clearInterval(iv);
  }, [stepMs, steps.length]);

  return (
    <div className="genrit" role="status" aria-live="polite">
      <p className="genrit-lede">{lede}</p>
      {sub && <p className="genrit-sub">{sub}</p>}
      <ul className="genrit-steps">
        {steps.map((s, i) => {
          const state = i < done ? "done" : i === done ? "now" : "next";
          return (
            <li key={i} className={`genrit-step ${state}`}>
              <span className="genrit-ic" aria-hidden>
                {state === "done" ? "✓" : state === "now" ? <span className="genrit-spin" /> : ""}
              </span>
              <span className="genrit-tx">{s}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
