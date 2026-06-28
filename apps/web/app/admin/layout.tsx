import { AppShell } from "@/components/app/app-shell";
import type { NavItem } from "@/components/app/app-nav";
import { requireRole } from "@/lib/auth";

const adminNav: NavItem[] = [
  { href: "/admin", label: "Overview" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("admin");
  return (
    <AppShell nav={adminNav} area="Admin">
      {children}
    </AppShell>
  );
}
