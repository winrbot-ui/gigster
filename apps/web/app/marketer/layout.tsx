import { AppShell } from "@/components/app/app-shell";
import type { NavItem } from "@/components/app/app-nav";
import { requireRole } from "@/lib/auth";

const marketerNav: NavItem[] = [
  { href: "/marketer", label: "Overview" },
];

export default async function MarketerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole("marketer", "admin");
  return (
    <AppShell nav={marketerNav} area="Marketer">
      {children}
    </AppShell>
  );
}
