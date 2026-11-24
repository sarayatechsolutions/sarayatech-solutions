import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Solutions from "./pages/Solutions";
import Realisation from "./pages/Realisation";
import Insights from "./pages/Insights";
import SolutionDetails from "./pages/SolutionDetails";
import Industries from "./pages/Industries";
import IndustryDetails from "./pages/IndustryDetails";
import Careers from "./pages/Careers";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ScrollToTop />
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <Index />
              </Layout>
            }
          />
          <Route
            path="/about"
            element={
              <Layout>
                <About />
              </Layout>
            }
          />
          <Route
            path="/contact"
            element={
              <Layout>
                <Contact />
              </Layout>
            }
          />
          <Route
            path="/solutions"
            element={
              <Layout>
                <Solutions />
              </Layout>
            }
          />
          <Route
            path="/solutions/:solutionId"
            element={
              <Layout>
                <SolutionDetails />
              </Layout>
            }
          />
          <Route
            path="/industries"
            element={
              <Layout>
                <Industries />
              </Layout>
            }
          />
          <Route
            path="/industry/:industryId"
            element={
              <Layout>
                <IndustryDetails />
              </Layout>
            }
          />
          <Route
            path="/realisation"
            element={
              <Layout>
                <Realisation />
              </Layout>
            }
          />
          <Route
            path="/insights"
            element={
              <Layout>
                <Insights />
              </Layout>
            }
          />
          <Route
            path="/careers"
            element={
              <Layout>
                <Careers />
              </Layout>
            }
          />
          {/* /auth and /dashboard are intentionally not routed (STS-016); the page files are kept. */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route
            path="*"
            element={
              <Layout>
                <NotFound />
              </Layout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
