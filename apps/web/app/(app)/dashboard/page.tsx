import type { Metadata } from "next";
import { requireActive } from "@/lib/auth";
import { getDashboardStats, getInviteStats } from "@/app/actions/dashboard";
import { getPersona } from "@/app/actions/persona";
import { buildInviteLink } from "@/lib/invites";
import { DashboardView } from "@/components/app/dashboard-view";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireActive();
  const [stats, invite, persona] = await Promise.all([
    getDashboardStats(user.id),
    getInviteStats(user.id),
    getPersona(user.id),
  ]);

  return (
    <DashboardView
      user={user}
      stats={stats}
      invite={invite}
      inviteLink={buildInviteLink(user.username)}
      persona={persona}
    />
  );
}
