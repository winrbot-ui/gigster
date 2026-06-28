/**
 * One-time bootstrap: apply checks + create first admin user.
 * Run: node scripts/bootstrap-admin.mjs
 * Requires apps/web/.env.local (SUPABASE_SERVICE_ROLE_KEY).
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const path = join(root, "apps/web/.env.local");
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
  process.exit(1);
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@gigster.website";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "kosta";
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD ||
  `Gigster!${randomBytes(4).toString("hex")}`;

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // Check users table
  const { error: tableErr } = await supabase.from("users").select("id").limit(1);
  if (tableErr) {
    console.error(
      "DB not ready. Run SQL migrations in Supabase SQL Editor first:\n",
      "  infra/supabase/migrations/*.sql (all files in order)\n",
      "Error:",
      tableErr.message,
    );
    process.exit(1);
  }

  // Find or create auth user
  const { data: listData } = await supabase.auth.admin.listUsers();
  let userId = listData?.users?.find((u) => u.email === ADMIN_EMAIL)?.id;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { username: ADMIN_USERNAME },
    });
    if (error) {
      console.error("createUser failed:", error.message);
      process.exit(1);
    }
    userId = data.user.id;
    console.log("Created auth user:", userId);
  } else {
    await supabase.auth.admin.updateUserById(userId, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { username: ADMIN_USERNAME },
    });
    console.log("Updated existing auth user:", userId);
  }

  const { error: profileErr } = await supabase.from("users").upsert(
    {
      id: userId,
      email: ADMIN_EMAIL,
      username: ADMIN_USERNAME,
      role: "admin",
      status: "active",
      email_verified_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileErr) {
    console.error("users upsert failed:", profileErr.message);
    process.exit(1);
  }

  await supabase.from("agent_personas").upsert({
    user_id: userId,
    agent_name: "Kosta",
    full_name: "Kosta",
    title: "Small Business Website Developer",
    specialty: "WordPress, business sites, landing pages",
    tone: "Professional but warm, direct",
    never_say: ["As an AI", "I'm a bot"],
    always_do: "Client first name, 2-5 sentences, max 2 questions",
    experience_years: 6,
    location: "CET",
  });

  await supabase.from("telegram_links").upsert({
    user_id: userId,
    link_code: randomBytes(4).toString("hex"),
  });

  await supabase.from("subscriptions").upsert({
    user_id: userId,
    plan: "pro",
    platforms_allowed: 3,
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    active: true,
  });

  console.log("\n=== GIGSTER ADMIN READY ===");
  console.log("Login URL:  https://www.gigster.website/login");
  console.log("Admin URL:  https://www.gigster.website/admin");
  console.log("Invite URL: https://www.gigster.website/join?ref=" + ADMIN_USERNAME);
  console.log("");
  console.log("@nickname:  @" + ADMIN_USERNAME);
  console.log("Email:      " + ADMIN_EMAIL);
  console.log("Password:   " + ADMIN_PASSWORD);
  console.log("");
  console.log("Change password after first login (Supabase Dashboard → Authentication → Users).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
