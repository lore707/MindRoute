import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * /come-funziona — assorbita dalla nuova landing editoriale (redesign 2026-07):
 * la sezione "How it works" vive su "/" con id="how-it-works". Questa rotta
 * resta solo come redirect (link esterni/vecchi segnalibri/nav): rimanda alla
 * landing con l'hash, e LandingEditorial scrolla alla sezione al mount.
 * Nota: per gli utenti loggati "/" mostra la dashboard — va bene, il prodotto
 * lo conoscono già.
 */
export default function HowItWorks() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/#how-it-works", { replace: true });
  }, [navigate]);
  return null;
}
