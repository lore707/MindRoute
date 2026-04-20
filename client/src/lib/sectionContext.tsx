import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type SectionVariant = "hero" | "map" | "content" | "cta";

interface CtxType {
  variant: SectionVariant;
  setVariant: (v: SectionVariant) => void;
}

const Ctx = createContext<CtxType>({ variant: "hero", setVariant: () => {} });

export function SectionProvider({ children }: { children: ReactNode }) {
  const [variant, setVariant] = useState<SectionVariant>("hero");
  return <Ctx.Provider value={{ variant, setVariant }}>{children}</Ctx.Provider>;
}

export const useSectionVariant = () => useContext(Ctx);
