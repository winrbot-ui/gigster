#!/usr/bin/env node
/**
 * Apply extension DB migration (conversation_messages).
 * Requires SUPABASE_DB_PASSWORD — see infra/supabase/README.md
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(root, "infra/supabase/.env");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

const password = process.env.SUPABASE_DB_PASSWORD?.trim();
if (!password) {
  const envExists = existsSync(envPath);
  console.error(`
Missing SUPABASE_DB_PASSWORD.${envExists ? " (infra/supabase/.env exists but password is empty — press Ctrl+S to save the file)" : ""}

1. Supabase Dashboard → Project Settings → Database → copy password
2. Create infra/supabase/.env with:
   SUPABASE_DB_PASSWORD=your-password
   SUPABASE_DB_HOST=aws-1-eu-west-2.pooler.supabase.com
   SUPABASE_PROJECT_REF=uyhicdgnaairxuvwfaoo
3. Save the file (Ctrl+S), then run: npm run db:extension

Or paste SQL from:
  infra/supabase/migrations/20260629000007_extension_messages.sql
into Supabase → SQL Editor → Run
`);
  process.exit(1);
}
process.env.SUPABASE_DB_PASSWORD = password;

process.env.SUPABASE_DB_HOST ??= "aws-1-eu-west-2.pooler.supabase.com";
process.env.SUPABASE_REGION ??= "eu-west-2";

const r = spawnSync("node", ["infra/supabase/apply-migrations.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);
