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
import { Reveal } from "@/components/marketing/reveal";
import { ExtensionDemo } from "@/components/marketing/extension-demo";

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

const steps = [
  {
    n: "01",
    title: "Install free",
    body: "Get an invite, add the extension, set your persona. No card, no payment — Agent 1 drafts every client reply for free.",
  },
  {
    n: "02",
    title: "Close your first deal",
    body: "The agent negotiates in your voice, locks scope and budget, and tracks the deal until the client confirms.",
  },
  {
    n: "03",
    title: "Pay only when you win",
    body: "Deal closed? Activate membership to unlock the client brief and the Agent 2 preview site. You pay after you've already won.",
  },
];

const membershipPlans = [
  {
    name: "Basic",
    freeLabel: "Free",
    afterPrice: PLAN_PRICE_USD.basic,
    description: `${PLAN_PLATFORMS.basic} platform · Fiverr or Freelancer`,
    freeNote: "Free until your first client",
    afterNote: `Then $${PLAN_PRICE_USD.basic} / 30 days`,
    deliverables: [
      "Agent 1 — drafts every client reply in your voice",
      "Deal tracking + brief score, live",
      "After first client: client brief (PDF) + Agent 2 preview sites",
    ],
    cta: "Start free with invite",
    href: "/join",
    highlight: false,
    badge: "No card needed",
    badgeTone: "success" as const,
  },
  {
    name: "Pro",
    freeLabel: "Free",
    afterPrice: PLAN_PRICE_USD.pro,
    description: `${PLAN_PLATFORMS.pro} platforms · Fiverr + Freelancer`,
    freeNote: "Free until your first client",
    afterNote: `Then $${PLAN_PRICE_USD.pro} / 30 days`,
    deliverables: [
      "Everything in Basic — on two platforms at once",
      "Fiverr + Freelancer simultaneously",
      "Upwork agent included when it ships",
    ],
    cta: "Start free with invite",
    href: "/join",
    highlight: true,
    badge: "Best value",
    badgeTone: "accent" as const,
  },
  {
    name: "Business",
    freeLabel: "Custom",
    afterPrice: null,
    description: "Your workflow, your agent",
    freeNote: "Built for companies & teams",
    afterNote: "Scoped and quoted per project",
    deliverables: [
      "Custom agent for your niche and platform",
      "Market research before we build",
      "Chrome extension built end to end by our team",
    ],
    cta: "Request a custom build",
    href: "/custom",
    highlight: false,
    badge: "For businesses",
    badgeTone: "neutral" as const,
  },
];

