"use server";

import { revalidatePath } from "next/cache";
import {
  SUBSCRIPTION_DAYS,
  PLAN_PLATFORMS,
  type Plan,
  type UserStatus,
} from "@gigster/shared-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import {
  sendMarketerApprovedEmail,
  sendMembershipActivatedEmail,
} from "@/lib/email";

export type AdminActionState = { error?: string; success?: string };

export async function verifyPaymentAction(
  paymentId: string,
): Promise<AdminActionState> {
  return verifyPayment(paymentId, true);
}

export async function rejectPaymentAction(
  paymentId: string,
): Promise<AdminActionState> {
  return verifyPayment(paymentId, false);
}

async function verifyPayment(
  paymentId: string,
  approve: boolean,
): Promise<AdminActionState> {
  const adminUser = await requireRole("admin");
  const admin = createAdminClient();

  const { data: payment } = await admin
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  if (!payment) return { error: "Payment not found." };

  if (!approve) {
    await admin
      .from("payments")
      .update({ status: "rejected", verified_by: adminUser.id })
      .eq("id", paymentId);
    revalidatePath("/admin");
    return { success: "Payment rejected." };
  }

  const now = new Date();
  const expires = new Date(now.getTime() + SUBSCRIPTION_DAYS * 86400000);

  await admin
    .from("payments")
    .update({
      status: "verified",
      paid_at: now.toISOString(),
      verified_by: adminUser.id,
    })
    .eq("id", paymentId);

  await admin.from("subscriptions").insert({
    user_id: payment.user_id,
    plan: payment.plan as Plan,
    platforms_allowed: PLAN_PLATFORMS[payment.plan as Plan],
    started_at: now.toISOString(),
    expires_at: expires.toISOString(),
    active: true,
  });

  await admin
    .from("users")
    .update({ status: "active" })
    .eq("id", payment.user_id);

  const { data: activatedUser } = await admin
    .from("users")
    .select("email, username")
    .eq("id", payment.user_id)
    .single();
  if (activatedUser?.email) {
    await sendMembershipActivatedEmail(
      activatedUser.email,
      activatedUser.username ?? "",
    );
  }

  revalidatePath("/admin");
  return { success: "Payment verified. User activated." };
}

export async function approveMarketerApplication(
  applicationId: string,
): Promise<AdminActionState> {
  const adminUser = await requireRole("admin");
  const admin = createAdminClient();

  const { data: app } = await admin
    .from("marketer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();
  if (!app) return { error: "Application not found." };

  await admin
    .from("marketer_applications")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUser.id,
    })
    .eq("id", applicationId);

  let userId = app.user_id;
  if (!userId && app.email) {
    const { data: userRow } = await admin
      .from("users")
      .select("id")
      .eq("email", app.email.toLowerCase())
      .maybeSingle();
    userId = userRow?.id ?? null;
    if (userId) {
      await admin
        .from("marketer_applications")
        .update({ user_id: userId })
        .eq("id", applicationId);
    }
  }

  if (userId) {
    await admin.from("users").update({ role: "marketer" }).eq("id", userId);
    await admin.from("marketer_milestones").upsert({
      marketer_id: userId,
      qualified_count: 0,
      milestone_20_paid: false,
      milestone_40_paid: false,
      salary_active: false,
    });

    const { data: marketerUser } = await admin
      .from("users")
      .select("email, username")
      .eq("id", userId)
      .single();
    if (marketerUser?.email) {
      await sendMarketerApprovedEmail(
        marketerUser.email,
        marketerUser.username ?? "",
      );
    }
  }

  revalidatePath("/admin");
  return { success: "Marketer approved." };
}

export async function rejectMarketerApplication(
  applicationId: string,
): Promise<AdminActionState> {
  await requireRole("admin");
  const admin = createAdminClient();

  const { data: app } = await admin
    .from("marketer_applications")
    .select("id")
    .eq("id", applicationId)
    .single();
  if (!app) return { error: "Application not found." };

  await admin
    .from("marketer_applications")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", applicationId);

  revalidatePath("/admin");
  return { success: "Application rejected." };
}

export async function updateUsername(
  userId: string,
  newUsername: string,
): Promise<AdminActionState> {
  await requireRole("admin");
  const cleaned = newUsername.trim().replace(/^@/, "").toLowerCase();
  if (!cleaned || cleaned.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }
  if (!/^[a-z0-9_]+$/.test(cleaned)) {
    return { error: "Username may only contain letters, numbers, and _." };
  }

  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("users")
    .select("id")
    .eq("username", cleaned)
    .neq("id", userId)
    .maybeSingle();
  if (taken) return { error: "That @nickname is already taken." };

  const { error } = await admin
    .from("users")
    .update({ username: cleaned })
    .eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { success: `Username updated to @${cleaned}.` };
}

export async function setUserStatus(
  userId: string,
  status: UserStatus,
): Promise<AdminActionState> {
  await requireRole("admin");
  const admin = createAdminClient();

  const { error } = await admin.from("users").update({ status }).eq("id", userId);
  if (error) return { error: error.message };

  if (status === "expired" || status === "blocked") {
    await admin
      .from("subscriptions")
      .update({ active: false })
      .eq("user_id", userId)
      .eq("active", true);
  }

  revalidatePath("/admin");
  return { success: `User status set to ${status}.` };
}

