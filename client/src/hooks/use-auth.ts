import { useEffect, useState } from "react";

export type AuthUser = {
  id: number;
  name?: string;
  email?: string;
  avatar?: string | null;
} | null;

// Richiesta /api/auth/me condivisa a livello di modulo: più componenti
// (App, Layout, AuthButton, CompanionDock, MyAccount) interrogano lo stato di
// login, e senza questa cache ognuno faceva la sua fetch (4 round-trip uguali
// sulla landing). Una sola promise, riusata da tutti. Si azzera solo al reload
// (il login passa da una navigazione full-page), quindi resta sempre fresca.
let mePromise: Promise<AuthUser> | null = null;
export function fetchMe(): Promise<AuthUser> {
  if (!mePromise) {
    mePromise = fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return mePromise;
}

// Stato di login condiviso. /api/auth/me ritorna 401 da anonimo → user=null.
export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchMe().then((data) => {
      if (active) {
        setUser(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
