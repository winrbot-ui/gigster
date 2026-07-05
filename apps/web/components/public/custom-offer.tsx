"use client";

import { useActionState, useState } from "react";
import { submitCustomRequest, type CustomRequestState } from "@/app/actions/custom-request";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CustomRequestFormProps {
  turnstileSiteKey: string;
}

export function CustomRequestForm({ turnstileSiteKey }: CustomRequestFormProps) {
  const [turnstileToken, setTurnstileToken] = useState("");
  const [state, formAction, pending] = useActionState<CustomRequestState, FormData>(
    submitCustomRequest,
    {},
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tell us about your workflow</CardTitle>
        <CardDescription>
          We&apos;ll review and reply by email. No spam — one follow-up if it&apos;s a fit.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required placeholder="Your name" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="you@company.com" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="business">Business / niche</Label>
            <Input id="business" name="business" placeholder="E-commerce support, legal intake…" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">What should the agent do?</Label>
            <textarea
              id="description"
              name="description"
              required
              rows={5}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              placeholder="Describe the platform, inputs, and desired outputs…"
            />
          </div>
          <input type="hidden" name="cf-turnstile-response" value={turnstileToken} />
          <TurnstileWidget siteKey={turnstileSiteKey} onVerify={setTurnstileToken} />
          {state.error && <p className="text-sm text-danger">{state.error}</p>}
          {state.success && <p className="text-sm text-success">{state.success}</p>}
          <Button type="submit" disabled={pending || (!!turnstileSiteKey && !turnstileToken)}>
            {pending ? "Sending…" : "Submit request"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function CustomOfferPage({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  return (
    <Container className="py-20">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-4 text-4xl font-semibold tracking-tight">
          Request a custom agent
        </h1>
        <p className="mb-10 text-lg text-muted">
          Our ready-made extensions cover proven marketplace work — but every business is
          different. Tell us your workflow and our team will scope the market and build an
          agent (Chrome extension) tailored to how you operate.
        </p>

        <div className="mb-10 grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Ready-made agents</CardTitle>
              <CardDescription>
                Validated for Fiverr and Freelancer inbox work today. Buy Basic or Pro on
                the homepage — the agent handles deals and delivery.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Custom build (Business)</CardTitle>
              <CardDescription>
                Internal tools, niche platforms, industry-specific flows — we research the
                opportunity and ship an extension built for your team.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <CustomRequestForm turnstileSiteKey={turnstileSiteKey} />
      </div>
    </Container>
  );
}
