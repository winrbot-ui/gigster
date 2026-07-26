"use client";

import Link from "next/link";
import { useActionState } from "react";
import type {
  AgentPersonaRow,
  SubscriptionRow,
  UserRow,
} from "@gigster/shared-types";
import {
  PLAN_PLATFORMS,
  PLAN_PRICE_USD,
  membershipRequiresPayment,
} from "@gigster/shared-types";
import { updatePassword, type AuthActionState } from "@/app/actions/auth";
import { PageHeader } from "@/components/app/app-shell";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SettingsViewProps {
  user: UserRow;
  subscription: SubscriptionRow | null;
  persona: AgentPersonaRow | null;
  showResetHint?: boolean;
}

function initials(username: string): string {
  return username.slice(0, 2).toUpperCase();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const STATUS_LABEL: Record<UserRow["status"], string> = {
  pending_email: "Pending email",
  free: "Free",
  pending_payment: "Payment pending",
  active: "Active member",
  expired: "Expired",
  blocked: "Blocked",
};

export function SettingsView({
  user,
  subscription,
  persona,
  showResetHint,
}: SettingsViewProps) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    updatePassword,
    {},
  );

  const statusTone =
    user.status === "active"
      ? "success"
      : user.status === "pending_payment" || user.status === "free"
        ? "accent"
        : "neutral";

  const needsPayment = membershipRequiresPayment(user);
  const isActive = user.status === "active" && subscription !== null;

  return (
    <>
      <PageHeader
        title="Profile"
        description="Your account, membership, and AI persona."
        action={
          <Badge tone={user.role === "admin" ? "accent" : "neutral"}>
            {user.role}
          </Badge>
        }
      />

      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4 py-5 sm:gap-5 sm:py-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/15 text-lg font-semibold text-accent-strong sm:h-16 sm:w-16 sm:text-xl">
              {initials(user.username)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <p className="font-mono text-lg text-accent-strong">@{user.username}</p>
              <p className="truncate text-sm text-muted">{user.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone}>{STATUS_LABEL[user.status]}</Badge>
                <span className="text-xs text-muted">
                  Member since {formatDate(user.created_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:hidden">
          <Link
            href="/agent-setup"
            className="flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3.5 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            <span>{persona ? "Edit AI persona" : "Set up AI persona"}</span>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </Link>
          <a
            href="#change-password"
            className="flex items-center justify-between rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3.5 text-sm font-medium text-foreground hover:bg-surface-2"
          >
            <span>Change password</span>
            <span className="text-muted" aria-hidden>
              →
            </span>
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="order-2 lg:order-1">
            <CardHeader>
              <CardTitle>Membership</CardTitle>
              <CardDescription>
                Reply drafting is always free. Paid membership unlocks the client
                brief (PDF) and the project website built from your deal.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              {isActive && subscription ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Plan</span>
                    <Badge tone="success">
                      {subscription.plan === "pro" ? "Pro" : "Basic"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Platforms</span>
                    <span className="text-foreground">
                      {PLAN_PLATFORMS[subscription.plan]}
                      {PLAN_PLATFORMS[subscription.plan] === 1
                        ? " platform"
                        : " platforms"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Renews / expires</span>
                    <span className="text-foreground">
                      {formatDate(subscription.expires_at)}
                    </span>
                  </div>
                </>
              ) : needsPayment ? (
                <>
                  <p className="text-muted">
                    You closed your first deal. Activate a plan and Gigster builds
                    the project from it — the brief document and the client website.
                  </p>
                  <p className="text-muted">
                    Basic{" "}
                    <span className="font-medium text-foreground">
                      ${PLAN_PRICE_USD.basic}
                    </span>{" "}
                    (1 platform) · Pro{" "}
                    <span className="font-medium text-foreground">
                      ${PLAN_PRICE_USD.pro}
                    </span>{" "}
                    (Fiverr + Freelancer) · 30 days.
                  </p>
                  <Link href="/buy" className={buttonClasses("primary", "sm")}>
                    Activate membership
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <Badge tone="success">Free tier</Badge>
                    <span className="text-muted">No payment needed yet.</span>
                  </div>
                  <p className="text-muted">
                    Draft unlimited client replies at no cost. You only pay when it
                    pays off — after your first closed deal you activate a plan to
                    unlock the client brief (PDF) and the project website for that deal.
                  </p>
                  <ol className="flex flex-col gap-1.5 text-muted">
                    <li>
                      <span className="text-accent-strong">1.</span> Install the
                      extension &amp; set your persona — free.
                    </li>
                    <li>
                      <span className="text-accent-strong">2.</span> Gigster drafts
                      every reply and closes the deal.
                    </li>
                    <li>
                      <span className="text-accent-strong">3.</span> Deal closed →
                      activate a plan to deliver the brief &amp; site.
                    </li>
                  </ol>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/guide" className={buttonClasses("primary", "sm")}>
                      Install the extension
                    </Link>
                    <Link href="/buy" className={buttonClasses("secondary", "sm")}>
                      View plans
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="order-1 lg:order-2">
            <CardHeader>
              <CardTitle>AI persona</CardTitle>
              <CardDescription>
                The voice your client replies are written in.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              {persona ? (
                <>
                  <p>
                    <span className="text-muted">Speaking as </span>
                    <span className="font-medium">{persona.agent_name}</span>
                    {persona.title ? (
                      <span className="text-muted"> · {persona.title}</span>
                    ) : null}
                  </p>
                  {persona.specialty && (
                    <p className="text-muted">{persona.specialty}</p>
                  )}
                  {persona.tone && (
                    <p className="text-muted">Tone: {persona.tone}</p>
                  )}
                </>
              ) : (
                <p className="text-muted">No persona configured yet.</p>
              )}
              <Link
                href="/agent-setup"
                className={buttonClasses("secondary", "sm")}
              >
                {persona ? "Edit persona" : "Set up persona"}
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card id="change-password">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              {showResetHint
                ? "Set a new password below after following the email link."
                : "Update your Gigster login password."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={formAction}
              className="grid gap-4 sm:max-w-md"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="current_password">Current password</Label>
                <Input
                  id="current_password"
                  name="current_password"
                  type="password"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  name="new_password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  minLength={8}
                  required
                />
              </div>
              {state.error && <p className="text-sm text-danger">{state.error}</p>}
              {state.success && (
                <p className="text-sm text-success">{state.success}</p>
              )}
              <div>
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Update password"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {user.role === "admin" && (
          <Card>
            <CardHeader>
              <CardTitle>Admin</CardTitle>
              <CardDescription>Same login as your member account.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted">
              Open the{" "}
              <Link href="/admin" className="text-accent-strong hover:underline">
                Admin panel
              </Link>{" "}
              from the sidebar — no separate password.
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
