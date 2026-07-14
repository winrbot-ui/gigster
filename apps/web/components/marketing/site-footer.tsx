import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <Container className="flex flex-col gap-6 py-10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          <Logo />
          <p className="max-w-sm text-sm text-faint">
            An invite-only club for freelancers. Membership is earned, not bought.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/tos" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/apply-marketer" className="hover:text-foreground">
            Marketers
          </Link>
          <Link href="/join" className="hover:text-foreground">
            Invite
          </Link>
        </nav>
      </Container>
      <Container className="border-t border-border py-6">
        <p className="text-xs text-faint">
          © {new Date().getFullYear()} Gigster. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
