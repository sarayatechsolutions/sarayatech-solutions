import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { existsSync } from "node:fs";

// `vite preview` falls back to the root shell for /about. Serve the prerendered
// dist/about/index.html instead, as Cloudflare Pages does (STS-020).
const servePrerenderedRoutes: Plugin = {
  name: "serve-prerendered-routes",
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [pathname, query = ""] = (req.url || "/").split("?");
      const clean = pathname.replace(/\/+$/, "");
      if (clean && !path.extname(clean) && existsSync(path.resolve(__dirname, "dist", `.${clean}`, "index.html"))) {
        req.url = `${clean}/index.html${query ? `?${query}` : ""}`;
      }
      next();
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    // Loopback only by default; set VITE_DEV_HOST (e.g. "0.0.0.0") to expose on a LAN.
    host: process.env.VITE_DEV_HOST || "localhost",
    port: 8080,
    proxy: {
      // Backend API proxy
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react(), servePrerenderedRoutes],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
