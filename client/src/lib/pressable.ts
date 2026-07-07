// Rende accessibile da tastiera un <div> cliccabile (card/option dei quiz,
// thumb della landing, card destinazione). Spread nel tag: <div {...pressable} …>.
// Enter/Space ri-innescano il click() dell'elemento, così l'handler resta uno
// solo (l'onClick già presente). Da NON usare su <button>/<a> nativi.
import type { KeyboardEvent } from "react";

export const pressable = {
  role: "button" as const,
  tabIndex: 0,
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    }
  },
};
