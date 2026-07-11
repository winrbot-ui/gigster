import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

const navLinks = [
  { href: "/#demo", label: "Demo" },
  { href: "/#proof", label: "Why Gigster" },
  { href: "/#math", label: "The math" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/custom", label: "Business" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
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
        <div className="flex items-center gap-3">
          <Link href="/login" className={buttonClasses("ghost", "sm")}>
            Log in
          </Link>
          <Link href="/join" className={buttonClasses("primary", "sm")}>
            Start free
          </Link>
        </div>
      </Container>
    </header>
  );
}
