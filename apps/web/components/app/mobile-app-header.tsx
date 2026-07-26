"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { AppNav, type NavItem } from "@/components/app/app-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { Badge } from "@/components/ui/badge";

export function MobileAppHeader({
  nav,
  area,
}: {
  nav: NavItem[];
  area?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
        <Logo href="/dashboard" />
        <div className="flex items-center gap-2">
          {area ? <Badge tone="accent">{area}</Badge> : null}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-app-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-foreground hover:bg-surface-2"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div
            id="mobile-app-nav"
            className="absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-border bg-surface px-4 py-6 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between px-2">
              <Logo href="/dashboard" />
              {area ? <Badge tone="accent">{area}</Badge> : null}
            </div>
            <div className="flex flex-1 flex-col">
              <AppNav items={nav} />
              <LogoutButton />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
