import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

const app = (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

const container = document.getElementById("root")!;

// Production pages are prerendered (STS-020): attach to the existing markup.
// The dev server serves an empty root, so it mounts from scratch.
if (container.hasChildNodes()) {
  hydrateRoot(container, app);
} else {
  createRoot(container).render(app);
}
