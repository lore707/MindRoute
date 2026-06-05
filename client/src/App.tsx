import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Layout } from "@/components/Layout";
import { CookieBanner } from "@/components/CookieBanner";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";

// Landing stays eager (first paint must be instant). Every other route is
// code-split so its JS — and heavy deps like Leaflet (Itinerary) and Recharts
// (Account) — only download when that section is actually opened.
const Profiling = lazy(() => import("@/pages/Profiling"));
const Destinations = lazy(() => import("@/pages/Destinations"));
const Itinerary = lazy(() => import("@/pages/Itinerary"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const MyAccount = lazy(() => import("@/pages/MyAccount"));
const ItineraryStream = lazy(() => import("@/pages/ItineraryStream"));
const Compare = lazy(() => import("@/pages/Compare"));
const SharedItinerary = lazy(() => import("@/pages/SharedItinerary"));

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

function Router() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/profiling" component={Profiling} />
          <Route path="/destinations" component={Destinations} />
          <Route path="/itinerary/:id" component={Itinerary} />
          <Route path="/i/:token" component={SharedItinerary} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/itinerary/stream/:id" component={ItineraryStream} />
          <Route path="/my-account" component={MyAccount} />
          <Route path="/compare" component={Compare} />
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
