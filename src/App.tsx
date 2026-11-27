import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import type { ReactNode } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import Analytics from "@/components/Analytics";
import { MotionProvider } from "@/components/motion";
import { AppRoutes } from "./routes";

const queryClient = new QueryClient();

/** Everything above the router; shared by the browser entry and the prerender entry. */
export const AppProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <MotionProvider>{children}</MotionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const App = () => (
  <AppProviders>
    {/* startTransition and relative splat paths, opted into via future flags on v6, are the v7 defaults. */}
    <BrowserRouter>
      <ScrollToTop />
      <AppRoutes />
      {/* STS-050: browser only, off until a GA4 id is configured; never in the prerendered HTML. */}
      <Analytics />
    </BrowserRouter>
  </AppProviders>
);

export default App;
