import type { Metadata } from "next";
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
          Placeholder terms. The full agreement is added before launch.
        </p>
        <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-muted">
          <section>
            <h2 className="text-base font-medium text-foreground">
              1. Membership
            </h2>
            <p className="mt-2">
              Gigster is an invite-only service. Access requires a valid invite
              and an active subscription.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">
              2. Acceptable use
            </h2>
            <p className="mt-2">
              You are responsible for how you use AI-generated drafts and builds
              with your clients.
            </p>
          </section>
          <section>
            <h2 className="text-base font-medium text-foreground">
              3. Payments
            </h2>
            <p className="mt-2">
              Memberships are paid in USDT (TRC-20) and verified manually. Terms
              are non-refundable once a period begins.
            </p>
          </section>
        </div>
      </article>
    </Container>
  );
}
