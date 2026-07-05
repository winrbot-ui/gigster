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
import { cn } from "@/lib/cn";
import { PLAN_PRICE_USD, PLAN_PLATFORMS } from "@gigster/shared-types";

/** Illustrative numbers for the DIY vs Gigster math — edit here. */
const MATH = {
  toolsTotal: 105,
  toolsDetail: "Claude API $45 · Cursor Pro $20 · GPT Plus $20 · Hosting $20",
  hoursPerMonth: 45,
  hoursDetail: "3h per negotiation × 15 threads",
  hourlyValue: 15,
  avgDealValue: 400,
} as const;

const timeCost = MATH.hoursPerMonth * MATH.hourlyValue;
const diyTotal = MATH.toolsTotal + timeCost;

const painPoints = [
  "Hours lost asking the same scope questions, thread after thread.",
  "Deals die because you replied too slow — someone else got hired.",
  "You're paid to deliver, but you spend the day negotiating.",
];

const pipeline = [
  { label: "Talk", detail: "Negotiate in your voice" },
  { label: "Create", detail: "Build the deliverable" },
  { label: "Deliver", detail: "Project done" },
];

const steps = [
  {
    n: "01",
    title: "Talk",
    body: "The agent replies in your voice, asks the right questions, and locks scope with the client.",
  },
  {
    n: "02",
    title: "Create",
    body: "When the deal is set, it builds the deliverable — preview site, brief document, or both.",
  },
  {
    n: "03",
    title: "Deliver",
    body: "Project finished. You review and send to the client. Negotiation to delivery — handled.",
  },
];

