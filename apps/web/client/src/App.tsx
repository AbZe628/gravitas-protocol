import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Docs from "./pages/Docs";
import Compliance from "./pages/Compliance";
import SDK from "./pages/SDK";
import Admin from "./pages/Admin";

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi';

const queryClient = new QueryClient();

// Get base path from environment or default to / for custom domain
const base = import.meta.env.BASE_URL || "/";

/* The marketing site owns the root of the domain and the application answers
   under /app/, so /app/ belongs back at the site root. Every in-app "Home" link
   resolves there through the router base, which is what sends them home. */
function SiteHome() {
  useEffect(() => { window.location.replace("/"); }, []);
  return null;
}

function Router() {
  return (
    <WouterRouter base={base.endsWith('/') ? base.slice(0, -1) : base}>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={SiteHome} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/dashboard/:any*" component={Dashboard} />
        <Route path="/docs" component={Docs} />
        <Route path="/compliance" component={Compliance} />
        <Route path="/sdk" component={SDK} />
        <Route path="/admin" component={Admin} />

        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="light">
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
}

export default App;