export async function extendSubscription(
  subscriptionId: string,
): Promise<AdminActionState> {
  await requireRole("admin");
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("*")
    .eq("id", subscriptionId)
    .single();
  if (!sub) return { error: "Subscription not found." };

  const currentExpiry = new Date(sub.expires_at);
  const base = currentExpiry > new Date() ? currentExpiry : new Date();
  const newExpiry = new Date(base.getTime() + SUBSCRIPTION_DAYS * 86400000);

  await admin
    .from("subscriptions")
    .update({
      expires_at: newExpiry.toISOString(),
      active: true,
    })
    .eq("id", subscriptionId);

  await admin
    .from("users")
    .update({ status: "active" })
    .eq("id", sub.user_id);

  revalidatePath("/admin");
  return { success: "Subscription extended by 30 days." };
}

export async function deactivateSubscription(
  subscriptionId: string,
): Promise<AdminActionState> {
  await requireRole("admin");
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("id", subscriptionId)
    .single();
  if (!sub) return { error: "Subscription not found." };

  await admin
    .from("subscriptions")
    .update({ active: false })
    .eq("id", subscriptionId);

  await admin
    .from("users")
    .update({ status: "expired" })
    .eq("id", sub.user_id);

  revalidatePath("/admin");
  return { success: "Subscription deactivated." };
}

export async function getAdminStats() {
  await requireRole("admin");
  const admin = createAdminClient();

  const [payments, pendingUsers, activeMembers] = await Promise.all([
    admin.from("payments").select("id", { count: "exact" }).eq("status", "submitted"),
    admin.from("users").select("id", { count: "exact" }).eq("status", "pending_payment"),
    admin.from("users").select("id", { count: "exact" }).eq("status", "active"),
  ]);

  return {
    paymentsPending: payments.count ?? 0,
    pendingUsers: pendingUsers.count ?? 0,
    activeMembers: activeMembers.count ?? 0,
  };
}

export type MemberMarketplaceProfile = {
  user_id: string;
  fiverr_username: string;
  freelancer_username: string;
  agent_name: string;
  updated_at: string;
  email: string;
  username: string;
  status: string;
};

function normalizeUserJoin(
  users: unknown,
): { email: string; username: string; status: string } | null {
  if (!users) return null;
  if (Array.isArray(users)) {
    const row = users[0];
    return row && typeof row === "object" ? (row as { email: string; username: string; status: string }) : null;
  }
  return users as { email: string; username: string; status: string };
}

export async function getMemberMarketplaceProfiles(): Promise<MemberMarketplaceProfile[]> {
  await requireRole("admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("agent_personas")
    .select(
      "user_id, fiverr_username, freelancer_username, agent_name, updated_at, users(email, username, status)",
    )
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("getMemberMarketplaceProfiles:", error.message);
    return [];
  }
  return (data ?? []).map((row) => {
    const user = normalizeUserJoin(row.users);
    return {
      user_id: row.user_id,
      fiverr_username: row.fiverr_username ?? "",
      freelancer_username: row.freelancer_username ?? "",
      agent_name: row.agent_name ?? "",
      updated_at: row.updated_at,
      email: user?.email ?? "",
      username: user?.username ?? "",
      status: user?.status ?? "",
    };
  });
}

export async function getPendingPayments() {
  await requireRole("admin");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select("*, users!payments_user_id_fkey(email, username)")
    .eq("status", "submitted")
    .order("id", { ascending: true });
  if (error) {
    console.error("getPendingPayments:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getMarketerApplications() {
  await requireRole("admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("marketer_applications")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function getMemberSubscriptions() {
  await requireRole("admin");
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("*, users(email, username, status)")
    .eq("active", true)
    .order("expires_at", { ascending: true });
  return data ?? [];
}

export async function searchUsers(query: string) {
  await requireRole("admin");
  const cleaned = query.trim().replace(/^@/, "").toLowerCase();
  if (!cleaned) return [];

  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, email, username, status, agent_personas(fiverr_username, freelancer_username)")
    .or(`username.ilike.%${cleaned}%,email.ilike.%${cleaned}%`)
    .limit(10);
  return data ?? [];
}

export async function verifyPaymentFormAction(paymentId: string): Promise<void> {
  await verifyPaymentAction(paymentId);
}

export async function rejectPaymentFormAction(paymentId: string): Promise<void> {
  await rejectPaymentAction(paymentId);
}

export async function approveMarketerFormAction(applicationId: string): Promise<void> {
  await approveMarketerApplication(applicationId);
}

export async function rejectMarketerFormAction(applicationId: string): Promise<void> {
  await rejectMarketerApplication(applicationId);
}

export async function extendSubscriptionFormAction(subscriptionId: string): Promise<void> {
  await extendSubscription(subscriptionId);
}

export async function deactivateSubscriptionFormAction(subscriptionId: string): Promise<void> {
  await deactivateSubscription(subscriptionId);
}

export async function updateUsernameAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const userId = String(formData.get("user_id") ?? "");
  const username = String(formData.get("username") ?? "");
  if (!userId) return { error: "User required." };
  return updateUsername(userId, username);
}

export async function searchUsersAction(query: string) {
  return searchUsers(query);
}
