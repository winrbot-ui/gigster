#!/usr/bin/env node
/**
 * Print Railway variable values from local env (for manual paste or `railway variables set`).
 * Does not print service_role or jwt secrets to stdout by default.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const keysPath = join(root, "infra/chrome-extension-keys.json");
const envPath = join(root, "apps/web/.env.local");

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

const keys = JSON.parse(readFileSync(keysPath, "utf8"));
let env = {};
if (existsSync(envPath)) {
  env = parseEnv(readFileSync(envPath, "utf8"));
} else {
  console.error("Missing apps/web/.env.local — copy values from Vercel dashboard.");
}

const railwayVars = {
  SUPABASE_URL: env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || "(set from Vercel)",
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY ? "(present in .env.local)" : "(set from Vercel)",
  SUPABASE_JWT_SECRET: env.SUPABASE_JWT_SECRET ? "(present in .env.local)" : "(set from Vercel)",
  SUPABASE_ANON_KEY: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || "(set from Vercel)",
  ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY ? "(present in .env.local)" : "(set in Railway)",
  CORS_ORIGINS: "https://www.gigster.website,https://gigster.website",
  CORS_EXTENSION_IDS: keys.railway.CORS_EXTENSION_IDS,
  SITE_URL: "https://www.gigster.website",
};

console.log("=== Railway @gigster/backend — paste into Variables ===\n");
for (const [k, v] of Object.entries(railwayVars)) {
  if (k === "SUPABASE_ANON_KEY" && env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log(`${k}=${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`);
  } else if (k === "SUPABASE_URL" && env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log(`${k}=${env.NEXT_PUBLIC_SUPABASE_URL}`);
  } else if (k === "SUPABASE_SERVICE_ROLE_KEY" && env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log(`${k}=${env.SUPABASE_SERVICE_ROLE_KEY}`);
  } else if (k === "SUPABASE_JWT_SECRET" && env.SUPABASE_JWT_SECRET) {
    console.log(`${k}=${env.SUPABASE_JWT_SECRET}`);
  } else if (k === "ANTHROPIC_API_KEY" && env.ANTHROPIC_API_KEY) {
    console.log(`${k}=${env.ANTHROPIC_API_KEY}`);
  } else {
    console.log(`${k}=${v}`);
  }
}

console.log("\n=== Extension IDs (chrome://extensions) ===");
console.log("Fiverr:    ", keys.extensions.fiverr.extensionId);
console.log("Freelancer:", keys.extensions.freelancer.extensionId);
