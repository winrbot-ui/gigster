"use client";

import { useActionState, useState, useTransition } from "react";
import { formatMarketplaceHandles } from "@gigster/shared-types";
import {
  approveMarketerFormAction,
  deactivateSubscriptionFormAction,
  extendSubscriptionFormAction,
  rejectMarketerFormAction,
  rejectPaymentFormAction,
  searchUsersAction,
  updateUsernameAction,
  verifyPaymentFormAction,
  type AdminActionState,
  type MemberMarketplaceProfile,
} from "@/app/actions/admin";
import { PageHeader } from "@/components/app/app-shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export interface AdminDashboardProps {
  stats: { paymentsPending: number; pendingUsers: number; activeMembers: number };
  payments: Array<{
    id: string;
    amount: number;
    plan: string;
    tx_hash: string;
    users: { email: string; username: string } | null;
  }>;
  applications: Array<{
    id: string;
    email: string;
    full_name: string;
    country: string;
    pitch: string;
  }>;
  subscriptions: Array<{
    id: string;
    plan: string;
    expires_at: string;
    users: { email: string; username: string; status: string } | null;
  }>;
  memberProfiles: MemberMarketplaceProfile[];
}

export function AdminDashboard({
  stats,
  payments,
  applications,
  subscriptions,
  memberProfiles,
}: AdminDashboardProps) {
  const [usernameState, usernameAction, usernamePending] = useActionState<
    AdminActionState,
    FormData
  >(updateUsernameAction, {});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{
      id: string;
      email: string;
      username: string;
      status: string;
      agent_personas:
        | { fiverr_username: string; freelancer_username: string }
        | { fiverr_username: string; freelancer_username: string }[]
        | null;
    }>
  >([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isSearching, startSearch] = useTransition();

  function runSearch() {
    startSearch(async () => {
      const results = await searchUsersAction(searchQuery);
      setSearchResults(results);
      if (results.length === 1) setSelectedUserId(results[0]!.id);
    });
  }

  function personaFromSearch(row: (typeof searchResults)[number]) {
    const p = row.agent_personas;
    if (!p) return null;
    return Array.isArray(p) ? p[0] : p;
  }

  return (
    <>
      <PageHeader
        title="Admin panel"
        description="Same login as the dashboard — verify USDT payments, activate members, approve marketers."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Payments to verify</CardDescription>
            <CardTitle className="text-3xl">{stats.paymentsPending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending users</CardDescription>
            <CardTitle className="text-3xl">{stats.pendingUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active members</CardDescription>
            <CardTitle className="text-3xl">{stats.activeMembers}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Marketplace usernames</CardTitle>
          <CardDescription>
            Fiverr / Freelancer handles from Agent setup — saved in{" "}
            <code className="text-xs">agent_personas</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {memberProfiles.length === 0 && (
            <p className="text-sm text-muted">No persona rows yet.</p>
          )}
          {memberProfiles.map((row) => (
            <div
              key={row.user_id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">
                  @{row.username || "—"} · {row.agent_name || "No agent name"}
                </p>
                <p className="text-xs text-muted">{row.email}</p>
                <p className="mt-1 text-sm">{formatMarketplaceHandles(row)}</p>
                <p className="mt-1 text-xs text-muted">
                  Updated {new Date(row.updated_at).toLocaleString()}
                  {row.status ? ` · ${row.status.replace("_", " ")}` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.fiverr_username ? (
                  <Badge tone="neutral">Fiverr: {row.fiverr_username}</Badge>
                ) : null}
                {row.freelancer_username ? (
                  <Badge tone="neutral">Freelancer: {row.freelancer_username}</Badge>
                ) : null}
                {!row.fiverr_username && !row.freelancer_username ? (
                  <Badge tone="accent">Missing marketplace username</Badge>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pending payments</CardTitle>
          <CardDescription>Verify TX hash, then activate membership.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {payments.length === 0 && (
            <p className="text-sm text-muted">No payments awaiting verification.</p>
          )}
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">
                  @{p.users?.username} · ${p.amount} {p.plan}
                </p>
                <p className="text-xs text-muted">{p.users?.email}</p>
                <p className="font-mono text-xs text-muted">{p.tx_hash}</p>
              </div>
              <div className="flex gap-2">
                <form action={rejectPaymentFormAction.bind(null, p.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Reject
                  </Button>
                </form>
                <form action={verifyPaymentFormAction.bind(null, p.id)}>
                  <Button type="submit" size="sm">
                    Verify & activate
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Active subscriptions</CardTitle>
          <CardDescription>Extend or deactivate memberships.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {subscriptions.length === 0 && (
            <p className="text-sm text-muted">No active subscriptions.</p>
          )}
          {subscriptions.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">
                  @{s.users?.username} · {s.plan}
                </p>
                <p className="text-xs text-muted">{s.users?.email}</p>
                <p className="text-sm text-muted">
                  Expires {new Date(s.expires_at).toLocaleDateString()}
                </p>
                {s.users?.status && (
                  <Badge tone="neutral" className="mt-1">
                    {s.users.status.replace("_", " ")}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <form action={extendSubscriptionFormAction.bind(null, s.id)}>
                  <Button type="submit" variant="secondary" size="sm">
                    Extend 30d
                  </Button>
                </form>
                <form action={deactivateSubscriptionFormAction.bind(null, s.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Deactivate
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Edit @nickname</CardTitle>
          <CardDescription>Edge-case username fixes for existing members.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex min-w-[200px] flex-1 flex-col gap-2">
              <Label htmlFor="search">Find user</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="@nickname or email"
              />
            </div>
            <Button type="button" variant="secondary" onClick={runSearch} disabled={isSearching}>
              {isSearching ? "Searching…" : "Search"}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="flex flex-col gap-2">
              {searchResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm ${
                    selectedUserId === u.id ? "border-accent/40 bg-surface-2" : "border-border"
                  }`}
                >
                  @{u.username} · {u.email} · {u.status}
                  <span className="mt-1 block text-xs text-muted">
                    {formatMarketplaceHandles(personaFromSearch(u))}
                  </span>
                </button>
              ))}
            </div>
          )}
          <form action={usernameAction} className="flex max-w-md flex-col gap-3">
            <input type="hidden" name="user_id" value={selectedUserId} />
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">New @nickname</Label>
              <Input
                id="username"
                name="username"
                placeholder="newname"
                required
                disabled={!selectedUserId}
              />
            </div>
            {usernameState.error && (
              <p className="text-sm text-danger">{usernameState.error}</p>
            )}
            {usernameState.success && (
              <p className="text-sm text-success">{usernameState.success}</p>
            )}
            <Button type="submit" disabled={usernamePending || !selectedUserId}>
              {usernamePending ? "Saving…" : "Update username"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Marketer applications</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {applications.length === 0 && (
            <p className="text-sm text-muted">No pending applications.</p>
          )}
          {applications.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">
                  {a.full_name} · {a.country}
                </p>
                <p className="text-sm text-muted">{a.email}</p>
                <p className="mt-2 text-sm">{a.pitch}</p>
              </div>
              <div className="flex gap-2">
                <form action={rejectMarketerFormAction.bind(null, a.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    Reject
                  </Button>
                </form>
                <form action={approveMarketerFormAction.bind(null, a.id)}>
                  <Button type="submit" size="sm">
                    Approve
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
