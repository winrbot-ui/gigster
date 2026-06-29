import { redirect } from "next/navigation";
import type { UserRole, UserRow } from "@gigster/shared-types";
import { createClient } from "@/lib/supabase/server";
import {
  expireStaleMembership,
  getUserSubscription,
  membershipIsLive,
} from "@/lib/subscription";

/** The authenticated profile, or null if signed out. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return (profile as UserRow | null) ?? null;
}

/** Require a signed-in user; redirect to login otherwise. */
export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a signed-in user with one of the given roles. */
export async function requireRole(...roles: UserRole[]): Promise<UserRow> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}

/** Require an active subscription (used by the closed app group). */
export async function requireActive(): Promise<UserRow> {
  const user = await requireUser();
  if (user.status !== "active") redirect("/buy");

  await expireStaleMembership(user.id);
  const refreshed = await getCurrentUser();
  if (!refreshed || refreshed.status !== "active") redirect("/buy");

  const sub = await getUserSubscription(refreshed.id);
  if (!membershipIsLive(refreshed, sub)) redirect("/buy");

  return refreshed;
}
