import { Component, type ErrorInfo, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Root error boundary (STS-047): a render error shows a friendly fallback instead of a
 * blank page. It sits above the router, so the links are plain anchors. The error
 * itself is logged to the console only; it is never shown to the visitor.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        role="alert"
        className="flex min-h-screen items-center justify-center bg-background px-4 text-center"
      >
        <div className="max-w-md space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
          <p className="text-secondary">
            Sorry, this page failed to load. Please try again, or reach us at{" "}
            <a className="text-primary underline" href="mailto:info@sarayatech.com">
              info@sarayatech.com
            </a>
            .
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Reload the page
            </button>
            <a
              href="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-border px-6 font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Back to home
            </a>
          </div>
        </div>
      </main>
    );
  }
}

export default ErrorBoundary;
