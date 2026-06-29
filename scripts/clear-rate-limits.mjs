/**
 * Reset IP rate limits (invite gate + login). Safe for dev/testing.
 *
 * Usage (repo root): npm run db:clear-limits
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = join(process.cwd(), "apps/web/.env.local");
  const envText = readFileSync(envPath, "utf8");
  return Object.fromEntries(
    envText
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !service) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const endpoint of ["login", "invite_gate", "crypto_submit"]) {
    const { error, count } = await admin
      .from("ip_attempts")
      .delete({ count: "exact" })
      .eq("endpoint", endpoint);
    if (error) throw new Error(`${endpoint}: ${error.message}`);
    console.log(`Cleared ${endpoint}: ${count ?? 0} row(s)`);
  }

  console.log("\nDone — try /login again.\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
