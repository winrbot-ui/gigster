/**
 * Create a non-active member (pending_payment) and optionally reset invite-gate IP limits.
 * Mirrors normal signup side effects: referral, persona, telegram link — no subscription.
 *
 * Usage (repo root):
 *   node scripts/create-pending-member.mjs --username demo --email demo@test.com --referrer founder
 *   node scripts/create-pending-member.mjs --clear-ip
 *   node scripts/create-pending-member.mjs --username demo --email demo@test.com --referrer founder --clear-ip
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PASSWORD = "GigsterDev2026!";

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

function parseArgs(argv) {
  const out = {
    clearIp: false,
    username: "",
    email: "",
    password: DEFAULT_PASSWORD,
    referrer: "",
    status: "pending_payment",
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--clear-ip") out.clearIp = true;
    else if (arg === "--username") out.username = argv[++i] ?? "";
    else if (arg === "--email") out.email = argv[++i] ?? "";
    else if (arg === "--password") out.password = argv[++i] ?? DEFAULT_PASSWORD;
    else if (arg === "--referrer") out.referrer = argv[++i] ?? "";
    else if (arg === "--status") out.status = argv[++i] ?? "pending_payment";
  }
  out.username = out.username.trim().replace(/^@/, "").toLowerCase();
  out.email = out.email.trim().toLowerCase();
  out.referrer = out.referrer.trim().replace(/^@/, "").toLowerCase();
  return out;
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

async function clearInviteGateLimits(admin) {
  const { error, count } = await admin
    .from("ip_attempts")
    .delete({ count: "exact" })
    .eq("endpoint", "invite_gate");
  if (error) throw new Error(`clear ip_attempts: ${error.message}`);
  console.log(`Cleared invite_gate IP limits (${count ?? 0} row(s)).`);
}

async function resolveReferrer(admin, referrerUsername) {
  if (referrerUsername) {
    const { data, error } = await admin
      .from("users")
      .select("id, username, status")
      .eq("username", referrerUsername)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new Error(`Referrer @${referrerUsername} not found.`);
    if (data.status !== "active") {
      throw new Error(`Referrer @${referrerUsername} is not active (status=${data.status}).`);
    }
    return data;
  }

  const { data, error } = await admin
    .from("users")
    .select("id, username, status")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("No active member found to use as referrer.");
  return data;
}

async function createPendingMember(admin, spec, referrer) {
  const now = new Date().toISOString();
  const emailConfirmed = spec.status !== "pending_email";

  let authUser = await findAuthUserByEmail(admin, spec.email);
  if (authUser) {
    throw new Error(`Auth user already exists for ${spec.email}. Pick another email.`);
  }

  const { data: usernameTaken } = await admin
    .from("users")
    .select("id")
    .eq("username", spec.username)
    .maybeSingle();
  if (usernameTaken) {
    throw new Error(`Username @${spec.username} is already taken.`);
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: spec.email,
    password: spec.password,
    email_confirm: emailConfirmed,
    user_metadata: {
      username: spec.username,
      referred_by_id: referrer.id,
      invite_nickname: referrer.username,
    },
  });
  if (error) throw new Error(`auth create: ${error.message}`);
  authUser = data.user;

  const profilePatch = {
    username: spec.username,
    role: "member",
    status: spec.status,
    referred_by_id: referrer.id,
    email_verified_at: emailConfirmed ? now : null,
  };

  const { error: profileErr } = await admin
    .from("users")
    .update(profilePatch)
    .eq("id", authUser.id);
  if (profileErr) throw new Error(`profile: ${profileErr.message}`);

  const { data: existingReferral } = await admin
    .from("referrals")
    .select("id")
    .eq("referred_id", authUser.id)
    .maybeSingle();

  if (!existingReferral) {
    const { error: refErr } = await admin.from("referrals").insert({
      referrer_id: referrer.id,
      referred_id: authUser.id,
      status: "pending",
    });
    if (refErr) throw new Error(`referral: ${refErr.message}`);
  }

  await admin.from("agent_personas").upsert({
    user_id: authUser.id,
    agent_name: spec.username.charAt(0).toUpperCase() + spec.username.slice(1),
    full_name: "",
    title: "Small Business Website Developer",
    specialty: "WordPress, business sites, landing pages",
    tone: "Professional but warm, direct",
    never_say: ["As an AI", "I'm a bot"],
    always_do: "Client first name, 2-5 sentences, max 2 questions",
    experience_years: 6,
    location: "CET",
    updated_at: now,
  });

  await admin.from("telegram_links").upsert({
    user_id: authUser.id,
    link_code: randomUUID().slice(0, 8),
  });

  return authUser.id;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
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

  if (args.clearIp) {
    await clearInviteGateLimits(admin);
  }

  if (!args.username || !args.email) {
    if (args.clearIp) return;
    console.error("Provide --username and --email, or use --clear-ip alone.");
    process.exit(1);
  }

  const referrer = await resolveReferrer(admin, args.referrer);
  await createPendingMember(admin, args, referrer);

  console.log("\n=== Pending member created ===\n");
  console.log("Status:", args.status, "(not activated — no subscription)");
  console.log("Referrer: @" + referrer.username);
  console.log("Login: https://www.gigster.website/login");
  console.log("  @nickname:", args.username);
  console.log("  email:    ", args.email);
  console.log("  password: ", args.password);
  console.log("\nAfter login you should land on /buy (pending payment).\n");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
