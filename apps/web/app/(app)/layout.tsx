import { AppShell } from "@/components/app/app-shell";
import type { NavItem } from "@/components/app/app-nav";
import { requireUser } from "@/lib/auth";

const memberNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/projects", label: "Projects" },
  { href: "/agent-setup", label: "Agent setup" },
  { href: "/buy", label: "Membership" },
];

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return <AppShell nav={memberNav}>{children}</AppShell>;
}
