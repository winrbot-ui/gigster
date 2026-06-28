"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireActive } from "@/lib/auth";
import { inviteStatsFromCount } from "@/lib/invites";

export async function getInviteStats(userId: string) {
  const admin = createAdminClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await admin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .gte("created_at", startOfMonth.toISOString());

  return inviteStatsFromCount(count ?? 0);
}

export async function getDashboardStats(userId: string) {
  await requireActive();
  const admin = createAdminClient();

  const [projects, drafts, sites] = await Promise.all([
    admin.from("projects").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin.from("message_events").select("id", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("agent2_status", "ready"),
  ]);

  return {
    activeProjects: projects.count ?? 0,
    draftsThisWeek: drafts.count ?? 0,
    sitesBuilt: sites.count ?? 0,
  };
}
