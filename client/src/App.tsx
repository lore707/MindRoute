import { Switch, Route, useRoute } from "wouter";
import { lazy, Suspense, useEffect } from "react";
import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import { RequireAuth } from "@/components/RequireAuth";
import { CookieBanner } from "@/components/CookieBanner";
import { useAuth, lastKnownAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";

// Landing stays eager (first paint must be instant). Every other route is
// code-split so its JS — and heavy deps like Leaflet (Itinerary) and Recharts
// (Account) — only download when that section is actually opened.
const Profiling = lazy(() => import("@/pages/Profiling"));
const QuizFast = lazy(() => import("@/pages/QuizFast"));
const Destinations = lazy(() => import("@/pages/Destinations"));
const Itinerary = lazy(() => import("@/pages/Itinerary"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const MyAccount = lazy(() => import("@/pages/MyAccount"));
const ItineraryStream = lazy(() => import("@/pages/ItineraryStream"));
const Compare = lazy(() => import("@/pages/Compare"));
const SharedItinerary = lazy(() => import("@/pages/SharedItinerary"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
// SOLO sviluppo: preview della dashboard con dati mock, per gli screenshot
// responsive senza login/DB. Esclusa dal bundle di produzione.
const DevPreview = import.meta.env.DEV ? lazy(() => import("@/pages/DevPreview")) : null;

// Lightweight, theme-matching fallback — avoids a white flash while a route
// chunk loads. Kept minimal so it never competes with the page that follows.
function PageFallback() {
  return (
    <div
      className="flex items-center justify-center min-h-[60vh]"
      style={{ background: "var(--surface, transparent)" }}
      aria-busy="true"
    >
      <div
        className="w-7 h-7 rounded-full border-2 border-[#E94560]/30 border-t-[#E94560]"
        style={{ animation: "spin 0.7s linear infinite" }}
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// Home auth-aware: l'utente loggato atterra direttamente sulla dashboard
// (MyAccount), l'anonimo sulla landing pubblica. Il vero gate resta lato
// server; qui scegliamo solo cosa montare alla rotta "/".
//
// NIENTE schermata di caricamento: mentre /api/auth/me è in volo (secondi, col
// DB a freddo) montiamo SUBITO la vista più probabile — l'ultimo stato noto.
// Se al resolve la stima era sbagliata (login/logout avvenuto altrove), la
// vista si scambia da sola: caso raro, costa un cambio di schermata, non
// un'attesa a vuoto per tutti.
function Home() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!loading && user) setLocation("/studio", { replace: true });
  }, [loading, setLocation, user]);
  if (loading) return lastKnownAuth() ? <PageFallback /> : <Landing />;
  return user ? <PageFallback /> : <Landing />;
}

function StudioTripRedirect() {
  const [, params] = useRoute("/studio/:id");
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (params?.id) setLocation(`/itinerary/${params.id}/g/1/mappa`, { replace: true });
  }, [params?.id, setLocation]);
  return <PageFallback />;
}

function StudioHomeRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    let cancelled = false;
    fetch("/api/my-trips?lang=it")
      .then(response => response.ok ? response.json() : [])
      .then((rows: Array<{ id?: number }>) => {
        if (cancelled) return;
        const id = rows.find(row => Number.isFinite(row.id))?.id;
        setLocation(id ? `/itinerary/${id}/g/1/mappa` : "/start", { replace: true });
      })
      .catch(() => { if (!cancelled) setLocation("/start", { replace: true }); });
    return () => { cancelled = true; };
  }, [setLocation]);
  return <PageFallback />;
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/come-funziona" component={HowItWorks} />
          {/* Onboarding L1 (fast lane) — entrata principale del funnel. */}
          <Route path="/start">
            <RequireAuth><QuizFast /></RequireAuth>
          </Route>
          {/* Quiz approfondito originale — escape hatch, ancora raggiungibile. */}
          <Route path="/profiling">
            <RequireAuth><Profiling /></RequireAuth>
          </Route>
          <Route path="/destinations">
            <RequireAuth><Destinations /></RequireAuth>
          </Route>
          {/* La generazione ha la precedenza: "stream" non è un id. */}
          <Route path="/itinerary/stream/:id">
            <RequireAuth><ItineraryStream /></RequireAuth>
          </Route>
          {/* Flusso a schermate (2026-08): ogni schermata ha il suo URL, così
              il tasto indietro del browser funziona e i link si condividono.
              Tutte servite dalla stessa pagina, che legge il percorso. */}
          <Route path="/itinerary/:id" component={Itinerary} />
          <Route path="/itinerary/:id/g/:n" component={Itinerary} />
          <Route path="/itinerary/:id/g/:n/t/:mid" component={Itinerary} />
          <Route path="/itinerary/:id/g/:n/mappa" component={Itinerary} />
          <Route path="/itinerary/:id/logistica" component={Itinerary} />
          <Route path="/itinerary/:id/modifica" component={Itinerary} />
          <Route path="/itinerary/:id/modifica/:n" component={Itinerary} />
          <Route path="/i/:token" component={SharedItinerary} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/my-account" component={MyAccount} />
          <Route path="/studio/:id">
            <RequireAuth><StudioTripRedirect /></RequireAuth>
          </Route>
          <Route path="/studio">
            <RequireAuth><StudioHomeRedirect /></RequireAuth>
          </Route>
          <Route path="/compare" component={Compare} />
          {DevPreview && <Route path="/__preview/dashboard" component={DevPreview} />}
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <I18nProvider>
            <Router />
            <Toaster />
            <CookieBanner />
          </I18nProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
