"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { UserRow } from "@gigster/shared-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  checkIpRateLimit,
  getClientIp,
  INVITE_COOKIE,
  verifyTurnstile,
} from "@/lib/security";

export type AuthActionState = { error?: string; success?: string };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const emailRedirectTo = `${siteUrl}/auth/callback?next=/buy`;

function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function redirectForUser(user: Pick<UserRow, "status">): never {
  switch (user.status) {
    case "pending_email":
      redirect("/verify");
    case "pending_payment":
    case "expired":
      redirect("/buy");
    case "blocked":
      redirect("/login?error=blocked");
    default:
      redirect("/dashboard");
  }
}

export async function signup(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");

  if (!username || username.length < 3) {
    return { error: "Username must be at least 3 characters (letters, numbers, _)." };
  }
  if (!email || password.length < 8) {
    return { error: "Valid email and password (8+ chars) required." };
  }

  const turnstileOk = await verifyTurnstile(turnstileToken || null);
  if (!turnstileOk) {
    return { error: "Bot verification failed. Please try again." };
  }

  const cookieStore = await cookies();
  const inviteRaw = cookieStore.get(INVITE_COOKIE)?.value;
  if (!inviteRaw) {
    return { error: "No valid invite. Enter through the invite gate first." };
  }

  let referrerId: string;
  let inviteNickname: string;
  try {
    const parsed = JSON.parse(inviteRaw) as {
      referrerId: string;
      nickname: string;
    };
    referrerId = parsed.referrerId;
    inviteNickname = parsed.nickname;
  } catch {
    return { error: "Invite session expired. Please re-enter your invite." };
  }

  if (username === inviteNickname) {
    return { error: "Self-invite is not allowed." };
  }

  const admin = createAdminClient();
  const signupIp = await getClientIp();

  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUser) return { error: "That @nickname is already taken." };

  const { data: referrer } = await admin
    .from("users")
    .select("id, email, status, role, signup_ip")
    .eq("id", referrerId)
    .single();
  if (!referrer || referrer.status !== "active") {
    return { error: "Invite is no longer valid." };
  }

  if (referrer.email.toLowerCase() === email) {
    return { error: "Self-invite is not allowed." };
  }

  if (referrer.signup_ip && referrer.signup_ip === signupIp) {
    return { error: "Self-referral from this network is not allowed." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
        referred_by_id: referrerId,
        invite_nickname: inviteNickname,
      },
      emailRedirectTo,
    },
  });

  if (error) return { error: error.message };
  if (!data.user) return { error: "Signup failed. Please try again." };

  await admin
    .from("users")
    .update({ signup_ip: signupIp })
    .eq("id", data.user.id);

  await admin.from("referrals").insert({
    referrer_id: referrerId,
    referred_id: data.user.id,
    status: "pending",
  });

  await admin.from("agent_personas").upsert({
    user_id: data.user.id,
    agent_name: username.charAt(0).toUpperCase() + username.slice(1),
    full_name: "",
    title: "Small Business Website Developer",
    specialty: "WordPress, business sites, landing pages",
    tone: "Professional but warm, direct",
    never_say: ["As an AI", "I'm a bot"],
    always_do: "Client first name, 2-5 sentences, max 2 questions",
    experience_years: 6,
    location: "CET",
  });

  await admin.from("telegram_links").upsert({
    user_id: data.user.id,
    link_code: crypto.randomUUID().slice(0, 8),
  });

  cookieStore.delete(INVITE_COOKIE);
  redirect("/verify?email=" + encodeURIComponent(email));
}

export async function login(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Enter your @nickname or email and password." };
  }

  const { allowed } = await checkIpRateLimit("login", 10, 24);
  if (!allowed) {
    return { error: "Too many login attempts. Try again later." };
  }

  let email = identifier;
  let profile: UserRow | null = null;
  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const username = normalizeUsername(identifier);
    const { data: user } = await admin
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();
    if (!user) return { error: "Account not found." };
    profile = user as UserRow;
    email = user.email;
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  if (!profile) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      profile = (data as UserRow | null) ?? null;
    }
  }

  if (profile) redirectForUser(profile);
  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function resendVerification(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo,
    },
  });
  if (error) return { error: error.message };
  return { success: "Verification email sent." };
}
