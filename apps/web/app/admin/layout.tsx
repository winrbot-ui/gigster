import { AppShell } from "@/components/app/app-shell";
import { buildMemberNav } from "@/lib/nav";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const nav = buildMemberNav(user);

  return (
    <AppShell nav={nav} area="Admin">
      {children}
    </AppShell>
  );
}
