"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { login, requestPasswordReset, type AuthActionState } from "@/app/actions/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function LoginForm({ blocked = false }: { blocked?: boolean }) {
  const [showReset, setShowReset] = useState(false);
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(
    login,
    {},
  );
  const [resetState, resetAction, resetPending] = useActionState<
    AuthActionState,
    FormData
  >(requestPasswordReset, {});

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          One login for dashboard, admin, and desktop. Use @nickname or email.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {blocked && (
          <p className="text-sm text-danger" role="alert">
            Your account has been blocked. Contact support if you believe this is an error.
          </p>
        )}

        {!showReset ? (
          <>
            <form action={formAction} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="identifier">@nickname or email</Label>
                <Input id="identifier" name="identifier" placeholder="@kosta or you@example.com" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" placeholder="••••••••" required />
              </div>
              {state.error && (
                <p className="text-sm text-danger" role="alert">{state.error}</p>
              )}
              <Button type="submit" disabled={pending}>
                {pending ? "Signing in…" : "Log in"}
              </Button>
            </form>
            <button
              type="button"
              className="text-center text-sm text-muted hover:text-foreground"
              onClick={() => setShowReset(true)}
            >
              Forgot password?
            </button>
          </>
        ) : (
          <>
            <form action={resetAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="reset_email">Account email</Label>
                <Input id="reset_email" name="email" type="email" required />
              </div>
              {resetState.error && <p className="text-sm text-danger">{resetState.error}</p>}
              {resetState.success && <p className="text-sm text-success">{resetState.success}</p>}
              <Button type="submit" disabled={resetPending}>
                Send reset link
              </Button>
            </form>
            <button
              type="button"
              className="text-center text-sm text-muted hover:text-foreground"
              onClick={() => setShowReset(false)}
            >
              Back to login
            </button>
          </>
        )}

        <p className="text-center text-sm text-muted">
          No account?{" "}
          <Link href="/join" className="text-accent-strong hover:underline">
            Enter with invite
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
