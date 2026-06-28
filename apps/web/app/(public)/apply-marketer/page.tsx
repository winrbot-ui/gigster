import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { ApplyMarketerForm } from "@/components/marketing/apply-marketer-form";

export const metadata: Metadata = {
  title: "Become a marketer",
  description:
    "Apply to grow the Gigster club and earn through referral milestones.",
};

export default function ApplyMarketerPage() {
  return (
    <Container className="py-24">
      <div className="mx-auto max-w-xl">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Become a Gigster marketer
          </h1>
          <p className="text-sm text-muted">
            Bring serious freelancers into the club. Hit referral milestones,
            unlock recurring rewards.
          </p>
        </div>
        <ApplyMarketerForm />
      </div>
    </Container>
  );
}
