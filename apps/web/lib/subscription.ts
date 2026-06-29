import type { SubscriptionRow, UserRow } from "@gigster/shared-types";
import { createAdminClient } from "@/lib/supabase/admin";

function isSubscriptionLive(sub: Pick<SubscriptionRow, "active" | "expires_at">): boolean {
  if (!sub.active || !sub.expires_at) return false;
  return new Date(sub.expires_at) > new Date();
}

/** Load the user's current subscription row (may be expired). */
export async function getUserSubscription(
  userId: string,
): Promise<SubscriptionRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SubscriptionRow | null) ?? null;
}

/**
 * If subscription passed expires_at, deactivate it and mark user expired.
 * Returns updated user row when mutation happened.
 */
export async function expireStaleMembership(userId: string): Promise<UserRow | null> {
  const admin = createAdminClient();
  const sub = await getUserSubscription(userId);
  if (!sub || isSubscriptionLive(sub)) return null;

  await admin.from("subscriptions").update({ active: false }).eq("id", sub.id);
  await admin.from("users").update({ status: "expired" }).eq("id", userId);

  const { data } = await admin.from("users").select("*").eq("id", userId).single();
  return (data as UserRow | null) ?? null;
}

export function membershipIsLive(
  user: Pick<UserRow, "status">,
  sub: Pick<SubscriptionRow, "active" | "expires_at"> | null,
): boolean {
  return user.status === "active" && sub !== null && isSubscriptionLive(sub);
}
