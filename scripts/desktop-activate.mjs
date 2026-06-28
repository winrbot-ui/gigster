/**
 * Activate desktop dev flow: login active user, print JWT + project id for Gigster Desktop.
 * Usage (repo root): node scripts/desktop-activate.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEV_EMAIL = "founder@gigster.local";
const DEV_PASSWORD = "GigsterDev2026!";

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
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) {
    console.error("Missing Supabase keys in apps/web/.env.local");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const auth = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: signIn, error: signErr } = await auth.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });
  if (signErr || !signIn.session) {
    console.error("Login failed. Run: npm run db:seed");
    console.error(signErr?.message ?? "No session");
    process.exit(1);
  }

  const userId = signIn.user.id;
  const token = signIn.session.access_token;

  const { data: profile } = await admin.from("users").select("status, username").eq("id", userId).single();
  if (profile?.status !== "active") {
    await admin.from("users").update({ status: "active" }).eq("id", userId);
    console.log("Activated user status → active");
  }

  let { data: projects } = await admin
    .from("projects")
    .select("id, client_name, platform")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  let project = projects?.[0];
  if (!project) {
    const { data: created, error } = await admin
      .from("projects")
      .insert({
        user_id: userId,
        platform: "fiverr",
        client_name: "Test Client",
        status: "new",
        project_json: { requirements: [], open_questions: [], status: "new" },
        brief_score: 0,
        agent2_status: "idle",
      })
      .select("id, client_name, platform")
      .single();
    if (error) throw error;
    project = created;
    console.log("Created test project");
  }

  const apiUrl = env.GIGSTER_API_URL ?? "http://localhost:8000";

  const health = await fetch(`${apiUrl}/health`).catch(() => null);
  const apiOk = health?.ok;

  console.log("\n=== Gigster Desktop — copy into the app ===\n");
  console.log("API URL:     ", apiUrl, apiOk ? "(OK)" : "(backend not running — npm run dev:api)");
  console.log("JWT token:   ", token);
  console.log("Project ID:  ", project.id);
  console.log("Platform:    ", project.platform);
  console.log("Client name: ", project.client_name);
  console.log("\nLogin (web): ", DEV_EMAIL, "/", DEV_PASSWORD);
  console.log("\nThen: npm run dev:desktop → Save config → Start monitor");
  console.log("Keep Fiverr/Upwork tab focused in the browser.\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
