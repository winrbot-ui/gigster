"use client";

import Link from "next/link";
import { useState } from "react";
import type { AgentPersonaRow, UserRow } from "@gigster/shared-types";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";

interface DashboardViewProps {
  user: UserRow;
  stats: { activeProjects: number; draftsThisWeek: number; sitesBuilt: number };
  invite: { usedThisMonth: number; limit: number; remaining: number };
  inviteLink: string;
  persona: AgentPersonaRow | null;
}

export function DashboardView({ user, stats, invite, inviteLink, persona }: DashboardViewProps) {
  const [copied, setCopied] = useState(false);
  const inviteExhausted = user.role === "member" && invite.remaining <= 0;

  async function copyLink() {
    if (inviteExhausted) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusTone =
    user.status === "active" ? "success" : user.status === "pending_payment" ? "accent" : "neutral";

  const invitePct = invite.limit > 0 ? Math.round((invite.usedThisMonth / invite.limit) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your club at a glance."
        action={<Badge tone={statusTone}>{user.status.replace("_", " ")}</Badge>}
      />

      <Card className="mb-6 border-accent/25 bg-surface-2/50">
        <CardHeader>
          <CardTitle className="text-lg">How Gigster works</CardTitle>
          <CardDescription>One login for everything — no separate admin password.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <p>
              <span className="font-medium text-foreground">1. You</span> — set persona, invite members, use{" "}
              <Link href="/desktop" className="text-accent-strong hover:underline">Desktop app</Link>.
            </p>
            <p>
              <span className="font-medium text-foreground">2. Members</span> — pay USDT → you verify on{" "}
              {user.role === "admin" ? (
                <Link href="/admin" className="text-accent-strong hover:underline">Admin panel</Link>
              ) : (
                "Admin panel"
              )}{" "}
              → they become active.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <p>
              <span className="font-medium text-foreground">Password</span> — change anytime in{" "}
              <Link href="/settings" className="text-accent-strong hover:underline">Settings</Link>.
            </p>
            {user.role === "admin" && (
              <p className="text-muted">
                You are <Badge tone="accent" className="mx-1 align-middle">admin</Badge>
                Open Admin panel from the sidebar — same @nickname and password as login.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Active projects</CardDescription>
            <CardTitle className="text-3xl">{stats.activeProjects}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Message events</CardDescription>
            <CardTitle className="text-3xl">{stats.draftsThisWeek}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sites built</CardDescription>
            <CardTitle className="text-3xl">{stats.sitesBuilt}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Your @nickname</CardTitle>
            <CardDescription>Fixed after signup. Share your invite link to grow the club.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="font-mono text-lg text-accent-strong">@{user.username}</p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded bg-surface-2 px-3 py-2 text-sm break-all">{inviteLink}</code>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={copyLink}
                disabled={inviteExhausted}
              >
                {copied ? "Copied" : inviteExhausted ? "Limit reached" : "Copy invite link"}
              </Button>
            </div>
            {user.role === "member" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted">Invites this month</span>
                  <span className={inviteExhausted ? "text-danger" : "text-foreground"}>
                    {invite.usedThisMonth} / {invite.limit}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full transition-all ${inviteExhausted ? "bg-danger" : "bg-accent"}`}
                    style={{ width: `${Math.min(invitePct, 100)}%` }}
                  />
                </div>
                <p className="text-sm text-muted">
                  {inviteExhausted
                    ? "Monthly invite limit reached. Resets on the 1st."
                    : `${invite.remaining} invite${invite.remaining === 1 ? "" : "s"} remaining`}
                </p>
              </div>
            )}
            {user.role === "marketer" && (
              <p className="text-sm text-muted">Unlimited invites as a marketer.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agent persona</CardTitle>
            <CardDescription>
              Agent 1 reads this live from the database on every Generate.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {persona ? (
              <>
                <p className="text-sm">
                  <span className="text-muted">Speaking as </span>
                  <span className="font-medium">{persona.agent_name}</span>
                  {persona.title ? (
                    <span className="text-muted"> · {persona.title}</span>
                  ) : null}
                </p>
                {persona.specialty && (
                  <p className="text-sm text-muted">{persona.specialty}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">No persona configured yet.</p>
            )}
            <Link href="/agent-setup" className={buttonClasses("secondary", "sm")}>
              {persona ? "Edit persona" : "Set up persona"}
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
