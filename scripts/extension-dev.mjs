#!/usr/bin/env node
/**
 * INTERNAL DEV ONLY — unpacked extension for local Fiverr/Freelancer testing.
 *
 * Output: apps/extension-<name>/dist  (Load unpacked in Chrome)
 * NOT for clients. Client packages: npm run extension:client → release/*.zip
 *
 * Usage:
 *   node scripts/extension-dev.mjs fiverr
 *   node scripts/extension-dev.mjs freelancer
 *   node scripts/extension-dev.mjs all
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = (process.argv[2] || "fiverr").toLowerCase();

const APPS = {
  fiverr: "extension-fiverr",
  freelancer: "extension-freelancer",
};

const toBuild =
  target === "all" ? Object.values(APPS) : APPS[target] ? [APPS[target]] : null;

if (!toBuild) {
  console.error("Usage: node scripts/extension-dev.mjs [fiverr|freelancer|all]");
  process.exit(1);
}

console.log("=== Gigster extension — DEV build (internal only) ===\n");

console.log("→ Writing localhost apiBase (config.local.js) …");
execSync("node scripts/setup-extension.mjs --dev", { cwd: root, stdio: "inherit" });

for (const app of toBuild) {
  console.log(`\n→ Building ${app} …`);
  execSync(`npm run build --workspace @gigster/${app}`, { cwd: root, stdio: "inherit" });

  const dist = join(root, "apps", app, "dist");
  if (!existsSync(dist)) {
    throw new Error(`Missing dist for ${app}`);
  }

  writeFileSync(
    join(dist, "DEV-NOT-FOR-CLIENTS.txt"),
    [
      "INTERNAL DEV BUILD — do not give this folder to clients.",
      "",
      "Client Chrome Web Store zips:",
      "  npm run extension:client",
      "  → release/gigster-fiverr.zip",
      "  → release/gigster-freelancer.zip",
      "",
      "Agent 1/2 testing without the extension:",
      "  http://localhost:3000/dev/simulator",
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\n✓ Dev unpacked extension: apps/${app}/dist`);
  console.log(`  Chrome → Extensions → Load unpacked → ${dist}`);
}

const keysPath = join(root, "infra/chrome-extension-keys.json");
if (existsSync(keysPath)) {
  const keys = JSON.parse(readFileSync(keysPath, "utf8"));
  console.log("\n--- Backend dev only (apps/backend/.env) ---");
  console.log("GIGSTER_API_URL=http://localhost:8000");
  console.log("PUBLIC_API_URL=http://localhost:8000");
  console.log(`CORS_EXTENSION_IDS=${keys.railway?.CORS_EXTENSION_IDS ?? ""}`);
  console.log("\nThen: npm run dev:api");
  console.log("Persona: http://localhost:3000/agent-setup");
  console.log("Simulator (no extension): http://localhost:3000/dev/simulator");
}

console.log("\n=== Done (dev only — not for clients) ===\n");