export default function LandingPage() {
  return (
    <>
      {/* 1. Hero */}
      <section className="bg-ambient overflow-hidden">
        <Container className="flex flex-col items-center gap-8 py-28 text-center sm:py-36">
          <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
            <Badge tone="accent">Free to start · Invite-only · Limited seats</Badge>
          </div>
          <h1
            className="animate-fade-up max-w-4xl text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-7xl"
            style={{ animationDelay: "120ms" }}
          >
            Your AI closes the deal.
            <br />
            <span className="text-shimmer">You pay after it does.</span>
          </h1>
          <p
            className="animate-fade-up max-w-xl text-balance text-lg text-muted"
            style={{ animationDelay: "240ms" }}
          >
            The Gigster extension drafts every client reply in your voice — Basic and Pro
            are both free until you close your first client. You only pay ($200 or $300)
            when you want the client brief and the preview site for that deal.
          </p>
          <div
            className="animate-fade-up flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted"
            style={{ animationDelay: "360ms" }}
          >
            <span>
              <span className="text-accent-strong">Free</span> → drafts every reply
            </span>
            <span className="hidden text-faint sm:inline">·</span>
            <span>
              <span className="text-accent-strong">Deal closed</span> → you won
            </span>
            <span className="hidden text-faint sm:inline">·</span>
            <span>
              <span className="text-accent-strong">Then pay</span> → unlock delivery
            </span>
          </div>
          <div
            className="animate-fade-up flex flex-col items-center gap-3 sm:flex-row"
            style={{ animationDelay: "480ms" }}
          >
            <Link href="/join" className={buttonClasses("primary", "lg")}>
              Start free with invite
            </Link>
            <Link href="/#demo" className={buttonClasses("outline", "lg")}>
              Watch it work
            </Link>
          </div>
          <div
            className="animate-fade-up flex flex-wrap items-center justify-center gap-2 pt-2"
            style={{ animationDelay: "600ms" }}
          >
            <Badge tone="accent">Fiverr — live</Badge>
            <Badge tone="accent">Freelancer — live</Badge>
            <Badge tone="neutral">Upwork — coming soon</Badge>
          </div>
        </Container>
      </section>

      {/* 2. Live demo */}
      <section id="demo" className="border-t border-border py-24">
        <Container className="flex flex-col items-center gap-12">
          <Reveal className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
            <span className="text-sm font-medium text-accent">Live demo</span>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Watch the extension close a deal
            </h2>
            <p className="max-w-xl text-muted">
              A client writes. Agent 1 drafts in your voice — free. The deal locks, the
              brief hits 92/100, and only then does Gigster ask you to pay. This is the
              exact flow, on loop.
            </p>
          </Reveal>

          <Reveal delay={150} className="w-full max-w-5xl">
            <div className="animate-float">
              <ExtensionDemo />
            </div>
          </Reveal>

          <Reveal delay={250}>
            <p className="text-center text-xs text-faint">
              Simulated conversation · the real extension runs inside your marketplace inbox.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* 3. Problem → Solution */}
      <section id="proof" className="border-t border-border py-24">
        <Container className="flex flex-col items-center gap-14">
          <div className="grid w-full max-w-5xl gap-12 lg:grid-cols-2 lg:items-center">
            <Reveal className="flex flex-col gap-6">
              <span className="text-sm font-medium text-accent">The problem</span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                Freelancing shouldn&apos;t mean living inside your inbox
              </h2>
              <ul className="flex flex-col gap-4">
                {painPoints.map((pain) => (
                  <li key={pain} className="flex gap-3 text-muted">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                    {pain}
                  </li>
                ))}
              </ul>
              <p className="text-lg font-medium text-accent-strong">
                The problem isn&apos;t you. You&apos;re doing a machine&apos;s job.
              </p>
            </Reveal>

            <Reveal delay={150} className="flex flex-col gap-6">
              <span className="text-sm font-medium text-accent">The fix</span>
              <p className="text-lg leading-relaxed text-muted">
                Gigster is a Chrome extension with an AI agent that runs the whole
                pipeline: it talks to clients in your voice, and once the deal is locked
                it creates the deliverable — preview site, client brief, or both.
              </p>
              <div className="rounded-[var(--radius-card)] border border-accent/25 bg-accent/5 p-6">
                <p className="text-base font-semibold text-accent-strong">
                  And the talking part costs you nothing.
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Agent 1 — the part that reads your inbox and drafts every reply — is
                  free with an invite. No trial clock, no card. Gigster earns only when
                  you do: after your first closed deal, membership unlocks the client
                  brief and the Agent 2 preview site.
                </p>
              </div>
            </Reveal>
          </div>

          {/* Steps strip */}
          <div className="grid w-full max-w-4xl gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-3">
            {steps.map((step, i) => (
              <Reveal key={step.n} delay={i * 130} className="flex flex-col gap-2 bg-surface p-6">
                <span className="font-mono text-sm text-accent">{step.n}</span>
                <p className="font-semibold">{step.title}</p>
                <p className="text-sm text-muted">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. The math */}
      <section id="math" className="border-t border-border bg-surface/30 py-24">
        <Container className="flex flex-col items-center gap-12">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-medium text-accent">The math</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Do it yourself — or start free and pay only after you win
            </h2>
          </Reveal>

          <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
            <Reveal>
              <Card className="h-full border-danger/20">
                <CardHeader>
                  <CardDescription className="uppercase tracking-wide text-xs">
                    Build it yourself
                  </CardDescription>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-semibold text-danger">${diyTotal}</span>
                    <span className="text-muted">/ month</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm">
                  <div className="flex justify-between border-b border-border pb-3">
                    <span className="text-muted">AI tool stack</span>
                    <span className="font-medium">${MATH.toolsTotal}/mo</span>
                  </div>
                  <p className="text-xs text-faint">{MATH.toolsDetail}</p>
                  <div className="flex justify-between border-b border-border pb-3 pt-2">
                    <span className="text-muted">
                      Your time — {MATH.hoursPerMonth}h/mo at ${MATH.hourlyValue}/h
                    </span>
                    <span className="font-medium">${timeCost}/mo</span>
                  </div>
                  <p className="text-xs text-faint">{MATH.hoursDetail}</p>
                  <p className="pt-2 text-xs text-faint">
                    …and you pay all of it before you close a single deal.
                  </p>
                </CardContent>
              </Card>
            </Reveal>

            <Reveal delay={150}>
              <Card className="h-full border-accent/40 shadow-[var(--shadow-elevated)]">
                <CardHeader>
                  <CardDescription className="uppercase tracking-wide text-xs text-accent-strong">
                    Gigster
                  </CardDescription>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-semibold text-accent-strong">$0</span>
                    <span className="text-muted">until your first closed deal</span>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm">
                  <p className="text-muted">
                    Basic and Pro both start free. When Agent 1 closes your first client,
                    activate the plan you chose — ${PLAN_PRICE_USD.basic} (Basic) or $
                    {PLAN_PRICE_USD.pro} (Pro) for 30 days — to unlock the client brief
                    and preview site. Paid from a deal you already won.
                  </p>
                  <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
                    <p className="font-medium">The deal itself pays for it.</p>
                    <p className="mt-1 text-muted">
                      Average gig ~${MATH.avgDealValue}. Your first closed deal covers
                      the membership — everything after is pure profit.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Reveal>
          </div>

          <Reveal>
            <p className="max-w-xl text-center text-xl font-semibold text-accent-strong">
              Zero risk to start. You pay Gigster with money it already made you.
            </p>
          </Reveal>
          <p className="-mt-8 text-xs text-faint">Numbers are illustrative.</p>
        </Container>
      </section>

      {/* 5. Exclusivity */}
      <section id="exclusive" className="border-t border-border py-24">
        <Container className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <Reveal className="flex flex-col items-center gap-6">
            <Badge tone="neutral">Members only</Badge>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Free — but not open to everyone
            </h2>
            <p className="text-lg leading-relaxed text-muted">
              Even Basic and Pro start free — but you still need an invite from an
              existing member. We keep the pool small on purpose: when too many people run
              the same agent on the same platform, the edge fades. It&apos;s not scarcity
              theater. It&apos;s how we protect what works for the people already inside.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* 6. Pricing */}
      <section id="pricing" className="border-t border-border bg-ambient py-24">
        <Container>
          <Reveal className="mb-12 flex flex-col items-center gap-2 text-center">
            <span className="text-sm font-medium text-accent">Membership</span>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Basic &amp; Pro are free until your first client
            </h2>
            <p className="max-w-xl text-sm text-muted">
              Both plans start at $0 — you only pay after you close your first deal.
              Then 30 days · USDT (TRC-20) · invite required. Need something custom? See
              Business.
            </p>
          </Reveal>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {membershipPlans.map((plan, i) => (
              <Reveal key={plan.name} delay={i * 130}>
                <Card
                  className={
                    plan.highlight
                      ? "relative h-full border-accent/50 shadow-[var(--shadow-elevated)] md:-translate-y-2"
                      : "h-full"
                  }
                >
                  {plan.highlight && (
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-accent to-transparent" />
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{plan.name}</CardTitle>
                      <Badge tone={plan.badgeTone}>{plan.badge}</Badge>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-semibold text-accent-strong">
                          {plan.freeLabel}
                        </span>
                        {plan.afterPrice != null && (
                          <span className="text-sm text-faint line-through decoration-faint/60">
                            ${plan.afterPrice}
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{plan.freeNote}</p>
                      <p className="text-xs text-muted">{plan.afterNote}</p>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <ul className="flex flex-col gap-2 text-sm text-muted">
                      {plan.deliverables.map((d) => (
                        <li key={d} className="flex gap-2">
                          <span className="shrink-0 text-accent">✓</span>
                          {d}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={plan.href}
                      className={buttonClasses(
                        plan.highlight || plan.name === "Business" ? "primary" : "secondary",
                        "md",
                      )}
                    >
                      {plan.cta}
                    </Link>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
          <Reveal>
            <p className="mt-10 text-center text-sm text-muted">
              Running a business and need a custom agent for your workflow?{" "}
              <Link href="/custom" className="font-medium text-accent-strong hover:underline">
                Tell us what to build
              </Link>{" "}
              — we scope your niche and deliver a tailored Chrome extension.
            </p>
            <p className="mt-3 text-center text-xs text-faint">
              Freelancers: invite required to join. Already a member?{" "}
              <Link href="/login" className="text-accent-strong hover:underline">
                Log in
              </Link>
              .
            </p>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
