"use client";

import { useActionState } from "react";
import type { UserRow } from "@gigster/shared-types";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SettingsViewProps {
  user: UserRow;
  showResetHint?: boolean;
}

export function SettingsView({ user, showResetHint }: SettingsViewProps) {
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    updatePassword,
    {},
  );

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your account and security."
        action={
          <Badge tone={user.role === "admin" ? "accent" : "neutral"}>
            {user.role}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Fixed after signup.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <p>
              <span className="text-muted">@nickname </span>
              <span className="font-mono text-accent-strong">@{user.username}</span>
            </p>
            <p>
              <span className="text-muted">Email </span>
              {user.email}
            </p>
            <p>
              <span className="text-muted">Status </span>
              {user.status.replace("_", " ")}
            </p>
            {user.role === "admin" && (
              <p className="text-muted">
                Admin panel uses the <strong className="text-foreground">same login</strong> — open
                Admin panel from the sidebar after you sign in.
              </p>
            )}
          </CardContent>
        </Card>

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
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="current_password">Current password</Label>
                <Input id="current_password" name="current_password" type="password" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new_password">New password</Label>
                <Input id="new_password" name="new_password" type="password" minLength={8} required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm_password">Confirm new password</Label>
                <Input id="confirm_password" name="confirm_password" type="password" minLength={8} required />
              </div>
              {state.error && <p className="text-sm text-danger">{state.error}</p>}
              {state.success && <p className="text-sm text-success">{state.success}</p>}
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
