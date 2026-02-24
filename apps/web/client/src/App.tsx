import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Router as WouterRouter } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Docs from "./pages/Docs";
import Compliance from "./pages/Compliance";
import SDK from "./pages/SDK";
import Admin from "./pages/Admin";

import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './lib/wagmi';

const queryClient = new QueryClient();

// Get base path from environment or default to /gravitas-protocol/ for GitHub Pages
const base = import.meta.env.BASE_URL || "/gravitas-protocol/";

function Router() {
  return (
    <WouterRouter base={base.endsWith('/') ? base.slice(0, -1) : base}>
      <Switch>
        <Route path="/" component={Home} />
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
