/**
 * Verify apps/web/.env.local Supabase config (run from repo root).
 * Does not print secret values.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), "apps/web/.env.local");
const envText = readFileSync(envPath, "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const expectedRef = "uyhicdgnaairxuvwfaoo";

function decodeJwtPayload(token) {
  const part = token.split(".")[1];
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

const checks = [];

// URL
checks.push({
  name: "Project URL",
  ok: url === `https://${expectedRef}.supabase.co`,
  detail: url ? "matches project ref" : "missing",
});

// JWT shape + ref + roles
const keyChecks = [
  ["Anon key", anon, "anon"],
  ["Service role key", service, "service_role"],
];
for (const [label, token, expectedRole] of keyChecks) {
  let ok = false;
  let detail = "missing";
  if (token?.startsWith("eyJ")) {
    try {
      const p = decodeJwtPayload(token);
      ok = p.ref === expectedRef && p.role === expectedRole;
      detail = ok
        ? `ref=${p.ref}, role=${p.role}`
        : `expected ref=${expectedRef} role=${expectedRole}, got ref=${p.ref} role=${p.role}`;
    } catch {
      detail = "invalid JWT";
    }
  }
  checks.push({ name: label, ok, detail });
}

// Live API: anon — auth health
let anonApiOk = false;
try {
  const res = await fetch(`${url}/auth/v1/health`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  anonApiOk = res.ok;
  checks.push({
    name: "Anon API (auth health)",
    ok: anonApiOk,
    detail: res.ok ? `HTTP ${res.status}` : `HTTP ${res.status}`,
  });
} catch (e) {
  checks.push({
    name: "Anon API (auth health)",
    ok: false,
    detail: e instanceof Error ? e.message : "failed",
  });
}

// Live API: service role — read public.users count
try {
  const res = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      Prefer: "count=exact",
    },
  });
  const count = res.headers.get("content-range")?.split("/")[1] ?? "?";
  checks.push({
    name: "Service role API (users table)",
    ok: res.ok,
    detail: res.ok ? `HTTP ${res.status}, rows=${count}` : `HTTP ${res.status} ${await res.text()}`,
  });
} catch (e) {
  checks.push({
    name: "Service role API (users table)",
    ok: false,
    detail: e instanceof Error ? e.message : "failed",
  });
}

// List public tables via REST (service) — spot-check schema exists
const schemaChecks = [
  ["projects", "id"],
  ["payments", "id"],
  ["ip_attempts", "ip"],
  ["marketer_applications", "id"],
  ["subscriptions", "id"],
  ["referrals", "id"],
  ["invite_codes", "id"],
];
for (const [table, col] of schemaChecks) {
  try {
    const res = await fetch(`${url}/rest/v1/${table}?select=${col}&limit=0`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    checks.push({
      name: `Schema: ${table} table`,
      ok: res.ok,
      detail: res.ok ? "exists" : `HTTP ${res.status}`,
    });
  } catch (e) {
    checks.push({
      name: `Schema: ${table} table`,
      ok: false,
      detail: e instanceof Error ? e.message : "failed",
    });
  }
}

// signup_ip column (migration 5)
try {
  const res = await fetch(`${url}/rest/v1/users?select=signup_ip&limit=0`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  checks.push({
    name: "Schema: users.signup_ip",
    ok: res.ok,
    detail: res.ok ? "exists" : `HTTP ${res.status}`,
  });
} catch (e) {
  checks.push({
    name: "Schema: users.signup_ip",
    ok: false,
    detail: e instanceof Error ? e.message : "failed",
  });
}

// Invite validation RPC (migration 4)
try {
  const res = await fetch(`${url}/rest/v1/rpc/validate_invite_nickname`, {
    method: "POST",
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_nickname: "__verify_test__" }),
  });
  const body = res.ok ? await res.json() : await res.text();
  const reason = Array.isArray(body) ? body[0]?.reason : null;
  checks.push({
    name: "RPC: validate_invite_nickname",
    ok: res.ok && reason === "not_found",
    detail: res.ok ? `responds (${reason})` : `HTTP ${res.status} ${String(body).slice(0, 80)}`,
  });
} catch (e) {
  checks.push({
    name: "RPC: validate_invite_nickname",
    ok: false,
    detail: e instanceof Error ? e.message : "failed",
  });
}

const allOk = checks.every((c) => c.ok);
console.log("\n=== Supabase .env.local verification ===\n");
for (const c of checks) {
  console.log(`${c.ok ? "OK" : "FAIL"}  ${c.name} — ${c.detail}`);
}
console.log(allOk ? "\nAll checks passed.\n" : "\nSome checks failed.\n");
process.exit(allOk ? 0 : 1);
