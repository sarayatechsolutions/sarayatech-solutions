import { ReactNode, Suspense, lazy, useEffect, useState } from "react";
import Header, { MAIN_CONTENT_ID } from "@/components/Header";
import Footer from "@/components/Footer";

// The chatbot is not needed for first paint: load its chunk only once the
// browser is idle, so it stays out of the main bundle and the critical path.
const AminaChatbot = lazy(() => import("@/components/chatbot/AminaChatbot"));

interface LayoutProps {
  children: ReactNode;
}

function useIdleMount(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(id);
  }, []);

  return ready;
}

const Layout = ({ children }: LayoutProps) => {
  const chatbotReady = useIdleMount();

  return (
    <div className="min-h-screen">
      <Header />
      {/* Skip-link target (STS-038): focusable by script only, no ring on a non-control. */}
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
      <Footer />
      {chatbotReady && (
        <Suspense fallback={null}>
          <AminaChatbot />
        </Suspense>
      )}
    </div>
  );
};

export default Layout;
