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
          <CardContent className="flex flex-wrap items-center gap-5 py-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xl font-semibold text-accent-strong">
              {initials(user.username)}
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-mono text-lg text-accent-strong">@{user.username}</p>
              <p className="text-sm text-muted">{user.email}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge tone={statusTone}>{STATUS_LABEL[user.status]}</Badge>
                <span className="text-xs text-muted">
                  Member since {formatDate(user.created_at)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Membership</CardTitle>
              <CardDescription>
                Agent 1 drafting is always free. Paid membership unlocks the client
                brief (PDF) and Agent 2 preview sites.
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
                    You closed your first deal. Activate a plan to unlock the brief
                    document and Agent 2 preview site.
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
                  <p className="text-muted">
                    You are on the free tier — draft unlimited client replies at no
                    cost. Membership activates after your first closed deal.
                  </p>
                  <Link href="/buy" className={buttonClasses("secondary", "sm")}>
                    View plans
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>AI persona</CardTitle>
              <CardDescription>
                The voice Agent 1 writes your client replies in.
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

        <Card>
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
