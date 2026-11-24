import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { assertApiUrl } from "./tools/require-api-url";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // STS-049: fail production builds when VITE_API_URL is missing/invalid.
  assertApiUrl(command, mode, { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env });
  return {
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
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
