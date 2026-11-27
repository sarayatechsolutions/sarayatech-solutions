// Local/CI verification build. The production check in tools/require-api-url.ts
// still runs (mode=production); this only supplies a localhost placeholder when
// VITE_API_URL is not already set, so `npm run build` stays strict for deploys.
import { spawnSync } from "node:child_process";

// Runs the full `npm run build` pipeline (client build, SSR build, prerender) so
// local verification exercises exactly what Cloudflare Pages builds.
const env = { ...process.env };
if (!env.VITE_API_URL) env.VITE_API_URL = "http://localhost:3001";
const r = spawnSync("npm run build", { stdio: "inherit", env, shell: true });
process.exit(r.status ?? 1);