const membershipPlans = [
  {
    name: "Basic",
    priceLabel: `$${PLAN_PRICE_USD.basic}`,
    price: PLAN_PRICE_USD.basic,
    description: `${PLAN_PLATFORMS.basic} platform · 30 days`,
    deliverables: [
      "Talks to clients in your persona",
      "Creates the deliverable when the deal is locked",
      "Full inbox agent on Fiverr or Freelancer",
    ],
    cta: "Enter with invite",
    href: "/join",
    highlight: false,
  },
  {
    name: "Pro",
    priceLabel: `$${PLAN_PRICE_USD.pro}`,
    price: PLAN_PRICE_USD.pro,
    description: `${PLAN_PLATFORMS.pro} platforms · 30 days`,
    deliverables: [
      "Everything in Basic — talk, create, deliver",
      "Fiverr + Freelancer simultaneously",
      "Upwork agent included when it ships",
    ],
    cta: "Enter with invite",
    href: "/join",
    highlight: true,
  },
  {
    name: "Business",
    priceLabel: "Custom",
    price: null,
    description: "Your workflow, your agent",
    deliverables: [
      "Custom agent scoped to your niche",
      "Built by our team, end to end",
      "Market research before we build",
    ],
    cta: "Request a quote",
    href: "/custom",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      {/* 1. Hero */}
      <section className="bg-ambient">
        <Container className="flex flex-col items-center gap-6 py-16 text-center sm:gap-8 sm:py-28 md:py-40">
          <Badge tone="accent" className="text-[11px] sm:text-xs">
            Invite-only · Limited seats
          </Badge>
          <h1 className="max-w-4xl text-balance text-[2rem] font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-7xl">
            Stop chasing clients.
            <br />
            <span className="bg-gradient-to-r from-accent-strong via-accent to-accent-strong bg-clip-text text-transparent">
              Start closing them.
            </span>
          </h1>
          <p className="max-w-xl text-balance text-base leading-relaxed text-muted sm:text-lg">
            Gigster talks to your clients, creates the work, and finishes the project —
            from first message to final delivery. You buy the agent. It does the full job.
          </p>

          {/* Pipeline — stacked on mobile, row on desktop */}
          <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:max-w-none sm:grid-cols-3 sm:gap-3">
            {pipeline.map((item, i) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-border/80 bg-surface/60 px-4 py-3 text-left sm:flex-col sm:items-center sm:gap-1 sm:py-4 sm:text-center"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent-strong sm:h-auto sm:w-auto sm:rounded-none sm:bg-transparent sm:text-base">
                  {item.label}
                </span>
                <span className="text-sm text-muted sm:text-xs">{item.detail}</span>
                {i < pipeline.length - 1 && (
                  <span className="ml-auto hidden text-faint sm:inline" aria-hidden>
                    →
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row">
            <Link
              href="/#pricing"
              className={cn(buttonClasses("primary", "lg"), "w-full sm:w-auto")}
            >
              See if you qualify
            </Link>
            <Link
              href="/#proof"
              className={cn(buttonClasses("outline", "lg"), "w-full sm:w-auto")}
            >
              Watch it work
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Badge tone="accent">Fiverr — live</Badge>
            <Badge tone="accent">Freelancer — live</Badge>
            <Badge tone="neutral">Upwork — soon</Badge>
          </div>
        </Container>
      </section>

      {/* 2. Problem → Solution + proof */}
      <section id="proof" className="border-t border-border py-16 sm:py-24">
        <Container className="flex flex-col items-center gap-10 sm:gap-14">
          <div className="grid w-full max-w-5xl gap-10 lg:grid-cols-2 lg:items-center lg:gap-12">
            <div className="flex flex-col gap-5 sm:gap-6">
              <span className="text-sm font-medium text-accent">The problem</span>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">
                Freelancing shouldn&apos;t mean living inside your inbox
              </h2>
              <ul className="flex flex-col gap-3 sm:gap-4">
                {painPoints.map((pain) => (
                  <li key={pain} className="flex gap-3 text-sm leading-relaxed text-muted sm:text-base">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                    {pain}
                  </li>
                ))}
              </ul>
              <p className="text-base font-medium text-accent-strong sm:text-lg">
                The problem isn&apos;t you. You&apos;re doing a machine&apos;s job.
              </p>
              <p className="text-sm leading-relaxed text-muted sm:text-base">
                Gigster is a Chrome extension with an AI agent that runs the whole pipeline:
                it talks to clients in your voice, creates the deliverable when the deal is
                locked — preview site, client brief, or both — and hands you a finished
                project ready to send. Not just replies. Not just drafts. End to end.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:gap-4">
              <div className="overflow-hidden rounded-[var(--radius-card)] border border-accent/20 bg-surface-2 shadow-[var(--shadow-elevated)]">
                <video
                  className="aspect-video w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                  poster="/demo-poster.svg"
                >
                  <source src="/demo-extension.mp4" type="video/mp4" />
                </video>
              </div>
              <p className="text-center text-xs text-faint">
                Talk → create → deliver — one agent, full project cycle.
              </p>
            </div>
          </div>

          {/* Steps — horizontal scroll on mobile, grid on sm+ */}
          <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:max-w-4xl sm:grid-cols-3 sm:gap-px sm:overflow-visible sm:rounded-[var(--radius-card)] sm:border sm:border-border sm:bg-border sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            {steps.map((step) => (
              <div
                key={step.n}
                className="flex min-w-[82vw] shrink-0 snap-center flex-col gap-2 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:min-w-0 sm:rounded-none sm:border-0 sm:p-6"
              >
                <span className="font-mono text-sm text-accent">{step.n}</span>
                <p className="text-lg font-semibold sm:text-base">{step.title}</p>
                <p className="text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* 3. The math */}
      <section id="math" className="border-t border-border bg-surface/30 py-16 sm:py-24">
        <Container className="flex flex-col items-center gap-8 sm:gap-12">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-medium text-accent">The math</span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
              Do it yourself — or pay less and earn more
            </h2>
          </div>

          <div className="grid w-full max-w-4xl gap-4 sm:gap-6 md:grid-cols-2">
            <Card className="border-danger/20">
              <CardHeader className="p-5 sm:p-6">
                <CardDescription className="text-xs uppercase tracking-wide">
                  Build it yourself
                </CardDescription>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-4xl font-semibold text-danger sm:text-5xl">
                    ${diyTotal}
                  </span>
                  <span className="text-sm text-muted">/ month</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 px-5 pb-5 text-sm sm:px-6 sm:pb-6">
                <div className="flex justify-between gap-4 border-b border-border pb-3">
                  <span className="text-muted">AI tool stack</span>
                  <span className="shrink-0 font-medium">${MATH.toolsTotal}/mo</span>
                </div>
                <p className="text-xs leading-relaxed text-faint">{MATH.toolsDetail}</p>
                <div className="flex flex-col gap-1 border-b border-border pb-3 pt-2 sm:flex-row sm:justify-between sm:gap-4">
                  <span className="text-muted">
                    Your time — {MATH.hoursPerMonth}h/mo at ${MATH.hourlyValue}/h
                  </span>
                  <span className="shrink-0 font-medium sm:text-right">${timeCost}/mo</span>
                </div>
                <p className="text-xs text-faint">{MATH.hoursDetail}</p>
              </CardContent>
            </Card>

            <Card className="border-accent/40 shadow-[var(--shadow-elevated)]">
              <CardHeader className="p-5 sm:p-6">
                <CardDescription className="text-xs uppercase tracking-wide text-accent-strong">
                  Gigster membership
                </CardDescription>
                <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
                  <span className="text-4xl font-semibold text-accent-strong sm:text-5xl">
                    ${PLAN_PRICE_USD.basic}
                  </span>
                  <span className="text-sm text-muted">
                    – ${PLAN_PRICE_USD.pro} / 30 days
                  </span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-5 pb-5 text-sm sm:px-6 sm:pb-6">
                <p className="leading-relaxed text-muted">
                  One flat price. The agent talks, creates, and delivers — no separate AI
                  subscriptions, no unpaid hours negotiating or building by hand.
                </p>
                <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                  <p className="font-medium">One extra closed deal pays it back.</p>
                  <p className="mt-1 leading-relaxed text-muted">
                    Average gig ~${MATH.avgDealValue}. Close one more this month and the
                    membership is pure profit.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <p className="max-w-xl px-2 text-center text-lg font-semibold leading-snug text-accent-strong sm:text-xl">
            The membership isn&apos;t a cost. It&apos;s the cheapest employee you&apos;ll
            ever hire.
          </p>
          <p className="-mt-4 text-xs text-faint">Numbers are illustrative.</p>
        </Container>
      </section>

      {/* 4. Exclusivity */}
      <section id="exclusive" className="border-t border-border py-16 sm:py-24">
        <Container className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-2 text-center sm:gap-6">
          <Badge tone="neutral">Members only</Badge>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">
            Gigster isn&apos;t open to everyone
          </h2>
          <p className="text-base leading-relaxed text-muted sm:text-lg">
            Access is invite-only — you need a referral code from an existing member. We
            keep the pool small on purpose: when too many people run the same agent on the
            same platform, the edge fades. It&apos;s not scarcity theater. It&apos;s how we
            protect what works for the people already inside.
          </p>
        </Container>
      </section>

      {/* 5. Pricing */}
      <section id="pricing" className="border-t border-border bg-ambient py-16 sm:py-24">
        <Container>
          <div className="mb-8 flex flex-col items-center gap-2 text-center sm:mb-12">
            <span className="text-sm font-medium text-accent">Membership</span>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-4xl">
              Choose your agent access
            </h2>
            <p className="max-w-xl text-sm text-muted">
              30 days · USDT (TRC-20) · Invite required
            </p>
          </div>
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-6">
            {membershipPlans.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  plan.highlight &&
                    "relative border-accent/50 shadow-[var(--shadow-elevated)] md:-translate-y-2",
                )}
              >
                {plan.highlight && (
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                )}
                <CardHeader className="p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.highlight ? <Badge tone="accent">Best value</Badge> : null}
                  </div>
                  <div className="flex flex-wrap items-baseline gap-1">
                    <span className="text-3xl font-semibold sm:text-4xl">{plan.priceLabel}</span>
                    {plan.price != null && (
                      <span className="text-sm text-faint">/ 30 days</span>
                    )}
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 px-5 pb-5 sm:px-6 sm:pb-6">
                  <ul className="flex flex-col gap-2.5 text-sm text-muted">
                    {plan.deliverables.map((d) => (
                      <li key={d} className="flex gap-2.5 leading-relaxed">
                        <span className="shrink-0 text-accent">✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={cn(
                      buttonClasses(
                        plan.highlight || plan.name === "Business" ? "primary" : "secondary",
                        "md",
                      ),
                      "w-full",
                    )}
                  >
                    {plan.cta}
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="mt-8 px-2 text-center text-xs leading-relaxed text-faint sm:mt-10">
            No invite? Ask a member —{" "}
            <Link href="/custom" className="text-accent-strong hover:underline">
              business build
            </Link>
            . Member?{" "}
            <Link href="/login" className="text-accent-strong hover:underline">
              Log in
            </Link>
            .
          </p>
        </Container>
      </section>

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:hidden">
        <Link href="/join" className={cn(buttonClasses("primary", "lg"), "w-full")}>
          Enter with invite
        </Link>
      </div>
      <div className="h-20 sm:hidden" aria-hidden />
    </div>
  );
}
