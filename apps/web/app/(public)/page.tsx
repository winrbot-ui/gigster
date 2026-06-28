import Link from "next/link";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { PLAN_PRICE_USD, PLAN_PLATFORMS } from "@gigster/shared-types";

const steps = [
  {
    title: "Set your persona",
    body: "Define the freelancer your AI speaks as — tone, specialty, the lines it must never cross.",
  },
  {
    title: "It drafts the replies",
    body: "Incoming client messages are read on your screen. Your persona drafts on-brand answers and tracks the deal.",
  },
  {
    title: "It builds what you sold",
    body: "When a brief is confirmed, Agent 2 turns it into a deployed preview site, ready to show the client.",
  },
];

const plans = [
  {
    name: "Basic",
    price: PLAN_PRICE_USD.basic,
    platforms: PLAN_PLATFORMS.basic,
    highlight: false,
  },
  {
    name: "Pro",
    price: PLAN_PRICE_USD.pro,
    platforms: PLAN_PLATFORMS.pro,
    highlight: true,
  },
];

export default function LandingPage() {
  return (
    <>
      <section className="bg-ambient">
        <Container className="flex flex-col items-center gap-8 py-28 text-center sm:py-36">
          <Badge tone="accent">Invite-only</Badge>
          <h1 className="max-w-3xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            The unfair advantage for serious freelancers.
          </h1>
          <p className="max-w-xl text-balance text-lg text-muted">
            Gigster gives you an AI persona that wins the conversation and builds
            the work. Membership is earned through an invite.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/join" className={buttonClasses("primary", "lg")}>
              Enter with invite
            </Link>
            <Link href="/#how" className={buttonClasses("outline", "lg")}>
              See how it works
            </Link>
          </div>
        </Container>
      </section>

      <section id="how" className="border-t border-border py-24">
        <Container>
          <div className="mb-12 flex flex-col gap-2">
            <span className="text-sm font-medium text-accent">How it works</span>
            <h2 className="text-3xl font-semibold tracking-tight">
              Three moves, end to end.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <Card key={step.title}>
                <CardHeader>
                  <span className="text-sm text-faint">0{i + 1}</span>
                  <CardTitle>{step.title}</CardTitle>
                  <CardDescription>{step.body}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section id="pricing" className="border-t border-border py-24">
        <Container>
          <div className="mb-12 flex flex-col gap-2">
            <span className="text-sm font-medium text-accent">Membership</span>
            <h2 className="text-3xl font-semibold tracking-tight">
              Simple, serious pricing.
            </h2>
            <p className="text-sm text-muted">
              30 days. Paid in USDT (TRC-20). No subscriptions traps.
            </p>
          </div>
          <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlight ? "border-accent/40" : undefined}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.highlight ? <Badge tone="accent">Popular</Badge> : null}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold">${plan.price}</span>
                    <span className="text-sm text-faint">/ 30 days</span>
                  </div>
                  <CardDescription>
                    {plan.platforms} platform{plan.platforms > 1 ? "s" : ""}{" "}
                    connected.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Link
                    href="/join"
                    className={buttonClasses(
                      plan.highlight ? "primary" : "secondary",
                      "md",
                    )}
                  >
                    Get an invite
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
