import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
