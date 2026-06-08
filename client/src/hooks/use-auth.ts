import { useEffect, useState } from "react";

export type AuthUser = {
  id: number;
  name?: string;
  email?: string;
  avatar?: string | null;
} | null;

// Stato di login condiviso. /api/auth/me ritorna 401 da anonimo → user=null.
export function useAuth() {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active) {
          setUser(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return { user, loading };
}
