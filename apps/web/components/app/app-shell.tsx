import { Logo } from "@/components/brand/logo";
import { AppNav, type NavItem } from "@/components/app/app-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { MobileAppHeader } from "@/components/app/mobile-app-header";
import { Badge } from "@/components/ui/badge";

/**
 * Shared shell for authenticated areas (member app, marketer, admin):
 * a fixed sidebar with navigation and a scrollable content column.
 */
export function AppShell({
  nav,
  area,
  children,
}: {
  nav: NavItem[];
  area?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <MobileAppHeader nav={nav} area={area} />
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 md:flex">
        <div className="flex items-center justify-between px-2">
          <Logo />
          {area ? <Badge tone="accent">{area}</Badge> : null}
        </div>
        <div className="mt-8 flex flex-1 flex-col">
          <AppNav items={nav} />
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10 md:px-10">
          {children}
        </div>
      </main>
    </div>
  );
}

/** Standard page heading used inside the app shell. */
export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
