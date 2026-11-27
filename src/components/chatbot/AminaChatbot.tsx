import { Component, Suspense, lazy, useCallback, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import ChatLauncher from "./ChatLauncher";
import type { ChatCloseReason } from "./ChatPanel";

/**
 * FF-11: the panel and everything it pulls in (react-markdown, the chat service, the link
 * allow-list) is a separate chunk. It is fetched when the visitor shows intent (hover or focus on
 * the launcher) or, at the latest, on the first open. This file and ./ChatLauncher are all of the
 * chat that ships in the main bundle: neither may import ./ChatPanel or ./MarkdownRenderer
 * statically (AminaChatbot.test.tsx checks).
 */
const loadPanel = () => import("./ChatPanel");
const ChatPanel = lazy(loadPanel);

/** Start the download early; a failure here is retried (and reported) by the lazy load itself. */
const prefetchPanel = () => {
  loadPanel().catch(() => undefined);
};

/** The chunk failed to load (offline, deploy in progress): say so, offer the contact form. */
class PanelErrorBoundary extends Component<{ onClose: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alertdialog"
        aria-labelledby="amina-chat-error-title"
        aria-describedby="amina-chat-error-body"
        className="fixed inset-x-2 bottom-2 z-50 rounded-lg border border-border bg-background p-4 shadow-lg sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 id="amina-chat-error-title" className="font-heading text-base font-semibold text-foreground">
            Chat could not load
          </h2>
          <button
            type="button"
            onClick={this.props.onClose}
            aria-label="Close"
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <p id="amina-chat-error-body" className="mt-1 text-sm text-muted-foreground">
          Please check your connection and try again later, or use the{" "}
          <Link to="/contact" onClick={this.props.onClose} className="font-semibold text-primary underline underline-offset-2">
            contact form
          </Link>{" "}
          and we will reply by email.
        </p>
      </div>
    );
  }
}

const AminaChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  // The panel is mounted from the first open on (it keeps the conversation while closed).
  const [panelMounted, setPanelMounted] = useState(false);
  // The panel chunk has arrived and rendered; until then the launcher stays and shows it is busy.
  const [panelReady, setPanelReady] = useState(false);
  const [errorKey, setErrorKey] = useState(0);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const open = () => {
    setPanelMounted(true);
    setIsOpen(true);
  };

  const close = useCallback((reason: ChatCloseReason) => {
    setIsOpen(false);
    if (reason === "dismiss") {
      // FF-7: back to the control that opened the dialog. The launcher is visibility:hidden until
      // this state change renders, so wait a frame.
      requestAnimationFrame(() => launcherRef.current?.focus());
      return;
    }
    // A chat link navigated: the route announcer moves focus to the new page's heading. Only if
    // focus was lost with the panel does it go back to the launcher.
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active || active === document.body || active.closest("[data-chat-panel]")) {
        launcherRef.current?.focus();
      }
    });
  }, []);

  const closeAfterError = () => {
    setIsOpen(false);
    setPanelMounted(false);
    setErrorKey((k) => k + 1);
    requestAnimationFrame(() => launcherRef.current?.focus());
  };

  const onPanelReady = useCallback(() => setPanelReady(true), []);

  return (
    <>
      <ChatLauncher
        ref={launcherRef}
        hidden={isOpen && panelReady}
        busy={isOpen && !panelReady}
        onOpen={open}
        onIntent={prefetchPanel}
      />
      {panelMounted && (
        <PanelErrorBoundary key={errorKey} onClose={closeAfterError}>
          <Suspense fallback={null}>
            <ChatPanel open={isOpen} onClose={close} onReady={onPanelReady} />
          </Suspense>
        </PanelErrorBoundary>
      )}
    </>
  );
};

export default AminaChatbot;
