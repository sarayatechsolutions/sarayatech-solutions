// Local/CI verification build. The production check in tools/require-api-url.ts
// still runs (mode=production); this only supplies a localhost placeholder when
// VITE_API_URL is not already set, so `npm run build` stays strict for deploys.
import { spawnSync } from "node:child_process";

import { fileURLToPath } from "node:url";
const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
const env = { ...process.env };
if (!env.VITE_API_URL) env.VITE_API_URL = "http://localhost:3001";
const r = spawnSync(process.execPath, [vite, "build"], { stdio: "inherit", env });
process.exit(r.status ?? 1);
