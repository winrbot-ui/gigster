import { AppShell } from "@/components/app/app-shell";
import { buildMemberNav } from "@/lib/nav";
import { requireUser } from "@/lib/auth";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const nav = buildMemberNav(user);
  const area =
    user.role === "admin" ? "Admin · Member" : user.role === "marketer" ? "Marketer" : undefined;

  return <AppShell nav={nav} area={area}>{children}</AppShell>;
}
