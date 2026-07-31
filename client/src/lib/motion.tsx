/**
 * motion.tsx — sistema di motion condiviso del sito.
 * ───────────────────────────────────────────────────────────────
 * Un solo linguaggio: stesse curve, stessi tempi, stesse varianti. Nato per la
 * landing cinematografica, pensato per estendersi a quiz e itinerario.
 *
 * Accessibilità: avvolgi l'albero in <MotionConfig reducedMotion="user"> (già
 * fatto sulla landing) → Framer neutralizza gli spostamenti per chi ha
 * "riduci movimento" attivo. In più c'è un guard globale in index.css per le
 * animazioni CSS pure (Ken Burns ecc.). Nessuna animazione è mai bloccante:
 * gli elementi partono nascosti solo quando animati; con reduced-motion sono
 * visibili da subito.
 *
 * Regola d'oro: <Stagger>/<StaggerItem>/<Reveal> RENDERIZZANO l'elemento
 * originale (stesso tag, stessa className, stesso style) — non aggiungono un
 * wrapper — così le griglie CSS (grid/flex su figli diretti) non si rompono.
 */
import { motion, MotionConfig, type Variants } from "framer-motion";
import type { CSSProperties, ReactNode } from "react";

// Curva cinematografica (easeOut espressivo) e durate condivise.
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DUR = { fast: 0.4, base: 0.6, slow: 0.9 } as const;

// Spring "premium": morbida ma reattiva, per sheet/drawer e micro-interazioni.
// Solo transform/opacity → sempre 60fps, mai layout thrash.
export const SPRING = { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.9 };
export const SPRING_SOFT = { type: "spring" as const, stiffness: 210, damping: 30, mass: 1 };
// Feedback tattile riusabile (whileTap/whileHover) — non bloccante, GPU.
export const tap = { scale: 0.97 };
export const hoverPop = { y: -3 };

// viewport di default: `amount` basso + margine negativo in basso → il reveal
// scatta appena l'elemento affiora, così il contenuto NON resta mai invisibile
// "in attesa" sotto la piega.
const VIEWPORT = { once: true, amount: 0.08, margin: "0px 0px -8% 0px" } as const;

// QA headless: con ?noanim=1 Reveal/Stagger renderizzano subito visibili
// (niente initial/whileInView). Sotto virtual-time gli IntersectionObserver
// non scattano e le sezioni resterebbero a opacity 0 — stessa convenzione
// già usata da QuizFast. In produzione nessuno passa il param.
const NOANIM = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("noanim") === "1";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};
// Solo opacità: per gli elementi che hanno un hover CSS su `transform` (card
// con lift), così l'entrata non lascia una transizione transform che
// confliggerebbe con il :hover.
export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DUR.base, ease: EASE } },
};
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 34 },
  show: { opacity: 1, x: 0, transition: { duration: DUR.slow, ease: EASE } },
};
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: DUR.base, ease: EASE } },
};
export const staggerParent = (stagger = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});

type El = keyof JSX.IntrinsicElements;
interface Common {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: El;
  /** true = anima al montaggio (hero, above the fold); false = quando entra nel viewport. */
  mount?: boolean;
  amount?: number;
  [key: string]: any;
}

function pick(as: El) {
  return (motion as any)[as] ?? motion.div;
}

/** Blocco che appare (fade-up di default) al montaggio o all'ingresso nel viewport. */
export function Reveal({ children, className, style, as = "div", variants = fadeUp, mount = false, amount = 0.25, ...rest }: Common & { variants?: Variants }) {
  const M = pick(as);
  const trigger = NOANIM
    ? {}
    : mount
      ? { initial: "hidden" as const, animate: "show" as const }
      : { initial: "hidden" as const, whileInView: "show" as const, viewport: { ...VIEWPORT, amount } };
  return <M className={className} style={style} variants={NOANIM ? undefined : variants} {...trigger} {...rest}>{children}</M>;
}

/** Contenitore che scala i figli <StaggerItem> in sequenza. */
export function Stagger({ children, className, style, as = "div", stagger, delayChildren, mount = false, amount = 0.2, ...rest }: Common & { stagger?: number; delayChildren?: number }) {
  const M = pick(as);
  const trigger = NOANIM
    ? {}
    : mount
      ? { initial: "hidden" as const, animate: "show" as const }
      : { initial: "hidden" as const, whileInView: "show" as const, viewport: { ...VIEWPORT, amount } };
  return <M className={className} style={style} variants={NOANIM ? undefined : staggerParent(stagger, delayChildren)} {...trigger} {...rest}>{children}</M>;
}

/** Figlio di <Stagger>. Renderizza il tag originale con la sua className/style. */
export function StaggerItem({ children, className, style, as = "div", variants = fadeUp, ...rest }: Common & { variants?: Variants }) {
  const M = pick(as);
  return <M className={className} style={style} variants={NOANIM ? undefined : variants} {...rest}>{children}</M>;
}

export { MotionConfig };
