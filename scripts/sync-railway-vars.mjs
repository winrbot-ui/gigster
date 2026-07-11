#!/usr/bin/env node
/**
 * Sync backend env vars to Railway (requires: railway login OR RAILWAY_TOKEN).
 * Usage: node scripts/sync-railway-vars.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "apps/web/.env.local");
const keysPath = join(root, "infra/chrome-extension-keys.json");

function parseEnv(text) {
  const out = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

if (!existsSync(envPath)) {
  console.error("Missing apps/web/.env.local");
  process.exit(1);
}

const env = parseEnv(readFileSync(envPath, "utf8"));
const keys = JSON.parse(readFileSync(keysPath, "utf8"));

const vars = {
  SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET,
  SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY,
  ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
  CORS_ORIGINS: "https://www.gigster.website,https://gigster.website",
  CORS_EXTENSION_IDS: keys.railway.CORS_EXTENSION_IDS,
  SITE_URL: "https://www.gigster.website",
  RESEND_API_KEY: env.RESEND_API_KEY,
  RESEND_FROM: env.RESEND_FROM || "Gigster <noreply@gigster.website>",
  CRON_SECRET: env.CRON_SECRET,
};

const missing = Object.entries(vars).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.warn("Warning: missing in .env.local:", missing.join(", "));
}

try {
  execSync("npx @railway/cli whoami", { cwd: root, stdio: "pipe" });
} catch {
  console.error(
    "Railway CLI not logged in. Run: npx @railway/cli login\nOr set RAILWAY_TOKEN from railway.app/account/tokens",
  );
  process.exit(1);
}

console.log("Setting Railway variables on linked service …");
for (const [key, value] of Object.entries(vars)) {
  if (!value) continue;
  const escaped = String(value).replace(/"/g, '\\"');
  execSync(`npx @railway/cli variables --set "${key}=${escaped}"`, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  console.log("  ✓", key);
}

console.log("\nDone. Redeploy @gigster/backend in Railway dashboard.");
