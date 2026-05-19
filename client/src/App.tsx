import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/ThemeProvider";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import Landing from "@/pages/Landing";
import Profiling from "@/pages/Profiling";
import Destinations from "@/pages/Destinations";
import Itinerary from "@/pages/Itinerary";
import Privacy from "@/pages/Privacy";
import MyAccount from "@/pages/MyAccount";
import ItineraryStream from "@/pages/ItineraryStream";
import Compare from "@/pages/Compare";
import { CookieBanner } from "@/components/CookieBanner";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/profiling" component={Profiling} />
        <Route path="/destinations" component={Destinations} />
      <Route path="/itinerary/:id" component={Itinerary} />
      <Route path="/privacy" component={Privacy} />
        <Route path="/itinerary/stream/:id" component={ItineraryStream} />
        <Route path="/my-account" component={MyAccount} />
        <Route path="/compare" component={Compare} />
        <Route component={NotFound} />
      </Switch>
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
