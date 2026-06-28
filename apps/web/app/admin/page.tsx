import type { Metadata } from "next";
import {
  getAdminStats,
  getMarketerApplications,
  getMemberSubscriptions,
  getPendingPayments,
} from "@/app/actions/admin";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminOverviewPage() {
  const [stats, payments, applications, subscriptions] = await Promise.all([
    getAdminStats(),
    getPendingPayments(),
    getMarketerApplications(),
    getMemberSubscriptions(),
  ]);

  return (
    <AdminDashboard
      stats={stats}
      payments={(payments ?? []) as Parameters<typeof AdminDashboard>[0]["payments"]}
      applications={applications ?? []}
      subscriptions={(subscriptions ?? []) as Parameters<typeof AdminDashboard>[0]["subscriptions"]}
    />
  );
}
