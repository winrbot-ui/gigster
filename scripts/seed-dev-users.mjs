/**
 * Seed dev users: one active member (for invites) + one admin.
 * Reads apps/web/.env.local. Idempotent — safe to re-run.
 *
 * Usage (repo root): npm run db:seed
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEV_PASSWORD = "GigsterDev2026!";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const SEED_USERS = [
  {
    key: "founder",
    email: "founder@gigster.local",
    username: "founder",
    role: "member",
    status: "active",
    withSubscription: true,
  },
  {
    key: "admin",
    email: "admin@gigster.local",
    username: "admin",
    role: "admin",
    status: "active",
    withSubscription: false,
  },
];

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

async function findAuthUserByEmail(admin, email) {
  let page = 1;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function ensureUser(admin, spec) {
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 30 * 86400000).toISOString();

  let authUser = await findAuthUserByEmail(admin, spec.email);

  if (!authUser) {
    const { data, error } = await admin.auth.admin.createUser({
      email: spec.email,
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { username: spec.username },
    });
    if (error) throw new Error(`${spec.key} auth create: ${error.message}`);
    authUser = data.user;
    console.log(`Created auth user: ${spec.email}`);
  } else {
    const { error } = await admin.auth.admin.updateUserById(authUser.id, {
      password: DEV_PASSWORD,
      email_confirm: true,
      user_metadata: { username: spec.username },
    });
    if (error) throw new Error(`${spec.key} auth update: ${error.message}`);
    console.log(`Updated auth user: ${spec.email}`);
  }

  const { error: profileErr } = await admin
    .from("users")
    .update({
      username: spec.username,
      role: spec.role,
      status: spec.status,
      email_verified_at: now,
    })
    .eq("id", authUser.id);

  if (profileErr) throw new Error(`${spec.key} profile: ${profileErr.message}`);

  await admin.from("agent_personas").upsert({
    user_id: authUser.id,
    agent_name: spec.username.charAt(0).toUpperCase() + spec.username.slice(1),
    full_name: spec.key === "admin" ? "Gigster Admin" : "Founding Member",
    title: "Small Business Website Developer",
    specialty: "WordPress, business sites, landing pages",
    tone: "Professional but warm, direct",
    never_say: ["As an AI", "I'm a bot"],
    always_do: "Client first name, 2-5 sentences, max 2 questions",
    experience_years: 6,
    location: "US / Eastern",
    updated_at: now,
  });

  await admin.from("telegram_links").upsert({
    user_id: authUser.id,
    link_code: spec.key.slice(0, 8).padEnd(8, "0"),
  });

  if (spec.withSubscription) {
    const { data: existingSub } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", authUser.id)
      .eq("active", true)
      .maybeSingle();

    if (!existingSub) {
      const { error: subErr } = await admin.from("subscriptions").insert({
        user_id: authUser.id,
        plan: "pro",
        platforms_allowed: 3,
        started_at: now,
        expires_at: expires,
        active: true,
      });
      if (subErr) throw new Error(`${spec.key} subscription: ${subErr.message}`);
      console.log(`Created pro subscription for @${spec.username}`);
    }
  }

  return authUser.id;
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

  console.log("\n=== Seeding dev users ===\n");

  for (const spec of SEED_USERS) {
    await ensureUser(admin, spec);
  }

  console.log("\n=== Done — use these to test ===\n");
  console.log("Password for both accounts:", DEV_PASSWORD);
  console.log("");
  console.log("Active member (invite gate):");
  console.log("  @nickname:  founder");
  console.log("  email:      founder@gigster.local");
  console.log(`  invite URL: ${SITE_URL}/join?ref=founder`);
  console.log("");
  console.log("Admin panel:");
  console.log("  @nickname:  admin");
  console.log("  email:      admin@gigster.local");
  console.log(`  login:      ${SITE_URL}/login`);
  console.log(`  admin:      ${SITE_URL}/admin`);
  console.log("");
  console.log("Test flow: /join?ref=founder → signup → /buy → admin verifies payment\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
