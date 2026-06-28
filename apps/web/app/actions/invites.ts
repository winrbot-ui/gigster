"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  checkIpRateLimit,
  INVITE_COOKIE,
  validateInviteNickname,
  verifyTurnstile,
} from "@/lib/security";

export type InviteActionState = {
  error?: string;
  success?: boolean;
};

export async function submitInviteGate(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const nickname = String(formData.get("nickname") ?? "");
  const turnstileToken = String(formData.get("cf-turnstile-response") ?? "");

  const { allowed } = await checkIpRateLimit("invite_gate");
  if (!allowed) {
    return {
      error: "Too many attempts from your network. Try again in 24 hours.",
    };
  }

  const turnstileOk = await verifyTurnstile(turnstileToken || null);
  if (!turnstileOk) {
    return { error: "Bot verification failed. Please try again." };
  }

  const result = await validateInviteNickname(nickname);
  if (!result.ok) return { error: result.reason };

  const currentUser = await getCurrentUser();
  if (
    currentUser &&
    (currentUser.id === result.referrerId ||
      currentUser.username === result.nickname)
  ) {
    return { error: "You cannot invite yourself." };
  }

  const cookieStore = await cookies();
  cookieStore.set(INVITE_COOKIE, JSON.stringify({
    referrerId: result.referrerId,
    nickname: result.nickname,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24h to complete signup
    path: "/",
  });

  redirect("/signup");
}
