import { ReactNode, useEffect, useState } from "react";
import Header, { MAIN_CONTENT_ID } from "@/components/Header";
import Footer from "@/components/Footer";
// FF-11: only the small launcher container ships in the main bundle; the panel (Markdown renderer,
// chat service) is its own chunk, fetched on hover/focus of the launcher or on the first open.
import AminaChatbot from "@/components/chatbot/AminaChatbot";

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
      {/* Mounted once the browser is idle: not part of first paint, nor of the prerendered HTML. */}
      {chatbotReady && <AminaChatbot />}
    </div>
  );
};

export default Layout;
