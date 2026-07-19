import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Terms of Service",
};

export default function TosPage() {
  return (
    <Container className="py-24">
      <article className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm text-muted">
          Gigster is an invite-only club for freelancers. See our{" "}
          <Link href="/privacy" className="text-accent-strong hover:underline">
            Privacy Policy
          </Link>{" "}
          for how we handle your data.
        </p>
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-base font-medium text-foreground">
              1. Membership
            </h2>
            <p className="mt-2">
              Gigster is an invite-only service. Access requires a valid invite
              and a Gigster account. AI reply drafting is free after email
              verification. Paid membership is required to unlock the client
              brief document and the client project site after your first
              closed deal.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">
              2. Acceptable use
            </h2>
            <p className="mt-2">
              You are responsible for how you use AI-generated drafts and builds
              with your clients. You must comply with each marketplace&apos;s
              terms (Fiverr, Freelancer, etc.). Auto-send mode is optional and
              used at your own risk.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">
              3. Payments
            </h2>
            <p className="mt-2">
              Paid memberships are billed in USDT (TRC-20) and verified manually.
              Plans are non-refundable once a subscription period begins.
            </p>
          </section>
        </div>
      </article>
    </Container>
  );
}
