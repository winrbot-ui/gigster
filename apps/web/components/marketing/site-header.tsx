"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { cn } from "@/lib/cn";

const navLinks = [
  { href: "/#proof", label: "Why Gigster" },
  { href: "/#math", label: "The math" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/custom", label: "Business" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
        <Container className="flex h-14 items-center justify-between gap-3 sm:h-16">
          <Logo />

          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className={cn(buttonClasses("ghost", "sm"), "hidden sm:inline-flex")}>
              Log in
            </Link>
            <Link
              href="/join"
              className={cn(buttonClasses("primary", "sm"), "hidden sm:inline-flex")}
            >
              Enter with invite
            </Link>
            <Link
              href="/join"
              className={cn(buttonClasses("primary", "sm"), "sm:hidden")}
            >
              Join
            </Link>
            <button
              type="button"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-2 text-foreground md:hidden"
            >
              <span className="relative block h-3.5 w-4">
                <span
                  className={cn(
                    "absolute left-0 top-0 h-0.5 w-4 rounded-full bg-current transition-transform",
                    open && "top-[7px] rotate-45",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[7px] h-0.5 w-4 rounded-full bg-current transition-opacity",
                    open && "opacity-0",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[14px] h-0.5 w-4 rounded-full bg-current transition-transform",
                    open && "top-[7px] -rotate-45",
                  )}
                />
              </span>
            </button>
          </div>
        </Container>
      </header>

      {/* Mobile menu overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={cn(
            "absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 top-14 flex flex-col border-t border-border bg-background transition-all duration-300 ease-out",
            open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0",
          )}
        >
          <nav className="flex flex-1 flex-col gap-1 px-4 py-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3.5 text-lg font-medium text-foreground transition-colors active:bg-surface-2"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-xl px-4 py-3.5 text-lg font-medium text-muted transition-colors active:bg-surface-2"
            >
              Log in
            </Link>
          </nav>
          <div className="flex flex-col gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Link
              href="/join"
              onClick={() => setOpen(false)}
              className={cn(buttonClasses("primary", "lg"), "w-full")}
            >
              Enter with invite
            </Link>
            <Link
              href="/#pricing"
              onClick={() => setOpen(false)}
              className={cn(buttonClasses("outline", "lg"), "w-full")}
            >
              See plans
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
