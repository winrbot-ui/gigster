import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteStatsFromCount } from "@/lib/invites";

const GATE_MAX_ATTEMPTS = 3;
const GATE_WINDOW_HOURS = 24;

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "127.0.0.1"
  );
}

/** Increment IP attempt counter; returns whether the request is allowed. */
export async function checkIpRateLimit(
  endpoint: string,
  maxAttempts = GATE_MAX_ATTEMPTS,
  windowHours = GATE_WINDOW_HOURS,
): Promise<{ allowed: boolean; remaining: number }> {
  const ip = await getClientIp();
  const admin = createAdminClient();
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowHours * 60 * 60 * 1000);

  const { data: existing } = await admin
    .from("ip_attempts")
    .select("*")
    .eq("ip", ip)
    .eq("endpoint", endpoint)
    .maybeSingle();

  if (!existing || new Date(existing.window_start) < windowStart) {
    await admin.from("ip_attempts").upsert(
      {
        ip,
        endpoint,
        attempt_count: 1,
        window_start: now.toISOString(),
      },
      { onConflict: "ip,endpoint" },
    );
    return { allowed: true, remaining: maxAttempts - 1 };
  }

  const nextCount = existing.attempt_count + 1;
  await admin
    .from("ip_attempts")
    .update({ attempt_count: nextCount })
    .eq("ip", ip)
    .eq("endpoint", endpoint);

  return {
    allowed: nextCount <= maxAttempts,
    remaining: Math.max(0, maxAttempts - nextCount),
  };
}

export async function verifyTurnstile(token: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // Dev bypass when Turnstile not configured
  if (!token) return false;

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
    },
  );
  const data = (await res.json()) as { success?: boolean };
  return Boolean(data.success);
}

export type InviteValidationResult =
  | { ok: true; referrerId: string; nickname: string }
  | { ok: false; reason: string };

export async function validateInviteNickname(
  nickname: string,
): Promise<InviteValidationResult> {
  const cleaned = nickname.trim().replace(/^@/, "").toLowerCase();
  if (!cleaned) return { ok: false, reason: "Enter a valid @nickname." };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("validate_invite_nickname", {
    p_nickname: cleaned,
  });

  if (error) {
    // Fallback if RPC not deployed yet
    const { data: user } = await admin
      .from("users")
      .select("id, status, role")
      .eq("username", cleaned)
      .maybeSingle();

    if (!user) return { ok: false, reason: "That @nickname was not found." };
    if (user.status === "blocked")
      return { ok: false, reason: "This invite is no longer valid." };
    if (user.status !== "active")
      return { ok: false, reason: "Invite owner does not have an active membership." };

    if (user.role === "member") {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { count } = await admin
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .gte("created_at", startOfMonth.toISOString());
      const stats = inviteStatsFromCount(count ?? 0);
      if (stats.remaining <= 0) {
        return { ok: false, reason: "This member has used all invites this month." };
      }
    }

    return { ok: true, referrerId: user.id, nickname: cleaned };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.valid) {
    const messages: Record<string, string> = {
      not_found: "That @nickname was not found.",
      blocked: "This invite is no longer valid.",
      inactive: "Invite owner does not have an active membership.",
      empty: "Enter a valid @nickname.",
    };
    return {
      ok: false,
      reason: messages[row?.reason ?? ""] ?? "Invalid invite.",
    };
  }

  const { data: referrer } = await admin
    .from("users")
    .select("id, role")
    .eq("id", row.referrer_id)
    .single();

  if (referrer?.role === "member") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", referrer.id)
      .gte("created_at", startOfMonth.toISOString());
    const stats = inviteStatsFromCount(count ?? 0);
    if (stats.remaining <= 0) {
      return { ok: false, reason: "This member has used all invites this month." };
    }
  }

  return { ok: true, referrerId: row.referrer_id, nickname: cleaned };
}

export const INVITE_COOKIE = "gigster_invite";
