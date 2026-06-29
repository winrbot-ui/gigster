import type { UserRow } from "@gigster/shared-types";
import type { NavItem } from "@/components/app/app-nav";

/** Sidebar links for signed-in members (and admins use the same shell). */
export function buildMemberNav(user: UserRow): NavItem[] {
  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/projects", label: "Projects" },
    { href: "/agent-setup", label: "Agent setup" },
    { href: "/desktop", label: "Desktop app" },
    { href: "/settings", label: "Settings" },
  ];

  if (user.status !== "active") {
    nav.push({ href: "/buy", label: "Membership" });
  }

  if (user.role === "marketer") {
    nav.push({ href: "/marketer", label: "Marketer" });
  }

  if (user.role === "admin") {
    nav.push({ href: "/admin", label: "Admin panel" });
  }

  return nav;
}
