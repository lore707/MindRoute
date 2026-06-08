import { type ReactNode } from "react";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/lib/i18n";

// Muro di login lato client per le pagine del flusso (quiz, destinazioni,
// generazione itinerario). Il vero gate è sul server (401); questo evita solo
// di mostrare schermate vuote/azioni che fallirebbero agli anonimi.
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { lang } = useI18n();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" aria-busy="true">
        <div
          className="w-7 h-7 rounded-full border-2 border-[#E94560]/30 border-t-[#E94560]"
          style={{ animation: "spin 0.7s linear infinite" }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!user) {
    const returnTo =
      typeof window !== "undefined" ? window.location.pathname + window.location.search : "/";
    const it = lang === "it";
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-3 text-foreground">
          {it ? "Accedi per continuare" : "Sign in to continue"}
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mb-8">
          {it
            ? "Per fare il quiz e generare il tuo itinerario serve un account. Bastano pochi secondi con Google."
            : "You need an account to take the quiz and generate your itinerary. It takes seconds with Google."}
        </p>
        <a
          href={`/auth/google?returnTo=${encodeURIComponent(returnTo)}`}
          className="inline-flex items-center gap-2 rounded-full bg-[#E94560] px-6 py-3 text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <User className="w-4 h-4" />
          {it ? "Accedi con Google" : "Sign in with Google"}
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
